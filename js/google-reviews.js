/* ============================================================
   DIGITAL ELECTRONICS — Google Reviews Loader
   Requiere: Google Maps JavaScript API con library=places
   ============================================================ */

const DE_REVIEWS_CONFIG = {
  // ──────────────────────────────────────────────────────────
  // 🔑 Google Maps API Key
  //   
  // ──────────────────────────────────────────────────────────
  apiKey: 'AIzaSyBdSuhCtGkRYjSKtgImbocxg3mjEB0NXoE',

  // Nombre exacto de tu negocio en Google Maps
  businessQuery: 'Digital Electronics Cali Colombia',

  // Número de teléfono (como respaldo de búsqueda)
  phone: '+573103841388',

  // Máx. caracteres de reseña antes de "Ver más"
  maxChars: 200,
};

/* ─────────────────────────────────────────────────────────── */
/*  1. Carga dinámica del script de Google Maps               */
/* ─────────────────────────────────────────────────────────── */
function deLoadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve(); return;
    }
    if (document.getElementById('de-gmaps-script')) {
      // ya está cargando, esperar
      document.getElementById('de-gmaps-script').addEventListener('load', resolve);
      document.getElementById('de-gmaps-script').addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id  = 'de-gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${DE_REVIEWS_CONFIG.apiKey}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;
    script.onload  = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar la API de Google Maps.'));
    document.head.appendChild(script);
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  2. Punto de entrada                                        */
/* ─────────────────────────────────────────────────────────── */
async function deInitReviews() {
  const section = document.getElementById('de-reviews-section');
  if (!section) return;

  if (!DE_REVIEWS_CONFIG.apiKey || DE_REVIEWS_CONFIG.apiKey === 'TU_API_KEY_AQUÍ') {
    deShowError('⚙️ Configura tu API Key de Google en <code>google-reviews.js</code> para mostrar las reseñas reales.');
    return;
  }

  try {
    await deLoadGoogleMaps();
    deFindPlace();
  } catch (e) {
    console.error('[DE Reviews]', e);
    deShowError('No se pudo conectar con Google Maps. Verifica tu API Key y que la facturación esté habilitada.');
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  3. Buscar el negocio por nombre                           */
/* ─────────────────────────────────────────────────────────── */
function deFindPlace() {
  // PlacesService necesita un elemento del DOM (mapa o div vacío)
  const dummy = document.getElementById('de-gmap-dummy');
  const service = new google.maps.places.PlacesService(dummy);

  service.findPlaceFromQuery({
    query:  DE_REVIEWS_CONFIG.businessQuery,
    fields: ['place_id', 'name', 'rating', 'user_ratings_total'],
  }, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
      deGetDetails(service, results[0].place_id);
    } else {
      // segundo intento: buscar por teléfono si el nombre no funcionó
      service.textSearch({
        query: DE_REVIEWS_CONFIG.phone,
      }, (res2, status2) => {
        if (status2 === google.maps.places.PlacesServiceStatus.OK && res2 && res2.length > 0) {
          deGetDetails(service, res2[0].place_id);
        } else {
          deShowError('No se encontró el negocio en Google Maps. Verifica el nombre o el número de teléfono en la configuración.');
        }
      });
    }
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  4. Obtener detalles + reseñas                             */
/* ─────────────────────────────────────────────────────────── */
function deGetDetails(service, placeId) {
  service.getDetails({
    placeId: placeId,
    fields:  ['name', 'rating', 'user_ratings_total', 'reviews', 'url', 'formatted_address'],
    language: 'es',
  }, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      deRender(place);
    } else {
      deShowError('No se pudieron obtener las reseñas. El negocio puede necesitar activar "reseñas" en Google Business Profile.');
    }
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  5. Renderizar todo                                        */
/* ─────────────────────────────────────────────────────────── */
function deRender(place) {
  deHideLoading();

  // 5a. Summary card
  const summary = document.getElementById('de-rating-summary');
  const score   = (place.rating || 0).toFixed(1);
  const total   = place.user_ratings_total || 0;

  summary.innerHTML = `
    <div class="de-rating-left">
      <div class="de-rating-big">${score}</div>
      <div class="de-rating-max">de 5 · Google</div>
    </div>
    <div class="de-rating-divider"></div>
    <div class="de-rating-mid">
      <div class="de-stars-row">${deStars(place.rating)}</div>
      <div class="de-rating-count">${total.toLocaleString('es-CO')} reseñas verificadas</div>
      <span class="de-rating-badge">
        <svg width="14" height="14" viewBox="0 0 488 512" fill="#ea4335"><path d="M488 261.8C488 403.3 381.5 512 248 512 110.8 512 0 401.2 0 264S110.8 16 248 16c66.2 0 123 24.5 166.3 64.9l-67.5 64.9C315.4 112.2 284 99.5 248 99.5c-99.9 0-181.5 82-181.5 164.5S148.1 428.5 248 428.5c73.8 0 135.7-48.1 156.5-113.3h-156.5V254h232.1c2.4 13.1 3.9 26.5 3.9 40.5z"/></svg>
        Verificado en Google
      </span>
    </div>
    <div class="de-rating-divider"></div>
    <div class="de-rating-right">
      <img src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg"
           alt="Google" class="de-google-logo">
      <p class="de-rating-disclaimer">Google solo muestra las 5 reseñas más relevantes por API.</p>
      <a href="${place.url || '#'}" target="_blank" rel="noopener" class="de-ver-google">
        Ver todas en Google Maps →
      </a>
    </div>`;
  summary.style.display = 'flex';

  // 5b. Reviews grid
  const grid    = document.getElementById('de-reviews-grid');
  const reviews = place.reviews || [];

  if (reviews.length === 0) {
    grid.innerHTML = '<p class="de-no-reviews">Este negocio aún no tiene reseñas visibles por API.</p>';
    grid.style.display = 'block';
    return;
  }

  grid.innerHTML = reviews.map((r, i) => {
    const text      = r.text || '';
    const truncated = text.length > DE_REVIEWS_CONFIG.maxChars;
    const short     = truncated ? text.slice(0, DE_REVIEWS_CONFIG.maxChars) + '…' : text;
    const photo     = r.profile_photo_url || '';
    const initial   = (r.author_name || '?')[0].toUpperCase();

    return `
      <div class="de-review-card">
        <div class="de-review-top">
          <div class="de-review-author">
            ${photo
              ? `<img src="${photo}" alt="${r.author_name}" class="de-author-photo" loading="lazy">`
              : `<div class="de-author-initial">${initial}</div>`}
            <div class="de-author-info">
              <div class="de-author-name">${deEscape(r.author_name || 'Anónimo')}</div>
              <div class="de-review-date">${deEscape(r.relative_time_description || '')}</div>
            </div>
          </div>
          <div class="de-review-stars">${deStars(r.rating)}</div>
        </div>
        <p class="de-review-text" id="de-rt-${i}">${deEscape(short)}</p>
        ${truncated ? `
          <button class="de-ver-mas" onclick="deToggleText(${i}, \`${deEscape(text)}\`, \`${deEscape(short)}\`)">
            Ver más
          </button>` : ''}
        <a href="${r.author_url || place.url || '#'}" target="_blank" rel="noopener" class="de-review-google-link">
          <svg width="12" height="12" viewBox="0 0 488 512" fill="#ea4335"><path d="M488 261.8C488 403.3 381.5 512 248 512 110.8 512 0 401.2 0 264S110.8 16 248 16c66.2 0 123 24.5 166.3 64.9l-67.5 64.9C315.4 112.2 284 99.5 248 99.5c-99.9 0-181.5 82-181.5 164.5S148.1 428.5 248 428.5c73.8 0 135.7-48.1 156.5-113.3h-156.5V254h232.1c2.4 13.1 3.9 26.5 3.9 40.5z"/></svg>
          Ver en Google
        </a>
      </div>`;
  }).join('');

  grid.style.display = 'grid';

  // 5c. CTA row
  const ctaRow = document.getElementById('de-reviews-cta');
  ctaRow.innerHTML = `
    <a href="${place.url || 'https://maps.google.com'}" target="_blank" rel="noopener" class="cta de-cta-google">
      <svg width="18" height="18" viewBox="0 0 488 512" fill="currentColor"><path d="M488 261.8C488 403.3 381.5 512 248 512 110.8 512 0 401.2 0 264S110.8 16 248 16c66.2 0 123 24.5 166.3 64.9l-67.5 64.9C315.4 112.2 284 99.5 248 99.5c-99.9 0-181.5 82-181.5 164.5S148.1 428.5 248 428.5c73.8 0 135.7-48.1 156.5-113.3h-156.5V254h232.1c2.4 13.1 3.9 26.5 3.9 40.5z"/></svg>
      Ver todas las reseñas en Google Maps
    </a>
    <a href="https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.url || '')}"
       target="_blank" rel="noopener" class="cta de-cta-write">
      ✏️ Escribir una reseña
    </a>`;
  ctaRow.style.display = 'flex';
}

/* ─────────────────────────────────────────────────────────── */
/*  Utilidades                                                 */
/* ─────────────────────────────────────────────────────────── */
function deStars(rating) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) +
    (half ? '<span class="de-star-half">★</span>' : '') +
    '<span class="de-star-empty">' + '★'.repeat(empty) + '</span>';
}

function deEscape(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/`/g,'&#96;');
}

function deToggleText(i, full, short) {
  const el  = document.getElementById(`de-rt-${i}`);
  const btn = el.nextElementSibling;
  if (btn.textContent.trim() === 'Ver más') {
    el.innerHTML  = deEscape(full);
    btn.textContent = 'Ver menos';
  } else {
    el.innerHTML  = deEscape(short);
    btn.textContent = 'Ver más';
  }
}

function deHideLoading() {
  const el = document.getElementById('de-loading');
  if (el) el.style.display = 'none';
}

function deShowError(msg) {
  deHideLoading();
  const el = document.getElementById('de-error');
  if (el) { el.innerHTML = `<div class="de-error-icon">⚠️</div><p>${msg}</p>`; el.style.display = 'flex'; }
}

/* ─────────────────────────────────────────────────────────── */
/*  Arrancar al cargar la página                              */
/* ─────────────────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', deInitReviews);
} else {
  deInitReviews();
}
