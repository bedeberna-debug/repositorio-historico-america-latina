# Fase 06B — Ajuste de usabilidad de tabla y ejes económicos

## Alcance

Ajuste visual e interactivo sobre la fase 06. No se modificaron datos, fuentes, observaciones canónicas, metodologías, escalas ni descargas. No se incorporó `Hegemony.dta` ni se agregaron series.

## Vista esencial de la tabla

La tabla utiliza por defecto una vista esencial. Solo la columna **Indicador** permanece fija horizontalmente, con una anchura de 280 px en escritorio. Contiene la casilla de selección, el nombre, la variante, la unidad y el identificador de la serie. Los años comienzan inmediatamente después y conservan 98 px por año cuando la variación está desactivada.

El control **Mostrar columnas metodológicas**, desactivado por defecto, añade Ámbito, Tema, Variante o metodología, Unidad, Origen del valor y Cobertura efectiva. Estas columnas no tienen fijación horizontal. El control no modifica filtros, selección, intervalo, variaciones, procedencia ni contenido de las descargas.

En pantallas de hasta 760 px, Indicador se reduce a 190 px y los años a 88 px; hasta 480 px, Indicador se reduce a 164 px. El desplazamiento permanece dentro de la matriz y no en la página general. La ficha de celda conserva todos los metadatos y la procedencia completa.

## Ejes económicos

`EconomicLinesChart` separa `data-economic-axes` de `data-economic-plot`. El `clipPath` se aplica únicamente al grupo de líneas y puntos. Los títulos, valores y marcas de los ejes quedan fuera del recorte. La composición del PIB utiliza la misma separación.

Los ejes muestran mínimo, intermedio y máximo con las escalas ya existentes. El título y las marcas conservan la unidad de cada serie; los colores distinguen el eje principal del secundario. Solo el eje izquierdo dibuja las guías horizontales, con trazo tenue y discontinuo, para evitar duplicarlas al superponer series.

`SharedHistoryChart` conserva el cursor, las marcas temporales y la definición del recorte. No se alteraron las escalas ni la independencia de los ejes.

## Pruebas y verificación

Las pruebas unitarias y de interacción comprueban que:

- Solo Indicador está fijo en la vista esencial y el primer año lo sigue inmediatamente.
- Las seis columnas opcionales se muestran sin fijación horizontal y sin perder filtros o selección.
- Los ejes izquierdo y derecho tienen tres valores, unidades coherentes y ningún ancestro con `clipPath`.
- El grupo de datos conserva su recorte y el eje derecho no duplica las líneas de referencia.

La suite completa superó **83 pruebas en siete archivos**. `scripts/browser-check-phase06b.mjs` comprobó en Chromium ocho o más años visibles a 1440 px, años visibles a 390 px, metadatos opcionales, PIB per cápita, PIB total, composición económica, una serie, doble eje, intervalos acotados y completos, Chile y Argentina. También verificó etiquetas dentro del SVG, consola sin errores, recursos sin 404 y ausencia de desbordamiento general.

## Capturas

- `artifacts/fase-06b-tabla-esencial-desktop.png`
- `artifacts/fase-06b-tabla-metadatos-desktop.png`
- `artifacts/fase-06b-tabla-mobile.png`
- `artifacts/fase-06b-economia-eje-unico.png`
- `artifacts/fase-06b-economia-doble-eje.png`
- `artifacts/fase-06b-composicion-economica.png`

El recorrido inicia y detiene su propio servidor temporal en el puerto 4175. `npm run check:browser` ejecuta la compilación y los tres recorridos: general, fase 06 y fase 06B.
