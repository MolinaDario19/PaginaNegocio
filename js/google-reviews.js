  /* ============================================================
   DIGITAL ELECTRONICS — Google Reviews Loader
   ============================================================
   Requiere:
   - Google Maps JavaScript API
   - Places Library
   - Facturación habilitada
   - API Key restringida a tu dominio

   IMPORTANTE:
   NO uses una API key que hayas publicado anteriormente.
   ============================================================ */

const DE_REVIEWS_CONFIG = {

  // ==========================================================
  // 🔑 API KEY
  // ==========================================================
  apiKey: 'AIzaSyBdSuhCtGkRYjSKtgImbocxg3mjEB0NXoE',

  // Nombre del negocio
  businessQuery: 'Digital Electronics Cali Colombia',

  // Teléfono como respaldo
  phone: '+573103841388',

  // Máximo de caracteres antes de "Ver más"
  maxChars: 200
};


/* ============================================================
   1. CARGAR GOOGLE MAPS
   ============================================================ */

function deLoadGoogleMaps() {

  return new Promise((resolve, reject) => {

    // Ya está cargado
    if (
      window.google &&
      window.google.maps &&
      window.google.maps.places
    ) {
      console.log('[DE Reviews] Google Maps ya estaba cargado.');
      resolve();
      return;
    }

    // El script ya está siendo cargado
    const existingScript = document.getElementById('de-gmaps-script');

    if (existingScript) {

      console.log('[DE Reviews] Google Maps ya se está cargando...');

      existingScript.addEventListener('load', () => {
        console.log('[DE Reviews] Google Maps cargado.');
        resolve();
      });

      existingScript.addEventListener('error', () => {
        reject(
          new Error('No se pudo cargar Google Maps.')
        );
      });

      return;
    }

    // Crear script
    const script = document.createElement('script');

    script.id = 'de-gmaps-script';

    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      '?key=' + encodeURIComponent(DE_REVIEWS_CONFIG.apiKey) +
      '&libraries=places' +
      '&language=es';

    script.async = true;
    script.defer = true;

    script.onload = () => {

      console.log('[DE Reviews] Google Maps cargado correctamente.');

      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places
      ) {
        resolve();
      } else {
        reject(
          new Error(
            'Google Maps cargó, pero Places Library no está disponible.'
          )
        );
      }
    };

    script.onerror = () => {

      reject(
        new Error(
          'No se pudo cargar la API de Google Maps.'
        )
      );

    };

    document.head.appendChild(script);
  });
}


/* ============================================================
   2. INICIALIZAR
   ============================================================ */

async function deInitReviews() {

  console.log('========================================');
  console.log('[DE Reviews] INICIANDO');
  console.log('========================================');

  const section =
    document.getElementById('de-reviews-section');

  if (!section) {

    console.error(
      '[DE Reviews] No existe #de-reviews-section'
    );

    return;
  }

  // Comprobar API Key
  if (
    !DE_REVIEWS_CONFIG.apiKey ||
    DE_REVIEWS_CONFIG.apiKey === 'TU_NUEVA_API_KEY'
  ) {

    deShowError(
      '⚙️ Configura una API Key de Google Maps válida.'
    );

    return;
  }

  try {

    await deLoadGoogleMaps();

    console.log(
      '[DE Reviews] Google Maps disponible:',
      window.google
    );

    console.log(
      '[DE Reviews] Places disponible:',
      google.maps.places
    );

    deFindPlace();

  } catch (error) {

    console.error(
      '[DE Reviews] ERROR CARGANDO GOOGLE MAPS:',
      error
    );

    deShowError(
      'No se pudo conectar con Google Maps. ' +
      'Verifica la API Key, la facturación y las restricciones del dominio.'
    );
  }
}


/* ============================================================
   3. BUSCAR NEGOCIO
   ============================================================ */

