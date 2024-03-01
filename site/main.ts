import { AnimatedSignature } from "src/animatedSignature";

const app = document.getElementById("app");

if (!app) throw new Error("App not exist!");

const canvas = document.createElement("canvas");
const preview = document.createElement("div");

const animatedSignature = new AnimatedSignature(
  canvas,
  {
    duration: [2000],
    gap: 1000,
    drawingMode: "parallel",
  },
  {}
);

const buttons = document.createElement("div");

function addButton(
  container = buttons,
  innerHTML: string,
  onclick: (e: MouseEvent) => void
) {
  const button = document.createElement("button");

  button.innerHTML = innerHTML;
  button.onclick = onclick;
  container.appendChild(button);
}

app.appendChild(canvas);
app.appendChild(buttons);
app.appendChild(preview);
addButton(buttons, "预览", (e) => {
  const { svg, style } = animatedSignature.generateSVGAndStyle();

  preview.innerHTML = svg.innerHTML;
  document.head.appendChild(style);
});
