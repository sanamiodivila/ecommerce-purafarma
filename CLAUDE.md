# Notas para Claude

- Sitio estático en español rioplatense para Purafarma (farmacia y perfumería, Mar del Plata). Sin framework ni build: HTML, CSS y JS en cada archivo, más `packshot.js` compartido.
- Marca: crema `#F5F1EB`, negro `#121110`, rosa `#E23E7E` / `#CC2A69`, tipografía Poppins. Purafarma Sport: negro, blanco y naranja `#FF5000`, "SPORT" en Exo 2 itálica 800.
- El nombre de la empresa es "Purafarma" (una sola palabra).
- Los datos vienen de `window.claude.use("db")` dentro de claude.ai; afuera se leen de `data/*.json`. Mantener ambos caminos al cambiar la carga de datos.
- `backoffice.html` nunca se enlaza desde la tienda ni desde la portada. En claude.ai se entra agregando `#backoffice` al link.
- No inventar promesas comerciales (envío gratis, tiempos de entrega, reseñas); la promesa de entrega todavía no está definida.
