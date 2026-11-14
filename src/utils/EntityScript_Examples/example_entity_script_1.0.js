// EntityScript example for target entity: FUAFromVisit
// Input: payloadArray (visit records), utils ({ sumAux, isValidUUIDv4, ... })
// Output: pipe-delimited string per record

const runMapping = (payloadArray, utils) => {
    if (!Array.isArray(payloadArray)) {
        throw new Error('payloadArray must be an array');
    }

    let finalOutput = '';

    for (const payload of payloadArray) {
        let line = '';

        line += (payload.attentionId ?? '') + '|';
        line += (payload.batchCode ?? '') + '|';
        line += (payload.FUA_prePrinted ?? '') + '|';

        if (payload.insuredContractTableType != null) {
            line += payload.insuredContractTableType + '|';
        }

        line += String.fromCharCode(10);
        finalOutput += line;
    }

    return finalOutput;
};

if (typeof module === 'object') module.exports = runMapping;               // require (debug)
if (typeof payloadArray !== 'undefined') runMapping(payloadArray, utils);  // vm (createPackage)
