# Fase 04 — Primer paquete social trazable

## Objetivo y alcance

Esta fase incorpora datos sociales reales de Argentina (`ARG`) y Chile (`CHL`) al explorador histórico, sin alterar los archivos de `materiales_curso/` ni cambiar las series importadas en las fases anteriores.

El repositorio combina ahora:

- 168 observaciones anuales anteriores.
- 882 observaciones sociales nuevas.
- 1.050 observaciones anuales en total: 533 de Argentina y 517 de Chile.
- 14 indicadores configurados, de los cuales 9 son sociales.
- 17 períodos presidenciales y 4 episodios de crisis, conservados sin cambios de alcance.

Los otros 16 países continúan identificados como “sin dato cargado en esta fase”. No se agregaron backend, autenticación, comparadores, correlaciones ni inferencias causales.

## Fuente, versión y preservación

La fuente de las nueve series es la API v2 de **World Development Indicators (WDI), Banco Mundial**. Para cada variable se consultó primero su ficha oficial de indicador y después la respuesta país-año.

- Fecha de acceso: **2026-10-31**.
- Actualización WDI registrada por las respuestas: **2026-10-08**.
- Respuestas JSON de datos y metadatos: `data/raw/world-bank/`.
- Huellas SHA-256 de las respuestas: `data/canonical/social-import-report.json`.
- Referencia y licencia: `data/canonical/social-sources.json`.

Las definiciones se tomaron de las fichas oficiales. Las organizaciones de origen documentadas incluyen World Population Prospects y World Urbanization Prospects de la División de Población de la ONU, Poverty and Inequality Platform del Banco Mundial y UNESCO Institute for Statistics para alfabetización.

La licencia registrada para los datos abiertos producidos por el Banco Mundial es **CC BY 4.0**, sujeta a los términos adicionales del catálogo: <https://datacatalog.worldbank.org/public-licenses>. Esta licencia no se extiende a los archivos del curso, cuyos derechos y metadatos pendientes se mantienen separados.

El importador calcula las huellas de los originales del curso antes y después de ejecutarse. El informe social registra `originalCourseFilesUnmodified: true`.

## Series y cobertura efectiva

Los extremos indican cobertura documentada, **no continuidad anual**. Los años sin observación no generan puntos ni segmentos que crucen el vacío.

| Indicador canónico | Variable WDI | Argentina | Chile |
|---|---|---:|---:|
| Población total | `SP.POP.TOTL` | 1960–2025 · 66 | 1960–2025 · 66 |
| Población de 0 a 14 años | `SP.POP.0014.TO.ZS` | 1960–2025 · 66 | 1960–2025 · 66 |
| Población de 15 a 64 años | `SP.POP.1564.TO.ZS` | 1960–2025 · 66 | 1960–2025 · 66 |
| Población de 65 años o más | `SP.POP.65UP.TO.ZS` | 1960–2025 · 66 | 1960–2025 · 66 |
| Población urbana | `SP.URB.TOTL.IN.ZS` | 1960–2025 · 66 | 1960–2025 · 66 |
| Población rural | `SP.RUR.TOTL.ZS` | 1960–2025 · 66 | 1960–2025 · 66 |
| Pobreza · línea nacional | `SI.POV.NAHC` | 2016–2025 · 10 | 1987–2022 · 16 |
| Pobreza · USD 3,00 PPA 2021 | `SI.POV.DDAY` | 1980–2024 · 36 | 1987–2024 · 17 |
| Alfabetización adulta | `SE.ADT.LITR.ZS` | 1980–2020 · 4 | 1982–2017 · 7 |

### Población y composición

La población total conserva `originalValue` en personas y utiliza `normalizedValue = originalValue / 1.000.000` para presentar **millones de personas**. No hay redondeo en el dato canónico ni imputación.

Las series etarias y urbano-rurales se muestran como áreas apiladas solo cuando todos sus componentes están presentes y activos. Se admite una tolerancia de suma de **±0,2 puntos porcentuales** para reflejar redondeos de la fuente; la aplicación no ajusta los valores para forzar un total de 100.

La población urbana conserva las definiciones territoriales nacionales armonizadas por la ONU. La rural se importa desde su propia variable WDI y conserva su carácter de componente residual documentado; no se recalcula en el navegador.

### Pobreza: metodologías separadas

La pobreza nacional y la internacional tienen identificadores, variantes y metodologías independientes:

- `poverty-national-headcount`: incidencia respecto de la línea o líneas nacionales. WDI no documenta un valor monetario único aplicable a todas ellas y la interfaz no lo infiere.
- `poverty-international-3-2021ppp`: incidencia con una línea de **USD 3,00 por persona y día**, en paridad de poder adquisitivo de **2021**.

