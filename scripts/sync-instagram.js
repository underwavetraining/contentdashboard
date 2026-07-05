/**
 * Content Machine — sync-instagram.js
 *
 * Lee las métricas de Instagram (Graph API) para las piezas de data.json
 * que ya tengan un "instagram_media_id" cargado, y actualiza sus métricas
 * automáticamente. Corre desde un GitHub Action (ver .github/workflows/sync-instagram.yml).
 *
 * Requiere dos variables de entorno (se cargan como GitHub Secrets):
 *   IG_ACCESS_TOKEN  -> token de acceso de larga duración (Instagram API / Graph API)
 *   IG_USER_ID       -> ID numérico de tu cuenta de Instagram profesional
 *
 * No necesita dependencias externas (usa fetch nativo de Node 20+).
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const GRAPH_VERSION = 'v21.0';
const ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;

if (!ACCESS_TOKEN || !IG_USER_ID) {
  console.error('Faltan IG_ACCESS_TOKEN o IG_USER_ID como variables de entorno (GitHub Secrets). Abortando.');
  process.exit(1);
}

async function graphGet(endpoint, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', ACCESS_TOKEN);
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) {
    throw new Error(`Graph API error en ${endpoint}: ${JSON.stringify(json.error)}`);
  }
  return json;
}

// Trae la lista de media reciente de la cuenta (para el modo --list, ver abajo)
async function listRecentMedia(limit = 30) {
  const data = await graphGet(`${IG_USER_ID}/media`, {
    fields: 'id,caption,timestamp,permalink,media_product_type',
    limit: String(limit),
  });
  return data.data || [];
}

// Insights: el set de métricas válido difiere entre posts normales y Reels.
async function getMediaInsights(mediaId, mediaProductType) {
  const metricSets =
    mediaProductType === 'REELS'
      ? ['plays,reach,saved,comments,likes,shares', 'plays,reach,saved,comments,likes']
      : ['reach,saved,comments,likes,shares', 'impressions,reach,saved,comments,likes'];

  for (const metrics of metricSets) {
    try {
      const data = await graphGet(`${mediaId}/insights`, { metric: metrics });
      const out = {};
      (data.data || []).forEach((m) => {
        const val = m.values?.[0]?.value ?? m.total_value?.value ?? null;
        out[m.name] = val;
      });
      return out;
    } catch (e) {
      // probamos el siguiente set de métricas
      continue;
    }
  }
  return {};
}

// Cuenta cuántos comentarios de un post mencionan una keyword (case-insensitive).
async function countKeywordComments(mediaId, keyword) {
  if (!keyword) return null;
  try {
    const data = await graphGet(`${mediaId}/comments`, { fields: 'text', limit: '200' });
    const comments = data.data || [];
    const kw = keyword.toLowerCase();
    return comments.filter((c) => (c.text || '').toLowerCase().includes(kw)).length;
  } catch (e) {
    console.warn(`No se pudieron leer comentarios de ${mediaId}: ${e.message}`);
    return null;
  }
}

async function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const posts = data.posts || [];

  const mode = process.argv[2];

  if (mode === '--list') {
    // Modo utilidad: imprime la media reciente para que Augusto copie el ID que corresponda.
    const media = await listRecentMedia(30);
    console.log('Media reciente de tu cuenta de Instagram:\n');
    media.forEach((m) => {
      console.log(`id: ${m.id}`);
      console.log(`fecha: ${m.timestamp}`);
      console.log(`tipo: ${m.media_product_type || 'n/a'}`);
      console.log(`permalink: ${m.permalink}`);
      console.log(`caption: ${(m.caption || '').slice(0, 80).replace(/\n/g, ' ')}...`);
      console.log('---');
    });
    return;
  }

  let updated = 0;
  for (const post of posts) {
    if (!post.instagram_media_id) continue; // sin ID vinculado, se salta

    console.log(`Actualizando pieza #${post.id} (media ${post.instagram_media_id})...`);
    try {
      const insights = await getMediaInsights(post.instagram_media_id, post.media_product_type);
      const kwCount = await countKeywordComments(post.instagram_media_id, post.keyword);

      post.metricas = post.metricas || {};
      if (insights.reach !== undefined) post.metricas.alcance = insights.reach;
      if (insights.impressions !== undefined) post.metricas.vistas = insights.impressions;
      if (insights.plays !== undefined) post.metricas.vistas = insights.plays;
      if (insights.saved !== undefined) post.metricas.guardados = insights.saved;
      if (insights.comments !== undefined) post.metricas.comentarios_totales = insights.comments;
      if (insights.shares !== undefined) post.metricas.compartidos = insights.shares;
      if (kwCount !== null) post.metricas.comentarios_keyword = kwCount;

      updated++;
    } catch (e) {
      console.error(`Error actualizando pieza #${post.id}: ${e.message}`);
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Listo. ${updated} pieza(s) actualizada(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
