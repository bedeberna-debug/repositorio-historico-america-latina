# Fase 06 — Tabla de datos y descargas verificables

## Alcance

La fase 06 añade una vista **Tabla de datos** en los módulos de Argentina y Chile, complementaria al explorador histórico. Permite consultar series anuales, filtrarlas, activar una selección, revisar la procedencia de cada celda y descargar los datos en CSV o XLSX.

No se amplió la cobertura ni se incorporaron fuentes. No se modificaron las observaciones canónicas ni se incorporó `Hegemony.dta`. La tabla, las composiciones absolutas y las variaciones trabajan sobre los datos ya cargados y sus metadatos.

## Integración con el explorador

`CountryDataWorkspace` mantiene el intervalo visible y el control de estimaciones de fuente y valores derivados. Ambos se comparten entre el explorador y la tabla. Al seleccionar una celda también se sincronizan el año y el indicador del módulo.

La tabla se monta cuando se abre por primera vez. Después, las dos vistas permanecen montadas y la inactiva se oculta con `hidden`, de modo que cambiar de vista no reinicia filtros, selección o configuración. Al cambiar de país se reinicia el estado propio de la tabla para evitar mezclar módulos.

El intervalo mínimo es de cuatro años y permanece acotado entre 1950 y el año actual de la aplicación. El selector de vistas admite flechas izquierda y derecha; la matriz admite flechas para recorrer celdas y Inicio/Fin para ir a los extremos del intervalo.

## Identidad inequívoca de una serie

Cada fila representa una serie, no solamente un nombre de indicador. La clave `seriesId` se construye como una cadena JSON con estos componentes, en orden:

1. Código de país.
2. Identificador del indicador.
3. Variante.
4. Metodología o variante metodológica.
5. Unidad normalizada.
6. Identificador de fuente.
7. Identificador de versión del dataset.

Esta identidad evita combinar metodologías, unidades, fuentes o versiones distintas bajo una misma fila. Las observaciones se ordenan por año sin alterar sus valores originales o normalizados.

Las filas conservan ámbito, tema, indicador e identificador, variante y metodología, unidad, origen del valor y cobertura efectiva. Desde el ajuste 06B, la vista esencial muestra Indicador con variante y unidad resumidas como única columna fija, seguida inmediatamente por los años. Las demás columnas se activan con “Mostrar columnas metodológicas” y no tienen fijación horizontal. Esta presentación no altera los campos de las descargas.

## Filtros y selección

La tabla permite filtrar por:

- Texto en nombre, identificador, tema, variante, metodología, unidad o fuente; la búsqueda ignora mayúsculas y tildes.
- Ámbito y tema.
- Origen del valor: observado, estimado por la fuente o derivado.
- Estado de verificación: cotejado con el original, importado sin cotejo individual o en revisión.
- Existencia de al menos un valor numérico dentro del intervalo visible.

Las casillas activan series individualmente. También es posible seleccionar o quitar todas las series visibles y deseleccionar la totalidad. La selección puede incluir series activadas previamente que ya no coincidan con un filtro, pero la descarga de **selección actual** contiene únicamente las series activadas que siguen visibles.

## Valores, ausencias y cobertura

La matriz distingue cuatro presentaciones:

| Estado | Significado |
| --- | --- |
| Valor disponible | Existe una observación con valor, incluido un cero documentado. |
| Sin dato | No hay una observación con valor dentro de la cobertura declarada. |
| Fuera de cobertura | El año está fuera del intervalo de cobertura efectiva de la serie o esta cobertura no está delimitada. |
| No aplicable | La observación declara explícitamente que el indicador no aplica. |

Un cero de huelgas significa cero eventos registrados únicamente dentro de la cobertura documental. No se sustituyen ausencias por ceros, no se interpolan años y no se imputan valores. El CSV conserva los registros almacenados en el intervalo; no inventa filas anuales para completar ausencias. La matriz XLSX sí muestra el estado de cada celda del intervalo exportado.

## Derivados y variaciones anuales

Las composiciones absolutas reutilizan `derivePopulationObservation` y se calculan solo cuando población y porcentaje son compatibles:

`población del grupo = población total × porcentaje del grupo / 100`

Son valores derivados de presentación, no nuevas observaciones canónicas. La ficha de una celda derivada muestra la fórmula, los identificadores de las dos entradas y la procedencia de ambas.

