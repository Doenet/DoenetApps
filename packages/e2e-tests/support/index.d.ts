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
       * Custom command to get the body of an iframe and wait for it to load
       */
      getIframeBody(
        iframeSelector: string,
        waitSelector?: string | null,
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
