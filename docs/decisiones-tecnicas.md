# Decisiones técnicas de la beta

## 1. Aplicación local y modular

Se adoptó React con TypeScript y Vite para separar interfaz, metadatos, acceso a datos y contratos de dominio. No se añadió backend ni servicio remoto: esta fase necesita validar arquitectura y navegación sin introducir infraestructura prematura.

La navegación utiliza rutas de fragmento (`#/`, `#/pais/ARG`, `#/pais/CHL`, `#/metodologia`) para que los enlaces sean reproducibles y el despliegue estático no requiera reglas de reescritura.

## 2. Modelo orientado por naturaleza del fenómeno

Se definen entidades separadas:

- `CountryYearObservation`: observaciones anuales con valor original, valor normalizado y estado.
- `PresidentialPeriod`: administraciones con intervalo temporal y atributos políticos.
- `CrisisEpisode`: episodios con inicio, término, tipo, pico opcional e interrupción presidencial.
- `Country`: países con ISO Alpha-3 y estado del módulo.
- `Indicator`: diccionario, naturaleza, unidad y compatibilidad cartográfica.
- `Source` y `DatasetVersion`: procedencia institucional y versionado.
- `Provenance`: enlace reutilizable con dataset, variable original, cobertura, transformaciones y verificación.

El valor original nunca se sobrescribe con una transformación. Las series no comparten una cobertura temporal forzada.

## 3. Vacíos explícitos

Los repositorios comienzan vacíos y toda consulta sin registro se interpreta como `no_data`. `not_applicable` requiere justificación metodológica y `zero_events` exige cobertura documental. No se interpolan, imputan ni estiman valores.

## 4. Mapa ligero y reproducible

Se eligió SVG con D3 Geo en lugar de un servicio de teselas. El mapa funciona sin claves, sin pagos y sin solicitudes cartográficas durante el uso. El script de preparación extrae únicamente los 18 países de world-atlas y evita cargar geometrías innecesarias.

La proyección Mercator se ajusta a la colección regional. Los países son controles accesibles con nombre, estado del dato y acción disponible.

## 5. Temporalidad

La línea de tiempo va de 1950 al año actual obtenido del reloj local del navegador. Reproduce años incluso cuando no existen observaciones. Los episodios y períodos no se agregan al mapa como valores continuos; el indicador de crisis dirige su interpretación a la vista de país.

## 6. Diseño y accesibilidad

La interfaz emplea una jerarquía editorial sobria, contrastes discretos y componentes responsive. Incluye foco visible, activación por Enter o espacio, etiquetas accesibles, enlace para saltar al contenido, salidas anunciadas y reducción de animaciones cuando el sistema lo solicita.

Las fuentes web son una mejora visual opcional: existen alternativas locales si la red no está disponible.

## 7. Verificación

Vitest y Testing Library cubren arquitectura, geometrías, navegación, años sin datos, leyendas y metadatos. Playwright valida recorridos reales, capturas y ausencia de desbordamiento horizontal en escritorio y móvil. El servidor usado en esta validación se cierra al finalizar.

## 8. Importación canónica de la fase 02

`npm run import:data` ejecuta `scripts/import_data.py`, lee únicamente Argentina y Chile y genera JSON canónicos en `data/canonical/`. El proceso requiere Python con pandas y openpyxl. Los archivos de `materiales_curso/` se abren en modo lectura y se comparan sus huellas SHA-256 antes y después de la ejecución.

Se importan 168 observaciones país-año, 17 períodos presidenciales y 4 episodios de crisis. Cada procedencia incluye archivo, hoja cuando corresponde, fila, variable efectiva, unidad, cobertura, transformaciones y verificación. `originalValue` y `normalizedValue` permanecen separados aunque en esta fase la normalización numérica no cambie de escala.

