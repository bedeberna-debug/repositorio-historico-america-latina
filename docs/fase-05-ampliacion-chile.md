# Fase 05 — Ampliación documental y estadística del módulo de Chile

## Alcance y estado de esta entrega

Trabajo limitado a Chile, nivel nacional y período general 1950–2026. Cada serie conserva su cobertura efectiva. No se crean observaciones para respuestas nulas, no se interpolan años y no se amplía Argentina ni la división subnacional. La entrega es una ampliación sustancial, no una declaración de cobertura completa.

La revisión previa comprobó la aplicación, los repositorios, las fuentes, los importadores, las cuatro bandas y las pruebas. Antes de modificar archivos se ejecutaron `npm run build` y `npm test`: compilación correcta y 63 pruebas superadas en cuatro archivos.

## Inventario y matriz inicial de cobertura

| Ámbito | Contenido | Estado inicial | Cobertura chilena inicial | Decisión de fase 05 |
|---|---|---|---|---|
| Economía | PIB per cápita, PPA 2021 | Cargado | 2000–2025 | Conservar sin sustitución. |
| Economía | PIB total | Estructura preparada, sin datos | Sin cobertura | Incorporar PIB real en USD constantes de 2015; conservar USD originales y derivar miles de millones. |
| Economía | Crecimiento, inflación, desempleo, tipo de cambio y tasa activa | Disponible, no incorporado | Sin cobertura en el módulo | Incorporar como series WDI separadas y con unidades propias. |
| Economía | Composición por actividad | Disponible, no incorporado | Sin cobertura en el módulo | Incorporar agricultura, industria y servicios como líneas; no apilarlas como si agotaran el PIB. |
| Economía | Ingresos y gastos públicos | Disponible, no incorporado | Sin cobertura en el módulo | Incorporar porcentajes del PIB con alcance de gobierno según ficha WDI. |
| Economía | Deuda | Disponibilidad irregular | Sin cobertura en el módulo | Incorporar solo deuda del gobierno central; no denominarla deuda pública general. |
| Economía | Componentes de gasto del PIB | Pendiente de investigación | Sin cobertura | Dejar como vacío; no mezclar con clasificación por actividad. |
| Economía y sociedad | Salario mínimo y canastas | Requieren investigación específica | Sin cobertura | No incorporar sin definiciones, moneda, periodicidad y comparabilidad suficientes. |
| Sociedad | Población total y composición etaria | Cargado | 1960–2025 | Conservar; los absolutos por grupo siguen siendo cálculos efímeros identificados. |
| Sociedad | Población urbana y rural | Cargado | 1960–2025 | Conservar como componentes compatibles. |
| Sociedad | Pobreza nacional | Cargado, cobertura irregular | 16 registros, 1987–2022 | Conservar años sin encuesta como vacíos. |
| Sociedad | Pobreza internacional USD 3,00 PPA 2021 | Cargado, cobertura irregular | 17 registros, 1987–2024 | Conservar como metodología independiente. |
| Sociedad | Alfabetización adulta | Cargado, cobertura irregular | 7 registros, 1982–2017 | Conservar sin unir años no consecutivos. |
| Sociedad | Gini y participación laboral | Disponible, no incorporado | Sin cobertura en el módulo | Incorporar como series separadas. |
| Sociedad | Empleo por actividad | Disponible, no incorporado | Sin cobertura en el módulo | Incorporar los tres componentes OIT modelados; validar cobertura conjunta y suma antes de componer. |
| Sociedad | Acceso a electricidad | Disponible, no incorporado | Sin cobertura en el módulo | Incorporar como servicio básico. |
| Ejecutivo | Presidentes | Cargado desde base del curso | 7 registros, 1990–2020 | Mantener el original para auditoría; usar en la vista una serie oficial BCN separada desde 1950. |
| Legislativo | Cámaras y correlación de fuerzas | Estructura preparada, sin datos | Sin cobertura | Incorporar períodos por cámara, relación desconocida cuando no haya correlación documentada y ausencia/disolución 1973–1990. |
| Judicial | Corte Suprema | Estructura preparada, sin datos | Sin cobertura | Primera cobertura mínima: nodo de reforma de 1957; integrantes y cambios posteriores quedan pendientes. |
| Acontecimientos | Crisis del curso y huelgas anuales | Cargado | 2 crisis; huelgas 1990–2019 | Conservar sin duplicar; los ceros no generan nodos. |
| Acontecimientos | Elecciones, plebiscitos, sucesiones y reformas | Disponible documentalmente, no incorporado | Sin cobertura en el módulo | Incorporar una selección fechada y justificada desde fuentes oficiales. |
| Acontecimientos | Protestas individuales, escándalos y acusaciones constitucionales | Requieren investigación sistemática | Sin cobertura específica | No inferirlos ni completar categorías por simetría. |
| Transversal | División subnacional histórica | Fuera de alcance | Sin cobertura | No incorporar en esta fase. |

