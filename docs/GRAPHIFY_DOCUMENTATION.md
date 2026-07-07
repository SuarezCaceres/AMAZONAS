# 🕸️ Graphify - Archivos Generados e Integración

Este documento resume todos los archivos y carpetas que se han creado o modificado como parte de la integración de **Graphify** en tu proyecto `AMAZONAS`.

## 1. Archivos en la Raíz del Proyecto

* **`.graphifyignore`**: 
  * **Ubicación:** `C:\Users\USER\Documents\Herramientas de desarrollo\AMAZONAS\.graphifyignore`
  * **Propósito:** Configuración personalizada para decirle a Graphify qué carpetas, archivos o extensiones (como `node_modules`, archivos compilados `dist/`, `.next/`, archivos multimedia `.mp3`, `.webp`, etc.) debe ignorar al construir el grafo semántico y estructural. Funciona de manera similar a `.gitignore`.

## 2. Archivos de Salida y Reportes (Carpeta `src/graphify-out/`)

Graphify utiliza un directorio dedicado para almacenar todos sus análisis y reportes para no ensuciar la base de tu código.

* **`GRAPH_REPORT.md`**:
  * **Ubicación:** `src/graphify-out/GRAPH_REPORT.md`
  * **Propósito:** Es el reporte maestro generado por el motor de clustering. Muestra estadísticas globales del código, listas de componentes centrales ("God Nodes"), métricas de las comunidades que detecta y dependencias cruzadas sorprendentes. Este archivo debe ser leído de forma constante para auditar tu arquitectura.

* **`graph.json`**:
  * **Ubicación:** `src/graphify-out/graph.json`
  * **Propósito:** Es la base de datos topológica real (nodos y conexiones extraídos de los archivos y del AST de tu código). Los agentes de IA interactúan silenciosamente con este JSON.

* **`graph.html`**:
  * **Ubicación:** `src/graphify-out/graph.html`
  * **Propósito:** Un archivo web autogenerado que puedes abrir en tu navegador (Chrome, Edge, etc.) para visualizar tu red neuronal de código de forma interactiva en 2D/3D.

* **`.graphify_analysis.json`**:
  * **Ubicación:** `src/graphify-out/.graphify_analysis.json`
  * **Propósito:** Cachea los metadatos semánticos que devolvió la API (como Gemini o Claude) para no tener que volver a pagar con tokens si un archivo no ha sido modificado.

* **Carpeta de Backups (ej. `2026-07-07/`)**:
  * **Ubicación:** `src/graphify-out/2026-07-07/`
  * **Propósito:** Carpetas fechadas con snapshots y respaldos automáticos de cómo lucía el grafo antes de un re-análisis importante.

## 3. Integración Continua (Hooks de Git)

Para mantener a Graphify sincronizado de forma instantánea y automática en tu flujo de trabajo de control de versiones.

* **`post-commit`** y **`post-checkout`**:
  * **Ubicación:** `.git/hooks/post-commit` y `.git/hooks/post-checkout`
  * **Propósito:** Son scripts inyectados en la carpeta invisible de Git (`.git`). Cuando escribes un nuevo commit en tu código o cambias de rama, estos scripts disparan a Graphify en segundo plano de forma hiper-rápida, actualizando el grafo (`graph.json`) solo con los archivos que hayan cambiado, sin molestar y sin cobrar tokens adicionales a la API.

---

> **Tip:** Recuerda que puedes interactuar y explorar tu código ejecutando desde cualquier punto la herramienta `graphify query` en la consola si deseas preguntarle algo específico a tu grafo directamente, o abrir el `graph.html` para tener una visión aérea espectacular.