function deFindPlace() {

  console.log('========================================');
  console.log('[DE Reviews] BUSCANDO NEGOCIO');
  console.log('========================================');

  const dummy =
    document.getElementById('de-gmap-dummy');

  if (!dummy) {

    console.error(
      '[DE Reviews] No existe #de-gmap-dummy'
    );

    deShowError(
      'Falta el contenedor necesario para Google Places.'
    );

    return;
  }

  let service;

  try {

    service =
      new google.maps.places.PlacesService(dummy);

  } catch (error) {

    console.error(
      '[DE Reviews] No se pudo crear PlacesService:',
      error
    );

    deShowError(
      'No se pudo inicializar Google Places.'
    );

    return;
  }


  /* ----------------------------------------------------------
     PRIMER INTENTO:
     Buscar por nombre
     ---------------------------------------------------------- */

  console.log(
    '[DE Reviews] Buscando:',
    DE_REVIEWS_CONFIG.businessQuery
  );

  service.findPlaceFromQuery(
    {
      query: DE_REVIEWS_CONFIG.businessQuery,

      fields: [
        'place_id',
        'name',
        'rating',
        'user_ratings_total'
      ],

      language: 'es'
    },

    (results, status) => {

      console.log(
        '[DE Reviews] FIND STATUS:',
        status
      );

      console.log(
        '[DE Reviews] FIND RESULTS:',
        results
      );


      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        results &&
        results.length > 0
      ) {

        const place = results[0];

        console.log(
          '[DE Reviews] NEGOCIO ENCONTRADO:',
          place
        );

        console.log(
          '[DE Reviews] PLACE ID:',
          place.place_id
        );

        deGetDetails(
          service,
          place.place_id
        );

        return;
      }


      /* ------------------------------------------------------
         SEGUNDO INTENTO:
         Buscar por teléfono
         ------------------------------------------------------ */

      console.warn(
        '[DE Reviews] No encontrado por nombre.'
      );

      deFindByPhone(service);
    }
  );
}


/* ============================================================
   4. BUSCAR POR TELÉFONO
   ============================================================ */

function deFindByPhone(service) {

  console.log(
    '[DE Reviews] Buscando por teléfono:',
    DE_REVIEWS_CONFIG.phone
  );


  // Si el método existe en la versión cargada
  if (
    typeof service.findPlaceFromPhoneNumber === 'function'
  ) {

    service.findPlaceFromPhoneNumber(
      {
        phoneNumber: DE_REVIEWS_CONFIG.phone,

        fields: [
          'place_id',
          'name',
          'rating',
          'user_ratings_total'
        ],

        language: 'es'
      },

      (results, status) => {

        console.log(
          '[DE Reviews] PHONE STATUS:',
          status
        );

        console.log(
          '[DE Reviews] PHONE RESULTS:',
          results
        );


        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {

          const place = results[0];

          console.log(
            '[DE Reviews] NEGOCIO ENCONTRADO POR TELÉFONO:',
            place
          );

          deGetDetails(
            service,
            place.place_id
          );

          return;
        }


        // Último intento mediante textSearch
        deFindByTextSearch(service);
      }
    );

    return;
  }


  // Fallback
  console.warn(
    '[DE Reviews] findPlaceFromPhoneNumber no está disponible.'
  );

  deFindByTextSearch(service);
}


/* ============================================================
   5. ÚLTIMO INTENTO: TEXT SEARCH
   ============================================================ */

function deFindByTextSearch(service) {

  console.log(
    '[DE Reviews] Último intento: búsqueda por teléfono.'
  );


  service.textSearch(
    {
      query: DE_REVIEWS_CONFIG.phone,
      language: 'es'
    },

    (results, status) => {

      console.log(
        '[DE Reviews] TEXT SEARCH STATUS:',
        status
      );

      console.log(
        '[DE Reviews] TEXT SEARCH RESULTS:',
        results
      );


      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        results &&
        results.length > 0
      ) {

        const place = results[0];

        console.log(
          '[DE Reviews] NEGOCIO ENCONTRADO POR TEXT SEARCH:',
          place
        );

        deGetDetails(
          service,
          place.place_id
        );

        return;
      }


      deShowError(
        'No se encontró "Digital Electronics" en Google Maps. ' +
        'Verifica que el negocio exista y que el nombre y teléfono coincidan.'
      );
    }
  );
}


/* ============================================================
   6. OBTENER DETALLES + RESEÑAS
   ============================================================ */

