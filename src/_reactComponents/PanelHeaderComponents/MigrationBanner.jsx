import React from "react";

// Informational banner announcing the new Doenet website.
// Edit the message text here in one place; it is used by both
// the wide variant (home page) and the thin variant (every other page).

const wrapperBase = {
  backgroundColor: "#fff3cd",
  color: "#664d03",
  borderBottom: "1px solid #ffe69c",
  fontFamily: "Jost, sans-serif",
  textAlign: "center",
  boxSizing: "border-box",
  width: "100%",
};

const linkStyle = {
  color: "#0a4fa0",
  fontWeight: 600,
  textDecoration: "underline",
};

function ExternalLink({ href, children }) {
  return (
    <a href={href} style={linkStyle} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function MigrationBanner({ variant = "thin" }) {
  if (variant === "wide") {
    return (
      <div
        style={{
          ...wrapperBase,
          padding: "16px 24px",
          fontSize: "1.575rem",
          lineHeight: 1.5,
        }}
        role="region"
        aria-label="New Doenet website notice"
      >
        <strong>
          The new Doenet website is now live at{" "}
          <ExternalLink href="https://doenet.org">doenet.org</ExternalLink>.
        </strong>{" "}
        This is the legacy site. See{" "}
        <ExternalLink href="https://community.doenet.org/t/the-new-doenet-org/254">
          the announcement
        </ExternalLink>{" "}
        to learn more.
      </div>
    );
  }

  // thin variant — shown at the top of every non-home page
  return (
    <div
      style={{
        ...wrapperBase,
        padding: "6px 16px",
        fontSize: "0.85rem",
        lineHeight: 1.3,
      }}
      role="region"
      aria-label="New Doenet website notice"
    >
      <strong>
        The new Doenet website is now live at{" "}
        <ExternalLink href="https://doenet.org">doenet.org</ExternalLink>.
      </strong>{" "}
      This is the legacy site. See{" "}
      <ExternalLink href="https://community.doenet.org/t/the-new-doenet-org/254">
        the announcement
      </ExternalLink>{" "}
      to learn more.
    </div>
  );
}
