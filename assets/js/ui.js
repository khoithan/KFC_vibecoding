/**
 * KFC Promo Landing Page — UI Rendering Module
 * Sử dụng thuần DOM API (createElement, textContent) để đảm bảo an toàn,
 * phòng chống XSS triệt để, không dùng innerHTML với dữ liệu CSV.
 */

const CATEGORY_NAMES = {
  all: 'Tất cả món',
  chicken: 'Gà rán giòn',
  combo: 'Combo ưu đãi',
  burger: 'Burger thơm ngon',
  side: 'Món ăn kèm',
  drink: 'Thức uống'
};

/**
 * Định dạng số tiền sang tiền tệ VND (VD: 45000 -> 45.000 đ)
 * @param {number} amount
 * @returns {string}
 */
function formatVND(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Không giới hạn';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Hiển thị trạng thái đang tải (Loading state)
 * @param {HTMLElement} container
 * @param {string} message
 */
function renderLoading(container, message = 'Đang tải thực đơn thơm ngon...') {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'status-box status-loading';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const text = document.createElement('p');
  text.textContent = message;

  wrapper.appendChild(spinner);
  wrapper.appendChild(text);
  container.appendChild(wrapper);
}

/**
 * Hiển thị trạng thái lỗi (Error state)
 * @param {HTMLElement} container
 * @param {string} message
 * @param {Function} [retryCallback]
 */
function renderError(container, message = 'Có lỗi xảy ra khi tải dữ liệu.', retryCallback = null) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'status-box status-error';

  const icon = document.createElement('div');
  icon.className = 'status-icon';
  icon.textContent = '⚠️';
  icon.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h3');
  title.textContent = 'Không thể tải dữ liệu';

  const desc = document.createElement('p');
  desc.textContent = message;

  wrapper.appendChild(icon);
  wrapper.appendChild(title);
  wrapper.appendChild(desc);

  if (retryCallback && typeof retryCallback === 'function') {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-secondary';
    retryBtn.textContent = 'Thử lại';
    retryBtn.addEventListener('click', retryCallback);
    wrapper.appendChild(retryBtn);
  }

  container.appendChild(wrapper);
}

/**
 * Hiển thị trạng thái danh sách rỗng (Empty state)
 * @param {HTMLElement} container
 * @param {string} message
 */
function renderEmpty(container, message = 'Không tìm thấy món ăn nào phù hợp.') {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'status-box status-empty';

  const icon = document.createElement('div');
  icon.className = 'status-icon';
  icon.textContent = '🍗';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('p');
  text.textContent = message;

  wrapper.appendChild(icon);
  wrapper.appendChild(text);
  container.appendChild(wrapper);
}

/**
 * Tạo DOM element cho 1 Product Card
 * @param {Object} product
 * @param {Function} onSelect
 * @returns {HTMLElement}
 */
function createProductCard(product, onSelect) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.setAttribute('data-category', product.category);
  card.setAttribute('data-id', product.id);

  // Thẻ hình ảnh
  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'product-media';

  const img = document.createElement('img');
  img.src = product.image;
  img.alt = product.name;
  img.loading = 'lazy';
  // Fallback nếu ảnh không tải được
  img.onerror = () => {
    img.src = 'assets/images/chicken-bucket.svg';
  };
  mediaWrap.appendChild(img);

  // Huy hiệu nổi bật (nếu có)
  if (product.featured) {
    const featuredBadge = document.createElement('span');
    featuredBadge.className = 'badge badge-featured';
    featuredBadge.textContent = '★ Món Hot';
    mediaWrap.appendChild(featuredBadge);
  }

  // Huy hiệu danh mục
  const catBadge = document.createElement('span');
  catBadge.className = 'badge badge-category';
  catBadge.textContent = CATEGORY_NAMES[product.category] || product.category;
  mediaWrap.appendChild(catBadge);

  // Khung thông tin
  const infoWrap = document.createElement('div');
  infoWrap.className = 'product-info';

  const nameEl = document.createElement('h3');
  nameEl.className = 'product-name';
  nameEl.textContent = product.name;

  const descEl = document.createElement('p');
  descEl.className = 'product-desc';
  descEl.textContent = product.description;

  const footerEl = document.createElement('div');
  footerEl.className = 'product-footer';

  const priceEl = document.createElement('div');
  priceEl.className = 'product-price';
  priceEl.textContent = formatVND(product.price);

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'product-actions';

  const addCartBtn = document.createElement('button');
  addCartBtn.type = 'button';
  addCartBtn.className = 'btn btn-secondary btn-sm btn-add-cart';
  addCartBtn.innerHTML = '🛒 Thêm';
  addCartBtn.setAttribute('aria-label', `Thêm món ${product.name} vào giỏ`);
  addCartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.CartModule && typeof window.CartModule.addItem === 'function') {
      window.CartModule.addItem(product, 1);
    }
  });

  const orderBtn = document.createElement('button');
  orderBtn.type = 'button';
  orderBtn.className = 'btn btn-primary btn-sm btn-order';
  orderBtn.textContent = 'Đặt ngay';
  orderBtn.setAttribute('aria-label', `Chọn món ${product.name}`);
  orderBtn.addEventListener('click', () => {
    if (typeof onSelect === 'function') {
      onSelect(product);
    }
  });

  actionsWrap.appendChild(addCartBtn);
  actionsWrap.appendChild(orderBtn);

  footerEl.appendChild(priceEl);
  footerEl.appendChild(actionsWrap);

  infoWrap.appendChild(nameEl);
  infoWrap.appendChild(descEl);
  infoWrap.appendChild(footerEl);

  card.appendChild(mediaWrap);
  card.appendChild(infoWrap);

  return card;
}

