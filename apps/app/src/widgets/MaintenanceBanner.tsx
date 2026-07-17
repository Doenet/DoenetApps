import { useLayoutEffect, useRef, useState } from "react";
import { Flex, Text, CloseButton } from "@chakra-ui/react";
import { WarningTwoIcon } from "@chakra-ui/icons";

/**
 * Site-wide notice warning that Doenet may be unavailable during a scheduled
 * maintenance window. Dismissible; also hides itself automatically once the
 * window has passed.
 *
 * While visible, it publishes its own height as the `--maintenance-offset` CSS
 * variable on the document root. Pages that pin toolbars to the viewport just
 * below the navbar (e.g. the scratch pad and editor) add this offset to their
 * `top` values so they stay clear of the banner. The variable is only set while
 * the banner is showing, so those pages fall back to a 0px offset — i.e. their
 * original layout — whenever the banner is absent, dismissed, or expired.
 *
 * NOTE: This is a temporary, time-boxed banner for the maintenance window on
 * Jul 17, 2026 (12pm–2pm ET). Safe to delete after that date.
 *
 * Currently disabled via SHOW_BANNER below; flip back to true to re-enable
 * (or reuse this component for a future notice).
 */

// End of the maintenance window: 2pm ET on Jul 17, 2026 (== 18:00 UTC).
const MAINTENANCE_END = new Date("2026-07-17T18:00:00Z");

const SHOW_BANNER = false;

export function MaintenanceBanner() {
  const [show, setShow] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const visible = SHOW_BANNER && show && Date.now() < MAINTENANCE_END.getTime();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!visible || !ref.current) {
      root.style.removeProperty("--maintenance-offset");
      return;
    }
    const el = ref.current;
    const apply = () => {
      root.style.setProperty("--maintenance-offset", `${el.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--maintenance-offset");
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Flex
      ref={ref}
      role="alert"
      width="100%"
      align="center"
      gap="8px"
      padding="6px 12px"
      background="doenet.lightYellow"
      color="black"
      borderBottom="1px solid"
      borderColor="doenet.mainYellow"
    >
      <WarningTwoIcon color="doenet.mainYellow" flexShrink={0} />
      <Text flex="1" fontSize="sm" textAlign="center">
        Scheduled maintenance: Doenet may be unavailable on{" "}
        <strong>July 17 between 12pm and 2pm ET</strong>.
      </Text>
      <CloseButton
        size="sm"
        aria-label="Dismiss maintenance notice"
        onClick={() => setShow(false)}
      />
    </Flex>
  );
}
