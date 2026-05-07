import {
  Icon,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
} from "@chakra-ui/react";
import { FormEventHandler, ChangeEventHandler } from "react";
import { IoSearchSharp } from "react-icons/io5";

export default function Searchbar({
  name = "q",
  value,
  dataTest,
  onInput,
  onChange,
}: {
  name?: string;
  value: string;
  dataTest?: string;
  onInput?: FormEventHandler<HTMLInputElement>;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <>
      <InputGroup borderLeftRadius={5} size="sm">
        <InputLeftElement pointerEvents="none">
          <Icon as={IoSearchSharp} color="gray.600" />
        </InputLeftElement>
        <Input
          type="search"
          placeholder="Search..."
          border="1px solid #949494"
          borderLeftRadius={5}
          name={name}
          data-test={dataTest}
          value={value}
          onInput={onInput}
          onChange={onChange}
        />
        <InputRightAddon
          p={0}
          border="none"
          borderLeftRadius={0}
          borderRightRadius={5}
        >
          <Button
            type="submit"
            size="sm"
            colorScheme="blue"
            borderLeftRadius={0}
            borderRightRadius={5}
          >
            Search
          </Button>
        </InputRightAddon>
      </InputGroup>
    </>
  );
}
