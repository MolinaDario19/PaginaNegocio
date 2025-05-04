import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
  
    fetch('/api/firebaseConfig')
      .then(res => res.json())
      .then(async (firebaseConfig) => {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
  
        try {
          const docRef = doc(db, "KALLEY", "aZ1ovukJZb4Ouyr8xdZi");
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            const data = docSnap.data();
            // document.getElementById("androidTV").textContent = data["ANDROID TV"].join(",");
            // document.getElementById("googleTV").textContent = data["GOOGLE TV"].join(",");

            const androidTV = data["ANDROID TV"];
            const googleTV = data["GOOGLE TV"];

            const androidContainer = document.getElementById("androidTV");
            const googleContainer = document.getElementById("googleTV");

            // Limpiar "Cargando..."
            androidContainer.textContent = '';
            googleContainer.textContent = '';

            // Función para crear y agregar cuadros
            function crearCuadros(datos, contenedor) {
              datos.forEach(item => {
                const div = document.createElement("div");
                div.className = "cuadro";
                div.textContent = item;
                contenedor.appendChild(div);
              });
            }

            crearCuadros(androidTV, androidContainer);
            crearCuadros(googleTV, googleContainer);

          } else {
            console.log("No se encontró el documento");
          }
        } catch (error) {
          console.error("Error al obtener el documento: ", error);
        }
      })
      .catch(error => {
        console.error("Error al cargar la configuración de Firebase:", error);
      });
