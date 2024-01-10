import type { PointGroupOptions, ToSVGOptions } from "signature_pad";
import type { Bezier } from "signature_pad/dist/types/bezier";
import type { BasicPoint } from "signature_pad/dist/types/point";
import type { RecordComposition } from "./types";
import { Point } from "signature_pad/src/point";

/**
 * 对SignaturePad.toSVG重写
 * 原方法中使用了过多private属性，扩展类中不方便重写且将源码加入扩展类会导致代码繁杂，所以在这里单独写出
 * 用户也可以对此方法进行重写
 */
export function toSVG({ includeBackgroundColor = false }: ToSVGOptions = {}) {
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
