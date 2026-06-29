// ─── Auth Store ──────────────────────────────────────────────────
export const auth = {
  _user: null,
  _listeners: [],

  get user() { return this._user; },
  get token() { return localStorage.getItem('sw_token'); },
  get isLoggedIn() { return !!this.token; },

  setUser(user) {
    this._user = user;
    this._listeners.forEach(fn => fn(user));
  },

  login(token, user) {
    localStorage.setItem('sw_token', token);
    this.setUser(user);
  },

  logout() {
    localStorage.removeItem('sw_token');
    this.setUser(null);
  },

  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  },
};

// ─── Cart Store ──────────────────────────────────────────────────
const CART_KEY = 'sw_cart';

export const cart = {
  _items: JSON.parse(localStorage.getItem(CART_KEY) || '[]'),
  _listeners: [],

  get items() { return this._items; },
  get count()  { return this._items.reduce((s, i) => s + i.qty, 0); },
  get total()  { return this._items.reduce((s, i) => s + i.price * i.qty, 0); },

  _save() {
    localStorage.setItem(CART_KEY, JSON.stringify(this._items));
    this._listeners.forEach(fn => fn([...this._items]));
  },

  add(product, qty = 1) {
    const existing = this._items.find(i => i._id === product._id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      this._items.push({ ...product, qty });
    }
    this._save();
  },

  remove(id) {
    this._items = this._items.filter(i => i._id !== id);
    this._save();
  },

  updateQty(id, qty) {
    const item = this._items.find(i => i._id === id);
    if (item) {
      if (qty <= 0) this.remove(id);
      else item.qty = qty;
    }
    this._save();
  },

  clear() {
    this._items = [];
    this._save();
  },

  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  },
};
