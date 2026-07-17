import { Image, Link as ChakraLink, useColorModeValue } from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";

export default function RouterLogo({
  paddingRight = "0px",
}: {
  paddingRight?: string;
}) {
  // The wordmark is black in the default logo (invisible on a dark chrome), so
  // swap to a variant with a white wordmark in dark mode. The cloud + donut are
  // identical in both; only the "Doenet" text color differs.
  const logoSrc = useColorModeValue(
    "/Doenet_Logo_Frontpage_color_small_text.png",
    "/Doenet_Logo_Frontpage_color_small_text_dark.png",
  );

  return (
    <ChakraLink
      as={ReactRouterLink}
      to="/"
      _hover={{ textDecoration: "none" }}
      justifyContent="center"
      height="100%"
      alignItems="center"
      aria-label="Home"
      data-test="Home"
      paddingRight={paddingRight}
    >
      <Image
        alt="Doenet Logo"
        src={logoSrc}
        height="45px"
        width="130px"
        marginTop="-3px"
      />
    </ChakraLink>
  );
}
