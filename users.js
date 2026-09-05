let localUsersList = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.API_URL) {
        renderUsers();
    } else {
        window.addEventListener('apiReady', renderUsers);
    }

    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleSaveUser);
    }
});

async function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">جاري تحميل المستخدمين...</td></tr>';

    try {
        const response = await fetch(`${window.API_URL}?action=getUsers`);
        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(data.message || 'حدث خطأ أثناء جلب البيانات');
        }

        localUsersList = data.users || data.data || [];

        if (localUsersList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا يوجد مستخدمون حالياً.</td></tr>';
            return;
        }

        tbody.innerHTML = localUsersList.map(user => {
            const isSuper = user.isSuperAdmin === true || String(user.isSuperAdmin).toLowerCase() === 'true';
            const roleBadge = isSuper
                ? '<span class="status-tag tag-warning">Super Admin</span>'
                : '<span class="status-tag tag-success">أمين مخزن</span>';

            return `
                <tr>
                    <td><strong>${escapeHtml(user.name || '')}</strong></td>
                    <td>${escapeHtml(user.username || '')}</td>
                    <td>${roleBadge}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="openEditUserModal('${user.id}')">✏️ تعديل</button>
                        <button class="action-btn delete-btn" onclick="deleteUser('${user.id}')">🗑️ حذف</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error fetching users:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding: 20px;">حدث خطأ أثناء تحميل البيانات.</td></tr>';
    }
}

function openUserModal() {
    document.getElementById('userModalTitle').textContent = 'إضافة مستخدم جديد';
    document.getElementById('editUserId').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('passwordInput').required = true;
    document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

function openEditUserModal(userId) {
    const user = localUsersList.find(u => String(u.id) === String(userId));
    if (!user) return;

    const isSuper = user.isSuperAdmin === true || String(user.isSuperAdmin).toLowerCase() === 'true';

    document.getElementById('userModalTitle').textContent = 'تعديل بيانات المستخدم';
    document.getElementById('editUserId').value = user.id;
    document.getElementById('fullName').value = user.name || '';
    document.getElementById('usernameInput').value = user.username || '';
    document.getElementById('passwordInput').value = user.password || '';
    document.getElementById('passwordInput').required = false;
    document.getElementById('userRole').value = isSuper ? 'super' : 'admin';
    document.getElementById('userModal').classList.remove('hidden');
}

async function handleSaveUser(e) {
    e.preventDefault();

    const id = document.getElementById('editUserId').value;
    const name = document.getElementById('fullName').value.trim();
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const role = document.getElementById('userRole').value;
    const isSuperAdmin = (role === 'super');

    if (!name || !username) {
        alert('يرجى إدخال كافة البيانات المطلوبة.');
        return;
    }

    const payload = {
        action: id ? 'updateUser' : 'addUser',
        id: id || undefined,
        name: name,
        username: username,
        isSuperAdmin: isSuperAdmin
    };

    if (password) {
        payload.password = password;
    } else if (!id) {
        alert('يرجى إدخال كلمة المرور للمستخدم الجديد.');
        return;
    }

    try {
        const response = await fetch(window.API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === 'success') {
            closeUserModal();
            renderUsers();
        } else {
            alert('حدث خطأ أثناء حفظ البيانات: ' + (result.message || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('حدث خطأ في الاتصال بالخادم: ' + error.message);
    }
}

async function deleteUser(id) {
    if (confirm('هل أنت تأكد من حذف هذا الحساب؟')) {
        try {
            const response = await fetch(window.API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'deleteUser',
                    id: id
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                renderUsers();
            } else {
                alert('حدث خطأ أثناء حذف المستخدم: ' + (result.message || 'خطأ غير معروف'));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('حدث خطأ في الاتصال بالخادم: ' + error.message);
        }
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}