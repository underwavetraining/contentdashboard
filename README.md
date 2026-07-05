# Content Machine — Dashboard

Ya está publicado en: https://underwavetraining.github.io/contentdashboard/
Repo: `underwavetraining/contentdashboard`

## Archivos

- `index.html` — el dashboard.
- `data.json` — tus piezas y sus métricas. El dashboard lee de acá.
- `scripts/sync-instagram.js` — script que trae métricas reales de Instagram.
- `.github/workflows/sync-instagram.yml` — el robot que corre el script todos los días solo.

## Cómo activar el auto-sync con Instagram (una sola vez)

1. En developers.facebook.com → app **Underwave WA Make** → Casos de uso → "Administrar mensajes y contenido en Instagram" → **Personalizar**. Conectá ahí tu cuenta de Instagram profesional (tiene que estar vinculada a una Página de Facebook).
2. Generá un **token de acceso de larga duración** con permisos `instagram_basic` e `instagram_manage_insights` (desde esa misma pantalla, o desde Graph API Explorer en developers.facebook.com/tools/explorer).
3. Anotá también el **ID de tu cuenta de Instagram Business** (aparece en esa misma pantalla de configuración, o lo podés pedir vía Graph API Explorer con `GET /me/accounts` → `instagram_business_account`).
4. En GitHub: `contentdashboard` → Settings → Secrets and variables → Actions → **New repository secret**, dos veces:
   - `IG_ACCESS_TOKEN` = el token del paso 2.
   - `IG_USER_ID` = el ID del paso 3.
5. Listo. El workflow corre todos los días a las 9am UTC y también lo podés disparar a mano desde la pestaña **Actions** del repo → "Sync Instagram metrics" → "Run workflow".

**Importante:** el token de Meta expira cada ~60 días. Cuando el workflow empiece a fallar, repetí el paso 2-4 con un token nuevo.

## Vincular una pieza existente a su post real de Instagram

El script solo actualiza piezas que tengan `instagram_media_id` cargado en `data.json`. Para conseguir los IDs:

```
node scripts/sync-instagram.js --list
```

(esto corre local, necesita las mismas variables de entorno `IG_ACCESS_TOKEN` e `IG_USER_ID` en tu máquina, o pedímelo a mí y lo corro yo si me pasás la salida). Te va a tirar una lista con el ID, fecha, tipo y caption de cada post reciente — copiás el ID que corresponda a cada pieza y lo pegás en `data.json`.

Lo que el robot SÍ puede traer automático: vistas/alcance, guardados, comentarios totales, comentarios que mencionan la keyword, compartidos.

Lo que NO puede traer (Instagram no lo expone por API): DMs iniciados y calls agendadas — eso sigue siendo manual, o lo sacamos de ManyChat/Calendly más adelante.

## Cómo agregar una pieza nueva a mano

Abrí `data.json` en GitHub (ícono del lápiz), agregá un objeto nuevo al array `posts` (hay una plantilla completa dentro del dashboard, sección "¿Cómo agrego una pieza nueva?"), y hacé commit.

## Para que yo lea el dashboard directamente

Ya tengo la URL — te puedo leer `data.json` en cualquier conversación futura para analizar sin que me pegues números a mano.

## Nota

Faltan los guiones de formación (venta directa al instructor) — decime si me los pasás o si los armo yo con la lógica de Instructor Pro, para completar el mapa.
