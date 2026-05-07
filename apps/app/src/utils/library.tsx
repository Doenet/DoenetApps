import { LibraryStatus } from "../types";

import { Text } from "@chakra-ui/react";

export function getLibraryStatusStylized(status: LibraryStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Text fontWeight="bold" as="span" color="blue">
          pending
        </Text>
      );
    case "UNDER_REVIEW":
      return (
        <Text fontWeight="bold" as="span" color="orange.600">
          under review
        </Text>
      );
    case "REJECTED":
      return (
        <Text fontWeight="bold" as="span" color="black">
          rejected
        </Text>
      );
    case "PUBLISHED":
      return (
        <Text fontWeight="bold" as="span" color="green">
          published
        </Text>
      );
    default:
      return null;
  }
}

export function getLibraryStatusDescription(status: LibraryStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Text>
          Your request is pending. One of our Doenet editors will get to it
          shortly.
        </Text>
      );
    case "UNDER_REVIEW":
      return (
        <Text>
          Your request is under review by the Doenet editors. You will be
          notified when the review is complete.
        </Text>
      );
    case "REJECTED":
      return (
        <Text>
          Your request has been rejected. Please see the comments provided by
          the reviewers.
        </Text>
      );
    case "PUBLISHED":
      return (
        <Text>
          Congratulations, your activity has been published in the Doenet
          Library! It will now appear in the <Text as="em">Curated</Text> tab on
          Explore.
        </Text>
      );
    default:
      return null;
  }
}
