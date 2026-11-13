# Repositorio Histórico de Datos de América Latina

> **Beta técnica 0.1.0.** Proyecto personal, independiente y no comercial. La versión pública es un lienzo funcional para revisar la arquitectura, la consulta histórica y la trazabilidad; no representa una base exhaustiva ni un diseño visual definitivo. Los módulos piloto son Argentina y Chile, dentro de un universo futuro de 18 países.

Plataforma para integrar, documentar y visualizar datos políticos, económicos y sociales de América Latina. La fase 02 implementó una prueba vertical con datos reales de Argentina y Chile y trazabilidad hasta los archivos originales. La fase 03 incorporó un explorador histórico sincronizado. La fase 04 añadió 882 observaciones sociales WDI con procedencia institucional; las fases 04B y 04C reorganizaron la interacción y la gramática visual. La fase 05 amplió Chile con 823 observaciones estadísticas y registros institucionales y documentales fechados. La fase 06 añade una tabla histórica con filtros, selección, procedencia por celda, variaciones anuales y descargas CSV/XLSX verificables. La fase 06B prioriza los años mediante una vista esencial, hace opcionales las columnas metodológicas y separa los ejes económicos del recorte de las series, sin ampliar datos ni modificar las observaciones canónicas.

## Ejecutar localmente

### Requisitos de la aplicación

- Node.js 22.12 o posterior.
- npm 10 o posterior.
- No se requieren credenciales, bases de datos, servicios pagos ni claves API.

```bash
npm ci
npm run dev
```

Abrir `http://localhost:7100/`. El script acepta argumentos estándar de Vite:

```bash
npm run dev -- --host 0.0.0.0 --port 7100
```

### Reproducir las importaciones

Los directorios `materiales_curso/` y `data/raw/` se conservan localmente y no forman parte del repositorio público. Para reproducir las importaciones que los utilizan, cada colaborador debe disponer separadamente de esos originales y mantener sus condiciones de uso. La aplicación publicada no los necesita: consume únicamente `data/canonical/`.

La regeneración de los archivos del curso requiere Python 3 con pandas y openpyxl:

```bash
npm run import:data
```

El comando ejecuta `scripts/import_data.py`, lee `materiales_curso/` sin modificarlo y regenera `observations.json`, `presidential-periods.json`, `crisis-episodes.json`, `sources.json` e `import-report.json` en `data/canonical/`.

La importación social es independiente y consulta la API pública de WDI:

```bash
npm run import:social
```

Ejecuta `scripts/import_social_data.py`, archiva las respuestas originales en `data/raw/world-bank/` y regenera `social-observations.json`, `social-indicators.json`, `social-sources.json` y `social-import-report.json`. Las huellas SHA-256 de las respuestas y de los originales del curso quedan registradas. La aplicación consume los archivos canónicos; no lee Excel, CSV ni la API durante la navegación.

La ampliación de Chile tiene dos procesos reproducibles e independientes:

```bash
npm run import:chile
npm run import:chile:documentary
```

El primero consulta WDI, archiva las respuestas y genera 823 observaciones de 18 indicadores con 18 muestras cotejadas. El segundo conserva respaldos oficiales y genera presidencias, cámaras, un nodo judicial y acontecimientos documentales con 52 cotejos. Ambos informan altas, cambios y bajas sin sobrescribir los paquetes anteriores.

## Alcance de las fases 02–06

