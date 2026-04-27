/* ═══════════════════════════════════════════
   COFFEESTOP — LOGIN PAGE JAVASCRIPT
   login.js
═══════════════════════════════════════════ */

/* ══════════════════════════════
   CASHIER ACCOUNTS
   In a real system these would be server-validated.
   Stored here for demo purposes only.
══════════════════════════════ */
const CASHIER_ACCOUNTS = [
  { username: 'cashier01', password: 'coffee123', displayName: 'Cashier 01' },
  { username: 'cashier02', password: 'latte456',  displayName: 'Cashier 02' },
  { username: 'manager',   password: 'admin789',  displayName: 'Manager'    },
];

/* ══════════════════════════════
   SESSION KEY
══════════════════════════════ */
const SESSION_KEY = 'coffeestop_cashier_session';

/* ══════════════════════════════
   SCREEN NAVIGATION
══════════════════════════════ */
function showRoleScreen() {
  document.getElementById('login-screen').style.display = 'none';
  const rs = document.getElementById('role-screen');
  rs.style.display = '';
  rs.style.animation = 'none';
  rs.offsetHeight; // reflow
  rs.style.animation = '';
  clearErrors();
}

function showCashierLogin() {
  document.getElementById('role-screen').style.display = 'none';
  const ls = document.getElementById('login-screen');
  ls.style.display = '';
  ls.style.animation = 'none';
  ls.offsetHeight;
  ls.style.animation = '';
  // Focus username field
  setTimeout(() => document.getElementById('username').focus(), 100);
}

/* ══════════════════════════════
   CUSTOMER — NO LOGIN NEEDED
══════════════════════════════ */
function goCustomer() {
  // Animate card
  const card = document.getElementById('customer-card');
  card.style.transform = 'scale(0.96)';
  card.style.borderColor = 'var(--accent)';

  setTimeout(() => {
    window.location.href = 'landpage.html';
  }, 250);
}

/* ══════════════════════════════
   CASHIER LOGIN HANDLER
══════════════════════════════ */
function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  let valid = true;

  // Basic validation
  if (!username) {
    showFieldError('username', 'Username is required');
    valid = false;
  }
  if (!password) {
    showFieldError('password', 'Password is required');
    valid = false;
  }
  if (!valid) return;

  // Loading state
  setLoading(true);

  // Simulate async auth (300ms)
  setTimeout(() => {
    const account = CASHIER_ACCOUNTS.find(
      a => a.username === username && a.password === password
    );

    if (account) {
      // Save session
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        username:    account.username,
        displayName: account.displayName,
        loginTime:   new Date().toISOString(),
      }));

      // Success flash
      const flash = document.createElement('div');
      flash.className = 'success-flash';
      document.body.appendChild(flash);

      setTimeout(() => {
        window.location.href = 'cashier.html';
      }, 400);

    } else {
      setLoading(false);
      showLoginError();
      // Shake the form
      document.getElementById('username').classList.add('error');
      document.getElementById('password').classList.add('error');
      document.getElementById('password').value = '';
    }
  }, 320);
}

/* ══════════════════════════════
   LOADING STATE
══════════════════════════════ */
function setLoading(on) {
  const btn     = document.getElementById('login-btn');
  const text    = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-btn-spinner');
  btn.disabled        = on;
  text.style.display  = on ? 'none' : '';
  spinner.style.display = on ? '' : 'none';
}

/* ══════════════════════════════
   ERROR HELPERS
══════════════════════════════ */
function showFieldError(field, msg) {
  document.getElementById('err-' + field).textContent = msg;
  document.getElementById(field).classList.add('error');
}

function showLoginError() {
  const el = document.getElementById('login-error');
  el.style.display = '';
  // Re-trigger animation
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
}

function clearErrors() {
  ['username', 'password'].forEach(f => {
    document.getElementById('err-' + f).textContent = '';
    document.getElementById(f).classList.remove('error');
  });
  document.getElementById('login-error').style.display = 'none';
}

/* ══════════════════════════════
   TOGGLE PASSWORD VISIBILITY
══════════════════════════════ */
function togglePassword() {
  const input  = document.getElementById('password');
  const btn    = document.getElementById('toggle-pw');
  const isHidden = input.type === 'password';
  input.type   = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
}

/* ══════════════════════════════
   FILL DEMO CREDENTIALS
══════════════════════════════ */
function fillDemo(user, pass) {
  document.getElementById('username').value = user;
  document.getElementById('password').value = pass;
  clearErrors();
  document.getElementById('username').focus();
}

/* ══════════════════════════════
   CLEAR ERRORS ON INPUT
══════════════════════════════ */
['username', 'password'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById(id).classList.remove('error');
    document.getElementById('err-' + id).textContent = '';
    document.getElementById('login-error').style.display = 'none';
  });
});

/* ══════════════════════════════
   ENTER KEY ON USERNAME → FOCUS PASSWORD
══════════════════════════════ */
document.getElementById('username').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('password').focus();
  }
});