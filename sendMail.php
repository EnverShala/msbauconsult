<?php

// --- Config ---
$behindProxy = false; // set true if behind Cloudflare or a trusted Nginx reverse proxy

// --- Rate limiting (file-based, no DB required) ---
$rateLimit  = 3;    // max requests
$rateWindow = 600;  // per 10 minutes (seconds)

function getClientIp(bool $behindProxy): string {
    if ($behindProxy) {
        // Cloudflare always sets this; only trust it when actually using CF
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
        // Standard reverse-proxy header — take the RIGHTMOST entry. A trusted proxy appends the
        // address it saw to the end of the list, while everything to the left can be pre-seeded
        // by the client and is therefore spoofable. This assumes exactly one trusted proxy hop.
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
            $ip = end($parts);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function checkRateLimit(string $file, int $limit, int $window): bool {
    $now = time();
    $fh  = fopen($file, 'c+');
    if ($fh === false) return true; // fail open if filesystem unavailable

    flock($fh, LOCK_EX); // exclusive lock covers the entire read-check-write cycle

    $raw  = stream_get_contents($fh);
    $data = ['count' => 0, 'reset' => $now + $window];

    if ($raw !== '') {
        $stored = json_decode($raw, true);
        if (is_array($stored) && isset($stored['reset'], $stored['count']) && $stored['reset'] > $now) {
            $data = $stored;
        }
    }

    if ($data['count'] >= $limit) {
        flock($fh, LOCK_UN);
        fclose($fh);
        return false;
    }

    $data['count']++;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
    return true;
}

// Secret per-installation salt for hashing IPs (a plain hash of an IPv4 address is trivially reversible).
// Generated once with random_bytes and kept in a file (0600) in the temp dir. If that is not possible,
// fall back to a salt derived from this installation so the limiter keeps working.
function getRateLimitSalt(): string {
    $path = sys_get_temp_dir() . '/rl_salt.key';
    $isSalt = function ($s): bool { return is_string($s) && preg_match('/^[0-9a-f]{64}$/', $s) === 1; };

    $salt = @file_get_contents($path);
    if ($isSalt($salt)) return $salt;

    try {
        $salt = bin2hex(random_bytes(32));
    } catch (Throwable $e) {
        return hash('sha256', __FILE__ . '|' . php_uname() . '|' . PHP_VERSION);
    }

    $fh = @fopen($path, 'x'); // exclusive create: only one concurrent request writes the salt
    if ($fh !== false) {
        @chmod($path, 0600);
        fwrite($fh, $salt);
        fclose($fh);
        return $salt;
    }

    // Another request created it first (or the dir is not writable)
    $existing = @file_get_contents($path);
    if ($isSalt($existing)) return $existing;
    return hash('sha256', __FILE__ . '|' . php_uname() . '|' . PHP_VERSION);
}

// Opportunistically delete expired rate-limit files. A file whose mtime is older than the window
// can no longer block anyone. Cheap: at most 200 files are looked at per request.
function sweepRateLimitFiles(int $window): void {
    $files = glob(sys_get_temp_dir() . '/rl_*.json', GLOB_NOSORT);
    if (!is_array($files)) return;
    $threshold = time() - $window;
    foreach (array_slice($files, 0, 200) as $f) {
        $mtime = @filemtime($f);
        if ($mtime !== false && $mtime < $threshold) @unlink($f);
    }
}

// --- Security headers ---
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// --- CORS: restrict to own domain ---
$allowedOrigins = ['https://www.ms-bauconsult.de', 'https://ms-bauconsult.de'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

// All responses of this endpoint are JSON (also 405)
header('Content-Type: application/json; charset=utf-8');

switch ($_SERVER['REQUEST_METHOD'] ?? '') {
    case 'OPTIONS':
        header('Access-Control-Allow-Methods: POST');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Max-Age: 86400');
        exit;

    case 'POST':
        // Remove expired rate-limit files (the rate limit itself is checked just before mail())
        sweepRateLimitFiles($rateWindow);

        // Validate Content-Type: exact media type (parameters like charset are ignored).
        // A substring match would let a CORS-safelisted "text/plain;application/json" through.
        $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
        if ($contentType !== 'application/json') {
            http_response_code(400);
            echo json_encode(['error' => 'Ungültige Anfrage.']);
            exit;
        }

        // Parse JSON body
        $raw    = file_get_contents('php://input');
        $params = json_decode($raw, true);

        if (!is_array($params)) {
            http_response_code(400);
            echo json_encode(['error' => 'Ungültige Anfrage.']);
            exit;
        }

        // Honeypot: bots fill hidden fields, humans don't
        // Time trap: forms submitted faster than 3 s after page load are bots
        // Return fake success so attackers learn nothing about the mechanism
        // Any non-empty string counts as filled (also "0"); non-string values are never sent by the form
        $hp       = $params['hp_website'] ?? '';
        $hpFilled = is_string($hp) ? trim($hp) !== '' : true;
        $elapsed  = $params['t'] ?? null;
        if ($hpFilled || !is_numeric($elapsed) || $elapsed < 3000) {
            http_response_code(200);
            echo json_encode(['success' => true]);
            exit;
        }

        // Non-string values (arrays, numbers) are treated as empty
        $field = fn(string $key): string => is_string($params[$key] ?? null) ? trim($params[$key]) : '';

        $name    = $field('name');
        $email   = $field('email');
        $phone   = $field('phone');
        $message = $field('message');

        // Required fields (phone is optional)
        if ($name === '' || $email === '' || $message === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Bitte füllen Sie alle Pflichtfelder aus.']);
            exit;
        }

        // Count characters, not bytes, to match the client maxlength
        $len = fn(string $s): int => function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);

        // Length limits
        if ($len($name) > 100) {
            http_response_code(400);
            echo json_encode(['error' => 'Der Name darf höchstens 100 Zeichen lang sein.']);
            exit;
        }
        if ($len($email) > 254) {
            http_response_code(400);
            echo json_encode(['error' => 'Bitte geben Sie eine gültige E-Mail-Adresse an.']);
            exit;
        }
        // Name: letters plus space, hyphen, apostrophe (also typographic ’), dot (e.g. "Dr. Müller-O'Brien"), at least 2 letters
        if (!preg_match('/^(?=(?:.*\p{L}){2})[\p{L}\p{M} .\'’\-]+$/u', $name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben; erlaubt sind Buchstaben, Leerzeichen, Punkt, Bindestrich und Apostroph).']);
            exit;
        }
        // Phone: no letters; digits with optional + ( ) / - and spaces, at least 6 digits
        if ($len($phone) > 30 || ($phone !== '' && (!preg_match('/^\+?[0-9()\/\- ]+$/', $phone) || preg_match_all('/[0-9]/', $phone) < 6))) {
            http_response_code(400);
            echo json_encode(['error' => 'Bitte geben Sie eine gültige Telefonnummer an.']);
            exit;
        }
        if ($len($message) > 5000) {
            http_response_code(400);
            echo json_encode(['error' => 'Die Nachricht darf höchstens 5000 Zeichen lang sein.']);
            exit;
        }

        // Validate email format: PHP's RFC check plus a strict pattern that requires a real TLD
        $emailPattern = '/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match($emailPattern, $email)) {
            http_response_code(400);
            echo json_encode(['error' => 'Bitte geben Sie eine gültige E-Mail-Adresse an.']);
            exit;
        }

        // Strip CR/LF/null from all header-bound values (header injection prevention)
        $name  = str_replace(["\r", "\n", "\0"], '', $name);
        $email = str_replace(["\r", "\n", "\0"], '', $email);
        $phone = str_replace(["\r", "\n", "\0"], '', $phone);

        // Rate limit: only submissions that passed validation and the bot checks and would
        // actually send a mail count (a visitor correcting typos is never locked out)
        $cacheFile = sys_get_temp_dir() . '/rl_' . hash_hmac('sha256', getClientIp($behindProxy), getRateLimitSalt()) . '.json';
        if (!checkRateLimit($cacheFile, $rateLimit, $rateWindow)) {
            http_response_code(429);
            echo json_encode(['error' => 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.']);
            exit;
        }

        // Build plain-text email body (no HTML, so no XSS risk in mail client)
        // Subject is MIME-encoded (RFC 2047, folded) so umlauts in names survive (e.g. "Müller")
        $recipient   = 'info@ms-bauconsult.de';
        $subjectText = 'Nachricht von ' . $name;
        $subject     = function_exists('mb_encode_mimeheader')
            ? mb_encode_mimeheader($subjectText, 'UTF-8', 'B', "\r\n")
            : '=?UTF-8?B?' . base64_encode($subjectText) . '?=';
        $body      = "Name:     " . $name . "\r\n"
                   . "E-Mail:   " . $email . "\r\n"
                   . "Telefon:  " . ($phone !== '' ? $phone : '-') . "\r\n\r\n"
                   . "Nachricht:\r\n" . $message;

        // Use site address in From; put sender in Reply-To so replies go to them
        $headers   = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/plain; charset=utf-8';
        $headers[] = 'Content-Transfer-Encoding: 8bit';
        $headers[] = 'From: no-reply@ms-bauconsult.de';
        $headers[] = 'Reply-To: ' . $email;

        $sent = mail($recipient, $subject, $body, implode("\r\n", $headers));

        if ($sent) {
            http_response_code(200);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch.']);
        }
        break;

    default:
        header('Allow: POST', true, 405);
        echo json_encode(['error' => 'Methode nicht erlaubt.']);
        exit;
}
