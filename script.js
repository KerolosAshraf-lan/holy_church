/**
 * التوجيه للصفحة المناسبة بناءً على خيار المستخدم في الصفحة الرئيسية
 * @param {string} role - نوع المستخدم ('servant' أو 'admin')
 */
function navigateTo(role) {
    if (role === 'servant') {
        window.location.href = 'servant-request.html';
    } else if (role === 'admin') {
        window.location.href = 'admin-login.html';
    }
}