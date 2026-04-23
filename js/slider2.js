function initSlider(){

    const slides =
    document.querySelectorAll(".testimony__body");

    const nextBtn =
    document.getElementById("next");

    const prevBtn =
    document.getElementById("before");

    console.log(
        "Slides encontrados:",
        slides.length
    );

    if (slides.length === 0) {
        console.log("No hay slides");
        return;
    }

    let current = 0;

    nextBtn.onclick = () => {

        slides[current]
        .classList.remove(
        "testimony__body--show");

        current++;

        if (current >= slides.length) {
            current = 0;
        }

        slides[current]
        .classList.add(
        "testimony__body--show");

    };

    prevBtn.onclick = () => {

        slides[current]
        .classList.remove(
        "testimony__body--show");

        current--;

        if (current < 0) {
            current = slides.length - 1;
        }

        slides[current]
        .classList.add(
        "testimony__body--show");

    };

};