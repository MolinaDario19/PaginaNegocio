import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ─── CONFIG ─── */

const firebaseConfig = {
  apiKey: "AIzaSyDQ3R8KVEJTR1jYXHAq12FUn7qRYf5DBHA",
  authDomain: "digitalelectronics-f8c30.firebaseapp.com",
  projectId: "digitalelectronics-f8c30",
  storageBucket: "digitalelectronics-f8c30.firebasestorage.app",
  messagingSenderId: "207846884423",
  appId: "1:207846884423:web:4afcebd4e93a1c50f75d62"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

/* ─── ESTADO ─── */

let currentUser = null;
let selectedRating = 0;
let allReviews = [];

let currentPage = 1;
const perPage = 3;

let activeFilter = 'all';

const STAR_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

const avatarColors = [
  '#0965bb',
  '#2D7A4F',
  '#1A5A8A',
  '#7A4A2A',
  '#5A2A7A'
];

/* ─── AUTH ─── */

onAuthStateChanged(auth, (user) => {

  currentUser = user;

  if (user) {

    showUserBadge(user);
    prefillForm(user);

  } else {

    hideUserBadge();

  }

});

function showUserBadge(user) {

  document.getElementById('authSection').style.display = 'none';
  document.getElementById('formDivider').style.display = 'none';

  const badge =
    document.getElementById('userBadge');

  badge.style.display = 'flex';

  document.getElementById('userName').textContent =
    user.displayName || 'Usuario';

  document.getElementById('userEmail').textContent =
    user.email;

  const avatarEl =
    document.getElementById('userAvatar');

  if (user.photoURL) {

    avatarEl.innerHTML =
      `<img src="${user.photoURL}" alt="" />`;

  }

  else {

    avatarEl.textContent =
      (user.displayName ||
       user.email ||
       '?')[0].toUpperCase();

  }

}

window.logout = async () => {

  try {

    await signOut(auth);

    document.getElementById('fieldName').value = '';
    document.getElementById('fieldEmail').value = '';

    document.getElementById('fieldEmail').readOnly = false;

    document
      .getElementById('fieldEmail')
      .classList.remove('readonly-field');

    showToast('Sesión cerrada');

  }

  catch (e) {

    console.error(e);

    showToast(
      'Error al cerrar sesión',
      'error'
    );

  }

};

window.toggleEmailAuth = () => {

  const panel =
    document.getElementById('emailAuthPanel');

  panel.style.display =
    panel.style.display === 'none'
      ? 'block'
      : 'none';

};

window.loginEmail = async () => {

  const email =
    document.getElementById('authEmail').value;

  const pass =
    document.getElementById('authPassword').value;

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      pass
    );

    showToast('Sesión iniciada');

  }

  catch (e) {

    showToast(
      'Correo o contraseña incorrectos',
      'error'
    );

  }

};

window.registerEmail = async () => {

  const email =
    document.getElementById('authEmail').value;

  const pass =
    document.getElementById('authPassword').value;

  if (pass.length < 6) {

    showToast(
      'Mínimo 6 caracteres',
      'error'
    );

    return;

  }

  try {

    await createUserWithEmailAndPassword(
      auth,
      email,
      pass
    );

    showToast('Cuenta creada');

  }

  catch (e) {

    showToast(
      'Correo ya registrado',
      'error'
    );

  }

};

function hideUserBadge() {

  document.getElementById('authSection').style.display = '';
  document.getElementById('formDivider').style.display = '';
  document.getElementById('userBadge').style.display = 'none';

}

function prefillForm(user) {

  const nameF =
    document.getElementById('fieldName');

  const emailF =
    document.getElementById('fieldEmail');

  if (user.displayName)
    nameF.value = user.displayName;

  if (user.email) {

    emailF.value = user.email;
    emailF.readOnly = true;

  }

}

/* ─── LOGIN ─── */

window.loginGoogle = async () => {

  try {

    const provider =
      new GoogleAuthProvider();

    await signInWithPopup(auth, provider);

  }

  catch {

    showToast('Error Google', 'error');

  }

};

/* ─── ESTRELLAS ─── */

const starBtns =
  document.querySelectorAll('#starInput .star-btn');

starBtns.forEach(btn => {

  btn.addEventListener('click', () => {

    selectedRating = +btn.dataset.v;

    highlight(selectedRating);

    document.getElementById('starLabel')
      .textContent =
      STAR_LABELS[selectedRating];

  });

});

function highlight(n) {

  starBtns.forEach(b =>

    b.classList.toggle(
      'lit',
      +b.dataset.v <= n

    )

  );

}

/* ─── SUBMIT ─── */

