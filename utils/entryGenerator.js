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
 * Genera una imagen de entrada (ticket) con QR y datos personales
 * @param {Object} entryData - Datos de la entrada
 * @param {string} entryData.id_entrada - ID único de la entrada
 * @param {string} entryData.nombre - Nombre del asistente
 * @param {string} entryData.monto_pagado - Monto pagado
 * @param {string} entryData.metodo_pago - Método de pago (ej: "qr", "transferencia")
 * @param {string} entryData.datos_qr - Datos codificados en el QR
 * @param {string} eventTemplate - Ruta a la plantilla del evento (imagen base)
 * @returns {Promise<string>} URL de la imagen subida a Cloudinary
 */
async function generateEntryImage(entryData, eventTemplate) {
    try {
        // Resolver plantilla: primero la del evento; si no existe, usar la primera plantilla disponible.
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
            margin: 2   // zona de silencio mínima para que sea escaneable
        });

        // 2. Crear canvas
        // Si hay plantilla, respeta su orientación/dimensiones; si no, usa horizontal por defecto.
        const width = templateImage ? templateImage.width : 1600;
        const height = templateImage ? templateImage.height : 900;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fondo del ticket (color personalizable)
        ctx.fillStyle = '#1a1a1a'; // Fondo negro base
        ctx.fillRect(0, 0, width, height);

        // Si hay plantilla, cargarla como imagen de fondo
        if (templateImage) {
            ctx.drawImage(templateImage, 0, 0, width, height);
        }

        // 3. Overlay semi-transparente para legibilidad del texto
        const infoPanelHeight = Math.max(220, Math.round(height * 0.26));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, height - infoPanelHeight, width, infoPanelHeight);

        // 4. Agregar QR en la esquina superior derecha
        const qrImage = await loadImage(qrDataUrl);
        qrImage.src = qrDataUrl;
        const qrSize = Math.round(Math.min(width, height) * 0.176);
        const qrMargin = Math.round(Math.min(width, height) * 0.02);
        const qrPadding = 8;
        const qrX = width - qrSize - qrMargin;
        const qrY = qrMargin;
        // Fondo blanco detrás del QR para garantizar contraste y escaneabilidad
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - qrPadding, qrY - qrPadding, qrSize + qrPadding * 2, qrSize + qrPadding * 2);
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // 5. Agregar ID de entrada (arriba del QR)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(16, Math.round(width * 0.014))}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(`ID: ${entryData.id_entrada}`, width - qrMargin, qrMargin + qrSize + 26);

        // 6. Texto de datos personales (abajo)
        ctx.fillStyle = '#FFFFFF';
        const panelTop = height - infoPanelHeight;
        const leftPad = Math.round(width * 0.03);

        ctx.font = `bold ${Math.max(28, Math.round(width * 0.03))}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`Nombre: ${entryData.nombre}`, leftPad, panelTop + Math.round(infoPanelHeight * 0.42));

        ctx.font = `bold ${Math.max(24, Math.round(width * 0.024))}px Arial`;
        ctx.fillText(`Monto: Bs. ${entryData.monto_pagado}`, leftPad, panelTop + Math.round(infoPanelHeight * 0.67));

        ctx.font = `bold ${Math.max(20, Math.round(width * 0.018))}px Arial`;
        ctx.fillText(`Metodo: ${entryData.metodo_pago}`, leftPad, panelTop + Math.round(infoPanelHeight * 0.86));

        // 7. Línea divisoria
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const dividerY = panelTop + Math.round(infoPanelHeight * 0.2);
        ctx.moveTo(leftPad, dividerY);
        ctx.lineTo(width - leftPad, dividerY);
        ctx.stroke();

        // 8. Convertir canvas a buffer y subir a Cloudinary
        const imageBuffer = canvas.toBuffer('image/png');

        // Subir a Cloudinary
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
            
            uploadStream.end(imageBuffer);
        });

        return result.secure_url;

    } catch (error) {
        console.error('Error generando imagen de entrada:', error);
        throw error;
    }
}

/**
 * Obtiene la ruta de la plantilla de un evento
 * @param {string} eventId - ID del evento
 * @returns {string} Ruta a la plantilla
 */
function getEventTemplatePath(eventId) {
    if (!eventId) return null;

    for (const dir of TEMPLATE_DIRS) {
        const pngPath = path.join(dir, `${eventId}-template.png`);
        const jpgPath = path.join(dir, `${eventId}-template.jpg`);
        const jpegPath = path.join(dir, `${eventId}-template.jpeg`);
        const webpPath = path.join(dir, `${eventId}-template.webp`);

        const templatePath = [pngPath, jpgPath, jpegPath, webpPath].find((candidate) => fs.existsSync(candidate));
        if (templatePath) return templatePath;
    }

    return null;
}

module.exports = {
    generateEntryImage,
    getEventTemplatePath
};