## Comparación de presidencias antes de integrar la serie oficial

El archivo `data/canonical/presidential-periods.json` permanece intacto. Su cobertura chilena proviene de `comparative survival.xlsx`, no de una serie oficial chilena.

| Presidente | Registro anterior | Serie oficial BCN | Diferencia documentada |
|---|---|---|---|
| Patricio Aylwin | 1990-03-11–1994-03-11 | 1990-03-11–1994-03-11 | Coinciden. |
| Eduardo Frei Ruiz-Tagle | 1994-03-12–2000-03-11 | 1994-03-11–2000-03-11 | El inicio anterior está desplazado un día. |
| Ricardo Lagos | 2000-03-12–2006-03-11 | 2000-03-11–2006-03-11 | El inicio anterior está desplazado un día. |
| Michelle Bachelet, primer gobierno | 2006-03-12–2010-03-11 | 2006-03-11–2010-03-11 | El inicio anterior está desplazado un día. |
| Sebastián Piñera, primer gobierno | 2010-03-12–2014-03-11 | 2010-03-11–2014-03-11 | El inicio anterior está desplazado un día. |
| Michelle Bachelet, segundo gobierno | 2014-03-12–2018-03-11 | 2014-03-11–2018-03-11 | El inicio anterior está desplazado un día. |
| Sebastián Piñera, segundo gobierno | 2018-03-11–2020-12-31 | 2018-03-11–2022-03-11 | El registro anterior termina por límite de cobertura de la fuente, no por término presidencial. |

La serie anterior no contiene a Gabriel Boric ni a José Antonio Kast. La serie oficial separada los incorpora con fechas documentadas y deja `endDate: null` únicamente para la presidencia en ejercicio.

## Fuentes institucionales revisadas

- Biblioteca del Congreso Nacional de Chile, Historia Política: presidentes de la República, reseñas biográficas, historia del Congreso y procesos electorales. https://www.bcn.cl/historiapolitica/
- Poder Judicial de Chile, «Historia del Poder Judicial». https://www.pjud.cl/post/historia-del-poder-judicial
- Banco Mundial, World Development Indicators, API v2 y fichas oficiales por variable. https://api.worldbank.org/v2

La condición «oficial» no se presenta como validación metodológica independiente. El informe de importación distingue revisión de la ficha, cotejo automatizado contra la respuesta original y validación metodológica externa.

## Decisiones metodológicas

