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
## Errores de validación de formatos FUA

La creación, edición y renderización validan el JSONC y los campos comunes del
formato, páginas, secciones y campos antes de persistir o renderizar. Un
`versionTag` numérico, por ejemplo `11`, se rechaza con HTTP 422; debe enviarse
como texto (`"11"`). `versionNumber` sigue siendo numérico. La validación conserva
las propiedades adicionales de presentación y no convierte valores en silencio.

La respuesta identifica el campo sin incluir el valor enviado ni una traza:

```json
{
  "error": "INVALID_FUA_FORMAT",
  "message": "El formato FUA contiene campos inválidos.",
  "details": [{
    "path": ["pages", 0, "versionTag"],
    "code": "invalid_type",
    "message": "Se esperaba string; se recibió number."
  }]
}
```

Las ediciones inválidas se rechazan antes de abrir una transacción. Una edición
válida espera el commit antes de responder éxito; un fallo posterior al inicio
espera el rollback. Esto no sustituye el diseño existente de transacciones
compartidas ni acredita aislamiento entre solicitudes concurrentes.

Al acceder a través de OpenMRS, el módulo FUA también debe conservar el 422 y
reconstruir una respuesta segura; el gateway debe conservar los errores de esa
API. Cambiar solo el generador no elimina la página de arranque de un proxy que
sustituye errores. La respuesta de render para fallos inesperados es un 500
con mensaje genérico; el formato original no se modifica automáticamente.
