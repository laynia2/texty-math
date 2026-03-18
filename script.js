const input = document.getElementById("input");
const output = document.getElementById("output");

const manualTotalEl = document.getElementById("manualTotal");
const autoTotalEl = document.getElementById("autoTotal");
const paidTotalEl = document.getElementById("paidTotal");
const grandTotalEl = document.getElementById("grandTotal");
const incomeTotalEl = document.getElementById("incomeTotal");
const netTotalEl = document.getElementById("netTotal");
const accountsBreakdownEl = document.getElementById("accountsBreakdown");
const nextUpValueEl = document.getElementById("nextUpValue");

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

function extractDate(trimmed) {
  const match = trimmed.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  return match ? match[0] : "";
}

function parseDate(dateText) {
  if (!dateText) return null;

  const [monthText, dayText] = dateText.split("/");
  const month = parseInt(monthText, 10);
  const day = parseInt(dayText, 10);

  if (!month || !day) return null;

  const now = new Date();
  const year = now.getFullYear();
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);

  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function daysUntil(dateObj) {
  if (!dateObj) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dateObj - today) / (1000 * 60 * 60 * 24));
}

function extractAccount(trimmed) {
  const match = trimmed.match(/\bfrom\s+(.+)$/i);
  return match ? match[1].trim() : "Unassigned";
}

function cleanTitle(trimmed) {
  return trimmed
    .replace(/^(manual|auto|paid|income)\s+/i, "")
    .replace(/\b\d{1,2}\/\d{1,2}\b/, "")
    .replace(/\bfrom\s+.+$/i, "")
    .replace(/[$,]?\d+(\.\d+)?\s*$/, "")
    .trim();
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

function calculate() {
  const lines = input.value.split("\n");

  let total = 0;
  let manualTotal = 0;
  let autoTotal = 0;
  let paidTotal = 0;
  let incomeTotal = 0;

  let accounts = {};
  let unpaidBills = [];
  let html = "";

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();

    if (trimmed.startsWith("#") || trimmed.startsWith("---")) {
      html += `<div class="output-line"><div class="output-title">${trimmed}</div></div>`;
      return;
    }

    const value = extractAmount(trimmed);
    if (value === null) {
      html += `<div class="output-line"><div class="output-title">${trimmed}</div></div>`;
      return;
    }

    if (lower.startsWith("income ")) {
      incomeTotal += value;
      html += row("💰", trimmed, value);
      return;
    }

    const account = extractAccount(trimmed);
    if (!accounts[account]) accounts[account] = 0;

    const dateText = extractDate(trimmed);
    const dateObj = parseDate(dateText);
    const dayDiff = daysUntil(dateObj);

    if (lower.startsWith("paid ")) {
      paidTotal += value;
      html += row("✅", trimmed, value);
      return;
    }

    if (lower.startsWith("auto ")) {
      autoTotal += value;
      total += value;
      accounts[account] += value;
      unpaidBills.push({
        title: cleanTitle(trimmed),
        amount: value,
        dateText,
        dateObj,
        dayDiff,
        type: "auto"
      });
      html += row("🔁", trimmed, value);
      return;
    }

    if (lower.startsWith("manual ")) {
      manualTotal += value;
      total += value;
      accounts[account] += value;
      unpaidBills.push({
        title: cleanTitle(trimmed),
        amount: value,
        dateText,
        dateObj,
        dayDiff,
        type: "manual"
      });
      html += row("🖐", trimmed, value);
      return;
    }

    total += value;
    accounts[account] += value;
    unpaidBills.push({
      title: cleanTitle(trimmed),
      amount: value,
      dateText,
      dateObj,
      dayDiff,
      type: "other"
    });
    html += row("•", trimmed, value);
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  grandTotalEl.textContent = formatMoney(total);
  incomeTotalEl.textContent = formatMoney(incomeTotal);
  netTotalEl.textContent = formatMoney(incomeTotal - total);

  let accountHTML = "";
  Object.entries(accounts).forEach(([name, amt]) => {
    accountHTML += `<div>${name}: ${formatMoney(amt)}</div>`;
  });
  accountsBreakdownEl.innerHTML = accountHTML || "No accounts yet";

  const datedBills = unpaidBills
    .filter(bill => bill.dateObj)
    .sort((a, b) => a.dateObj - b.dateObj);

  if (nextUpValueEl) {
    if (datedBills.length === 0) {
      nextUpValueEl.textContent = "Nothing due";
    } else {
      const next = datedBills[0];
      let when = `due ${next.dateText}`;

      if (next.dayDiff !== null) {
        if (next.dayDiff < 0) when = `${Math.abs(next.dayDiff)} day(s) overdue`;
        else if (next.dayDiff === 0) when = "due today";
        else if (next.dayDiff === 1) when = "due tomorrow";
        else when = `due in ${next.dayDiff} days`;
      }

      nextUpValueEl.textContent = `${next.title} — ${formatMoney(next.amount)} — ${when}`;
    }
  }

  output.innerHTML = html;
}

calculate();