const XLSX = require("C:/tmp/xlsx_gen/node_modules/xlsx");

const rows = [
  ["Campo", "Path en payload", "Categoría", "Tipo", "Requerido", "Origen", "Ejemplo"],

  // VISIT BASE
  ["uuid", "visit.uuid", "Visit (base)", "string", "Sí", "OpenMRS", "549e5078-ec89-..."],
  ["display", "visit.display", "Visit (base)", "string", "No", "OpenMRS", "Consulta Ambulatoria @ UPSS..."],
  ["startDatetime", "visit.startDatetime", "Visit (base)", "date", "Sí", "OpenMRS", "2026-03-25T10:37:40.000+0000"],
  ["stopDatetime", "visit.stopDatetime", "Visit (base)", "date | null", "No", "OpenMRS", "2026-03-25T15:37:42.000+0000"],

  // PATIENT (ref OpenMRS)
  ["patient.uuid", "visit.patient.uuid", "Paciente (ref)", "string", "Sí", "OpenMRS", "26cdcb17-2226-..."],
  ["patient.display", "visit.patient.display", "Paciente (ref)", "string", "Sí", "OpenMRS", "58147747 - Ignacio TORRES CUETO"],

  // PATIENT DETAILS (enriquecido)
  ["fecha_nacimiento", "visit.patient_details.fecha_nacimiento", "Paciente (detalle)", "date", "Sí", "OpenMRS (GET /patient)", "1990-06-15"],
  ["sexo", "visit.patient_details.sexo", "Paciente (detalle)", "M | F", "Sí", "OpenMRS (GET /patient)", "M"],
  ["nombres", "visit.patient_details.nombres", "Paciente (detalle)", "string", "Sí", "OpenMRS (GET /patient)", "IGNACIO"],
  ["apellido_paterno", "visit.patient_details.apellido_paterno", "Paciente (detalle)", "string", "Sí", "OpenMRS (GET /patient)", "TORRES"],
  ["apellido_materno", "visit.patient_details.apellido_materno", "Paciente (detalle)", "string", "Sí", "OpenMRS (GET /patient)", "CUETO"],
  ["documento_identidad", "visit.patient_details.documento_identidad", "Paciente (detalle)", "string", "Sí", "OpenMRS (GET /patient)", "58147747"],
  ["tipo_documento", "visit.patient_details.tipo_documento", "Paciente (detalle)", "string", "Sí", "OpenMRS (GET /patient)", "DNI"],

  // VISIT TYPE
  ["visitType.uuid", "visit.visitType.uuid", "Tipo visita", "string", "Sí", "OpenMRS", "b1f0e8a1-..."],
  ["visitType.display", "visit.visitType.display", "Tipo visita", "string", "Sí", "OpenMRS", "Consulta Ambulatoria"],

  // LOCATION
  ["location.uuid", "visit.location.uuid", "Ubicación", "string", "Sí", "OpenMRS", "35d2234e-..."],
  ["location.display", "visit.location.display", "Ubicación", "string", "Sí", "OpenMRS", "UPSS - CONSULTA EXTERNA"],

  // ENCOUNTERS
  ["encounters[].uuid", "visit.encounters[].uuid", "Encuentros", "string", "Sí", "OpenMRS", "65f6330d-..."],
  ["encounters[].display", "visit.encounters[].display", "Encuentros", "string", "Sí", "OpenMRS", "Notas de Atención 25/03/2026"],

  // ATTRIBUTES
  ["attributes[]", "visit.attributes[]", "Atributos visita", "unknown[]", "No", "OpenMRS", "[]"],

  // FUA: Admin SIS
  ["numero_fua", "visit.fua.numero_fua", "FUA - Admin SIS", "string", "Sí", "Externo (SIS)", "001-00234"],
  ["lote", "visit.fua.lote", "FUA - Admin SIS", "string", "No", "Externo (SIS)", "26"],
  ["fecha_digitacion", "visit.fua.fecha_digitacion", "FUA - Admin SIS", "date", "Sí", "Externo (sistema)", "2026-03-26"],

  // FUA: IPRESS
  ["ipress.codigo_renipress", "visit.fua.ipress.codigo_renipress", "FUA - IPRESS", "string", "Sí", "Externo (config IPRESS)", "00000066"],
  ["ipress.nombre", "visit.fua.ipress.nombre", "FUA - IPRESS", "string", "Sí", "Externo (config IPRESS)", "HOSPITAL II-1 SANTA CLOTILDE"],
  ["ipress.nivel_atencion", "visit.fua.ipress.nivel_atencion", "FUA - IPRESS", "I | II | III", "Sí", "Externo (config IPRESS)", "II"],
  ["ipress.categoria", "visit.fua.ipress.categoria", "FUA - IPRESS", "string (I-1..III-E)", "Sí", "Externo (config IPRESS)", "II-1"],
  ["ipress.codigo_oferta_flexible", "visit.fua.ipress.codigo_oferta_flexible", "FUA - IPRESS", "string", "No", "Externo (config IPRESS)", ""],

  // FUA: Prestacional
  ["codigo_prestacional", "visit.fua.codigo_prestacional", "FUA - Prestacional", "string", "Sí", "Externo (catálogo MINSA)", "301"],
  ["codigos_prestacionales_adicionales", "visit.fua.codigos_prestacionales_adicionales", "FUA - Prestacional", "string[]", "No", "Externo (catálogo MINSA)", "[]"],
  ["ups", "visit.fua.ups", "FUA - Prestacional", "string", "No", "Externo (config IPRESS)", "001"],
  ["fua_vinculado", "visit.fua.fua_vinculado", "FUA - Prestacional", "string", "No", "Externo (SIS)", ""],
  ["reporte_vinculado", "visit.fua.reporte_vinculado", "FUA - Prestacional", "string", "No", "Externo (SIS)", ""],

  // FUA: Asegurado SIS
  ["asegurado_sis.codigo_asegurado", "visit.fua.asegurado_sis.codigo_asegurado", "FUA - Asegurado SIS", "string", "No", "Externo (BD SIS)", "7-58147747"],
  ["asegurado_sis.diresa", "visit.fua.asegurado_sis.diresa", "FUA - Asegurado SIS", "string", "No", "Externo (BD SIS)", "166"],
  ["asegurado_sis.contrato", "visit.fua.asegurado_sis.contrato", "FUA - Asegurado SIS", "string", "No", "Externo (BD SIS)", "S.I.S"],

  // FUA: Condición paciente
  ["condicion.gestante", "visit.fua.condicion.gestante", "FUA - Condición", "boolean", "No", "Derivable (obs encounter)", "false"],
  ["condicion.puerpera", "visit.fua.condicion.puerpera", "FUA - Condición", "boolean", "No", "Derivable (obs encounter)", "false"],
  ["condicion.hospitalizado", "visit.fua.condicion.hospitalizado", "FUA - Condición", "boolean", "No", "Derivable (visitType)", "false"],

  // FUA: Hospitalización
  ["hospitalizacion.fecha_ingreso", "visit.fua.hospitalizacion.fecha_ingreso", "FUA - Hospitalización", "date | null", "No", "Externo (admin)", "null"],
  ["hospitalizacion.atencion_directa", "visit.fua.hospitalizacion.atencion_directa", "FUA - Hospitalización", "boolean", "No", "Externo (admin)", "false"],
  ["hospitalizacion.cob_extraordinaria", "visit.fua.hospitalizacion.cob_extraordinaria", "FUA - Hospitalización", "boolean", "No", "Externo (admin)", "false"],
  ["hospitalizacion.monto_cob", "visit.fua.hospitalizacion.monto_cob", "FUA - Hospitalización", "number | null", "No", "Externo (admin)", "null"],
  ["hospitalizacion.carta_garantia", "visit.fua.hospitalizacion.carta_garantia", "FUA - Hospitalización", "boolean", "No", "Externo (admin)", "false"],
  ["hospitalizacion.monto_carta", "visit.fua.hospitalizacion.monto_carta", "FUA - Hospitalización", "number | null", "No", "Externo (admin)", "null"],
  ["hospitalizacion.traslado", "visit.fua.hospitalizacion.traslado", "FUA - Hospitalización", "boolean", "No", "Externo (admin)", "false"],
  ["hospitalizacion.sepelio", "visit.fua.hospitalizacion.sepelio", "FUA - Hospitalización", "boolean", "No", "Externo (admin)", "false"],

  // FUA: Destino
  ["destino_asegurado", "visit.fua.destino_asegurado", "FUA - Destino", "enum | undefined", "No", "Externo (alta médica)", "ALTA"],

  // FUA: Referencia
  ["referencia.ipress_origen_codigo", "visit.fua.referencia.ipress_origen_codigo", "FUA - Referencia", "string", "No", "Externo (sist. referencias)", ""],
  ["referencia.ipress_origen_nombre", "visit.fua.referencia.ipress_origen_nombre", "FUA - Referencia", "string", "No", "Externo (sist. referencias)", ""],
  ["referencia.numero_hoja_referencia", "visit.fua.referencia.numero_hoja_referencia", "FUA - Referencia", "string", "No", "Externo (sist. referencias)", ""],
  ["referencia.ipress_destino_codigo", "visit.fua.referencia.ipress_destino_codigo", "FUA - Referencia", "string", "No", "Externo (sist. referencias)", ""],
  ["referencia.ipress_destino_nombre", "visit.fua.referencia.ipress_destino_nombre", "FUA - Referencia", "string", "No", "Externo (sist. referencias)", ""],

  // FUA: Responsable atención
  ["responsable_atencion.dni", "visit.fua.responsable_atencion.dni", "FUA - Profesional", "string", "No", "Externo (registro IPRESS)", "43218765"],
  ["responsable_atencion.tipo_profesional", "visit.fua.responsable_atencion.tipo_profesional", "FUA - Profesional", "number", "No", "Externo (registro IPRESS)", "1"],
  ["responsable_atencion.colegiatura", "visit.fua.responsable_atencion.colegiatura", "FUA - Profesional", "string", "No", "Externo (registro IPRESS)", "CMP-12345"],
  ["responsable_atencion.especialidad", "visit.fua.responsable_atencion.especialidad", "FUA - Profesional", "string", "No", "Externo (registro IPRESS)", "Medicina General"],
  ["responsable_atencion.rne", "visit.fua.responsable_atencion.rne", "FUA - Profesional", "string", "No", "Externo (registro IPRESS)", ""],

  // FUA: Diagnósticos
  ["diagnosticos[].posicion", "visit.fua.diagnosticos[].posicion", "FUA - Diagnósticos", "number", "Sí", "OpenMRS (encounter.diagnoses)", "1"],
  ["diagnosticos[].descripcion", "visit.fua.diagnosticos[].descripcion", "FUA - Diagnósticos", "string", "No", "OpenMRS (encounter.diagnoses)", "RINOFARINGITIS AGUDA"],
  ["diagnosticos[].codigo_cie10", "visit.fua.diagnosticos[].codigo_cie10", "FUA - Diagnósticos", "string", "Sí", "OpenMRS (encounter.diagnoses)", "J00"],
  ["diagnosticos[].tipo", "visit.fua.diagnosticos[].tipo", "FUA - Diagnósticos", "enum", "Sí", "OpenMRS (encounter.diagnoses)", "DEFINITIVO"],

  // FUA: Medicamentos
  ["medicamentos[].codigo_sismed", "visit.fua.medicamentos[].codigo_sismed", "FUA - Medicamentos", "string", "Sí", "Externo (farmacia/SISMED)", "010101"],
  ["medicamentos[].nombre", "visit.fua.medicamentos[].nombre", "FUA - Medicamentos", "string", "Sí", "Externo (farmacia/SISMED)", "PARACETAMOL 500MG TAB"],
  ["medicamentos[].forma_terapeutica", "visit.fua.medicamentos[].forma_terapeutica", "FUA - Medicamentos", "string", "Sí", "Externo (farmacia/SISMED)", "TAB"],
  ["medicamentos[].cantidad", "visit.fua.medicamentos[].cantidad", "FUA - Medicamentos", "number", "Sí", "Externo (farmacia/SISMED)", "10"],

  // FUA: Insumos
  ["insumos[].codigo_sismed", "visit.fua.insumos[].codigo_sismed", "FUA - Insumos", "string", "Sí", "Externo (farmacia/SISMED)", "090201"],
  ["insumos[].nombre", "visit.fua.insumos[].nombre", "FUA - Insumos", "string", "Sí", "Externo (farmacia/SISMED)", "GUANTE DESCARTABLE"],
  ["insumos[].cantidad", "visit.fua.insumos[].cantidad", "FUA - Insumos", "number", "Sí", "Externo (farmacia/SISMED)", "2"],

  // FUA: Procedimientos
  ["procedimientos[].codigo_cpms", "visit.fua.procedimientos[].codigo_cpms", "FUA - Procedimientos", "string", "Sí", "Externo (catálogo CPMS)", "40101"],
  ["procedimientos[].nombre", "visit.fua.procedimientos[].nombre", "FUA - Procedimientos", "string", "Sí", "Externo (catálogo CPMS)", "HEMOGRAMA COMPLETO"],
  ["procedimientos[].cantidad_indicada", "visit.fua.procedimientos[].cantidad_indicada", "FUA - Procedimientos", "number", "Sí", "Externo (catálogo CPMS)", "1"],
  ["procedimientos[].cantidad_ejecutada", "visit.fua.procedimientos[].cantidad_ejecutada", "FUA - Procedimientos", "number", "Sí", "Externo (catálogo CPMS)", "1"],
  ["procedimientos[].resultado", "visit.fua.procedimientos[].resultado", "FUA - Procedimientos", "string", "No", "Externo (catálogo CPMS)", "NORMAL"],

  // FUA: Sub componente prestacional
  ["sub_componente_prestacional.medicamentos_monto", "visit.fua.sub_componente_prestacional.medicamentos_monto", "FUA - Sub componente", "number", "No", "Externo (cálculo SIS)", "0"],
  ["sub_componente_prestacional.insumos_monto", "visit.fua.sub_componente_prestacional.insumos_monto", "FUA - Sub componente", "number", "No", "Externo (cálculo SIS)", "0"],
  ["sub_componente_prestacional.procedimientos_monto", "visit.fua.sub_componente_prestacional.procedimientos_monto", "FUA - Sub componente", "number", "No", "Externo (cálculo SIS)", "0"],
];

const ws = XLSX.utils.aoa_to_sheet(rows);

ws["!cols"] = [
  { wch: 42 },
  { wch: 58 },
  { wch: 22 },
  { wch: 22 },
  { wch: 10 },
  { wch: 30 },
  { wch: 38 },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Estructura Payload");
XLSX.writeFile(wb, "C:/Users/ElNicolays/Documents/GitHub/NuevoSeed/Generador-de-FUA/docs/visit_payload_structure.xlsx");
console.log("Excel generado: docs/visit_payload_structure.xlsx");