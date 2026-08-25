# Generador de FUA - Servidor FHIR R4

Este proyecto es una API en Node.js (Express) construida con TypeScript que genera **Formatos Únicos de Atención (FUA)** en formato **FHIR R4**. Está diseñado para integrarse parcialmente con OpenMRS, aunque usa su propia base de datos PostgreSQL.

---

## 🚀 Tecnologías principales

- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Sequelize](https://sequelize.org/) + PostgreSQL
- [FHIR R4](https://www.hl7.org/fhir/) (validador local)
- [fhir](https://www.npmjs.com/package/fhir) para validación de recursos

---

## 🏗 Estructura del proyecto


# Versiones de otros:
- Postgre SQL:  docker run --name sih-salus-fua-db -e POSTGRES_USER=fuagenerator -e POSTGRES_PASSWORD=fuagenerator  -e POSTGRES_DB=fuagenerator -p 5433:5432 -d postgres:15

Test

## Configuración de PostgreSQL

El servicio usa las variables canónicas sin intercambiar sus significados:

| Variable | Uso |
| --- | --- |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `DB_HOST` | Host de PostgreSQL |
| `DB_PORT` | Puerto de PostgreSQL |

El arranque sincroniza únicamente las tablas faltantes. Nunca elimina ni
recrea tablas existentes.

## Salud del servicio

`GET /health` comprueba también la conexión con PostgreSQL:

- devuelve `200` con `{ "status": "ok" }` cuando la aplicación y la base
  están disponibles;
- devuelve `503` con `{ "status": "unavailable" }` cuando PostgreSQL no
  está disponible, sin exponer detalles internos.

El entorno local puede iniciarse con `docker compose up --build` y espera a
que PostgreSQL esté listo antes de iniciar la aplicación.
