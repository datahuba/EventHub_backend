// index.js - Versión con Códigos Primos y Verificación de Duplicados

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { generateEntryImage, generateEntriesImage, getEventTemplatePath } = require('./utils/entryGenerator');
require('dotenv').config();

// --- Bloque de configuración (sin cambios) ---
const {
    GOOGLE_SHEET_ID,
    GOOGLE_CREDENTIALS_JSON,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    GEMINI_API_KEY
} = process.env;

const requiredEnvVars = [
    'GOOGLE_SHEET_ID',
    'GOOGLE_CREDENTIALS_JSON',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'GEMINI_API_KEY'
];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
    console.error(`FATAL ERROR: Faltan variables de entorno: ${missingEnvVars.join(', ')}.`);
    process.exit(1);
}
let credentials;
try {
    credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
} catch (error) {
    console.error("FATAL ERROR: No se pudo parsear GOOGLE_CREDENTIALS_JSON.", error);
    process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
const sheets = google.sheets({ version: 'v4', auth });
// --- Fin del bloque de configuración ---
const app = express();
const port = process.env.PORT || 4000;

function buildTelegramSummary({ buyer, totalAmount, registeredAttendeesInfo, ocrData, eventId }) {
    const cantidad = registeredAttendeesInfo.length;
    const idList = registeredAttendeesInfo
        .map(info => `- ${info.purchaseCode}`)
        .join('\n');

    return [
        '🎟️ Nueva Venta Registrada',
        '',
        `👤 Comprador: ${buyer.name}`,
        `📱 Teléfono: ${buyer.phone || 'N/A'}`,
        `📧 Email: ${buyer.email || 'N/A'}`,
        eventId ? `🎉 Evento: ${eventId}` : '',
        '',
        `🎫 Cantidad de entradas: ${cantidad}`,
        `💰 Monto Total: Bs. ${totalAmount}`,
        '',
        'IDs de Entradas:',
        idList || '- Sin IDs generados',
        '',
        'Verificación OCR:',
        `Emisor: ${ocrData.sender || 'No detectado'}`,
        `Monto (OCR): ${ocrData.amount || 'No detectado'}`,
    ].filter(line => line !== '').join('\n');
}

async function sendTelegramNotification({ file, caption, message }) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('Telegram no configurado: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID.');
        return { ok: false, skipped: true };
    }

    const hasImageFile = file && typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
    const isPdfFile = file && file.mimetype === 'application/pdf';
    const endpoint = hasImageFile ? 'sendPhoto' : isPdfFile ? 'sendDocument' : 'sendMessage';
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`;

    if (endpoint === 'sendMessage') {
        const response = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Telegram sendMessage falló: ${response.status} ${errorText}`);
        }

        return { ok: true, endpoint };
    }

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('caption', caption);

    if (hasImageFile) {
        formData.append('photo', file.buffer, {
            filename: file.originalname || 'proof.jpg',
            contentType: file.mimetype,
        });
    } else {
        formData.append('document', file.buffer, {
            filename: file.originalname || 'proof.pdf',
            contentType: file.mimetype,
        });
    }

    const response = await fetch(telegramApiUrl, { method: 'POST', body: formData });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Telegram ${endpoint} falló: ${response.status} ${errorText}`);
    }

    return { ok: true, endpoint };
}

// --- INICIO DEL CAMBIO: CONFIGURACIÓN DE CORS MEJORADA ---

// Lista de los orígenes (dominios) que tienen permiso para hacer peticiones a tu backend.
const allowedOrigins = [
    'https://event-hub-frontend-gamma.vercel.app', // Tu dominio de producción en Vercel
    'http://localhost:3000',                      // Para pruebas locales (si usas create-react-app)
    'http://localhost:5173',
    'https://event-hub-frontend-git-master-brandon-gonsales-projects.vercel.app',
    'https://event-hub-frontend-git-develop-brandon-gonsales-projects.vercel.app'                      // Para pruebas locales (si usas Vite)
];
//prueba
app.use(cors({
    origin: function (origin, callback) {
        // Si la petición no tiene un 'origin' (ej. una app móvil o Postman), la permitimos.
        if (!origin) return callback(null, true);

        // Si el 'origin' de la petición está en nuestra lista de dominios permitidos, la permitimos.
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'La política de CORS para este sitio no permite el acceso desde el origen especificado.';
            return callback(new Error(msg), false);
        }

        return callback(null, true);
    }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- FIN DEL CAMBIO ---

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Funciones de generación de códigos (sin cambios) ---
function generatePurchaseCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i = i + 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}
function generateSixDigitPrime() {
    let primeCandidate;
    do {
        primeCandidate = Math.floor(100000 + Math.random() * 900000);
    } while (!isPrime(primeCandidate));
    return primeCandidate;
}
// --- Fin de funciones ---
// *****************************************************************************

/**
 * Obtiene todos los pares de códigos primos ya guardados en el Google Sheet.
 * @returns {Promise<Set<string>>} Un Set con los pares existentes en formato "primoMenor-primoMayor".
 */
async function getExistingPrimePairs() {
    try {
        //const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            // ¡IMPORTANTE! Asume que los primos están en las columnas K y L.
            // Si cambias las columnas, debes actualizar este rango.
            range: 'Respuestas!H:I',
        });

        const rows = response.data.values;
        const existingPairs = new Set();

        if (rows && rows.length) {
            // Empezamos en 1 para saltarnos la fila de cabecera
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row[0] && row[1]) {
                    // Ordenamos los números para que el par (A, B) sea igual que (B, A)
                    const pair = [parseInt(row[0]), parseInt(row[1])].sort((a, b) => a - b);
                    existingPairs.add(`${pair[0]}-${pair[1]}`);
                }
            }
        }
        console.log(`Se encontraron ${existingPairs.size} pares de primos existentes.`);
        return existingPairs;
    } catch (error) {
        console.error("Advertencia: No se pudieron obtener los pares de primos existentes. Se procederá sin verificación.", error.message);
        // Si falla (ej. la hoja es nueva), devolvemos un Set vacío para que la app no se caiga.
        return new Set();
    }
}

// *****************************************************************************
// --- FIN DEL CAMBIO #1 ---
// *****************************************************************************


// --- Función de Gemini (sin cambios) ---
async function extractDataWithGemini(imageBuffer) {
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const imagePart = { inlineData: { data: imageBuffer.toString("base64"), mimeType: "image/jpeg" } };
        const prompt =
            `
