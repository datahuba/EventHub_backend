# Guía de Integración: EventHub + n8n - Generador de Entradas

## Descripción General

Este sistema permite generar automáticamente entradas (tickets) con QR y datos personales para eventos. El flujo es:

1. **n8n** recibe un mensaje de Telegram o Webhook
2. **n8n** extrae el código QR desde Google Sheets
3. **n8n** llama al endpoint `/api/generar-entrada` del backend de EventHub
4. **EventHub Backend** genera la imagen de la entrada y la sube a Cloudinary
5. **n8n** obtiene la URL de la imagen y la guarda en Google Sheets

## Requisitos Previos

### Backend
- Node.js 16+
- Docker (opcional, para deployment)
- Variables de entorno configuradas (.env)

### Cloudinary
- Cuenta activa con credenciales configuradas
- Acceso a subir archivos

## Instalación Backend

1. **Instalar dependencias:**
```bash
cd EventHub_backend
npm install
```

2. **Configurar .env:**
```bash
cp .env.example .env
# Edita .env con tus credenciales
```

3. **Ejecutar:**
```bash
npm start
# O con nodemon para desarrollo:
npm install -g nodemon
nodemon index.js
```

El servidor estará en `http://localhost:4000`

## API Endpoint

### POST `/api/generar-entrada`

**Request Body:**
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

**Parámetros:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id_entrada` | string | ✓ | ID único de la entrada |
| `nombre` | string | ✓ | Nombre del asistente |
| `monto_pagado` | string | ✓ | Monto en formato "35" o "35.50" |
| `metodo_pago` | string | ✓ | qr, transferencia, efectivo, etc |
| `datos_qr` | string | ✓ | Datos a codificar en el QR |
| `event_id` | string | ✗ | ID para aplicar plantilla (si existe) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Entrada generada exitosamente",
  "imagen_url": "https://res.cloudinary.com/...",
  "id_entrada": "ENT-001"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Faltan campos requeridos: ...",
  "details": "..."
}
```

## Integración con n8n

### Paso 1: Configurar trigger en n8n

Crea un nuevo workflow en n8n con estos pasos:

1. **Trigger:** Telegram o HTTP Request
2. **Google Sheets:** Lee datos de las órdenes/compras
3. **HTTP Request:** Llama a EventHub Backend

### Paso 2: Configurar HTTP Request Node

**URL:** `https://tu-evento-backend.com/api/generar-entrada`

**Método:** POST

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (usando expresiones de n8n):**
```json
{
  "id_entrada": "{{ $json.ID }}",
  "nombre": "{{ $json.NOMBRE }}",
  "monto_pagado": "{{ $json.TOTAL }}",
  "metodo_pago": "{{ $json.PAGO }}",
  "datos_qr": "{{ $json.P }}",
  "event_id": "{{ $json.EVENT_ID }}"
}
```

### Paso 3: Procesar Respuesta

La respuesta contendrá `imagen_url`, que puedes:
- Guardar en Google Sheets (columna V recomendada)
- Enviar por email
- Subirla nuevamente a otra plataforma

**Ejemplo de configuración para actualizar Google Sheets:**

```json
{
  "spreadsheetId": "YOUR_SHEET_ID",
  "range": "Respuestas!V{{ $json.item_index }}",
  "values": [["{{ $response.body.imagen_url }}"]]
}
```

## Estructura de Plantillas (Opcional)

Si deseas usar plantillas personalizadas por evento:

1. **Crear directorio:**
```bash
mkdir -p EventHub_backend/public/templates
```

2. **Colocar plantillas:**
```
public/templates/
├── san-perreo-2024-template.png
├── concierto-jazz-2024-template.png
└── otro-evento-template.png
```

3. **Nombrado:** `{event_id}-template.png`

Cuando envíes `event_id` al endpoint, se superpondrán los datos sobre esta plantilla.

## Ejemplos Completos

### Ejemplo 1: Desde curl

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

### Ejemplo 2: Desde Node.js

```javascript
const axios = require('axios');

const entryData = {
  id_entrada: "ENT-001",
  nombre: "Mario Adrián Ortiz",
  monto_pagado: "35",
  metodo_pago: "qr",
  datos_qr: "JQSGYD3V"
};

axios.post('http://localhost:4000/api/generar-entrada', entryData)
  .then(response => {
    console.log('Imagen:', response.data.imagen_url);
  })
  .catch(error => {
    console.error('Error:', error.response.data);
  });
```

### Ejemplo 3: Desde Python

```python
import requests

entry_data = {
    "id_entrada": "ENT-001",
    "nombre": "Mario Adrián Ortiz",
    "monto_pagado": "35",
    "metodo_pago": "qr",
    "datos_qr": "JQSGYD3V"
}

response = requests.post(
    'http://localhost:4000/api/generar-entrada',
    json=entry_data
)

print(response.json()['imagen_url'])
```

## Troubleshooting

### Error: "Cloudinary credentials missing"
- Verifica que `.env` tenga `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Error: "Canvas module not found"
- En sistemas Linux/Mac, canvas necesita compiladores:
  ```bash
  # En macOS
  brew install pkg-config cairo pango libpng jpeg giflib
  
  # En Ubuntu
  sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev
  
  npm install
  ```

### Las imágenes se suben pero sin datos
- Verifica que los valores en `datos_qr` no sean undefined/null
- Usa valores por defecto en n8n si los campos están vacíos

### QR no se legible
- Asegúrate que `datos_qr` sea una cadena corta (máx 100 caracteres)
- El sistema usa corrección de error nivel H (muy resistente)

## Panel Admin Frontend

Se incluye un panel en el frontend para generar entradas manualmente:

```
EventHub_frontend/src/components/EntryGeneratorPanel.tsx
```

Puedes acceder ingresando la ruta `/admin/entradas` (si la configuras en las rutas).

## Variables de Entorno Necesarias

**Backend (.env):**
```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**Frontend (.env.local):**
```
REACT_APP_API_URL=https://tu-evento-backend.com
```

## Deployment

### Vercel (Frontend)
```bash
npm run build
# Commit y push a GitHub
# Vercel se despliega automáticamente
```

### Heroku/Railway/Render (Backend)
```bash
# Agregar buildpack de nodejs
# Configurar variables de entorno en dashboard
# Hacer push
```

## Soporte

Para problemas:
1. Revisa logs del backend: `npm start`
2. Verifica respuestas en n8n
3. Descarga la imagen de Cloudinary para verificar generación

---

**Última actualización:** abril 2024