- **1.873 observaciones anuales:** 533 para Argentina (`ARG`) y 1.340 para Chile (`CHL`); incluyen 168 registros iniciales, 882 sociales anteriores y 823 de la ampliación chilena.
- **32 indicadores:** 14 previos y 18 nuevos para Chile, de los cuales 12 son económicos y 6 sociales. El explorador ofrece 30 series anuales consultables.
- **PIB per cápita PPA constante 2021:** `GDP_pc_PPP_2021`, cobertura 2000–2025 en ambos países. Chile añade PIB total real, crecimiento, precios, tasas, trabajo, actividad y finanzas públicas con coberturas propias.
- **Sociedad:** población, composición, pobreza y alfabetización en ambos países; Chile añade Gini, participación laboral, tres componentes de empleo y electricidad.
- **Democracia electoral:** `v2x_polyarchy`, valores 2000–2024; las filas 2025 sin valor permanecen sin dato.
- **Huelgas generales:** `strikes`, Argentina 1984–2019 y Chile 1990–2019.
- **35 períodos presidenciales combinados para auditoría:** 17 del curso y 18 oficiales BCN. La vista de Chile utiliza solo los oficiales; Argentina conserva sus 10 registros.
- **Registros documentales chilenos:** 22 períodos y 22 segmentos legislativos, un cambio judicial y 34 acontecimientos fechados.
- **4 episodios de crisis:** fechas, fecha pivote, duración, actores, mecanismos, salida presidencial, notas y confianza.
- **Consulta y exportación:** tabla con años en columnas y series inequívocas en filas, descargas por selección, categoría o módulo completo, sin alterar el inventario canónico.

Los otros 16 países se muestran como “sin dato cargado en esta fase”. No se interpolan años, no se imputan valores y un cero de huelgas solo se presenta dentro de la cobertura efectiva. Las coberturas sociales anteriores están en `docs/fase-04-paquete-social.md`; la matriz, procedencia y vacíos de Chile están en `docs/fase-05-ampliacion-chile.md`; las reglas de consulta y exportación están en `docs/fase-06-tabla-descargas.md`.

## Funcionalidad

- Mapa SVG con escalas continuas y de conteo, valores, unidades, años y fuentes en tooltips y etiquetas accesibles.
- Navegación por puntero y teclado; vistas particulares de Argentina y Chile.
- Cuatro bandas sincronizadas: Poderes del Estado, Economía, Sociedad y Acontecimientos.
- Poderes del Estado con Ejecutivo documentado, cámaras legislativas independientes, cambios judiciales puntuales y democracia electoral como indicador complementario. Argentina informa ausencia de registros donde no hay cobertura.
- Segmentos legislativos chilenos con fechas propias, ausencia o disolución del Congreso y composición desconocida sin inferencia de mayorías; la ficha judicial explicita su cobertura mínima.
- Una visualización principal por banda, con selectores locales que reemplazan el gráfico activo sin perder año ni intervalo.
- Población como área inicial, composiciones etaria, urbano-rural y laboral apiladas, pobreza por metodología, alfabetización, Gini, participación y electricidad sin conectar vacíos.
- Composiciones en población absoluta por defecto o porcentajes originales. Los valores absolutos son derivados mediante `población total × porcentaje / 100`, solo con registros compatibles, y conservan ambas procedencias.
- Control general para incluir u ocultar estimaciones de fuente y cálculos derivados; las observaciones directas permanecen visibles y los archivos canónicos no cambian.
- Selección directa de áreas y sectores, sin puntos anuales innecesarios; las series escasas conservan sus puntos.
- PIB per cápita y PIB total real, composición por actividad en tres líneas con escala común y selector de todas las series económicas cargadas.
- Ejes económicos fuera del recorte de las series, con mínimo, intermedio, máximo, unidades y colores asociados; el eje derecho aparece al superponer dos series.
- Líneas económicas con doble eje, unidades y escalas independientes; la proximidad visual no implica magnitudes equivalentes ni causalidad.
- Elecciones, sucesiones, reformas, crisis con fechas y huelgas como agregados anuales en siete categorías. Los ceros y los años fuera de cobertura no generan nodos.
- Controles `+`, `−`, `←` y `→` en cada banda, todos vinculados al mismo intervalo; zoom, desplazamiento, cursor común, resumen anual, tablas y listados accesibles.
- Tabla de datos complementaria al explorador, con intervalo y filtro de estimados/derivados compartidos y desplazamiento horizontal interno.
- Vista esencial por defecto: solo Indicador permanece fijo, con variante y unidad resumidas, y los años aparecen inmediatamente después. Las seis columnas metodológicas son opcionales y no fijas.
- Filtros por texto, ámbito, tema, origen y verificación; selección individual o grupal y variaciones absolutas, porcentuales o en puntos porcentuales solo entre años consecutivos.
- Ficha por celda con valores, unidades, estado, fuente, versión, localización original, transformaciones y entradas de los cálculos derivados.
- Descargas CSV largo y XLSX real por selección, categoría o módulo completo. El libro incorpora matriz, datos largos, diccionario, fuentes y versiones, notas metodológicas y manifiesto; el módulo completo añade registros institucionales y documentales disponibles.
- Procedencia por registro: archivo o respuesta JSON, posición, variable, unidad, transformación, acceso, licencia, origen del valor y alcance de verificación.
- Página de metodología con 32 indicadores, referencias disponibles, huellas y metadatos pendientes.
- Diseño responsive, foco visible y respeto a preferencias de movimiento reducido.

