// Google Apps Script API Client Engine
const API_URL = "https://script.google.com/macros/s/AKfycbw_QWdHcZ_RbhiJJlkqxqmJ7-uk2Nc6Oq6d4a2Un_OjzsbjITxjlAT5-A3GjJlpXt_h/exec";

(function initApiClient() {
    window.API_URL = API_URL;
    console.log('✅ تم إعداد الاتصال بنظام Google Apps Script API بنجاح!');
    window.dispatchEvent(new Event('apiReady'));
})();