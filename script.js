const input = document.getElementById("input");
const output = document.getElementById("output");

const manualTotalEl = document.getElementById("manualTotal");
const autoTotalEl = document.getElementById("autoTotal");
const paidTotalEl = document.getElementById("paidTotal");
const skippedTotalEl = document.getElementById("skippedTotal");
const grandTotalEl = document.getElementById("grandTotal");
const incomeTotalEl = document.getElementById("incomeTotal");
const netTotalEl = document.getElementById("netTotal");
const overdueTotalEl = document.getElementById("overdueTotal");

const overdueHeadlineEl = document.getElementById("overdueHeadline");
const overdueListEl = document.getElementById("overdueList");
const thisWeekHeadlineEl = document.getElementById("thisWeekHeadline");
const thisWeekListEl = document.getElementById("thisWeekList");
const nextUpValueEl = document.getElementById("nextUpValue");
const nextUpMetaEl = document.getElementById("nextUpMeta");

const accountsHeadlineEl = document.getElementById("accountsHeadline");
const accountsBreakdownEl = document.getElementById("accountsBreakdown");
const paycheckHeadlineEl = document.getElementById("paycheckHeadline");
const paycheckListEl = document.getElementById("paycheckList");

const qaStatus = document.getElementById("qaStatus");
const qaType = document.getElementById("qaType");
const qaDate = document.getElementById("qaDate");
const qaTitle = document.getElementById("qaTitle");
const qaAmount = document.getElementById("qaAmount");
const qaAccount = document.getElementById("qaAccount");
const addLineBtn = document.getElementById("addLineBtn");
const addBalanceBtn = document.getElementById("addBalanceBtn");
const addMonthlyBtn = document.getElementById("addMonthlyBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");

const filterButtons = document.querySelectorAll(".filter-btn");

let activeFilter = localStorage.getItem("activeFilter") || "all";
input.value = localStorage.getItem("text") || "";

input.addEventListener("input", persistAndRender);

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

addLineBtn.addEventListener("click", addQuickLine);
addBalanceBtn.addEventListener("click", addQuickBalance);
addMonthlyBtn.addEventListener("click", addQuickMonthly);
exportBtn.addEventListener("click", exportText);
importFile.addEventListener("change", importText);

