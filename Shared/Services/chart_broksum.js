import axios from "axios";
import dotenv from "dotenv";

// Muat variabel lingkungan (jika belum dimuat di file utama)
dotenv.config();

const API_BASE = "https://exodus.stockbit.com/order-trade/running-trade/chart";

/**
 * Ambil data chart broker dari Stockbit
 */
export async function fetchBrokerChartData(symbol, brokerCodes, from, to) {
  // Ambil bearer token dari environment
  const bearerToken = process.env.STOCKBIT_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error(
      "STOCKBIT_BEARER tidak ditemukan di environment variables."
    );
  }

  const params = new URLSearchParams();
  brokerCodes.forEach((code) => params.append("broker_code", code));
  params.append("from", from);
  params.append("to", to);

  const url = `${API_BASE}/${symbol}?${params.toString()}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: `Bearer ${bearerToken}`,
        // Tambahkan header lain jika diperlukan (misal: Accept, Content-Type)
      },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Saham '${symbol}' tidak ditemukan.`);
    }
    if (error.response?.status === 401) {
      throw new Error(
        "Akses ditolak: Bearer token tidak valid atau kadaluarsa."
      );
    }
    throw new Error(`Gagal mengambil data: ${error.message}`);
  }
}
