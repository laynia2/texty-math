const input = document.getElementById("input");
const output = document.getElementById("output");

const manualTotalEl = document.getElementById("manualTotal");
const autoTotalEl = document.getElementById("autoTotal");
const paidTotalEl = document.getElementById("paidTotal");
const grandTotalEl = document.getElementById("grandTotal");
const incomeTotalEl = document.getElementById("incomeTotal");
const netTotalEl = document.getElementById("netTotal");

const accountsBreakdownEl = document.getElementById("accountsBreakdown");

const overdueHeadlineEl = document.getElementById("overdueHeadline");
const overdueListEl = document.getElementById("overdueList");
const thisWeekHeadlineEl = document.getElementById("thisWeekHeadline");
const thisWeekListEl = document.getElementById("thisWeekList");
const nextUpValueEl = document.getElementById("nextUpValue");
const nextUpMetaEl = document.getElementById("nextUpMeta");

input.value = localStorage.getItem("text") || "";

input.addEventListener("input", () => {
  persistAndRender();
});

output.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const lineIndex = Number(button.dataset.index);

  if (Number.isNaN(lineIndex)) return;

  if (action === "toggle-checkbox") {
    toggleCheckboxStatus(lineIndex);
  }

  if (action === "mark-done") {
    markDone(lineIndex);
  }

  if (action === "reopen") {
    reopenLine(lineIndex);
  }
});

function persistAndRender() {
  localStorage.setItem("text", input.value);
  calculate();
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(n);
}

