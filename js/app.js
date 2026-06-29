import { authApi, productApi, orderApi } from './api.js';
import { auth, cart } from './store.js';
import { toast, router, renderStars, formatPrice, formatDate, escapeHtml, withLoading } from './ui.js';

// ─── State ────────────────────────────────────────────────────────
let currentFilters = { page: 1, limit: 12, sort: 'newest' };

// ─── DOM refs ─────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const cartBadge     = $('cart-badge');
const cartDrawer    = $('cart-drawer');
const overlay       = $('overlay');
const cartItemsEl   = $('cart-items');
const authModal     = $('auth-modal');
const productsGrid  = $('products-grid');
const paginationEl  = $('pagination');

// ─── Cart UI ──────────────────────────────────────────────────────
const updateCartBadge = () => {
  cartBadge.textContent = cart.count;
  cartBadge.style.display = cart.count > 0 ? 'flex' : 'none';
};

const renderCartItems = () => {
  if (cart.items.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <p>Your cart is empty</p>
      </div>`;
    $('cart-subtotal').textContent = formatPrice(0);
    $('cart-shipping').textContent = formatPrice(0);
    $('cart-tax').textContent      = formatPrice(0);
    $('cart-total').textContent    = formatPrice(0);
    return;
  }

  cartItemsEl.innerHTML = cart.items.map(item => `
    <div class="cart-item">
      <img class="cart-item__img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">
      <div class="cart-item__info">
        <div class="cart-item__name">${escapeHtml(item.name)}</div>
        <div class="cart-item__price">${formatPrice(item.price)}</div>
        <div class="cart-item__qty">
          <button class="qty-btn" onclick="window.changeQty('${item._id}', ${item.qty - 1})">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="window.changeQty('${item._id}', ${item.qty + 1})">+</button>
        </div>
      </div>
      <button class="cart-item__remove" onclick="window.removeFromCart('${item._id}')">✕</button>
    </div>
  `).join('');

  const subtotal = cart.total;
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax      = subtotal * 0.15;
  const total    = subtotal + shipping + tax;

  $('cart-subtotal').textContent = formatPrice(subtotal);
  $('cart-shipping').textContent = shipping === 0 ? 'Free' : formatPrice(shipping);
  $('cart-tax').textContent      = formatPrice(tax);
  $('cart-total').textContent    = formatPrice(total);
};

window.changeQty = (id, qty) => { cart.updateQty(id, qty); };
window.removeFromCart = (id) => { cart.remove(id); };

cart.onChange(() => {
  updateCartBadge();
  renderCartItems();
});

const openCart = () => {
  cartDrawer.classList.add('open');
  overlay.classList.add('open');
  renderCartItems();
};

const closeCart = () => {
  cartDrawer.classList.remove('open');
  overlay.classList.remove('open');
};

$('open-cart-btn').addEventListener('click', openCart);
$('cart-drawer-close').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

// ─── Navbar ───────────────────────────────────────────────────────
const updateNavAuth = () => {
  const loggedIn   = auth.isLoggedIn;
  const navLogin   = $('nav-login');
  const navOrders  = $('nav-orders');
  const navLogout  = $('nav-logout');
  const navAccount = $('nav-account');

  if (navLogin)   navLogin.style.display   = loggedIn ? 'none' : 'inline';
  if (navOrders)  navOrders.style.display  = loggedIn ? 'inline' : 'none';
  if (navLogout)  navLogout.style.display  = loggedIn ? 'inline' : 'none';
  if (navAccount) navAccount.style.display = loggedIn ? 'inline' : 'none';
};

auth.onChange(updateNavAuth);

$('nav-login')?.addEventListener('click', () => openAuthModal('login'));
$('nav-logout')?.addEventListener('click', () => {
  auth.logout();
  toast.info('Logged out.');
  router.navigate('home');
});
$('nav-orders')?.addEventListener('click', () => {
  if (!auth.isLoggedIn) { openAuthModal('login'); return; }
  router.navigate('orders');
});
$('nav-home')?.addEventListener('click', () => router.navigate('home'));

// Mobile menu toggle
$('menu-toggle')?.addEventListener('click', () => {
  $('navbar-actions').classList.toggle('open');
});

// ─── Search ───────────────────────────────────────────────────────
$('search-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('search-input').value.trim();
  if (q) {
    currentFilters = { ...currentFilters, search: q, page: 1 };
    router.navigate('home');
  }
});

// ─── Categories ───────────────────────────────────────────────────
const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Beauty', 'Toys', 'Other'];

const renderCategories = () => {
  const el = $('categories-bar');
  el.innerHTML = CATEGORIES.map(cat => `
    <button class="category-chip ${!currentFilters.category && cat === 'All' || currentFilters.category === cat ? 'active' : ''}"
      onclick="window.filterCategory('${cat}')">
      ${escapeHtml(cat)}
    </button>
  `).join('');
};

window.filterCategory = (cat) => {
  currentFilters = { ...currentFilters, page: 1 };
  if (cat === 'All') delete currentFilters.category;
  else currentFilters.category = cat;
  loadProducts();
  renderCategories();
};

// ─── Products ─────────────────────────────────────────────────────
const renderProductCard = (p) => `
  <div class="product-card" onclick="window.openProduct('${p._id}')">
    <div class="product-card__img-wrap">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
      ${p.stock === 0 ? '<span class="product-card__badge" style="background:var(--color-danger)">Sold Out</span>' : ''}
      ${p.stock > 0 && p.stock <= 5 ? '<span class="product-card__badge">Low Stock</span>' : ''}
    </div>
    <div class="product-card__body">
      <div class="product-card__category">${escapeHtml(p.category)}</div>
      <div class="product-card__name">${escapeHtml(p.name)}</div>
      <div class="product-card__rating">
        <span class="stars">${renderStars(p.rating)}</span>
        <span>(${p.numReviews})</span>
      </div>
      <div class="product-card__footer">
        <span class="product-card__price">${formatPrice(p.price)}</span>
        <button class="btn-add" ${p.stock === 0 ? 'disabled' : ''}
          onclick="event.stopPropagation(); window.addToCart('${p._id}', this)">
          Add to cart
        </button>
      </div>
    </div>
  </div>
`;

const loadProducts = async () => {
  await withLoading(productsGrid, async () => {
    const { products, pages, page, total } = await productApi.getAll(currentFilters);
    productsGrid.innerHTML = products.length
      ? products.map(renderProductCard).join('')
      : '<p style="text-align:center;padding:3rem;color:var(--color-muted)">No products found.</p>';
    renderPagination(page, pages);
    $('results-count').textContent = `${total} product${total !== 1 ? 's' : ''}`;
  });
};

// Cache products for cart lookup
const productCache = {};
window._productCache = productCache;

window.addToCart = async (id, btn) => {
  if (!productCache[id]) {
    btn.disabled = true;
    btn.textContent = '...';
    try {
      const { product } = await productApi.getById(id);
      productCache[id] = product;
    } catch {
      toast.error('Could not add product.');
      btn.disabled = false;
      btn.textContent = 'Add to cart';
      return;
    }
  }
  cart.add(productCache[id]);
  toast.success(`"${productCache[id].name}" added to cart!`);
  btn.textContent = '✓ Added';
  setTimeout(() => { btn.textContent = 'Add to cart'; btn.disabled = false; }, 1200);
};

// ─── Pagination ────────────────────────────────────────────────────
const renderPagination = (page, pages) => {
  if (pages <= 1) { paginationEl.innerHTML = ''; return; }
  const items = [];
  if (page > 1) items.push(`<button class="page-btn" onclick="window.goPage(${page-1})">‹</button>`);
  for (let i = 1; i <= pages; i++) {
    items.push(`<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.goPage(${i})">${i}</button>`);
  }
  if (page < pages) items.push(`<button class="page-btn" onclick="window.goPage(${page+1})">›</button>`);
  paginationEl.innerHTML = items.join('');
};

