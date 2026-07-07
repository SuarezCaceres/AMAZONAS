# Graph Report - AMAZONAS  (2026-07-07)

## Corpus Check
- 245 files · ~122,829 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 600 nodes · 1059 edges · 41 communities (27 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `015b1e25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_ChatServiceImpl|ChatServiceImpl]]
- [[_COMMUNITY_PurchaseRequestServiceImpl|PurchaseRequestServiceImpl]]
- [[_COMMUNITY_PurchaseRequestController|PurchaseRequestController]]
- [[_COMMUNITY_MyRequestsComponent|MyRequestsComponent]]
- [[_COMMUNITY_ChatComponent|ChatComponent]]
- [[_COMMUNITY_PurchaseRequest|PurchaseRequest]]
- [[_COMMUNITY_PurchaseRequestResponse|PurchaseRequestResponse]]
- [[_COMMUNITY_PresupuestosComponent|PresupuestosComponent]]
- [[_COMMUNITY_SolicitudesComponent|SolicitudesComponent]]
- [[_COMMUNITY_PaymentServiceImpl|PaymentServiceImpl]]
- [[_COMMUNITY_RequestFormComponent|RequestFormComponent]]
- [[_COMMUNITY_Especificación de Diseño Cancelación y Eliminación Física de Solicitudes|Especificación de Diseño: Cancelación y Eliminación Física de Solicitudes]]
- [[_COMMUNITY_ChatMessageRepository|ChatMessageRepository]]
- [[_COMMUNITY_PaymentModalComponent|PaymentModalComponent]]
- [[_COMMUNITY_ChatMessageResponse|ChatMessageResponse]]
- [[_COMMUNITY_BackendApplication.java|BackendApplication.java]]
- [[_COMMUNITY_PurchaseRequest.java|PurchaseRequest.java]]
- [[_COMMUNITY_🕸️ Graphify - Archivos Generados e Integración|🕸️ Graphify - Archivos Generados e Integración]]
- [[_COMMUNITY_KitCustomizedMaterial|KitCustomizedMaterial]]
- [[_COMMUNITY_KitMaqueta|KitMaqueta]]
- [[_COMMUNITY_KitPersonalMaterial|KitPersonalMaterial]]
- [[_COMMUNITY_RequestPreferredMaterial|RequestPreferredMaterial]]
- [[_COMMUNITY_EstadoSolicitud|EstadoSolicitud]]
- [[_COMMUNITY_KitMaquetaResponse|KitMaquetaResponse]]
- [[_COMMUNITY_KitCustomizedMaterialResponse|KitCustomizedMaterialResponse]]
- [[_COMMUNITY_KitPersonalMaterialResponse|KitPersonalMaterialResponse]]
- [[_COMMUNITY_RequestPreferredMaterialResponse|RequestPreferredMaterialResponse]]
- [[_COMMUNITY_EstadoSolicitud|EstadoSolicitud]]
- [[_COMMUNITY_.onCreate|.onCreate]]
- [[_COMMUNITY_.onUpdate|.onUpdate]]

## God Nodes (most connected - your core abstractions)
1. `PurchaseRequest` - 80 edges
2. `PresupuestosComponent` - 69 edges
3. `SolicitudesComponent` - 65 edges
4. `PurchaseRequestResponse` - 59 edges
5. `ChatComponent` - 55 edges
6. `ChatServiceImpl` - 38 edges
7. `PurchaseRequestServiceImpl` - 22 edges
8. `MyRequestsComponent` - 20 edges
9. `RequestFormComponent` - 19 edges
10. `PurchaseRequestRepository` - 18 edges

## Surprising Connections (you probably didn't know these)
- `ChatServiceImpl` --references--> `ChatMessageRepository`  [EXTRACTED]
  src/backend/src/main/java/com/amazonas/backend/modules/chat/service/impl/ChatServiceImpl.java → src/backend/src/main/java/com/amazonas/backend/modules/chat/repository/ChatMessageRepository.java
- `ChatServiceImpl` --references--> `PurchaseRequestRepository`  [EXTRACTED]
  src/backend/src/main/java/com/amazonas/backend/modules/chat/service/impl/ChatServiceImpl.java → src/backend/src/main/java/com/amazonas/backend/modules/requests/repository/PurchaseRequestRepository.java
- `PurchaseRequestResponse` --references--> `KitCustomizedMaterialResponse`  [EXTRACTED]
  src/backend/src/main/java/com/amazonas/backend/modules/requests/dto/PurchaseRequestResponse.java → src/frontend/src/app/models/purchase-request.model.ts
- `PurchaseRequestResponse` --references--> `KitMaquetaResponse`  [EXTRACTED]
  src/backend/src/main/java/com/amazonas/backend/modules/requests/dto/PurchaseRequestResponse.java → src/frontend/src/app/models/purchase-request.model.ts
- `PurchaseRequestResponse` --references--> `KitPersonalMaterialResponse`  [EXTRACTED]
  src/backend/src/main/java/com/amazonas/backend/modules/requests/dto/PurchaseRequestResponse.java → src/frontend/src/app/models/purchase-request.model.ts

## Import Cycles
- None detected.

## Communities (41 total, 14 thin omitted)

### Community 0 - "ChatServiceImpl"
Cohesion: 0.10
Nodes (30): ChatExtraRepository, ChatOffer, ChatOfferRepository, ChatRoom, ChatService, HtmlSanitizerService, SimpMessagingTemplate, ChatServiceImpl (+22 more)

### Community 1 - "PurchaseRequestServiceImpl"
Cohesion: 0.10
Nodes (24): BudgetRepository, EntityGraph, MaterialRepository, Page, Product, ProductRepository, EstadoSolicitud, Modifying (+16 more)

### Community 2 - "PurchaseRequestController"
Cohesion: 0.08
Nodes (20): DeleteMapping, GetMapping, PostMapping, Principal, PutMapping, ResponseEntity, RestController, EstadoSolicitud (+12 more)

### Community 3 - "MyRequestsComponent"
Cohesion: 0.07
Nodes (20): Injectable, EstadoSolicitud, KitCustomizedMaterialRequest, KitMaquetaRequest, KitPersonalMaterialRequest, MaterialPresupuestoDTO, MaterialSolicitadoDTO, PurchaseRequestRequest (+12 more)

### Community 4 - "ChatComponent"
Cohesion: 0.06
Nodes (5): ChatComponent, Component, Input, Output, ViewChild

### Community 5 - "PurchaseRequest"
Cohesion: 0.05
Nodes (3): Entity, PurchaseRequest, Table

### Community 7 - "PresupuestosComponent"
Cohesion: 0.05
Nodes (4): PresupuestosComponent, Component, Input, Output

### Community 8 - "SolicitudesComponent"
Cohesion: 0.06
Nodes (5): SolicitudesComponent, Component, Input, Output, ViewChild

### Community 9 - "PaymentServiceImpl"
Cohesion: 0.17
Nodes (15): DailyStatsResponse, DataSource, PaymentService, PaymentTransaction, PaymentTransactionRepository, PaymentTransactionResponse, PostConstruct, RegisterPaymentRequest (+7 more)

### Community 10 - "RequestFormComponent"
Cohesion: 0.12
Nodes (4): RequestFormComponent, Component, Input, Output

### Community 11 - "Especificación de Diseño: Cancelación y Eliminación Física de Solicitudes"
Cohesion: 0.15
Nodes (12): 1. Contexto y Requerimientos, 2.1. Exclusión de Soft-Delete en Repositorio, 2.2. Nuevo Endpoint en Controller, 2.3. Lógica del Servicio (`PurchaseRequestServiceImpl.java`), 2. Diseño del Backend, 3.1. Botón en "Mis Solicitudes" (`my-requests.component.html`), 3.2. Botón en Cabecera de Chat (`chat.component.html`), 3.3. Diálogo de Confirmación (+4 more)

### Community 12 - "ChatMessageRepository"
Cohesion: 0.33
Nodes (7): JpaRepository, ChatMessageRepository, ChatMessage, Modifying, Pageable, Query, Repository

### Community 13 - "PaymentModalComponent"
Cohesion: 0.17
Nodes (4): PaymentModalComponent, Component, Input, Output

### Community 15 - "BackendApplication.java"
Cohesion: 0.33
Nodes (6): Bean, CommandLineRunner, EnableCaching, JdbcTemplate, SpringBootApplication, BackendApplication

### Community 16 - "PurchaseRequest.java"
Cohesion: 0.25
Nodes (4): Budget, SQLDelete, SQLRestriction, User

### Community 21 - "🕸️ Graphify - Archivos Generados e Integración"
Cohesion: 0.40
Nodes (4): 1. Archivos en la Raíz del Proyecto, 2. Archivos de Salida y Reportes (Carpeta `src/graphify-out/`), 3. Integración Continua (Hooks de Git), 🕸️ Graphify - Archivos Generados e Integración

## Knowledge Gaps
- **22 isolated node(s):** `1. Archivos en la Raíz del Proyecto`, `2. Archivos de Salida y Reportes (Carpeta `src/graphify-out/`)`, `3. Integración Continua (Hooks de Git)`, `Requerimientos Clave:`, `2.1. Exclusión de Soft-Delete en Repositorio` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PurchaseRequest` connect `PurchaseRequest` to `ChatServiceImpl`, `PurchaseRequestServiceImpl`, `EstadoSolicitud`, `.onCreate`, `.onUpdate`, `PurchaseRequest.java`, `KitCustomizedMaterial`, `KitMaqueta`, `KitPersonalMaterial`, `RequestPreferredMaterial`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `PresupuestosComponent` connect `PresupuestosComponent` to `MyRequestsComponent`, `.abrirModalAdelanto`, `.agregarMaterial`, `.loadSolicitudData`, `.ngOnInit`, `.saveKits`, `.guardarPresupuesto`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `SolicitudesComponent` connect `SolicitudesComponent` to `ChatServiceImpl`, `MyRequestsComponent`, `.abrirModalCancelacion`, `.addPreloadedFile`, `.clearPreloadedFiles`, `ChatMessageResponse`, `.loadSolicitudes`, `.onConfirmarPagoDesdeChat`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **What connects `1. Archivos en la Raíz del Proyecto`, `2. Archivos de Salida y Reportes (Carpeta `src/graphify-out/`)`, `3. Integración Continua (Hooks de Git)` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ChatServiceImpl` be split into smaller, more focused modules?**
  _Cohesion score 0.0955837870538415 - nodes in this community are weakly interconnected._
- **Should `PurchaseRequestServiceImpl` be split into smaller, more focused modules?**
  _Cohesion score 0.09929078014184398 - nodes in this community are weakly interconnected._
- **Should `PurchaseRequestController` be split into smaller, more focused modules?**
  _Cohesion score 0.08156028368794327 - nodes in this community are weakly interconnected._