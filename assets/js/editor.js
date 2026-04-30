/**
 * editor.js - Unified Visual Editor for Al-Islamiya
 */

const EDIT_PASSWORD = "islamiya2024";
let isEditMode = false;
try { isEditMode = localStorage.getItem('islamiya_edit_mode') === 'true'; } catch(e) {}
window.isEditMode = isEditMode;

let draftContent = {};
try { draftContent = JSON.parse(localStorage.getItem('islamiya_draft_content') || '{}'); } catch(e) {}

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
    // Secret shortcut Ctrl + Shift + A
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'ش')) {
            e.preventDefault();
            if (isEditMode) exitEditMode();
            else showAuthToast();
        }
    });

    // Secret Corner Button
    const cornerBtn = document.createElement('div');
    cornerBtn.id = 'editor-corner-trigger';
    cornerBtn.style.cssText = `position:fixed; bottom:10px; left:10px; width:16px; height:16px; background:rgba(201,168,76,0.3); border-radius:50%; cursor:pointer; z-index:100000; border:1px solid rgba(201,168,76,0.5); transition: all 0.3s;`;
    cornerBtn.onclick = () => { if (isEditMode) exitEditMode(); else showAuthToast(); };
    document.body.appendChild(cornerBtn);

    // Global Link Preventer (Crucial Fix)
    document.addEventListener('click', (e) => {
        if (window.isEditMode) {
            // Check if we are clicking an editable element or its child
            const editable = e.target.closest('[data-editable]');
            const link = e.target.closest('a');
            
            if (editable) {
                // If it's editable, let the event pass to setupEditableElements listeners
                return;
            }
            
            if (link) {
                // If it's a link but not editable, prevent navigation
                if (link.closest('#edit-top-bar') || link.closest('.edit-floating-panel')) return;
                e.preventDefault();
            }
        }
    }, true);
}

function showAuthToast() {
    const toast = document.createElement('div');
    toast.id = 'edit-auth-toast';
    toast.innerHTML = `
        <div style="background:#141830; padding:25px; border:2px solid #C9A84C; border-radius:15px; text-align:center;">
            <input type="password" id="p-in" placeholder="كلمة المرور" style="width:100%; padding:10px; background:#0A0F2C; color:white; border:1px solid #C9A84C; border-radius:5px; margin-bottom:15px;" />
            <button id="p-btn" style="width:100%; background:#C9A84C; color:#0A0F2C; padding:10px; font-weight:bold; border-radius:5px;">دخول</button>
        </div>
    `;
    document.body.appendChild(toast);
    const input = document.getElementById('p-in');
    input.focus();
    const sub = () => {
        if (input.value === EDIT_PASSWORD) { toast.remove(); enableEditMode(); }
        else { input.style.borderColor = 'red'; input.value = ''; }
    };
    document.getElementById('p-btn').onclick = sub;
    input.onkeypress = (e) => { if(e.key === 'Enter') sub(); };
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
    location.reload();
}

function injectTopBar() {
    const bar = document.createElement('div');
    bar.id = 'edit-top-bar';
    bar.innerHTML = `
        <div style="font-weight:bold; color:#C9A84C">لوحة التحكم | الإسلامية للموبيليا</div>
        <button onclick="exitEditMode()" style="background:rgba(255,255,255,0.1); padding:5px 15px; border-radius:5px;">خروج</button>
    `;
    document.body.appendChild(bar);
}

function setupEditableElements() {
    document.querySelectorAll('[data-editable]').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            
            const type = el.dataset.editable;
            if (type === 'text' || type === 'long-text') {
                el.contentEditable = true; el.focus();
                el.onblur = () => {
                    el.contentEditable = false;
                    saveDraft(el.dataset.editKey, el.innerText);
                };
            } else if (type === 'image') showImagePanel(el);
        };
    });
}

function showImagePanel(imgEl) {
    let p = document.getElementById('edit-floating-panel') || document.createElement('div');
    p.id = 'edit-floating-panel'; p.className = 'edit-floating-panel active';
    p.innerHTML = `
        <div style="background:#141830; padding:20px; border:2px solid #C9A84C; border-radius:15px; color:white; min-width:280px;">
            <button id="up" style="width:100%; background:#C9A84C; color:#0A0F2C; padding:10px; margin-bottom:10px; font-weight:bold; border-radius:5px;">رفع صورة</button>
            <input type="file" id="fi" style="display:none" accept="image/*">
            <input type="text" id="ui" placeholder="رابط مباشر" style="width:100%; padding:10px; background:#0A0F2C; color:white; border:1px solid #333; margin-bottom:15px;" value="${imgEl.src}">
            <button id="ok" style="width:100%; background:white; color:black; padding:10px; border-radius:5px;">تحديث</button>
        </div>
    `;
    document.body.appendChild(p);
    const rect = imgEl.getBoundingClientRect();
    p.style.top = (rect.bottom + window.scrollY + 10) + 'px';
    p.style.left = (rect.left + rect.width/2 - 140) + 'px';

    p.querySelector('#up').onclick = () => p.querySelector('#fi').click();
    p.querySelector('#fi').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imgEl.src = ev.target.result;
                saveDraft(imgEl.dataset.editKey, ev.target.result);
                p.remove();
            };
            reader.readAsDataURL(file);
        }
    };
    p.querySelector('#ok').onclick = () => {
        imgEl.src = p.querySelector('#ui').value;
        saveDraft(imgEl.dataset.editKey, imgEl.src);
        p.remove();
    };
}

async function saveDraft(key, value) {
    if (!key) return;
    
    // Core Logic: Sync back to Firebase correctly
    if (typeof db !== 'undefined') {
        if (key.startsWith('product_')) {
            const parts = key.split('_');
            const id = parseInt(parts[1]);
            const field = parts[2];
            // Update in global products array if exists
            if (window._galleryProducts) {
                const prod = window._galleryProducts.find(p => p.id === id);
                if (prod) {
                    prod[field] = value;
                    await db.ref('products').set(window._galleryProducts);
                }
            }
        }
        await db.ref('content').update({ [key]: value });
    }
    
    draftContent[key] = value;
    localStorage.setItem('islamiya_draft_content', JSON.stringify(draftContent));
    showIndicator();
}

function showIndicator() {
    let ind = document.getElementById('save-ind') || document.createElement('div');
    ind.id = 'save-ind'; ind.innerText = 'تم الحفظ سحابياً ✓';
    document.body.appendChild(ind);
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 2000);
}

async function loadSiteContent() {
    if (typeof db !== 'undefined') {
        try {
            const snap = await db.ref('content').once('value');
            if (snap.exists()) applyContent(snap.val());
        } catch(e) {}
    }
}

function applyContent(content) {
    Object.keys(content).forEach(key => {
        const el = document.querySelector(`[data-edit-key="${key}"]`);
        if (!el) return;
        if (el.dataset.editable === 'image') el.src = content[key];
        else el.innerHTML = content[key];
    });
}
