# Checklist de Pre-Deployment

## Antes de Ir a Producción

### Backend Setup
- [ ] `.env` tiene todas las variables requeridas
- [ ] CLOUDINARY_* variables son correctas
- [ ] GOOGLE_SHEET_ID es válido
- [ ] TELEGRAM_BOT_TOKEN es válido (si usas Telegram)
- [ ] GEMINI_API_KEY es válido
- [ ] `npm install` completó sin errores
- [ ] `npm start` inicia sin errores
- [ ] Servidor responde en http://localhost:4000

### Prueba Endpoint Localmente
- [ ] GET http://localhost:4000 devuelve respuesta
- [ ] POST /api/generar-entrada con datos de prueba genera imagen
- [ ] Imagen se sube a Cloudinary (verifica dashboard)
- [ ] URL devuelta es accesible públicamente
- [ ] QR código es legible

### Canvas/Dependencies
- [ ] `canvas` compiló correctamente
- [ ] `qrcode` importa sin errores
- [ ] `cloudinary` se conecta

### Frontend Setup
- [ ] `/admin/entradas` es accesible
- [ ] Formulario carga sin errores
- [ ] FileUpload funciona
- [ ] Puedes agregar entradas manuales
- [ ] Generación de una entrada completa

### Google Sheets (si usas n8n)
- [ ] Service account tiene acceso al Sheet
- [ ] Google Sheets API habilitada
- [ ] Columns V+ están vacías o listos para URL

### Cloudinary
- [ ] Cuenta activa
- [ ] Credenciales verificadas
- [ ] Folder `eventhub/entradas` se creará automáticamente
- [ ] Has revisado uploads en dashboard

### n8n (si usas)
- [ ] Webhook configurado
- [ ] HTTP Request node apunta a URL correcta
- [ ] Headers: `Content-Type: application/json`
- [ ] Body tiene variables correctas
- [ ] Google Sheets update node escribe en columna correcta
- [ ] Prueba completa del workflow funciona

### Seguridad
- [ ] `.env` NO está en git (revisar .gitignore)
- [ ] Credenciales NO hardcodeadas en código
- [ ] CORS configurado correctamente
- [ ] API KEY no expuesto en frontend

---

## Deployment

### Seleccionar Plataforma

- [ ] **Vercel** (Si usas Next.js o quieres simplicidad)
  - Push a GitHub
  - Conectar repo en vercel.com
  - Configurar variables de entorno
  
- [ ] **Railway** (Recomendado para Node)
  - railway.app
  - Conectar GitHub
  - Auto-deploy en push
  
- [ ] **Heroku** (Classic pero funciona)
  - Instalar Heroku CLI
  - `heroku create`
  - `npm start` debe ser comando correcto
  
- [ ] **Docker** (Si tienes infraestructura)
  - Build: `docker build -t eventhub:latest .`
  - Run: `docker run -e CLOUDINARY_CLOUD_NAME=... -p 4000:4000 eventhub`

### Pre-Deployment Check
- [ ] `npm install` sin warnings
- [ ] `npm start` inicia en 5 segundos max
- [ ] Node version >= 16
- [ ] package-lock.json actualizado
- [ ] package.json tiene versiones correctas

### Deploy (Vercel Ejemplo)
```bash
# 1. Commit final
git add .
git commit -m "Add entry generation feature"

# 2. Push a main/master
git push origin main

# 3. Vercel se despliega automáticamente
# Verifica: https://tu-proyecto.vercel.app

# 4. Test endpoint
curl https://tu-proyecto.vercel.app/api/generar-entrada
```

### Post-Deployment
- [ ] Endpoint responde correctamente
- [ ] Generas una entrada de prueba
- [ ] URLCloudinary funciona
- [ ] n8n apunta a URL nueva
- [ ] Google Sheets se actualiza via n8n

---

## Monitoreo

### Logs
- [ ] Backend genera logs de cada solicitud
- [ ] Error logs son informativos
- [ ] No hay errores 500

### Performance
- [ ] Generación tarda < 5 segundos
- [ ] Cloudinary upload < 3 segundos
- [ ] Total < 10 segundos

### Errores Comunes
- [ ] "Canvas not found" → instalar dependencias del sistema
- [ ] "Invalid Cloudinary credentials" → revisar .env
- [ ] "Timeout" → aumentar timeout en n8n

---

## Escalabilidad Futura

- [ ] Rate limiting configurado si necesitas
- [ ] Caché de QR si repites códigos
- [ ] Batch processing si generas muchas a la vez
- [ ] Webhook de confirmación si es importante

---

## Rollback Plan

Si algo va mal:

```bash
# 1. Ver último commit bueno
git log --oneline

# 2. Revertir si es necesario
git revert <commit-hash>
git push

# 3. Plataforma auto-redeploy (Vercel/Railway)
```

---

## Documentación Final

- [ ] Actualizar GUIA_INTEGRACION_N8N.md si cambiaste URLs
- [ ] INICIO_RAPIDO.md tiene URLs correctas
- [ ] README.md menciona nueva feature
- [ ] Variables de entorno documentadas

---

## Usuarios / Permisos

Si otros van a usar el sistema:

- [ ] Crear usuario de app en Cloudinary (seguridad)
- [ ] Documentar cómo agregar plantillas
- [ ] Explicar cómo usar panel admin
- [ ] Dejar contacto para soporte

---

## URLs Importantes Después del Deploy

Reemplaza en todos lados:

```
VIEJO: http://localhost:4000
NUEVO: https://tu-backend.vercel.app
```

En:
- n8n: HTTP Request node
- Frontend: .env REACT_APP_API_URL
- Documentación
- Postman/Insomnia collections

---

## Prueba Final

### Test Manual Completo

1. **Acceder panel admin:**
   ```
   https://tu-frontend.vercel.app/admin/entradas
   ```

2. **Generar una entrada:**
   - Event ID: `test-2024`
   - Nombre: `Juan Test`
   - Monto: `50`
   - Método: `qr`
   - Datos QR: `TEST123`
   - ✓ Click "Generar"

3. **Verificar resultado:**
   - ✓ Estado debe cambiar a "Completado"
   - ✓ Imagen debe ser visible
   - ✓ Link debe funcionar en navegador
   - ✓ QR debe ser legible (fotografía)

4. **Test n8n (si aplica):**
   - ✓ Enviar webhook con datos
   - ✓ Endpoint responde 200
   - ✓ Google Sheets se actualiza
   - ✓ URL de imagen aparece

---

## Go-Live Checklist Final

- [ ] Endpoint probado ✓
- [ ] Panel admin probado ✓
- [ ] n8n workflow probado ✓
- [ ] URLs actualizadas ✓
- [ ] .env seguro ✓
- [ ] Documentación clara ✓
- [ ] Monitoreo configurado ✓
- [ ] Soporte contacto listo ✓

**→ ¡LISTO PARA PRODUCCIÓN!**

---

## Contacto / Soporte Post-Deploy

Si algo falla:

1. Revisa logs del servidor
2. Verifica .env tiene variables
3. Test con curl primero
4. Revisa Cloudinary dashboard
5. Consulta GUIA_INTEGRACION_N8N.md

---

Última actualización: Abril 2024
