import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_HAREG, DEFAULT_TABLES, resolveMeters } from "../lib/keneMeters";

// Stored rows override the bundled rules by id. A missing row, an empty table or a failed
// request all leave the compiled defaults in place, so the page is never blank.
function merge(rows) {
  const tables = { ...DEFAULT_TABLES };
  const hareg = { ...DEFAULT_HAREG };

  for (const row of rows ?? []) {
    if (row.kind === "table" && row.payload) {
      tables[row.id] = { id: row.id, name: row.name, ...row.payload };
    } else if (row.kind === "hareg" && row.payload?.options) {
      hareg[row.id] = { id: row.id, name: row.name, options: row.payload.options };
    }
  }

  return { tables, hareg };
}

export function useKeneMeters() {
  const [state, setState] = useState(() => ({
    ...merge([]),
    meters: resolveMeters(),
    overridden: [],
    loading: true,
    error: null,
  }));

  const load = useCallback(async (stillWanted = () => true) => {
    // A missing table returns an error object, but a dropped connection rejects outright.
    // Either way the bundled rules are still correct, so never leave the caller loading.
    let data = null;
    let error = null;
    try {
      ({ data, error } = await supabase.from("kene_measures").select("id, kind, name, payload"));
    } catch (thrown) {
      error = { message: thrown?.message ?? "Could not reach the server." };
    }
    if (!stillWanted()) return;

    const { tables, hareg } = merge(error ? [] : data);
    setState({
      tables,
      hareg,
      meters: resolveMeters(tables, hareg),
      overridden: error ? [] : (data ?? []).map((row) => row.id),
      loading: false,
      error: error?.message ?? null,
    });
  }, []);

  // A slow request must not overwrite a newer one, or a reply after unmount.
  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  return { ...state, refresh: load };
}
