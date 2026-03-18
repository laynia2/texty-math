const input = document.getElementById("input");
const output = document.getElementById("output");

// load saved text
input.value = localStorage.getItem("text") || "";

// update on typing
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

    try {
      if (line.trim() !== "") {
        value = eval(line);
        if (!isNaN(value)) {
          total += value;
        }
      }
    } catch {}

    result += `${line}  →  ${value}\n`;
  });

  result += `\nTOTAL: ${total}`;
  output.textContent = result;
}

calculate();
