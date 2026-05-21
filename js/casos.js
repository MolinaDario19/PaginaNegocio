import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
  import { getFirestore, collection, addDoc, getDocs, orderBy, query, serverTimestamp, deleteDoc, doc }
    from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
    from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDQ3R8KVEJTR1jYXHAq12FUn7qRYf5DBHA",
    authDomain: "digitalelectronics-f8c30.firebaseapp.com",
    projectId: "digitalelectronics-f8c30",
    storageBucket: "digitalelectronics-f8c30.firebasestorage.app",
    messagingSenderId: "207846884423",
    appId: "1:207846884423:web:4afcebd4e93a1c50f75d62",
    measurementId: "G-QF1RZHRXDT"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  // ════ CORREO AUTORIZADO ════
  const ADMIN_EMAIL = "digitalelectronicscalic@gmail.com";

  // ════ STATE ════
  let allCases = [];
  let currentFilter = 'all';
  let isAdmin = false;
  let currentUser = null;

  // ════ DOM REFS ════
  const casesGrid = document.getElementById('casesGrid');
  const adminPanel = document.getElementById('adminPanel');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const caseCount = document.getElementById('caseCount');
  const notification = document.getElementById('notification');

  // ════ UTILS ════
  function showNotification(msg, type = 'success') {
    notification.textContent = msg;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 3500);
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getBrandColor(brand) {
    const colors = {
      'kalley': '#00d4ff', 'challenger': '#ff6b35', 'hyundai': '#0066b2',
      'caixun': '#00e676', 'exclusiv': '#9c27b0', 'sankey': '#ff9800',
      'olimpo': '#f44336', 'jvc': '#e91e63', 'rca': '#ffd600', 'otro': '#78909c'
    };
    return colors[brand?.toLowerCase()] || '#00d4ff';
  }

  // ════ LOAD CASES ════
  async function loadCases() {
    loadingState.style.display = 'flex';
    casesGrid.innerHTML = '';
    try {
      const q = query(collection(db, 'successful'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      allCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCases();
    } catch (e) {
      console.error(e);
      showNotification('Error al cargar los casos. Verifica la configuración de Firebase.', 'error');
    } finally {
      loadingState.style.display = 'none';
    }
  }

  function renderCases() {
    const filtered = currentFilter === 'all'
      ? allCases
      : allCases.filter(c => c.brand?.toLowerCase() === currentFilter);

    caseCount.textContent = `${filtered.length} caso${filtered.length !== 1 ? 's' : ''}`;
    casesGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }
    emptyState.style.display = 'none';

    filtered.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'case-card';
      card.style.animationDelay = `${i * 0.07}s`;
      const color = getBrandColor(c.brand);
      card.innerHTML = `
        <div class="card-accent" style="background:${color}"></div>
        <div class="card-header">
          <span class="brand-badge" style="border-color:${color};color:${color}">${c.brand || 'Sin marca'}</span>
          <span class="case-date">${formatDate(c.createdAt)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(c.title)}</h3>
        <p class="card-model"> ${escapeHtml(c.model || 'Modelo no especificado')}</p>
        <p class="card-desc">${escapeHtml(c.description)}</p>
        ${c.images?.length ? `
        <div class="card-images">
          ${c.images.slice(0, 4).map((img, idx) => `
            <div class="thumb-wrap" onclick="openLightbox('${c.id}', ${idx})">
              <img src="${img}" alt="Captura ${idx+1}" loading="lazy">
              ${idx === 3 && c.images.length > 4 ? `<div class="thumb-more">+${c.images.length - 4}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}
        <div class="card-footer">
          <span class="status-badge">✓ Resuelto</span>
          ${isAdmin ? `<button class="btn-delete" onclick="deleteCase('${c.id}', this)">🗑 Eliminar</button>` : ''}
        </div>
      `;
      casesGrid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ════ LIGHTBOX ════
  window.openLightbox = function(caseId, imgIdx) {
    const c = allCases.find(x => x.id === caseId);
    if (!c?.images) return;
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lbImg');
    const lbCounter = document.getElementById('lbCounter');
    let current = imgIdx;

    function show(i) {
      current = (i + c.images.length) % c.images.length;
      lbImg.src = c.images[current];
      lbCounter.textContent = `${current + 1} / ${c.images.length}`;
    }

    document.getElementById('lbPrev').onclick = () => show(current - 1);
    document.getElementById('lbNext').onclick = () => show(current + 1);
    document.getElementById('lbClose').onclick = () => lb.classList.remove('open');
    lb.onclick = (e) => { if (e.target === lb) lb.classList.remove('open'); };

    show(current);
    lb.classList.add('open');
  };

  // ════ FILTERS ════
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCases();
    });
  });

  // ════ FIREBASE AUTH STATE ════
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user && user.email === ADMIN_EMAIL) {
      isAdmin = true;
      document.getElementById('loginSection').style.display = 'none';
      adminPanel.style.display = 'block';
      document.getElementById('adminUserName').textContent = user.displayName || user.email;
      renderCases();
    } else {
      isAdmin = false;
      adminPanel.style.display = 'none';
      document.getElementById('loginSection').style.display = 'block';
      renderCases();
    }
  });

  // ════ GOOGLE LOGIN ════
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Conectando...';
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        showNotification('Correo no autorizado', 'error');
      } else {
        showNotification('✓ Sesión iniciada correctamente');
      }
    } catch (err) {
      showNotification('Error al iniciar sesión: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión con Google';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    showNotification('Sesión cerrada');
  });

  // ════ IMAGE PREVIEW ════
  const imageInput = document.getElementById('imageInput');
  const previewGrid = document.getElementById('previewGrid');
  let selectedFiles = [];

  async function refreshPreviews() {
    previewGrid.innerHTML = '';
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      // Muestra preview con marca de agua aplicada
      const watermarked = await applyWatermark(f);
      const reader = new FileReader();
      reader.onload = e => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="preview con marca de agua">
          <button onclick="removeFile(${i})">✕</button>
          <span class="wm-badge">🔒 WM</span>
        `;
        previewGrid.appendChild(div);
      };
      reader.readAsDataURL(watermarked);
    }
  }

  imageInput.addEventListener('change', () => {
    selectedFiles = Array.from(imageInput.files);
    refreshPreviews();
  });

  window.removeFile = function(idx) {
    selectedFiles.splice(idx, 1);
    refreshPreviews();
  };

  // Drag & drop
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    selectedFiles = [...selectedFiles, ...Array.from(e.dataTransfer.files)];
    refreshPreviews();
  });


  // ════ MARCA DE AGUA ════
  async function applyWatermark(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width  = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          
          // Dibuja la imagen original
          ctx.drawImage(img, 0, 0);

          // ── Configuración de la marca de agua ──
          const padding   = img.width * 0.02;
          const maxW      = img.width * 0.38;
          const fontSize = Math.max(img.width * 0.08, 14);

          // Fondo semitransparente
          const line1 = 'DigitalElectronics';
          const line2 = '+57 310 384 1388';
          ctx.font = `bold ${fontSize}px Cinzel, monospace`;
          const w1 = ctx.measureText(line1).width;
          ctx.font = `${fontSize * 0.72}px Rajdhani, sans-serif`;
          const w2 = ctx.measureText(line2).width;
          const boxW  = Math.max(w1, w2) + padding * 2;
          const boxH  = fontSize * 2.6 + padding * 2;
          const boxX = (img.width  - boxW) / 2;
          const boxY = (img.height - boxH) / 2;

          // Fondo con blur visual
          ctx.fillStyle = 'rgba(5, 10, 15, 0.02)';

          const r = fontSize * 0.4;
          ctx.beginPath();
          ctx.moveTo(boxX + r, boxY);
          ctx.lineTo(boxX + boxW - r, boxY);
          ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
          ctx.lineTo(boxX + boxW, boxY + boxH - r);
          ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
          ctx.lineTo(boxX + r, boxY + boxH);
          ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
          ctx.lineTo(boxX, boxY + r);
          ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
          ctx.closePath();
          ctx.fill();

          // Borde acento cyan
          //ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
          ctx.strokeStyle = 'rgba(79, 129, 189, 255)';
          
          ctx.lineWidth = Math.max(1, img.width * 0.0015);
          ctx.stroke();

          // Línea decorativa top del box
          //ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
          ctx.fillStyle = 'rgba(79, 129, 189, 255)';
          ctx.fillRect(boxX + r, boxY, boxW - r * 2, Math.max(2, img.width * 0.003));

          // Texto línea 1 — nombre
          ctx.font      = `bold ${fontSize}px Orbitron, monospace`;
          //ctx.fillStyle = '#00d4ff';
          ctx.fillStyle = '#1CE305';
          ctx.shadowColor   = 'rgba(0, 212, 255, 0.6)';
          ctx.shadowBlur    = fontSize * 0.4;
          ctx.fillText(line1, boxX + padding, boxY + padding + fontSize);

          // Texto línea 2 — web
          ctx.font      = `${fontSize * 0.72}px Rajdhani, sans-serif`;
          ctx.fillStyle = 'rgba(224, 234, 245, 0.85)';
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur  = 0;
          ctx.fillText(line2, boxX + padding, boxY + padding + fontSize * 2.15);

          // Convierte a Blob y devuelve como File
          canvas.toBlob((blob) => {
            const watermarked = new File([blob], file.name, { type: 'image/jpeg' });
            resolve(watermarked);
          }, 'image/jpeg', 0.92);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ════ SUBMIT CASE ════
  document.getElementById('caseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const progress = document.getElementById('uploadProgress');
    btn.disabled = true;
    btn.textContent = 'Subiendo...';
    progress.style.display = 'block';

    try {
      // Upload images con marca de agua
      const imageUrls = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i];
        const pct = Math.round((i / selectedFiles.length) * 80);
        document.getElementById('progressBar').style.width = pct + '%';
        document.getElementById('progressText').textContent = `Aplicando marca de agua ${i+1}/${selectedFiles.length}...`;

        // Aplica marca de agua antes de subir
        const watermarked = await applyWatermark(f);

        document.getElementById('progressText').textContent = `Subiendo imagen ${i+1} de ${selectedFiles.length}...`;
        const storageRef = ref(storage, `casos/${Date.now()}_${watermarked.name}`);
        await uploadBytes(storageRef, watermarked);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      document.getElementById('progressBar').style.width = '90%';
      document.getElementById('progressText').textContent = 'Guardando caso...';

      // Save to Firestore
      await addDoc(collection(db, 'successful'), {
        title: document.getElementById('caseTitle').value.trim(),
        brand: document.getElementById('caseBrand').value,
        model: document.getElementById('caseModel').value.trim(),
        description: document.getElementById('caseDesc').value.trim(),
        solution: document.getElementById('caseSolution').value.trim(),
        images: imageUrls,
        createdAt: serverTimestamp()
      });

      document.getElementById('progressBar').style.width = '100%';
      document.getElementById('progressText').textContent = '¡Guardado!';

      setTimeout(() => {
        document.getElementById('caseForm').reset();
        selectedFiles = [];
        previewGrid.innerHTML = '';
        progress.style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
        btn.disabled = false;
        btn.textContent = '✓ Publicar Caso';
        showNotification('✓ Caso publicado exitosamente');
        loadCases();
      }, 800);

    } catch (err) {
      console.error(err);
      showNotification('Error al publicar: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '✓ Publicar Caso';
      progress.style.display = 'none';
    }
  });

  // ════ DELETE CASE ════
  window.deleteCase = async function(id, btn) {
    if (!confirm('¿Eliminar este caso permanentemente?')) return;
    try {
      const c = allCases.find(x => x.id === id);
      if (c?.images) {
        for (const url of c.images) {
          try {
            const r = ref(storage, url);
            await deleteObject(r);
          } catch (_) {}
        }
      }
      await deleteDoc(doc(db, 'successful', id));
      showNotification('Caso eliminado');
      loadCases();
    } catch (err) {
      showNotification('Error al eliminar: ' + err.message, 'error');
    }
  };

  // ════ SEARCH ════
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.case-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // ════ INIT ════
  loadCases();
