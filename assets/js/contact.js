/**
 * contact.js - Handling Contact Form, Telegram Notifications, and WhatsApp Fallback
 * Independent of editor.js
 */

(function() {
    'use strict';

    // =========================================================================
    // SECTION A: CONFIG LOADER
    // =========================================================================
    const CONFIG_KEY = 'islamiya_telegram_config';
    const PENDING_KEY = 'islamiya_pending_messages';
    const SETTINGS_KEY = 'islamiya_settings';

    function getTelegramConfig() {
        const stored = localStorage.getItem(CONFIG_KEY);
        return stored ? JSON.parse(stored) : {
            botToken: '',
            chatId: '',
            isActive: false,
            fallbackEmail: ''
        };
    }

    function getSiteSettings() {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? JSON.parse(stored) : { phone1: '201227124707' };
    }

    // =========================================================================
    // SECTION B: FORM VALIDATION
    // =========================================================================
    function validateForm(data) {
        const errors = {};
        let isValid = true;

        // Name: Required
        if (!data.name || data.name.trim().length < 3) {
            errors.name = 'يرجى إدخال الاسم الكامل (٣ أحرف على الأقل)';
            isValid = false;
        }

        // Phone: Required, Egyptian format (01xxxxxxxxx)
        const phoneRegex = /^01[0125][0-9]{8}$/;
        if (!data.phone) {
            errors.phone = 'رقم الهاتف مطلوب';
            isValid = false;
        } else if (!phoneRegex.test(data.phone)) {
            errors.phone = 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01227124707)';
            isValid = false;
        }

        // Message: Required
        if (!data.message || data.message.trim().length < 10) {
            errors.message = 'يرجى كتابة رسالتك (١٠ أحرف على الأقل)';
            isValid = false;
        }

        // Email: Optional, but if provided must be valid
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.email = 'البريد الإلكتروني غير صحيح';
            isValid = false;
        }

        return { isValid, errors };
    }

    function clearErrors() {
        document.querySelectorAll('.error-text').forEach(el => el.innerText = '');
        document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));
    }

    function showErrors(errors) {
        Object.keys(errors).forEach(key => {
            const errorEl = document.getElementById(`error-${key}`);
            const inputEl = document.getElementById(key);
            if (errorEl) errorEl.innerText = errors[key];
            if (inputEl) inputEl.classList.add('is-invalid');
        });
    }

    // =========================================================================
    // SECTION C: TELEGRAM SENDER
    // =========================================================================
    async function sendToTelegram(formData) {
        const config = getTelegramConfig();
        if (!config.isActive || !config.botToken || !config.chatId) {
            throw new Error('Telegram not configured or inactive');
        }

        const now = new Date();
        const formattedTime = now.toLocaleString('ar-EG', { 
            hour: 'numeric', minute: 'numeric', hour12: true,
            day: 'numeric', month: 'long', year: 'numeric' 
        });

        const message = `
🛋 *رسالة جديدة من الموقع*

👤 *الاسم:* ${formData.name}
📞 *الهاتف:* [${formData.phone}](tel:${formData.phone})
📧 *البريد:* ${formData.email || 'لم يُدخل'}

💬 *الرسالة:*
${formData.message}

⏰ *الوقت:* ${formattedTime}
🌐 *الصفحة:* ${window.location.href}
        `.trim();

        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.description || 'Failed to send to Telegram');
        }

        return true;
    }

    // =========================================================================
    // SECTION D: WHATSAPP URL BUILDER
    // =========================================================================
    function getWhatsAppUrl() {
        const settings = getSiteSettings();
        const phone = settings.phone1.replace(/\+/g, '').replace(/\s/g, '');
        const message = encodeURIComponent('السلام عليكم، تواصلت معكم عبر موقع الإسلامية للموبيليا وأريد الاستفسار عن...');
        return `https://wa.me/${phone}?text=${message}`;
    }

    // =========================================================================
    // SECTION E: PENDING MESSAGES MANAGER
    // =========================================================================
    function saveToPending(formData) {
        const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        pending.push({
            ...formData,
            id: Date.now(),
            timestamp: new Date().toISOString(),
            status: 'failed'
        });
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    }

    // =========================================================================
    // SECTION F: UI STATE MANAGER & FORM HANDLING
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('contact-form');
        const successPanel = document.getElementById('contact-success-panel');
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const directWaBtn = document.getElementById('direct-whatsapp-btn');
        const successWaBtn = document.getElementById('success-whatsapp-btn');

        if (!form) return;

        // Set initial WhatsApp links
        const waUrl = getWhatsAppUrl();
        if (directWaBtn) directWaBtn.href = waUrl;
        if (successWaBtn) successWaBtn.href = waUrl;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const formData = {
                name: form.name.value,
                phone: form.phone.value,
                email: form.email.value,
                message: form.message.value
            };

            // 1. Validate
            const validation = validateForm(formData);
            if (!validation.isValid) {
                showErrors(validation.errors);
                return;
            }

            // 2. Loading State
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            if (btnText) btnText.innerText = 'جاري الإرسال...';
            document.querySelectorAll('.form-control').forEach(el => el.readOnly = true);

            // 3. Try Telegram
            try {
                await sendToTelegram(formData);
                showSuccess();
            } catch (err) {
                console.error('Telegram error:', err);
                // 4B & 4C: Save to pending but show success anyway
                saveToPending(formData);
                showSuccess();
            }
        });

        function showSuccess() {
            form.style.display = 'none';
            if (directWaBtn) directWaBtn.parentElement.style.display = 'none';
            if (successPanel) {
                successPanel.style.display = 'block';
                // Trigger animation if GSAP is available
                if (window.gsap) {
                    gsap.from(successPanel, { opacity: 0, y: 20, duration: 0.5 });
                }
            }
        }
    });

})();
