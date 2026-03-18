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
      const matches = trimmed.match(/-?\d+(\.\d+)?/g);

      if (matches) {
        value = parseFloat(matches[matches.length - 1]);
        total += value;
      }
    }

    if (value !== "") {
      result += `${line}  →  ${value}\n`;
    } else {
      result += `${line}\n`;
    }
  });

  result += `\nTOTAL: ${total}`;
  output.textContent = result;
}

calculate();