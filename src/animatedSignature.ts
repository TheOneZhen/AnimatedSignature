import { Errors } from "./errors";
import SignaturePad from "signature_pad";
import type {
  Options as SignaturePadOptions,
  PointGroup,
  ToSVGOptions,
} from "signature_pad";

import type { AnimatedSignatureOptions, RecordComposition } from "./types";
import { toSVG } from "./utils";
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
    // let _colorMode: AnimatedSignatureOptions["colorMode"] = "none";
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
      // get colorMode() {
      //   return _colorMode;
      // },
      // set colorMode(val) {
      //   if (["before", "none", "after"].includes(val)) _colorMode = val;
      //   else val = "none";
      // },
      toSVG,
    };

    Object.assign(this.options, options);

    this.addEventListener("endStroke", () => {
      this.redoStack.splice(0);
    });
  }
  /**
   * 开始绘制
   * start drawing
   */
  handleDraw() {
    this.compositeOperation = "source-over";
  }
  /**
   * 签名上色
   * coloring
   */
  handleColor() {
    this.compositeOperation = "source-atop";
  }
  /**
   * 改变画笔颜色
   * change pen color
   */
  changePenColor(color: string) {
    this.penColor = color;
  }
  /**
   * 清空绘制内容
   * clearing
   */
  handleClear() {
    this.clear();
  }
  /**
   * 撤销
   * undo
   */
  undo() {
    const data = this.toData();
    const middle = data.pop();
    middle && this.redoStack.push(middle);
  }
  /**
   * 重做
   * redo
   */
  redo() {
    const data = this.toData();
    const middle = this.redoStack.pop();
    middle && data.push(middle);
  }
  /**
   *
   * @param toSVGOptions
   * @returns it contains SVGSVGELement and HTMLStyleElement, you can use `dom.outHTML` get the HTML
   */
  generateCode(toSVGOptions: ToSVGOptions = {}) {
    const { svg, record } = this.options.toSVG.call(this, toSVGOptions);

    this.calcStyle(record);

    const style = document.createElement("style");

    style.innerHTML = this.generateCommonStyle();

    return { svg, style };
  }

  calcStyle(record: Array<RecordComposition>) {
    const { duration, classPrefix, drawingMode, gap, dotDuration } =
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
