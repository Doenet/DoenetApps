import {
  HStack,
  CloseButton,
  Button,
  Text,
  IconButton,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { ReactNode } from "react";
import type { IconType } from "react-icons";

export type Action = {
  label: string;
  icon?: IconType;
  onClick: () => void;
  isDisabled?: boolean;
  useIconOnly?: boolean;
};

export type Context = {
  description?: string;
  isLongDescription?: boolean;
  closeLabel: string;
  onClose: () => void;
  /**
   * This field will append anything to the end of this action bar.
   * Remove this once `<AddContentToMenu>` and `<CreateContentMenu>` have been properly
   * refactored to NOT include their initial button UI inside of themselves.
   * See issue #2852
   */
  FIX_ME_miscellaneous_buttons?: ReactNode;
};

/**
 * ActionBar component that displays a horizontal stack of action buttons
 * along with a close button and an optional description.
 * Meant to be at the top of a page or panel where actions can be taken.
 */
export function ActionBar({
  context,
  actions,
  isActive,
}: {
  context: Context;
  actions: Action[];
  isActive: boolean;
}) {
  const descriptionLengthRem = context.isLongDescription ? "20rem" : "8rem";

  return (
    <HStack
      spacing={"1rem"}
      // align="center"
      backgroundColor={isActive ? "gray.100" : undefined}
      width="100%"
      height="2.3rem"
      mb="10px"
    >
      {isActive && (
        <CloseButton
          data-test={`Action Bar ${context.closeLabel}`}
          size="sm"
          onClick={context.onClose}
        />
      )}

      {isActive && context.description && (
        <Text
          width={descriptionLengthRem}
          noOfLines={1}
          data-test="Action Bar Description"
        >
          {context.description}
        </Text>
      )}

      {isActive &&
        actions.map((action) => {
          const iconElement = action.icon ? (
            <Icon as={action.icon} fontSize="1rem" />
          ) : undefined;

          return action.useIconOnly ? (
            <Tooltip
              label={action.label}
              key={action.label}
              openDelay={500}
              placement="top"
            >
              <IconButton
                aria-label={action.label}
                icon={iconElement}
                isDisabled={action.isDisabled}
                size="xs"
                onClick={action.onClick}
              />
            </Tooltip>
          ) : (
            <Button
              key={action.label}
              data-test={`Action Bar ${action.label}`}
              isDisabled={action.isDisabled}
              size="xs"
              leftIcon={iconElement}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          );
        })}
      {isActive && context.FIX_ME_miscellaneous_buttons}
    </HStack>
  );
}
