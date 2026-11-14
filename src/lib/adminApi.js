import { supabase } from "./supabaseClient";

// The admin pages talk to the database through the functions in
// supabase/admin_tools.sql. Their errors, in plain words.
export function adminError(error) {
  if (!error) return null;
  const text = `${error.message || ""} ${error.details || ""}`;
  if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code) || /Could not find the (function|table)/.test(text)) {
    return "This needs supabase/admin_tools.sql: run it once in the Supabase SQL editor.";
  }
  if (error.code === "42501" && !/^Only /.test(error.message || "")) return "Your account can't do this.";
  return error.message || "Something went wrong. Try again.";
}

export async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(adminError(error));
  return data;
}

// Short dates and times for lists.
export const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export function ago(value, now = Date.now()) {
  if (!value) return "never";
  const minutes = Math.round((now - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(value);
}

// Saves text as a file in the browser (the admin pages run on the web).
export function downloadText(filename, text, type = "application/json") {
  if (typeof document === "undefined") return false;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
