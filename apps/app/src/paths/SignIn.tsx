import { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  Show,
} from "@chakra-ui/react";
import { ActionFunctionArgs, Form, redirect } from "react-router";
import { useNavigate } from "react-router";
import "../google-signin.css";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const formObj = Object.fromEntries(formData);

  if (formObj._action === "login email") {
    axios.post("/api/auth/magiclink", {
      email: formObj.email,
    });
  } else if (formObj._action === "login handle") {
    try {
      await axios.post("/api/login/handle", {
        username: formObj.username,
        password: formObj.password,
      });
      return redirect(`/`);
    } catch (_e) {
      alert("Could not log in with provided username and password");
      console.log("error logging in", _e);
    }
  } else {
    throw new Error("Invalid action");
  }

  return null;
}

export function SignIn() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  // const [username, setUsername] = useState("");
  // const [password, setPassword] = useState("");

  const navigate = useNavigate();

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
        <Box>
          {formSubmitted ? (
            <>
              <Heading fontSize="large" marginBottom="20px" textAlign="center">
                Email sent
              </Heading>
              <Box width="300px">
                <Box>
                  Email sent to <em>{email}</em>.
                </Box>
                <Box marginTop="20px">
                  Check your inbox for a link to continue.
                </Box>

                <Button
                  marginTop="20px"
                  onClick={() => {
                    navigate("/");
                  }}
                >
                  Back to Home
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Heading fontSize="large" marginBottom="20px" textAlign="center">
                Sign up or log in
              </Heading>

              <Form
                method="post"
                onSubmit={() => {
                  setFormSubmitted(true);
                }}
              >
                <input type="hidden" name="_action" value="login email" />
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    data-test="email input"
                    placeholder="Email Address"
                    width="300px"
                    isRequired={true}
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  ></Input>
                </FormControl>
                {/* <FormControl marginTop="10px">
                  <Checkbox name="stay">Stay logged in</Checkbox>
                </FormControl> */}
                <Button
                  type="submit"
                  data-test="sendEmailButton"
                  marginTop="10px"
                  colorScheme="blue"
                  width="300px"
                >
                  Sign up/Log in
                </Button>
              </Form>

              <Flex
                marginTop="20px"
                marginBottom="20px"
                width="300px"
                justifyContent="center"
              >
                or
              </Flex>

              <button
                className="gsi-material-button"
                onClick={() => {
                  document.location = "/api/login/google";
                }}
                style={{ width: "300px" }}
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                      style={{ display: "block" }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    Sign in with Google
                  </span>
                  <span style={{ display: "none" }}>Sign in with Google</span>
                </div>
              </button>
            </>
          )}
          {/* <Heading>TEST: student login</Heading>
          <Form
            method="post"
            onSubmit={() => {
              setFormSubmitted(true);
            }}
          >
            <FormControl>
              <input type="hidden" name="_action" value="login handle" />
              <FormLabel>Username</FormLabel>
              <Input
                data-test="username input"
                placeholder="Username"
                width="300px"
                isRequired={true}
                type="text"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              ></Input>
            </FormControl>
            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                data-test="password input"
                placeholder="Password"
                width="300px"
                isRequired={true}
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              ></Input>
            </FormControl>
            <Button
              type="submit"
              data-test="sendEmailButton"
              marginTop="10px"
              colorScheme="blue"
              width="300px"
            >
              Sign up/Log in
            </Button>
          </Form> */}
        </Box>
      </HStack>
    </Flex>
  );
}
