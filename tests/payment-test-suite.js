/**
 * KFC Promo Landing Page — Test Suite Nghiêm Ngặt cho Module Thanh Toán
 * Bộ kiểm thử tự động toàn diện kiểm tra mọi khía cạnh: tính toán, xác thực,
 * voucher, mô phỏng thanh toán, lưu trữ localStorage và bảo mật chống XSS.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../assets/js/payment-module.js'));
  } else {
    root.PaymentTestSuite = factory(root.PaymentModule);
  }
})(typeof self !== 'undefined' ? self : this, function (PaymentModule) {
  'use strict';

  const { Calculator, Validator, GatewaySimulator, Storage, DEFAULT_CONFIG } = PaymentModule;

  class TestRunner {
    constructor() {
      this.results = [];
      this.currentSuite = '';
    }

    suite(name, fn) {
      this.currentSuite = name;
      fn();
    }

    test(name, fn) {
      const testItem = {
        suite: this.currentSuite,
        name,
        passed: false,
        error: null,
        duration: 0
      };

      const start = performance.now();
      try {
        fn();
        testItem.passed = true;
      } catch (err) {
        testItem.passed = false;
        testItem.error = err.message || String(err);
      } finally {
        testItem.duration = (performance.now() - start).toFixed(2);
        this.results.push(testItem);
      }
    }

    async testAsync(name, fn) {
      const testItem = {
        suite: this.currentSuite,
        name,
        passed: false,
        error: null,
        duration: 0
      };

      const start = performance.now();
      try {
        await fn();
        testItem.passed = true;
      } catch (err) {
        testItem.passed = false;
        testItem.error = err.message || String(err);
      } finally {
        testItem.duration = (performance.now() - start).toFixed(2);
        this.results.push(testItem);
      }
    }

    assert(condition, message = 'Assertion failed') {
      if (!condition) {
        throw new Error(message);
      }
    }

    assertEqual(actual, expected, message) {
      if (actual !== expected) {
        throw new Error(`${message || 'Equal assertion failed'} — Kỳ vọng: ${expected}, Thực tế: ${actual}`);
      }
    }

    assertDeepEqual(actual, expected, message) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`${message || 'Deep equal assertion failed'} — Kỳ vọng: ${b}, Thực tế: ${a}`);
      }
    }
  }

  /**
   * Chạy toàn bộ các Test Case của Module Thanh Toán
   * @returns {Promise<{ summary: Object, results: Array }>}
   */
  async function runAllTests() {
    const runner = new TestRunner();

    // =======================================================================
    // SUITE 1: Cấu hình mặc định & Khởi tạo (Config & Initialization)
    // =======================================================================
    runner.suite('1. Cấu hình & Khởi tạo', () => {
      runner.test('TC01: Kiểm tra cấu hình chuẩn phí vận chuyển và ngưỡng freeship', () => {
        runner.assertEqual(DEFAULT_CONFIG.standardShippingFee, 20000, 'Phí ship chuẩn phải là 20.000 đ');
        runner.assertEqual(DEFAULT_CONFIG.freeShippingThreshold, 150000, 'Ngưỡng miễn phí ship phải là 150.000 đ');
        runner.assert(DEFAULT_CONFIG.bankInfo.accountNumber.length > 0, 'Thông tin ngân hàng phải có STK');
      });

      runner.test('TC02: Kiểm tra các voucher mặc định có đầy đủ', () => {
        runner.assert(!!DEFAULT_CONFIG.vouchers['FREESHIP'], 'Phải có mã FREESHIP');
        runner.assert(!!DEFAULT_CONFIG.vouchers['GIAMGIA20'], 'Phải có mã GIAMGIA20');
        runner.assert(!!DEFAULT_CONFIG.vouchers['DEMO10K'], 'Phải có mã DEMO10K');
      });
    });

    // =======================================================================
    // SUITE 2: Tính toán tài chính đơn hàng (Calculator Engine)
    // =======================================================================
    runner.suite('2. Tính toán tài chính (Calculator Engine)', () => {
      runner.test('TC03: Tính Tạm tính (Subtotal) chính xác với nhiều món', () => {
        const mockCart = [
          { id: 'P001', name: 'Gà rán', price: 45000, quantity: 2 }, // 90.000
          { id: 'P004', name: 'Khoai tây', price: 25000, quantity: 1 } // 25.000
        ];
        const subtotal = Calculator.calculateSubtotal(mockCart);
        runner.assertEqual(subtotal, 115000, 'Tổng tạm tính phải là 115.000 đ');
      });

      runner.test('TC04: Tính Tạm tính = 0 khi giỏ hàng rỗng hoặc null', () => {
        runner.assertEqual(Calculator.calculateSubtotal([]), 0, 'Giỏ rỗng phải bằng 0');
        runner.assertEqual(Calculator.calculateSubtotal(null), 0, 'Giỏ null phải bằng 0');
      });

      runner.test('TC05: Phí ship 20.000 đ khi đơn hàng dưới 150.000 đ (DELIVERY)', () => {
        const fee = Calculator.calculateShippingFee(100000, 'DELIVERY');
        runner.assertEqual(fee, 20000, 'Đơn 100k giao tận nơi phải có phí ship 20k');
      });

      runner.test('TC06: Miễn phí ship (0 đ) khi đơn hàng từ 150.000 đ trở lên (DELIVERY)', () => {
        const fee1 = Calculator.calculateShippingFee(150000, 'DELIVERY');
        runner.assertEqual(fee1, 0, 'Đơn 150k giao tận nơi phải freeship');

        const fee2 = Calculator.calculateShippingFee(250000, 'DELIVERY');
        runner.assertEqual(fee2, 0, 'Đơn 250k giao tận nơi phải freeship');
      });

      runner.test('TC07: Miễn phí ship (0 đ) khi chọn Nhận tại cửa hàng (PICKUP)', () => {
        const fee = Calculator.calculateShippingFee(50000, 'PICKUP');
        runner.assertEqual(fee, 0, 'Nhận tại cửa hàng không tính phí vận chuyển');
      });

      runner.test('TC08: Áp dụng mã FREESHIP xóa bỏ phí giao hàng', () => {
        const mockCart = [{ id: 'P001', price: 50000, quantity: 1 }];
        const summary = Calculator.computeOrderSummary(mockCart, 'DELIVERY', 'FREESHIP');
        runner.assertEqual(summary.shippingFee, 0, 'Phí ship sau mã FREESHIP phải là 0 đ');
        runner.assertEqual(summary.finalTotal, 50000, 'Tổng thanh toán phải là 50.000 đ');
      });

      runner.test('TC09: Áp dụng mã GIAMGIA20 giảm 20% và áp trần maxDiscount', () => {
        // Đơn 100k -> giảm 20% = 20k
        const cart1 = [{ id: 'P001', price: 100000, quantity: 1 }];
        const summary1 = Calculator.computeOrderSummary(cart1, 'PICKUP', 'GIAMGIA20');
        runner.assertEqual(summary1.discountAmount, 20000, 'Giảm 20% của 100k phải là 20k');
        runner.assertEqual(summary1.finalTotal, 80000, 'Tổng còn 80k');

        // Đơn 400k -> 20% = 80k nhưng max trần là 50k
        const cart2 = [{ id: 'P001', price: 200000, quantity: 2 }];
        const summary2 = Calculator.computeOrderSummary(cart2, 'PICKUP', 'GIAMGIA20');
        runner.assertEqual(summary2.discountAmount, 50000, 'Giảm tối đa phải bị chặn ở 50.000 đ');
      });

      runner.test('TC10: Áp dụng mã DEMO10K giảm đúng 10.000 đ', () => {
        const cart = [{ id: 'P001', price: 80000, quantity: 1 }];
        const summary = Calculator.computeOrderSummary(cart, 'PICKUP', 'DEMO10K');
        runner.assertEqual(summary.discountAmount, 10000, 'Phải giảm đúng 10.000 đ');
        runner.assertEqual(summary.finalTotal, 70000, 'Tổng thanh toán còn 70.000 đ');
      });

      runner.test('TC11: Từ chối voucher khi chưa đạt giá trị đơn tối thiểu (minOrder)', () => {
        // GIAMGIA20 yêu cầu min 80k, truyền giỏ 40k
        const cart = [{ id: 'P001', price: 40000, quantity: 1 }];
        const summary = Calculator.computeOrderSummary(cart, 'PICKUP', 'GIAMGIA20');
        runner.assert(!!summary.voucherError, 'Phải báo lỗi do không đủ minOrder');
        runner.assertEqual(summary.discountAmount, 0, 'Không được giảm giá');
      });

      runner.test('TC12: Báo lỗi khi nhập mã voucher không tồn tại', () => {
        const cart = [{ id: 'P001', price: 100000, quantity: 1 }];
        const summary = Calculator.computeOrderSummary(cart, 'PICKUP', 'MA_KHONG_TON_TAI');
        runner.assert(!!summary.voucherError, 'Phải báo lỗi mã không hợp lệ');
        runner.assertEqual(summary.discountAmount, 0, 'Không được giảm giá');
      });

      runner.test('TC13: Tổng thanh toán finalTotal không bao giờ bị số âm', () => {
        const cart = [{ id: 'P001', price: 5000, quantity: 1 }];
        // Giả lập voucher giảm lớn hơn giá
        const customVoucher = { code: 'BIG', type: 'FIXED_AMOUNT', value: 50000, minOrder: 0 };
        const discountRes = Calculator.calculateDiscount(customVoucher, 5000, 0);
        runner.assert(discountRes.discountAmount <= 5000, 'Giảm giá không được vượt quá subtotal');
      });
    });

    // =======================================================================
    // SUITE 3: Xác thực thông tin khách hàng (Customer Validator)
    // =======================================================================
    runner.suite('3. Xác thực thông tin khách hàng (Validator)', () => {
      runner.test('TC14: Chấp nhận các đầu số điện thoại Việt Nam hợp lệ (03, 05, 07, 08, 09)', () => {
        const validPhones = ['0901234567', '0389998888', '0771234567', '0581112222', '0868889999'];
        validPhones.forEach(p => {
          runner.assert(Validator.isValidVietnamesePhone(p), `Số điện thoại ${p} phải được công nhận hợp lệ`);
        });
      });

      runner.test('TC15: Từ chối số điện thoại có độ dài sai (ít hơn hoặc nhiều hơn 10 số)', () => {
        const invalidLengths = ['090123456', '09012345678', '12345'];
        invalidLengths.forEach(p => {
          runner.assert(!Validator.isValidVietnamesePhone(p), `Số ${p} sai độ dài phải bị từ chối`);
        });
      });

      runner.test('TC16: Từ chối số điện thoại chứa ký tự chữ hoặc ký hiệu lạ', () => {
        const invalidChars = ['09012abc78', '09012345@#', 'phone12345'];
        invalidChars.forEach(p => {
          runner.assert(!Validator.isValidVietnamesePhone(p), `Số ${p} chứa chữ phải bị từ chối`);
        });
      });

      runner.test('TC17: Từ chối họ tên rỗng hoặc dưới 2 ký tự', () => {
        const res1 = Validator.validateCustomer({ fullName: '', phone: '0987654321', address: '123 Đào Duy Anh' });
        runner.assert(!res1.isValid && !!res1.errors.fullName, 'Họ tên rỗng phải bị từ chối');

        const res2 = Validator.validateCustomer({ fullName: 'A', phone: '0987654321', address: '123 Đào Duy Anh' });
        runner.assert(!res2.isValid && !!res2.errors.fullName, 'Họ tên 1 chữ cái phải bị từ chối');
      });

      runner.test('TC18: Bắt buộc địa chỉ khi chọn hình thức Giao hàng tận nơi (DELIVERY)', () => {
        const res = Validator.validateCustomer(
          { fullName: 'Nguyễn Văn An', phone: '0987654321', address: '' },
          'DELIVERY'
        );
        runner.assert(!res.isValid, 'Thiếu địa chỉ khi Giao hàng phải báo lỗi');
        runner.assert(!!res.errors.address, 'Phải có lỗi ở trường address');
      });

      runner.test('TC19: Cho phép bỏ trống địa chỉ khi chọn Nhận tại cửa hàng (PICKUP)', () => {
        const res = Validator.validateCustomer(
          { fullName: 'Nguyễn Văn An', phone: '0987654321', address: '' },
          'PICKUP'
        );
        runner.assert(res.isValid, 'Chọn nhận tại quán không bắt buộc nhập địa chỉ nhà');
      });

      runner.test('TC20: Kiểm tra định dạng Email hợp lệ hoặc cho phép bỏ trống', () => {
        runner.assert(Validator.isValidEmail(''), 'Email rỗng được chấp nhận (tùy chọn)');
        runner.assert(Validator.isValidEmail('an.nguyen@gmail.com'), 'Email hợp lệ phải được chấp nhận');
        runner.assert(!Validator.isValidEmail('sai-dinh-dang-email'), 'Email sai format phải bị từ chối');
      });
    });

    // =======================================================================
    // SUITE 4: Kiểm tra tính hợp lệ của giỏ hàng (Cart Validation)
    // =======================================================================
    runner.suite('4. Kiểm tra giỏ hàng (Cart Validation)', () => {
      runner.test('TC21: Báo lỗi khi giỏ hàng rỗng', () => {
        const res = Validator.validateCartItems([]);
        runner.assert(!res.isValid, 'Giỏ rỗng phải không hợp lệ');
      });

      runner.test('TC22: Báo lỗi khi món có số lượng <= 0 hoặc không phải số', () => {
        const res = Validator.validateCartItems([
          { id: 'P001', name: 'Gà rán', price: 45000, quantity: 0 }
        ]);
        runner.assert(!res.isValid, 'Số lượng 0 phải bị chặn');
      });

      runner.test('TC23: Báo lỗi khi món có đơn giá âm', () => {
        const res = Validator.validateCartItems([
          { id: 'P001', name: 'Gà rán', price: -10000, quantity: 1 }
        ]);
        runner.assert(!res.isValid, 'Đơn giá âm phải bị chặn');
      });

      runner.test('TC24: Chấp nhận giỏ hàng hợp lệ', () => {
        const res = Validator.validateCartItems([
          { id: 'P001', name: 'Gà rán giòn cay', price: 45000, quantity: 2 },
          { id: 'P004', name: 'Khoai tây chiên', price: 25000, quantity: 1 }
        ]);
        runner.assert(res.isValid, 'Giỏ hàng đầy đủ phải hợp lệ');
      });
    });

    // =======================================================================
    // SUITE 5: Mô phỏng cổng thanh toán (Gateway Simulator)
    // =======================================================================
    runner.suite('5. Mô phỏng cổng thanh toán (Gateway Simulator)', () => {
      runner.test('TC25: Sinh mã đơn hàng chuẩn định dạng KFC-ORD-XXXXXX', () => {
        const code = GatewaySimulator.generateOrderCode();
        runner.assert(/^KFC-ORD-\d{6}$/.test(code), `Mã đơn ${code} phải khớp định dạng KFC-ORD-XXXXXX`);
      });

      runner.test('TC26: Sinh đường dẫn VietQR chứa đúng mã ngân hàng, STK và số tiền', () => {
        const url = GatewaySimulator.generateVietQrUrl(DEFAULT_CONFIG.bankInfo, 150000, 'KFC-ORD-123456');
        runner.assert(url.includes('MB-99998888KFC-compact.png'), 'URL phải chứa mã ngân hàng và STK');
        runner.assert(url.includes('amount=150000'), 'URL phải chứa tham số số tiền đúng');
      });

      runner.test('TC27: Sinh mã SVG QR fallback khi cần hiển thị offline', () => {
        const svg = GatewaySimulator.generateFallbackQrSvg('KFC-ORD-123456');
        runner.assert(svg.startsWith('data:image/svg+xml'), 'Phải sinh ra Data URI SVG');
        runner.assert(svg.includes('KFC PAY'), 'Phải chứa nhãn KFC PAY');
      });

      await runner.testAsync('TC28: Xử lý thanh toán phương thức COD chuyển trạng thái COD_CONFIRMED', async () => {
        const payload = {
          orderId: 'KFC-ORD-888888',
          customer: { fullName: 'Trần Văn B', phone: '0901234567' },
          items: [{ id: 'P001', price: 45000, quantity: 1 }],
          summary: { subtotal: 45000, shippingFee: 20000, finalTotal: 65000 },
          paymentMethod: 'COD',
          fulfillmentType: 'DELIVERY'
        };

        const result = await GatewaySimulator.processPayment(payload);
        runner.assertEqual(result.status, 'COD_CONFIRMED', 'Trạng thái phải là COD_CONFIRMED');
        runner.assertEqual(result.paymentMethod, 'COD', 'Phương thức phải là COD');
      });

      await runner.testAsync('TC29: Xử lý thanh toán BANK_TRANSFER chuyển trạng thái PAID', async () => {
        const payload = {
          orderId: 'KFC-ORD-999999',
          customer: { fullName: 'Lê Thị C', phone: '0912345678' },
          items: [{ id: 'P002', price: 89000, quantity: 1 }],
          summary: { subtotal: 89000, shippingFee: 0, finalTotal: 89000 },
          paymentMethod: 'BANK_TRANSFER',
          fulfillmentType: 'PICKUP'
        };

        const result = await GatewaySimulator.processPayment(payload);
        runner.assertEqual(result.status, 'PAID', 'Trạng thái chuyển khoản phải là PAID');
      });
    });

    // =======================================================================
    // SUITE 6: Lưu trữ và Lịch sử đơn hàng (Storage)
    // =======================================================================
    runner.suite('6. Lưu trữ và Lịch sử (Storage)', () => {
      const TEST_STORAGE_KEY = 'kfc_test_orders_temp';

      runner.test('TC30: Lưu thành công đơn hàng vào LocalStorage và đọc lại', () => {
        Storage.clearOrders(TEST_STORAGE_KEY);
        const mockOrder = { orderId: 'KFC-ORD-TEST01', total: 100000 };
        const saved = Storage.saveOrder(mockOrder, TEST_STORAGE_KEY);
        runner.assert(saved, 'Lưu đơn hàng phải trả về true');

        const orders = Storage.getOrders(TEST_STORAGE_KEY);
        runner.assertEqual(orders.length, 1, 'Danh sách phải có 1 đơn hàng');
        runner.assertEqual(orders[0].orderId, 'KFC-ORD-TEST01', 'Mã đơn đọc lại phải đúng');

        Storage.clearOrders(TEST_STORAGE_KEY);
      });

      runner.test('TC31: Xóa lịch sử làm sạch LocalStorage', () => {
        Storage.saveOrder({ orderId: 'TEST' }, TEST_STORAGE_KEY);
        Storage.clearOrders(TEST_STORAGE_KEY);
        const orders = Storage.getOrders(TEST_STORAGE_KEY);
        runner.assertEqual(orders.length, 0, 'Sau khi xóa danh sách phải rỗng');
      });
    });

    // =======================================================================
    // SUITE 7: Bảo mật và Chống XSS (Security)
    // =======================================================================
    runner.suite('7. Bảo mật & Chống XSS (Security)', () => {
      runner.test('TC32: Thoát ký tự đặc biệt XSS trong họ tên và ghi chú đơn hàng', () => {
        const ctrl = PaymentModule.init();
        const malicious = '<script>alert("XSS")</script>&"\'';
        const escaped = ctrl.escapeHTML(malicious);
        runner.assert(!escaped.includes('<script>'), 'Không được để nguyên thẻ script');
        runner.assert(escaped.includes('&lt;script&gt;'), 'Phải chuyển đổi thành mã thực thể an toàn');
      });
    });

    // TỔNG KẾT KẾT QUẢ
    const total = runner.results.length;
    const passed = runner.results.filter(r => r.passed).length;
    const failed = total - passed;

    return {
      summary: {
        total,
        passed,
        failed,
        successRate: ((passed / total) * 100).toFixed(1) + '%'
      },
      results: runner.results
    };
  }

  return {
    runAllTests
  };
});
