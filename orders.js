const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

document.addEventListener('DOMContentLoaded', () => {
    // 1. التحقق من وجود جلسة دخول للأدمن
    const user = localStorage.getItem('currentUser') || localStorage.getItem('church_user');
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }

    initOrdersPage();
});

function initOrdersPage() {
    renderOrders();
    // تحديث العداد التنازلي للطلبات التي تم الرد عليها كل ثانية
    setInterval(updateTimers, 1000);
}

// عرض قائمة الطلبات من Google Sheets
async function renderOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;

    ordersContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748b;">جاري تحميل الطلبات من السيرفر...</div>';

    try {
        const response = await fetch(`${API_URL}?target=orders`);
        const orders = await response.json();

        if (!Array.isArray(orders) || orders.length === 0) {
            ordersContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748b;">لا توجد طلبات مقدمة حالياً.</div>';
            return;
        }

        const now = new Date().getTime();
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

        // تصفية وتجهيز الطلبات للعرض
        ordersContainer.innerHTML = orders.map(order => {
            // التحقق مما إذا انتهت مهلة الـ 48 ساعة للطلبات المنتهية
            if (order.status !== 'pending' && order.respondedAt) {
                const respondedTime = parseInt(order.respondedAt);
                if (respondedTime && (now - respondedTime >= FORTY_EIGHT_HOURS)) {
                    return ''; // إخفاء الطلب المقبول/المرفوض المنتهي
                }
            }

            const isPending = order.status === 'pending';
            let statusBadge = '';
            let actionButtons = '';

            if (isPending) {
                statusBadge = `<span class="status-tag tag-warning">قيد الانتظار</span>`;
                actionButtons = `
                    <button class="btn btn-admin" style="background:#10b981; margin-left:8px;" onclick="respondOrder('${order.id}', 'approved')">✅ قبول</button>
                    <button class="btn btn-logout" onclick="respondOrder('${order.id}', 'rejected')">❌ رفض</button>
                `;
            } else {
                const isApproved = order.status === 'approved';
                statusBadge = isApproved
                    ? `<span class="status-tag tag-success">تم القبول</span>`
                    : `<span class="status-tag tag-danger">تم الرفض</span>`;

                actionButtons = `
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <div class="timer-box" data-responded="${order.respondedAt || ''}" style="font-size: 0.85rem; color: #e11d48; background: #ffe4e6; padding: 4px 10px; border-radius: 6px; font-weight: 600;">
                            ⏳ يختفي خلال: --:--:--
                        </div>
                        <button class="btn btn-logout" style="padding:6px 12px; font-size:0.85rem;" onclick="deleteOrder('${order.id}')">🗑️ حذف</button>
                    </div>
                `;
            }

            // تحليل وقراءة الأصناف المطلوبة
            let itemsArray = [];
            if (typeof order.items === 'string') {
                try { itemsArray = JSON.parse(order.items); } catch (e) { itemsArray = []; }
            } else if (Array.isArray(order.items)) {
                itemsArray = order.items;
            }

            const itemsList = itemsArray.length > 0
                ? itemsArray.map(i => `<li>${i.name || i.itemName} × ${i.qty || i.quantity || 1}</li>`).join('')
                : '<li>لا توجد أصناف محددة</li>';

            return `
                <div class="table-card" style="margin-bottom:20px; padding:20px;" id="order-card-${order.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                        <div>
                            <strong style="color: #2563eb;">رقم الطلب: #${order.id}</strong>
                            <span style="font-size:0.8rem; color:#64748b; margin-right:10px;">🕒 ${order.date || ''}</span>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <div style="line-height:1.8; font-size:0.95rem; color:#334155;">
                        <p><strong>اسم الخادم:</strong> ${order.servantName || '-'}</p>
                        <p><strong>الفقرة / الخدمة:</strong> ${order.activityName || order.service || '-'}</p>
                        <p><strong>مسؤول الفقرة:</strong> ${order.activityLeader || order.responsible || '-'}</p>
                    </div>

                    <div style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
                        <strong style="display:block; margin-bottom:5px;">الأصناف المطلوبة:</strong>
                        <ul style="margin:0; padding-right:20px;">${itemsList}</ul>
                    </div>

                    <div style="display:flex; justify-content:flex-end; margin-top:15px;">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');

        updateTimers();
    } catch (err) {
        console.error('Error fetching orders:', err);
        ordersContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: red;">حدث خطأ أثناء تحميل الطلبات!</div>';
    }
}

// الرد على الطلب (قبول أو رفض) عبر Google Apps Script
async function respondOrder(orderId, status) {
    try {
        const payload = {
            action: "respondOrder",
            orderId: orderId,
            status: status
        };

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            alert(status === 'approved' ? '✅ تم قبول الطلب وخصم الكميات!' : '❌ تم رفض الطلب!');
            renderOrders();
        } else {
            alert('حدث خطأ: ' + (result.message || 'تعذر معالجة الطلب'));
        }
    } catch (err) {
        console.error('Error responding to order:', err);
        alert('حدث خطأ أثناء الاتصال بالسيرفر!');
    }
}

// حذف الطلب
async function deleteOrder(orderId) {
    if (!confirm('هل أنت تأكد من حذف هذا الطلب؟')) return;

    try {
        const payload = {
            action: "deleteOrder",
            orderId: orderId
        };

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            renderOrders();
        } else {
            alert('حدث خطأ أثناء حذف الطلب: ' + (result.message || ''));
        }
    } catch (err) {
        console.error('Error deleting order:', err);
        alert('حدث خطأ أثناء الاتصال بالسيرفر!');
    }
}

// تحديث العداد التنازلي للطلبات المقبولة/المرفوضة
function updateTimers() {
    const timerElements = document.querySelectorAll('.timer-box');
    const now = new Date().getTime();
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

    timerElements.forEach(el => {
        const respondedAtAttr = el.getAttribute('data-responded');
        if (!respondedAtAttr) return;

        const respondedAt = parseInt(respondedAtAttr);
        if (isNaN(respondedAt)) return;

        const expiresAt = respondedAt + FORTY_EIGHT_HOURS;
        const diff = expiresAt - now;

        if (diff <= 0) {
            renderOrders();
        } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            el.textContent = `⏳ يختفي خلال: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    });
}