import { implement } from "../contract";
import {
  getContentDetailsOperation,
  updateDescriptionOperation,
} from "../schemas/contentDetailsContract";
import { getContentDetails, updateDescription } from "../query/activity";

export const contentDetailsOperations = [
  implement(getContentDetailsOperation, getContentDetails),
  implement(updateDescriptionOperation, updateDescription),
];
