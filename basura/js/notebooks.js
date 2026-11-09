window.NOTEBOOKS = [
  {
    "id": "prep",
    "title": "Preparar una sola tabla de ASSISTments",
    "file": "ASSISTments_01_Preparar_CSV.ipynb",
    "source": "../ASSISTments_01_Preparar_CSV.ipynb",
    "purpose": "Integra puntajes, prácticas, acciones, secuencia y rasgos de problema; transforma las variables y guarda el dataset. No entrena modelos.",
    "cells": [
      {
        "sourceCell": 2,
        "title": "1. Configurar el entorno y las rutas",
        "explanation": "Se asume que los archivos oficiales están en `Mi unidad/EDMCup2023/data/`; `action_logs.csv` está en `data/files/`. El CSV preparado se vuelve a generar y sobrescribe su versión anterior.",
        "source": "from pathlib import Path\nimport gc\nimport re\nimport numpy as np\nimport pandas as pd\nfrom IPython.display import display\nfrom google.colab import drive\n\ndrive.mount('/content/drive')\n\nSEED = 42\nMAX_STUDENTS = 3000  # Muestra reproducible de estudiantes.\nCHUNK_SIZE = 300_000  # Lee el archivo grande de acciones por bloques.\n\nBASE_DIR = Path('/content/drive/MyDrive/EDMCup2023')\nDATA_DIR = BASE_DIR / 'data'\nOUTPUT_DIR = BASE_DIR / 'salida'\nOUTPUT_DIR.mkdir(parents=True, exist_ok=True)\nCANONICAL_CSV = OUTPUT_DIR / 'assistments_rf_dataset.csv.gz'\n\nprint('Datos crudos:', DATA_DIR)\nprint('CSV único de referencia:', CANONICAL_CSV)\nprint(f'Estudiantes en la muestra: {MAX_STUDENTS:,}' if MAX_STUDENTS else 'Se usarán todos los estudiantes')\n",
        "lineCount": 24,
        "steps": [
          {
            "start": 1,
            "end": 7,
            "title": "Importar librerías y conectar Drive",
            "text": "Carga Path para rutas, pandas y numpy para las tablas, y las funciones de visualización. drive.mount habilita la carpeta del proyecto en Colab."
          },
          {
            "start": 11,
            "end": 13,
            "title": "Fijar la muestra y el tamaño de lectura",
            "text": "SEED=42 hace reproducible la selección; MAX_STUDENTS=3000 limita la muestra; CHUNK_SIZE=300000 procesa el archivo grande por partes."
          },
          {
            "start": 15,
            "end": 23,
            "title": "Definir rutas del proyecto",
            "text": "DATA_DIR apunta a los datos fuente; OUTPUT_DIR y CANONICAL_CSV fijan dónde se guarda el CSV comprimido."
          }
        ]
      },
      {
        "sourceCell": 4,
        "title": "2. Definir funciones de lectura y limpieza",
        "explanation": "Las claves se normalizan antes de unir tablas. Los archivos grandes se leen por fragmentos y solo se conservan los IDs seleccionados.",
        "source": "def normalize_id(values):\n    \"\"\"Unifica IDs leídos como entero, decimal o texto.\"\"\"\n    return values.astype('string').str.strip().str.replace(r'\\.0$', '', regex=True)\n\n\ndef read_scores(path, split_name):\n    df = pd.read_csv(path, low_memory=False)\n    df['assignment_log_id'] = normalize_id(df['assignment_log_id'])\n    df['problem_id'] = normalize_id(df['problem_id'])\n    df['score'] = pd.to_numeric(df['score'], errors='coerce')\n    df['source_split'] = split_name\n    return df\n\n\ndef read_filtered_csv(path, columns, key_column, accepted_ids, chunksize=CHUNK_SIZE):\n    \"\"\"Lee por bloques y conserva las claves que pertenecen a la muestra.\"\"\"\n    parts = []\n    for chunk in pd.read_csv(\n        path, usecols=columns, dtype={key_column: 'string'},\n        chunksize=chunksize, low_memory=False\n    ):\n        chunk[key_column] = normalize_id(chunk[key_column])\n        selected = chunk[chunk[key_column].isin(accepted_ids)]\n        if not selected.empty:\n            parts.append(selected)\n    if not parts:\n        return pd.DataFrame(columns=columns)\n    return pd.concat(parts, ignore_index=True).drop_duplicates()\n\n\ndef read_assignment_details(path, assignment_ids):\n    columns = ['assignment_log_id', 'student_id', 'sequence_id', 'assignment_end_time']\n    details = read_filtered_csv(path, columns, 'assignment_log_id', assignment_ids)\n    for col in ['student_id', 'sequence_id']:\n        details[col] = normalize_id(details[col])\n    details['assignment_end_time'] = details['assignment_end_time'].replace(r'^\\s*$', pd.NA, regex=True)\n    return details.drop_duplicates('assignment_log_id', keep='first')\n\n\ndef normalize_category(values):\n    return (values.astype('string').fillna('other').str.strip().str.lower()\n            .str.replace(r'[\\s-]+', '_', regex=True)\n            .str.replace(r'[^a-z0-9_]+', '', regex=True)\n            .replace('', 'other'))\n\n\ndef clean_text(values):\n    return (values.astype('string').fillna('NA').str.lower()\n            .str.replace(r'[^a-zA-Z0-9\\s]', '', regex=True)\n            .str.replace(r'\\s+', ' ', regex=True).str.strip())\n",
        "lineCount": 51,
        "steps": [
          {
            "start": 1,
            "end": 3,
            "title": "Normalizar claves",
            "text": "Convierte IDs a texto, elimina espacios y quita el sufijo .0 para que una misma clave coincida entre CSV."
          },
          {
            "start": 6,
            "end": 12,
            "title": "Leer puntajes y conservar partición",
            "text": "Carga resultados, convierte score a número y agrega source_split con train o evaluation."
          },
          {
            "start": 15,
            "end": 28,
            "title": "Leer archivos por bloques",
            "text": "read_filtered_csv usa solo las columnas pedidas, filtra las claves de interés y concatena los fragmentos, eliminando duplicados."
          },
          {
            "start": 31,
            "end": 37,
            "title": "Leer detalles de asignación",
            "text": "Obtiene student_id, sequence_id y fecha de término; normaliza claves y deja una fila por asignación."
          },
          {
            "start": 40,
            "end": 50,
            "title": "Limpiar categorías y texto",
            "text": "Unifica nulos y formatos de categorías/texto para evitar etiquetas distintas por mayúsculas, espacios o signos."
          }
        ]
      },
      {
        "sourceCell": 6,
        "title": "3. Etiquetar los problemas y elegir la muestra",
        "explanation": "`score` se lee de las particiones oficiales; si faltan etiquetas de evaluación, se recuperan de `unit_test_scores.csv` por asignación y problema. Después se seleccionan 3 000 estudiantes con semilla 42.",
        "source": "print('Leyendo puntuaciones y seleccionando estudiantes...')\n# Archivos oficiales de entrada\ntraining_path = DATA_DIR / 'training_unit_test_scores.csv'\nevaluation_path = DATA_DIR / 'evaluation_unit_test_scores.csv'\ntotal_scores_path = DATA_DIR / 'unit_test_scores.csv'\nrelationships_path = DATA_DIR / 'assignment_relationships.csv'\nassignment_path = DATA_DIR / 'assignment_details.csv'\nsequence_path = DATA_DIR / 'sequence_details.csv'\nproblem_path = DATA_DIR / 'problem_details.csv'\naction_path = DATA_DIR / 'files' / 'action_logs.csv'\n\ntrain_scores = read_scores(training_path, 'train')\neval_scores = read_scores(evaluation_path, 'evaluation')\nall_target_ids = set(pd.concat([\n    train_scores['assignment_log_id'], eval_scores['assignment_log_id']\n]).dropna().unique())\n",
        "lineCount": 17,
        "steps": [
          {
            "start": 1,
            "end": 10,
            "title": "Nombrar los archivos fuente",
            "text": "Cada ruta identifica una tabla oficial con una función distinta: puntajes, relaciones, asignaciones, secuencias, problemas y acciones."
          },
          {
            "start": 12,
            "end": 16,
            "title": "Leer score y origen",
            "text": "read_scores carga train y evaluation; all_target_ids reúne las claves necesarias para filtrar las tablas relacionadas."
          }
        ]
      },
      {
        "sourceCell": 8,
        "title": "4. Relacionar prácticas previas",
        "explanation": "Se conectan las evaluaciones finales con sus asignaciones de práctica. Se calcula el porcentaje de prácticas no finalizadas por evaluación.",
        "source": "# Primer barrido de assignment_details: solo necesitamos identificar estudiantes\ntarget_details = read_assignment_details(assignment_path, all_target_ids)\nstudent_by_assignment = target_details[['assignment_log_id', 'student_id']].dropna()\nknown_student_ids = student_by_assignment['student_id'].drop_duplicates()\n\nselected_students = set(known_student_ids.sample(n=MAX_STUDENTS, random_state=SEED))\n\nselected_assignment_ids = set(\n    student_by_assignment.loc[\n        student_by_assignment['student_id'].isin(selected_students),\n        'assignment_log_id'\n    ]\n)\ntargets = pd.concat([train_scores, eval_scores], ignore_index=True, sort=False)\ntargets = targets[targets['assignment_log_id'].isin(selected_assignment_ids)].copy()\ntargets = targets.merge(student_by_assignment, on='assignment_log_id', how='left')\ntargets = targets.drop_duplicates(['assignment_log_id', 'problem_id', 'source_split'])\ntargets = targets.rename(columns={'assignment_log_id': 'unit_test_assignment_log_id'})\n\n# Si faltan etiquetas en evaluation, se recupera el score oficial por asignación y problema.\nif targets.loc[targets['source_split'].eq('evaluation'), 'score'].isna().any():\n    eval_rows = targets[targets['source_split'].eq('evaluation')]\n    eval_pairs = set(zip(eval_rows['unit_test_assignment_log_id'], eval_rows['problem_id']))\n    score_parts = []\n    for chunk in pd.read_csv(\n        total_scores_path,\n        usecols=['assignment_log_id', 'problem_id', 'score'],\n        dtype={'assignment_log_id': 'string', 'problem_id': 'string'},\n        chunksize=CHUNK_SIZE,\n        low_memory=False\n    ):\n        chunk['assignment_log_id'] = normalize_id(chunk['assignment_log_id'])\n        chunk['problem_id'] = normalize_id(chunk['problem_id'])\n        pairs = list(zip(chunk['assignment_log_id'], chunk['problem_id']))\n        chunk = chunk.loc[[pair in eval_pairs for pair in pairs]]\n        if not chunk.empty:\n            score_parts.append(chunk)\n    if score_parts:\n        score_lookup = pd.concat(score_parts, ignore_index=True)\n        score_lookup['score'] = pd.to_numeric(score_lookup['score'], errors='coerce')\n        score_lookup = score_lookup.drop_duplicates(['assignment_log_id', 'problem_id'])\n        lookup = dict(zip(\n            zip(score_lookup['assignment_log_id'], score_lookup['problem_id']),\n            score_lookup['score']\n        ))\n        mask = targets['source_split'].eq('evaluation') & targets['score'].isna()\n        targets.loc[mask, 'score'] = [\n            lookup.get((a, p), np.nan) for a, p in zip(\n                targets.loc[mask, 'unit_test_assignment_log_id'],\n                targets.loc[mask, 'problem_id']\n            )\n        ]\n\nif targets['score'].isna().any():\n    raise ValueError('Quedaron etiquetas score faltantes después de consultar unit_test_scores.csv.')\n\ntarget_ids = set(targets['unit_test_assignment_log_id'].dropna())\nrel_columns = ['unit_test_assignment_log_id', 'in_unit_assignment_log_id']\nrelationships = read_filtered_csv(\n    relationships_path, rel_columns, 'unit_test_assignment_log_id', target_ids\n)\nrelationships['in_unit_assignment_log_id'] = normalize_id(\n    relationships['in_unit_assignment_log_id']\n)\ntarget_columns = [\n    'unit_test_assignment_log_id', 'problem_id', 'score', 'student_id', 'source_split'\n]\ntarget_rel = targets[target_columns].merge(\n    relationships, on='unit_test_assignment_log_id', how='left'\n)\nin_unit_ids = set(target_rel['in_unit_assignment_log_id'].dropna())\n\nprint('Filtrando prácticas y variables del curso...')\n# Segundo barrido: detalles solo de evaluaciones y prácticas seleccionadas\nneeded_assignment_ids = target_ids | in_unit_ids\nassignment_details = read_assignment_details(assignment_path, needed_assignment_ids)\n\n# Relación de prácticas no terminadas por evaluación final\nrel_detail = relationships.merge(\n    assignment_details[['assignment_log_id', 'assignment_end_time']],\n    left_on='in_unit_assignment_log_id', right_on='assignment_log_id', how='left'\n)\nrel_detail = rel_detail.drop_duplicates(\n    ['unit_test_assignment_log_id', 'in_unit_assignment_log_id']\n)\nrel_detail['unfinished'] = rel_detail['assignment_end_time'].isna().astype('uint8')\nassignment_stats = rel_detail.groupby('unit_test_assignment_log_id').agg(\n    total_practice=('in_unit_assignment_log_id', 'nunique'),\n    unfinished_practice=('unfinished', 'sum')\n).reset_index()\n# Parte de prácticas relacionadas sin fecha de cierre.\nassignment_stats['notfinish_percent'] = (\n    assignment_stats['unfinished_practice'] /\n    assignment_stats['total_practice'].replace(0, np.nan)\n).round(4)\n\n# Extraer acciones por bloques y resumirlas por evaluación final + problema\n",
        "lineCount": 98,
        "steps": [
          {
            "start": 1,
            "end": 18,
            "title": "Elegir estudiantes y construir filas objetivo",
            "text": "La muestra de 3 000 estudiantes se elige con semilla 42. Se filtran sus asignaciones, se añade student_id y se elimina duplicación por asignación, problema y partición."
          },
          {
            "start": 20,
            "end": 55,
            "title": "Recuperar etiquetas oficiales faltantes",
            "text": "Solo si faltan score en evaluation, busca los pares assignment_log_id–problem_id en unit_test_scores.csv. Si persisten etiquetas vacías, detiene la preparación con error."
          },
          {
            "start": 57,
            "end": 76,
            "title": "Relacionar evaluación y práctica",
            "text": "Une cada problema final con las asignaciones previas relacionadas; conserva las claves necesarias para recuperar acciones."
          },
          {
            "start": 78,
            "end": 96,
            "title": "Calcular prácticas no terminadas",
            "text": "Compara las prácticas relacionadas con su fecha de cierre y calcula unfinished_practice / total_practice como notfinish_percent."
          }
        ]
      },
      {
        "sourceCell": 10,
        "title": "5. Agregar acciones y tutorías",
        "explanation": "`action_logs.csv` se procesa por bloques. Las acciones se cuentan por problema final y se resumen las opciones de tutoría y los campos constantes.",
        "source": "action_categories = [\n    'answer_requested', 'assignment_finished', 'assignment_resumed',\n    'assignment_started', 'continue_selected', 'correct_response',\n    'explanation_requested', 'hint_requested', 'live_tutor_requested',\n    'open_response', 'problem_finished', 'problem_started',\n    'skill_related_video_requested', 'wrong_response'\n]\ntutoring_categories = ['answer', 'explanation', 'hint', 'no_tutoring']\naction_columns = [\n    'assignment_log_id', 'problem_id', 'max_attempts', 'available_core_tutoring',\n    'score_viewable', 'continuous_score_viewable', 'action'\n]\n\naction_map = target_rel[\n    ['unit_test_assignment_log_id', 'problem_id', 'in_unit_assignment_log_id']\n].dropna(subset=['in_unit_assignment_log_id']).drop_duplicates()\naction_parts = []\nmode_parts = {col: [] for col in [\n    'max_attempts', 'score_viewable', 'continuous_score_viewable'\n]}\n\nprint('Procesando action_logs.csv por bloques...')\nfor action_chunk in pd.read_csv(\n    action_path, usecols=action_columns,\n    dtype={'assignment_log_id': 'string'}, chunksize=CHUNK_SIZE,\n    low_memory=False\n):\n    action_chunk['assignment_log_id'] = normalize_id(action_chunk['assignment_log_id'])\n    action_chunk['problem_id'] = normalize_id(action_chunk['problem_id'])\n    action_chunk = action_chunk[action_chunk['assignment_log_id'].isin(in_unit_ids)]\n    if action_chunk.empty:\n        continue\n    # Estos campos describen el problema de práctica y suelen ser constantes por problem_id.\n    constant_fields = [\n        'max_attempts', 'available_core_tutoring', 'score_viewable',\n        'continuous_score_viewable'\n    ]\n    for col in constant_fields:\n        action_chunk[col] = action_chunk.groupby('problem_id')[col].transform('first')\n    joined = action_map.merge(\n        action_chunk.rename(columns={'problem_id': 'in_unit_problem_id'}),\n        left_on='in_unit_assignment_log_id', right_on='assignment_log_id', how='inner'\n    )\n    if joined.empty:\n        continue\n    group_keys = ['unit_test_assignment_log_id', 'problem_id']\n\n    # Cada evento queda resumido como un conteo por problema final.\n    for raw_col, prefix, allowed in [\n        ('action', 'action', action_categories),\n        ('available_core_tutoring', 'available_core_tutoring', tutoring_categories)\n    ]:\n        value = normalize_category(joined[raw_col])\n        value = value.where(value.isin(allowed), 'other')\n        long = joined[group_keys].copy()\n        long['feature'] = prefix + '_' + value\n        wide = long.groupby(group_keys + ['feature']).size().unstack(fill_value=0)\n        action_parts.append(wide.astype('uint32'))\n\n    for col in mode_parts:\n        value = pd.to_numeric(joined[col], errors='coerce').fillna(-1)\n        mode_frame = joined[group_keys].copy()\n        mode_frame[col] = value\n        counts = mode_frame.groupby(group_keys + [col]).size().rename('n').reset_index()\n        mode_parts[col].append(counts)\n\nif action_parts:\n    action_features = pd.concat(action_parts).groupby(level=[0, 1]).sum().reset_index()\nelse:\n    action_features = pd.DataFrame(columns=['unit_test_assignment_log_id', 'problem_id'])\n\nmode_features = None\nfor col, parts in mode_parts.items():\n    if not parts:\n        continue\n    counts = pd.concat(parts, ignore_index=True).groupby(\n        ['unit_test_assignment_log_id', 'problem_id', col], as_index=False\n    )['n'].sum()\n    counts = counts.sort_values(['n', col]).drop_duplicates(\n        ['unit_test_assignment_log_id', 'problem_id'], keep='last'\n    )[['unit_test_assignment_log_id', 'problem_id', col]]\n    mode_features = counts if mode_features is None else mode_features.merge(\n        counts, on=['unit_test_assignment_log_id', 'problem_id'], how='outer'\n    )\nif mode_features is None:\n    mode_features = pd.DataFrame(columns=[\n        'unit_test_assignment_log_id', 'problem_id', 'max_attempts',\n        'score_viewable', 'continuous_score_viewable'\n    ])\n",
        "lineCount": 90,
        "steps": [
          {
            "start": 1,
            "end": 20,
            "title": "Definir categorías y claves",
            "text": "Enumera 14 acciones, cuatro opciones de tutoría y campos de práctica que se resumirán por problema final."
          },
          {
            "start": 22,
            "end": 45,
            "title": "Leer y enlazar acciones",
            "text": "Lee action_logs.csv por bloques, filtra las asignaciones seleccionadas y enlaza cada acción con su evaluación final."
          },
          {
            "start": 46,
            "end": 64,
            "title": "Convertir acciones en conteos",
            "text": "Agrupa por evaluación final y problema; crea conteos por tipo de acción/tutoría y reúne valores numéricos de intentos y visibilidad."
          },
          {
            "start": 66,
            "end": 88,
            "title": "Consolidar los fragmentos",
            "text": "Suma conteos entre bloques y selecciona los valores más frecuentes de los campos resumidos."
          }
        ]
      },
      {
        "sourceCell": 12,
        "title": "6. Añadir y codificar la secuencia curricular",
        "explanation": "Se incorporan los cuatro niveles de ruta curricular de `sequence_details.csv` y se convierten en columnas One-Hot. Estas variables describen la secuencia; no determinan `score`.",
        "source": "# Tabla base: una fila por resultado final y problema\ndataset = targets[target_columns].drop_duplicates(\n    ['unit_test_assignment_log_id', 'problem_id', 'source_split']\n).copy()\ndataset = dataset.merge(action_features, on=['unit_test_assignment_log_id', 'problem_id'], how='left')\ndataset = dataset.merge(mode_features, on=['unit_test_assignment_log_id', 'problem_id'], how='left')\ndataset = dataset.merge(assignment_stats[['unit_test_assignment_log_id', 'notfinish_percent']],\n                        on='unit_test_assignment_log_id', how='left')\n\n# Variables de secuencia: niveles de ruta curricular 1 a 4\nsequence_fields = [\n    'sequence_folder_path_level_1', 'sequence_folder_path_level_2',\n    'sequence_folder_path_level_3', 'sequence_folder_path_level_4'\n]\nsequence_ids = set(assignment_details['sequence_id'].dropna())\nsequence_details = read_filtered_csv(\n    sequence_path, ['sequence_id'] + sequence_fields, 'sequence_id', sequence_ids\n)\nsequence_details['sequence_id'] = normalize_id(sequence_details['sequence_id'])\ntarget_sequence = dataset[['unit_test_assignment_log_id']].drop_duplicates().merge(\n    assignment_details[['assignment_log_id', 'sequence_id']],\n    left_on='unit_test_assignment_log_id', right_on='assignment_log_id', how='left'\n)\ndataset = dataset.merge(\n    target_sequence[['unit_test_assignment_log_id', 'sequence_id']],\n    on='unit_test_assignment_log_id', how='left'\n).merge(sequence_details, on='sequence_id', how='left')\nfor col in sequence_fields:\n    dataset[col] = clean_text(dataset[col]).replace('', 'na').fillna('na')\n# Cada categoría de la ruta queda como una columna 0/1.\nsequence_dummies = pd.get_dummies(\n    dataset[sequence_fields], prefix=sequence_fields, dtype=np.uint8\n)\ndataset = pd.concat([dataset.drop(columns=sequence_fields + ['sequence_id']), sequence_dummies], axis=1)\n",
        "lineCount": 35,
        "steps": [
          {
            "start": 1,
            "end": 9,
            "title": "Integrar resultado y agregados",
            "text": "Parte de una fila por problema final y une conteos de acciones, opciones de tutoría y porcentaje de prácticas no terminadas."
          },
          {
            "start": 10,
            "end": 27,
            "title": "Vincular ruta curricular",
            "text": "Conecta cada asignación con sequence_id y sus cuatro niveles de ruta curricular."
          },
          {
            "start": 28,
            "end": 33,
            "title": "Codificar categorías One-Hot",
            "text": "Limpia texto y usa get_dummies para crear columnas indicadoras; estas variables describen la secuencia, no asignan score."
          }
        ]
      },
      {
        "sourceCell": 14,
        "title": "7. Transformar las características del problema",
        "explanation": "Convierte categorías del problema en columnas 0/1, separa el código de habilidad y convierte el vector de texto ya provisto en 32 números. No ejecuta BERT ni PCA.",
        "source": "# Variables del problema final: categorías, código de habilidad y vector de texto ya provisto\nproblem_fields = [\n    'problem_id', 'problem_type', 'problem_multipart_position', 'problem_skill_code',\n    'problem_skill_description', 'problem_multipart_id', 'problem_text_bert_pca'\n]\nproblem_ids = set(dataset['problem_id'].dropna())\nproblem_details = read_filtered_csv(problem_path, problem_fields, 'problem_id', problem_ids)\nproblem_details['problem_id'] = normalize_id(problem_details['problem_id'])\nproblem_details = problem_details.drop_duplicates('problem_id', keep='first')\ndataset = dataset.merge(problem_details, on='problem_id', how='left')\n\nskill_parts = dataset['problem_skill_code'].fillna('NA').astype('string').str.split('.', n=3, expand=True)\nskill_parts = skill_parts.reindex(columns=range(4))\nskill_parts.columns = ['skill_code1', 'skill_code2', 'skill_code3', 'skill_code4']\ndataset = pd.concat([dataset, skill_parts], axis=1)\n\nproblem_categories = [\n    'problem_type', 'problem_multipart_position', 'skill_code1', 'skill_code2',\n    'skill_code3', 'skill_code4', 'problem_skill_description'\n]\nfor col in problem_categories:\n    dataset[col] = clean_text(dataset[col]).replace('', 'na').fillna('na')\nproblem_dummies = pd.get_dummies(\n    dataset[problem_categories], prefix=problem_categories, dtype=np.uint8\n)\n\n# El vector de texto ya viene en la fuente; esta función solo lo separa.\ndef parse_bert_vector(value, width=32):\n    result = np.full(width, np.nan, dtype=np.float32)\n    if pd.isna(value):\n        return result\n    numbers = re.findall(r'[-+]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?', str(value))\n    try:\n        parsed = np.asarray([float(x) for x in numbers[:width]], dtype=np.float32)\n    except ValueError:\n        return result\n    result[:len(parsed)] = parsed\n    return result\n\n# Se extraen sus 32 componentes; aquí no se calcula BERT ni PCA.\nbert_matrix = np.vstack(dataset['problem_text_bert_pca'].map(parse_bert_vector).to_numpy())\nbert_columns = [f'problem_text_bert_pca_{i}' for i in range(bert_matrix.shape[1])]\nbert_features = pd.DataFrame(bert_matrix, columns=bert_columns, index=dataset.index)\nmultipart_frequency = dataset['problem_multipart_id'].value_counts(dropna=False)\ndataset['multipart_id_frequency'] = dataset['problem_multipart_id'].map(multipart_frequency).fillna(0)\n\nraw_problem_columns = list(dict.fromkeys(\n    problem_fields[1:] + problem_categories[1:] + ['problem_multipart_id']\n))\ndataset = pd.concat([\n    dataset.drop(columns=raw_problem_columns),\n    problem_dummies,\n    bert_features\n], axis=1)\n",
        "lineCount": 55,
        "steps": [
          {
            "start": 1,
            "end": 10,
            "title": "Cargar rasgos del problema",
            "text": "Filtra problem_details.csv a los problemas presentes y une tipo, posición, habilidad, multipart_id y vector textual."
          },
          {
            "start": 12,
            "end": 25,
            "title": "Preparar categorías de problema",
            "text": "Divide el código de habilidad en hasta cuatro partes. Cada categoría queda en una columna 0/1: presente o ausente."
          },
          {
            "start": 27,
            "end": 37,
            "title": "Interpretar el vector recibido",
            "text": "Lee el vector de 32 números que ya trae el dataset y lo pasa a columnas; no calcula BERT ni PCA."
          },
          {
            "start": 39,
            "end": 52,
            "title": "Formar variables numéricas",
            "text": "Construye las 32 columnas, calcula frecuencia de multipart_id y reemplaza las columnas de texto por sus versiones transformadas."
          }
        ]
      },
      {
        "sourceCell": 16,
        "title": "8. Completar valores, convertir y guardar",
        "explanation": "Los conteos vacíos de acción/tutoría pasan a 0; otros valores inválidos, a -1. El CSV queda con 722 predictores float32.",
        "source": "# Tratamiento final: contadores de acción en 0; faltantes de otras variables en -1.\n# Conteos vacíos de acción/tutoría = 0; otros predictores inválidos = -1.\naction_feature_columns = [c for c in dataset.columns if c.startswith('action_') or\n                          c.startswith('available_core_tutoring_')]\ndataset[action_feature_columns] = dataset[action_feature_columns].fillna(0)\ndataset = dataset.replace([np.inf, -np.inf], np.nan)\nfeature_columns = [c for c in dataset.columns if c not in {\n    'unit_test_assignment_log_id', 'problem_id', 'student_id', 'source_split', 'score'\n}]\ndataset[feature_columns] = dataset[feature_columns].apply(pd.to_numeric, errors='coerce')\ndataset[feature_columns] = dataset[feature_columns].fillna(-1).astype('float32')\ndataset['score'] = pd.to_numeric(dataset['score'], errors='coerce').astype('float32')\n\n# Guardado nuevo: gzip ahorra espacio y deja un único CSV de referencia.\ndataset.to_csv(CANONICAL_CSV, index=False, compression='gzip')\nsize_mb = CANONICAL_CSV.stat().st_size / (1024 ** 2)\nprint(f'CSV único creado: {CANONICAL_CSV}')\nprint(f'Filas: {len(dataset):,} | estudiantes: {dataset.student_id.nunique():,} | columnas: {dataset.shape[1]:,}')\nprint(f'Tamaño comprimido: {size_mb:.1f} MB')\ndel train_scores, eval_scores, targets, target_rel, relationships, action_parts, mode_parts\ngc.collect()\n",
        "lineCount": 22,
        "steps": [
          {
            "start": 1,
            "end": 11,
            "title": "Tratar faltantes y tipos",
            "text": "Conteos vacíos de acción/tutoría = 0. Otros predictores ausentes o inválidos = -1. Los predictores se guardan como float32."
          },
          {
            "start": 13,
            "end": 18,
            "title": "Guardar el conjunto preparado",
            "text": "Escribe un único CSV gzip y muestra filas, estudiantes, columnas y tamaño del archivo."
          },
          {
            "start": 19,
            "end": 20,
            "title": "Liberar memoria",
            "text": "Elimina tablas intermedias grandes y ejecuta garbage collection; no cambia los datos guardados."
          }
        ]
      },
      {
        "sourceCell": 18,
        "title": "9. Revisar la salida",
        "explanation": "La siguiente celda muestra las columnas de etiqueta y trazabilidad y una muestra de predictores.",
        "source": "preview = pd.read_csv(CANONICAL_CSV, nrows=5, low_memory=False)\nprint(f'Filas: {len(preview):,} en la vista previa | columnas: {len(pd.read_csv(CANONICAL_CSV, nrows=0).columns):,}')\nprint('Etiqueta y campos de trazabilidad:')\ndisplay(preview[['student_id', 'unit_test_assignment_log_id', 'problem_id', 'source_split', 'score']])\nfeature_preview = [c for c in preview.columns if c not in {\n    'student_id', 'unit_test_assignment_log_id', 'problem_id', 'source_split', 'score'\n}][:8]\nprint('Primeros predictores:')\ndisplay(preview[feature_preview])\n",
        "lineCount": 10,
        "steps": [
          {
            "start": 1,
            "end": 9,
            "title": "Revisar una vista de la salida",
            "text": "Lee cinco registros, muestra etiqueta/trazabilidad y enseña algunos predictores para comprobar la estructura final."
          }
        ]
      }
    ]
  },
  {
    "id": "rf",
    "title": "ASSISTments: predicción con Random Forest",
    "file": "ASSISTments_RF_Colab_ES.ipynb",
    "source": "../ASSISTments_RF_Colab_ES.ipynb",
    "purpose": "Carga el dataset preparado, entrena el Random Forest de la práctica, calcula cuatro métricas y conserva las gráficas. La predicción por lote con otro CSV es opcional.",
    "cells": [
      {
        "sourceCell": 2,
        "title": "1. Entrada: CSV preparado",
        "explanation": "Sube `assistments_rf_dataset.csv.gz` desde Colab. La preparación de los archivos fuente se realiza en el notebook anterior.",
        "source": "from pathlib import Path\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nfrom IPython.display import display\nfrom google.colab import files\n\nSEED = 42\nN_ESTIMATORS = 600\nfiles.upload()  # Selecciona assistments_rf_dataset.csv.gz\nDATASET_CSV = Path('/content/assistments_rf_dataset.csv.gz')\ndf = pd.read_csv(DATASET_CSV, low_memory=False)\n\nprint(f'{len(df):,} filas | {df.student_id.nunique():,} estudiantes | {df.shape[1]:,} columnas')\ndisplay(df['source_split'].value_counts().rename_axis('partición').to_frame('filas'))\ndisplay(df['score'].value_counts().sort_index().rename_axis('score').to_frame('filas'))\n\nplt.figure(figsize=(6, 4))\nsns.countplot(data=df, x='score', color='#4C78A8')\nplt.title('Distribución del resultado real')\nplt.xlabel('score: 0 = no exitoso, 1 = exitoso')\nplt.ylabel('Cantidad de problemas')\nplt.tight_layout()\nplt.show()\n",
        "lineCount": 26,
        "steps": [
          {
            "start": 1,
            "end": 8,
            "title": "Importar herramientas y preparar Colab",
            "text": "Carga pandas/numpy para datos, matplotlib/seaborn para gráficos y files para subir el CSV."
          },
          {
            "start": 10,
            "end": 16,
            "title": "Leer y perfilar la tabla",
            "text": "Lee assistments_rf_dataset.csv.gz y muestra conteos por source_split y score."
          },
          {
            "start": 18,
            "end": 25,
            "title": "Graficar distribución de la etiqueta",
            "text": "El countplot describe cuántos resultados 0 y 1 hay; no mide aciertos del modelo."
          }
        ]
      },
      {
        "sourceCell": 4,
        "title": "2. Preprocesamiento, modelado y evaluación",
        "explanation": "score es la respuesta real y va en y; X contiene las otras 722 variables. El RF aprende con train. En prueba, y_test se usa después para comparar el resultado real con las predicciones.",
        "source": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import (\n    accuracy_score, precision_score, recall_score, f1_score,\n    confusion_matrix, ConfusionMatrixDisplay, roc_curve, roc_auc_score\n)\n\n# score es la respuesta real: se guarda en y y se excluye de X junto con los IDs.\nid_columns = {\n    'score', 'student_id', 'source_split',\n    'unit_test_assignment_log_id', 'problem_id'\n}\nfeature_columns = [c for c in df.columns if c not in id_columns]\nX = df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')\ny = df['score'].astype('int8')  # En prueba, se usa después para comparar con las predicciones.\n\n# Se usa directamente la partición oficial del dataset.\ntrain_mask = df['source_split'].eq('train')\neval_mask = df['source_split'].eq('evaluation')\nX_train = X.loc[train_mask].reset_index(drop=True)\nX_test = X.loc[eval_mask].reset_index(drop=True)\ny_train = y.loc[train_mask].to_numpy()\ny_test = y.loc[eval_mask].to_numpy()\n\n# El nodo necesita 10 filas para dividirse; cada hoja conserva al menos 2.\n# sqrt revisa unas 27 de las 722 variables en cada división.\nrf = RandomForestClassifier(\n    n_estimators=N_ESTIMATORS,\n    max_depth=19,\n    min_samples_split=10,\n    min_samples_leaf=2,\n    max_features='sqrt',\n    bootstrap=True,\n    random_state=SEED,\n    n_jobs=-1\n)\nrf.fit(X_train, y_train)\n\npred_train = rf.predict(X_train)\ny_pred = rf.predict(X_test)\nprobabilities = rf.predict_proba(X_test)\nclass_index = {int(label): i for i, label in enumerate(rf.classes_)}\ny_prob_non_success = probabilities[:, class_index[0]]\ny_non_success = (y_test == 0).astype('int8')\n\n# Accuracy cuenta aciertos totales; las medidas macro se calculan por clase y se promedian.\n# Precisión: de lo predicho como clase, qué proporción acertó.\n# Recall: de los casos reales de la clase, cuántos encontró. F1 combina ambos.\nmetric_names = ['Accuracy', 'Precisión macro*', 'Recall macro*', 'F1 macro*']\nmetrics_train = {\n    'Accuracy': accuracy_score(y_train, pred_train),\n    'Precisión macro*': precision_score(y_train, pred_train, average='macro'),\n    'Recall macro*': recall_score(y_train, pred_train, average='macro'),\n    'F1 macro*': f1_score(y_train, pred_train, average='macro')\n}\nmetrics_eval = {\n    'Accuracy': accuracy_score(y_test, y_pred),\n    'Precisión macro*': precision_score(y_test, y_pred, average='macro'),\n    'Recall macro*': recall_score(y_test, y_pred, average='macro'),\n    'F1 macro*': f1_score(y_test, y_pred, average='macro')\n}\nmetrics_table = pd.DataFrame([\n    {'Partición': 'Entrenamiento', **metrics_train},\n    {'Partición': 'Evaluación (prueba)', **metrics_eval}\n]).set_index('Partición')\ndisplay(metrics_table.round(4))\nprint('* Promedio macro: mismo peso para score=0 y score=1.')\n\nparameters_used = {\n    'n_estimators': rf.n_estimators,\n    'max_depth': rf.max_depth,\n    'min_samples_split': rf.min_samples_split,\n    'min_samples_leaf': rf.min_samples_leaf,\n    'max_features': rf.max_features,\n    'bootstrap': rf.bootstrap,\n    'random_state': rf.random_state,\n    'n_jobs': rf.n_jobs\n}\ndisplay(pd.Series(parameters_used, name='valor').to_frame())\n",
        "lineCount": 79,
        "steps": [
          {
            "start": 1,
            "end": 14,
            "title": "Separar predictores y etiqueta",
            "text": "y guarda score, la respuesta correcta. X contiene las 722 variables de entrada; excluye score, IDs y source_split."
          },
          {
            "start": 16,
            "end": 22,
            "title": "Aplicar partición oficial",
            "text": "Crea máscaras train/evaluation y forma X_train/y_train y X_test/y_test. No genera otra división."
          },
          {
            "start": 24,
            "end": 34,
            "title": "Configurar y ajustar Random Forest",
            "text": "Crea 600 árboles. Cada grupo necesita 10 filas para dividirse y cada grupo final conserva al menos 2. fit aprende solo con train."
          },
          {
            "start": 36,
            "end": 60,
            "title": "Predecir y calcular cuatro métricas",
            "text": "Accuracy cuenta aciertos totales. Precisión dice si las clases predichas suelen ser correctas; recall, cuántos casos reales encuentra. Macro promedia las clases 0 y 1."
          },
          {
            "start": 61,
            "end": 73,
            "title": "Mostrar parámetros usados",
            "text": "Lee los valores efectivos del clasificador después del ajuste y los presenta para documentar la corrida."
          }
        ]
      },
      {
        "sourceCell": 6,
        "title": "3. Gráficas de evaluación",
        "explanation": "Se muestran las cuatro métricas acordadas para train y evaluation, la matriz de confusión y ROC para `score=0`, y las 15 variables de mayor importancia. El AUC aparece solo como referencia dentro del gráfico ROC; no forma parte de la tabla de métricas.",
        "source": "# Gráfico comparativo: solo las cuatro métricas solicitadas.\nfig, ax = plt.subplots(figsize=(9, 4.5))\nx = np.arange(len(metric_names))\nwidth = 0.36\ntrain_values = [metrics_train[name] for name in metric_names]\neval_values = [metrics_eval[name] for name in metric_names]\ntrain_bars = ax.bar(x - width/2, train_values, width, label='Entrenamiento', color='#4C78A8')\neval_bars = ax.bar(x + width/2, eval_values, width, label='Evaluación', color='#F58518')\nax.bar_label(train_bars, fmt='%.3f', padding=2, fontsize=8)\nax.bar_label(eval_bars, fmt='%.3f', padding=2, fontsize=8)\nax.set_xticks(x, metric_names, rotation=10)\nax.set_ylim(0, 1.08)\nax.set_ylabel('Valor (0 a 1)')\nax.set_title('Métricas solicitadas: entrenamiento y evaluación')\nax.legend()\nax.grid(axis='y', alpha=0.3)\nax.set_axisbelow(True)\nplt.tight_layout()\nplt.show()\n\n# Matriz de confusión y curva ROC de la clase score=0.\nfig, axes = plt.subplots(1, 2, figsize=(12, 4.5))\n# Matriz: filas = clase real; columnas = clase predicha.\ncm = confusion_matrix(y_test, y_pred, labels=[0, 1])\nConfusionMatrixDisplay(\n    confusion_matrix=cm,\n    display_labels=['No exitoso (0)', 'Exitoso (1)']\n).plot(ax=axes[0], colorbar=False, cmap='Blues', values_format='d')\naxes[0].set_title('Matriz de confusión · evaluación')\n\n# ROC score=0: X mide falsas alertas; Y mide no éxitos detectados.\nfpr, tpr, _ = roc_curve(y_non_success, y_prob_non_success)\nauc_score0 = roc_auc_score(y_non_success, y_prob_non_success)\naxes[1].plot(fpr, tpr, color='#F58518', label=f'AUC = {auc_score0:.3f}')\naxes[1].plot([0, 1], [0, 1], linestyle='--', color='gray')\naxes[1].set_xlim(0, 1)\naxes[1].set_ylim(0, 1.02)\naxes[1].set_xlabel('Tasa de falsos positivos')\naxes[1].set_ylabel('Tasa de verdaderos positivos')\naxes[1].legend(loc='lower right')\naxes[1].set_title('Curva ROC: score=0')\nplt.tight_layout()\nplt.show()\n\nimportance = pd.Series(rf.feature_importances_, index=feature_columns).sort_values(ascending=False)\ntop_features = importance.head(15).sort_values()\nplt.figure(figsize=(9, 6))\ntop_features.plot(kind='barh', color='#54A24B')\nplt.title('15 variables más importantes en Random Forest')\nplt.xlabel('Importancia relativa')\nplt.ylabel('Variable')\nplt.tight_layout()\nplt.show()\n",
        "lineCount": 54,
        "steps": [
          {
            "start": 1,
            "end": 19,
            "title": "Comparar métricas entre particiones",
            "text": "Dibuja las cuatro métricas calculadas para entrenamiento y evaluación; las barras no reentrenan ni generan valores nuevos."
          },
          {
            "start": 21,
            "end": 41,
            "title": "Explicar errores y umbrales",
            "text": "La matriz cruza y_test con y_pred; la ROC usa probabilidad de score=0 y representa tasas para varios umbrales. El AUC pertenece a esta figura."
          },
          {
            "start": 43,
            "end": 51,
            "title": "Mostrar importancias del bosque",
            "text": "Ordena feature_importances_ y dibuja las 15 principales. Es importancia interna del modelo, no causalidad."
          }
        ]
      },
      {
        "sourceCell": 8,
        "title": "4. Predicción por lote con un CSV nuevo (opcional)",
        "explanation": "Esta celda procesa un archivo nuevo ya transformado con el mismo esquema de predictores. La celda está desactivada por defecto; se activa únicamente para procesar un CSV nuevo.",
        "source": "EJECUTAR_PREDICCION_REAL = False  # Activa solo al disponer de un CSV nuevo ya procesado.\n\nif EJECUTAR_PREDICCION_REAL:\n    archivos = files.upload()\n    nombre = next(iter(archivos))\n    ruta = Path('/content') / nombre\n    ruta.write_bytes(archivos[nombre])\n    nuevos_df = pd.read_csv(ruta, low_memory=False)\n\n    columnas_faltantes = sorted(set(feature_columns) - set(nuevos_df.columns))\n    if columnas_faltantes:\n        raise ValueError(f'Faltan variables del esquema de entrenamiento: {columnas_faltantes[:10]}')\n\n    X_nuevo = nuevos_df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')\n    pred_nuevas = rf.predict(X_nuevo)\n    prob_nuevas = rf.predict_proba(X_nuevo)\n    columnas_id = [c for c in ['student_id', 'unit_test_assignment_log_id', 'problem_id'] if c in nuevos_df.columns]\n    salida = nuevos_df[columnas_id].copy().reset_index(drop=True)\n    salida['score_predicho'] = pred_nuevas.astype('int8')\n    salida['probabilidad_score_0'] = prob_nuevas[:, class_index[0]].round(4)\n    salida['probabilidad_score_1'] = prob_nuevas[:, class_index[1]].round(4)\n    display(salida.head(20))\n    salida.to_csv('/content/predicciones_nuevos_datos.csv', index=False)\n    print('Archivo guardado: /content/predicciones_nuevos_datos.csv')\nelse:\n    print('Predicción por lote desactivada. Activa EJECUTAR_PREDICCION_REAL para usar un CSV nuevo.')\n",
        "lineCount": 27,
        "steps": [
          {
            "start": 1,
            "end": 8,
            "title": "Activar carga de nuevos datos",
            "text": "La opción parte en False. Si se activa, sube un CSV nuevo ya preparado y lo lee en una tabla."
          },
          {
            "start": 10,
            "end": 12,
            "title": "Comprobar esquema requerido",
            "text": "Verifica que el archivo incluya cada predictor empleado al entrenar; si falta alguna variable, detiene la predicción."
          },
          {
            "start": 14,
            "end": 21,
            "title": "Ordenar, transformar y predecir",
            "text": "Construye X_nuevo con el orden de entrenamiento, convierte a float32 y calcula clase/probabilidades. score real no es entrada."
          },
          {
            "start": 22,
            "end": 26,
            "title": "Guardar el resultado",
            "text": "Acompaña las predicciones con IDs disponibles y exporta predicciones_nuevos_datos.csv."
          }
        ]
      }
    ]
  },
  {
    "id": "comparison",
    "title": "Comparación de Random Forest y Extra Trees",
    "file": "ASSISTments_Comparacion_RF_ExtraTrees.ipynb",
    "source": "../ASSISTments_Comparacion_RF_ExtraTrees.ipynb",
    "purpose": "Compara RF de la práctica, RF con parámetros modificados y Extra Trees usando los mismos predictores y la partición oficial; presenta las cuatro métricas y las gráficas de análisis.",
    "cells": [
      {
        "sourceCell": 2,
        "title": "1. Cargar el CSV preparado",
        "explanation": "Sube `assistments_rf_dataset.csv.gz` desde Colab. Esta notebook compara modelos sobre el mismo archivo preparado; no vuelve a integrar archivos crudos.",
        "source": "from pathlib import Path\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nfrom IPython.display import display, Markdown\nfrom google.colab import files\n\nfiles.upload()  # Selecciona assistments_rf_dataset.csv.gz\nDATASET_CSV = Path('/content/assistments_rf_dataset.csv.gz')\ndf = pd.read_csv(DATASET_CSV, low_memory=False)\n\nprint(f'Filas: {len(df):,} | estudiantes: {df.student_id.nunique():,} | columnas: {df.shape[1]:,}')\ndisplay(df['source_split'].value_counts().rename_axis('partición').to_frame('filas'))\ndisplay(df['score'].value_counts().sort_index().rename_axis('score').to_frame('filas'))\n",
        "lineCount": 15,
        "steps": [
          {
            "start": 1,
            "end": 8,
            "title": "Cargar librerías y archivo",
            "text": "Sube y lee la misma tabla preparada que utiliza la réplica RF."
          },
          {
            "start": 9,
            "end": 14,
            "title": "Inspeccionar filas y clases",
            "text": "Muestra dimensiones, source_split y distribución de score antes de entrenar."
          }
        ]
      },
      {
        "sourceCell": 4,
        "title": "2. Definir X, y y la partición",
        "explanation": "`score` es la variable dependiente. Se excluye de `X`, junto con `student_id`, `source_split`, `unit_test_assignment_log_id` y `problem_id`. Se usan las particiones oficiales `train` y `evaluation`; no se crea una partición de respaldo. La revisión de estudiantes compartidos se mantiene porque limita la interpretación de evaluation como prueba de estudiantes completamente nuevos.",
        "source": "# score es la etiqueta; los IDs y source_split no son predictores.\nid_columns = {\n    'score', 'student_id', 'source_split',\n    'unit_test_assignment_log_id', 'problem_id'\n}\nfeature_columns = [c for c in df.columns if c not in id_columns]\nX = df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')\ny = df['score'].astype('int8')\n\n# Se usan directamente las particiones oficiales source_split.\ntrain_mask = df['source_split'].eq('train')\neval_mask = df['source_split'].eq('evaluation')\nX_train = X.loc[train_mask].reset_index(drop=True)\nX_test = X.loc[eval_mask].reset_index(drop=True)\ny_train = y.loc[train_mask].to_numpy()\ny_test = y.loc[eval_mask].to_numpy()\n\ntrain_students = set(df.loc[train_mask, 'student_id'].dropna())\neval_students = set(df.loc[eval_mask, 'student_id'].dropna())\noverlap = train_students & eval_students\nshared_eval_rows = df.loc[eval_mask, 'student_id'].isin(train_students).sum()\n\nprint(f'Predictores: {len(feature_columns)} | train: {len(y_train):,} | evaluation: {len(y_test):,}')\nprint(f'Estudiantes compartidos: {len(overlap)} | registros evaluation de esos estudiantes: {shared_eval_rows:,}')\n",
        "lineCount": 25,
        "steps": [
          {
            "start": 1,
            "end": 8,
            "title": "Separar X e y",
            "text": "score queda como y; X excluye score, student_id, source_split y los IDs de asignación y problema."
          },
          {
            "start": 10,
            "end": 16,
            "title": "Usar las particiones originales",
            "text": "Forma los conjuntos train y evaluation desde source_split, sin crear una partición alternativa."
          },
          {
            "start": 18,
            "end": 24,
            "title": "Contar estudiantes compartidos y filas asociadas",
            "text": "train_students y eval_students son conjuntos de student_id únicos de cada partición. overlap = train_students & eval_students cuenta los IDs que aparecen en ambas: 31. shared_eval_rows cuenta las filas de evaluation cuyos student_id también están en train: 552. Son registros reservados ligados a estudiantes ya vistos, no 552 filas duplicadas. Como student_id se excluye de X, el modelo no lo recibe como predictor; aun así, esta partición no mide bien el caso de alumnos completamente nuevos."
          }
        ]
      },
      {
        "sourceCell": 6,
        "title": "3. Modelos e hiperparámetros",
        "explanation": "RF base reproduce la práctica. El segundo RF limita la profundidad y exige más filas para dividirse. Extra Trees prueba cortes aleatorios. Los tres usan los mismos datos.",
        "source": "from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier\n\nSEED = 42\nN_ESTIMATORS = 600\n\nmodels = {\n    'RF práctica': RandomForestClassifier(\n        n_estimators=N_ESTIMATORS, # cantidad de árboles de la práctica\n        max_depth=19,              # profundidad máxima de la práctica\n        min_samples_split=10,      # el grupo necesita 10 filas para dividirse\n        min_samples_leaf=2,        # cada grupo final conserva al menos 2 filas\n        max_features='sqrt',       # revisa unas 27 variables por división\n        bootstrap=True,            # cada árbol usa una muestra con reemplazo\n        random_state=SEED,         # hace reproducible el ajuste\n        n_jobs=-1                  # usa todos los núcleos disponibles\n    ),\n    'RF parámetros modificados': RandomForestClassifier(\n        n_estimators=N_ESTIMATORS, # cantidad de árboles controlada\n        max_depth=12,              # permite menos decisiones en cadena\n        min_samples_split=20,      # necesita 20 filas para poder dividirse\n        min_samples_leaf=5,        # cada grupo final conserva al menos 5 filas\n        max_features='sqrt',       # conserva la selección de predictores\n        bootstrap=True,\n        random_state=SEED,\n        n_jobs=-1\n    ),\n    'Extra Trees': ExtraTreesClassifier(\n        n_estimators=N_ESTIMATORS,\n        max_depth=19,\n        min_samples_split=10,\n        min_samples_leaf=2,\n        max_features='sqrt',\n        bootstrap=True,            # en esta corrida, también usa muestras con reemplazo\n        random_state=SEED,\n        n_jobs=-1\n    )\n}\n",
        "lineCount": 38,
        "steps": [
          {
            "start": 1,
            "end": 16,
            "title": "Definir RF base",
            "text": "Usa 600 árboles. Cada grupo puede dividirse desde 10 filas y cada resultado final reúne al menos 2."
          },
          {
            "start": 17,
            "end": 26,
            "title": "Definir RF modificado",
            "text": "Mantiene Random Forest; cambia profundidad 19→12, filas para dividir 10→20 y filas por grupo final 2→5. Sus árboles quedan menos detallados."
          },
          {
            "start": 27,
            "end": 37,
            "title": "Definir Extra Trees",
            "text": "También combina árboles, pero prueba puntos de corte al azar. En esta corrida bootstrap=True, igual que en los RF."
          }
        ]
      },
      {
        "sourceCell": 8,
        "title": "4. Entrenamiento y métricas solicitadas",
        "explanation": "Accuracy: aciertos de todos los registros. Precisión: aciertos entre lo predicho. Recall: casos reales encontrados. F1 combina precisión y recall. Macro promedia score=0 y 1 por igual.",
        "source": "from sklearn.metrics import (\n    accuracy_score, precision_score, recall_score, f1_score,\n    roc_curve, roc_auc_score, confusion_matrix\n)\n\ntrain_rows = []\nevaluation_rows = []\nroc_data = {}\nconfusion_data = {}\n\nfor model_name, model in models.items():\n    # El modelo aprende solamente de la partición de entrenamiento.\n    model.fit(X_train, y_train)\n    roc_data[model_name] = {}\n    confusion_data[model_name] = {}\n\n    for split_name, table_rows, X_part, y_part in [\n        ('train', train_rows, X_train, y_train),\n        ('evaluation', evaluation_rows, X_test, y_test)\n    ]:\n        predicted = model.predict(X_part)\n        # Precisión: de lo predicho como clase, qué proporción acertó.\n        # Recall: de los casos reales de la clase, cuántos encontró. F1 combina ambos.\n        # Las medidas macro se calculan en score=0 y score=1 y se promedian por igual.\n        table_rows.append({\n            'Algoritmo': model_name,\n            'Accuracy': accuracy_score(y_part, predicted),\n            'Precisión*': precision_score(\n                y_part, predicted, average='macro', zero_division=0\n            ),\n            'Recall*': recall_score(\n                y_part, predicted, average='macro', zero_division=0\n            ),\n            'F1-score*': f1_score(\n                y_part, predicted, average='macro', zero_division=0\n            )\n        })\n\n        # Los siguientes resultados se usan solo para dibujar las gráficas.\n        # La matriz usa y real frente a predicción: filas reales, columnas predichas.\n        confusion_data[model_name][split_name] = confusion_matrix(\n            y_part, predicted, labels=[0, 1]\n        )\n        class_index = {int(label): i for i, label in enumerate(model.classes_)}\n        probability_score0 = model.predict_proba(X_part)[:, class_index[0]]\n        actual_score0 = (y_part == 0).astype('int8')\n        # ROC de score=0: compara no éxitos encontrados y falsas alertas por umbral.\n        fpr, tpr, _ = roc_curve(actual_score0, probability_score0)\n        auc_score0 = roc_auc_score(actual_score0, probability_score0)\n        roc_data[model_name][split_name] = (fpr, tpr, auc_score0)\n\ntrain_metrics = pd.DataFrame(train_rows)\nevaluation_metrics = pd.DataFrame(evaluation_rows)\n\ndisplay(Markdown(f'### Tabla: métricas de entrenamiento *(n = {len(y_train):,})*'))\ndisplay(train_metrics.round(4))\ndisplay(Markdown(f'### Tabla: métricas de evaluación o prueba *(n = {len(y_test):,})*'))\ndisplay(evaluation_metrics.round(4))\ndisplay(Markdown('**Nota:** el asterisco (`*`) indica promedio macro: se promedian `score=0` y `score=1` con el mismo peso.'))\n\ntrain_metrics.to_csv('metricas_entrenamiento.csv', index=False, float_format='%.4f')\nevaluation_metrics.to_csv('metricas_evaluacion.csv', index=False, float_format='%.4f')\nprint('Guardados: metricas_entrenamiento.csv y metricas_evaluacion.csv')\n",
        "lineCount": 64,
        "steps": [
          {
            "start": 1,
            "end": 9,
            "title": "Preparar salidas de métricas y gráficos",
            "text": "Crea listas para las dos tablas y diccionarios para curvas ROC y matrices; esas figuras no añaden columnas a la tabla."
          },
          {
            "start": 11,
            "end": 15,
            "title": "Ajustar cada modelo solo con train",
            "text": "Cada estimador recibe X_train/y_train; después se mantienen las predicciones separadas por partición."
          },
          {
            "start": 17,
            "end": 34,
            "title": "Calcular las cuatro métricas",
            "text": "Accuracy cuenta aciertos; precisión indica si lo predicho suele ser correcto; recall indica cuántos casos reales se encontraron; F1 combina precisión y recall. Macro promedia las dos clases."
          },
          {
            "start": 36,
            "end": 45,
            "title": "Preparar matrices y curvas ROC",
            "text": "La matriz usa etiquetas reales/predichas; la ROC usa probabilidades de score=0. Sirven para visualización, no se agregan a las tablas."
          },
          {
            "start": 46,
            "end": 58,
            "title": "Mostrar y exportar las tablas",
            "text": "Presenta una tabla de entrenamiento y otra de evaluación con solo las cuatro métricas solicitadas; también guarda ambas como CSV."
          }
        ]
      },
      {
        "sourceCell": 11,
        "title": "6. Gráfico comparativo de las métricas",
        "explanation": "La figura reúne entrenamiento y evaluación en dos paneles, con la misma escala de 0 a 1. Cada color representa una de las cuatro métricas; los valores macro promedian `score=0` y `score=1` con igual peso. La evaluación permite comparar los modelos en registros reservados; entrenamiento muestra el ajuste a los datos usados para aprender.",
        "source": "# Comparación dinámica de las cuatro métricas acordadas.\n# Se usan las tablas calculadas arriba; no se vuelven a entrenar los modelos.\nmetric_specs = [\n    ('Accuracy', 'Accuracy', '#2a6f97'),\n    ('Precisión*', 'Precisión macro*', '#ee9b00'),\n    ('Recall*', 'Recall macro*', '#2a9d8f'),\n    ('F1-score*', 'F1 macro*', '#9b5de5')\n]\nmodel_order = list(models.keys())\nx = np.arange(len(model_order))\nbar_width = 0.19\n\nfig, axes = plt.subplots(1, 2, figsize=(13, 5.2), dpi=180, sharey=True)\nfor ax, metrics_table, panel_title in [\n    (axes[0], train_metrics, 'Entrenamiento'),\n    (axes[1], evaluation_metrics, 'Evaluación (prueba)')\n]:\n    indexed = metrics_table.set_index('Algoritmo').loc[model_order]\n    for metric_index, (column, label, color) in enumerate(metric_specs):\n        offset = (metric_index - (len(metric_specs) - 1) / 2) * bar_width\n        bars = ax.bar(\n            x + offset, indexed[column].to_numpy(), width=bar_width,\n            label=label, color=color\n        )\n        ax.bar_label(bars, fmt='%.2f', fontsize=7, padding=2)\n    ax.set_title(panel_title)\n    ax.set_xticks(x, model_order, rotation=8)\n    ax.set_ylim(0, 1.08)\n    ax.set_ylabel('Valor de la métrica')\n    ax.grid(axis='y', alpha=0.25)\n    ax.set_axisbelow(True)\n    ax.spines['top'].set_visible(False)\n    ax.spines['right'].set_visible(False)\n\nhandles, labels = axes[0].get_legend_handles_labels()\nfig.legend(handles, labels, loc='upper center', ncol=4, bbox_to_anchor=(0.5, 1.02))\nfig.suptitle('Comparación de las cuatro métricas', y=1.10)\nfig.tight_layout(rect=[0, 0, 1, 0.92])\nfig.savefig('comparacion_metricas_train_evaluation.png', dpi=300, bbox_inches='tight')\nplt.show()\nprint('Guardado: comparacion_metricas_train_evaluation.png')\n",
        "lineCount": 42,
        "steps": [
          {
            "start": 1,
            "end": 11,
            "title": "Seleccionar las métricas de las tablas",
            "text": "Declara los cuatro indicadores y orden de modelos; no calcula métricas nuevas."
          },
          {
            "start": 13,
            "end": 34,
            "title": "Dibujar los dos paneles",
            "text": "Compara los valores ya calculados para train y evaluation en una escala común de 0 a 1."
          },
          {
            "start": 35,
            "end": 41,
            "title": "Guardar la figura",
            "text": "Añade leyenda, título y exporta comparacion_metricas_train_evaluation.png."
          }
        ]
      },
      {
        "sourceCell": 13,
        "title": "7. Curvas ROC y matrices de confusión",
        "explanation": "La ROC compara detecciones de score=0 y falsas alertas al probar varios umbrales. La matriz cuenta aciertos y errores: filas reales, columnas predichas.",
        "source": "colors = {\n    'RF práctica': '#1f4e79',\n    'RF parámetros modificados': '#d28e00',\n    'Extra Trees': '#24805a'\n}\nfig, axes = plt.subplots(1, 2, figsize=(10, 4.2), dpi=180)\nfor ax, split_name, title in zip(\n    axes, ['train', 'evaluation'], ['Entrenamiento', 'Evaluación (prueba)']\n):\n    for model_name in models:\n        fpr, tpr, auc_score0 = roc_data[model_name][split_name]\n        ax.plot(\n            fpr, tpr, lw=1.8, color=colors[model_name],\n            label=f'{model_name} (AUC={auc_score0:.3f})'\n        )\n    ax.plot([0, 1], [0, 1], '--', color='gray', lw=1, label='Referencia al azar')\n    ax.set(\n        xlim=(0, 1), ylim=(0, 1.02),\n        xlabel='Tasa de falsos positivos',\n        ylabel='Tasa de verdaderos positivos', title=title\n    )\n    ax.grid(alpha=.2)\n    ax.legend(fontsize=7, loc='lower right')\nfig.suptitle('Curvas ROC para score=0')\nfig.tight_layout()\nfig.savefig('curvas_ROC_train_evaluation.png', dpi=300, bbox_inches='tight')\nplt.show()\nprint('Guardado: curvas_ROC_train_evaluation.png')\n",
        "lineCount": 29,
        "steps": [
          {
            "start": 1,
            "end": 20,
            "title": "Trazar ROC por partición",
            "text": "X representa falsas alertas; Y representa score=0 encontrado. Cada punto prueba otro umbral. La diagonal es el azar; AUC no es accuracy."
          },
          {
            "start": 21,
            "end": 28,
            "title": "Rotular y guardar la ROC",
            "text": "La curva más alta y hacia la izquierda suele separar mejor. El AUC resume esa separación, pero no es porcentaje de aciertos."
          }
        ]
      },
      {
        "sourceCell": 14,
        "title": "Celda 15",
        "explanation": "colors = { 'RF práctica': '#1f4e79', 'RF parámetros modificados': '#d28e00', 'Extra Trees': '#24805a' } fig, axes = plt.subplots(1, 2, figsize=(10, 4.2), dpi=180) for ax, split_name, title in zip( axes, ['train', 'evaluation'], ['Entrenamiento', 'Evaluación (prueba)'] ): for model_name in models: fpr, tpr, auc_score0 = roc_data[model_name][split_name] ax.plot( fpr, tpr, lw=1.8, color=colors[model_name], label=f'{model_name} (AUC={auc_score0:.3f})' ) ax.plot([0, 1], [0, 1], '--', color='gray', lw=1, label='Referencia al azar') ax.set( xlim=(0, 1), ylim=(0, 1.02), xlabel='Tasa de falsos positivos', ylabel='Tasa de verdaderos positivos', title=title ) ax.grid(alpha=.2) ax.legend(fontsize=7, loc='lower right') fig.suptitle('Curvas ROC para score=0') fig.tight_layout() fig.savefig('curvas_ROC_train_evaluation.png', dpi=300, bbox_inches='tight') plt.show() print('Guardado: curvas_ROC_train_evaluation.png')",
        "source": "fig, axes = plt.subplots(1, 3, figsize=(10, 3.2), dpi=180)\nfor ax, model_name in zip(axes, models):\n    matrix = confusion_data[model_name]['evaluation']\n    ax.imshow(matrix, cmap='Blues')\n    ax.set_title(model_name, fontsize=9)\n    ax.set_xticks([0, 1], ['Predicho 0', 'Predicho 1'], fontsize=7)\n    ax.set_yticks([0, 1], ['Real 0', 'Real 1'], fontsize=7)\n    for (row, col), value in np.ndenumerate(matrix):\n        ax.text(\n            col, row, f'{value:,}', ha='center', va='center', fontsize=8,\n            color='white' if value > matrix.max() * .55 else 'black'\n        )\nfig.suptitle('Matrices de confusión en evaluación (prueba)')\nfig.tight_layout()\nfig.savefig('matrices_confusion_evaluation.png', dpi=300, bbox_inches='tight')\nplt.show()\nprint('Guardado: matrices_confusion_evaluation.png')\n",
        "lineCount": 18,
        "steps": [
          {
            "start": 1,
            "end": 17,
            "title": "Comparar las tres matrices",
            "text": "Dibuja una matriz para cada modelo sobre evaluation: filas reales, columnas predichas y diagonal como aciertos."
          }
        ]
      }
    ]
  }
];
