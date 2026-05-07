import { useState, useEffect, useCallback } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Text,
  VStack,
  RadioGroup,
  Radio,
  Tooltip,
} from "@chakra-ui/react";
import { FetcherWithComponents } from "react-router";
import { optimistic } from "../../utils/optimistic_ui";
import { AssignmentMode } from "../../types";

/**
 * This widget displays the activity settings related to assignments and lets you change them.
 * Meant to be used in the editor.
 *
 * If you don't want users to be able to change formative/summative mode, set `includeMode` to false. (Do this for single docs)
 */
export function EditAssignmentSettings({
  contentId,
  maxAttempts,
  individualizeByStudent,
  mode,
  includeMode,
  isAssigned = false,
  maxAttemptsFetcher,
  variantFetcher,
  modeFetcher,
}: {
  contentId: string;
  maxAttempts: number;
  individualizeByStudent: boolean;
  mode: AssignmentMode | null;
  includeMode: boolean;
  isAssigned?: boolean;
  maxAttemptsFetcher: FetcherWithComponents<any>;
  variantFetcher: FetcherWithComponents<any>;
  modeFetcher: FetcherWithComponents<any>;
}) {
  return (
    <VStack align="left" ml="1rem">
      {includeMode && (
        <AssignmentModeSelection
          contentId={contentId}
          mode={mode!}
          editable={!isAssigned}
          fetcher={modeFetcher}
        />
      )}
      <MaxAttemptsSelectionBox
        contentId={contentId}
        attempts={maxAttempts ?? 0}
        fetcher={maxAttemptsFetcher}
      />
      <VariantSelectionBox
        contentId={contentId}
        editable={!isAssigned}
        isIndividualized={individualizeByStudent}
        fetcher={variantFetcher}
      />
    </VStack>
  );
}

/**
 * A number input to set an activity's max attempt count
 * If `attempts` is 0, that means unlimited
 */
export function MaxAttemptsSelectionBox({
  contentId,
  attempts,
  fetcher,
}: {
  contentId: string;
  attempts: number;
  fetcher: FetcherWithComponents<any>;
}) {
  const optimisticAttempts = optimistic<number>(
    fetcher,
    "maxAttempts",
    attempts,
  );
  const isUnlimited = optimisticAttempts === 0;

  const unlimitedUpdating =
    fetcher.state !== "idle" && (attempts === 0 || optimisticAttempts === 0);
  const finiteMaxUpdating = fetcher.state !== "idle" && !unlimitedUpdating;

  const fetcherUpdate = useCallback(
    (val: number) => {
      fetcher.submit(
        {
          path: "assign/updateAssignmentMaxAttempts",
          contentId,
          maxAttempts: val,
        },
        {
          method: "post",
          encType: "application/json",
        },
      );
    },
    [contentId, fetcher],
  );

  // We keep track of the latest number input just so unchecking the
  // unlimited option will revert back to the previous input value
  const [numberInputVal, setNumberInputVal] = useState<number | "">(
    attempts > 0 ? attempts : 1,
  );

  // Keep numberInputVal in sync with attempts when attempts changes externally
  useEffect(() => {
    if (Number.isInteger(attempts) && attempts > 0) {
      setNumberInputVal(attempts);
    }
  }, [attempts]);

  return (
    <Box>
      <FormControl display="flex" alignItems="center">
        <FormLabel color={unlimitedUpdating ? "gray" : "black"} mb={0}>
          Allow unlimited attempts
        </FormLabel>
        <Switch
          isChecked={isUnlimited}
          onChange={(e) => {
            const val = typeof numberInputVal === "number" ? numberInputVal : 1;
            fetcherUpdate(e.target.checked ? 0 : val);
          }}
          data-test="unlimited-attempts-switch"
        />
      </FormControl>
      <FormControl display="flex" alignItems="center" gap={1}>
        <FormLabel color={finiteMaxUpdating ? "gray" : "black"} mb={0}>
          Maximum number of attempts allowed
        </FormLabel>
        <NumberInput
          isDisabled={isUnlimited}
          width="80px"
          min={1}
          max={65535}
          data-test="max-attempts-input"
          onChange={(valueString) =>
            valueString === ""
              ? setNumberInputVal("")
              : setNumberInputVal(parseInt(valueString))
          }
          value={isUnlimited ? "---" : numberInputVal}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const target = e.target as HTMLInputElement;
              setMaxAttemptsFromInput(target);
            }
          }}
          onBlur={(e) => {
            setMaxAttemptsFromInput(e.target);
          }}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </Box>
  );

  /**
   * Set max attempts from the input field of the number input.
   * - If the value is a positive integer, set that as the new max attempts.
   * - If the value is blank and the previous value is a positive integer,
   *   reset to the last valid value and also reset the input field.
   * - Otherwise do nothing.
   */
  function setMaxAttemptsFromInput(target: HTMLInputElement) {
    if (parseInt(target.value) >= 1) {
      fetcherUpdate(parseInt(target.value));
    } else if (target.value === "" && attempts >= 1) {
      fetcherUpdate(attempts);
      setNumberInputVal(attempts);
    }
  }
}

function VariantSelectionBox({
  contentId,
  isIndividualized,
  editable = true,
  fetcher,
}: {
  contentId: string;
  isIndividualized: boolean;
  editable?: boolean;
  fetcher: FetcherWithComponents<any>;
}) {
  const optimisticIsIndividualized = optimistic<boolean>(
    fetcher,
    "individualizeByStudent",
    isIndividualized,
  );

  return (
    <Box>
      <FormControl display="flex" alignItems="center">
        <FormLabel
          size="sm"
          color={fetcher.state === "idle" ? "black" : "gray"}
          mb={0}
        >
          Assign the same variant of this activity to all students
        </FormLabel>
        <Switch
          isChecked={!optimisticIsIndividualized}
          isDisabled={!editable}
          onChange={(e) => {
            fetcher.submit(
              {
                path: "assign/updateAssignmentSettings",
                contentId,
                individualizeByStudent: !e.target.checked,
              },
              { method: "post", encType: "application/json" },
            );
          }}
        />
      </FormControl>
    </Box>
  );
}

function AssignmentModeSelection({
  contentId,
  mode,
  editable,
  fetcher,
}: {
  contentId: string;
  mode: AssignmentMode;
  editable: boolean;
  fetcher: FetcherWithComponents<any>;
}) {
  const optimisticMode = optimistic<AssignmentMode>(fetcher, "mode", mode);

  return (
    <Box marginTop="20px">
      <HStack spacing="2rem">
        <Text> Assignment mode</Text>

        <RadioGroup
          isDisabled={!editable}
          onChange={(v) => {
            const mode = v === "summative" ? "summative" : "formative";
            fetcher.submit(
              {
                path: "assign/updateAssignmentSettings",
                contentId,
                mode,
              },
              { method: "post", encType: "application/json" },
            );
          }}
          value={optimisticMode}
        >
          <HStack>
            <Radio value="formative">
              <Tooltip
                openDelay={200}
                label="In a formative assessment, students can create new attempts of individual items.
                  Their overall score is the average of their best attempt for each item."
              >
                Formative
              </Tooltip>
            </Radio>

            <Radio value="summative">
              <Tooltip
                openDelay={200}
                label="In a summative assessment, students can create new attempts of the entire assignment.
                Their score for an attempt is the average of their scores for each item.
                Their overall score is their best attempt score.
                "
              >
                Summative
              </Tooltip>
            </Radio>
          </HStack>
        </RadioGroup>
      </HStack>
    </Box>
  );
}
