import { Box } from "@chakra-ui/react";
import { ReactNode } from "react";

export function WithSideBanners({
  children,
  bgColor = "white",
  padding = "0px",
  borderTopColor,
}: {
  children: ReactNode;
  bgColor?: string;
  padding?: string;
  borderTopColor?: string;
}) {
  return (
    <Box
      width="100%"
      bg={bgColor}
      borderTopWidth={borderTopColor ? "1px" : undefined}
      borderTopColor={borderTopColor}
    >
      <Box
        maxW="75rem"
        paddingY={padding}
        mx="auto"
        px={{ base: 4, md: 6, lg: 8 }}
      >
        {children}
      </Box>
    </Box>
  );
}