output.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const lineIndex = Number(button.dataset.index);
  if (Number.isNaN(lineIndex)) return;

  if (action === "toggle-checkbox") toggleCheckboxStatus(lineIndex);
  if (action === "mark-done") markDone(lineIndex);
  if (action === "reopen") reopenLine(lineIndex);
  if (action === "skip") skipLine(lineIndex);
  if (action === "unskip") unskipLine(lineIndex);
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

  const year = new Date().getFullYear();
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);

  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function formatMonthDay(dateObj) {
  if (!dateObj) return "";
  return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
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

function isSkippedStatus(trimmed) {
  return /^skip\s+/i.test(trimmed);
}

function stripStatusPrefix(trimmed) {
  return trimmed
    .replace(/^\[x\]\s*/i, "")
    .replace(/^\[\s\]\s*/i, "")
    .replace(/^paid\s+/i, "")
    .replace(/^done\s+/i, "")
    .replace(/^skip\s+/i, "")
    .trim();
}

function getDisplayType(bodyLower) {
  if (bodyLower.startsWith("manual ")) return "manual";
  if (bodyLower.startsWith("auto ")) return "auto";
  if (bodyLower.startsWith("income ")) return "income";
  if (bodyLower.startsWith("balance ")) return "balance";
  if (bodyLower.startsWith("monthly ")) return "template";
  return "other";
}

function cleanTitle(body) {
  return body
    .replace(/^monthly\s+/i, "")
    .replace(/^(manual|auto|income|balance)\s+/i, "")
    .replace(/\b\d{1,2}\/\d{1,2}\b/, "")
    .replace(/\bfrom\s+.+$/i, "")
    .replace(/[$,]?\-?\d+(\.\d+)?\s*$/, "")
    .trim();
}

function parseBalanceLine(body, amount) {
  const withoutPrefix = body.replace(/^balance\s+/i, "").trim();
  const account = withoutPrefix.replace(/[$,]?\-?\d+(\.\d+)?\s*$/, "").trim() || "Unnamed";
  return { account, amount };
}

function parseMonthlyTemplate(body, index) {
  const rest = body.replace(/^monthly\s+/i, "").trim();
  const tokens = rest.split(/\s+/);
  if (tokens.length < 3) return null;

  const type = tokens[0].toLowerCase();
  const day = parseInt(tokens[1], 10);
  if (!["manual", "auto", "income"].includes(type) || Number.isNaN(day)) return null;

  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const currentMonthDate = new Date(year, month, day);
  if (currentMonthDate.getMonth() !== month) return null;

  const dateText = `${month + 1}/${day}`;
  const generatedBody = `${type} ${dateText} ${rest.substring(tokens[0].length + tokens[1].length + 2)}`.trim();
  const amount = extractAmount(generatedBody);
  if (amount === null) return null;

  const paid = false;
  const skipped = false;
  const account = type === "income" ? "" : extractAccount(generatedBody);
  const dateObj = parseDate(dateText);
  const dayDiff = daysUntil(dateObj);
  const title = cleanTitle(generatedBody);
  const status = getStatus(type, paid, skipped, dayDiff);

  return {
    kind: "entry",
    raw: body,
    index,
    sourceIndex: index,
    generated: true,
    template: true,
    amount,
    paid,
    skipped,
    unchecked: true,
    body: generatedBody,
    type,
    dateText,
    dateObj,
    dayDiff,
    account,
    title,
    status,
    icon: getIcon(type, status, paid, skipped)
  };
}

function getStatus(itemType, paid, skipped, dayDiff) {
  if (skipped) return "skipped";
  if (paid) return "paid";
  if (itemType === "income") return "income";
  if (dayDiff !== null && dayDiff < 0) return "overdue";
  if (dayDiff !== null && dayDiff <= 7) return "this-week";
  return "normal";
}

function getIcon(itemType, status, paid, skipped) {
  if (skipped) return "⏭️";
  if (paid) return "✅";
  if (status === "overdue") return "🚨";
  if (status === "this-week") return "⏰";
  if (itemType === "manual") return "🖐";
  if (itemType === "auto") return "🔁";
  if (itemType === "income") return "💰";
  if (itemType === "balance") return "🏦";
  if (itemType === "template") return "🗓️";
  return "•";
}

function getBadgeClass(itemType, status, paid, skipped) {
  if (skipped) return "badge-skipped";
  if (paid) return "badge-paid";
  if (status === "overdue") return "badge-overdue";
  if (status === "this-week") return "badge-soon";
  if (itemType === "auto") return "badge-auto";
  if (itemType === "manual") return "badge-manual";
  if (itemType === "income") return "badge-income";
  return "";
}

function buildMeta(item) {
  const parts = [];

  if (item.generated) parts.push("Generated from monthly template");
  if (item.skipped) parts.push("Skipped");
  else if (item.paid) parts.push("Paid");
  else if (item.type === "manual") parts.push("Manual");
  else if (item.type === "auto") parts.push("Autopay");
  else if (item.type === "income") parts.push("Income");

  if (item.dateText) parts.push(`Date ${item.dateText}`);

  if (!item.paid && !item.skipped && item.dayDiff !== null && item.type !== "income") {
    if (item.dayDiff < 0) parts.push(`${Math.abs(item.dayDiff)} day(s) overdue`);
    else if (item.dayDiff === 0) parts.push("Due today");
    else if (item.dayDiff === 1) parts.push("Due tomorrow");
    else parts.push(`Due in ${item.dayDiff} days`);
  }

  if (item.type !== "income" && item.account) parts.push(item.account);

  return parts.join(" • ");
}

function parseLine(line, index) {
  const trimmed = line.trim();

  if (!trimmed) return { kind: "blank", raw: line, index };
  if (trimmed.startsWith("#") || trimmed.startsWith("---")) {
    return { kind: "section", raw: line, text: trimmed, index };
  }

  const amount = extractAmount(trimmed);
  const paid = isPaidStatus(trimmed);
  const unchecked = isUncheckedCheckbox(trimmed);
  const skipped = isSkippedStatus(trimmed);
  const body = stripStatusPrefix(trimmed);
  const bodyLower = body.toLowerCase();
  const topType = getDisplayType(bodyLower);

  if (topType === "template") {
    const entry = parseMonthlyTemplate(body, index);
    return entry || { kind: "note", raw: line, text: trimmed, index };
  }

  if (amount === null) return { kind: "note", raw: line, text: trimmed, index };

  if (topType === "balance") {
    const parsed = parseBalanceLine(body, amount);
    return {
      kind: "balance",
      raw: line,
      index,
      title: parsed.account,
      account: parsed.account,
      amount: parsed.amount,
      icon: "🏦"
    };
  }

  const type = topType;
  const dateText = extractDate(body);
  const dateObj = parseDate(dateText);
  const dayDiff = daysUntil(dateObj);
  const account = type === "income" ? "" : extractAccount(body);
  const title = cleanTitle(body) || body;
  const status = getStatus(type, paid, skipped, dayDiff);

  return {
    kind: "entry",
    raw: line,
    index,
    sourceIndex: index,
    generated: false,
    template: false,
    amount,
    paid,
    skipped,
    unchecked,
    body,
    type,
    dateText,
    dateObj,
    dayDiff,
    account,
    title,
    status,
    icon: getIcon(type, status, paid, skipped)
  };
}

function sortEntries(entries) {
  const rank = (item) => {
    if (item.type === "income") return 5;
    if (item.skipped) return 6;
    if (item.paid) return 7;
    if (item.status === "overdue") return 0;
    if (item.dayDiff === 0) return 1;
    if (item.status === "this-week") return 2;
    if (item.dateObj) return 3;
    return 4;
  };

  return [...entries].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;

    const aDate = a.dateObj ? a.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.dateObj ? b.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
    if (aDate !== bDate) return aDate - bDate;

    return a.index - b.index;
  });
}

