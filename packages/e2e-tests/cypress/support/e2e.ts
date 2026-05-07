// Handle MathJax async typesetting errors that aren't critical for tests.
// MathJax appears to crash if you navigate away while it is typesetting,
// so we suppress those errors here rather than adding waits in each test.
Cypress.on("uncaught:exception", (err) => {
  const errorMessage = err.message || err.toString();

  // Suppress MathJax typesetting errors
  if (errorMessage.includes("Typesetting failed")) {
    return false; // Suppress the error
  }

  // Let other errors fail the test
  return true;
});

// Suppress unhandled promise rejections from MathJax after page load.
// For some reason, the above handler is not catching the MathJax errors
// (though that catch does work in the client component tests).
// This window event listener does catch those unhandled rejections
// caused by MathJax when navigating away from a page during typesetting.
beforeEach(() => {
  cy.window().then((win) => {
    win.addEventListener("unhandledrejection", (event: any) => {
      const reason = event.reason || {};
      const message = reason?.message || reason?.toString() || "";

      // Suppress MathJax typesetting errors
      if (message.includes("Typesetting failed")) {
        event.preventDefault(); // Prevent the error from propagating
      }
    });
  });
});
