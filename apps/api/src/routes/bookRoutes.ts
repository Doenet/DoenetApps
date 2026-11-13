import { implement } from "../contract";
import { getBookPage, getBookToc, setIsBook } from "../query/book";
import {
  getBookPageOperation,
  getBookTocOperation,
  setIsBookOperation,
} from "../schemas/bookContract";

export const bookOperations = [
  implement(setIsBookOperation, setIsBook),
  implement(getBookTocOperation, getBookToc),
  implement(getBookPageOperation, getBookPage),
];
