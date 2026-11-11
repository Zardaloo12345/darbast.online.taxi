/* =========================================================
   دربست — همه چیز در یک فایل
   ========================================================= */

/* ---------- تم ---------- */
(function initTheme() {
  const saved = localStorage.getItem('darbast_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
})();

function updateThemeBtn(theme) {
  document.querySelector('.icon-btn[onclick="toggleTheme()"]').textContent =
    theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('darbast_theme', next);
  updateThemeBtn(next);
}

/* ---------- احراز هویت ---------- */
const AUTH_KEY = 'darbast_users';
const SESSION_KEY = 'darbast_session';

const getUsers = () => JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
const saveUsers = (u) => localStorage.setItem(AUTH_KEY, JSON.stringify(u));

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h.toString(36);
}

function signup({ name, phone, password, role }) {
  const users = getUsers();
  if (users.find(u => u.phone === phone))
    return { ok: false, error: 'این شماره قبلاً ثبت شده است' };
  const user = { id: Date.now(), name, phone, role, pass: hash(password) };
  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
  return { ok: true, user };
}

function login({ phone, password, role }) {
  const user = getUsers().find(u => u.phone === phone && u.role === role);
  if (!user || user.pass !== hash(password))
    return { ok: false, error: 'شماره یا رمز عبور اشتباه است' };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
  return { ok: true, user };
}

function currentUser() {
  const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!s) return null;
  return getUsers().find(u => u.id === s.id) || null;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

/* ---------- روتینگ ساده ---------- */
function showView(viewId) {
  ['authView', 'passengerView', 'driverView'].forEach(v =>
    document.getElementById(v).classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
}

function renderApp() {
  const u = currentUser();
  const badge = document.getElementById('userBadge');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!u) {
    badge.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    showView('authView');
    return;
  }

  badge.textContent = u.name;
  badge.className = 'tag' + (u.role === 'driver' ? ' driver' : '');
  logoutBtn.classList.remove('hidden');

  if (u.role === 'passenger') { showView('passengerView'); renderPassenger(u); }
  else                        { showView('driverView');    renderDriver(u); }
}

/* ---------- فرم ورود ---------- */
let authMode = 'login';
let selectedRole = 'passenger';

function pickRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.role === role));
  document.getElementById('authError').textContent = '';
}

function switchAuthMode(mode) {
  authMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabSignup').classList.toggle('active', mode === 'signup');
  document.getElementById('nameLabel').classList.toggle('hidden', mode !== 'signup');
  document.getElementById('submitBtn').textContent = mode === 'signup' ? 'ثبت‌نام' : 'ورود';
  document.getElementById('authError').textContent = '';
}

document.getElementById('authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = document.getElementById('authError');
  err.textContent = '';

  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();

  let result;
  if (authMode === 'signup') {
    if (!name) { err.textContent = 'نام را وارد کنید'; return; }
    result = signup({ name, phone, password, role: selectedRole });
  } else {
    result = login({ phone, password, role: selectedRole });
  }

  if (!result.ok) { err.textContent = result.error; return; }
  document.getElementById('authForm').reset();
  renderApp();
});

/* ---------- سفارش‌ها ---------- */
const ORDERS_KEY = 'darbast_orders';
const getOrders = () => JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
const saveOrders = (o) => localStorage.setItem(ORDERS_KEY, JSON.stringify(o));

const statusLabel = s => ({
  pending: '⏳ در انتظار راننده',
  accepted: '🚗 راننده در راه است',
  done: '✅ سفر به پایان رسید'
}[s] || s);

/* مسافر */
document.getElementById('orderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = currentUser();
  if (!u) return;

  const order = {
    id: Date.now(),
    passengerId: u.id,
    passengerName: u.name,
    origin: document.getElementById('origin').value.trim(),
    destination: document.getElementById('destination').value.trim(),
    phone: u.phone,
    status: 'pending',
    driverId: null,
    driverName: null,
    createdAt: Date.now()
  };
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  e.target.reset();
  renderPassenger(u);
});

function renderPassenger(user) {
  const list = document.getElementById('passengerOrders');
  const mine = getOrders().filter(o => o.passengerId === user.id);
  list.innerHTML = mine.length ? mine.map(o => `
    <div class="order ${o.status}">
      <b>${o.origin} → ${o.destination}</b>
      <small>${statusLabel(o.status)}</small>
      ${o.driverName ? `<small>راننده: ${o.driverName}</small>` : ''}
    </div>
  `).join('') : '<p class="muted-text">هنوز سفارشی ثبت نکرده‌اید.</p>';
}

/* راننده */
function onlineKey(user) { return 'darbast_online_' + user.id; }

function renderDriver(user) {
  const onlineToggle = document.getElementById('onlineToggle');
  if (!onlineToggle.dataset.bound) {
    onlineToggle.dataset.bound = '1';
    onlineToggle.checked = localStorage.getItem(onlineKey(user)) === '1';
    onlineToggle.addEventListener('change', () => {
      localStorage.setItem(onlineKey(user), onlineToggle.checked ? '1' : '0');
      renderDriver(user);
    });
  }

  const online = onlineToggle.checked;
  const orders = getOrders();
  const pending = orders.filter(o => o.status === 'pending');
  const mine = orders.find(o => o.status === 'accepted' && o.driverId === user.id);

  const avail = document.getElementById('availableOrders');
  avail.innerHTML = !online
    ? '<p class="muted-text">برای دیدن سفارش‌ها آنلاین شوید.</p>'
    : pending.length
      ? pending.map(o => `
        <div class="order pending">
          <b>${o.origin} → ${o.destination}</b>
          <small>مسافر: ${o.passengerName} — ${o.phone}</small>
          <button onclick="acceptOrder(${o.id})">قبول سفر</button>
        </div>`).join('')
      : '<p class="muted-text">سفارشی موجود نیست.</p>';

  const cur = document.getElementById('currentTrip');
  cur.innerHTML = mine ? `
    <div class="order accepted">
      <b>${mine.origin} → ${mine.destination}</b>
      <small>مسافر: ${mine.passengerName} — ${mine.phone}</small>
      <button class="finish" onclick="finishOrder(${mine.id})">پایان سفر</button>
    </div>` : '<span class="muted-text">سفارشی قبول نکرده‌اید</span>';
}

window.acceptOrder = (id) => {
  const u = currentUser();
  if (!u || u.role !== 'driver') return;
  const orders = getOrders();
  const o = orders.find(x => x.id === id);
  if (!o || o.status !== 'pending') return;
  o.status = 'accepted';
  o.driverId = u.id;
  o.driverName = u.name;
  saveOrders(orders);
  renderDriver(u);
};

window.finishOrder = (id) => {
  const u = currentUser();
  if (!u) return;
  const orders = getOrders();
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.status = 'done';
  saveOrders(orders);
  renderDriver(u);
};

/* ---------- به‌روزرسانی خودکار ---------- */
setInterval(() => {
  const u = currentUser();
  if (!u) return;
  if (u.role === 'passenger') renderPassenger(u);
  else renderDriver(u);
}, 1500);

/* ---------- شروع ---------- */
renderApp();