function deGetDetails(service, placeId) {

  console.log('========================================');
  console.log('[DE Reviews] OBTENIENDO DETALLES');
  console.log('[DE Reviews] PLACE ID:', placeId);
  console.log('========================================');


  service.getDetails(
    {
      placeId: placeId,

      fields: [
        'place_id',
        'name',
        'rating',
        'user_ratings_total',
        'reviews',
        'url',
        'formatted_address'
      ],

      language: 'es'
    },

    (place, status) => {

      console.log(
        '[DE Reviews] GET DETAILS STATUS:',
        status
      );

      console.log(
        '[DE Reviews] PLACE:',
        place
      );


      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        place
      ) {

        console.log(
          '[DE Reviews] NOMBRE:',
          place.name
        );

        console.log(
          '[DE Reviews] RATING:',
          place.rating
        );

        console.log(
          '[DE Reviews] TOTAL RESEÑAS:',
          place.user_ratings_total
        );

        console.log(
          '[DE Reviews] RESEÑAS RECIBIDAS:',
          place.reviews
        );

        deRender(
          place,
          placeId
        );

        return;
      }


      console.error(
        '[DE Reviews] ERROR GET DETAILS:',
        status
      );


      deShowError(
        `Google Places respondió: <strong>${deEscape(status)}</strong>`
      );
    }
  );
}


/* ============================================================
   7. RENDERIZAR
   ============================================================ */

function deRender(place, placeId) {

  console.log(
    '[DE Reviews] RENDERIZANDO...'
  );

  deHideLoading();


  /* ==========================================================
     RESUMEN
     ========================================================== */

  const summary =
    document.getElementById('de-rating-summary');


  if (summary) {

    const score =
      Number(place.rating || 0).toFixed(1);

    const total =
      Number(place.user_ratings_total || 0);


    summary.innerHTML = `

      <div class="de-rating-left">

        <div class="de-rating-big">
          ${score}
        </div>

        <div class="de-rating-max">
          de 5 · Google
        </div>

      </div>


      <div class="de-rating-divider"></div>


      <div class="de-rating-mid">

        <div class="de-stars-row">
          ${deStars(place.rating)}
        </div>

        <div class="de-rating-count">
          ${total.toLocaleString('es-CO')}
          reseñas verificadas
        </div>

        <span class="de-rating-badge">

          <svg
            width="14"
            height="14"
            viewBox="0 0 488 512"
            fill="#ea4335"
          >

            <path d="M488 261.8C488 403.3 381.5 512 248 512 110.8 512 0 401.2 0 264S110.8 16 248 16c66.2 0 123 24.5 166.3 64.9l-67.5 64.9C315.4 112.2 284 99.5 248 99.5c-99.9 0-181.5 82-181.5 164.5S148.1 428.5 248 428.5c73.8 0 135.7-48.1 156.5-113.3h-156.5V254h232.1c2.4 13.1 3.9 26.5 3.9 40.5z"/>

          </svg>

          Verificado en Google

        </span>

      </div>


      <div class="de-rating-divider"></div>


      <div class="de-rating-right">

        <img
          src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg"
          alt="Google"
          class="de-google-logo"
        >

        <p class="de-rating-disclaimer">
          Google muestra las reseñas disponibles a través de la API.
        </p>

        <a
          href="${deSafeUrl(place.url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="de-ver-google"
        >
          Ver todas en Google Maps →
        </a>

      </div>
    `;

    summary.style.display = 'flex';
  }


  /* ==========================================================
     RESEÑAS
     ========================================================== */

  const grid =
    document.getElementById('de-reviews-grid');

  if (!grid) {

    console.error(
      '[DE Reviews] No existe #de-reviews-grid'
    );

    return;
  }


  const reviews =
    Array.isArray(place.reviews)
      ? place.reviews
      : [];


  console.log(
    '[DE Reviews] Número de reseñas:',
    reviews.length
  );


  if (reviews.length === 0) {

    grid.innerHTML = `
      <p class="de-no-reviews">
        Google no devolvió reseñas disponibles mediante la API.
      </p>
    `;

    grid.style.display = 'block';

  } else {

    grid.innerHTML =
      reviews
        .map((review, index) =>
          deCreateReviewCard(
            review,
            index,
            place.url
          )
        )
        .join('');

    grid.style.display = 'grid';
  }


  /* ==========================================================
     CTA
     ========================================================== */

  const ctaRow =
    document.getElementById('de-reviews-cta');


  if (ctaRow) {

    const mapsUrl =
      deSafeUrl(
        place.url,
        'https://maps.google.com/'
      );


    const writeReviewUrl =
      'https://search.google.com/local/writereview?placeid=' +
      encodeURIComponent(placeId);


    ctaRow.innerHTML = `

      <a
        href="${mapsUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="cta de-cta-google"
      >

        <svg
          width="18"
          height="18"
          viewBox="0 0 488 512"
          fill="currentColor"
        >

          <path d="M488 261.8C488 403.3 381.5 512 248 512 110.8 512 0 401.2 0 264S110.8 16 248 16c66.2 0 123 24.5 166.3 64.9l-67.5 64.9C315.4 112.2 284 99.5 248 99.5c-99.9 0-181.5 82-181.5 164.5S148.1 428.5 248 428.5c73.8 0 135.7-48.1 156.5-113.3h-156.5V254h232.1c2.4 13.1 3.9 26.5 3.9 40.5z"/>

        </svg>

        Ver todas las reseñas en Google Maps

      </a>


      <a
        href="${writeReviewUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="cta de-cta-write"
      >
        ✏️ Escribir una reseña
      </a>
    `;

    ctaRow.style.display = 'flex';
  }
}


