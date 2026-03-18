const input = document.getElementById("input");
const output = document.getElementById("output");

const manualTotalEl = document.getElementById("manualTotal");
const autoTotalEl = document.getElementById("autoTotal");
const paidTotalEl = document.getElementById("paidTotal");
const grandTotalEl = document.getElementById("grandTotal");
const overdueTotalEl = document.getElementById("overdueTotal");
const soonTotalEl = document.getElementById("soonTotal");
const nextUpValueEl = document.getElementById("nextUpValue");

const filterButtons = document.querySelectorAll(".filter-btn");

let activeFilter = localStorage.getItem("activeFilter") || "all";
input.value = localStorage.getItem("text") || "";

input.addEventListener("input", () => {
  localStorage.setItem("text", input.value);
  calculate();
});

filterButtons.forEach(btn => {
  if (btn.dataset.filter === activeFilter) btn.classList.add("active");

  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;
    localStorage.setItem("activeFilter", activeFilter);
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    calculate();
  });
});

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(n);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  const [monthText, dayText] = dateText.split("/");
  const month = parseInt(monthText, 10);
  const day = parseInt(dayText, 10);

  if (!month || !day) return null;

  const now = new Date();
  const year = now.getFullYear();
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function daysUntil(dateObj) {
  if (!dateObj) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dateObj - today) / (1000 * 60 * 60 * 24));
}

function getType(lower) {
  if (lower.startsWith("paid ")) return "paid";
  if (lower.startsWith("auto ")) return "auto";
  if (lower.startsWith("manual ")) return "manual";
  return "other";
}

function getStatus(type, dayDiff) {
  if (type === "paid") return "paid";
  if (dayDiff !== null && dayDiff < 0) return "overdue";
  if (dayDiff !== null && dayDiff <= 3) return "soon";
  return "normal";
}

function getIcon(type, status) {
  if (status === "overdue") return "🚨";
  if (status === "soon") return "⏰";
  if (type === "paid") return "✅";
  if (type === "auto") return "🔁";
  if (type === "manual") return "🖐";
  return "•";
}

function getBadgeClass(type, status) {
  if (status === "overdue") return "badge-overdue";
  if (status === "soon") return "badge-soon";
  if (type === "paid") return "badge-paid";
  if (type === "auto") return "badge-auto";
  if (type === "manual") return "badge-manual";
  return "";
}

function getSortRank(item) {
  if (item.kind !== "bill") return 99;
  if (item.status === "overdue") return 0;
  if (item.status === "soon") return 1;
  if (item.type === "manual") return 2;
  if (item.type === "auto") return 3;
  if (item.type === "paid") return 4;
  return 5;
}

function matchesFilter(item) {
  if (item.kind !== "bill") return activeFilter === "all";

  if (activeFilter === "all") return true;
  if (activeFilter === "attention") return item.status === "overdue" || item.status === "soon";
  if (activeFilter === "manual") return item.type === "manual";
  if (activeFilter === "auto") return item.type === "auto";
  if (activeFilter === "paid") return item.type === "paid";
  return true;
}