function matchesFilter(item) {
  if (item.kind !== "entry") return activeFilter === "all";

  if (activeFilter === "all") return true;
  if (activeFilter === "attention") return item.status === "overdue" || item.status === "this-week";
  if (activeFilter === "overdue") return item.status === "overdue";
  if (activeFilter === "this-week") return item.status === "this-week";
  if (activeFilter === "manual") return item.type === "manual";
  if (activeFilter === "auto") return item.type === "auto";
  if (activeFilter === "income") return item.type === "income";
  if (activeFilter === "paid") return item.paid;
  if (activeFilter === "skipped") return item.skipped;
  if (activeFilter === "checking") return (item.account || "").toLowerCase().includes("checking");

  return true;
}

function updateSummary(items) {
  let manualTotal = 0;
  let autoTotal = 0;
  let paidTotal = 0;
  let skippedTotal = 0;
  let totalDue = 0;
  let incomeTotal = 0;
  let overdueTotal = 0;

  items.forEach(item => {
    if (item.kind !== "entry") return;

    if (item.type === "income") {
      incomeTotal += item.amount;
      return;
    }

    if (item.skipped) {
      skippedTotal += item.amount;
      return;
    }

    if (item.paid) {
      paidTotal += item.amount;
      return;
    }

    if (item.type === "manual") manualTotal += item.amount;
    if (item.type === "auto") autoTotal += item.amount;

    totalDue += item.amount;
    if (item.status === "overdue") overdueTotal += item.amount;
  });

  manualTotalEl.textContent = formatMoney(manualTotal);
  autoTotalEl.textContent = formatMoney(autoTotal);
  paidTotalEl.textContent = formatMoney(paidTotal);
  skippedTotalEl.textContent = formatMoney(skippedTotal);
  grandTotalEl.textContent = formatMoney(totalDue);
  incomeTotalEl.textContent = formatMoney(incomeTotal);
  netTotalEl.textContent = formatMoney(incomeTotal - totalDue);
  overdueTotalEl.textContent = formatMoney(overdueTotal);
}

