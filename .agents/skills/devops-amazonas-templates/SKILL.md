---
name: devops-amazonas-templates
description: Provee las plantillas estandarizadas para historias de usuario DevOps (PRD), descripciones de Pull Requests (PR) y políticas de versionamiento (SemVer) específicas del proyecto Amazonas.
---

# Plantillas y Estándares DevOps - Proyecto Amazonas

Esta skill almacena las directrices, estructuras de historias de usuario y formatos de Pull Requests (PR) utilizados para promover cambios entre ramas (`develop` y `main`) en la plataforma web de Maquetas Educativas Amazonas.

## Cuándo usar esta skill
* El usuario solicita crear, formatear o documentar una Historia de Usuario o Requerimiento Técnico (estilo PRD) para tareas de infraestructura, Backend, Frontend o Base de Datos.
* El usuario pide ayuda para redactar la descripción o el título de un Pull Request (PR) para integrar código (de `feature` a `develop` o de `develop` a `main`).
* El usuario solicita directrices sobre el número de versión (SemVer) correspondiente para un nuevo lanzamiento.

---

## Cómo usarla

### 1. Plantilla de Historia de Usuario / Requerimiento (PRD)
Usa este formato estructurado para documentar nuevos requerimientos técnicos o historias de usuario del proyecto:

```markdown
# Desarrollo de la Historia de Usuario

### Título del Requerimiento
* **Nombre del cliente**: Maquetas Educativas Amazonas
* **Funcionalidad**: [Descripción breve de la tarea, ej: Auditoría de endpoints, Dockerización]
* **Dónde aplica**: [Ej: Frontend en Angular, Backend en Spring Boot, Infraestructura]
* **Título final para DevOps**: [Título formal para tableros tipo Jira/GitHub Issues]

---

### Contexto del requerimiento
* **Origen del requerimiento**: [Explicación técnica de la necesidad, ej: mitigar riesgos antes de producción]
* **Módulo afectado**: [Componentes o capas del monorrepo modificadas]
* **Naturaleza**: [Técnica, infraestructura, calidad de software, etc.]

---

### Historia de Usuario
**Como** [Rol del usuario, ej: equipo de desarrollo/DevOps],  
**Quiero** [Acción o requerimiento técnico],  
**Para** [Propósito o beneficio de negocio].

---

### Consideraciones técnicas
* **¿Requiere UX/Diseño?**: [Sí/No. Indicar si afecta interfaz de usuario]
* **¿Afecta servicios backend, Frontend, infraestructura?**: [Detalle de qué componentes toca]
* **¿Hay integración con terceros?**: [Indicar si se conecta a servicios externos o infraestructura cloud]

---

### Requerimientos no Funcionales
* **[Requerimiento 1, ej: Seguridad]**: [Especificación técnica de seguridad]
* **[Requerimiento 2, ej: Portabilidad]**: [Especificación de portabilidad/rendimiento]

---

### Criterios de aceptación

#### Escenario 1: [Nombre del escenario]
* **Dado que** [Condición inicial],
* **Cuando** [Acción ejecutada],
* **Entonces** [Resultado técnico esperado].

#### Escenario 2: [Nombre del escenario]
* **Dado que** [Condición inicial],
* **Cuando** [Acción ejecutada],
* **Entonces** [Resultado técnico esperado].

---

### Datos para el Formulario DevOps
* **State**: [New / In Progress / Completed]
* **Priority**: [Alta / Media / Baja]
* **Labels**: [Ej: Angular, Spring Boot, DevOps, Docker]
* **Milestone / Entrega**: [Fecha o hito de entrega]
* **Branch asociado para el seguimiento**: [Nombre de la rama de Git]

---

### ¿Para quién va dirigido?
[Público objetivo del desarrollo]

---

### ¿Cómo se realizará?
[Pasos técnicos secuenciales para la implementación]

---

### ¿Para qué sirve?
[Valor agregado que aporta la implementación al proyecto]
```

---

### 2. Estructura de Pull Request (PR) de `feature` a `develop`
Utiliza esta plantilla para documentar la integración de ramas de trabajo individuales hacia la rama de integración:

```markdown
## 🚀 [Título / Funcionalidad del PR]

Este PR introduce [resumen general del cambio] en la rama de integración `develop`.

### 🛠️ Cambios introducidos
1. **[Componente afectado (Ej: Backend/Frontend)]**:
   - [Cambio puntual 1]
   - [Cambio puntual 2]
2. **[Documentación/Configuración]**:
   - [Cambio puntual 3]

### 🧪 Verificación y Pruebas
- [Ej: Compilación exitosa en local con ng build / mvn clean package]
- [Ej: Variables de entorno inyectadas con éxito]
```

---

### 3. Estructura de Pull Request (PR) de `develop` a `main` (Release SemVer)
Utiliza esta plantilla para los despliegues formales de lanzamiento en producción, justificando la versión según el estándar SemVer (`MAJOR.MINOR.PATCH`):

```markdown
# Lanzamiento de la Versión v[X.Y.Z] (Release)

Este Pull Request promueve los cambios validados en la rama `develop` hacia la rama productiva `main`. Esta entrega corresponde a la versión semántica **v[X.Y.Z]**.

---

## 📦 Detalles de la Versión: v[X.Y.Z] ([MAJOR/MINOR/PATCH] Release)
* **MAJOR (X)**: [Indicar si hay breaking changes. Si no, mantener el valor previo]
* **MINOR (Y)**: [Indicar si hay nuevas funcionalidades compatibles hacia atrás]
* **PATCH (Z)**: [Indicar si hay correcciones de errores, parches o ajustes de configuración]

---

## 🛠️ Resumen de Cambios Promovidos
* **[Módulo 1]**: [Cambios agrupados]
* **[Módulo 2]**: [Cambios agrupados]

---

## 🧪 Pruebas y Validación Realizadas
- [Validaciones de despliegue en nube (Vercel/Render)]
- [Pruebas de comunicación integrada sin errores de CORS]
```
