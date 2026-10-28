# Mineria de Datos - Grupo 8 | Caso de Estudio ASSISTments (EDM Cup 2023)

Sexto Semestre - Ingenieria de Software  
Caso de Estudio Cientifico: *Navigating the Data-Rich Landscape of Online Learning: Insights and Predictions from ASSISTments* (Yaramala, Farokhi & Karimi, EDM 2024 - DOI: 10.5281/zenodo.12729826).

---

### Dashboard Interactivo de Defensa Oral

Acceso web interactivo en linea (compatible con dispositivos moviles y renderizado KaTeX de formulas matematicas):  
**[https://siedu234.github.io/Grupo8-Mineria-de-datos/](https://siedu234.github.io/Grupo8-Mineria-de-datos/)**

Archivo local disponible: `DASHBOARD_DEFENSA_ORAL_GRUPO8.html` e `index.html`.

---

## Estructura del Repositorio

- `index.html` / `DASHBOARD_DEFENSA_ORAL_GRUPO8.html`: Aplicacion web de estudio e inspeccion interactiva para la defensa oral (banco de 25 preguntas maestras con **extractos concretos de codigo fuente**, simulador de cambio de hiperparametros en vivo, visor de codigo con resaltado por bloques, formulas matematicas KaTeX/MathJax y simulador de inferencia/despliegue sin la variable Y).
- `carpeta_datos_excel_profesora/`: **Carpeta con 9 archivos Excel (.xlsx) nativos** con datos separados limpiamente por columnas y filas, encabezados fijados y filtros, listos para enseñar directamente a la docente en la laptop sin problemas de delimitadores:
  1. `01_Evaluaciones_Finales_Scores_Y.xlsx`: Muestra de la variable dependiente `score` (0 y 1).
  2. `02_Relaciones_Examen_Practicas.xlsx`: Enlace relacional entre examen sumativo y practicas formativas.
  3. `03_Detalles_Tareas_Estudiantes.xlsx`: Identificadores de estudiantes (`student_id`) y tiempos.
  4. `04_Telemetria_Logs_Acciones.xlsx`: Clics de telemetria en crudo (pistas, errores, explicaciones).
  5. `05_Secuencia_Curricular.xlsx`: Jerarquia de carpetas curriculares (niveles 1 a 4).
  6. `06_Detalles_Problemas_Habilidades.xlsx`: Taxonomia CCSS y componentes BERT PCA.
  7. `07_Dataset_Procesado_Final_Muestra_722_Features.xlsx`: Tabla final consolidada con las 722 caracteristicas.
  8. `08_Inferencia_Nuevos_Alumnos_Sin_Etiqueta.xlsx`: Datos nuevos para produccion **sin la columna score**.
  9. `09_Diccionario_Completo_Variables_X_e_Y.xlsx`: Diccionario detallado de clasificacion metodologica ($X$, $Y$ o Excluida).
- `ASSISTments_01_Preparar_CSV.ipynb`: Cuaderno Jupyter de preparacion de datos, union relacional, submuestreo reproducible de 3,000 estudiantes e imputacion de faltantes (-1 y 0).
- `ASSISTments_RF_Colab_ES.ipynb`: Cuaderno Jupyter de modelado con Random Forest Classifier, validacion cruzada, metricas Macro, graficacion e inferencia con datos sin etiqueta.
- `Practica_1-2_Grupo8.docx` / `Practica_1-2_Grupo8.docx.pdf`: Informe formal de la practica 1 y 2.
- `2024.EDM-short-papers.29.pdf`: Articulo cientifico oficial de la conferencia EDM 2024.

---

## Distribucion Real de los Datos (Muestra Reproducible)

Para permitir la ejecucion completa en Google Colab sin superar el limite de memoria RAM (12 GB), se tomo una submuestra estratificada por estudiante con semilla 42 (`SEED = 42`, `MAX_STUDENTS = 3000`):

| Conjunto de Datos | Filas (Problemas Evaluados) | Proporcion (%) | Estudiantes Unicos | Clase 0 (Fallo) | Clase 1 (Exito) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Entrenamiento (`train`)** | 39,935 | 78.24% | 2,373 | 16,650 (41.7%) | 23,285 (58.3%) |
| **Evaluacion / Prueba (`evaluation`)** | 11,107 | 21.76% | 658 | 4,535 (40.8%) | 6,572 (59.2%) |
| **Total Muestra Consolidada** | **51,042** | **100.0%** | **3,000** | **21,185 (41.5%)** | **29,857 (58.5%)** |

*Nota metodologica:* La particion respeta la separacion oficial de la competencia por estudiante (`GroupShuffleSplit`), garantizando que ningun estudiante tenga registros simultaneos en entrenamiento y evaluacion.

---

## Formulación Matematica del Problema

### 1. Variable Dependiente ($Y$) y Regla de Etiquetado (*Ground Truth*)
La variable dependiente es binaria:
$$Y \in \{0, 1\} \quad \Longleftrightarrow \quad \text{score}_i \in \{0, 1\}$$

Definida de manera deterministica por la telemetria de la plataforma educativa ASSISTments:
$$\text{score}_i = \begin{cases} 1 & \text{si el estudiante respondio correctamente al 1er intento sin solicitar ayuda ni pistas} \\ 0 & \text{si fallo en el 1er intento, solicito pistas/videos/tutor o abandono} \end{cases}$$

### 2. Espacio Matricial de Variables Independientes ($X$)
La matriz predictora cuenta con 722 variables cuantitativas en tipo `float32`:
$$X \in \mathbb{R}^{N \times 722}$$

Se excluyeron estrictamente los identificadores y la etiqueta:
$$X = \mathcal{D} \setminus \{\text{score}, \text{student\_id}, \text{unit\_test\_assignment\_log\_id}, \text{problem\_id}, \text{source\_split}\}$$

### 3. Criterio de Division e Invarianza de Escala
En cada nodo de decision se utiliza el indice de impureza de Gini:
$$I_G(t) = 1 - \sum_{k=0}^{1} p(k \mid t)^2 = 1 - (p_0^2 + p_1^2)$$

Los arboles de decision son invariantes a transformaciones monotonas de escala:
$$x_j \le c \iff g(x_j) \le g(c) \quad \text{para cualquier funcion estrictamente creciente } g(\cdot)$$

### 4. Submuestreo de Caracteristicas (Heurística de Leo Breiman)
En cada bifurcacion del ensamble se selecciona aleatoriamente un subconjunto de caracteristicas de tamano:
$$m = \lfloor \sqrt{M} \rfloor = \lfloor \sqrt{722} \rfloor = 27 \text{ caracteristicas candidatas por nodo}$$

---

## Rendimiento y Matriz de Confusion en Evaluacion

Evaluacion sobre el conjunto retenido de prueba ($N_{\text{eval}} = 11{,}107$ registros):

| Metrica Evaluada | Valor Obtenido | Criterio de Exito Pedagogico |
| :--- | :---: | :--- |
| **Exactitud Global (Accuracy)** | **70.22%** | Supera la base minima del 70.0% ($7,800 / 11,107$) |
| **Area Bajo la Curva (ROC-AUC)** | **0.7528** | Supera el umbral tecnico de 0.750 |
| **Macro F1-Score** | **0.6828** | Promedio no sesgado entre ambas clases |
| **Macro Recall** | **0.6797** | Balance de deteccion entre aprobados y en riesgo |
| **Macro Precision** | **0.6923** | Confianza equilibrada del clasificador |
| **Recall Clase 0 (Riesgo)** | **55.70%** | 2,526 estudiantes en riesgo detectados de 4,535 |
| **Recall Clase 1 (Exito)** | **80.25%** | 5,274 aciertos autenticos identificados de 6,572 |

### Matriz de Confusion Obtenida
$$N_{\text{eval}} = \text{VN} + \text{FP} + \text{FN} + \text{VP} = 2{,}526 + 2{,}009 + 1{,}298 + 5{,}274 = 11{,}107$$

- **Verdaderos Negativos (VN = 2,526):** Fallos reales predichos como fallo (alerta temprana efectiva).
- **Falsos Positivos (FP = 2,009):** Fallos reales clasificados por error como exito.
- **Falsos Negativos (FN = 1,298):** Aciertos reales clasificados como fallo (falsa alarma preventiva inocua).
- **Verdaderos Positivos (VP = 5,274):** Aciertos reales confirmados.

---

## Extractos Concretos de Codigo para la Defensa Oral

El dashboard interactivo incluye los bloques exactos de codigo de cada respuesta. A continuacion los puntos neurálgicos:

### 1. Separacion de $X$ (722 variables) e $Y$ (score)
```python
# ASSISTments_RF_Colab_ES.ipynb (Celda 4)
id_columns = {'score', 'student_id', 'source_split', 'unit_test_assignment_log_id', 'problem_id'}
feature_columns = [column for column in df.columns if column not in id_columns]

X = df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')
y = pd.to_numeric(df['score'], errors='coerce')
labeled = y.notna() & y.isin([0, 1])
df = df.loc[labeled].reset_index(drop=True)
X = X.loc[labeled].reset_index(drop=True)
y = y.loc[labeled].astype('int8').reset_index(drop=True)
```

### 2. Particion Oficial de Datos
```python
# ASSISTments_RF_Colab_ES.ipynb (Celda 4)
train_mask = df['source_split'].eq('train')
eval_mask = df['source_split'].eq('evaluation')

train_idx = np.flatnonzero(train_mask.to_numpy())  # 39,935 filas (78.24%)
test_idx = np.flatnonzero(eval_mask.to_numpy())    # 11,107 filas (21.76%)

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx].to_numpy(), y.iloc[test_idx].to_numpy()
```

### 3. Entrenamiento con Hiperparametros Calibrados
```python
# ASSISTments_RF_Colab_ES.ipynb (Celda 4)
rf = RandomForestClassifier(
    n_estimators=600,
    max_depth=19,
    min_samples_split=10,
    min_samples_leaf=2,
    max_features='sqrt',
    bootstrap=True,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
```

### 4. Inferencia en Produccion (Sin Etiqueta Y)
```python
# ASSISTments_RF_Colab_ES.ipynb (Celda 11)
nuevos_df = pd.read_csv('/content/assistments_nuevos_sin_etiqueta_demo.csv')
X_nuevo = nuevos_df[feature_columns].apply(pd.to_numeric, errors='coerce').fillna(-1).astype('float32')

pred_nuevas = rf.predict(X_nuevo)
prob_nuevas = rf.predict_proba(X_nuevo)

salida = nuevos_df[['student_id', 'unit_test_assignment_log_id', 'problem_id']].copy()
salida['score_predicho'] = pred_nuevas.astype('int8')
salida['probabilidad_fallo'] = prob_nuevas[:, class_index[0]].round(4)
salida['alerta_docente'] = salida['probabilidad_fallo'] >= 0.50
```

---

## Instrucciones para Ejecución Local

1. Abrir `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari) en escritorio o movil.
2. Para mostrar los datos a la docente, abrir los archivos en `carpeta_datos_excel_profesora/` directamente con Microsoft Excel.
3. Los cuadernos `.ipynb` pueden ejecutarse directamente en Google Colab o Jupyter Lab.
