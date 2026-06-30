---
name: create-skill
description: Crea una nueva skill (habilidad) para el agente basándose en los requerimientos del usuario y siguiendo las directrices oficiales. Úsala cuando el usuario pida crear una nueva skill, añadir una capacidad o guardar instrucciones.
---

# Crear Skill

## Cuándo usar esta skill
- El usuario pide explícitamente crear o generar una nueva skill para el agente.
- El usuario quiere enseñarle al agente una nueva capacidad, regla o flujo de trabajo y hacerla reutilizable.

## Cómo usarla
1. **Determinar el Alcance**: Pregúntale al usuario si la skill debe ser específica del entorno de trabajo (workspace) o global. Si no se especifica, por defecto es específica del entorno de trabajo.
   - Específica del entorno: `<workspace-root>/.agents/skills/<skill-name>/`
   - Global: `~/.gemini/config/skills/<skill-name>/`
2. **Crear la Carpeta**: Crea un directorio para la skill usando minúsculas y guiones (ej. `mi-nueva-skill`).
3. **Crear `SKILL.md`**: Crea el archivo `SKILL.md` dentro del nuevo directorio.
4. **Añadir Frontmatter YAML**: El archivo DEBE comenzar con el siguiente frontmatter:
   ```yaml
   ---
   name: <nombre-de-la-skill>
   description: <Descripción clara en tercera persona sobre lo que hace la skill y cuándo debe usarla el agente>
   ---
   ```
5. **Estructurar el Contenido**: Usa la siguiente estructura markdown para el cuerpo del archivo:
   - `# <Título de la Skill>`
   - `## Cuándo usar esta skill`: Puntos que describen las condiciones o heurísticas sobre cuándo el agente debe activar esta skill.
   - `## Cómo usarla`: Guía paso a paso, patrones, reglas y convenciones que el agente debe seguir para ejecutar la skill.
6. **Carpetas Opcionales**: Si aplica, crea carpetas complementarias:
   - `scripts/` (para scripts de ayuda, recuérdale al agente ejecutarlos con `--help` en lugar de leer el código fuente)
   - `examples/` (para implementaciones de referencia)
   - `resources/` (para plantillas u otros recursos)
7. **Mejores Prácticas**: Mantén la skill enfocada en una sola tarea, escribe una descripción clara para facilitar su descubrimiento y añade árboles de decisión si la lógica es compleja.
8. **Finalización**: Notifica al usuario que la skill se ha creado con éxito y explícale cómo será descubierta en futuras interacciones.