La verificación tiene un alcance deliberadamente limitado: `verified` significa que el registro fue cotejado automatizadamente contra su fila original, no que la fuente haya recibido validación bibliográfica, metodológica o externa. Doce muestras cubren las cinco familias y ambos países; el detalle está en `data/canonical/import-report.json`.

## 9. Cobertura, vacíos y temporalidad

Las filas sin valor no generan observaciones disponibles. V-Dem 2025 permanece sin dato y la cobertura efectiva termina en 2024. Los ceros de `strikes` se importan como `zero_events` solo dentro de 1984–2019 para Argentina y 1990–2019 para Chile. Fuera de esos intervalos la interfaz informa falta de cobertura.

Las presidencias conservan `datein`, `dateout` y `tenure`; el nombre visible combina `name` y `surname` y retira sufijos numéricos, preservando los originales. `failure=1` se representa como interrupción, mientras `failure=0` no se interpreta como mandato completado. No se utilizó `Hegemony.dta`, ni se completaron sucesiones, partidos o coaliciones.

Las crisis conservan fechas, duración, actores, mecanismos, salida, notas, justificaciones y confianza. El gráfico anual divide sus segmentos cuando falta un año y nunca conecta esos vacíos.

## 10. Escalas y diferencias documentales

El mapa calcula escalas continuas a partir del mínimo y máximo importados por indicador; los conteos usan una escala independiente con cero en blanco. Los otros 16 países se identifican como no cargados en esta fase, no como ausentes en la fuente.

Se adoptó `GDP_pc_PPP_2021` en lugar del nombre preliminar `NY.GDP.PCAP.PP.KD`. En `Base_Final_RCP_v6.xlsx` se documentó la diferencia entre los nombres del codebook (`year`, `country`, `fecha_pivote`, `exit`, entre otros) y las columnas efectivas (`año`, `pais`, `fecha_peak`, `salida`, entre otras).

## 11. Importación social independiente y variantes metodológicas

La fase 04 utiliza `scripts/import_social_data.py` para conservar intactos el importador y los originales del curso. Las respuestas WDI se archivan en `data/raw/world-bank/` con huellas SHA-256; los datos sociales se generan en archivos canónicos separados y se combinan únicamente en la capa de acceso de la aplicación.

La procedencia admite tanto archivos tabulares con hoja y fila como respuestas JSON con posición, URL y fecha de acceso. La metodología y la variante forman parte de la validación y de la clave de duplicados. La población conserva su valor original en personas y su valor normalizado en millones; el resto de las series sociales no cambia de escala.

Las composiciones requieren todos sus componentes y una suma de 100 dentro de una tolerancia de ±0,2 puntos porcentuales. No se corrigen valores para satisfacer la suma. Las áreas tampoco se dibujan si falta o se desactiva un componente.

Pobreza nacional e internacional son indicadores distintos, con metodologías y advertencias propias. No se empalman ni se comparan como si fueran equivalentes. Los segmentos temporales se interrumpen en años sin encuesta y la alfabetización conserva su cobertura escasa sin interpolación.

El detalle de fuentes, coberturas, licencias, cotejos y verificación se documenta en `docs/fase-04-paquete-social.md`.

## 12. Ampliación estadística y documental de Chile

La fase 05 mantiene separados los paquetes anteriores y añade `chile-observations.json`, `chile-indicators.json` y `chile-sources.json`, generados por `scripts/import_chile_phase05.py`. El inventario incorpora 823 observaciones de 18 indicadores: 12 económicos y 6 sociales. El total integrado es 1.873 observaciones y 32 indicadores; Argentina conserva 533 observaciones y Chile llega a 1.340.

Cada observación nueva declara `valueOrigin` y `originalFrequency`. WDI aporta valores `observed`; desempleo, participación laboral y empleo por actividad se identifican como `source_estimate` porque son estimaciones modeladas OIT. Las poblaciones por grupo calculadas en la vista son `derived`, no nuevas observaciones canónicas. Un único control permite ocultar estimaciones y derivados sin eliminar las observaciones directas ni modificar los archivos.

