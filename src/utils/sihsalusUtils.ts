/*
    Utils exclusively for SIHSALUS distributions
*/

import { isValidUUIDv4 } from "./utils";

// Libraries
require('dotenv').config();

/**
 * Consult concept shortname (CIE-10) from backend system
*/
export async function getShortnameFromSIHSALUS (conceptUUID: string) : Promise<string> {
    // Validate string
    const validation = isValidUUIDv4(conceptUUID);
    if(!validation){
        throw new Error('Concept UUID given is not valid.');
    }
    // Prepare call
    const username = process.env.BACKEND_USERNAME ?? "admin";
    const password = process.env.BACKEND_PASSWORD ?? "Admin123";
    const credentials = btoa(`${username}:${password}`);
    let conceptResponse = null;
    const customArgument : string = "custom:(uuid,display,conceptClass:(uuid,display,name),names:(uuid,display,name,locale,conceptNameType))";
    const backendString = process.env.BACKEND_BASEURL;
    if(!backendString){
        throw new Error('No backend string detected.');    
    }
    // Call backend
    try {
        const response = await fetch(backendString + `/concept/` + conceptUUID + `?v=` + customArgument,{
            method: "GET",
            headers: {
                "Authorization": `Basic ${credentials}`,
            }
        } );
        if (!response.ok) {
            return "Response not OK";
        }
        conceptResponse = await response.json();
    } catch (error) {
        return "Error at call being made";
    }
    // Extract shortName
    if ( !(conceptResponse && conceptResponse.names && Array.isArray(conceptResponse.names)) ) {
        throw new Error('No names detected in response payload.');    
    }

    for (const auxName of conceptResponse.names) {
        if(auxName.conceptNameType === "SHORT" && auxName.locale === "es" ){
            return auxName.name;
        }
    };

    return "???";
}