1. Los valores directos de WDI se identifican como `observed`; las series OIT modeladas como `source_estimate`. Los cálculos de población por grupo son `derived` y conservan ambas entradas. No se incorporan valores `inferred` ni `imputed`.
2. El PIB real se almacena originalmente en USD constantes de 2015 y se normaliza a miles de millones mediante división por 1.000.000.000. No se convierte a PPA ni se mezcla con el PIB per cápita ya cargado.
3. La frecuencia original de todas las series WDI incorporadas es anual. No se agregan subperíodos ni se transforman frecuencias.
4. Agricultura, industria y servicios no se presentan como una composición completa del PIB: la clasificación incluye otros componentes y ajustes no cargados. Se visualizan como líneas con unidad común, sin forzar suma 100.
5. Los períodos legislativos no implican conocimiento de su composición. Se usa `unknown` hasta disponer de correlación documentada. El intervalo 1973-09-11–1990-03-11 se clasifica como `congress_absent_or_dissolved`, no como dato faltante.
6. Las fechas exactas de acontecimientos se conservan como tales. Los conteos anuales de huelgas siguen sin fechas individuales y los valores cero no generan nodos.
7. La cobertura judicial es deliberadamente mínima: no se inventa una serie histórica del número de ministros ni se extienden reglas por proximidad temporal.

## Vacíos y trabajo pendiente

- Componentes del PIB por gasto; series fiscales con cobertura institucional más amplia y comparable; deuda pública general; salario mínimo y canastas con metodologías documentadas.
- Distribución de ingresos más allá del Gini; grupos socioeconómicos con metodología nacional comparable; nuevas pruebas educativas y servicios básicos adicionales.
- Correlación de fuerzas y criterios de oficialismo/oposición por cámara y fecha de medición; renovaciones parciales del Senado con detalle de composición.
- Serie histórica de integrantes de la Corte Suprema, reglas y competencias en otros hitos; distinción sistemática respecto del Tribunal Constitucional.
- Cobertura documental sistemática de protestas individuales, escándalos, acusaciones constitucionales y conflictos entre poderes.
- Revisión de cambios retrospectivos al volver a ejecutar los importadores contra versiones WDI posteriores.

## Resultado incorporado

- 823 observaciones nuevas para Chile, correspondientes a 18 indicadores WDI: 12 económicos y 6 sociales. Se omitieron 365 respuestas nulas sin convertirlas en cero.
- 647 observaciones nuevas `observed` y 176 `source_estimate`; estas últimas corresponden a desempleo, participación laboral y los tres componentes del empleo modelados por la OIT.
- Total integrado: 1.873 observaciones y 32 indicadores. Argentina conserva 533 observaciones; Chile reúne 1.340. Hay 15 indicadores sociales y 30 series anuales consultables en el explorador.
- 18 segmentos presidenciales oficiales para la vista de Chile, 22 períodos y 22 segmentos legislativos, un nodo judicial y 34 acontecimientos documentales: 19 elecciones, 2 sucesiones, 6 reformas, 6 constituciones y un conflicto institucional.
- 18 muestras estadísticas cotejadas y 52 cotejos documentales registrados en los informes específicos. Estos controles confirman correspondencia con el origen, no validación metodológica externa.

## Verificación final

- Segunda ejecución de `python scripts/import_chile_phase05.py`: 823 observaciones, 18 indicadores, 18 muestras, 365 nulos omitidos, 0 altas, 0 cambios y 0 bajas.
- Segunda ejecución de `python scripts/import_chile_documentary.py`: mismos 18 segmentos presidenciales, 22 períodos y segmentos legislativos, un nodo judicial, 34 acontecimientos y 52 cotejos.
- `npm run build`: compilación TypeScript y Vite correcta; persiste únicamente la advertencia no bloqueante de tamaño del paquete JavaScript.
- `npm test`: 67 pruebas superadas en cuatro archivos, incluidas procedencia, estimaciones OIT, composiciones, registros documentales y filtro de valores derivados y estimados.
- `npm run check:browser`: recorrido Chromium superado a 1440 × 1000 y 390 × 844 px. Comprueba fichas legislativa, judicial y documental, PIB total y composición, doble eje, filtro de procedencia, teclado, consola y desbordamientos. Las capturas quedan en `artifacts/` y el servidor temporal se detiene al finalizar.

Esta verificación no elimina los vacíos enumerados ni convierte la ampliación en una cobertura histórica exhaustiva de Chile.
