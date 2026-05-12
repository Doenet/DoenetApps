export const shareStatusRefreshEventName = "share-status-refresh";
export const shareStatusOpenEventName = "share-status-open";

export function dispatchShareStatusRefresh(contentId: string) {
  window.dispatchEvent(
    new CustomEvent(shareStatusRefreshEventName, {
      detail: { contentId },
    }),
  );
}

export function dispatchShareStatusOpen(contentId: string) {
  window.dispatchEvent(
    new CustomEvent(shareStatusOpenEventName, {
      detail: { contentId },
    }),
  );
}

export function requestShareStatusOpen(contentId: string) {
  return new Promise<void>((resolve) => {
    window.dispatchEvent(
      new CustomEvent(shareStatusOpenEventName, {
        detail: { contentId, resolve },
      }),
    );
  });
}
