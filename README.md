# Purafarma · Tienda online

Tienda online de **Purafarma, farmacias y perfumerías** (Mar del Plata). Son páginas HTML estáticas, sin build y sin dependencias: se abren con cualquier servidor web.

## Páginas

| Archivo | Qué es |
| --- | --- |
| `index.html` | Portada (landing): toldo, logo, fondos rotativos, estante de categorías, "¿Qué necesitás hoy?", destacados, marcas, receta de skincare, ofertas y categorías. Al pasar por nutrición deportiva cambia a la paleta **Purafarma Sport**. |
| `tienda.html` | Catálogo: banners de marcas, filtros por categoría y marca, búsqueda, carrito con sugerencias y cierre del pedido (resumen para enviar por WhatsApp). Con la categoría nutrición deportiva elegida usa la paleta Sport. |
| `backoffice.html` | Administración: productos (edición en la tabla), banners, fondos de portada e importación de planillas CSV de Plex y fotos en lote. |
| `packshot.js` | Dibuja la ilustración de cada producto (tubo, gotero, pote, perfume, etc.) en los colores de su marca mientras no tenga foto. Lo usan las tres páginas. |
| `datos.js` | Conecta las tres páginas con la API propia (Neon): lectura, escritura, login, fotos y sincronización. |
| `api/` | La API de la tienda (Neon Function): productos, banners, portada, login del backoffice, fotos y sincronización con Plex. |
| `plex/` | Script para la computadora de la farmacia que envía precios y stock de Plex a la tienda. |
| `data/*.json` | Copia de los productos y banners. Las páginas los leen cuando no hay base de datos en vivo. |

## Cómo funcionan los datos

Las páginas eligen la base en este orden:

1. **En claude.ai** (artifact publicado): la base y las imágenes del artifact (`window.claude.use("db")` y `use("assets")`). Solo el dueño y los editores pueden escribir.
2. **Fuera de claude.ai** (GitHub Pages, dominio propio): la **API propia en Neon** (`datos.js` → `api/`). La tienda lee sin login; el backoffice pide email y contraseña.
3. **Si la API no responde**: la portada y el catálogo leen `data/productos.json`, `data/banners.json` y `data/portada.json`.

### Base propia (Neon)

- Proyecto Neon **Purafarma**, rama `production`, esquema **`tienda`** (las tablas de `public` son de otro sistema y no se tocan). Estructura en `api/schema.sql`.
- Las fotos van al bucket público **`fotos`** de Neon Object Storage; en `imagenId` se guarda la dirección completa.
- La API se publica sola con GitHub Actions (`.github/workflows/desplegar-api.yml`) cada vez que cambia `api/` en `main`. Necesita los secretos `NEON_API_KEY` y `PLEX_TOKEN` en el repositorio.
- Dirección: `https://br-bold-surf-ae4ctdc9-api.compute.c-2.us-east-2.aws.neon.tech`

| Ruta | Acceso | Qué hace |
| --- | --- | --- |
| `GET /v1/datos/{productos,banners,portada}` | pública | Lista la colección |
| `PUT` / `PATCH` / `DELETE /v1/datos/{col}/{id}` | admin | Guarda, modifica o borra |
| `POST /v1/fotos` | admin | Sube una foto (JPG, PNG, WebP; hasta 8 MB) |
| `POST /v1/ingresar`, `POST /v1/salir`, `GET /v1/yo`, `POST /v1/clave` | — / admin | Login del backoffice (sesiones de 30 días; se bloquea tras 8 intentos fallidos en 15 min) |
| `GET` / `POST /v1/admins`, `DELETE /v1/admins/{id}` | admin | Administradores |
| `POST /v1/sincronizar` | admin o clave de Plex | Actualiza productos desde CSV o JSON (`modo=precios` o `completo`) |
| `GET /v1/sincronizaciones` | admin | Últimas sincronizaciones |

### Plex

El script `plex/sincronizar-plex.ps1` (instrucciones en `plex/LEEME.md`) envía el listado que exporta Plex. La tienda actualiza **precio y stock** de los productos que ya existen, buscándolos por código. Los productos nuevos se cargan desde el backoffice (Importar → planilla).

### Colecciones

- **productos**: `nombre`, `marca`, `categoria`, `precio`, `precioAnterior`, `stock`, `codigo`, `descripcion`, `destacado`, `imagenId`, `creado`, `ejemplo`
- **banners**: `marca` o `categoria` (destino), `titulo`, `bajada`, `cta`, `color`, `imagenId`, `orden`, `activo`
- **portada**: `imagenId`, `modo` (`general` o `sport`), `oscuro` (0–80), `foco` (`centro`, `arriba`, `abajo`), `orden`, `activo`

Categorías: `dermocosmetica`, `perfumeria`, `cuidado-personal`, `nutricion-deportiva`, `maternidad-bebe`, `farmacia`.

Los productos de `data/productos.json` son **ejemplos** (`ejemplo: true`) y se reemplazan por el catálogo real.

## Probar en tu computadora

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Pendiente para producción

1. **Pasarela de pago** (hoy el pedido se arma y se envía por WhatsApp).
2. **Fotos reales** de producto y fondos de portada (ya se pueden subir desde el backoffice).
3. Confirmar el formato de exportación de Plex y programar el script en la computadora de la farmacia.
