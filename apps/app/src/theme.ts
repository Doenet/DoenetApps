import { extendTheme, defineStyleConfig } from "@chakra-ui/react";

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
        };
      }
      // Return undefined to fall back to default behavior for other color schemes
      return {};
    },
    outline: (props) => {
      if (props.colorScheme === "blue") {
        return {
          color: "blue.700",
          borderColor: "blue.700",
          _hover: {
            bg: "blue.50",
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
    FormError: {
      baseStyle: {
        text: {
          color: "red.700",
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
  colors: {
    background: "#FCFAF6",
    surface: "#FFFFFF",
    interact: "#EFEFEF",
    border: "#e0e0e0",
    text: "#1F1F1F",
    accent: "#8cebff",

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
      mainBlue: "#1a5a99",
      lightBlue: "#b8d2ea",
      solidLightBlue: "#8fb8de",
      mainGray: "#e3e3e3",
      mediumGray: "#949494",
      lightGray: "#e7e7e7",
      donutBody: "#eea177",
      donutTopping: "#6d4445",
      mainRed: "#c1292e",
      lightRed: "#eab8b8",
      mainGreen: "#459152",
      canvas: "#ffffff",
      canvastext: "#000000",
      lightGreen: "#a6f19f",
      lightYellow: "#f5ed85",
      whiteBlankLink: "#6d4445",
      mainYellow: "#94610a",
      mainPurple: "#4a03d9",
    },
  },
});

export { theme };
