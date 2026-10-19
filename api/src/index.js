/* API de la tienda Purafarma. Corre como Neon Function, al lado de la base.
   - Lectura pública: productos, banners y portada.
   - Escritura, fotos y sincronización: solo administradores con sesión (o el script de Plex con su clave). */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Pool, Client } from "pg";
import { AwsClient } from "aws4fetch";
import { attachDatabasePool } from "@neon/functions";
import { randomBytes, scrypt as _scrypt, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);
const s3 = new AwsClient({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION, service: "s3" });

const BUCKET = process.env.FOTOS_BUCKET || "fotos";
const COLECCIONES = ["productos", "banners", "portada"];
const SESION_DIAS = 30;
const FOTO_MAX = 8 * 1024 * 1024;
const TIPOS_FOTO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

/* ---------- Utilidades ---------- */
const sha256 = s => createHash("sha256").update(s).digest("hex");
const iguales = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const slug = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const CATS = [["dermocosmetica", "Dermocosmética"], ["perfumeria", "Perfumería"], ["cuidado-personal", "Cuidado personal"],
  ["nutricion-deportiva", "Nutrición deportiva"], ["maternidad-bebe", "Maternidad y bebé"], ["farmacia", "Farmacia"]];
const normCat = v => { const s = slug(v); const hit = CATS.find(([id, label]) => id === s || slug(label) === s || s.startsWith(id.split("-")[0])); return hit ? hit[0] : s; };
const toNum = v => { if (v == null || v === "") return null; if (typeof v === "number") return isFinite(v) ? v : null;
  let s = String(v).replace(/[^\d,.-]/g, ""); if (!s) return null;
  if (s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}($|\D)/.test(s) && !s.includes(",")) s = s.replace(/\./g, ""); else s = s.replace(/,/g, "");
  const n = Number(s); return isFinite(n) ? n : null; };
const fuera = (status, error) => Object.assign(new Error(error), { status });

async function hashClave(clave){ const sal = randomBytes(16); const h = await scrypt(clave, sal, 64); return `scrypt$${sal.toString("base64")}$${h.toString("base64")}`; }
async function claveOk(clave, guardada){
  const [alg, sal, h] = String(guardada).split("$"); if (alg !== "scrypt" || !sal || !h) return false;
  const calc = await scrypt(String(clave), Buffer.from(sal, "base64"), 64); const esp = Buffer.from(h, "base64");
  return calc.length === esp.length && timingSafeEqual(calc, esp);
}
const claveValida = c => typeof c === "string" && c.length >= 10;