Las líneas no se empalman, no se convierten entre sí y no deben interpretarse como equivalentes. Las líneas nacionales tampoco son directamente comparables entre países. La serie internacional está desactivada por defecto; al activarla junto con la nacional se muestra una advertencia explícita.

La ficha metodológica aparece antes del valor seleccionado e informa tipo de línea, medida, fuente y comparabilidad. Los años sin encuesta permanecen sin dato: por ejemplo, no se une 2014 con 2016 en la serie internacional de Argentina ni se conectan años alternos en Chile.

### Educación

Se eligió alfabetización adulta de UNESCO-UIS porque su definición y población de referencia son explícitas: porcentaje de personas de 15 años o más que pueden leer y escribir una afirmación breve y sencilla sobre su vida cotidiana.

Su cobertura es escasa y discontinua. Se muestra como puntos y segmentos sin conectar vacíos, sin presentarla como una serie anual completa. Otras medidas educativas requieren revisar nivel, población de referencia y cobertura antes de incorporarse.

## Importación y actualización

El flujo social es independiente del importador de los archivos del curso:

```bash
npm run import:social
```

Ejecuta `scripts/import_social_data.py` y genera:

```text
data/canonical/
├── social-observations.json
├── social-indicators.json
├── social-sources.json
└── social-import-report.json
```

El importador omite valores `null`, conserva la posición de cada registro en la respuesta JSON y valida países, años, valores numéricos, porcentajes, metodología, fuentes y composiciones. También compara el resultado con la versión canónica anterior e informa altas, bajas y cambios por identificador.

Se ejecutó una segunda importación para comprobar idempotencia: `added: 0`, `changed: 0`, `removed: 0`, con 882 observaciones sin cambios.

## Verificación y significado de “cotejado”

Se cotejaron automatizadamente **18 muestras sociales**, una por país para cada una de las nueve variables, contra sus registros JSON originales. Se comprobaron variable, año, país y valor original.

Sumadas a las 12 muestras anteriores —distribuidas entre observaciones, gobiernos y crisis— el repositorio documenta **30 registros de muestra cotejados**. Las 24 observaciones anuales verificadas y los 6 registros históricos verificados no deben contarse como si todos fueran observaciones país-año.

“Cotejado” significa coincidencia con el archivo o respuesta original. No equivale a validación bibliográfica, metodológica ni externa independiente. Los demás registros permanecen identificados como importados y no cotejados individualmente.

## Visualización y accesibilidad

La banda social comparte el eje, el año y el intervalo con gobiernos, economía, instituciones y acontecimientos. Incluye:

- Línea de población total.
- Áreas etarias y urbano-rurales con componentes completos.
- Líneas de pobreza visual y metodológicamente diferenciadas.
- Alfabetización sin interpolación.
- Controles jerárquicos por ámbito, tema, indicador y variante.
- Fichas de observación y procedencia con URL, fecha de acceso, licencia y transformación.
- Resumen del año y tablas accesibles para las 12 series anuales del explorador.

Activar o desactivar series no modifica el intervalo. En pantallas pequeñas el lienzo conserva desplazamiento interno sin producir desbordamiento horizontal de la página.

## Validaciones ejecutadas

Resultados comprobados al cierre de esta fase:

- `npm run build`: compilación de producción correcta. Vite mantiene una advertencia no bloqueante por el tamaño del paquete JavaScript.
- `npm test`: **55 pruebas superadas** en 3 archivos.
- `node scripts/browser-check.mjs`: recorrido Chromium superado tras compilar la aplicación.
- Escritorio: 1440 × 1000 px; móvil: 390 × 844 px y movimiento reducido.
- Sin errores de consola ni desbordamiento horizontal de página.
- Comprobados población, áreas completas, pobreza separada, alfabetización, cinco bandas sincronizadas, zoom, desplazamiento, activación de series, crisis, procedencia, cobertura, teclado y selección de observaciones.

Las capturas se conservan en `artifacts/`, incluidas `chile-social-desktop.png` y `argentina-mobile.png`. El comprobador inicia y detiene su servidor temporal en `finally`.

## Pendientes y límites

- Otras líneas internacionales de pobreza no se incorporan sin una necesidad analítica y una variante PPA explícita.
- Ingresos, servicios básicos y medidas educativas adicionales permanecen pendientes de revisión de fuente, cobertura y definición.
- La escasa cobertura de alfabetización limita comparaciones temporales.
- Las diferencias entre líneas de pobreza no miden por sí mismas cambios temporales ni brechas metodológicas causales.
- La coincidencia temporal entre series, gobiernos y crisis no implica causalidad.
- La cartografía y las series sociales no se fuerzan a una lectura regional cuando el indicador no es cartográficamente compatible.
- Las licencias y metadatos pendientes de los archivos del curso conservan las limitaciones documentadas en `docs/limitaciones.md`.
