import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

let app;
try {
    app = getApp();
} catch (e) {
    const firebaseConfig = {
  apiKey: "AIzaSyAszWtYpRQn4Hcm_UwAMNdrMXval9LuhVY",
  authDomain: "kablukshop-af610.firebaseapp.com",
  projectId: "kablukshop-af610",
  storageBucket: "kablukshop-af610.firebasestorage.app",
  messagingSenderId: "564911989508",
  appId: "1:564911989508:web:e456850bbf33d92162e651",
  measurementId: "G-JEWT15LHBK"
};
    app = initializeApp(firebaseConfig);
}
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
let currentProduct = null;
let currentImages = [];
let currentIndex = 0;

const mainImg = document.getElementById("main-product-img");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

async function loadProductDetails() {
    if (!productId) return;
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProduct = { id: docSnap.id, ...docSnap.data() };
            currentImages = currentProduct.images || [currentProduct.img];
            renderProduct();
            attachProductEvents();
            setupHoverEffect();
        }
    } catch (e) {
        console.error(e);
    }
}

function setupHoverEffect() {
    const containers = [
        document.querySelector('.main-img-holder'),
        document.getElementById('lightbox')
    ];

    containers.forEach(container => {
        if (!container) return;
        const arrows = container.querySelectorAll('.nav-arrow');
        
        if (currentImages.length > 1) {
            arrows.forEach(a => {
                a.style.opacity = "0";
                a.style.transition = "opacity 0.3s ease";
                a.style.display = "block";
            });

            container.onmouseenter = () => arrows.forEach(a => a.style.opacity = "1");
            container.onmouseleave = () => arrows.forEach(a => a.style.opacity = "0");
            container.onclick = () => arrows.forEach(a => a.style.opacity = "1");
        } else {
            arrows.forEach(a => a.style.display = "none");
        }
    });
}

function updateImageDisplay() {
    const url = currentImages[currentIndex];
    if (mainImg) mainImg.src = url;
    if (lightboxImg) lightboxImg.src = url;
    
    document.querySelectorAll('.thumb-img').forEach((thumb, idx) => {
        thumb.classList.toggle('active', idx === currentIndex);
    });
}

window.changeImageStep = function(step) {
    if (currentImages.length <= 1) return;
    currentIndex += step;
    if (currentIndex >= currentImages.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = currentImages.length - 1;
    updateImageDisplay();
};

function renderProduct() {
    const p = currentProduct;
    const fields = {
        'p-name': p.name,
        'p-price': `${p.price} грн`,
        'p-desc': p.description || "",
        'p-gender': p.gender || "-",
        'p-category': p.category || "-"
    };

    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) el.innerText = fields[id];
    }

    const thumbContainer = document.getElementById("product-images-thumbnails");
    if (thumbContainer) {
        thumbContainer.innerHTML = "";
        if (currentImages.length > 1) {
            currentImages.forEach((url, idx) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = `thumb-img ${idx === currentIndex ? 'active' : ''}`;
                img.onclick = (e) => {
                    e.stopPropagation();
                    currentIndex = idx;
                    updateImageDisplay();
                };
                thumbContainer.appendChild(img);
            });
        }
    }

    updateImageDisplay();

    const sizeSelect = document.getElementById('size-selector-main');
    if (sizeSelect) {
        sizeSelect.innerHTML = '<option value="">ОБЕРІТЬ РОЗМІР</option>';
        (p.sizes || []).forEach(s => {
            sizeSelect.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
    updateFavIcon();
}

function attachProductEvents() {
    if (mainImg) {
        mainImg.onclick = () => {
            if (lightbox) {
                lightbox.style.display = "flex";
                document.body.style.overflow = "hidden";
                const lboxArrows = lightbox.querySelectorAll('.nav-arrow');
                if (currentImages.length > 1) {
                    lboxArrows.forEach(a => a.style.opacity = "1");
                }
            }
        };
    }

    const closeLbox = document.getElementById("close-lightbox");
    if (closeLbox) {
        closeLbox.onclick = (e) => {
            e.stopPropagation();
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        };
    }

    const addBtn = document.getElementById('add-to-cart-main');
    if (addBtn) {
        addBtn.onclick = () => {
            const size = document.getElementById('size-selector-main').value;
            if (!size) {
                alert("Будь ласка, оберіть розмір!");
                return;
            }

            if (typeof window.addToCartWithValidation === 'function') {
                const tempSelect = document.getElementById('size-selector-main');
                const originalId = tempSelect.id;
                tempSelect.id = `size-${currentProduct.id}`; 
                window.addToCartWithValidation(currentProduct.id, currentProduct.name, currentProduct.price, currentProduct.img);
                tempSelect.id = originalId;
            }
        };
    }

    const favBtn = document.getElementById('fav-btn-main');
    if (favBtn) {
        favBtn.onclick = () => {
            if (typeof window.toggleFavorite === 'function') {
                window.toggleFavorite(currentProduct.id, currentProduct.name, currentProduct.img, currentProduct.price);
                updateFavIcon();
            }
        };
    }
}

function updateFavIcon() {
    const favs = JSON.parse(localStorage.getItem('favorites')) || [];
    const isFav = favs.some(f => f.id === productId);
    const icon = document.getElementById('fav-icon-main');
    if (icon) {
        icon.src = isFav ? 'heart-filled.png' : 'heart-empty.png';
    }
}

loadProductDetails();