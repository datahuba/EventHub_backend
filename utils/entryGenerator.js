const { createCanvas, registerFont } = require('canvas');
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
        // 1. Generar QR
        const qrDataUrl = await QRCode.toDataURL(entryData.datos_qr, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 200,
            margin: 0
        });

        // 2. Crear canvas
        const width = 1200;
        const height = 1600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fondo del ticket (color personalizable)
        ctx.fillStyle = '#1a1a1a'; // Fondo negro base
        ctx.fillRect(0, 0, width, height);

        // Si hay plantilla, cargarla como imagen de fondo
        if (eventTemplate && fs.existsSync(eventTemplate)) {
            try {
                const { createCanvas: _, Image } = require('canvas');
                const image = new (require('canvas').Image)();
                const templateData = fs.readFileSync(eventTemplate);
                image.src = templateData;
                ctx.drawImage(image, 0, 0, width, height);
            } catch (e) {
                console.warn('No se pudo cargar plantilla, usando fondo base', e.message);
            }
        }

        // 3. Overlay semi-transparente para legibilidad del texto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, height - 500, width, 500);

        // 4. Agregar QR en la esquina superior derecha
        const qrImage = new (require('canvas').Image)();
        qrImage.src = qrDataUrl;
        ctx.drawImage(qrImage, width - 250, 20, 230, 230);

        // 5. Agregar ID de entrada (arriba del QR)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`ID: ${entryData.id_entrada}`, width - 20, 290);

        // 6. Texto de datos personales (abajo)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Nombre: ${entryData.nombre}`, 50, height - 350);

        ctx.font = 'bold 32px Arial';
        ctx.fillText(`Monto: $${entryData.monto_pagado}`, 50, height - 250);

        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Método: ${entryData.metodo_pago}`, 50, height - 150);

        // 7. Línea divisoria
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(50, height - 420);
        ctx.lineTo(width - 50, height - 420);
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
    const templatesDir = path.join(__dirname, '../public/templates');
    const templatePath = path.join(templatesDir, `${eventId}-template.png`);
    return templatePath;
}

module.exports = {
    generateEntryImage,
    getEventTemplatePath
};
