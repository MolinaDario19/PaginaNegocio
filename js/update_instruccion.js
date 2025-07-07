document.addEventListener("DOMContentLoaded", function () {
  const botones = document.querySelectorAll(".procedimiento-btn");
  const secciones = document.querySelectorAll(".detalle");

  botones.forEach(boton => {
    boton.addEventListener("click", () => {
      // Oculta todas las secciones
      secciones.forEach(sec => sec.classList.add("oculto"));

      // Identifica cuál mostrar
      if (boton.classList.contains("proc1")) {
        document.getElementById("proc1-section").classList.remove("oculto");
      } else if (boton.classList.contains("proc2")) {
        document.getElementById("proc2-section").classList.remove("oculto");
      } else if (boton.classList.contains("proc3")) {
        document.getElementById("proc3-section").classList.remove("oculto");
      }
    });
  });
});