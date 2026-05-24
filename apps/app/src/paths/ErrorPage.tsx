import { ReactNode } from "react";
import { Container, Button, Heading, Text, VStack } from "@chakra-ui/react";

import { useNavigate, useRouteError } from "react-router";

function ErrorPage() {
  const navigate = useNavigate();
  const error: any = useRouteError();
  console.error(error);

  const status: number | undefined = error?.response?.status;

  let heading: string;
  let description: ReactNode;
  let actions: ReactNode;

  if (!error?.response || status === 404) {
    heading = "Page not available";
    description = (
      <Text>
        The content you&apos;re looking for may be private, deleted, or the link
        may be incorrect. If someone shared this link with you, ask them to make
        the content public or share it with you directly.
      </Text>
    );
    actions = (
      <>
        <Button
          colorScheme="blue"
          onClick={() => {
            navigate("/");
          }}
        >
          Back to Home
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigate("/explore");
          }}
        >
          Browse public content
        </Button>
      </>
    );
  } else if (status === 403) {
    heading = "Access denied";
    description = (
      <Text>
        You don&apos;t have permission to view this content. Try signing in, or
        ask the author to share it with you.
      </Text>
    );
    actions = (
      <>
        <Button
          colorScheme="blue"
          onClick={() => {
            navigate("/signIn");
          }}
        >
          Sign in
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigate("/");
          }}
        >
          Back to Home
        </Button>
      </>
    );
  } else {
    heading = "Something went wrong";
    description = (
      <Text>
        We encountered an unexpected error. Please try again or go back to the
        home page.
      </Text>
    );
    actions = (
      <>
        <Button
          colorScheme="blue"
          onClick={() => {
            navigate(-1);
          }}
        >
          Go back
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigate("/");
          }}
        >
          Back to Home
        </Button>
      </>
    );
  }

  return (
    <Container padding="70px 0" textAlign="center" maxWidth="800px">
      <Heading data-test="Error Message">{heading}</Heading>
      <VStack spacing={4} mt={4}>
        {description}
        <VStack spacing={2}>{actions}</VStack>
      </VStack>
    </Container>
  );
}

export default ErrorPage;