/* ============================================================
   8. CREAR TARJETA DE RESEÑA
   ============================================================ */

function deCreateReviewCard(review, index, placeUrl) {

  const text =
    String(review.text || '');


  const authorName =
    String(
      review.author_name || 'Anónimo'
    );


  const date =
    String(
      review.relative_time_description || ''
    );


  const rating =
    Number(review.rating || 0);


  const photo =
    String(
      review.profile_photo_url || ''
    );


  const truncated =
    text.length > DE_REVIEWS_CONFIG.maxChars;


  const shortText =
    truncated
      ? text.slice(
          0,
          DE_REVIEWS_CONFIG.maxChars
        ) + '…'
      : text;


  const initial =
    authorName
      .trim()
      .charAt(0)
      .toUpperCase() || '?';


  const photoHtml = photo
    ? `
      <img
        src="${deSafeUrl(photo)}"
        alt="${deEscape(authorName)}"
        class="de-author-photo"
        loading="lazy"
      >
    `
    : `
      <div class="de-author-initial">
        ${deEscape(initial)}
      </div>
    `;


  const reviewGoogleUrl =
    deSafeUrl(
      review.author_url || placeUrl,
      '#'
    );


  return `

    <div class="de-review-card">

      <div class="de-review-top">

        <div class="de-review-author">

          ${photoHtml}

          <div class="de-author-info">

            <div class="de-author-name">
              ${deEscape(authorName)}
            </div>

            <div class="de-review-date">
              ${deEscape(date)}
            </div>

          </div>

        </div>


        <div class="de-review-stars">
          ${deStars(rating)}
        </div>

      </div>


      <p
        class="de-review-text"
        id="de-rt-${index}"
      >
        ${deEscape(shortText)}
      </p>


      ${
        truncated
          ? `
            <button
              type="button"
              class="de-ver-mas"
              data-review-index="${index}"
            >
              Ver más
            </button>
          `
          : ''
      }


      <a
        href="${reviewGoogleUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="de-review-google-link"
      >

        <svg
          width="12"
          height="12"
          viewBox="0 0 488 512"
          fill="#ea4335"
        >

          <path d="M488 261.8C488 403.3 381.5 512 248 512 110.8 512 0 401.2 0 264S110.8 16 248 16c66.2 0 123 24.5 166.3 64.9l-67.5 64.9C315.4 112.2 284 99.5 248 99.5c-99.9 0-181.5 82-181.5 164.5S148.1 428.5 248 428.5c73.8 0 135.7-48.1 156.5-113.3h-156.5V254h232.1c2.4 13.1 3.9 26.5 3.9 40.5z"/>

        </svg>

        Ver en Google

      </a>

    </div>
  `;
}


/* ============================================================
   9. ESTRELLAS
   ============================================================ */

function deStars(rating) {

  const value =
    Number(rating || 0);


  const full =
    Math.floor(value);


  const half =
    value - full >= 0.5
      ? 1
      : 0;


  const empty =
    5 - full - half;


  return (
    '★'.repeat(full) +

    (
      half
        ? '<span class="de-star-half">★</span>'
        : ''
    ) +

    (
      empty > 0
        ? '<span class="de-star-empty">' +
          '★'.repeat(empty) +
          '</span>'
        : ''
    )
  );
}


