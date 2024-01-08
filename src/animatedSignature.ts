import { Errors } from "./errors";
import SignaturePad, {
  Options as SignaturePadOptions,
  PointGroup,
  ToSVGOptions,
  PointGroupOpti  ons,
} from "signature_pad";


import { Bezier } from "signature_pad/src/bezier";
import { BasicPoint, Point } from "signature_pad/src/point";

export type AnimatedSignatureOptions = {
  /**
   * 每条连线完全显示需要的时间
   * each strokes display the time required
   * @unit ms
   * @default [10000]
   */
  duration: number[];
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
      data: {
        circle: HTMLElement;
        point: BasicPoint;
      };
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
      partTime: number;
    };

export default class AnimatedSignature extends SignaturePad {
  protected redoStack: PointGroup[] = [];

  private _options: AnimatedSignatureOptions;
  public get options() {
    return this._options;
  }

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      [Prop in keyof AnimatedSignatureOptions]?: AnimatedSignatureOptions[Prop];
    },
    signaturePadOptions: SignaturePadOptions /** 所有属性都变成可选 */
  ) {
    if (!canvas) throw new Error(Errors.CANVAS_NOT_EXIST);
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

    let _duration: AnimatedSignatureOptions["duration"] = [1000];
    let _drawingMode: AnimatedSignatureOptions["drawingMode"] = "even";
    let _gap: AnimatedSignatureOptions["gap"] = 0;
    let _dotDuration: AnimatedSignatureOptions["dotDuration"] = 10;
    let _colorMode: AnimatedSignatureOptions["colorMode"] = "none";
    this._options = {
      get duration() {
        return _duration;
      },
      set duration(val: AnimatedSignatureOptions["duration"]) {
        if (Array.isArray(val)) _duration = [...val];
        else console.warn("warning: this input value of `duration` type valid");
      },
      classPrefix: "sign-",
      animationName: "animatedSignature",
      backgroundColor: "rgba(0,0,0,0)",
      get drawingMode() {
        return _drawingMode;
      },
      set drawingMode(val) {
        if (["parallel", "even"].includes(val)) _drawingMode = val;
        else _drawingMode = "even";
      },
      get gap() {
        return _gap;
      },
      set gap(val) {
        _gap = val > 0 ? val : 0;
      },
      get dotDuration() {
        return _dotDuration;
      },
      set dotDuration(val) {
        _dotDuration = val > 0 ? val : 0;
      },
      get colorMode() {
        return _colorMode;
      },
      set colorMode(val) {
        if (["before", "none", "after"].includes(val)) _colorMode = val;
        else val = "none";
      },
      toSVG,
    };

    Object.assign(this.options, options);
  }
  /** 开始绘制 */
  handleDraw() {
    this.compositeOperation = "source-over";
  }
  /** 签名上色 */
  handleColor() {
    this.compositeOperation = "source-atop";
  }
  /** 改变画笔颜色 */
  changePenColor(color: string) {
    this.penColor = color;
  }
  handleClear() {
    this.clear();
  }
  /** 撤销 */
  undo() {
    const data = this.toData();
    const middle = data.pop();
    middle && this.redoStack.push(middle);
  }
  /** 重做 */
  redo() {
    const data = this.toData();
    const middle = this.redoStack.pop();
    middle && data.push(middle);
  }

  generateCode(toSVGOptions: ToSVGOptions = {}) {
    const { svg, record } = this.options.toSVG.call(this, toSVGOptions);

    this.calcStyle(record);

    const style = document.createElement("style");

    style.innerHTML = this.generateCommonStyle();

    return { svg, style };
  }

  calcStyle(record: Array<RecordComposition>) {
    const { duration, classPrefix, drawingMode, colorMode, gap, dotDuration } =
      this.options;
    const strokes = duration.length;

    if (drawingMode === "even") {
      const lengths = Array(strokes).fill(0);
      const delays = Array(strokes).fill(0);

      record.forEach(
        (item, index) =>
          !item.isDot && (lengths[index % strokes] += item.partLength)
      );

      record.forEach((item, index) => {
        const relatedIndex = index % strokes;
        if (item.isDot) {
          const { circle } = item.data;

          circle.className += ` ${classPrefix}element ${classPrefix}circle`;
          circle.style.animationDuration = `${dotDuration}ms`;
          circle.style.animationDelay = `${delays[relatedIndex]}ms`;
          delays[relatedIndex] += dotDuration + gap;
        } else {
          item.data.forEach(({ path, length }) => {
            const animationDuration =
              (length / lengths[relatedIndex]) * duration[relatedIndex];

            path.className += ` ${classPrefix}element ${classPrefix}path`;
            path.style.animationDuration = `${animationDuration}ms`;
            path.style.animationDelay = `${delays[relatedIndex]}ms`;
            delays[relatedIndex] += animationDuration;
          });
          delays[relatedIndex] += gap;
        }
      });
    } else if (drawingMode === "parallel") {
      const times = Array(strokes).fill(0);
      const delays = Array(strokes).fill(0);

      record.forEach(
        (item, index) =>
          !item.isDot && (times[index % strokes] += item.partTime)
      );

      record.forEach((item, index) => {
        const relatedIndex = index % strokes;
        if (item.isDot) {
          const { circle } = item.data;
          circle.className += ` ${classPrefix}element ${classPrefix}circle`;
          circle.style.animationDuration = `${dotDuration}ms`;
          circle.style.animationDelay = `${delays[relatedIndex]}ms`;
          delays[relatedIndex] += dotDuration + gap;
        } else {
          item.data.forEach(({ curve, path }) => {
            const animationDuration =
              ((curve.endPoint.time - curve.startPoint.time) /
                times[relatedIndex]) *
              duration[relatedIndex];

            path.className += ` ${classPrefix}element ${classPrefix}path`;
            path.style.animationDuration = `${animationDuration}ms`;
            path.style.animationDelay = `${delays[relatedIndex]}ms`;
            delays[relatedIndex] += animationDuration;
          });
          delays[relatedIndex] += gap;
        }
      });
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
        data: {
          circle: drawDot(points[0], pointGroupOptions),
          point: points[0],
        },
      });
    }
  }

  return {
    svg,
    record,
  };
}