Eres un sistema experto de extracción de datos de comprobantes de pago de Bolivia. Tu tarea es analizar una imagen de un comprobante y extraer la siguiente información en un formato JSON estricto.

Extrae los siguientes campos:
- "sender": El nombre completo de la persona o entidad que envió el dinero. Busca el nombre asociado a etiquetas clave como 'Pagado por', 'De', 'Enviado por', 'Ordenante', 'Remitente', 'Pagador', 'Nombre titular', 'Nombre del originante' o junto a 'Cuenta de origen'. **Importante:** Algunos comprobantes, especialmente los más simples o generados por cajeros, pueden no mostrar el nombre del remitente. En estos casos, si el nombre no está visible de forma explícita, el valor debe ser "No encontrado".
- "receiver": El nombre completo de la persona o entidad que recibió el dinero. Busca el nombre asociado a etiquetas como 'A:', 'Para', 'Enviado a', 'Beneficiario', 'Destinatario', 'Nombre del beneficiario', 'Cuenta de destino', 'Cuenta acreditada' o 'Solicitante'.
- "amount": El monto de la transacción. Extráelo como un string numérico, usando siempre el punto como separador decimal (ejemplo: "100.00"). Ignora cualquier símbolo de moneda (como Bs. o BOB) y si encuentras una coma decimal, conviértela en punto.
- "dateTime": La fecha y hora exactas de la transacción tal como aparecen en el comprobante. Mantén el formato original que encuentres (ej: "06/10/2025 19:27", "02/Oct/2025 20:25:04").

