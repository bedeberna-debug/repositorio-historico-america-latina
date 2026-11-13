# Fase 04C — Corrección integral de la interacción y las bandas históricas

## Alcance y preservación

La fase modifica únicamente la presentación, la interacción, las pruebas y la documentación. No investiga ni incorpora datos. Los archivos canónicos, las respuestas originales, los importadores, las fuentes, las versiones y la trazabilidad permanecen intactos. Argentina y Chile conservan sus 1.050 observaciones anuales, 17 períodos presidenciales y 4 episodios de crisis.

## Estructura general

El explorador contiene cuatro bandas sincronizadas:

1. **Poderes del Estado.** Integra la antigua banda de gobiernos y la democracia electoral complementaria.
2. **Economía.** Mantiene una única visualización principal.
3. **Sociedad.** Mantiene una única visualización principal y reutiliza su espacio al cambiar de indicador.
4. **Acontecimientos.** Carril transversal con filas diferenciadas por categoría.

No existe una banda permanente e independiente de instituciones. La navegación regional, los módulos de Argentina y Chile, el resumen anual, las fichas y las tablas accesibles se conservan.

## Poderes del Estado

### Ejecutivo

Se mantienen los bloques de administraciones presidenciales con fechas, duración, interrupción disponible, fichas y procedencia. No se infieren partidos, coaliciones ni vínculos con crisis.

### Legislativo

Los carriles de cámara alta y cámara baja están preparados con eje temporal compartido y marcados como pendientes. El modelo `LegislativePeriod` admite períodos propios y segmentos fechados dentro de un mismo período; también contempla una cámara unicameral. No se cargan períodos, mayorías ni cambios.

La leyenda no ideológica distingue:

- Verde azulado: mayoría oficialista.
- Ocre: mayoría de oposición.
- Violeta: cámara dividida o sin mayoría clara.
- Gris oscuro con trama: ausencia o disolución del Congreso.
- Gris claro: composición desconocida.

Estos colores representan exclusivamente la relación con el Ejecutivo.

### Judicial

El carril identifica específicamente la Corte Suprema y permanece pendiente, compacto y sin nodos ficticios. Los contratos `JudicialInstitutionalStep` y `JudicialChangeNode` separan atributos persistentes de cambios puntuales. No se representan renovaciones completas ni se usan colores de oficialismo u oposición.

### Indicador complementario

Democracia electoral se consulta dentro de Poderes del Estado mediante un desplegable. Conserva su escala 0–1, sus vacíos, las observaciones 2000–2024 y su procedencia.

## Sociedad y valores derivados

Población total es la opción inicial y se representa como área histórica. Las composiciones etaria y urbano-rural usan áreas apiladas. Ambas ofrecen los modos explícitos **Población** y **Porcentaje**; Población es el modo predeterminado.

En Porcentaje se usan las observaciones originales. En Población se calcula, solo para la vista:

`población del grupo = población total × porcentaje del grupo / 100`

El cálculo requiere mismo país, año, nivel territorial, fuente y fecha de acceso, además de cobertura efectiva para ambos registros. Si falta una serie compatible no se genera el componente. No se ajusta la suma para forzarla al total.

Cada valor calculado:

- Tiene un identificador con prefijo `derived-population:` y `originalValue: null`.
- Se declara como valor derivado, nunca como observación original.
- Conserva enlaces directos a la población total y al porcentaje de origen.
- Expone fórmula, valores originales, unidades, fuentes, versiones, archivos y transformaciones en su ficha.
- No se escribe en los archivos canónicos ni modifica las observaciones en memoria.

Pobreza nacional e internacional permanecen separadas por metodología. Alfabetización conserva sus observaciones aisladas y sus vacíos. No se generan distribuciones de ingresos.

## Selección de áreas y accesibilidad

Las áreas de población y los sectores apilados son controles seleccionables. El clic identifica el año mediante la posición dentro del eje compartido y abre la ficha del componente correspondiente. Enter o Espacio abren el año seleccionado. El sector o área seleccionada se destaca mediante contorno.

Los puntos anuales se eliminan de las áreas continuas y apiladas. Las series escasas o discontinuas, como pobreza y alfabetización, conservan sus puntos. El cursor vertical, la navegación de año por teclado, el resumen anual y las tablas ofrecen alternativas no exclusivamente visuales.

## Economía

PIB per cápita PPA constante 2021 continúa activo por defecto con sus datos reales. PIB total y composición del PIB permanecen pendientes, sin cifras ni componentes simulados.

“Líneas históricas” admite una serie principal y una segunda serie retirable, con ejes, unidades, colores y escalas independientes. Como solo existe una serie económica cargada, la interfaz informa que la superposición requiere otra serie y no ofrece comparaciones ficticias. La infraestructura de doble eje se prueba con registros sintéticos aislados que no forman parte del repositorio ni de la aplicación.

## Acontecimientos

Las filas configuradas son elecciones, crisis institucionales, protestas y huelgas, escándalos, reformas y cambios normativos y otros acontecimientos. Las filas sin registros permanecen compactas. Cada acontecimiento se dibuja exclusivamente en su categoría, evitando superposiciones entre categorías en una misma fecha.

Para huelgas generales:

- Los años con cero eventos no generan nodos.
- Los años fuera de cobertura no generan nodos.
- Un agregado anual positivo genera un nodo con año, cantidad y ficha.
- La posición central dentro del año es una convención gráfica, no una fecha almacenada.
- Los ceros siguen disponibles en el mapa, el resumen y la consulta tabular.

La ausencia de nodos fuera de cobertura no se interpreta como ausencia histórica.

## Controles temporales y compacidad

Cada banda contiene `+`, `−`, `←` y `→`, con nombres accesibles y tooltips. Todos modifican el mismo intervalo que los controles superiores. El botón general de restablecer, los campos de inicio y fin y el selector de año se conservan.

Las visualizaciones principales reutilizan su espacio al cambiar de tema. En móvil se apilan los controles y las bandas; los gráficos mantienen desplazamiento interno para evitar el desbordamiento de toda la página.

## Verificación

- Compilación de producción correcta; persiste una advertencia no bloqueante de tamaño del paquete.
- 63 pruebas unitarias y de interacción superadas.
- Recorrido Chromium a 1440 × 1000 px y 390 × 844 px superado.
- Selección por puntero y teclado, procedencia derivada, doble eje aislado, categorías, ceros, cobertura, zoom y desplazamiento comprobados.
- Consola sin errores y ausencia de desbordamiento horizontal de página comprobados.
- Capturas revisadas en `artifacts/`; el servidor temporal se detiene en el bloque `finally` del recorrido.
