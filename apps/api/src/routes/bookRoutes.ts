import { implement } from "../contract";
import {
  getBookPage,
  getBookToc,
  getContainingBook,
  setIsBook,
} from "../query/book";
import {
  getBookPageOperation,
  getBookTocOperation,
  getContainingBookOperation,
  setIsBookOperation,
} from "../schemas/bookContract";

export const bookOperations = [
  implement(setIsBookOperation, setIsBook),
  implement(getBookTocOperation, getBookToc),
  implement(getBookPageOperation, getBookPage),
  implement(getContainingBookOperation, getContainingBook),
];
