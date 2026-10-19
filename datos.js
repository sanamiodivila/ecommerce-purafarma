/* Conexión de las páginas con la API de Purafarma (Neon).
   Ofrece la misma forma que la base de claude.ai — collection(x).get(), onSnapshot(), doc(id).set/update/delete —
   para que portada, catálogo y backoffice usen el mismo código con cualquiera de las dos bases. */
(() => {
const API = "https://br-bold-surf-ae4ctdc9-api.compute.c-2.us-east-2.aws.neon.tech";
const KEY = "pf-sesion";

const leerToken = () => { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } };
const guardarToken = t => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch (e) {} };

async function pedir(path, opts){
  opts = opts || {};
  const headers = Object.assign({}, opts.headers);
  const t = leerToken(); if (t) headers.Authorization = "Bearer " + t;
  let body = opts.body;
  if (body && !(body instanceof Blob) && typeof body !== "string"){ body = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
  let r;
  try { r = await fetch(API + path, { method: opts.method || "GET", headers, body, cache: "no-store" }); }
  catch (e) { throw Object.assign(new Error("Sin conexión con la base. Probá de nuevo en unos segundos."), { code: "unavailable" }); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok){
    if (r.status === 401 && t && path !== "/v1/ingresar") guardarToken("");
    throw Object.assign(new Error(data.error || "No se pudo completar. Probá de nuevo."), { status: r.status, code: r.status === 401 ? "unauthenticated" : r.status >= 500 ? "unavailable" : "invalid" });
  }
  return data;
}

/* Base con la forma de claude.ai. Los cambios se ven al instante en esta pestaña y se consultan cada tanto para ver los de otros. */
function crearDb(cadaSeg){
  const subs = {};
  const snap = arr => ({ docs: arr.map(x => ({ id: x.id, data: () => { const { id, ...rest } = x; return rest; } })) });
  const leer = col => pedir("/v1/datos/" + col).then(snap);
  const avisar = col => (subs[col] || []).forEach(s => s.tick());
  const doc = (col, id) => ({
    set: data => pedir(`/v1/datos/${col}/${encodeURIComponent(id)}`, { method: "PUT", body: data }).then(r => (avisar(col), r)),
    update: data => pedir(`/v1/datos/${col}/${encodeURIComponent(id)}`, { method: "PATCH", body: data }).then(r => (avisar(col), r)),
    delete: () => pedir(`/v1/datos/${col}/${encodeURIComponent(id)}`, { method: "DELETE" }).then(r => (avisar(col), r)),
  });
  return {
    collection: col => ({
      get: () => leer(col),
      doc: id => doc(col, id),
      onSnapshot(onData, onErr){
        let vivo = true, timer = null;
        const s = { tick(){ clearTimeout(timer); leer(col).then(x => { if (vivo) onData(x); }, e => { if (vivo && onErr) onErr(e); }).finally(() => { if (vivo && cadaSeg) timer = setTimeout(() => s.tick(), cadaSeg * 1000); }); } };
        (subs[col] = subs[col] || []).push(s); s.tick();
        const visible = () => { if (document.visibilityState === "visible") s.tick(); };
        document.addEventListener("visibilitychange", visible);
        return () => { vivo = false; clearTimeout(timer); document.removeEventListener("visibilitychange", visible); subs[col] = subs[col].filter(x => x !== s); };
      },
    }),
  };
}

window.PuraDatos = {
  API,
  activa: !!API,
  /* Fotos: las de Neon guardan la dirección completa; las de claude.ai, un id que se sirve desde /_blob/ */
  img: id => !id ? "" : /^https?:\/\//.test(id) ? id : "/_blob/" + id,
  db: cadaSeg => crearDb(cadaSeg),
  token: leerToken,
  async ingresar(email, clave){ const r = await pedir("/v1/ingresar", { method: "POST", body: { email, clave } }); guardarToken(r.token); return r.admin; },
  async salir(){ try { await pedir("/v1/salir", { method: "POST" }); } catch (e) {} guardarToken(""); },
  yo: () => pedir("/v1/yo"),
  cambiarClave: (actual, nueva) => pedir("/v1/clave", { method: "POST", body: { actual, nueva } }),
  admins: () => pedir("/v1/admins"),
  crearAdmin: (email, nombre, clave) => pedir("/v1/admins", { method: "POST", body: { email, nombre, clave } }),
  quitarAdmin: id => pedir("/v1/admins/" + id, { method: "DELETE" }),
  subirFoto: blob => pedir("/v1/fotos", { method: "POST", body: blob, headers: { "Content-Type": blob.type || "image/jpeg" } }),
  sincronizar: (filas, modo, crearNuevos) => pedir("/v1/sincronizar", { method: "POST", body: { filas, modo, crearNuevos } }),
  sincronizaciones: () => pedir("/v1/sincronizaciones"),
};
})();
