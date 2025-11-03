// Konfigurasi khusus command ini
export const BROKER_COLORS = {
  XL: "#00C853",
  RF: "#FF9800",
  EP: "#9C27B0",
  DR: "#F44336",
  XC: "#2196F3",
  MG: "#03A9F4",
  PD: "#795548",
  AZ: "#E91E63",
  AG: "#607D8B",
};

export const DEFAULT_BROKERS = ["MG", "PD", "AZ", "AG"];

/**
 * Hitung total net value & volume per broker
 */
export function calculateBrokerTotals(brokerChartData) {
  const valueData = brokerChartData.find(
    (item) => item.type === "TYPE_CHART_VALUE"
  );
  const volumeData = brokerChartData.find(
    (item) => item.type === "TYPE_CHART_VOLUME"
  );

  if (!valueData || !volumeData) {
    throw new Error("Data broker tidak lengkap.");
  }

  const totals = {};
  valueData.brokers.forEach((broker) => {
    totals[broker] = { value: 0, volume: 0 };
  });

  valueData.charts.forEach((chart) => {
    const broker = chart.broker_code;
    chart.chart.forEach((point) => {
      totals[broker].value += parseFloat(point.value.raw);
    });
  });

  volumeData.charts.forEach((chart) => {
    const broker = chart.broker_code;
    chart.chart.forEach((point) => {
      totals[broker].volume += parseFloat(point.value.raw);
    });
  });

  return totals;
}

/**
 * Siapkan data untuk Chart.js
 */
export function prepareChartDataForVisualization(rawData, selectedBrokers) {
  const { price_chart_data, broker_chart_data } = rawData.data;
  const valueData = broker_chart_data.find(
    (item) => item.type === "TYPE_CHART_VALUE"
  );
  if (!valueData) throw new Error("Data nilai broker tidak tersedia.");

  const times = [
    ...new Set(price_chart_data.map((p) => p.datetime_label)),
  ].sort();

  // Buat dataset per broker
  const brokerDatasets = selectedBrokers
    .map((broker) => {
      const brokerChart = valueData.charts.find(
        (c) => c.broker_code === broker
      );
      if (!brokerChart) return null;

      const values = times.map((time) => {
        const point = brokerChart.chart.find((p) => p.datetime_label === time);
        return point ? parseFloat(point.value.raw) : null;
      });

      // Skip jika semua nilai null
      if (values.every((v) => v === null)) return null;

      return {
        label: broker,
        data: values,
        borderColor: BROKER_COLORS[broker] || "#999",
        borderWidth: 2,
        tension: 0.1,
        yAxisID: "y",
      };
    })
    .filter(Boolean);

  if (brokerDatasets.length === 0) {
    throw new Error("Tidak ada data broker dalam periode ini.");
  }

  // Dataset harga
  const priceValues = times.map((time) => {
    const point = price_chart_data.find((p) => p.datetime_label === time);
    return point ? parseFloat(point.value.raw) : null;
  });

  if (priceValues.every((v) => v === null)) {
    throw new Error("Tidak ada data harga dalam periode ini.");
  }

  const priceDataset = {
    label: "Price",
    data: priceValues,
    borderColor: "#4CAF50",
    borderWidth: 2,
    borderDash: [5, 5],
    tension: 0.1,
    yAxisID: "y1",
    pointRadius: 0,
  };

  const datasets = [...brokerDatasets, priceDataset];

  // Hitung rentang nilai
  const allBrokerValues = brokerDatasets
    .flatMap((d) => d.data)
    .filter((v) => v !== null);
  const allPriceValues = priceValues.filter((v) => v !== null);

  return {
    labels: times,
    datasets,
    priceRange: {
      min: Math.min(...allPriceValues),
      max: Math.max(...allPriceValues),
    },
    valueRange: {
      min: Math.min(...allBrokerValues),
      max: Math.max(...allBrokerValues),
    },
  };
}
