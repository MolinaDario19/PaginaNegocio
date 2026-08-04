const overlay = document.getElementById('modalPagoOverlay');

  function abrirModalPago(){
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // ------------------------------------------------------------------
  // Catálogo de modelos: se carga UNA vez desde tu JSON real.
  // ------------------------------------------------------------------
  const RUTA_JSON = '/info.json'; 
  let catalogoModelos = null;
  let modeloActual = null;
 

  async function crearPreferencia(info){

    /* const respuesta = await fetch("/api/crear-preferencia",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            modelo: info.modelo,
            valor: info.valor
        })
    }); */

    const respuesta = await fetch("/api/crear-preferencia", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            modelo: info.modelo,
            titulo: `Software original ${info.modelo}`,
            valor: info.valor
        })
    });

    const datos = await respuesta.json();

    if(!datos.preference_id){
        throw new Error("No se creó la preferencia");
    }

    return datos.preference_id;
}



  fetch(RUTA_JSON)
    .then(res => {
      if (!res.ok) throw new Error('Error al cargar el archivo JSON');
      return res.json();
    })
    .then(json => {
      catalogoModelos = json;

      document.querySelectorAll('.modelo-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();

          const codigo = link.dataset.modelo;
          const info = catalogoModelos[codigo];

          if (!info){
            alert('Información no disponible para este modelo.');
            return;
          }

          llenarModalDesdeRegistro(info);
          abrirModalPago();
        });
      });
    })
    .catch(err => console.error('Error cargando el archivo JSON:', err));


    //WhatsApp
    const telefono = "573103841388";

    function actualizarWhatsApp(info) {

        const mensaje = `Hola DigitalElectronics👋

    Estoy interesado en el siguiente software.

    *Modelo:* ${info.modelo}
    *Precio:* ${info.precio}
    *Estado:* ${info.estado}

    ¿Podrían brindarme más información?

    Muchas gracias.`;

        const enlace = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;

        document.getElementById("whatsappBtn").href = enlace;
    }

  function llenarModalDesdeRegistro(info){
    modeloActual = info;

    document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
    document.getElementById('modalSoftware').textContent = info.software || 'No especificado';
    const filaMain = document.getElementById('filaMain');
    const modalMain = document.getElementById('modalMain');

    if (info.main && info.main.trim() !== '') {
        modalMain.textContent = info.main;
        filaMain.style.display = '';
    } else {
        filaMain.style.display = 'none';
    }
    document.getElementById('modalPrecio').textContent = info.precio || '...';

    const estado = info.estado || 'Disponible';
    const estadoEl = document.getElementById('modalEstado');
    estadoEl.textContent = estado;
    estadoEl.classList.toggle('agotado', estado.toLowerCase() === 'agotado');

    // --- Botón de pago real de Mercado Pago (widget por script) ---
    const mpButtonContainer = document.getElementById('mp-button');
    mpButtonContainer.innerHTML = '';

    if (estado.toLowerCase() === 'agotado'){
      mpButtonContainer.innerHTML = '<p class="mp-unavailable">Este producto no está disponible por ahora.</p>';
    } else {
      crearPreferencia(info)
      .then(preferenceId => {

          const script = document.createElement('script');

          script.src =
          "https://www.mercadopago.com.co/integrations/v1/web-payment-checkout.js";

          script.setAttribute(
              "data-preference-id",
              preferenceId
          );

          script.setAttribute(
              "data-source",
              "button"
          );

          mpButtonContainer.appendChild(script);

      })
      .catch(error => {

          console.error(
              "Error Mercado Pago:",
              error
          );

          mpButtonContainer.innerHTML =
          '<p class="mp-unavailable">Error generando pago.</p>';

      });
    }

    // --- Visor de PDF (manual / instrucciones) ---
    const pdfViewer = document.getElementById('pdfViewer');
    if (info.pdf){
      pdfViewer.src = ''; // limpia primero
      pdfViewer.src = info.pdf;
      document.getElementById('modalPdfContainer').style.display = 'block';
    } else {
      pdfViewer.src = '';
      document.getElementById('modalPdfContainer').style.display = 'none';
    }

    actualizarWhatsApp(info);
  }

  function cerrarModalPago() {
  // Quitar el foco del botón de cerrar
  document.activeElement.blur();

  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}


  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarModalPago();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) cerrarModalPago();
  }
)

document
  .getElementById("cerrarModalBtn")
  .addEventListener("click", cerrarModalPago);
  
  ;
