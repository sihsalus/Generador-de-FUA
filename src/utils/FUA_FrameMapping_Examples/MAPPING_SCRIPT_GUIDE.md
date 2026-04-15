# Frame Mapping Script Guide

## How a mapping script is executed

There are two execution paths. Both receive the same inputs and produce the same output — they differ only in *how* the script is loaded.

---

### Path 1 — Production: `createPackage` via Node.js `vm`

```
createPackage(utilsToUse, dataInput, scriptString)
  │
  ├─ builds utils object  { sumAux: fn, isValidUUIDv4: fn, ... }
  ├─ creates vm context   { payloadArray: dataInput, utils, console }
  └─ runs scriptString inside that context
```

`vm.createContext({ payloadArray, utils, console })` creates an **isolated JavaScript sandbox**. Variables added to the context become **global variables** inside the script — the script can reference `payloadArray` and `utils` directly without them being passed as function arguments.

`vm.Script.runInContext()` executes the script and returns the **completion value** of the last evaluated statement (i.e., whatever the last expression evaluates to).

The script never touches `module`, `require`, `process`, or any other Node.js global — they simply do not exist in the sandbox.

---

### Path 2 — Debug: `debugFrameMapping` via `require()`

```
debugFrameMapping(filePath, payloadArray, extraUtils)
  │
  ├─ builds utils object  { sumAux: fn, isValidUUIDv4: fn, ... }
  ├─ delete require.cache[path]   ← forces a fresh load every call
  ├─ mappingFunction = require(filePath)   ← loads the .js file as a CommonJS module
  └─ mappingFunction(payloadArray, utils)  ← calls the exported function with real args
```

`require()` executes the file as a **CommonJS module** inside the real Node.js runtime — not a sandbox. This means:

- The Node.js debugger can attach breakpoints to the file.
- `module`, `exports`, `require`, `__dirname`, `__filename` are all available.
- **There are no injected context globals.** `payloadArray` and `utils` are not magically available; they must be received as function parameters.

`debugFrameMapping` calls `require()` to get the exported function, then calls it with the real `payloadArray` and `utils` built the same way `createPackage` does — so the script behaves identically in both paths.

---

## The two footer lines in every mapping script

```js
if (typeof module === 'object') module.exports = runMapping;               // require (debug)
if (typeof payloadArray !== 'undefined') runMapping(payloadArray, utils);  // vm (createPackage)
```

### Line 1 — `if (typeof module === 'object') module.exports = runMapping`

| Context | `module` | Result |
|---|---|---|
| `vm` (createPackage) | **not in context** — `typeof module === 'undefined'` | condition false → skipped |
| `require` (debugFrameMapping) | Node.js module object | condition true → exports the function |

This line **exports the function reference** (`runMapping`, not `runMapping(...)`) so that `require()` returns a callable function. If you accidentally write `module.exports = runMapping(payloadArray, utils)` — with the call `()` — the function is invoked immediately at load time when `payloadArray` and `utils` are not yet defined (both `undefined`), and `module.exports` receives the return value (a string) instead of the function. `debugFrameMapping` then tries to call a string as a function and throws.

### Line 2 — `if (typeof payloadArray !== 'undefined') runMapping(payloadArray, utils)`

| Context | `payloadArray` | Result |
|---|---|---|
| `vm` (createPackage) | injected as a context global by `vm.createContext` | condition true → function is called, return value becomes completion value of the script |
| `require` (debugFrameMapping) | not a Node.js global — never defined at module scope | condition false → skipped (function will be called by `debugFrameMapping` instead) |

This line **self-invokes the function using the vm context globals** so that `script.runInContext()` gets back a return value. It is intentionally guarded so it does not run under `require()`, where `payloadArray` would be `undefined`.

---

## Template

Every new mapping script must follow this structure:

```js
const runMapping = (payloadArray, utils) => {
    // payloadArray : any[]  — input records
    // utils        : object — { sumAux, isValidUUIDv4, ... }

    // YOUR MAPPING LOGIC HERE

    return output;
};

if (typeof module === 'object') module.exports = runMapping;               // require (debug)
if (typeof payloadArray !== 'undefined') runMapping(payloadArray, utils);  // vm (createPackage)
```