window.goPage = (p) => {
  currentFilters.page = p;
  loadProducts();
  document.getElementById('page-home').scrollIntoView({ behavior: 'smooth' });
};

// ─── Sort & Filter bar ─────────────────────────────────────────────
$('sort-select')?.addEventListener('change', (e) => {
  currentFilters.sort = e.target.value;
  currentFilters.page = 1;
  loadProducts();
});

// ─── Product Detail ───────────────────────────────────────────────
let detailQty = 1;

window.openProduct = async (id) => {
  router.navigate('product', { id });
};

router.register('product', async ({ id }) => {
  const container = $('product-detail-content');
  await withLoading(container, async () => {
    const { product } = await productApi.getById(id);
    productCache[id] = product;
    detailQty = 1;

    container.innerHTML = `
      <div class="product-detail__grid">
        <div>
          <img class="product-detail__img" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        </div>
        <div>
          <div class="product-detail__category">${escapeHtml(product.category)}</div>
          <h1 class="product-detail__name">${escapeHtml(product.name)}</h1>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
            <span class="stars" style="font-size:1.25rem">${renderStars(product.rating)}</span>
            <span style="color:var(--color-muted);font-size:0.875rem">${product.numReviews} review${product.numReviews !== 1 ? 's' : ''}</span>
          </div>
          <div class="product-detail__price">${formatPrice(product.price)}</div>
          <p class="product-detail__desc">${escapeHtml(product.description)}</p>
          <div class="product-detail__qty-row">
            <span style="font-weight:600;font-size:0.875rem">Quantity</span>
            <button class="qty-btn" onclick="window.detailQtyChange(-1)">−</button>
            <span id="detail-qty-display">1</span>
            <button class="qty-btn" onclick="window.detailQtyChange(1)">+</button>
            <span style="color:var(--color-muted);font-size:0.875rem">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
          </div>
          <button class="btn btn--primary btn--block" ${product.stock === 0 ? 'disabled' : ''}
            onclick="window.addDetailToCart('${product._id}')">
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>

      <!-- Reviews -->
      <div style="margin-top:3rem">
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1.5rem">Customer Reviews</h2>
        ${product.reviews.length === 0
          ? '<p style="color:var(--color-muted)">No reviews yet. Be the first!</p>'
          : product.reviews.map(r => `
              <div style="padding:1rem 0;border-bottom:1px solid var(--color-border)">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
                  <strong>${escapeHtml(r.name)}</strong>
                  <span class="stars">${renderStars(r.rating)}</span>
                  <span style="color:var(--color-muted);font-size:0.75rem">${formatDate(r.createdAt)}</span>
                </div>
                <p style="color:var(--color-muted);margin:0">${escapeHtml(r.comment)}</p>
              </div>`).join('')
        }

        ${auth.isLoggedIn ? `
          <div style="margin-top:2rem">
            <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1rem">Write a Review</h3>
            <div class="form-group">
              <label class="form-label">Rating</label>
              <select class="form-input" id="review-rating">
                <option value="5">★★★★★ Excellent</option>
                <option value="4">★★★★ Good</option>
                <option value="3">★★★ Average</option>
                <option value="2">★★ Poor</option>
                <option value="1">★ Terrible</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Comment</label>
              <textarea class="form-input" id="review-comment" rows="3" maxlength="500" placeholder="Share your experience..."></textarea>
            </div>
            <button class="btn btn--primary" onclick="window.submitReview('${product._id}')">Submit Review</button>
          </div>` : `
          <p style="margin-top:1.5rem;color:var(--color-muted)">
            <a href="#" onclick="openAuthModal('login')" style="color:var(--color-amber);font-weight:600">Log in</a> to leave a review.
          </p>`
        }
      </div>
    `;
  });
});

