import {
  Container,
  Button,
  Heading,
  Text,
  VStack,
  Box,
} from "@chakra-ui/react";

import { useNavigate, useRouteError } from "react-router";

export function ErrorContent({
  error,
  onNavigateHome,
  onNavigateBack,
}: {
  error: any;
  onNavigateHome: () => void;
  onNavigateBack: () => void;
}) {
  const status = error?.response?.status;
  const isAccessError = !error?.response || status === 404 || status === 403;

  if (isAccessError) {
    return (
      <Container padding="70px 0" textAlign="center" maxWidth="800px">
        <Heading data-test="Error Heading" size="xl" mb={4}>
          This content isn&apos;t available
        </Heading>
        <Text fontSize="lg" mb={3}>
          The page you&apos;re looking for either doesn&apos;t exist or you
          don&apos;t have permission to view it.
        </Text>
        <Box
          bg="blue.50"
          border="1px"
          borderColor="blue.200"
          borderRadius="md"
          p={4}
          mb={6}
          textAlign="left"
        >
          <Text fontWeight="semibold" mb={2}>
            What you can do:
          </Text>
          <Text mb={1}>
            • If someone shared a link with you, the content may be private.
            Contact the author and ask them to make it publicly accessible.
          </Text>
          <Text mb={1}>
            • Make sure you&apos;re signed in to the correct account — you may
            need a different account to access this content.
          </Text>
          <Text>• Double-check the link to make sure it&apos;s correct.</Text>
        </Box>
        <VStack spacing={3}>
          <Button colorScheme="blue" size="lg" onClick={onNavigateHome}>
            Go to Homepage
          </Button>
          <Button variant="outline" onClick={onNavigateBack}>
            Go Back
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container padding="70px 0" textAlign="center" maxWidth="800px">
      <Heading data-test="Error Heading" size="xl" mb={4}>
        Something went wrong
      </Heading>
      <Text fontSize="lg" mb={6}>
        We ran into an unexpected error. Please try again, or return to the
        homepage.
      </Text>
      <Button colorScheme="blue" size="lg" onClick={onNavigateHome}>
        Go to Homepage
      </Button>
    </Container>
  );
}

function ErrorPage() {
  const navigate = useNavigate();
  const error: any = useRouteError();
  console.error(error);

  return (
    <ErrorContent
      error={error}
      onNavigateHome={() => navigate("/")}
      onNavigateBack={() => navigate(-1)}
    />
  );
}

export default ErrorPage;
