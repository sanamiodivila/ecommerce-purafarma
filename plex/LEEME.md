# Sincronización con Plex

El script `sincronizar-plex.ps1` corre en la computadora de la farmacia que tiene Plex. Envía el listado de artículos a la tienda online, y la tienda actualiza **precio y stock** de los productos que ya están cargados, buscándolos por **código** (EAN o código de barras).

No crea productos nuevos ni cambia nombres, fotos o descripciones. Los productos nuevos se cargan una vez desde el backoffice (Importar → planilla) y desde ahí Plex los mantiene al día.

## 1. Exportar el listado desde Plex

Configurá en Plex una exportación del listado de artículos a CSV o TXT. La primera fila tiene que tener los títulos de las columnas. La tienda reconoce estos nombres (no importan mayúsculas ni acentos):

| Dato | Títulos que reconoce |
| --- | --- |
| Código | `codigo`, `cod`, `ean`, `sku`, `codigo de barras`, `codbarra`, `troquel` |
| Precio | `precio`, `precio venta`, `pvp`, `precio de venta`, `precio publico` |
| Stock | `stock`, `existencia`, `cantidad`, `stock actual` |
| Precio anterior (opcional) | `precio anterior`, `precio lista`, `antes` |

El separador puede ser punto y coma, coma o tabulación, y los precios pueden venir con formato argentino (`12.345,67`).

## 2. Configurar el script

Abrí `sincronizar-plex.ps1` con el Bloc de notas y completá:

- `$Archivo`: la ruta donde Plex deja el archivo exportado.
- `$Clave`: la clave de sincronización (te la pasa quien administra la tienda; no la compartas).

Probalo con doble clic derecho → "Ejecutar con PowerShell", o desde una consola:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Purafarma\sincronizar-plex.ps1
```

El resultado queda anotado en `sincronizar-plex.log`, en la misma carpeta, y también aparece en el backoffice (Importar → Sincronización con Plex).

## 3. Que corra solo

En el **Programador de tareas** de Windows:

1. Crear tarea básica → nombre "Purafarma tienda".
2. Desencadenador: diariamente, y en las opciones avanzadas "repetir cada 30 minutos".
3. Acción: iniciar un programa
   - Programa: `powershell`
   - Argumentos: `-ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Purafarma\sincronizar-plex.ps1`

Si el archivo no cambió desde el último envío, el script no manda nada.

Plex también tiene que exportar el listado de forma periódica. Si tu versión de Plex no puede programar la exportación, avisá: se puede leer directamente de la base de Plex.