function updateAccounts(items, balances) {
  const projected = {};
  const balanceKeys = Object.keys(balances);

  balanceKeys.forEach(key => {
    projected[key] = { start: balances[key], due: 0, end: balances[key] };
  });

  items.forEach(item => {
    if (item.kind !== "entry") return;
    if (item.type === "income") return;
    if (item.paid || item.skipped) return;

    const account = item.account || "Unassigned";
    if (!projected[account]) projected[account] = { start: 0, due: 0, end: 0 };
    projected[account].due += item.amount;
    projected[account].end = projected[account].start - projected[account].due;
  });

  const entries = Object.entries(projected).sort((a, b) => a[1].end - b[1].end);

  if (!entries.length) {
    accountsHeadlineEl.textContent = "No balances yet";
    accountsBreakdownEl.innerHTML = `<div class="muted">Add lines like: balance Checking 2500</div>`;
    return;
  }

  const negatives = entries.filter(([, data]) => data.end < 0).length;
  accountsHeadlineEl.textContent = negatives
    ? `${negatives} account(s) projected negative`
    : `All tracked accounts stay non-negative`;

  accountsBreakdownEl.innerHTML = entries.map(([name, data]) => {
    const className = data.end < 0 ? "danger-text" : (data.end < data.start ? "warning-text" : "good-text");
    return `
      <div class="account-row">
        <div>
          <div>${escapeHtml(name)}</div>
          <div class="muted">Start ${formatMoney(data.start)} • Due ${formatMoney(data.due)}</div>
        </div>
        <div class="${className}">${formatMoney(data.end)}</div>
      </div>
    `;
  }).join("");
}

