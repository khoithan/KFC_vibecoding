/**
 * KFC Promo Landing Page — Module Thanh Toán (Payment & Checkout Module)
 * Module độc lập, hỗ trợ tính toán, xác thực, voucher, phương thức thanh toán đa dạng
 * (COD, Chuyển khoản QR Napas 247/VietQR, Ví điện tử MoMo/ZaloPay, Thẻ ATM/Visa demo).
 * 
 * Tuân thủ bảo mật DOM (chống XSS), validate dữ liệu nghiêm ngặt và lưu trữ localStorage.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PaymentModule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =========================================================================
  // 1. CẤU HÌNH MẶC ĐỊNH (CONFIG)
  // =========================================================================
  const DEFAULT_CONFIG = {
    // Phí giao hàng
    standardShippingFee: 20000,       // Phí ship tiêu chuẩn: 20.000 đ
    freeShippingThreshold: 150000,    // Miễn phí ship cho đơn từ: 150.000 đ
    
    // Ngân hàng nhận thanh toán (Mô phỏng Demo)
    bankInfo: {
      bankName: 'MB Bank (Quân Đội)',
      bankCode: 'MB',
      accountNumber: '99998888KFC',
      accountName: 'KFC VIETNAM DEMO STORE',
      qrTemplate: 'compact'
    },

    // Danh sách Voucher có sẵn (kết hợp các mã từ promotions.csv)
    vouchers: {
      'FREESHIP': {
        code: 'FREESHIP',
        type: 'FREE_SHIPPING',
        description: 'Miễn phí giao hàng toàn quốc cho đơn demo',
        minOrder: 0
      },
      'GIAMGIA20': {
        code: 'GIAMGIA20',
        type: 'PERCENTAGE',
        value: 20, // Giảm 20%
        maxDiscount: 50000,
        description: 'Giảm 20% tối đa 50.000 đ',
        minOrder: 80000
      },
      'DEMO10K': {
        code: 'DEMO10K',
        type: 'FIXED_AMOUNT',
        value: 10000, // Giảm 10.000 đ
        description: 'Giảm trực tiếp 10.000 đ cho mọi đơn hàng',
        minOrder: 50000
      },
      'KFCCOMBO': {
        code: 'KFCCOMBO',
        type: 'PERCENTAGE',
        value: 15,
        maxDiscount: 40000,
        description: 'Ưu đãi combo tiệc gà giảm 15%',
        minOrder: 100000
      }
    },

    // Key lưu trữ LocalStorage
    storageKey: 'kfc_orders_history',
    activeOrderKey: 'kfc_active_checkout'
  };

  // =========================================================================
  // 2. BỘ TÍNH TOÁN THANH TOÁN (CALCULATOR)
  // =========================================================================
  const Calculator = {
    /**
     * Tính tổng phụ từ danh sách món trong giỏ hàng
     * @param {Array} items - Mảng các phần tử [{ id, price, quantity, ... }]
     * @returns {number}
     */
    calculateSubtotal(items) {
      if (!Array.isArray(items) || items.length === 0) return 0;
      return items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const qty = parseInt(item.quantity, 10) || 0;
        return total + Math.max(0, price) * Math.max(0, qty);
      }, 0);
    },

    /**
     * Tính phí giao hàng dựa vào hình thức và giá trị đơn
     * @param {number} subtotal
     * @param {'DELIVERY'|'PICKUP'} fulfillmentType
     * @param {Object} [config]
     * @returns {number}
     */
    calculateShippingFee(subtotal, fulfillmentType, config = DEFAULT_CONFIG) {
      if (fulfillmentType === 'PICKUP') return 0;
      if (subtotal >= config.freeShippingThreshold) return 0;
      return config.standardShippingFee;
    },

    /**
     * Tính giá trị giảm giá từ Voucher
     * @param {Object|null} voucher
     * @param {number} subtotal
     * @param {number} shippingFee
     * @returns {{ discountAmount: number, freeShippingApplied: boolean, error?: string }}
     */
    calculateDiscount(voucher, subtotal, shippingFee) {
      if (!voucher) {
        return { discountAmount: 0, freeShippingApplied: false };
      }

      if (subtotal < (voucher.minOrder || 0)) {
        return {
          discountAmount: 0,
          freeShippingApplied: false,
          error: `Đơn hàng tối thiểu để áp dụng mã này là ${new Intl.NumberFormat('vi-VN').format(voucher.minOrder)} đ`
        };
      }

      let discountAmount = 0;
      let freeShippingApplied = false;

      if (voucher.type === 'FREE_SHIPPING') {
        discountAmount = shippingFee;
        freeShippingApplied = true;
      } else if (voucher.type === 'FIXED_AMOUNT') {
        discountAmount = Math.min(voucher.value, subtotal);
      } else if (voucher.type === 'PERCENTAGE') {
        const rawDiscount = Math.round((subtotal * voucher.value) / 100);
        discountAmount = voucher.maxDiscount ? Math.min(rawDiscount, voucher.maxDiscount) : rawDiscount;
      }

      return {
        discountAmount: Math.max(0, discountAmount),
        freeShippingApplied
      };
    },

    /**
     * Tính toán tổng quan đơn thanh toán (Subtotal, Shipping, Discount, Total)
     * @param {Array} items
     * @param {'DELIVERY'|'PICKUP'} fulfillmentType
     * @param {string} [voucherCode]
     * @param {Object} [config]
     * @returns {Object}
     */
    computeOrderSummary(items, fulfillmentType = 'DELIVERY', voucherCode = '', config = DEFAULT_CONFIG) {
      const subtotal = this.calculateSubtotal(items);
      let shippingFee = this.calculateShippingFee(subtotal, fulfillmentType, config);

      let voucher = null;
      let voucherError = null;
      let discountAmount = 0;
      let freeShippingApplied = false;

      if (voucherCode && typeof voucherCode === 'string') {
        const cleanCode = voucherCode.trim().toUpperCase();
        if (config.vouchers[cleanCode]) {
          voucher = config.vouchers[cleanCode];
          const discountResult = this.calculateDiscount(voucher, subtotal, shippingFee);
          if (discountResult.error) {
            voucherError = discountResult.error;
            voucher = null;
          } else {
            discountAmount = discountResult.discountAmount;
            freeShippingApplied = discountResult.freeShippingApplied;
            if (freeShippingApplied) {
              shippingFee = 0;
              discountAmount = 0; // Đã khấu trừ vào phí vận chuyển
            }
          }
        } else {
          voucherError = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
        }
      }

      const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

      return {
        subtotal,
        shippingFee,
        discountAmount,
        finalTotal,
        fulfillmentType,
        voucherCode: voucher ? voucher.code : null,
        voucherInfo: voucher,
        voucherError,
        freeShippingApplied,
        itemCount: Array.isArray(items) ? items.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0) : 0
      };
    }
  };

  // =========================================================================
  // 3. XÁC THỰC DỮ LIỆU ĐẦU VÀO (VALIDATOR)
  // =========================================================================
  const Validator = {
    /**
     * Kiểm tra số điện thoại Việt Nam hợp lệ
     * Đầu số 03, 05, 07, 08, 09 gồm 10 chữ số
     * @param {string} phone
     * @returns {boolean}
     */
    isValidVietnamesePhone(phone) {
      if (!phone || typeof phone !== 'string') return false;
      const cleanPhone = phone.replace(/[\s.-]/g, '');
      const regex = /^(03|05|07|08|09)\d{8}$/;
      return regex.test(cleanPhone);
    },

    /**
     * Kiểm tra địa chỉ email (tùy chọn)
     * @param {string} email
     * @returns {boolean}
     */
    isValidEmail(email) {
      if (!email) return true; // Email là tùy chọn
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email.trim());
    },

    /**
     * Xác thực thông tin khách hàng và hình thức nhận
     * @param {Object} customer
     * @param {'DELIVERY'|'PICKUP'} fulfillmentType
     * @returns {{ isValid: boolean, errors: Object }}
     */
    validateCustomer(customer = {}, fulfillmentType = 'DELIVERY') {
      const errors = {};

      const fullName = (customer.fullName || '').trim();
      if (!fullName) {
        errors.fullName = 'Vui lòng nhập họ và tên người nhận.';
      } else if (fullName.length < 2 || fullName.length > 50) {
        errors.fullName = 'Họ và tên phải từ 2 đến 50 ký tự.';
      }

      const phone = (customer.phone || '').trim();
      if (!phone) {
        errors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
      } else if (!this.isValidVietnamesePhone(phone)) {
        errors.phone = 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).';
      }

      if (customer.email && !this.isValidEmail(customer.email)) {
        errors.email = 'Địa chỉ email không đúng định dạng.';
      }

      if (fulfillmentType === 'DELIVERY') {
        const address = (customer.address || '').trim();
        if (!address) {
          errors.address = 'Vui lòng nhập địa chỉ giao hàng chi tiết.';
        } else if (address.length < 5) {
          errors.address = 'Địa chỉ giao hàng quá ngắn, vui lòng ghi rõ số nhà, tên đường, phường/xã.';
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    },

    /**
     * Kiểm tra giỏ hàng có hợp lệ để thanh toán không
     * @param {Array} items
     * @returns {{ isValid: boolean, message?: string }}
     */
    validateCartItems(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return { isValid: false, message: 'Giỏ hàng của bạn đang trống. Vui lòng chọn món trước khi thanh toán.' };
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.id || !it.name) {
          return { isValid: false, message: `Món hàng ở vị trí ${i + 1} thiếu thông tin bắt buộc.` };
        }
        const qty = parseInt(it.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          return { isValid: false, message: `Số lượng món "${it.name}" không hợp lệ.` };
        }
        const price = Number(it.price);
        if (isNaN(price) || price < 0) {
          return { isValid: false, message: `Đơn giá của món "${it.name}" không hợp lệ.` };
        }
      }

      return { isValid: true };
    },

    /**
     * Kiểm tra phương thức thanh toán có được hỗ trợ không
     * @param {string} method
     * @returns {boolean}
     */
    isValidPaymentMethod(method) {
      const SUPPORTED = ['COD', 'BANK_TRANSFER', 'MOMO', 'ZALOPAY', 'CARD_DEMO'];
      return SUPPORTED.includes(method);
    }
  };

  // =========================================================================
  // 4. MÔ PHỎNG CỔNG THANH TOÁN (GATEWAY SIMULATOR)
  // =========================================================================
  const GatewaySimulator = {
    /**
     * Sinh mã đơn hàng ngẫu nhiên duy nhất
     * @returns {string} VD: KFC-ORD-849201
     */
    generateOrderCode() {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      return `KFC-ORD-${randomSuffix}`;
    },

    /**
     * Tạo đường dẫn mã QR chuẩn VietQR động để thanh toán chuyển khoản
     * @param {Object} bankInfo
     * @param {number} amount
     * @param {string} orderCode
     * @returns {string} URL hình ảnh VietQR
     */
    generateVietQrUrl(bankInfo, amount, orderCode) {
      const encodedDesc = encodeURIComponent(`KFC ${orderCode}`);
      return `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-${bankInfo.qrTemplate}.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodeURIComponent(bankInfo.accountName)}`;
    },

    /**
     * Tạo dữ liệu SVG QR Code độc lập (offline fallback) khi không có mạng
     * @param {string} text
     * @returns {string} Data URI SVG QR Code mô phỏng
     */
    generateFallbackQrSvg(text) {
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" fill="%23FFFFFF"/><g fill="%23C8102E"><rect x="10" y="10" width="40" height="40" rx="4"/><rect x="18" y="18" width="24" height="24" fill="%23FFFFFF"/><rect x="22" y="22" width="16" height="16"/><rect x="110" y="10" width="40" height="40" rx="4"/><rect x="118" y="18" width="24" height="24" fill="%23FFFFFF"/><rect x="122" y="22" width="16" height="16"/><rect x="10" y="110" width="40" height="40" rx="4"/><rect x="18" y="118" width="24" height="24" fill="%23FFFFFF"/><rect x="22" y="122" width="16" height="16"/><rect x="60" y="20" width="10" height="10"/><rect x="80" y="20" width="10" height="10"/><rect x="70" y="40" width="20" height="10"/><rect x="20" y="70" width="10" height="20"/><rect x="50" y="60" width="20" height="20"/><rect x="80" y="70" width="30" height="10"/><rect x="60" y="100" width="20" height="20"/><rect x="120" y="60" width="20" height="10"/><rect x="110" y="90" width="20" height="20"/><rect x="130" y="120" width="20" height="20"/><rect x="90" y="120" width="20" height="20"/></g><text x="80" y="88" font-family="Arial" font-size="10" font-weight="bold" fill="%23C8102E" text-anchor="middle">KFC PAY</text></svg>`;
    },

    /**
     * Tạo SVG mã QR MoMo đặc trưng màu hồng cánh sen
     */
    generateMoMoQrSvg(orderCode, amount) {
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" fill="%23FFFFFF"/><g fill="%23A50064"><rect x="10" y="10" width="40" height="40" rx="4"/><rect x="18" y="18" width="24" height="24" fill="%23FFFFFF"/><rect x="22" y="22" width="16" height="16"/><rect x="110" y="10" width="40" height="40" rx="4"/><rect x="118" y="18" width="24" height="24" fill="%23FFFFFF"/><rect x="122" y="22" width="16" height="16"/><rect x="10" y="110" width="40" height="40" rx="4"/><rect x="18" y="118" width="24" height="24" fill="%23FFFFFF"/><rect x="22" y="122" width="16" height="16"/><rect x="60" y="25" width="12" height="12"/><rect x="85" y="25" width="12" height="12"/><rect x="65" y="50" width="25" height="10"/><rect x="25" y="70" width="12" height="25"/><rect x="55" y="65" width="20" height="20"/><rect x="85" y="75" width="30" height="12"/><rect x="65" y="105" width="20" height="20"/><rect x="120" y="65" width="20" height="12"/><rect x="115" y="95" width="20" height="20"/></g><rect x="52" y="72" width="56" height="24" rx="4" fill="%23A50064"/><text x="80" y="88" font-family="Arial" font-size="9" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">MoMo Pay</text></svg>`;
    },

    /**
     * Tạo SVG mã QR ZaloPay đặc trưng màu xanh dương
     */
    generateZaloPayQrSvg(orderCode, amount) {
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" fill="%23FFFFFF"/><g fill="%230068FF"><rect x="10" y="10" width="40" height="40" rx="4"/><rect x="18" y="18" width="24" height="24" fill="%23FFFFFF"/><rect x="22" y="22" width="16" height="16"/><rect x="110" y="10" width="40" height="40" rx="4"/><rect x="118" y="18" width="24" height="24" fill="%23FFFFFF"/><rect x="122" y="22" width="16" height="16"/><rect x="10" y="110" width="40" height="40" rx="4"/><rect x="18" y="118" width="24" height="24" fill="%23FFFFFF"/><rect x="22" y="122" width="16" height="16"/><rect x="60" y="20" width="10" height="10"/><rect x="85" y="20" width="12" height="12"/><rect x="68" y="45" width="22" height="10"/><rect x="22" y="70" width="12" height="22"/><rect x="52" y="60" width="20" height="20"/><rect x="85" y="70" width="30" height="10"/><rect x="60" y="100" width="20" height="20"/><rect x="120" y="60" width="20" height="10"/><rect x="110" y="90" width="20" height="20"/></g><rect x="48" y="72" width="64" height="24" rx="4" fill="%230068FF"/><text x="80" y="88" font-family="Arial" font-size="8.5" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">ZaloPay QR</text></svg>`;
    },

    /**
     * Mô phỏng xử lý giao dịch thanh toán bất đồng bộ
     * @param {Object} paymentPayload
     * @returns {Promise<Object>}
     */
    processPayment(paymentPayload) {
      return new Promise((resolve, reject) => {
        // Giả lập độ trễ mạng từ 1.0s đến 1.8s
        const latency = 1200;

        setTimeout(() => {
          // Bắt lỗi nếu số tiền không hợp lệ
          if (!paymentPayload.finalTotal || paymentPayload.finalTotal <= 0) {
            reject(new Error('Tổng tiền thanh toán phải lớn hơn 0 đ.'));
            return;
          }

          let paymentStatus = 'PENDING';
          let transactionMessage = '';

          switch (paymentPayload.paymentMethod) {
            case 'COD':
              paymentStatus = 'COD_CONFIRMED';
              transactionMessage = 'Đơn hàng sẽ được thanh toán tiền mặt khi tài xế giao món tận tay.';
              break;
            case 'BANK_TRANSFER':
              paymentStatus = 'PAID';
              transactionMessage = 'Giao dịch chuyển khoản ngân hàng demo đã được xác nhận thành công.';
              break;
            case 'MOMO':
              paymentStatus = 'PAID';
              transactionMessage = 'Thanh toán qua Ví điện tử MoMo (Mô phỏng demo) thành công.';
              break;
            case 'ZALOPAY':
              paymentStatus = 'PAID';
              transactionMessage = 'Thanh toán qua Ví ZaloPay (Mô phỏng demo) thành công.';
              break;
            case 'CARD_DEMO':
              paymentStatus = 'PAID';
              transactionMessage = 'Thanh toán qua Thẻ thanh toán (Mô phỏng an toàn) thành công.';
              break;
            default:
              paymentStatus = 'PENDING';
              transactionMessage = 'Đơn hàng đã được tiếp nhận.';
          }

          const completedOrder = {
            orderId: paymentPayload.orderId || this.generateOrderCode(),
            customer: paymentPayload.customer,
            items: paymentPayload.items,
            summary: paymentPayload.summary,
            paymentMethod: paymentPayload.paymentMethod,
            fulfillmentType: paymentPayload.fulfillmentType,
            status: paymentStatus,
            transactionMessage,
            createdAt: new Date().toISOString(),
            formattedTime: new Date().toLocaleString('vi-VN')
          };

          resolve(completedOrder);
        }, latency);
      });
    }
  };

  // =========================================================================
  // 5. QUẢN LÝ LƯU TRỮ ĐƠN HÀNG (STORAGE)
  // =========================================================================
  const Storage = {
    /**
     * Lấy danh sách lịch sử đơn hàng từ localStorage
     * @param {string} key
     * @returns {Array}
     */
    getOrders(key = DEFAULT_CONFIG.storageKey) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn('Lỗi đọc dữ liệu từ localStorage:', e);
        return [];
      }
    },

    /**
     * Lưu một đơn hàng mới vào đầu danh sách lịch sử
     * @param {Object} order
     * @param {string} key
     * @returns {boolean}
     */
    saveOrder(order, key = DEFAULT_CONFIG.storageKey) {
      try {
        const orders = this.getOrders(key);
        orders.unshift(order);
        // Lưu tối đa 20 đơn hàng gần nhất
        const sliced = orders.slice(0, 20);
        localStorage.setItem(key, JSON.stringify(sliced));
        return true;
      } catch (e) {
        console.warn('Lỗi lưu đơn hàng vào localStorage:', e);
        return false;
      }
    },

    /**
     * Xóa toàn bộ lịch sử đơn hàng
     * @param {string} key
     */
    clearOrders(key = DEFAULT_CONFIG.storageKey) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Lỗi xóa lịch sử:', e);
      }
    }
  };

  // =========================================================================
  // 6. GIAO DIỆN THANH TOÁN (PAYMENT UI & MODAL ENGINE)
  // =========================================================================
  let instance = null;

  class PaymentUIController {
    constructor(options = {}) {
      this.config = Object.assign({}, DEFAULT_CONFIG, options);
      this.currentCart = [];
      this.currentFulfillment = 'DELIVERY'; // 'DELIVERY' | 'PICKUP'
      this.currentPaymentMethod = 'COD';    // 'COD' | 'BANK_TRANSFER' | 'MOMO' | 'CARD_DEMO'
      this.currentVoucherCode = '';
      this.currentStep = 1;                 // 1: Customer Info -> 2: Payment -> 3: Success Receipt
      this.activeOrder = null;
      this.callbacks = {
        onSuccess: options.onSuccess || null,
        onCancel: options.onCancel || null,
        onClearCart: options.onClearCart || null
      };

      // QR countdown timer management
      this._qrTimerInterval = null;
      this._qrTimerSeconds = 0;

      this.dom = {};
      this.initModalDOM();
    }

    /**
     * Bắt đầu đếm ngược QR (15 phút) cho element countdown có id `countdownId`
     * Tự dọn dẹp interval khi hết giờ hoặc khi render lại.
     * @param {string} countdownId - id của element hiển thị đồng hồ
     */
    startQrCountdown(countdownId) {
      this.stopQrCountdown(); // Luôn dọn timer cũ trước
      this._qrTimerSeconds = 15 * 60; // 15 phút

      this._qrTimerInterval = setInterval(() => {
        this._qrTimerSeconds -= 1;
        const el = document.getElementById(countdownId);
        if (el) {
          const m = Math.floor(this._qrTimerSeconds / 60);
          const s = this._qrTimerSeconds % 60;
          el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          if (this._qrTimerSeconds <= 60) {
            el.style.color = '#e53935'; // Đỏ khi sắp hết giờ
          }
        }
        if (this._qrTimerSeconds <= 0) {
          this.stopQrCountdown();
          const elExp = document.getElementById(countdownId);
          if (elExp) elExp.textContent = 'Đã hết hạn';
        }
      }, 1000);
    }

    /**
     * Dừng và xóa QR countdown timer
     */
    stopQrCountdown() {
      if (this._qrTimerInterval) {
        clearInterval(this._qrTimerInterval);
        this._qrTimerInterval = null;
      }
    }

    /**
     * Khởi tạo khung DOM Modal Thanh toán nếu chưa có
     */
    initModalDOM() {
      let modalOverlay = document.getElementById('payment-modal-overlay');
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'payment-modal-overlay';
        modalOverlay.className = 'payment-modal-backdrop';
        modalOverlay.setAttribute('role', 'dialog');
        modalOverlay.setAttribute('aria-modal', 'true');
        modalOverlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(modalOverlay);
      }
      this.dom.overlay = modalOverlay;
    }

    /**
     * Mở màn hình thanh toán với dữ liệu Giỏ hàng nhận vào
     * @param {Object} cartData - { items: Array }
     */
    openCheckout(cartData = {}) {
      const items = Array.isArray(cartData.items) ? cartData.items : (Array.isArray(cartData) ? cartData : []);
      const validation = Validator.validateCartItems(items);

      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      this.currentCart = items;
      this.currentStep = 1;
      this.currentVoucherCode = '';
      this.currentPaymentMethod = 'COD';
      this.currentFulfillment = 'DELIVERY';

      this.render();
      this.showModal();
    }

    /**
     * Hiển thị Modal
     */
    showModal() {
      if (this.dom.overlay) {
        this.dom.overlay.classList.add('active');
        this.dom.overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('payment-modal-open');
      }
    }

    /**
     * Đóng Modal
     */
    closeCheckout() {
      this.stopQrCountdown(); // Dừng mọi timer đang chạy
      if (this.dom.overlay) {
        this.dom.overlay.classList.remove('active');
        this.dom.overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('payment-modal-open');
      }
      if (typeof this.callbacks.onCancel === 'function') {
        this.callbacks.onCancel();
      }
    }

    /**
     * Render toàn bộ nội dung bước hiện tại
     */
    render() {
      this.stopQrCountdown(); // Dừng timer cũ mỗi khi render lại
      const overlay = this.dom.overlay;
      overlay.innerHTML = '';

      const modalWindow = document.createElement('div');
      modalWindow.className = 'payment-modal-window';

      // Nút đóng
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'payment-modal-close';
      closeBtn.setAttribute('aria-label', 'Đóng thanh toán');
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = () => this.closeCheckout();
      modalWindow.appendChild(closeBtn);

      // Thanh tiến trình (Step progress indicator)
      const progressBar = this.createProgressBar();
      modalWindow.appendChild(progressBar);

      // Render nội dung theo bước
      let stepContent;
      if (this.currentStep === 1) {
        stepContent = this.createStep1View();
      } else if (this.currentStep === 2) {
        stepContent = this.createStep2View();
      } else if (this.currentStep === 3) {
        stepContent = this.createStep3ReceiptView();
      }

      modalWindow.appendChild(stepContent);
      overlay.appendChild(modalWindow);

      // Khởi động đồng hồ đếm ngược QR sau khi DOM đã vào tài liệu
      if (this.currentStep === 2) {
        if (this.currentPaymentMethod === 'BANK_TRANSFER') {
          this.startQrCountdown('qr-countdown');
        } else if (this.currentPaymentMethod === 'MOMO') {
          this.startQrCountdown('momo-countdown');
        } else if (this.currentPaymentMethod === 'ZALOPAY') {
          this.startQrCountdown('zalopay-countdown');
        }
      }
    }

    /**
     * Tạo thanh hiển thị bước quy trình
     */
    createProgressBar() {
      const container = document.createElement('div');
      container.className = 'payment-steps-header';

      const steps = [
        { num: 1, label: 'Thông tin' },
        { num: 2, label: 'Thanh toán' },
        { num: 3, label: 'Hoàn tất' }
      ];

      steps.forEach(st => {
        const item = document.createElement('div');
        item.className = `payment-step-item ${this.currentStep === st.num ? 'active' : ''} ${this.currentStep > st.num ? 'completed' : ''}`;

        const circle = document.createElement('div');
        circle.className = 'payment-step-circle';
        circle.textContent = this.currentStep > st.num ? '✓' : st.num;

        const text = document.createElement('span');
        text.className = 'payment-step-label';
        text.textContent = st.label;

        item.appendChild(circle);
        item.appendChild(text);
        container.appendChild(item);
      });

      return container;
    }

    /**
     * BƯỚC 1: Nhập thông tin khách hàng, chọn Giao hàng/Nhận tại quán, tóm tắt giỏ hàng
     */
    createStep1View() {
      const view = document.createElement('div');
      view.className = 'payment-step-content step-1';

      const title = document.createElement('h2');
      title.className = 'payment-title';
      title.textContent = 'Thông tin đặt & nhận hàng';
      view.appendChild(title);

      const disclaimer = document.createElement('div');
      disclaimer.className = 'payment-demo-banner';
      disclaimer.textContent = '⚡ Bản mô phỏng Demo: Mọi đơn hàng đều không thu tiền thật và không giao hàng thực tế.';
      view.appendChild(disclaimer);

      const grid = document.createElement('div');
      grid.className = 'payment-grid';

      // Cột trái: Form thông tin
      const formCol = document.createElement('div');
      formCol.className = 'payment-form-col';

      // Lựa chọn Giao hàng vs Nhận tại quán
      const fulfillmentWrap = document.createElement('div');
      fulfillmentWrap.className = 'fulfillment-toggle-wrap';

      const deliveryBtn = document.createElement('button');
      deliveryBtn.type = 'button';
      deliveryBtn.className = `fulfillment-btn ${this.currentFulfillment === 'DELIVERY' ? 'active' : ''}`;
      deliveryBtn.innerHTML = '🛵 Giao hàng tận nơi';
      deliveryBtn.onclick = () => {
        this.currentFulfillment = 'DELIVERY';
        this.render();
      };

      const pickupBtn = document.createElement('button');
      pickupBtn.type = 'button';
      pickupBtn.className = `fulfillment-btn ${this.currentFulfillment === 'PICKUP' ? 'active' : ''}`;
      pickupBtn.innerHTML = '🏪 Nhận tại cửa hàng';
      pickupBtn.onclick = () => {
        this.currentFulfillment = 'PICKUP';
        this.render();
      };

      fulfillmentWrap.appendChild(deliveryBtn);
      fulfillmentWrap.appendChild(pickupBtn);
      formCol.appendChild(fulfillmentWrap);

      // Form fields
      const form = document.createElement('form');
      form.id = 'payment-customer-form';
      form.noValidate = true;

      // Họ tên
      form.appendChild(this.createInputGroup('fullName', 'Họ và tên người nhận:', 'text', 'Ví dụ: Nguyễn Văn An', true, this.customerInfo?.fullName));
      
      // Số điện thoại
      form.appendChild(this.createInputGroup('phone', 'Số điện thoại liên hệ:', 'tel', 'Ví dụ: 0987654321', true, this.customerInfo?.phone));

      // Email
      form.appendChild(this.createInputGroup('email', 'Email (nhận hóa đơn demo):', 'email', 'Ví dụ: an.nguyen@email.com', false, this.customerInfo?.email));

      // Địa chỉ (nếu là Giao hàng)
      if (this.currentFulfillment === 'DELIVERY') {
        form.appendChild(this.createInputGroup('address', 'Địa chỉ giao hàng chi tiết:', 'text', 'Số nhà, tên đường, phường/xã, quận/huyện', true, this.customerInfo?.address));
      } else {
        const storeNote = document.createElement('div');
        storeNote.className = 'pickup-store-info';
        storeNote.innerHTML = '📍 <strong>Địa chỉ nhận món:</strong> KFC Demo Store — 123 Phố Ẩm Thực, Quận 1, TP. HCM (Sẵn sàng sau 15-20 phút)';
        form.appendChild(storeNote);
      }

      // Ghi chú
      const notesGroup = document.createElement('div');
      notesGroup.className = 'payment-field-group';
      const notesLabel = document.createElement('label');
      notesLabel.className = 'payment-label';
      notesLabel.textContent = 'Ghi chú cho đơn hàng (tùy chọn):';
      const notesTextarea = document.createElement('textarea');
      notesTextarea.id = 'payment-notes';
      notesTextarea.name = 'notes';
      notesTextarea.className = 'payment-input';
      notesTextarea.rows = 2;
      notesTextarea.placeholder = 'Ví dụ: Giao lên tầng 3, gọi trước khi đến, lấy thêm tương cà...';
      notesTextarea.value = this.customerInfo?.notes || '';
      notesGroup.appendChild(notesLabel);
      notesGroup.appendChild(notesTextarea);
      form.appendChild(notesGroup);

      // Error message container
      const errorBox = document.createElement('div');
      errorBox.id = 'payment-step1-error';
      errorBox.className = 'payment-inline-error';
      errorBox.style.display = 'none';
      form.appendChild(errorBox);

      formCol.appendChild(form);

      // Cột phải: Tóm tắt đơn hàng & Voucher
      const summaryCol = document.createElement('div');
      summaryCol.className = 'payment-summary-col';

      const summaryCard = this.createOrderSummaryCard();
      summaryCol.appendChild(summaryCard);

      grid.appendChild(formCol);
      grid.appendChild(summaryCol);
      view.appendChild(grid);

      // Nút chuyển bước
      const actionRow = document.createElement('div');
      actionRow.className = 'payment-actions-row';

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'btn btn-secondary';
      backBtn.textContent = '← Quay lại giỏ hàng';
      backBtn.onclick = () => this.closeCheckout();

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn btn-primary';
      nextBtn.textContent = 'Tiếp tục chọn thanh toán →';
      nextBtn.onclick = () => this.handleStep1Submit();

      actionRow.appendChild(backBtn);
      actionRow.appendChild(nextBtn);
      view.appendChild(actionRow);

      return view;
    }

    createInputGroup(name, labelText, type = 'text', placeholder = '', isRequired = false, defaultValue = '') {
      const wrap = document.createElement('div');
      wrap.className = 'payment-field-group';

      const label = document.createElement('label');
      label.className = 'payment-label';
      label.setAttribute('for', `payment-input-${name}`);
      label.innerHTML = `${labelText} ${isRequired ? '<span class="req">*</span>' : ''}`;

      const input = document.createElement('input');
      input.type = type;
      input.id = `payment-input-${name}`;
      input.name = name;
      input.className = 'payment-input';
      input.placeholder = placeholder;
      input.value = defaultValue || '';

      wrap.appendChild(label);
      wrap.appendChild(input);
      return wrap;
    }

    /**
     * Thẻ tóm tắt đơn hàng kèm ô nhập Voucher
     */
    createOrderSummaryCard() {
      const card = document.createElement('div');
      card.className = 'order-summary-box';

      const cardTitle = document.createElement('h3');
      cardTitle.className = 'summary-title';
      cardTitle.textContent = `Tóm tắt đơn hàng (${this.currentCart.length} món)`;
      card.appendChild(cardTitle);

      // Danh sách món rút gọn
      const itemsList = document.createElement('div');
      itemsList.className = 'summary-items-list';
      this.currentCart.forEach(it => {
        const row = document.createElement('div');
        row.className = 'summary-item-row';
        
        const namePart = document.createElement('span');
        namePart.className = 'summary-item-name';
        namePart.textContent = `${it.quantity}x ${it.name}`;

        const pricePart = document.createElement('span');
        pricePart.className = 'summary-item-price';
        pricePart.textContent = this.formatCurrency((Number(it.price) || 0) * (it.quantity || 1));

        row.appendChild(namePart);
        row.appendChild(pricePart);
        itemsList.appendChild(row);
      });
      card.appendChild(itemsList);

      // Khung nhập Voucher
      const voucherWrap = document.createElement('div');
      voucherWrap.className = 'voucher-input-wrap';

      const voucherInput = document.createElement('input');
      voucherInput.type = 'text';
      voucherInput.className = 'voucher-input';
      voucherInput.placeholder = 'Nhập mã ưu đãi (VD: FREESHIP, GIAMGIA20)';
      voucherInput.value = this.currentVoucherCode;

      const voucherBtn = document.createElement('button');
      voucherBtn.type = 'button';
      voucherBtn.className = 'btn btn-secondary btn-sm voucher-apply-btn';
      voucherBtn.textContent = 'Áp dụng';
      voucherBtn.onclick = () => {
        this.currentVoucherCode = voucherInput.value.trim().toUpperCase();
        this.render();
      };

      voucherWrap.appendChild(voucherInput);
      voucherWrap.appendChild(voucherBtn);
      card.appendChild(voucherWrap);

      // Tính toán chi tiết
      const summary = Calculator.computeOrderSummary(
        this.currentCart,
        this.currentFulfillment,
        this.currentVoucherCode,
        this.config
      );

      // Thông báo voucher
      if (summary.voucherError) {
        const vError = document.createElement('div');
        vError.className = 'voucher-msg voucher-msg-error';
        vError.textContent = summary.voucherError;
        card.appendChild(vError);
      } else if (summary.voucherCode) {
        const vSuccess = document.createElement('div');
        vSuccess.className = 'voucher-msg voucher-msg-success';
        vSuccess.innerHTML = `✓ Đã áp dụng mã <strong>${summary.voucherCode}</strong>: ${summary.voucherInfo.description}`;
        card.appendChild(vSuccess);
      }

      // Bảng tổng kết tiền
      const calcList = document.createElement('div');
      calcList.className = 'summary-calc-list';

      this.appendSummaryRow(calcList, 'Tạm tính:', this.formatCurrency(summary.subtotal));
      
      const shipLabel = this.currentFulfillment === 'PICKUP' ? 'Phí nhận tại quán:' : 'Phí giao hàng:';
      const shipValue = summary.shippingFee === 0 ? 'Miễn phí' : this.formatCurrency(summary.shippingFee);
      this.appendSummaryRow(calcList, shipLabel, shipValue);

      if (summary.discountAmount > 0) {
        this.appendSummaryRow(calcList, 'Giảm giá ưu đãi:', `-${this.formatCurrency(summary.discountAmount)}`, 'discount-highlight');
      }

      this.appendSummaryRow(calcList, 'Tổng thanh toán:', this.formatCurrency(summary.finalTotal), 'total-row');
      card.appendChild(calcList);

      return card;
    }

    appendSummaryRow(container, label, value, extraClass = '') {
      const row = document.createElement('div');
      row.className = `summary-calc-row ${extraClass}`;
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('span');
      v.textContent = value;
      row.appendChild(l);
      row.appendChild(v);
      container.appendChild(row);
    }

    /**
     * Xử lý xác thực Bước 1
     */
    handleStep1Submit() {
      const form = document.getElementById('payment-customer-form');
      if (!form) return;

      const customer = {
        fullName: form.querySelector('#payment-input-fullName')?.value || '',
        phone: form.querySelector('#payment-input-phone')?.value || '',
        email: form.querySelector('#payment-input-email')?.value || '',
        address: form.querySelector('#payment-input-address')?.value || '',
        notes: document.getElementById('payment-notes')?.value || ''
      };

      const result = Validator.validateCustomer(customer, this.currentFulfillment);
      const errorBox = document.getElementById('payment-step1-error');

      if (!result.isValid) {
        const firstErrorKey = Object.keys(result.errors)[0];
        if (errorBox) {
          errorBox.textContent = result.errors[firstErrorKey];
          errorBox.style.display = 'block';
        }
        const errField = form.querySelector(`#payment-input-${firstErrorKey}`);
        if (errField) errField.focus();
        return;
      }

      if (errorBox) errorBox.style.display = 'none';
      this.customerInfo = customer;
      this.currentStep = 2;
      this.render();
    }

    /**
     * BƯỚC 2: Chọn phương thức thanh toán (COD, QR Napas 247/VietQR, Ví điện tử, Thẻ)
     */
    createStep2View() {
      const view = document.createElement('div');
      view.className = 'payment-step-content step-2';

      const title = document.createElement('h2');
      title.className = 'payment-title';
      title.textContent = 'Chọn phương thức thanh toán';
      view.appendChild(title);

      const summary = Calculator.computeOrderSummary(
        this.currentCart,
        this.currentFulfillment,
        this.currentVoucherCode,
        this.config
      );

      const amountBanner = document.createElement('div');
      amountBanner.className = 'payment-amount-banner';
      amountBanner.innerHTML = `Số tiền cần thanh toán: <strong>${this.formatCurrency(summary.finalTotal)}</strong>`;
      view.appendChild(amountBanner);

      // Danh sách các phương thức thanh toán
      const methodsContainer = document.createElement('div');
      methodsContainer.className = 'payment-methods-grid';

      const methods = [
        {
          id: 'MOMO',
          title: 'Mã QR MoMo',
          desc: 'Quét mã QR qua ứng dụng MoMo để thanh toán tức thì.',
          badge: 'Khuyên dùng',
          icon: '📱'
        },
        {
          id: 'ZALOPAY',
          title: 'QR ZaloPay',
          desc: 'Quét mã QR tiện lợi qua ứng dụng ZaloPay hoặc ví Zalo.',
          badge: 'Ưu đãi',
          icon: '⚡'
        },
        {
          id: 'CARD_DEMO',
          title: 'Thẻ Debit / Credit',
          desc: 'Thanh toán bằng thẻ quốc tế Visa, Mastercard, JCB (Mô phỏng an toàn).',
          badge: 'Visa/Master',
          icon: '💳'
        },
        {
          id: 'COD',
          title: 'Tiền mặt khi nhận hàng',
          desc: 'Thanh toán tiền mặt cho nhân viên giao hàng hoặc khi nhận tại quán.',
          badge: 'Phổ biến',
          icon: '💵'
        },
        {
          id: 'BANK_TRANSFER',
          title: 'QR Ngân hàng (VietQR / Napas 247)',
          desc: 'Quét mã VietQR qua ứng dụng ngân hàng bất kỳ (MB, Vietcombank, Techcombank...).',
          badge: 'Tự động',
          icon: '🏦'
        }
      ];

      methods.forEach(m => {
        const card = document.createElement('div');
        card.className = `payment-method-card ${this.currentPaymentMethod === m.id ? 'selected' : ''}`;
        card.onclick = () => {
          this.currentPaymentMethod = m.id;
          this.render();
        };

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'paymentMethod';
        radio.checked = this.currentPaymentMethod === m.id;
        radio.className = 'payment-radio';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'method-icon';
        iconSpan.textContent = m.icon;

        const infoWrap = document.createElement('div');
        infoWrap.className = 'method-info';

        const head = document.createElement('div');
        head.className = 'method-head';
        const name = document.createElement('strong');
        name.textContent = m.title;
        head.appendChild(name);

        if (m.badge) {
          const b = document.createElement('span');
          b.className = 'badge badge-featured';
          b.textContent = m.badge;
          head.appendChild(b);
        }

        const d = document.createElement('p');
        d.className = 'method-desc';
        d.textContent = m.desc;

        infoWrap.appendChild(head);
        infoWrap.appendChild(d);

        card.appendChild(radio);
        card.appendChild(iconSpan);
        card.appendChild(infoWrap);
        methodsContainer.appendChild(card);
      });

      view.appendChild(methodsContainer);

      // Hiển thị khung tương tác chi tiết tùy theo phương thức đã chọn
      if (this.currentPaymentMethod === 'BANK_TRANSFER') {
        view.appendChild(this.createQrPaymentBox(summary.finalTotal));
        setTimeout(() => this.startQrCountdown('qr-countdown'), 50);
      } else if (this.currentPaymentMethod === 'MOMO') {
        view.appendChild(this.createMoMoQrBox(summary.finalTotal));
        setTimeout(() => this.startQrCountdown('momo-countdown'), 50);
      } else if (this.currentPaymentMethod === 'ZALOPAY') {
        view.appendChild(this.createZaloPayQrBox(summary.finalTotal));
        setTimeout(() => this.startQrCountdown('zalopay-countdown'), 50);
      } else if (this.currentPaymentMethod === 'CARD_DEMO') {
        view.appendChild(this.createCardPaymentBox());
      } else if (this.currentPaymentMethod === 'COD') {
        view.appendChild(this.createCodInfoBox(summary.finalTotal));
      }

      // Thông báo lỗi nếu có
      const errorBox = document.createElement('div');
      errorBox.id = 'payment-step2-error';
      errorBox.className = 'payment-inline-error';
      errorBox.style.display = 'none';
      view.appendChild(errorBox);

      // Nút điều hướng bước 2
      const actionRow = document.createElement('div');
      actionRow.className = 'payment-actions-row';

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'btn btn-secondary';
      backBtn.textContent = '← Sửa thông tin';
      backBtn.onclick = () => {
        this.currentStep = 1;
        this.render();
      };

      const payBtn = document.createElement('button');
      payBtn.id = 'payment-submit-btn';
      payBtn.type = 'button';
      payBtn.className = 'btn btn-primary btn-pay-now';
      payBtn.innerHTML = `<span>🍗 Hoàn tất đặt & thanh toán (${this.formatCurrency(summary.finalTotal)})</span>`;
      payBtn.onclick = () => this.handleProcessPayment(summary);

      actionRow.appendChild(backBtn);
      actionRow.appendChild(payBtn);
      view.appendChild(actionRow);

      return view;
    }

    /**
     * Khung hiển thị mã QR và số tài khoản ngân hàng
     */
    createQrPaymentBox(finalTotal) {
      const box = document.createElement('div');
      box.className = 'qr-payment-box';

      const tempOrderCode = GatewaySimulator.generateOrderCode();
      const qrUrl = GatewaySimulator.generateVietQrUrl(this.config.bankInfo, finalTotal, tempOrderCode);

      const qrGrid = document.createElement('div');
      qrGrid.className = 'qr-grid';

      // Hình ảnh QR
      const imgWrap = document.createElement('div');
      imgWrap.className = 'qr-image-wrap';
      const img = document.createElement('img');
      img.src = qrUrl;
      img.alt = 'Mã QR thanh toán đơn hàng KFC';
      img.onerror = () => {
        // Dự phòng fallback SVG nếu mất kết nối mạng
        img.src = GatewaySimulator.generateFallbackQrSvg(`KFC ${tempOrderCode}`);
      };
      imgWrap.appendChild(img);

      // Chi tiết chuyển khoản
      const infoWrap = document.createElement('div');
      infoWrap.className = 'qr-details-wrap';

      infoWrap.innerHTML = `
        <h4 class="qr-heading">Quét mã VietQR để thanh toán</h4>
        <dl class="qr-bank-details">
          <dt>Ngân hàng:</dt><dd><strong>${this.config.bankInfo.bankName}</strong></dd>
          <dt>Chủ tài khoản:</dt><dd><strong>${this.config.bankInfo.accountName}</strong></dd>
          <dt>Số tài khoản:</dt><dd><span class="copyable">${this.config.bankInfo.accountNumber}</span></dd>
          <dt>Số tiền:</dt><dd class="highlight-price">${this.formatCurrency(finalTotal)}</dd>
          <dt>Nội dung CK:</dt><dd><span class="copyable">KFC ${tempOrderCode}</span></dd>
        </dl>
        <p class="qr-timer">⏳ Thời gian chờ thanh toán: <strong id="qr-countdown">15:00</strong></p>
      `;

      qrGrid.appendChild(imgWrap);
      qrGrid.appendChild(infoWrap);
      box.appendChild(qrGrid);

      return box;
    }

    /**
     * Khung thanh toán Mã QR MoMo
     */
    createMoMoQrBox(finalTotal) {
      const box = document.createElement('div');
      box.className = 'qr-payment-box momo-payment-box';

      const tempOrderCode = GatewaySimulator.generateOrderCode();
      const qrDataUri = GatewaySimulator.generateMoMoQrSvg(tempOrderCode, finalTotal);

      const qrGrid = document.createElement('div');
      qrGrid.className = 'qr-grid';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'qr-image-wrap momo-qr-wrap';
      const img = document.createElement('img');
      img.src = qrDataUri;
      img.alt = 'Mã QR MoMo thanh toán đơn hàng KFC';
      imgWrap.appendChild(img);

      const infoWrap = document.createElement('div');
      infoWrap.className = 'qr-details-wrap';
      infoWrap.innerHTML = `
        <h4 class="qr-heading momo-heading">📱 Quét Mã MoMo Để Thanh Toán</h4>
        <dl class="qr-bank-details">
          <dt>Cổng thanh toán:</dt><dd><strong>Ví Điện Tử MoMo</strong></dd>
          <dt>Tên cửa hàng:</dt><dd><strong>KFC VIETNAM DEMO STORE</strong></dd>
          <dt>Số điện thoại:</dt><dd><span class="copyable">0999 888 899</span></dd>
          <dt>Số tiền:</dt><dd class="highlight-price">${this.formatCurrency(finalTotal)}</dd>
          <dt>Lời nhắn (memo):</dt><dd><span class="copyable">MOMO ${tempOrderCode}</span></dd>
        </dl>
        <p class="qr-timer">⏳ Mã thanh toán có hiệu lực trong: <strong id="momo-countdown">15:00</strong></p>
      `;

      qrGrid.appendChild(imgWrap);
      qrGrid.appendChild(infoWrap);
      box.appendChild(qrGrid);

      return box;
    }

    /**
     * Khung thanh toán Mã QR ZaloPay
     */
    createZaloPayQrBox(finalTotal) {
      const box = document.createElement('div');
      box.className = 'qr-payment-box zalopay-payment-box';

      const tempOrderCode = GatewaySimulator.generateOrderCode();
      const qrDataUri = GatewaySimulator.generateZaloPayQrSvg(tempOrderCode, finalTotal);

      const qrGrid = document.createElement('div');
      qrGrid.className = 'qr-grid';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'qr-image-wrap zalopay-qr-wrap';
      const img = document.createElement('img');
      img.src = qrDataUri;
      img.alt = 'Mã QR ZaloPay thanh toán KFC';
      imgWrap.appendChild(img);

      const infoWrap = document.createElement('div');
      infoWrap.className = 'qr-details-wrap';
      infoWrap.innerHTML = `
        <h4 class="qr-heading zalopay-heading">⚡ Quét Mã QR ZaloPay</h4>
        <dl class="qr-bank-details">
          <dt>Dịch vụ:</dt><dd><strong>ZaloPay Merchant Payment</strong></dd>
          <dt>Đơn vị nhận:</dt><dd><strong>KFC Fast Food Vietnam</strong></dd>
          <dt>Số tiền:</dt><dd class="highlight-price">${this.formatCurrency(finalTotal)}</dd>
          <dt>Mã tham chiếu:</dt><dd><span class="copyable">ZP ${tempOrderCode}</span></dd>
        </dl>
        <p class="qr-timer">⏳ Hạn quét mã: <strong id="zalopay-countdown">15:00</strong></p>
      `;

      qrGrid.appendChild(imgWrap);
      qrGrid.appendChild(infoWrap);
      box.appendChild(qrGrid);

      return box;
    }

    /**
     * Khung nhập thông tin Thẻ Debit / Credit (Mô phỏng an toàn)
     */
    createCardPaymentBox() {
      const box = document.createElement('div');
      box.className = 'card-payment-box';

      box.innerHTML = `
        <div class="card-box-header">
          <h4 class="card-heading">💳 Nhập Thông Tin Thẻ Debit / Credit</h4>
          <div class="card-logos">
            <span class="card-brand-badge brand-visa">VISA</span>
            <span class="card-brand-badge brand-master">Mastercard</span>
            <span class="card-brand-badge brand-jcb">JCB</span>
          </div>
        </div>

        <div class="card-form-grid">
          <div class="card-field-group field-span-2">
            <label class="payment-label" for="card-number">Số thẻ (16 chữ số): <span class="req">*</span></label>
            <input type="text" id="card-number" class="payment-input card-input" placeholder="4111 2222 3333 4444" maxlength="19">
          </div>

          <div class="card-field-group field-span-2">
            <label class="payment-label" for="card-holder">Tên in trên thẻ (không dấu): <span class="req">*</span></label>
            <input type="text" id="card-holder" class="payment-input card-input" placeholder="NGUYEN VAN A" style="text-transform: uppercase;">
          </div>

          <div class="card-field-group">
            <label class="payment-label" for="card-expiry">Ngày hết hạn (MM/YY): <span class="req">*</span></label>
            <input type="text" id="card-expiry" class="payment-input card-input" placeholder="12/28" maxlength="5">
          </div>

          <div class="card-field-group">
            <label class="payment-label" for="card-cvv">Mã bảo mật CVV/CVC: <span class="req">*</span></label>
            <input type="password" id="card-cvv" class="payment-input card-input" placeholder="•••" maxlength="4">
          </div>
        </div>

        <div class="card-security-note">
          🔒 <strong>Môi trường thử nghiệm Sandbox:</strong> Thông tin thẻ chỉ dùng để mô phỏng tương tác giao diện và không thực hiện trừ tiền thật.
        </div>
      `;

      // Auto-format số thẻ (cách 4 chữ số)
      const numInput = box.querySelector('#card-number');
      if (numInput) {
        numInput.addEventListener('input', (e) => {
          let val = e.target.value.replace(/\D/g, '').substring(0, 16);
          let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
          e.target.value = formatted;
        });
      }

      // Auto-format ngày hết hạn (MM/YY)
      const expInput = box.querySelector('#card-expiry');
      if (expInput) {
        expInput.addEventListener('input', (e) => {
          let val = e.target.value.replace(/\D/g, '').substring(0, 4);
          if (val.length >= 2) {
            e.target.value = val.substring(0, 2) + '/' + val.substring(2);
          } else {
            e.target.value = val;
          }
        });
      }

      return box;
    }

    /**
     * Khung hướng dẫn Tiền mặt khi nhận hàng (COD)
     */
    createCodInfoBox(finalTotal) {
      const box = document.createElement('div');
      box.className = 'cod-payment-box';

      box.innerHTML = `
        <h4 class="cod-heading">💵 Thanh Toán Tiền Mặt Khi Nhận Hàng (COD)</h4>
        <p class="cod-desc">Quý khách vui lòng chuẩn bị số tiền <strong>${this.formatCurrency(finalTotal)}</strong> để thanh toán cho tài xế giao hàng hoặc nhân viên quầy.</p>
        
        <div class="cod-change-options">
          <label class="payment-label">Bạn có cần tài xế chuẩn bị tiền thối?</label>
          <div class="change-chips-group">
            <label class="change-chip"><input type="radio" name="cod_change" value="EXACT" checked> Chuẩn bị đúng số tiền</label>
            <label class="change-chip"><input type="radio" name="cod_change" value="100K"> Thối từ 100.000 đ</label>
            <label class="change-chip"><input type="radio" name="cod_change" value="200K"> Thối từ 200.000 đ</label>
            <label class="change-chip"><input type="radio" name="cod_change" value="500K"> Thối từ 500.000 đ</label>
          </div>
        </div>
      `;

      return box;
    }

    /**
     * Xử lý gửi đơn và thanh toán
     */
    async handleProcessPayment(summary) {
      const payBtn = document.getElementById('payment-submit-btn');
      const errorBox = document.getElementById('payment-step2-error');

      // ── Kiểm tra thẻ Debit/Credit trước khi gửi ──────────────────────────
      if (this.currentPaymentMethod === 'CARD_DEMO') {
        const cardNum   = (document.getElementById('card-number')?.value || '').replace(/\s/g, '');
        const cardHolder = (document.getElementById('card-holder')?.value || '').trim();
        const cardExpiry = (document.getElementById('card-expiry')?.value || '').trim();
        const cardCvv   = (document.getElementById('card-cvv')?.value || '').trim();

        let cardError = '';
        if (!/^\d{16}$/.test(cardNum)) {
          cardError = 'Số thẻ phải gồm đúng 16 chữ số. Vui lòng kiểm tra lại.';
        } else if (cardHolder.length < 3) {
          cardError = 'Tên in trên thẻ không hợp lệ (tối thiểu 3 ký tự, không dấu).';
        } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
          cardError = 'Ngày hết hạn phải đúng định dạng MM/YY (ví dụ: 08/28).';
        } else {
          // Kiểm tra thẻ chưa hết hạn
          const [expMM, expYY] = cardExpiry.split('/').map(Number);
          const now = new Date();
          const expDate = new Date(2000 + expYY, expMM - 1, 1);
          if (expDate < new Date(now.getFullYear(), now.getMonth(), 1)) {
            cardError = 'Thẻ đã hết hạn. Vui lòng kiểm tra lại thông tin thẻ.';
          }
        }
        if (!cardError && !/^\d{3,4}$/.test(cardCvv)) {
          cardError = 'Mã bảo mật CVV/CVC phải gồm 3 hoặc 4 chữ số.';
        }

        if (cardError) {
          if (errorBox) {
            errorBox.textContent = cardError;
            errorBox.style.display = 'block';
          }
          return;
        }
        if (errorBox) errorBox.style.display = 'none';
      }
      // ─────────────────────────────────────────────────────────────────────

      if (payBtn) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="payment-spinner"></span> Đang xử lý giao dịch...';
      }

      try {
        const payload = {
          orderId: GatewaySimulator.generateOrderCode(),
          customer: this.customerInfo,
          items: this.currentCart,
          summary,
          paymentMethod: this.currentPaymentMethod,
          fulfillmentType: this.currentFulfillment
        };

        // Gửi qua simulator
        const completedOrder = await GatewaySimulator.processPayment(payload);

        // Lưu đơn hàng vào LocalStorage
        Storage.saveOrder(completedOrder, this.config.storageKey);

        this.activeOrder = completedOrder;
        this.currentStep = 3;
        this.stopQrCountdown(); // Đơn đã thanh toán, dừng đồng hồ

        // Gọi callback xóa giỏ hàng nếu có
        if (typeof this.callbacks.onClearCart === 'function') {
          this.callbacks.onClearCart();
        }

        // Gọi callback thành công
        if (typeof this.callbacks.onSuccess === 'function') {
          this.callbacks.onSuccess(completedOrder);
        }

        this.render();
      } catch (err) {
        console.error('Lỗi thanh toán:', err);
        if (errorBox) {
          errorBox.textContent = `Thanh toán thất bại: ${err.message}`;
          errorBox.style.display = 'block';
        }
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.innerHTML = `<span>Thử lại (${this.formatCurrency(summary.finalTotal)})</span>`;
        }
      }
    }

    /**
     * BƯỚC 3: Hóa đơn điện tử hoàn tất giao dịch (Receipt View)
     */
    createStep3ReceiptView() {
      const view = document.createElement('div');
      view.className = 'payment-step-content step-3';

      const order = this.activeOrder;
      if (!order) return view;

      const successHeader = document.createElement('div');
      successHeader.className = 'receipt-header';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'receipt-icon';
      iconWrap.textContent = '🎉';

      const title = document.createElement('h2');
      title.className = 'receipt-title';
      title.textContent = 'Đặt Hàng & Thanh Toán Thành Công!';

      const codeP = document.createElement('p');
      codeP.className = 'receipt-code';
      codeP.innerHTML = `Mã đơn hàng: <strong>${order.orderId}</strong> — ${order.formattedTime}`;

      successHeader.appendChild(iconWrap);
      successHeader.appendChild(title);
      successHeader.appendChild(codeP);
      view.appendChild(successHeader);

      // Cảnh báo demo
      const alertBox = document.createElement('div');
      alertBox.className = 'receipt-demo-notice';
      alertBox.innerHTML = `
        <strong>⚠️ Lưu ý về giao dịch học tập:</strong>
        <p>Đơn hàng đã được ghi nhận trong trình duyệt (LocalStorage). Đây là bản mô phỏng demo phục vụ học tập, không có nhân viên giao hàng hoặc giao dịch ngân hàng thực tế phát sinh.</p>
      `;
      view.appendChild(alertBox);

      // Bảng hóa đơn chi tiết
      const receiptCard = document.createElement('div');
      receiptCard.className = 'receipt-card';

      receiptCard.innerHTML = `
        <div class="receipt-section">
          <h4>Thông tin người nhận</h4>
          <p><strong>Khách hàng:</strong> ${this.escapeHTML(order.customer.fullName)} (${order.customer.phone})</p>
          <p><strong>Hình thức nhận:</strong> ${order.fulfillmentType === 'DELIVERY' ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng'}</p>
          ${order.fulfillmentType === 'DELIVERY' ? `<p><strong>Địa chỉ:</strong> ${this.escapeHTML(order.customer.address)}</p>` : ''}
          <p><strong>Phương thức TT:</strong> ${order.paymentMethod} (${order.status})</p>
          ${order.customer.notes ? `<p><strong>Ghi chú:</strong> ${this.escapeHTML(order.customer.notes)}</p>` : ''}
        </div>
        
        <div class="receipt-section">
          <h4>Chi tiết các món</h4>
          <ul class="receipt-items-list">
            ${order.items.map(it => `
              <li>
                <span>${it.quantity}x ${this.escapeHTML(it.name)}</span>
                <strong>${this.formatCurrency((Number(it.price) || 0) * (it.quantity || 1))}</strong>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="receipt-section receipt-summary-grid">
          <div><span>Tạm tính:</span> <strong>${this.formatCurrency(order.summary.subtotal)}</strong></div>
          <div><span>Phí vận chuyển:</span> <strong>${order.summary.shippingFee === 0 ? 'Miễn phí' : this.formatCurrency(order.summary.shippingFee)}</strong></div>
          ${order.summary.discountAmount > 0 ? `<div class="discount-text"><span>Giảm giá:</span> <strong>-${this.formatCurrency(order.summary.discountAmount)}</strong></div>` : ''}
          <div class="receipt-total"><span>Tổng thanh toán:</span> <strong>${this.formatCurrency(order.summary.finalTotal)}</strong></div>
        </div>
      `;

      view.appendChild(receiptCard);

      // Nút in hóa đơn & Đóng
      const actionRow = document.createElement('div');
      actionRow.className = 'payment-actions-row';

      const printBtn = document.createElement('button');
      printBtn.type = 'button';
      printBtn.className = 'btn btn-secondary';
      printBtn.textContent = '🖨️ In hóa đơn demo';
      printBtn.onclick = () => window.print();

      const doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'btn btn-primary';
      doneBtn.textContent = 'Hoàn tất & Về trang chủ';
      doneBtn.onclick = () => this.closeCheckout();

      actionRow.appendChild(printBtn);
      actionRow.appendChild(doneBtn);
      view.appendChild(actionRow);

      return view;
    }

    formatCurrency(amount) {
      return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
    }

    escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  // =========================================================================
  // 7. PUBLIC API XUẤT RA NGOÀI (EXPORT)
  // =========================================================================
  return {
    DEFAULT_CONFIG,
    Calculator,
    Validator,
    GatewaySimulator,
    Storage,
    
    /**
     * Khởi tạo Payment UI Controller Singleton
     * @param {Object} options
     * @returns {PaymentUIController}
     */
    init(options = {}) {
      if (!instance) {
        instance = new PaymentUIController(options);
      }
      return instance;
    },

    /**
     * Mở popup thanh toán cho giỏ hàng
     * @param {Object|Array} cartData
     */
    open(cartData) {
      if (!instance) {
        instance = new PaymentUIController();
      }
      instance.openCheckout(cartData);
    },

    /**
     * Đóng popup thanh toán
     */
    close() {
      if (instance) {
        instance.closeCheckout();
      }
    },

    /**
     * Lấy lịch sử tất cả các đơn hàng đã thanh toán
     */
    getOrderHistory() {
      return Storage.getOrders(DEFAULT_CONFIG.storageKey);
    },

    /**
     * Xóa lịch sử đơn hàng
     */
    clearOrderHistory() {
      Storage.clearOrders(DEFAULT_CONFIG.storageKey);
    }
  };
});
