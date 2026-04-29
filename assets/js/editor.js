/**
 * editor.js - Invisible Notion-Style CMS for Al-Islamiya
 * No backend required. Uses localStorage and JSON export.
 */

// --- GLOBALS ---
const EDIT_PASSWORD = "islamiya2024";
let isEditMode = false;
try { isEditMode = localStorage.getItem('islamiya_edit_mode') === 'true'; } catch(e) {}
let draftContent = {};
try { draftContent = JSON.parse(localStorage.getItem('islamiya_draft_content') || '{}'); } catch(e) {}
let activeFloatingPanel = null;
let currentEditingElement = null;

// Setup triggers immediately (don't wait for DOMContentLoaded)
// This ensures they work even if other code fails
function _initEditor() {
    try { setupTriggers(); } catch(e) { console.error('Editor triggers failed:', e); }
    try {
        loadSiteContent().then(() => {
            if (isEditMode) enableEditMode(true);
        }).catch(err => {
            // fetch failed (likely file:// protocol) - apply drafts from localStorage only
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
    _initEditor(); // DOM already ready
}

// =========================================================================
// ENTRY TRIGGERS
// =========================================================================
function setupTriggers() {

    // Trigger A: Keyboard shortcut Ctrl+Shift+E (most reliable)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            if (isEditMode) {
                exitEditMode();
            } else {
                showAuthToast();
            }
        }
    });

    // Trigger B: Secret corner button (very small, bottom-right of footer)
    const cornerBtn = document.createElement('div');
    cornerBtn.id = 'editor-corner-trigger';
    cornerBtn.style.cssText = `
        position: fixed;
        bottom: 4px;
        left: 4px;
        width: 14px;
        height: 14px;
        background: rgba(201,168,76,0.15);
        border-radius: 50%;
        cursor: pointer;
        z-index: 99999;
        transition: all 0.3s;
    `;
    cornerBtn.title = "الوضع الإداري";
    cornerBtn.onmouseenter = () => cornerBtn.style.background = 'rgba(201,168,76,0.6)';
    cornerBtn.onmouseleave = () => cornerBtn.style.background = 'rgba(201,168,76,0.15)';
    cornerBtn.onclick = () => {
        if (isEditMode) exitEditMode();
        else showAuthToast();
    };
    document.body.appendChild(cornerBtn);

    // Trigger C: Logo clicks (3 times) - but WITHOUT preventing default on single click
    let logoClicks = 0;
    let logoClickTimer;
    const logo = document.querySelector('.logo img, img[alt="الإسلامية للموبيليا"]');
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

    // Animate in
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
            input.style.borderColor = 'var(--edit-danger)';
            input.value = '';
            setTimeout(() => input.style.borderColor = 'var(--edit-border)', 1000);
        }
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') submit(); });

    // Click outside to close toast
    document.addEventListener('click', function closeToast(e) {
        if (!toast.contains(e.target) && toast.classList.contains('show')) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
            document.removeEventListener('click', closeToast);
        }
    });
}

// =========================================================================
// CORE EDIT MODE LOGIC
// =========================================================================
function enableEditMode(isAuto = false) {
    isEditMode = true;
    if (!isAuto) localStorage.setItem('islamiya_edit_mode', 'true');
    
    document.body.classList.add('edit-mode-active');
    
    // Setup components
    injectTopBar();
    injectFloatingToolbar();
    setupEditableElements();
    setupBlocks();
    
    // Special: Telegram Settings for contact page
    if (window.location.pathname.includes('contact.html')) {
        setupTelegramEditor();
    }

    // Floating Save Indicator
    if (!isAuto) showDraftIndicator();
}

function exitEditMode() {
    isEditMode = false;
    localStorage.removeItem('islamiya_edit_mode');
    document.body.classList.remove('edit-mode-active');
    document.getElementById('edit-top-bar')?.remove();
    document.getElementById('edit-floating-toolbar')?.remove();
    closeFloatingPanel();
    
    // Remove contenteditable attributes
    document.querySelectorAll('[data-editable]').forEach(el => {
        if (el.dataset.editable === 'text') el.removeAttribute('contenteditable');
        el.classList.remove('is-editing');
    });
    
    // Remove block handles
    document.querySelectorAll('.edit-block-handle').forEach(h => h.remove());
}

