const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

let cart = [];
let availableInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    loadInventoryToSelect();

    const form = document.getElementById('servantOrderForm');
    if (form) {
        form.addEventListener('submit', handleOrderSubmit);
    }
});

// تحميل الأصناف المتاحة من Google Sheets
async function loadInventoryToSelect() {
    const itemSelect = document.getElementById('itemSelect');
    if (!itemSelect) return;

    try {
        const response = await fetch(`${API_URL}?target=inventory`);
        const inventory = await response.json();

        availableInventory = Array.isArray(inventory) ? inventory : [];
        itemSelect.innerHTML = '<option value="">-- اختر الصنف --</option>';

        availableInventory.forEach(item => {
            const stockQty = parseInt(item.qty || item.quantity || 0);
            if (stockQty > 0) {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = `${item.name} (المتاح: ${stockQty})`;
                itemSelect.appendChild(opt);
            }
        });
    } catch (err) {
        console.error('Error loading inventory:', err);
    }
}

// إضافة صنف إلى سلة الطلب
function addToCart() {
    const itemSelect = document.getElementById('itemSelect');
    const itemQtyInput = document.getElementById('itemQty');
    const selectedName = itemSelect.value;
    const qty = parseInt(itemQtyInput.value, 10);

    if (!selectedName || isNaN(qty) || qty <= 0) {
        alert('يرجى اختيار صنف وتحديد كمية صحيحة!');
        return;
    }

    const invItem = availableInventory.find(i => i.name === selectedName);
    const availableQty = invItem ? parseInt(invItem.qty || invItem.quantity || 0) : 0;

    const existingIndex = cart.findIndex(i => i.name === selectedName);
    const currentCartQty = existingIndex > -1 ? cart[existingIndex].qty : 0;

    if (currentCartQty + qty > availableQty) {
        alert(`الكمية المطلوبة أكبر من الرصيد المتاح بالمخزن (${availableQty})!`);
        return;
    }

    if (existingIndex > -1) {
        cart[existingIndex].qty += qty;
    } else {
        cart.push({ name: selectedName, qty: qty });
    }

    itemQtyInput.value = '';
    itemSelect.value = '';
    renderCart();
}

// عرض محتويات السلة
function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    if (!tbody) return;

    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">لم يتم إضافة أي أصناف بعد.</td></tr>';
        return;
    }

    tbody.innerHTML = cart.map((item, index) => `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.qty}</td>
            <td><button type="button" class="action-btn delete-btn" onclick="removeFromCart(${index})">🗑️ حذف</button></td>
        </tr>
    `).join('');
}

// إزالة صنف من السلة
function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

// إرسال الطلب إلى Google Apps Script
async function handleOrderSubmit(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert('سلة الطلب فارغة!');
        return;
    }

    const servantName = document.getElementById('servantName').value.trim();
    const activityName = document.getElementById('activityName').value.trim();
    const activityLeader = document.getElementById('activityLeader').value.trim();

    const payload = {
        action: "createOrder",
        servantName: servantName,
        activityName: activityName,
        activityLeader: activityLeader,
        items: cart
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            alert('✅ تم إرسال الطلب بنجاح وهو قيد الانتظار لموافقة أمين المخزن!');
            cart = [];
            document.getElementById('servantOrderForm').reset();
            renderCart();
            loadInventoryToSelect();
        } else {
            alert('حدث خطأ أثناء إرسال الطلب: ' + (result.message || ''));
        }
    } catch (err) {
        console.error('Error submitting order:', err);
        alert('حدث خطأ أثناء الاتصال بالسيرفر!');
    }
}