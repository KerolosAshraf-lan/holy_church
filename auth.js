// رابط الـ Backend الخاص بـ Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

document.addEventListener('DOMContentLoaded', () => {
    // 1. ربط النموذج عند الضغط على Enter أو زر Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', executeLogin);
    }

    // 2. ربط الزر مباشرة في حال عدم وجود Form
    const loginBtn = document.getElementById('loginBtn') ||
        document.querySelector('button[type="submit"]') ||
        document.querySelector('.btn-primary') ||
        document.querySelector('.btn');

    if (loginBtn && !loginForm) {
        loginBtn.addEventListener('click', executeLogin);
    }
});

async function executeLogin(e) {
    if (e) e.preventDefault();

    // جلب حقول الإدخال وعنصر الخطأ
    const usernameInput = document.getElementById('username') || document.getElementById('userInput') || document.querySelector('input[type="text"]');
    const passwordInput = document.getElementById('password') || document.getElementById('passInput') || document.querySelector('input[type="password"]');
    const errorMessage = document.getElementById('errorMessage');

    if (!usernameInput || !passwordInput) {
        alert('لم يتم العثور على حقول إدخال اسم المستخدم وكلمة المرور!');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.classList.remove('hidden');
        }
        return;
    }

    try {
        // تغيير نص الزر أثناء تسجيل الدخول
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.textContent = '⏳ جاري التحقق...';

        // طلب جلب قاعدة بيانات المستخدمين من Google Sheets
        const response = await fetch(`${API_URL}?target=users`);
        const users = await response.json();

        // البحث عن المستخدم بـ username و password
        const foundUser = Array.isArray(users) ? users.find(u => u.username === username && u.password === password) : null;

        if (foundUser) {
            // حفظ بيانات المستخدم في LocalStorage لتستخدمها بقية الصفحات
            localStorage.setItem('church_user', JSON.stringify(foundUser));
            localStorage.setItem('currentUser', JSON.stringify(foundUser));

            if (errorMessage) {
                errorMessage.style.display = 'none';
                errorMessage.classList.add('hidden');
            }

            // التوجيه مباشرة إلى لوحة التحكم
            window.location.href = 'dashboard.html';
        } else {
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.classList.remove('hidden');
            }
            if (submitBtn) submitBtn.textContent = '🔓 تسجيل الدخول';
        }
    } catch (err) {
        console.error('Login Error:', err);
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.classList.remove('hidden');
        }
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.textContent = '🔓 تسجيل الدخول';
    }
}