Reglas Adicionales:
- Si un campo no se puede encontrar en la imagen, usa el valor de string "No encontrado".
- Tu respuesta debe ser únicamente el objeto JSON, sin explicaciones ni texto adicional.
`
            ;
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonResponse);
    } catch (error) {
        console.error("Error en la API de Gemini (AI Studio):", error);
        return { sender: '404', receiver: '404', amount: '404', dateTime: '404' };
    }
}

// REEMPLAZA TU ENDPOINT EXISTENTE CON ESTE
app.post('/api/submit', upload.single('proof'), async (req, res) => {
    try {
        console.log('Datos recibidos en req.body:', req.body);

        // --- 1. EXTRACCIÓN Y ESTRUCTURACIÓN DE DATOS ---
        let {
            buyer,
            totalAmount,
            paymentMethod,
            attendees,
            eventId
        } = req.body;

        // --- CORRECCIÓN DE DATOS: Soporte para FormData (strings) y Estructura Plana ---

        // 1. Si vienen como strings (común en FormData), intentamos parsearlos a JSON
        if (typeof buyer === 'string') {
            try { buyer = JSON.parse(buyer); } catch (e) { console.log('Error parseando buyer:', e); }
        }
        if (typeof attendees === 'string') {
            try { attendees = JSON.parse(attendees); } catch (e) { console.log('Error parseando attendees:', e); }
        }

        // 2. Fallback: Si no hay objeto 'buyer' ni array 'attendees', pero hay campos planos (name, email...)
        // Esto soluciona el error "attendees is not iterable" cuando el frontend envía campos sueltos.
        if ((!attendees || !Array.isArray(attendees) || attendees.length === 0) && req.body.name) {
            console.log("Detectada estructura plana. Convirtiendo a estructura de objetos...");
            const cantidad = Math.min(70, Math.max(1, parseInt(req.body.cantidad) || 1));
            if (!eventId) eventId = req.body.eventId || '';
            buyer = {
                name: req.body.name,
                email: req.body.email || '',
                phone: req.body.phone || ''
            };
            attendees = Array.from({ length: cantidad }, () => ({
                fullName: req.body.name,
                phone: req.body.phone || '',
                email: req.body.email || ''
            }));
        }

        // Inicialización por defecto para evitar crashes si todo falla
        if (!attendees) attendees = [];
        if (!buyer) buyer = { name: 'Desconocido', email: '', phone: '' };

        // --- 2. OPERACIONES ÚNICAS (SE HACEN UNA SOLA VEZ POR PETICIÓN) ---
        const file = req.file;
        let ocrData = {};
        if (paymentMethod === 'qr' && file) {
            ocrData = await extractDataWithGemini(file.buffer);
        }

        const existingPairs = await getExistingPrimePairs();
        const allNewRows = [];

        // ***** INICIO DE LA CORRECCIÓN #1 *****
        // Se declara el array para guardar la info para Telegram
        const registeredAttendeesInfo = [];
        // ***** FIN DE LA CORRECCIÓN #1 *****

        // --- 3. BUCLE PRINCIPAL PARA GENERAR UNA FILA POR CADA ASISTENTE ---
        for (const attendee of attendees) {
            const purchaseCode = generatePurchaseCode();
            let primeA, primeB, pairKey;
            let attempts = 0;

            do {
                primeA = generateSixDigitPrime();
                primeB = generateSixDigitPrime();
                const sortedPair = [primeA, primeB].sort((a, b) => a - b);
                pairKey = `${sortedPair[0]}-${sortedPair[1]}`;
                attempts++;
            } while (primeA === primeB || existingPairs.has(pairKey));

            existingPairs.add(pairKey);
            const productC = primeA * primeB;
            console.log(`Fila para '${attendee.fullName}': Par único ${pairKey} encontrado en ${attempts} intento(s).`);

            const cantidadTotal = attendees.length;
            const newRow = [
                /* A  - ID */               purchaseCode,
                /* B  - NOMBRE (Asistente)*/attendee.fullName || '',
                /* C  - TELEFONO */         attendee.phone || '',
                /* D  - NAME (Comprador) */ buyer.name || '',
                /* E  - PHONE (Comprador)*/buyer.phone || '',
                /* F  - EMAIL (Comprador)*/buyer.email || '',
                /* G  - CI */               '',
                /* H  - F1 */               primeA,
                /* I  - F2 */               primeB,
                /* J  - P */                productC.toString(),
                /* K  - TOTAL */            totalAmount,
                /* L  - PAGO */             paymentMethod,
                /* M  - COMPROBANTE */      (paymentMethod === 'qr' && file) ? 'Sí' : 'No',
                /* N  - HORA */             new Date().toISOString(),
                /* O  - OCR Emisor */       ocrData.sender || 'N/A',
                /* P  - OCR Receptor */     ocrData.receiver || 'N/A',
                /* Q  - OCR Monto */        ocrData.amount || 'N/A',
                /* R  - OCR Fecha/Hora */   ocrData.dateTime || 'N/A',
                /* S  - VALIDADO */         '0',
                /* T  - EVENT_ID */         eventId || '',
                /* U..AC - (vacío) */       '', '', '', '', '', '', '', '', '',
                /* AD - CANTIDAD */         cantidadTotal,
            ];

            allNewRows.push(newRow);

            /* S - Prueba */

            // ***** INICIO DE LA CORRECCIÓN #2 *****
            // Se llena el array con el ID de la entrada recién creada
            registeredAttendeesInfo.push({
                purchaseCode: purchaseCode
            });
            // ***** FIN DE LA CORRECCIÓN #2 *****
        }

        // --- 4. ENVÍO DEL LOTE DE FILAS A GOOGLE SHEETS ---
        if (allNewRows.length > 0) {
            // Buscar la última fila real en columna A para no dejar huecos
            const colAResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Respuestas!A:A',
            });
            const lastRow = (colAResponse.data.values || []).length;
            const nextRow = lastRow + 1;

            await sheets.spreadsheets.values.update({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: `Respuestas!A${nextRow}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: allNewRows,
                },
            });
        }

        // --- 5. NOTIFICACIÓN RESUMEN A TELEGRAM ---
        const summaryCaption = buildTelegramSummary({
            buyer,
            totalAmount,
            registeredAttendeesInfo,
            ocrData,
            eventId,
        });

        if (paymentMethod === 'qr' && file) {
            const telegramResult = await sendTelegramNotification({
                file,
                caption: summaryCaption,
                message: summaryCaption,
            });
            console.log(`Telegram enviado por ${telegramResult.endpoint || 'skip'}.`);
        } else {
            const telegramResult = await sendTelegramNotification({
                message: summaryCaption,
            });
            console.log(`Telegram enviado por ${telegramResult.endpoint || 'skip'}.`);
        }

        res.status(200).json({ message: "Registro de múltiples asistentes exitoso!" });

    } catch (error) {
        console.error("Error al procesar el registro:", error);
        res.status(500).json({ message: "Fallo al procesar el registro." });
    }
});

