// ==========================================================================
// DIGITAL ELECTRONICS - UNIVERSAL FOOTER COMPONENT
// Single source of truth for site-wide footer
// ==========================================================================

const footerTemplate = `
<footer class="footer">
    <section class="footer__container container">
        <div class="footer__brand">
            <h2 class="footer__title">DigitalElectronics</h2>
            <p class="footer__desc">
                Líderes en desarrollo de software, firmware original y soporte técnico integral para Smart TVs de todas las marcas.
            </p>
        </div>

        <div>
            <h3 class="footer__col-title">Navegación</h3>
            <nav class="nav--footer">
                <div class="nav__link--footer"><a href="/index.html">Inicio</a></div>
                <div class="nav__link--footer"><a href="/products.html">Productos</a></div>
                <div class="nav__link--footer"><a href="/SoftwareTv.html">Software TV</a></div>
                <div class="nav__link--footer"><a href="/Soluciones.html">Soluciones</a></div>
                <div class="nav__link--footer"><a href="/Contact.html">Contacto</a></div>
            </nav>
        </div>

        <div>
            <h3 class="footer__col-title">Marcas Principales</h3>
            <nav class="nav--footer">
                <div class="nav__link--footer"><a href="/challenger.html">Challenger</a></div>
                <div class="nav__link--footer"><a href="/kalley.html">Kalley</a></div>
                <div class="nav__link--footer"><a href="/Hyundai.html">Hyundai</a></div>
                <div class="nav__link--footer"><a href="/caixun.html">Caixun</a></div>
                <div class="nav__link--footer"><a href="/tcl.html">TCL</a></div>
            </nav>
        </div>

        <div>
            <h3 class="footer__col-title">Contacto</h3>
            <div class="footer__contact-item">
                <ion-icon name="mail-outline"></ion-icon>
                <span>soporte@digitalelectronics.com.co</span>
            </div>
            <div class="footer__contact-item">
                <ion-icon name="call-outline"></ion-icon>
                <span>+57 310 384 1388</span>
            </div>
            <div class="footer__contact-item">
                <ion-icon name="location-outline"></ion-icon>
                <span>Cali, Colombia &amp; Soporte Remoto</span>
            </div>
        </div>
    </section>

    <section class="footer__copy container">
        <div class="footer__social">
            <a href="https://www.facebook.com/share/14HaRv1WTf/" target="_blank" rel="noopener" class="footer__icons" aria-label="Facebook">
                <img src="/images/facebook.svg" alt="Facebook" class="footer__img">
            </a>
            <a href="https://www.instagram.com/digitalelectronics_cali?igsh=MW9jazA3aHJ4OTQ0cQ==" target="_blank" rel="noopener" class="footer__icons" aria-label="Instagram">
                <img src="/images/instagram.svg" alt="Instagram" class="footer__img">
            </a>
            <a href="https://youtube.com/@digitalelectronics6530?si=Fs1NehZyV_peqU79" target="_blank" rel="noopener" class="footer__icons" aria-label="YouTube">
                <img src="/images/youtube.svg" alt="YouTube" class="footer__img">
            </a>
        </div>
        <div class="footer__copyright" id="copyright"></div>
    </section>
</footer>
`;

// Web Component <site-footer>
class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = footerTemplate;
        // Inyectar año de copyright
        const year = new Date().getFullYear();
        const copyEl = this.querySelector('#copyright');
        if (copyEl) {
            copyEl.textContent = `${year} ©DigitalElectronics. Todos los derechos reservados`;
        }
    }
}

if (!customElements.get('site-footer')) {
    customElements.define('site-footer', SiteFooter);
}

// Inyección automática si existe <div id="footer-placeholder"> o <footer class="footer">
document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) {
        placeholder.innerHTML = footerTemplate;
        const year = new Date().getFullYear();
        const copyEl = placeholder.querySelector('#copyright');
        if (copyEl) {
            copyEl.textContent = `${year} ©DigitalElectronics. Todos los derechos reservados`;
        }
    }
});

export default SiteFooter;
