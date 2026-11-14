import { Redirect, useLocalSearchParams } from "expo-router";

// Editing a word moved to /admin/dictionary/[id]; old links still land there.
export default function UpdateWordMoved() {
  const { id } = useLocalSearchParams();
  return <Redirect href={`/admin/dictionary/${id}`} />;
}
