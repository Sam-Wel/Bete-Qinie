import { Redirect } from "expo-router";

// Adding a word moved to /admin/dictionary/new; old links still land there.
export default function AddWordMoved() {
  return <Redirect href="/admin/dictionary/new" />;
}
