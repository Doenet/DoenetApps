import {
  Button,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  VStack,
} from "@chakra-ui/react";
import { RefObject, useRef, useState } from "react";
import { FetcherWithComponents } from "react-router";
import { downloadStudentAccountCredentialsToCsv } from "../utils/csv";

export function AddStudents({
  folderId,
  isOpen,
  onClose,
  finalFocusRef,
  fetcher,
}: {
  folderId: string;
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  fetcher: FetcherWithComponents<any>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [numAccounts, setNumAccounts] = useState(1);
  const [created, setCreated] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="md"
      returnFocusOnClose={false}
      initialFocusRef={cancelRef}
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Add students</ModalHeader>
        <ModalBody pb="40px">
          {fetcher.data?.data === undefined && (
            <HStack mt="20px">
              <FormLabel htmlFor="num-students-input" mb="0">
                How many students?
              </FormLabel>
              <NumberInput
                id="num-students-input"
                min={1}
                max={500}
                maxW={24}
                value={numAccounts}
                onChange={(v) => setNumAccounts(Number(v))}
              >
                <NumberInputField />
                <NumberInputStepper data-test="num-students-stepper">
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </HStack>
          )}

          {fetcher.data?.data !== undefined && (
            <VStack>
              <Button
                onClick={() =>
                  downloadStudentAccountCredentialsToCsv({
                    title: "Student accounts",
                    accounts: fetcher.data.data.accounts,
                  })
                }
              >
                Download Passwords
              </Button>
              <Text>Passwords will never be downloadable again.</Text>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {fetcher.data?.data === undefined && (
            <Button
              marginRight="4px"
              onClick={() => {
                fetcher.submit(
                  {
                    path: "user/handles",
                    numAccounts,
                    folderId,
                  },
                  { method: "post", encType: "application/json" },
                );
                setCreated(true);
              }}
            >
              Create {numAccounts} accounts
            </Button>
          )}
          <Button
            data-test="Cancel Button"
            onClick={() => {
              onClose();
              setCreated(false);
              setNumAccounts(1);
            }}
            ref={cancelRef}
          >
            {created ? "Done" : "Cancel"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
