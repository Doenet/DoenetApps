import { ChevronLeftIcon, HamburgerIcon } from "@chakra-ui/icons";
import {
  Box,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  IconButton,
  useDisclosure,
  VStack,
  Text,
} from "@chakra-ui/react";
import { NavItem, NavSection } from "./navbar.types";
import { UserInfoWithEmail } from "../../types";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { AccountIconAndCard } from "./AccountIconAndCard";

const hoverBgColor = "doenet.lightGray";

/**
 * Mobile navigation with hamburger menu and drawer.
 * Uses a right-side drawer with drill-down pattern for nested navigation.
 * When a parent item is clicked, the drawer transitions to show its children
 * with a back button.
 */
export function NavbarMobile({
  sections,
  user,
}: {
  sections: NavSection[];
  user?: UserInfoWithEmail;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeSubmenu, setActiveSubmenu] = useState<NavItem | null>(null);

  const handleClose = () => {
    setActiveSubmenu(null);
    onClose();
  };

  const handleItemClick = (navItem: NavItem) => {
    if (navItem.subItems) {
      setActiveSubmenu(navItem);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    setActiveSubmenu(null);
  };

  const account = user && <AccountIconAndCard user={user} />;

  const activePane = activeSubmenu ? (
    <VStack align="stretch" spacing={0}>
      <Box
        as="button"
        onClick={handleBack}
        py={3}
        px={4}
        display="flex"
        alignItems="center"
        _hover={{ backgroundColor: hoverBgColor }}
        cursor="pointer"
      >
        <ChevronLeftIcon mr={2} />
        <Text fontWeight="medium">Back</Text>
      </Box>
      <Divider />
      {activeSubmenu.subItems?.map((child, index) => (
        <NavbarMobileLeaf
          key={index}
          navItem={child}
          onClick={() => handleItemClick(child)}
        />
      ))}
    </VStack>
  ) : (
    <VStack align="stretch" spacing={0}>
      {sections.map((section, sectionIndex) => (
        <Box key={sectionIndex}>
          {section.heading && (
            <Text
              px={4}
              py={2}
              fontSize="xs"
              fontWeight="bold"
              textTransform="uppercase"
              color="gray.600"
            >
              {section.heading}
            </Text>
          )}
          {section.items.map((item, itemIndex) => (
            <NavbarMobileLeaf
              key={itemIndex}
              navItem={item}
              onClick={() => handleItemClick(item)}
            />
          ))}
          {sectionIndex < sections.length - 1 && <Divider my={2} />}
        </Box>
      ))}
    </VStack>
  );

  return (
    <>
      {account}
      <IconButton
        aria-label="Open navigation menu"
        icon={<HamburgerIcon width="full" height="full" p="5px" />}
        onClick={onOpen}
        variant="unstyled"
        // width={width}
        // height={height}
      />
      <Drawer isOpen={isOpen} placement="right" onClose={handleClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {activeSubmenu ? activeSubmenu.label : "Menu"}
          </DrawerHeader>
          <DrawerBody>{activePane}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/**
 * Individual navigation item in the mobile drawer.
 * Renders as a touch-friendly link (44px min height) with optional chevron
 * indicator for items with children. Supports both internal routes and external links.
 */
function NavbarMobileLeaf({
  navItem,
  onClick,
}: {
  navItem: NavItem;
  onClick: () => void;
}) {
  const hasChildren = !!navItem.subItems;

  const content = (
    <>
      <Text>{navItem.label}</Text>
      {hasChildren && <ChevronLeftIcon transform="rotate(180deg)" />}
    </>
  );

  const boxStyles = {
    py: 3,
    px: 4,
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    _hover: { backgroundColor: hoverBgColor },
    cursor: "pointer" as const,
    minH: "44px",
  };

  if (navItem.to) {
    return (
      <Box
        as={RouterLink}
        data-test={navItem.label}
        to={navItem.to}
        reloadDocument={navItem.reloadDocument}
        onClick={onClick}
        {...boxStyles}
      >
        {content}
      </Box>
    );
  } else {
    return (
      <Box data-test={navItem.label} onClick={onClick} {...boxStyles}>
        {content}
      </Box>
    );
  }
}
