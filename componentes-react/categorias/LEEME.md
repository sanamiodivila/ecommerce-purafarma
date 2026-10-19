# Sección Categorías (React + Tailwind)

Componente suelto para usar en un proyecto con React 18+ y Tailwind 3+. No lo usa la web actual (que es HTML sin React).

- `Categorias.jsx`: la sección (tres tarjetas con video, nombre vertical y botón).
- `useInView.js`: hook de aparición al entrar en pantalla.
- `categorias.css`: estilo `.btn-primary`, para la hoja de estilos global.

```jsx
import Categorias from "./Categorias";
<Categorias />
```

Los nombres, destinos y videos se cambian en el arreglo `CATEGORIAS`. Los videos están alojados en un servidor ajeno: reemplazarlos por los propios cuando estén.
