import { useState } from "react";
import * as id from "../api/identity";

function short(t?: string) {
  if (!t) return "";
  return t.length > 18 ? `${t.slice(0, 10)}...${t.slice(-6)}` : t;
}

export function AuthSmokeTest() {
  const [tenantId, setTenantId] = useState(import.meta.env.VITE_TENANT_ID ?? "lasplebes");
  const [email, setEmail] = useState("admin@lasplebes.mx");
  const [password, setPassword] = useState("Admin123!");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setLoading(true);
    setOut(null);
    try {
      const res = await id.login({ email, password }, tenantId);
      const me = await id.me();
      setOut({
        login: { ...res, accessToken: short(res.accessToken) },
        me,
      });
    } catch (e: any) {
      setOut({ error: e, req: e?._req });
      console.error("AuthSmokeTest error", e);
    } finally {
      setLoading(false);
    }
  };

  const doLogout = async () => {
    setLoading(true);
    try {
      await id.logout();
      setOut({ ok: true, msg: "logged out" });
    } catch (e: any) {
      setOut({ error: e });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-xl space-y-3 max-w-lg">
      <div className="font-semibold">Auth Smoke Test</div>

      <div className="grid grid-cols-1 gap-2">
        <input className="border rounded p-2" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant" />
        <input className="border rounded p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="border rounded p-2" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 rounded bg-black text-white disabled:opacity-50" onClick={doLogin} disabled={loading}>
          Login → Me
        </button>
        <button className="px-3 py-2 rounded border disabled:opacity-50" onClick={doLogout} disabled={loading}>
          Logout
        </button>
      </div>

      <pre className="text-xs bg-neutral-50 border rounded p-3 overflow-auto">
        {out ? JSON.stringify(out, null, 2) : "—"}
      </pre>
    </div>
  );
}
