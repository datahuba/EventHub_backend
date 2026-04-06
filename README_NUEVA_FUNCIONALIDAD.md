# EventHub Backend - Generador de Entradas

## Descripción

API backend para EventHub que permite:
1. ✅ Generar entradas (tickets) con QR automáticamente
2. ✅ Subir imágenes a Cloudinary
3. ✅ Integración con Google Sheets
4. ✅ Integración con n8n para automatización
5. ✅ Integración con Telegram para notificaciones

## Nuevas Características

### Endpoint: `/api/generar-entrada`

Genera una imagen de entrada con QR y datos del comprador.

**POST** `https://tu-backend.com/api/generar-entrada`

```json
{
  "id_entrada": "ENT-001",
  "nombre": "Mario Adrián Ortiz",
  "monto_pagado": "35",
  "metodo_pago": "qr",
  "datos_qr": "JQSGYD3V",
  "event_id": "san-perreo-2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Entrada generada exitosamente",
  "imagen_url": "https://res.cloudinary.com/.../",
  "id_entrada": "ENT-001"
}
```

## Instalación

### Requisitos
- Node.js 16+
- npm o yarn
- Credenciales de Cloudinary
- (Opcional) Docker para deployment

### Pasos

1. **Clonar y entrar al directorio:**
```bash
cd EventHub_backend
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

**Variables requeridas en .env:**
```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
GOOGLE_SHEET_ID=tu_sheet_id
GOOGLE_CREDENTIALS_JSON={...}
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
GEMINI_API_KEY=tu_api_key
PORT=4000
```

4. **Iniciar servidor:**
```bash
npm start
```

O con nodemon para desarrollo:
```bash
npm install -g nodemon
nodemon index.js
```

El servidor estará disponible en: `http://localhost:4000`

## Estructura de Archivos

```
EventHub_backend/
├── index.js                    # Servidor principal y endpoints
├── package.json               # Dependencias
├── .env.example              # Variables de entorno (template)
├── utils/
│   └── entryGenerator.js      # Funciones para generar entradas
├── public/
│   └── templates/            # Plantillas de eventos (opcional)
│       ├── san-perreo-template.png
│       └── otro-evento-template.png
├── GUIA_INTEGRACION_N8N.md   # Guía completa de n8n
└── FLUJO_N8N_EJEMPLO.md      # Ejemplos de flujos n8n
```

## Nuevas Dependencias Agregadas

```
"canvas": "^2.11.2"           # Generación de imágenes
"qrcode": "^1.5.3"            # Generación de códigos QR
"cloudinary": "^1.41.0"       # Upload de imágenes
```

## Endpoints Existentes

### POST `/api/submit`
Registra asistentes a eventos con comprobante de pago

**Multipart form-data:**
- `proof` (file) - Imagen del comprobante
- `buyer` (JSON) - Datos del comprador
- `totalAmount` (number) - Total pagado
- `paymentMethod` (string) - Método de pago
- `attendees` (JSON) - Lista de asistentes

---

## Integración con n8n

### Flujo Básico

1. Telegram trigger → Extrae código QR
2. Google Sheets → Obtiene datos del comprador
3. HTTP Request → Llama a `/api/generar-entrada`
4. Google Sheets → Actualiza URL de imagen
5. Telegram → Envía entrada al usuario

### Configuración Rápida

Ver: `GUIA_INTEGRACION_N8N.md`

---

## Panel Admin Frontend

También se incluye un panel en el frontend para generar entradas manualmente:

```
URL: /admin/entradas
Ruta: EventHub_frontend/src/components/EntryGeneratorPanel.tsx
```

Características:
- ✅ Formulario de entrada manual
- ✅ Importar desde CSV
- ✅ Previsualización de datos
- ✅ Descarga de imágenes

---

## Ejemplos de Uso

### Desde curl

```bash
curl -X POST http://localhost:4000/api/generar-entrada \
  -H "Content-Type: application/json" \
  -d '{
    "id_entrada": "ENT-001",
    "nombre": "Mario Adrián Ortiz",
    "monto_pagado": "35",
    "metodo_pago": "qr",
    "datos_qr": "JQSGYD3V"
  }'
```

### Desde JavaScript

```javascript
const response = await fetch('http://localhost:4000/api/generar-entrada', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id_entrada: 'ENT-001',
    nombre: 'Mario Adrián Ortiz',
    monto_pagado: '35',
    metodo_pago: 'qr',
    datos_qr: 'JQSGYD3V'
  })
});

const data = await response.json();
console.log('Imagen:', data.imagen_url);
```

### Desde Python

```python
import requests

response = requests.post(
  'http://localhost:4000/api/generar-entrada',
  json={
    'id_entrada': 'ENT-001',
    'nombre': 'Mario Adrián Ortiz',
    'monto_pagado': '35',
    'metodo_pago': 'qr',
    'datos_qr': 'JQSGYD3V'
  }
)

print(response.json()['imagen_url'])
```

---

## Deployment

### Vercel (Recomendado)
```bash
# Conectar a GitHub
# Configurar variables de entorno en Vercel dashboard
git push
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

```bash
docker build -t eventhub-backend .
docker run -p 4000:4000 --env-file .env eventhub-backend
```

### Heroku / Railway / Render

1. Push a GitHub
2. Conectar repositorio
3. Configurar variables de entorno
4. Deploy automático

---

## Solución de Problemas

### Canvas module no se compila
```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib
npm install

# Ubuntu
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev
npm install
```

### Cloudinary rechaza uploads
- Verifica que `CLOUDINARY_API_SECRET` sea correcto
- Revisa logs: `console.error` en `entryGenerator.js`

### Google Sheets no se actualiza desde n8n
- Verifica permisos de la credencial
- Usa el Sheet ID correcto
- Valida el rango (ej: `Respuestas!V2`)

---

## Scripts Útiles

```bash
# Desarrollo con auto-reload
npm install -g nodemon
nodemon index.js

# Ver logs
npm start

# Limpiar node_modules si hay problemas
rm -rf node_modules package-lock.json
npm install
```

---

## API de Cloudinary Usada

```javascript
cloudinary.uploader.upload_stream({
  folder: 'eventhub/entradas',
  public_id: `entrada_${id}_${timestamp}`
})
```

- **Folder:** `eventhub/entradas` - Organiza uploads
- **Public ID:** Nombre único por entrada

---

## Variables de Entorno por Ambiente

### Development (.env.local)
```
PORT=4000
NODE_ENV=development
```

### Production (.env)
```
PORT=process.env.PORT (Vercel asigna automáticamente)
NODE_ENV=production
```

---

## Soporte

**Issues comunes:**

1. **"Cannot find module 'canvas'"**
   - Solución: Instalar dependencias del sistema (ver arriba)

2. **"Cloudinary invalid credentials"**
   - Solución: Verifica .env tiene valores correctos

3. **"Google Sheets permission denied"**
   - Solución: Revisa que la service account tenga acceso al Sheet

4. **"HTTP 500 en /api/generar-entrada"**
   - Solución: Revisa logs del servidor para más detalles

---

## Roadmap Futuro

- [] Autenticación/JWT para endpoints
- [] Rate limiting
- [] Caché de imágenes
- [] Webhook para eventos de Cloudinary
- [] API de descarga en batch
- [] Estadísticas de entradas generadas

---

## Licencia

Privado - Proyecto EventHub

---

**Última actualización:** Abril 2024
**Versión:** 2.0.0 (con generador de entradas)
