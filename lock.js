/**
 * BBT — Client-side password gate
 * Add <script src="lock.js"></script> as the FIRST script in every HTML page's <head>.
 *
 * To change the password: update PASSWORD_HASH below.
 * To generate a new hash: run this in your browser console:
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpassword'))
 *     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
 *
 * Current password: bbt2026
 */

(function () {
  const PASSWORD_HASH = '147275b13964c1f62e00bf97c7ef2a8b1b43451e90074afb29947191a81e0eb7'; // bbt2026
  const SESSION_KEY   = 'bbt_auth';
  const MAX_ATTEMPTS  = 5;
  const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes

  // Already authenticated this session? Do nothing.
  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  // Hide the page immediately while we wait for <body>
  const hideStyle = document.createElement('style');
  hideStyle.id = 'bbt-hide';
  hideStyle.textContent = 'body { visibility: hidden !important; }';
  document.head.appendChild(hideStyle);

  // Wait for <body> to exist, then show the gate
  function whenBody(fn) {
    if (document.body) { fn(); return; }
    new MutationObserver(function(_, obs) {
      if (document.body) { obs.disconnect(); fn(); }
    }).observe(document.documentElement, { childList: true });
  }

  const lockoutUntil = parseInt(localStorage.getItem('bbt_lockout') || '0', 10);
  const now = Date.now();

  whenBody(function() {
    if (now < lockoutUntil) {
      showGate(true, Math.ceil((lockoutUntil - now) / 60000));
    } else {
      showGate(false, 0);
    }
  });

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function getAttempts() { return parseInt(localStorage.getItem('bbt_attempts') || '0', 10); }
  function setAttempts(n) { localStorage.setItem('bbt_attempts', n); }

  function showGate(locked, minutesLeft) {
    document.documentElement.style.overflow = 'hidden';

    const style = document.createElement('style');
    style.textContent = [
      "@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');",
      "#bbt-gate-overlay{position:fixed;inset:0;z-index:99999;background:#0e0e0f;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;}",
      "#bbt-gate-box{width:100%;max-width:380px;padding:48px 40px;background:#161617;border:1px solid #2a2a2d;border-radius:16px;text-align:center;animation:gateIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;}",
      "@keyframes gateIn{from{opacity:0;transform:scale(0.94) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}",
      "#bbt-gate-emoji{font-size:36px;display:block;margin-bottom:16px;}",
      "#bbt-gate-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#ff4d6d;letter-spacing:-0.01em;margin-bottom:6px;}",
      "#bbt-gate-sub{font-size:11px;color:#888890;margin-bottom:32px;line-height:1.6;}",
      "#bbt-gate-input{width:100%;background:#0e0e0f;border:1px solid #2a2a2d;border-radius:8px;padding:12px 16px;font-family:'DM Mono',monospace;font-size:14px;color:#e8e8ea;outline:none;text-align:center;letter-spacing:0.1em;transition:border-color 0.2s;margin-bottom:12px;box-sizing:border-box;}",
      "#bbt-gate-input:focus{border-color:#ff4d6d;}",
      "#bbt-gate-input.error{border-color:#ff4d6d;animation:shake 0.35s ease;}",
      "@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}",
      "#bbt-gate-btn{width:100%;background:#ff4d6d;border:none;border-radius:8px;padding:12px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:white;cursor:pointer;transition:opacity 0.15s,transform 0.1s;letter-spacing:0.03em;}",
      "#bbt-gate-btn:hover:not(:disabled){opacity:0.85;}",
      "#bbt-gate-btn:active:not(:disabled){transform:scale(0.98);}",
      "#bbt-gate-btn:disabled{opacity:0.4;cursor:not-allowed;}",
      "#bbt-gate-error{margin-top:12px;font-size:11px;color:#ff8fa3;min-height:16px;}",
      "#bbt-gate-footer{margin-top:24px;font-size:10px;color:#444448;}"
    ].join('');
    document.head.appendChild(style);

    // Remove the visibility:hidden now that the gate is ready
    var hider = document.getElementById('bbt-hide');
    if (hider) hider.remove();

    var overlay = document.createElement('div');
    overlay.id = 'bbt-gate-overlay';

    var attemptsLeft = MAX_ATTEMPTS - getAttempts();
    var innerHtml = '<div id="bbt-gate-box">'
      + '<span id="bbt-gate-emoji">🍔</span>'
      + '<div id="bbt-gate-title">Bloomsbury Burger Therapeutics</div>'
      + '<div id="bbt-gate-sub">pre-seed · pre-revenue · pre-sanity<br>Internal access only.</div>';

    if (locked) {
      innerHtml += '<div style="background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.2);border-radius:8px;padding:16px;font-size:12px;color:#ff8fa3;line-height:1.6;">'
        + '🔒 Too many failed attempts.<br>Try again in <strong>' + minutesLeft + ' min</strong>.</div>';
    } else {
      innerHtml += '<input id="bbt-gate-input" type="password" placeholder="enter password" autocomplete="current-password" />'
        + '<button id="bbt-gate-btn">Unlock →</button>'
        + '<div id="bbt-gate-error">' + (attemptsLeft < MAX_ATTEMPTS ? attemptsLeft + ' attempt' + (attemptsLeft !== 1 ? 's' : '') + ' remaining' : '') + '</div>';
    }

    innerHtml += '<div id="bbt-gate-footer">bloomsbury burger therapeutics plc © 2026</div></div>';
    overlay.innerHTML = innerHtml;
    document.body.appendChild(overlay);

    if (locked) return;

    var input = document.getElementById('bbt-gate-input');
    var btn   = document.getElementById('bbt-gate-btn');
    var err   = document.getElementById('bbt-gate-error');

    function attempt() {
      var val = input.value;
      if (!val) return;
      btn.disabled = true;
      btn.textContent = 'Checking...';

      sha256(val).then(function(hash) {
        if (hash === PASSWORD_HASH) {
          sessionStorage.setItem(SESSION_KEY, '1');
          localStorage.removeItem('bbt_attempts');
          localStorage.removeItem('bbt_lockout');
          overlay.style.transition = 'opacity 0.3s';
          overlay.style.opacity = '0';
          setTimeout(function() {
            overlay.remove();
            document.documentElement.style.overflow = '';
          }, 300);
        } else {
          var attempts = getAttempts() + 1;
          setAttempts(attempts);
          input.classList.add('error');
          setTimeout(function() { input.classList.remove('error'); }, 400);
          input.value = '';
          btn.disabled = false;
          btn.textContent = 'Unlock →';

          if (attempts >= MAX_ATTEMPTS) {
            localStorage.setItem('bbt_lockout', Date.now() + LOCKOUT_MS);
            err.textContent = 'Locked for 15 minutes.';
            btn.disabled = true;
            input.disabled = true;
          } else {
            var left = MAX_ATTEMPTS - attempts;
            err.textContent = 'Wrong password. ' + left + ' attempt' + (left !== 1 ? 's' : '') + ' remaining.';
          }
        }
      });
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') attempt(); });
    input.focus();
  }
})();
