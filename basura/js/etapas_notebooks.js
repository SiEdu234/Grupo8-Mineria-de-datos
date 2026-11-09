window.NOTEBOOK_STAGES = {
  "prep": [
    {
      "title": "1. Configurar entorno y fuentes",
      "cellIndex": 0,
      "stepIndex": 2,
      "summary": "El notebook de preparación parte de los CSV oficiales y fija una muestra reproducible.",
      "input": "Google Drive con EDMCup2023/data: puntajes, asignaciones, relaciones, secuencias, problemas y action_logs.csv.",
      "process": "Monta Drive, fija SEED=42, MAX_STUDENTS=3000 y CHUNK_SIZE=300000; construye las rutas de entrada y salida.",
      "transformation": "El tamaño de muestra limita la corrida a 3 000 estudiantes; leer acciones por bloques reduce memoria.",
      "modeling": "No entrena algoritmos.",
      "output": "Rutas hacia datos oficiales y assistments_rf_dataset.csv.gz.",
      "forms": "Configuración de la preparación; todavía no existe una tabla integrada."
    },
    {
      "title": "2. Definir funciones de lectura y limpieza",
      "cellIndex": 1,
      "stepIndex": 2,
      "summary": "Las funciones estandarizan claves y leen solo datos necesarios para la muestra.",
      "input": "Claves de asignación, problema, estudiante y secuencia, además de columnas seleccionadas de cada CSV.",
      "process": "normalize_id limpia espacios y el sufijo .0; read_scores convierte score a número y añade source_split; read_filtered_csv lee por fragmentos y filtra IDs.",
      "transformation": "normalize_category unifica categorías y clean_text limpia texto antes de codificarlo.",
      "modeling": "No se entrena.",
      "output": "Funciones listas para leer resultados y filtrar archivos relacionados.",
      "forms": "Rutinas reutilizables que preparan claves consistentes para los joins."
    },
    {
      "title": "3. Leer score y definir la etiqueta",
      "cellIndex": 2,
      "stepIndex": 1,
      "summary": "La clase objetivo se toma de la etiqueta oficial del caso, no se deduce de la ruta curricular.",
      "input": "training_unit_test_scores.csv y evaluation_unit_test_scores.csv; cada fila identifica una asignación, un problema y score.",
      "process": "Carga los puntajes, convierte score a valor numérico y conserva el origen train/evaluation. Forma el conjunto de IDs de asignación para filtrar metadatos.",
      "transformation": "score=0 significa no exitoso; score=1 significa exitoso. La secuencia se usa después como predictor, no para crear la etiqueta.",
      "modeling": "Todavía no se ajusta clasificador.",
      "output": "Puntajes etiquetados con la partición oficial y claves para encontrar estudiantes.",
      "forms": "La etiqueta permanece como columna dependiente y luego se separará de X.",
      "extra": {
        "title": "Criterio de etiquetado",
        "text": "La etiqueta score ya está en los CSV oficiales. Si evaluation trae valores vacíos, el código recupera el score oficial de unit_test_scores.csv usando el par de claves assignment_log_id y problem_id. Si quedan etiquetas faltantes, detiene el proceso en vez de inventar la clase."
      }
    },
    {
      "title": "4. Seleccionar estudiantes y unir prácticas",
      "cellIndex": 3,
      "stepIndex": 3,
      "summary": "Selecciona 3 000 estudiantes y conecta cada problema final con su historial de prácticas.",
      "input": "Puntajes oficiales, assignment_details.csv y assignment_relationships.csv.",
      "process": "Muestrea student_id con random_state=42; filtra asignaciones, elimina duplicados por asignación/problema/partición y une las relaciones con las prácticas anteriores.",
      "transformation": "Calcula unfinished_practice / total_practice como notfinish_percent y conserva las claves para buscar interacciones.",
      "modeling": "No entrena; construye la unidad de análisis y atributos previos.",
      "output": "Tabla targets con score, student_id, source_split y relaciones de práctica.",
      "forms": "Una fila representa un problema de evaluación final; las prácticas relacionadas se resumen por esa fila."
    },
    {
      "title": "5. Agregar acciones y opciones de tutoría",
      "cellIndex": 4,
      "stepIndex": 2,
      "summary": "Resume eventos de práctica sin dejar un registro por cada clic.",
      "input": "action_logs.csv, filtrado a asignaciones de práctica relacionadas con los estudiantes muestreados.",
      "process": "Lee en bloques de 300 000 filas; agrupa por evaluación final y problema; cuenta 14 tipos de acción y cuatro categorías de tutoría. Resume intentos y opciones de visibilidad.",
      "transformation": "Los conteos se convierten en columnas numéricas; categorías desconocidas se agrupan como other.",
      "modeling": "No entrena.",
      "output": "Features agregadas por problema final para unir con score y student_id.",
      "forms": "La tabla final representa el historial como variables resumen."
    },
    {
      "title": "6. Incorporar la secuencia curricular",
      "cellIndex": 5,
      "stepIndex": 2,
      "summary": "Añade la ruta curricular asociada a la asignación final.",
      "input": "sequence_details.csv y sequence_id procedente de assignment_details.csv.",
      "process": "Une cuatro niveles de ruta curricular con cada asignación y limpia las categorías.",
      "transformation": "pd.get_dummies convierte categorías de los cuatro niveles en columnas 0/1; la ruta no determina score.",
      "modeling": "No entrena.",
      "output": "Columnas One-Hot para las categorías de secuencia.",
      "forms": "Variables categóricas convertidas a formato numérico."
    },
    {
      "title": "7. Transformar atributos del problema y vector textual",
      "cellIndex": 6,
      "stepIndex": 2,
      "summary": "Codifica atributos del problema final y separa el vector textual incluido en la fuente.",
      "input": "problem_details.csv: tipo, posición multipart, código/descrición de habilidad, multipart_id y problem_text_bert_pca.",
      "process": "Limpia categorías, divide skill_code en hasta cuatro partes y extrae hasta 32 números del vector textual.",
      "transformation": "One-Hot codifica categorías del problema; el vector BERT-PCA se reutiliza y no se vuelve a calcular.",
      "modeling": "No entrena BERT, PCA ni un clasificador.",
      "output": "Variables numéricas del problema y 32 columnas problem_text_bert_pca_0 a _31.",
      "forms": "La fuente entrega el vector; el notebook solo lo convierte de texto a columnas numéricas."
    },
    {
      "title": "8. Tratar valores y guardar la tabla",
      "cellIndex": 7,
      "stepIndex": 1,
      "summary": "Completa los predictores numéricos y escribe el archivo final comprimido.",
      "input": "Targets, agregados, secuencia y características del problema integrados.",
      "process": "Convierte infinitos a faltantes; rellena conteos de acción/tutoría con 0 y otros predictores ausentes o no numéricos con -1. Convierte predictores a float32.",
      "transformation": "Excluye score e IDs de la lista feature_columns para el modelado posterior; score se conserva como etiqueta. No aplica StandardScaler ni Min-Max.",
      "modeling": "No entrena.",
      "output": "assistments_rf_dataset.csv.gz con referencia de 51 042 filas, 3 000 estudiantes y 727 columnas.",
      "forms": "722 predictores + score + cuatro campos de rastreo."
    },
    {
      "title": "9. Revisar la salida preparada",
      "cellIndex": 8,
      "stepIndex": 0,
      "summary": "Comprueba una muestra de filas y los campos que pasarán al notebook de modelado.",
      "input": "CSV comprimido guardado en la carpeta de salida.",
      "process": "Lee cinco filas y muestra primero etiqueta/IDs/partición y luego algunos predictores.",
      "transformation": "La vista previa es inspección; no modifica ni reentrena datos.",
      "modeling": "No entrena.",
      "output": "Cabeceras y filas de ejemplo para confirmar el esquema de salida.",
      "forms": "Evidencia breve del antes/después de preparar los datos."
    }
  ],
  "rf": [
    {
      "title": "1. Cargar y perfilar la tabla preparada",
      "cellIndex": 0,
      "stepIndex": 2,
      "summary": "El notebook RF recibe la tabla integrada; no vuelve a leer ni unir los CSV crudos.",
      "input": "assistments_rf_dataset.csv.gz, subido en Colab.",
      "process": "Lee el CSV, cuenta filas, estudiantes y columnas, y muestra distribución de source_split y score.",
      "transformation": "Los datos ya vienen transformados desde el notebook de preparación.",
      "modeling": "Todavía no se ajusta RF.",
      "output": "DataFrame df y gráfica de distribución de la clase.",
      "forms": "Verifica que el modelo recibe 51 042 registros, 727 columnas y la etiqueta."
    },
    {
      "title": "2. Separar X, y y la partición",
      "cellIndex": 1,
      "stepIndex": 0,
      "summary": "Separa la respuesta real de las variables predictoras y conserva la partición original.",
      "input": "df con score, source_split, cuatro campos de rastreo y 722 predictores.",
      "process": "Construye X al excluir score, student_id, source_split, unit_test_assignment_log_id y problem_id; asigna score a y.",
      "transformation": "Convierte X a números, faltantes no convertibles a -1 y tipo float32; usa source_split para crear train y evaluation.",
      "modeling": "score no entra como predictor. y_train alimenta el ajuste; y_test se reserva para contrastar predicciones.",
      "output": "X_train/y_train, X_test/y_test y 722 columnas predictoras.",
      "forms": "La evaluación usa la etiqueta real solo después de predecir, para medir el resultado."
    },
    {
      "title": "3. Configurar y entrenar el Random Forest base",
      "cellIndex": 1,
      "stepIndex": 2,
      "summary": "Reproduce el modelo de la práctica 1-2 y lo ajusta únicamente con train.",
      "input": "X_train, y_train y parámetros del RF de la práctica.",
      "process": "RandomForestClassifier usa 600 árboles; fit(X_train, y_train) aprende reglas de decisión y combina los votos de los árboles.",
      "transformation": "max_depth=19, min_samples_split=10 y min_samples_leaf=2 limitan crecimiento; max_features=sqrt añade diversidad; bootstrap=True usa muestras con reemplazo. random_state=42 fija aleatoriedad y n_jobs=-1 paraleliza.",
      "modeling": "Evaluation no interviene en fit.",
      "output": "Objeto rf ajustado y predicciones/probabilidades para medir las particiones.",
      "forms": "La semilla apoya reproducibilidad; no eleva por sí sola el rendimiento."
    },
    {
      "title": "4. Calcular las cuatro métricas solicitadas",
      "cellIndex": 1,
      "stepIndex": 3,
      "summary": "Compara clases predichas con etiquetas reales y presenta las métricas pedidas por la docente.",
      "input": "pred_train frente a y_train; y_pred frente a y_test.",
      "process": "Calcula accuracy, precisión macro, recall macro y F1 macro en entrenamiento y evaluación.",
      "transformation": "Macro calcula la métrica por clase 0 y 1 y promedia con igual peso. La tabla no separa métricas por clase.",
      "modeling": "No vuelve a entrenar. y_test sirve como referencia de evaluación y no como entrada del modelo.",
      "output": "Tabla de cuatro métricas para las dos particiones. RF base en evaluación: 0,7022; 0,6923; 0,6797; 0,6828.",
      "forms": "ROC-AUC se queda como referencia gráfica y no se incorpora a la tabla solicitada."
    },
    {
      "title": "5. Leer las gráficas del RF",
      "cellIndex": 2,
      "stepIndex": 1,
      "summary": "Cada figura responde una pregunta distinta: distribución, métricas, errores, umbrales e importancia.",
      "input": "score real, predicciones, probabilidades e importancias del RF.",
      "process": "Dibuja distribución de score; barras de las cuatro métricas; matriz de confusión; curva ROC para score=0; y las 15 importancias principales.",
      "transformation": "En la matriz las filas son reales y las columnas predichas. La ROC varía el umbral; AUC resume ordenamiento, no exactitud. Importancia no implica causalidad.",
      "modeling": "Las gráficas no cambian el modelo ajustado.",
      "output": "Figuras generadas a partir de la corrida del RF. En evaluation la matriz base es [[2526, 2009], [1299, 5273]].",
      "forms": "Si la clase 0 es la prioridad, explica que el recall específico de 0 es 2 526/4 535=0,5570."
    },
    {
      "title": "6. Aplicar el modelo a un CSV nuevo (opcional)",
      "cellIndex": 3,
      "stepIndex": 0,
      "summary": "El notebook permite una predicción por lote sobre un archivo nuevo ya preparado.",
      "input": "CSV nuevo con el mismo esquema de 722 predictores; la opción está apagada por defecto.",
      "process": "Al activarse, verifica que estén las columnas de entrenamiento, las ordena, calcula clase y probabilidades y guarda un CSV de salida.",
      "transformation": "score real no debe entrar como predictor. Los IDs que vengan pueden acompañar la salida para rastreo.",
      "modeling": "Usa rf ya entrenado; no vuelve a ajustar ni constituye una API o interfaz web.",
      "output": "predicciones_nuevos_datos.csv si se activa la celda.",
      "forms": "Implementación disponible en notebook; despliegue institucional y monitoreo continuo son propuestas."
    }
  ],
  "comparison": [
    {
      "title": "1. Cargar la tabla común",
      "cellIndex": 0,
      "stepIndex": 1,
      "summary": "Los tres algoritmos parten del mismo archivo preparado para que la comparación sea equivalente.",
      "input": "assistments_rf_dataset.csv.gz generado por el notebook de preparación.",
      "process": "Lee dimensiones, cantidad de estudiantes, source_split y frecuencia de score.",
      "transformation": "No vuelve a integrar archivos crudos ni crea variables nuevas.",
      "modeling": "Todavía no entrena.",
      "output": "DataFrame común de 3 000 estudiantes y 722 predictores.",
      "forms": "Mantener una misma entrada reduce diferencias ajenas al algoritmo."
    },
    {
      "title": "2. Definir predictores y particiones",
      "cellIndex": 1,
      "stepIndex": 2,
      "summary": "La partición oficial separa filas, pero algunos student_id aparecen tanto en train como en evaluation. Este bloque mide cuánto se comparten.",
      "input": "source_split, student_id y máscaras de filas para train y evaluation.",
      "process": "Crea conjuntos de IDs únicos por partición; la intersección overlap contiene 31 estudiantes compartidos. Después cuenta las filas de evaluation cuyo ID pertenece a train: shared_eval_rows=552.",
      "transformation": "student_id se excluye de X; aquí se usa solo para auditar la división. Las 552 filas son registros de evaluación asociados a esos IDs, no 552 duplicados.",
      "modeling": "Este conteo no modifica X, y ni el entrenamiento. Indica que se evalúan registros reservados, pero parte de sus estudiantes ya tuvo registros en train.",
      "output": "31 student_id aparecen en ambos conjuntos; 552 filas de evaluation corresponden a esos estudiantes.",
      "forms": "La prueba representa registros no vistos; no demuestra desempeño en personas completamente nuevas. Para ese objetivo, separar por estudiante con una validación agrupada.",
      "extra": {
        "title": "Ejemplo para explicarlo",
        "text": "Si el estudiante A tiene problemas registrados en train y otros problemas en evaluation, esas filas no son copias: son observaciones distintas del mismo estudiante. El modelo no recibe el ID A, pero sus patrones de actividad pueden aparecer en ambos conjuntos. Por eso se recomienda mantener todas las filas de cada estudiante en un solo lado de la partición cuando se quiera medir generalización a alumnos nuevos."
      }
    },
    {
      "title": "3. Configurar los tres algoritmos",
      "cellIndex": 2,
      "stepIndex": 1,
      "summary": "Se comparan RF base, RF modificado y Extra Trees; la segunda configuración cambia tres límites.",
      "input": "Mismos 722 predictores y semilla.",
      "process": "Crea tres clasificadores con 600 árboles y max_features=sqrt; fija bootstrap=True, random_state=42 y n_jobs=-1.",
      "transformation": "RF modificado usa depth=12, split=20, leaf=5; base y Extra Trees usan 19, 10, 2. Extra Trees aleatoriza umbrales de corte.",
      "modeling": "No hay búsqueda automática; son configuraciones experimentales fijadas en código.",
      "output": "Tres estimadores listos para entrenar.",
      "forms": "Más límites restrictivos pueden reducir complejidad, pero también causar subajuste."
    },
    {
      "title": "4. Entrenar y calcular métricas",
      "cellIndex": 3,
      "stepIndex": 3,
      "summary": "Cada estimador aprende con train y se evalúa en train y evaluation con las mismas cuatro métricas.",
      "input": "Los tres estimadores y X_train/y_train; luego X_train y X_test para calcular resultados.",
      "process": "Llama fit una vez por modelo; predict genera clase. Para cada partición calcula accuracy, precisión macro, recall macro y F1 macro.",
      "transformation": "average=macro promedia score=0 y score=1 con igual peso. La matriz y ROC se guardan aparte para las figuras.",
      "modeling": "Evaluation no se usa para fit ni para buscar parámetros/umbral.",
      "output": "Dos tablas comparativas y datos necesarios para las figuras.",
      "forms": "La tabla de evaluación es principal para comparar; train describe ajuste a datos vistos."
    },
    {
      "title": "5. Comparar las métricas entre modelos",
      "cellIndex": 4,
      "stepIndex": 1,
      "summary": "El gráfico reúne las mismas cuatro métricas para entrenamiento y evaluación.",
      "input": "Tablas calculadas en la etapa anterior.",
      "process": "Dibuja dos paneles con escala de 0 a 1; cada grupo de barras compara los tres algoritmos.",
      "transformation": "No recalcula ni simula resultados; solo representa valores medidos.",
      "modeling": "No reentrena.",
      "output": "comparacion_metricas_train_evaluation.png.",
      "forms": "En evaluation, RF base alcanza los mayores valores de las cuatro métricas reportadas."
    },
    {
      "title": "6. Explicar las curvas ROC",
      "cellIndex": 5,
      "stepIndex": 0,
      "summary": "La figura compara capacidad de ordenar score=0 al variar el umbral de decisión.",
      "input": "Probabilidades estimadas de score=0 y clases reales en train/evaluation.",
      "process": "Calcula tasa de falsos positivos y verdaderos positivos para muchos umbrales y traza una curva por modelo.",
      "transformation": "La diagonal es azar; curva más cerca de la esquina superior izquierda suele discriminar mejor. AUC no es porcentaje de aciertos.",
      "modeling": "No cambia umbrales del modelo para mejorar evaluation.",
      "output": "curvas_ROC_train_evaluation.png. AUC evaluation: RF 0,7528; RF modificado 0,7489; Extra Trees 0,7340.",
      "forms": "AUC se interpreta en la gráfica, no se añade a las dos tablas macro solicitadas."
    },
    {
      "title": "7. Leer las matrices de confusión",
      "cellIndex": 6,
      "stepIndex": 0,
      "summary": "Las matrices muestran conteos concretos de aciertos y errores de cada modelo en evaluation.",
      "input": "y_test y las predicciones de los tres modelos.",
      "process": "Dibuja tres matrices con filas reales 0/1 y columnas predichas 0/1.",
      "transformation": "La diagonal son aciertos; fuera de la diagonal quedan omisiones y falsas alertas.",
      "modeling": "No vuelve a entrenar.",
      "output": "RF base [[2526, 2009], [1299, 5273]]; RF modificado [[2382, 2153], [1182, 5390]]; Extra Trees [[2342, 2193], [1295, 5277]].",
      "forms": "Para score=0, la celda real0/predicho1 cuenta no éxitos que el modelo omitió."
    },
    {
      "title": "8. Cerrar la comparación y reconocer límites",
      "cellIndex": 3,
      "stepIndex": 4,
      "summary": "La conclusión compara resultados reales y limita la afirmación a esta corrida y esta partición.",
      "input": "Métricas de evaluation, matrices y conteo de estudiantes compartidos.",
      "process": "Explica que RF base lidera las cuatro métricas macro reportadas; RF modificado y Extra Trees no las superan en conjunto.",
      "transformation": "La partición separa registros pero comparte 31 estudiantes; no demuestra generalización a personas no vistas.",
      "modeling": "No declara un ganador universal ni que el sistema esté listo para producción.",
      "output": "Conclusión técnica y siguiente mejora: validación agrupada por student_id y umbral definido en validación.",
      "forms": "La evidencia sustenta “mejor de esta comparación”, no “mejor modelo para cualquier contexto”."
    }
  ]
};

