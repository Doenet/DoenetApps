import { Flex, Heading } from "@chakra-ui/react";

export function DoenetHeading(props: {
  heading?: string;
  subheading?: string;
}) {
  return (
    <Flex
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="40px"
      flexShrink={0}
    >
      {props.heading ? (
        <Heading as="h2" size="lg" noOfLines={1}>
          {props.heading}
        </Heading>
      ) : null}
      {props.subheading ? (
        <Heading as="h3" size="md" noOfLines={1}>
          {props.subheading}
        </Heading>
      ) : null}
    </Flex>
  );
}
