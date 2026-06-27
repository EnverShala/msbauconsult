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
        // Standard reverse-proxy header — take only the leftmost (client) IP
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
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

$ip        = getClientIp($behindProxy);
$cacheFile = sys_get_temp_dir() . '/rl_' . md5($ip) . '.json';

// --- Security headers ---
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// --- CORS: restrict to own domain ---
$allowedOrigins = ['https://ms-bauconsult.de', 'https://ms-bauconsult.de'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'OPTIONS':
        header('Access-Control-Allow-Methods: POST');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Max-Age: 86400');
        exit;

    case 'POST':
        header('Content-Type: application/json; charset=utf-8');

        // Rate limit check
        if (!checkRateLimit($cacheFile, $rateLimit, $rateWindow)) {
            http_response_code(429);
            echo json_encode(['error' => 'Too many requests. Please try again later.']);
            exit;
        }

        // Validate Content-Type
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request.']);
            exit;
        }

        // Parse JSON body
        $raw    = file_get_contents('php://input');
        $params = json_decode($raw, true);

        if (!is_array($params)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request.']);
            exit;
        }

        // Honeypot: bots fill hidden fields, humans don't
        // Return fake success so attackers learn nothing about the mechanism
        if (!empty($params['website'])) {
            http_response_code(200);
            echo json_encode(['success' => true]);
            exit;
        }

        $name    = trim($params['name']    ?? '');
        $email   = trim($params['email']   ?? '');
        $message = trim($params['message'] ?? '');

        // Required fields
        if ($name === '' || $email === '' || $message === '') {
            http_response_code(400);
            echo json_encode(['error' => 'All fields are required.']);
            exit;
        }

        // Length limits
        if (strlen($name) > 100) {
            http_response_code(400);
            echo json_encode(['error' => 'Name must be 100 characters or fewer.']);
            exit;
        }
        if (strlen($email) > 254) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email address.']);
            exit;
        }
        if (strlen($message) > 5000) {
            http_response_code(400);
            echo json_encode(['error' => 'Message must be 5000 characters or fewer.']);
            exit;
        }

        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email address.']);
            exit;
        }

        // Strip CR/LF/null from all header-bound values (header injection prevention)
        $name  = str_replace(["\r", "\n", "\0"], '', $name);
        $email = str_replace(["\r", "\n", "\0"], '', $email);

        // Build plain-text email body (no HTML, so no XSS risk in mail client)
        $recipient = 'info@ms-bauconsult.de';
        $subject   = 'Nachricht von ' . $name;
        $body      = "Name:    " . $name . "\r\n"
                   . "E-Mail:   " . $email . "\r\n\r\n"
                   . "Nachricht:\r\n" . $message;

        // Use site address in From; put sender in Reply-To so replies go to them
        $headers   = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/plain; charset=utf-8';
        $headers[] = 'From: no-reply@ms-bauconsult.de';
        $headers[] = 'Reply-To: ' . $email;

        $sent = mail($recipient, $subject, $body, implode("\r\n", $headers));

        if ($sent) {
            http_response_code(200);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to send message. Please try again.']);
        }
        break;

    default:
        header('Allow: POST', true, 405);
        echo json_encode(['error' => 'Method not allowed.']);
        exit;
}
