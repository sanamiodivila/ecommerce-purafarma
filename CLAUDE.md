# Notas para Claude

- Sitio estático en español rioplatense para Purafarma (farmacia y perfumería, Mar del Plata). Sin framework ni build: HTML, CSS y JS en cada archivo, más `packshot.js` compartido.
- Marca: crema `#F5F1EB`, negro `#121110`, rosa `#E23E7E` / `#CC2A69`, tipografía Poppins. Purafarma Sport: negro, blanco y naranja `#FF5000`, "SPORT" en Exo 2 itálica 800.
- El nombre de la empresa es "Purafarma" (una sola palabra).
- Los datos vienen de `window.claude.use("db")` dentro de claude.ai; afuera, de la API propia en Neon (`datos.js` → `api/`), y si no responde, de `data/*.json`. Mantener los tres caminos al cambiar la carga de datos. Las fotos se muestran con `imgUrl(imagenId)` (dirección completa en Neon, `/_blob/` en claude.ai).
- La base propia vive en el esquema `tienda` del proyecto Neon "Purafarma". Las tablas de `public` son de otro sistema: no tocarlas.
- La API (`api/src/index.js`) se publica con GitHub Actions al cambiar `api/` en `main`. Si cambia el esquema, actualizar `api/schema.sql` y aplicarlo en Neon.
- `backoffice.html` nunca se enlaza desde la tienda ni desde la portada. En claude.ai se entra agregando `#backoffice` al link.
- No inventar promesas comerciales (envío gratis, tiempos de entrega, reseñas); la promesa de entrega todavía no está definida.