function injectTopBar() {
    if (document.getElementById('edit-top-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'edit-top-bar';
    const cloudIcon = typeof db !== 'undefined' ? 'cloud_done' : 'cloud_off';
    const cloudColor = typeof db !== 'undefined' ? '#4CAF50' : '#ff4d4d';
    const cloudTitle = typeof db !== 'undefined' ? 'متصل بالسحابة' : 'غير متصل بالسحابة';

    bar.innerHTML = `
        <div class="edit-bar-center">
            <span class="material-symbols-outlined" style="font-size:18px; color:${cloudColor}" title="${cloudTitle}">${cloudIcon}</span>
            <span style="margin-right:10px">وضع التعديل — انقر على أي عنصر لتعديله</span>
        </div>
        <div class="edit-bar-actions">
            <button id="publish-btn" onclick="publishChanges()" style="background:var(--edit-surface); color:var(--edit-primary); border-color:var(--edit-primary)">نشر التغييرات</button>
            <button onclick="exitEditMode()">خروج</button>
        </div>
    `;
    document.body.appendChild(bar);
}

// =========================================================================
// ELEMENT EDITING
// =========================================================================
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
                
                // Add blur listener to save
                const onBlur = () => {
                    el.classList.remove('is-editing');
                    el.removeAttribute('contenteditable');
                    saveDraft(el.dataset.editKey, el.innerText);
                    el.removeEventListener('blur', onBlur);
                };
                el.addEventListener('blur', onBlur);
            } 
            else if (type === 'long-text') {
                if (el.querySelector('textarea')) return; // already editing
                const currentHtml = el.innerHTML;
                const currentText = el.innerText;
                const ta = document.createElement('textarea');
                ta.className = 'inline-textarea';
                ta.value = currentText;
                
                el.innerHTML = '';
                el.appendChild(ta);
                ta.focus();

                const finishEdit = () => {
                    const newVal = ta.value.trim().replace(/\\n/g, '<br>');
                    el.innerHTML = newVal || currentHtml;
                    saveDraft(el.dataset.editKey, el.innerHTML);
                };

                ta.addEventListener('blur', finishEdit);
                ta.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') finishEdit();
                });
            }
            else if (type === 'image') {
                showImagePanel(el);
            }
            else if (type === 'iframe') {
                showIframePanel(el);
            }
            else if (type === 'link') {
                showLinkPanel(el);
            }
        });
    });
}

// =========================================================================
// PANELS (IMAGE / LINK)
// =========================================================================
function createFloatingPanel() {
    if (document.getElementById('edit-floating-panel')) {
        return document.getElementById('edit-floating-panel');
    }
    const panel = document.createElement('div');
    panel.id = 'edit-floating-panel';
    panel.className = 'edit-floating-panel';
    document.body.appendChild(panel);
    
    // Close on click outside
    document.addEventListener('click', (e) => {
        if (activeFloatingPanel && !activeFloatingPanel.contains(e.target) && !currentEditingElement.contains(e.target)) {
            closeFloatingPanel();
        }
    });

    return panel;
}

function closeFloatingPanel() {
    if (activeFloatingPanel) {
        activeFloatingPanel.classList.remove('active');
        activeFloatingPanel = null;
    }
}

function positionPanel(panel, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    panel.style.top = (rect.bottom + window.scrollY + 10) + 'px';
    // Center it relative to target
    panel.style.left = (rect.left + rect.width / 2 - 125) + 'px';
    panel.classList.add('active');
    activeFloatingPanel = panel;
}

