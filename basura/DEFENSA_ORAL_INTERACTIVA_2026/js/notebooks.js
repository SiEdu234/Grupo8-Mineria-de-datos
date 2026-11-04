window.NOTEBOOKS = [
  {
    "id": "prep",
    "title": "Preparar una sola tabla de ASSISTments",
    "file": "ASSISTments_01_Preparar_CSV.ipynb",
    "source": "../../ASSISTments_01_Preparar_CSV.ipynb",
    "purpose": "Une archivos oficiales, selecciona la muestra de estudiantes, construye variables y guarda un CSV comprimido. Aquí todavía no se entrena ningún modelo.",
    "cells": [
      {
        "sourceCell": 2,
        "title": "Configuración y rutas",
        "explanation": "Se conecta a Drive y fija la semilla, el límite de 3 000 estudiantes y el tamaño de lectura por bloques. Después determina dónde están los datos y dónde guardar el CSV.",
        "source": "from pathlib import Path\nimport gc\nimport re\nimport numpy as np\nimport pandas as pd\nfrom IPython.display import display\nfrom google.colab import drive\n\ndrive.mount('/content/drive')\n\nSEED = 42\nMAX_STUDENTS = 3000   # Muestra reproducible. Usa None para incluir a todos.\nCHUNK_SIZE = 300_000  # Lee el archivo grande de acciones por bloques.\n\nBASE_DIR = Path('/content/drive/MyDrive/EDMCup2023')\nDATA_DIR = BASE_DIR / 'data'\nOUTPUT_DIR = BASE_DIR / 'salida'\nOUTPUT_DIR.mkdir(parents=True, exist_ok=True)\nCANONICAL_CSV = OUTPUT_DIR / 'assistments_rf_dataset.csv.gz'\n\nprint('Datos crudos:', DATA_DIR)\nprint('CSV único de referencia:', CANONICAL_CSV)\nprint(f'Estudiantes en la muestra: {MAX_STUDENTS:,}' if MAX_STUDENTS else 'Se usarán todos los estudiantes')",
        "lineCount": 23,
        "steps": [
          {
            "start": 9,
            "title": "Conexión con los datos",
            "text": "Monta Google Drive en Colab para que el cuaderno pueda leer los CSV originales.",
            "end": 10
          },
          {
            "start": 11,
            "title": "Reproducibilidad y tamaño",
            "text": "SEED fija la selección aleatoria. MAX_STUDENTS limita la muestra a 3 000 estudiantes; CHUNK_SIZE controla cuántas filas de action_logs se procesan por bloque.",
            "end": 14
          },
          {
            "start": 15,
            "title": "Rutas de entrada y salida",
            "text": "Define la carpeta del proyecto y el nombre del CSV comprimido que consumen los cuadernos de modelado.",
            "end": 23
          }
        ],
        "outputMode": "print",
        "output": "La celda solicita conectar Google Drive y muestra la ruta de datos, el destino del CSV y el tamaño de muestra configurado."
      },
      {
        "sourceCell": 4,
        "title": "Funciones de lectura y validación",
        "explanation": "Define funciones reutilizables para encontrar archivos, normalizar claves, revisar columnas requeridas y leer archivos grandes por fragmentos.",
        "source": "def find_file(filename, required=True):\n    matches = list(DATA_DIR.rglob(filename)) if DATA_DIR.exists() else []\n    if not matches:\n        if required:\n            raise FileNotFoundError(\n                f'No encuentro {filename} dentro de {DATA_DIR}. '\n                'Descomprime los datos oficiales en esa carpeta y vuelve a ejecutar.'\n            )\n        return None\n    if len(matches) > 1:\n        # Prioriza un archivo directamente en data/ y luego el primero por ruta.\n        matches.sort(key=lambda p: (len(p.parts), str(p).lower()))\n    return matches[0]\n\n\ndef normalize_id(values):\n    \"\"\"Unifica IDs leídos como entero, decimal o texto sin alterar su contenido.\"\"\"\n    return (values.astype('string').str.strip()\n            .str.replace(r'\\.0$', '', regex=True))\n\n\ndef read_scores(path, split_name):\n    df = pd.read_csv(path, low_memory=False)\n    required = {'assignment_log_id', 'problem_id', 'score'}\n    missing = required - set(df.columns)\n    if missing:\n        raise ValueError(f'{path.name}: faltan columnas {sorted(missing)}')\n    df['assignment_log_id'] = normalize_id(df['assignment_log_id'])\n    df['problem_id'] = normalize_id(df['problem_id'])\n    df['score'] = pd.to_numeric(df['score'], errors='coerce')\n    df['source_split'] = split_name\n    return df\n\n\ndef read_filtered_csv(path, columns, key_column, accepted_ids, chunksize=CHUNK_SIZE):\n    \"\"\"Lee por bloques un CSV y conserva solo IDs solicitados.\"\"\"\n    header = pd.read_csv(path, nrows=0).columns.tolist()\n    missing = set(columns) - set(header)\n    if missing:\n        raise ValueError(f'{path.name}: faltan columnas {sorted(missing)}')\n    parts = []\n    dtype = {key_column: 'string'}\n    for chunk in pd.read_csv(path, usecols=columns, dtype=dtype,\n                             chunksize=chunksize, low_memory=False):\n        chunk[key_column] = normalize_id(chunk[key_column])\n        chunk = chunk[chunk[key_column].isin(accepted_ids)]\n        if not chunk.empty:\n            parts.append(chunk)\n    if not parts:\n        return pd.DataFrame(columns=columns)\n    return pd.concat(parts, ignore_index=True).drop_duplicates()\n\n\ndef read_assignment_details(path, assignment_ids):\n    columns = ['assignment_log_id', 'student_id', 'sequence_id', 'assignment_end_time']\n    header = pd.read_csv(path, nrows=0).columns.tolist()\n    missing = set(columns) - set(header)\n    if missing:\n        raise ValueError(f'{path.name}: faltan columnas {sorted(missing)}')\n    details = read_filtered_csv(path, columns, 'assignment_log_id', assignment_ids)\n    for col in ['student_id', 'sequence_id']:\n        details[col] = normalize_id(details[col])\n    details['assignment_end_time'] = details['assignment_end_time'].replace(r'^\\s*$', pd.NA, regex=True)\n    return details.drop_duplicates('assignment_log_id', keep='first')\n\n\ndef normalize_category(values):\n    return (values.astype('string').fillna('other').str.strip().str.lower()\n            .str.replace(r'[\\s-]+', '_', regex=True)\n            .str.replace(r'[^a-z0-9_]+', '', regex=True)\n            .replace('', 'other'))\n\n\ndef clean_text(values):\n    return (values.astype('string').fillna('NA').str.lower()\n            .str.replace(r'[^a-zA-Z0-9\\s]', '', regex=True)\n            .str.replace(r'\\s+', ' ', regex=True).str.strip())",
        "lineCount": 77,
        "steps": [
          {
            "start": 1,
            "title": "Localizar archivos",
            "text": "Busca cada archivo por nombre dentro de la carpeta de datos y detiene el proceso si falta un archivo obligatorio.",
            "end": 15
          },
          {
            "start": 16,
            "title": "Unificar claves",
            "text": "Convierte los IDs a texto, quita espacios y elimina el sufijo decimal .0 para que las uniones coincidan.",
            "end": 21
          },
          {
            "start": 22,
            "title": "Validar etiquetas",
            "text": "Comprueba assignment_log_id, problem_id y score; convierte score a número y registra si el dato pertenece a train o evaluation.",
            "end": 34
          },
          {
            "start": 35,
            "title": "Leer por bloques",
            "text": "Lee sólo columnas necesarias y fragmentos de hasta CHUNK_SIZE; conserva las claves solicitadas y quita duplicados.",
            "end": 53
          },
          {
            "start": 54,
            "title": "Preparar metadatos",
            "text": "Extrae estudiante, secuencia y fecha de finalización; conserva un registro por asignación.",
            "end": 66
          },
          {
            "start": 67,
            "title": "Limpiar categorías y texto",
            "text": "Uniforma categorías y texto para reducir variantes causadas por mayúsculas, espacios o signos.",
            "end": 77
          }
        ],
        "outputMode": "none",
        "output": "No genera una tabla ni imprime resultados: deja funciones definidas para que la celda de construcción las use."
      },
      {
        "sourceCell": 6,
        "title": "Construir las variables y guardar el CSV",
        "explanation": "Ejecuta la integración: selecciona estudiantes, relaciona evaluaciones con prácticas, agrega acciones y características del curso y problema, imputa faltantes y escribe el CSV gzip.",
        "source": "if CANONICAL_CSV.exists():\n    print(f'Ya existe {CANONICAL_CSV}. Se reutilizará y no se sobrescribirá.')\n    print('Para construir otra muestra, cambia el nombre de CANONICAL_CSV en la celda de configuración.')\nelse:\n    print('Leyendo puntuaciones y seleccionando estudiantes...')\n    # Archivos oficiales de entrada\n    training_path = find_file('training_unit_test_scores.csv')\n    evaluation_path = find_file('evaluation_unit_test_scores.csv')\n    total_scores_path = find_file('unit_test_scores.csv', required=False)\n    relationships_path = find_file('assignment_relationships.csv')\n    assignment_path = find_file('assignment_details.csv')\n    sequence_path = find_file('sequence_details.csv')\n    problem_path = find_file('problem_details.csv')\n    action_path = find_file('action_logs.csv')  # Puede estar en data/files/\n\n    train_scores = read_scores(training_path, 'train')\n    eval_scores = read_scores(evaluation_path, 'evaluation')\n    all_target_ids = set(pd.concat([\n        train_scores['assignment_log_id'], eval_scores['assignment_log_id']\n    ]).dropna().unique())\n\n    # Primer barrido de assignment_details: solo necesitamos identificar estudiantes\n    target_details = read_assignment_details(assignment_path, all_target_ids)\n    student_by_assignment = target_details[['assignment_log_id', 'student_id']].dropna()\n    known_student_ids = student_by_assignment['student_id'].drop_duplicates()\n    if known_student_ids.empty:\n        raise ValueError('No se encontraron student_id para las evaluaciones finales.')\n\n    if MAX_STUDENTS is None or MAX_STUDENTS >= len(known_student_ids):\n        selected_students = set(known_student_ids)\n    else:\n        selected_students = set(known_student_ids.sample(\n            n=MAX_STUDENTS, random_state=SEED\n        ))\n\n    selected_assignment_ids = set(\n        student_by_assignment.loc[\n            student_by_assignment['student_id'].isin(selected_students),\n            'assignment_log_id'\n        ]\n    )\n    targets = pd.concat([train_scores, eval_scores], ignore_index=True, sort=False)\n    targets = targets[targets['assignment_log_id'].isin(selected_assignment_ids)].copy()\n    targets = targets.merge(student_by_assignment, on='assignment_log_id', how='left')\n    targets = targets.drop_duplicates(['assignment_log_id', 'problem_id', 'source_split'])\n    targets = targets.rename(columns={'assignment_log_id': 'unit_test_assignment_log_id'})\n\n    # Si la descarga incluye etiquetas finales del conjunto de evaluación, se usan para\n    # medir el resultado oficial. Si no, la evaluación se hará con una partición interna.\n    if total_scores_path is not None and targets.loc[\n        targets['source_split'].eq('evaluation'), 'score'\n    ].isna().any():\n        eval_rows = targets[targets['source_split'].eq('evaluation')]\n        eval_pairs = set(zip(eval_rows['unit_test_assignment_log_id'], eval_rows['problem_id']))\n        score_parts = []\n        for chunk in pd.read_csv(\n            total_scores_path,\n            usecols=['assignment_log_id', 'problem_id', 'score'],\n            dtype={'assignment_log_id': 'string', 'problem_id': 'string'},\n            chunksize=CHUNK_SIZE,\n            low_memory=False\n        ):\n            chunk['assignment_log_id'] = normalize_id(chunk['assignment_log_id'])\n            chunk['problem_id'] = normalize_id(chunk['problem_id'])\n            pairs = list(zip(chunk['assignment_log_id'], chunk['problem_id']))\n            chunk = chunk.loc[[pair in eval_pairs for pair in pairs]]\n            if not chunk.empty:\n                score_parts.append(chunk)\n        if score_parts:\n            score_lookup = pd.concat(score_parts, ignore_index=True)\n            score_lookup['score'] = pd.to_numeric(score_lookup['score'], errors='coerce')\n            score_lookup = score_lookup.drop_duplicates(['assignment_log_id', 'problem_id'])\n            lookup = dict(zip(\n                zip(score_lookup['assignment_log_id'], score_lookup['problem_id']),\n                score_lookup['score']\n            ))\n            mask = targets['source_split'].eq('evaluation') & targets['score'].isna()\n            targets.loc[mask, 'score'] = [\n                lookup.get((a, p), np.nan) for a, p in zip(\n                    targets.loc[mask, 'unit_test_assignment_log_id'],\n                    targets.loc[mask, 'problem_id']\n                )\n            ]\n\n    target_ids = set(targets['unit_test_assignment_log_id'].dropna())\n    rel_columns = ['unit_test_assignment_log_id', 'in_unit_assignment_log_id']\n    relationships = read_filtered_csv(\n        relationships_path, rel_columns, 'unit_test_assignment_log_id', target_ids\n    )\n    relationships['in_unit_assignment_log_id'] = normalize_id(\n        relationships['in_unit_assignment_log_id']\n    )\n    target_columns = [\n        'unit_test_assignment_log_id', 'problem_id', 'score', 'student_id', 'source_split'\n    ]\n    target_rel = targets[target_columns].merge(\n        relationships, on='unit_test_assignment_log_id', how='left'\n    )\n    in_unit_ids = set(target_rel['in_unit_assignment_log_id'].dropna())\n\n    print('Filtrando prácticas y variables del curso...')\n    # Segundo barrido: detalles solo de evaluaciones y prácticas seleccionadas\n    needed_assignment_ids = target_ids | in_unit_ids\n    assignment_details = read_assignment_details(assignment_path, needed_assignment_ids)\n\n    # Relación de prácticas no terminadas por evaluación final\n    rel_detail = relationships.merge(\n        assignment_details[['assignment_log_id', 'assignment_end_time']],\n        left_on='in_unit_assignment_log_id', right_on='assignment_log_id', how='left'\n    )\n    rel_detail = rel_detail.drop_duplicates(\n        ['unit_test_assignment_log_id', 'in_unit_assignment_log_id']\n    )\n    rel_detail['unfinished'] = rel_detail['assignment_end_time'].isna().astype('uint8')\n    assignment_stats = rel_detail.groupby('unit_test_assignment_log_id').agg(\n        total_practice=('in_unit_assignment_log_id', 'nunique'),\n        unfinished_practice=('unfinished', 'sum')\n    ).reset_index()\n    assignment_stats['notfinish_percent'] = (\n        assignment_stats['unfinished_practice'] /\n        assignment_stats['total_practice'].replace(0, np.nan)\n    ).round(4)\n\n    # Extraer acciones por bloques y resumirlas por evaluación final + problema\n    action_categories = [\n        'answer_requested', 'assignment_finished', 'assignment_resumed',\n        'assignment_started', 'continue_selected', 'correct_response',\n        'explanation_requested', 'hint_requested', 'live_tutor_requested',\n        'open_response', 'problem_finished', 'problem_started',\n        'skill_related_video_requested', 'wrong_response'\n    ]\n    tutoring_categories = ['answer', 'explanation', 'hint', 'no_tutoring']\n    action_columns = [\n        'assignment_log_id', 'problem_id', 'max_attempts', 'available_core_tutoring',\n        'score_viewable', 'continuous_score_viewable', 'action'\n    ]\n    action_header = pd.read_csv(action_path, nrows=0).columns.tolist()\n    missing_action = set(action_columns) - set(action_header)\n    if missing_action:\n        raise ValueError(f'action_logs.csv: faltan columnas {sorted(missing_action)}')\n\n    action_map = target_rel[\n        ['unit_test_assignment_log_id', 'problem_id', 'in_unit_assignment_log_id']\n    ].dropna(subset=['in_unit_assignment_log_id']).drop_duplicates()\n    action_parts = []\n    mode_parts = {col: [] for col in [\n        'max_attempts', 'score_viewable', 'continuous_score_viewable'\n    ]}\n\n    print('Procesando action_logs.csv por bloques...')\n    for chunk_number, action_chunk in enumerate(pd.read_csv(\n        action_path, usecols=action_columns,\n        dtype={'assignment_log_id': 'string'}, chunksize=CHUNK_SIZE,\n        low_memory=False\n    ), start=1):\n        if chunk_number == 1 or chunk_number % 10 == 0:\n            print(f'Bloque de acciones procesado: {chunk_number}')\n        action_chunk['assignment_log_id'] = normalize_id(action_chunk['assignment_log_id'])\n        action_chunk['problem_id'] = normalize_id(action_chunk['problem_id'])\n        action_chunk = action_chunk[action_chunk['assignment_log_id'].isin(in_unit_ids)]\n        if action_chunk.empty:\n            continue\n        # Estos campos describen el problema de práctica y suelen ser constantes por problem_id.\n        constant_fields = [\n            'max_attempts', 'available_core_tutoring', 'score_viewable',\n            'continuous_score_viewable'\n        ]\n        for col in constant_fields:\n            action_chunk[col] = action_chunk.groupby('problem_id')[col].transform('first')\n        joined = action_map.merge(\n            action_chunk.rename(columns={'problem_id': 'in_unit_problem_id'}),\n            left_on='in_unit_assignment_log_id', right_on='assignment_log_id', how='inner'\n        )\n        if joined.empty:\n            continue\n        group_keys = ['unit_test_assignment_log_id', 'problem_id']\n\n        for raw_col, prefix, allowed in [\n            ('action', 'action', action_categories),\n            ('available_core_tutoring', 'available_core_tutoring', tutoring_categories)\n        ]:\n            value = normalize_category(joined[raw_col])\n            value = value.where(value.isin(allowed), 'other')\n            long = joined[group_keys].copy()\n            long['feature'] = prefix + '_' + value\n            wide = long.groupby(group_keys + ['feature']).size().unstack(fill_value=0)\n            action_parts.append(wide.astype('uint32'))\n\n        for col in mode_parts:\n            value = pd.to_numeric(joined[col], errors='coerce').fillna(-1)\n            mode_frame = joined[group_keys].copy()\n            mode_frame[col] = value\n            counts = mode_frame.groupby(group_keys + [col]).size().rename('n').reset_index()\n            mode_parts[col].append(counts)\n\n    if action_parts:\n        action_features = pd.concat(action_parts).groupby(level=[0, 1]).sum().reset_index()\n    else:\n        action_features = pd.DataFrame(columns=['unit_test_assignment_log_id', 'problem_id'])\n\n    mode_features = None\n    for col, parts in mode_parts.items():\n        if not parts:\n            continue\n        counts = pd.concat(parts, ignore_index=True).groupby(\n            ['unit_test_assignment_log_id', 'problem_id', col], as_index=False\n        )['n'].sum()\n        counts = counts.sort_values(['n', col]).drop_duplicates(\n            ['unit_test_assignment_log_id', 'problem_id'], keep='last'\n        )[['unit_test_assignment_log_id', 'problem_id', col]]\n        mode_features = counts if mode_features is None else mode_features.merge(\n            counts, on=['unit_test_assignment_log_id', 'problem_id'], how='outer'\n        )\n    if mode_features is None:\n        mode_features = pd.DataFrame(columns=[\n            'unit_test_assignment_log_id', 'problem_id', 'max_attempts',\n            'score_viewable', 'continuous_score_viewable'\n        ])\n\n    # Tabla base: una fila por resultado final y problema\n    dataset = targets[target_columns].drop_duplicates(\n        ['unit_test_assignment_log_id', 'problem_id', 'source_split']\n    ).copy()\n    dataset = dataset.merge(action_features, on=['unit_test_assignment_log_id', 'problem_id'], how='left')\n    dataset = dataset.merge(mode_features, on=['unit_test_assignment_log_id', 'problem_id'], how='left')\n    dataset = dataset.merge(assignment_stats[['unit_test_assignment_log_id', 'notfinish_percent']],\n                            on='unit_test_assignment_log_id', how='left')\n\n    # Variables de secuencia: niveles de ruta curricular 1 a 4\n    sequence_fields = [\n        'sequence_folder_path_level_1', 'sequence_folder_path_level_2',\n        'sequence_folder_path_level_3', 'sequence_folder_path_level_4'\n    ]\n    sequence_header = pd.read_csv(sequence_path, nrows=0).columns.tolist()\n    missing_sequence = set(['sequence_id'] + sequence_fields) - set(sequence_header)\n    if missing_sequence:\n        raise ValueError(f'sequence_details.csv: faltan columnas {sorted(missing_sequence)}')\n    sequence_ids = set(assignment_details['sequence_id'].dropna())\n    sequence_details = read_filtered_csv(\n        sequence_path, ['sequence_id'] + sequence_fields, 'sequence_id', sequence_ids\n    )\n    sequence_details['sequence_id'] = normalize_id(sequence_details['sequence_id'])\n    target_sequence = dataset[['unit_test_assignment_log_id']].drop_duplicates().merge(\n        assignment_details[['assignment_log_id', 'sequence_id']],\n        left_on='unit_test_assignment_log_id', right_on='assignment_log_id', how='left'\n    )\n    dataset = dataset.merge(\n        target_sequence[['unit_test_assignment_log_id', 'sequence_id']],\n        on='unit_test_assignment_log_id', how='left'\n    ).merge(sequence_details, on='sequence_id', how='left')\n    for col in sequence_fields:\n        dataset[col] = clean_text(dataset[col]).replace('', 'na').fillna('na')\n    sequence_dummies = pd.get_dummies(\n        dataset[sequence_fields], prefix=sequence_fields, dtype=np.uint8\n    )\n    dataset = pd.concat([dataset.drop(columns=sequence_fields + ['sequence_id']), sequence_dummies], axis=1)\n\n    # Variables del problema final: categorías, código de habilidad y vector de texto ya provisto\n    problem_fields = [\n        'problem_id', 'problem_type', 'problem_multipart_position', 'problem_skill_code',\n        'problem_skill_description', 'problem_multipart_id', 'problem_text_bert_pca'\n    ]\n    problem_header = pd.read_csv(problem_path, nrows=0).columns.tolist()\n    missing_problem = set(problem_fields) - set(problem_header)\n    if missing_problem:\n        raise ValueError(f'problem_details.csv: faltan columnas {sorted(missing_problem)}')\n    problem_ids = set(dataset['problem_id'].dropna())\n    problem_details = read_filtered_csv(problem_path, problem_fields, 'problem_id', problem_ids)\n    problem_details['problem_id'] = normalize_id(problem_details['problem_id'])\n    problem_details = problem_details.drop_duplicates('problem_id', keep='first')\n    dataset = dataset.merge(problem_details, on='problem_id', how='left')\n\n    skill_parts = dataset['problem_skill_code'].fillna('NA').astype('string').str.split('.', n=3, expand=True)\n    skill_parts = skill_parts.reindex(columns=range(4))\n    skill_parts.columns = ['skill_code1', 'skill_code2', 'skill_code3', 'skill_code4']\n    dataset = pd.concat([dataset, skill_parts], axis=1)\n\n    problem_categories = [\n        'problem_type', 'problem_multipart_position', 'skill_code1', 'skill_code2',\n        'skill_code3', 'skill_code4', 'problem_skill_description'\n    ]\n    for col in problem_categories:\n        dataset[col] = clean_text(dataset[col]).replace('', 'na').fillna('na')\n    problem_dummies = pd.get_dummies(\n        dataset[problem_categories], prefix=problem_categories, dtype=np.uint8\n    )\n\n    def parse_bert_vector(value, width=32):\n        result = np.full(width, np.nan, dtype=np.float32)\n        if pd.isna(value):\n            return result\n        numbers = re.findall(r'[-+]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?', str(value))\n        try:\n            parsed = np.asarray([float(x) for x in numbers[:width]], dtype=np.float32)\n        except ValueError:\n            return result\n        result[:len(parsed)] = parsed\n        return result\n\n    bert_matrix = np.vstack(dataset['problem_text_bert_pca'].map(parse_bert_vector).to_numpy())\n    bert_columns = [f'problem_text_bert_pca_{i}' for i in range(bert_matrix.shape[1])]\n    bert_features = pd.DataFrame(bert_matrix, columns=bert_columns, index=dataset.index)\n    multipart_frequency = dataset['problem_multipart_id'].value_counts(dropna=False)\n    dataset['multipart_id_frequency'] = dataset['problem_multipart_id'].map(multipart_frequency).fillna(0)\n\n    raw_problem_columns = list(dict.fromkeys(\n        problem_fields[1:] + problem_categories[1:] + ['problem_multipart_id']\n    ))\n    dataset = pd.concat([\n        dataset.drop(columns=raw_problem_columns, errors='ignore'),\n        problem_dummies,\n        bert_features\n    ], axis=1)\n\n    # Tratamiento final: contadores de acción en 0; faltantes de otras variables en -1.\n    action_feature_columns = [c for c in dataset.columns if c.startswith('action_') or\n                              c.startswith('available_core_tutoring_')]\n    dataset[action_feature_columns] = dataset[action_feature_columns].fillna(0)\n    dataset = dataset.replace([np.inf, -np.inf], np.nan)\n    feature_columns = [c for c in dataset.columns if c not in {\n        'unit_test_assignment_log_id', 'problem_id', 'student_id', 'source_split', 'score'\n    }]\n    dataset[feature_columns] = dataset[feature_columns].apply(pd.to_numeric, errors='coerce')\n    dataset[feature_columns] = dataset[feature_columns].fillna(-1).astype('float32')\n    dataset['score'] = pd.to_numeric(dataset['score'], errors='coerce').astype('float32')\n\n    # Guardado nuevo: gzip ahorra espacio y deja un único CSV de referencia.\n    if dataset.empty:\n        raise ValueError('La tabla final quedó vacía; revisa que los CSV oficiales correspondan al EDM Cup 2023.')\n    dataset.to_csv(CANONICAL_CSV, index=False, compression='gzip')\n    size_mb = CANONICAL_CSV.stat().st_size / (1024 ** 2)\n    print(f'CSV único creado: {CANONICAL_CSV}')\n    print(f'Filas: {len(dataset):,} | estudiantes: {dataset.student_id.nunique():,} | columnas: {dataset.shape[1]:,}')\n    print(f'Tamaño comprimido: {size_mb:.1f} MB')\n    del train_scores, eval_scores, targets, target_rel, relationships, action_parts, mode_parts\n    gc.collect()",
        "lineCount": 336,
        "steps": [
          {
            "start": 1,
            "title": "Evitar sobrescritura",
            "text": "Si ya existe el CSV, el cuaderno lo reutiliza para no reemplazar una corrida previa.",
            "end": 5
          },
          {
            "start": 6,
            "title": "Leer puntajes y elegir estudiantes",
            "text": "Carga train y evaluation; obtiene IDs de estudiantes y selecciona una muestra reproducible con SEED.",
            "end": 41
          },
          {
            "start": 42,
            "title": "Formar objetivos finales",
            "text": "Une etiquetas y datos de estudiante, elimina duplicados por evaluación, problema y partición; intenta completar score de evaluation cuando el archivo oficial está disponible.",
            "end": 101
          },
          {
            "start": 102,
            "title": "Relacionar prácticas previas",
            "text": "Une cada evaluación final con asignaciones relacionadas y resume cuántas prácticas finalizaron o quedaron pendientes.",
            "end": 123
          },
          {
            "start": 124,
            "title": "Agregar interacciones",
            "text": "Procesa action_logs en fragmentos y cuenta acciones y tipos de tutoría por evaluación final y problema.",
            "end": 219
          },
          {
            "start": 220,
            "title": "Construir la tabla analítica",
            "text": "Integra objetivo, conteos de acciones, porcentaje sin finalizar, secuencia curricular y variables del problema.",
            "end": 314
          },
          {
            "start": 315,
            "title": "Convertir a predictores numéricos",
            "text": "Rellena conteos de actividad ausente con 0; otros faltantes o valores inválidos con -1; convierte predictores a float32.",
            "end": 326
          },
          {
            "start": 327,
            "title": "Guardar la salida",
            "text": "Escribe un único archivo CSV comprimido y reporta filas, estudiantes, columnas y tamaño.",
            "end": 336
          }
        ],
        "outputMode": "prep-build",
        "output": "La salida ya verificada en el proyecto contiene 51 042 filas, 3 000 estudiantes y 727 columnas: score, cuatro campos de rastreo y 722 predictores."
      },
      {
        "sourceCell": 8,
        "title": "Comprobar columnas y filas",
        "explanation": "Vuelve a abrir una pequeña muestra, informa el número total de columnas y muestra primero los campos de etiqueta/trazabilidad y luego predictores.",
        "source": "if not CANONICAL_CSV.exists():\n    raise FileNotFoundError(f'No se generó el CSV esperado: {CANONICAL_CSV}')\npreview = pd.read_csv(CANONICAL_CSV, nrows=5, low_memory=False)\nprint(f'Columnas: {len(pd.read_csv(CANONICAL_CSV, nrows=0).columns):,}')\nprint('Variables de rastreo, partición y etiqueta:')\ndisplay(preview[['student_id', 'unit_test_assignment_log_id', 'problem_id', 'source_split', 'score']])\nprint('Primeras variables predictoras:')\nfeature_preview = [c for c in preview.columns if c not in {\n    'student_id', 'unit_test_assignment_log_id', 'problem_id', 'source_split', 'score'\n}][:8]\ndisplay(preview[feature_preview])",
        "lineCount": 11,
        "steps": [
          {
            "start": 1,
            "title": "Comprobar que se generó",
            "text": "Detiene la verificación si la salida esperada no está en la ruta configurada.",
            "end": 2
          },
          {
            "start": 3,
            "title": "Leer una vista previa",
            "text": "Lee sólo cinco registros para inspeccionar la forma de salida sin cargar nuevamente el archivo entero.",
            "end": 5
          },
          {
            "start": 6,
            "title": "Mostrar etiqueta y rastreo",
            "text": "Enseña IDs, partición y score; estos campos ayudan a interpretar filas, pero IDs y partición no entran en X.",
            "end": 7
          },
          {
            "start": 8,
            "title": "Mostrar predictores",
            "text": "Selecciona algunas columnas predictoras para comparar la estructura cruda con la tabla lista para el modelo.",
            "end": 11
          }
        ],
        "outputMode": "prep-check",
        "output": "Referencia del archivo preparado: 727 columnas totales; 722 predictores después de excluir score, student_id, source_split, unit_test_assignment_log_id y problem_id."
      }
    ]
  },
  {
    "id": "rf",
    "title": "ASSISTments: predicción con Random Forest",
    "file": "ASSISTments_RF_Colab_ES.ipynb",
    "source": "../../ASSISTments_RF_Colab_ES.ipynb",
    "purpose": "Lee el CSV ya preparado, entrena el Random Forest de la práctica, calcula métricas y gráficos y demuestra predicciones. No vuelve a integrar archivos crudos.",
    "cells": [
      {
        "sourceCell": 2,
        "title": "Cargar y revisar el CSV preparado",
        "explanation": "Solicita el archivo comprimido, verifica las columnas mínimas, informa el tamaño, cuenta particiones y clases y dibuja la distribución de score.",
        "source": "from pathlib import Path\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nfrom IPython.display import display\nfrom google.colab import files\n\n\nSEED = 42\nN_ESTIMATORS = 600  # Valor usado por el artículo.\nprint('Selecciona el CSV único preparado: assistments_rf_dataset.csv.gz')\nuploaded = files.upload()\nif len(uploaded) != 1:\n    raise ValueError('Sube exactamente un archivo: assistments_rf_dataset.csv.gz')\nuploaded_name = next(iter(uploaded))\nif not uploaded_name.endswith('.csv.gz'):\n    raise ValueError('El archivo debe ser un CSV comprimido con extensión .csv.gz')\nDATASET_CSV = Path('/content') / uploaded_name\ndf = pd.read_csv(DATASET_CSV, low_memory=False)\nrequired = {'score', 'student_id', 'source_split', 'unit_test_assignment_log_id', 'problem_id'}\nmissing = required - set(df.columns)\nif missing:\n    raise ValueError(f'Faltan columnas requeridas en el CSV: {sorted(missing)}')\n\nprint(f'CSV cargado: {DATASET_CSV.name}')\nprint(f'{len(df):,} filas | {df.student_id.nunique():,} estudiantes | {df.shape[1]:,} columnas')\ndisplay(df['source_split'].value_counts(dropna=False).rename_axis('partición').to_frame('filas'))\ndisplay(df['score'].value_counts(dropna=False).sort_index().rename_axis('score').to_frame('filas'))\n\nplt.figure(figsize=(6, 4))\nsns.countplot(data=df[df['score'].notna()], x='score', color='#4C78A8')\nplt.title('Distribución del resultado real')\nplt.xlabel('score: 0 = no exitoso, 1 = exitoso')\nplt.ylabel('Cantidad de problemas')\nplt.tight_layout()\nplt.show()",
        "lineCount": 37,
        "steps": [
          {
            "start": 1,
            "title": "Importar herramientas",
            "text": "Importa pandas, NumPy y bibliotecas de gráficos y lectura de archivos de Colab.",
            "end": 9
          },
          {
            "start": 10,
            "title": "Fijar corrida y seleccionar archivo",
            "text": "Conserva la semilla y cantidad de árboles; valida que se suba exactamente el CSV comprimido esperado.",
            "end": 19
          },
          {
            "start": 20,
            "title": "Cargar y validar esquema",
            "text": "Lee la tabla preparada y verifica etiqueta e identificadores necesarios para rastreo y partición.",
            "end": 25
          },
          {
            "start": 26,
            "title": "Revisar tamaño y clases",
            "text": "Resume filas, estudiantes, columnas, tamaños de train/evaluation y frecuencias de score.",
            "end": 30
          },
          {
            "start": 31,
            "title": "Graficar distribución",
            "text": "Compara cuántos resultados pertenecen a score=0 y score=1 antes de entrenar.",
            "end": 37
          }
        ],
        "outputMode": "rf-load",
        "output": "Referencia del CSV del proyecto: 51 042 filas, 3 000 estudiantes y 727 columnas. Distribución: 39 935 filas train, 11 107 evaluation; score=0: 21 185 y score=1: 29 857."
      },
      {
        "sourceCell": 4,
        "title": "Definir X, y, partición y modelo",
        "explanation": "Excluye la etiqueta e identificadores, limpia el tipo numérico, usa las particiones oficiales cuando existen y entrena el Random Forest; luego calcula las métricas.",
        "source": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import GroupShuffleSplit\nfrom sklearn.metrics import (\n    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,\n    confusion_matrix, ConfusionMatrixDisplay, roc_curve\n)\n\nid_columns = {\n    'score', 'student_id', 'source_split',\n    'unit_test_assignment_log_id', 'problem_id'\n}\nfeature_columns = [column for column in df.columns if column not in id_columns]\nif not feature_columns:\n    raise ValueError('El CSV no contiene variables predictoras.')\n\n# Solo se convierten a números las columnas que ya vienen preparadas en el CSV.\nX = df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')\ny = pd.to_numeric(df['score'], errors='coerce')\nlabeled = y.notna() & y.isin([0, 1])\ndf = df.loc[labeled].reset_index(drop=True)\nX = X.loc[labeled].reset_index(drop=True)\ny = y.loc[labeled].astype('int8').reset_index(drop=True)\nif df.empty:\n    raise ValueError('No hay etiquetas score válidas (0 o 1) en el CSV.')\n\ntrain_mask = df['source_split'].eq('train')\neval_mask = df['source_split'].eq('evaluation')\nif eval_mask.any() and train_mask.any():\n    train_idx = np.flatnonzero(train_mask.to_numpy())\n    test_idx = np.flatnonzero(eval_mask.to_numpy())\n    evaluation_name = 'Partición evaluation del CSV'\nelse:\n    train_labeled_idx = np.flatnonzero(train_mask.to_numpy())\n    groups = df.loc[train_labeled_idx, 'student_id'].astype('string').to_numpy()\n    if len(np.unique(groups)) < 2:\n        raise ValueError('Se necesitan al menos dos estudiantes etiquetados para validar.')\n    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=SEED)\n    relative_train, relative_test = next(splitter.split(\n        X.iloc[train_labeled_idx], y.iloc[train_labeled_idx], groups=groups\n    ))\n    train_idx = train_labeled_idx[relative_train]\n    test_idx = train_labeled_idx[relative_test]\n    evaluation_name = 'Validación interna por estudiante (80/20)'\n\nX_train = X.iloc[train_idx]\nX_test = X.iloc[test_idx]\ny_train = y.iloc[train_idx].to_numpy()\ny_test = y.iloc[test_idx].to_numpy()\nif len(np.unique(y_train)) < 2:\n    raise ValueError('El entrenamiento quedó con una sola clase. Aumenta MAX_STUDENTS en preparación.')\nif len(test_idx) == 0:\n    raise ValueError('La partición de evaluación está vacía.')\n\nrf = RandomForestClassifier(\n    n_estimators=N_ESTIMATORS,\n    max_depth=19,\n    min_samples_split=10,\n    min_samples_leaf=2,\n    max_features='sqrt',\n    bootstrap=True,\n    random_state=SEED,\n    n_jobs=-1\n)\nrf.fit(X_train, y_train)\ny_pred = rf.predict(X_test)\nprobabilities = rf.predict_proba(X_test)\nclass_index = {int(label): index for index, label in enumerate(rf.classes_)}\ny_prob_success = probabilities[:, class_index[1]]\ny_prob_non_success = probabilities[:, class_index[0]]\ny_non_success = (y_test == 0).astype('int8')\n\nmetrics = {\n    'Evaluación': evaluation_name,\n    'Filas entrenamiento': len(train_idx),\n    'Filas evaluación': len(test_idx),\n    'Accuracy': accuracy_score(y_test, y_pred),\n    'Precision (score=1)': precision_score(y_test, y_pred, pos_label=1, zero_division=0),\n    'Recall (score=1)': recall_score(y_test, y_pred, pos_label=1, zero_division=0),\n    'F1 (score=1)': f1_score(y_test, y_pred, pos_label=1, zero_division=0),\n    'Precision macro': precision_score(y_test, y_pred, average='macro', zero_division=0),\n    'Recall macro': recall_score(y_test, y_pred, average='macro', zero_division=0),\n    'F1 macro': f1_score(y_test, y_pred, average='macro', zero_division=0),\n    'Recall score=0': recall_score(y_test, y_pred, pos_label=0, zero_division=0),\n    'ROC AUC (score=0)': (\n        roc_auc_score(y_non_success, y_prob_non_success)\n        if len(np.unique(y_non_success)) == 2 else np.nan\n    )\n}\nprint('Algoritmo aplicado: Random Forest')\ndisplay(pd.DataFrame([metrics]).round(4))\nprint('Hiperparámetros aplicados:')\nparameters_used = {\n    'n_estimators': rf.n_estimators,\n    'max_depth': rf.max_depth,\n    'min_samples_split': rf.min_samples_split,\n    'min_samples_leaf': rf.min_samples_leaf,\n    'max_features': rf.max_features,\n    'bootstrap': rf.bootstrap,\n    'random_state': rf.random_state,\n    'n_jobs': rf.n_jobs\n}\ndisplay(pd.Series(parameters_used, name='valor').to_frame())",
        "lineCount": 102,
        "steps": [
          {
            "start": 1,
            "title": "Importar modelo y métricas",
            "text": "Carga Random Forest, la partición agrupada de respaldo y métricas de clasificación.",
            "end": 7
          },
          {
            "start": 8,
            "title": "Separar predictores y rastreo",
            "text": "Excluye score, student_id, source_split, unit_test_assignment_log_id y problem_id de X.",
            "end": 16
          },
          {
            "start": 17,
            "title": "Preparar X e y",
            "text": "Convierte las 722 variables preparadas a números float32. y toma score y conserva etiquetas 0/1 válidas.",
            "end": 25
          },
          {
            "start": 26,
            "title": "Elegir la evaluación",
            "text": "Si existe la partición oficial, utiliza train/evaluation. Sólo si falta, divide train por student_id con GroupShuffleSplit 80/20.",
            "end": 53
          },
          {
            "start": 54,
            "title": "Configurar el RF",
            "text": "Fija 600 árboles, profundidad 19, split 10, hoja 2, sqrt, bootstrap, semilla 42 y todos los núcleos disponibles.",
            "end": 63
          },
          {
            "start": 64,
            "title": "Ajustar y predecir",
            "text": "Aprende sólo con train; genera etiqueta y probabilidades para el conjunto reservado.",
            "end": 71
          },
          {
            "start": 72,
            "title": "Calcular métricas",
            "text": "Calcula accuracy, precisión, recall y F1; destaca recall de score=0 y calcula ROC-AUC usando probabilidades.",
            "end": 91
          },
          {
            "start": 92,
            "title": "Registrar configuración",
            "text": "Muestra los hiperparámetros aplicados en esta ejecución para que la corrida pueda describirse.",
            "end": 102
          }
        ],
        "outputMode": "rf-metrics",
        "output": "Referencia de la partición evaluation para el RF base: accuracy=0,7022; recall score=0=0,5570; F1 macro=0,6828; ROC-AUC score=0=0,7528."
      },
      {
        "sourceCell": 6,
        "title": "Graficar resultados y variables importantes",
        "explanation": "Construye el gráfico de métricas, matriz de confusión, curva ROC de score=0 y ranking de las 15 variables con mayor importancia.",
        "source": "performance = {\n    'Accuracy': metrics['Accuracy'],\n    'Precision macro': metrics['Precision macro'],\n    'Recall macro': metrics['Recall macro'],\n    'F1 macro': metrics['F1 macro'],\n    'Recall score=0': metrics['Recall score=0']\n}\nfig, ax = plt.subplots(figsize=(9, 4.5))\nmetric_names = list(performance.keys())\nmetric_values = list(performance.values())\nbars = ax.bar(metric_names, metric_values, color='#4C78A8')\nax.bar_label(bars, fmt='%.3f', padding=3)\nax.set_ylim(0, 1.08)\nax.set_ylabel('Valor (0 a 1)')\nax.set_title('Resumen de rendimiento de Random Forest')\nax.tick_params(axis='x', rotation=15)\nax.grid(axis='y', alpha=0.3)\nax.set_axisbelow(True)\nplt.tight_layout()\nplt.show()\n\nfig, axes = plt.subplots(1, 2, figsize=(12, 4.5))\ncm = confusion_matrix(y_test, y_pred, labels=[0, 1])\nConfusionMatrixDisplay(\n    confusion_matrix=cm,\n    display_labels=['No exitoso (0)', 'Exitoso (1)']\n).plot(ax=axes[0], colorbar=False, cmap='Blues', values_format='d')\naxes[0].set_title('Matriz de confusión')\n\nif len(np.unique(y_non_success)) == 2:\n    fpr, tpr, _ = roc_curve(y_non_success, y_prob_non_success)\n    auc_risk = metrics['ROC AUC (score=0)']\n    axes[1].plot(fpr, tpr, color='#F58518', label=f'AUC = {auc_risk:.3f}')\n    axes[1].plot([0, 1], [0, 1], linestyle='--', color='gray')\n    axes[1].set_xlim(0, 1)\n    axes[1].set_ylim(0, 1.02)\n    axes[1].set_xlabel('Tasa de falsos positivos')\n    axes[1].set_ylabel('Tasa de verdaderos positivos')\n    axes[1].legend(loc='lower right')\n    axes[1].set_title('Curva ROC: clase no exitosa (score=0)')\nelse:\n    axes[1].text(0.5, 0.5, 'ROC no definida: la evaluación tiene una sola clase.',\n                 ha='center', va='center', wrap=True)\n    axes[1].set_axis_off()\nplt.tight_layout()\nplt.show()\n\nimportance = pd.Series(rf.feature_importances_, index=feature_columns).sort_values(ascending=False)\ntop_features = importance.head(15).sort_values()\nplt.figure(figsize=(9, 6))\ntop_features.plot(kind='barh', color='#54A24B')\nplt.title('15 variables más importantes en Random Forest')\nplt.xlabel('Importancia relativa')\nplt.ylabel('Variable')\nplt.tight_layout()\nplt.show()",
        "lineCount": 56,
        "steps": [
          {
            "start": 1,
            "title": "Preparar gráfico de métricas",
            "text": "Selecciona las métricas que se mostrarán entre 0 y 1; ayuda a contrastar reconocimiento de score=0 y score=1.",
            "end": 21
          },
          {
            "start": 22,
            "title": "Dibujar matriz y ROC",
            "text": "La matriz muestra aciertos y errores por clase. La curva ROC cambia el umbral y compara verdaderos positivos con falsos positivos.",
            "end": 47
          },
          {
            "start": 48,
            "title": "Ordenar importancia",
            "text": "Lee la importancia interna del RF y muestra las 15 variables de mayor valor. Importancia no demuestra causalidad.",
            "end": 56
          }
        ],
        "outputMode": "rf-plots",
        "output": "Referencia visual: matriz evaluation = [[2 526, 2 009], [1 299, 5 273]]. La ROC se calcula para no éxito (score=0). La celda también grafica las variables principales."
      },
      {
        "sourceCell": 9,
        "title": "Demostrar inferencia con filas reservadas",
        "explanation": "Construye una demostración de hasta diez registros: deja score fuera de X, genera clase y probabilidades por clase y guarda un CSV de salida.",
        "source": "# Demostración automática de inferencia en 10 filas reservadas.\n# score no forma parte de demo_X ni se entrega a predict().\ndemo_n = min(10, len(test_idx))\ndemo_positions = test_idx[:demo_n]\ndemo_X = X.iloc[demo_positions].copy()\ndemo_predictions = rf.predict(demo_X)\ndemo_probabilities = rf.predict_proba(demo_X)\n\ndemo_id_columns = [c for c in [\n    'student_id', 'unit_test_assignment_log_id', 'problem_id'\n] if c in df.columns]\ndemo_output = df.iloc[demo_positions][demo_id_columns].reset_index(drop=True)\ndemo_output['score_predicho'] = demo_predictions.astype('int8')\ndemo_output['probabilidad_score_0'] = demo_probabilities[:, class_index[0]]\ndemo_output['probabilidad_score_1'] = demo_probabilities[:, class_index[1]]\ndemo_output['probabilidad_score_0'] = demo_output['probabilidad_score_0'].round(4)\ndemo_output['probabilidad_score_1'] = demo_output['probabilidad_score_1'].round(4)\nprint('Demostración: predicciones sobre filas reservadas; la etiqueta real se ocultó al predictor.')\ndisplay(demo_output)\ndemo_output_path = '/content/predicciones_demo_assistments.csv'\ndemo_output.to_csv(demo_output_path, index=False)\nprint(f'Archivo de salida guardado en: {demo_output_path}')",
        "lineCount": 22,
        "steps": [
          {
            "start": 3,
            "title": "Seleccionar hasta diez registros",
            "text": "Escoge algunas posiciones reservadas sin pasar la etiqueta real al predictor.",
            "end": 5
          },
          {
            "start": 6,
            "title": "Generar clase y probabilidades",
            "text": "predict entrega la clase; predict_proba entrega probabilidades score=0 y score=1.",
            "end": 17
          },
          {
            "start": 18,
            "title": "Guardar la demostración",
            "text": "La salida del notebook muestra IDs de rastreo, score_predicho y dos probabilidades; se guarda como CSV.",
            "end": 22
          }
        ],
        "outputMode": "rf-inference",
        "output": "La tabla real se genera al ejecutar el notebook. Esta guía muestra el esquema de columnas esperado; no inventa predicciones individuales."
      },
      {
        "sourceCell": 11,
        "title": "Predicción opcional de un CSV nuevo",
        "explanation": "La celda está desactivada por defecto. Al activarla, pide un CSV ya transformado, verifica que estén todas las variables de X e ignora score al predecir.",
        "source": "EJECUTAR_PREDICCION_REAL = False  # Cambia a True solo cuando tengas un CSV nuevo sin score.\n\nif not EJECUTAR_PREDICCION_REAL:\n    print('Modo demostración. Para datos realmente nuevos, cambia EJECUTAR_PREDICCION_REAL a True y ejecuta esta celda.')\nelse:\n    nuevos_archivos = files.upload()\n    if len(nuevos_archivos) != 1:\n        raise ValueError('Sube exactamente un archivo CSV o CSV comprimido con .gz.')\n    nombre_nuevo = next(iter(nuevos_archivos))\n    if not (nombre_nuevo.lower().endswith('.csv') or nombre_nuevo.lower().endswith('.csv.gz')):\n        raise ValueError('El archivo debe terminar en .csv o .csv.gz.')\n    ruta_nueva = Path('/content') / Path(nombre_nuevo).name\n    ruta_nueva.write_bytes(nuevos_archivos[nombre_nuevo])\n    nuevos_df = pd.read_csv(ruta_nueva, low_memory=False)\n    if nuevos_df.empty:\n        raise ValueError('El archivo nuevo no contiene filas.')\n    columnas_faltantes = sorted(set(feature_columns) - set(nuevos_df.columns))\n    if columnas_faltantes:\n        raise ValueError(f'Faltan {len(columnas_faltantes)} variables predictoras. Ejemplos: {columnas_faltantes[:10]}')\n    if 'score' in nuevos_df.columns and nuevos_df['score'].notna().any():\n        print('Aviso: el archivo contiene score; se ignorará y no se usará para predecir.')\n    X_nuevo = nuevos_df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')\n    pred_nuevas = rf.predict(X_nuevo)\n    prob_nuevas = rf.predict_proba(X_nuevo)\n    columnas_id_nuevas = [c for c in ['student_id', 'unit_test_assignment_log_id', 'problem_id'] if c in nuevos_df.columns]\n    salida_nuevos = nuevos_df[columnas_id_nuevas].copy().reset_index(drop=True)\n    salida_nuevos['score_predicho'] = pred_nuevas.astype('int8')\n    salida_nuevos['probabilidad_score_0'] = prob_nuevas[:, class_index[0]].round(4)\n    salida_nuevos['probabilidad_score_1'] = prob_nuevas[:, class_index[1]].round(4)\n    print(f'Predicciones generadas: {len(salida_nuevos):,} filas')\n    display(salida_nuevos.head(20))\n    archivo_salida = '/content/predicciones_nuevos_datos.csv'\n    salida_nuevos.to_csv(archivo_salida, index=False)\n    print(f'Archivo completo guardado en: {archivo_salida}')",
        "lineCount": 34,
        "steps": [
          {
            "start": 1,
            "title": "Mantener desactivada por defecto",
            "text": "Evita abrir un selector durante “Ejecutar todo”. Para datos nuevos se cambia explícitamente a True.",
            "end": 5
          },
          {
            "start": 6,
            "title": "Cargar y validar un archivo nuevo",
            "text": "Comprueba formato, filas y columnas requeridas; no transforma CSV crudo.",
            "end": 21
          },
          {
            "start": 22,
            "title": "Predecir y guardar salida",
            "text": "Usa el mismo esquema de 722 columnas y exporta clase y probabilidades.",
            "end": 34
          }
        ],
        "outputMode": "rf-new",
        "output": "Como está configurada por defecto, imprime el aviso de modo demostración. Para usarla con datos reales se requiere una tabla previamente transformada con las mismas variables."
      }
    ]
  },
  {
    "id": "comparison",
    "title": "Comparación de Random Forest y Extra Trees",
    "file": "ASSISTments_Comparacion_RF_ExtraTrees.ipynb",
    "source": "../../ASSISTments_Comparacion_RF_ExtraTrees.ipynb",
    "purpose": "Compara las tres corridas con el mismo CSV, X, y y particiones; informa métricas completas, brechas train/evaluation, curvas ROC y matrices de confusión.",
    "cells": [
      {
        "sourceCell": 2,
        "title": "Cargar y revisar los datos",
        "explanation": "Abre el CSV preparado desde la ruta del proyecto o permite subirlo en Colab; valida columnas y muestra distribución de particiones y etiquetas.",
        "source": "from pathlib import Path\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nfrom IPython.display import display\n\n# En Colab, sube el CSV procesado si no está en la ruta configurada.\n# En Jupyter local se usa la ruta del proyecto.\nDATASET_CSV = Path('EDMCup2023_fuente_oficial/salida/assistments_rf_dataset.csv.gz')\nif not DATASET_CSV.exists():\n    try:\n        from google.colab import files\n        uploaded = files.upload()\n        if len(uploaded) != 1:\n            raise ValueError('Sube exactamente un archivo CSV comprimido.')\n        uploaded_name = next(iter(uploaded))\n        DATASET_CSV = Path('/content') / uploaded_name\n    except ImportError as exc:\n        raise FileNotFoundError(\n            'No se encontró el CSV. Coloca assistments_rf_dataset.csv.gz en la ruta del proyecto.'\n        ) from exc\n\ndf = pd.read_csv(DATASET_CSV, low_memory=False)\nrequired = {\n    'score', 'student_id', 'source_split',\n    'unit_test_assignment_log_id', 'problem_id'\n}\nmissing = required - set(df.columns)\nif missing:\n    raise ValueError(f'Faltan columnas requeridas: {sorted(missing)}')\n\nprint(f'Archivo: {DATASET_CSV.name}')\nprint(f'Filas: {len(df):,} | estudiantes: {df.student_id.nunique():,} | columnas: {df.shape[1]:,}')\ndisplay(df['source_split'].value_counts(dropna=False).rename_axis('partición').to_frame('filas'))\ndisplay(df['score'].value_counts(dropna=False).sort_index().rename_axis('score').to_frame('filas'))",
        "lineCount": 35,
        "steps": [
          {
            "start": 1,
            "title": "Importar herramientas",
            "text": "Carga bibliotecas de datos, gráficas y visualización.",
            "end": 8
          },
          {
            "start": 9,
            "title": "Encontrar la tabla",
            "text": "Primero busca el CSV en el proyecto; si no existe, permite subir un archivo en Colab.",
            "end": 22
          },
          {
            "start": 23,
            "title": "Validar y resumir",
            "text": "Exige etiqueta e identificadores; informa dimensiones, partición y conteos de score.",
            "end": 35
          }
        ],
        "outputMode": "comp-load",
        "output": "Referencia: 51 042 filas, 3 000 estudiantes y 727 columnas; 39 935 registros train y 11 107 evaluation."
      },
      {
        "sourceCell": 4,
        "title": "Definir objetivo, predictores y particiones",
        "explanation": "Crea y a partir de score, X a partir de 722 predictores y preserva la partición oficial; si no está disponible, usa un respaldo agrupado por estudiante.",
        "source": "from sklearn.model_selection import GroupShuffleSplit\n\n# Etiqueta, IDs y partición se conservan en df, pero no son predictores.\nid_columns = {\n    'score', 'student_id', 'source_split',\n    'unit_test_assignment_log_id', 'problem_id'\n}\nfeature_columns = [c for c in df.columns if c not in id_columns]\nif not feature_columns:\n    raise ValueError('El CSV no contiene predictores.')\n\n# Los predictores ya vienen procesados; aquí se asegura el tipo numérico.\nX = df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')\ny = pd.to_numeric(df['score'], errors='coerce')\nvalid = y.notna() & y.isin([0, 1])\ndf = df.loc[valid].reset_index(drop=True)\nX = X.loc[valid].reset_index(drop=True)\ny = y.loc[valid].astype('int8').reset_index(drop=True)\n\ntrain_mask = df['source_split'].eq('train')\neval_mask = df['source_split'].eq('evaluation')\nif train_mask.any() and eval_mask.any():\n    # Se usa la partición oficial; no se vuelve a sortear la evaluación.\n    train_idx = np.flatnonzero(train_mask.to_numpy())\n    test_idx = np.flatnonzero(eval_mask.to_numpy())\n    evaluation_name = 'Partición oficial evaluation'\nelse:\n    # Respaldo: los registros de un mismo estudiante no se dividen entre train/test.\n    train_candidates = np.flatnonzero(train_mask.to_numpy())\n    groups = df.loc[train_candidates, 'student_id'].astype('string').to_numpy()\n    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)\n    relative_train, relative_test = next(\n        splitter.split(X.iloc[train_candidates], y.iloc[train_candidates], groups=groups)\n    )\n    train_idx = train_candidates[relative_train]\n    test_idx = train_candidates[relative_test]\n    evaluation_name = 'Validación interna agrupada por estudiante (80/20)'\n\nX_train, X_test = X.iloc[train_idx], X.iloc[test_idx]\ny_train, y_test = y.iloc[train_idx].to_numpy(), y.iloc[test_idx].to_numpy()\nprint(f'Evaluación: {evaluation_name}')\nprint(f'Predictores: {len(feature_columns)} | train: {len(train_idx):,} | evaluación: {len(test_idx):,}')\ntrain_students = set(df.iloc[train_idx]['student_id'].dropna())\neval_students = set(df.iloc[test_idx]['student_id'].dropna())\noverlap = train_students & eval_students\nshared_eval_rows = df.iloc[test_idx]['student_id'].isin(train_students).sum()\nprint(f'Estudiantes compartidos entre particiones: {len(overlap)}')\nprint(f'Registros de evaluación de estudiantes compartidos: {shared_eval_rows:,}')",
        "lineCount": 48,
        "steps": [
          {
            "start": 1,
            "title": "Preparar división segura de respaldo",
            "text": "Importa GroupShuffleSplit; sólo se utiliza si el CSV no trae ambas particiones oficiales.",
            "end": 3
          },
          {
            "start": 4,
            "title": "Excluir etiqueta y trazabilidad",
            "text": "Mantiene IDs en df para inspección, pero no permite que el modelo los use como predictores.",
            "end": 12
          },
          {
            "start": 13,
            "title": "Construir X e y",
            "text": "Convierte las columnas preparadas a float32, toma score como objetivo y descarta etiquetas inválidas.",
            "end": 19
          },
          {
            "start": 20,
            "title": "Conservar la partición",
            "text": "Usa train/evaluation originales si están disponibles; no vuelve a sortear esos registros.",
            "end": 27
          },
          {
            "start": 28,
            "title": "Agrupar por estudiante si faltara la partición",
            "text": "Evita que una persona aparezca en ambos conjuntos en la validación interna alternativa.",
            "end": 40
          },
          {
            "start": 41,
            "title": "Medir solapamiento",
            "text": "Cuenta estudiantes y filas de evaluation compartidos con train; esta partición tiene 31 estudiantes y 552 filas de evaluación compartidas.",
            "end": 48
          }
        ],
        "outputMode": "comp-split",
        "output": "Evaluación: partición oficial; predictores: 722; train: 39 935; evaluation: 11 107; estudiantes compartidos: 31; filas de evaluation de esos estudiantes: 552."
      },
      {
        "sourceCell": 6,
        "title": "Declarar los tres modelos",
        "explanation": "Construye la línea base, una variante de Random Forest con árboles más restringidos y Extra Trees con parámetros comparables.",
        "source": "from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier\n\nSEED = 42\nN_ESTIMATORS = 600\n\nmodels = {\n    'RF práctica': RandomForestClassifier(\n        n_estimators=N_ESTIMATORS, # cantidad de árboles de la práctica\n        max_depth=19,              # profundidad máxima de la práctica\n        min_samples_split=10,      # mínimo de datos para dividir un nodo\n        min_samples_leaf=2,        # mínimo de datos en una hoja\n        max_features='sqrt',       # candidatos por división: raíz del número de predictores\n        bootstrap=True,            # cada árbol usa una muestra con reemplazo\n        random_state=SEED,         # hace reproducible el ajuste\n        n_jobs=-1                  # usa todos los núcleos disponibles\n    ),\n    'RF parámetros modificados': RandomForestClassifier(\n        n_estimators=N_ESTIMATORS, # cantidad de árboles controlada\n        max_depth=12,              # limita la complejidad de cada árbol\n        min_samples_split=20,      # exige más datos antes de dividir\n        min_samples_leaf=5,        # evita hojas con muy pocos registros\n        max_features='sqrt',       # conserva la selección de predictores\n        bootstrap=True,\n        random_state=SEED,\n        n_jobs=-1\n    ),\n    'Extra Trees': ExtraTreesClassifier(\n        n_estimators=N_ESTIMATORS,\n        max_depth=19,\n        min_samples_split=10,\n        min_samples_leaf=2,\n        max_features='sqrt',\n        bootstrap=True,            # iguala el muestreo con el RF base\n        random_state=SEED,\n        n_jobs=-1\n    )\n}\n\nparameter_table = pd.DataFrame({name: model.get_params() for name, model in models.items()})\ndisplay(parameter_table.loc[\n    ['n_estimators','max_depth','min_samples_split','min_samples_leaf',\n     'max_features','bootstrap','random_state','n_jobs']\n].T)",
        "lineCount": 43,
        "steps": [
          {
            "start": 1,
            "title": "Importar algoritmos",
            "text": "RandomForestClassifier crea el RF; ExtraTreesClassifier agrega aleatoriedad en los umbrales de división.",
            "end": 2
          },
          {
            "start": 3,
            "title": "Fijar controles comunes",
            "text": "Las tres corridas usan 600 estimadores y semilla 42 para comparar con una configuración reproducible.",
            "end": 6
          },
          {
            "start": 7,
            "title": "Reproducir la práctica",
            "text": "Base: profundidad 19, split 10, leaf 2, sqrt y bootstrap.",
            "end": 16
          },
          {
            "start": 17,
            "title": "Limitar complejidad en la variante",
            "text": "Cambia profundidad a 12, split a 20 y leaf a 5; los parámetros no se presentan como óptimos.",
            "end": 26
          },
          {
            "start": 27,
            "title": "Comparar otro algoritmo",
            "text": "Conserva límites base y muestra qué aporta la aleatoriedad de Extra Trees.",
            "end": 38
          },
          {
            "start": 39,
            "title": "Mostrar parámetros",
            "text": "La tabla deja visibles las diferencias entre algoritmos y las tres configuraciones.",
            "end": 43
          }
        ],
        "outputMode": "comp-params",
        "output": "Configuraciones registradas: RF práctica (600, 19, 10, 2); RF modificado (600, 12, 20, 5); Extra Trees (600, 19, 10, 2). Los tres usan sqrt, bootstrap=True, seed 42 y n_jobs=-1."
      },
      {
        "sourceCell": 8,
        "title": "Entrenar, evaluar y guardar métricas",
        "explanation": "Ajusta cada estimador sólo en train. Para train y evaluation calcula métricas por clase, promedios macro, ROC-AUC de score=0 y matrices de confusión.",
        "source": "from sklearn.metrics import (\n    accuracy_score, precision_score, recall_score, f1_score,\n    roc_auc_score, roc_curve, confusion_matrix\n)\n\nmetric_rows = []\nroc_data = {}\nconfusion = {}\n\nfor model_name, model in models.items():\n    # El modelo aprende solamente de la partición de entrenamiento.\n    model.fit(X_train, y_train)\n    roc_data[model_name] = {}\n    confusion[model_name] = {}\n\n    for split_name, X_part, y_part in [\n        ('train', X_train, y_train),\n        ('evaluation', X_test, y_test)\n    ]:\n        predicted = model.predict(X_part)\n        probabilities = model.predict_proba(X_part)\n        class_index = {int(label): i for i, label in enumerate(model.classes_)}\n        p0 = probabilities[:, class_index[0]]\n        y0 = (y_part == 0).astype('int8')\n\n        cm = confusion_matrix(y_part, predicted, labels=[0, 1])\n        confusion[model_name][split_name] = cm\n        fpr, tpr, thresholds = roc_curve(y0, p0)\n        auc_value = roc_auc_score(y0, p0) if len(np.unique(y0)) == 2 else np.nan\n        roc_data[model_name][split_name] = (fpr, tpr, auc_value)\n\n        metric_rows.append({\n            'Algoritmo': model_name,\n            'Partición': split_name,\n            'Registros': len(y_part),\n            'Accuracy': accuracy_score(y_part, predicted),\n            'Precision score=0': precision_score(y_part, predicted, pos_label=0, zero_division=0),\n            'Recall score=0': recall_score(y_part, predicted, pos_label=0, zero_division=0),\n            'F1 score=0': f1_score(y_part, predicted, pos_label=0, zero_division=0),\n            'Precision score=1': precision_score(y_part, predicted, pos_label=1, zero_division=0),\n            'Recall score=1': recall_score(y_part, predicted, pos_label=1, zero_division=0),\n            'F1 score=1': f1_score(y_part, predicted, pos_label=1, zero_division=0),\n            'Precision macro': precision_score(y_part, predicted, average='macro', zero_division=0),\n            'Recall macro': recall_score(y_part, predicted, average='macro', zero_division=0),\n            'F1 macro': f1_score(y_part, predicted, average='macro', zero_division=0),\n            'ROC-AUC score=0': auc_value\n        })\n\nmetrics_df = pd.DataFrame(metric_rows)\ndisplay(metrics_df.round(4))\nmetrics_df.to_csv('metricas_comparacion_RF_ExtraTrees.csv', index=False)\nprint('Guardado: metricas_comparacion_RF_ExtraTrees.csv')",
        "lineCount": 52,
        "steps": [
          {
            "start": 1,
            "title": "Importar métricas",
            "text": "Incluye medidas de exactitud, precisión, recall, F1, ROC, matrices de confusión y AUC.",
            "end": 9
          },
          {
            "start": 10,
            "title": "Entrenar cada modelo",
            "text": "Se ajusta cada configuración con X_train e y_train una vez.",
            "end": 15
          },
          {
            "start": 16,
            "title": "Evaluar ambos conjuntos",
            "text": "Calcula train para describir ajuste y evaluation para comparar registros reservados.",
            "end": 19
          },
          {
            "start": 20,
            "title": "Separar clase y probabilidad",
            "text": "predict da etiquetas; predict_proba entrega probabilidades para la ROC-AUC.",
            "end": 31
          },
          {
            "start": 32,
            "title": "Calcular métricas por clase",
            "text": "Guarda accuracy, precision, recall y F1 de las dos clases, además de promedios macro y AUC score=0.",
            "end": 48
          },
          {
            "start": 49,
            "title": "Mostrar y exportar",
            "text": "Construye la tabla comparativa completa y la guarda en CSV.",
            "end": 52
          }
        ],
        "outputMode": "metrics",
        "output": "La salida transcrita de la ejecución comparativa está registrada como tabla de referencia en la guía. El archivo .ipynb actual no conserva outputs guardados."
      },
      {
        "sourceCell": 10,
        "title": "Calcular brechas de rendimiento",
        "explanation": "Resta cada métrica de evaluation a su valor de train para mostrar cuánto cae fuera de los registros usados para ajustar.",
        "source": "# Brechas de train menos evaluation: positivas grandes requieren revisar sobreajuste.\ngap_rows = []\nfor model_name in models:\n    train_row = metrics_df[(metrics_df['Algoritmo'] == model_name) & (metrics_df['Partición'] == 'train')].iloc[0]\n    eval_row = metrics_df[(metrics_df['Algoritmo'] == model_name) & (metrics_df['Partición'] == 'evaluation')].iloc[0]\n    for metric in ['Accuracy','F1 macro','Recall score=0','ROC-AUC score=0']:\n        gap_rows.append({\n            'Algoritmo': model_name,\n            'Métrica': metric,\n            'Train': train_row[metric],\n            'Evaluation': eval_row[metric],\n            'Brecha train - evaluation': train_row[metric] - eval_row[metric]\n        })\ngap_df = pd.DataFrame(gap_rows)\ndisplay(gap_df.round(4))",
        "lineCount": 15,
        "steps": [
          {
            "start": 1,
            "title": "Definir qué se compara",
            "text": "El cuaderno revisa accuracy, F1 macro, recall score=0 y ROC-AUC score=0.",
            "end": 2
          },
          {
            "start": 3,
            "title": "Emparejar particiones",
            "text": "Busca fila de train y evaluation para el mismo modelo.",
            "end": 6
          },
          {
            "start": 7,
            "title": "Calcular diferencia",
            "text": "Brecha positiva = métrica train menos evaluation; una brecha amplia invita a revisar generalización.",
            "end": 13
          },
          {
            "start": 14,
            "title": "Presentar la tabla",
            "text": "Muestra cada modelo, ambas métricas y su diferencia.",
            "end": 15
          }
        ],
        "outputMode": "gaps",
        "output": "Se genera una tabla de brechas de cuatro métricas por modelo. Interpretarla como diferencia descriptiva; no es por sí sola una prueba de sobreajuste ni de desempeño en alumnos nuevos."
      },
      {
        "sourceCell": 12,
        "title": "Traducir los números de la línea base",
        "explanation": "Resume métricas de RF práctica y usa su matriz evaluation para expresar detección de no éxitos, falsas alertas y aciertos.",
        "source": "base_train = metrics_df[(metrics_df['Algoritmo'] == 'RF práctica') & (metrics_df['Partición'] == 'train')].iloc[0]\nbase_eval = metrics_df[(metrics_df['Algoritmo'] == 'RF práctica') & (metrics_df['Partición'] == 'evaluation')].iloc[0]\ncm = confusion['RF práctica']['evaluation']  # filas: real 0/1; columnas: predicho 0/1\n\nno_exitos_reales = int(cm[0, 0] + cm[0, 1])\nalertas_score0 = int(cm[0, 0] + cm[1, 0])\nprint(f\"TRAIN ({int(base_train['Registros']):,} filas usadas en fit): accuracy={base_train['Accuracy']:.4f}; recall score=0={base_train['Recall score=0']:.4f}. Describe el ajuste a datos vistos.\")\nprint(f\"EVALUATION ({int(base_eval['Registros']):,} filas reservadas): accuracy={base_eval['Accuracy']:.4f} = {int(cm.trace()):,}/{int(base_eval['Registros']):,} aciertos.\")\nprint(f\"Score=0: {int(cm[0, 0]):,}/{no_exitos_reales:,} detectados; {int(cm[0, 1]):,} no éxitos quedaron como score=1. Recall={base_eval['Recall score=0']:.4f}.\")\nprint(f\"Alertas predichas score=0: {int(cm[0, 0]):,}/{alertas_score0:,} fueron no éxitos; {int(cm[1, 0]):,} fueron éxitos. Precisión={base_eval['Precision score=0']:.4f}.\")\nprint(f\"F1 macro={base_eval['F1 macro']:.4f}; AUC score=0={base_eval['ROC-AUC score=0']:.4f}. AUC evalúa probabilidades al variar el umbral, no la fracción de aciertos.\")",
        "lineCount": 11,
        "steps": [
          {
            "start": 1,
            "title": "Separar métricas de la línea base",
            "text": "Selecciona los valores train y evaluation del Random Forest usado en la práctica.",
            "end": 2
          },
          {
            "start": 3,
            "title": "Leer las celdas de la matriz",
            "text": "Fila real 0: no éxitos; columna predicha 0: detectados. La celda [0,1] son no éxitos omitidos.",
            "end": 6
          },
          {
            "start": 7,
            "title": "Explicar ajuste y resultados",
            "text": "Relaciona accuracy, recall, número detectado, falsos positivos, F1 macro y AUC con su significado.",
            "end": 11
          }
        ],
        "outputMode": "interpret",
        "output": "RF práctica evaluation: 7 799/11 107 aciertos; detecta 2 526/4 535 no éxitos y omite 2 009; 2 526/3 825 alertas score=0 son no éxitos; precisión=0,6604; F1 macro=0,6828; AUC=0,7528."
      },
      {
        "sourceCell": 14,
        "title": "Dibujar las curvas ROC",
        "explanation": "Dibuja una curva por modelo en cada panel (train y evaluation), con diagonal aleatoria, ejes de falsos/verdaderos positivos y AUC en la leyenda.",
        "source": "colors = ['#1f4e79', '#d28e00', '#24805a']\nfig, axes = plt.subplots(1, 2, figsize=(10, 4.2), dpi=180)\nfor ax, split_name, title in zip(axes, ['train','evaluation'], ['Entrenamiento','Evaluación']):\n    for (model_name, _), color in zip(models.items(), colors):\n        fpr, tpr, auc_value = roc_data[model_name][split_name]\n        ax.plot(fpr, tpr, lw=1.7, color=color,\n                label=f'{model_name} (AUC={auc_value:.3f})')\n    ax.plot([0,1], [0,1], '--', color='gray', lw=1)\n    ax.set(xlim=(0,1), ylim=(0,1.02),\n           xlabel='Tasa de falsos positivos',\n           ylabel='Tasa de verdaderos positivos', title=title)\n    ax.grid(alpha=.2)\n    ax.legend(fontsize=7, loc='lower right')\nfig.suptitle('Curvas ROC para la clase no exitosa (score=0)')\nfig.tight_layout()\nfig.savefig('curvas_ROC_train_evaluation.png', dpi=300, bbox_inches='tight')\nplt.show()\nprint('Guardado: curvas_ROC_train_evaluation.png')",
        "lineCount": 18,
        "steps": [
          {
            "start": 1,
            "title": "Asignar estilo a las curvas",
            "text": "Usa un color estable por modelo para reconocerlo entre paneles.",
            "end": 2
          },
          {
            "start": 3,
            "title": "Separar train y evaluation",
            "text": "Cada panel muestra las predicciones probabilísticas del mismo conjunto.",
            "end": 4
          },
          {
            "start": 5,
            "title": "Graficar los umbrales",
            "text": "FPR va en x; TPR va en y. AUC resume la capacidad de ordenar no éxitos por encima de éxitos.",
            "end": 15
          },
          {
            "start": 16,
            "title": "Guardar la figura",
            "text": "Exporta el gráfico para documentar resultados y presentación.",
            "end": 18
          }
        ],
        "outputMode": "roc",
        "output": "AUC score=0 de referencia (train → evaluation): RF práctica 0,9165 → 0,7528; RF modificado 0,8269 → 0,7489; Extra Trees 0,8246 → 0,7340."
      },
      {
        "sourceCell": 16,
        "title": "Dibujar las matrices de confusión",
        "explanation": "Genera una matriz evaluation para cada modelo con clase real en filas y predicción en columnas; resalta los conteos.",
        "source": "fig, axes = plt.subplots(1, 3, figsize=(10, 3.2), dpi=180)\nfor ax, (model_name, _) in zip(axes, models.items()):\n    cm = confusion[model_name]['evaluation']\n    ax.imshow(cm, cmap='Blues')\n    ax.set_title(model_name, fontsize=9)\n    ax.set_xticks([0,1], ['Predicho 0','Predicho 1'], fontsize=7)\n    ax.set_yticks([0,1], ['Real 0','Real 1'], fontsize=7)\n    for (row, col), value in np.ndenumerate(cm):\n        ax.text(col, row, f'{value:,}', ha='center', va='center', fontsize=8,\n                color='white' if value > cm.max() * .55 else 'black')\nfig.suptitle('Matrices de confusión en evaluation')\nfig.tight_layout()\nfig.savefig('matrices_confusion_evaluation.png', dpi=300, bbox_inches='tight')\nplt.show()\nprint('Guardado: matrices_confusion_evaluation.png')",
        "lineCount": 15,
        "steps": [
          {
            "start": 1,
            "title": "Preparar tres paneles",
            "text": "Reserva un panel para cada modelo y fija la partición evaluation.",
            "end": 1
          },
          {
            "start": 2,
            "title": "Colocar aciertos y errores",
            "text": "Muestra cada conteo; la diagonal son aciertos y las celdas externas errores.",
            "end": 12
          },
          {
            "start": 13,
            "title": "Guardar la comparación",
            "text": "Exporta las matrices de los tres modelos para anexarlas o explicarlas en la exposición.",
            "end": 15
          }
        ],
        "outputMode": "confusions",
        "output": "Matrices de evaluación, filas=real y columnas=predicho: RF práctica [[2526,2009],[1299,5273]]; RF modificado [[2382,2153],[1182,5390]]; Extra Trees [[2342,2193],[1295,5277]]."
      }
    ]
  }
];
