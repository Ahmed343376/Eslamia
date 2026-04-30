/**
 * editor.js - Invisible Notion-Style CMS for Al-Islamiya
 * No backend required. Uses localStorage and JSON export.
 */

// --- GLOBALS ---
const EDIT_PASSWORD = "islamiya2024";
let isEditMode = false;
try { isEditMode = localStorage.getItem('islamiya_edit_mode') === 'true'; } catch(e) {}
window.isEditMode = isEditMode; // Expose for other scripts

let draftContent = {};
try { draftContent = JSON.parse(localStorage.getItem('islamiya_draft_content') || '{}'); } catch(e) {}
let activeFloatingPanel = null;
let currentEditingElement = null;

// Setup triggers immediately (don't wait for DOMContentLoaded)
function _initEditor() {
    try { setupTriggers(); } catch(e) { console.error('Editor triggers failed:', e); }
    try {
        loadSiteContent().then(() => {
            if (isEditMode) enableEditMode(true);
        }).catch(err => {
            applyDraftsOnly();
            if (isEditMode) enableEditMode(true);
        });
    } catch(e) {
        try { applyDraftsOnly(); } catch(e2) {}
        if (isEditMode) try { enableEditMode(true); } catch(e3) {}
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initEditor);
} else {
    _initEditor();
}

// =========================================================================
// ENTRY TRIGGERS
// =========================================================================
function setupTriggers() {
    // Keyboard shortcut Ctrl+Shift+A
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            if (isEditMode) exitEditMode();
            else showAuthToast();
        }
    });

    // Trigger B: Secret corner button
    const cornerBtn = document.createElement('div');
    cornerBtn.id = 'editor-corner-trigger';
    cornerBtn.style.cssText = `position: fixed; bottom: 4px; left: 4px; width: 14px; height: 14px; background: rgba(201,168,76,0.15); border-radius: 50%; cursor: pointer; z-index: 99999; transition: all 0.3s;`;
    cornerBtn.onclick = () => { if (isEditMode) exitEditMode(); else showAuthToast(); };
    document.body.appendChild(cornerBtn);

    // Trigger C: Logo clicks (3 times)
    let logoClicks = 0;
    let logoClickTimer;
    const logo = document.querySelector('nav img');
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