function showImagePanel(imgEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <label>تغيير الصورة</label>
        <button class="panel-btn" id="panel-img-upload" style="margin-bottom:8px">رفع صورة من الجهاز</button>
        <input type="file" id="panel-img-file" style="display:none" accept="image/*">
        <label>أو وضع رابط الصورة</label>
        <input type="text" id="panel-img-url" placeholder="https://..." value="${imgEl.src}">
        <button class="panel-btn" id="panel-img-save" style="background:var(--edit-primary); color:var(--edit-surface)">تحديث</button>
    `;
    positionPanel(panel, imgEl);

    const fileInput = panel.querySelector('#panel-img-file');
    panel.querySelector('#panel-img-upload').onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const rawB64 = ev.target.result;
                // Optimize image before saving
                try {
                    const optimizedB64 = await optimizeImage(rawB64, 1200, 0.8);
                    imgEl.src = optimizedB64;
                    saveDraft(imgEl.dataset.editKey, optimizedB64);
                } catch (err) {
                    console.warn("Optimization failed, saving raw image", err);
                    imgEl.src = rawB64;
                    saveDraft(imgEl.dataset.editKey, rawB64);
                }
                closeFloatingPanel();
            };
            reader.readAsDataURL(file);
        }
    };

    panel.querySelector('#panel-img-save').onclick = () => {
        const url = panel.querySelector('#panel-img-url').value;
        if (url) {
            imgEl.src = url;
            saveDraft(imgEl.dataset.editKey, url);
        }
        closeFloatingPanel();
    };
}
// Helper to compress images on the fly
function optimizeImage(base64, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
    });
}

function showIframePanel(iframeEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <label>تغيير الخريطة (URL)</label>
        <input type="text" id="panel-iframe-url" placeholder="https://..." value="${iframeEl.src}" />
        <button class="panel-btn" id="panel-iframe-save" style="background:var(--edit-primary); color:var(--edit-surface)">حفظ</button>
    `;
    positionPanel(panel, iframeEl);

    panel.querySelector('#panel-iframe-save').onclick = () => {
        const url = panel.querySelector('#panel-iframe-url').value;
        if (url) {
            iframeEl.src = url;
            saveDraft(iframeEl.dataset.editKey, url);
        }
        closeFloatingPanel();
    };
}


function showLinkPanel(linkEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    panel.innerHTML = `
        <label>رابط الزر / النص</label>
        <input type="text" id="panel-link-url" value="${linkEl.href}">
        <label>النص (إن وجد)</label>
        <input type="text" id="panel-link-text" value="${linkEl.innerText.trim()}">
        <button class="panel-btn" id="panel-link-save" style="background:var(--edit-primary); color:var(--edit-surface)">حفظ</button>
    `;
    positionPanel(panel, linkEl);

    panel.querySelector('#panel-link-save').onclick = () => {
        const url = panel.querySelector('#panel-link-url').value;
        const text = panel.querySelector('#panel-link-text').value;
        
        if (url) linkEl.href = url;
        if (text) linkEl.innerText = text;
        
        // Save composite object
        saveDraft(linkEl.dataset.editKey, { href: url, text: text });
        closeFloatingPanel();
    };
}

// =========================================================================
// FLOATING TOOLBAR (NOTION-STYLE)
// =========================================================================
function injectFloatingToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'edit-floating-toolbar';
    toolbar.innerHTML = `
        <button id="tb-bold" title="عريض (Bold)"><b>B</b></button>
        <button id="tb-size" title="تكبير/تصغير">Tt</button>
        <div style="width:1px; background:rgba(255,255,255,0.2); margin:4px;"></div>
        <button id="tb-color-w" title="أبيض"><div class="toolbar-color-dot" style="background:#fff"></div></button>
        <button id="tb-color-g" title="ذهبي"><div class="toolbar-color-dot" style="background:var(--edit-primary)"></div></button>
        <button id="tb-color-m" title="رمادي"><div class="toolbar-color-dot" style="background:#8B8FA8"></div></button>
    `;
    document.body.appendChild(toolbar);

    // Toolbar Actions
    document.getElementById('tb-bold').onclick = () => document.execCommand('bold', false, null);
    
    // Very simple size toggle for the selection container
    document.getElementById('tb-size').onclick = () => {
        const sel = window.getSelection();
        if(!sel.rangeCount) return;
        const parentNode = sel.getRangeAt(0).commonAncestorContainer.parentNode;
        if (parentNode && parentNode.nodeType === 1) {
            parentNode.classList.toggle('text-2xl'); // Assuming Tailwind usage
        }
    };

    const applyColor = (colorCode) => {
        document.execCommand('foreColor', false, colorCode);
    };
    document.getElementById('tb-color-w').onclick = () => applyColor('#FFFFFF');
    document.getElementById('tb-color-g').onclick = () => applyColor('#C9A84C');
    document.getElementById('tb-color-m').onclick = () => applyColor('#8B8FA8');

    // Selection detection logic
    document.addEventListener('selectionchange', () => {
        if (!isEditMode) return;
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && sel.toString().trim().length > 0) {
            // Check if selection is inside an editable element
            let node = sel.anchorNode;
            let isEditable = false;
            while (node && node !== document.body) {
                if (node.dataset && node.dataset.editable === 'text') {
                    isEditable = true; break;
                }
                node = node.parentNode;
            }
            if (!isEditable) {
                toolbar.classList.remove('active');
                return;
            }

            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Position above selection
            toolbar.style.left = (rect.left + rect.width / 2 - toolbar.offsetWidth / 2) + 'px';
            toolbar.style.top = (rect.top + window.scrollY - 45) + 'px';
            toolbar.classList.add('active');
        } else {
            toolbar.classList.remove('active');
        }
    });
}

