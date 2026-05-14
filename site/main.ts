import { AnimatedSignature } from "../src/animatedSignature";
import type { PointGroup } from "signature_pad";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const status = document.getElementById("status")!;
const preview = document.getElementById("preview")!;
const clearButton = document.getElementById("clear") as HTMLButtonElement;
const undoButton = document.getElementById("undo") as HTMLButtonElement;
const redoButton = document.getElementById("redo") as HTMLButtonElement;
const previewButton = document.getElementById("preview-button") as HTMLButtonElement;
const savePngButton = document.getElementById("save-png") as HTMLButtonElement;
const saveJpgButton = document.getElementById("save-jpg") as HTMLButtonElement;
const saveSvgButton = document.getElementById("save-svg") as HTMLButtonElement;
const saveSvgWithBackgroundButton = document.getElementById(
  "save-svg-bg"
) as HTMLButtonElement;
const penColorInput = document.getElementById("pen-color") as HTMLInputElement;
const penWidthInput = document.getElementById("pen-width") as HTMLInputElement;
const backgroundColorInput = document.getElementById(
  "background-color"
) as HTMLInputElement;

const animatedSignature = new AnimatedSignature(
  canvas,
  {
    duration: [1000],
    gap: 0,
    drawingMode: "parallel",
  },
  {
    backgroundColor: backgroundColorInput.value,
    maxWidth: Number(penWidthInput.value),
    minWidth: Number(penWidthInput.value) / 3,
    penColor: penColorInput.value
  }
);

const redoStack: PointGroup[] = [];

(window as any).animatedSignature = animatedSignature;

function setStatus(message: string) {
  status.textContent = message;
}

function redraw(pointGroups: PointGroup[] = [...animatedSignature.toData()]) {
  if (pointGroups.length) {
    animatedSignature.fromData(pointGroups);
  } else {
    animatedSignature.clear();
  }
}

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const pointGroups = [...animatedSignature.toData()];

  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  animatedSignature._ctx.scale(ratio, ratio);
  redraw(pointGroups);
}

function updatePenWidth() {
  const width = Number(penWidthInput.value);

  animatedSignature.maxWidth = width;
  animatedSignature.minWidth = Math.max(0.5, width / 3);
}

function renderPreview(includeBackgroundColor = false) {
  const svg = animatedSignature.generateSVGAndStyle({
    includeBackgroundColor
  });

  preview.replaceChildren(svg);
  setStatus("Preview updated");
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");

  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function downloadSvg(includeBackgroundColor: boolean) {
  const svg = animatedSignature.generateSVGAndStyle({
    includeBackgroundColor
  });
  const source = svg.outerHTML;
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  downloadDataUrl(
    url,
    includeBackgroundColor
      ? "animated-signature-background.svg"
      : "animated-signature.svg"
  );
  URL.revokeObjectURL(url);
}

function clearPreview() {
  preview.replaceChildren();
}

clearButton.addEventListener("click", () => {
  animatedSignature.clear();
  redoStack.splice(0);
  clearPreview();
  setStatus("Cleared");
});

undoButton.addEventListener("click", () => {
  const pointGroups = [...animatedSignature.toData()];
  const removedGroup = pointGroups.pop();

  if (!removedGroup) {
    setStatus("Nothing to undo");
    return;
  }

  redoStack.push(removedGroup);
  redraw(pointGroups);
  clearPreview();
  setStatus("Undone");
});

redoButton.addEventListener("click", () => {
  const restoredGroup = redoStack.pop();

  if (!restoredGroup) {
    setStatus("Nothing to redo");
    return;
  }

  redraw([...animatedSignature.toData(), restoredGroup]);
  clearPreview();
  setStatus("Redone");
});

previewButton.addEventListener("click", () => {
  renderPreview();
});

savePngButton.addEventListener("click", () => {
  downloadDataUrl(animatedSignature.toDataURL("image/png"), "signature.png");
  setStatus("PNG saved");
});

saveJpgButton.addEventListener("click", () => {
  downloadDataUrl(animatedSignature.toDataURL("image/jpeg"), "signature.jpg");
  setStatus("JPG saved");
});

saveSvgButton.addEventListener("click", () => {
  downloadSvg(false);
  setStatus("SVG saved");
});

saveSvgWithBackgroundButton.addEventListener("click", () => {
  downloadSvg(true);
  setStatus("SVG with background saved");
});

penColorInput.addEventListener("input", () => {
  animatedSignature.changePenColor(penColorInput.value);
  setStatus("Pen color changed");
});

penWidthInput.addEventListener("input", () => {
  updatePenWidth();
  setStatus("Pen width changed");
});

backgroundColorInput.addEventListener("input", () => {
  animatedSignature.backgroundColor = backgroundColorInput.value;
  redraw();
  clearPreview();
  setStatus("Background changed");
});

animatedSignature.addEventListener("beginStroke", () => {
  setStatus("Drawing");
});

animatedSignature.addEventListener("endStroke", () => {
  redoStack.splice(0);
  clearPreview();
  setStatus("Ready");
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();