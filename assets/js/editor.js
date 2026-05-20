/**
 * editor.js - Unified Visual Editor for Al-Islamiya
 * Fixed: Proper Firebase save, error handling, image upload via Storage
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
    document.querySelectorAll('.delete-product-btn, .del-prod-btn, .move-product-btns, .delete-cat-icon, #add-category-btn').forEach(el => el.classList.remove('hidden'));
    
    console.log("[Editor] Edit mode enabled. Firebase db available:", typeof db !== 'undefined');
}

function exitEditMode() {
    isEditMode = false;
    window.isEditMode = false;
    localStorage.removeItem('islamiya_edit_mode');
    location.reload();
}

// Expose reinitEditor globally so gallery.js can call it after rendering
window.reinitEditor = function() {
    if (window.isEditMode) {
        setupEditableElements();
        // Re-show gallery admin controls
        document.querySelector('.add-product-btn')?.classList.remove('hidden');
        document.querySelectorAll('.del-prod-btn, .move-product-btns, .delete-cat-icon, #add-category-btn').forEach(el => el.classList.remove('hidden'));
    }
};

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
        // Avoid double-binding: mark elements already set up
        if (el._editorBound) return;
        el._editorBound = true;
        
        el.style.cursor = 'pointer';
        el.addEventListener('click', function(e) {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            
            const type = this.dataset.editable;
            if (type === 'text' || type === 'long-text') {
                this.contentEditable = true; this.focus();
                this.onblur = () => {
                    this.contentEditable = false;
                    saveDraft(this.dataset.editKey, this.innerText);
                };
            } else if (type === 'image') showImagePanel(this);
        });
    });
}

function showImagePanel(imgEl) {
    // Remove existing panel first
    const existingPanel = document.getElementById('edit-floating-panel');
    if (existingPanel) existingPanel.remove();
    
    let p = document.createElement('div');
    p.id = 'edit-floating-panel'; p.className = 'edit-floating-panel active';
    p.innerHTML = `
        <div style="background:#141830; padding:20px; border:2px solid #C9A84C; border-radius:15px; color:white; min-width:280px;">
            <button id="up" style="width:100%; background:#C9A84C; color:#0A0F2C; padding:10px; margin-bottom:10px; font-weight:bold; border-radius:5px;">رفع صورة</button>
            <input type="file" id="fi" style="display:none" accept="image/*">
            <input type="text" id="ui" placeholder="رابط مباشر" style="width:100%; padding:10px; background:#0A0F2C; color:white; border:1px solid #333; margin-bottom:15px;" value="${imgEl.src}">
            <button id="ok" style="width:100%; background:white; color:black; padding:10px; border-radius:5px; margin-bottom:10px;">تحديث</button>
            <button id="cancel-panel" style="width:100%; background:rgba(255,0,0,0.2); color:#ff6b6b; padding:8px; border-radius:5px; border:1px solid rgba(255,0,0,0.3);">إلغاء</button>
        </div>
    `;
    document.body.appendChild(p);
    const rect = imgEl.getBoundingClientRect();
    p.style.top = (rect.bottom + window.scrollY + 10) + 'px';
    p.style.left = Math.max(10, (rect.left + rect.width/2 - 140)) + 'px';

    p.querySelector('#cancel-panel').onclick = () => p.remove();

    p.querySelector('#up').onclick = () => p.querySelector('#fi').click();
    p.querySelector('#fi').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check if Firebase Storage is available
            if (typeof firebase !== 'undefined' && firebase.storage) {
                // Upload to Firebase Storage
                const storageRef = firebase.storage().ref();
                const imgRef = storageRef.child('images/' + Date.now() + '_' + file.name);
                showIndicator('جاري رفع الصورة...', 'uploading');
                imgRef.put(file).then(snapshot => {
                    return snapshot.ref.getDownloadURL();
                }).then(downloadURL => {
                    imgEl.src = downloadURL;
                    saveDraft(imgEl.dataset.editKey, downloadURL);
                    p.remove();
                }).catch(err => {
                    console.error('[Editor] Storage upload failed, falling back to base64:', err);
                    // Fallback to base64
                    uploadAsBase64(file, imgEl, p);
                });
            } else {
                // Fallback: use base64
                uploadAsBase64(file, imgEl, p);
            }
        }
    };
    p.querySelector('#ok').onclick = () => {
        const newUrl = p.querySelector('#ui').value;
        if (newUrl && newUrl.trim() !== '') {
            imgEl.src = newUrl;
            saveDraft(imgEl.dataset.editKey, newUrl);
        }
        p.remove();
    };
}

function uploadAsBase64(file, imgEl, panel) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        imgEl.src = ev.target.result;
        saveDraft(imgEl.dataset.editKey, ev.target.result);
        panel.remove();
    };
    reader.readAsDataURL(file);
}

async function saveDraft(key, value) {
    if (!key) {
        console.warn('[Editor] saveDraft called without a key, ignoring.');
        return;
    }
    
    console.log('[Editor] Saving draft for key:', key);
    
    // Save to localStorage first (always works)
    draftContent[key] = value;
    try {
        localStorage.setItem('islamiya_draft_content', JSON.stringify(draftContent));
    } catch (e) {
        console.warn('[Editor] localStorage save failed:', e);
    }
    
    // Core Logic: Sync to Firebase
    if (typeof db !== 'undefined') {
        try {
            if (key.startsWith('product_')) {
                const parts = key.split('_');
                const id = parseInt(parts[1]);
                const field = parts.slice(2).join('_'); // Handle keys like product_10_image
                // Update in global products array if exists
                if (window._galleryProducts) {
                    const prod = window._galleryProducts.find(p => p.id === id);
                    if (prod) {
                        prod[field] = value;
                        await db.ref('products').set(window._galleryProducts);
                        console.log('[Editor] Product updated in Firebase:', key);
                    } else {
                        console.warn('[Editor] Product not found with id:', id);
                    }
                }
            }
            // Save to content node
            await db.ref('content').update({ [key]: value });
            console.log('[Editor] Content saved to Firebase:', key);
            showIndicator('تم الحفظ سحابياً ✓', 'success');
        } catch (error) {
            console.error('[Editor] Firebase save FAILED for key:', key, error);
            showIndicator('خطأ في الحفظ ✗ - ' + error.message, 'error');
        }
    } else {
        console.warn('[Editor] Firebase db not available. Save only to localStorage.');
        showIndicator('تم الحفظ محلياً فقط ⚠', 'warning');
    }
}

function showIndicator(message, type) {
    let ind = document.getElementById('save-ind');
    if (!ind) {
        ind = document.createElement('div');
        ind.id = 'save-ind';
        ind.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            padding: 12px 24px;
            border-radius: 12px;
            font-family: 'Tajawal', sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        `;
        document.body.appendChild(ind);
    }
    
    ind.innerText = message || 'تم الحفظ سحابياً ✓';
    
    // Style based on type
    switch(type) {
        case 'success':
            ind.style.background = 'rgba(37, 211, 102, 0.9)';
            ind.style.color = 'white';
            ind.style.border = '1px solid rgba(37, 211, 102, 0.5)';
            break;
        case 'error':
            ind.style.background = 'rgba(255, 59, 48, 0.9)';
            ind.style.color = 'white';
            ind.style.border = '1px solid rgba(255, 59, 48, 0.5)';
            break;
        case 'warning':
            ind.style.background = 'rgba(255, 204, 0, 0.9)';
            ind.style.color = '#333';
            ind.style.border = '1px solid rgba(255, 204, 0, 0.5)';
            break;
        case 'uploading':
            ind.style.background = 'rgba(0, 122, 255, 0.9)';
            ind.style.color = 'white';
            ind.style.border = '1px solid rgba(0, 122, 255, 0.5)';
            break;
        default:
            ind.style.background = 'rgba(20, 24, 48, 0.9)';
            ind.style.color = '#C9A84C';
            ind.style.border = '1px solid rgba(201, 168, 76, 0.5)';
    }
    
    // Show
    ind.style.opacity = '1';
    ind.style.transform = 'translateX(-50%) translateY(0)';
    
    // Auto hide after delay (longer for errors)
    const delay = type === 'error' ? 5000 : type === 'uploading' ? 10000 : 2500;
    clearTimeout(ind._hideTimeout);
    ind._hideTimeout = setTimeout(() => {
        ind.style.opacity = '0';
        ind.style.transform = 'translateX(-50%) translateY(20px)';
    }, delay);
}

async function loadSiteContent() {
    if (typeof db !== 'undefined') {
        try {
            const snap = await db.ref('content').once('value');
            if (snap.exists()) {
                console.log('[Editor] Content loaded from Firebase successfully.');
                applyContent(snap.val());
            } else {
                console.log('[Editor] No content node found in Firebase.');
            }
        } catch(e) {
            console.error('[Editor] Failed to load content from Firebase:', e);
        }
    } else {
        console.warn('[Editor] Firebase db not available at loadSiteContent time.');
    }
}

function applyContent(content) {
    Object.keys(content).forEach(key => {
        // Skip product_ keys since those are handled by gallery.js
        if (key.startsWith('product_')) return;
        
        const els = document.querySelectorAll(`[data-edit-key="${key}"]`);
        if (els.length === 0) return;
        
        els.forEach(el => {
            if (el.dataset.editable === 'image') {
                el.src = content[key];
            } else {
                el.innerHTML = content[key];
            }
        });
    });
}