// ============================================================================
// NUEVO: Endpoint para generar entradas (tickets) con QR
// ============================================================================
/**
 * POST /api/generar-entrada
 * Genera una imagen de entrada con QR y datos personales, la sube a Cloudinary
 * 
 * Body esperado:
 * {
 *   "id_entrada": "string - ID único",
 *   "nombre": "string - Nombre del asistente", 
 *   "monto_pagado": "string - Monto pagado",
 *   "metodo_pago": "string - Método de pago",
 *   "datos_qr": "string - Datos para codificar en QR",
 *   "event_id": "string (opcional) - ID del evento para aplicar plantilla"
 * }
 */
app.post('/api/generar-entrada', async (req, res) => {
    try {
        const { id_entrada, nombre, monto_pagado, metodo_pago, event_id } = req.body;

        // Validar campos requeridos
        if (!id_entrada || !nombre || !monto_pagado || !metodo_pago) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: id_entrada, nombre, monto_pagado, metodo_pago'
            });
        }

        // Buscar el valor P (producto de primos, columna J) en Google Sheets
        // para usarlo como dato del QR — que es lo que busca el validador
        const sheetResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Respuestas!A:J',
        });
        const rows = sheetResponse.data.values || [];
        const matchingRow = rows.find(row => row[0] === id_entrada);

        if (!matchingRow || !matchingRow[9]) {
            return res.status(404).json({
                error: `No se encontró la entrada "${id_entrada}" en el sistema. Verifica el ID de compra.`
            });
        }

        const datos_qr = matchingRow[9]; // Columna J = producto P (F1 × F2)

        // Obtener plantilla del evento si existe
        const templatePath = event_id ? getEventTemplatePath(event_id) : null;

        // Generar imagen y subirla a Cloudinary
        const imageUrl = await generateEntryImage({
            id_entrada,
            nombre,
            monto_pagado,
            metodo_pago,
            datos_qr
        }, templatePath);

        res.status(200).json({
            success: true,
            message: 'Entrada generada exitosamente',
            imagen_url: imageUrl,
            id_entrada
        });

    } catch (error) {
        console.error('Error generando entrada:', error);
        res.status(500).json({
            error: 'Error al generar la entrada',
            details: error.message
        });
    }
});

