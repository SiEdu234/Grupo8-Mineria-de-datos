# Mineria de Datos - Grupo 8 | Caso de Estudio ASSISTments (EDM Cup 2023)

Sexto Semestre - Ingenieria de Software  
Caso de Estudio Cientifico: *Navigating the Data-Rich Landscape of Online Learning: Insights and Predictions from ASSISTments* (Yaramala, Farokhi & Karimi, EDM 2024 - DOI: 10.5281/zenodo.12729826).

---

### Dashboard Interactivo de Defensa Oral

Acceso web interactivo en linea (compatible con dispositivos moviles y renderizado KaTeX de formulas matematicas):  
**[https://siedu234.github.io/Grupo8-Mineria-de-datos/](https://siedu234.github.io/Grupo8-Mineria-de-datos/)**

Archivo local disponible: `DASHBOARD_DEFENSA_ORAL_GRUPO8.html` e `index.html`.

---

## Contenido del Repositorio

- `index.html` / `DASHBOARD_DEFENSA_ORAL_GRUPO8.html`: Aplicacion web de estudio e inspeccion interactiva para la defensa oral (banco de 25 preguntas maestras, simulador de cambio de hiperparametros, visor de codigo, formulas matematicas con KaTeX y demo de inferencia para despliegue).
- `ASSISTments_01_Preparar_CSV.ipynb`: Cuaderno Jupyter de preparacion de datos, union relacional de logs de telemetria, submuestreo reproducible de 3,000 estudiantes y construccion de la matriz de 722 caracteristicas.
- `ASSISTments_RF_Colab_ES.ipynb`: Cuaderno Jupyter de modelado con Random Forest Classifier, validacion cruzada, evaluacion de metricas (Accuracy, Macro F1, Macro Recall, ROC-AUC), graficacion e inferencia con datos sin etiqueta.
- `Practica_1-2_Grupo8.docx` / `Practica_1-2_Grupo8.docx.pdf`: Informe formal de la practica 1 y 2.
- `2024.EDM-short-papers.29.pdf`: Articulo cientifico oficial de la conferencia EDM 2024.
- `basura/`: Muestras de columnas en formato Excel y guia textual de estudio.

---

## Formulación Matematica del Problema

### 1. Variable Dependiente ($Y$) y Regla de Etiquetado (*Ground Truth*)
La variable dependiente es binaria:
$$Y \in \{0, 1\} \quad \Longleftrightarrow \quad \text{score}_i \in \{0, 1\}$$

Definida de manera deterministica por la telemetria de la plataforma educativa ASSISTments:
$$\text{score}_i = \begin{cases} 1 & \text{si el estudiante respondio correctamente al primer intento sin solicitar ayuda ni pistas} \\ 0 & \text{si fallo en el primer intento, solicito pistas, observo soluciones o abandono} \end{cases}$$

### 2. Espacio Matricial de Variables Independientes ($X$)
La matriz predictora cuenta con 722 variables cuantitativas estandarizadas en tipo `float32`:
$$X \in \mathbb{R}^{N \times 722}$$

Se excluyeron estrictamente los identificadores y la etiqueta:
$$X = \mathcal{D} \setminus \{\text{score}, \text{student\_id}, \text{unit\_test\_assignment\_log\_id}, \text{problem\_id}, \text{source\_split}\}$$

### 3. Criterio de Division e Invarianza de Escala
En cada nodo de decision se utiliza el indice de impureza de Gini:
$$I_G(t) = 1 - \sum_{k=0}^{1} p(k \mid t)^2 = 1 - (p_0^2 + p_1^2)$$

Los arboles de decision son invariantes a transformaciones monotonas de escala:
$$x_j \le c \iff g(x_j) \le g(c) \quad \text{para cualquier función monótona creciente } g(\cdot)$$

### 4. Submuestreo de Caracteristicas (Heurística de Leo Breiman)
En cada bifurcacion del ensamble se selecciona aleatoriamente un subconjunto de caracteristicas de tamano:
$$m = \lfloor \sqrt{M} \rfloor = \lfloor \sqrt{722} \rfloor = 27 \text{ caracteristicas candidatas por nodo}$$

---

## Resultados y Rendimiento del Modelo

Evaluacion sobre el conjunto oficial retenido de prueba ($N_{\text{eval}} = 11{,}107$ registros):

| Metrica Evaluada | Valor Obtenido | Criterio de Exito Pedagogico |
| :--- | :---: | :--- |
| **Exactitud Global (Accuracy)** | **70.22%** | Supera la base minima del 70.0% |
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
- **Falsos Negativos (FN = 1,298):** Aciertos reales clasificados como fallo (falsa alarma preventiva).
- **Verdaderos Positivos (VP = 5,274):** Aciertos reales confirmados.

---

## Ubicacion Rapida en Codigo para la Defensa Oral

| Tema Consultado por la Docente | Cuaderno Jupyter | Celda y Linea Exacta |
| :--- | :--- | :--- |
| Separacion de $X$ e $Y$ | `ASSISTments_RF_Colab_ES.ipynb` | Celda 2, lineas 23 y 27 |
| Submuestreo de 3,000 estudiantes | `ASSISTments_01_Preparar_CSV.ipynb` | Celda 2, linea 20 |
| Imputacion de nulos (-1 y 0) | `ASSISTments_01_Preparar_CSV.ipynb` | Celdas 3 y 8 |
| Entrenamiento del modelo (`rf.fit`) | `ASSISTments_RF_Colab_ES.ipynb` | Celda 4, linea 18 |
| Inferencia sin etiqueta $Y$ (`rf.predict`) | `ASSISTments_RF_Colab_ES.ipynb` | Celda 4, linea 25 y Celda 11 |
| Evaluacion de metricas Macro | `ASSISTments_RF_Colab_ES.ipynb` | Celda 4, lineas 40 a 55 |
| Curva ROC y Matriz de Confusion | `ASSISTments_RF_Colab_ES.ipynb` | Celda 6 (graficos comparativos) |
| Importancia de las 15 Variables | `ASSISTments_RF_Colab_ES.ipynb` | Celda 7 (grafico de barras horizontales) |
| Exportacion del modelo (`joblib.dump`) | `ASSISTments_RF_Colab_ES.ipynb` | Celda 10 |
| Despliegue con Alerta Temprana ($P(score=0) > 0.5$) | `ASSISTments_RF_Colab_ES.ipynb` | Celda 11 |

---

## Instrucciones para Ejecución Local

1. Abrir `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari) tanto en escritorio como en dispositivos moviles.
2. Los cuadernos `.ipynb` pueden ejecutarse en entornos locales con Jupyter Lab / VS Code o importarse en Google Colab conectando la carpeta de datos.
