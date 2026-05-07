import { NavSection } from "./navbar.types";

export function mainSections({
  discussionsLink,
}: {
  discussionsLink: string;
}): NavSection[] {
  return [
    {
      items: [
        { label: "Explore", to: "/explore" },
        { label: "Try Writing", to: "/scratchPad" },
        {
          label: "Help & Training",
          subItems: [
            { label: "Documentation", to: "https://docs.doenet.org" },
            { label: "Events & Workshops", to: "/events" },
            { label: "Ask a Question (Forums)", to: discussionsLink },
          ],
        },
        {
          label: "Community",
          subItems: [
            { label: "Community Discussions", to: discussionsLink },
            { label: "Blog", to: "/blog", reloadDocument: true },
            { label: "Get Involved", to: "/get-involved" },
            { label: "About", to: "/about" },
          ],
        },
      ],
    },
    {
      heading: "By Role",
      items: [
        {
          label: "Students",
          subItems: [{ label: "Join with code", to: "/code" }],
        },
      ],
    },
  ];
}

export const navAccountPublic: NavSection = {
  items: [{ label: "Sign up/Log In", to: "/signIn" }],
};

export const navAccountAnonymousUser: NavSection = {
  items: [],
};

export function navAccountUser(userId: string): NavSection {
  return {
    heading: "My workspace",
    items: [
      {
        label: "My Activities",
        to: `/activities/${userId}`,
      },
      { label: "Assigned to Me", to: "/assigned" },
    ],
  };
}

export function navAccountEditor(userId: string): NavSection {
  return {
    heading: "My workspace",
    items: [
      {
        label: "My Activities",
        to: `/activities/${userId}`,
      },
      { label: "Assigned to Me", to: "/assigned" },
      { label: "Curate", to: `/curate` },
    ],
  };
}
