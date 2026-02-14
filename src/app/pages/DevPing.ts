import { useEffect } from "react";
import { apiFetch } from "../../api/http";

export function DevPing() {
  useEffect(() => {
    apiFetch("/health", { auth: false })
      .then((r) => console.log("health:", r))
      .catch((e) => console.error("health err:", e));
  }, []);

  return <div className="p-6">Ping...</div>;
}
