import { uniqueId } from "lodash-es";
import { Errors } from "./errors";
import SignaturePad, {
  Options as SignaturePadOptions,
  PointGroup,
  ToSVGOptions,
  PointGroupOptions,
} from "signature_pad";

import { Bezier } from "signature_pad/dist/types/bezier";
import { BasicPoint, Point } from "signature_pad/dist/types/point";

/** 没有校验 */
export type AnimatedSignatureOptions = {
  /**
   * animation duration
   * @unit ms
   * @default 1000
   */
  duration: number;
  /**
   * stoke number
   * @default 1
   * @min 1
   */
  strokes: number;
  /**
   * prefix of class name
   */
  classPrefix: string;
  /**
   * animation name
   * @default animatedSignature
   */
  animationName: string;
  /**
   * 背景色
   * @默认值 rgba(0,0,0,0)
   */
  backgroundColor: string;
  /**
   * drawing speed mode
   * @default "even"
   */
  drawingMode: "even" | "parallel";
  /**
   * @default 0
   * @min 0
   * @max duration
   */
  gap: number;
  /**
   * dot duration
   * @default 10
   * @min 0
   */
  dotDuration: number;
  /**
   * @default "none"
   */
  colorMode: "before" | "none" | "after";
  /** 对toSVG进行重写 */
  toSVG: typeof toSVG;
};

export type RecordComposition<T = "line" | "dot"> = T extends "dot"
  ? {
      options: PointGroupOptions;
      isDot: true;
      radius: ReturnType<Bezier["length"]>;
      data: Array<{
        circle: HTMLElement;
        point: BasicPoint;
      }>;
    }
  : {
      options: PointGroupOptions;
      isDot: false;
      data: Array<{
        curve: Bezier;
        path: HTMLElement;
        length: ReturnType<Bezier["length"]>;
      }>;
      partLength: ReturnType<Bezier["length"]>;
      partTime: AnimatedSignatureOptions["duration"];
    };

export default class AnimatedSignature extends SignaturePad {
  protected redoStack: PointGroup[] = [];

  public signaturePad: SignaturePad;
  public options: AnimatedSignatureOptions = {
    duration: 1000,
    strokes: 1,
    classPrefix: "sign-",
    animationName: "animatedSignature",
    backgroundColor: "rgba(0,0,0,0)",
    drawingMode: "even",
    gap: 0,
    dotDuration: 10,
    colorMode: "none",
    toSVG,
  };

