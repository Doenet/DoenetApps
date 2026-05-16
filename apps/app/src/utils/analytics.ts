const umamiScriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL?.trim();
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim();

export function initializeAnalytics() {
  if (!umamiScriptUrl || !umamiWebsiteId) {
    return;
  }

  if (document.querySelector('script[data-doenet-analytics="umami"]')) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = umamiScriptUrl;
  script.dataset.doenetAnalytics = "umami";
  script.setAttribute("data-website-id", umamiWebsiteId);

  document.head.append(script);
}