function escapeHtml(text) {
  return String(text)
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

function isPaidStatus(trimmed) {
  const lower = trimmed.toLowerCase();
  return /^\[x\]\s*/i.test(trimmed) || lower.startsWith("paid ") || lower.startsWith("done ");
}

function isUncheckedCheckbox(trimmed) {
  return /^\[\s\]\s*/i.test(trimmed);
}

function stripStatusPrefix(trimmed) {
  return trimmed
    .replace(/^\[x\]\s*/i, "")
    .replace(/^\[\s\]\s*/i, "")
    .replace(/^paid\s+/i, "")
    .replace(/^done\s+/i, "")
    .trim();
}

function getDisplayType(bodyLower) {
  if (bodyLower.startsWith("manual ")) return "manual";
  if (bodyLower.startsWith("auto ")) return "auto";
  if (bodyLower.startsWith("income ")) return "income";
  return "other";
}

function cleanTitle(body) {
  return body
    .replace(/^(manual|auto|income)\s+/i, "")
    .replace(/\b\d{1,2}\/\d{1,2}\b/, "")
    .replace(/\bfrom\s+.+$/i, "")
    .replace(/[$,]?\d+(\.\d+)?\s*$/, "")
    .trim();
}

function getStatus(itemType, paid, dayDiff) {
  if (paid) return "paid";
  if (itemType === "income") return "income";
  if (dayDiff !== null && dayDiff < 0) return "overdue";
  if (dayDiff !== null && dayDiff <= 7) return "this-week";
  return "normal";
}

function getIcon(itemType, status, paid) {
  if (paid) return "✅";
  if (status === "overdue") return "🚨";
  if (status === "this-week") return "⏰";
  if (itemType === "manual") return "🖐";
  if (itemType === "auto") return "🔁";
  if (itemType === "income") return "💰";
  return "•";
}

function getBadgeClass(itemType, status, paid) {
  if (paid) return "badge-paid";
  if (status === "overdue") return "badge-overdue";
  if (status === "this-week") return "badge-soon";
  if (itemType === "auto") return "badge-auto";
  if (itemType === "manual") return "badge-manual";
  return "";
}

function buildMeta(item) {
  const parts = [];

  if (item.paid) {
    parts.push("Paid");
  } else if (item.type === "manual") {
    parts.push("Manual");
  } else if (item.type === "auto") {
    parts.push("Autopay");
  } else if (item.type === "income") {
    parts.push("Income");
  }

  if (item.dateText) {
    parts.push(`Date ${item.dateText}`);
  }

  if (!item.paid && item.dayDiff !== null) {
    if (item.dayDiff < 0) parts.push(`${Math.abs(item.dayDiff)} day(s) overdue`);
    else if (item.dayDiff === 0) parts.push("Due today");
    else if (item.dayDiff === 1) parts.push("Due tomorrow");
    else parts.push(`Due in ${item.dayDiff} days`);
  }

  if (item.type !== "income" && item.account) {
    parts.push(item.account);
  }

  return parts.join(" • ");
}

function parseLine(line, index) {
  const trimmed = line.trim();

  if (!trimmed) {
    return { kind: "blank", raw: line, index };
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("---")) {
    return { kind: "section", raw: line, text: trimmed, index };
  }

  const amount = extractAmount(trimmed);
  if (amount === null) {
    return { kind: "note", raw: line, text: trimmed, index };
  }

  const paid = isPaidStatus(trimmed);
  const unchecked = isUncheckedCheckbox(trimmed);
  const body = stripStatusPrefix(trimmed);
  const bodyLower = body.toLowerCase();

  const type = getDisplayType(bodyLower);
  const dateText = extractDate(body);
  const dateObj = parseDate(dateText);
  const dayDiff = daysUntil(dateObj);
  const account = type === "income" ? "" : extractAccount(body);

  const title = cleanTitle(body) || body;
  const status = getStatus(type, paid, dayDiff);
  const icon = getIcon(type, status, paid);

  return {
    kind: "entry",
    raw: line,
    index,
    amount,
    paid,
    unchecked,
    body,
    type,
    dateText,
    dateObj,
    dayDiff,
    account,
    title,
    status,
    icon
  };
}

function updateSummary(items) {
  let manualTotal = 0;
  let autoTotal = 0;
  let paidTotal = 0;
  let totalDue = 0;
  let incomeTotal = 0;

  items.forEach(item => {
    if (item.kind !== "entry") return;

    if (item.type === "income") {
      incomeTotal += item.amount;
      return;
    }

    if (item.paid) {
      paidTotal += item.amount;
      return;
    }

    if (item.type === "manual") {
      manualTotal += item.amount;
      totalDue += item.amount;
      return;
    }

    if (item.type === "auto") {
      autoTotal += item.amount;
      totalDue += item.amount;
      return;
    }

    totalDue += item.amount;
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  grandTotalEl.textContent = formatMoney(totalDue);
  incomeTotalEl.textContent = formatMoney(incomeTotal);
  netTotalEl.textContent = formatMoney(incomeTotal - totalDue);
}

function updateAccounts(items) {
  const accounts = {};

  items.forEach(item => {
    if (item.kind !== "entry") return;
    if (item.type === "income") return;
    if (item.paid) return;

    const account = item.account || "Unassigned";
    if (!accounts[account]) accounts[account] = 0;
    accounts[account] += item.amount;
  });

  const entries = Object.entries(accounts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    accountsBreakdownEl.innerHTML = `<div class="muted">No unpaid accounts yet</div>`;
    return;
  }

  accountsBreakdownEl.innerHTML = entries.map(([name, amount]) => `
    <div class="account-row">
      <div>${escapeHtml(name)}</div>
      <div>${formatMoney(amount)}</div>
    </div>
  `).join("");
}

function updateCards(items) {
  const unpaidBills = items.filter(item =>
    item.kind === "entry" &&
    item.type !== "income" &&
    !item.paid
  );

  const overdue = unpaidBills
    .filter(item => item.dayDiff !== null && item.dayDiff < 0)
    .sort((a, b) => a.dateObj - b.dateObj);

  const thisWeek = unpaidBills
    .filter(item => item.dayDiff !== null && item.dayDiff >= 0 && item.dayDiff <= 7)
    .sort((a, b) => a.dateObj - b.dateObj);

  const futureDated = unpaidBills
    .filter(item => item.dayDiff !== null)
    .sort((a, b) => a.dateObj - b.dateObj);

  const nextDue = futureDated[0] || null;
  const nextFew = thisWeek.length ? thisWeek : (nextDue ? [nextDue] : []);

  if (!overdue.length) {
    overdueHeadlineEl.textContent = "Nothing overdue";
    overdueListEl.innerHTML = `<div class="muted">No overdue unpaid bills</div>`;
  } else {
    const overdueTotal = overdue.reduce((sum, item) => sum + item.amount, 0);
    overdueHeadlineEl.textContent = `${formatMoney(overdueTotal)} overdue`;
    overdueListEl.innerHTML = overdue.slice(0, 5).map(item => `
      <div class="mini-row">
        <div>${escapeHtml(item.title)}</div>
        <div>${formatMoney(item.amount)}</div>
      </div>
    `).join("");
  }

  if (!thisWeek.length) {
    thisWeekHeadlineEl.textContent = "Nothing due this week";
  } else {
    const weekTotal = thisWeek.reduce((sum, item) => sum + item.amount, 0);
    thisWeekHeadlineEl.textContent = `${formatMoney(weekTotal)} due in 7 days`;
  }

  if (!nextFew.length) {
    thisWeekListEl.innerHTML = `<div class="muted">No upcoming dated bills</div>`;
  } else {
    thisWeekListEl.innerHTML = nextFew.map(item => {
      const dueText = item.dayDiff === 0
        ? "today"
        : item.dayDiff === 1
          ? "tomorrow"
          : item.dayDiff < 0
            ? `${Math.abs(item.dayDiff)} day(s) overdue`
            : `in ${item.dayDiff} days`;

      return `
        <div class="mini-row">
          <div>${escapeHtml(item.title)} <span class="muted">(${dueText})</span></div>
          <div>${formatMoney(item.amount)}</div>
        </div>
      `;
    }).join("");
  }

  if (!nextDue) {
    nextUpValueEl.textContent = "Nothing due";
    nextUpMetaEl.innerHTML = `<div class="muted">No unpaid bills with dates</div>`;
  } else {
    let duePhrase = `due ${nextDue.dateText}`;
    if (nextDue.dayDiff === 0) duePhrase = "due today";
    else if (nextDue.dayDiff === 1) duePhrase = "due tomorrow";
    else if (nextDue.dayDiff < 0) duePhrase = `${Math.abs(nextDue.dayDiff)} day(s) overdue`;
    else duePhrase = `due in ${nextDue.dayDiff} days`;

    nextUpValueEl.textContent = `${nextDue.title} — ${formatMoney(nextDue.amount)}`;
    nextUpMetaEl.innerHTML = `
      <div class="mini-row">
        <div>${escapeHtml(duePhrase)}</div>
        <div>${escapeHtml(nextDue.account || "Unassigned")}</div>
      </div>
    `;
  }
}

function renderItems(items) {
  const html = items.map(item => {
    if (item.kind === "blank") return "";

    if (item.kind === "section") {
      return `<div class="output-line section-line">${escapeHtml(item.text)}</div>`;
    }

    if (item.kind === "note") {
      return `<div class="output-line note-line">${escapeHtml(item.text)}</div>`;
    }

    const badgeClass = getBadgeClass(item.type, item.status, item.paid);
    const meta = buildMeta(item);
    const checkSymbol = item.paid ? "[x]" : "[ ]";
    const checkClass = item.paid ? "line-check paid" : "line-check";

    const actionButton = item.paid
      ? `<button class="action-btn" data-action="reopen" data-index="${item.index}">Reopen</button>`
      : `<button class="action-btn primary" data-action="mark-done" data-index="${item.index}">Mark done</button>`;

    return `
      <div class="output-line">
        <div class="output-title-row">
          <button class="${checkClass}" data-action="toggle-checkbox" data-index="${item.index}">${checkSymbol}</button>
          <div class="output-left">
            <div class="output-title ${badgeClass}">${item.icon} ${escapeHtml(item.title)}</div>
            <div class="output-meta">${escapeHtml(meta)}</div>
          </div>
        </div>

        <div class="output-main">
          <div></div>
          <div class="output-amount ${badgeClass}">${formatMoney(item.amount)}</div>
        </div>

        ${item.type !== "income" ? `<div class="output-actions">${actionButton}</div>` : ""}
      </div>
    `;
  }).join("");

  output.innerHTML = html || `<div class="empty-state">Nothing here yet.</div>`;
}

function updateLineByIndex(lineIndex, transformFn) {
  const lines = input.value.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return;

  lines[lineIndex] = transformFn(lines[lineIndex]);
  input.value = lines.join("\n");
  persistAndRender();
}

function toggleCheckboxStatus(lineIndex) {
  updateLineByIndex(lineIndex, (line) => {
    const trimmed = line.trim();

    if (!trimmed) return line;

    if (/^\[x\]\s*/i.test(trimmed)) {
      return line.replace(/^\s*\[x\]\s*/i, "[ ] ");
    }

    if (/^\[\s\]\s*/i.test(trimmed)) {
      return line.replace(/^\s*\[\s\]\s*/i, "[x] ");
    }

    if (/^\s*paid\s+/i.test(line) || /^\s*done\s+/i.test(line)) {
      return line.replace(/^\s*(paid|done)\s+/i, "[ ] ");
    }

    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}[x] ${trimmed}`;
  });
}

function markDone(lineIndex) {
  updateLineByIndex(lineIndex, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    let body = trimmed
      .replace(/^\[x\]\s*/i, "")
      .replace(/^\[\s\]\s*/i, "")
      .replace(/^paid\s+/i, "")
      .replace(/^done\s+/i, "")
      .trim();

    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}done ${body}`;
  });
}

function reopenLine(lineIndex) {
  updateLineByIndex(lineIndex, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    let body = trimmed
      .replace(/^\[x\]\s*/i, "")
      .replace(/^\[\s\]\s*/i, "")
      .replace(/^paid\s+/i, "")
      .replace(/^done\s+/i, "")
      .trim();

    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}[ ] ${body}`;
  });
}

function calculate() {
  const lines = input.value.split("\n");
  const items = lines.map((line, index) => parseLine(line, index));

  updateSummary(items);
  updateAccounts(items);
  updateCards(items);
  renderItems(items);
}

calculate();