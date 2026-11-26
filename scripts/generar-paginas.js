// scripts/generar-paginas.js
// ---------------------------------------------------------------------------
// Corre automáticamente en cada deploy de Vercel (ver vercel.json) y también
// lo puedes correr en tu PC con:   node scripts/generar-paginas.js
//
// Qué genera, a partir de info.json:
//   /products.html                       portada con las tarjetas de marca (reemplaza tu página de productos)
//   /marcas/{marca}.html                 una página por marca
//   /marcas/{marca}/{modelo}.html        una página por modelo
//   /sitemap.xml                         (robots.txt solo se crea si no existe)
//
// NO toca ningún otro archivo que hayas hecho a mano (tcl.html, SoftwareTv.html, robots.txt...).
//
// MODO PUBLICAR (por defecto) vs MODO BORRADOR  ->  ver constante PUBLICAR abajo.
//
// CAMPOS OPCIONALES EN info.json (por modelo):
//   "pulgadas": 43            -> fuerza el tamaño; si no existe se deduce del código del modelo
//   "evidencias": [ ... ]     -> fotos y videos de funcionamiento (ver evidenciasDe() más abajo)
//
// DESCUENTOS: se configuran en descuentos.json (ver descuentos.EJEMPLO.json). Se muestran en las páginas
// y el servidor (api/_precio.js) los aplica al cobrar.
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
// MODO PUBLICAR (PUBLICAR = true)  <- el de ahora
//   - La portada se guarda como products.html (reemplaza tu página de productos anterior).
//   - Las páginas se indexan en Google y se regenera sitemap.xml.
//   - Se borra productos-v2.html si existía.
// MODO BORRADOR (PUBLICAR = false), por si algún día quieres probar cambios sin que Google los vea
//   - La portada se guarda como productos-v2.html (NO pisa products.html).
//   - Todas las páginas llevan <meta robots="noindex, nofollow"> y no se toca sitemap.xml.
// Para usar el borrador sin editar el archivo:  PUBLICAR=0 node scripts/generar-paginas.js
// ---------------------------------------------------------------------------
const PUBLICAR = process.env.PUBLICAR ? process.env.PUBLICAR === "1" : true;
const PORTADA_PUBLICA = "products.html";

// Tu vercel.json tiene "cleanUrls": true, así que Vercel sirve /marcas/kalley y redirige
// /marcas/kalley.html hacia ahí. Por eso las URLs públicas (enlaces, canonical, sitemap)
// se escriben SIN ".html". Los archivos en disco siguen siendo .html.
const URLS_LIMPIAS = true;
const pub = (ruta) => (URLS_LIMPIAS ? ruta.replace(/\.html$/, "") : ruta);

const PORTADA = PUBLICAR ? PORTADA_PUBLICA : "productos-v2.html";
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

// ------------------------------- descuentos ---------------------------------
// Las reglas se escriben en descuentos.json (raíz del repo). Mira descuentos.EJEMPLO.json.
// La MISMA lógica corre en tres sitios:
//   1) aquí, al generar las páginas
//   2) en el navegador del cliente, para mostrar la oferta
//   3) en api/_precio.js, en el servidor, que es quien decide cuánto se cobra
// Por eso PRECIOS_JS está idéntico en api/_precio.js (entre las marcas <<PRECIOS_JS y PRECIOS_JS>>).
// Si algún día cambias este bloque, copia el cambio allá; el generador te avisa si no coinciden.
const DESCUENTOS_JSON = path.join(ROOT, "descuentos.json");
const API_PRECIO = path.join(ROOT, "api", "_precio.js");

