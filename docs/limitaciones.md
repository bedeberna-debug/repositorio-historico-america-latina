# Limitaciones y cuestiones pendientes — fases 02–06

## Alcance efectivo

1. Solo Argentina y Chile tienen datos canónicos: 1.873 observaciones anuales, 35 períodos presidenciales combinados para auditoría y 4 crisis. La vista de Chile usa 18 segmentos presidenciales oficiales; Argentina conserva 10 registros del curso. Los otros 16 países permanecen sin datos cargados.
2. Hay 32 indicadores, incluidos 15 sociales. Chile añadió 823 observaciones de 18 indicadores WDI, 22 períodos y segmentos legislativos, un nodo judicial y 34 acontecimientos documentales. Esta ampliación no es exhaustiva.
3. La fase 06 añade consulta tabular y exportación, pero no incorpora observaciones, fuentes ni `Hegemony.dta`; tampoco modifica las observaciones canónicas.
4. No se añadieron backend, autenticación, API pública, división subnacional, comparadores, correlaciones ni inferencias causales.
5. La reproducción temporal recorre años calendario; la duración intranual se representa en los intervalos y detalles de cada registro.
6. La cartografía generalizada no es adecuada para delimitaciones jurídicas, disputas territoriales ni análisis fronterizo de precisión.

## Verificación y metadatos pendientes

- Los paquetes anteriores documentan 30 registros de muestra cotejados: 12 de las fuentes del curso y 18 sociales. La ampliación de Chile añade 18 muestras estadísticas y 52 cotejos documentales en informes separados. El cotejo confirma coincidencia con el origen, no validación externa o metodológica.
- `variables_economicas.csv` no incluye institución, referencia bibliográfica, versión, fecha de publicación, licencia ni metadatos de descarga. No se atribuye una fuente externa por inferencia.
- `variables_vdem.csv` contiene `v2x_polyarchy`, pero no documenta la versión V-Dem, cita, fecha, licencia ni intervalos de incertidumbre. Estos campos requieren revisión documental.
- La referencia y versión 2 de Martínez (2020) provienen de la hoja README. La licencia y fecha exacta de publicación no están confirmadas en el archivo.
- `comparative survival.xlsx` y `Base_Final_RCP_v6.xlsx` no incluyen referencia bibliográfica ni licencia. “v6” se conserva como parte del nombre del archivo, no como versión bibliográfica validada.
- Las licencias y derechos de uso de los archivos del curso deben revisarse antes de cualquier publicación de datos derivados. Las series WDI registran CC BY 4.0 con los términos adicionales del catálogo del Banco Mundial, sin extender esa licencia a los archivos del curso.
- El manifiesto de descarga conserva las licencias y versiones disponibles, pero no completa ni resuelve las que permanecen pendientes.

## Tabla, cálculos y descargas de la fase 06

- La tabla no interpola, imputa ni infiere valores. “Sin dato”, “fuera de cobertura”, “no aplicable” y cero documentado son estados distintos.
- El CSV contiene observaciones almacenadas en el intervalo, no una fila inventada para cada combinación serie-año. Las ausencias explícitas de todo el intervalo se consultan en la matriz XLSX.
- Las composiciones absolutas y variaciones anuales son cálculos derivados de presentación, no observaciones canónicas ni validación metodológica. Las variaciones exigen años consecutivos y no se exportan como observaciones.
- La descarga de selección depende de las series visibles y activadas; la de categoría y la de módulo completo tienen alcances distintos, declarados en el manifiesto.
- Las hojas institucionales del XLSX reproducen los registros disponibles sin convertir su selección documental en un inventario exhaustivo.

## Cobertura y metodología

- PIB per cápita: valores importados para 2000–2025 en ambos países; no se validó externamente la metodología de construcción.
- Democracia electoral: valores para 2000–2024; las filas 2025 sin valor permanecen sin dato.
- Huelgas: Argentina 1984–2019 y Chile 1990–2019. Un cero significa “0 eventos registrados” solo dentro de esos intervalos. La ausencia fuera de cobertura no implica ausencia de eventos.
- Población y composición: cobertura WDI 1960–2025. La población se normaliza de personas a millones sin modificar el original; las composiciones admiten ±0,2 puntos porcentuales por redondeo, sin ajustar valores.
- Pobreza: las líneas nacionales no son directamente comparables entre países ni equivalentes a la línea internacional USD 3,00 PPA 2021. No se empalman metodologías ni se interpolan años sin encuesta.
- Alfabetización: solo 4 observaciones para Argentina y 7 para Chile entre 1980 y 2020, según el país. Su cobertura escasa limita la comparación temporal y no se rellena.
- Chile incorpora Gini, participación laboral, empleo por actividad y electricidad con coberturas propias. Desempleo, participación y empleo son estimaciones modeladas OIT (`source_estimate`), no observaciones directas. El control general puede ocultarlas junto con los valores `derived`.
- Las series fiscales chilenas tienen alcances y años desiguales; la deuda cargada corresponde al gobierno central y no a deuda pública general. Agricultura, industria y servicios no agotan la contabilidad del PIB y no se ajustan para sumar 100.
- Otras líneas internacionales de pobreza, ingresos, servicios básicos y medidas educativas adicionales permanecen pendientes de revisión de fuente, variante y cobertura.
- La serie presidencial del curso cubre registros hasta 2020 y conserva diferencias de fechas y truncamiento. La serie oficial BCN se mantiene separada y alimenta la vista chilena; no se fusionan ni se corrigen silenciosamente los originales.
- `failure=0` no se interpreta como mandato completado; solo `failure=1` se traduce como interrupción. Deben revisarse las convenciones para mandatos provisionales, sucesiones y fechas truncadas.
- Los segmentos legislativos posteriores a 1990 usan `unknown` mientras no exista correlación de fuerzas documentada. El intervalo 1973–1990 representa ausencia o disolución del Congreso, no falta de datos.
- La cobertura judicial se limita a un cambio de competencias de 1957; no describe integrantes, renovaciones ni persistencia posterior. Los 34 acontecimientos documentales son una selección, no un inventario histórico completo.
- Crisis: los cuatro episodios conservan la codificación original. Deben revisarse tipología, mecanismos, fechas pivote, niveles de confianza y relación entre `pres_fail` y `salida`.
- La ausencia de una crisis, elección, reforma o protesta registrada no significa que no haya existido.

## Diferencias entre diccionarios y archivos

- El diccionario preliminar mencionaba `NY.GDP.PCAP.PP.KD`; la columna efectiva importada es `GDP_pc_PPP_2021`.
- El codebook de crisis usa `year`, `country`, `type`, `horizontal_actor`, `vertical_actor`, `target`, `exit`, `flag_review`, `fecha_pivote` y `pivote_justificacion`; la hoja contiene `año`, `pais`, `tipo`, `actor_horizontal`, `actor_vertical`, `objetivo`, `salida`, `edited`, `fecha_peak` y `peak_justificacion`. La correspondencia está registrada, pero la discrepancia requiere revisión documental.
- `comparative survival.xlsx` separa `name` y `surname`; la normalización de nombres conserva ambos valores originales.

## Gobernanza pendiente

- Definir responsables y flujo para ampliar el cotejo más allá de la muestra.
- Establecer política de actualización, archivo de versiones y citación cuando se confirmen versiones externas.
- Mantener separados los estados “archivo revisado”, “observación importada” y “observación cotejada contra su fuente” en futuras fases.
