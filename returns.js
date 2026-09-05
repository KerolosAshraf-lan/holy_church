const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

document.addEventListener('DOMContentLoaded', () => {
    // 1. التحقق من وجود جلسة دخول للأدمن
    const user = localStorage.getItem('currentUser') || localStorage.getItem('church_user');
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }

    renderReturns();
});

// عرض قائمة العُهد المفتوحة والمسترجعة من Google Sheets
async function renderReturns() {
    const tbody = document.getElementById('returnsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 25px;">جاري تحميل بيانات العُهد...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}?target=orders`);
        const orders = await response.json();

        // تصفية الطلبات المقبولة فقط (Approved)
        const approvedOrders = Array.isArray(orders)
            ? orders.filter(o => o.status === 'approved')
            : [];

        if (approvedOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 25px;">لا توجد عُهد خارج المخزن حالياً.</td></tr>`;
            return;
        }

        tbody.innerHTML = approvedOrders.map(order => {
            // تحليل قائمة الأصناف
            let itemsArray = [];
            if (typeof order.items === 'string') {
                try { itemsArray = JSON.parse(order.items); } catch (e) { itemsArray = []; }
            } else if (Array.isArray(order.items)) {
                itemsArray = order.items;
            }

            const itemsList = itemsArray.length > 0
                ? itemsArray.map(i => `${i.name || i.itemName} (${i.qty || i.quantity || 1})`).join(' ، ')
                : '-';

            const isReturned = order.returnStatus === 'returned';

            const statusBadge = isReturned
                ? '<span class="status-tag tag-success">تم الإرجاع بالكامل</span>'
                : '<span class="status-tag tag-warning">عهدة بالخارج</span>';

            const actionBtn = isReturned
                ? '<span style="color:#64748b; font-size:0.85rem;">مسترجعة</span>'
                : `<button class="btn-return-action" onclick="returnOrderItems('${order.id}')">🔄 إرجاع للمخزن</button>`;

            return `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>${order.servantName || '-'} <br><small style="color:#64748b;">${order.activityName || order.service || '-'}</small></td>
                    <td>${itemsList}</td>
                    <td>${order.date || ''}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error fetching returns:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding: 25px;">حدث خطأ أثناء تحميل بيانات العُهد!</td></tr>`;
    }
}

// دالة استلام العُهدة وإعادة الكميات للمخزن عبر API
async function returnOrderItems(orderId) {
    if (!confirm('هل تم التأكد من استلام كامل العهدة وتسليمها للمخزن؟')) return;

    try {
        const payload = {
            action: "returnOrder",
            orderId: orderId
        };

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            alert('✅ تم استلام العهدة وإعادة الأصناف لرصيد المخزن بنجاح!');
            renderReturns();
        } else {
            alert('حدث خطأ: ' + (result.message || 'تعذر معالجة إرجاع العهدة'));
        }
    } catch (err) {
        console.error('Error processing return:', err);
        alert('حدث خطأ أثناء الاتصال بالسيرفر!');
    }
}