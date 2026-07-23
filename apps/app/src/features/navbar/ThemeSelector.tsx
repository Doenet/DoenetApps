import { useId } from "react";
import { Box, HStack, Icon, Radio, RadioGroup, Text } from "@chakra-ui/react";
import { FiMonitor, FiSun, FiMoon } from "react-icons/fi";
import type { IconType } from "react-icons";
import { ThemeSetting } from "../../utils/theme";

const THEME_OPTIONS: { value: ThemeSetting; label: string; icon: IconType }[] =
  [
    { value: "system", label: "System", icon: FiMonitor },
    { value: "light", label: "Light", icon: FiSun },
    { value: "dark", label: "Dark", icon: FiMoon },
  ];

/**
 * Inline System/Light/Dark theme selector. Rendered inside the account menu as
 * a radio group (not a MenuItem), so selecting an option does not close the
 * menu.
 */
export function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeSetting;
  onChange: (setting: ThemeSetting) => void;
}) {
  const labelId = useId();
  return (
    <Box px="0.8rem" py="0.3rem">
      <Text id={labelId} fontSize="sm" fontWeight="semibold" mb="0.3rem">
        Theme
      </Text>
      <RadioGroup
        value={value}
        onChange={(v) => onChange(v as ThemeSetting)}
        aria-labelledby={labelId}
      >
        <HStack spacing="0.9rem">
          {THEME_OPTIONS.map(({ value: optionValue, label, icon }) => (
            <Radio
              key={optionValue}
              value={optionValue}
              data-test={`Theme ${label}`}
            >
              <HStack spacing="0.3rem">
                <Icon as={icon} boxSize="0.9rem" aria-hidden />
                <Text fontSize="sm">{label}</Text>
              </HStack>
            </Radio>
          ))}
        </HStack>
      </RadioGroup>
    </Box>
  );
}
