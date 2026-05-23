import {
  Button,
  ButtonGroup,
  Container,
  Heading,
  Text,
} from "@chakra-ui/react";

import {
  Link as ReactRouterLink,
  useNavigate,
  useRouteError,
} from "react-router";

const mouthSad =
  "M 23.485 28.879 C 23.474 28.835 22.34 24.5 18 24.5 S 12.526 28.835 12.515 28.879 C 12.462 29.092 12.559 29.31 12.747 29.423 C 12.935 29.535 13.18 29.509 13.343 29.363 C 13.352 29.355 14.356 28.5 18 28.5 C 21.59 28.5 22.617 29.33 22.656 29.363 C 22.751 29.453 22.875 29.5 23 29.5 C 23.084 29.5 23.169 29.479 23.246 29.436 C 23.442 29.324 23.54 29.097 23.485 28.879 Z";

const leftEyeSad =
  "M 11.226 15.512 C 10.909 15.512 10.59 15.551 10.279 15.628 C 7.409 16.335 6.766 19.749 6.74 19.895 C 6.7 20.118 6.816 20.338 7.021 20.435 C 7.088 20.466 7.161 20.482 7.232 20.482 C 7.377 20.482 7.519 20.419 7.617 20.302 C 7.627 20.29 8.627 19.124 10.996 18.541 C 11.71 18.365 12.408 18.276 13.069 18.276 C 14.173 18.276 14.801 18.529 14.804 18.53 C 14.871 18.558 14.935 18.57 15.011 18.57 C 15.283 18.582 15.52 18.349 15.52 18.07 C 15.52 17.905 15.44 17.759 15.317 17.668 C 14.95 17.233 13.364 15.512 11.226 15.512 Z";

const rightEyeSad =
  "M 24.774 15.512 C 25.091 15.512 25.41 15.551 25.721 15.628 C 28.591 16.335 29.234 19.749 29.26 19.895 C 29.3 20.118 29.184 20.338 28.979 20.435 C 28.912 20.466 28.839 20.482 28.768 20.482 C 28.623 20.482 28.481 20.419 28.383 20.302 C 28.373 20.29 27.373 19.124 25.004 18.541 C 24.29 18.365 23.592 18.276 22.931 18.276 C 21.827 18.276 21.2 18.529 21.196 18.53 C 21.129 18.558 21.065 18.57 20.99 18.57 C 20.718 18.582 20.481 18.349 20.481 18.07 C 20.481 17.905 20.561 17.759 20.684 17.668 C 21.05 17.233 22.636 15.512 24.774 15.512 Z";

function ErrorPage() {
  const navigate = useNavigate();
  const error: any = useRouteError();
  console.error(error);

  const isNotFoundOrForbidden =
    !error.response ||
    error.response.status === 404 ||
    error.response.status === 403;

  return (
    <Container padding="70px 0" textAlign="center" maxWidth="800px">
      {isNotFoundOrForbidden ? (
        <>
          <Heading data-test="Error Heading">Page Not Available</Heading>
          <Text mt={4}>
            This page doesn&apos;t exist, or the content hasn&apos;t been shared
            with you.
          </Text>
          <Text mt={2}>
            If someone shared this link with you, ask them to make the content
            public so you can view it.
          </Text>
        </>
      ) : (
        <>
          <Heading data-test="Error Heading">Something Went Wrong</Heading>
          <Text mt={4}>
            We encountered an unexpected error. Please try again later.
          </Text>
        </>
      )}
      <Container centerContent padding="36px">
        <svg
          width="240"
          height="240"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="18" cy="18" r="18" fill="#eea177" />
          <circle cx="18" cy="18" r="15" fill="#6d4445" />
          <circle cx="18" cy="18" r="6" fill="white" />
          <path d={rightEyeSad} fill={"black"} />
          <path d={leftEyeSad} fill={"black"} />
          <path d={mouthSad} fill={"black"} />
        </svg>
      </Container>
      <ButtonGroup gap={2}>
        <Button
          colorScheme="blue"
          onClick={() => {
            navigate("/");
          }}
        >
          Back to Home
        </Button>
        {isNotFoundOrForbidden && (
          <Button
            as={ReactRouterLink}
            to="/explore"
            colorScheme="blue"
            variant="outline"
          >
            Browse Public Content
          </Button>
        )}
      </ButtonGroup>
    </Container>
  );
}

export default ErrorPage;
