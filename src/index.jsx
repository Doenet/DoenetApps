import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";
import { RecoilRoot } from "recoil";
import { createRoot } from "react-dom/client";

import ToolRoot from "./Tools/_framework/NewToolRoot";
import { MathJaxContext } from "better-react-mathjax";
import { mathjaxConfig } from "./Core/utils/math";
import {
  loader as communityLoader,
  action as communityAction,
  Community,
} from "./Tools/_framework/Paths/Community";
import { loader as adminLoader, Admin } from "./Tools/_framework/Paths/Admin";
import {
  loader as libraryLoader,
  Library,
} from "./Tools/_framework/Paths/Library";
import {
  loader as siteLoader,
  SiteHeader,
} from "./Tools/_framework/Paths/SiteHeader";
import {
  loader as caroselLoader,
  // action as homeAction,
  Home,
} from "./Tools/_framework/Paths/Home";

import {
  loader as portfolioLoader,
  action as portfolioAction,
  Portfolio,
} from "./Tools/_framework/Paths/Portfolio";
import {
  loader as courseLoader,
  action as courseAction,
  Courses,
} from "./Tools/_framework/Paths/Courses";
import {
  loader as publicPortfolioLoader,
  PublicPortfolio,
} from "./Tools/_framework/Paths/PublicPortfolio";
import {
  loader as portfolioActivityViewerLoader,
  action as portfolioActivityViewerAction,
  PortfolioActivityViewer,
} from "./Tools/_framework/Paths/PortfolioActivityViewer";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import {
  action as editorSupportPanelAction,
  loader as editorSupportPanelLoader,
} from "./Tools/_framework/Panels/NewSupportPanel";
import ErrorPage from "./Tools/_framework/Paths/ErrorPage";

import "@fontsource/jost";
import {
  PortfolioActivityEditor,
  loader as portfolioEditorLoader,
  action as portfolioEditorAction,
} from "./Tools/_framework/Paths/PortfolioActivityEditor";
import {
  PublicEditor,
  loader as publicEditorLoader,
} from "./Tools/_framework/Paths/PublicEditor";
import {
  CourseActivityEditor,
  loader as courseActivityEditorLoader,
  action as courseActivityEditorAction,
} from "./Tools/_framework/Paths/CourseActivityEditor";
import {
  CourseData,
  loader as courseDataLoader,
} from "./Tools/_framework/Paths/CourseData";
import {
  SurveyResults,
  loader as surveyResultsLoader,
} from "./Tools/_framework/Paths/SurveyResults";
import {
  CourseLinkPageViewer,
  loader as courseLinkPageViewerLoader,
} from "./Tools/_framework/Paths/CourseLinkPageViewer";

{
  /* <Button colorScheme="doenet_blue">TESTING 123</Button> */
}

