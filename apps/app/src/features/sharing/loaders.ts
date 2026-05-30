import axios from "axios";

/**
 * Route loader for the share-status snapshot consumed by the sharing feature.
 *
 * This is the common data source used by both the share modal and editor-level
 * sharing controls.
 */
export async function loadShareStatus({ params }: { params: any }) {
  const { data } = await axios.get(
    `/api/editor/getEditorShareStatus/${params.contentId}`,
  );
  return data;
}