// =========================================================================
// BLOCK SYSTEM
// =========================================================================
function setupBlocks() {
    document.querySelectorAll('[data-block="true"]').forEach(block => {
        if (block.querySelector('.edit-block-handle')) return;

        const handle = document.createElement('div');
        handle.className = 'edit-block-handle material-symbols-outlined';
        handle.innerText = 'drag_indicator';
        block.appendChild(handle);

        handle.addEventListener('click', (e) => {
            e.stopPropagation();
            showBlockMenu(block, handle);
        });
    });
}

function showBlockMenu(blockEl, handleEl) {
    closeFloatingPanel();
    const panel = createFloatingPanel();
    
    const isHidden = blockEl.classList.contains('block-hidden');

    panel.innerHTML = `
        <button class="panel-btn" id="block-up" style="margin-bottom:6px">تحريك للأعلى ⬆️</button>
        <button class="panel-btn" id="block-down" style="margin-bottom:6px">تحريك للأسفل ⬇️</button>
        <button class="panel-btn" id="block-toggle" style="background:rgba(255,107,107,0.1); color:var(--edit-danger)">
            ${isHidden ? 'إظهار القسم 👁️' : 'إخفاء القسم 🚫'}
        </button>
    `;
    positionPanel(panel, handleEl);

    panel.querySelector('#block-up').onclick = () => {
        if (blockEl.previousElementSibling) {
            blockEl.parentNode.insertBefore(blockEl, blockEl.previousElementSibling);
            saveBlockOrder();
        }
        closeFloatingPanel();
    };

    panel.querySelector('#block-down').onclick = () => {
        if (blockEl.nextElementSibling) {
            blockEl.parentNode.insertBefore(blockEl.nextElementSibling, blockEl);
            saveBlockOrder();
        }
        closeFloatingPanel();
    };

    panel.querySelector('#block-toggle').onclick = () => {
        blockEl.classList.toggle('block-hidden');
        // Save hidden state
        saveDraft(blockEl.id + '_hidden', blockEl.classList.contains('block-hidden'));
        closeFloatingPanel();
    };
}

function saveBlockOrder() {
    // Collect order of blocks inside main containers
    const order = {};
    document.querySelectorAll('main, body').forEach(container => {
        if (!container.id) return;
        const blocks = Array.from(container.querySelectorAll(':scope > [data-block="true"]'));
        if (blocks.length > 0) {
            order[container.id] = blocks.map(b => b.id).filter(id => id);
        }
    });
    saveDraft('layout_order', order);
}

// =========================================================================
// SAVING AND LOADING (DRAFTS & PUBLISH)
// =========================================================================

