// RC_01 — Validación de código prestacional, atributos del paciente y rango de edad
//
// Entrada (payload):
//   payload.fua            → bloque fua del VisitPayload
//   payload.patient_details → datos demográficos del paciente
//   payload.edad_calculada  → { anios, meses, dias, total_dias }
//
// Salida (entity):
//   entity.rule_id, entity.rule_name, entity.passed, entity.action, entity.message

// ---------------------------------------------------------------------------
// Tabla de códigos prestacionales admisibles para RC_01
// Columnas:
//   sexo:           "A" (ambos) | "F" | "M"
//   hospitalizacion:"S" | "N"
//   gestante:       "S" | "N"
//   puerpera:       "S" | "N"
//   ni_gest_puerp:  "S" | "N"  (derivado: ni gestante ni puérpera)
//   edad_min:       número en la unidad indicada
//   edad_max:       número en la unidad indicada (comparar como < edad_max + 1)
//   unidad:         "dias" | "meses" | "anios"
// ---------------------------------------------------------------------------
var TABLA_RC01 = [
  { cod: "301", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 11,  unidad: "anios" },
  { cod: "302", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 12, edad_max: 17,  unidad: "anios" },
  { cod: "303", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 18, edad_max: 29,  unidad: "anios" },
  { cod: "304", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 30, edad_max: 59,  unidad: "anios" },
  { cod: "305", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 60, edad_max: 120, unidad: "anios" },
  { cod: "306", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "N", edad_min: 9,  edad_max: 59,  unidad: "anios" },
  { cod: "002", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 28,  unidad: "dias"  },
  { cod: "029", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 12,  unidad: "meses" },
  { cod: "001", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 4,   unidad: "anios" },
  { cod: "118", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 5,  edad_max: 9,   unidad: "anios" },
  { cod: "119", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 10, edad_max: 11,  unidad: "anios" },
  { cod: "016", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 35,  unidad: "meses" },
  { cod: "007", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 11,  unidad: "anios" },
  { cod: "005", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 11,  unidad: "anios" },
  { cod: "008", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 2,  edad_max: 120, unidad: "anios" },
  { cod: "019", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "017", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 12, edad_max: 17,  unidad: "anios" },
  { cod: "020", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "021", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 6,  edad_max: 120, unidad: "meses" },
  { cod: "022", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "009", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "010", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "011", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "023", sexo: "M", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 50, edad_max: 75,  unidad: "anios" },
  { cod: "025", sexo: "F", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 20, edad_max: 120, unidad: "anios" },
  { cod: "013", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "015", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "024", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 25, edad_max: 65,  unidad: "anios" },
  { cod: "018", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "902", sexo: "F", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 18, edad_max: 45,  unidad: "anios" },
  { cod: "903", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 60, edad_max: 120, unidad: "anios" },
  { cod: "904", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 18, edad_max: 59,  unidad: "anios" },
  { cod: "911", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "050", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 2,   unidad: "dias"  },
  { cod: "051", sexo: "A", hospitalizacion: "S", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 28,  unidad: "dias"  },
  { cod: "052", sexo: "A", hospitalizacion: "S", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 28,  unidad: "dias"  },
  { cod: "054", sexo: "F", hospitalizacion: "S", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "055", sexo: "F", hospitalizacion: "S", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "906", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "056", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "057", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "058", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "059", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "060", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "075", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "061", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "062", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "063", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "064", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "065", sexo: "A", hospitalizacion: "S", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 29, edad_max: 120, unidad: "dias"  },
  { cod: "066", sexo: "A", hospitalizacion: "S", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 29, edad_max: 120, unidad: "dias"  },
  { cod: "067", sexo: "A", hospitalizacion: "S", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 29, edad_max: 120, unidad: "dias"  },
  { cod: "068", sexo: "A", hospitalizacion: "S", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "069", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "070", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "027", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 12,  unidad: "meses" },
  { cod: "053", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 19,  unidad: "anios" },
  { cod: "074", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 10, edad_max: 120, unidad: "anios" },
  { cod: "S01", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "026", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "071", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "901", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "908", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "300", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "200", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "900", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 60, edad_max: 120, unidad: "anios" },
  { cod: "111", sexo: "F", hospitalizacion: "S", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "117", sexo: "A", hospitalizacion: "N", gestante: "S", puerpera: "S", ni_gest_puerp: "S", edad_min: 0,  edad_max: 120, unidad: "anios" },
  { cod: "112", sexo: "F", hospitalizacion: "N", gestante: "S", puerpera: "N", ni_gest_puerp: "N", edad_min: 9,  edad_max: 60,  unidad: "anios" },
  { cod: "116", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 0,  edad_max: 28,  unidad: "dias"  },
  { cod: "113", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 29, edad_max: 11,  unidad: "anios" },
  { cod: "114", sexo: "A", hospitalizacion: "N", gestante: "N", puerpera: "N", ni_gest_puerp: "S", edad_min: 12, edad_max: 120, unidad: "anios" },
];

