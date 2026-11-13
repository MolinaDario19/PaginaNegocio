// scripts/generar-paginas.js
// ---------------------------------------------------------------------------
// Corre automáticamente en cada deploy de Vercel (ver vercel.json) y también
// lo puedes correr en tu PC con:   node scripts/generar-paginas.js
//
// Qué genera, a partir de info.json:
//   /productos.html                      portada con las tarjetas de marca
//   /marcas/{marca}.html                 una página por marca
//   /marcas/{marca}/{modelo}.html        una página por modelo
//   /sitemap.xml y /robots.txt
//
// NO toca /marcas/tcl.html ni ningún otro archivo que hayas hecho a mano.
//
// MODO BORRADOR (por defecto) vs MODO PUBLICAR  ->  ver constante PUBLICAR abajo.
//
// CAMPOS OPCIONALES EN info.json (por modelo):
//   "pulgadas": 43            -> fuerza el tamaño; si no existe se deduce del código del modelo
//   "evidencias": [ ... ]     -> fotos y videos de funcionamiento (ver evidenciasDe() más abajo)
//
// PARA AGREGAR UNA MARCA NUEVA:
//   1) Agrega sus modelos en info.json con  "brand": "NombreMarca"
//   2) Agrega una línea en MARCAS (abajo) con nombre, slug y logo
//   3) git push
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const DOMAIN = "https://digitalelectronics.com.co";
const WHATSAPP = "573103841388";
const CARPETA = "marcas"; // carpeta donde viven las páginas de marca y modelo

// ---------------------------------------------------------------------------
// MODO BORRADOR (PUBLICAR = false)  <- el que usas mientras desarrollas
//   - La portada se guarda como productos-v2.html (NO pisa tu productos.html).
//   - Todas las páginas nuevas llevan <meta robots="noindex, nofollow">:
//     Google no las indexa y no compiten con tus páginas actuales.
//   - NO se toca sitemap.xml ni robots.txt.
// MODO PUBLICAR (PUBLICAR = true)
//   - La portada pasa a ser productos.html (y se borra productos-v2.html).
//   - Las páginas se indexan, y se regeneran sitemap.xml y robots.txt.
// También puedes activarlo sin editar el archivo con la variable de entorno
// PUBLICAR=1 (por ejemplo, solo en el entorno "Production" de Vercel).
// ---------------------------------------------------------------------------
const PUBLICAR = process.env.PUBLICAR === "1" || false;

// Tu vercel.json tiene "cleanUrls": true, así que Vercel sirve /marcas/kalley y redirige
// /marcas/kalley.html hacia ahí. Por eso las URLs públicas (enlaces, canonical, sitemap)
// se escriben SIN ".html". Los archivos en disco siguen siendo .html.
const URLS_LIMPIAS = true;
const pub = (ruta) => (URLS_LIMPIAS ? ruta.replace(/\.html$/, "") : ruta);

const PORTADA = PUBLICAR ? "productos.html" : "productos-v2.html";
const URL_PORTADA = pub(`/${PORTADA}`);
const ROBOTS = PUBLICAR ? "index, follow" : "noindex, nofollow";

const ROOT = path.resolve(__dirname, "..");
const INFO_JSON = path.join(ROOT, "info.json");
const PLANTILLA_PORTADA = path.join(__dirname, "plantillas", "productos.template.html");

// nombre: debe coincidir con el campo "brand" de info.json (no distingue mayúsculas)
// slug:   define la URL, en minúsculas y sin espacios ni tildes
// logo:   ruta del logo que se muestra en la tarjeta de la portada
// prefijos (opcional): para modelos sin campo "brand", se asignan por prefijo del código
// imagenes (opcional): rutas de imágenes para el carrusel de la portada. Si no las pones, el script
//   usa los archivos de /images/marcas/{slug}/ (ver imagenesDeMarca más abajo).
const MARCAS = [
  { nombre: "Kalley", slug: "kalley", logo: "/images/Kalley2.JPG", prefijos: ["K-"] },
  { nombre: "Hyundai", slug: "hyundai", logo: "/images/Hyundai.jpg", prefijos: ["HYLED"] },
  { nombre: "Challenger", slug: "challenger", logo: "/images/Logo_Challenger.jpg" },
  { nombre: "JVC", slug: "jvc", logo: "/images/logo-jvc.jpg", prefijos: ["LT-"] },
  { nombre: "Olimpo", slug: "olimpo", logo: "/images/logos olimpo.png" },
  { nombre: "Caixun", slug: "caixun", logo: "/images/logo caixun.png", prefijos: ["CX", "C"] },
];

// Marcas con página hecha a mano (no salen de info.json). Solo aparecen como tarjeta.
const MARCAS_EXTERNAS = [
  { nombre: "TCL", href: "/tcl", logo: "/images/TCL_logo.png", texto: "Consulta tu modelo" },
];

// Páginas fijas que van al sitemap además de las generadas
const PAGINAS_FIJAS = [
  { url: "/", prioridad: "1.0" },
  { url: "/products", prioridad: "0.8" },
  { url: "/tcl", prioridad: "0.8" },
  { url: "/Soluciones", prioridad: "0.7" },
  { url: "/Contact", prioridad: "0.6" },
  // Mientras SoftwareTv.html siga activa, déjala aquí. Quítala cuando la reemplace la portada nueva.
  { url: "/SoftwareTv", prioridad: "0.8" },
];

// ------------------------------- utilidades --------------------------------

const esc = (t) =>
  String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

