import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. КОНФІГУРАЦІЯ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAszWtYpRQn4Hcm_UwAMNdrMXval9LuhVY",
  authDomain: "kablukshop-af610.firebaseapp.com",
  projectId: "kablukshop-af610",
  storageBucket: "kablukshop-af610.firebasestorage.app",
  messagingSenderId: "564911989508",
  appId: "1:564911989508:web:e456850bbf33d92162e651",
  measurementId: "G-JEWT15LHBK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. ДАНІ ДЛЯ TELEGRAM
const TELEGRAM_BOT_TOKEN ='8674529703:AAEl2mwucAFuAjkuwRmm9TWryTyEowNzEk4';
const TELEGRAM_CHAT_ID = '1129192001';

// 3. РОБОТА З КОШИКОМ
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const orderSumDiv = document.getElementById('order-sum');

if (cart.length === 0) {
    alert("Кошик порожній. Поверніться до магазину.");
    window.location.href = "index.html";
} else {
    renderOrderSummary();
}

function renderOrderSummary() {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        orderSumDiv.innerHTML = "<p style='text-align:center;'>Кошик порожній</p>";
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    // Рахуємо загальну суму ПРАВИЛЬНО (ціна * кількість)
    const total = cart.reduce((sum, item) => {
        const itemQty = item.count || 1;
        return sum + (Number(item.price) * itemQty);
    }, 0);

    let itemsHTML = `<h3 style="margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 5px;">ВАШЕ ЗАМОВЛЕННЯ:</h3>`;
    
    cart.forEach((item, index) => {
        const itemQty = item.count || 1;
        itemsHTML += `
            <div class="checkout-item">
                <img src="${item.img}" alt="${item.name}">
                <div class="checkout-item-info">
                    <h4>${item.name}</h4>
                    <p>Розмір: <strong>${item.size}</strong></p>
                    <div class="quantity-controls">
                        <button type="button" class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                        <span class="qty-num">${itemQty}</span>
                        <button type="button" class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                    </div>
                    <p style="color: #000; font-weight: bold; margin-top: 5px;">${item.price * itemQty} грн</p>
                </div>
                <button type="button" class="remove-item-btn" onclick="removeItemFromCheckout(${index})">✕</button>
            </div>
        `;
    });

    itemsHTML += `
        <div class="total-price-block">
            <span style="font-size: 14px; color: #666;">Всього до сплати:</span>
            <div style="font-size: 22px; font-weight: bold; color: #000;">${total} грн</div>
        </div>
    `;

    if (orderSumDiv) orderSumDiv.innerHTML = itemsHTML;
}

// Глобальні функції для кнопок
window.updateQuantity = function(index, delta) {
    if (!cart[index].count) cart[index].count = 1;
    cart[index].count += delta;
    if (cart[index].count < 1) {
        removeItemFromCheckout(index);
    } else {
        localStorage.setItem('cart', JSON.stringify(cart));
        renderOrderSummary();
    }
};

window.removeItemFromCheckout = function(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderOrderSummary();
};

// 4. ОБРОБКА ФОРМИ ТА ЗБЕРЕЖЕННЯ ЗАМОВЛЕННЯ
const checkoutForm = document.getElementById('checkout-form');

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Розрахунок фінальної суми
    const finalTotal = cart.reduce((sum, item) => sum + (Number(item.price) * (item.count || 1)), 0);
    
    const submitBtn = checkoutForm.querySelector('button');
    submitBtn.innerText = "ВІДПРАВЛЯЄМО...";
    submitBtn.disabled = true;

    const orderData = {
        customerName: document.getElementById('cust-name').value,
        customerPhone: document.getElementById('cust-phone').value,
        delivery: document.getElementById('delivery-method').value,
        city: document.getElementById('cust-city').value,
        office: document.getElementById('cust-office').value,
        payment: document.getElementById('payment-method').value,
        contactMe: document.getElementById('need-contact').checked,
        items: cart,
        totalAmount: finalTotal,
        status: "Нове замовлення"
    };

    try {
        // А) Відправляємо в Firebase
        await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: serverTimestamp()
        });

        // Б) Відправляємо в Telegram
        await sendTelegramMessage(orderData);

        // В) ЗБЕРІГАЄМО В ІСТОРІЮ (для сторінки Мої замовлення)
        const userOrders = JSON.parse(localStorage.getItem('userOrders')) || [];
        const historyOrder = {
            id: Math.floor(Math.random() * 90000) + 10000,
            date: new Date().toLocaleDateString('uk-UA'),
            items: cart.map(item => `${item.name} (${item.size})`),
            total: finalTotal,
            status: "В обробці"
        };
        userOrders.push(historyOrder);
        localStorage.setItem('userOrders', JSON.stringify(userOrders));

        // Г) Фінал
        alert("Дякуємо! Ваше замовлення прийнято.");
        localStorage.removeItem('cart');
        window.location.href = "index.html";

    } catch (error) {
        console.error("Помилка:", error);
        alert("Сталася помилка при оформленні.");
        submitBtn.innerText = "ПІДТВЕРДИТИ ЗАМОВЛЕННЯ";
        submitBtn.disabled = false;
    }
});

// 5. ФУНКЦІЯ TELEGRAM
async function sendTelegramMessage(order) {
    const itemsText = order.items.map(item => 
        `▫️ ${item.name}\n   Розмір: ${item.size} | К-сть: ${item.count || 1} | Ціна: ${item.price} грн`
    ).join('\n\n');

    const message = `
🔥 **НОВЕ ЗАМОВЛЕННЯ** 🔥
━━━━━━━━━━━━━━━━━━
👤 **Клієнт:** ${order.customerName}
📞 **Телефон:** ${order.customerPhone}
🚚 **Доставка:** ${order.delivery}
🏙️ **Місто:** ${order.city}
📦 **Відділення:** ${order.office}
💳 **Оплата:** ${order.payment}
💬 **Написати в чат:** ${order.contactMe ? 'ТАК ✅' : 'Ні ❌'}
━━━━━━━━━━━━━━━━━━
🛍️ **ТОВАРИ:**
${itemsText}

💰 **СУМА: ${order.totalAmount} грн**
━━━━━━━━━━━━━━━━━━
`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        console.error("Telegram Error:", err);
    }
}
