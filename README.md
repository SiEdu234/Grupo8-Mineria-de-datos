# Grupo 8 · Caso ASSISTments

Repositorio de la réplica académica y guía interactiva para preparar la defensa oral.

## Guía

Al abrir el sitio, la raíz redirige a [`basura/index.html`](basura/index.html). La guía explica por etapas el código de los tres notebooks, el preprocesamiento, la transformación, el modelado, la evaluación, las gráficas y el despliegue.

## Notebooks principales

- [`ASSISTments_01_Preparar_CSV.ipynb`](ASSISTments_01_Preparar_CSV.ipynb): lectura y preparación de los archivos fuente.
- [`ASSISTments_RF_Colab_ES.ipynb`](ASSISTments_RF_Colab_ES.ipynb): modelo Random Forest de la práctica.
- [`ASSISTments_Comparacion_RF_ExtraTrees.ipynb`](ASSISTments_Comparacion_RF_ExtraTrees.ipynb): comparación de los modelos y gráficas.

Los notebooks se ejecutan en Google Colab o Jupyter. Los archivos fuente y los CSV generados se mantienen fuera del sitio; deben estar disponibles en la ruta que configure cada notebook antes de ejecutarlo.

## Sitio estático

La configuración de Vercel dirige `/` y `/guia` a `basura/index.html`. La guía y sus estilos, scripts e imágenes se publican junto con el repositorio.