window.submitReview = async (e) => {

  e.preventDefault();

  if (!selectedRating) {

    showToast(
      'Selecciona calificación',
      'error'
    );

    return;

  }

  try {

    const name =
      document.getElementById('fieldName').value;

    const email =
      document.getElementById('fieldEmail').value;

    const service =
      document.getElementById('fieldService').value;

    const comment =
      document.getElementById('fieldComment').value;

    const file =
      document.getElementById('fieldImage').files[0];

    let imageURL = null;

    if (file) {

      const storRef =
        ref(storage, `reviews/${Date.now()}_${file.name}`);

      await uploadBytes(storRef, file);

      imageURL =
        await getDownloadURL(storRef);

    }

    await addDoc(collection(db, 'reviews'), {

      name,
      email,
      service,
      comment,
      rating: selectedRating,
      image: imageURL,
      approved: true,
      createdAt: serverTimestamp()

    });

    showToast('¡Reseña recibida! Agradecemos tu confianza y tu tiempo.');

    loadReviews();

  }

  catch (err) {

    console.error(err);

    showToast(
      'Error al enviar',
      'error'
    );

  }

  // 👇 LIMPIAR FORMULARIO
  e.target.reset();
  selectedRating = 0;
  highlight(0);
  document.getElementById('starLabel').textContent = '';

};

/* ─── LOAD REVIEWS ─── */

async function loadReviews() {

  try {

    const q = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc')
    );

    const snap =
      await getDocs(q);

    allReviews = [];

    snap.forEach(doc => {

      const d = doc.data();

      if (d.approved) {

        allReviews.push({

          id: doc.id,
          ...d

        });

      }

    });

    renderSummary(allReviews);

    renderPaged();

  }

  catch (e) {

    console.error(e);

  }

}



/* ─── PAGINAR ─── */

function renderPaged() {

  let filtered =
    activeFilter === 'all'
      ? allReviews
      : activeFilter === '3'
        ? allReviews.filter(r => r.rating <= 3)
        : allReviews.filter(r => r.rating === +activeFilter);

  const start =
    (currentPage - 1) * perPage;

  const end =
    start + perPage;

  const pageReviews =
    filtered.slice(start, end);

  renderCards(pageReviews);

  updatePaginationButtons(filtered.length);

}

/* ─── BOTONES ─── */

window.nextPage = () => {

  const totalPages =
    Math.ceil(allReviews.length / perPage);

  if (currentPage < totalPages) {

    currentPage++;

    renderPaged();

  }

};

window.prevPage = () => {

  if (currentPage > 1) {

    currentPage--;

    renderPaged();

  }

};

function updatePaginationButtons(totalItems) {

  const totalPages =
    Math.ceil(totalItems / perPage);

  document.getElementById("prevBtn").disabled =
    currentPage === 1;

  document.getElementById("nextBtn").disabled =
    currentPage === totalPages;

}

/* ─── FILTRO ─── */

window.setFilter = (f, el) => {

  activeFilter = f;

  currentPage = 1;

  document
    .querySelectorAll('.filter-chip')
    .forEach(c => c.classList.remove('active'));

  el.classList.add('active');

  renderPaged();

};

/* ─── SUMMARY ─── */

