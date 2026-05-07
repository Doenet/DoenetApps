import { Center, Grid, GridItem, useBreakpointValue } from "@chakra-ui/react";
import { JSX } from "react";

export const PanelPair = ({
  panelA,
  panelB,
  preferredDirection = "horizontal",
  centerWidth = "10px",
  width = "100%",
  height = "100%",
  border = "1px solid",
}: {
  panelA: JSX.Element;
  panelB: JSX.Element;
  preferredDirection?: "horizontal" | "vertical";
  centerWidth?: string;
  width?: string;
  height?: string;
  border?: string;
}) => {
  const direction = useBreakpointValue(
    {
      base: "vertical",
      md: preferredDirection,
    },
    {
      ssr: false,
    },
  );

  let templateAreas: string,
    gridTemplateRows: string,
    gridTemplateColumns: string,
    gutterHeight: string,
    gutterWidth: string;

  if (direction === "vertical") {
    templateAreas = `"panelA"
                         "middleGutter"
                         "panelB"`;
    gridTemplateRows = `0.5fr ${centerWidth} 0.5fr`;
    gridTemplateColumns = `1fr`;
    gutterHeight = centerWidth;
    gutterWidth = "100%";
  } else {
    templateAreas = `"panelA middleGutter panelB"`;
    gridTemplateRows = `1fr`;
    gridTemplateColumns = `.5fr ${centerWidth} .5fr`;
    gutterHeight = "100%";
    gutterWidth = centerWidth;
  }

  return (
    <Grid
      width={width}
      height={height}
      border={border}
      boxSizing="border-box"
      templateAreas={templateAreas}
      gridTemplateRows={gridTemplateRows}
      gridTemplateColumns={gridTemplateColumns}
      overflow="hidden"
    >
      <GridItem
        area="panelA"
        width="100%"
        height="100%"
        placeSelf="center"
        overflow="hidden"
      >
        {panelA}
      </GridItem>
      <GridItem
        area="middleGutter"
        width="100%"
        height="100%"
        placeSelf="center"
      >
        <Center
          background="doenet.mainGray"
          boxSizing="border-box"
          border="solid 1px"
          borderColor="doenet.mediumGray"
          height={gutterHeight}
          width={gutterWidth}
          data-test="contentPanelDragHandle"
        ></Center>
      </GridItem>
      <GridItem
        area="panelB"
        width="100%"
        height="100%"
        placeSelf="center"
        overflow="hidden"
      >
        {panelB}
      </GridItem>
    </Grid>
  );
};