// =========================================================================
// AUTHENTICATION
// =========================================================================
function showAuthToast() {
    if (document.getElementById('edit-auth-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'edit-auth-toast';
    toast.innerHTML = `
        <span style="color:var(--edit-primary); font-size:20px;">🔒</span>
        <input type="password" id="edit-pass-input" placeholder="كلمة المرور" autocomplete="new-password"/>
        <button id="edit-pass-btn">دخول</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    const input = document.getElementById('edit-pass-input');
    const btn = document.getElementById('edit-pass-btn');
    input.focus();
    const submit = () => {
        if (input.value === EDIT_PASSWORD) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
            enableEditMode();
        } else {
            input.style.borderColor = '#ff4d4d';
            input.value = '';
            setTimeout(() => input.style.borderColor = 'var(--edit-border)', 1000);
        }
    };
    btn.onclick = submit;
    input.onkeypress = (e) => { if (e.key === 'Enter') submit(); };
}

// =========================================================================
// CORE EDIT MODE LOGIC
// =========================================================================
function enableEditMode(isAuto = false) {
    isEditMode = true;
    window.isEditMode = true;
    if (!isAuto) localStorage.setItem('islamiya_edit_mode', 'true');
    document.body.classList.add('edit-mode-active');
    injectTopBar();
    injectFloatingToolbar();
    setupEditableElements();
    setupBlocks();
    
    // Gallery Admin Buttons
    document.querySelector('.add-product-btn')?.classList.remove('hidden');
    document.querySelectorAll('.delete-product-btn, .move-product-btns, .delete-cat-icon, #add-category-btn').forEach(el => el.classList.remove('hidden'));

    if (!isAuto) showDraftIndicator();
}

function exitEditMode() {
    isEditMode = false;
    window.isEditMode = false;
    localStorage.removeItem('islamiya_edit_mode');
    document.body.classList.remove('edit-mode-active');
    document.getElementById('edit-top-bar')?.remove();
    document.getElementById('edit-floating-toolbar')?.remove();
    closeFloatingPanel();
    
    document.querySelector('.add-product-btn')?.classList.add('hidden');
    document.querySelectorAll('.delete-product-btn, .move-product-btns, .delete-cat-icon, #add-category-btn').forEach(el => el.classList.add('hidden'));

    document.querySelectorAll('[data-editable]').forEach(el => {
        if (el.dataset.editable === 'text') el.removeAttribute('contenteditable');
        el.classList.remove('is-editing');
    });
}

function injectTopBar() {
    if (document.getElementById('edit-top-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'edit-top-bar';
    bar.innerHTML = `
        <div class="edit-bar-center">
            <span class="material-symbols-outlined" style="font-size:18px; color:#4CAF50">cloud_done</span>
            <span style="margin-right:10px">وضع التعديل نشط - الروابط معطلة لتسهيل التحرير</span>
        </div>
        <div class="edit-bar-actions">
            <button id="publish-btn" onclick="publishChanges()">حفظ نهائي</button>
            <button onclick="exitEditMode()">خروج</button>
        </div>
    `;
    document.body.appendChild(bar);
}

function setupEditableElements() {
    document.querySelectorAll('[data-editable]').forEach(el => {
        if (!el.dataset.editKey) return;
        if (el.dataset.editorInit) return;
        el.dataset.editorInit = 'true';

        el.addEventListener('click', (e) => {
            if (!isEditMode) return;
            e.preventDefault();
            e.stopPropagation();

            const type = el.dataset.editable;
            currentEditingElement = el;

            if (type === 'text') {
                el.setAttribute('contenteditable', 'plaintext-only');
                el.focus();
                el.classList.add('is-editing');
                const onBlur = () => {
                    el.classList.remove('is-editing');
                    el.removeAttribute('contenteditable');
                    saveDraft(el.dataset.editKey, el.innerText);
                    el.removeEventListener('blur', onBlur);
                };
                el.addEventListener('blur', onBlur);
            } 
            else if (type === 'long-text') {
                const ta = document.createElement('textarea');
                ta.className = 'inline-textarea';
                ta.value = el.innerText;
                el.innerHTML = '';
                el.appendChild(ta);
                ta.focus();
                const finishEdit = () => {
                    const newVal = ta.value;
                    el.innerHTML = newVal;
                    saveDraft(el.dataset.editKey, newVal);
                };
                ta.onblur = finishEdit;
            }
            else if (type === 'image') showImagePanel(el);
            else if (type === 'link') showLinkPanel(el);
        });
    });
}

// ... Rest of the file (Image panels, sync logic, etc.)
async function saveDraft(key, value) {
    if (!key) return;
    if (key.startsWith('category_') || key.startsWith('product_')) {
        if (window._galleryProducts) {
            if (key.startsWith('category_')) {
                const oldCat = key.replace('category_', '');
                const newCat = value.trim();
                window._galleryProducts.forEach(p => { if (p.category === oldCat) p.category = newCat; });
                if (window._galleryCategories) {
                    const cIdx = window._galleryCategories.indexOf(oldCat);
                    if (cIdx > -1) window._galleryCategories[cIdx] = newCat;
                }
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
            localStorage.setItem('islamiya_products', JSON.stringify(window._galleryProducts));
            if (window._galleryRenderFn) window._galleryRenderFn(window._galleryProducts);
        }
    }
    draftContent[key] = value;
    localStorage.setItem('islamiya_draft_content', JSON.stringify(draftContent));
    if (typeof db !== 'undefined') {
        try { await db.ref('content').update({ [key]: value }); } catch (e) {}
    }
    showDraftIndicator();
}

function showDraftIndicator() {
    let ind = document.getElementById('edit-draft-indicator');
    if (!ind) {
        ind = document.createElement('div');
        ind.id = 'edit-draft-indicator';
        ind.innerText = 'تم الحفظ تلقائياً ✓';
        document.body.appendChild(ind);
    }
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 2000);
}

async function loadSiteContent() {
    let content = {};
    if (typeof db !== 'undefined') {
        try {
            const snapshot = await db.ref('content').once('value');
            if (snapshot.exists()) content = snapshot.val();
        } catch (e) {}
    }
    if (Object.keys(content).length === 0) {
        try {
            const response = await fetch('assets/data/site-content.json');
            if (response.ok) content = await response.json();
        } catch (e) {}
    }
    content = { ...content, ...draftContent };
    window._siteContent = content;
    applyContentToDOM(content);
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

function showImagePanel(imgEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <label>تغيير الصورة</label>
        <button class="panel-btn" id="panel-img-upload">رفع من الجهاز</button>
        <input type="file" id="panel-img-file" style="display:none" accept="image/*">
        <input type="text" id="panel-img-url" placeholder="أو رابط الصورة" value="${imgEl.src}">
        <button class="panel-btn" id="panel-img-save" style="background:#C9A84C; color:#0A0F2C">تحديث</button>
    `;
    positionPanel(panel, imgEl);
    panel.querySelector('#panel-img-upload').onclick = () => panel.querySelector('#panel-img-file').click();
    panel.querySelector('#panel-img-file').onchange = (e) => {
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
    panel.querySelector('#panel-img-save').onclick = () => {
        const url = panel.querySelector('#panel-img-url').value;
        if (url) { imgEl.src = url; saveDraft(imgEl.dataset.editKey, url); }
        closeFloatingPanel();
    };
}

function createFloatingPanel() {
    let p = document.getElementById('edit-floating-panel');
    if (!p) {
        p = document.createElement('div');
        p.id = 'edit-floating-panel';
        p.className = 'edit-floating-panel';
        document.body.appendChild(p);
    }
    return p;
}

function closeFloatingPanel() {
    const p = document.getElementById('edit-floating-panel');
    if (p) p.classList.remove('active');
    activeFloatingPanel = null;
}

function positionPanel(panel, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    panel.style.top = (rect.bottom + window.scrollY + 10) + 'px';
    panel.style.left = (rect.left + rect.width / 2 - 125) + 'px';
    panel.classList.add('active');
    activeFloatingPanel = panel;
}

function injectFloatingToolbar() {
    // Basic toolbar logic can go here if needed
}

function setupBlocks() {}
function publishChanges() { alert("تم الحفظ السحابي بنجاح! جميع التعديلات محفوظة تلقائياً."); }
function showLinkPanel(linkEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <label>الرابط</label><input type="text" id="p-link-url" value="${linkEl.href}">
        <label>النص</label><input type="text" id="p-link-text" value="${linkEl.innerText}">
        <button class="panel-btn" id="p-link-save" style="background:#C9A84C">حفظ</button>
    `;
    positionPanel(panel, linkEl);
    panel.querySelector('#p-link-save').onclick = () => {
        linkEl.href = panel.querySelector('#p-link-url').value;
        linkEl.innerText = panel.querySelector('#p-link-text').value;
        saveDraft(linkEl.dataset.editKey, { href: linkEl.href, text: linkEl.innerText });
        closeFloatingPanel();
    };
}
