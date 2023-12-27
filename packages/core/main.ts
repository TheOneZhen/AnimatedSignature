import { AnimatedSignature } from "./animatedSignature";
import SignaturePad from "signature_pad";

const canvas = document.createElement("canvas");
const container = document.getElementById("app")!;
const button = document.createElement("button");
const animatedSignature = new AnimatedSignature(canvas);
const div = document.createElement("div");
// const middle = new SignaturePad(canvas);

button.innerText = "click me";
button.onclick = () => {
  // div.innerHTML = middle.toSVG()

  const { svg, style } = animatedSignature.generateCode();
  // container.appendChild(svg);
  div.innerHTML = svg.outerHTML;
  document.head.appendChild(style);
};

container.appendChild(canvas);

container.appendChild(button);

container.appendChild(div);