function saveDraft(key, value) {
    if (!key) return;

    if (key.startsWith('category_')) {
        const oldCat = key.replace('category_', '');
        const newCat = value.trim();
        if (window._galleryProducts) {
             window._galleryProducts.forEach(p => {
                  if (p.category === oldCat) p.category = newCat;
             });
             localStorage.setItem('islamiya_products', JSON.stringify(window._galleryProducts));
             showDraftIndicator();
             // ❌ REMOVED RELOAD: instead, just re-render UI if possible
             if (window._galleryRenderFn) window._galleryRenderFn(window._galleryProducts);
        }
        return;
    }

    if (key.startsWith('product_')) {
        const parts = key.split('_');
        if (parts.length >= 3) {
            const id = parseInt(parts[1]);
            const field = parts[2];
            if (window._galleryProducts) {
                 const prod = window._galleryProducts.find(p => p.id === id);
                 if (prod) {
                     prod[field] = value;
                     localStorage.setItem('islamiya_products', JSON.stringify(window._galleryProducts));
                     showDraftIndicator();
                     return;
                 }
            }
        }
    }

    draftContent[key] = value;
    localStorage.setItem('islamiya_draft_content', JSON.stringify(draftContent));
    showDraftIndicator();
}

function showDraftIndicator() {
    let ind = document.getElementById('edit-draft-indicator');
    if (!ind) {
        ind = document.createElement('div');
        ind.id = 'edit-draft-indicator';
        ind.innerText = 'مسودة محفوظة ✓';
        document.body.appendChild(ind);
    }
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 2000);
}

function publishChanges() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(draftContent, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    
    const date = new Date().toISOString().split('T')[0];
    dlAnchorElem.setAttribute("download", `site-content-${date}.json`);
    dlAnchorElem.click();

    alert("تم تنزيل ملف التعديلات.\nارفع هذا الملف على GitHub في مجلد assets/data/ واسمه 'site-content.json' لتظهر التغييرات للزوار.");
}

// Apply only localStorage drafts without fetching JSON (for file:// protocol)
function applyDraftsOnly() {
    const content = { ...draftContent };
    Object.keys(content).forEach(key => {
        if (key === 'layout_order') { applyBlockOrder(content[key]); return; }
        if (key.endsWith('_hidden')) {
            const block = document.getElementById(key.replace('_hidden', ''));
            if (block && content[key]) block.style.display = 'none';
            return;
        }
        const el = document.querySelector(`[data-edit-key="${key}"]`);
        if (!el) return;
        const val = content[key];
        const type = el.dataset.editable;
        if (type === 'text' || type === 'long-text') el.innerHTML = val;
        else if (type === 'image') el.src = val;
        else if (type === 'iframe') el.src = val;
        else if (type === 'link') {
            if (typeof val === 'object') {
                if (val.href) el.href = val.href;
                if (val.text) el.innerText = val.text;
            } else el.href = val;
        }
    });
}

async function loadSiteContent() {
    let content = {};
    
    // 1. Try to fetch from Firebase (PRIORITY)
    if (typeof db !== 'undefined') {
        try {
            const snapshot = await db.ref('content').once('value');
            if (snapshot.exists()) {
                content = snapshot.val();
                console.log("Loaded content from Firebase.");
            }
        } catch (e) {
            console.warn("Firebase fetch failed, trying local JSON.", e);
        }
    }

    // 2. Fallback to local JSON if Firebase empty/failed
    if (Object.keys(content).length === 0) {
        try {
            const response = await fetch('assets/data/site-content.json');
            if (response.ok) {
                content = await response.json();
            }
        } catch (e) {
            console.log("No published site-content.json found.");
        }
    }

    // 3. Merge with LocalStorage Drafts
    content = { ...content, ...draftContent };

    // 4. Apply to DOM
    window._siteContent = content; // Expose globally for gallery sync
    if (window._galleryRenderFn && window._galleryProducts) {
        window._galleryRenderFn(window._galleryProducts);
    }
    applyContentToDOM(content);
}

function applyContentToDOM(content) {
    Object.keys(content).forEach(key => {
        if (key === 'layout_order') {
            applyBlockOrder(content[key]);
            return;
        }

        if (key.endsWith('_hidden')) {
            const blockId = key.replace('_hidden', '');
            const block = document.getElementById(blockId);
            if (block && content[key]) {
                block.classList.add('block-hidden');
                if (!isEditMode) block.style.display = 'none';
            }
            return;
        }

        const el = document.querySelector(`[data-edit-key="${key}"]`);
        if (!el) return;

        const val = content[key];
        const type = el.dataset.editable;

        if (type === 'text' || type === 'long-text') {
            el.innerHTML = val;
        } else if (type === 'image') {
            el.src = val;
        } else if (type === 'iframe') {
            el.src = val;
        } else if (type === 'link') {
            if (typeof val === 'object') {
                if (val.href) el.href = val.href;
                if (val.text) el.innerText = val.text;
            } else {
                el.href = val;
            }
        }
    });
}

