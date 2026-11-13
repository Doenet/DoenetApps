import { implement } from "../contract";
import { getBookToc, setIsBook } from "../query/book";
import {
  getBookTocOperation,
  setIsBookOperation,
} from "../schemas/bookContract";

export const bookOperations = [
  implement(setIsBookOperation, setIsBook),
  implement(getBookTocOperation, getBookToc),
];
