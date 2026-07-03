/* @ds-bundle: {"format":3,"namespace":"LAMBODesignSystem_baf198","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"HexButton","sourcePath":"components/feedback/HexButton.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Navbar","sourcePath":"components/navigation/Navbar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"aa1b2a3f77e0","components/core/Button.jsx":"1b1ddc3b4a2a","components/core/Card.jsx":"9997ff2d062e","components/feedback/HexButton.jsx":"caea0b1c52dc","components/feedback/ProgressBar.jsx":"cef4f662e7bb","components/forms/Input.jsx":"ca9fb85b9ee5","components/forms/Switch.jsx":"dfe64a77d051","components/navigation/Navbar.jsx":"d281d168336b","components/navigation/Tabs.jsx":"9223ac6f510a","ui_kits/website/Hero.jsx":"d8295342e13f","ui_kits/website/Lineup.jsx":"0d30e1dcc18c","ui_kits/website/News.jsx":"3e64ed95f8d3","ui_kits/website/SiteFooter.jsx":"b50a989f5d8a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LAMBODesignSystem_baf198 = window.LAMBODesignSystem_baf198 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Badge — tiny metallic pill / micro-label.
 * Uppercase, near-zero radius, achromatic by default.
 */
function Badge({
  variant = 'gray',
  children,
  style,
  ...rest
}) {
  const variants = {
    gray: {
      background: 'var(--gray-400)',
      color: 'var(--white)',
      border: 'none'
    },
    gold: {
      background: 'var(--gold)',
      color: 'var(--black)',
      border: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--white)',
      border: '1px solid var(--border-ghost)'
    },
    dark: {
      background: 'var(--charcoal)',
      color: 'var(--gray-400)',
      border: 'none'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-micro)',
      fontWeight: 'var(--fw-bold)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      lineHeight: 1,
      padding: '6px 8px',
      borderRadius: 'var(--radius-2)',
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Button — sharp-cornered, uppercase action.
 * Gold accent is the primary; ghost is the secondary on dark.
 */
function Button({
  variant = 'accent',
  size = 'large',
  disabled = false,
  fullWidth = false,
  href,
  children,
  style,
  ...rest
}) {
  const sizes = {
    large: {
      padding: '16px 24px',
      fontSize: 'var(--fs-button)',
      fontWeight: 'var(--fw-regular)',
      letterSpacing: '0'
    },
    standard: {
      padding: '12px 20px',
      fontSize: 'var(--fs-button-sm)',
      fontWeight: 'var(--fw-bold)',
      letterSpacing: 'var(--ls-button)'
    },
    small: {
      padding: '8px 14px',
      fontSize: 'var(--fs-button-sm)',
      fontWeight: 'var(--fw-medium)',
      letterSpacing: 'var(--ls-button)'
    }
  };
  const variants = {
    accent: {
      background: 'var(--gold)',
      color: 'var(--black)',
      border: 'none'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--white)',
      border: '1px solid var(--border-ghost)',
      opacity: 0.85
    },
    white: {
      background: 'var(--white)',
      color: 'var(--charcoal)',
      border: 'none'
    },
    black: {
      background: 'var(--black)',
      color: 'var(--white)',
      border: '1px solid var(--graphite)'
    },
    gray: {
      background: 'var(--gray-400)',
      color: 'var(--charcoal)',
      border: 'none'
    }
  };
  const base = {
    fontFamily: 'var(--font-ui)',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-0)',
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-8)',
    width: fullWidth ? '100%' : 'auto',
    minHeight: size === 'large' ? 'var(--touch-min)' : 'auto',
    transition: 'var(--transition-color)',
    opacity: disabled ? 0.4 : variants[variant].opacity ?? 1,
    textDecoration: 'none',
    ...sizes[size],
    ...variants[variant],
    ...style
  };
  const hoverEnter = e => {
    if (disabled) return;
    const t = e.currentTarget;
    if (variant === 'accent') t.style.background = 'var(--gold-dark)';else if (variant === 'ghost') {
      t.style.background = 'var(--teal)';
      t.style.opacity = 1;
      t.style.borderColor = 'var(--teal)';
    } else if (variant === 'white') t.style.background = 'var(--mist)';else if (variant === 'gray') t.style.background = 'var(--gray-500)';else if (variant === 'black') t.style.background = 'var(--charcoal)';
  };
  const hoverLeave = e => {
    if (disabled) return;
    const t = e.currentTarget;
    Object.assign(t.style, {
      background: variants[variant].background,
      opacity: String(variants[variant].opacity ?? 1),
      borderColor: variant === 'ghost' ? 'var(--border-ghost)' : variants[variant].border?.includes('graphite') ? 'var(--graphite)' : t.style.borderColor
    });
  };
  const Tag = href ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    disabled: href ? undefined : disabled,
    style: base,
    onMouseEnter: hoverEnter,
    onMouseLeave: hoverLeave
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Card — charcoal surface on the black canvas.
 * Elevation by surface color, not shadow. Sharp corners.
 * Optional media slot (full-bleed), eyebrow, title, body, footer.
 */