El PIB total conserva USD constantes de 2015 como valor original y se normaliza a miles de millones. Las reglas de rango 0–100 se limitan a participaciones y porcentajes acotados: `% anual` admite crecimiento negativo e inflación superior a 100. Las composiciones por actividad del PIB se dibujan como líneas independientes; el empleo sí se valida como composición con tres componentes y tolerancia de ±0,2 puntos.

`scripts/import_chile_documentary.py` genera 18 segmentos presidenciales oficiales, 22 períodos y 22 segmentos legislativos, un cambio judicial y 34 acontecimientos documentales. La exportación `presidentialPeriods` conserva los 35 registros combinados para auditoría, pero `getPresidentialPeriods('CHL')` devuelve solo los 18 oficiales; Argentina mantiene sus 10 registros del curso. Las diferencias de fechas y el truncamiento del segundo período de Piñera en la fuente anterior no se corrigen silenciosamente.

Las cámaras se consultan de forma independiente. La ausencia o disolución del Congreso entre 1973 y 1990 se distingue de `unknown`; no se infieren mayorías sin criterio y fecha de medición. Los eventos generales solo se incorporan con respaldo documental y no se vinculan automáticamente a gobiernos por proximidad temporal. El detalle de cobertura y vacíos está en `docs/fase-05-ampliacion-chile.md`.

## 13. Tabla histórica y exportaciones de la fase 06

La fase 06 añade una vista complementaria sin crear otro repositorio de datos. `CountryDataWorkspace` comparte intervalo y filtro de estimados/derivados entre explorador y tabla, y mantiene ambas vistas montadas después del primer acceso a la tabla para conservar su estado. La tabla se construye desde las observaciones existentes y los derivados de población ya definidos; no modifica los JSON canónicos ni incorpora nuevas fuentes.

La identidad de serie combina país, indicador, variante, metodología, unidad, fuente y versión en una clave JSON. Esto evita mezclar observaciones que comparten nombre pero no definición o procedencia. La matriz distingue `available`, `no_data`, `outside_coverage` y `not_applicable`; el cero documentado conserva su significado y nunca se usa para rellenar vacíos.

Las variaciones anuales son cálculos efímeros de presentación, desactivados por defecto. Exigen el año inmediatamente anterior en la misma serie. La variación porcentual requiere denominador positivo y unidad no porcentual; la diferencia en puntos porcentuales solo se ofrece para unidades porcentuales. No se calculan variaciones sobre años no consecutivos.

Las descargas se construyen desde el mismo conjunto de filas que presenta la tabla. El CSV tiene campos estables y una fila por observación almacenada; no fabrica registros para ausencias. El XLSX se genera con `write-excel-file` e incluye matriz, datos largos, diccionario, fuentes y versiones, notas metodológicas y manifiesto. El alcance de módulo completo añade hojas institucionales y documentales solo cuando existen. El manifiesto registra alcance, filtros, intervalo, conteos, versiones, licencias y advertencias.

La validación automatizada vuelve a abrir los archivos descargados con `read-excel-file`, en lugar de limitarse a comprobar el evento de descarga. Las decisiones de interacción, fórmulas, campos y alcance se detallan en `docs/fase-06-tabla-descargas.md`.

## 14. Prioridad de años y ejes fuera del recorte en la fase 06B

La vista esencial fija únicamente Indicador y sitúa los años inmediatamente después. Las columnas metodológicas son opcionales y no fijas; este cambio de presentación no interviene en filtros, selección, identidad de serie ni exportaciones.

En Economía, el recorte se traslada a un grupo que contiene solo líneas y puntos. Títulos, marcas y valores de los ejes permanecen fuera. Las escalas no cambian y el eje secundario conserva su unidad, color y escala independiente. Las guías horizontales se dibujan una sola vez desde el eje izquierdo. La verificación y las capturas están en `docs/fase-06b-usabilidad.md`.