// CIE-10 que convierten hospitalización a "S" cuando el código es 306
var CIE10_PARTO = ["O800","O8000","O8001","O801","O808","O809","O840","O841","O842","O848","O849"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esMenorQue(edad_calculada, max, unidad) {
    if (unidad === "anios")  return edad_calculada.anios  < max + 1;
    if (unidad === "meses")  return edad_calculada.meses  < max + 1;  // meses cumplidos
    if (unidad === "dias")   return edad_calculada.total_dias < max + 1;
    return false;
}

function esMayorIgualQue(edad_calculada, min, unidad) {
    if (unidad === "anios")  return edad_calculada.anios  >= min;
    if (unidad === "meses")  return edad_calculada.meses  >= min;
    if (unidad === "dias")   return edad_calculada.total_dias >= min;
    return false;
}

function sexoCoincide(sexo_tabla, sexo_paciente) {
    if (sexo_tabla === "A") return true;
    // sexo_paciente viene como "M" o "F"
    return sexo_tabla === sexo_paciente;
}

// ---------------------------------------------------------------------------
// Lógica principal
// ---------------------------------------------------------------------------

var cod = payload.fua.codigo_prestacional;
var fila = null;
for (var i = 0; i < TABLA_RC01.length; i++) {
    if (TABLA_RC01[i].cod === cod) { fila = TABLA_RC01[i]; break; }
}

// 1. Código no admisible
if (!fila) {
    entity.rule_id   = "RC_01";
    entity.rule_name = "Consistencia de registro de prestaciones por edad, sexo y condiciones del asegurado.";
    entity.passed    = false;
    entity.action    = "BLOCK";
    entity.message   = "Código prestacional '" + cod + "' no está admitido en RC_01";
} else {

    // 2. Derivar hospitalización efectiva para código 306 con CIE-10 de parto
    var hospitalizado = payload.fua.condicion.hospitalizado;
    var hospitalizacion_forzada_306 = false;
    if (cod === "306") {
        var diagnosticos306 = payload.fua.diagnosticos;
        for (var d = 0; d < diagnosticos306.length; d++) {
            var cie = diagnosticos306[d].codigo_cie10;
            for (var c = 0; c < CIE10_PARTO.length; c++) {
                if (cie === CIE10_PARTO[c]) { hospitalizacion_forzada_306 = true; break; }
            }
            if (hospitalizacion_forzada_306) break;
        }
        if (hospitalizacion_forzada_306) { hospitalizado = true; }
    }

    // 3. Derivar "ni gestante ni puérpera"
    var gestante  = payload.fua.condicion.gestante;
    var puerpera  = payload.fua.condicion.puerpera;
    var ni_gest_puerp = !gestante && !puerpera;

    // 4. Calcular edad según si está hospitalizado o no
    //    - Hospitalizados (>= 29 días): usar fecha_ingreso
    //    - Recién nacidos (< 29 días):  usar fecha_ingreso
    //    - Los demás: usar edad_calculada que ya viene del contexto (startDatetime - fecha_nac)
    var edad = payload.edad_calculada;
    var fecha_ingreso = payload.fua.hospitalizacion.fecha_ingreso;
    if (hospitalizado && fecha_ingreso) {
        var nacimiento  = new Date(payload.patient_details.fecha_nacimiento);
        var ingreso     = new Date(fecha_ingreso);
        var diffMs      = ingreso.getTime() - nacimiento.getTime();
        var diffDias    = Math.floor(diffMs / 86400000);
        var diffAnios   = Math.floor(diffDias / 365);
        var diffMeses   = Math.floor(diffDias / 30);
        edad = { anios: diffAnios, meses: diffMeses, total_dias: diffDias };
    }

    // 5. Validar atributos uno por uno para dar mensaje preciso
    var error = null;

    if (!sexoCoincide(fila.sexo, payload.patient_details.sexo)) {
        error = "Sexo del paciente (" + payload.patient_details.sexo + ") no coincide con lo requerido (" + fila.sexo + ") para código " + cod;
    } else if (!hospitalizacion_forzada_306 && (fila.hospitalizacion === "S") !== hospitalizado) {
        error = "Hospitalización (" + (hospitalizado ? "S" : "N") + ") no coincide con lo requerido (" + fila.hospitalizacion + ") para código " + cod;
    } else if (fila.gestante !== "A" && (fila.gestante === "S") !== gestante) {
        error = "Gestante (" + (gestante ? "S" : "N") + ") no coincide con lo requerido (" + fila.gestante + ") para código " + cod;
    } else if (fila.puerpera !== "A" && (fila.puerpera === "S") !== puerpera) {
        error = "Puérpera (" + (puerpera ? "S" : "N") + ") no coincide con lo requerido (" + fila.puerpera + ") para código " + cod;
    } else if (fila.ni_gest_puerp !== "A" && (fila.ni_gest_puerp === "S") !== ni_gest_puerp) {
        error = "Condición 'ni gestante ni puérpera' no coincide con lo requerido (" + fila.ni_gest_puerp + ") para código " + cod;
    } else if (!esMayorIgualQue(edad, fila.edad_min, fila.unidad)) {
        error = "Edad del paciente es menor al mínimo requerido (" + fila.edad_min + " " + fila.unidad + ") para código " + cod;
    } else if (!esMenorQue(edad, fila.edad_max, fila.unidad)) {
        error = "Edad del paciente supera el máximo permitido (" + fila.edad_max + " " + fila.unidad + ") para código " + cod;
    }

    entity.rule_id   = "RC_01";
    entity.rule_name = "Validación código prestacional, atributos y edad";
    entity.passed    = error === null;
    entity.action    = "BLOCK";
    entity.message   = error !== null ? error : "Código prestacional " + cod + " válido para el paciente";
}
