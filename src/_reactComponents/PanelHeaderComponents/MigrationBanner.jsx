import React from "react";

// Informational banner announcing the migration to the new Doenet website.
// Edit NOTICE_DATE / the message text here in one place; it is used by both
// the wide variant (home page) and the thin variant (every other page).
const NOTICE_DATE = "May 29, 2026";

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
        aria-label="Site migration notice"
      >
        <strong>
          Significant changes are coming to Doenet in the next month.
        </strong>{" "}
        We are switching to the system currently at{" "}
        <ExternalLink href="https://beta.doenet.org">
          beta.doenet.org
        </ExternalLink>
        . More information coming soon. Questions? Go to{" "}
        <ExternalLink href="https://community.doenet.org">
          community.doenet.org
        </ExternalLink>
        .
        <div style={{ fontSize: "0.8rem", marginTop: "6px", opacity: 0.8 }}>
          Posted {NOTICE_DATE}
        </div>
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
      aria-label="Site migration notice"
    >
      <strong>
        Significant changes are coming to Doenet in the next month.
      </strong>{" "}
      We are switching to the system currently at{" "}
      <ExternalLink href="https://beta.doenet.org">
        beta.doenet.org
      </ExternalLink>
      . More information coming soon. Questions? Go to{" "}
      <ExternalLink href="https://community.doenet.org">
        community.doenet.org
      </ExternalLink>
      .
    </div>
  );
}
