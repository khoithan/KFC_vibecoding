/**
 * KFC Promo Landing Page — Main Application Controller
 * Khởi tạo dữ liệu, điều phối bộ lọc, menu mobile và form demo
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    products: [],
    promotions: [],
    currentCategory: 'all',
    isLoading: true
  };

  // DOM Elements
  const elements = {
    // Nav
    navToggle: document.getElementById('nav-toggle'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),

    // Sections & Containers
    productsGrid: document.getElementById('products-grid'),
    promotionsGrid: document.getElementById('promotions-grid'),
    categoryButtons: document.querySelectorAll('.filter-btn'),

    // Order Demo Form
    orderForm: document.getElementById('order-form'),
    customerNameInput: document.getElementById('customer-name'),
    productSelect: document.getElementById('product-select'),
    quantityInput: document.getElementById('quantity'),
    orderNotesInput: document.getElementById('order-notes'),
    formFeedback: document.getElementById('form-feedback'),

    // Modal / Confirmation
    orderModal: document.getElementById('order-modal'),
    modalDetails: document.getElementById('modal-details'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalDoneBtn: document.getElementById('modal-done-btn'),

    // Demo Orders History
    viewHistoryBtn: document.getElementById('view-history-btn'),
    historyContainer: document.getElementById('demo-history-container'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history-btn')
  };

  /**
   * Khởi tạo và tải dữ liệu từ CSV
   */
  async function init() {
    // Khởi động CartModule trước khi tải dữ liệu
    if (window.CartModule && typeof window.CartModule.init === 'function') {
      window.CartModule.init();
    }

    setupNavigation();
    setupFilters();
    setupOrderForm();
    setupModal();
    setupHistory();

    await loadData();
  }

  /**
   * Tải dữ liệu từ các file CSV
   */
  async function loadData() {
    state.isLoading = true;
    UI.renderLoading(elements.productsGrid, 'Đang chuẩn bị thực đơn nóng hổi...');
    UI.renderLoading(elements.promotionsGrid, 'Đang cập nhật các ưu đãi hấp dẫn...');

    try {
      // Tải song song cả 2 file CSV
      const [rawProducts, rawPromotions] = await Promise.all([
        CSVParser.fetchAndParseCSV('./data/products.csv'),
        CSVParser.fetchAndParseCSV('./data/promotions.csv')
      ]);

      state.products = CSVParser.validateProducts(rawProducts);
      state.promotions = CSVParser.validatePromotions(rawPromotions);

      // Render danh sách sản phẩm và ưu đãi
      renderFilteredProducts();
      UI.renderPromotionList(elements.promotionsGrid, state.promotions);

      // Cập nhật ô chọn trong form đặt hàng
      UI.populateProductSelect(elements.productSelect, state.products);

      state.isLoading = false;
    } catch (err) {
      console.error('Lỗi tải dữ liệu CSV:', err);
      state.isLoading = false;

      UI.renderError(
        elements.productsGrid,
        `Không thể đọc dữ liệu sản phẩm từ CSV: ${err.message}. Hãy đảm bảo website được mở qua máy chủ tĩnh (static HTTP server) thay vì mở trực tiếp file://.`,
        () => loadData()
      );

      UI.renderError(
        elements.promotionsGrid,
        `Không thể nạp dữ liệu ưu đãi từ CSV: ${err.message}.`,
        () => loadData()
      );
    }
  }

  /**
   * Lọc và render danh sách sản phẩm theo danh mục đang chọn
   */
  function renderFilteredProducts() {
    let filtered = state.products;

    if (state.currentCategory !== 'all') {
      filtered = state.products.filter(p => p.category === state.currentCategory);
    }

    UI.renderProductList(elements.productsGrid, filtered, selectProductForOrder);
  }

  /**
   * Thiết lập bộ lọc danh mục
   */
  function setupFilters() {
    elements.categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        const category = button.getAttribute('data-category') || 'all';
        if (state.currentCategory === category) return;

        state.currentCategory = category;

        // Cập nhật giao diện nút đang active
        elements.categoryButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        renderFilteredProducts();
      });
    });
  }

  /**
   * Điều hướng và Menu mobile
   */
  function setupNavigation() {
    if (elements.navToggle && elements.navMenu) {
      elements.navToggle.addEventListener('click', () => {
        const isExpanded = elements.navToggle.getAttribute('aria-expanded') === 'true';
        elements.navToggle.setAttribute('aria-expanded', String(!isExpanded));
        elements.navMenu.classList.toggle('open');
      });
    }

    // Đóng menu khi bấm vào link điều hướng
    elements.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (elements.navMenu && elements.navMenu.classList.contains('open')) {
          elements.navMenu.classList.remove('open');
          if (elements.navToggle) {
            elements.navToggle.setAttribute('aria-expanded', 'false');
          }
        }
      });
    });
  }

  /**
   * Khi người dùng bấm "Đặt món ngay" từ card món ăn
   * Thêm món vào giỏ hàng và mở drawer, đồng thời cuộn tới form demo (dự phòng)
   */
  function selectProductForOrder(product) {
    if (!product) return;

    // Ưu tiên: thêm vào CartModule và mở drawer
    if (window.CartModule && typeof window.CartModule.addItem === 'function') {
      window.CartModule.addItem(product, 1);
      window.CartModule.openDrawer();
      return;
    }

    // Dự phòng: cuộn đến form đặt hàng demo cũ nếu CartModule chưa sẵn sàng
    if (!elements.productSelect) return;
    elements.productSelect.value = product.id;
    if (elements.quantityInput) {
      elements.quantityInput.value = '1';
    }

    const orderSection = document.getElementById('order');
    if (orderSection) {
      orderSection.scrollIntoView({ behavior: 'smooth' });
    }

    if (elements.orderForm) {
      elements.orderForm.classList.add('highlight-form');
      setTimeout(() => {
        elements.orderForm.classList.remove('highlight-form');
      }, 1500);
    }

    if (elements.quantityInput) {
      elements.quantityInput.focus();
    }
  }

  /**
   * Thiết lập Form Đặt Món Demo
   */
  function setupOrderForm() {
    if (!elements.orderForm) return;

    elements.orderForm.addEventListener('submit', handleFormSubmit);

    // Reset feedback khi người dùng nhập lại
    if (elements.productSelect) {
      elements.productSelect.addEventListener('change', clearFeedback);
    }
    if (elements.quantityInput) {
      elements.quantityInput.addEventListener('input', clearFeedback);
    }
  }

  function clearFeedback() {
    if (elements.formFeedback) {
      elements.formFeedback.textContent = '';
      elements.formFeedback.className = 'form-feedback';
    }
  }

  /**
   * Xử lý xác nhận form đặt hàng demo
   */
  function handleFormSubmit(e) {
    e.preventDefault();

    const customerName = (elements.customerNameInput.value || '').trim() || 'Khách hàng thân thiết';
    const selectedProductId = elements.productSelect.value;
    const quantity = parseInt(elements.quantityInput.value, 10);
    const notes = (elements.orderNotesInput.value || '').trim();

    // Validation
    if (!selectedProductId) {
      showFormFeedback('Vui lòng chọn món hoặc combo bạn muốn đặt.', 'error');
      elements.productSelect.focus();
      return;
    }

    if (isNaN(quantity) || quantity < 1 || quantity > 99) {
      showFormFeedback('Số lượng món phải từ 1 đến 99 phần.', 'error');
      elements.quantityInput.focus();
      return;
    }

    const product = state.products.find(p => p.id === selectedProductId);
    if (!product) {
      showFormFeedback('Món ăn không tồn tại trong danh mục.', 'error');
      return;
    }

    // Tạo mã đơn demo ngẫu nhiên
    const orderCode = 'DEMO-' + Math.floor(100000 + Math.random() * 900000);
    const totalPrice = product.price * quantity;
    const timestamp = new Date().toLocaleString('vi-VN');

    const demoOrder = {
      orderCode,
      customerName,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      quantity,
      totalPrice,
      notes,
      timestamp
    };

    // Lưu vào LocalStorage để người dùng thấy minh họa tính năng
    saveOrderToLocalStorage(demoOrder);

    // Hiển thị modal thông báo xác nhận demo
    showOrderModal(demoOrder);

    // Reset form
    elements.orderForm.reset();
    clearFeedback();
    updateHistoryUI();
  }

  function showFormFeedback(message, type = 'error') {
    if (!elements.formFeedback) return;
    elements.formFeedback.textContent = message;
    elements.formFeedback.className = `form-feedback feedback-${type}`;
  }

  /**
   * Quản lý LocalStorage cho các đơn demo
   */
  const STORAGE_KEY = 'kfc_demo_orders';

  function getSavedOrders() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveOrderToLocalStorage(newOrder) {
    try {
      const orders = getSavedOrders();
      orders.unshift(newOrder); // Đưa lên đầu
      // Giữ tối đa 10 đơn gần nhất
      const limited = orders.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (e) {
      console.warn('Không thể lưu vào localStorage:', e);
    }
  }

  function clearOrdersHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      updateHistoryUI();
    } catch (e) {
      console.warn('Lỗi khi xóa lịch sử:', e);
    }
  }

  /**
   * Thiết lập Modal xác nhận
   */
  function setupModal() {
    if (!elements.orderModal) return;

    if (elements.modalCloseBtn) {
      elements.modalCloseBtn.addEventListener('click', closeModal);
    }
    if (elements.modalDoneBtn) {
      elements.modalDoneBtn.addEventListener('click', closeModal);
    }

    // Đóng modal khi bấm phím Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.orderModal.classList.contains('active')) {
        closeModal();
      }
    });

    // Đóng modal khi click ra backdrop
    elements.orderModal.addEventListener('click', (e) => {
      if (e.target === elements.orderModal) {
        closeModal();
      }
    });
  }

  function showOrderModal(order) {
    if (!elements.orderModal || !elements.modalDetails) return;

    elements.modalDetails.innerHTML = '';

    const list = document.createElement('dl');
    list.className = 'order-summary-list';

    const items = [
      { label: 'Mã đơn demo:', value: order.orderCode },
      { label: 'Khách hàng:', value: order.customerName },
      { label: 'Món đã chọn:', value: order.productName },
      { label: 'Số lượng:', value: `${order.quantity} phần` },
      { label: 'Tổng tạm tính (demo):', value: UI.formatVND(order.totalPrice) },
      { label: 'Thời gian:', value: order.timestamp },
      { label: 'Ghi chú:', value: order.notes || 'Không có ghi chú' }
    ];

    items.forEach(it => {
      const dt = document.createElement('dt');
      dt.textContent = it.label;
      const dd = document.createElement('dd');
      dd.textContent = it.value;
      list.appendChild(dt);
      list.appendChild(dd);
    });

    elements.modalDetails.appendChild(list);
    elements.orderModal.classList.add('active');
    elements.orderModal.setAttribute('aria-hidden', 'false');
    if (elements.modalDoneBtn) elements.modalDoneBtn.focus();
  }

  function closeModal() {
    if (!elements.orderModal) return;
    elements.orderModal.classList.remove('active');
    elements.orderModal.setAttribute('aria-hidden', 'true');
  }

  /**
   * Thiết lập Lịch sử đơn demo (LocalStorage viewer)
   */
  function setupHistory() {
    if (elements.viewHistoryBtn && elements.historyContainer) {
      elements.viewHistoryBtn.addEventListener('click', () => {
        elements.historyContainer.classList.toggle('active');
        updateHistoryUI();
      });
    }

    if (elements.clearHistoryBtn) {
      elements.clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa lịch sử các đơn hàng demo đã lưu trên trình duyệt này?')) {
          clearOrdersHistory();
        }
      });
    }

    updateHistoryUI();
  }

  function updateHistoryUI() {
    if (!elements.historyList) return;

    const orders = getSavedOrders();
    elements.historyList.innerHTML = '';

    if (orders.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'history-empty';
      emptyLi.textContent = 'Chưa có đơn hàng demo nào được lưu trên trình duyệt.';
      elements.historyList.appendChild(emptyLi);
      return;
    }

    orders.forEach(ord => {
      const li = document.createElement('li');
      li.className = 'history-item';

      const header = document.createElement('div');
      header.className = 'history-header';

      const code = document.createElement('strong');
      code.textContent = `${ord.orderCode} (${ord.timestamp})`;

      const price = document.createElement('span');
      price.className = 'history-price';
      price.textContent = UI.formatVND(ord.totalPrice);

      header.appendChild(code);
      header.appendChild(price);

      const detail = document.createElement('p');
      detail.className = 'history-detail';
      detail.textContent = `${ord.quantity}x ${ord.productName} — Khách: ${ord.customerName}`;

      li.appendChild(header);
      li.appendChild(detail);
      elements.historyList.appendChild(li);
    });
  }

  // Khởi động ứng dụng
  init();
});
