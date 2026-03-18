const input = document.getElementById("input");
const output = document.getElementById("output");

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
  let result = "";

  lines.forEach(line => {
    const trimmed = line.trim();

    if (trimmed === "") {
      result += "\n";
      return;
    }

    if (
      trimmed.startsWith("---") ||
      trimmed.startsWith("#")
    ) {
      result += `${line}\n`;
      return;
    }

    if (
      trimmed.startsWith("x ") ||
      trimmed.startsWith("[x]") ||
      trimmed.startsWith("paid ")
    ) {
      result += `${line}\n`;
      return;
    }

    const matches = trimmed.match(/-?\d+(\.\d+)?/g);

    if (matches) {
      const value = parseFloat(matches[matches.length - 1]);
      total += value;
      result += `${line}  →  ${formatMoney(value)}\n`;
    } else {
      result += `${line}\n`;
    }
  });

  result += `\nTOTAL DUE: ${formatMoney(total)}`;
  output.textContent = result;
}

calculate();