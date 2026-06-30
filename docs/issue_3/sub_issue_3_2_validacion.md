# 📑 Sub-issue 3.2: Presentación y validación del boceto UX con el equipo de desarrollo

## 🎯 Objetivo
Validar la viabilidad técnica del diseño UX propuesto para el selector de maquetas y materiales con el equipo de desarrollo de frontend y backend, consolidando el feedback y los acuerdos antes del inicio del desarrollo.

## 📋 Lista de Tareas
- [ ] **Presentación del boceto:** Exponer los flujos de pantalla y los controles visuales.
- [ ] **Discusión de limitantes técnicas:**
  - Estructura de datos requerida del backend (Endpoint de maquetas, endpoint de materiales con precios vigentes).
  - Rendimiento en el renderizado al agregar múltiples materiales.
- [ ] **Consolidación del feedback y firmas de aprobación técnica.**

## 💬 Bitácora de Reuniones y Acuerdos

| Fecha | Participantes (Roles) | Observación / Comentario | Acuerdo | Estado |
| :--- | :--- | :--- | :--- | :--- |
| --/--/-- | Frontend, Backend, UX | *Ejemplo: La carga de imágenes de maquetas debe estar paginada.* | Se usará scroll infinito o buscador reactivo con límite de 10 ítems. | 🟡 Pendiente |
| --/--/-- | Frontend, Backend, UX | *Ejemplo: Validación de stock de materiales en tiempo real.* | El stock se validará al momento de añadir y al intentar guardar. | 🟡 Pendiente |

## ⚠️ Puntos Críticos a Validar
1. **Control de concurrencia:** Qué sucede si dos cajeros seleccionan el mismo material sin stock simultáneamente.
2. **Compatibilidad móvil:** El selector debe adaptarse a resoluciones móviles si se usa una tablet en caja física.
