import { useState, useEffect, JSX } from "react";
import { useLoaderData } from "react-router";
import axios from "axios";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Show,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "react-router";

export async function loader({ request }: { request: any }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  return { token };
}

export function ConfirmSignIn() {
  const { token } = useLoaderData();

  const navigate = useNavigate();

  const [errorConfirming, setErrorConfirm] = useState(false);

  useEffect(() => {
    document.body.style.cursor = "wait";

    axios
      .get("/api/login/magiclink", {
        params: { token },
      })
      .then(({ data }) => {
        document.body.style.cursor = "default";

        if (data.user.lastNames === "") {
          navigate("/changeName?redirect=/");
        } else {
          navigate("/");
        }
      })
      .catch((_e) => {
        document.body.style.cursor = "default";
        setErrorConfirm(true);
      });
  }, [navigate, token]);

  let content: JSX.Element;

  if (errorConfirming) {
    content = (
      <>
        <Heading fontSize="large" marginBottom="20px" textAlign="center">
          Error confirming sign up/log in
        </Heading>

        <Box marginBottom="20px">This link is invalid or has expired.</Box>
        <Box width="300px">
          <Button
            width="145px"
            marginRight="10px"
            colorScheme="blue"
            onClick={() => {
              navigate("/");
            }}
          >
            Back to Home
          </Button>
          <Button
            width="145px"
            colorScheme="blue"
            onClick={() => {
              navigate("/signIn");
            }}
          >
            Sign up/log in
          </Button>
        </Box>
      </>
    );
  } else {
    content = (
      <Heading fontSize="large" marginBottom="20px" textAlign="center">
        <Spinner size="sm" marginRight="10px" /> Verifying sign up/log in...
      </Heading>
    );
  }

  return (
    <Flex
      justifyContent="center"
      direction="column"
      alignItems="center"
      marginTop="5vh"
    >
      <HStack marginTop="20px">
        <Show above="sm">
          <Image
            width={{ sm: "150px", md: "250px" }}
            height={{ sm: "150px", md: "250px" }}
            marginRight={{ sm: "10px", md: "30px" }}
            alt="Doenet Logo"
            src={"/Doenet_Logo_Frontpage.png"}
          />
        </Show>
        <Box>{content}</Box>
      </HStack>
    </Flex>
  );
}