const theme = extendTheme({
  fonts: {
    body: "Jost",
  },
  textStyles: {
    primary: {
      fontFamily: "Jost",
    },
  },
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
    // initialColorMode: "system",
    // useSystemColorMode: true,
  },
  colors: {
    doenet_blue: {
      100: "#a6f19f", //Ghost/Outline Click
      200: "#c1292e", //Normal Button - Dark Mode - Background
      300: "#f5ed85", //Normal Button - Dark Mode - Hover
      400: "#949494", //Normal Button - Dark Mode - Click
      500: "#1a5a99", //Normal Button - Light Mode - Background
      600: "#757c0d", //Normal Button - Light Mode - Hover //Ghost/Outline BG
      700: "#d1e6f9", //Normal Button - Light Mode - Click
      800: "#6d4445",
      900: "#4a03d9",
    },
    doenet: {
      mainBlue: "#1a5a99",
      lightBlue: "#b8d2ea",
      solidLightBlue: "#8fb8de",
      mainGray: "#e3e3e3",
      mediumGray: "#949494",
      lightGray: "#e7e7e7",
      donutBody: "#eea177",
      donutTopping: "#6d4445",
      mainRed: "#c1292e",
      lightRed: "#eab8b8",
      mainGreen: "#459152",
      canvas: "#ffffff",
      canvastext: "#000000",
      lightGreen: "#a6f19f",
      lightYellow: "#f5ed85",
      whiteBlankLink: "#6d4445",
      mainYellow: "#94610a",
      mainPurple: "#4a03d9",
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    loader: siteLoader,
    element: (
      <>
        {/* <ChakraProvider theme={theme}>
          <SiteHeader />
        </ChakraProvider> */}
        <SiteHeader />
      </>
    ),
    children: [
      {
        path: "/",
        loader: caroselLoader,
        // action: homeAction,
        errorElement: (
          <ChakraProvider theme={theme}>
            <ErrorPage />
          </ChakraProvider>
        ),
        element: (
          // <DarkmodeController>
          <MathJaxContext
            version={2}
            config={mathjaxConfig}
            onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
          >
            <ChakraProvider theme={theme}>
              <Home />
            </ChakraProvider>
          </MathJaxContext>
          // </DarkmodeController>
        ),
      },
      {
        path: "/library",
        loader: libraryLoader,
        // sharing an action with the community page is somewhat intentional
        // as it shows cards and admins have the same actions that they can perform
        // on cards as they can on the community page
        // TODO - determine if this is an okay way to share functionality across
        // pages or a bad idea
        action: communityAction,
        element: (
          <ChakraProvider theme={theme}>
            <Library />
          </ChakraProvider>
        ),
      },
      {
        path: "community",
        loader: communityLoader,
        action: communityAction,
        // action: communitySearchAction,
        element: (
          <ChakraProvider theme={theme}>
            <Community />
          </ChakraProvider>
        ),
      },
      {
        path: "admin",
        loader: adminLoader,
        // sharing an action with the community page is somewhat intentional
        // as it shows cards and admins have the same actions that they can perform
        // on cards as they can on the community page
        // TODO - determine if this is an okay way to share functionality across
        // pages or a bad idea
        action: communityAction,
        element: (
          <ChakraProvider theme={theme}>
            <Admin />
          </ChakraProvider>
        ),
      },
      {
        path: "portfolio/:courseId",
        loader: portfolioLoader,
        action: portfolioAction,
        element: (
          // <ChakraProvider theme={theme}>
          //   <Portfolio />
          // </ChakraProvider>
          <Portfolio />
        ),
      },
      {
        path: "courses",
        loader: courseLoader,
        action: courseAction,
        errorElement: (
          <ChakraProvider theme={theme}>
            <ErrorPage />
          </ChakraProvider>
        ),

        element: (
          <ChakraProvider theme={theme}>
            <Courses />
          </ChakraProvider>
        ),
      },
      {
        path: "publicportfolio/:courseId",
        loader: publicPortfolioLoader,
        errorElement: (
          <ChakraProvider theme={theme}>
            <ErrorPage />
          </ChakraProvider>
        ),
        element: (
          <ChakraProvider theme={theme}>
            <PublicPortfolio />
          </ChakraProvider>
        ),
      },
      {
        path: "portfolioviewer/:doenetId",
        loader: portfolioActivityViewerLoader,
        action: portfolioActivityViewerAction,
        errorElement: (
          <ChakraProvider theme={theme}>
            <ErrorPage />
          </ChakraProvider>
        ),
        element: (
          // <DarkmodeController>
          <MathJaxContext
            version={2}
            config={mathjaxConfig}
            onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
          >
            <ChakraProvider theme={theme}>
              <PortfolioActivityViewer />
            </ChakraProvider>
          </MathJaxContext>
          // </DarkmodeController>
        ),
      },
      {
        path: "portfolioeditor/:doenetId",
        loader: async ({ params }) => {
          //This leaves a location in history
          //this is because redirect creates a standard Response object and
          //Response objects has no way to set replace: true

          //Redirect as an activity can have no pageids
          return redirect(`/portfolioeditor/${params.doenetId}/_`);
        },
        element: <div>Loading...</div>,
      },
      {
        path: "portfolioeditor/:doenetId/:pageId",
        loader: portfolioEditorLoader,
        action: portfolioEditorAction,
        // errorElement: <div>Error!</div>,
        element: (
          <MathJaxContext
            version={2}
            config={mathjaxConfig}
            onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
          >
            <PortfolioActivityEditor />
            {/* <ToolRoot /> */}
          </MathJaxContext>
        ),
      },
      {
        path: "publiceditor/:doenetId",
        loader: async ({ params }) => {
          //This leaves a location in history
          //this is because redirect creates a standard Response object and
          //Response objects has no way to set replace: true

          //Redirect as an activity can have no pageids
          return redirect(`/publiceditor/${params.doenetId}/_`);
        },
        element: <div>Loading...</div>,
      },
      {
        path: "publiceditor/:doenetId/:pageId",
        loader: publicEditorLoader,
        errorElement: (
          <ChakraProvider theme={theme}>
            <ErrorPage />
          </ChakraProvider>
        ),
        element: (
          <MathJaxContext
            version={2}
            config={mathjaxConfig}
            onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
          >
            <PublicEditor />
          </MathJaxContext>
        ),
      },
    ],
  },
  {
    path: "public",
    loader: editorSupportPanelLoader,
    action: editorSupportPanelAction,
    // errorElement: <div>Error!</div>,
    element: (
      <MathJaxContext
        version={2}
        config={mathjaxConfig}
        onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
      >
        <ToolRoot />
      </MathJaxContext>
    ),
  },
  {
    path: "/courselinkpageviewer/:doenetId",
    loader: courseLinkPageViewerLoader,
    element: (
      <MathJaxContext
        version={2}
        config={mathjaxConfig}
        onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
      >
        <ChakraProvider theme={theme}>
          <CourseLinkPageViewer />
        </ChakraProvider>
      </MathJaxContext>
    ),
    errorElement: (
      <ChakraProvider theme={theme}>
        <ErrorPage />
      </ChakraProvider>
    ),
  },
  {
    path: "/courseactivityeditor/:doenetId",
    loader: async ({ params }) => {
      //This leaves a location in history
      //this is because redirect creates a standard Response object and
      //Response objects has no way to set replace: true

      //Redirect as an activity can have no pageids
      return redirect(`/courseactivityeditor/${params.doenetId}/_`);
    },
    element: <div>Loading...</div>,
    errorElement: (
      <ChakraProvider theme={theme}>
        <ErrorPage />
      </ChakraProvider>
    ),
  },
  {
    path: "/courseactivityeditor/:doenetId/:pageId",
    loader: courseActivityEditorLoader,
    action: courseActivityEditorAction,
    element: (
      <MathJaxContext
        version={2}
        config={mathjaxConfig}
        onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
      >
        <ChakraProvider theme={theme}>
          <CourseActivityEditor />
        </ChakraProvider>
      </MathJaxContext>
    ),
    errorElement: (
      <ChakraProvider theme={theme}>
        <ErrorPage />
      </ChakraProvider>
    ),
  },
  {
    path: "/coursedata/:courseId",
    loader: courseDataLoader,
    element: (
      <ChakraProvider theme={theme}>
        <CourseData />
      </ChakraProvider>
    ),
    errorElement: (
      <ChakraProvider theme={theme}>
        <ErrorPage />
      </ChakraProvider>
    ),
  },
  {
    path: "/surveyresults/:doenetId",
    loader: surveyResultsLoader,
    element: (
      <ChakraProvider theme={theme}>
        <SurveyResults />
      </ChakraProvider>
    ),
    errorElement: (
      <ChakraProvider theme={theme}>
        <ErrorPage />
      </ChakraProvider>
    ),
  },

  {
    path: "*",
    element: (
      <MathJaxContext
        version={2}
        config={mathjaxConfig}
        onStartup={(mathJax) => (mathJax.Hub.processSectionDelay = 0)}
      >
        <ToolRoot />
      </MathJaxContext>
    ),
    // TODO - probably not a good idea long term, this is to populate the site header
    // on the 404 page, but this results in extra network requests when loading
    // ToolRoot content
    loader: siteLoader,
    errorElement: (
      <ChakraProvider theme={theme}>
        <SiteHeader childComponent={<ErrorPage />} />
      </ChakraProvider>
    ),
  },
]);

const root = createRoot(document.getElementById("root"));
root.render(
  <RecoilRoot>
    {/* <ColorModeScript initialColorMode={theme.config.initialColorMode} /> */}

    <RouterProvider router={router} />
  </RecoilRoot>,
);