async function publishChanges() {
    if (typeof db !== 'undefined') {
        try {
            const btn = document.getElementById('publish-btn');
            const originalText = btn.innerText;
            btn.innerText = 'جاري الحفظ بالسحابة...';
            btn.disabled = true;

            await db.ref('content').set(draftContent);
            
            // ✅ Update local site content state and trigger re-render
            window._siteContent = { ...window._siteContent, ...draftContent };
            if (window._galleryRenderFn && window._galleryProducts) {
                window._galleryRenderFn(window._galleryProducts);
            }
            
            btn.innerText = 'تم الحفظ سحابياً ✓';
            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 3000);

            alert("✅ تم نشر التغييرات بنجاح على سحابة جوجل.\nستظهر التعديلات الآن لجميع الزوار فوراً.");
            return;
        } catch (e) {
            console.error("Cloud save failed:", e);
            alert("❌ فشل الحفظ السحابي. جاري تحميل نسخة احتياطية على جهازك.");
        }
    }

    // Fallback: Download JSON if no Firebase
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(draftContent, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    const date = new Date().toISOString().split('T')[0];
    dlAnchorElem.setAttribute("download", `site-content-${date}.json`);
    dlAnchorElem.click();
}

function applyBlockOrder(orderObj) {
    Object.keys(orderObj).forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const orderedIds = orderObj[containerId];
        orderedIds.forEach(id => {
            const block = document.getElementById(id);
            if (block) container.appendChild(block);
        });
    });
}

// =========================================================================
// TELEGRAM SETTINGS PANEL (FOR CONTACT.HTML)
// =========================================================================
function setupTelegramEditor() {
    if (document.getElementById('telegram-edit-btn')) return;

    // 1. Create Floating Button
    const btn = document.createElement('div');
    btn.id = 'telegram-edit-btn';
    btn.className = 'telegram-floating-btn';
    btn.innerHTML = '<i class="fab fa-telegram-plane"></i>';
    btn.title = "إعدادات التليجرام";
    document.body.appendChild(btn);

    btn.onclick = () => showTelegramPanel();
}