Las variaciones están desactivadas por defecto. Cuando se activan, cada año presenta una columna adicional de variación y se calcula únicamente si la misma serie tiene valores numéricos en el año y en el año inmediatamente anterior:

- **Absoluta:** `valor(t) − valor(t−1)`; conserva la unidad de la serie.
- **Porcentual:** `(valor(t) − valor(t−1)) / valor(t−1) × 100`; exige denominador positivo y una unidad no porcentual.
- **Puntos porcentuales:** `valor(t) − valor(t−1)`; solo para unidades porcentuales.

Si falta el año consecutivo, el dato o la interpretación matemática, la celda de variación muestra un guion y explica que no es calculable. Las variaciones no se escriben en los repositorios ni se exportan como observaciones canónicas.

## Procedencia de celda

Al activar una celda se abre una ficha con país, año, identidad de serie, estado, valores y unidades originales y normalizados, origen del valor, fuente, versión, archivo o respuesta, hoja, fila o posición, variable original, transformaciones y alcance de verificación.

“Cotejado con el original” significa coincidencia con el archivo, respuesta o respaldo de origen. No equivale a validación externa, bibliográfica o metodológica de la fuente.

## Alcances de descarga

- **Selección actual:** series visibles y activadas, dentro del intervalo y con los filtros vigentes.
- **Categoría:** todas las series del tema elegido dentro del intervalo visible, sin exigir que estén activadas. Respeta el control compartido de estimaciones y derivados.
- **Módulo completo del país:** todas las series del país entre 1950 y el año actual, sin filtros. El XLSX añade hojas institucionales y documentales cuando existen registros.

Si el alcance y el intervalo no contienen observaciones, la aplicación no genera un archivo vacío y solicita ajustar la selección.

## Formatos

### CSV

El CSV contiene BOM UTF-8, separador de coma, comillas escapadas y una fila por observación almacenada dentro del alcance e intervalo. Sus campos estables incluyen país, año, identidad de serie e indicador, clasificación, variante, metodología, valores y unidades, estados, origen, verificación, fuente, versión, localización original, transformaciones, notas y entradas de derivación.

### XLSX

El XLSX se genera como archivo Open XML real con `write-excel-file`. Todas las descargas incluyen:

1. **Matriz histórica:** años en columnas, series en filas y ausencias explícitas.
2. **Datos largos:** los mismos campos estables del CSV.
3. **Diccionario:** definiciones, clasificación, metodología, unidad, origen, cobertura, fuente y versión.
4. **Fuentes y versiones:** institución, fechas, licencia, archivo y huella SHA-256 disponible.
5. **Notas metodológicas:** reglas generales, comparabilidad y derivaciones.
6. **Manifiesto:** país, fecha de generación, alcance, filtros, intervalo, conteos, versiones, licencias y advertencias.

El módulo completo agrega **Presidencias**, **Legislatura**, **Judicial** y **Acontecimientos** únicamente cuando el país posee esos registros. Estas hojas conservan sus propios campos y procedencia.

Los nombres de archivo incluyen país, alcance e intervalo. El manifiesto permite comprobar qué se descargó y advierte que no hubo interpolación ni imputación, que los derivados y variaciones son cálculos de presentación y que la cobertura no es exhaustiva.

## Verificación

Las pruebas automatizadas cubren construcción e identidad de series, filtros, ausencias, variaciones, contenido CSV, hojas y manifiesto XLSX, sincronización de vistas, selección y procedencia. El recorrido `scripts/browser-check-phase06.mjs` abre archivos descargados realmente, verifica 25 observaciones del CSV chileno filtrado a 2000–2024, comprueba la categoría y lee las diez hojas del módulo chileno. También contrasta el conteo del manifiesto con Datos largos, revisa el cero de huelgas argentino de 1989 y el estado fuera de cobertura de 1950.

El recorrido comprueba teclado, escritorio, móvil, desplazamiento interno, ausencia de desbordamiento horizontal de página, consola y recursos locales. Guarda las capturas en `artifacts/` y elimina los CSV/XLSX temporales al terminar. Los servidores de validación se detienen al finalizar.

## Limitaciones

La fase 06 mejora consulta y exportación, pero no resuelve las licencias, referencias, versiones o metadatos pendientes de las fuentes. La selección documental y la cobertura estadística siguen sin ser exhaustivas. Los cálculos de presentación no sustituyen revisión metodológica ni autorizan comparaciones entre series con definiciones distintas.