function slugify(text) {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const formatoCOP = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " COP";
const urlMarca = (slug) => pub(`/${CARPETA}/${slug}.html`);
const urlModelo = (slug, mslug) => pub(`/${CARPETA}/${slug}/${mslug}.html`);
const hoy = () => new Date().toISOString().slice(0, 10);

// ------------------------- asignación de modelos a marcas -------------------

function agruparPorMarca(data) {
  const grupos = new Map(MARCAS.map((m) => [m.slug, { marca: m, modelos: [] }]));
  const sinRegistrar = new Map();
  const sinMarca = [];

  for (const [codigo, info] of Object.entries(data)) {
    let destino = null;
    const brandField = (info.brand || "").toString().trim();

    if (brandField) {
      destino = MARCAS.find((m) => m.nombre.toLowerCase() === brandField.toLowerCase());
      if (!destino) {
        sinRegistrar.set(brandField, (sinRegistrar.get(brandField) || 0) + 1);
        continue;
      }
    } else {
      destino = MARCAS.find((m) => (m.prefijos || []).some((p) => codigo.toUpperCase().startsWith(p.toUpperCase())));
      if (!destino) {
        sinMarca.push(codigo);
        continue;
      }
    }
    grupos.get(destino.slug).modelos.push([codigo, info]);
  }

  // slugs únicos por marca + orden alfabético
  for (const g of grupos.values()) {
    g.modelos.sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }));
    const usados = new Set();
    g.modelos = g.modelos.map(([codigo, info]) => {
      let mslug = slugify(info.modelo || codigo);
      if (usados.has(mslug)) {
        let n = 2;
        while (usados.has(`${mslug}-${n}`)) n++;
        console.warn(`⚠️  ${g.marca.nombre}: "${codigo}" genera una URL repetida, se usará ${mslug}-${n}`);
        mslug = `${mslug}-${n}`;
      }
      usados.add(mslug);
      return { codigo, info, mslug };
    });
  }

  for (const [b, n] of sinRegistrar) {
    console.warn(`⚠️  ${n} modelo(s) con brand "${b}" no tienen página: agrega esa marca al arreglo MARCAS.`);
  }
  if (sinMarca.length) {
    console.warn(`⚠️  ${sinMarca.length} modelo(s) sin "brand" ni prefijo conocido (ej. ${sinMarca.slice(0, 3).join(", ")}).`);
  }
  return grupos;
}

// ------------------------------ piezas comunes ------------------------------

const badgeEstado = (estado) => {
  const e = (estado || "").trim().toLowerCase();
  if (e === "disponible") return `<span class="estado-badge estado-disponible">Disponible</span>`;
  return `<span class="estado-badge estado-otro">${esc(estado ? estado[0].toUpperCase() + estado.slice(1) : "Consultar")}</span>`;
};

const NAV_HTML = `
<nav class="nav container">
    <div class="nav__logo">
        <img src="/images/LOGO CP.png" alt="DigitalElectronics">
        <div class="nav_titles">
            <h2 class="nav__title">DigitalElectronics</h2>
            <p>Líder en tecnología</p>
        </div>
    </div>
    <ul class="nav__link nav__link--menu">
        <li class="nav__items"><a href="/" class="nav__links">Inicio</a></li>
        <li class="nav__items"><a href="/products" class="nav__links">Productos</a></li>
        <li class="nav__items"><a href="${URL_PORTADA}" class="nav__links">Software TV</a></li>
        <li class="nav__items"><a id="nav_sol" href="/Soluciones" class="nav__links">Soluciones</a></li>
        <li class="nav__items"><a href="/Contact" class="nav__links">Contacto</a></li>
        <img src="/images/close.svg" class="nav__close">
    </ul>
    <div class="nav__menu"><img src="/images/menu4.png" class="nav__img"></div>
</nav>`;

const FOOTER_HTML = `
<site-footer></site-footer>
<script src="/js/menu.js"></script>
<script type="module" src="/js/footer.js"></script>
<script type="module" src="/js/copyright.js"></script>`;

const HEAD_ASSETS = `
    <link rel="shortcut icon" href="/images/LOGODG16.ico" type="image/x-icon">
    <link rel="stylesheet" href="/css/styleSoftwareTv.css">
    <link rel="stylesheet" href="/css/styleProductos.css">`;

const waLink = (texto) => `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(texto)}`;

// ------------------------------- ayudas de contenido ------------------------

const TELEFONO = WHATSAPP; // número para llamadas (cámbialo si es distinto al de WhatsApp)
const WOMPI_WIDGET = "https://checkout.wompi.co/widget.js";
const MP_CHECKOUT = "https://www.mercadopago.com.co/integrations/v1/web-payment-checkout.js";

const limpiar = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Tamaño en pulgadas: se toma de info.pulgadas si existe; si no, se deduce del código
// del modelo (primer número, ej. K-ATV43UHD -> 43). Si no es un tamaño conocido, queda vacío.
const TAMANOS = new Set([19, 20, 22, 24, 28, 32, 39, 40, 42, 43, 45, 46, 47, 48, 49, 50, 55, 58, 60, 65, 70, 75, 82, 85, 86, 98, 115]);
function pulgadasDe(codigo, info) {
  if (Number(info.pulgadas) > 0) return Number(info.pulgadas);
  const m = String(info.modelo || codigo).toUpperCase().match(/\d{2,4}/);
  if (!m) return null;
  const d = m[0];
  if (d.length >= 3 && Number(d.slice(0, 3)) >= 100 && TAMANOS.has(Number(d.slice(0, 3)))) return Number(d.slice(0, 3));
  const dos = Number(d.slice(0, 2));
  return TAMANOS.has(dos) ? dos : null;
}

