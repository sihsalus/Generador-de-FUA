
import vm from 'node:vm';

//Test function
function sumAux (a: any,b: any) {
    return a+b;
}

type ExecutionLimits = {
    timeoutMs?: number;
    maxScriptChars?: number;
    maxArrayItems?: number;
    maxStringResultChars?: number;
    scriptName?: string;        // shown in VS Code Loaded Scripts and stack traces
};

function createPackage(utilsToUse: Function[] ,dataInput: any, scriptToExecute: string, limits: ExecutionLimits = {}) : any {
    const {
        timeoutMs = 500,                // 500 ms
        maxScriptChars = 20000,         // 20,000 characters of code
        scriptName,
    } = limits;

    if(scriptToExecute == null) throw new Error("Script to execute is null");
    if(scriptToExecute.trim() == "") throw new Error("Script to execute is empty");
    if(scriptToExecute.length > maxScriptChars) {
        throw new Error(`Script exceeds max allowed size of ${maxScriptChars} characters`);
    }

    const script = new vm.Script(`"use strict"; ${scriptToExecute}`, { filename: scriptName });

    // Expose provided functions as utilities by their function name, e.g. utils.sumAux(...)
    const utilsObject = (Array.isArray(utilsToUse) ? utilsToUse : [])
        .filter((fn: any) => typeof fn === 'function' && typeof fn.name === 'string' && fn.name.length > 0)
        .reduce((acc: Record<string, Function>, fn: Function) => {
            acc[fn.name] = fn;
            return acc;
        }, {} as Record<string, Function>);

    if(!utilsObject.sumAux) {
        utilsObject.sumAux = sumAux;
    }

    // To be set dynamically by the programmers of the system
    const utils = Object.freeze(utilsObject);

    // Bridge console methods so VM scripts emit logs through the host console.
    const vmConsole = Object.freeze({
        log: (...args: any[]) => console.log(...args),
        info: (...args: any[]) => console.info(...args),
        warn: (...args: any[]) => console.warn(...args),
        error: (...args: any[]) => console.error(...args),
        debug: (...args: any[]) => console.debug(...args)
    });
    const context = vm.createContext({ 
        payloadArray: dataInput, 
        utils, 
        console: vmConsole 
    });

    let result: any;
    try {
        result = script.runInContext(context, {
            timeout: timeoutMs,
            displayErrors: true
        });
    } catch (error) {
        throw error;
    }

    return result;

};

export {
    createPackage,
    sumAux
};