const input = document.getElementById("input");
const output = document.getElementById("output");

const manualTotalEl = document.getElementById("manualTotal");
const autoTotalEl = document.getElementById("autoTotal");
const paidTotalEl = document.getElementById("paidTotal");
const grandTotalEl = document.getElementById("grandTotal");
const incomeTotalEl = document.getElementById("incomeTotal");
const netTotalEl = document.getElementById("netTotal");
const accountsBreakdownEl = document.getElementById("accountsBreakdown");

let activeFilter = localStorage.getItem("activeFilter") || "all";
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

function extractAmount(trimmed) {
  const tokens = trimmed.split(/\s+/);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const cleaned = tokens[i].replace(/[$,]/g, "");
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
      return parseFloat(cleaned);
    }
  }
  return null;
}

function extractAccount(trimmed) {
  const match = trimmed.match(/from\s+(.+)/i);
  return match ? match[1].trim() : "Unassigned";
}

function calculate() {
  const lines = input.value.split("\n");

  let total = 0;
  let manualTotal = 0;
  let autoTotal = 0;
  let paidTotal = 0;
  let incomeTotal = 0;

  let accounts = {};

  let html = "";

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const value = extractAmount(trimmed);
    if (value === null) return;

    const lower = trimmed.toLowerCase();

    // INCOME
    if (lower.startsWith("income ")) {
      incomeTotal += value;
      html += `<div class="output-line">
        <div class="output-main">
          <div class="output-left">
            <div class="output-title">💰 ${trimmed}</div>
          </div>
          <div class="output-amount">${formatMoney(value)}</div>
        </div>
      </div>`;
      return;
    }

    const account = extractAccount(trimmed);
    if (!accounts[account]) accounts[account] = 0;

    // PAID
    if (lower.startsWith("paid ")) {
      paidTotal += value;
      html += row("✅", trimmed, value);
      return;
    }

    // AUTO
    if (lower.startsWith("auto ")) {
      autoTotal += value;
      total += value;
      accounts[account] += value;
      html += row("🔁", trimmed, value);
      return;
    }

    // MANUAL
    if (lower.startsWith("manual ")) {
      manualTotal += value;
      total += value;
      accounts[account] += value;
      html += row("🖐", trimmed, value);
      return;
    }

    total += value;
    accounts[account] += value;
    html += row("•", trimmed, value);
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  grandTotalEl.textContent = formatMoney(total);
  incomeTotalEl.textContent = formatMoney(incomeTotal);
  netTotalEl.textContent = formatMoney(incomeTotal - total);

  // Accounts breakdown
  let accountHTML = "";
  Object.entries(accounts).forEach(([name, amt]) => {
    accountHTML += `<div>${name}: ${formatMoney(amt)}</div>`;
  });
  accountsBreakdownEl.innerHTML = accountHTML || "No accounts yet";

  output.innerHTML = html;
}

function row(icon, text, value) {
  return `<div class="output-line">
    <div class="output-main">
      <div class="output-left">
        <div class="output-title">${icon} ${text}</div>
      </div>
      <div class="output-amount">${formatMoney(value)}</div>
    </div>
  </div>`;
}

calculate();