// Evidencias opcionales en info.json:
//   "evidencias": [
//     { "tipo": "imagen", "url": "/images/evidencias/k-atv32hd-1.jpg", "titulo": "TV funcionando" },
//     { "tipo": "video",  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX", "titulo": "Prueba" },
//     { "url": "/videos/k-atv32hd.mp4" }
//   ]
// Se aceptan imágenes, videos de YouTube y archivos .mp4/.webm. Solo rutas del sitio ("/...") o https.
function evidenciasDe(info) {
  const lista = Array.isArray(info.evidencias) ? info.evidencias : [];
  const salida = [];
  for (const e of lista) {
    const item = typeof e === "string" ? { url: e } : e || {};
    const url = String(item.url || "").trim();
    if (!/^(\/(?!\/)|https:\/\/)/.test(url)) continue;
    const titulo = String(item.titulo || "").trim();
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) salida.push({ tipo: "youtube", id: yt[1], titulo });
    else if (String(item.tipo || "").toLowerCase() === "video" || /\.(mp4|webm)(\?.*)?$/i.test(url)) salida.push({ tipo: "video", url, titulo });
    else salida.push({ tipo: "imagen", url, titulo });
  }
  return salida;
}

function htmlEvidencias(evs, nombre, modelo) {
  if (!evs.length) return "";
  const items = evs
    .map((e, i) => {
      const alt = e.titulo || `Evidencia de funcionamiento ${nombre} ${modelo} (${i + 1})`;
      let media;
      if (e.tipo === "imagen") {
        media = `<a href="${esc(e.url)}" target="_blank" rel="noopener"><img src="${esc(e.url)}" alt="${esc(alt)}" loading="lazy" decoding="async"></a>`;
      } else if (e.tipo === "youtube") {
        media = `<div class="evid-video"><iframe src="https://www.youtube-nocookie.com/embed/${e.id}" title="${esc(alt)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
      } else {
        media = `<video controls preload="metadata" playsinline src="${esc(e.url)}"></video>`;
      }
      return `<figure class="evid">${media}${e.titulo ? `<figcaption>${esc(e.titulo)}</figcaption>` : ""}</figure>`;
    })
    .join("");
  return `
            <section class="bloque">
                <h2>Evidencias de funcionamiento</h2>
                <p class="bloque-sub">Fotos y videos de este modelo funcionando después del servicio.</p>
                <div class="evid-grid">${items}</div>
            </section>`;
}

// ------------------------------- página de marca ----------------------------

const scriptBusqueda = (nombre) => `
    <script>
    (function () {
        var NOMBRE = ${jsonLd(nombre)};
        var TEL = ${jsonLd(WHATSAPP)};
        var input = document.getElementById('q');
        var borrar = document.getElementById('borrar');
        var cont = document.getElementById('contador');
        var vacio = document.getElementById('vacio');
        var vacioWa = document.getElementById('vacioWa');
        var cards = [].slice.call(document.querySelectorAll('.modelo-card'));
        var chips = [].slice.call(document.querySelectorAll('.chip[data-t]'));
        var chipDisp = document.getElementById('soloDisp');
        var total = cards.length, tam = '', soloDisp = false;

        function limpiar(t) { return String(t).toLowerCase().replace(/[^a-z0-9]/g, ''); }

        function aplicar() {
            var q = limpiar(input.value), n = 0;
            cards.forEach(function (c) {
                var ok = (!q || c.getAttribute('data-q').indexOf(q) !== -1) &&
                         (!tam || c.getAttribute('data-t') === tam) &&
                         (!soloDisp || c.getAttribute('data-d') === '1');
                c.hidden = !ok;
                if (ok) n++;
            });
            cont.textContent = n === total ? total + ' modelos' : 'Mostrando ' + n + ' de ' + total + ' modelos';
            vacio.hidden = n > 0;
            borrar.hidden = !input.value;
            vacioWa.href = 'https://api.whatsapp.com/send?phone=' + TEL + '&text=' +
                encodeURIComponent('Hola DigitalElectronics, busco software para mi TV ' + NOMBRE + (input.value ? ' modelo ' + input.value : ''));
        }

        input.addEventListener('input', aplicar);
        borrar.addEventListener('click', function () { input.value = ''; aplicar(); input.focus(); });
        chips.forEach(function (ch) {
            ch.addEventListener('click', function () {
                tam = ch.getAttribute('data-t');
                chips.forEach(function (x) {
                    x.classList.toggle('is-on', x === ch);
                    x.setAttribute('aria-pressed', x === ch ? 'true' : 'false');
                });
                aplicar();
            });
        });
        if (chipDisp) {
            chipDisp.addEventListener('click', function () {
                soloDisp = !soloDisp;
                chipDisp.classList.toggle('is-on', soloDisp);
                chipDisp.setAttribute('aria-pressed', soloDisp ? 'true' : 'false');
                aplicar();
            });
        }
        aplicar();
    })();
    </script>`;

function renderMarca(grupo) {
  const { marca, modelos } = grupo;
  const { nombre, slug } = marca;
  const url = `${DOMAIN}${urlMarca(slug)}`;
  const total = modelos.length;
  const precios = modelos.map((m) => Number(m.info.valor)).filter((v) => v > 0);
  const desdeTxt = precios.length ? `desde ${formatoCOP(Math.min(...precios))}` : "";
  const desdeMeta = precios.length ? ` Desde ${formatoCOP(Math.min(...precios))}.` : "";
  const wa = waLink(`Hola DigitalElectronics, necesito software para mi TV ${nombre}`);
  const ejemplo = modelos[0] ? modelos[0].info.modelo || modelos[0].codigo : "";

  const tamanos = [...new Set(modelos.map((m) => pulgadasDe(m.codigo, m.info)).filter(Boolean))].sort((a, b) => a - b);
  const chipsTam = tamanos.length >= 2
    ? `<button type="button" class="chip is-on" data-t="" aria-pressed="true">Todos</button>` +
      tamanos.map((t) => `<button type="button" class="chip" data-t="${t}" aria-pressed="false">${t}″</button>`).join("")
    : "";

  const metaDesc = `Software y firmware original para ${total} modelos de Smart TV ${nombre}. Soluciona pantalla negra, bloqueos y reinicios.${desdeMeta} Guía por WhatsApp, llamada o videollamada en Cali, Colombia.`;

  const faq = [
    [`¿Qué necesito para conseguir el software de mi TV ${nombre}?`,
     `Solo el modelo exacto de tu televisor ${nombre}, que está en la etiqueta de la parte trasera. Búscalo en esta página para ver precio y disponibilidad.`],
    [`¿El software para ${nombre} es original?`,
     `Sí. Trabajamos únicamente con software original y licenciado, con acompañamiento técnico hasta que tu televisor funcione correctamente.`],
    [`¿Cómo me ayudan con la instalación?`,
     `Te guiamos por WhatsApp, por llamada telefónica o por videollamada si tu caso lo requiere.`],
    [`¿Qué hago si no encuentro mi modelo ${nombre}?`,
     `Escríbenos por WhatsApp con el modelo exacto y verificamos si está disponible.`],
  ];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Software original para Smart TV ${nombre}`,
    itemListElement: modelos.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${DOMAIN}${urlModelo(slug, m.mslug)}` })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: "Software TV", item: `${DOMAIN}${URL_PORTADA}` },
      { "@type": "ListItem", position: 3, name: nombre, item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  const tarjetas = modelos
    .map((m) => {
      const modelo = m.info.modelo || m.codigo;
      const t = pulgadasDe(m.codigo, m.info);
      const disp = (m.info.estado || "").trim().toLowerCase() === "disponible";
      return `
                <a class="modelo-card" href="${urlModelo(slug, m.mslug)}" data-q="${esc(limpiar(modelo + " " + m.codigo))}" data-t="${t || ""}" data-d="${disp ? 1 : 0}">
                    <div class="mc-top">
                        <h3><span class="mc-marca">${esc(nombre)}</span> ${esc(modelo)}</h3>
                        ${badgeEstado(m.info.estado)}
                    </div>
                    <div class="mc-bottom">
                    <!-- <span class="mc-precio">${esc(m.info.precio || "Consultar")}</span> -->
                        
                        ${t ? `<span class="tag-size">${t}″</span>` : ""}
                        <span class="mc-cta">Consultar</span>
                    </div>
                </a>`;
    })
    .join("");

  const faqHtml = faq
    .map(([q, a]) => `
                <details>
                    <summary>${esc(q)}</summary>
                    <p>${esc(a)}</p>
                </details>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Software Original para Smart TV ${esc(nombre)} | Digital Electronics</title>
    <link rel="canonical" href="${url}">
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="${ROBOTS}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Software Original para Smart TV ${esc(nombre)} - Digital Electronics">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="es_ES">${HEAD_ASSETS}
    <script type="application/ld+json">${jsonLd(itemList)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumb)}</script>
    <script type="application/ld+json">${jsonLd(faqLd)}</script>
</head>
<body class="pagina-marca">
    <header>${NAV_HTML}</header>

    <main>
        <section class="marca-hero">
            <div class="container">
                <nav class="breadcrumb breadcrumb--claro" aria-label="breadcrumb">
                    <a href="/">Inicio</a> &raquo; <a href="${URL_PORTADA}">Software TV</a> &raquo; <span>${esc(nombre)}</span>
                </nav>
                <div class="marca-hero__fila">
                    <div class="marca-hero__logo"><img src="${encodeURI(marca.logo)}" alt="Logo ${esc(nombre)}"></div>
                    <div>
                        <h1>Software original para Smart TV ${esc(nombre)}</h1>
                        <p class="marca-hero__sub">${total} modelos${desdeTxt ? " · " + desdeTxt : ""}</p>
                    </div>
                </div>
                <ul class="confianza">
                    <li>Software original y licenciado</li>
                    <li>Te guiamos por WhatsApp, llamada o videollamada</li>
                    <li>Paga con Mercado Pago o Wompi</li>
                </ul>
            </div>
        </section>

        <section class="catalogo container">
            <div class="buscador-bloque">
                <label for="q" class="buscador-label">Busca tu modelo ${esc(nombre)}</label>
                <div class="buscador">
                    <input type="search" id="q" placeholder="Ej. ${esc(ejemplo)}" autocomplete="off" enterkeyhint="search">
                    <button type="button" id="borrar" class="buscador-borrar" hidden>Borrar</button>
                </div>
                <p class="buscador-ayuda">El modelo está en la etiqueta de la parte trasera del televisor.</p>
                <div class="filtros">
                    ${chipsTam ? `<div class="filtros-grupo" role="group" aria-label="Filtrar por tamaño">${chipsTam}</div>` : ""}
                    <button type="button" class="chip" id="soloDisp" aria-pressed="false">Solo disponibles</button>
                </div>
                <p class="contador" id="contador" aria-live="polite">${total} modelos</p>
            </div>

            <div class="modelos-grid" id="grid">${tarjetas}
            </div>

            <div class="sin-resultados" id="vacio" hidden>
                <h3>No encontramos ese modelo</h3>
                <p>Puede que aún no lo tengamos publicado. Escríbenos y lo verificamos.</p>
                <a id="vacioWa" class="btn-wha" target="_blank" rel="noopener" href="${wa}">Consultar por WhatsApp</a>
            </div>
        </section>

        <section class="faq-marca container">
            <h2>Preguntas frecuentes sobre software ${esc(nombre)}</h2>${faqHtml}
        </section>
    </main>
    ${scriptBusqueda(nombre)}
    ${FOOTER_HTML}
</body>
</html>`;
}

// ------------------------------- página de modelo ---------------------------

const scriptPago = () => `
    <script>
    (function () {
        var MP = ${jsonLd(MP_CHECKOUT)};
        var WOMPI = ${jsonLd(WOMPI_WIDGET)};
        var REDIRECT = ${jsonLd(DOMAIN + "/payment.html")};
        var card = document.getElementById('comprar');
        if (!card || !card.getAttribute('data-valor')) return;
        var modelo = card.getAttribute('data-modelo');
        var valor = Number(card.getAttribute('data-valor'));
        var btn = document.getElementById('btnPagar');
        var mpBox = document.getElementById('mp-button');
        var estado = document.getElementById('compraEstado');
        var radios = card.querySelectorAll('input[name="metodo"]');

        function metodo() {
            for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
            return 'mp';
        }
        function mensaje(txt, esError) {
            estado.textContent = txt || '';
            estado.className = 'compra-estado' + (esError ? ' compra-estado--error' : '');
        }
        function reiniciar() {
            mpBox.innerHTML = '';
            btn.hidden = false;
            btn.disabled = false;
            btn.textContent = 'Continuar con el pago';
            mensaje('');
        }
        function crear(url, titulo) {
            return fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelo: modelo, titulo: titulo, valor: valor })
            }).then(function (r) {
                return r.json().then(function (d) {
                    if (!r.ok) throw new Error(d.error || 'Error');
                    return d;
                });
            });
        }
        function cargar(src) {
            return new Promise(function (ok, fail) {
                if (window.WidgetCheckout) return ok();
                var s = document.createElement('script');
                s.src = src; s.async = true; s.onload = ok; s.onerror = fail;
                document.head.appendChild(s);
            });
        }
        function pagarMP() {
            return crear('/api/crear-preferencia', 'Servicio técnico ' + modelo).then(function (d) {
                if (!d.preference_id) throw new Error('Sin preferencia');
                var s = document.createElement('script');
                s.src = MP;
                s.setAttribute('data-preference-id', d.preference_id);
                s.setAttribute('data-source', 'button');
                mpBox.appendChild(s);
                btn.hidden = true;
                mensaje('Listo. Pulsa el botón de Mercado Pago para completar tu pago.');
            });
        }
        function pagarWompi() {
            return Promise.all([crear('/api/crear-wompi', 'Software original - ' + modelo), cargar(WOMPI)]).then(function (r) {
                var d = r[0];
                var w = new WidgetCheckout({
                    currency: d.moneda,
                    amountInCents: d.montoCentavos,
                    reference: d.referencia,
                    publicKey: d.publicKey,
                    signature: { integrity: d.firma },
                    redirectUrl: REDIRECT
                });
                w.open(function () {});
                btn.disabled = false;
                btn.textContent = 'Continuar con el pago';
                mensaje('Se abrió la ventana de pago de Wompi.');
            });
        }
        btn.addEventListener('click', function () {
            btn.disabled = true;
            btn.textContent = 'Preparando tu pago…';
            mensaje('');
            (metodo() === 'wompi' ? pagarWompi() : pagarMP()).catch(function () {
                btn.disabled = false;
                btn.textContent = 'Continuar con el pago';
                mensaje('No pudimos iniciar el pago. Intenta de nuevo o escríbenos por WhatsApp.', true);
            });
        });
        for (var i = 0; i < radios.length; i++) radios[i].addEventListener('change', reiniciar);
    })();
    </script>`;

function renderModelo(grupo, actual) {
  const { marca, modelos } = grupo;
  const { nombre, slug } = marca;
  const { codigo, info, mslug } = actual;
  const modelo = info.modelo || codigo;
  const url = `${DOMAIN}${urlModelo(slug, mslug)}`;
  const precioTxt = info.precio || "Consultar";
  const estadoTxt = (info.estado || "").trim();
  const disponible = estadoTxt.toLowerCase() === "disponible";
  const valor = Number(info.valor);
  const comprable = disponible && valor > 0;
  const pulg = pulgadasDe(codigo, info);
  const evs = evidenciasDe(info);
  const refPlaca = String(info.main || "").trim();
  const wa = waLink(`Hola DigitalElectronics, necesito software para mi TV ${nombre} ${modelo}`);
  const waVideo = waLink(`Hola DigitalElectronics, necesito una videollamada para guiarme con el software de mi TV ${nombre} ${modelo}`);

  const metaDesc = `Software original para el Smart TV ${nombre} ${modelo}${pulg ? ` de ${pulg} pulgadas` : ""}. Solución para pantalla negra, bloqueos, reinicios o TV que no enciende. Precio ${precioTxt}. Guía por WhatsApp, llamada o videollamada.`;

  const producto = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Software original para Smart TV ${nombre} ${modelo}`,
    description: metaDesc,
    brand: { "@type": "Brand", name: nombre },
    sku: codigo,
    url,
  };
  const imgs = evs.filter((e) => e.tipo === "imagen").map((e) => (e.url.startsWith("/") ? DOMAIN + e.url : e.url));
  if (imgs.length) producto.image = imgs;
  if (valor > 0) {
    producto.offers = {
      "@type": "Offer",
      priceCurrency: "COP",
      price: valor,
      availability: disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    };
  }
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: "Software TV", item: `${DOMAIN}${URL_PORTADA}` },
      { "@type": "ListItem", position: 3, name: nombre, item: `${DOMAIN}${urlMarca(slug)}` },
      { "@type": "ListItem", position: 4, name: modelo, item: url },
    ],
  };

  const idx = modelos.findIndex((m) => m.codigo === codigo);
  const vecinos = [...modelos.slice(Math.max(0, idx - 3), idx), ...modelos.slice(idx + 1, idx + 4)];
  const otros = vecinos
    .map((m) => `<li><a href="${urlModelo(slug, m.mslug)}">${esc(nombre)} ${esc(m.info.modelo || m.codigo)}</a></li>`)
    .join("");

  const faq = [
    [`¿Este software es para el ${nombre} ${modelo} exacto?`,
     `Sí, corresponde a la referencia ${modelo} de ${nombre}. Antes de pagar, confirma en la etiqueta de la parte trasera de tu televisor que la referencia sea la misma. Si tienes dudas, escríbenos.`],
    [`¿Cómo me ayudan con la instalación?`,
     `Te guiamos por WhatsApp, por llamada telefónica o por videollamada si tu caso lo requiere, hasta que el televisor funcione correctamente.`],
    [`¿Qué medios de pago puedo usar?`,
     `Puedes pagar con Mercado Pago o con Wompi. Eliges la plataforma antes de continuar.`],
  ];
  const faqHtml = faq
    .map(([q, a]) => `
                <details>
                    <summary>${esc(q)}</summary>
                    <p>${esc(a)}</p>
                </details>`)
    .join("");

  const filas = [
    ["Marca", nombre],
    ["Modelo", modelo],
    pulg ? ["Tamaño", `${pulg} pulgadas`] : null,
    refPlaca ? ["Referencias de placa", refPlaca] : null,
    ["Disponibilidad", estadoTxt || "Consultar"],
    ["Precio", precioTxt],
  ].filter(Boolean);
  const fichaHtml = filas.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");

  const tarjetaCompra = comprable
    ? `
            <section class="compra-card" id="comprar" aria-labelledby="compra-titulo" data-modelo="${esc(modelo)}" data-valor="${valor}">
                <h2 id="compra-titulo">Resumen de tu pedido</h2>
                <div class="resumen">
                    <div class="resumen-item">
                        <div>
                            <strong>Software original</strong>
                            <span>${esc(nombre)} ${esc(modelo)}</span>
                        </div>
                        <!-- <span class="resumen-precio">${esc(precioTxt)}</span> -->
                    </div>
                    <ul class="resumen-incluye">
                        <li>Software original para tu modelo</li>
                        <li>Acompañamiento técnico hasta que tu TV funcione</li>
                        <li>Guía por WhatsApp, llamada o videollamada si la necesitas</li>
                    </ul>
                    <div class="resumen-total"><span>Total</span><strong>${esc(precioTxt)}</strong></div>
                </div>

                <div class="requisitos">
                <div class="requisitos-title">⚠ Importante antes de comprar</div>
                <ul>
                    <li>Ten disponible una <b>USB de 4 u 8 GB</b>.</li>
                    <li>Necesitas un <b>computador</b> para realizar la descarga.</li>
                </ul>
                </div>

                <fieldset class="metodos">
                    <legend>Elige cómo pagar</legend>
                    <label class="metodo">
                        <input type="radio" name="metodo" value="mp" checked>
                        <span class="metodo-caja"><strong>Mercado Pago</strong><small>Pagas en la plataforma de Mercado Pago</small></span>
                    </label>
                    <label class="metodo">
                        <input type="radio" name="metodo" value="wompi">
                        <span class="metodo-caja"><strong>Wompi</strong><small>Pagas en la plataforma de Wompi</small></span>
                    </label>
                </fieldset>

                <button type="button" class="btn-pagar" id="btnPagar">Continuar con el pago</button>
                <div id="mp-button"></div>
                <p class="compra-estado" id="compraEstado" role="status" aria-live="polite"></p>

                <p class="compra-nota">Los datos de tu tarjeta o cuenta los procesa directamente Mercado Pago o Wompi; no pasan por este sitio. Al terminar volverás a Digital Electronics para confirmar tu pedido y coordinar la instalación.</p>
                <p class="compra-ayuda">¿Dudas antes de pagar? <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a> · <a href="tel:+${TELEFONO}">Llamar</a></p>
            </section>`
    : `
            <section class="compra-card compra-card--off" id="comprar" aria-labelledby="compra-titulo">
                <h2 id="compra-titulo">Disponibilidad</h2>
                <p>${disponible ? "Consulta el precio de este software con nosotros." : "Este software no está disponible por ahora."}</p>
                <a href="${wa}" target="_blank" rel="noopener" class="btn-wha">Consultar por WhatsApp</a>
            </section>`;

  const barraMovil = comprable
    ? `
    <div class="barra-movil">
        <div><span>Total</span><strong>${esc(precioTxt)}</strong></div>
        <a href="#comprar" class="btn-barra">Comprar ahora</a>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Software ${esc(nombre)} ${esc(modelo)} | Firmware Original - Digital Electronics</title>
    <link rel="canonical" href="${url}">
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="${ROBOTS}">
    <meta property="og:type" content="product">
    <meta property="og:title" content="Software original para ${esc(nombre)} ${esc(modelo)} - Digital Electronics">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="es_ES">${HEAD_ASSETS}
    <script type="application/ld+json">${jsonLd(producto)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumb)}</script>
</head>
<body class="pagina-modelo">
    <header class="site-top">${NAV_HTML}</header>

    <main class="prod container">
        <div class="prod-layout">

            <div class="prod-head">
                <nav class="breadcrumb" aria-label="breadcrumb">
                    <a href="/">Inicio</a> &raquo; <a href="${URL_PORTADA}">Software TV</a> &raquo;
                    <a href="${urlMarca(slug)}">${esc(nombre)}</a> &raquo; <span>${esc(modelo)}</span>
                </nav>
                <h1>Software original para ${esc(nombre)} ${esc(modelo)}</h1>
                <div class="prod-badges">${badgeEstado(estadoTxt)}${pulg ? `<span class="tag-size">${pulg}″</span>` : ""}</div>
                <p class="prod-intro">Si tu televisor <strong>${esc(nombre)} ${esc(modelo)}</strong>${pulg ? ` de ${pulg} pulgadas` : ""} se queda pegado en el logo, entra en modo recovery, se reinicia solo o no enciende, este es el software original que le corresponde. Te acompañamos en la instalación hasta que funcione correctamente.</p>
            </div>

            <aside class="prod-buy">${tarjetaCompra}
            </aside>

            <div class="prod-body">
                <section class="bloque">
                    <h2>Un servicio guiado de principio a fin</h2>
                    <div class="canales">
                        <a class="canal" href="${wa}" target="_blank" rel="noopener">
                            <strong>WhatsApp</strong>
                            <span>Resolvemos tus dudas y te guiamos por chat.</span>
                        </a>
                        <a class="canal" href="tel:+${TELEFONO}">
                            <strong>Llamada telefónica</strong>
                            <span>Si prefieres hablar, llámanos y te explicamos paso a paso.</span>
                        </a>
                        <a class="canal" href="${waVideo}" target="_blank" rel="noopener">
                            <strong>Videollamada</strong>
                            <span>Si tu caso lo requiere, te guiamos viendo tu televisor.</span>
                        </a>
                    </div>
                </section>
${htmlEvidencias(evs, nombre, modelo)}
                <section class="bloque">
                    <h2>Cómo funciona</h2>
                    <ol class="pasos">
                        <li><span class="paso-num">1</span><div><h3>Eliges y pagas</h3><p>Pagas con Mercado Pago o con Wompi.</p></div></li>
                        <li><span class="paso-num">2</span><div><h3>Confirmas tu pedido</h3><p>Al terminar el pago confirmas el modelo y el número de serie de tu televisor y los envías por WhatsApp.</p></div></li>
                        <li><span class="paso-num">3</span><div><h3>Te guiamos en la instalación</h3><p>Por WhatsApp, llamada o videollamada, según lo que necesites.</p></div></li>
                        <li><span class="paso-num">4</span><div><h3>Tu televisor vuelve a funcionar</h3><p>Te acompañamos hasta que funcione correctamente.</p></div></li>
                    </ol>
                </section>

                <section class="bloque">
                    <h2>Ficha del modelo</h2>
                    <dl class="ficha">${fichaHtml}</dl>
                </section>

                <section class="bloque faq">
                    <h2>Preguntas frecuentes</h2>${faqHtml}
                </section>

                <section class="bloque otros-modelos">
                    <h2>Otros modelos de ${esc(nombre)}</h2>
                    <ul>${otros}</ul>
                    <a href="${urlMarca(slug)}" class="ver-todos">Ver todos los modelos de ${esc(nombre)}</a>
                </section>
            </div>

        </div>
    </main>${barraMovil}
    ${comprable ? scriptPago() : ""}
    ${FOOTER_HTML}
</body>
</html>`;
}

