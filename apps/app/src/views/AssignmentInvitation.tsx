import { RefObject, useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Center,
  Box,
  Flex,
  Text,
} from "@chakra-ui/react";
import { QRCode } from "react-qrcode-logo";
import { AssignmentStatus } from "../types";
import { MdOutlineContentCopy } from "react-icons/md";

export function AssignmentInvitation({
  isOpen,
  onClose,
  finalFocusRef,
  classCode,
  assignmentName,
  assignmentStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  classCode: string;
  assignmentName: string;
  assignmentStatus: AssignmentStatus;
}) {
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    setUrlCopied(false);
  }, [isOpen]);

  const baseUrl = window.location.protocol + "//" + window.location.host;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="full"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={50} textAlign="center">
          {assignmentName}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody fontSize={30}>
          {assignmentStatus === "Open" ? (
            <Flex justifyContent="center">
              <Box width="500px">
                <Text mt="0">To view this assignment, go to </Text>
                <Center fontSize={40} mt="15px">
                  <code>
                    {baseUrl}/code/{classCode}
                  </code>
                </Center>
                <Text mt="15px" mb="5px">
                  or scan the QR code.
                </Text>
                <Center>
                  <QRCode
                    value={`${baseUrl}/code/${classCode}`}
                    logoImage={"/Doenet_Logo_Frontpage.png"}
                    removeQrCodeBehindLogo
                    logoPaddingStyle="circle"
                    logoWidth={100}
                    size={300}
                    style={{ maxWidth: "100%" }}
                    ecLevel="Q"
                  />
                </Center>
              </Box>
            </Flex>
          ) : (
            <p>The activity is not available.</p>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            leftIcon={<MdOutlineContentCopy />}
            marginRight="10px"
            onClick={() => {
              navigator.clipboard.writeText(`${baseUrl}/code/${classCode}`);
              setUrlCopied(true);
            }}
          >
            {urlCopied ? "URL copied" : "Copy URL"}
          </Button>

          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