## Validaciones implementadas

Los importadores y la validación de datos canónicos detectan:

- Códigos de país desconocidos y duplicados país-año-indicador-variante.
- Años fuera de rango, fechas ISO inválidas y fechas de término anteriores al inicio.
- Valores numéricos almacenados como texto y participaciones o porcentajes acotados fuera de 0–100; `% anual` permite crecimiento negativo e inflación superior a 100.
- Variables, fuentes o versiones inexistentes y cambios metodológicos no registrados.
- Observaciones sin procedencia, procedencia institucional incompleta y orígenes o frecuencias no reconocidos.
- Derivados sin metadatos, ceros clasificados incorrectamente y valores asociados a ausencia.
- Unidades incompatibles y composiciones incompletas o con suma fuera de ±0,2 puntos porcentuales.
- Segmentos legislativos sin fuente o sin criterio y fecha de medición cuando se declara una relación de mayoría.

Los paquetes anteriores conservan 30 registros de muestra cotejados: 12 del curso y 18 sociales. Chile añade 18 muestras estadísticas y 52 cotejos documentales en `chile-import-report.json` y `chile-documentary-import-report.json`. “Cotejado” significa coincidencia con el archivo, respuesta o respaldo original, no validación externa o metodológica de la fuente.

## Compilación y pruebas

```bash
npm run build
npm test
npm run check:browser
```

La validación en navegador requiere Chromium de Playwright (`npx playwright install chromium` si aún no está instalado). `check:browser` recompila la aplicación y ejecuta los recorridos general, fase 06 y fase 06B. Cada recorrido inicia y detiene un servidor temporal, prueba escritorio y móvil, revisa consola y desbordamiento horizontal y guarda capturas en `artifacts/`.

Verificación ejecutada en esta entrega:

- Importadores de Chile ejecutados por segunda vez: 0 altas, 0 cambios y 0 bajas estadísticas; conteos documentales estables.
- Compilación de producción correcta, con una advertencia no bloqueante de tamaño de paquete.
- 83 pruebas unitarias y de interacción superadas en siete archivos.
- Recorridos Chromium a 1440 × 1000 px y 390 × 844 px superados.
- Cuatro bandas y controles locales sincronizados, alturas principales comparables, zoom y desplazamiento comprobados.
- Áreas seleccionables por puntero y teclado, composiciones absolutas y porcentuales, fórmula y doble procedencia comprobadas.
- Fichas presidenciales, legislativas, judiciales y documentales abiertas; cámaras independientes y ausencia de Congreso comprobadas.
- PIB total, composición económica, doble eje, empleo OIT y filtro de estimados y derivados comprobados con datos reales.
- Tabla, estado compartido entre vistas, filtros, selección, variaciones, procedencia y navegación por teclado comprobados.
- Vista esencial con ocho o más años visibles en escritorio, años visibles en móvil y metadatos opcionales no fijos comprobados.
- Ejes izquierdo y derecho fuera del recorte, unidades coherentes y etiquetas dentro del SVG comprobados en gráficos simples, dobles y de composición.
- CSV de selección y categoría descargados y leídos; XLSX completo validado como Open XML con diez hojas y manifiesto coincidente con sus datos largos.
- Crisis con fechas, elecciones y sucesiones documentadas, huelgas anuales positivas, omisión de ceros, cobertura, teclado y movimiento reducido comprobados.
- Consola sin errores y ausencia de desbordamiento horizontal de página comprobados; los servidores temporales quedaron detenidos.

