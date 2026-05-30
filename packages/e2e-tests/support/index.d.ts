import { ContentType, UserInfo } from "@doenet-tools/shared";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to automatically log in as a user with the given email and names
       */
      loginAsTestUser({
        email,
        firstNames,
        lastNames,
        isEditor,
        isAuthor,
        isAnonymous,
      }?: {
        email?: string;
        firstNames?: string;
        lastNames?: string;
        isEditor?: boolean;
        isAuthor?: boolean;
        isAnonymous?: boolean;
      }): Chainable<null>;

      /**
       * Custom command to create an activity for the logged in user
       */
      createContent({
        name,
        contentType,
        doenetML,
        classifications,
        categories,
        makePublic,
        publishInLibrary,
        parentId,
      }: {
        name: string;
        contentType?: ContentType;
        doenetML?: string;
        classifications?: {
          systemShortName: string;
          category: string;
          subCategory: string;
          code: string;
        }[];
        categories?: Record<string, boolean>;
        makePublic?: boolean;
        /**
         * Publish the content in the library.
         * Automatically make content public even if `makePublic` is false.
         * Requires that the logged in user is an editor.
         */
        publishInLibrary?: boolean;
        parentId?: string;
      }): Chainable<string>;

      /**
       * Custom command to create an assignment from an activity
       */
      createAssignment({
        contentId,
        closedOn,
        parentId,
        maxAttempts,
      }: {
        contentId: string;
        closedOn: string;
        parentId?: string;
        maxAttempts?: number;
      }): Chainable<{ assignmentId: string; classCode: number }>;

      /**
       * Custom command to get info on logged in user
       */
      getUserInfo(): Chainable<UserInfo>;

      /**
       * Custom command to get the body of an iframe and wait for it to load.
       *
       * @param iframeSelector selector for the <iframe> element
       * @param waitSelector optional selector that must exist inside the iframe
       *   before the body is returned (e.g. ".doenet-viewer")
       * @param options.timeout how long to keep re-querying for the iframe and
       *   waitSelector (default 30000ms — DoenetML renders can exceed the 10s
       *   default under CI load)
       * @param options.label name for this call site, included in the timeout
       *   error so a CI failure identifies which getIframeBody timed out
       */
      getIframeBody(
        iframeSelector: string,
        waitSelector?: string | null,
        options?: { timeout?: number; label?: string },
      ): Chainable<HTMLBodyElement>;

      /**
       * Assert dismiss overlay appears for an open menu, click it,
       * then assert the menu (and optionally tooltip) is closed.
       */
      dismissMenuByOverlay({
        overlayTestId,
        menuListTestId,
        assertTooltipClosed,
      }: {
        overlayTestId: string;
        menuListTestId: string;
        assertTooltipClosed?: boolean;
      }): Chainable<null>;
    }
  }
}