function parseLine(line, index) {
  const trimmed = line.trim();

  if (trimmed === "") {
    return { kind: "blank", raw: line, index };
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("---")) {
    return { kind: "section", raw: line, text: trimmed.replace(/^#+\s*/, ""), index };
  }

  const value = extractAmount(trimmed);
  if (value === null) {
    return { kind: "note", raw: line, text: trimmed, index };
  }

  const lower = trimmed.toLowerCase();
  const type = getType(lower);
  const dueDateText = extractDueDate(trimmed);
  const dueDateObj = parseDueDate(dueDateText);
  const dayDiff = daysUntil(dueDateObj);
  const status = getStatus(type, dayDiff);

  let title = trimmed
    .replace(/^(manual|auto|paid)\s+/i, "")
    .replace(/\b\d{1,2}\/\d{1,2}\b/, "")
    .replace(/[$,]?\d+(\.\d+)?\s*$/, "")
    .trim();

  if (!title) title = trimmed;

  return {
    kind: "bill",
    raw: line,
    index,
    title,
    amount: value,
    type,
    dueDateText,
    dueDateObj,
    dayDiff,
    status,
    icon: getIcon(type, status)
  };
}

function updateSummary(items) {
  let manualTotal = 0;
  let autoTotal = 0;
  let paidTotal = 0;
  let total = 0;
  let overdueTotal = 0;
  let soonTotal = 0;

  items.forEach(item => {
    if (item.kind !== "bill") return;

    if (item.type === "manual") {
      manualTotal += item.amount;
      total += item.amount;
    } else if (item.type === "auto") {
      autoTotal += item.amount;
      total += item.amount;
    } else if (item.type === "paid") {
      paidTotal += item.amount;
    } else {
      total += item.amount;
    }

    if (item.status === "overdue" && item.type !== "paid") overdueTotal += item.amount;
    if (item.status === "soon" && item.type !== "paid") soonTotal += item.amount;
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  grandTotalEl.textContent = formatMoney(total);
  overdueTotalEl.textContent = formatMoney(overdueTotal);
  soonTotalEl.textContent = formatMoney(soonTotal);
}

function updateNextUp(items) {
  const unpaid = items
    .filter(item => item.kind === "bill" && item.type !== "paid")
    .filter(item => item.dueDateObj !== null)
    .sort((a, b) => a.dueDateObj - b.dueDateObj || a.amount - b.amount);

  if (!unpaid.length) {
    nextUpValueEl.textContent = "Nothing due";
    return;
  }

  const next = unpaid[0];
  let when = next.dueDateText ? `due ${next.dueDateText}` : "no due date";

  if (next.dayDiff !== null) {
    if (next.dayDiff < 0) when = `${Math.abs(next.dayDiff)} day(s) overdue`;
    else if (next.dayDiff === 0) when = "due today";
    else if (next.dayDiff === 1) when = "due tomorrow";
    else when = `due in ${next.dayDiff} days`;
  }

  nextUpValueEl.textContent = `${next.icon} ${next.title} — ${formatMoney(next.amount)} — ${when}`;
}

function renderItems(items) {
  const filtered = items.filter(matchesFilter);

  const sortable = [...filtered].sort((a, b) => {
    const rankDiff = getSortRank(a) - getSortRank(b);
    if (rankDiff !== 0) return rankDiff;

    if (a.kind === "bill" && b.kind === "bill") {
      const aDue = a.dueDateObj ? a.dueDateObj.getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDateObj ? b.dueDateObj.getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return a.index - b.index;
    }

    return a.index - b.index;
  });

  const html = sortable.map(item => {
    if (item.kind === "blank") return "";
    if (item.kind === "section") {
      return `<div class="output-section">${escapeHtml(item.text || item.raw)}</div>`;
    }
    if (item.kind === "note") {
      return `<div class="output-line"><div class="output-left">${escapeHtml(item.text)}</div></div>`;
    }

    const badgeClass = getBadgeClass(item.type, item.status);
    const typeLabel =
      item.status === "overdue" ? "Overdue" :
      item.status === "soon" ? "Due soon" :
      item.type === "paid" ? "Paid" :
      item.type === "auto" ? "Autopay" :
      item.type === "manual" ? "Manual" :
      "Bill";

    let dueLabel = "";
    if (item.dayDiff !== null) {
      if (item.dayDiff < 0) dueLabel = `${Math.abs(item.dayDiff)} day(s) overdue`;
      else if (item.dayDiff === 0) dueLabel = "Due today";
      else if (item.dayDiff === 1) dueLabel = "Due tomorrow";
      else dueLabel = `Due in ${item.dayDiff} days`;
    } else if (item.dueDateText) {
      dueLabel = `Due ${item.dueDateText}`;
    }

    const meta = [typeLabel, item.dueDateText ? `Date ${item.dueDateText}` : "", dueLabel]
      .filter(Boolean)
      .join(" • ");

    return `
      <div class="output-line">
        <div class="output-main">
          <div class="output-left">
            <div class="output-title ${badgeClass}">${item.icon} ${escapeHtml(item.title)}</div>
            <div class="output-meta">${escapeHtml(meta)}</div>
          </div>
          <div class="output-amount ${badgeClass}">${formatMoney(item.amount)}</div>
        </div>
      </div>
    `;
  }).join("");

  output.innerHTML = html || `<div class="empty-state">No matching bills in this view.</div>`;
}

function calculate() {
  const lines = input.value.split("\n");
  const items = lines.map((line, index) => parseLine(line, index));

  updateSummary(items);
  updateNextUp(items);
  renderItems(items);
}

calculate();