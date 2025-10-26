import { formatNumber } from "../../Shared/Utils/data-helpers.js";

function formatSignedNumber(num) {
  if (num === 0) return "0";
  const sign = num >= 0 ? "+" : "";
  return sign + formatNumber(Math.abs(num));
}

export function buildTextResponse(symbol, totals, rangeLabel, lastUpdated) {
  const lines = [
    `📊 <b>${symbol.toUpperCase()} – ${rangeLabel}</b>`,
    `Terakhir: ${lastUpdated}`,
    "",
    "<b>Broker | Value (Net) | Volume (Net)</b>",
    "--------|-------------|--------------",
  ];

  Object.entries(totals)
    .sort((a, b) => b[1].value - a[1].value)
    .forEach(([broker, { value, volume }]) => {
      lines.push(
        `${broker.padEnd(6)} | ${formatSignedNumber(value).padStart(
          11
        )} | ${formatSignedNumber(volume).padStart(12)}`
      );
    });

  return `<pre>${lines.join("\n")}</pre>`;
}