/* ---------- App ---------- */
const app = new Hono();
// Los permisos van en el encabezado Authorization (no hay cookies), así que se puede abrir CORS a cualquier origen.
app.use("*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], maxAge: 86400 }));
app.onError((e, c) => { if (!e.status) console.error(e); return c.json({ error: e.status ? e.message : "Error interno. Probá de nuevo en unos segundos." }, e.status || 500); });
app.notFound(c => c.json({ error: "No existe esa ruta" }, 404));

const ipDe = c => (c.req.header("x-forwarded-for") || "").split(",")[0].trim();
const tokenDe = c => { const h = c.req.header("authorization") || ""; return h.startsWith("Bearer ") ? h.slice(7).trim() : ""; };

async function adminDe(c){
  const t = tokenDe(c); if (!t) return null;
  const { rows } = await pool.query(
    `select a.id, a.email, a.nombre from tienda.sesiones s join tienda.admins a on a.id = s.admin_id
     where s.token_hash = $1 and s.vence > now() and a.activo`, [sha256(t)]);
  return rows[0] || null;
}
const soloAdmin = async (c, next) => { const a = await adminDe(c); if (!a) throw fuera(401, "Tenés que ingresar al backoffice."); c.set("admin", a); await next(); };
const coleccion = c => { const col = c.req.param("col"); if (!COLECCIONES.includes(col)) throw fuera(404, "Colección desconocida"); return col; };
const idValido = id => { if (!/^[\w.-]{1,120}$/.test(id)) throw fuera(400, "Identificador inválido"); return id; };
async function cuerpo(c){ try { const b = await c.req.json(); if (!b || typeof b !== "object" || Array.isArray(b)) throw 0; return b; } catch { throw fuera(400, "El cuerpo tiene que ser un objeto JSON"); } }
const limpiar = d => { const { id, ...resto } = d; return resto; };

app.get("/", c => c.json({ ok: true, servicio: "API de Purafarma" }));
app.get("/v1/salud", async c => { await pool.query("select 1"); return c.json({ ok: true }); });

/* ---------- Datos ---------- */
app.get("/v1/datos/:col", async c => {
  const col = coleccion(c);
  const { rows } = await pool.query("select id, data from tienda.documentos where coleccion = $1 order by id", [col]);
  c.header("Cache-Control", "no-store");
  return c.json(rows.map(r => ({ ...r.data, id: r.id })));
});
app.put("/v1/datos/:col/:id", soloAdmin, async c => {
  const col = coleccion(c), id = idValido(c.req.param("id")), data = limpiar(await cuerpo(c));
  await pool.query(`insert into tienda.documentos (coleccion, id, data) values ($1, $2, $3)
    on conflict (coleccion, id) do update set data = excluded.data, cambiado_en = now()`, [col, id, data]);
  return c.json({ ok: true, id });
});
app.patch("/v1/datos/:col/:id", soloAdmin, async c => {
  const col = coleccion(c), id = idValido(c.req.param("id")), data = limpiar(await cuerpo(c));
  const r = await pool.query("update tienda.documentos set data = data || $3, cambiado_en = now() where coleccion = $1 and id = $2", [col, id, data]);
  if (!r.rowCount) throw fuera(404, "Ese registro ya no existe");
  return c.json({ ok: true, id });
});
app.delete("/v1/datos/:col/:id", soloAdmin, async c => {
  const col = coleccion(c), id = idValido(c.req.param("id"));
  await pool.query("delete from tienda.documentos where coleccion = $1 and id = $2", [col, id]);
  return c.json({ ok: true });
});

/* ---------- Fotos ---------- */
async function guardarFoto(buf, tipo, key){
  const url = `${String(process.env.AWS_ENDPOINT_URL_S3).replace(/\/+$/, "")}/${BUCKET}/${key}`;
  const r = await s3.fetch(url, { method: "PUT", body: buf, headers: { "Content-Type": tipo, "Cache-Control": "public, max-age=31536000, immutable" } });
  if (!r.ok){ console.error("subida de foto", r.status, await r.text()); throw fuera(502, "No se pudo guardar la foto. Probá de nuevo."); }
  return url;
}
app.post("/v1/fotos", soloAdmin, async c => {
  const tipo = (c.req.header("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = TIPOS_FOTO[tipo]; if (!ext) throw fuera(415, "Formato de foto no soportado. Usá JPG, PNG o WebP.");
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (!buf.length) throw fuera(400, "La foto llegó vacía");
  if (buf.length > FOTO_MAX) throw fuera(413, "La foto pesa más de 8 MB");
  const d = new Date(), key = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(9).toString("base64url")}.${ext}`;
  const url = await guardarFoto(buf, tipo, key);
  return c.json({ id: url, url });
});

/* ---------- Búsqueda de fotos por código de barras ----------
   Consulta las bases abiertas de Open Food Facts (belleza, alimentos y otros productos; fotos con licencia CC BY-SA),
   guarda la foto en el bucket y la asigna al producto. Cada producto se busca una sola vez (queda marcado con fotoBuscada).
   Corre sola cada pocos minutos (Function Trigger) y también se puede lanzar desde el backoffice. */
const FUENTES = [
  ["Open Beauty Facts", "https://world.openbeautyfacts.org"],
  ["Open Food Facts", "https://world.openfoodfacts.org"],
  ["Open Products Facts", "https://world.openproductsfacts.org"],
];
const AGENTE = "PurafarmaTienda/1.0 (https://sanamiodivila.github.io/ecommerce-purafarma/)";
const espera = ms => new Promise(r => setTimeout(r, ms));
const LOTE_FOTOS = 40;

async function pedirJSON(url){
  let r;
  try { r = await fetch(url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(15000) }); }
  catch (e) { throw new Error(`${new URL(url).host}: ${e.cause?.code || e.cause?.message || e.message}`); }
  if (r.status === 404) return null;
  if (r.status === 429) throw Object.assign(new Error("límite de consultas"), { limite: true });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
// Si una fuente falla se sigue con las otras; solo es error si fallaron todas.
async function buscarFotoDe(codigo){
  const fallas = [];
  for (const [fuente, base] of FUENTES){
    let j = null;
    try { j = await pedirJSON(`${base}/api/v2/product/${codigo}.json?fields=image_front_url,image_url`); }
    catch (e) { if (e.limite) throw e; fallas.push(e.message); }
    await espera(700);
    const img = j && j.status === 1 && j.product && (j.product.image_front_url || j.product.image_url);
    if (img) return { fuente, img };
  }
  if (fallas.length === FUENTES.length) throw new Error(fallas.join(" | "));
  return null;
}
async function buscarFotos(limite){
  // Conexión directa (sin el pooler) para que el bloqueo de "una búsqueda a la vez" funcione
  const cli = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
  await cli.connect();
  const res = { revisados: 0, encontradas: 0, sin_foto: 0, errores: 0, pendientes: 0, ocupado: false };
  try {
    // Una sola búsqueda a la vez (el trigger y el botón del backoffice pueden coincidir)
    const { rows: [l] } = await cli.query("select pg_try_advisory_lock(778899) as ok");
    if (!l.ok){ res.ocupado = true; return res; }
    try {
      const { rows } = await cli.query(`select id, data->>'codigo' as codigo, data->>'fotoIntentos' as intentos from tienda.documentos
        where coleccion = 'productos' and coalesce(data->>'imagenId', '') = '' and data->>'fotoBuscada' is null
          and regexp_replace(coalesce(data->>'codigo', ''), '\\s', '', 'g') ~ '^[0-9]{8,14}$'
        order by (data->>'destacado')::boolean desc nulls last, length(regexp_replace(data->>'codigo', '\\s', '', 'g')) = 13 desc, id limit $1`, [limite]);
      for (const p of rows){
        const codigo = p.codigo.replace(/\s/g, "");
        const intentos = Number(p.intentos || 0) + 1;
        let marca = { fotoBuscada: new Date().toISOString() };
        try {
          const hit = await buscarFotoDe(codigo);
          if (hit){
            const r = await fetch(hit.img, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(20000) });
            const tipo = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
            const buf = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
            if (buf && TIPOS_FOTO[tipo] && buf.length > 2000 && buf.length <= FOTO_MAX){
              const url = await guardarFoto(buf, tipo, `codigos/${codigo}.${TIPOS_FOTO[tipo]}`);
              marca = { ...marca, imagenId: url, fotoFuente: hit.fuente };
              res.encontradas++;
            } else res.sin_foto++;
          } else res.sin_foto++;
        } catch (e) {
          if (e.limite){ console.warn("fotos: la fuente pidió esperar; sigo en la próxima tanda"); break; }
          res.errores++; console.warn("fotos:", codigo, e.message);
          // Se reintenta en otra tanda; al tercer error se da por buscado para no trabar la cola
          if (intentos < 3) marca = { fotoIntentos: intentos };
        }
        // Solo completa la foto si mientras tanto nadie cargó una a mano
        if (marca) await cli.query(`update tienda.documentos set data = data || $2, cambiado_en = now()
          where coleccion = 'productos' and id = $1 and coalesce(data->>'imagenId', '') = ''`, [p.id, marca]);
        res.revisados++;
      }
    } finally { await cli.query("select pg_advisory_unlock(778899)"); }
    const { rows: [q] } = await cli.query(`select count(*) as n from tienda.documentos where coleccion = 'productos'
      and coalesce(data->>'imagenId', '') = '' and data->>'fotoBuscada' is null and regexp_replace(coalesce(data->>'codigo', ''), '\\s', '', 'g') ~ '^[0-9]{8,14}$'`);
    res.pendientes = Number(q.n);
  } finally { await cli.end().catch(() => {}); }
  console.log("fotos:", JSON.stringify(res));
  return res;
}
// Llamada programada de Neon (Function Trigger). Neon borra los encabezados X-Neon-* que manda cualquier otro.
app.post("/tareas/fotos", async c => {
  if (!c.req.header("x-neon-trigger-invocation-id")) throw fuera(403, "Solo para la tarea programada");
  return c.json(await buscarFotos(LOTE_FOTOS));
});
app.post("/v1/fotos/buscar", soloAdmin, async c => c.json(await buscarFotos(LOTE_FOTOS)));
app.get("/v1/fotos/estado", soloAdmin, async c => {
  const { rows: [r] } = await pool.query(`select count(*) as total,
      count(*) filter (where coalesce(data->>'imagenId', '') <> '') as con_foto,
      count(*) filter (where data->>'fotoFuente' is not null and coalesce(data->>'imagenId', '') <> '') as automaticas,
      count(*) filter (where coalesce(data->>'imagenId', '') = '' and data->>'fotoBuscada' is not null) as no_encontradas,
      count(*) filter (where coalesce(data->>'imagenId', '') = '' and data->>'fotoBuscada' is null
        and regexp_replace(coalesce(data->>'codigo', ''), '\\s', '', 'g') ~ '^[0-9]{8,14}$') as pendientes
    from tienda.documentos where coleccion = 'productos'`);
  return c.json(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])));
});

/* ---------- Ingreso ---------- */
app.post("/v1/ingresar", async c => {
  const b = await cuerpo(c); const email = String(b.email || "").trim().toLowerCase(), clave = String(b.clave || ""), ip = ipDe(c);
  if (!email || !clave) throw fuera(400, "Completá email y contraseña.");
  const { rows: [lim] } = await pool.query(
    `select count(*) filter (where email = $1) as por_email, count(*) filter (where ip = $2 and $2 <> '') as por_ip
     from tienda.intentos_ingreso where not ok and creado_en > now() - interval '15 minutes'`, [email, ip]);
  if (Number(lim.por_email) >= 8 || Number(lim.por_ip) >= 30) throw fuera(429, "Demasiados intentos. Esperá 15 minutos y probá de nuevo.");
  const { rows: [a] } = await pool.query("select id, email, nombre, clave_hash from tienda.admins where email = $1 and activo", [email]);
  const ok = !!a && await claveOk(clave, a.clave_hash);
  await pool.query("insert into tienda.intentos_ingreso (email, ip, ok) values ($1, $2, $3)", [email, ip, ok]);
  if (!ok) throw fuera(401, "Email o contraseña incorrectos.");
  const token = randomBytes(32).toString("base64url");
  await pool.query(`insert into tienda.sesiones (token_hash, admin_id, vence) values ($1, $2, now() + make_interval(days => $3))`, [sha256(token), a.id, SESION_DIAS]);
  await pool.query("update tienda.admins set ultimo_ingreso = now() where id = $1", [a.id]);
  await pool.query("delete from tienda.sesiones where vence < now()");
  await pool.query("delete from tienda.intentos_ingreso where creado_en < now() - interval '30 days'");
  return c.json({ token, admin: { email: a.email, nombre: a.nombre } });
});
app.post("/v1/salir", async c => { const t = tokenDe(c); if (t) await pool.query("delete from tienda.sesiones where token_hash = $1", [sha256(t)]); return c.json({ ok: true }); });
app.get("/v1/yo", soloAdmin, c => { const a = c.get("admin"); return c.json({ email: a.email, nombre: a.nombre }); });
app.post("/v1/clave", soloAdmin, async c => {
  const a = c.get("admin"), b = await cuerpo(c);
  const { rows: [r] } = await pool.query("select clave_hash from tienda.admins where id = $1", [a.id]);
  if (!(await claveOk(String(b.actual || ""), r.clave_hash))) throw fuera(400, "La contraseña actual no es correcta.");
  if (!claveValida(b.nueva)) throw fuera(400, "La contraseña nueva tiene que tener al menos 10 caracteres.");
  await pool.query("update tienda.admins set clave_hash = $2 where id = $1", [a.id, await hashClave(b.nueva)]);
  await pool.query("delete from tienda.sesiones where admin_id = $1 and token_hash <> $2", [a.id, sha256(tokenDe(c))]);
  return c.json({ ok: true });
});

/* ---------- Administradores ---------- */
app.get("/v1/admins", soloAdmin, async c => {
  const { rows } = await pool.query("select id, email, nombre, ultimo_ingreso from tienda.admins where activo order by email");
  return c.json(rows);
});
app.post("/v1/admins", soloAdmin, async c => {
  const b = await cuerpo(c); const email = String(b.email || "").trim().toLowerCase(), nombre = String(b.nombre || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fuera(400, "El email no es válido.");
  if (!claveValida(b.clave)) throw fuera(400, "La contraseña tiene que tener al menos 10 caracteres.");
  await pool.query(`insert into tienda.admins (email, nombre, clave_hash) values ($1, $2, $3)
    on conflict (email) do update set nombre = excluded.nombre, clave_hash = excluded.clave_hash, activo = true`, [email, nombre, await hashClave(b.clave)]);
  return c.json({ ok: true });
});
app.delete("/v1/admins/:id", soloAdmin, async c => {
  const id = Number(c.req.param("id")); if (id === Number(c.get("admin").id)) throw fuera(400, "No podés quitarte el acceso a vos mismo.");
  await pool.query("update tienda.admins set activo = false where id = $1", [id]);
  await pool.query("delete from tienda.sesiones where admin_id = $1", [id]);
  return c.json({ ok: true });
});

/* ---------- Sincronización con Plex y planillas ----------
   modo "precios": solo actualiza precio, precio anterior y stock de productos que ya existen (lo que usa el script de Plex).
   modo "completo": además actualiza nombre, marca, categoría, etc. y crea los productos nuevos (lo que usa la planilla del backoffice). */
function parseCSV(text){
  text = String(text).replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/)[0] || ""; const d = first.includes("\t") ? "\t" : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++){ const ch = text[i];
    if (q){ if (ch === '"'){ if (text[i + 1] === '"'){ cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === d){ row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r"){ if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch; }
  if (cell || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const COLS = { codigo: ["codigo", "cod", "ean", "sku", "codigo-de-barras", "codbarra", "cod-barra", "codigo-barra", "troquel"], nombre: ["nombre", "producto", "articulo", "descripcion-corta"],
  marca: ["marca", "laboratorio", "lab"], categoria: ["categoria", "rubro", "familia"], precio: ["precio", "precio-venta", "pvp", "precio-de-venta", "precio-publico"],
  precioAnterior: ["precio-anterior", "precio-lista", "antes"], stock: ["stock", "existencia", "cantidad", "stock-actual"], descripcion: ["descripcion", "detalle"], destacado: ["destacado"] };
function filasDeCSV(text){
  const rows = parseCSV(text); if (rows.length < 2) throw fuera(400, "La planilla no tiene filas de productos.");
  const head = rows[0].map(slug), idx = {};
  for (const [k, names] of Object.entries(COLS)){ const i = head.findIndex(h => names.includes(h)); if (i >= 0) idx[k] = i; }
  if (idx.nombre == null && idx.descripcion != null){ idx.nombre = idx.descripcion; delete idx.descripcion; }
  return rows.slice(1).map(r => Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, (r[i] ?? "").trim()])));
}

async function sincronizar({ filas, modo, crearNuevos, origen }){
  const completo = modo === "completo";
  const { rows } = await pool.query("select id, data from tienda.documentos where coleccion = 'productos'");
  const porId = new Map(rows.map(r => [r.id, r.data])), porCodigo = new Map();
  for (const r of rows) if (r.data.codigo) porCodigo.set(slug(r.data.codigo), r.id);
  const cambios = new Map(); const res = { filas: filas.length, actualizados: 0, creados: 0, sin_cambios: 0, ignorados: 0, errores: [] };
  const ahora = Date.now();
  filas.forEach((f, n) => {
    const fila = n + 2, codigo = String(f.codigo ?? "").trim(), nombre = String(f.nombre ?? "").trim();
    const precio = toNum(f.precio), stockN = toNum(f.stock), antes = toNum(f.precioAnterior);
    const id = (codigo && porCodigo.get(slug(codigo))) || (codigo ? "c-" + slug(codigo) : nombre ? "p-" + slug(nombre).slice(0, 60) : "");
    if (!id){ res.ignorados++; res.errores.push({ fila, motivo: "sin código ni nombre" }); return; }
    if (precio != null && !(precio > 0)){ res.ignorados++; res.errores.push({ fila, codigo, motivo: "precio inválido" }); return; }
    const viejo = cambios.get(id) || porId.get(id);
    if (!viejo){
      if (!completo && !crearNuevos){ res.ignorados++; return; }
      if (!nombre || !(precio > 0)){ res.ignorados++; res.errores.push({ fila, codigo, motivo: "producto nuevo sin nombre o precio" }); return; }
      cambios.set(id, { nombre, marca: String(f.marca ?? "").trim(), categoria: normCat(f.categoria || "farmacia"), precio, precioAnterior: antes || null,
        stock: stockN != null ? Math.max(0, Math.round(stockN)) : 0, codigo, descripcion: String(f.descripcion ?? "").trim(),
        destacado: /^(si|sí|1|x|true)$/i.test(String(f.destacado ?? "")), imagenId: null, creado: ahora - n, ejemplo: false });
      res.creados++; return;
    }
    const nuevo = { ...viejo };
    if (precio != null) nuevo.precio = precio;
    if (f.precioAnterior !== undefined) nuevo.precioAnterior = antes || null;
    if (stockN != null) nuevo.stock = Math.max(0, Math.round(stockN));
    if (completo){
      if (nombre) nuevo.nombre = nombre;
      if (f.marca) nuevo.marca = String(f.marca).trim();
      if (f.categoria) nuevo.categoria = normCat(f.categoria);
      if (codigo) nuevo.codigo = codigo;
      if (f.descripcion) nuevo.descripcion = String(f.descripcion).trim();
      if (/^(si|sí|1|x|true)$/i.test(String(f.destacado ?? ""))) nuevo.destacado = true;
      nuevo.ejemplo = false;
    }
    if (JSON.stringify(nuevo) === JSON.stringify(viejo)){ if (!cambios.has(id)) res.sin_cambios++; return; }
    if (!cambios.has(id)) res.actualizados++;
    cambios.set(id, nuevo);
  });
  if (cambios.size){
    const lote = [...cambios].map(([id, data]) => ({ id, data }));
    await pool.query(`insert into tienda.documentos (coleccion, id, data)
      select 'productos', x->>'id', x->'data' from jsonb_array_elements($1::jsonb) x
      on conflict (coleccion, id) do update set data = excluded.data, cambiado_en = now()`, [JSON.stringify(lote)]);
  }
  res.errores = res.errores.slice(0, 200);
  await pool.query(`insert into tienda.sincronizaciones (origen, filas, actualizados, creados, sin_cambios, ignorados, errores) values ($1,$2,$3,$4,$5,$6,$7)`,
    [origen, res.filas, res.actualizados, res.creados, res.sin_cambios, res.ignorados, JSON.stringify(res.errores)]);
  return res;
}

app.post("/v1/sincronizar", async c => {
  const plex = process.env.PLEX_TOKEN && tokenDe(c) && iguales(tokenDe(c), process.env.PLEX_TOKEN);
  if (!plex && !(await adminDe(c))) throw fuera(401, "Falta la clave de sincronización o una sesión de administrador.");
  const tipo = (c.req.header("content-type") || "").toLowerCase();
  let filas, modo = c.req.query("modo") || "precios", crearNuevos = c.req.query("crear") === "1";
  if (tipo.includes("json")){ const b = await cuerpo(c); filas = b.filas; modo = b.modo || modo; crearNuevos = b.crearNuevos ?? crearNuevos; }
  else { const buf = Buffer.from(await c.req.arrayBuffer()); let t = new TextDecoder("utf-8").decode(buf); if (t.includes("\uFFFD")) t = new TextDecoder("windows-1252").decode(buf); filas = filasDeCSV(t); }
  if (!Array.isArray(filas) || !filas.length) throw fuera(400, "No llegaron filas para sincronizar.");
  if (filas.length > 50000) throw fuera(413, "Son demasiadas filas para una sola vez (máximo 50.000).");
  if (!["precios", "completo"].includes(modo)) throw fuera(400, "Modo desconocido");
  return c.json(await sincronizar({ filas, modo, crearNuevos: !!crearNuevos, origen: plex ? "plex" : "planilla" }));
});
app.get("/v1/sincronizaciones", soloAdmin, async c => {
  const { rows } = await pool.query("select * from tienda.sincronizaciones order by creado_en desc limit 20");
  return c.json(rows);
});

export default app;
