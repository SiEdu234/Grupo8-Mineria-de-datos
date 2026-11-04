# aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

Guía interactiva para preparar, modelar y explicar la réplica del caso ASSISTments.

## Abrir la guía

Abre `index.html` en un navegador actualizado. La guía funciona localmente y no requiere instalar paquetes. Incluye navegación guiada, celdas de notebook simuladas, comparación de modelos, ajuste interactivo de umbrales, matrices de confusión, métricas y curvas ROC.

## Archivos

- `ASSISTments_01_Preparar_CSV.ipynb`: preparación y transformación de los datos.
- `ASSISTments_RF_Colab_ES.ipynb`: modelo Random Forest de la práctica.
- `ASSISTments_Comparacion_RF_ExtraTrees.ipynb`: comparación experimental de modelos.
- `assets/datos/`: muestras de columnas crudas y procesadas para revisar en Excel.
- `js/`: contenido, explicaciones y resultados usados por la guía interactiva.

Los notebooks ejecutan el análisis en Google Colab o en un entorno Python compatible. El conjunto completo se consulta desde el [repositorio oficial del caso](https://github.com/DSAatUSU/EDMCup2023); no se incluye aquí el archivo completo de datos.

## Uso de resultados

La guía presenta resultados de la réplica del grupo. Los controles de umbral recalculan métricas de forma interactiva a partir de probabilidades precalculadas; no vuelven a entrenar los modelos en el navegador.
