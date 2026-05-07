import { Avatar as ChakraAvatar, AvatarProps } from "@chakra-ui/react";

/**
 * Accessible Avatar component that uses WCAG AA compliant colors (4.5:1 contrast).
 * Wraps Chakra Avatar with a custom color palette to ensure text contrast meets accessibility standards.
 */

// Palette mixes dark (white text) and light (black text) backgrounds with 4.5:1+ contrast
const ACCESSIBLE_AVATAR_PALETTE: Array<{ bg: string; color: string }> = [
  { bg: "#244f8c", color: "white" }, // dark blue
  { bg: "#22543d", color: "white" }, // dark green
  { bg: "#53408f", color: "white" }, // dark purple
  { bg: "#742a2a", color: "white" }, // dark red
  { bg: "#234e52", color: "white" }, // dark teal
  { bg: "#7c2d12", color: "white" }, // dark orange
  { bg: "#702459", color: "white" }, // dark pink
  { bg: "#3c366b", color: "white" }, // dark indigo
  { bg: "#0c3e47", color: "white" }, // dark cyan
  { bg: "#161e26", color: "white" }, // dark gray
  { bg: "#b4c5d6", color: "black" }, // muted gray-blue
  { bg: "#c7ad63", color: "black" }, // warm sand
  { bg: "#a2cad2", color: "black" }, // soft cyan
  { bg: "#b8a4de", color: "black" }, // soft violet
  { bg: "#a7c2ab", color: "black" }, // soft green
  { bg: "#d3a1a1", color: "black" }, // soft rose
  { bg: "#d6ae8e", color: "black" }, // soft peach
  { bg: "#9fc3eb", color: "black" }, // soft blue
  { bg: "#c7b569", color: "black" }, // soft yellow
  { bg: "#c1c6d1", color: "black" }, // neutral light
];

export function AccessibleAvatar(props: AvatarProps) {
  // Generate a color index from the name to ensure consistent colors for the same name
  const generateColorIndex = (name?: string): number => {
    if (!name) return 0;

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash) % ACCESSIBLE_AVATAR_PALETTE.length;
  };

  const colorIndex = generateColorIndex(props.name);
  const paletteEntry = ACCESSIBLE_AVATAR_PALETTE[colorIndex];

  const hexToRgb = (hex: string) => {
    const normalized = hex.replace("#", "");
    if (![3, 6].includes(normalized.length)) return null;
    const expanded =
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized;
    const r = parseInt(expanded.slice(0, 2), 16);
    const g = parseInt(expanded.slice(2, 4), 16);
    const b = parseInt(expanded.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  };

  const relativeLuminance = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const toLinear = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const r = toLinear(rgb.r);
    const g = toLinear(rgb.g);
    const b = toLinear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Choose text color based on background luminance; fall back when parsing fails
  const pickTextColor = (bg: string | undefined, fallback: string) => {
    if (!bg) return fallback;
    const lum = relativeLuminance(bg);
    if (lum === null) return fallback;
    return lum > 0.5 ? "black" : "white";
  };

  // If a custom bg color is provided, use it; otherwise use our accessible color
  const backgroundColor = props.bg ? props.bg : paletteEntry.bg;
  const backgroundString =
    typeof backgroundColor === "string" ? backgroundColor : undefined;
  const defaultTextColor = props.bg
    ? pickTextColor(backgroundString, paletteEntry.color)
    : paletteEntry.color;
  const textColor = props.color ? props.color : defaultTextColor;

  return <ChakraAvatar {...props} bg={backgroundColor} color={textColor} />;
}
