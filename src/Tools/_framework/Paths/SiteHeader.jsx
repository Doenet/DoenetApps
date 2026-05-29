import React, { useRef } from "react";
import {
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  IconButton,
  HStack,
  Image,
  Link,
  Text,
  Tooltip,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  VStack,
  ButtonGroup,
} from "@chakra-ui/react";
import { HiOutlineMail } from "react-icons/hi";
import { BsGithub, BsDiscord } from "react-icons/bs";
import { Outlet, useLoaderData, useLocation, useNavigate } from "react-router";
import { NavLink } from "react-router-dom";
import { checkIfUserClearedOut } from "../../../_utils/applicationUtils";
import RouterLogo from "../RouterLogo";
import MigrationBanner from "../../../_reactComponents/PanelHeaderComponents/MigrationBanner";
import { pageToolViewAtom } from "../NewToolRoot";
import { useRecoilState } from "recoil";
import { FaMoon, FaSun } from "react-icons/fa";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import axios from "axios";

export async function loader() {
  //Check if signedIn
  const profileInfo = await checkIfUserClearedOut();
  let signedIn = true;
  if (profileInfo.cookieRemoved) {
    signedIn = false;
  }
  let portfolioCourseId = null;
  let firstName = "";
  let lastName = "";
  let email = "";
  let isAdmin = false;
  if (signedIn) {
    //Check on portfolio courseId
    const response = await axios.get("/api/getPorfolioCourseId.php");
    let { data } = response;
    portfolioCourseId = data.portfolioCourseId;
    firstName = data.firstName;
    lastName = data.lastName;
    email = data.email;

    if (portfolioCourseId == "") {
      portfolioCourseId = "not_created";
    }
    const isAdminResponse = await fetch(`/api/checkForCommunityAdmin.php`);
    const isAdminJson = await isAdminResponse.json();
    isAdmin = isAdminJson.isAdmin;
  }
  return { signedIn, portfolioCourseId, isAdmin, firstName, lastName, email };
}

function NavLinkTab({ to, children, dataTest }) {
  // TODO: use end only when path is "/"
  return (
    <NavLink to={to} end data-test={dataTest}>
      {({ isActive, isPending }) => {
        // let spinner = null;
        // if (isPending) {
        //   spinner = <Spinner size="sm" />;
        // }
        let color = "doenet.canvastext";
        let borderBottomStyle = "none";
        let borderBottomWidth = "0px";
        if (isActive) {
          color = "doenet.mainBlue";
          borderBottomWidth = "2px";
          borderBottomStyle = "solid";
        }

        return (
          <Center
            h="40px"
            borderBottomStyle={borderBottomStyle}
            borderBottomWidth={borderBottomWidth}
            borderBottomColor={color}
            p="4px"
          >
            <Text fontSize="md" color={color}>
              {children}
            </Text>
            {/* {spinner} */}
          </Center>
        );
      }}
    </NavLink>
  );
}

