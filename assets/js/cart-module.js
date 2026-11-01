/**
 * KFC Promo Landing Page — Module Giỏ Hàng (Cart Module)
 * Quản lý giỏ hàng: Thêm, xóa, cập nhật số lượng, lưu trữ localStorage,
 * thanh tiến trình miễn phí vận chuyển, hiển thị drawer trượt và tích hợp với Module Thanh Toán.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CartModule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'kfc_cart_items';
  const FREE_SHIPPING_THRESHOLD = 150000; // 150.000 đ freeship

  // Trạng thái giỏ hàng
  let cartItems = [];
  let isDrawerOpen = false;

  // DOM Cache
  const dom = {
    cartFloatingBtn: null,
    cartBadgeCount: null,
    cartDrawerBackdrop: null,
    cartDrawer: null,
    cartItemsList: null,
    cartSubtotalEl: null,
    cartShippingNotice: null,
    cartCheckoutBtn: null,
    cartClearBtn: null,
    toastContainer: null
  };

  /**
   * Định dạng tiền tệ VND
   */
  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
  }

  /**
   * Đọc giỏ hàng từ localStorage
   */
  function loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      cartItems = data ? JSON.parse(data) : [];
      if (!Array.isArray(cartItems)) cartItems = [];
    } catch (e) {
      console.warn('Không thể đọc giỏ hàng từ localStorage:', e);
      cartItems = [];
    }
  }

  /**
   * Lưu giỏ hàng vào localStorage
   */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Lỗi ghi giỏ hàng vào localStorage:', e);
    }
  }

  /**
   * Tính tổng tiền tạm tính trong giỏ
   */
  function getSubtotal() {
    return cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.quantity || 1), 0);
  }

  /**
   * Tính tổng số lượng món trong giỏ
   */
  function getTotalQuantity() {
    return cartItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
  }

  /**
   * Lấy dữ liệu giỏ hàng chuẩn để truyền sang Module Thanh Toán
   */
  function getCartData() {
    return {
      items: cartItems.map(it => ({
        id: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        image: it.image || 'assets/images/chicken-bucket.svg',
        category: it.category || 'chicken'
      })),
      totalQuantity: getTotalQuantity(),
      subtotal: getSubtotal()
    };
  }

  /**
   * Thêm món vào giỏ hàng
   * @param {Object} product
   * @param {number} [quantity=1]
   */
  function addItem(product, quantity = 1) {
    if (!product || !product.id) return;

    const existingIndex = cartItems.findIndex(item => item.id === product.id);
    const addQty = Math.max(1, parseInt(quantity, 10) || 1);

    if (existingIndex > -1) {
      cartItems[existingIndex].quantity = Math.min(99, cartItems[existingIndex].quantity + addQty);
    } else {
      cartItems.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || 'assets/images/chicken-bucket.svg',
        category: product.category || 'other',
        quantity: addQty
      });
    }

    saveToStorage();
    renderUI();
    showToast(`Đã thêm "${product.name}" vào giỏ hàng!`, 'success');
    animateBadge();
  }

  /**
   * Xóa món khỏi giỏ hàng
   * @param {string} productId
   */
  function removeItem(productId) {
    const item = cartItems.find(it => it.id === productId);
    cartItems = cartItems.filter(it => it.id !== productId);
    saveToStorage();
    renderUI();

    if (item) {
      showToast(`Đã bỏ "${item.name}" khỏi giỏ hàng.`, 'info');
    }
  }

  /**
   * Cập nhật số lượng của một món
   * @param {string} productId
   * @param {number} newQty
   */
  function updateQuantity(productId, newQty) {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) {
      removeItem(productId);
      return;
    }

    const item = cartItems.find(it => it.id === productId);
    if (item) {
      item.quantity = Math.min(99, qty);
      saveToStorage();
      renderUI();
    }
  }

  /**
   * Xóa sạch toàn bộ giỏ hàng
   */
  function clearCart() {
    cartItems = [];
    saveToStorage();
    renderUI();
  }

  /**
   * Khởi tạo giao diện DOM Giỏ Hàng (Floating Button, Drawer Sidebar, Toast Container)
   */
  function initDOM() {
    // 1. Toast Container
    let toastWrap = document.getElementById('kfc-toast-container');
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.id = 'kfc-toast-container';
      toastWrap.className = 'kfc-toast-container';
      document.body.appendChild(toastWrap);
    }
    dom.toastContainer = toastWrap;

    // 2. Floating Cart Button (Góc dưới bên phải màn hình)
    let floatBtn = document.getElementById('kfc-floating-cart-btn');
    if (!floatBtn) {
      floatBtn = document.createElement('button');
      floatBtn.id = 'kfc-floating-cart-btn';
      floatBtn.className = 'floating-cart-btn';
      floatBtn.setAttribute('aria-label', 'Mở giỏ hàng món ăn');
      floatBtn.innerHTML = `
        <span class="cart-btn-icon" aria-hidden="true">🛒</span>
        <span class="cart-btn-text">Giỏ hàng</span>
        <span class="cart-badge-count" id="kfc-cart-badge-count">0</span>
      `;
      floatBtn.onclick = () => openDrawer();
      document.body.appendChild(floatBtn);
    }
    dom.cartFloatingBtn = floatBtn;
    dom.cartBadgeCount = document.getElementById('kfc-cart-badge-count');

    // 3. Cart Drawer Overlay & Sidebar
    let drawerBackdrop = document.getElementById('kfc-cart-drawer-backdrop');
    if (!drawerBackdrop) {
      drawerBackdrop = document.createElement('div');
      drawerBackdrop.id = 'kfc-cart-drawer-backdrop';
      drawerBackdrop.className = 'cart-drawer-backdrop';
      drawerBackdrop.setAttribute('aria-hidden', 'true');

      drawerBackdrop.innerHTML = `
        <aside class="cart-drawer-panel" id="kfc-cart-drawer" role="dialog" aria-modal="true" aria-label="Giỏ hàng của bạn">
          <!-- Header -->
          <div class="cart-drawer-header">
            <div class="cart-drawer-title-wrap">
              <span class="cart-drawer-icon" aria-hidden="true">🛒</span>
              <h2 class="cart-drawer-title">Giỏ Hàng Món Ngon</h2>
            </div>
            <button type="button" class="cart-drawer-close" id="kfc-cart-drawer-close" aria-label="Đóng giỏ hàng">&times;</button>
          </div>

          <!-- Free Shipping Progress -->
          <div class="cart-shipping-notice" id="kfc-cart-shipping-notice">
            <!-- Render động tiến trình freeship -->
          </div>

          <!-- Items List Container -->
          <div class="cart-drawer-body" id="kfc-cart-items-list">
            <!-- Render động các món ăn -->
          </div>

          <!-- Footer & Checkout CTA -->
          <div class="cart-drawer-footer" id="kfc-cart-footer">
            <div class="cart-subtotal-row">
              <span class="cart-subtotal-label">Tạm tính:</span>
              <span class="cart-subtotal-value" id="kfc-cart-subtotal">0 đ</span>
            </div>
            <div class="cart-actions-group">
              <button type="button" class="btn btn-primary btn-block btn-checkout" id="kfc-cart-checkout-btn">
                <span>🍗 Tiến hành Thanh toán</span>
              </button>
              <button type="button" class="cart-clear-link" id="kfc-cart-clear-btn">
                Xóa tất cả món
              </button>
            </div>
          </div>
        </aside>
      `;

      document.body.appendChild(drawerBackdrop);
    }

    dom.cartDrawerBackdrop = drawerBackdrop;
    dom.cartDrawer = document.getElementById('kfc-cart-drawer');
    dom.cartItemsList = document.getElementById('kfc-cart-items-list');
    dom.cartSubtotalEl = document.getElementById('kfc-cart-subtotal');
    dom.cartShippingNotice = document.getElementById('kfc-cart-shipping-notice');
    dom.cartCheckoutBtn = document.getElementById('kfc-cart-checkout-btn');
    dom.cartClearBtn = document.getElementById('kfc-cart-clear-btn');

    // Sự kiện nút đóng
    const closeBtn = document.getElementById('kfc-cart-drawer-close');
    if (closeBtn) {
      closeBtn.onclick = () => closeDrawer();
    }

    // Đóng khi click ngoài backdrop
    drawerBackdrop.onclick = (e) => {
      if (e.target === drawerBackdrop) {
        closeDrawer();
      }
    };

    // Đóng bằng phím Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    });

    // Nút Xóa tất cả
    if (dom.cartClearBtn) {
      dom.cartClearBtn.onclick = () => {
        if (cartItems.length === 0) return;
        if (confirm('Bạn có chắc muốn xóa tất cả món trong giỏ hàng?')) {
          clearCart();
          showToast('Đã làm trống giỏ hàng.', 'info');
        }
      };
    }

    // Nút Thanh toán -> Mở Module Thanh Toán!
    if (dom.cartCheckoutBtn) {
      dom.cartCheckoutBtn.onclick = () => {
        if (cartItems.length === 0) {
          alert('Giỏ hàng đang trống. Vui lòng chọn món ăn trước khi thanh toán!');
          return;
        }

        closeDrawer();

        // Kiểm tra và gọi Module Thanh Toán
        if (window.PaymentModule && typeof window.PaymentModule.open === 'function') {
          window.PaymentModule.open({
            items: cartItems,
            onClearCart: () => {
              clearCart();
            }
          });
        } else {
          alert('Module Thanh Toán chưa sẵn sàng.');
        }
      };
    }
  }

  /**
   * Mở Drawer giỏ hàng
   */
  function openDrawer() {
    if (!dom.cartDrawerBackdrop) return;
    isDrawerOpen = true;
    dom.cartDrawerBackdrop.classList.add('active');
    dom.cartDrawerBackdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    renderUI();
  }

  /**
   * Đóng Drawer giỏ hàng
   */
  function closeDrawer() {
    if (!dom.cartDrawerBackdrop) return;
    isDrawerOpen = false;
    dom.cartDrawerBackdrop.classList.remove('active');
    dom.cartDrawerBackdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
  }

  /**
   * Render lại toàn bộ giao diện Giỏ Hàng
   */
  function renderUI() {
    const totalQty = getTotalQuantity();
    const subtotal = getSubtotal();

    // 1. Cập nhật Badge số lượng
    if (dom.cartBadgeCount) {
      dom.cartBadgeCount.textContent = totalQty;
      dom.cartBadgeCount.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    }

    // Cập nhật cả badge trên Navbar nếu có
    const navCartBadge = document.getElementById('nav-cart-count');
    if (navCartBadge) {
      navCartBadge.textContent = totalQty;
      navCartBadge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    }

    // 2. Cập nhật Tổng tạm tính
    if (dom.cartSubtotalEl) {
      dom.cartSubtotalEl.textContent = formatCurrency(subtotal);
    }

    // 3. Cập nhật Thanh Tiến Trình Freeship
    renderShippingNotice(subtotal);

    // 4. Render danh sách các món trong Drawer
    if (dom.cartItemsList) {
      dom.cartItemsList.innerHTML = '';

      if (cartItems.length === 0) {
        dom.cartItemsList.appendChild(createEmptyCartState());
        if (dom.cartCheckoutBtn) dom.cartCheckoutBtn.disabled = true;
        if (dom.cartClearBtn) dom.cartClearBtn.style.display = 'none';
      } else {
        if (dom.cartCheckoutBtn) dom.cartCheckoutBtn.disabled = false;
        if (dom.cartClearBtn) dom.cartClearBtn.style.display = 'inline-block';

        const listWrap = document.createElement('div');
        listWrap.className = 'cart-items-wrapper';

        cartItems.forEach(item => {
          listWrap.appendChild(createCartItemNode(item));
        });

        dom.cartItemsList.appendChild(listWrap);
      }
    }
  }

  /**
   * Tạo giao diện thanh thông báo Freeship
   */
  function renderShippingNotice(subtotal) {
    if (!dom.cartShippingNotice) return;

    if (subtotal === 0) {
      dom.cartShippingNotice.innerHTML = `
        <div class="shipping-bar-text">🛵 Miễn phí giao hàng cho đơn từ <strong>${formatCurrency(FREE_SHIPPING_THRESHOLD)}</strong></div>
      `;
      return;
    }

    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      dom.cartShippingNotice.innerHTML = `
        <div class="shipping-bar-text free-shipping-unlocked">🎉 Chúc mừng! Đơn hàng của bạn được <strong>MIỄN PHÍ VẬN CHUYỂN</strong>!</div>
        <div class="shipping-progress-track"><div class="shipping-progress-fill" style="width: 100%;"></div></div>
      `;
    } else {
      const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
      const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
      dom.cartShippingNotice.innerHTML = `
        <div class="shipping-bar-text">Mua thêm <strong>${formatCurrency(remaining)}</strong> để được <strong>FREESHIP</strong>!</div>
        <div class="shipping-progress-track"><div class="shipping-progress-fill" style="width: ${percent}%;"></div></div>
      `;
    }
  }

  /**
   * Tạo Node DOM hiển thị 1 món trong giỏ hàng
   */
  function createCartItemNode(item) {
    const row = document.createElement('div');
    row.className = 'cart-item-card';
    row.setAttribute('data-id', item.id);

    // Hình ảnh món
    const imgWrap = document.createElement('div');
    imgWrap.className = 'cart-item-thumb';
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.onerror = () => { img.src = 'assets/images/chicken-bucket.svg'; };
    imgWrap.appendChild(img);

    // Thông tin món
    const infoWrap = document.createElement('div');
    infoWrap.className = 'cart-item-details';

    const nameEl = document.createElement('h4');
    nameEl.className = 'cart-item-name';
    nameEl.textContent = item.name;

    const unitPriceEl = document.createElement('span');
    unitPriceEl.className = 'cart-item-unit-price';
    unitPriceEl.textContent = formatCurrency(item.price);

    // Bộ tăng giảm số lượng
    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-qty-control';

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'qty-btn qty-btn-dec';
    decBtn.setAttribute('aria-label', `Giảm số lượng ${item.name}`);
    decBtn.textContent = '−';
    decBtn.onclick = () => updateQuantity(item.id, item.quantity - 1);

    const qtyVal = document.createElement('span');
    qtyVal.className = 'qty-val';
    qtyVal.textContent = item.quantity;

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'qty-btn qty-btn-inc';
    incBtn.setAttribute('aria-label', `Tăng số lượng ${item.name}`);
    incBtn.textContent = '+';
    incBtn.onclick = () => updateQuantity(item.id, item.quantity + 1);

    qtyWrap.appendChild(decBtn);
    qtyWrap.appendChild(qtyVal);
    qtyWrap.appendChild(incBtn);

    infoWrap.appendChild(nameEl);
    infoWrap.appendChild(unitPriceEl);
    infoWrap.appendChild(qtyWrap);

    // Cột giá tổng & Nút xóa
    const rightCol = document.createElement('div');
    rightCol.className = 'cart-item-right-col';

    const totalPriceEl = document.createElement('div');
    totalPriceEl.className = 'cart-item-total-price';
    totalPriceEl.textContent = formatCurrency(item.price * item.quantity);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cart-item-remove-btn';
    removeBtn.setAttribute('aria-label', `Xóa món ${item.name}`);
    removeBtn.innerHTML = '🗑️';
    removeBtn.onclick = () => removeItem(item.id);

    rightCol.appendChild(totalPriceEl);
    rightCol.appendChild(removeBtn);

    row.appendChild(imgWrap);
    row.appendChild(infoWrap);
    row.appendChild(rightCol);

    return row;
  }

  /**
   * Tạo trạng thái Giỏ hàng trống
   */
  function createEmptyCartState() {
    const wrap = document.createElement('div');
    wrap.className = 'cart-empty-state';
    wrap.innerHTML = `
      <div class="empty-icon" aria-hidden="true">🍗</div>
      <h3>Giỏ hàng đang trống</h3>
      <p>Bạn chưa thêm món ăn nào vào giỏ. Hãy khám phá thực đơn gà rán giòn rụm và các combo hấp dẫn ngay nhé!</p>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-browse-menu">
        Xem Thực Đơn Ngay
      </button>
    `;

    const browseBtn = wrap.querySelector('#btn-browse-menu');
    if (browseBtn) {
      browseBtn.onclick = () => {
        closeDrawer();
        const menuSec = document.getElementById('menu');
        if (menuSec) menuSec.scrollIntoView({ behavior: 'smooth' });
      };
    }

    return wrap;
  }

  /**
   * Hiệu ứng nảy Badge khi thêm món mới
   */
  function animateBadge() {
    if (dom.cartBadgeCount) {
      dom.cartBadgeCount.classList.remove('badge-bump');
      void dom.cartBadgeCount.offsetWidth; // Force reflow
      dom.cartBadgeCount.classList.add('badge-bump');
    }
  }

  /**
   * Hiển thị Toast thông báo nhanh (tự biến mất sau 3 giây)
   */
  function showToast(message, type = 'success') {
    if (!dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `kfc-toast toast-${type}`;

    const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️');
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-text">${message}</span>
    `;

    dom.toastContainer.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Tự động xóa sau 3.2s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }

  /**
   * Khởi chạy Module Giỏ Hàng
   */
  function init() {
    loadFromStorage();
    initDOM();
    renderUI();
  }

  return {
    init,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItems: () => [...cartItems],
    getSubtotal,
    getTotalQuantity,
    getCartData,
    openDrawer,
    closeDrawer,
    showToast
  };
});