Las capturas de fase 06 y las seis capturas específicas de 06B se conservan en `artifacts/`; sus nombres y alcance están detallados en `docs/fase-06-tabla-descargas.md` y `docs/fase-06b-usabilidad.md`.

## Estructura

```text
src/
├── components/          # Mapa, explorador, tabla, workspace y procedencia
├── data/                # Acceso, taxonomía, diccionario, fuentes y validación
├── pages/               # Vista regional, país y metodología
├── types/               # Contratos de datos, instituciones y procedencia
├── utils/               # Tabla, descargas, formato, escalas y derivaciones
└── test/                # Pruebas unitarias y de interacción
data/
├── canonical/           # Datos publicados e informes de importación
└── raw/                 # Respaldos locales; no se incluyen en el repositorio público
scripts/
├── import_data.py              # Importación de archivos del curso
├── import_social_data.py       # Importación social WDI y cotejo de muestras
├── import_chile_phase05.py     # Ampliación estadística WDI de Chile
├── import_chile_documentary.py # Ampliación documental oficial de Chile
├── prepare-geography.mjs
├── browser-check.mjs
├── browser-check-phase06.mjs   # Tabla y descargas reales CSV/XLSX
└── browser-check-phase06b.mjs  # Vista esencial y ejes económicos
docs/                    # Decisiones, fases y limitaciones
.github/workflows/       # Validación y despliegue estático en GitHub Pages
artifacts/               # Capturas locales de validación; no se publican
materiales_curso/        # Originales locales preservados; no se publican
```

## Decisiones y pendientes

Las decisiones de importación y las cuestiones documentales se detallan en `docs/decisiones-tecnicas.md` y `docs/limitaciones.md`. La arquitectura original está en `docs/fase-03-explorador.md`; las fuentes y coberturas sociales están en `docs/fase-04-paquete-social.md`; la gramática visual anterior está en `docs/fase-04b-rediseno-explorador.md` y `docs/fase-04c-interaccion-bandas.md`; la ampliación de Chile se documenta en `docs/fase-05-ampliacion-chile.md`; la tabla y las exportaciones se documentan en `docs/fase-06-tabla-descargas.md`; el ajuste de usabilidad se documenta en `docs/fase-06b-usabilidad.md`. No se inventan versiones, fechas, licencias, unidades, relaciones ni valores para completar vacíos. `Hegemony.dta` fue revisado, pero su contenido no está integrado en esta beta.

## Dependencias, autorización y licencias

React, Vite, TypeScript, D3 Geo, TopoJSON Client, Lucide React, Vitest, Testing Library y Playwright conservan las licencias indicadas por sus paquetes. `write-excel-file` genera los libros XLSX en el navegador y `read-excel-file` se usa solo en pruebas para leer las descargas reales. DM Sans y Newsreader se sirven mediante Google Fonts con alternativas locales.

La geometría deriva de `world-atlas@2.0.2`, basado en Natural Earth. Natural Earth está en dominio público y world-atlas usa licencia ISC. Las series WDI registran CC BY 4.0 con términos adicionales del catálogo del Banco Mundial.

El responsable del proyecto confirmó el 13 de noviembre de 2026 que dispone de autorización para el despliegue público de esta beta, incluidos los datos canónicos derivados de materiales del curso. Los archivos originales y los respaldos brutos permanecen fuera del repositorio público. Esta confirmación no sustituye las atribuciones ni transforma los datos de terceros en contenido bajo una licencia abierta general.

No se declara una licencia abierta general para el código en esta versión. Las condiciones y atribuciones específicas de cada fuente se conservan en los metadatos y en `docs/limitaciones.md`.
