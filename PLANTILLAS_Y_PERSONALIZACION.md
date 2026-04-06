# Guía de Plantillas de Eventos

## Estructura

Las plantillas se guardan en:
```
EventHub_backend/
└── public/
    └── templates/
        ├── san-perreo-2024-template.png
        ├── concierto-2024-template.png
        └── otros-eventos/
            └── evento-especial-template.png
```

## Nomenclatura

El nombre de la plantilla debe coincidir con el `event_id`:

```
event_id: "san-perreo-2024"
→ Archivo: san-perreo-2024-template.png
```

## Formato de Imagen

- **Resolución:** 1200 x 1600 px (recomendado)
- **Formato:** PNG con fondo
- **Relleno:** Deja espacio inferior para datos personales (últimos 500px)
- **Profundidad:** RGB o RGBA

## Crear Plantilla

### Opción 1: Photoshop / Figma

1. Crea documento: 1200 x 1600 px
2. Diseña la entrada con:
   - Nombre del evento
   - Logo
   - Colores del evento
   - Decoraciones
3. **IMPORTANTE:** Deja los últimos 500 px en negro/oscuro (ahí irá el texto)
4. Exporta como PNG

### Opción 2: Usar Online

- Canva.com: Crea diseño 1200x1600
- Figma: Template gratuito
- Template.net: Ticket templates

### Ejemplo de Diseño

```
┌─────────────────────────────────────┐
│                                     │
│     [IMAGEN/DECORACIÓN DEL EVENTO]  │  <- Área decorativa (800px)
│                                     │
├─────────────────────────────────────┤
│  ┌──────────────────┐               │
│  │                  │               │
│  │    [QR CODE]     │ Nombre:...   │  <- Datos (400px)
│  │                  │ Monto:...     │
│  │                  │ Método:...    │
│  └──────────────────┘               │
└─────────────────────────────────────┘
```

## Proceso Upload

### Paso 1: Crear directorio (primera vez)
```bash
mkdir -p EventHub_backend/public/templates
```

### Paso 2: Guardar plantilla
```bash
cp /tu/ruta/mi-evento-template.png EventHub_backend/public/templates/
```

### Paso 3: Usar en API
```json
{
  "id_entrada": "ENT-001",
  "nombre": "Usuario",
  "monto_pagado": "35",
  "metodo_pago": "qr",
  "datos_qr": "ABC123",
  "event_id": "mi-evento"
}
```

## Personalización del Código

Si necesitas ajustar dónde va el texto, edita `utils/entryGenerator.js`:

### Posiciones de Texto

```javascript
// Línea aprox. 70: Posición del QR
ctx.drawImage(qrImage, width - 250, 20, 230, 230);
//                      ↑ X (derecha)   ↑ Y (arriba)

// Línea aprox. 85: Posición ID
ctx.fillText(`ID: ${...}`, width - 20, 290);
//            ↑ X                          ↑ Y

// Línea ~115: Nombre
ctx.fillText(`Nombre: ${...}`, 50, height - 350);
//           ↑ X (izquierda)      ↑ Y desde abajo
```

### Cambiar Colores

```javascript
// Fondo
ctx.fillStyle = '#1a1a1a';  // Negro

// Overlay (el oscuro)
ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';  // Semi-transparente

// Texto
ctx.fillStyle = '#FFFFFF';  // Blanco

// Línea divisoria
ctx.strokeStyle = '#CCCCCC';  // Gris claro
```

### Cambiar Fuentes

```javascript
// Tamaño
ctx.font = 'bold 36px Arial';
//          ↑ peso  ↑ tamaño ↑ fuente

// Opciones:
// Arial, Helvetica, Times New Roman, Courier
```

### Cambiar Overlay (fondo oscuro)

Edita línea ~95:
```javascript
// Hace el overlay más oscuro (0.8 = más oscuro)
ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
```

## Ejemplos de Eventos

### Evento 1: Concierto
```
Nombre: concierto-jazz-2024-template.png
Diseño: 
  - Imagen de instrumento musical
  - Colores azul/oro
  - Tipografía elegante
```

### Evento 2: Workshop
```
Nombre: workshop-tech-2024-template.png
Diseño:
  - Imagen con código/laptop
  - Colores tech (verde/negro)
  - Logo de empresas
```

### Evento 3: Evento Social
```
Nombre: san-perreo-2024-template.png
Diseño:
  - Imagen de ambiente/decoración
  - Colores vibrantes
  - Tema festivo
```

## Testing

### Probar Localmente

1. Agrega plantilla a `public/templates/`:
```bash
cp mi-plantilla.png EventHub_backend/public/templates/test-event-template.png
```

2. Llama con curl:
```bash
curl -X POST http://localhost:4000/api/generar-entrada \
  -H "Content-Type: application/json" \
  -d '{
    "id_entrada": "TEST-001",
    "nombre": "Test User",
    "monto_pagado": "50",
    "metodo_pago": "qr",
    "datos_qr": "TEST123",
    "event_id": "test-event"
  }'
```

3. Si usa plantilla:
   - Debería verse tu imagen de fondo
   - QR en esquina derecha
   - Datos en la parte inferior oscura

4. Si NO usa plantilla (no existe):
   - Fondo negro sólido
   - Mismos datos

## Solución de Problemas

### Plantilla no carga
- ✓ ¿Archivo existe en `public/templates/`?
- ✓ ¿Nombre coincide con `event_id`?
- ✓ ¿Es PNG válido? (Abre en navegador)
- ✓ Revisa logs del servidor

### Texto se superpone con imagen
- `event_id` no será reconocido
- Editaría el código para cambiar altura del overlay
- En `entryGenerator.js` línea ~95

### Colores de imagen no se ven bien
- Aumenta opacity del overlay:
  ```javascript
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; // Más opaco
  ```
- O baja opacity para que se vea más:
  ```javascript
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Más transparente
  ```

### QR no se ve sobre imagen
- Aumenta tamaño del QR en línea ~70:
  ```javascript
  ctx.drawImage(qrImage, width - 350, 20, 330, 330);
  // De (230, 230) a (330, 330)
  ```

---

## Checklist para Crear Plantilla

- [ ] Imagen 1200 x 1600 px en PNG
- [ ] Deja espacio abajo (500px mínimo) para datos
- [ ] Fondo inferior claro o contrastante
- [ ] Espacio para QR (esquina derecha)
- [ ] Nombre = event_id + "-template.png"
- [ ] Guardada en `public/templates/`
- [ ] Probada con curl o Postman
- [ ] URL de imagen en Cloudinary se ve correctamente

---

## Recursos

### Generadores Online
- Canva: https://canva.com
- Figma: https://figma.com
- Adobe Express: https://express.adobe.com

### Referencia
- 1200 x 1600 es estándar para mobile
- PNG = mejor calidad y transparencia
- Mantén tamaño < 2MB

---

**Listo. Contacta si necesitas ayuda personalizando el código.**
