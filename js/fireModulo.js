import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

export async function cargarColeccion(coleccion, documentoID, contenedores = {}) {
  try {
    const res = await fetch('/api/firebaseConfig');
    const firebaseConfig = await res.json();
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const docRef = doc(db, coleccion, documentoID);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("Documento no encontrado");
      return;
    }

    const data = docSnap.data();

    // Cargar info.json
    const infoRes = await fetch('/info.json');
    const infoData = await infoRes.json();

    // Crear cuadros en el contenedor
    function crearCuadros(datos, contenedor) {
      contenedor.textContent = '';  // Limpiar el contenedor antes de agregar nuevos elementos
      datos.forEach(item => {
        const a = document.createElement("a");
        a.className = "modelo-link";
        a.href = "#";
        a.dataset.modelo = item;

        const div = document.createElement("div");
        div.className = "cuadro";

        const icon = document.createElement("i");
        icon.className = "fas fa-folder icono-carpeta";

        const texto = document.createElement("span");
        texto.textContent = item;

        div.appendChild(icon);
        div.appendChild(texto);
        a.appendChild(div);
        contenedor.appendChild(a);

        // Añadir el listener al enlace creado
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const modelo = e.currentTarget.dataset.modelo;
          const info = infoData[modelo];

          if (info) {
            document.getElementById('modalTitulo').textContent = `Modelo: ${info.modelo}`;
            document.getElementById('modalSoftware').textContent = info.software || 'No disponible';
            document.getElementById('modalMain').textContent = info.main || 'No disponible';
            document.getElementById('modalEstado').textContent = info.estado || 'No disponible';
            document.getElementById('modalPrecio').textContent = info.precio || 'No disponible';
            document.getElementById('modalInstrucciones').textContent = info.instrucciones || 'No disponible';
          
            // 👉 Mostrar PDF si existe
            if (info.pdf) {
              document.getElementById('pdfViewer').src = info.pdf;
              document.getElementById('modalPdfContainer').style.display = 'block';
            } else {
              document.getElementById('pdfViewer').src = '';
              document.getElementById('modalPdfContainer').style.display = 'none';
            }
          
            document.getElementById('modal').style.display = 'block';
          } else {
            alert('Información no disponible para este modelo.');
          }
        });
      });
    }

    // Asegúrate de que el contenedor existe antes de intentar crear los cuadros
    for (const campo in contenedores) {
      const contenedor = document.getElementById(contenedores[campo]);
      if (contenedor && data[campo]) {
        crearCuadros(data[campo], contenedor);
      }
    }

  } catch (error) {
    console.error("Error general: ", error);
  }
}

