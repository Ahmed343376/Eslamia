/**
 * editor.js - Full Invisible Notion-Style CMS for Al-Islamiya
 */

const EDIT_PASSWORD = "islamiya2024";
let isEditMode = false;
try { isEditMode = localStorage.getItem('islamiya_edit_mode') === 'true'; } catch(e) {}
window.isEditMode = isEditMode;

let draftContent = {};
try { draftContent = JSON.parse(localStorage.getItem('islamiya_draft_content') || '{}'); } catch(e) {}
let activeFloatingPanel = null;
let currentEditingElement = null;

function _initEditor() {
    setupTriggers();
    loadSiteContent().then(() => {
        if (isEditMode) enableEditMode(true);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initEditor);
} else {
    _initEditor();
}

function setupTriggers() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            if (isEditMode) exitEditMode();
            else showAuthToast();
        }
    });

    const logo = document.querySelector('nav img');
    let logoClicks = 0;
    let logoClickTimer;
    if (logo) {
        logo.addEventListener('click', (e) => {
            if (isEditMode) return;
            logoClicks++;
            clearTimeout(logoClickTimer);
            if (logoClicks >= 3) {
                e.preventDefault();
                showAuthToast();
                logoClicks = 0;
            } else {
                logoClickTimer = setTimeout(() => { logoClicks = 0; }, 800);
            }
        });
    }

    // Global Prevent for Links in Edit Mode
    document.addEventListener('click', (e) => {
        if (window.isEditMode) {
            const link = e.target.closest('a');
            if (link) {
                if (link.closest('#edit-top-bar') || link.closest('.edit-floating-panel') || link.closest('#edit-auth-toast')) return;
                e.preventDefault();
            }
        }
    }, true);
}

function showAuthToast() {
    if (document.getElementById('edit-auth-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'edit-auth-toast';
    toast.innerHTML = `
        <span style="color:#C9A84C; font-size:20px;">🔒</span>
        <input type="password" id="edit-pass-input" placeholder="كلمة المرور" />
        <button id="edit-pass-btn">دخول</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    const input = document.getElementById('edit-pass-input');
    input.focus();
    const submit = () => {
        if (input.value === EDIT_PASSWORD) {
            toast.remove();
            enableEditMode();
        } else {
            input.style.borderColor = 'red';
            input.value = '';
        }
    };
    document.getElementById('edit-pass-btn').onclick = submit;
    input.onkeypress = (e) => { if (e.key === 'Enter') submit(); };
}

function enableEditMode(isAuto = false) {
    isEditMode = true;
    window.isEditMode = true;
    localStorage.setItem('islamiya_edit_mode', 'true');
    document.body.classList.add('edit-mode-active');
    injectTopBar();
    setupEditableElements();
    
    // Gallery controls
    document.querySelector('.add-product-btn')?.classList.remove('hidden');
    document.querySelectorAll('.delete-product-btn, .move-product-btns, .delete-cat-icon, #add-category-btn').forEach(el => el.classList.remove('hidden'));
}

function exitEditMode() {
    isEditMode = false;
    window.isEditMode = false;
    localStorage.removeItem('islamiya_edit_mode');
    document.body.classList.remove('edit-mode-active');
    document.getElementById('edit-top-bar')?.remove();
    closeFloatingPanel();
    location.reload();
}

function injectTopBar() {
    if (document.getElementById('edit-top-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'edit-top-bar';
    bar.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px">
            <span class="material-symbols-outlined" style="color:#4CAF50">check_circle</span>
            <span>وضع التحرير السحابي نشط</span>
        </div>
        <div style="display:flex; gap:10px">
            <button onclick="exitEditMode()" style="background:#444; color:white; padding:5px 15px; border-radius:5px">خروج</button>
        </div>
    `;
    document.body.appendChild(bar);
}

function setupEditableElements() {
    document.querySelectorAll('[data-editable]').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = (e) => {
            if (!isEditMode) return;
            e.preventDefault();
            e.stopPropagation();
            
            const type = el.dataset.editable;
            if (type === 'text' || type === 'long-text') {
                el.contentEditable = true;
                el.focus();
                el.onblur = () => {
                    el.contentEditable = false;
                    saveDraft(el.dataset.editKey, el.innerText);
                };
            } else if (type === 'image') {
                showImagePanel(el);
            } else if (type === 'link') {
                showLinkPanel(el);
            }
        };
    });
}

