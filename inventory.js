const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

document.addEventListener('DOMContentLoaded', () => {
    // 1. التحقق من وجود جلسة دخول للأدمن
    const user = localStorage.getItem('currentUser') || localStorage.getItem('church_user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // 2. ربط نموذج الإضافة/التعديل
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleSaveItem);
    }

    renderInventory();
});

// عرض قائمة الأصناف من Google Sheets
async function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">جاري تحميل البيانات من المخزن...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}?target=items`);
        const inventory = await response.json();

        if (!Array.isArray(inventory) || inventory.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">لا يوجد أصناف في المخزن حالياً.</td></tr>`;
            return;
        }

        tbody.innerHTML = inventory.map(item => {
            const qty = parseInt(item.qty || item.quantity || 0);
            let statusBadge = '<span class="status-tag tag-success">متوفر</span>';

            if (qty === 0) {
                statusBadge = '<span class="status-tag tag-danger">منتهي</span>';
            } else if (qty <= 3) {
                statusBadge = '<span class="status-tag tag-warning">وشك الانتهاء</span>';
            }

            const itemName = item.name || item.itemName || '';
            const itemNotes = item.notes || '-';

            return `
                <tr>
                    <td><strong>${itemName}</strong></td>
                    <td>${qty}</td>
                    <td>${statusBadge}</td>
                    <td>${itemNotes}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="openEditModal('${item.id}', '${itemName}', ${qty}, '${itemNotes}')">✏️ تعديل</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error fetching inventory:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding: 20px;">حدث خطأ أثناء تحميل البيانات!</td></tr>`;
    }
}

// فتح نافذة الإضافة
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'إضافة صنف جديد';
    document.getElementById('editItemId').value = '';
    document.getElementById('itemForm').reset();
    document.getElementById('itemModal').classList.remove('hidden');
}

// فتح نافذة التعديل
function openEditModal(id, name, qty, notes) {
    document.getElementById('modalTitle').textContent = 'تعديل الصنف';
    document.getElementById('editItemId').value = id;
    document.getElementById('itemName').value = name;
    document.getElementById('itemQty').value = qty;
    document.getElementById('itemNotes').value = notes === '-' ? '' : notes;
    document.getElementById('itemModal').classList.remove('hidden');
}

// إغلاق النافذة المنبثقة
function closeModal() {
    document.getElementById('itemModal').classList.add('hidden');
}

// حفظ الصنف (جديد)
async function handleSaveItem(e) {
    e.preventDefault();

    const name = document.getElementById('itemName').value.trim();
    const qty = parseInt(document.getElementById('itemQty').value);
    const notes = document.getElementById('itemNotes').value.trim();

    try {
        const payload = {
            action: "addItem",
            itemName: name,
            quantity: qty,
            notes: notes
        };

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            alert('✅ تم حفظ الصنف بنجاح!');
            closeModal();
            renderInventory();
        } else {
            alert('حدث خطأ أثناء الحفظ: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving item:', err);
        alert('حدث خطأ أثناء الاتصال بالسيرفر!');
    }
}