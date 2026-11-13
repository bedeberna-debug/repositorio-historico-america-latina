# Fase 04B — Rediseño de interacción del explorador histórico

## Alcance y preservación

Esta fase modifica la presentación y la interacción del módulo país. No incorpora fuentes, indicadores ni observaciones, y no altera los archivos canónicos, los importadores ni los originales. Se conservan las 1.050 observaciones anuales de Argentina y Chile, los gobiernos, las crisis, las fuentes, los metadatos y la trazabilidad por registro.

## Gramática visual

El explorador contiene cinco bandas sincronizadas: gobiernos, economía, sociedad, instituciones y acontecimientos. Economía, sociedad e instituciones tienen una sola visualización principal y alturas comparables. Sus selectores locales reemplazan la matriz general de casillas. Al cambiar de tema se sustituye el contenido del mismo espacio, sin conservar subbandas desactivadas; el año y el intervalo visible no cambian.

Cada banda temática muestra unidad, cobertura, fuente y acceso a una ficha metodológica. El cursor de año, el zoom, el desplazamiento, la selección por teclado, el resumen anual y las tablas accesibles se mantienen.

## Sociedad

- **Población total:** opción inicial, con área histórica y vacíos sin interpolación.
- **Composición etaria:** tres áreas apiladas para 0–14, 15–64 y 65 años o más.
- **Población urbana y rural:** dos áreas apiladas.
- **Pobreza:** una metodología activa por vez; las líneas nacional e internacional no se combinan.
- **Educación:** alfabetización como línea y puntos, sin conectar años no observados.

Las composiciones solo usan años con todos sus componentes. Se conserva la validación de compatibilidad y la tolerancia de suma de ±0,2 puntos porcentuales.

## Economía y doble eje

PIB per cápita PPA constante 2021 es la opción inicial por ser la única serie económica cargada. PIB total y composición del PIB son opciones seleccionables identificadas como pendientes; no muestran cifras ni componentes simulados.

“Líneas históricas” permite una serie principal y prepara una segunda serie retirable. Cada serie tiene su propia escala, eje, unidad, color y procedencia. La advertencia sobre escalas independientes permanece visible en esta modalidad. Como no existe una segunda serie económica cargada, la aplicación solo habilita la selección individual e informa la limitación. Las pruebas del doble eje usan registros sintéticos aislados, declarados como tales y ausentes del repositorio canónico y de la aplicación.

## Instituciones y acontecimientos

Democracia electoral conserva su línea histórica con escala 0–1. La composición legislativa queda prevista como opción pendiente. Las huelgas dejan de ser una subbanda institucional.

El carril transversal distingue mediante `temporalType`:

- `exact`: acontecimiento con fecha exacta.
- `interval`: episodio con inicio y término documentados.
- `annual_aggregate`: conteo anual sin fechas individuales; `startDate` y `endDate` permanecen nulos y el año se almacena en `year`.

Las crisis conservan sus fechas, categoría, duración, actores, fuente y verificación. Cada observación anual de huelgas genera un nodo con el total del país y año. Su posición central dentro del año es únicamente una convención gráfica explicada en la ficha; no implica una fecha ni distribución mensual. Elecciones, escándalos, reformas y constituciones son categorías previstas, sin registros ficticios.

## Accesibilidad, responsive y límites

Los selectores son controles nativos, los nodos y observaciones tienen etiquetas y operación por teclado, y las descripciones identifican la visualización activa. En pantallas pequeñas las bandas y controles se apilan. Los gráficos conservan desplazamiento interno para evitar el desbordamiento horizontal de toda la página y mantener legibles los ejes y nodos.

No se cargan PIB total, componentes del PIB, salario mínimo, canasta básica ni nuevas series sociales o institucionales. La superposición económica real quedará disponible cuando exista otra serie cargada y documentada.