function Card({
  media,
  eyebrow,
  title,
  children,
  footer,
  interactive = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: hover ? 'var(--graphite)' : 'var(--surface-card)',
      color: 'var(--text-primary)',
      borderRadius: 'var(--radius-0)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'background-color var(--dur-base) var(--ease-standard)',
      ...style
    }
  }, rest), media != null && /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      aspectRatio: '16 / 9',
      background: 'var(--iron)',
      overflow: 'hidden'
    }
  }, media), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-24)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-12)'
    }
  }, eyebrow != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-label)',
      fontWeight: 'var(--fw-medium)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--text-muted)'
    }
  }, eyebrow), title != null && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-heading)',
      lineHeight: 'var(--lh-heading)',
      fontWeight: 'var(--fw-regular)',
      textTransform: 'uppercase'
    }
  }, title), children != null && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 'var(--fs-body)',
      lineHeight: 'var(--lh-body)'
    }
  }, children), footer != null && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-4)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/feedback/HexButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO HexButton — hexagonal outline control echoing the brand's
 * geometric DNA. Used for video play/pause and accent icon actions.
 */
function HexButton({
  size = 48,
  icon = 'pause',
  onClick,
  label = 'Toggle playback',
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const stroke = hover ? 'var(--gold)' : 'var(--white)';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      width: size,
      height: size,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 48 48",
    width: size,
    height: size,
    style: {
      position: 'absolute',
      inset: 0,
      transition: 'stroke var(--dur-base)'
    }
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "24,3 42,13.5 42,34.5 24,45 6,34.5 6,13.5",
    fill: "none",
    stroke: stroke,
    strokeWidth: "1.5"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      gap: 4
    }
  }, icon === 'pause' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 14,
      background: stroke
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 14,
      background: stroke
    }
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 0,
      height: 0,
      marginLeft: 3,
      borderLeft: `12px solid ${stroke}`,
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent'
    }
  })));
}
Object.assign(__ds_scope, { HexButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/HexButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO ProgressBar — thin horizon line at hero section bottoms.
 * White track on transparent; gold fill optional.
 */
function ProgressBar({
  value = 0,
  accent = false,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "progressbar",
    "aria-valuenow": pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    style: {
      width: '100%',
      height: 2,
      background: 'rgba(255,255,255,0.25)',
      borderRadius: 'var(--radius-0)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      background: accent ? 'var(--gold)' : 'var(--white)',
      transition: 'width var(--dur-slow) var(--ease-standard)'
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Input — minimal, sharp. White text on dark, hairline border.
 * Uppercase label above. Focus ring in cyan.
 */
function Input({
  label,
  hint,
  error,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-8)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-label)',
      fontWeight: 'var(--fw-medium)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      background: 'var(--charcoal)',
      color: 'var(--white)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-body)',
      padding: '12px 16px',
      border: `1px solid ${error ? 'var(--gold-dark)' : focus ? 'var(--cyan)' : 'var(--graphite)'}`,
      borderRadius: 'var(--radius-0)',
      outline: 'none',
      transition: 'border-color var(--dur-base) var(--ease-standard)',
      ...style
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-micro)',
      letterSpacing: 'var(--ls-micro)',
      color: error ? 'var(--gold-text)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Switch — the sole rounded element (20px radius).
 * Gold when on. Color-only transition.
 */
function Switch({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  style,
  ...rest
}) {
  const isControlled = checked !== undefined;
  const [on, setOn] = React.useState(defaultChecked);
  const value = isControlled ? checked : on;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setOn(!value);
    onChange && onChange(!value);
  };
  const track = /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": value,
    disabled: disabled,
    onClick: toggle,
    style: {
      width: 44,
      height: 24,
      padding: 2,
      borderRadius: 'var(--radius-switch)',
      border: '1px solid var(--border-input)',
      background: value ? 'var(--gold)' : 'var(--charcoal)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      transition: 'background-color var(--dur-base) var(--ease-standard)',
      flexShrink: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: value ? 'var(--black)' : 'var(--gray-400)',
      transform: value ? 'translateX(20px)' : 'translateX(0)',
      transition: 'transform var(--dur-base) var(--ease-standard), background-color var(--dur-base) var(--ease-standard)'
    }
  }));
  if (!label) return track;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-12)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, track, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-body)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Navbar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Navbar — white marks floating in darkness.
 * Centered wordmark, MENU + hamburger left, action icons right.
 * Transparent over the black canvas; no border, no shadow.
 */