/**
 * Render toàn bộ danh sách sản phẩm
 * @param {HTMLElement} container
 * @param {Object[]} products
 * @param {Function} onSelect
 */
function renderProductList(container, products, onSelect) {
  container.innerHTML = '';
  if (!products || products.length === 0) {
    renderEmpty(container, 'Không có món ăn nào trong danh mục này.');
    return;
  }

  const fragment = document.createDocumentFragment();
  products.forEach(product => {
    const card = createProductCard(product, onSelect);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

/**
 * Tạo DOM element cho 1 Promotion Card
 * @param {Object} promo
 * @returns {HTMLElement}
 */
function createPromotionCard(promo) {
  const card = document.createElement('article');
  card.className = 'promo-card';
  card.setAttribute('data-id', promo.id);

  const topRow = document.createElement('div');
  topRow.className = 'promo-top';

  const labelEl = document.createElement('span');
  labelEl.className = 'badge badge-promo';
  labelEl.textContent = promo.label || 'ƯU ĐÃI';

  const expEl = document.createElement('span');
  expEl.className = 'promo-expiry';
  expEl.textContent = promo.valid_until ? `HSD: ${formatDate(promo.valid_until)}` : 'Vô thời hạn';

  topRow.appendChild(labelEl);
  topRow.appendChild(expEl);

  const titleEl = document.createElement('h3');
  titleEl.className = 'promo-title';
  titleEl.textContent = promo.title;

  const descEl = document.createElement('p');
  descEl.className = 'promo-desc';
  descEl.textContent = promo.description;

  const disclaimerEl = document.createElement('small');
  disclaimerEl.className = 'promo-note';
  disclaimerEl.textContent = '* Áp dụng trong bản mô phỏng demo';

  card.appendChild(topRow);
  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(disclaimerEl);

  return card;
}

/**
 * Render danh sách khuyến mãi
 * @param {HTMLElement} container
 * @param {Object[]} promotions
 */
function renderPromotionList(container, promotions) {
  container.innerHTML = '';
  if (!promotions || promotions.length === 0) {
    renderEmpty(container, 'Hiện chưa có chương trình ưu đãi nào.');
    return;
  }

  const fragment = document.createDocumentFragment();
  promotions.forEach(promo => {
    const card = createPromotionCard(promo);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

/**
 * Điền danh sách sản phẩm vào ô chọn Dropdown của Form Đặt Món Demo
 * @param {HTMLSelectElement} selectEl
 * @param {Object[]} products
 */
function populateProductSelect(selectEl, products) {
  if (!selectEl) return;
  selectEl.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Vui lòng chọn món / combo bạn thích --';
  selectEl.appendChild(defaultOption);

  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} — ${formatVND(p.price)}`;
    opt.setAttribute('data-price', p.price);
    opt.setAttribute('data-name', p.name);
    selectEl.appendChild(opt);
  });
}

window.UI = {
  CATEGORY_NAMES,
  formatVND,
  formatDate,
  renderLoading,
  renderError,
  renderEmpty,
  createProductCard,
  renderProductList,
  createPromotionCard,
  renderPromotionList,
  populateProductSelect
};