// ---------------------------------- portada ---------------------------------

const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i;
const formatoPesos = (n) => "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Imágenes del carrusel de cada tarjeta. Orden de prioridad:
//   1) la lista "imagenes" de la marca, si la escribes en MARCAS / MARCAS_EXTERNAS
//   2) los archivos de /images/marcas/{slug}/  (se ordenan por nombre: 1.jpg, 2.jpg, 3.jpg...)
//   3) /images/instalacion/{slug}.jpg  (si existe)
// Si no hay imágenes, la tarjeta muestra el logo de la marca.
function imagenesDeMarca(slug, manual) {
  if (Array.isArray(manual) && manual.length) return manual;
  const dir = path.join(ROOT, "images", "marcas", slug);
  let lista = [];
  if (fs.existsSync(dir)) {
    lista = fs
      .readdirSync(dir)
      .filter((f) => IMG_EXT.test(f))
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
      .map((f) => `/images/marcas/${slug}/${f}`);
  }
  if (!lista.length && fs.existsSync(path.join(ROOT, "images", "instalacion", `${slug}.jpg`))) {
    lista.push(`/images/instalacion/${slug}.jpg`);
  }
  return lista;
}

function tarjetaMarca(d, idx) {
  const { nombre, href, logo, imagenes } = d;
  const logoSrc = esc(encodeURI(logo));
  let media;

  if (imagenes.length) {
    const slides = imagenes
      .map(
        (src, i) => `
                            <div class="mcard__slide" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${imagenes.length}">
                                <img src="${esc(encodeURI(src))}" alt="${esc(`Servicio de software para Smart TV ${nombre} (${i + 1} de ${imagenes.length})`)}" width="800" height="500" decoding="async"${idx === 0 && i === 0 ? "" : ' loading="lazy"'}>
                            </div>`
      )
      .join("");
    const varias = imagenes.length > 1;
    const flechas = varias
      ? `
                        <button type="button" class="mcard__nav mcard__nav--prev" aria-label="Imagen anterior de ${esc(nombre)}" hidden>&#8249;</button>
                        <button type="button" class="mcard__nav mcard__nav--next" aria-label="Imagen siguiente de ${esc(nombre)}" hidden>&#8250;</button>`
      : "";
    const puntos = varias
      ? `
                        <div class="mcard__dots" aria-hidden="true" hidden>${imagenes.map((_, i) => `<span${i === 0 ? ' class="is-on"' : ""}></span>`).join("")}</div>`
      : "";
    media = `
                    <div class="mcard__media" data-carrusel>
                        <div class="mcard__slides" tabindex="0" role="region" aria-roledescription="carrusel" aria-label="Imágenes de ${esc(nombre)}">${slides}
                        </div>${flechas}${puntos}
                        <span class="mcard__chip"><img src="${logoSrc}" alt="Logo ${esc(nombre)}"></span>
                    </div>`;
  } else {
    media = `
                    <div class="mcard__media mcard__media--logo">
                        <img class="mcard__logo-grande" src="${logoSrc}" alt="Logo ${esc(nombre)}" loading="lazy">
                    </div>`;
  }

  const tam = d.tamMin && d.tamMax && d.tamMin !== d.tamMax ? `<p class="mcard__tam">Tamaños de ${d.tamMin}″ a ${d.tamMax}″</p>` : "";
  const stats =
    d.total > 0
      ? `<div class="mcard__stats">
                        <div><strong>${d.total}</strong><span>${d.total === 1 ? "software disponible" : "softwares disponibles"}</span></div>
                       

                    </div>`
      : `<p class="mcard__nota">${esc(d.texto || "Consulta la disponibilidad de tu referencia.")}</p>`;

  return `
                <article class="mcard">${media}
                    <div class="mcard__body">
                        <h3><a href="${href}">${esc(nombre)}</a></h3>
                        ${tam}
                        ${stats}
                        <a class="mcard__cta" href="${href}">Softwares ${esc(nombre)}</a>
                    </div>
                </article>`;
}

