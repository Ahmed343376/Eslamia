/**
 * gallery.js - Enhanced with robust event handling and Firebase sync
 */
document.addEventListener("DOMContentLoaded", () => {
    const galleryGrid = document.getElementById("gallery-grid");
    if (!galleryGrid) return;

    // Initialize GLightbox
    let lightbox = GLightbox({
        selector: '.glightbox',
        touchNavigation: true,
        loop: true,
    });

    // 1. Defaults
    const defaultCategories = ["ركنة", "ركنة فاخرة", "كنبة بسرير قلاب", "كنبة بسرير سحب"];
    let defaultProducts = [
        {"id":1,"name":"ركنة نيو كلاسيك","category":"ركنة","image":"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop","description":"ركنة بتصميم عصري وألوان جذابة","materials":"خشب زان، اسفنج كثافة 35","price":"السعر عند الطلب"},
        {"id":2,"name":"ركنة فاخرة ملكية","category":"ركنة فاخرة","image":"https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1000&auto=format&fit=crop","description":"تصميم ملكي فخم للمساحات الكبيرة","materials":"خشب زان أحمر، دهان ذهبي، قماش تركي","price":"السعر عند الطلب"},
        {"id":3,"name":"كنبة سرير قلاب مودرن","category":"كنبة بسرير قلاب","image":"https://images.unsplash.com/photo-1550226891-ef816aed4a98?q=80&w=1000&auto=format&fit=crop","description":"كنبة عملية تتحول لسرير بآلية قلاب","materials":"ميكانيزم تركي، خشب موسكي","price":"السعر عند الطلب"},
        {"id":4,"name":"كنبة سرير سحب مريحة","category":"كنبة بسرير سحب","image":"https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=1000&auto=format&fit=crop","description":"توفير مساحة مع سهولة السحب لتحويلها لسرير","materials":"شاسيه معدني مقوى، قماش كتان معالج","price":"السعر عند الطلب"}
    ];

    window._galleryProducts = defaultProducts;
    window._galleryCategories = defaultCategories;

    // 2. Sync Logic
    function syncFromCloud() {
        if (typeof db !== 'undefined') {
            // Sync Categories
            db.ref('categories').on('value', (snapshot) => {
                const cloudCats = snapshot.val();
                if (cloudCats && Array.isArray(cloudCats)) {
                    window._galleryCategories = cloudCats;
                    renderCategories();
                } else {
                    db.ref('categories').set(defaultCategories);
                }
            });

            // Sync Products
            db.ref('products').on('value', (snapshot) => {
                const cloudProducts = snapshot.val();
                if (cloudProducts && Array.isArray(cloudProducts)) {
                    window._galleryProducts = cloudProducts;
                    renderGallery(window._galleryProducts);
                } else {
                    db.ref('products').set(defaultProducts);
                }
            });
        } else {
            renderCategories();
            renderGallery(window._galleryProducts);
        }
    }

    // 3. Global Actions (Attached to window for absolute access)
    window.addNewCategory = function() {
        const catName = prompt("أدخل اسم التصنيف الجديد:");
        if (catName && catName.trim() !== "") {
            if (window._galleryCategories.includes(catName)) {
                alert("هذا التصنيف موجود بالفعل!");
                return;
            }
            window._galleryCategories.push(catName.trim());
            if (typeof db !== 'undefined') {
                db.ref('categories').set(window._galleryCategories);
            } else {
                renderCategories();
            }
        }
    };

    window.deleteCategory = function(catName) {
        if (catName === "الكل") return;
        if (confirm(`هل أنت متأكد من حذف تصنيف "${catName}"؟`)) {
            window._galleryCategories = window._galleryCategories.filter(c => c !== catName);
            // Update products category to "الكل" if they matched the deleted one
            window._galleryProducts.forEach(p => {
                if (p.category === catName) p.category = "الكل";
            });
            
            if (typeof db !== 'undefined') {
                db.ref('categories').set(window._galleryCategories);
                db.ref('products').set(window._galleryProducts);
            } else {
                renderCategories();
                renderGallery(window._galleryProducts);
            }
        }
    };

    window.addNewProduct = function() {
        const newId = Date.now();
        const newProduct = {
            id: newId,
            name: "منتج جديد",
            category: window._galleryCategories[0] || "الكل",
            image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop",
            description: "وصف المنتج الجديد",
            materials: "خشب زان",
            price: "السعر عند الطلب"
        };
        window._galleryProducts.unshift(newProduct);
        if (typeof db !== 'undefined') {
            db.ref('products').set(window._galleryProducts);
        } else {
            renderGallery(window._galleryProducts);
        }
    };

    window.deleteProduct = function(id) {
        if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
        window._galleryProducts = window._galleryProducts.filter(p => p.id != id);
        if (typeof db !== 'undefined') {
            db.ref('products').set(window._galleryProducts);
        } else {
            renderGallery(window._galleryProducts);
        }
    };

    window.moveProduct = function(id, direction) {
        const index = window._galleryProducts.findIndex(p => p.id == id);
        if (index === -1) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= window._galleryProducts.length) return;
        const temp = window._galleryProducts[index];
        window._galleryProducts[index] = window._galleryProducts[newIndex];
        window._galleryProducts[newIndex] = temp;
        if (typeof db !== 'undefined') {
            db.ref('products').set(window._galleryProducts);
        } else {
            renderGallery(window._galleryProducts);
        }
    };

    // 4. Rendering
    function renderCategories() {
        const filterBar = document.getElementById("dynamic-filter-bar");
        if (!filterBar) return;
        
        filterBar.innerHTML = '';
        
        // All button
        const allBtn = document.createElement("button");
        allBtn.dataset.filter = "الكل";
        allBtn.className = "bg-[#C9A84C] text-primary-container active";
        allBtn.textContent = "الكل";
        filterBar.appendChild(allBtn);
        
        window._galleryCategories.forEach(cat => {
            const btn = document.createElement("button");
            btn.dataset.filter = cat;
            btn.className = "bg-[#141830] text-[#C9A84C] hover:border-[#C9A84C]/60 flex items-center gap-2 group relative";
            
            const span = document.createElement("span");
            span.textContent = cat;
            btn.appendChild(span);

            const delIcon = document.createElement("span");
            delIcon.className = "delete-cat-icon material-symbols-outlined text-xs text-red-500 hover:text-red-700 transition hidden";
            delIcon.textContent = "cancel";
            delIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                window.deleteCategory(cat);
            });
            btn.appendChild(delIcon);
            
            filterBar.appendChild(btn);
        });

        // Add Category Button
        const addCatBtn = document.createElement("button");
        addCatBtn.id = "add-category-btn";
        addCatBtn.className = "bg-transparent border border-dashed border-[#C9A84C]/50 text-[#C9A84C] px-3 py-1 hidden flex items-center gap-1 hover:bg-[#C9A84C]/10";
        addCatBtn.innerHTML = `<span class="material-symbols-outlined text-sm">add_circle</span> إضافة تصنيف`;
        addCatBtn.addEventListener("click", window.addNewCategory);
        filterBar.appendChild(addCatBtn);

        // Re-attach filter logic
        const btns = filterBar.querySelectorAll("button[data-filter]");
        btns.forEach(btn => {
            btn.addEventListener("click", () => {
                const filter = btn.dataset.filter;
                btns.forEach(b => b.classList.remove("bg-[#C9A84C]", "text-primary-container", "active"));
                btn.classList.add("bg-[#C9A84C]", "text-primary-container", "active");
                filterProducts(filter);
            });
        });

        // Sync visibility with Admin Mode
        if (window.isEditMode) {
             document.querySelectorAll('.delete-cat-icon, #add-category-btn').forEach(el => el.classList.remove('hidden'));
        }
    }

    function filterProducts(filter) {
        const cards = document.querySelectorAll(".product-card");
        gsap.to(cards, {
            opacity: 0, scale: 0.8, duration: 0.3,
            onComplete: () => {
                cards.forEach(card => {
                    if (filter === "الكل" || card.dataset.category === filter) {
                        card.style.display = "block";
                        gsap.fromTo(card, {opacity: 0, scale: 0.8}, {opacity: 1, scale: 1, duration: 0.4, clearProps: "all"});
                    } else {
                        card.style.display = "none";
                    }
                });
                lightbox.reload();
            }
        });
    }

    function renderGallery(products) {
        galleryGrid.innerHTML = '';

        // Add Product Placeholder
        const addBox = document.createElement("div");
        addBox.className = "add-product-btn product-card bg-transparent border-2 border-dashed border-[#C9A84C]/40 rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[300px] mb-6 shadow-none transition-colors hover:border-[#C9A84C] cursor-pointer hidden text-[#C9A84C]/70 hover:text-[#C9A84C]";
        addBox.innerHTML = `<span class="material-symbols-outlined text-5xl mb-4">add_circle</span><span class="font-h2-ar text-xl">إضافة منتج جديد</span>`;
        addBox.addEventListener("click", window.addNewProduct);
        galleryGrid.appendChild(addBox);

        products.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card bg-[#141830] border border-[#C9A84C]/20 rounded-lg overflow-hidden group mb-6 relative break-inside-avoid shadow-lg transition-colors hover:border-[#C9A84C]/60 cursor-pointer";
            card.dataset.category = product.category;
            
            card.innerHTML = `
                <div class="card-media relative aspect-[4/3] overflow-hidden">
                    <div class="move-product-btns absolute top-3 left-3 z-[60] hidden flex-col gap-2">
                        <button class="m-up bg-[#C9A84C]/90 text-primary-container rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C9A84C]"><span class="material-symbols-outlined text-sm">arrow_upward</span></button>
                        <button class="m-down bg-[#C9A84C]/90 text-primary-container rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C9A84C]"><span class="material-symbols-outlined text-sm">arrow_downward</span></button>
                    </div>
                    <button class="del-prod-btn absolute top-3 right-3 z-[60] bg-red-600/90 text-white rounded-full w-10 h-10 hidden flex items-center justify-center hover:bg-red-700 transition shadow-lg">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                    <div class="card-overlay absolute inset-0 bg-[#0A0F2C]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 pointer-events-none">
                        <span class="zoom-icon text-white text-4xl material-symbols-outlined">visibility</span>
                    </div>
                </div>
                <div class="card-info p-5 border-t border-[#C9A84C]/10 flex justify-between items-end">
                    <div class="flex-1">
                        <h3 class="font-h2-ar text-[#C9A84C] text-xl mb-2">${product.name}</h3>
                        <span class="category-badge text-xs text-on-surface-variant font-label-caps uppercase border border-[#C9A84C]/30 px-3 py-1 rounded-full">${product.category}</span>
                    </div>
                    <div class="text-[#C9A84C] font-bold text-lg">${product.price || ''}</div>
                </div>
            `;

            // Event Listeners for buttons
            card.querySelector('.m-up').onclick = (e) => { e.stopPropagation(); window.moveProduct(product.id, -1); };
            card.querySelector('.m-down').onclick = (e) => { e.stopPropagation(); window.moveProduct(product.id, 1); };
            card.querySelector('.del-prod-btn').onclick = (e) => { e.stopPropagation(); window.deleteProduct(product.id); };
            card.onclick = () => window.openProductModal(product);

            galleryGrid.appendChild(card);
        });

        // Admin mode sync
        if (window.isEditMode) {
             document.querySelectorAll('.del-prod-btn, .move-product-btns, .add-product-btn').forEach(el => el.classList.remove('hidden'));
        }
        
        if (window.reinitEditor) window.reinitEditor();
    }

    // Modal
    window.openProductModal = function(product) {
        const modal = document.getElementById("product-modal");
        const modalImage = document.getElementById("modal-image");
        const modalCategory = document.getElementById("modal-category");
        const modalTitle = document.getElementById("modal-title");
        const modalDescription = document.getElementById("modal-description");
        const modalMaterials = document.getElementById("modal-materials");
        const modalPrice = document.getElementById("modal-price");

        modalImage.src = product.image;
        modalCategory.textContent = product.category;
        modalTitle.textContent = product.name;
        modalMaterials.textContent = product.materials || "غير متوفر";
        modalPrice.textContent = product.price || "تواصل لمعرفة السعر";
        
        modalImage.dataset.editKey = `product_${product.id}_image`;
        modalCategory.dataset.editKey = `product_${product.id}_category`;
        modalTitle.dataset.editKey = `product_${product.id}_name`;
        modalDescription.dataset.editKey = `product_${product.id}_description`;
        modalMaterials.dataset.editKey = `product_${product.id}_materials`;
        modalPrice.dataset.editKey = `product_${product.id}_price`;

        modalDescription.innerHTML = product.description || "";

        modal.classList.remove("hidden");
        setTimeout(() => modal.classList.remove("opacity-0"), 10);
        if (window.reinitEditor) window.reinitEditor();
    };

    window.closeProductModal = function() {
        const modal = document.getElementById("product-modal");
        modal.classList.add("opacity-0");
        setTimeout(() => modal.classList.add("hidden"), 300);
    };

    document.getElementById("close-modal").onclick = window.closeProductModal;
    document.querySelector(".modal-backdrop").onclick = window.closeProductModal;

    // Start
    syncFromCloud();
    window._galleryRenderFn = renderGallery; // For global access
});
