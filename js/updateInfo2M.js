const overlay = document.getElementById('modalPagoOverlay');

  function abrirModalPago(){
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // Alterna entre los paneles de método de pago (Mercado Pago / Wompi).
  // IMPORTANTE: este bloque debe ir en el nivel principal del script,
  // NO dentro de llenarModalDesdeRegistro() ni de ninguna otra función.
  document.querySelectorAll('.payment-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.payment-tab').forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.payment-panel').forEach((p) => {
        p.classList.remove('is-active');
        p.hidden = true;
      });

      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(tab.dataset.target);
      panel.classList.add('is-active');
      panel.hidden = false;
    });
  });
  // ------------------------------------------------------------------
  // Catálogo de modelos: se carga UNA vez desde tu JSON real.
  // ------------------------------------------------------------------
  const RUTA_JSON = '/info.json'; // ajusta si tu archivo está en otra ruta
  let catalogoModelos = null;
  let modeloActual = null;
  let preferenceIdGlobal = '';

  // Mapa de código interno (preference_id del JSON) -> preference_id real de Mercado Pago
  const preferenceMap = {
    MPHY70: "243767526-e211bc8d-ef7a-4972-b74c-6118f11c5da8",
    MPHY75: "243767526-de42f10f-0932-41c2-bc61-6f5e09090398",
    MPCL70: "243767526-f62c8943-c26c-4140-9ae3-da42e117b17b",
    MPCL75: "243767526-76925841-6945-47f0-afa0-07268cc44fa6",
    MPCL78: "243767526-c6b64379-5ed1-407b-8ca0-28ee7bc75635",
    MPOL75: "243767526-f6dbf13c-0a53-4e32-9048-2e800978264e",
    MPOL70: "243767526-ca0d1eec-9cc1-4d12-a9b1-66c7ca6499b1",
    MPKL78: "243767526-4c3846ad-7147-45a0-a1f5-07b7c1689c68",
    MPKL75: "243767526-d0ae37e3-aca3-42e6-a735-85cd6fe1da50",
    MPKL85: "243767526-451c0835-529a-4407-88c9-e900619c08d3",
    MPCX90: "243767526-b6ab0e33-ba47-4446-b4cc-74356bd41d16"
  };

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

  async function llenarModalDesdeRegistro(info){
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
      const realPreferenceId = preferenceMap[info.preference_id];

      if (realPreferenceId){
        preferenceIdGlobal = realPreferenceId;

        const script = document.createElement('script');
        script.src = "https://www.mercadopago.com.co/integrations/v1/web-payment-checkout.js";
        script.setAttribute("data-preference-id", realPreferenceId);
        script.setAttribute("data-source", "button");
        mpButtonContainer.appendChild(script);
      } else {
        mpButtonContainer.innerHTML = '<p class="mp-unavailable">Este producto no está disponible para pago en línea.</p>';
      }
    }

    // --------------------------------------------------
    // WOMPI
    // --------------------------------------------------

    const wompiButtonContainer = document.getElementById('wompi-button');

    if (wompiButtonContainer) {

        wompiButtonContainer.innerHTML = `
            <button id="btnWompi" type="button" class="wompi-btn">
                Pagar con Wompi
            </button>
        `;

        document.getElementById('btnWompi').onclick = async () => {

            try {

                const respuesta = await fetch('/api/crear-wompi', {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        modelo: info.modelo,
                        titulo: `Software original - ${info.modelo}`,
                        valor: info.valor
                    })
                });

                const datos = await respuesta.json();

                console.log('RESPUESTA WOMPI:', datos);

                if (!respuesta.ok) {
                    throw new Error(
                        datos.error || 'Error creando transacción Wompi'
                    );
                }

                console.log('DATOS QUE RECIBE WOMPI:', {
                  currency: datos.moneda,
                  amountInCents: datos.montoCentavos,
                  reference: datos.referencia,
                  publicKey: datos.publicKey,
                  integrity: datos.firma
              });

                // Abrir Checkout de Wompi
                const checkout = new WidgetCheckout({
                    currency: datos.moneda,
                    amountInCents: datos.montoCentavos,
                    reference: datos.referencia,
                    publicKey: datos.publicKey,

                    signature: {
                        integrity: datos.firma
                    },

                    redirectUrl:
                        'https://digitalelectronics.com.co/payment.html'
                });

                checkout.open(function (result) {

                    console.log('RESULTADO WOMPI:', result);

                });

            } catch (error) {

                console.error('ERROR WOMPI:', error);

                alert('No fue posible iniciar el pago con Wompi.');

            }

        };
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
