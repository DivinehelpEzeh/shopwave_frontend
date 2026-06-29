// ─── Toast Notifications ─────────────────────────────────────────
const toastContainer = (() => {
  const el = document.createElement('div');
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
})();

export const toast = {
  show(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(120%)';
      el.style.transition = '0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },
  success: (msg) => toast.show(msg, 'success'),
  error:   (msg) => toast.show(msg, 'error'),
  info:    (msg) => toast.show(msg, 'info'),
};

// ─── Simple SPA Router ───────────────────────────────────────────
export const router = {
  _routes: {},
  _current: null,

  register(name, fn) {
    this._routes[name] = fn;
  },

  navigate(name, params = {}) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.add('active');

    this._current = name;
    this._routes[name]?.(params);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
};

// ─── Render helpers ───────────────────────────────────────────────
export const renderStars = (rating) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
};

export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// ─── Loading state helper ────────────────────────────────────────
export const withLoading = async (container, asyncFn) => {
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  try {
    await asyncFn();
  } catch (err) {
    container.innerHTML = `<p style="text-align:center;color:var(--color-danger);padding:2rem">${escapeHtml(err.message)}</p>`;
  }
};
