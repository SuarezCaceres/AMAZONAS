---
name: github-pr-despliegue
description: Genera una descripción estructurada de Pull Request para despliegues o releases, analizando el contexto desde la creación de la rama actual (commits y cambios).
---

# Generador de Pull Requests para Despliegues / Releases

Esta skill está diseñada para generar automáticamente la descripción de un Pull Request enfocado en lanzamientos (releases) o despliegues hacia entornos de producción o staging (ej. de `develop` a `main`).

## Instrucciones para el Agente

Cuando se invoque esta skill, debes realizar lo siguiente para construir la descripción:

1. **Obtener la rama actual:** Identifica en qué rama te encuentras (por ejemplo, una rama de release `release/v1.2.0` o similar).
2. **Obtener el historial completo:** 
   - Busca si existe un archivo de historial acumulativo en `.agents/context/historial_[nombre_rama_sanitizada].md` (reemplazando `/` por `_` en el nombre de la rama) y lee su contenido para entender las modificaciones locales.
   - Adicionalmente, encuentra el punto donde la rama actual se separó de su base y obtén los commits usando `git log --oneline main..HEAD` para capturar aportaciones de otros colaboradores.
   - Todo este contexto combinado es fundamental y debe ser la base para completar la estructura.
3. **Analizar los cambios:** Revisa qué se está promoviendo (funcionalidades de backend, frontend, infraestructura, documentación, etc.).
4. **Redactar el PR:** Utiliza la siguiente estructura base. Adapta el contenido, los números de versión y los detalles a los cambios reales que se han identificado en los commits.

---

## Estructura Base del Pull Request

Utiliza este formato exacto para generar el resultado, reemplazando los corchetes `[...]` o ejemplos con la información real del contexto de la rama.

```markdown
# Lanzamiento de la Versión [vX.Y.Z] ([Tipo de Release, ej. Release de Backend])

Este Pull Request promueve [Resumen de lo que se promueve, ej. la infraestructura y configuraciones del Backend] validadas en la rama `[Rama Origen, ej. develop]` hacia la rama productiva `[Rama Destino, ej. main]`. Esta entrega corresponde a la versión semántica **[vX.Y.Z]**.

---

## 📦 Detalles de la Versión: [vX.Y.Z] ([Tipo de Release])
* **MAJOR ([X])**: [Explicación del cambio Major, ej. Versión de producción estable].
* **MINOR ([Y])**: [Explicación del cambio Minor, ej. Soporte e integración de contenedorización Docker...].
* **PATCH ([Z])**: [Explicación del cambio Patch, ej. Reinicio del contador de parches...].

---

## 🛠️ Resumen de Cambios Promovidos

*(Agrupa los cambios extraídos de los commits. Si hay backend, frontend, documentación u otros, divídelos en categorías lógicas tal como el ejemplo a continuación).*

### [Emoji, ej. 🐳] [Categoría 1, ej. Backend (Spring Boot + Docker)]
* **[Subtema]**: [Detalle técnico basado en los commits].
* **[Subtema]**: [Detalle técnico basado en los commits].
* **[Subtema]**: [Detalle técnico basado en los commits].

### [Emoji, ej. 📄] [Categoría 2, ej. Documentación Técnica]
* **[Subtema]**: [Detalle basado en los commits].

---

## 🧪 Pruebas y Validación Realizadas
*(Enumera las verificaciones locales, de CI/CD o en la nube que sustentan este despliegue)*
- [Validación 1 extraída del contexto o estándar del proyecto, ej. Compilación de Docker exitosa en la nube de Render].
- [Validación 2 extraída del contexto, ej. Habilitación dinámica de cabeceras CORS...].
```

## Reglas importantes
- **Todo el contexto de la rama:** Debes leer todos los commits desde la creación de la rama.
- **Versión Semántica:** Si el usuario no te da una versión explícita, intenta inferirla de la rama o deja placeholders para que el usuario la llene.
- **No inventes:** Rellena la plantilla basándote estrictamente en los cambios encontrados en el repositorio.
