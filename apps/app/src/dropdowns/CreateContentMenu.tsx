import { ReactElement, useEffect, useState } from "react";
import { ContentDescription, ContentType, UserInfo } from "../types";
import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  ResponsiveValue,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { getAllowedParentTypes, menuIcons } from "../utils/activity";
import { CreateContentAndPromptName } from "../popups/CreateContentAndPromptName";
import { FetcherWithComponents, NavigateFunction } from "react-router";

export function CreateContentMenu({
  sourceContent,
  size,
  label,
  colorScheme,
  followAllowedParents = false,
  user,
  navigate,
  createFetcher,
  saveNameFetcher,
}: {
  sourceContent: ContentDescription[];
  size?: ResponsiveValue<(string & {}) | "xs" | "sm" | "md" | "lg">;
  label: ReactElement<any> | string;
  colorScheme?:
    | (string & {})
    | "blue"
    | "cyan"
    | "gray"
    | "green"
    | "orange"
    | "pink"
    | "purple"
    | "red"
    | "teal"
    | "yellow"
    | "whiteAlpha"
    | "blackAlpha";
  followAllowedParents?: boolean;
  user: UserInfo | null;
  navigate: NavigateFunction;
  createFetcher: FetcherWithComponents<any>;
  saveNameFetcher: FetcherWithComponents<any>;
}) {
  const [createNewType, setCreateNewType] = useState<ContentType>("folder");
  const [allowedParents, setAllowedParents] = useState<ContentType[]>([]);

  useEffect(() => {
    const allowedParents = getAllowedParentTypes(
      sourceContent.map((c) => c.type),
    );

    setAllowedParents(allowedParents);
  }, [sourceContent]);

  const {
    isOpen: createDialogIsOpen,
    onOpen: createDialogOnOpen,
    onClose: createDialogOnClose,
  } = useDisclosure();

  const createContentModal = (
    <CreateContentAndPromptName
      isOpen={createDialogIsOpen}
      onClose={createDialogOnClose}
      contentIds={sourceContent.map((sc) => sc.contentId)}
      desiredType={createNewType}
      user={user}
      navigate={navigate}
      createFetcher={createFetcher}
      saveNameFetcher={saveNameFetcher}
    />
  );

  return (
    <>
      {createContentModal}
      <Menu>
        <MenuButton
          as={Button}
          size={size}
          colorScheme={colorScheme}
          data-test="Create From Selected Button"
        >
          {label}
        </MenuButton>
        <MenuList>
          <Tooltip
            openDelay={500}
            label={
              followAllowedParents && !allowedParents.includes("sequence")
                ? "Some selected items cannot be added to a problem set"
                : null
            }
          >
            <MenuItem
              data-test="Create Problem Set"
              isDisabled={
                followAllowedParents && !allowedParents.includes("sequence")
              }
              onClick={() => {
                setCreateNewType("sequence");
                createDialogOnOpen();
              }}
            >
              {menuIcons.sequence} Problem set
            </MenuItem>
          </Tooltip>
          <MenuItem
            data-test="Create Folder"
            onClick={() => {
              setCreateNewType("folder");
              createDialogOnOpen();
            }}
          >
            {menuIcons.folder} Folder
          </MenuItem>
        </MenuList>
      </Menu>
    </>
  );
}