/* ============================================================
   10. ESCAPAR HTML
   ============================================================ */

function deEscape(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ============================================================
   11. URL SEGURA
   ============================================================ */

function deSafeUrl(
  url,
  fallback = '#'
) {

  if (!url) {
    return fallback;
  }


  try {

    const parsed =
      new URL(
        String(url),
        window.location.origin
      );


    if (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    ) {
      return parsed.href;
    }

  } catch (error) {

    console.warn(
      '[DE Reviews] URL inválida:',
      url
    );
  }


  return fallback;
}


/* ============================================================
   12. VER MÁS / VER MENOS
   ============================================================ */

function deToggleText(
  index,
  fullText,
  shortText
) {

  const element =
    document.getElementById(
      `de-rt-${index}`
    );


  if (!element) {
    return;
  }


  const button =
    element.nextElementSibling;


  if (!button) {
    return;
  }


  const isShort =
    button.textContent.trim() === 'Ver más';


  if (isShort) {

    element.textContent =
      fullText;

    button.textContent =
      'Ver menos';

  } else {

    element.textContent =
      shortText;

    button.textContent =
      'Ver más';
  }
}


/* ============================================================
   13. EVENTO "VER MÁS"
   ============================================================ */

document.addEventListener(
  'click',
  function(event) {

    const button =
      event.target.closest(
        '.de-ver-mas'
      );


    if (!button) {
      return;
    }


    const index =
      Number(
        button.dataset.reviewIndex
      );


    if (
      !window.DE_REVIEWS_DATA ||
      !DE_REVIEWS_DATA[index]
    ) {
      console.warn(
        '[DE Reviews] No existe la reseña:',
        index
      );

      return;
    }


    const review =
      DE_REVIEWS_DATA[index];


    const element =
      document.getElementById(
        `de-rt-${index}`
      );


    if (!element) {
      return;
    }


    if (
      button.textContent.trim() ===
      'Ver más'
    ) {

      element.textContent =
        review.full;

      button.textContent =
        'Ver menos';

    } else {

      element.textContent =
        review.short;

      button.textContent =
        'Ver más';
    }

  }
);


/* ============================================================
   14. ERROR
   ============================================================ */

function deShowError(message) {

  console.error(
    '[DE Reviews] ERROR:',
    message
  );


  deHideLoading();


  const errorElement =
    document.getElementById(
      'de-error'
    );


  if (!errorElement) {
    return;
  }


  errorElement.innerHTML = `
    <div class="de-error-icon">
      ⚠️
    </div>

    <p>
      ${message}
    </p>
  `;


  errorElement.style.display =
    'flex';
}


/* ============================================================
   15. OCULTAR LOADING
   ============================================================ */

function deHideLoading() {

  const element =
    document.getElementById(
      'de-loading'
    );


  if (element) {

    element.style.display =
      'none';
  }
}


/* ============================================================
   16. PREPARAR DATOS DE RESEÑAS
   ============================================================

   Se utiliza para que "Ver más" no tenga que meter
   texto directamente dentro de un onclick.
   ============================================================ */

window.DE_REVIEWS_DATA = [];


/* ============================================================
   17. GUARDAR RESEÑAS ANTES DE RENDERIZAR
   ============================================================ */

const deOriginalRender =
  deRender;


/*
 * Sobrescribimos el render para guardar los textos
 * completos de las reseñas.
 */

deRender = function(place, placeId) {

  window.DE_REVIEWS_DATA =
    Array.isArray(place.reviews)
      ? place.reviews.map(review => {

          const text =
            String(review.text || '');

          const short =
            text.length >
            DE_REVIEWS_CONFIG.maxChars
              ? text.slice(
                  0,
                  DE_REVIEWS_CONFIG.maxChars
                ) + '…'
              : text;


          return {
            full: text,
            short: short
          };

        })
      : [];


  deOriginalRender(
    place,
    placeId
  );
};


/* ============================================================
   18. INICIAR CUANDO EL DOM ESTÉ LISTO
   ============================================================ */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    deInitReviews
  );

} else {

  deInitReviews();

}