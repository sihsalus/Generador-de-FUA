// This a test mapping for "Trama Atención"
/*
input:
 - payloadArray
 - RENIPRESS_code
 - RENIPRESS_category (Componente del asegurado )
 - digitationPointCode (Componente del asegurado )
 - insuredComponent (Componente del asegurado )
*/

const runMapping = (payloadArray, utils) => {
    let finalOutput = "";

    if (!Array.isArray(payloadArray)) {
        throw new Error('payloadArray must be an array');
    }

    for (const payload of payloadArray) {
        let auxAttention = "";
        // Unique attention (visit) identifier (lets call it attentionId)
        auxAttention += payload.attentionId + '|';
        // RENIPRESS code
        //auxAttention += RENIPRESS_code + '|';
        // Batch code
        //if(!(payload.batchCode <= 2 && payload.batchCode <= 3)) throw new Error('Lote de FUA not of 8 characters length, length found of '+payload.attentionId.length.toString());
        auxAttention += payload.batchCode + '|' // to be implemented, maybe a function
        auxAttention += payload.FUA_prePrinted + '|' // ??
        //auxAttention += RENIPRESS_category + '|';
        //auxAttention += digitationPointCode + '|';
        //auxAttention += insuredComponent + '|'; // Componente del asegurado
        //if(payload.DISA_Code !== null) auxAttention += payload.DISA_Code + '|'; //DISA del formato del asegurado SIS
        //auxAttention += payload.batchSISPatient + '|'; //Lote del formato del asegurado SIS
        //auxAttention += payload.formatCodeInsuredPatient + '|'; //Número del formato del asegurado SIS
        if(payload.insuredContractTableType !== null) auxAttention +=  payload.insuredContractTableType + '|'; //Tipo de tabla del contrato del asegurado SIS
        auxAttention += String.fromCharCode(10);
        finalOutput += auxAttention;
    }
    console.log(utils.sumAux(4,6));
    console.log(utils.isValidUUIDv4("3f9c2a8e-6d1b-4a7f-b2c9-5e8d1f0a9b34"));
    return finalOutput;
};

if (typeof module === 'object') module.exports = runMapping;              // require (debug)
if (typeof payloadArray !== 'undefined') runMapping(payloadArray, utils); // vm (createPackage)

