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

function extractDueDate(trimmed) {
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    if (/^\d{1,2}\/\d{1,2}$/.test(token)) {
      return token;
    }
  }
  return "";
}

function parseDueDate(dateText) {
  if (!dateText) return null;

  const parts = dateText.split("/");
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);

  if (!month || !day) return null;

  const now = new Date();
  const year = now.getFullYear();
  const date = new Date(year, month - 1, day);

  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function getStatus(trimmed, dueDateText) {
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("paid ")) {
    return { icon: "✅", label: "paid" };
  }

  if (!dueDateText) {
    if (lower.startsWith("auto ")) return { icon: "🔁", label: "autopay" };
    if (lower.startsWith("manual ")) return { icon: "🖐", label: "manual" };
    return { icon: "", label: "normal" };
  }

  const dueDate = parseDueDate(dueDateText);

  if (!dueDate) {
    if (lower.startsWith("auto ")) return { icon: "🔁", label: "autopay" };
    if (lower.startsWith("manual ")) return { icon: "🖐", label: "manual" };
    return { icon: "", label: "normal" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = dueDate - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { icon: "🚨", label: "overdue" };
  if (diffDays <= 3) return { icon: "⏰", label: "soon" };

  if (lower.startsWith("auto ")) return { icon: "🔁", label: "autopay" };
  if (lower.startsWith("manual ")) return { icon: "🖐", label: "manual" };
  return { icon: "", label: "normal" };
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

    const value = extractAmount(trimmed);

    if (value === null) {
      result += `${line}\n`;
      return;
    }

    const lower = trimmed.toLowerCase();
    const dueDateText = extractDueDate(trimmed);
    const dueText = dueDateText ? ` [due ${dueDateText}]` : "";
    const status = getStatus(trimmed, dueDateText);

    if (lower.startsWith("paid ")) {
      paidTotal += value;
      result += `${status.icon} ${line}  →  ${formatMoney(value)}${dueText}\n`;
      return;
    }

    if (lower.startsWith("auto ")) {
      autoTotal += value;
      total += value;
      result += `${status.icon} ${line}  →  ${formatMoney(value)}${dueText}\n`;
      return;
    }

    if (lower.startsWith("manual ")) {
      manualTotal += value;
      total += value;
      result += `${status.icon} ${line}  →  ${formatMoney(value)}${dueText}\n`;
      return;
    }

    total += value;
    result += `${status.icon} ${line}  →  ${formatMoney(value)}${dueText}\n`;
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  grandTotalEl.textContent = formatMoney(total);

  output.textContent = result;
}

calculate();