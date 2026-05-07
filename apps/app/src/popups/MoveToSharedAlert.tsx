import {
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Heading,
  Box,
} from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";

export default function MoveToSharedAlert({
  isOpen,
  onClose,
  performMove,
  parentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  performMove: () => void;
  parentName: string | null;
}) {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader data-test="Confirm Header">
            <Heading noOfLines={1} size="lg">
              <WarningIcon color="orange.500" /> Confirm move to shared parent
            </Heading>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody data-test="Confirm Body">
            <Box>
              The target location
              <Text
                noOfLines={1}
                textAlign="center"
                fontWeight={800}
                fontStyle="italic"
              >
                {parentName}
              </Text>
              is shared.
            </Box>
            <Text style={{ marginTop: "10px" }}>
              Moving here will share the content with the same people.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button data-test="Back Button" mr={3} onClick={onClose}>
              Back
            </Button>
            <Button
              data-test="Confirm Button"
              onClick={() => {
                performMove();
                onClose();
              }}
            >
              Confirm Move
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
