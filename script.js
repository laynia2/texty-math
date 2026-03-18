const input = document.getElementById("input");
const output = document.getElementById("output");

input.value = localStorage.getItem("text") || "";

input.addEventListener("input", () => {
  localStorage.setItem("text", input.value);
  calculate();
});

function calculate() {
  const lines = input.value.split("\n");
  let total = 0;
  let result = "";

  lines.forEach(line => {
    let value = "";
    const trimmed = line.trim();

    if (trimmed !== "") {
      const match = trimmed.match(/-?\d+(\.\d+)?(?=\s*$)/);
      if (match) {
        value = parseFloat(match[0]);
        total += value;
      }
    }

    result += `${line}${value !== "" ? "  →  " + value : ""}\n`;
  });

  result += `\nTOTAL: ${total}`;
  output.textContent = result;
}

calculate();