window.detailQtyChange = (delta) => {
  detailQty = Math.max(1, detailQty + delta);
  $('detail-qty-display').textContent = detailQty;
};

window.addDetailToCart = (id) => {
  const product = productCache[id];
  if (!product) return;
  cart.add(product, detailQty);
  toast.success(`${detailQty} × "${product.name}" added!`);
  openCart();
};

window.submitReview = async (id) => {
  const rating  = parseInt($('review-rating').value);
  const comment = $('review-comment').value.trim();
  if (!comment) { toast.error('Please write a comment.'); return; }

  try {
    await productApi.addReview(id, { rating, comment });
    toast.success('Review submitted!');
    router.navigate('product', { id });
  } catch (err) {
    toast.error(err.message);
  }
};

// ─── Auth Modal ───────────────────────────────────────────────────
let authMode = 'login';

window.openAuthModal = (mode = 'login') => {
  authMode = mode;
  renderAuthModal();
  authModal.classList.add('open');
};

const closeAuthModal = () => authModal.classList.remove('open');
$('auth-modal-close')?.addEventListener('click', closeAuthModal);
authModal?.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });

const renderAuthModal = () => {
  const isLogin = authMode === 'login';
  $('auth-modal-title').textContent = isLogin ? 'Welcome back' : 'Create account';
  $('auth-form-body').innerHTML = `
    ${!isLogin ? `
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input class="form-input" type="text" id="auth-name" placeholder="Jane Smith" autocomplete="name">
      </div>` : ''}
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" type="email" id="auth-email" placeholder="jane@example.com" autocomplete="email">
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input class="form-input" type="password" id="auth-password" placeholder="${isLogin ? 'Your password' : 'At least 6 characters'}" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
    </div>
    <button class="btn btn--primary btn--block" id="auth-submit-btn" onclick="window.submitAuth()">
      ${isLogin ? 'Log In' : 'Create Account'}
    </button>
    <div class="auth-divider">or</div>
    <p style="text-align:center;font-size:0.875rem;color:var(--color-muted)">
      ${isLogin ? "Don't have an account?" : 'Already have an account?'}
      <a href="#" style="color:var(--color-amber);font-weight:600"
        onclick="event.preventDefault(); window.openAuthModal('${isLogin ? 'register' : 'login'}')">
        ${isLogin ? 'Sign up' : 'Log in'}
      </a>
    </p>
  `;
};

