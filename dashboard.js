const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    loadPendingOrdersCount();

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleUpdateProfile);
    }
});

function loadUserData() {
    const userJson = localStorage.getItem('church_user') || localStorage.getItem('currentUser');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(userJson);

    const nameElem = document.getElementById('welcomeUserName');
    const roleElem = document.getElementById('roleBadge');
    const usersCard = document.getElementById('usersCard');

    if (nameElem) {
        nameElem.textContent = currentUser.fullName || currentUser.name || currentUser.username || 'الأدمن';
    }

    // فحص مرن لجميع المسميات المحتملة للـ Super Admin
    const isSuper = currentUser.isSuperAdmin === true ||
        currentUser.isSuperAdmin === 'true' ||
        currentUser.is_super_admin === true ||
        currentUser.role === 'super' ||
        currentUser.role === 'super_admin' ||
        currentUser.role === 'مدير النظام';

    if (roleElem) {
        if (isSuper) {
            roleElem.textContent = 'Super Admin';
            roleElem.className = 'status-tag tag-warning';
        } else {
            roleElem.textContent = 'أمين مخزن';
            roleElem.className = 'status-tag tag-success';
        }
    }

    // تأكيد إظهار كارت المستخدمين
    if (usersCard) {
        usersCard.classList.remove('hidden');
        usersCard.style.display = 'flex';
    }
}

async function loadPendingOrdersCount() {
    const badge = document.getElementById('pendingBadge');
    if (!badge) return;

    try {
        const response = await fetch(`${API_URL}?target=requests`);
        const requests = await response.json();

        if (Array.isArray(requests)) {
            const pendingOrders = requests.filter(req => req.status === 'قيد الانتظار' || req.status === 'pending');
            const count = pendingOrders.length;

            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Error fetching pending orders count:', err);
    }
}

function openProfileModal() {
    if (!currentUser) return;
    document.getElementById('profileName').value = currentUser.fullName || currentUser.name || '';
    document.getElementById('profileUsername').value = currentUser.username || '';
    document.getElementById('profilePassword').value = currentUser.password || '';
    document.getElementById('profileModal').classList.remove('hidden');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.add('hidden');
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    if (!currentUser) return;

    const newName = document.getElementById('profileName').value.trim();
    const username = document.getElementById('profileUsername').value.trim();
    const newPassword = document.getElementById('profilePassword').value;

    try {
        const payload = {
            action: "updateUser",
            username: username,
            fullName: newName,
            newPassword: newPassword
        };

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            currentUser.fullName = newName;
            currentUser.name = newName;
            currentUser.password = newPassword;

            localStorage.setItem('church_user', JSON.stringify(currentUser));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            alert('✅ تم تحديث بيانات الحساب بنجاح!');
            closeProfileModal();
            loadUserData();
        } else {
            alert('حدث خطأ أثناء تعديل البيانات: ' + result.message);
        }
    } catch (err) {
        console.error('Profile update error:', err);
        alert('حدث خطأ أثناء الاتصال بالسيرفر!');
    }
}

function logout() {
    localStorage.removeItem('church_user');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}