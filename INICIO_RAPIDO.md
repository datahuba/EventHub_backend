# RESUMEN RÁPIDO - Sistema de Generación de Entradas EventHub

## ✅ Que se implementó

### Backend (EventHub_backend)
1. **Nuevo endpoint:** `/api/generar-entrada`
   - Recibe: ID, nombre, monto, método de pago, datos QR
   - Genera: Imagen de entrada con QR integrado
   - Sube a: Cloudinary automáticamente
   - Retorna: URL de la imagen

2. **Nuevo servicio:** `utils/entryGenerator.js`
   - Genera código QR usando biblioteca `qrcode`
   - Dibuja imagen en Canvas con datos personales
   - Integra con Cloudinary para upload

3. **Librerías agregadas:**
   ```json
   "canvas": "^2.11.2"
   "qrcode": "^1.5.3"
   "cloudinary": "^1.41.0"
   ```

### Frontend (EventHub_frontend)
1. **Componente:** `src/components/EntryGeneratorPanel.tsx`
   - Panel admin para generar entradas
   - Opción: Carga CSV o entrada manual
   - Muestra estado de generación
   - Permite descargar imágenes

2. **Servicio:** `src/services/entryService.ts`
   - Cliente HTTP para llamar backend
   - Manejo de errores
   - Funciones de batch

3. **Ruta agregada:** `/admin/entradas`

---

## 🚀 Para empezar (5 pasos)

### Paso 1: Backend - Configurar credenciales
```bash
cd EventHub_backend

# Copiar template de env
cp .env.example .env

# Editar .env con tus credenciales:
# CLOUDINARY_CLOUD_NAME=dckj1wnra
# CLOUDINARY_API_KEY=726662772921572
# CLOUDINARY_API_SECRET=wM0qnCt_9kdxFJN7pwmGHvy6oYs
```

### Paso 2: Backend - Instalar dependencias
```bash
npm install
```

### Paso 3: Backend - Probar localmente
```bash
npm start
# Debería estar en http://localhost:4000
```

### Paso 4: Frontend - Instalar si no está hecho
```bash
cd EventHub_frontend
npm install
```

### Paso 5: Acceder al panel
```
Frontend: http://localhost:5173 (Vite, adjust port if needed)
Ruta: http://localhost:5173/admin/entradas
```

---

## 📝 Ejemplo de uso desde n8n

```json
POST https://tu-backend.com/api/generar-entrada

Body:
{
  "id_entrada": "{{ $json.ID }}",
  "nombre": "{{ $json.NOMBRE }}",
  "monto_pagado": "{{ $json.TOTAL }}",
  "metodo_pago": "{{ $json.PAGO }}",
  "datos_qr": "{{ $json.P }}",
  "event_id": "san-perreo-2024"
}

Response:
{
  "success": true,
  "imagen_url": "https://res.cloudinary.com/.../entrada_ENT-001_xxx.png"
}
```

---

## 📚 Documentación

- **Integración n8n:** `GUIA_INTEGRACION_N8N.md`
- **Flujos n8n ejemplos:** `FLUJO_N8N_EJEMPLO.md`
- **Readme nuevo:** `README_NUEVA_FUNCIONALIDAD.md`

---

## 🎨 Personalización

### Cambiar estilo de entrada
Edita `utils/entryGenerator.js`:
- Línea ~80: Colores del fondo `ctx.fillStyle = '#1a1a1a'`
- Línea ~100: Estilos de texto `ctx.font = 'bold 36px Arial'`
- Línea ~120: Posiciones de elementos

### Usar plantilla personalizada
1. Guarda imagen en: `EventHub_backend/public/templates/`
2. Nombre: `{event_id}-template.png`
3. Ejemplo: `san-perreo-2024-template.png`
4. Envía `event_id` en la solicitud

---

## 🐛 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `canvas` no compila | `brew install cairo pango libpng jpeg giflib` (macOS) |
| Cloudinary rechaza | Verifica .env tiene credenciales correctas |
| Backend no inicia | `npm install` y revisa Node version (16+) |
| Imagen vacía | Verifica que `datos_qr` no sea null/undefined |

---

## 📊 Flujo Completo

```
n8n recibe dato
     ↓
Extrae del Google Sheet
     ↓
Envía a /api/generar-entrada
     ↓
Backend crea imagen con QR
     ↓
Sube a Cloudinary
     ↓
Retorna URL
     ↓
n8n actualiza Google Sheet
     ↓
n8n envía por WhatsApp/Telegram (opcional)
```

---

## ⚙️ Variables Cloudinary

Ya configuradas en tu .env:
- **Cloud Name:** dckj1wnra
- **API Key:** 726662772921572
- **API Secret:** wM0qnCt_9kdxFJN7pwmGHvy6oYs

Las imágenes se guardan en: `eventhub/entradas/` en tu cuenta Cloudinary

---

## 💡 Tips

1. **Para debugging:** Abre DevTools del navegador (F12) en `/admin/entradas`
2. **Prueba rápida:** Usa la herramienta Postman o insomnia con POST a localhost:4000
3. **CSV recomendado:** Columns: `id_entrada,nombre,monto_pagado,metodo_pago,datos_qr`
4. **n8n:** Empieza con trigger HTTP antes de Telegram

---

## 📞 Próximos pasos

1. Deploy backend a Vercel/Heroku
2. Configurar workflow en n8n
3. Crear plantillas de eventos (si quieres personalización)
4. Agregar autenticación al panel admin (seguridad)

---

**Listo para usar. Pregunta si necesitas ayuda configurando n8n o algo específico.**
