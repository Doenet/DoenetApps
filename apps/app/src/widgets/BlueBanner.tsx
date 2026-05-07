import { Grid, GridItem } from "@chakra-ui/react";
import { ReactNode } from "react";

/**
 * This widget wraps its children with a blue banner on the left and right.
 */
export function BlueBanner({
  headerHeight = "0px",
  children,
}: {
  headerHeight?: string;
  children: ReactNode;
}) {
  return (
    <Grid
      width="100%"
      templateAreas={`"leftGutter viewer rightGutter"`}
      templateColumns={`1fr minmax(300px,850px) 1fr`}
    >
      <GridItem
        area="leftGutter"
        background="doenet.lightBlue"
        width="100%"
        paddingTop="10px"
        alignSelf="start"
      />
      <GridItem
        area="rightGutter"
        background="doenet.lightBlue"
        width="100%"
        paddingTop="10px"
        alignSelf="start"
      />
      <GridItem
        area="viewer"
        width="100%"
        placeSelf="center"
        minHeight={`calc(100vh - ${headerHeight})`}
        maxWidth="850px"
        background="var(--canvas)"
        overflow="hidden"
        id="viewer-container"
        pb="30vh"
      >
        {children}
      </GridItem>
    </Grid>
  );
}
