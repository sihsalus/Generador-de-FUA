/**
 * ————————————————————————————————————————————————————————————————
 * GUÍA DE INTEGRACIÓN — ScriptExecutor en el proyecto FUA Generator
 * ————————————————————————————————————————————————————————————————
 *
 * Este archivo muestra ejemplos reales de uso con FUA y entidades
 * del proyecto. No se importa en producción — es solo referencia.
 */

// ———————————————————————————————————————————————————————————————
// 1. EJEMPLO: Actualizar FUAFormat desde visita OpenMRS
// ———————————————————————————————————————————————————————————————

/*
  Caso: Tienes un FUAFormat (entidad) y recibes datos FHIR (payload).
  El script define QUÉ campos se actualizan.

  --- Script almacenado en BD (name: "fua_desde_visita") ---

  entity.pacienteNombre = payload.patient.name;
  entity.pacienteDNI = payload.patient.identifier;
  entity.fechaAtencion = payload.encounter.date;
  entity.diagnostico = payload.conditions[0].code;
  // entity.procedimiento = payload.procedures[0].code;
  // entity.medicamentos = payload.medications.map(m => m.name).join(', ');
  entity.establecimiento = payload.location.name;

  --- Llamada API ---

  POST /ws/entity-script/execute/1
  {
    "entity": {
      "pacienteNombre": "",
      "pacienteDNI": "",
      "fechaAtencion": "",
      "diagnostico": "",
      "procedimiento": "",
      "medicamentos": "",
      "establecimiento": ""
    },
    "payload": {
      "patient": {
        "name": "María García López",
        "identifier": "45678912"
      },
      "encounter": {
        "date": "2025-04-01"
      },
      "conditions": [{ "code": "J06.9", "display": "Infección respiratoria aguda" }],
      "procedures": [{ "code": "99213", "display": "Consulta ambulatoria" }],
      "medications": [
        { "name": "Paracetamol 500mg" },
        { "name": "Amoxicilina 500mg" }
      ],
      "location": {
        "name": "C.S. Santa Clotilde"
      }
    }
  }

  --- Respuesta ---

  {
    "success": true,
    "entity": {
      "pacienteNombre": "María García López",
      "pacienteDNI": "45678912",
      "fechaAtencion": "2025-04-01",
      "diagnostico": "J06.9",
      "procedimiento": "",           // ← no se tocó (línea comentada)
      "medicamentos": "",             // ← no se tocó (línea comentada)
      "establecimiento": "C.S. Santa Clotilde"
    },
    "executionTimeMs": 3,
    "executedLines": 5
  }

  Después, para incluir procedimientos y medicamentos,
  solo descomentas esas líneas en el script (PUT /ws/entity-script/1).
  El payload sigue siendo el mismo.
*/

// ———————————————————————————————————————————————————————————————
// 2. EJEMPLO: Uso directo en un Service (sin HTTP)
// ———————————————————————————————————————————————————————————————

import { ScriptExecutorService } from "./ScriptExecutorService";

function ejemploUsoDirecto() {
  const fuaEntity = {
    numero: "FUA-2025-00142",
    paciente: { nombre: "", dni: "", edad: 0 },
    atencion: { fecha: "", hora: "", tipo: "" },
    diagnosticos: [] as string[],
    estado: "BORRADOR",
  };

  const payload = {
    nombreCompleto: "Carlos Ríos Mendoza",
    dni: "71234567",
    edad: 34,
    fechaVisita: "2025-04-01",
    horaVisita: "09:30",
    tipoAtencion: "CONSULTA_EXTERNA",
    codDiagnosticos: ["J06.9", "R50.9"],
  };

  const script = `
    entity.paciente.nombre = payload.nombreCompleto;
    entity.paciente.dni = payload.dni;
    entity.paciente.edad = payload.edad;
    entity.atencion.fecha = payload.fechaVisita;
    entity.atencion.hora = payload.horaVisita;
    // entity.atencion.tipo = payload.tipoAtencion;
    entity.diagnosticos = payload.codDiagnosticos;
    entity.estado = 'COMPLETADO';
  `;

  const result = ScriptExecutorService.execute({
    entity: fuaEntity,
    payload,
    script,
    maxChars: 2000,
    maxTimeMs: 500,
  });

  if (result.success) {
    console.log("FUA actualizado:", result.entity);
  } else {
    console.error("Error:", result.error);
  }
}

// ———————————————————————————————————————————————————————————————
// 3. EJEMPLO: Script con lógica condicional
// ———————————————————————————————————————————————————————————————

/*
  Los scripts no están limitados a asignaciones simples.
  Pueden tener lógica, siempre dentro de los límites de seguridad.

  --- Script ---

  entity.nombre = payload.nombres + ' ' + payload.apellidos;

  if (payload.edad >= 18) {
    entity.grupo = 'ADULTO';
  } else if (payload.edad >= 12) {
    entity.grupo = 'ADOLESCENTE';
  } else {
    entity.grupo = 'PEDIATRICO';
  }

  entity.cobertura = payload.tieneSeguro ? 'SIS' : 'PARTICULAR';

  // Mapear diagnósticos a formato FUA
  // entity.diagnosticos = payload.condiciones.map(function(c) {
  //   return { codigo: c.code, descripcion: c.display };
  // });

  entity.fechaRegistro = formatDate(Date.now());
*/

// ———————————————————————————————————————————————————————————————
// 4. USO CON BaseEntityVersion (integración natural)
// ———————————————————————————————————————————————————————————————

/*
  El sistema se complementa con BaseEntityVersion:
  - BaseEntityVersion guarda versiones del estado de una entidad
  - EntityScript define CÓMO se transforma la entidad
  - Al ejecutar un script → se genera una nueva versión

  Flujo sugerido en BaseEntityVersionService:

  async function updateEntityWithScript(entityId, scriptId, payload) {
    // 1. Obtener última versión de la entidad
    const currentVersion = await BaseEntityVersionService.getLatest(entityId);

    // 2. Obtener script
    const script = await EntityScriptModel.findByPk(scriptId);

    // 3. Ejecutar transformación
    const result = ScriptExecutorService.executeFromRecord(
      script,
      currentVersion.data,
      payload
    );

    if (!result.success) throw new Error(result.error);

    // 4. Guardar nueva versión
    await BaseEntityVersionService.create({
      entityId,
      data: result.entity,
      version: currentVersion.version + 1,
      scriptId: script.id,           // Trazabilidad
      scriptVersion: script.version,  // Qué versión del script se usó
    });

    return result.entity;
  }
*/
