/**
 * Format tanggal menjadi string YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Parse string tanggal dalam format DD-MM-YYYY menjadi objek Date
 * @param {string} str - Contoh: "10-09-2025"
 * @returns {Date | null}
 */
export function parseDDMMYYYY(str) {
  const parts = str.split("-").map(Number);
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;

  const date = new Date(yyyy, mm - 1, dd); // bulan di JS: 0-indexed

  // Validasi apakah tanggal benar-benar valid
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }

  return date;
}

/**
 * Hitung rentang tanggal berdasarkan konfigurasi
 * @param {Object} config
 * @param {string} config.type - 'days', 'mtd', 'ytd', 'custom'
 * @param {number} [config.days]
 * @param {Date} [config.from]
 * @param {Date} [config.to]
 * @returns {{
 *   from: string,
 *   to: string,
 *   label: string
 * }}
 */
export function getDateRange(config) {
  const today = new Date();

  if (config.type === "custom") {
    if (!config.from || !config.to) {
      throw new Error("Rentang kustom memerlukan 'from' dan 'to'");
    }
    return {
      from: formatDate(config.from),
      to: formatDate(config.to),
    };
  }

  if (config.type === "days") {
    const days = config.days || 1;
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    return {
      from: formatDate(start),
      to: formatDate(today),
    };
  }

  if (config.type === "mtd") {
    // Awal bulan: tanggal 1 (bukan 2!)
    const start = new Date(today.getFullYear(), today.getMonth(), 2);
    return {
      from: formatDate(start),
      to: formatDate(today),
    };
  }

  if (config.type === "ytd") {
    const start = new Date(today.getFullYear(), 0, 1); // 1 Januari
    return {
      from: formatDate(start),
      to: formatDate(today),
    };
  }

  throw new Error(`Tipe periode tidak dikenali: ${config.type}`);
}

/**
 * Format angka menjadi bentuk ringkas (K, M, B)
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (typeof num !== "number" || isNaN(num)) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toString();
}
