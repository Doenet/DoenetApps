const mapping: Record<string, string> = {
  A: `\u{1d434}`,
  B: `\u{1d435}`,
  C: `\u{1d436}`,
  D: `\u{1d437}`,
  E: `\u{1d438}`,
  F: `\u{1d439}`,
  G: `\u{1d43a}`,
  H: `\u{1d43b}`,
  I: `\u{1d43c}`,
  J: `\u{1d43d}`,
  K: `\u{1d43e}`,
  L: `\u{1d43f}`,
  M: `\u{1d440}`,
  N: `\u{1d441}`,
  O: `\u{1d442}`,
  P: `\u{1d443}`,
  Q: `\u{1d444}`,
  R: `\u{1d445}`,
  S: `\u{1d446}`,
  T: `\u{1d447}`,
  U: `\u{1d448}`,
  V: `\u{1d449}`,
  W: `\u{1d44a}`,
  X: `\u{1d44b}`,
  Y: `\u{1d44c}`,
  Z: `\u{1d44d}`,
  a: `\u{1d44e}`,
  b: `\u{1d44f}`,
  c: `\u{1d450}`,
  d: `\u{1d451}`,
  e: `\u{1d452}`,
  f: `\u{1d453}`,
  g: `\u{1d454}`,
  h: `\u{1d455}`,
  i: `\u{1d456}`,
  j: `\u{1d457}`,
  k: `\u{1d458}`,
  l: `\u{1d459}`,
  m: `\u{1d45a}`,
  n: `\u{1d45b}`,
  o: `\u{1d45c}`,
  p: `\u{1d45d}`,
  q: `\u{1d45e}`,
  r: `\u{1d45f}`,
  s: `\u{1d460}`,
  t: `\u{1d461}`,
  u: `\u{1d462}`,
  v: `\u{1d463}`,
  w: `\u{1d464}`,
  x: `\u{1d465}`,
  y: `\u{1d466}`,
  z: `\u{1d467}`,
  "+": ` +`,
  "-": `−`,
};

/**
 * A utility function to convert a string closer to what MathJax puts into the DOM.
 *
 * The function is imperfect/incomplete, but it performs these common manipulations:
 * - adds an Invisible Times between consecutive letters (unless `noInvisibleTimes` is set)
 * - converts letters to the Mathematical Italic Small characters
 * - adds a space before + (seems to be added more often than not)
 * - converts - to the minus sign
 */
export function toMathJaxString(
  s: string,
  options: { noInvisibleTimes?: boolean } = {},
) {
  const chars = s.split("");
  const newChars: string[] = [];

  if (options.noInvisibleTimes) {
    newChars.push(...chars);
  } else {
    // add invisible times between every pair letters, or digit followed by a letter, or between close/opening parens
    for (const [i, c] of chars.entries()) {
      newChars.push(c);
      const nextC = chars[i + 1];
      if (
        (nextC?.match(/[a-zA-Z]/) && c.match(/[a-zA-Z0-9]/)) ||
        (c === ")" && nextC === "(")
      ) {
        // add invisible times
        newChars.push("\u2062");
      }
    }
  }

  return newChars.map((c) => mapping[c] ?? c).join("");
}

export function removeSpaces(s: string) {
  return s
    .split("")
    .filter((c) => c != " ")
    .join("");
}
