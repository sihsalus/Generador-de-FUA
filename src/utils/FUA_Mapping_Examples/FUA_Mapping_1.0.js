module.exports = {
    pages: [
        {
            pageNumber: 1,
            // Sections Mapping
            sections: [
                {
                    codeName: "IPRESS Data",
                    // Fields Mapping
                    fields: [                
                        {
                            // Visit Date
                            codeName: "Visit Date",
                            fieldType: "Table",
                            mappings: [ 
                                {
                                    // DIA
                                    target: "payload.startDatetime",
                                    column: 1,
                                    row: 2,
                                    valueType: "String",
                                    value: ["startDatetime"],
                                    extraProcessing: (value) => ( value?.substring(8, 10) || '' )                             
                                },
                                {
                                    // MES
                                    target: "payload.startDatetime",
                                    column: 2,
                                    row: 2,
                                    valueType: "String",
                                    value: ["startDatetime"],
                                    extraProcessing: (value) => ( value?.substring(5, 7) || '' )                             
                                },
                                {
                                    target: "payload.startDatetime",
                                    // AÑO
                                    column: 3,
                                    row: 2,
                                    valueType: "String",
                                    value: ["startDatetime"],
                                    extraProcessing: (value) => ( value?.substring(0, 4) || '' )                             
                                },
                            ]
                        },
                        {
                            // Visit Time
                            codeName: "Visit Time",
                            fieldType: "Box",
                            mappings: [
                                {
                                    // Hora
                                    target: "payload.startDatetime",
                                    valueType: "String",
                                    value: ["startDatetime"],
                                    extraProcessing: (value) => (value?.substring(11, 16) || '')
                                }
                            ]
                        },
                        {
                            // IPRESS Info
                            codeName: "IPRESS provider",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // RENAES CODE
                                    target: null,
                                    column: 1,
                                    row: 2,
                                    valueType: "String",
                                    value: "00000066"       
                                },
                                {
                                    // MES
                                    target: null,
                                    column: 2,
                                    row: 2,
                                    valueType: "String",
                                    value: "HOSPITAL II-1 SANTA CLOTILDE",
                                    extraProcessing: (value) => ( value?.substring(5, 7) || '' )                             
                                }
                            ]
                        },
                        {
                            // Provider Type
                            codeName: "Provider Type",
                            fieldType: "Field",
                            fields: [
                                {
                                    // Provider Type
                                    codeName: "Provider Type",
                                    fieldType: "Table",
                                    mappings: [
                                        {
                                            target: null,
                                            column: 2,
                                            row: 1,
                                            valueType: "String",
                                            value: "X"
                                        }
                                    ]             
                                },
                                {
                                    // CODIGO DE LA OFERTA FLEXIBLE
                                    codeName: "Oferta Flexible Code",
                                    fieldType: "Box",
                                    mappings: [
                                        {
                                            target: null,
                                            valueType: "String",
                                            value: "###"
                                        }
                                    ]             
                                }
                            ]
                        },
                        {
                            // TODO: cambiar con la locacion dinamica de location type
                            // Visit Location Type
                            codeName: "Visit Location Type",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // INTRAMURAL
                                    target: null,
                                    column: 2,
                                    row: 1,
                                    valueType: "String",
                                    value: "X"
                                },
                                {
                                    // INTRAMURAL
                                    target: null,
                                    column: 2,
                                    row: 2,
                                    valueType: "String",
                                    value: ""
                                }
                            ]
                        },
                        {
                            // TODO: cambiar con la locacion dinamica de visit type
                            // Visit Type
                            codeName: "Visit Type",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // AMBULATORIA
                                    target: "payload.visitType",
                                    //value: ["startDatetime"],
                                    column: 2,
                                    row: 1,
                                    valueType: "String",
                                    //value: "X",
                                    extraProcessing: (value) => ( value?.name?.startsWith("Consulta Ambulatoria") ? "X" : "" )
                                },
                                {
                                    // TODO: Agregar visita por referencia
                                    // REFERENCIA
                                    target: "payload.visitType",
                                    //value: ["startDatetime"],
                                    column: 2,
                                    row: 1,
                                    valueType: "String",
                                    //value: "X",
                                    extraProcessing: (value) => ( value?.name?.startsWith("Consulta Por Referencia") ? "X" : "" )
                                },
                                {
                                    // EMERGENCIA
                                    target: "payload.visitType",
                                    //value: ["startDatetime"],
                                    column: 2,
                                    row: 1,
                                    valueType: "String",
                                    //value: "X",
                                    extraProcessing: (value) => ( value?.name?.startsWith("Emergencia") ? "X" : "" )
                                }
                            ]
                        }                                
                    ]
                },
                {
                    codeName: "Patient Data",
                    // Fields Mapping
                    fields: [
                        {
                            // Patient Identifiers
                            codeName: "Patient Identifiers",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // TDI
                                    target: "payload.patient.identifiers",
                                    column: 1,
                                    row: 2,
                                    valueType: "String",
                                    //value: ["startDatetime"],
                                    extraProcessing: (value) => { 
                                        const dni = value?.find(
                                            identifier => identifier.display?.startsWith("DNI =")
                                        );
                                        if(dni !== undefined) return "DNI";
                                        return "???"
                                    }    
                                },
                                {
                                    // Nº DOCUMENTO DE IDENTIDAD
                                    target: "payload.patient.identifiers",
                                    column: 2,
                                    row: 2,
                                    valueType: "String",
                                    //value: ["startDatetime"],
                                    extraProcessing: (value) => {
                                        const dni = value?.find(
                                            identifier => identifier.display?.startsWith("DNI =")
                                        );
                                        if(dni !== undefined) return dni.display.slice("DNI =".length).trim();
                                        return "???"
                                    }                             
                                }
                            ]
                        },
                        {
                            // Healthcare Coverage
                            codeName: "Healthcare Coverage",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // CODIGO SIS
                                    target: null,
                                    column: 1,
                                    row: 2,
                                    value: "166"
                                },
                                {
                                    // NUMERO SIS
                                    target: "payload.patient.identifiers",
                                    column: 2,
                                    row: 2,
                                    valueType: "String",
                                    //value: ["startDatetime"],
                                    extraProcessing: (value) => {
                                        const dni = value?.find(
                                            identifier => identifier.display?.startsWith("DNI =")
                                        );
                                        if(dni !== undefined) return "7-"+dni.display.slice("DNI =".length).trim();
                                        return "???"
                                    }                             
                                }
                            ]
                        },
                        {
                            // Paternal Lastname
                            // TODO: use new visit json payload
                            codeName: "Paternal Lastname",
                            fieldType: "Box",
                            mappings: [
                                {
                                    target: null,
                                    column: 2,
                                    row: 2,
                                    value: "???"           
                                }
                            ]
                        },
                        {
                            // Maternal Lastname
                            // TODO: use new visit json payload
                            codeName: "Maternal Lastname",
                            fieldType: "Box",
                            mappings: [
                                {
                                    target: null,
                                    column: 2,
                                    row: 2,
                                    value: "???"           
                                }
                            ]
                        },
                        {
                            // Firstname
                            // TODO: use new visit json payload
                            codeName: "Firstname",
                            fieldType: "Box",
                            mappings: [
                                {
                                    target: null,
                                    column: 2,
                                    row: 2,
                                    value: "???"           
                                }
                            ]
                        },
                        {
                            // Othernames
                            // TODO: use new visit json payload
                            codeName: "Other names",
                            fieldType: "Box",
                            mappings: [
                                {
                                    target: null,
                                    column: 2,
                                    row: 2,
                                    value: "???"           
                                }
                            ]
                        },
                        {
                            // Patient Gender
                            codeName: "Patient Gender",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // Masculino
                                    target: "payload.patient.person.gender",
                                    column: 2,
                                    row: 1,
                                    //value: "???",
                                    extraProcessing: (value) => {
                                        if(value === "M") 
                                            return "X";
                                        else 
                                            return "";
                                    }    
                                },
                                {
                                    // Femenino
                                    target: "payload.patient.person.gender",
                                    column: 2,
                                    row: 2,
                                    //value: "???",
                                    extraProcessing: (value) => {
                                        if(value === "F") 
                                            return "X";
                                        else 
                                            return "";
                                    }    
                                }
                            ]
                        },
                        {
                            // Nro de Historia CLinica
                            codeName: "CLINIC HISTORY NUMBER",
                            fieldType: "Box",
                            mappings: [
                                {
                                    target: "payload.patient.identifiers",
                                    //value: "???",
                                    extraProcessing: (value) => {
                                        const ch = value?.find(
                                            identifier => identifier.display?.startsWith("N° Historia Clínica = ")
                                        );
                                        if(ch !== undefined) return ch.display.slice("N° Historia Clínica = ".length).trim();
                                        return "???"
                                    }           
                                }
                            ]
                        },
                    ]
                },
                {
                    codeName: "Triages Data",
                    // Triages Data
                    fields: [
                        {
                            codeName: "Basic Triage",
                            fieldType: "Table",
                            mappings: [
                                {
                                    // Peso Value
                                    target: "payload.encounters",
                                    column: 2,
                                    row: 1,
                                    valueType: "String",
                                    extraProcessing: (value) => {
                                        if (!Array.isArray(value)) return "";

                                        const triage = value.find(
                                            (item) => item?.encounterType?.name === "Triaje"
                                        );

                                        if (!triage) return "";
  
                                        const obsToFind = triage.obs.find(
                                            (o) => o?.concept?.uuid === "5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
                                        );

                                        if (!obsToFind || obsToFind.value === undefined || obsToFind.value === null) return "";
                                        
                                        if (isNaN(obsToFind.value)) 
                                            return "";
                                        else
                                            return obsToFind.value.toFixed(1);
                                    }
                                }
                            ]
                        }
                    ]

                }
            ]
        }
    ]
};

