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

## Configuración de seguridad

El proceso requiere `TOKEN`, `SECRET_KEY`, `ENCRYPTION_KEY` y `HMAC_SECRET`.
Usa valores aleatorios e independientes, no los incluyas en el repositorio y
conserva `ENCRYPTION_KEY` mientras existan payloads cifrados en la base de
datos. Consulta `example.env` para el resto de variables.

Antes de actualizar una instalación existente, conserva la clave con la que
se cifraron sus payloads. Las instalaciones que dependían de la antigua clave
por defecto necesitan una migración de datos antes de rotarla.

El servidor solo empieza a escuchar después de autenticar PostgreSQL y crear
las tablas que falten. El arranque no elimina ni altera tablas existentes.
`GET /health` devuelve `200` únicamente cuando la conexión a PostgreSQL está
disponible.

Todas las rutas bajo `/ws` y los endpoints administrativos requieren el
header `fuagentoken` con el valor configurado en `TOKEN`. `/`, `/health` y el
render de demostración `/demo` permanecen públicos.
