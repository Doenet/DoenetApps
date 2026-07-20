import {
  extendTheme,
  defineStyleConfig,
  type StyleFunctionProps,
} from "@chakra-ui/react";

// Chakra's default `subtle` Alert keeps a light status-colored background while
// the inherited text goes light in dark mode, leaving warnings/infos as light
// text on a light background. Pin readable bg/text/icon per color scheme in both
// modes. Applies to every <Alert> (warning, info, error, success).
const Alert = {
  variants: {
    subtle: (props: StyleFunctionProps) => {
      const { colorScheme: c } = props;
      return {
        container: {
          bg: `${c}.100`,
          color: `${c}.900`,
          _dark: { bg: `${c}.900`, color: `${c}.100` },
        },
        icon: {
          color: `${c}.500`,
          _dark: { color: `${c}.200` },
        },
      };
    },
  },
};

const Button = defineStyleConfig({
  variants: {
    solid: (props) => {
      if (props.colorScheme === "blue") {
        return {
          bg: "blue.600",
          color: "white",
          _hover: {
            bg: "blue.700",
            _disabled: {
              bg: "blue.600",
            },
          },
          // Without an explicit active bg, an open MenuButton falls back to
          // Chakra's default dark _active (blue.400), which fails contrast with
          // white text (3.05:1). Pin a dark-safe active blue.
          _active: {
            bg: "blue.700",
          },
        };
      }
      // Return undefined to fall back to default behavior for other color schemes
      return {};
    },
    outline: (props) => {
      if (props.colorScheme === "blue") {
        return {
          color: props.colorMode === "dark" ? "blue.200" : "blue.700",
          borderColor: props.colorMode === "dark" ? "blue.200" : "blue.700",
          _hover: {
            // blue.50 is near-white — use a dark tint in dark mode.
            bg: props.colorMode === "dark" ? "blue.900" : "blue.50",
            _disabled: {
              bg: "transparent",
            },
          },
        };
      }
      return {};
    },
  },
});

const theme = extendTheme({
  components: {
    Button,
    IconButton: Button,
    Alert,
    FormError: {
      baseStyle: {
        text: {
          // red.700 is unreadable on dark panels; use a light red in dark mode.
          color: "red.700",
          _dark: { color: "red.300" },
        },
      },
    },
  },
  fonts: {
    body: "Jost",
  },
  textStyles: {
    primary: {
      fontFamily: "Jost",
    },
  },
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
  // Semantic color tokens flip automatically with the color mode. The six flat
  // names below and the theme-sensitive `doenet.*` values live here (not in
  // `colors`) so every `bg="background"` / `color="text"` / `bg="doenet.canvas"`
  // usage becomes dark-mode-aware with no per-component change. Brand hues that
  // read the same in both modes stay in `colors` below.
  semanticTokens: {
    colors: {
      // Dark surfaces carry a faint blue tint (off-gray) and are a hair lighter
      // than flat neutrals so the theme feels inviting rather than harsh — see
      // the dark-mode palette follow-up.
      background: { default: "#FCFAF6", _dark: "#14161b" },
      surface: { default: "#FFFFFF", _dark: "#20232b" },
      // Subtle raised/inset panel background (was gray.50 / gray.100 / white).
      surfaceMuted: { default: "#f2f2f2", _dark: "#282c35" },
      interact: { default: "#EFEFEF", _dark: "#31353f" },
      border: { default: "#e0e0e0", _dark: "#3c414d" },
      text: { default: "#1F1F1F", _dark: "#e6e6e6" },
      // Secondary/de-emphasized text (was gray.600 / gray.700 / gray.800).
      textMuted: { default: "#4a5568", _dark: "#a6adba" },
      // Slate-purple category/label icon accent (was #666699); lightened for dark.
      iconAccent: { default: "#666699", _dark: "#a9abe5" },
      accent: { default: "#8cebff", _dark: "#1c5a72" },
      // Page/gutter frame around the (flipping) viewer canvas. Was the fixed
      // brand `doenet.lightBlue` (#b8d2ea), which left light-blue margins around
      // a dark viewer in dark mode. Keep the light-blue identity in light mode,
      // recede to a dark blue-gray in dark mode.
      viewerFrame: { default: "#b8d2ea", _dark: "#17293a" },
      doenet: {
        canvas: { default: "#ffffff", _dark: "#14161b" },
        // #ededed rather than pure white to avoid halation on dark surfaces.
        canvastext: { default: "#000000", _dark: "#ededed" },
        mainGray: { default: "#e3e3e3", _dark: "#3c414d" },
        lightGray: { default: "#e7e7e7", _dark: "#31353f" },
      },
    },
  },
  colors: {
    doenet_blue: {
      100: "#a6f19f", //Ghost/Outline Click
      200: "#c1292e", //Normal Button - Dark Mode - Background
      300: "#f5ed85", //Normal Button - Dark Mode - Hover
      400: "#949494", //Normal Button - Dark Mode - Click
      500: "#1a5a99", //Normal Button - Light Mode - Background
      600: "#757c0d", //Normal Button - Light Mode - Hover //Ghost/Outline BG
      700: "#d1e6f9", //Normal Button - Light Mode - Click
      800: "#6d4445",
      900: "#4a03d9",
    },
    doenet: {
      // canvas, canvastext, mainGray, and lightGray are defined as semantic
      // tokens above so they flip with the color mode.
      mainBlue: "#1a5a99",
      lightBlue: "#b8d2ea",
      solidLightBlue: "#8fb8de",
      mediumGray: "#949494",
      donutBody: "#eea177",
      donutTopping: "#6d4445",
      mainRed: "#c1292e",
      lightRed: "#eab8b8",
      mainGreen: "#459152",
      lightGreen: "#a6f19f",
      lightYellow: "#f5ed85",
      whiteBlankLink: "#6d4445",
      mainYellow: "#94610a",
      mainPurple: "#4a03d9",
    },
  },
});

export { theme };
