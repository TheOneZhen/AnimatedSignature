import { AnimatedSignature } from "../src/animatedSignature";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const buttons = document.getElementById("buttons")!;
const preview = document.getElementById("preview")!;

const animatedSignature = new AnimatedSignature(
  canvas,
  {
    duration: [1000],
    gap: 0,
    drawingMode: "parallel",
  },
  {
    backgroundColor: "white"
  }
);

function addButton(
  innerHTML: string,
  onclick: (e: MouseEvent) => void
) {
  const button = document.createElement("button");

  button.innerHTML = innerHTML;
  button.onclick = onclick;
  buttons.appendChild(button);
}

addButton("preview", (e) => {
  const { svg, style } = animatedSignature.generateSVGAndStyle();

  preview.innerHTML = svg.outerHTML;
  document.head.appendChild(style);
});
