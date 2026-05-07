import { useFetcher, useLoaderData } from "react-router";
import axios from "axios";
import { ProblemSet } from "../../types";
import { CompoundActivityEditor } from "../../views/CompoundActivityEditor";

export async function loader({ params }: { params: any }) {
  const {
    data: { content },
  } = await axios.get(`/api/editor/getCompoundEditorEdit/${params.contentId}`);
  return { content };
}

/**
 * This page allows you to edit your compound activity (e.g. problem set) by renaming items or changing the ordering.
 * Context: `compoundEditor`
 */
export function CompoundEditorEditMode() {
  const { content: activity } = useLoaderData() as { content: ProblemSet };
  const fetcher = useFetcher();
  const createContentMenuCreateFetcher = useFetcher();
  const createContentMenuSaveNameFetcher = useFetcher();
  const deleteContentFetcher = useFetcher();

  return (
    <CompoundActivityEditor
      activity={activity}
      fetcher={fetcher}
      createContentMenuCreateFetcher={createContentMenuCreateFetcher}
      createContentMenuSaveNameFetcher={createContentMenuSaveNameFetcher}
      deleteContentFetcher={deleteContentFetcher}
    />
  );
}
