# CLAUDE.md — Generador de FUA

Módulo que genera FUA (Formato Único de Atención) a partir de la versión de referencia de OpenMRS para SIH SALUS.
Parte del proyecto PROYECTO-SANTACLOTILDE / PeruHCE.

---

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **ORM:** Sequelize 6
- **Base de datos:** PostgreSQL 15
- **Validación:** Zod
- **PDF:** Puppeteer + pdf-lib
- **FHIR:** fhir-kit-client (conexión con OpenMRS)
- **Tests:** Jest + ts-jest
- **Contenedores:** Docker + docker-compose

---

## Comandos

```bash
npm run dev          # Desarrollo con nodemon
npm run start        # Producción con ts-node
npm run build        # Compilar TypeScript
npm test             # Ejecutar tests con Jest
npm run migrate      # Ejecutar migraciones Sequelize
npm run seed         # Ejecutar seeders
docker compose up    # Levantar app + PostgreSQL
```

---

## Estructura del proyecto

```
src/
├── index.ts                  # Punto de entrada Express (puerto 3000)
├── config/                   # Configuración DB por entorno
├── controllers/              # Parsean request, validan, delegan al service
│   ├── FUAFromVisitController.ts
│   ├── FUAFromVisitPDFController.ts
│   ├── FUAFormatFromSchemaController.ts
│   └── BaseEntityVersionController.ts
├── services/                 # Lógica de negocio
│   ├── FUAFromVisitService.ts
│   ├── FUAFromVisitPDFService.ts
│   ├── FUAFormatFromSchemaService.ts
│   ├── BaseEntityVersionService.ts
│   ├── fhirService.ts        # Conexión con OpenMRS FHIR API
│   └── UserService.ts
├── routes/                   # Definición de endpoints (prefijo /ws)
│   ├── indexRoutes.ts         # Router global
│   ├── FUAFromVisitRouter.ts
│   ├── FUAFromVisitPDFRoutes.ts
│   ├── FUAFormatFromSchemaRoutes.ts
│   └── BaseEntityVersionRoutes.ts
├── implementation/sequelize/  # Implementaciones de acceso a datos (patrón repository)
├── modelsSequelize/           # Modelos Sequelize (ORM)
├── modelsTypeScript/          # Interfaces y tipos puros (BaseEntity, FUAFormat, FUAPage, etc.)
├── middleware/                # Auth, logger, multer, encriptación
├── utils/                     # Helpers (PDF signing, encryption, zip)
├── fhir/                      # Recursos FHIR
└── public/                    # HTML estático (FUA_Previsualization.html)
```

---

## Endpoints principales

Todos bajo prefijo `/ws`:

| Ruta | Descripción |
|---|---|
| `/ws/FUAFormat` | CRUD de formatos FUA desde schema |
| `/ws/FUAFromVisit` | Genera FUA a partir de una visita |
| `/ws/FUAFromVisitPDF` | Genera FUA en PDF |
| `/ws/BaseEntityVersion` | Versionado de entidades base |

Rutas adicionales en `index.ts`:
- `GET /patient/:id` — Obtener paciente desde OpenMRS FHIR
- `GET /demo` — Demo de generación de formato
- `GET /demopdf` — Demo de generación PDF con firma hash
- `POST /demoZipTxt` — Demo de generación de archivos TXT encriptados en ZIP
- `POST /zip-decrypt` — Desencriptar archivo ZIP

---

## Base de datos

- **PostgreSQL 15** vía docker-compose (puerto externo 5433, interno 5432)
- Sequelize con `sync({ force: true })` en desarrollo (recrea tablas al arrancar)
- Variables de entorno: `FuaGen_DB__USER`, `FuaGen_DB_PASSWORD`, `FuaGen_DB_NAME`

---

## Decisiones del proyecto

- Los modelos Sequelize están en JS (`modelsSequelize/`), los tipos TypeScript puros en `modelsTypeScript/`
- La capa de acceso a datos usa patrón implementation/repository en `implementation/sequelize/`
- PDF generado con Puppeteer (HTML → PDF) y firmado con hash en metadata vía pdf-lib
- Encriptación de datos en FUAFromVisit
- Logger custom con niveles, tipos y salida a terminal/archivo/DB
