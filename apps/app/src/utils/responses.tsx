import me from "math-expressions";
import type { Tree } from "math-expressions";
import { MathJax } from "better-react-mathjax";
import { JSX } from "react";

const nanInfinityReviver = function (_key: any, value: any) {
  if (value && value.objectType === "special-numeric") {
    if (value.stringValue === "NaN") {
      return NaN;
    } else if (value.stringValue === "Infinity") {
      return Infinity;
    } else if (value.stringValue === "-Infinity") {
      return -Infinity;
    }
  }

  return value;
};

export function parseAndFormatResponse(response: string): JSX.Element {
  const parsedResp = JSON.parse(response, nanInfinityReviver);

  return parsedResp.response.map((v: unknown, i: number) => {
    const componentType = parsedResp.componentTypes[i];
    if (["math", "point", "matrix", "vector"].includes(componentType)) {
      const expr = me
        .fromAst(v as Tree)
        .round_numbers_to_precision_plus_decimals(6, 2);
      return (
        <div key={i}>
          <MathJax hideUntilTypeset={"first"} inline dynamic key={i}>
            {"\\(" + expr.toLatex() + "\\)"}
          </MathJax>
        </div>
      );
    } else {
      return (
        <div style={{ whiteSpace: "pre-line" }} key={i}>
          {String(v)}
        </div>
      );
    }
  });
}