function updateCards(items) {
  const unpaidBills = sortEntries(items.filter(item =>
    item.kind === "entry" &&
    item.type !== "income" &&
    !item.paid &&
    !item.skipped
  ));

  const overdue = unpaidBills.filter(item => item.status === "overdue");
  const thisWeek = unpaidBills.filter(item => item.dayDiff !== null && item.dayDiff >= 0 && item.dayDiff <= 7);
  const futureDated = unpaidBills.filter(item => item.dateObj);
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

function updatePaycheckPlan(items) {
  const incomes = sortEntries(items.filter(item =>
    item.kind === "entry" &&
    item.type === "income" &&
    item.dateObj
  ));

  const unpaidBills = sortEntries(items.filter(item =>
    item.kind === "entry" &&
    item.type !== "income" &&
    !item.paid &&
    !item.skipped &&
    item.dateObj
  ));

  if (!incomes.length) {
    paycheckHeadlineEl.textContent = "No paycheck plan yet";
    paycheckListEl.innerHTML = `<div class="muted">Add dated income lines to see paycheck coverage</div>`;
    return;
  }

  const plans = incomes.map((income, i) => {
    const nextIncome = incomes[i + 1] || null;
    const coveredBills = unpaidBills.filter(bill => {
      if (bill.dateObj < income.dateObj) return false;
      if (!nextIncome) return true;
      return bill.dateObj < nextIncome.dateObj;
    });

    const totalCovered = coveredBills.reduce((sum, bill) => sum + bill.amount, 0);
    const remainder = income.amount - totalCovered;

    return {
      income,
      totalCovered,
      remainder,
      coveredBills
    };
  });

  const firstPlan = plans[0];
  paycheckHeadlineEl.textContent = `${formatMoney(firstPlan.income.amount)} paycheck covers ${formatMoney(firstPlan.totalCovered)}`;

  paycheckListEl.innerHTML = plans.slice(0, 4).map(plan => {
    const cls = plan.remainder < 0 ? "danger-text" : (plan.remainder < plan.income.amount * 0.15 ? "warning-text" : "good-text");
    const billNames = plan.coveredBills.slice(0, 3).map(b => b.title).join(", ");
    return `
      <div class="account-row">
        <div>
          <div>${escapeHtml(plan.income.title || "Paycheck")} <span class="muted">(${plan.income.dateText})</span></div>
          <div class="muted">${billNames || "No dated bills before next paycheck"}</div>
        </div>
        <div class="${cls}">${formatMoney(plan.remainder)}</div>
      </div>
    `;
  }).join("");
}

function renderItems(items) {
  const filtered = items.filter(item => {
    if (item.kind === "balance") return activeFilter === "all";
    if (item.kind === "section" || item.kind === "note" || item.kind === "blank") return activeFilter === "all";
    return matchesFilter(item);
  });

  const entries = sortEntries(filtered.filter(item => item.kind === "entry"));
  const others = filtered.filter(item => item.kind !== "entry");
  const merged = [
    ...others.filter(i => i.kind === "section"),
    ...others.filter(i => i.kind === "note"),
    ...others.filter(i => i.kind === "balance"),
    ...entries
  ];

  const html = merged.map(item => {
    if (item.kind === "blank") return "";
    if (item.kind === "section") {
      return `<div class="output-line section-line">${escapeHtml(item.text)}</div>`;
    }
    if (item.kind === "note") {
      return `<div class="output-line note-line">${escapeHtml(item.text)}</div>`;
    }
    if (item.kind === "balance") {
      return `
        <div class="output-line">
          <div class="output-title">🏦 ${escapeHtml(item.account)}</div>
          <div class="output-meta">Account balance</div>
          <div class="output-main">
            <div></div>
            <div class="output-amount">${formatMoney(item.amount)}</div>
          </div>
        </div>
      `;
    }

    const badgeClass = getBadgeClass(item.type, item.status, item.paid, item.skipped);
    const meta = buildMeta(item);

    let checkSymbol = "[ ]";
    let checkClass = "line-check";
    if (item.paid) {
      checkSymbol = "[x]";
      checkClass = "line-check paid";
    } else if (item.skipped) {
      checkSymbol = "skip";
      checkClass = "line-check skipped";
    }

    let actionButtons = "";
    if (item.type !== "income" && !item.generated) {
      if (item.skipped) {
        actionButtons = `<button class="action-btn" data-action="unskip" data-index="${item.sourceIndex}">Unskip</button>`;
      } else if (item.paid) {
        actionButtons = `<button class="action-btn" data-action="reopen" data-index="${item.sourceIndex}">Reopen</button>`;
      } else {
        actionButtons = `
          <button class="action-btn primary" data-action="mark-done" data-index="${item.sourceIndex}">Mark done</button>
          <button class="action-btn" data-action="skip" data-index="${item.sourceIndex}">Skip</button>
        `;
      }
    }

    const canToggle = item.type !== "income" && !item.generated;
    const checkButton = canToggle
      ? `<button class="${checkClass}" data-action="toggle-checkbox" data-index="${item.sourceIndex}">${checkSymbol}</button>`
      : `<button class="${checkClass}" disabled>${checkSymbol}</button>`;

    return `
      <div class="output-line">
        <div class="output-title-row">
          ${checkButton}
          <div class="output-left">
            <div class="output-title ${badgeClass}">${item.icon} ${escapeHtml(item.title)}</div>
            <div class="output-meta">${escapeHtml(meta)}</div>
          </div>
        </div>

        <div class="output-main">
          <div></div>
          <div class="output-amount ${badgeClass}">${formatMoney(item.amount)}</div>
        </div>

        ${actionButtons ? `<div class="output-actions">${actionButtons}</div>` : ""}
      </div>
    `;
  }).join("");

  output.innerHTML = html || `<div class="empty-state">No matching lines in this view.</div>`;
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

    if (/^\s*skip\s+/i.test(line)) {
      return line.replace(/^\s*skip\s+/i, "[ ] ");
    }

    if (/^\s*\[x\]\s*/i.test(line)) {
      return line.replace(/^\s*\[x\]\s*/i, "[ ] ");
    }

    if (/^\s*\[\s\]\s*/i.test(line)) {
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

    const body = stripStatusPrefix(trimmed);
    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}done ${body}`;
  });
}

function reopenLine(lineIndex) {
  updateLineByIndex(lineIndex, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    const body = stripStatusPrefix(trimmed);
    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}[ ] ${body}`;
  });
}

