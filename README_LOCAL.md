# Entorno Local: Dolar Dashboard

Este proyecto está construido íntegramente de manera estática mediante **HTML puro, JS asíncrono y Tailwind** (vía CDN para desarrollo rápido). No utiliza un proceso de empaquetado como Vite dentro de esta carpeta.

## Cómo probarlo en vivo (Recomendado)

Dado que usás Python en esta máquina, la manera infalible de testear la aplicación y evitar que Chrome/Edge cacheé versiones viejas de los scripts, es levantando un simple servidor nativo.

1. Abrí la terminal dentro de esta carpeta (`/PYTHON/Dolar`).
2. Ejecutá el siguiente comando:
   ```bash
   python -m http.server 8080
   ```
3. Ahora abrí tu navegador y pegá esta URL exacta:
   👉 **http://localhost:8080**

### Notas de esta versión:
*   ✨ **Inversión de Valores Implementada:** El precio que provee la API como `venta` (el valor al que el exchange/casa de cambio vende, y por lo tanto **el usuario paga o compra**, y que visualmente es el **más alto**) ahora está mapeado 100% a la columna **Venta**. 
*   ✨ **Protección Anti-Cache:** Modifiqué el archivo `.html` insertando `?v=5` al final de la carga de `app.js` para asegurar que todo navegador limpie de su memoria caché el error de inversión anterior y fuerce la descarga del código saneado que acabo de guardar.

Cuando termines de testearlo, podés frenar el servidor en la terminal presionando `Ctrl + C`.
