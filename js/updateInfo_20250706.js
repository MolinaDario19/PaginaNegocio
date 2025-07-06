let data;

// Cargar el archivo JSON
fetch('/info.json')
  .then(res => {
    if (!res.ok) {
      throw new Error('Error al cargar el archivo JSON');
    }
    return res.json();
  })
  .then(json => {
    data = json;

    const enlaces = document.querySelectorAll('.modelo-link');
    console.log('Enlaces encontrados:', enlaces);

    enlaces.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        const modelo = e.currentTarget.dataset.modelo;
        const info = data[modelo]; // CORRECTO

        if (info) {

          document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
          document.getElementById('modalSoftware').textContent = info.software || '...';
          document.getElementById('modalMain').textContent = info.main || '...';
          document.getElementById('modalEstado').textContent = info.estado || '...';
          document.getElementById('modalPrecio').textContent = info.precio || '...';
          // document.getElementById('modalInstrucciones').textContent = info.instrucciones || 'No disponible';


          const mpButtonContainer = document.getElementById('mp-button');
          mpButtonContainer.innerHTML = ''; // Limpia el contenedor

          if (info.preference_id) {
            const script = document.createElement('script');
            script.src = "https://www.mercadopago.com.co/integrations/v1/web-payment-checkout.js";
            script.setAttribute("data-preference-id", info.preference_id);
            script.setAttribute("data-source", "button");
            mpButtonContainer.appendChild(script);
          } else {
            mpButtonContainer.innerHTML = '<p>Este producto no está disponible para pago en línea.</p>';
          }

          if (info.pdf) {
            console.log("Cargando PDF desde:", info.pdf); // Agrega este log para verificar
            const pdfViewer = document.getElementById('pdfViewer');
            pdfViewer.src = ''; // Limpia primero
            pdfViewer.src = info.pdf; // Asigna el nuevo PDF
            document.getElementById('modalPdfContainer').style.display = 'block';
          } else {
            document.getElementById('pdfViewer').src = '';
            document.getElementById('modalPdfContainer').style.display = 'none';
          }

          document.getElementById('modal').style.display = 'flex';
        } else {
          alert('Información no disponible para este modelo.');
        }
      });
    });

    // Botón para cerrar el modal
    document.getElementById('cerrarModal').onclick = () => {
      document.getElementById('modal').style.display = 'none';
    };
  })
  .catch(error => {
    console.error('Error cargando el archivo JSON:', error);
  });
