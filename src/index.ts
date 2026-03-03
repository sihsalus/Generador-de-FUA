// Import Libraries
require('dotenv').config();
import express, { Request, Response } from 'express';
const path = require('path');


import { pdfMetadataAccess } from './utils/PDF_HASH_Signature';
import { pdfMetadataHashSignature } from './utils/PDF_HASH_Signature';
import { pdfMetadataHashSignatureVerification } from './utils/PDF_HASH_Signature';
import * as utils from './utils/utils';

// PDF Generation
import puppeteer, { Browser } from "puppeteer";




// Sequelize and models
import { sequelize } from './modelsSequelize/database';

// Services
import { getPatient } from './services/fhirService';

// Import Routes
import globalRouter from './routes/indexRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';
import { createDemoFormat } from './utils/utils';
import { Logger, loggerInstance } from './middleware/logger/models/typescript/Logger';
import { Log } from './middleware/logger/models/typescript/Log';
import { Logger_LogLevel } from './utils/LegLevelEnum';
import { Logger_SecurityLevel } from './middleware/logger/models/typescript/SecurityLevel';
import { Logger_LogType } from './middleware/logger/models/typescript/LogType';
import { multerErrorHandler, upload } from './middleware/multerMemory';


// Parameters and other options
const app = express();


const port = process.env.PORT || 3000;



// Testing database connection
// Consider to envelope main in a async function
console.log(`\nTesting connection with database ...\n`);
sequelize.authenticate()
.then((): void => {
  console.log(`\nConnection has been established with database successfully.\n`);  
  // Syncronize models
  console.log('\n Syncronizing models ... \n');
  sequelize.sync({ force: true })
  //sequelize.sync({ alter: true })
  .then( () : void => {
    console.log('\nEnded syncronizing models ...\n');
  } );  
})
.catch((error: unknown): void => {
  // Log in case of failure
  let auxLog = new Log({
    timeStamp: new Date(),
    logLevel: Logger_LogLevel.ERROR,
    securityLevel: Logger_SecurityLevel.Admin,
    logType: Logger_LogType.CREATE,
    environmentType: loggerInstance.enviroment.toString(),
    description: 'DATABSE CONNECTTION FAILURE :('
  });

  loggerInstance.printLog(auxLog, [
    { name: "terminal" },
    { name: "file", file: "./logs/auxLog.log" }
    ]);
  console.error('Unable to connect to the database: ');
  console.log("CALLED BY INDEX, NOT ANY OTHER PART");
  console.error(error);
});



// Importing utilities for Express
app.use(express.static(path.resolve(__dirname, './public')));
app.use(express.json());


// Importing Routes
app.use('/ws', globalRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Comentario para marcelo: Ya funciona el getter del patients a través de la API de OpenMRS, faltarian ajustar algunas cosas como el cors y la seguridad, revisar servicios de getPatient.
app.get('/', (req, res) => {
  res.send('¡Servidor Express en funcionamiento!');
});


//Ruta para graph-rule-front
app.get('/graph-rules', (req, res) => {
  const fs = require('fs');
  let html = fs.readFileSync(path.resolve(__dirname, './public/graph-rule-master-ui.html'), 'utf-8');
  html = html.replace(
    "const API = 'http://localhost:3000/ws';",
    `const API = '/ws';\nconst TOKEN = '${process.env.TOKEN}';`
  );
  res.send(html);
});

// Ruta para obtener un paciente por ID
app.get('/patient/:id', async (req, res) => {
  const { id } = req.params;
  const patient = await getPatient(id);
  if (patient) {
    res.json(patient);
  } else {
    res.status(404).json({ error: 'Paciente no encontrado' });
  }
});

app.listen(port, () => {
  console.log(`\nServidor corriendo en http://localhost:${port} \n`);
});

// Serve index.html
app.get('/FUA', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/FUA_Previsualization.html'));
});


//TESTING ENTITIES
app.get('/demo', async (req, res) => {
  try {
    const demoAnswer = await createDemoFormat(false);
    res.status(200).send(demoAnswer);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to create demo. ', 
      message: (err as (Error)).message,
      details: (err as any).details ?? null,
    });
  }   
});

//TESTING Puppeteer

let browserPromise: Promise<Browser> | null = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true, 
      defaultViewport: null,
      args: ["--no-sandbox", "--font-render-hinting=none"],
    });
  }
  return browserPromise;
}