window.submitAuth = async () => {
  const btn = $('auth-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Please wait…';

  try {
    const email    = $('auth-email').value.trim();
    const password = $('auth-password').value;
    const name     = $('auth-name')?.value.trim();

    let data;
    if (authMode === 'register') {
      data = await authApi.register({ name, email, password });
    } else {
      data = await authApi.login({ email, password });
    }

    auth.login(data.token, data.user);
    closeAuthModal();
    toast.success(`Welcome${auth.user?.name ? ', ' + auth.user.name : ''}!`);
  } catch (err) {
    toast.error(err.message);
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Log In' : 'Create Account';
  }
};

// ─── Checkout ─────────────────────────────────────────────────────
$('checkout-btn')?.addEventListener('click', () => {
  if (!auth.isLoggedIn) { closeCart(); openAuthModal('login'); return; }
  if (cart.items.length === 0) { toast.info('Your cart is empty.'); return; }
  closeCart();
  router.navigate('checkout');
});

router.register('checkout', () => {
  const itemsList = $('checkout-items');
  if (!itemsList) return;

  const subtotal = cart.total;
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.15;
  const total = subtotal + shipping + tax;

  itemsList.innerHTML = cart.items.map(i => `
    <div class="order-summary-item">
      <span class="name">${escapeHtml(i.name)} × ${i.qty}</span>
      <span class="price">${formatPrice(i.price * i.qty)}</span>
    </div>`).join('') + `
    <div class="order-summary-item" style="border-top:1px solid var(--color-border);padding-top:0.75rem;margin-top:0.5rem">
      <span class="name">Subtotal</span><span class="price">${formatPrice(subtotal)}</span>
    </div>
    <div class="order-summary-item">
      <span class="name">Shipping</span>
      <span class="price">${shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
    </div>
    <div class="order-summary-item">
      <span class="name">Tax (15%)</span><span class="price">${formatPrice(tax)}</span>
    </div>
    <div class="order-summary-item" style="font-size:1.125rem;font-weight:700;border-top:2px solid var(--color-border);padding-top:0.75rem;margin-top:0.5rem">
      <span class="name" style="color:var(--color-ink)">Total</span>
      <span class="price" style="color:var(--color-amber)">${formatPrice(total)}</span>
    </div>`;
});

$('place-order-btn')?.addEventListener('click', async () => {
  const btn = $('place-order-btn');
  const street     = $('shipping-street').value.trim();
  const city       = $('shipping-city').value.trim();
  const postalCode = $('shipping-postal').value.trim();
  const country    = $('shipping-country').value.trim();
  const payment    = $('payment-method').value;

  if (!street || !city || !postalCode || !country) {
    toast.error('Please complete all shipping fields.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Placing order…';

  try {
    const { order } = await orderApi.create({
      items: cart.items.map(i => ({ product: i._id, qty: i.qty })),
      shippingAddress: { street, city, postalCode, country },
      paymentMethod: payment,
    });

    // Simulate payment
    await orderApi.pay(order._id);

    cart.clear();
    toast.success('Order placed successfully!');
    router.navigate('orders');
  } catch (err) {
    toast.error(err.message);
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
});

// ─── Orders page ──────────────────────────────────────────────────
router.register('orders', async () => {
  const container = $('orders-content');
  if (!auth.isLoggedIn) { openAuthModal('login'); return; }

  await withLoading(container, async () => {
    const { orders } = await orderApi.getMy();
    if (orders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:4rem;color:var(--color-muted)">
          <p style="font-size:3rem;margin-bottom:1rem">📦</p>
          <p>You haven't placed any orders yet.</p>
          <button class="btn btn--primary" style="margin-top:1rem" onclick="router.navigate('home')">Start shopping</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="orders-table-wrap">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Paid</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td style="font-family:var(--font-mono);font-size:0.75rem">${o._id.slice(-8).toUpperCase()}</td>
                <td>${formatDate(o.createdAt)}</td>
                <td>${o.items.length} item${o.items.length !== 1 ? 's' : ''}</td>
                <td style="font-weight:700">${formatPrice(o.totalPrice)}</td>
                <td><span class="status-badge ${o.status}">${o.status}</span></td>
                <td>${o.isPaid ? `<span style="color:var(--color-success);font-weight:600">✓ Paid</span>` : '<span style="color:var(--color-danger)">Pending</span>'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  });
});

// ─── Route registration ───────────────────────────────────────────
router.register('home', () => {
  renderCategories();
  loadProducts();
});

// ─── Init ─────────────────────────────────────────────────────────
const init = async () => {
  updateCartBadge();
  updateNavAuth();

  // Try to restore session
  if (auth.token) {
    try {
      const { user } = await authApi.getMe();
      auth.setUser(user);
    } catch {
      auth.logout();
    }
  }

  router.navigate('home');
};

init();
