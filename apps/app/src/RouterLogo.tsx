import { Image, Link as ChakraLink } from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router";

export default function RouterLogo({
  paddingRight = "0px",
}: {
  paddingRight?: string;
}) {
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
        src="/Doenet_Logo_Frontpage_color_small_text.png"
        height="45px"
        width="130px"
        marginTop="-3px"
      />
    </ChakraLink>
  );
}
