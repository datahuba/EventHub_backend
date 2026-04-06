# Flujo n8n para Generar Entradas

## Exportar esta configuración a n8n

Este es un flujo completo que puedes importar directamente a n8n y adaptarlo según tus necesidades.

## Flujo simplificado (Paso a paso)

### 1. Trigger: HTTP Request (Webhook recibiendo datos de Telegram)

```yaml
Trigger: HTTP Webhook
  - URL: https://tu-n8n.com/webhook/entrada
  - Method: POST
```

### 2. Node: Google Sheets - Get Rows

Obtiene las órdenes pendientes de Google Sheets:

```
Config:
  - Credential: Google Sheets
  - Spreadsheet ID: [Tu Google Sheet ID]
  - Sheet: Respuestas
  - Range: [Especificar rango con datos]
```

### 3. Node: HTTP Request - Generar Entrada

Llama a tu API de EventHub:

```
URL: https://event-hub-backend.vercel.app/api/generar-entrada
Method: POST
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "id_entrada": "={{ $json.ID }}",
  "nombre": "={{ $json.NOMBRE }}",
  "monto_pagado": "={{ $json.TOTAL }}",
  "metodo_pago": "={{ $json.PAGO }}",
  "datos_qr": "={{ $json.P }}",
  "event_id": "={{ $json.EVENT_ID }}"
}
```

### 4. Node: Google Sheets - Update Row

Actualiza la fila en Google Sheets con la URL de la imagen:

```
Config:
  - Spreadsheet ID: [Tu Google Sheet ID]
  - Sheet: Respuestas
  - Range: V{{ $input.index }}
  - Values:
    - V: ={{ $json.imagen_url }}
```

### 5. Node: Telegram - Send Message (Opcional)

Notifica al usuario que su entrada fue generada:

```
Chat ID: ={{ $json.chat_id }}
Message: Entrada generada: {{ $json.imagen_url }}
```

---

## JSON Completo para Automatización (Advanced)

Si tienes múltiples órdenes:

### Node: Loop through items

```
Loop through: [Array de órdenes]
```

Para cada orden, ejecuta:
- HTTP Request a `/api/generar-entrada`
- Actualiza Google Sheets
- Opcionalmente: Envía notificación

---

## Variables de Ejemplo en n8n

Estas son las variables que n8n puede obtener del Google Sheet:

```
ID: "ENT-001"
NOMBRE: "Mario Adrián Ortiz"
TELÉFONO: "+591 7085268"
NOMBRE EMAIL: "mario.adrian@email.com"
OCR NOMBRE: "Mario Adrián Ortiz"
HORA: "2024-02-11 T01:1"
OCR Monto: 35
OCR Fecha: "10/02/2026"
PAGO: "qr"
P: "JQSGYD3V" (El código QR)
TOTAL: 35
EVENT_ID: "san-perreo-2024"
```

---

## Conexión con Telegram

Si deseas que n8n envíe las entradas por Telegram:

### 1. Telegram - Get Updates de un Bot

```
Trigger: Telegram Bot New Message
  - Bot Token: [Tu bot token]
  - Listen: private_messages
```

### 2. Procesar mensaje

Extrae código de entrada o ID cliente

### 3. Query a Google Sheets

Busca los datos de esa orden

### 4. Generar entrada (paso anterior)

### 5. Enviar por Telegram

```
Node: Telegram - Send Document
  - Chat ID: ={{ $json.chat_id }}
  - File URL: ={{ $json.imagen_url }}
  - Caption: Tu entrada está lista!
```

---

## Manejo de Errores

Agregar un nodo "Error Handler" para:
- Log de errores en Google Sheets
- Retry automático si falla Cloudinary
- Notificación a administrador

```
On Error:
  - Escribir error en columna STATUS: "Error"
  - Enviar email/telegram al admin
  - Retry después de 5 minutos
```

---

## Testing desde n8n

Para probar sin Telegram:

1. Usa **Execute Workflow** en n8n
2. O crea un HTTP Request test:

```bash
curl -X POST https://tu-n8n.com/webhook/entrada \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "ENT-001",
    "NOMBRE": "Test User",
    "TOTAL": "50",
    "PAGO": "qr",
    "P": "TEST123",
    "EVENT_ID": "test-event"
  }'
```

---

## Checklist de Configuración

- [ ] Backend de EventHub deployado y corriendo
- [ ] Credenciales de Cloudinary en .env del backend
- [ ] Google Sheet ID obtenido
- [ ] Credenciales de Google en n8n configuradas
- [ ] HTTP Request URL actualizada al dominio correcto
- [ ] Headers Content-Type: application/json
- [ ] Body con las variables correctas del Sheet
- [ ] Google Sheets - Update Row configurado para escribir URL
- [ ] Teste el flujo manualmente primero
- [ ] Configura triggers automáticos (Telegram, Webhook, etc.)

---

## Troubleshooting n8n

### La solicitud HTTP falla
- Verifica que el backend esté corriendo: `curl http://localhost:4000`
- Verifica la URL exacta del servidor deployado
- Revisa los headers: Content-Type debe ser application/json

### Google Sheets no actualiza
- Verifica que la credencial tenga permisos de escritura
- Usa el Sheet ID correcto (mira URL: `/d/{SheetID}/`
- Verifica el rango: debe ser `Range!V2` o similar

### La imagen no se genera
- Verifica que `datos_qr` no sea undefined en el body
- Prueba con curl primero:
  ```bash
  curl -X POST http://localhost:4000/api/generar-entrada \
    -H "Content-Type: application/json" \
    -d '{"id_entrada":"TEST","nombre":"test","monto_pagado":"10","metodo_pago":"qr","datos_qr":"TEST123"}'
  ```

### Cloudinary rechaza la imagen
- Verifica credenciales en .env
- Cuela que el buffer de canvas se esté convirtiendo correctamente
- Revisa logs del backend: `npm start`

---

## Performance / Rate Limiting

Para lotes grandes (1000+ entradas):

1. **Aumenta concurrencia en n8n:**
   - Usa "Batch" node
   - Procesa 5-10 solicitudes en paralelo

2. **Cloudinary tiene rate limits:**
   - Free tier: ~75 subidas/min
   - Agrega delays entre requests si es necesario

```
Node: Sleep
Time: 100ms (entre requests)
```

3. **Google Sheets API:**
   - Límite: 300 solicitudes/minuto
   - Agrupa updates si es posible

---

Última actualización: Abril 2024
