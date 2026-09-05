const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('currentUser')) {
        window.location.href = 'admin-login.html';
        return;
    }

    const damagedForm = document.getElementById('damagedForm');
    if (damagedForm) {
        damagedForm.addEventListener('submit', handleDamagedSubmit);
    }

    renderDamagedItems();
});

// 1. عرض جدول التالف والصيانة من Google Sheets
async function renderDamagedItems() {
    const tbody = document.getElementById('damagedTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 25px;">جاري تحميل البيانات...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}?target=damaged`);
        const damagedList = await response.json();

        tbody.innerHTML = '';

        if (!Array.isArray(damagedList) || damagedList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 25px;">لا توجد أصناف مسجلة كـ تالف حتى الآن.</td></tr>`;
            return;
        }

        damagedList.forEach(item => {
            const tr = document.createElement('tr');

            const statusTag = item.status === 'under_repair' || item.status === 'تحت الصيانة'
                ? '<span class="status-tag tag-warning">تحت الصيانة 🛠️</span>'
                : '<span class="status-tag tag-danger">تخريد نهائي ❌</span>';

            tr.innerHTML = `
                <td><strong>${item.name || item.itemName}</strong></td>
                <td>${item.qty || item.quantity}</td>
                <td>${item.reason || ''}</td>
                <td>${statusTag}</td>
                <td>${item.date || ''}</td>
                <td>
                    <button class="btn-return-action" style="margin-left: 5px;" onclick="returnDamagedToInventory('${item.id}', '${item.name || item.itemName}', ${item.qty || item.quantity})">🔄 إرجاع للمخزن</button>
                    <button class="action-btn delete-btn" onclick="deleteDamagedRecord('${item.id}')">🗑️ حذف</button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching damaged items:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding: 25px;">حدث خطأ أثناء تحميل البيانات!</td></tr>`;
    }
}

// 2. فتح نافذة إضافة تالف وجلب الأصناف المتاحة من المخزن
async function openDamagedModal() {
    const select = document.getElementById('damagedItemSelect');
    select.innerHTML = '<option value="">-- جاري التحميل... --</option>';

    try {
        const response = await fetch(`${API_URL}?target=items`);
        const inventory = await response.json();

        select.innerHTML = '<option value="">-- اختر الصنف --</option>';

        if (Array.isArray(inventory)) {
            inventory.filter(item => parseInt(item.quantity) > 0).forEach(item => {
                select.innerHTML += `<option value="${item.id}" data-name="${item.itemName}" data-qty="${item.quantity}">${item.itemName} (المتاح: ${item.quantity})</option>`;
            });
        }

        document.getElementById('damagedForm').reset();
        document.getElementById('damagedModal').classList.remove('hidden');
    } catch (err) {
        console.error('Error fetching inventory:', err);
        alert('حدث خطأ أثناء جلب الأصناف من المخزن!');
    }
}

// 3. إغلاق النافذة
function closeDamagedModal() {
    document.getElementById('damagedModal').classList.add('hidden');
}

// 4. حفظ التالف وخصمه من المخزن
async function handleDamagedSubmit(e) {
    e.preventDefault();

    const select = document.getElementById('damagedItemSelect');
    const selectedOption = select.options[select.selectedIndex];

    const itemId = select.value;
    const itemName = selectedOption.getAttribute('data-name');
    const availableQty = parseInt(selectedOption.getAttribute('data-qty'));
    const qty = parseInt(document.getElementById('damagedQty').value);
    const reason = document.getElementById('damagedReason').value.trim();
    const status = document.getElementById('damagedStatus').value;

    if (!itemId) {
        alert('يرجى اختيار صنف من القائمة!');
        return;
    }

    if (qty > availableQty) {
        alert('⚠️ الكمية المدخلة أكبر من المتاح حالياً بالمخزن!');
        return;
    }

    try {
        const payload = {
            action: "addDamaged",
            itemId: itemId,
            itemName: itemName,
            qty: qty,
            reason: reason,
            status: status
        };

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            closeDamagedModal();
            renderDamagedItems();
            alert('✅ تم تسجيل التالف وخصم الكمية من المخزن بنجاح!');
        } else {
            alert('حدث خطأ: ' + result.message);
        }
    } catch (err) {
        console.error('Error recording damaged item:', err);
        alert('حدث خطأ أثناء تسجيل التالف بالسيرفر!');
    }
}

// 5. حذف سجل التالف نهائياً
async function deleteDamagedRecord(id) {
    if (confirm('هل أنت تأكد من حذف هذا السجل نهائياً؟ (لن يتم إرجاع الكمية للمخزن)')) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "deleteDamaged", id: id })
            });
            const result = await response.json();

            if (result.status === "success") {
                renderDamagedItems();
            } else {
                alert('حدث خطأ أثناء الحذف');
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            alert('حدث خطأ أثناء حذف السجل!');
        }
    }
}

// 6. إرجاع الصنف التالف للمخزن
async function returnDamagedToInventory(damagedId, itemName, qty) {
    if (confirm('هل تم إصلاح الصنف وتريد إعادتهم لرصيد المخزن المتاح؟')) {
        try {
            const payload = {
                action: "returnDamaged",
                damagedId: damagedId,
                itemName: itemName,
                qty: qty
            };

            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === "success") {
                renderDamagedItems();
                alert('✅ تم إرجاع الصنف بنجاح لرصيد المخزن وحذف السجل!');
            } else {
                alert('حدث خطأ: ' + result.message);
            }
        } catch (err) {
            console.error('Error returning item to inventory:', err);
            alert('حدث خطأ أثناء إعادة الصنف للمخزن!');
        }
    }
}