// ============================================================================
// Endpoint para generar un PDF con múltiples entradas
// ============================================================================
/**
 * POST /api/generar-entradas-pdf
 * Body: { purchase_codes: string[], nombre: string, monto_pagado: string, metodo_pago: string, event_id?: string }
 * Busca cada código en Google Sheets, genera un ticket por página y sube el PDF a Cloudinary.
 */
app.post('/api/generar-entradas-pdf', async (req, res) => {
    try {
        const { purchase_codes, nombre, monto_pagado, metodo_pago, event_id } = req.body;

        if (!purchase_codes || !Array.isArray(purchase_codes) || purchase_codes.length === 0) {
            return res.status(400).json({ error: 'Se requiere el campo purchase_codes (array de IDs).' });
        }

        // Obtener todas las filas del sheet una sola vez
        const sheetResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Respuestas!A:J',
        });
        const rows = sheetResponse.data.values || [];

        // Construir datos de cada entrada buscando el valor P en columna J
        const entriesData = purchase_codes.map(code => {
            const row = rows.find(r => r[0] === code);
            const datos_qr = row ? row[9] : code; // fallback al código si no se encuentra
            return {
                id_entrada: code,
                nombre: nombre || (row ? row[1] : 'Asistente'),
                monto_pagado: monto_pagado || '',
                metodo_pago: metodo_pago || 'qr',
                datos_qr,
            };
        });

        const templatePath = event_id ? getEventTemplatePath(event_id) : null;
        const imageUrl = await generateEntriesImage(entriesData, templatePath);

        res.status(200).json({
            success: true,
            message: `PDF con ${purchase_codes.length} entrada(s) generado exitosamente`,
            pdf_url: imageUrl,
        });

    } catch (error) {
        console.error('Error generando PDF de entradas:', error);
        res.status(500).json({ error: 'Error al generar el PDF', details: error.message });
    }
});