const PRECIOS_JS = String.raw`
function instante(txt, fin) {
  var s = String(txt || "").trim();
  if (!s) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += fin ? "T23:59:59.999" : "T00:00:00";
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) s += "-05:00";
  return new Date(s).getTime();
}
function norm(s) { return String(s || "").trim().toLowerCase(); }
function reglaVigente(r, ahora) {
  if (!r || r.activa === false) return false;
  var d = instante(r.desde, false), h = instante(r.hasta, true), t = ahora.getTime();
  return !isNaN(d) && !isNaN(h) && t >= d && t <= h;
}
function reglaAplica(r, item) {
  var modelos = (r.modelos || []).map(norm), marcas = (r.marcas || []).map(norm);
  if (modelos.length) return modelos.indexOf(norm(item.codigo)) !== -1 || modelos.indexOf(norm(item.modelo)) !== -1;
  if (marcas.length) return marcas.indexOf(norm(item.marca)) !== -1;
  return true;
}
function precioFinal(item, config, ahora) {
  var valor = Number(item.valor) || 0;
  var sin = { valor: valor, valorFinal: valor, ahorro: 0, porcentaje: 0, regla: null };
  if (!(valor > 0) || !config || !Array.isArray(config.reglas)) return sin;
  var paso = Number(config.redondeo) > 0 ? Number(config.redondeo) : 50;
  var mejor = null;
  for (var i = 0; i < config.reglas.length; i++) {
    var r = config.reglas[i];
    if (!reglaVigente(r, ahora) || !reglaAplica(r, item)) continue;
    var pct = Number(r.porcentaje), fijo = Number(r.montoFijo), rebaja = 0;
    if (pct >= 1 && pct <= 90) rebaja = valor * pct / 100;
    else if (fijo > 0) rebaja = fijo;
    if (!(rebaja > 0)) continue;
    var fin = Math.round((valor - rebaja) / paso) * paso;
    if (!(fin > 0) || fin >= valor) continue;
    if (!mejor || fin < mejor.valorFinal) {
      mejor = {
        valor: valor,
        valorFinal: fin,
        ahorro: valor - fin,
        porcentaje: Math.round((valor - fin) / valor * 100),
        regla: { id: r.id || r.nombre || "", nombre: r.nombre || "Descuento", hastaMs: instante(r.hasta, true) }
      };
    }
  }
  return mejor || sin;
}
`;

const motorPrecios = new Function(
  PRECIOS_JS + "\nreturn { instante: instante, reglaVigente: reglaVigente, reglaAplica: reglaAplica, precioFinal: precioFinal };"
)();

let DESCUENTOS = { redondeo: 50, reglas: [] };

function cargarDescuentos() {
  try {
    const c = JSON.parse(fs.readFileSync(DESCUENTOS_JSON, "utf-8"));
    return { redondeo: Number(c.redondeo) > 0 ? Number(c.redondeo) : 50, reglas: Array.isArray(c.reglas) ? c.reglas : [] };
  } catch (e) {
    if (e.code !== "ENOENT") console.warn(`⚠️  descuentos.json no se pudo leer (${e.message}). Se generan las páginas sin descuentos.`);
    return { redondeo: 50, reglas: [] };
  }
}

// Avisa de errores de digitación en las reglas (fechas, porcentajes, marcas que no existen...)
function validarDescuentos(config, nombresMarcas) {
  const marcasOk = new Set(nombresMarcas.map((n) => n.toLowerCase()));
  config.reglas.forEach((r, i) => {
    const id = r && (r.id || r.nombre) ? `"${r.id || r.nombre}"` : `#${i + 1}`;
    const aviso = (txt) => console.warn(`⚠️  descuentos.json, regla ${id}: ${txt}`);
    if (!r || typeof r !== "object") return aviso("no es un objeto válido.");
    if (isNaN(motorPrecios.instante(r.desde, false))) aviso(`"desde" no es una fecha válida (usa AAAA-MM-DD): ${r.desde}`);
    if (isNaN(motorPrecios.instante(r.hasta, true))) aviso(`"hasta" no es una fecha válida (usa AAAA-MM-DD): ${r.hasta}`);
    else if (motorPrecios.instante(r.hasta, true) < motorPrecios.instante(r.desde, false)) aviso('"hasta" es anterior a "desde".');
    const pct = Number(r.porcentaje), fijo = Number(r.montoFijo);
    if (!(pct >= 1 && pct <= 90) && !(fijo > 0)) aviso('necesita "porcentaje" entre 1 y 90, o "montoFijo" mayor que 0. Si no, no hace nada.');
    (r.marcas || []).forEach((m) => {
      if (!marcasOk.has(String(m).toLowerCase())) aviso(`la marca "${m}" no existe en MARCAS (revisa mayúsculas y ortografía).`);
    });
  });
}

// Confirma que api/_precio.js (lo que cobra) tiene la misma lógica que PRECIOS_JS (lo que se muestra)
function verificarParidadAPI() {
  try {
    const src = fs.readFileSync(API_PRECIO, "utf-8").replace(/\r\n/g, "\n");
    const m = src.match(/\/\/ <<PRECIOS_JS[^\n]*\n([\s\S]*?)\n\/\/ PRECIOS_JS>>/);
    if (!m) return console.warn("⚠️  api/_precio.js no tiene las marcas <<PRECIOS_JS ... PRECIOS_JS>>; no se pudo verificar.");
    if (m[1].trim() !== PRECIOS_JS.trim()) {
      console.warn("⚠️  La lógica de precios de api/_precio.js NO coincide con la del generador. Lo que se muestra y lo que se cobra podrían diferir.");
    }
  } catch (e) {
    console.log("ℹ️  Sin api/_precio.js: los descuentos están desactivados (se activan al agregar ese archivo y las APIs nuevas).");
  }
}

