import {
  MenuButton,
  Menu,
  MenuList,
  MenuItem,
  Link as ChakraLink,
  Text,
  Box,
  HStack,
  Spacer,
} from "@chakra-ui/react";
import { NavItem, NavSection } from "./navbar.types";
import { Link as RouterLink } from "react-router";
import { UserInfoWithEmail } from "../../types";
import RouterLogo from "../../RouterLogo";
import { AccountIconAndCard } from "./AccountIconAndCard";

// Match the logo's rounded bold lettering with heavier nav text for consistency.
const navFontWeight = 500;
const navLetterSpacing = "0.01em";
const navItemPaddingX = "1rem";
const navItemHoverBg = "doenet.lightGray";

export function NavbarDesktop({
  mainSections,
  accountSection,
  user,
}: {
  mainSections: NavSection[];
  accountSection: NavSection;
  user?: UserInfoWithEmail;
}) {
  const account = user && <AccountIconAndCard user={user} />;

  return (
    <HStack h="100%" spacing="0px" pr="0.5rem">
      <RouterLogo paddingRight="0.5rem" />
      {renderSections(mainSections)}
      <Spacer />
      {renderSections(accountSection ? [accountSection] : [])}
      {account}
    </HStack>
  );
}

function renderSections(sections: NavSection[]) {
  return sections.flatMap((section, sectionIndex) => {
    const items = section.items.map((item, index) => {
      if (item.subItems) {
        return (
          <DesktopNavMenuLinks
            key={`${sectionIndex}-${index}`}
            navItem={item}
          />
        );
      } else {
        return (
          <DesktopNavSingleLink
            key={`${sectionIndex}-${index}`}
            navItem={item}
          />
        );
      }
    });

    // Add divider if not first section
    if (sectionIndex !== 0) {
      return [
        <Box
          key={`divider-${sectionIndex}`}
          w="1px"
          h="24px"
          bg="gray.300"
          alignSelf="center"
          mx="16px"
        />,
        ...items,
      ];
    }

    return items;
  });
}

/**
 * Desktop dropdown menu for navigation items with children.
 * Displays a menu button that reveals a dropdown list on hover/click.
 * Only visible on lg breakpoint and above.
 */
function DesktopNavMenuLinks({ navItem }: { navItem: NavItem }) {
  const { label, subItems } = navItem;
  const button = (
    <MenuButton
      color="doenet.canvastext"
      fontWeight={navFontWeight}
      letterSpacing={navLetterSpacing}
      h="100%"
      px={navItemPaddingX}
      borderRadius="0"
      _hover={{ backgroundColor: navItemHoverBg }}
    >
      {label}
    </MenuButton>
  );

  return (
    // Hack: setting gutter to this negative number aligns dropdown with header bar
    <Menu gutter={-4}>
      {button}
      <MenuList borderRadius="0">
        {subItems?.map((option, index) => {
          const link = option.to!;
          const reloadDocument = option.reloadDocument;
          return (
            <MenuItem
              key={index}
              as={RouterLink}
              to={link}
              reloadDocument={reloadDocument}
              backgroundColor="transparent"
              _hover={{ backgroundColor: navItemHoverBg }}
            >
              {option.label}
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
}

/**
 * Desktop navigation item for direct links.
 * Renders as a styled link in the horizontal navbar with hover effects.
 * Only visible on lg breakpoint and above.
 */
function DesktopNavSingleLink({ navItem }: { navItem: NavItem }) {
  const { to, label, reloadDocument } = navItem;
  const link = to!;
  return (
    <ChakraLink
      as={RouterLink}
      to={link}
      reloadDocument={reloadDocument}
      data-test={label}
      h="100%"
      alignContent="center"
      _hover={{ backgroundColor: navItemHoverBg }}
    >
      <Text
        px={navItemPaddingX}
        fontSize="md"
        fontWeight={navFontWeight}
        letterSpacing={navLetterSpacing}
      >
        {label}
      </Text>
    </ChakraLink>
  );
}