export function SiteHeader(props) {
  let { signedIn, portfolioCourseId, isAdmin, firstName, lastName, email } =
    useLoaderData();
  const { childComponent } = props;

  const { colorMode, toggleColorMode, setColorMode } = useColorMode();
  let location = useLocation();

  // const navColor = useColorModeValue("#ffffff", "gray.800");
  const navigate = useNavigate();

  const [recoilPageToolView, setRecoilPageToolView] =
    useRecoilState(pageToolViewAtom);

  let navigateTo = useRef("");

  if (navigateTo.current != "") {
    const newHref = navigateTo.current;
    navigateTo.current = "";
    location.href = newHref;
    navigate(newHref);
  }

  return (
    <>
      <Grid
        templateAreas={`"siteHeader" 
        "main"`}
        gridTemplateRows="40px auto"
        width="100vw"
        height="100vh"
      >
        <GridItem
          area="siteHeader"
          as="header"
          width="100vw"
          m="0"
          backgroundColor="#fff"
          color="#000"
          height="40px"
        >
          <Grid
            height="40px"
            position="fixed"
            top="0"
            zIndex="1200"
            borderBottom="1px solid var(--mainGray)"
            // paddingBottom="2px"
            width="100%"
            margin="0"
            display="flex"
            justifyContent="space-between"
            templateAreas={`"leftHeader menus rightHeader" 
        "main"`}
            gridTemplateColumns="1f auto 1f"
          >
            <GridItem area="leftHeader">
              <Center h="100%">
                {/* <Button display={{ base: "flex", md: "none" }}>
                  TABS HERE
                </Button> */}
                <RouterLogo />
              </Center>
            </GridItem>
            <GridItem area="menus">
              <HStack spacing={8}>
                <NavLinkTab to="/" dataTest="Home">
                  Home
                </NavLinkTab>
                <NavLinkTab to="library" dataTest="Library">
                  Library
                </NavLinkTab>
                <NavLinkTab to="community" dataTest="Community">
                  Community
                </NavLinkTab>
                {signedIn && (
                  <>
                    <NavLinkTab
                      to={`portfolio/${portfolioCourseId}`}
                      dataTest="Portfolio"
                    >
                      Portfolio
                    </NavLinkTab>
                    <NavLinkTab to="courses" dataTest="My Courses">
                      My Courses
                    </NavLinkTab>
                    {isAdmin && (
                      <NavLinkTab to="admin" dataTest="Admin">
                        Admin
                      </NavLinkTab>
                    )}
                  </>
                )}
              </HStack>
            </GridItem>
            <GridItem area="rightHeader">
              <Flex columnGap="10px">
                <Link
                  borderRadius="lg"
                  p="4px 5px 0px 5px"
                  mt="4px"
                  h="32px"
                  bg="#EDF2F7"
                  href="https://docs.doenet.org"
                  isExternal
                  data-test="Documentation Link"
                >
                  Documentation <ExternalLinkIcon mx="2px" />
                </Link>
                <Link href="mailto:info@doenet.org">
                  <Tooltip label="mailto:info@doenet.org">
                    <IconButton
                      mt="5px"
                      colorScheme="blue"
                      size="sm"
                      fontSize="16pt"
                      icon={<HiOutlineMail />}
                    />
                  </Tooltip>
                </Link>

                <Link href="https://github.com/Doenet/">
                  <Tooltip label="Doenet Github">
                    <IconButton
                      mt="5px"
                      colorScheme="blue"
                      size="sm"
                      fontSize="16pt"
                      icon={<BsGithub />}
                    />
                  </Tooltip>
                </Link>
                <Link href="https://discord.gg/PUduwtKJ5h">
                  <Tooltip label="Doenet Discord">
                    <IconButton
                      mt="5px"
                      colorScheme="blue"
                      size="sm"
                      fontSize="16pt"
                      icon={<BsDiscord />}
                    />
                  </Tooltip>
                </Link>
                {signedIn ? (
                  <Center h="40px" mr="10px">
                    <Menu>
                      <MenuButton>
                        <Avatar size="sm" name={`${firstName} ${lastName}`} />
                      </MenuButton>
                      <MenuList>
                        <VStack mb="20px">
                          <Avatar size="xl" name={`${firstName} ${lastName}`} />
                          <Text>
                            {firstName} {lastName}
                          </Text>
                          <Text>{email}</Text>
                          <ButtonGroup size="sm" isAttached variant="outline">
                            <Button
                              leftIcon={<FaSun />}
                              onClick={toggleColorMode}
                              isDisabled={colorMode == "light"}
                            >
                              Light
                            </Button>
                            <Button
                              leftIcon={<FaMoon />}
                              onClick={toggleColorMode}
                              isDisabled={colorMode == "dark"}
                              // cursor="not-allowed"
                            >
                              Dark
                            </Button>
                            {/* <Button
                            leftIcon={<FaRobot />}
                            onClick={() => setColorMode("system")}
                            // isDisabled={colorMode == ""}
                            // cursor="not-allowed"
                          >
                            Auto
                          </Button> */}
                          </ButtonGroup>
                        </VStack>
                        <MenuItem as="a" href="/signout">
                          Sign Out
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Center>
                ) : (
                  <Center h="40px" mr="10px">
                    <Button
                      data-test="Nav to signin"
                      size="sm"
                      // variant="ghost"
                      variant="outline"
                      onClick={() => {
                        navigateTo.current = "/signin";
                        setRecoilPageToolView({
                          page: "signin",
                          tool: "",
                          view: "",
                          params: {},
                        });
                      }}
                    >
                      Sign In
                    </Button>
                  </Center>
                )}
              </Flex>
            </GridItem>
          </Grid>
        </GridItem>
        <GridItem area="main" as="main" margin="0" overflowY="scroll">
          {/* <Box>test</Box> */}
          {/* Home renders its own wide migration banner, so skip the thin one there */}
          {location.pathname !== "/" && <MigrationBanner variant="thin" />}
          {childComponent ? childComponent : <Outlet context={{ signedIn }} />}
        </GridItem>
      </Grid>
    </>
  );
}
