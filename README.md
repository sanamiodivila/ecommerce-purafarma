# Purafarma · Tienda online

Tienda online de **Purafarma, farmacias y perfumerías** (Mar del Plata). Son páginas HTML estáticas, sin build y sin dependencias: se abren con cualquier servidor web.

## Páginas

| Archivo | Qué es |
| --- | --- |
| `index.html` | Portada (landing): toldo, logo, fondos rotativos, estante de categorías, "¿Qué necesitás hoy?", destacados, marcas, receta de skincare, ofertas y categorías. Al pasar por nutrición deportiva cambia a la paleta **Purafarma Sport**. |
| `tienda.html` | Catálogo: banners de marcas, filtros por categoría y marca, búsqueda, carrito con sugerencias y cierre del pedido (resumen para enviar por WhatsApp). Con la categoría nutrición deportiva elegida usa la paleta Sport. |
| `backoffice.html` | Administración: productos (edición en la tabla), banners, fondos de portada e importación de planillas CSV de Plex y fotos en lote. |
| `packshot.js` | Dibuja la ilustración de cada producto (tubo, gotero, pote, perfume, etc.) en los colores de su marca mientras no tenga foto. Lo usan las tres páginas. |
| `data/*.json` | Copia de los productos y banners. Las páginas los leen cuando no hay base de datos en vivo. |

## Cómo funcionan los datos

- **En claude.ai** (artifact publicado): las páginas usan la base de datos y el almacenamiento de imágenes del artifact (`window.claude.use("db")` y `use("assets")`). Solo el dueño y los editores pueden escribir.
- **Fuera de claude.ai** (GitHub Pages, servidor local): no hay base en vivo, así que la portada y el catálogo leen `data/productos.json`, `data/banners.json` y `data/portada.json` si existe. El backoffice muestra "Acceso solo para administradores" porque necesita una base para guardar.

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

1. **Base de datos propia** para que el backoffice guarde fuera de claude.ai (por ejemplo Postgres en Neon, el proyecto "Purafarma") y una API chica para leer y escribir productos, banners y portada.
2. **Login** para el backoffice.
3. **Pasarela de pago** (hoy el pedido se arma y se envía por WhatsApp).
4. **Fotos reales** de producto y fondos de portada.
5. **Integración con Plex** para precios y stock.