const NOTEBOOK_PHASES = {
  "prep": [
    "Comprensión de datos: entrada",
    "Preprocesamiento: lectura y claves",
    "Comprensión y etiquetado",
    "Preprocesamiento: selección y relación",
    "Preprocesamiento: agregación de acciones",
    "Normalización y codificación",
    "Transformación de predictores",
    "Normalización numérica y salida",
    "Control de calidad de salida"
  ],
  "rf": [
    "Comprensión de datos: entrada",
    "Preprocesamiento: X, y y partición",
    "Modelado: Random Forest base",
    "Evaluación: métricas",
    "Evaluación: gráficos",
    "Despliegue: predicción opcional"
  ],
  "comparison": [
    "Comprensión de datos: conjunto común",
    "Preprocesamiento: X, y y partición",
    "Modelado: algoritmos y parámetros",
    "Evaluación: métricas",
    "Evaluación: comparación gráfica",
    "Evaluación: ROC y umbrales",
    "Evaluación: matrices de confusión",
    "Conclusiones y límites"
  ]
};

Object.keys(window.NOTEBOOK_STAGES).forEach(bookId => {
  window.NOTEBOOK_STAGES[bookId].forEach((stage, index) => {
    stage.phase = NOTEBOOK_PHASES[bookId][index];
  });
});