function Navbar({
  brand = 'LAMBO',
  onMenu,
  actions,
  sticky = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: sticky ? 'sticky' : 'relative',
      top: 0,
      zIndex: 50,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: 'var(--space-20) var(--space-40)',
      background: 'transparent',
      color: 'var(--white)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onMenu,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-12)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--white)',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-caption)',
      fontWeight: 'var(--fw-regular)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-button)',
      justifySelf: 'start',
      minHeight: 'var(--touch-min)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 4,
      width: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      height: 2,
      background: 'currentColor'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 2,
      background: 'currentColor'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 2,
      background: 'currentColor'
    }
  })), "Menu"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      justifySelf: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-black)',
      fontSize: '26px',
      letterSpacing: '4px',
      textTransform: 'uppercase',
      color: 'var(--white)'
    }
  }, brand), /*#__PURE__*/React.createElement("nav", {
    style: {
      justifySelf: 'end',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-24)'
    }
  }, actions));
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LAMBO Tabs — uppercase labels with a gold underline indicator.
 * Controlled or uncontrolled.
 */
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) {
  const isControlled = value !== undefined;
  const first = defaultValue ?? (tabs[0] && tabs[0].id);
  const [internal, setInternal] = React.useState(first);
  const active = isControlled ? value : internal;
  const select = id => {
    if (!isControlled) setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'inline-flex',
      gap: 'var(--space-32)',
      borderBottom: '1px solid var(--graphite)',
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(t.id),
      style: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 0 12px',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-caption)',
        fontWeight: 'var(--fw-medium)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--ls-button)',
        color: on ? 'var(--white)' : 'var(--text-muted)',
        borderBottom: `2px solid ${on ? 'var(--gold)' : 'transparent'}`,
        marginBottom: -1,
        transition: 'var(--transition-color)'
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
/* LAMBO website — Hero. Full-viewport darkness with a single bold model name. */
const {
  Button,
  HexButton,
  ProgressBar,
  Badge
} = window.LAMBODesignSystem_baf198;
const HERO_MODELS = [{
  id: 'temerario',
  name: 'Temerario',
  tag: 'New · Hybrid',
  line: 'The hybrid super sports car. 920 CV. Pure instinct.'
}, {
  id: 'revuelto',
  name: 'Revuelto',
  tag: 'V12 · HPEV',
  line: 'The first V12 hybrid. A new benchmark for performance.'
}, {
  id: 'urus',
  name: 'Urus SE',
  tag: 'Super SUV',
  line: 'The world\u2019s first Super SUV, now electrified.'
}];
function Hero({
  playing,
  onTogglePlay
}) {
  const [idx, setIdx] = React.useState(0);
  const model = HERO_MODELS[idx];
  React.useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % HERO_MODELS.length), 5200);
    return () => clearTimeout(t);
  }, [idx, playing]);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      minHeight: '92vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      background: `radial-gradient(120% 90% at 50% 0%, #1a1a1a 0%, #000 60%)`,
      padding: '0 var(--space-40) var(--space-56)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(60% 40% at 50% 78%, rgba(255,192,0,0.08), transparent 70%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 'var(--container-wide)',
      width: '100%',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "outline",
    style: {
      marginBottom: 'var(--space-20)'
    }
  }, model.tag), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-regular)',
      textTransform: 'uppercase',
      fontSize: 'clamp(64px, 11vw, 120px)',
      lineHeight: 0.92,
      color: 'var(--white)'
    }
  }, model.name), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 520,
      marginTop: 'var(--space-20)',
      color: 'var(--smoke)',
      fontSize: 'var(--fs-body-lg)',
      lineHeight: 'var(--lh-body-lg)'
    }
  }, model.line), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-16)',
      marginTop: 'var(--space-32)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "large"
  }, "Discover More"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "large"
  }, "Start Configuration")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-24)',
      marginTop: 'var(--space-48)'
    }
  }, /*#__PURE__*/React.createElement(HexButton, {
    icon: playing ? 'pause' : 'play',
    onClick: onTogglePlay
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: (idx + 1) / HERO_MODELS.length * 100,
    accent: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-12)'
    }
  }, HERO_MODELS.map((m, i) => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    onClick: () => setIdx(i),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px 0',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-micro)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      color: i === idx ? 'var(--white)' : 'var(--gray-500)'
    }
  }, m.name))))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Lineup.jsx
