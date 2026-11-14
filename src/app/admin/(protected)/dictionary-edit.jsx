import { Redirect } from "expo-router";

// The dictionary moved to /admin/dictionary; old links still land there.
export default function DictionaryEditMoved() {
  return <Redirect href="/admin/dictionary" />;
}