app.get('/demopdf', async (req, res) => {
  let demoAnswer = '';
  try {
    demoAnswer = await createDemoFormat(true);
   
    //res.status(200).send(demoAnswer);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to create demo. ', 
      message: (err as (Error)).message,
      details: (err as any).details ?? null,
    });
  }
  try {

    const browser = await getBrowser();
    const page = await browser.newPage();

    // 1) Mode impression
    await page.emulateMediaType("print");

    // 2) Charger le HTML (équiv. à wkhtmltopdf qui lit une string)
    //    Si ton HTML référence des CSS/images relatives, passe un baseURL (file://… ou http://…)
    await page.setContent(demoAnswer, {
      waitUntil: "networkidle0",
    });

    // 4) Deux façons de fixer la taille 210×306 mm :
    //    A) (recommandée) Laisser le CSS décider: ajouter dans ton CSS:
    //       @page { size: 210mm 306mm; margin: 0; }
    //       .fua-container { width:210mm; height:306mm; }
    //       et utiliser preferCSSPageSize: true
    const useCssPageSize = false;

    const pdfBytes = await page.pdf(
      useCssPageSize
        ? {
            printBackground: true,
            preferCSSPageSize: true,           // <-- respecte @page { size: ... }
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
            pageRanges: "1-",
            scale: 1,
          }
        : {
            printBackground: true,
            preferCSSPageSize: false,
            width: "210mm",                    // <-- taille forcée côté Puppeteer
            height: "297mm",
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
            pageRanges: "1-",
            displayHeaderFooter: false,
            scale: 1,
          }
    );

    await page.close(); 

    // Temporary PDF HASH signing solution 

    //const pdfBufferSigned = await signPdfBuffer(pdfBuffer, "evan");
    //console.log(await verifyPdfBuffer(pdfBufferSigned, "evan"));

    const pdfBytesSigned = await pdfMetadataHashSignature(pdfBytes, "evan");

    const signatureVerificationResult = pdfMetadataHashSignatureVerification(pdfBytesSigned, "evan");

    await pdfMetadataAccess(pdfBytesSigned);

    //const FuaPdfOutput = await fs.promises.writeFile('signed.pdf', pdfBufferSigned);

    // // 4.1) sign PDF 
    // // Retrieve signature content 
    // const certPath = path.resolve(process.cwd(), "./src/certificate/certificate.p12");
    // const passphrase = "password";
    // // Sign PDF with signature content
    // const p12Buffer = fs.readFileSync(certPath);
    // // Create a P12 signer instance 

    // // Create placeholder
    // const pdfWithPlaceholder = plainAddPlaceholder({
    //   pdfBuffer: Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer),
    //   reason: "Approval",
    //   contactInfo: "backend@example.com",
    //   name: "My Server",
    //   location: "Datacenter"
    // });

    // const signer = new P12Signer(p12Buffer, {passphrase});  

    // const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);


    // 5) Réponse HTTP (équivalent à ton pipe wkhtmltopdf)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", 'inline; filename="demo.pdf"');
    res.status(200).end(pdfBytesSigned);

  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Failed to create demo.",
      message: err?.message,
      details: err?.stack ?? null,
    });
  }
});

app.post('/demoZipTxt', async (req, res) => {
  
  try {
    const rawBuffers = utils.generateTxtFiles();
    const files : utils.TxtEntry[] = rawBuffers.map((b, i) => ({name: `file-${i}.txt`, content: b }));
    const password = 'TestPassword123!';
    const encrypted = await utils.zipAndEncryptTxtFiles(files, password);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="secure.zip.enc"`);
    res.send(encrypted);

  } catch (err: unknown) {
      console.error(err);
      res.status(500).json({
      error: 'Failed in demoZipTxt ', 
      message: (err as (Error)).message,
      details: (err as any).details ?? null,
    });
  }
});

app.post(
  '/zip-decrypt',
  multerErrorHandler(upload.single('encFile'), '/zip-decrypt'),
  async (req, res) => {
    try {
      const file = req.file;
      const password = req.body.password;

      if (!file || !password) {
        res.status(400).json({
          error: 'Missing data',
          message: 'File (.enc) and password are required'
        });
        return;
      }

      const decryptedZip = utils.decryptBuffer(file.buffer, password);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="decrypted.zip"');
      res.send(decryptedZip);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
      error: 'Failed in zip-decrypt', 
      message: (err as (Error)).message,
      details: (err as any).details ?? null,
      });
    }
  }
);



//TESTING LOGGER DB
/* app.get('/logger-db', async (req, res) => { //test in DB
  try {
    //const aux = logger.testDB(auxLog);
    const aux = logger.printLog(auxLog, [
    { name: "terminal" },
    { name: "file", file: "./logs/auxLog.log" },
    { name: "database" }
    ]);
    res.status(200).send('okay');
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to create log. ', 
      message: (err as (Error)).message,
      details: (err as any).details ?? null,
    });
  }
}); */

