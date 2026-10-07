import { Box, Button, ButtonGroup } from "@chakra-ui/react";
import { BsPlayBtnFill } from "react-icons/bs";
import { MdModeEditOutline } from "react-icons/md";

// The View / Edit / "See source" mode-switch buttons in ActivityViewer and
// EditorHeader are blue outline buttons; the selected tab renders with
// `isActive`. Chakra's default outline `_active` is a translucent blue.200 fill,
// which — composited over the softened dark header surface (doenet.lightGray) —
// dropped the blue.200 label below AA (~4.2:1). theme.ts pins an opaque active
// fill (blue.900 dark / blue.100 light); guard that the active tab stays ≥4.5:1
// in both modes. `checkContrast` composites the fill, which axe's color-contrast
// rule reports as "incomplete" for translucent layers.
describe("Mode button contrast", { tags: ["@group1"] }, () => {
  function ModeButtons({ active }: { active: "View" | "Edit" }) {
    // Match the header the buttons actually sit on in dark mode.
    return (
      <Box background="doenet.lightGray" p="10px" width="300px">
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            data-test="View Mode Button"
            isActive={active === "View"}
            size="sm"
            colorScheme="blue"
            leftIcon={<BsPlayBtnFill size={18} />}
          >
            View
          </Button>
          <Button
            data-test="Edit Mode Button"
            isActive={active === "Edit"}
            size="sm"
            colorScheme="blue"
            leftIcon={<MdModeEditOutline size={18} />}
          >
            See source
          </Button>
        </ButtonGroup>
      </Box>
    );
  }

  it("keeps the active View tab readable", () => {
    cy.mount(<ModeButtons active="View" />);
    cy.checkContrast('[data-test="View Mode Button"]');
  });

  it("keeps the active Edit tab readable", () => {
    cy.mount(<ModeButtons active="Edit" />);
    cy.checkContrast('[data-test="Edit Mode Button"]');
  });
});