function skipLine(lineIndex) {
  updateLineByIndex(lineIndex, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    const body = stripStatusPrefix(trimmed);
    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}skip ${body}`;
  });
}

function unskipLine(lineIndex) {
  updateLineByIndex(lineIndex, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    const body = stripStatusPrefix(trimmed);
    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    return `${leadingSpaces}[ ] ${body}`;
  });
}

function appendLine(text) {
  const current = input.value.trimEnd();
  input.value = current ? `${current}\n${text}` : text;
  persistAndRender();
}

function addQuickLine() {
  const status = qaStatus.value;
  const type = qaType.value;
  const date = qaDate.value.trim();
  const title = qaTitle.value.trim();
  const amount = qaAmount.value.trim();
  const account = qaAccount.value.trim();

  if (!title || !amount) return;

  let parts = [];
  if (status) parts.push(status);
  parts.push(type);
  if (date) parts.push(date);
  parts.push(title);
  parts.push(amount);

  if (type !== "income" && account) {
    parts.push("from");
    parts.push(account);
  }

  appendLine(parts.join(" "));
}

function addQuickBalance() {
  const account = qaAccount.value.trim() || qaTitle.value.trim();
  const amount = qaAmount.value.trim();
  if (!account || !amount) return;

  appendLine(`balance ${account} ${amount}`);
}

function addQuickMonthly() {
  const type = qaType.value;
  const date = qaDate.value.trim();
  const title = qaTitle.value.trim();
  const amount = qaAmount.value.trim();
  const account = qaAccount.value.trim();

  if (!date || !title || !amount) return;

  const day = date.includes("/") ? date.split("/")[1] : date;
  let line = `monthly ${type} ${day} ${title} ${amount}`;
  if (type !== "income" && account) line += ` from ${account}`;

  appendLine(line);
}

function exportText() {
  const blob = new Blob([input.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "texty-math-export.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importText(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    input.value = String(reader.result || "");
    persistAndRender();
    importFile.value = "";
  };
  reader.readAsText(file);
}

function calculate() {
  const rawLines = input.value.split("\n");
  let items = rawLines.map((line, index) => parseLine(line, index));

  const balances = {};
  items.forEach(item => {
    if (item.kind === "balance") balances[item.account] = item.amount;
  });

  const nonTemplate = items.filter(item => item.kind !== "entry" || !item.template);
  const templateEntries = items.filter(item => item.kind === "entry" && item.template);

  const existingBodies = new Set(
    nonTemplate
      .filter(item => item.kind === "entry")
      .map(item => item.body.toLowerCase())
  );

  const templateToAdd = templateEntries.filter(item => !existingBodies.has(item.body.toLowerCase()));
  items = [...nonTemplate, ...templateToAdd];

  updateSummary(items);
  updateCards(items);
  updateAccounts(items, balances);
  updatePaycheckPlan(items);
  renderItems(items);
}

calculate();