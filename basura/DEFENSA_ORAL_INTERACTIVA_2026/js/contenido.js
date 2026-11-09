window.GUIA = {
  stats: [
    { value: '3 000', label: 'estudiantes', note: 'muestra reproducible · seed 42' },
    { value: '51 042', label: 'registros', note: 'una fila por problema de evaluación final' },
    { value: '722', label: 'predictores', note: 'más 5 campos de etiqueta y trazabilidad' },
    { value: '11 107', label: 'registros de prueba', note: 'partición oficial evaluation' }
  ],
  steps: [
    {
      title: 'Explicar el caso', tag: '01 · problema',
      say: 'El caso usa datos de ASSISTments para anticipar si un estudiante tendrá éxito en un problema de fin de unidad. Nuestra réplica conserva el Random Forest de la práctica y compara una variante y Extra Trees con la misma muestra y partición.',
      show: 'Empieza por el título del artículo y explica la unidad de análisis: una fila es un problema de evaluación final de un estudiante.',
      code: 'Caso original: Navigating the Data-Rich Landscape of Online Learning: Insights and Predictions from ASSISTments.\nUnidad de análisis: estudiante × problema de evaluación final.\nEtiqueta disponible en los datos: score ∈ {0, 1}.',
      ask: '¿Qué significa score=0 y score=1?',
      answer: 'score=1 representa éxito y score=0 resultado no exitoso, de acuerdo con la etiqueta del caso. La etiqueta se lee del archivo de resultados; no se inventa durante el entrenamiento.'
    },
    {
      title: 'Reconocer los datos', tag: '02 · datos',
      say: 'La muestra contiene 3 000 estudiantes y 51 042 filas. El CSV procesado tiene 727 columnas: score, cuatro campos de rastreo y 722 predictores. Las particiones oficiales tienen 39 935 filas de train y 11 107 de evaluation.',
      show: 'Abre primero una hoja cruda para mostrar varias tablas de origen. Luego abre una hoja procesada para mostrar la fila integrada y sus predictores.',
      code: 'Columnas de rastreo: unit_test_assignment_log_id, problem_id, student_id, source_split.\nEtiqueta: score.\nX: 722 columnas predictoras después de excluir esos cinco campos.',
      ask: '¿Por qué una fila no representa a un estudiante completo?',
      answer: 'La predicción se hace por problema de fin de unidad; un mismo estudiante puede aportar varias filas.'
    },
    {
      title: 'Preprocesar los archivos', tag: '03 · preparación',
      say: 'El notebook lee los CSV oficiales, normaliza las claves y une resultados con asignaciones, relaciones, secuencias, problemas y acciones. Selecciona 3 000 estudiantes con semilla 42. Lee action_logs.csv por bloques de 300 000 filas para usar menos memoria.',
      show: 'En el notebook ASSISTments_01_Preparar_CSV, busca MAX_STUDENTS, SEED, CHUNK_SIZE, normalize_id y el bloque que construye targets.',
      code: 'SEED = 42\nMAX_STUDENTS = 3000\nCHUNK_SIZE = 300_000\n\ndef normalize_id(values):\n    return (values.astype("string").str.strip()\n            .str.replace(r"\\.0$", "", regex=True))',
      ask: '¿Por qué limpian los identificadores?',
      answer: 'Para que el mismo ID coincida entre archivos aunque haya sido leído como número, texto o decimal con .0. Si las claves no coinciden, las uniones pierden registros.'
    },
    {
      title: 'Transformar y construir X', tag: '04 · transformación',
      say: 'Las acciones y tipos de tutoría se convierten en conteos; se calcula notfinish_percent; las categorías de secuencia y problema se codifican con indicadores; el código de habilidad se separa en cuatro partes. Se conservan 32 componentes BERT-PCA que ya vienen en la fuente.',
      show: 'En la preparación, señala action_categories, notfinish_percent, pd.get_dummies y parse_bert_vector. En el modelo, muestra id_columns, X e y.',
      code: 'id_columns = {\n    "score", "student_id", "source_split",\n    "unit_test_assignment_log_id", "problem_id"\n}\nfeature_columns = [c for c in df.columns if c not in id_columns]\nX = df[feature_columns].apply(pd.to_numeric, errors="coerce").fillna(-1).astype("float32")\ny = pd.to_numeric(df["score"], errors="coerce")',
      ask: '¿Qué columnas no entran en X y por qué?',
      answer: 'Se excluyen score porque es la respuesta que queremos predecir, y student_id, source_split, unit_test_assignment_log_id y problem_id porque son campos de rastreo y podrían causar fuga o aprendizaje de identificadores.'
    },
    {
      title: 'Construir los tres modelos', tag: '05 · modelado',
      say: 'El primer Random Forest reproduce la práctica. El segundo mantiene el algoritmo y restringe sus árboles con profundidad 12, split 20 y leaf 5. Extra Trees usa los parámetros base, pero aleatoriza también los puntos de corte. Los tres se entrenan con train.',
      show: 'En ASSISTments_Comparacion_RF_ExtraTrees, localiza el diccionario models y compara los tres constructores.',
      code: 'RandomForestClassifier(\n    n_estimators=600, max_depth=19,\n    min_samples_split=10, min_samples_leaf=2,\n    max_features="sqrt", bootstrap=True,\n    random_state=42, n_jobs=-1\n)',
      ask: '¿Qué cambiaron en el segundo Random Forest?',
      answer: 'Bajaron max_depth de 19 a 12 y aumentaron min_samples_split de 10 a 20 y min_samples_leaf de 2 a 5. Esto restringe la complejidad; no garantiza que mejore la prueba.'
    },
    {
      title: 'Leer resultados y gráficos', tag: '06 · evaluación',
      say: 'El cuaderno informa accuracy, precisión, recall y F1 por clase, promedios macro y ROC-AUC para score=0. La curva ROC muestra la tasa de verdaderos positivos frente a falsos positivos al variar el umbral. La matriz indica aciertos y errores por clase.',
      show: 'Muestra primero el conjunto evaluation. Para la curva ROC, explica qué clase se trata como evento de interés y lee el AUC de la leyenda.',
      code: 'y0 = (y_part == 0).astype("int8")\np0 = probabilities[:, class_index[0]]\nfpr, tpr, _ = roc_curve(y0, p0)\nauc0 = roc_auc_score(y0, p0)',
      ask: '¿Cuál es el resultado principal de la línea base?',
      answer: 'En evaluation logró accuracy=0,7022, F1 macro=0,6828 y AUC score=0 de 0,7528. Su recall score=0 fue 0,5570: encontró 2 526 de 4 535 no éxitos y dejó 2 009 sin detectar.'
    },
    {
      title: 'Del notebook al uso', tag: '07 · alcance',
      say: 'La réplica no instala un servicio de producción ni una interfaz predictiva. El notebook demuestra la funcionalidad: carga el CSV preparado, ajusta el modelo, calcula métricas y puede generar predicciones y probabilidades. Despliegue y monitoreo quedan como propuesta.',
      show: 'Aclara la diferencia entre la funcionalidad del notebook y una interfaz para docentes. No presentes esta guía de estudio como parte del sistema predictivo.',
      code: 'Entradas: las mismas 722 variables preparadas.\nSalidas del modelo: clase predicha y probabilidades por clase.\nUso previsto: apoyo a revisión docente, no decisión automática.',
      ask: '¿Qué faltaría antes de usar alertas en una institución?',
      answer: 'Validar entradas, controlar acceso a identificadores, definir un umbral con docentes, registrar predicciones y monitorear rendimiento con etiquetas nuevas. Es una propuesta, no una fase implementada en la réplica.'
    },
    {
      title: 'Cerrar y responder', tag: '08 · conclusión',
      say: 'En esta muestra, el Random Forest de la práctica fue la mejor línea base en varias métricas de prueba, pero aún omitió 44,30 % de los no éxitos. Además, 31 estudiantes aparecen en ambas particiones. Por eso los resultados no prueban desempeño en estudiantes totalmente nuevos.',
      show: 'Termina con una conclusión propia basada en números y con una limitación concreta. Si preguntan por la siguiente mejora, propone validación agrupada por estudiante.',
      code: 'Siguiente experimento recomendado: separar train y prueba por student_id.\nSeleccionar umbral en validación, no en el conjunto final de prueba.',
      ask: '¿Qué afirmación no debemos hacer?',
      answer: 'No debemos afirmar que el modelo ya está listo para intervenir en estudiantes nuevos ni que la réplica reproduce todos los experimentos del artículo.'
    }
  ],
  rawFiles: [
    { file: 'training_unit_test_scores.csv', purpose: 'Resultados para entrenamiento; claves assignment_log_id y problem_id, etiqueta score.' },
    { file: 'evaluation_unit_test_scores.csv', purpose: 'Filas para evaluación; la muestra de Excel puede tener score vacío.' },
    { file: 'unit_test_scores.csv', purpose: 'Fuente opcional para completar las etiquetas reales de evaluation.' },
    { file: 'assignment_relationships.csv', purpose: 'Relaciona la evaluación final con prácticas previas.' },
    { file: 'assignment_details.csv', purpose: 'Aporta student_id, sequence_id y fin de asignación.' },
    { file: 'sequence_details.csv / problem_details.csv', purpose: 'Aportan ruta curricular y características del problema.' },
    { file: 'action_logs.csv', purpose: 'Eventos observados durante las prácticas; archivo voluminoso leído por bloques.' }
  ],
  processedColumns: ['unit_test_assignment_log_id', 'problem_id', 'score', 'student_id', 'source_split', 'action_correct_response', 'action_hint_requested', 'available_core_tutoring_hint', 'notfinish_percent', 'sequence_folder_path_level_1_…', 'problem_text_bert_pca_0 … 31'],
  codeCards: [
    { id: 'prep-config', label: 'Preparación · muestra', notebook: 'ASSISTments_01_Preparar_CSV.ipynb · configuración', explanation: 'Fija una muestra repetible y limita memoria durante la lectura de action_logs.csv.', code: 'SEED = 42\nMAX_STUDENTS = 3000\nCHUNK_SIZE = 300_000\nCANONICAL_CSV = OUTPUT_DIR / "assistments_rf_dataset.csv.gz"' },
    { id: 'prep-ids', label: 'Preparación · claves', notebook: 'ASSISTments_01_Preparar_CSV.ipynb · funciones de lectura', explanation: 'Normaliza IDs y filtra registros por las claves requeridas antes de integrar tablas.', code: 'def normalize_id(values):\n    return (values.astype("string").str.strip()\n            .str.replace(r"\\.0$", "", regex=True))\n\ndef read_filtered_csv(path, columns, key_column, accepted_ids, chunksize=CHUNK_SIZE):\n    # leer por bloques; conservar IDs solicitados; quitar duplicados\n    ...' },
    { id: 'prep-features', label: 'Preparación · atributos', notebook: 'ASSISTments_01_Preparar_CSV.ipynb · construcción del dataset', explanation: 'Agrega acciones, tutorías y prácticas no finalizadas; codifica categorías y conserva los 32 valores BERT-PCA originales.', code: 'assignment_stats["notfinish_percent"] = (\n    assignment_stats["unfinished_practice"] /\n    assignment_stats["total_practice"].replace(0, np.nan)\n).round(4)\n\nsequence_dummies = pd.get_dummies(\n    dataset[sequence_fields], prefix=sequence_fields, dtype=np.uint8\n)\n\n# 14 categorías de acciones y 4 de tutoría\n# los componentes problem_text_bert_pca se parsean a 32 columnas' },
    { id: 'prep-missing', label: 'Preparación · faltantes', notebook: 'ASSISTments_01_Preparar_CSV.ipynb · tratamiento final', explanation: 'Los conteos sin actividad equivalen a cero. Los demás predictores faltantes o inválidos pasan a -1; el modelo recibe float32.', code: 'dataset[action_feature_columns] = dataset[action_feature_columns].fillna(0)\ndataset = dataset.replace([np.inf, -np.inf], np.nan)\ndataset[feature_columns] = dataset[feature_columns].apply(pd.to_numeric, errors="coerce")\ndataset[feature_columns] = dataset[feature_columns].fillna(-1).astype("float32")' },
    { id: 'model-xy', label: 'Modelo · X e y', notebook: 'ASSISTments_Comparacion_RF_ExtraTrees.ipynb · matriz de variables', explanation: 'Define score como objetivo y excluye la etiqueta, IDs y partición de los predictores.', code: 'id_columns = {"score", "student_id", "source_split",\n               "unit_test_assignment_log_id", "problem_id"}\nfeature_columns = [c for c in df.columns if c not in id_columns]\nX = df[feature_columns].apply(pd.to_numeric, errors="coerce").fillna(-1).astype("float32")\ny = pd.to_numeric(df["score"], errors="coerce")' },
    { id: 'model-params', label: 'Modelo · parámetros', notebook: 'ASSISTments_Comparacion_RF_ExtraTrees.ipynb · models', explanation: 'La configuración base reproduce la práctica; la segunda cambia tres controles; Extra Trees añade aleatoriedad en los cortes.', code: 'RandomForestClassifier(\n    n_estimators=600, max_depth=19,\n    min_samples_split=10, min_samples_leaf=2,\n    max_features="sqrt", bootstrap=True,\n    random_state=42, n_jobs=-1\n)\n\n# variante: max_depth=12, split=20, leaf=5' },
    { id: 'metrics-code', label: 'Modelo · métricas y ROC', notebook: 'ASSISTments_Comparacion_RF_ExtraTrees.ipynb · metric_rows', explanation: 'Calcula métricas para cada modelo en train y evaluation. Las predicciones de clase y las probabilidades cumplen funciones distintas.', code: 'predicted = model.predict(X_part)\nprobabilities = model.predict_proba(X_part)\np0 = probabilities[:, class_index[0]]\ny0 = (y_part == 0).astype("int8")\nauc0 = roc_auc_score(y0, p0)\n\n# las tasas P, R y F1 se calculan por clase y macro' }
  ],
  splits: {
    train: [
      { model: 'RF práctica', accuracy: .8347, p0: .8383, r0: .7478, f10: .7905, p1: .8326, r1: .8969, f11: .8635, pm: .8355, rm: .8223, fm: .8270, auc0: .9165 },
      { model: 'RF parámetros modificados', accuracy: .7527, p0: .7515, r0: .6080, f10: .6722, p1: .7534, r1: .8562, f11: .8015, pm: .7524, rm: .7321, fm: .7369, auc0: .8269 },
      { model: 'Extra Trees', accuracy: .7500, p0: .7454, r0: .6080, f10: .6697, p1: .7523, r1: .8515, f11: .7989, pm: .7489, rm: .7298, fm: .7343, auc0: .8246 }
    ],
    evaluation: [
      { model: 'RF práctica', accuracy: .7022, p0: .6604, r0: .5570, f10: .6043, p1: .7241, r1: .8023, f11: .7612, pm: .6923, rm: .6797, fm: .6828, auc0: .7528 },
      { model: 'RF parámetros modificados', accuracy: .6997, p0: .6684, r0: .5252, f10: .5882, p1: .7146, r1: .8201, f11: .7637, pm: .6915, rm: .6727, fm: .6760, auc0: .7489 },
      { model: 'Extra Trees', accuracy: .6860, p0: .6439, r0: .5164, f10: .5732, p1: .7064, r1: .8030, f11: .7516, pm: .6752, rm: .6597, fm: .6624, auc0: .7340 }
    ]
  },
  confusion: [
    { model: 'RF práctica', values: [[2526, 2009], [1299, 5273]], missed0: '2 009 de 4 535 no éxitos' },
    { model: 'RF modificado', values: [[2382, 2153], [1182, 5390]], missed0: '2 153 de 4 535 no éxitos' },
    { model: 'Extra Trees', values: [[2342, 2193], [1295, 5277]], missed0: '2 193 de 4 535 no éxitos' }
  ],
  parameters: [
    { name: 'n_estimators', label: 'Cantidad de árboles', base: 600, variant: 600, type: 'range', min: 100, max: 1000, step: 100, low: 'Menos árboles: ajuste rápido, más variación entre corridas.', high: 'Más árboles: suele estabilizar el promedio; aumenta tiempo y memoria. No asegura más accuracy.' },
    { name: 'max_depth', label: 'Profundidad máxima', base: 19, variant: 12, type: 'range', min: 3, max: 30, step: 1, low: 'Menor profundidad: árboles más simples; podrían omitir patrones.', high: 'Mayor profundidad: árboles más complejos; pueden ajustarse demasiado a train.' },
    { name: 'min_samples_split', label: 'Mínimo para dividir', base: 10, variant: 20, type: 'range', min: 2, max: 30, step: 1, low: 'Un umbral bajo permite más divisiones y árboles más detallados.', high: 'Un umbral alto frena divisiones; puede reducir sobreajuste o causar subajuste.' },
    { name: 'min_samples_leaf', label: 'Mínimo en hoja', base: 2, variant: 5, type: 'range', min: 1, max: 12, step: 1, low: 'Hojas pequeñas capturan casos específicos y pueden ser inestables.', high: 'Hojas mayores suavizan predicciones; pueden perder casos minoritarios.' },
    { name: 'max_features', label: 'Variables candidatas por corte', base: 'sqrt', variant: 'sqrt', type: 'select', options: ['sqrt', 'log2', 'None'], low: 'Menos candidatas aumentan diversidad entre árboles.', high: 'Más candidatas pueden dar cortes fuertes, con árboles más parecidos y mayor costo.' },
    { name: 'bootstrap', label: 'Muestreo con reemplazo', base: true, variant: true, type: 'select', options: ['true', 'false'], low: 'Con bootstrap, cada árbol recibe una muestra con reemplazo.', high: 'Sin bootstrap, cada árbol usa los datos de entrenamiento completos; cambia la variación del ensamble.' },
    { name: 'random_state', label: 'Semilla', base: 42, variant: 42, type: 'range', min: 0, max: 99, step: 1, low: 'Cambiar semilla cambia decisiones aleatorias y puede mover métricas.', high: 'Fijarla permite reproducir la misma corrida; no mejora el modelo por sí sola.' },
    { name: 'n_jobs', label: 'Procesamiento paralelo', base: -1, variant: -1, type: 'select', options: ['-1', '1', '2'], low: 'Un núcleo procesa secuencialmente.', high: '-1 usa los núcleos disponibles; reduce tiempo, no cambia la lógica predictiva.' }
  ],
  phases: [
    { name: 'Comprensión', status: 'Control propuesto', text: 'Acordar con docentes el uso de la alerta, el recall mínimo de score=0 y las falsas alertas tolerables.' },
    { name: 'Preparación', status: 'Control propuesto', text: 'Validar duplicados, faltantes, nombres y tipos de los 722 predictores; guardar las transformaciones.' },
    { name: 'Modelado', status: 'Código existente + control', text: 'Excluir etiqueta, IDs y source_split de X; entrenar solo con train; registrar parámetros y semilla 42.' },
    { name: 'Evaluación', status: 'Código existente + mejora', text: 'Reportar métricas por clase; validar agrupando por student_id; elegir el umbral en validación.' },
    { name: 'Despliegue', status: 'Propuesta', text: 'Validar esquema de entrada, registrar predicciones, limitar acceso a IDs y dejar la alerta bajo revisión docente.' },
    { name: 'Monitoreo', status: 'Propuesta', text: 'Revisar deriva y rendimiento al obtener etiquetas nuevas; validar cada reentrenamiento antes de usarlo.' }
  ],
  questions: [
    { category: 'Caso', q: '¿Qué problema resuelve el caso de ASSISTments?', answer: 'Predice si un estudiante tendrá éxito en un problema de fin de unidad usando datos de sus prácticas e interacciones.', follow: 'Aclara que la fila representa un problema final, no un estudiante completo.' },
    { category: 'Caso', q: '¿Qué significa score=0 y score=1?', answer: 'score=0 es resultado no exitoso; score=1 es resultado exitoso según la etiqueta del caso. score es y, la variable objetivo.', follow: 'Menciona que score se excluye de X.' },
    { category: 'Caso', q: '¿Cuál es la unidad de análisis?', answer: 'Un registro estudiante–problema de una evaluación de fin de unidad.', follow: 'Un estudiante puede aparecer en muchas filas.' },
    { category: 'Datos', q: '¿Cuántos datos contiene la muestra?', answer: '3 000 estudiantes, 51 042 registros, 727 columnas: 722 predictores y cinco campos de etiqueta o trazabilidad.', follow: 'Las clases suman 21 185 score=0 y 29 857 score=1.' },
    { category: 'Datos', q: '¿Qué mostraría en el CSV crudo?', answer: 'Los archivos de puntajes y las tablas de asignaciones, relaciones, problemas, secuencias y acciones. Un registro de puntajes contiene assignment_log_id, problem_id y score.', follow: 'action_logs.csv contiene eventos de práctica y es el archivo grande.' },
    { category: 'Datos', q: '¿Qué cambia en el CSV procesado?', answer: 'Los archivos fuente se integran en una sola tabla por problema final. Conserva score y campos de rastreo y añade predictores de acciones, curso, problema y BERT-PCA.', follow: 'Muestra las primeras columnas y luego algunas predictoras.' },
    { category: 'Código', q: '¿Por qué normalize_id limpia .0 y espacios?', answer: 'Para que las mismas claves coincidan entre CSV aunque pandas las haya leído con tipos distintos.', follow: 'Sin coincidencia de claves, los merges pierden datos.' },
    { category: 'Código', q: '¿Por qué CHUNK_SIZE=300_000?', answer: 'Lee action_logs.csv en fragmentos para limitar memoria; no cambia el tamaño final de la muestra.', follow: 'La selección de estudiantes se fija con MAX_STUDENTS y SEED.' },
    { category: 'Transformación', q: '¿Cómo se generan los predictores de acciones?', answer: 'Se cuentan 14 categorías de acciones y cuatro categorías de tutoría por evaluación final y problema; también se resumen max_attempts y banderas de visualización.', follow: 'Los faltantes de conteos de acciones y tutoría se reemplazan por cero.' },
    { category: 'Transformación', q: '¿Qué es notfinish_percent?', answer: 'La proporción de prácticas relacionadas sin fecha de finalización sobre el total de prácticas relacionadas.', follow: 'Se calcula por asignación de evaluación final.' },
    { category: 'Transformación', q: '¿El grupo entrenó BERT o PCA?', answer: 'No. El CSV de fuente ya contiene el vector problem_text_bert_pca; el notebook lo separa en 32 columnas numéricas.', follow: 'Aclara que es reutilizado, no entrenado por el grupo.' },
    { category: 'Transformación', q: '¿Cómo se tratan los valores ausentes?', answer: 'Conteos de acciones y tutoría: cero. Otros predictores faltantes, infinitos o no numéricos: -1. La matriz X se convierte a float32.', follow: 'Los IDs no se imputan como predictores: se excluyen.' },
    { category: 'Modelado', q: '¿Qué son X e y?', answer: 'y es score. X contiene los 722 predictores preparados, excluyendo score, student_id, source_split, unit_test_assignment_log_id y problem_id.', follow: 'Explica que los IDs sirven para rastreo.' },
    { category: 'Modelado', q: '¿Qué reproduce el RF base?', answer: '600 árboles, max_depth=19, min_samples_split=10, min_samples_leaf=2, max_features=sqrt, bootstrap=True, random_state=42 y n_jobs=-1.', follow: 'Es la configuración de la práctica 1-2.' },
    { category: 'Modelado', q: '¿Qué se modificó en el segundo RF?', answer: 'max_depth bajó de 19 a 12; min_samples_split subió de 10 a 20; min_samples_leaf subió de 2 a 5. El resto se conserva.', follow: 'Se restringe complejidad, pero no se garantiza mejor prueba.' },
    { category: 'Modelado', q: '¿En qué se diferencia Extra Trees de Random Forest?', answer: 'Ambos son ensambles de árboles. Extra Trees introduce más aleatoriedad al escoger los umbrales de división; se compara con los mismos predictores y particiones.', follow: 'No es una red neuronal ni un modelo de deep learning.' },
    { category: 'Modelado', q: '¿Qué tiene en común Extra Trees con el RF de esta comparación?', answer: 'Ambos tienen 600 árboles, max_depth=19, min_samples_split=10, min_samples_leaf=2, max_features=sqrt, bootstrap=True y semilla 42. La diferencia central es que Extra Trees aleatoriza los umbrales de división.', follow: 'Aclara que bootstrap=True se fijó explícitamente para esta corrida.' },
    { category: 'Parámetros', q: '¿Qué pasa si aumenta max_depth?', answer: 'Los árboles pueden representar interacciones más específicas; también pueden ajustarse demasiado a train. Si baja mucho, pueden omitir patrones.', follow: 'En esta corrida la variante más profunda tuvo mayor accuracy de train, pero eso no prueba mejor generalización.' },
    { category: 'Parámetros', q: '¿Qué hace n_estimators?', answer: 'Indica cuántos árboles se promedian. Más árboles pueden estabilizar el ensamble, pero toman más tiempo y no aseguran una mejora de métricas.', follow: 'El proyecto usa 600.' },
    { category: 'Parámetros', q: '¿Qué hacen min_samples_split y min_samples_leaf?', answer: 'Controlan cuántos casos necesita un nodo para dividirse y cuántos debe contener una hoja. Valores mayores suelen crear árboles menos detallados.', follow: 'La variante usa 20 y 5.' },
    { category: 'Parámetros', q: '¿Qué controla max_features=sqrt?', answer: 'Cuántos predictores se consideran como candidatos en cada división: la raíz del número de predictores.', follow: 'Limita correlación entre árboles y aporta diversidad.' },
    { category: 'Parámetros', q: '¿Qué hacen bootstrap, random_state y n_jobs?', answer: 'bootstrap=True muestrea con reemplazo; random_state=42 fija la aleatoriedad para reproducir la corrida; n_jobs=-1 usa los núcleos disponibles.', follow: 'n_jobs cambia el tiempo, no el criterio del modelo.' },
    { category: 'Métricas', q: '¿Qué significa recall de score=0=0,5570?', answer: 'El modelo detectó 55,70 % de los no éxitos reales: 2 526 de 4 535. Dejó 2 009 como score=1.', follow: 'Es importante si la finalidad es alertar sobre posibles dificultades.' },
    { category: 'Métricas', q: '¿Qué pasa si bajo el umbral de score=0 en la guía?', answer: 'Más filas se clasifican como posibles no éxitos. Normalmente sube recall de score=0, pero pueden aumentar falsas alertas y bajar precisión. La guía recalcula las métricas desde las probabilidades guardadas; no reentrena el modelo.', follow: 'El umbral operativo se debe elegir en validación, con docentes, no ajustándolo para mejorar la prueba final.' },
    { category: 'Métricas', q: '¿Qué diferencia hay entre precisión y recall?', answer: 'Precisión: de las predicciones de una clase, qué proporción era correcta. Recall: de los casos reales de esa clase, qué proporción se detectó.', follow: 'F1 resume ambas mediante media armónica.' },
    { category: 'Métricas', q: '¿Qué representa F1 macro?', answer: 'Calcula F1 por cada clase y promedia ambas con el mismo peso, sin favorecer a la clase más frecuente.', follow: 'En RF de práctica, F1 macro en prueba fue 0,6828.' },
    { category: 'Métricas', q: '¿Cómo se explica AUC score=0?', answer: 'Resume qué tan bien las probabilidades ordenan los no éxitos frente a los éxitos al variar el umbral. 0,5 equivale a discriminación aleatoria y 1 a perfecta.', follow: 'AUC no es porcentaje de predicciones correctas.' },
    { category: 'Gráficos', q: '¿Cómo se explica una curva ROC?', answer: 'El eje x muestra la tasa de falsos positivos; el eje y, la tasa de verdaderos positivos. Cada punto corresponde a un umbral. La diagonal es el nivel de discriminación aleatoria; una curva más hacia arriba e izquierda suele separar mejor las clases.', follow: 'RF práctica pasa de AUC 0,9165 en train a 0,7528 en evaluation. El AUC resume la curva y no significa 75,28 % de exactitud.' },
    { category: 'Métricas', q: '¿Qué indica la diagonal de la matriz de confusión?', answer: 'Casos correctamente clasificados. Fuera de la diagonal están los errores: no éxitos predichos como éxito y éxitos predichos como no éxito.', follow: 'En la matriz base, 2 009 no éxitos quedaron como score=1.' },
    { category: 'Métricas', q: '¿Cómo se comparan train y evaluation?', answer: 'Train describe ajuste sobre filas usadas para aprender. Evaluation mide registros reservados. En la partición original coinciden 31 estudiantes, por lo que no es prueba de estudiantes totalmente nuevos.', follow: 'No llames a evaluation una validación por estudiante.' },
    { category: 'Comparación', q: '¿Cuál modelo ganó en prueba?', answer: 'RF de la práctica obtuvo accuracy=0,7022, F1 macro=0,6828, recall score=0=0,5570 y AUC=0,7528. Las alternativas no superaron esos valores globales, aunque RF modificado tuvo precisión score=0 algo mayor.', follow: 'Evita afirmar que la línea base ganó todas las métricas por clase.' },
    { category: 'Comparación', q: '¿Son comparables los números del artículo original?', answer: 'No directamente: la réplica usa la muestra de 3 000 estudiantes, su CSV preparado y la partición disponible; el artículo usa otro protocolo y conjunto.', follow: 'Sirven como contexto metodológico, no como una competencia bajo las mismas condiciones.' },
    { category: 'Alcance', q: '¿El proyecto tiene un dashboard predictivo con interfaz?', answer: 'No. El código demuestra una funcionalidad en notebooks: preparar datos, entrenar, evaluar y generar predicciones. No hay servicio de producción ni UI para docentes.', follow: 'Esta web es una guía de estudio, no una interfaz del modelo.' },
    { category: 'Calidad', q: '¿Qué proponen para despliegue y monitoreo?', answer: 'Validar el esquema de entrada, registrar predicciones, proteger identificadores y dejar revisión humana. Luego revisar deriva y rendimiento cuando existan etiquetas nuevas.', follow: 'Son propuestas, no fases ya implementadas.' },
    { category: 'Calidad', q: '¿Por qué validar agrupando por estudiante?', answer: 'La partición oficial comparte 31 estudiantes y 552 registros de prueba. Agrupar por student_id mediría mejor el desempeño en personas no vistas.', follow: 'El nuevo umbral debe elegirse en validación, separado de la prueba final.' },
    { category: 'Exposición', q: '¿Qué abrimos si pide mostrar el código?', answer: 'En preparación, muestra MAX_STUDENTS, normalize_id, el agregado de acciones y la exportación CSV. En modelado, muestra id_columns/X/y, el clasificador y el bloque de métricas y ROC.', follow: 'Nombra el notebook y la sección de código; no inventes números de línea.' },
    { category: 'Exposición', q: '¿Qué explicamos sobre el uso de IA?', answer: 'La guía y la redacción recibieron apoyo de IA. El grupo debe revisar los datos con el código y poder explicar cada decisión con sus propias palabras.', follow: 'No atribuyas como escrito manualmente un texto que recibió asistencia.' }
  ],
  originalPaper: {
    title: 'Navigating the Data-Rich Landscape of Online Learning: Insights and Predictions from ASSISTments',
    doi: 'https://doi.org/10.5281/zenodo.12729826',
    repo: 'https://github.com/DSAatUSU/EDMCup2023',
    qualityRefs: [
      { label: 'Bañeres et al. (2023) · sistema de alerta temprana', url: 'https://doi.org/10.1186/s41239-022-00371-5' },
      { label: 'Tiukhova et al. (2024) · estabilidad de modelos', url: 'https://doi.org/10.1016/j.dss.2024.114229' }
    ]
  }
};
