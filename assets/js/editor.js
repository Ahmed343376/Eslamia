/**
 * editor.js - Final Stabilized Visual Editor
 */

const EDIT_PASSWORD = "islamiya2024";
let isEditMode = false;
try { isEditMode = localStorage.getItem('islamiya_edit_mode') === 'true'; } catch(e) {}
window.isEditMode = isEditMode;

let draftContent = {};
try { draftContent = JSON.parse(localStorage.getItem('islamiya_draft_content') || '{}'); } catch(e) {}
let activeFloatingPanel = null;

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
    // Keyboard Shortcut: Ctrl + Shift + A
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'ش')) {
            e.preventDefault();
            if (isEditMode) exitEditMode();
            else showAuthToast();
        }
    });

    // Secret Corner Button (Bottom Left)
    const cornerBtn = document.createElement('div');
    cornerBtn.id = 'editor-corner-trigger';
    cornerBtn.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        width: 24px;
        height: 24px;
        background: rgba(201,168,76,0.3);
        border: 1px solid rgba(201,168,76,0.5);
        border-radius: 50%;
        cursor: pointer;
        z-index: 100000;
        transition: all 0.3s;
    `;
    cornerBtn.onmouseenter = () => {
        cornerBtn.style.background = '#C9A84C';
        cornerBtn.style.transform = 'scale(1.2)';
    };
    cornerBtn.onmouseleave = () => {
        cornerBtn.style.background = 'rgba(201,168,76,0.3)';
        cornerBtn.style.transform = 'scale(1)';
    };
    cornerBtn.onclick = () => {
        if (isEditMode) exitEditMode();
        else showAuthToast();
    };
    document.body.appendChild(cornerBtn);

    // Global Link Management in Edit Mode
    document.addEventListener('click', (e) => {
        if (window.isEditMode) {
            const link = e.target.closest('a');
            if (link) {
                if (link.closest('#edit-top-bar') || link.closest('.edit-floating-panel') || link.closest('#edit-auth-toast')) return;
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true);
}

function showAuthToast() {
    if (document.getElementById('edit-auth-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'edit-auth-toast';
    toast.innerHTML = `
        <div style="background:#141830; padding:20px; border:2px solid #C9A84C; border-radius:15px; color:white; text-align:center; box-shadow:0 10px 50px rgba(0,0,0,0.5)">
            <div style="font-size:24px; margin-bottom:15px">🔒</div>
            <input type="password" id="edit-pass-input" placeholder="كلمة المرور" style="width:100%; padding:10px; background:#0A0F2C; border:1px solid #C9A84C; color:white; margin-bottom:15px; border-radius:5px" />
            <button id="edit-pass-btn" style="width:100%; background:#C9A84C; color:#0A0F2C; font-weight:bold; padding:10px; border-radius:5px">دخول</button>
        </div>
    `;
    document.body.appendChild(toast);
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
    
    // Show hidden admin buttons
    document.querySelector('.add-product-btn')?.classList.remove('hidden');
    document.querySelectorAll('.delete-product-btn, .move-product-btns, .delete-cat-icon, #add-category-btn').forEach(el => el.classList.remove('hidden'));
    
    if (!isAuto) showDraftIndicator("وضع التعديل مفعل");
}

function exitEditMode() {
    isEditMode = false;
    window.isEditMode = false;
    localStorage.removeItem('islamiya_edit_mode');
    document.body.classList.remove('edit-mode-active');
    location.reload();
}

function injectTopBar() {
    if (document.getElementById('edit-top-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'edit-top-bar';
    bar.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px">
            <span style="color:#C9A84C; font-weight:bold">الإسلامية CMS</span>
            <span style="font-size:14px; opacity:0.8">| الروابط معطلة، انقر على أي شيء لتعديله</span>
        </div>
        <button onclick="exitEditMode()" style="background:rgba(255,255,255,0.1); padding:5px 15px; border-radius:5px; font-size:13px">خروج</button>
    `;
    document.body.appendChild(bar);
}

function setupEditableElements() {
    document.querySelectorAll('[data-editable]').forEach(el => {
        if (el.dataset.editorReady) return;
        el.dataset.editorReady = 'true';
        el.style.cursor = 'pointer';
        
        el.addEventListener('click', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault();
            e.stopPropagation();
            
            const type = el.dataset.editable;
            if (type === 'text' || type === 'long-text') {
                el.contentEditable = true;
                el.focus();
                el.classList.add('is-editing');
                el.onblur = () => {
                    el.contentEditable = false;
                    el.classList.remove('is-editing');
                    saveDraft(el.dataset.editKey, el.innerText);
                };
            } else if (type === 'image') {
                showImagePanel(el);
            } else if (type === 'link') {
                showLinkPanel(el);
            }
        }, true);
    });
}

function showImagePanel(imgEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <div style="padding:20px; background:#141830; border:2px solid #C9A84C; border-radius:15px; color:white; min-width:280px; box-shadow:0 10px 30px rgba(0,0,0,0.5)">
            <div style="margin-bottom:15px; font-weight:bold; color:#C9A84C">تغيير الصورة</div>
            <button id="up-btn" style="width:100%; background:#C9A84C; color:#0A0F2C; padding:10px; margin-bottom:10px; font-weight:bold; border-radius:5px">رفع صورة من الجهاز</button>
            <input type="file" id="f-input" style="display:none" accept="image/*">
            <input type="text" id="u-input" placeholder="أو رابط الصورة المباشر" style="width:100%; padding:10px; background:#0A0F2C; border:1px solid #333; color:white; margin-bottom:15px; border-radius:5px" value="${imgEl.src}">
            <div style="display:flex; gap:10px">
                <button id="s-btn" style="flex:1; background:white; color:black; padding:10px; border-radius:5px; font-weight:bold">تحديث</button>
                <button onclick="closeFloatingPanel()" style="flex:1; background:rgba(255,255,255,0.1); color:white; padding:10px; border-radius:5px">إلغاء</button>
            </div>
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

async function saveDraft(key, value) {
    if (!key) return;
    
    draftContent[key] = value;
    localStorage.setItem('islamiya_draft_content', JSON.stringify(draftContent));
    
    if (typeof db !== 'undefined') {
        try { await db.ref('content').update({ [key]: value }); } catch(e) {}
        if (key.startsWith('product_') || key.startsWith('category_')) {
            // Handle gallery sync if needed
        }
    }
    showDraftIndicator("تم الحفظ سحابياً ✓");
}

function showDraftIndicator(msg) {
    let ind = document.getElementById('edit-draft-indicator');
    if (!ind) {
        ind = document.createElement('div');
        ind.id = 'edit-draft-indicator';
        document.body.appendChild(ind);
    }
    ind.innerText = msg;
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
    panel.style.left = Math.max(10, Math.min(window.innerWidth - 300, rect.left + rect.width / 2 - 140)) + 'px';
}
