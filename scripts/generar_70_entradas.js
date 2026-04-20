// scripts/generar_70_entradas.js
// Ejecutar desde EventHub_backend: node scripts/generar_70_entradas.js

require('dotenv').config();
const { google } = require('googleapis');
const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:4000';
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ENTRADA_COL = 'U'; // Columna donde se guarda la URL de la imagen

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

// Los 70 IDs con sus datos
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

async function getRowNumber(id) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Respuestas!A:A',
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === id);
  return idx === -1 ? null : idx + 1; // 1-based row number
}

async function updateEntradaUrl(rowNumber, url) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Respuestas!${ENTRADA_COL}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[url]] },
  });
}

async function generateEntrada(entry) {
  const res = await fetch(`${BACKEND_URL}/api/generar-entrada`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_entrada: entry.id,
      nombre: entry.id,
      monto_pagado: entry.monto,
      metodo_pago: entry.metodo,
      event_id: entry.event_id,
    }),
  });
  const data = await res.json();
  if (!data.imagen_url) throw new Error(JSON.stringify(data));
  return data.imagen_url;
}

async function main() {
  console.log(`Iniciando generación de ${entries.length} entradas...\n`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    process.stdout.write(`[${i + 1}/${entries.length}] ${entry.id} ... `);

    try {
      const url = await generateEntrada(entry);
      const row = await getRowNumber(entry.id);

      if (row) {
        await updateEntradaUrl(row, url);
        console.log(`✓ fila ${row} → ${url}`);
      } else {
        console.log(`✓ URL generada (ID no encontrado en sheet): ${url}`);
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
    }

    // Pequeña pausa para no saturar Cloudinary
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n¡Proceso completado!');
}

main();
