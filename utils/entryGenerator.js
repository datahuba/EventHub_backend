const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const TEMPLATE_DIRS = [
    path.join(__dirname, '../public/template'),
    path.join(__dirname, '../public/templates')
];

function getDefaultTemplatePath() {
    for (const dir of TEMPLATE_DIRS) {
        if (!fs.existsSync(dir)) continue;
        const candidates = fs
            .readdirSync(dir)
            .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
            .sort();

        if (candidates.length > 0) {
            return path.join(dir, candidates[0]);
        }
    }

    return null;
}

/**
 * Genera el buffer PNG de un ticket individual (sin subir a Cloudinary)
 */
async function generateTicketBuffer(entryData, eventTemplate) {
    const resolvedTemplatePath = eventTemplate && fs.existsSync(eventTemplate)
        ? eventTemplate
        : getDefaultTemplatePath();

    let templateImage = null;
    if (resolvedTemplatePath) {
        try {
            templateImage = await loadImage(resolvedTemplatePath);
        } catch (e) {
            console.warn('No se pudo cargar la plantilla, se usará fondo base:', e.message);
        }
    }

    // 1. Generar QR
    const qrDataUrl = await QRCode.toDataURL(entryData.datos_qr, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 200,
        margin: 2
    });

    // 2. Crear canvas
    const width = templateImage ? templateImage.width : 1600;
    const height = templateImage ? templateImage.height : 900;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    if (templateImage) {
        ctx.drawImage(templateImage, 0, 0, width, height);
    }

    // 3. Overlay semi-transparente
    const infoPanelHeight = Math.max(220, Math.round(height * 0.26));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, height - infoPanelHeight, width, infoPanelHeight);

    // 4. QR con fondo blanco
    const qrImage = await loadImage(qrDataUrl);
    const qrSize = Math.round(Math.min(width, height) * 0.176);
    const qrMargin = Math.round(Math.min(width, height) * 0.02);
    const qrPadding = 8;
    const qrX = width - qrSize - qrMargin;
    const qrY = qrMargin;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX - qrPadding, qrY - qrPadding, qrSize + qrPadding * 2, qrSize + qrPadding * 2);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // 5. ID de entrada
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(16, Math.round(width * 0.014))}px Arial`;
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${entryData.id_entrada}`, width - qrMargin, qrMargin + qrSize + 26);

    // 6. Datos personales
    const panelTop = height - infoPanelHeight;
    const leftPad = Math.round(width * 0.03);

    ctx.font = `bold ${Math.max(24, Math.round(width * 0.024))}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(`Monto: Bs. ${entryData.monto_pagado}`, leftPad, panelTop + Math.round(infoPanelHeight * 0.55));

    ctx.font = `bold ${Math.max(20, Math.round(width * 0.018))}px Arial`;
    ctx.fillText(`Metodo: ${entryData.metodo_pago}`, leftPad, panelTop + Math.round(infoPanelHeight * 0.80));

    // 7. Línea divisoria
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const dividerY = panelTop + Math.round(infoPanelHeight * 0.2);
    ctx.moveTo(leftPad, dividerY);
    ctx.lineTo(width - leftPad, dividerY);
    ctx.stroke();

    return { buffer: canvas.toBuffer('image/png'), width, height };
}

/**
 * Genera una imagen de entrada individual y la sube a Cloudinary
 */
async function generateEntryImage(entryData, eventTemplate) {
    try {
        const { buffer } = await generateTicketBuffer(entryData, eventTemplate);

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'eventhub/entradas',
                    resource_type: 'auto',
                    public_id: `entrada_${entryData.id_entrada}_${Date.now()}`
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        return result.secure_url;
    } catch (error) {
        console.error('Error generando imagen de entrada:', error);
        throw error;
    }
}

/**
 * Genera una imagen vertical con todos los tickets apilados y la sube a Cloudinary.
 * @param {Array} entriesDataArray - Array de objetos entryData
 * @param {string} eventTemplate - Ruta a la plantilla del evento
 * @returns {Promise<string>} URL de la imagen subida a Cloudinary
 */
async function generateEntriesImage(entriesDataArray, eventTemplate) {
    const ticketResults = await Promise.all(
        entriesDataArray.map(entryData => generateTicketBuffer(entryData, eventTemplate))
    );

    const { width, height } = ticketResults[0];
    const separator = 8;
    const totalHeight = height * ticketResults.length + separator * (ticketResults.length - 1);

    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, totalHeight);

    for (let i = 0; i < ticketResults.length; i++) {
        const ticketImage = await loadImage(ticketResults[i].buffer);
        const y = i * (height + separator);
        ctx.drawImage(ticketImage, 0, y, width, height);
    }

    const finalBuffer = canvas.toBuffer('image/png');

    const groupId = `${entriesDataArray[0].id_entrada}_${Date.now()}`;
    const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'eventhub/entradas',
                resource_type: 'image',
                public_id: `entradas_${groupId}`
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(finalBuffer);
    });

    return result.secure_url;
}

/**
 * Obtiene la ruta de la plantilla de un evento
 */
function getEventTemplatePath(eventId) {
    if (!eventId) return null;

    for (const dir of TEMPLATE_DIRS) {
        const pngPath = path.join(dir, `${eventId}-template.png`);
        const jpgPath = path.join(dir, `${eventId}-template.jpg`);
        const jpegPath = path.join(dir, `${eventId}-template.jpeg`);
        const webpPath = path.join(dir, `${eventId}-template.webp`);

        const templatePath = [pngPath, jpgPath, jpegPath, webpPath].find(c => fs.existsSync(c));
        if (templatePath) return templatePath;
    }

    return null;
}

module.exports = {
    generateEntryImage,
    generateEntriesImage,
    getEventTemplatePath
};
