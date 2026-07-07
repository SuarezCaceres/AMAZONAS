---
name: github-pr-develop
description: Genera una descripción de Pull Request orientada a la integración de características hacia la rama develop, recopilando los commits desde el origen de la rama actual.
---

# Generador de PR para Develop (Contexto Histórico)

Esta skill está diseñada para generar de forma automatizada y estructurada el cuerpo de un Pull Request cuyo destino final es la rama de desarrollo (por ejemplo, `develop`). El PR debe reflejar fielmente todo el trabajo que se realizó a lo largo de la rama.

## Instrucciones para el Agente

Cuando el usuario pida aplicar esta skill, realiza lo siguiente:
1. **Identifica la rama actual** de trabajo usando Git.
2. **Obtén el contexto completo:** 
   - Busca si existe un archivo de historial acumulativo en `.agents/context/historial_[nombre_rama_sanitizada].md` (reemplazando `/` por `_` en el nombre de la rama) y lee su contenido para entender las modificaciones locales.
   - Adicionalmente, determina dónde la rama actual se separó de su base (`main` o `develop`) y obtén los mensajes de commit usando comandos como `git log --oneline develop..HEAD` para incluir commits de otros colaboradores si corresponde.
   - Analiza la información de ambas fuentes para tener el contexto global del trabajo.
3. **Redacta la descripción del PR** siguiendo el formato que se muestra a continuación, reemplazando las secciones entre corchetes `[...]` con los datos reales obtenidos.

---

## Estructura Base del Pull Request

Utiliza este formato para generar la respuesta:

```markdown
# [Emoji representativo] [Título descriptivo del PR de acuerdo al trabajo realizado]

*Breve resumen de la funcionalidad principal, corrección o mejora implementada en esta rama.*

## 🛠️ Cambios introducidos

*(Agrupa los cambios extraídos de los commits. Si hay backend, frontend u otros, divídelos en categorías lógicas).*

*   **[Categoría 1 (ej. Backend)]:**
    *   Descripción del cambio extraído del commit (qué se añadió o modificó).
*   **[Categoría 2 (ej. Frontend)]:**
    *   Descripción del cambio en la UI o integración.
*   **[Categoría 3 (ej. Refactorización/Limpieza)]:**
    *   Detalle técnico menor.

## 🧪 Verificación y Pruebas

*(Enumera las verificaciones locales hechas o por hacer antes de aceptar este PR en `develop`).*

*   [ ] Comprobación local de la funcionalidad en el entorno de desarrollo.
*   [ ] [Añadir una validación técnica específica encontrada en los cambios, como revisión de logs, o testing manual].
*   [ ] Pruebas de regresión si aplican.

## 📋 Contexto Adicional
*   **Rama de origen:** `[Nombre de la rama actual]`
*   **Rama de destino:** `develop` (o la aplicable)
```