function renderPortada(grupos) {
  const activos = [...grupos.values()].filter((g) => g.modelos.length > 0);

  const datos = activos
    .map((g) => {
      const disp = g.modelos.filter((m) => (m.info.estado || "").trim().toLowerCase() === "disponible");
      const precios = disp.map((m) => Number(m.info.valor)).filter((v) => v > 0);
      const tams = g.modelos.map((m) => pulgadasDe(m.codigo, m.info)).filter(Boolean);
      return {
        nombre: g.marca.nombre,
        slug: g.marca.slug,
        href: urlMarca(g.marca.slug),
        logo: g.marca.logo,
        imagenes: imagenesDeMarca(g.marca.slug, g.marca.imagenes),
        total: disp.length,
        desde: precios.length ? Math.min(...precios) : 0,
        tamMin: tams.length ? Math.min(...tams) : 0,
        tamMax: tams.length ? Math.max(...tams) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const externas = MARCAS_EXTERNAS.map((m) => ({
    nombre: m.nombre,
    slug: slugify(m.nombre),
    href: m.href,
    logo: m.logo,
    imagenes: imagenesDeMarca(slugify(m.nombre), m.imagenes),
    total: 0,
    texto: m.texto,
  }));

  const totalSoftwares = datos.reduce((s, d) => s + d.total, 0);
  const nombres = [...datos.map((d) => d.nombre), ...externas.map((d) => d.nombre)];

  const tarjetas = [...datos, ...externas].map((d, i) => tarjetaMarca(d, i));
  tarjetas.push(`
                <article class="mcard mcard--otra">
                    <div class="mcard__media mcard__media--logo"><span class="mcard__mas">+</span></div>
                    <div class="mcard__body">
                        <h3>¿No ves tu marca?</h3>
                        <p class="mcard__nota">Actualizamos el catálogo de forma continua. Escríbenos con la marca y la referencia de tu televisor y lo verificamos.</p>
                        <a class="mcard__cta mcard__cta--wha" target="_blank" rel="noopener" href="${waLink("Hola DigitalElectronics, no encuentro la marca de mi TV")}">Consultar por WhatsApp</a>
                    </div>
                </article>`);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Marcas de Smart TV con software disponible",
    itemListElement: [...datos, ...externas].map((d, i) => ({ "@type": "ListItem", position: i + 1, name: d.nombre, url: `${DOMAIN}${d.href}` })),
  };

  const reemplazos = {
    DOMAIN,
    WHATSAPP,
    CARPETA,
    ROBOTS,
    URL_PORTADA,
    TOTAL_MODELOS: String(totalSoftwares),
    TOTAL_MARCAS: String(nombres.length),
    LISTA_MARCAS: nombres.join(", "),
    JSONLD_MARCAS: jsonLd(itemList),
    TARJETAS: tarjetas.join("\n"),
  };
  let html = fs.readFileSync(PLANTILLA_PORTADA, "utf-8");
  for (const [k, v] of Object.entries(reemplazos)) html = html.split(`{{${k}}}`).join(v);
  return html;
}

// ---------------------------------- sitemap ---------------------------------

function escribirSitemap(entradas) {
  const filas = entradas
    .map((e) => `  <url>\n    <loc>${DOMAIN}${e.url}</loc>\n    <lastmod>${hoy()}</lastmod>\n    <priority>${e.prioridad}</priority>\n  </url>`)
    .join("\n");
  fs.writeFileSync(
    path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${filas}\n</urlset>\n`,
    "utf-8"
  );
  fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`, "utf-8");
}

// ----------------------------------- main -----------------------------------

function main() {
  console.log(PUBLICAR ? "🚀 Modo PUBLICAR (indexable)" : "🛠️  Modo BORRADOR (noindex)");
  const data = JSON.parse(fs.readFileSync(INFO_JSON, "utf-8"));
  const grupos = agruparPorMarca(data);
  const sitemap = [
    { url: URL_PORTADA, prioridad: "1.0" },
    ...PAGINAS_FIJAS,
  ];

  const carpetaMarcas = path.join(ROOT, CARPETA);
  fs.mkdirSync(carpetaMarcas, { recursive: true });

  for (const grupo of grupos.values()) {
    const { marca, modelos } = grupo;
    if (modelos.length === 0) {
      console.warn(`⚠️  ${marca.nombre}: sin modelos en info.json, no se genera su página.`);
      continue;
    }
    // se borra solo la subcarpeta de modelos de ESTA marca (100% generada) para no dejar páginas viejas
    const dirModelos = path.join(carpetaMarcas, marca.slug);
    fs.rmSync(dirModelos, { recursive: true, force: true });
    fs.mkdirSync(dirModelos, { recursive: true });

    fs.writeFileSync(path.join(carpetaMarcas, `${marca.slug}.html`), renderMarca(grupo), "utf-8");
    sitemap.push({ url: urlMarca(marca.slug), prioridad: "0.9" });

    for (const m of modelos) {
      fs.writeFileSync(path.join(dirModelos, `${m.mslug}.html`), renderModelo(grupo, m), "utf-8");
      sitemap.push({ url: urlModelo(marca.slug, m.mslug), prioridad: "0.7" });
    }
    console.log(`✅ ${marca.nombre}: página de marca + ${modelos.length} modelos`);
  }

  fs.writeFileSync(path.join(ROOT, PORTADA), renderPortada(grupos), "utf-8");
  console.log(`✅ ${PORTADA} generado`);

  if (PUBLICAR) {
    fs.rmSync(path.join(ROOT, "productos-v2.html"), { force: true });
    escribirSitemap(sitemap);
    console.log(`✅ sitemap.xml (${sitemap.length} URLs) y robots.txt actualizados`);
  } else {
    console.log("ℹ️  Modo BORRADOR: páginas con noindex, sitemap.xml y robots.txt sin tocar.");
  }
}

main();