// Reglas no vencidas (al generar) que podrían aplicar a alguno de los items dados
function reglasRelevantes(items) {
  const ahora = Date.now();
  return DESCUENTOS.reglas.filter((r) => {
    if (!r || r.activa === false) return false;
    const h = motorPrecios.instante(r.hasta, true);
    if (isNaN(h) || h < ahora) return false;
    return items.some((it) => motorPrecios.reglaAplica(r, it));
  });
}
const datosDescuento = (reglas) => jsonLd({ redondeo: DESCUENTOS.redondeo, reglas });

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
  if (e === "disponible") return `<span class="estado-pill estado-disponible">Disponible</span>`;
  return `<span class="estado-pill estado-otro">${esc(estado ? estado[0].toUpperCase() + estado.slice(1) : "Consultar")}</span>`;
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
        <li class="nav__items"><a href="/SoftwareTv" class="nav__links">Software TV</a></li>
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

// Evidencias opcionales en info.json (fotos y videos de funcionamiento):
//   "evidencias": [
//     { "tipo": "imagen", "url": "/images/evidencias/k-atv32hd-1.jpg", "titulo": "TV funcionando" },
//     { "tipo": "video",  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX", "titulo": "Prueba en video" },
//     { "url": "/videos/k-atv32hd.mp4", "miniatura": "/images/evidencias/k-atv32hd-video.jpg" }
//   ]
// Se aceptan imágenes, videos de YouTube y archivos .mp4/.webm. Solo rutas del sitio ("/...") o https.
// "miniatura" es opcional (útil para videos .mp4). Con varias evidencias se muestra un visor deslizable
// con miniaturas debajo; con una sola, solo el visor.
const urlValida = (u) => /^(\/(?!\/)|https:\/\/)/.test(u);

function evidenciasDe(info) {
  const lista = Array.isArray(info.evidencias) ? info.evidencias : [];
  const salida = [];
  for (const e of lista) {
    const item = typeof e === "string" ? { url: e } : e || {};
    const url = String(item.url || "").trim();
    if (!urlValida(url)) continue;
    const titulo = String(item.titulo || "").trim();
    const mini = String(item.miniatura || "").trim();
    const miniatura = urlValida(mini) ? mini : "";
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) salida.push({ tipo: "youtube", id: yt[1], titulo, miniatura });
    else if (String(item.tipo || "").toLowerCase() === "video" || /\.(mp4|webm)(\?.*)?$/i.test(url)) salida.push({ tipo: "video", url, titulo, miniatura });
    else salida.push({ tipo: "imagen", url, titulo, miniatura });
  }
  return salida;
}

