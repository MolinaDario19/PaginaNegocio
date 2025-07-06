let data;
let preferenceIdGlobal = ""; // Asegúrate de declarar esto aquí

const preferenceMap = {
  MPHY70: "243767526-e211bc8d-ef7a-4972-b74c-6118f11c5da8",
  MPHY75: "243767526-de42f10f-0932-41c2-bc61-6f5e09090398",
  MPCL70: "243767526-f62c8943-c26c-4140-9ae3-da42e117b17b",
  MPCL75: "243767526-76925841-6945-47f0-afa0-07268cc44fa6",
  MPOL75: "243767526-f6dbf13c-0a53-4e32-9048-2e800978264e",
  MPOL70: "243767526-ca0d1eec-9cc1-4d12-a9b1-66c7ca6499b1",
  MPKL78: "243767526-4c3846ad-7147-45a0-a1f5-07b7c1689c68",
  MPKL75: "243767526-d0ae37e3-aca3-42e6-a735-85cd6fe1da50",
  MPKL85: "243767526-451c0835-529a-4407-88c9-e900619c08d3"
};

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

          // Obtener el valor real desde el mapa
          const realPreferenceId = preferenceMap[info.preference_id];

          if (realPreferenceId) {
            preferenceIdGlobal = realPreferenceId;

            const script = document.createElement('script');
            script.src = "https://www.mercadopago.com.co/integrations/v1/web-payment-checkout.js";
            script.setAttribute("data-preference-id", realPreferenceId);
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
