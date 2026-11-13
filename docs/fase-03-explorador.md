# Fase 03 — Explorador histórico sincronizado

## Decisión y alcance

El módulo país se reorganizó en contexto general, acceso por tres ámbitos y un explorador histórico central. Se conservaron el mapa regional, la metodología, la identidad visual, los importadores y los cinco archivos canónicos de la fase 02. No se modificó `materiales_curso/`, no se añadieron fuentes ni se generaron observaciones nuevas.

El eje general cubre 1950–año actual. Este dominio de navegación no altera la cobertura propia de cada serie: PIB per cápita 2000–2025, democracia electoral 2000–2024, huelgas Argentina 1984–2019 y Chile 1990–2019. Los gobiernos y las crisis conservan fechas ISO y no se transforman en valores anuales.

## Modelo y trazabilidad

- `Indicator` incorpora `domain`, `theme` y `variant` para expresar **ámbito → tema → indicador → serie o variante metodológica**. Las variantes futuras deberán tener identificadores y series diferenciadas; no se empalmarán definiciones o fuentes distintas.
- `HistoricalEvent` es una vista general para acontecimientos con tipo, fechas, descripción, ámbitos, actores, gobierno asociado, confianza, relaciones y procedencia.
- `getHistoricalEvents()` adapta las crisis canónicas en memoria. `sourceRecordId` conserva el identificador original y `provenance` reutiliza el mismo objeto de trazabilidad. No se creó un segundo archivo de crisis.
- Los vínculos `governmentId` y `relatedEventIds` permanecen vacíos porque no existen relaciones documentales cargadas. La proximidad temporal no se utiliza para inferirlos.
- La cadena sigue siendo: visualización → observación o acontecimiento → transformación → dataset y versión → variable original → fuente.

## Visualización e interacción

Las bandas de gobiernos, economía, sociedad, instituciones y acontecimientos comparten el mismo dominio, intervalo y año seleccionado. Incluyen acercamiento, alejamiento, desplazamiento, edición del intervalo, restablecimiento, activación de las tres series anuales disponibles y referencia vertical común.

PIB per cápita y democracia electoral usan pequeños gráficos de línea con escalas independientes; huelgas usa barras con base cero. Los segmentos no cruzan años sin observaciones. Los ceros de huelgas se dibujan como tales solo dentro de la cobertura; fuera de ella se informa ausencia de cobertura. Los gobiernos usan colores neutros y las crisis se representan como nodos e intervalos con fechas.

Las fichas de observaciones, gobiernos y crisis muestran sus atributos y procedencia. Una tabla de valores del año y listados de gobiernos y crisis ofrecen consulta no exclusivamente visual. El lienzo admite selección de año con flechas cuando tiene foco. En pantallas pequeñas las tarjetas y fichas se apilan; solo el lienzo tiene desplazamiento horizontal interno delimitado.

## Limitaciones vigentes

- No hay indicadores sociales cargados. La banda declara explícitamente su estado vacío y no contiene series de demostración.
- La fuente de presidencias llega hasta 2020; no se extrapolan gobiernos posteriores ni se completan interinatos, sucesiones, partidos o coaliciones.
- Las cuatro crisis son los únicos acontecimientos disponibles. La ausencia de nodos no demuestra ausencia histórica de crisis.
- No se calculan correlaciones, covariaciones estadísticas ni efectos causales. La yuxtaposición solo facilita observación temporal.
- Permanecen las limitaciones documentales de la fase 02 sobre versiones, licencias, referencias y validación externa.

## Estructura preparada para incorporaciones posteriores

Nuevas entidades posibles, siempre con fuente, versión, fechas y verificación:

- Elecciones y sucesiones presidenciales.
- Reformas y textos constitucionales.
- Conflictos institucionales, escándalos y otros acontecimientos fechados.
- Relaciones documentadas entre acontecimientos y entre acontecimientos y gobiernos.
- Perfiles estructurales de geografía, territorio y clima con fecha de referencia.

Nuevos indicadores o variantes posibles, sin implicar disponibilidad actual:

- PIB total, PIB per cápita y variantes metodológicas diferenciadas.
- Composición del PIB, presupuesto, deuda, tipo de cambio y tasas de interés.
- Población y composición demográfica.
- Pobreza bajo metodologías separadas, educación e ingresos.
- Servicios básicos y condiciones de vida.

## Verificación

La validación de esta fase comprende compilación, pruebas unitarias y de interacción, y recorridos Chromium en escritorio y móvil con revisión de consola y desbordamiento. El recorrido automatizado inicia y detiene su propio servidor temporal; las capturas se guardan en `artifacts/`.