function htmlEvidencias(evs, nombre, modelo) {
  if (!evs.length) return "";
  const varias = evs.length > 1;

  const slides = evs
    .map((e, i) => {
      const alt = e.titulo || `Evidencia de funcionamiento ${nombre} ${modelo} (${i + 1} de ${evs.length})`;
      let media;
      if (e.tipo === "imagen") {
        media = `<a class="gal-img" href="${esc(e.url)}" target="_blank" rel="noopener"><img src="${esc(e.url)}" alt="${esc(alt)}"${i === 0 ? "" : ' loading="lazy"'} decoding="async"></a>`;
      } else if (e.tipo === "youtube") {
        const poster = e.miniatura || `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
        media = `<a class="gal-yt" href="https://www.youtube.com/watch?v=${e.id}" target="_blank" rel="noopener" data-yt="${e.id}" data-titulo="${esc(alt)}" aria-label="Reproducir video: ${esc(alt)}"><img src="${esc(poster)}" alt="${esc(alt)}" loading="lazy"><span class="gal-play" aria-hidden="true"></span></a>`;
      } else {
        media = `<video controls preload="metadata" playsinline${e.miniatura ? ` poster="${esc(e.miniatura)}"` : ""} src="${esc(e.url)}"></video>`;
      }
      return `
                        <figure class="gal-slide" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${evs.length}" data-leyenda="${esc(e.titulo)}">${media}</figure>`;
    })
    .join("");

  const minis = evs
    .map((e, i) => {
      let interior;
      if (e.tipo === "imagen") interior = `<img src="${esc(e.miniatura || e.url)}" alt="" loading="lazy" decoding="async">`;
      else if (e.tipo === "youtube") interior = `<img src="${esc(e.miniatura || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`)}" alt="" loading="lazy"><span class="gal-mini-play" aria-hidden="true"></span>`;
      else interior = e.miniatura ? `<img src="${esc(e.miniatura)}" alt="" loading="lazy"><span class="gal-mini-play" aria-hidden="true"></span>` : `<span class="gal-mini-video" aria-hidden="true">Video</span>`;
      return `<button type="button" class="gal-mini${i === 0 ? " is-on" : ""}" data-i="${i}" aria-label="Ver ${e.tipo === "imagen" ? "imagen" : "video"} ${i + 1} de ${evs.length}" aria-current="${i === 0 ? "true" : "false"}">${interior}</button>`;
    })
    .join("");

  return `
            <section class="bloque galeria" data-galeria>
                <h2>Evidencias de funcionamiento</h2>
                <p class="bloque-sub">Fotos y videos de este modelo funcionando después del servicio.</p>
                <div class="gal-visor">
                    <div class="gal-pista" tabindex="0" role="region" aria-roledescription="carrusel" aria-label="Evidencias de ${esc(nombre)} ${esc(modelo)}">${slides}
                    </div>${
                      varias
                        ? `
                    <button type="button" class="gal-nav gal-nav--prev" aria-label="Anterior" hidden>&#8249;</button>
                    <button type="button" class="gal-nav gal-nav--next" aria-label="Siguiente" hidden>&#8250;</button>`
                        : ""
                    }
                </div>
                <div class="gal-pie">
                    <span class="gal-leyenda">${esc(evs[0].titulo)}</span>${varias ? `<span class="gal-contador">1 / ${evs.length}</span>` : ""}
                </div>${varias ? `
                <div class="gal-minis" role="group" aria-label="Miniaturas de las evidencias">${minis}</div>` : ""}
            </section>`;
}

// Visor deslizable: el deslizado es nativo (scroll-snap); este código añade flechas, miniaturas,
// contador, leyenda, y carga el video de YouTube solo cuando el cliente lo pide.
const scriptGaleria = () => `
    <script>
    (function () {
        [].slice.call(document.querySelectorAll('[data-galeria]')).forEach(function (g) {
            var pista = g.querySelector('.gal-pista');
            var slides = [].slice.call(pista.children);
            var total = slides.length;
            var minis = [].slice.call(g.querySelectorAll('.gal-mini'));
            var tira = g.querySelector('.gal-minis');
            var prev = g.querySelector('.gal-nav--prev');
            var next = g.querySelector('.gal-nav--next');
            var cont = g.querySelector('.gal-contador');
            var leyenda = g.querySelector('.gal-leyenda');
            var ultimo = 0;

            function actual() { return Math.round(pista.scrollLeft / (pista.clientWidth || 1)); }

            // Al salir de una diapositiva se detiene su video
            function detener(i) {
                var s = slides[i];
                if (!s) return;
                var v = s.querySelector('video');
                if (v && v.pause) v.pause();
                var f = s.querySelector('iframe');
                if (f && s.__facade) { s.replaceChild(s.__facade, f.parentNode); s.__facade = null; }
            }
            function marcar() {
                var i = Math.max(0, Math.min(total - 1, actual()));
                if (i !== ultimo) { detener(ultimo); ultimo = i; }
                minis.forEach(function (m, k) {
                    m.classList.toggle('is-on', k === i);
                    m.setAttribute('aria-current', k === i ? 'true' : 'false');
                });
                if (cont) cont.textContent = (i + 1) + ' / ' + total;
                if (leyenda) leyenda.textContent = slides[i].getAttribute('data-leyenda') || '';
                if (prev) prev.disabled = i === 0;
                if (next) next.disabled = i === total - 1;
                var m = minis[i];
                if (m && tira) tira.scrollLeft = m.offsetLeft - (tira.clientWidth - m.offsetWidth) / 2;
            }
            function ir(i) {
                i = Math.max(0, Math.min(total - 1, i));
                pista.scrollTo({ left: i * pista.clientWidth, behavior: 'auto' });
                marcar();
            }

            if (prev) { prev.hidden = false; prev.addEventListener('click', function () { ir(actual() - 1); }); }
            if (next) { next.hidden = false; next.addEventListener('click', function () { ir(actual() + 1); }); }
            minis.forEach(function (m) {
                m.addEventListener('click', function () { ir(Number(m.getAttribute('data-i'))); });
            });
            pista.addEventListener('scroll', function () { window.requestAnimationFrame(marcar); }, { passive: true });
            pista.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual() + 1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual() - 1); }
            });

            // YouTube: primero se ve la miniatura; el video se carga solo al pulsar
            [].slice.call(g.querySelectorAll('[data-yt]')).forEach(function (a) {
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    var fig = a.parentNode;
                    var caja = document.createElement('div');
                    caja.className = 'gal-embed';
                    var f = document.createElement('iframe');
                    f.src = 'https://www.youtube-nocookie.com/embed/' + a.getAttribute('data-yt') + '?autoplay=1&rel=0';
                    f.title = a.getAttribute('data-titulo') || 'Video';
                    f.allow = 'autoplay; encrypted-media; picture-in-picture';
                    f.setAttribute('allowfullscreen', '');
                    caja.appendChild(f);
                    fig.__facade = a;
                    fig.replaceChild(caja, a);
                });
            });
            marcar();
        });
    })();
    </script>`;

// ------------------------------- página de marca ----------------------------

const scriptBusqueda = (nombre, reglas) => `
    <script>
    (function () {
        var NOMBRE = ${jsonLd(nombre)};
        var TEL = ${jsonLd(WHATSAPP)};
        var DESC = ${datosDescuento(reglas)};
        ${PRECIOS_JS}
        var input = document.getElementById('q');
        var borrar = document.getElementById('borrar');
        var cont = document.getElementById('contador');
        var vacio = document.getElementById('vacio');
        var vacioWa = document.getElementById('vacioWa');
        var cards = [].slice.call(document.querySelectorAll('.modelo-card'));
        var chips = [].slice.call(document.querySelectorAll('.chip[data-t]'));
        var chipDisp = document.getElementById('soloDisp');
        var chipOferta = document.getElementById('soloOferta');
        var bannerOferta = document.getElementById('ofertaMarca');
        var total = cards.length, tam = '', soloDisp = false, soloOf = false;

        function limpiar(t) { return String(t).toLowerCase().replace(/[^a-z0-9]/g, ''); }
        function fecha(ms) {
            try { return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' }); }
            catch (e) { return ''; }
        }

        // ---- Ofertas vigentes hoy (se calculan con la fecha del navegador; el cobro lo decide el servidor) ----
        (function ofertas() {
            var ahora = new Date(), vistas = {}, hay = 0;
            cards.forEach(function (c) {
                var r = precioFinal({
                    codigo: c.getAttribute('data-cod'),
                    modelo: c.getAttribute('data-mod'),
                    marca: NOMBRE,
                    valor: Number(c.getAttribute('data-valor'))
                }, DESC, ahora);
                if (!r.regla) return;
                hay++;
                c.setAttribute('data-o', '1');
                var b = c.querySelector('.mc-oferta');
                if (b) { b.textContent = '−' + r.porcentaje + '% OFF'; b.hidden = false; }
                vistas[r.regla.id || r.regla.nombre] = r.regla;
            });
            if (!hay) return;
            var nombres = Object.keys(vistas).map(function (k) {
                return vistas[k].nombre + ' (hasta el ' + fecha(vistas[k].hastaMs) + ')';
            });
            bannerOferta.textContent = 'Oferta activa: ' + nombres.join(' · ') + ' · ' + hay + (hay === 1 ? ' modelo' : ' modelos') + ' con descuento';
            bannerOferta.hidden = false;
            chipOferta.hidden = false;
        })();

        function aplicar() {
            var q = limpiar(input.value), n = 0;
            cards.forEach(function (c) {
                var ok = (!q || c.getAttribute('data-q').indexOf(q) !== -1) &&
                         (!tam || c.getAttribute('data-t') === tam) &&
                         (!soloDisp || c.getAttribute('data-d') === '1') &&
                         (!soloOf || c.getAttribute('data-o') === '1');
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
        function alternar(chip, estado) {
            chip.classList.toggle('is-on', estado);
            chip.setAttribute('aria-pressed', estado ? 'true' : 'false');
        }
        if (chipDisp) chipDisp.addEventListener('click', function () { soloDisp = !soloDisp; alternar(chipDisp, soloDisp); aplicar(); });
        if (chipOferta) chipOferta.addEventListener('click', function () { soloOf = !soloOf; alternar(chipOferta, soloOf); aplicar(); });
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
      { "@type": "ListItem", position: 2, name: "Productos", item: `${DOMAIN}${URL_PORTADA}` },
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
                <a class="modelo-card" href="${urlModelo(slug, m.mslug)}" data-q="${esc(limpiar(modelo + " " + m.codigo))}" data-t="${t || ""}" data-d="${disp ? 1 : 0}" data-cod="${esc(m.codigo)}" data-mod="${esc(modelo)}" data-valor="${Number(m.info.valor) || 0}">
                    <div class="mc-top">
                        <h3><span class="mc-marca">${esc(nombre)}</span> ${esc(modelo)}</h3>
                        <!-- ${badgeEstado(m.info.estado)} -->
                        <span class="mc-oferta" hidden></span>
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
                    <a href="/">Inicio</a> &raquo; <a href="${URL_PORTADA}">Productos</a> &raquo; <span>${esc(nombre)}</span>
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
            <div class="oferta-marca" id="ofertaMarca" hidden></div>
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
                    <button type="button" class="chip" id="soloOferta" aria-pressed="false" hidden>En oferta</button>
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
    ${scriptBusqueda(nombre, reglasRelevantes(modelos.map((m) => ({ codigo: m.codigo, modelo: m.info.modelo || m.codigo, marca: nombre }))))}
    ${FOOTER_HTML}
</body>
</html>`;
}

// ------------------------------- página de modelo ---------------------------

const scriptPago = (reglas) => `
    <script>
    (function () {
        var MP = ${jsonLd(MP_CHECKOUT)};
        var WOMPI = ${jsonLd(WOMPI_WIDGET)};
        var REDIRECT = ${jsonLd(DOMAIN + "/payment.html")};
        var DESC = ${datosDescuento(reglas)};
        ${PRECIOS_JS}
        var card = document.getElementById('comprar');
        if (!card || !card.getAttribute('data-valor')) return;
        var item = {
            codigo: card.getAttribute('data-codigo'),
            modelo: card.getAttribute('data-modelo'),
            marca: card.getAttribute('data-marca'),
            valor: Number(card.getAttribute('data-valor'))
        };
        var modelo = item.modelo;
        var btn = document.getElementById('btnPagar');
        var mpBox = document.getElementById('mp-button');
        var estado = document.getElementById('compraEstado');
        var radios = card.querySelectorAll('input[name="metodo"]');
        var mostrado = item.valor; // el valor que el cliente está viendo en pantalla

        function el(id) { return document.getElementById(id); }
        function cop(n) { return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') + ' COP'; }
        function fecha(ms) {
            try { return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' }); }
            catch (e) { return ''; }
        }

        // Pinta el precio (con o sin descuento) en el resumen, el encabezado y la barra del celular
        function pintar(r) {
            var hay = !!r.regla;
            mostrado = r.valorFinal;
            el('totalValor').textContent = cop(r.valorFinal);
            el('totalAntes').textContent = cop(r.valor);
            el('totalAntes').hidden = !hay;
            el('resumenDescuento').hidden = !hay;
            el('descVigencia').hidden = !hay;
            el('ofertaModelo').hidden = !hay;
            if (hay) {
                var hasta = fecha(r.regla.hastaMs);
                el('descBadge').textContent = '−' + r.porcentaje + '% · ' + r.regla.nombre;
                el('descAhorro').textContent = 'Ahorras ' + cop(r.valor - r.valorFinal);
                el('descVigencia').textContent = 'Oferta válida hasta el ' + hasta + '.';
                el('ofertaModelo').textContent = '−' + r.porcentaje + '% OFF · ' + r.regla.nombre + ' · hasta el ' + hasta;
            }
            var bt = el('barraTotal');
            if (bt) {
                bt.textContent = cop(r.valorFinal);
                el('barraAntes').textContent = cop(r.valor);
                el('barraAntes').hidden = !hay;
            }
        }
        pintar(precioFinal(item, DESC, new Date()));

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
        // Con la API nueva (api/_precio.js) el servidor decide el precio y este valor se ignora;
        // con la API actual se usa tal cual. Así ambas versiones funcionan.
        function crear(url, titulo) {
            return fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelo: modelo, titulo: titulo, valor: item.valor })
            }).then(function (r) {
                return r.json().then(function (d) {
                    if (!r.ok) {
                        var err = new Error(d.error || 'Error');
                        if (r.status === 404 || r.status === 409) err.mensajeServidor = d.error;
                        throw err;
                    }
                    return d;
                });
            });
        }
        // Si el precio que cobrará el servidor no coincide con el que ve el cliente (por ejemplo,
        // por el reloj del dispositivo), se actualiza la pantalla y se pide confirmar antes de pagar.
        function coincide(d) {
            if (typeof d.valor !== 'number' || d.valor === mostrado) return true;
            pintar({
                valor: d.valorOriginal,
                valorFinal: d.valor,
                porcentaje: d.descuento ? d.descuento.porcentaje : 0,
                regla: d.descuento ? { nombre: d.descuento.nombre, hastaMs: d.descuento.hastaMs } : null
            });
            btn.disabled = false;
            btn.textContent = 'Continuar con el pago';
            mensaje('El precio se actualizó a ' + cop(d.valor) + ' según la fecha de hoy. Revísalo y pulsa de nuevo para continuar.');
            return false;
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
                if (!coincide(d)) return;
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
                if (!coincide(d)) return;
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
            (metodo() === 'wompi' ? pagarWompi() : pagarMP()).catch(function (e) {
                btn.disabled = false;
                btn.textContent = 'Continuar con el pago';
                mensaje(e && e.mensajeServidor ? e.mensajeServidor : 'No pudimos iniciar el pago. Intenta de nuevo o escríbenos por WhatsApp.', true);
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
  const wa = waLink(`Hola DigitalElectronics👋

    Estoy interesado en el siguiente software. 
    *Marca:* ${nombre}
    *Modelo:* ${modelo}
    *Precio:* ${precioTxt}
    *Estado:* ${estadoTxt}

    ¿Podrían brindarme más información?

    Muchas gracias.`);
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
      { "@type": "ListItem", position: 2, name: "Productos", item: `${DOMAIN}${URL_PORTADA}` },
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
            <section class="compra-card" id="comprar" aria-labelledby="compra-titulo" data-modelo="${esc(modelo)}" data-codigo="${esc(codigo)}" data-marca="${esc(nombre)}" data-valor="${valor}">
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
                        <li>Software original ${esc(modelo)}</li>
                        <li>Guía paso a paso para la instalación</li>
                        <li>Soporte técnico personalizado por WhatsApp, llamada o videollamada cuando lo necesites</li>
                    </ul>
                    <div class="resumen-descuento" id="resumenDescuento" hidden>
                        <span class="desc-badge" id="descBadge"></span>
                        <span class="desc-ahorro" id="descAhorro"></span>
                    </div>
                    <div class="resumen-total">
                        <span>Total</span>
                        <div class="total-valores"><s class="total-antes" id="totalAntes" hidden></s><strong id="totalValor">${esc(precioTxt)}</strong></div>
                    </div>
                    <p class="desc-vigencia" id="descVigencia" hidden></p>
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
        <div><span>Total</span><s class="barra-antes" id="barraAntes" hidden></s><strong id="barraTotal">${esc(precioTxt)}</strong></div>
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
                    <a href="/">Inicio</a> &raquo; <a href="${URL_PORTADA}">Productos</a> &raquo;
                    <a href="${urlMarca(slug)}">${esc(nombre)}</a> &raquo; <span>${esc(modelo)}</span>
                </nav>
                <h1>Software original para ${esc(nombre)} ${esc(modelo)}</h1>
                <div class="prod-badges">${badgeEstado(estadoTxt)}${pulg ? `<span class="tag-size">${pulg}″</span>` : ""}</div>
                ${comprable ? '<div class="oferta-modelo" id="ofertaModelo" hidden></div>' : ""}
                <p class="prod-intro">¿Su televisor <strong>${esc(nombre)} ${esc(modelo)}</strong>${pulg ? ` de ${pulg} pulgadas` : ""} se queda en el logo, entra en modo Recovery o se reinicia constantemente? Aquí encuentra el software original para solucionar la falla y, lo mejor, cuenta con nuestro acompañamiento paso a paso durante todo el proceso de instalación.
                  
                  <br/><br/>
                  <a href="https://www.google.com/search?q=3103841388&sca_esv=3c5bece75fa21f2c&sxsrf=APpeQnsktfdmlmSaWyJOWYpdtOUDLpdR3w%3A1789500397703&source=hp&ei=7Zupar26KJCykvQPgOfCiA8&iflsig=ABILxe8AAAAAaqmp_anbbOhdrGVhDplYcIEv2TA6Sg_B&oq=&gs_lp=Egdnd3Mtd2l6IgAqBwgAGOoCGCcyBxAjGOoCGCcyDRAuGMcBGNEDGOoCGCcyBxAjGOoCGCcyChAAGAMYjwEY6gIyChAuGAMYjwEY6gIyChAAGAMYjwEY6gIyChAAGAMYjwEY6gIyChAAGAMYjwEY6gIyChAAGAMYjwEY6gIyChAAGAMYjwEY6gJIzQxQAFgAcAF4AJABAJgBAKABAKoBALgBAcgBAJgCAaACCqgCCpgDCvEFvj6JUVPecb6SBwExoAcAsgcAuAcAwgcDMy0xyAcIgAgB&sclient=gws-wiz&zx=1795726597292#lrd=0x8e30a7186001762d:0xac62c5b4124b596e,1,,,,"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="color:#2878c8; font-weight:600; text-decoration:none;">
                    ⭐ Ver reseñas de nuestros clientes →
                  </a>
                </p>
            </div>

            <aside class="prod-buy">${tarjetaCompra}
            </aside>

            <div class="prod-body">
                <section class="bloque">
                    <h2>Un servicio guiado de principio a fin</h2>
                    <div class="canales">
                        <a class="canal" href="${wa}" target="_blank" rel="noopener">
                            <strong>WhatsApp</strong>
                            <span>Resolvemos sus dudas y le guiamos por chat.</span>
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
                        <li><span class="paso-num">1</span><div><h3>Eliges y pagas</h3><p>Paga con Mercado Pago o con Wompi.</p></div></li>
                        <li><span class="paso-num">2</span><div><h3>Confirmas su pedido</h3><p>Al finalizar el pago, envíe por WhatsApp el modelo y número de serie de su televisor. Así seleccionamos cuidadosamente el software correspondiente a su equipo.</p></div></li>
                        <li><span class="paso-num">3</span><div><h3>Le guiamos en la instalación</h3><p>Por WhatsApp, llamada o videollamada, según lo que necesite.</p></div></li>
                        <li><span class="paso-num">4</span><div><h3>Su televisor vuelve a funcionar</h3><p>Le acompañamos hasta que funcione correctamente.</p></div></li>
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
    ${comprable ? scriptPago(reglasRelevantes([{ codigo, modelo, marca: nombre }])) : ""}
    ${evs.length ? scriptGaleria() : ""}
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
                        <div><strong>${d.total}</strong><span>${d.total === 1 ? "software disponible" : "softwares disponibles"}</span></div>${
          d.desde ? `
            <div><strong>100%</strong><span>Originales</span></div>` : ""
        }
                       

                    </div>`
      : `<p class="mcard__nota">${esc(d.texto || "Consulta la disponibilidad de tu referencia.")}</p>`;

  return `
                <article class="mcard" data-marca="${esc(nombre)}">
                    <span class="mcard__oferta" hidden></span>${media}
                    <div class="mcard__body">
                        <h3><a href="${href}">${esc(nombre)}</a></h3>
                        ${tam}
                        ${stats}
                        <a class="mcard__cta" href="${href}">Entra</a>
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

  // Reglas de descuento vigentes o futuras, con las marcas que cubre cada una (para el aviso de la portada)
  const hubReglas = DESCUENTOS.reglas
    .filter((r) => r && r.activa !== false && motorPrecios.instante(r.hasta, true) >= Date.now())
    .map((r) => {
      const cubiertas = activos
        .filter((g) => g.modelos.some((m) => motorPrecios.reglaAplica(r, { codigo: m.codigo, modelo: m.info.modelo, marca: g.marca.nombre })))
        .map((g) => g.marca.nombre);
      return { ...r, _alcance: { marcas: cubiertas, parcial: (r.modelos || []).length > 0, todas: !(r.modelos || []).length && !(r.marcas || []).length } };
    })
    .filter((r) => r._alcance.marcas.length > 0);

  const reemplazos = {
    DOMAIN,
    DESC_JSON: jsonLd({ redondeo: DESCUENTOS.redondeo, reglas: hubReglas }),
    PRECIOS_JS,
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
  const unicas = [...new Map(entradas.map((e) => [e.url, e])).values()]; // sin URLs repetidas
  const filas = unicas
    .map((e) => `  <url>\n    <loc>${DOMAIN}${e.url}</loc>\n    <lastmod>${hoy()}</lastmod>\n    <priority>${e.prioridad}</priority>\n  </url>`)
    .join("\n");
  fs.writeFileSync(
    path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${filas}\n</urlset>\n`,
    "utf-8"
  );
  // robots.txt es tuyo: solo se crea si no existe
  const robots = path.join(ROOT, "robots.txt");
  if (!fs.existsSync(robots)) {
    fs.writeFileSync(robots, `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`, "utf-8");
  }
  return unicas.length;
}

// ----------------------------------- main -----------------------------------

function main() {
  console.log(PUBLICAR ? "🚀 Modo PUBLICAR (indexable)" : "🛠️  Modo BORRADOR (noindex)");
  const data = JSON.parse(fs.readFileSync(INFO_JSON, "utf-8"));
  DESCUENTOS = cargarDescuentos();
  if (!fs.existsSync(API_PRECIO)) {
    // Seguro: sin la API nueva, el servidor cobraría el precio completo. Por eso NO se muestran descuentos.
    if (DESCUENTOS.reglas.length) {
      console.warn("⚠️  descuentos.json tiene reglas, pero falta api/_precio.js: los descuentos quedan DESACTIVADOS para no mostrar un precio que luego no se cobraría.");
    }
    DESCUENTOS = { redondeo: DESCUENTOS.redondeo, reglas: [] };
  }
  validarDescuentos(DESCUENTOS, MARCAS.map((m) => m.nombre));
  verificarParidadAPI();

  // Modelos "Disponible" sin "valor" numérico: no tienen botón de pago ni pueden recibir descuentos
  const sinValor = Object.entries(data).filter(
    ([, v]) => (v.estado || "").trim().toLowerCase() === "disponible" && !(Number(v.valor) > 0)
  );
  if (sinValor.length) {
    console.warn(`⚠️  ${sinValor.length} modelo(s) disponibles no tienen "valor" numérico en info.json, así que no tendrán botón de compra: ${sinValor.map(([k]) => k).join(", ")}`);
  }
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
    const total = escribirSitemap(sitemap);
    console.log(`✅ sitemap.xml actualizado (${total} URLs)`);
  } else {
    console.log("ℹ️  Modo BORRADOR: páginas con noindex; sitemap.xml y robots.txt sin tocar.");
  }
}

main();