  constructor(
    canvas: HTMLCanvasElement,
    options: AnimatedSignatureOptions,
    signaturePadOptions: SignaturePadOptions /** 所有属性都变成可选 */
  ) {
    if (canvas) throw new Error(Errors.CANVAS_NOT_EXIST);
    super(canvas, signaturePadOptions);
    /**
     * 更改SignaturePad中的clear方法
     * 原方法会默认设置画布颜色，导致`CanvasRenderingContext2D.globalCompositeOperation = "source-atop"`无效
     * 注意，此动作会导致`clear`在初始化时执行2次，请注意规避
     */
    super.clear = function () {
      const { _ctx: ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this._data = [];
      this._reset(this._getPointGroupOptions());
      this._isEmpty = true;
    };
    super.clear();

    Object.assign(this.options, options);
    this.options.strokes = Math.max(1, this.options.strokes);
    this.options.gap = Math.min(
      Math.max(0, this.options.gap),
      this.options.duration
    );
  }
  /** 开始绘制 */
  handleDraw() {
    this.signaturePad.compositeOperation = "source-over";
  }
  /** 签名上色 */
  handleColor() {
    this.signaturePad.compositeOperation = "source-atop";
  }
  /** 改变画笔颜色 */
  changePenColor(color: string) {
    this.signaturePad.penColor = color;
  }
  handleClear() {
    this.signaturePad.clear();
  }
  /** 撤销 */
  undo() {
    const data = this.signaturePad.toData();
    const middle = data.pop();
    middle && this.redoStack.push(middle);
  }
  /** 重做 */
  redo() {
    const data = this.signaturePad.toData();
    const middle = this.redoStack.pop();
    middle && data.push(middle);
  }

  generateCode(toSVGOptions: ToSVGOptions = {}) {
    const { svg, record } = this.options.toSVG.call(
      this.signaturePad,
      toSVGOptions
    );
    const style = document.createElement("style");

    style.innerHTML = this.generateCommonStyle();

    const delayEven = this.delay / result.map.size;
    let index = 0;

    for (const [sign, element] of result.map.entries()) {
      element.className += ` ${this.attrPrefix}element ${sign}`;
      element.style.animationDelay = `${delayEven * index}ms`;
      index++;
    }

    return { svg, style };
  }

  calcStyle(record: Array<RecordComposition>) {
    const {
      duration,
      strokes,
      classPrefix,
      drawingMode,
      colorMode,
      gap,
      dotDuration,
    } = this.options;

    if (drawingMode === "even") {
      const lengths = Array(strokes).fill(0);
      record.forEach(
        (item, index) =>
          (lengths[index % strokes] += item.isDot
            ? item.radius
            : item.partLength)
      );
    }
  }

  generateCommonStyle(maxDash = 10000) {
    const { animationName, classPrefix } = this.options;
    return `
      @keyframes ${animationName} {
        0% {
          stroke-dashoffset: 1px;
          stroke-dasharray: 0 ${maxDash}px;
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        to {
          stroke-dasharray: ${maxDash}px 0;
        }
      }
      .${classPrefix}element {
        stroke-dashoffset: 1px;
        stroke-dasharray: ${maxDash}px, 0;
        transform-origin: center center;
        animation-name: animatedSignature;
        animation-timing-function: cubic-bezier(0, -0.8, 0, 0);
        animation-fill-mode: both;
        animation-duration: 133.333ms;
        animation-iteration-count: 1;
      }
    `;
  }

  setAttrWithMap() {}

  generateGIF() {}
}

/**
 * 对SignaturePad.toSVG重写
 * 原方法中使用了过多private属性，扩展类中不方便重写且将源码加入扩展类会导致代码繁杂，所以在这里单独写出
 * 用户也可以对此方法进行重写
 */
function toSVG({ includeBackgroundColor = false }: ToSVGOptions = {}) {
  const pointGroups = this._data;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const minX = 0;
  const minY = 0;
  const maxX = this.canvas.width / ratio;
  const maxY = this.canvas.height / ratio;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  /** + add a DS to record the data generated in #toFromData */
  const record: RecordComposition[] = [];

  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("viewBox", `${minX} ${minY} ${maxX} ${maxY}`);
  svg.setAttribute("width", maxX.toString());
  svg.setAttribute("height", maxY.toString());

  if (includeBackgroundColor && this.backgroundColor) {
    const rect = document.createElement("rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", this.backgroundColor);

    svg.appendChild(rect);
  }
  /** 拆分signature._toFromData */
  const drawCurve = (curve: Bezier, options: PointGroupOptions) => {
    const path = document.createElement("path");
    if (
      !isNaN(curve.control1.x) &&
      !isNaN(curve.control1.y) &&
      !isNaN(curve.control2.x) &&
      !isNaN(curve.control2.y)
    ) {
      const attr =
        `M ${curve.startPoint.x.toFixed(3)},${curve.startPoint.y.toFixed(3)} ` +
        `C ${curve.control1.x.toFixed(3)},${curve.control1.y.toFixed(3)} ` +
        `${curve.control2.x.toFixed(3)},${curve.control2.y.toFixed(3)} ` +
        `${curve.endPoint.x.toFixed(3)},${curve.endPoint.y.toFixed(3)}`;
      path.setAttribute("d", attr);
      path.setAttribute("stroke-width", (curve.endWidth * 2.25).toFixed(3));
      path.setAttribute("stroke", options.penColor);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);
      /** + return the DOM */
      return path;
    }
  };

  const drawDot = (point: BasicPoint, options: PointGroupOptions) => {
    const { penColor, dotSize, minWidth, maxWidth } = options;
    const circle = document.createElement("circle");
    const size = dotSize > 0 ? dotSize : (minWidth + maxWidth) / 2;
    circle.setAttribute("r", size.toString());
    circle.setAttribute("cx", point.x.toString());
    circle.setAttribute("cy", point.y.toString());
    circle.setAttribute("fill", penColor);
    svg.appendChild(circle);
    /** + return the DOM */
    return circle;
  };

  for (const group of pointGroups) {
    const { points } = group;
    const pointGroupOptions = this._getPointGroupOptions(group);

    if (points.length > 1) {
      const data: RecordComposition<"line">["data"] = [];
      let partLength = 0;
      for (let j = 0; j < points.length; j += 1) {
        const basicPoint = points[j];
        const point = new Point(
          basicPoint.x,
          basicPoint.y,
          basicPoint.pressure,
          basicPoint.time
        );

        if (j === 0) {
          this._reset(pointGroupOptions);
        }

        const curve = this._addPoint(point, pointGroupOptions);

        if (curve) {
          const path = drawCurve(curve, pointGroupOptions);
          const length = curve.length();
          partLength += length;
          path &&
            data.push({
              path,
              curve,
              length,
            });
        }
      }
      record.push({
        options: pointGroupOptions,
        isDot: false,
        data,
        partLength,
        partTime: points[points.length - 1].time - points[0].time,
      });
    } else {
      this._reset(pointGroupOptions);
      const { dotSize, minWidth, maxWidth } = pointGroupOptions;
      record.push({
        options: pointGroupOptions,
        isDot: true,
        radius: dotSize > 0 ? dotSize : (minWidth + maxWidth) / 2,
        data: [
          {
            circle: drawDot(points[0], pointGroupOptions),
            point: points[0],
          },
        ],
      });
    }
  }

  return {
    svg,
    record,
  };
}