function showImagePanel(imgEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <div style="padding:15px; background:#141830; border:1px solid #C9A84C; border-radius:10px; color:white; min-width:250px">
            <label style="display:block; margin-bottom:10px">تغيير الصورة</label>
            <button id="up-btn" style="width:100%; background:#C9A84C; color:#0A0F2C; padding:8px; margin-bottom:10px; font-weight:bold">رفع من الجهاز</button>
            <input type="file" id="f-input" style="display:none" accept="image/*">
            <input type="text" id="u-input" placeholder="أو رابط الصورة" style="width:100%; padding:8px; background:#0A0F2C; border:1px solid #333; color:white; margin-bottom:10px" value="${imgEl.src}">
            <button id="s-btn" style="width:100%; background:white; color:black; padding:8px">تحديث</button>
        </div>
    `;
    positionPanel(panel, imgEl);
    
    panel.querySelector('#up-btn').onclick = () => panel.querySelector('#f-input').click();
    panel.querySelector('#f-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imgEl.src = ev.target.result;
                saveDraft(imgEl.dataset.editKey, ev.target.result);
                closeFloatingPanel();
            };
            reader.readAsDataURL(file);
        }
    };
    panel.querySelector('#s-btn').onclick = () => {
        const url = panel.querySelector('#u-input').value;
        if (url) {
            imgEl.src = url;
            saveDraft(imgEl.dataset.editKey, url);
        }
        closeFloatingPanel();
    };
}

function showLinkPanel(linkEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <div style="padding:15px; background:#141830; border:1px solid #C9A84C; border-radius:10px; color:white; min-width:250px">
            <label>الرابط</label>
            <input type="text" id="l-url" style="width:100%; padding:8px; background:#0A0F2C; color:white; margin:5px 0" value="${linkEl.href}">
            <label>النص</label>
            <input type="text" id="l-txt" style="width:100%; padding:8px; background:#0A0F2C; color:white; margin:5px 0" value="${linkEl.innerText}">
            <button id="l-save" style="width:100%; background:#C9A84C; color:black; padding:8px; margin-top:10px">حفظ</button>
        </div>
    `;
    positionPanel(panel, linkEl);
    panel.querySelector('#l-save').onclick = () => {
        linkEl.href = panel.querySelector('#l-url').value;
        linkEl.innerText = panel.querySelector('#l-txt').value;
        saveDraft(linkEl.dataset.editKey, { href: linkEl.href, text: linkEl.innerText });
        closeFloatingPanel();
    };
}

async function saveDraft(key, value) {
    if (!key) return;
    
    // Sync to Gallery if needed
    if (key.startsWith('category_') || key.startsWith('product_')) {
        if (window._galleryProducts) {
            if (key.startsWith('category_')) {
                const oldCat = key.replace('category_', '');
                window._galleryProducts.forEach(p => { if (p.category === oldCat) p.category = value; });
            } else {
                const parts = key.split('_');
                const id = parseInt(parts[1]);
                const field = parts[2];
                const prod = window._galleryProducts.find(p => p.id === id);
                if (prod) prod[field] = value;
            }
            if (typeof db !== 'undefined') {
                await db.ref('products').set(window._galleryProducts);
                if (key.startsWith('category_')) await db.ref('categories').set(window._galleryCategories);
            }
        }
    }

    draftContent[key] = value;
    localStorage.setItem('islamiya_draft_content', JSON.stringify(draftContent));
    
    if (typeof db !== 'undefined') {
        try { await db.ref('content').update({ [key]: value }); } catch(e) {}
    }
    showDraftIndicator();
}

function showDraftIndicator() {
    let ind = document.getElementById('edit-draft-indicator');
    if (!ind) {
        ind = document.createElement('div');
        ind.id = 'edit-draft-indicator';
        ind.innerHTML = 'تم الحفظ سحابياً ✓';
        document.body.appendChild(ind);
    }
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 2000);
}

async function loadSiteContent() {
    if (typeof db !== 'undefined') {
        try {
            const snap = await db.ref('content').once('value');
            if (snap.exists()) {
                const content = snap.val();
                window._siteContent = { ...content, ...draftContent };
                applyContentToDOM(window._siteContent);
            }
        } catch(e) {}
    }
}

function applyContentToDOM(content) {
    Object.keys(content).forEach(key => {
        const el = document.querySelector(`[data-edit-key="${key}"]`);
        if (!el) return;
        const val = content[key];
        const type = el.dataset.editable;
        if (type === 'text' || type === 'long-text') el.innerHTML = val;
        else if (type === 'image') el.src = val;
        else if (type === 'link') {
            if (typeof val === 'object') {
                if (val.href) el.href = val.href;
                if (val.text) el.innerText = val.text;
            } else el.href = val;
        }
    });
}

function createFloatingPanel() {
    let p = document.getElementById('edit-floating-panel');
    if (!p) {
        p = document.createElement('div');
        p.id = 'edit-floating-panel';
        p.className = 'edit-floating-panel';
        document.body.appendChild(p);
    }
    p.classList.add('active');
    return p;
}

function closeFloatingPanel() {
    const p = document.getElementById('edit-floating-panel');
    if (p) p.classList.remove('active');
}

function positionPanel(panel, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    panel.style.top = (rect.bottom + window.scrollY + 10) + 'px';
    panel.style.left = (rect.left + rect.width / 2 - 125) + 'px';
}
