#!/usr/bin/env node
// Uso: node scripts/upload-script.js <archivo.js> <targetEntity> [nombre] [descripcion] [maxChars]
// Ejemplo: node scripts/upload-script.js src/ruleEngine/scripts/RC_01.js FUARule RC_01 "Validacion RC01" 50000

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const TOKEN    = process.env.API_TOKEN || "soyuntokenxd";
const CREATED_BY = process.env.CREATED_BY || "admin";

const [,, filePath, targetEntity, nameArg, descArg, maxCharsArg] = process.argv;

if (!filePath || !targetEntity) {
  console.error("Uso: node scripts/upload-script.js <archivo.js> <targetEntity> [nombre] [descripcion]");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error("Archivo no encontrado:", absolutePath);
  process.exit(1);
}

const scriptContent = fs.readFileSync(absolutePath, "utf8");
const name = nameArg || path.basename(filePath, ".js");
const description = descArg || "";
const maxChars = maxCharsArg ? parseInt(maxCharsArg) : Math.min(50000, Math.max(2000, scriptContent.length + 500));

const body = JSON.stringify({ name, description, scriptContent, targetEntity, createdBy: CREATED_BY, maxChars });

fetch(`${BASE_URL}/ws/entity-script`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "fuagentoken": TOKEN },
  body,
})
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) {
      console.error("Error:", JSON.stringify(data, null, 2));
      process.exit(1);
    }
    console.log("Script subido OK:", JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error("Error de conexión:", err.message);
    process.exit(1);
  });
