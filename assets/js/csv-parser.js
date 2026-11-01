/**
 * KFC Promo Landing Page — CSV Parser Module
 * Tuân thủ quy chuẩn RFC 4180: hỗ trợ dấu phẩy trong ngoặc kép,
 * dấu ngoặc kép thoát ("") và dòng mới bên trong trường trích dẫn.
 */

/**
 * Tách chuỗi CSV thô thành mảng 2 chiều các ô (rows of cells)
 * @param {string} text - Nội dung chuỗi CSV
 * @returns {string[][]} Mảng các dòng, mỗi dòng là mảng các giá trị chuỗi
 */
function parseCSVToMatrix(text) {
  if (!text || typeof text !== 'string') return [];

  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Dấu ngoặc kép được thoát ("" -> ")
        currentCell += '"';
        i += 2;
        continue;
      } else {
        // Bật/tắt trạng thái bên trong dấu ngoặc kép
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (!insideQuotes) {
      if (char === ',') {
        // Kết thúc một ô
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r') {
        // Xử lý xuống dòng Windows \r\n
        if (nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        // Xử lý xuống dòng Unix \n
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }
    }

    // Ký tự thông thường
    currentCell += char;
    i++;
  }

  // Đẩy ô cuối cùng nếu còn
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Chuyển mảng dòng thành mảng các Object dựa trên Header
 * @param {string[][]} matrix - Ma trận các ô
 * @returns {Object[]} Mảng các bản ghi
 */
function matrixToObjects(matrix) {
  if (!matrix || matrix.length < 2) return [];

  const headers = matrix[0].map(h => h.trim().toLowerCase());
  const records = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    // Bỏ qua dòng trống
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const record = {};
    headers.forEach((header, colIndex) => {
      record[header] = colIndex < row.length ? row[colIndex] : '';
    });
    records.push(record);
  }

  return records;
}

/**
 * Fetch và parse file CSV từ đường dẫn URL
 * @param {string} url - Đường dẫn đến file CSV
 * @returns {Promise<Object[]>}
 */
async function fetchAndParseCSV(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu từ ${url} (Mã lỗi HTTP: ${response.status})`);
  }
  const text = await response.text();
  const matrix = parseCSVToMatrix(text);
  return matrixToObjects(matrix);
}

/**
 * Validate và chuẩn hóa dữ liệu Sản phẩm (products)
 * @param {Object[]} rawProducts - Dữ liệu thô từ CSV
 * @returns {Object[]} Danh sách sản phẩm hợp lệ
 */
function validateProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return [];

  const validProducts = [];

  rawProducts.forEach(item => {
    // Bỏ qua nếu thiếu id hoặc name
    if (!item.id || !item.name) return;

    // Chuẩn hóa price
    const priceNum = parseInt(item.price, 10);
    if (isNaN(priceNum) || priceNum < 0) return;

    // Chuẩn hóa boolean
    const isFeatured = String(item.featured || '').trim().toLowerCase() === 'true';
    const isAvailable = String(item.available || '').trim().toLowerCase() === 'true';

    // Chỉ giữ sản phẩm có sẵn (available = true)
    if (!isAvailable) return;

    validProducts.push({
      id: String(item.id).trim(),
      name: String(item.name).trim(),
      category: String(item.category || 'other').trim().toLowerCase(),
      description: String(item.description || '').trim(),
      price: priceNum,
      image: String(item.image || 'assets/images/chicken-bucket.svg').trim(),
      featured: isFeatured,
      available: isAvailable
    });
  });

  return validProducts;
}

/**
 * Validate và chuẩn hóa dữ liệu Khuyến mãi (promotions)
 * @param {Object[]} rawPromotions - Dữ liệu thô từ CSV
 * @returns {Object[]} Danh sách khuyến mãi hợp lệ
 */
function validatePromotions(rawPromotions) {
  if (!Array.isArray(rawPromotions)) return [];

  const validPromotions = [];

  rawPromotions.forEach(item => {
    // Bỏ qua nếu thiếu id hoặc title
    if (!item.id || !item.title) return;

    const isActive = String(item.active || '').trim().toLowerCase() === 'true';

    // Chỉ hiển thị khuyến mãi đang kích hoạt (active = true)
    if (!isActive) return;

    validPromotions.push({
      id: String(item.id).trim(),
      title: String(item.title).trim(),
      description: String(item.description || '').trim(),
      label: String(item.label || 'ƯU ĐÃI').trim().toUpperCase(),
      valid_until: String(item.valid_until || '').trim(),
      active: isActive
    });
  });

  return validPromotions;
}

// Xuất các hàm ra phạm vi toàn cục hoặc module
window.CSVParser = {
  parseCSVToMatrix,
  matrixToObjects,
  fetchAndParseCSV,
  validateProducts,
  validatePromotions
};