try { (() => {
/* LAMBO website — Model lineup. Full-bleed tiles, model name floating in darkness. */
const {
  Button
} = window.LAMBODesignSystem_baf198;
const LINEUP = [{
  id: 'temerario',
  name: 'Temerario',
  spec: '920 CV · V8 Hybrid',
  grad: 'linear-gradient(160deg,#262626,#000)'
}, {
  id: 'revuelto',
  name: 'Revuelto',
  spec: '1015 CV · V12 HPEV',
  grad: 'linear-gradient(160deg,#2a2418,#000)'
}, {
  id: 'urus',
  name: 'Urus SE',
  spec: '800 CV · Super SUV',
  grad: 'linear-gradient(160deg,#1e1e1e,#000)'
}, {
  id: 'huracan',
  name: 'Huracán STO',
  spec: '640 CV · Track',
  grad: 'linear-gradient(160deg,#241c1c,#000)'
}];
function Lineup() {
  const [active, setActive] = React.useState(null);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 'var(--section-pad-y) var(--section-pad-x)',
      background: 'var(--black)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-wide)',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-40)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-regular)',
      textTransform: 'uppercase',
      fontSize: 'var(--fs-title)',
      lineHeight: 'var(--lh-title)',
      color: 'var(--white)'
    }
  }, "The Range"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 'var(--space-16)'
    }
  }, LINEUP.map(m => /*#__PURE__*/React.createElement("article", {
    key: m.id,
    onMouseEnter: () => setActive(m.id),
    onMouseLeave: () => setActive(null),
    style: {
      position: 'relative',
      aspectRatio: '4 / 5',
      background: m.grad,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: 'var(--space-24)',
      overflow: 'hidden',
      cursor: 'pointer',
      outline: active === m.id ? '1px solid var(--gold)' : '1px solid transparent',
      transition: 'outline-color var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: active === m.id ? 'rgba(255,192,0,0.05)' : 'transparent',
      transition: 'background var(--dur-base)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--gray-500)'
    }
  }, m.spec), /*#__PURE__*/React.createElement("h3", {
    style: {
      position: 'relative',
      margin: '6px 0 14px',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-regular)',
      textTransform: 'uppercase',
      fontSize: 'var(--fs-heading)',
      color: 'var(--white)'
    }
  }, m.name), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      opacity: active === m.id ? 1 : 0.0,
      maxHeight: active === m.id ? 60 : 0,
      transition: 'opacity var(--dur-base), max-height var(--dur-base)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "small"
  }, "Explore")))))));
}
window.Lineup = Lineup;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Lineup.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/News.jsx
try { (() => {
/* LAMBO website — News grid on charcoal, using the Card primitive. */
const {
  Card,
  Button,
  Tabs,
  Badge
} = window.LAMBODesignSystem_baf198;
const NEWS = [{
  cat: 'Motorsport',
  title: 'Lambo Arena 2024 Opens',
  body: 'A weekend of racing, reveals and pure adrenaline at the home of the bull.',
  grad: 'linear-gradient(135deg,#2a2418,#000)'
}, {
  cat: 'Innovation',
  title: 'Hybrid V12 Explained',
  body: 'How three electric motors reshape the most iconic engine in motoring.',
  grad: 'linear-gradient(135deg,#202020,#000)'
}, {
  cat: 'Lifestyle',
  title: 'The Collection Drop',
  body: 'New season apparel and accessories, engineered with the same obsession.',
  grad: 'linear-gradient(135deg,#241c1c,#000)'
}];
function News() {
  const [tab, setTab] = React.useState('all');
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 'var(--section-pad-y) var(--section-pad-x)',
      background: 'var(--iron)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-wide)',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: 'var(--space-24)',
      marginBottom: 'var(--space-32)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-regular)',
      textTransform: 'uppercase',
      fontSize: 'var(--fs-title)',
      color: 'var(--white)'
    }
  }, "Latest"), /*#__PURE__*/React.createElement(Tabs, {
    tabs: [{
      id: 'all',
      label: 'All'
    }, {
      id: 'motorsport',
      label: 'Motorsport'
    }, {
      id: 'innovation',
      label: 'Innovation'
    }],
    value: tab,
    onChange: setTab
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 'var(--space-16)'
    }
  }, NEWS.map(n => /*#__PURE__*/React.createElement(Card, {
    key: n.title,
    interactive: true,
    eyebrow: n.cat,
    title: n.title,
    media: /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        height: '100%',
        background: n.grad
      }
    }),
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "small"
    }, "Read More")
  }, n.body)))));
}
window.News = News;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/News.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteFooter.jsx
try { (() => {
/* LAMBO website — Footer + slide-in menu drawer. */
const {
  Button,
  Input
} = window.LAMBODesignSystem_baf198;
const NAV_GROUPS = [{
  h: 'Models',
  items: ['Temerario', 'Revuelto', 'Urus SE', 'Huracán']
}, {
  h: 'World',
  items: ['Motorsport', 'Heritage', 'Collection', 'Events']
}, {
  h: 'Owners',
  items: ['Configurator', 'Dealers', 'Services', 'Contact']
}];
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--black)',
      borderTop: '1px solid var(--graphite)',
      padding: 'var(--section-pad-y) var(--section-pad-x) var(--space-32)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-wide)',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.4fr repeat(3, 1fr)',
      gap: 'var(--space-48)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-black)',
      fontSize: 28,
      letterSpacing: 4,
      textTransform: 'uppercase',
      color: 'var(--white)'
    }
  }, "LAMBO"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--gray-500)',
      fontSize: 'var(--fs-body)',
      maxWidth: 320,
      marginTop: 'var(--space-16)'
    }
  }, "Stay informed on reveals, events and the world of the bull."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-12)',
      alignItems: 'flex-end',
      marginTop: 'var(--space-16)',
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    placeholder: "you@example.com"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "standard"
  }, "Join"))), NAV_GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--gray-400)',
      marginBottom: 'var(--space-16)'
    }
  }, g.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-12)'
    }
  }, g.items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--smoke)',
      fontSize: 'var(--fs-body)'
    }
  }, it))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-wide)',
      margin: 'var(--space-48) auto 0',
      paddingTop: 'var(--space-24)',
      borderTop: '1px solid var(--graphite)',
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 'var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gray-550)',
      fontSize: 'var(--fs-micro)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)'
    }
  }, "\xA9 2026 LAMBO \u2014 A design-system demo"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gray-550)',
      fontSize: 'var(--fs-micro)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)'
    }
  }, "Privacy \xB7 Cookies \xB7 Legal")));
}
function MenuDrawer({
  open,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      pointerEvents: open ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--overlay-70)',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--dur-base) var(--ease-standard)'
    }
  }), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: 'min(440px, 84vw)',
      background: 'var(--charcoal)',
      padding: 'var(--space-48) var(--space-40)',
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform var(--dur-slow) var(--ease-standard)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-32)',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      alignSelf: 'flex-start',
      background: 'none',
      border: 'none',
      color: 'var(--white)',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-caption)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-button)',
      cursor: 'pointer'
    }
  }, "\u2715 Close"), NAV_GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--gray-400)',
      marginBottom: 'var(--space-12)'
    }
  }, g.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-8)'
    }
  }, g.items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: onClose,
    style: {
      color: 'var(--white)',
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      fontSize: 'var(--fs-heading)'
    }
  }, it))))))));
}
Object.assign(window, {
  SiteFooter,
  MenuDrawer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteFooter.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.HexButton = __ds_scope.HexButton;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