function showTelegramPanel() {
    let panel = document.getElementById('telegram-settings-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'telegram-settings-panel';
        panel.className = 'telegram-panel';
        document.body.appendChild(panel);
    }

    const config = JSON.parse(localStorage.getItem('islamiya_telegram_config') || '{"botToken":"","chatId":"","isActive":false}');
    const pending = JSON.parse(localStorage.getItem('islamiya_pending_messages') || '[]');
    const siteSettings = JSON.parse(localStorage.getItem('islamiya_settings') || '{"phone1":"201227124707"}');

    panel.innerHTML = `
        <div class="tg-panel-header">
            <h3>إعدادات الإشعارات (تليجرام)</h3>
            <button class="tg-close-btn">&times;</button>
        </div>
        
        <div class="tg-tabs">
            <button class="tg-tab-btn active" data-tab="setup">الإعداد</button>
            <button class="tg-tab-btn" data-tab="pending">الرسائل المعلقة ${pending.length ? `<span class="tg-badge">${pending.length}</span>` : ''}</button>
        </div>

        <div class="tg-tab-content active" id="tab-setup">
            <div class="tg-info-box">
                <i class="fas fa-info-circle"></i> 
                هذه المعلومات تُخزَّن على جهازك فقط ولا تُرسَّل لأي خادم.
            </div>

            <div class="tg-field">
                <label>رمز البوت (Bot Token)</label>
                <div class="tg-input-group">
                    <input type="password" id="tg-bot-token" value="${config.botToken}" placeholder="123456789:ABCdef...">
                    <button type="button" class="tg-toggle-pass"><i class="fas fa-eye"></i></button>
                </div>
                <small>احصل عليه من <a href="https://t.me/BotFather" target="_blank">@BotFather</a></small>
            </div>

            <div class="tg-field">
                <label>معرّف المحادثة (Chat ID)</label>
                <input type="text" id="tg-chat-id" value="${config.chatId}" placeholder="123456789">
                <small>أرسل رسالة للبوت ثم افتح getUpdates للحصول عليه</small>
            </div>

            <div class="tg-field tg-flex-row">
                <label>تفعيل الإشعارات</label>
                <label class="tg-switch">
                    <input type="checkbox" id="tg-is-active" ${config.isActive ? 'checked' : ''}>
                    <span class="tg-slider"></span>
                </label>
            </div>

            <div class="tg-actions">
                <button id="tg-test-btn" class="tg-btn-outline">اختبار الاتصال</button>
                <button id="tg-save-btn" class="tg-btn-primary">حفظ الإعدادات</button>
            </div>

            <div id="tg-test-status" class="tg-status-msg"></div>

            <details class="tg-help-details">
                <summary>كيف أنشئ البوت؟</summary>
                <ol>
                    <li>افتح تليجرام وابحث عن <b>@BotFather</b></li>
                    <li>أرسل له <b>/newbot</b> واتبع التعليمات</li>
                    <li>ستحصل على رمز (Token) — انسخه وضعه هنا</li>
                    <li>افتح البوت الجديد وأرسل له أي رسالة</li>
                    <li>افتح <a id="tg-link-updates" href="#" target="_blank">هذا الرابط</a> للحصول على Chat ID</li>
                    <li>انسخ الرقم من "id" وضعه في حقل Chat ID</li>
                </ol>
            </details>

            <hr class="tg-divider">
            
            <div class="tg-field">
                <label>رقم واتساب للتواصل المباشر</label>
                <input type="text" id="tg-wa-phone" value="${siteSettings.phone1}">
                <small>هذا الرقم يُستخدم في زرار واتساب أسفل النموذج</small>
            </div>
        </div>

        <div class="tg-tab-content" id="tab-pending">
            ${pending.length === 0 ? `
                <div class="tg-empty-state">لا توجد رسائل معلقة ✓</div>
            ` : `
                <div class="tg-pending-list">
                    ${pending.map(msg => `
                        <div class="tg-pending-card" data-id="${msg.id}">
                            <div class="tg-card-info">
                                <strong>${msg.name}</strong> (${msg.phone})
                                <span>${new Date(msg.timestamp).toLocaleString('ar-EG')}</span>
                            </div>
                            <div class="tg-card-actions">
                                <button class="tg-retry-btn" title="إعادة إرسال"><i class="fas fa-sync"></i></button>
                                <button class="tg-delete-btn" title="حذف"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="tg-actions-footer">
                    <button id="tg-export-btn" class="tg-btn-outline">تصدير (JSON)</button>
                    <button id="tg-resend-all-btn" class="tg-btn-primary">إعادة إرسال الكل</button>
                </div>
            `}
        </div>
        
        <div class="tg-warning-box">
            ⚠️ تنبيه: هذه الإعدادات محفوظة على هذا الجهاز فقط.
        </div>
    `;

    panel.classList.add('active');

    // --- Tab Switching ---
    panel.querySelectorAll('.tg-tab-btn').forEach(btn => {
        btn.onclick = () => {
            panel.querySelectorAll('.tg-tab-btn').forEach(b => b.classList.remove('active'));
            panel.querySelectorAll('.tg-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        };
    });

    // --- Dynamic Updates Link ---
    const tokenInput = document.getElementById('tg-bot-token');
    const updatesLink = document.getElementById('tg-link-updates');
    const updateLink = () => {
        updatesLink.href = `https://api.telegram.org/bot${tokenInput.value}/getUpdates`;
    };
    tokenInput.oninput = updateLink;
    updateLink();

    // --- Toggle Password ---
    panel.querySelector('.tg-toggle-pass').onclick = function() {
        const type = tokenInput.type === 'password' ? 'text' : 'password';
        tokenInput.type = type;
        this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    };

    // --- Actions ---
    panel.querySelector('.tg-close-btn').onclick = () => panel.classList.remove('active');

    panel.querySelector('#tg-save-btn').onclick = () => {
        const config = {
            botToken: document.getElementById('tg-bot-token').value,
            chatId: document.getElementById('tg-chat-id').value,
            isActive: document.getElementById('tg-is-active').checked
        };
        localStorage.setItem('islamiya_telegram_config', JSON.stringify(config));
        
        // Update WhatsApp Phone
        const newPhone = document.getElementById('tg-wa-phone').value;
        const settings = JSON.parse(localStorage.getItem('islamiya_settings') || '{}');
        settings.phone1 = newPhone;
        localStorage.setItem('islamiya_settings', JSON.stringify(settings));

        alert('✓ تم حفظ الإعدادات');
        // location.reload(); // Removed reload
    };

    panel.querySelector('#tg-test-btn').onclick = async function() {
        const token = document.getElementById('tg-bot-token').value;
        const chat = document.getElementById('tg-chat-id').value;
        const status = document.getElementById('tg-test-status');
        
        if (!token || !chat) {
            status.innerHTML = '<span style="color:var(--edit-danger)">✗ أدخل الرمز والمعرف أولاً</span>';
            return;
        }

        this.disabled = true;
        status.innerText = 'جاري الاختبار...';

        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chat,
                    text: '✅ اختبار من موقع الإسلامية للموبيليا — الاتصال يعمل بنجاح'
                })
            });
            if (resp.ok) {
                status.innerHTML = '<span style="color:#4CAF50">✓ الاتصال ناجح! تفقد التليجرام</span>';
            } else {
                throw new Error();
            }
        } catch (e) {
            status.innerHTML = '<span style="color:var(--edit-danger)">✗ فشل الاتصال. تحقق من البيانات</span>';
        }
        this.disabled = false;
    };

    // --- Pending Actions ---
    if (pending.length > 0) {
        panel.querySelectorAll('.tg-retry-btn').forEach(btn => {
            btn.onclick = async () => {
                const card = btn.closest('.tg-pending-card');
                const id = parseInt(card.dataset.id);
                const msg = pending.find(m => m.id === id);
                if (!msg) return;

                btn.disabled = true;
                try {
                    // We need the config again
                    const cfg = JSON.parse(localStorage.getItem('islamiya_telegram_config'));
                    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
                    const now = new Date(msg.timestamp);
                    const formattedTime = now.toLocaleString('ar-EG');
                    
                    const text = `🛋 *رسالة معلقة تم إعادتها*\n\n👤 *الاسم:* ${msg.name}\n📞 *الهاتف:* ${msg.phone}\n💬 *الرسالة:* ${msg.message}\n\n⏰ *وقت الإرسال الأصلي:* ${formattedTime}`;
                    
                    const resp = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'Markdown' })
                    });
                    
                    if (resp.ok) {
                        const newPending = pending.filter(m => m.id !== id);
                        localStorage.setItem('islamiya_pending_messages', JSON.stringify(newPending));
                        card.remove();
                        if (newPending.length === 0) showTelegramPanel(); // refresh UI
                    } else { alert('فشل الإرسال مجدداً'); }
                } catch (e) { alert('خطأ في الاتصال'); }
                btn.disabled = false;
            };
        });

        panel.querySelectorAll('.tg-delete-btn').forEach(btn => {
            btn.onclick = () => {
                const card = btn.closest('.tg-pending-card');
                const id = parseInt(card.dataset.id);
                const newPending = pending.filter(m => m.id !== id);
                localStorage.setItem('islamiya_pending_messages', JSON.stringify(newPending));
                card.remove();
                if (newPending.length === 0) showTelegramPanel(); // refresh UI
            };
        });

        panel.querySelector('#tg-export-btn').onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pending, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `pending-messages-${new Date().toISOString().split('T')[0]}.json`);
            dlAnchorElem.click();
        };

        panel.querySelector('#tg-resend-all-btn').onclick = async function() {
            this.disabled = true;
            const btns = panel.querySelectorAll('.tg-retry-btn');
            for (let b of btns) {
                b.click();
                await new Promise(r => setTimeout(r, 1000));
            }
            this.disabled = false;
        };
    }
} // end showTelegramPanel
