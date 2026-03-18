const input = document.getElementById("input");
const output = document.getElementById("output");

const manualTotalEl = document.getElementById("manualTotal");
const autoTotalEl = document.getElementById("autoTotal");
const paidTotalEl = document.getElementById("paidTotal");
const grandTotalEl = document.getElementById("grandTotal");

input.value = localStorage.getItem("text") || "";

input.addEventListener("input", () => {
  localStorage.setItem("text", input.value);
  calculate();
});

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(n);
}

function calculate() {
  const lines = input.value.split("\n");

  let total = 0;
  let manualTotal = 0;
  let autoTotal = 0;
  let paidTotal = 0;
  let result = "";

  lines.forEach(line => {
    const trimmed = line.trim();

    if (trimmed === "") {
      result += "\n";
      return;
    }

    if (trimmed.startsWith("#") || trimmed.startsWith("---")) {
      result += `${line}\n`;
      return;
    }

    const matches = trimmed.match(/-?\d+(\.\d+)?/g);

    if (!matches) {
      result += `${line}\n`;
      return;
    }

    const value = parseFloat(matches[matches.length - 1]);
    const lower = trimmed.toLowerCase();

    if (lower.startsWith("paid ")) {
      paidTotal += value;
      result += `✅ ${line}  →  ${formatMoney(value)}\n`;
      return;
    }

    if (lower.startsWith("auto ")) {
      autoTotal += value;
      total += value;
      result += `🔁 ${line}  →  ${formatMoney(value)}\n`;
      return;
    }

    if (lower.startsWith("manual ")) {
      manualTotal += value;
      total += value;
      result += `🖐 ${line}  →  ${formatMoney(value)}\n`;
      return;
    }

    total += value;
    result += `${line}  →  ${formatMoney(value)}\n`;
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  grandTotalEl.textContent = formatMoney(total);

  output.textContent = result;
}

calculate();