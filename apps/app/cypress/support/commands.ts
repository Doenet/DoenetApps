/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

// -- checkContrast ------------------------------------------------------------
// axe's color-contrast rule returns "incomplete" (and so wick-a11y silently
// passes) for text rendered inside a transformed/portaled container such as a
// Chakra <Modal>: it cannot resolve the effective background through the stack.
// This command fills that gap with a direct WCAG 2 AA contrast computation. For
// every element under `selector` that owns a visible text node, it reads the
// computed text color, walks up to the first non-transparent background, and
// asserts the ratio meets the AA threshold (4.5:1 normal text, 3:1 for >=18pt
// or >=14pt bold). Use it for dark-mode contrast on modal-nested content that
// checkAccessibility cannot see.
function parseRGB(str: string): [number, number, number, number] {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 0];
  const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function relLum([r, g, b]: [number, number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): number {
  const l1 = relLum(fg);
  const l2 = relLum(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function resolveBg(el: Element): [number, number, number, number] {
  let node: Element | null = el;
  while (node) {
    const bg = parseRGB(window.getComputedStyle(node).backgroundColor);
    if (bg[3] !== 0) return bg;
    node = node.parentElement;
  }
  return [255, 255, 255, 1];
}

Cypress.Commands.add("checkContrast", (selector: string) => {
  cy.get(selector).then(($root) => {
    const failures: string[] = [];
    const all = [
      ...($root.get(0)?.matches?.("*") ? [$root.get(0)] : []),
      ...Array.from($root.get(0).querySelectorAll("*")),
    ];
    for (const el of all) {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent || "")
        .join("")
        .trim();
      if (!ownText) continue;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const fg = parseRGB(cs.color);
      const bg = resolveBg(el);
      const ratio = contrastRatio(fg, bg);
      const sizePx = parseFloat(cs.fontSize) || 16;
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = sizePx >= 24 || (bold && sizePx >= 18.66);
      const threshold = large ? 3 : 4.5;
      if (ratio < threshold) {
        failures.push(
          `"${ownText.slice(0, 40)}" ratio ${ratio.toFixed(2)} < ${threshold} (color ${cs.color} on bg rgb(${bg[0]},${bg[1]},${bg[2]}))`,
        );
      }
    }
    expect(failures, `contrast failures under ${selector}`).to.deep.equal([]);
  });
});
