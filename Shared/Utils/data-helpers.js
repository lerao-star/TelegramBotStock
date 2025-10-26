/**
 * Format tanggal menjadi string YYYY-MM-DD
 */
export function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Hitung rentang tanggal berdasarkan konfigurasi
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
    const start = new Date(today.getFullYear(), today.getMonth(), 1); // perbaiki ke tanggal 1
    return {
      from: formatDate(start),
      to: formatDate(today),
    };
  }

  if (config.type === "ytd") {
    const start = new Date(today.getFullYear(), 0, 1);
    return {
      from: formatDate(start),
      to: formatDate(today),
    };
  }

  throw new Error(`Tipe periode tidak dikenali: ${config.type}`);
}

/**
 * Format angka menjadi bentuk ringkas (K, M, B)
 */
export function formatNumber(num) {
  if (typeof num !== "number" || isNaN(num)) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toString();
}