// ============================================================================
// GET /api/generador — Genera las 70 entradas y actualiza el Sheet
// ============================================================================
app.get('/api/generador', async (req, res) => {
    const entries = [
        { id: 'ZJ7DIV9H',  monto: '120',  metodo: 'qr', event_id: 'gargola002' },
        { id: 'RD5SOWG8',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: '5N3F9U3M',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'ZICTUOVZ',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'D79SJ7W2',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'H7B4UA9T',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'Y03BUZ3W',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'CFOZ3DKA',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'RH38SM7B',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'L7B8QHNX',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'W06X5N8K',  monto: '8280', metodo: 'qr', event_id: 'gargola002' },
        { id: 'CM3I0A9R',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'UD7HYE5P',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'G02QZWG0',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'E1R4UXFL',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'GVO54YUN',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '34R2EIPS',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '3F1QTZYO',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'GU0MD04Q',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '53ON2D9I',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'JRNP4FX1',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'N4QG4U09',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'B5X13DGU',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '8J507N8S',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'KHBC5894',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'IK8LPDRN',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'EM607Q6R',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '3XW76OIF',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'ZVX1R7ZC',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'UMWM3ZQ5',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'MWV90ZZM',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'LB4NI8MM',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'BYRKRXXZ',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'PO9QM97B',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'Z40HUWAV',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'YO0TO8R3',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'FW5ZVEH5',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '717ZFXJH',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '1U0KCK8E',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'BWMZ553Q',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'THVPG6IV',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '2SYRUWU4',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'PEKP35AH',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'XDW9GR0M',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '50KEPSRD',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'LXD4BUNC',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '8BLJQD8U',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'J0OH2QNN',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'U5NNFDRQ',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'FFZFUEP2',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'PCF2GCMW',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '7FG7N3IL',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'V4VVX8DF',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '9OUDNKZU',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'F3ZD7N7K',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'LYZUUO4R',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'KAHHXU8R',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'U4SH8IP3',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '7HT8GOMQ',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'D3RKVXVX',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: 'FBQ5W8L9',  monto: '1200', metodo: 'qr', event_id: 'gargola002' },
        { id: '4R5L8EOH',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: '677W604J',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: 'MFDVCMCH',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: 'GCA1PMFE',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: 'D84NJGGX',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: '7KV8HB15',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: 'F0TYP804',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: 'CP0MBKBW',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
        { id: 'Z1J9LOW6',  monto: '1080', metodo: 'qr', event_id: 'gargola002' },
    ];

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write('<pre style="font-family:monospace;padding:20px">');
    res.write(`Iniciando generacion de ${entries.length} entradas...\n\n`);

    // Obtener todas las filas del sheet una sola vez
    const sheetRows = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Respuestas!A:A',
    });
    const colA = (sheetRows.data.values || []).map(r => r[0]);

    let ok = 0, err = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        res.write(`[${i + 1}/${entries.length}] ${entry.id} ... `);
        try {
            const templatePath = getEventTemplatePath(entry.event_id);
            const imageUrl = await generateEntryImage({
                id_entrada: entry.id,
                nombre: entry.id,
                monto_pagado: entry.monto,
                metodo_pago: entry.metodo,
                datos_qr: entry.id,
            }, templatePath);

            // Buscar la fila en Sheets y actualizar columna U
            const rowIdx = colA.indexOf(entry.id);
            if (rowIdx !== -1) {
                const rowNumber = rowIdx + 1;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: GOOGLE_SHEET_ID,
                    range: `Respuestas!U${rowNumber}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[imageUrl]] },
                });
                res.write(`OK fila ${rowNumber} → ${imageUrl}\n`);
            } else {
                res.write(`OK (fila no encontrada) → ${imageUrl}\n`);
            }
            ok++;
        } catch (e) {
            res.write(`ERROR: ${e.message}\n`);
            err++;
        }
    }

    res.write(`\n--- Completado: ${ok} OK, ${err} errores ---`);
    res.write('</pre>');
    res.end();
});

app.listen(port, () => {
    console.log(`Servidor backend ejecutándose en el puerto ${port}`);
});