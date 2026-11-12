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
const MARCAS = [
  { nombre: "Kalley", slug: "kalley", logo: "/images/Kalley.jpg", prefijos: ["K-"] },
  { nombre: "Hyundai", slug: "hyundai", logo: "/images/Hyundai.png", prefijos: ["HYLED"] },
  { nombre: "Challenger", slug: "challenger", logo: "/images/logo_challenger.png" },
  { nombre: "JVC", slug: "jvc", logo: "/images/logo-jvc.jpg", prefijos: ["LT-"] },
  { nombre: "Olimpo", slug: "olimpo", logo: "/images/logos olimpo.png" },
  { nombre: "Visivo", slug: "visivo", logo: "/images/visivo logo.png" },
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

// ------------------------------- página de marca ----------------------------

function renderMarca(grupo) {
  const { marca, modelos } = grupo;
  const { nombre, slug } = marca;
  const url = `${DOMAIN}${urlMarca(slug)}`;
  const total = modelos.length;
  const precios = modelos.map((m) => Number(m.info.valor)).filter((v) => v > 0);
  const desde = precios.length ? ` Desde ${formatoCOP(Math.min(...precios))}.` : "";
  const wa = waLink(`Hola DigitalElectronics, necesito software para mi TV ${nombre}`);

  const metaDesc = `Software y firmware original para ${total} modelos de Smart TV ${nombre}. Soluciona pantalla negra, bloqueos y reinicios.${desde} Instalación con soporte técnico en Cali, Colombia.`;

  const faq = [
    [`¿Qué necesito para conseguir el software de mi TV ${nombre}?`,
     `Solo el modelo exacto de tu televisor ${nombre}, que está en la etiqueta de la parte trasera. Búscalo en esta página para ver precio y disponibilidad.`],
    [`¿El software para ${nombre} es original?`,
     `Sí. Trabajamos únicamente con software original y licenciado, con acompañamiento técnico hasta que tu televisor funcione correctamente.`],
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
    .map(
      (m) => `
            <a class="modelo-card" href="${urlModelo(slug, m.mslug)}">
                <div class="modelo-card__top">
                    <h3>${esc(nombre)} ${esc(m.info.modelo || m.codigo)}</h3>
                    ${badgeEstado(m.info.estado)}
                </div>
                <p class="modelo-card__precio">${esc(m.info.precio || "Consultar")}</p>
                <span class="modelo-card__cta">Ver detalles</span>
            </a>`
    )
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
<body>
    <header class="hero">
        ${NAV_HTML}
        <section class="hero__container container">
            <h1 class="hero__title">Software Original para Smart TV ${esc(nombre)}</h1>
            <p class="hero__paragraph">Encuentra tu modelo de televisor ${esc(nombre)} y consulta la disponibilidad de software original. Instalación con soporte técnico profesional.</p>
            <a href="${wa}" target="_blank" rel="noopener" class="cta">Contactar ahora</a>
        </section>
    </header>
    <main>
        <section class="productos-marca container">
            <nav class="breadcrumb" aria-label="breadcrumb">
                <a href="/">Inicio</a> &raquo; <a href="${URL_PORTADA}">Software TV</a> &raquo; <span>${esc(nombre)}</span>
            </nav>
            <p class="intro-marca">Contamos con ${total} modelos de ${esc(nombre)}. Selecciona tu referencia exacta para ver precio y disponibilidad.</p>
            <div class="modelos-grid">${tarjetas}
            </div>
            <section class="faq-marca">
                <h2>Preguntas frecuentes sobre software ${esc(nombre)}</h2>${faqHtml}
            </section>
        </section>
    </main>
    ${FOOTER_HTML}
</body>
</html>`;
}

// ------------------------------- página de modelo ---------------------------

function renderModelo(grupo, actual) {
  const { marca, modelos } = grupo;
  const { nombre, slug } = marca;
  const { codigo, info, mslug } = actual;
  const modelo = info.modelo || codigo;
  const url = `${DOMAIN}${urlModelo(slug, mslug)}`;
  const precioTxt = info.precio || "Consultar";
  const disponible = (info.estado || "").trim().toLowerCase() === "disponible";
  const wa = waLink(`Hola DigitalElectronics, necesito software para mi TV ${nombre} ${modelo}`);
  const comprable = disponible && Number(info.valor) > 0;

  const producto = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Software original para Smart TV ${nombre} ${modelo}`,
    brand: { "@type": "Brand", name: nombre },
    sku: codigo,
    url,
  };
  if (Number(info.valor) > 0) {
    producto.offers = {
      "@type": "Offer",
      priceCurrency: "COP",
      price: Number(info.valor),
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

  // enlaces a modelos vecinos (los 3 anteriores y 3 siguientes en la lista)
  const idx = modelos.findIndex((m) => m.codigo === codigo);
  const vecinos = [...modelos.slice(Math.max(0, idx - 3), idx), ...modelos.slice(idx + 1, idx + 4)];
  const otros = vecinos
    .map((m) => `<li><a href="${urlModelo(slug, m.mslug)}">${esc(nombre)} ${esc(m.info.modelo || m.codigo)}</a></li>`)
    .join("");

  const metaDesc = `Software original para el Smart TV ${nombre} ${modelo}. Solución para pantalla negra, bloqueos, reinicios o TV que no enciende. Precio ${precioTxt}. Instalación con soporte técnico en Cali, Colombia.`;

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
<body>
    <header class="hero hero--producto">${NAV_HTML}</header>
    <main>
        <section class="producto-detalle container">
            <nav class="breadcrumb" aria-label="breadcrumb">
                <a href="/">Inicio</a> &raquo; <a href="${URL_PORTADA}">Software TV</a> &raquo;
                <a href="${urlMarca(slug)}">${esc(nombre)}</a> &raquo; <span>${esc(modelo)}</span>
            </nav>
            <h1>Software Original para ${esc(nombre)} ${esc(modelo)}</h1>
            ${badgeEstado(info.estado)}
            <p class="producto-descripcion">Si tu televisor <strong>${esc(nombre)} ${esc(modelo)}</strong> se queda pegado en el logo, entra en modo recovery, se reinicia solo o no enciende, contamos con el software original correspondiente a este modelo. Realizamos la instalación con acompañamiento técnico hasta que tu equipo funcione correctamente.</p>
            <div class="producto-info-box">
                <div class="producto-info-item"><span class="label">Modelo</span><span class="value">${esc(modelo)}</span></div>
                <div class="producto-info-item"><span class="label">Marca</span><span class="value">${esc(nombre)}</span></div>
                <div class="producto-info-item"><span class="label">Software</span><span class="value">${esc(info.software || "Consultar")}</span></div>
                <div class="producto-info-item"><span class="label">MainBoard</span><span class="value">${esc(info.main || "Consultar")}</span></div>
                
                <div class="producto-info-item"><span class="label">Precio</span><span class="value">${esc(precioTxt)}</span></div>
                <div class="producto-info-item"><span class="label">Disponibilidad</span><span class="value">${esc(info.estado || "Consultar")}</span></div>
            </div>
            ${comprable ? `<div class="compra" data-modelo="${esc(modelo)}" data-valor="${Number(info.valor)}">
                <button type="button" class="btn-comprar" id="btnComprar">Comprar ahora</button>
                <div id="mp-button"></div>
                <p class="compra-nota">Pagas con Mercado Pago y te acompañamos por WhatsApp hasta que tu televisor funcione.</p>
            </div>` : ""}
            <a href="${wa}" target="_blank" rel="noopener" class="cta-producto cta-producto--wha">${comprable ? "Preguntar por WhatsApp" : "Solicitar instalación por WhatsApp"}</a>
            <section class="otros-modelos">
                <h2>Otros modelos de ${esc(nombre)}</h2>
                <ul>${otros}</ul>
                <a href="${urlMarca(slug)}" class="ver-todos">Ver todos los modelos de ${esc(nombre)}</a>
            </section>
        </section>
    </main>${comprable ? `
    <script>
    (function () {
        var box = document.querySelector('.compra');
        if (!box) return;
        var btn = document.getElementById('btnComprar');
        var cont = document.getElementById('mp-button');
        btn.addEventListener('click', function () {
            btn.disabled = true;
            btn.textContent = 'Preparando pago…';
            // Misma llamada que usa el modal de tus páginas de marca (updateInfoMP.js)
            fetch('/api/crear-preferencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelo: box.dataset.modelo,
                    titulo: 'Servicio técnico ' + box.dataset.modelo,
                    valor: Number(box.dataset.valor)
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d.preference_id) throw new Error('Sin preferencia');
                var s = document.createElement('script');
                s.src = 'https://www.mercadopago.com.co/integrations/v1/web-payment-checkout.js';
                s.setAttribute('data-preference-id', d.preference_id);
                s.setAttribute('data-source', 'button');
                cont.appendChild(s);
                btn.style.display = 'none';
            })
            .catch(function () {
                btn.disabled = false;
                btn.textContent = 'Comprar ahora';
                cont.innerHTML = '<p class="mp-error">No pudimos preparar el pago. Escríbenos por WhatsApp y te ayudamos.</p>';
            });
        });
    })();
    </script>` : ""}
    ${FOOTER_HTML}
</body>
</html>`;
}

// ---------------------------------- portada ---------------------------------

function renderPortada(grupos) {
  const activos = [...grupos.values()].filter((g) => g.modelos.length > 0);
  const totalModelos = activos.reduce((s, g) => s + g.modelos.length, 0);
  const nombres = [...activos.map((g) => g.marca.nombre), ...MARCAS_EXTERNAS.map((m) => m.nombre)];

  const tarjeta = ({ nombre, slug, href, logo, meta, ejemplos }) => `
                <a class="marca-card" href="${href}">
                    <div class="marca-card__tv">
                        <div class="marca-card__pantalla">
                            <img class="marca-card__logo" src="${encodeURI(logo)}" alt="Logo ${esc(nombre)}" loading="lazy">
                            <img class="marca-card__foto" src="/images/instalacion/${slug}.jpg" alt="Instalación de software en Smart TV ${esc(nombre)}" loading="lazy" onerror="this.remove()">
                        </div>
                    </div>
                    <div class="marca-card__cuerpo">
                        <h3>${esc(nombre)}</h3>
                        <p class="marca-card__meta">${esc(meta)}</p>
                        <p class="marca-card__ejemplos">${esc(ejemplos)}</p>
                        <span class="marca-card__cta">Buscar software ${esc(nombre)}</span>
                    </div>
                </a>`;

  const tarjetas = activos.map((g) => {
    const precios = g.modelos.map((m) => Number(m.info.valor)).filter((v) => v > 0);
    const desde = precios.length ? ` · desde ${formatoCOP(Math.min(...precios))}` : "";
    const ej = g.modelos.slice(0, 3).map((m) => m.info.modelo || m.codigo).join(", ");
    return tarjeta({
      nombre: g.marca.nombre,
      slug: g.marca.slug,
      href: urlMarca(g.marca.slug),
      logo: g.marca.logo,
      meta: `${g.modelos.length} modelos${desde}`,
      ejemplos: `Ej.: ${ej}…`,
    });
  });

  MARCAS_EXTERNAS.forEach((m) =>
    tarjetas.push(tarjeta({ nombre: m.nombre, slug: slugify(m.nombre), href: m.href, logo: m.logo, meta: m.texto, ejemplos: "Verifica la disponibilidad de tu referencia." }))
  );

  tarjetas.push(`
                <a class="marca-card marca-card--otra" target="_blank" rel="noopener" href="${waLink("Hola DigitalElectronics, no encuentro la marca de mi TV")}">
                    <div class="marca-card__tv">
                        <div class="marca-card__pantalla"><span class="marca-card__mas">+</span></div>
                    </div>
                    <div class="marca-card__cuerpo">
                        <h3>¿No ves tu marca?</h3>
                        <p class="marca-card__meta">Actualizamos el catálogo de forma continua</p>
                        <p class="marca-card__ejemplos">Escríbenos con la marca y la referencia de tu televisor.</p>
                        <span class="marca-card__cta marca-card__cta--wha">Consultar por WhatsApp</span>
                    </div>
                </a>`);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Marcas de Smart TV con software disponible",
    itemListElement: [
      ...activos.map((g) => ({ name: g.marca.nombre, url: `${DOMAIN}${urlMarca(g.marca.slug)}` })),
      ...MARCAS_EXTERNAS.map((m) => ({ name: m.nombre, url: `${DOMAIN}${m.href}` })),
    ].map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: x.url })),
  };

  const reemplazos = {
    DOMAIN,
    WHATSAPP,
    CARPETA,
    ROBOTS,
    URL_PORTADA,
    TOTAL_MODELOS: String(totalModelos),
    TOTAL_MARCAS: String(nombres.length),
    LISTA_MARCAS: nombres.join(", "),
    JSONLD_MARCAS: jsonLd(itemList),
    TARJETAS: tarjetas.join("\n"),
  };

  console.log("========== DIAGNÓSTICO ==========");
  console.log("Directorio actual:", process.cwd());
  console.log("Directorio del script:", __dirname);
  console.log("Ruta absoluta:", PLANTILLA_PORTADA);
  console.log("¿Existe la plantilla?", fs.existsSync(PLANTILLA_PORTADA));

  console.log(
      "Archivos en plantillas:",
      fs.existsSync(path.dirname(PLANTILLA_PORTADA))
          ? fs.readdirSync(path.dirname(PLANTILLA_PORTADA))
          : "LA CARPETA NO EXISTE"
  );

  console.log("=================================");

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
