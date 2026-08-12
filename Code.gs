/**
 * ITB 2.0 - Backend Google Apps Script
 * Recomendado: crear este proyecto DESDE el Google Sheets para que quede vinculado.
 */

const SHEETS = [
  'configuracion',
  'unidades',
  'clases',
  'cartillas',
  'autoevaluaciones',
  'juegos',
  'categorias_videos',
  'videos',
  'staff',
  'descargas',
  'noticias',
  'biblioteca'
];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'bootstrap';

  try {
    if (action === 'health') {
      return json_({
        ok: true,
        service: 'ITB API',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'clearCache') {
      CacheService.getScriptCache().remove('itb_bootstrap');
      return json_({ ok: true, cacheCleared: true });
    }

    return json_(getBootstrap_());
  } catch (err) {
    console.error(err);
    return json_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function getBootstrap_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = readConfig_(ss);
  const cacheSeconds = Math.max(0, Number(config.cache_segundos || 300));

  const cache = CacheService.getScriptCache();
  const cached = cache.get('itb_bootstrap');
  if (cached) {
    return JSON.parse(cached);
  }

  const data = {};
  SHEETS.forEach(name => {
    if (name === 'configuracion') return;
    data[name] = readTable_(ss, name);
  });

  const payload = {
    ok: true,
    generatedAt: new Date().toISOString(),
    config: config,
    unidades: data.unidades || [],
    clases: data.clases || [],
    cartillas: data.cartillas || [],
    autoevaluaciones: data.autoevaluaciones || [],
    juegos: data.juegos || [],
    categorias_videos: data.categorias_videos || [],
    videos: data.videos || [],
    staff: data.staff || [],
    descargas: data.descargas || [],
    noticias: data.noticias || [],
    biblioteca: data.biblioteca || []
  };

  // Relaciones por unidad ya resueltas para simplificar el frontend.
  payload.contentByUnit = {};
  payload.unidades.forEach(u => {
    const uid = String(u.id || '');
    payload.contentByUnit[uid] = {
      cartillas: payload.cartillas.filter(x => String(x.unidad_id || '') === uid),
      autoevaluaciones: payload.autoevaluaciones.filter(x => String(x.unidad_id || '') === uid),
      juegos: payload.juegos.filter(x => String(x.unidad_id || '') === uid),
      videos: payload.videos.filter(x => String(x.unidad_id || '') === uid)
    };
  });

  payload.general = {
    courseTitle: config.nombre_curso || 'Curso ITB',
    brand: config.academia || 'TED',
    unitCount: payload.unidades.length,
    videoCount: payload.videos.length,
    bookCount: payload.biblioteca.length
  };

  const serialized = JSON.stringify(payload);
  if (cacheSeconds > 0 && serialized.length < 95000) {
    cache.put('itb_bootstrap', serialized, Math.min(cacheSeconds, 21600));
  }

  return payload;
}

function readConfig_(ss) {
  const sheet = ss.getSheetByName('configuracion');
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};

  const out = {};
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (!key) continue;
    out[key] = normalizeValue_(values[i][1]);
  }
  return out;
}

function readTable_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(v => String(v || '').trim());
  return values.slice(1)
    .filter(row => row.some(v => v !== '' && v !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        if (!h) return;
        obj[h] = normalizeValue_(row[i]);
      });
      return obj;
    });
}

function normalizeValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
