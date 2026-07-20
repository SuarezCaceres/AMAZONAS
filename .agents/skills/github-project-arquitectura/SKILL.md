---
name: github-project-arquitectura
description: Genera la plantilla estándar en Markdown para una Historia de Usuario de Arquitectura (GitHub Project Arquitectura). Utiliza esta skill siempre que el usuario mencione "GitHub Project Arquitectura", pida crear una historia de usuario técnica, documentar requerimientos de arquitectura, auditorías de conectividad, integración backend/frontend, o crear una tarea para DevOps.
---

# GitHub Project Arquitectura

Esta skill permite generar rápidamente la estructura estándar para documentar requerimientos técnicos, auditorías e historias de usuario relacionadas a la arquitectura del proyecto.

## Instrucciones de Uso

Cuando el usuario invoque esta skill o solicite la plantilla, debes seguir estos pasos:

1. **Analizar el contexto de la rama actual:**
   - Primero, busca si existe un archivo de historial acumulativo en `.agents/context/historial_[nombre_rama_sanitizada].md` (reemplazando `/` por `_` en el nombre de la rama). Si existe, lee su contenido, ya que contiene el registro detallado de los commits y cambios locales.
   - Adicionalmente, usa comandos de terminal (ej. `git log main..HEAD` o la rama base correspondiente) para complementar el historial con cambios que otros colaboradores hayan subido al servidor.
   - Analiza estos commits y los cambios en el código para entender el contexto: qué funcionalidad se desarrolló, qué módulos fueron afectados, qué endpoints o componentes se integraron, etc.
2. **Crear y autocompletar el archivo:**
   - Crea un artefacto o un archivo `.md` (por ejemplo, `historia_arquitectura_[tema].md`). **Es obligatorio que el formato de salida sea Markdown.**
   - Utiliza la siguiente plantilla y **rellena automáticamente la mayor cantidad de campos posibles** basándote en la información obtenida del análisis de la rama. Deja los corchetes (`[ ]`) únicamente donde falte información.

```markdown
# Estructura: GitHub Project Arquitectura

---

## 1. Desarrollo de la Historia de Usuario

### Título del Requerimiento
- **Nombre del cliente:** [Identificación del cliente o proyecto]
- **Funcionalidad:** [Descripción corta de la funcionalidad]
- **Dónde aplica:** [Capas, módulos o componentes donde tiene efecto]
- **Título final para DevOps:** [Título resumido y estandarizado para la tarea]

---

### Contexto del requerimiento
- **Origen del requerimiento:** [De dónde surge la necesidad]
- **Módulo afectado:** [Partes específicas del sistema involucradas]
- **Naturaleza:** [Tipo de tarea: funcional, técnica, refactorización, etc.]

---

### Historia de Usuario
- **Como** [Rol/Actor]
- **Quiero** [Acción a realizar o característica deseada]
- **Para** [Valor o beneficio esperado]

---

### Consideraciones técnicas
- **¿Requiere UX/Diseño?:** [Sí/No con justificación]
- **¿Afecta servicios backend, Frontend, infraestructura?:** [Sí/No con detalle de la afectación]
- **¿Hay integración con terceros?:** [Sí/No con especificación de los servicios]

---

### Requerimientos no Funcionales
- **Seguridad y Autenticación:** [Criterios de seguridad aplicables]
- **Integridad y Persistencia:** [Criterios sobre manejo de datos]
- *(Agregar otros atributos de calidad según el caso: Rendimiento, Disponibilidad, etc.)*

---

### Criterios de aceptación
*(Formato BDD para cada escenario)*
- **Escenario [N]:** [Nombre del escenario]
  - **Dado que** [Precondiciones o estado inicial]
  - **Cuando** [Acción disparadora]
  - **Entonces** [Resultado esperado]

---

### Datos para el Formulario DevOps
- **State:** [Estado inicial del ticket]
- **Priority:** [Nivel de prioridad]
- **Labels:** [Etiquetas descriptivas]
- **Milestone / Entrega:** [Hito, sprint o fecha límite]
- **Branch asociado para el seguimiento:** [Convención de la rama git]

---

## 2. Preguntas de Enfoque y Justificación
- **¿Para quién va dirigido?:** [Beneficiarios directos del requerimiento]
- **¿Cómo se realizará?:** [Estrategia técnica, pasos o plan de acción]
- **¿Para qué sirve?:** [Propósito final, mejora en el negocio o en la arquitectura]
```

3. **Interacción:** Una vez generado y autocompletado el archivo, preséntalo al usuario y ofrécele ajustar cualquier detalle o rellenar las partes faltantes basándose en sus comentarios.
