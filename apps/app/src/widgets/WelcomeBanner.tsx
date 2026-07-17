import { Flex, Text, Link as ChakraLink } from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";

/**
 * Home-page notice welcoming visitors to the new doenet.org and pointing anyone
 * looking for the previous site to legacy.doenet.org.
 *
 * Rendered in normal document flow at the top of the home page (just below the
 * navbar), so it only appears on the home route and needs no layout offset.
 */
export function WelcomeBanner() {
  return (
    <Flex
      role="note"
      width="100%"
      align="center"
      justify="center"
      gap="8px"
      padding="8px 16px"
      background="doenet.lightBlue"
      color="black"
      borderBottom="1px solid"
      borderColor="doenet.mainBlue"
    >
      <InfoOutlineIcon color="doenet.mainBlue" flexShrink={0} />
      <Text fontSize="sm" textAlign="center">
        Welcome to the new Doenet! The old site can still be found at{" "}
        <ChakraLink
          href="https://legacy.doenet.org"
          color="doenet.mainBlue"
          textDecoration="underline"
        >
          legacy.doenet.org
        </ChakraLink>
        . For details, see{" "}
        <ChakraLink
          href="https://community.doenet.org/t/the-new-doenet-org/254"
          color="doenet.mainBlue"
          textDecoration="underline"
        >
          this post
        </ChakraLink>
        .
      </Text>
    </Flex>
  );
}