function renderSummary(reviews) {
  const total = reviews.length;
  if (!total) return;
  /* ─── CONTAR ESTRELLAS ─── */
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  reviews.forEach(r => {
    const rating = Number(r.rating) || 0;
    if (rating >= 1 && rating <= 5) {
      counts[rating]++;
      sum += rating;
    }
  });

  /* ─── PROMEDIO ─── */
  const avg    = (sum / total).toFixed(1);
  const avgNum = parseFloat(avg);

  document.getElementById('avgDisplay').textContent   = avg;
  document.getElementById('countText').textContent    = `${total} reseñas`;
  document.getElementById('reviewsCount').textContent = `${total} reseñas encontradas`;

  /* ─── BADGE DINÁMICO ─── */
  const badge = document.getElementById('ratingBadge');
  if (badge) {
    if (avgNum >= 4.5)      badge.textContent = 'Excelente ✦';
    else if (avgNum >= 3.5) badge.textContent = 'Muy bueno';
    else if (avgNum >= 2.5) badge.textContent = 'Regular';
    else                    badge.textContent = 'Deficiente';
  }

  /* ─── ESTRELLAS PROMEDIO ─── */
  const rounded = Math.round(avgNum);
  document.getElementById('avgStars').innerHTML = [1, 2, 3, 4, 5]
    .map(i => `
      <svg class="star-icon" viewBox="0 0 16 16"
           fill="${i <= rounded ? '#534AB7' : '#D3D1C7'}">
        <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.13L8 10.4l-3.71 2.15L5 8.42 2 5.5l4.15-.75L8 1z"/>
      </svg>
    `)
    .join('');

  /* ─── BARRAS DINÁMICAS ─── */
  const barList = document.getElementById('barList');
  barList.innerHTML = '';

  for (let i = 5; i >= 1; i--) {
    const percent    = Math.round((counts[i] / total) * 100);
    const colorClass = i >= 4 ? 'high' : i === 3 ? 'mid' : 'low';
    const fillColor  = i >= 4 ? '#001A49' : i === 3 ? '#75719b' : '#cac4a8';

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span>${i}</span>
      <div style="background:#EDE9E3;border-radius:99px;height:5px;overflow:hidden;flex:1;">
        <div style="width:${percent}%;height:100%;background:${fillColor};border-radius:99px;"></div>
      </div>
      <span style="font-size:11px;text-align:right;min-width:34px;">${percent}%</span>
    `;

    barList.appendChild(row);
  }

}
/* ─── ABRIR FORMULARIO ─── */

window.openReviewForm = function() {

  const form =
    document.getElementById("reviewFormCard");

  form.style.display = "block";

  /* Scroll automático */

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

};

/* ─── CERRAR FORMULARIO ─── */

window.closeReviewForm = function() {

  const form =
    document.getElementById("reviewFormCard");

  form.style.display = "none";

};

/* ─── PREVIEW IMAGEN ─── */

window.previewImage = function(event) {

  const file =
    event.target.files[0];

  const preview =
    document.getElementById("previewImg");

  const fileName =
    document.getElementById("fileName");

  if (file) {

    const reader =
      new FileReader();

    reader.onload = function(e) {

      preview.src =
        e.target.result;

      preview.style.display =
        "block";

      fileName.textContent =
        "✔ " + file.name;

    };

    reader.readAsDataURL(file);

  }

};

/* ─── CARDS ─── */

function renderCards(reviews) {

  const grid =
    document.getElementById('cardsGrid');

  if (!reviews.length) {

    grid.innerHTML =
      '<div class="empty-state"><p>No hay reseñas.</p></div>';

    return;

  }

  grid.innerHTML = '';

  reviews.forEach((r, idx) => {

    const card =
      document.createElement('div');

    card.className = 'review-card';

    card.style.animationDelay =
      (idx * 60) + 'ms';

    /* ─── AVATAR ─── */

    const initials =
      (r.name || '?')
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const colorIdx =
      initials.charCodeAt(0) %
      avatarColors.length;

    const avatarContent =
      r.userPhoto
        ? `<img src="${r.userPhoto}" alt="${r.name}" />`
        : initials;

    const avatarStyle =
      r.userPhoto
        ? ''
        : `background:${avatarColors[colorIdx]}`;

    /* ─── ESTRELLAS ─── */

    const starsHTML =
      [1,2,3,4,5]
        .map(i =>
          `<span style="font-size:14px;color:${
            i <= r.rating
              ? '#E8A020'
              : '#D5CFC7'
          }">★</span>`
        )
        .join('');

    /* ─── FECHA ─── */

    const date =
      r.createdAt?.toDate
        ? r.createdAt
            .toDate()
            .toLocaleDateString(
              'es-CO',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }
            )
        : 'Fecha no disponible';

    /* ─── CARD HTML ─── */

    card.innerHTML = `

      <div class="reviewer-row">

        <div class="avatar"
             style="${avatarStyle}">
          ${avatarContent}
        </div>

        <div>

          <div class="reviewer-name">
            ${escHtml(r.name)}
          </div>

          <div class="reviewer-service">
            ${escHtml(r.service)}
          </div>

        </div>

      </div>

      <div class="card-stars">
        ${starsHTML}
      </div>

      <p class="review-text">
        ${escHtml(r.comment)}
      </p>

      ${
        r.image
          ? `<img class="review-img"
                  src="${r.image}"
                  alt="Foto del servicio"
                  onclick="openLightbox('${r.image}')" />`
          : ''
      }

      <div class="review-footer">

        <span class="review-date">
          ${date}
        </span>

        <span class="verified-badge">
          ✓ Verificado
        </span>

      </div>

    `;

    grid.appendChild(card);

  });

}

/* ─── UTILS ─── */

function escHtml(str = '') {

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

}

function showToast(msg) {

  const t =
    document.getElementById('toast');

  t.textContent = msg;

  t.style.display = 'block';

  setTimeout(() => {

    t.style.display = 'none';

  }, 3000);

}


/* ─── INIT ─── */

loadReviews();