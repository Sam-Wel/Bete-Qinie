import { useCallback, useEffect, useRef, useState } from "react";
import { rpc } from "../lib/adminApi";

// Loads one database function's result for an admin page: { data, error, loading, reload }.
// A newer call wins if an older one returns late.
export function useRpc(name, args, { skip = false } = {}) {
  const key = JSON.stringify(args ?? {});
  const [state, setState] = useState({ data: null, error: null, loading: !skip });
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await rpc(name, JSON.parse(key));
      if (n === seq.current) setState({ data, error: null, loading: false });
    } catch (e) {
      if (n === seq.current) setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, [name, key]);

  useEffect(() => {
    if (!skip) load();
  }, [load, skip]);

  return { ...state, reload: load };
}
