document.addEventListener("DOMContentLoaded", () => {
    const galleryGrid = document.getElementById("gallery-grid");
    const filterButtons = document.querySelectorAll(".filter-bar button");

    // Initialize GLightbox
    let lightbox = GLightbox({
        selector: '.glightbox',
        touchNavigation: true,
        loop: true,
    });

    // 1. Define default categories and products
    const defaultCategories = ["ركنة", "ركنة فاخرة", "كنبة بسرير قلاب", "كنبة بسرير سحب"];
    
    let defaultProducts = [
        {"id":1,"name":"ركنة نيو كلاسيك","category":"ركنة","image":"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop","description":"ركنة بتصميم عصري وألوان جذابة","materials":"خشب زان، اسفنج كثافة 35","price":"السعر عند الطلب"},
        {"id":2,"name":"ركنة فاخرة ملكية","category":"ركنة فاخرة","image":"https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1000&auto=format&fit=crop","description":"تصميم ملكي فخم للمساحات الكبيرة","materials":"خشب زان أحمر، دهان ذهبي، قماش تركي","price":"السعر عند الطلب"},
        {"id":3,"name":"كنبة سرير قلاب مودرن","category":"كنبة بسرير قلاب","image":"https://images.unsplash.com/photo-1550226891-ef816aed4a98?q=80&w=1000&auto=format&fit=crop","description":"كنبة عملية تتحول لسرير بآلية قلاب","materials":"ميكانيزم تركي، خشب موسكي","price":"السعر عند الطلب"},
        {"id":4,"name":"كنبة سرير سحب مريحة","category":"كنبة بسرير سحب","image":"https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=1000&auto=format&fit=crop","description":"توفير مساحة مع سهولة السحب لتحويلها لسرير","materials":"شاسيه معدني مقوى، قماش كتان معالج","price":"السعر عند الطلب"}
    ];

    // ✅ SYNC WITH FIREBASE
    const PRODUCTS_KEY = 'islamiya_products';
    let productsData = defaultProducts;
    let categoriesData = defaultCategories;
    
    // Function to load products and categories from Firebase
    function syncFromCloud() {
        if (typeof db !== 'undefined') {
            // Sync Categories
            db.ref('categories').on('value', (snapshot) => {
                const cloudCats = snapshot.val();
                if (cloudCats && Array.isArray(cloudCats)) {
                    categoriesData = cloudCats;
                    renderCategories();
                } else {
                    db.ref('categories').set(defaultCategories);
                }
            });

            // Sync Products
            db.ref('products').on('value', (snapshot) => {
                const cloudProducts = snapshot.val();
                if (cloudProducts && Array.isArray(cloudProducts)) {
                    productsData = cloudProducts;
                    window._galleryProducts = productsData;
                    renderGallery(productsData);
                } else {
                    db.ref('products').set(defaultProducts);
                }
            });
        } else {
            // Fallback for local dev
            renderCategories();
            renderGallery(productsData);
        }
    }
    
    syncFromCloud();

    // --- Category Management Functions ---
    window.addNewCategory = function() {
        const catName = prompt("أدخل اسم التصنيف الجديد:");
        if (catName && catName.trim() !== "") {
            if (categoriesData.includes(catName)) {
                alert("هذا التصنيف موجود بالفعل!");
                return;
            }
            categoriesData.push(catName);
            if (typeof db !== 'undefined') {
                db.ref('categories').set(categoriesData);
            }
        }
    };

    window.deleteCategory = function(catName) {
        if (catName === "الكل") return;
        if (confirm(`هل أنت متأكد من حذف تصنيف "${catName}"؟ (لن يتم حذف المنتجات التابعة له ولكن سيتم تغيير تصنيفها إلى "الكل")`)) {
            const index = categoriesData.indexOf(catName);
            if (index > -1) {
                categoriesData.splice(index, 1);
                // Update products that use this category
                productsData.forEach(p => {
                    if (p.category === catName) p.category = "الكل";
                });
                
                if (typeof db !== 'undefined') {
                    db.ref('categories').set(categoriesData);
                    db.ref('products').set(productsData);
                }
            }
        }
    };
    
    window.addNewProduct = function() {
        const newId = Date.now();
        const newProduct = {
            id: newId,
            name: "منتج جديد",
            category: categoriesData[0] || "الكل",
            image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop",
            description: "وصف المنتج الجديد",
            materials: "خشب زان",
            price: "السعر عند الطلب"
        };
        window._galleryProducts.unshift(newProduct);
        if (typeof db !== 'undefined') {
            db.ref('products').set(window._galleryProducts);
        }
    };

    window.deleteProduct = function(id) {
        window._galleryProducts = window._galleryProducts.filter(p => p.id != id);
        if (typeof db !== 'undefined') {
            db.ref('products').set(window._galleryProducts);
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
        }
    };

    // --- Rendering Logic ---

    function renderCategories() {
        const filterBar = document.getElementById("dynamic-filter-bar");
        if (!filterBar) return;
        
        filterBar.innerHTML = `
            <button data-filter="الكل" class="bg-[#C9A84C] text-primary-container active">الكل</button>
        `;
        
        categoriesData.forEach(cat => {
            const btn = document.createElement("button");
            btn.dataset.filter = cat;
            btn.className = "bg-[#141830] text-[#C9A84C] hover:border-[#C9A84C]/60 flex items-center gap-2 group relative";
            btn.innerHTML = `
                <span>${cat}</span>
                <span class="delete-cat-icon hidden material-symbols-outlined text-xs text-red-500 hover:text-red-700 transition" 
                      onclick="event.stopPropagation(); window.deleteCategory('${cat}')">cancel</span>
            `;
            filterBar.appendChild(btn);
        });

        // Add "Add Category" button (hidden by default, shown in admin mode via CSS)
        const addCatBtn = document.createElement("button");
        addCatBtn.id = "add-category-btn";
        addCatBtn.className = "bg-transparent border border-dashed border-[#C9A84C]/50 text-[#C9A84C] px-3 py-1 hidden flex items-center gap-1 hover:bg-[#C9A84C]/10";
        addCatBtn.innerHTML = `<span class="material-symbols-outlined text-sm">add_circle</span> إضافة تصنيف`;
        addCatBtn.onclick = window.addNewCategory;
        filterBar.appendChild(addCatBtn);
        
        // Re-attach filter listeners
        const newFilterButtons = document.querySelectorAll(".filter-bar button[data-filter]");
        newFilterButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const filter = btn.dataset.filter;
                newFilterButtons.forEach(b => {
                    b.classList.remove("bg-[#C9A84C]", "text-primary-container", "active");
                    b.classList.add("bg-[#141830]", "text-[#C9A84C]", "hover:border-[#C9A84C]/60");
                });
                btn.classList.remove("bg-[#141830]", "text-[#C9A84C]", "hover:border-[#C9A84C]/60");
                btn.classList.add("bg-[#C9A84C]", "text-primary-container", "active");

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
            });
        });

        // Initial filter from URL
        const urlParams = new URLSearchParams(window.location.search);
        const initialFilter = urlParams.get('filter');
        if (initialFilter) {
            setTimeout(() => {
                const matchingBtn = Array.from(newFilterButtons).find(b => b.dataset.filter === initialFilter);
                if (matchingBtn) matchingBtn.click();
            }, 300);
        }
        
        if (window.reinitEditor) window.reinitEditor();
    }

    function renderGallery(products) {
        const cloudContent = window._siteContent || {};
        const mergedProducts = products.map(p => {
            const pId = p.id;
            return {
                ...p,
                name: cloudContent[`product_${pId}_name`] || p.name,
                image: cloudContent[`product_${pId}_image`] || p.image,
                category: cloudContent[`product_${pId}_category`] || p.category,
                description: cloudContent[`product_${pId}_description`] || p.description,
                materials: cloudContent[`product_${pId}_materials`] || p.materials,
                price: cloudContent[`product_${pId}_price`] || p.price
            };
        });

        galleryGrid.innerHTML = `
            <div class="add-product-btn product-card bg-transparent border-2 border-dashed border-[#C9A84C]/40 rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[300px] mb-6 shadow-none transition-colors hover:border-[#C9A84C] cursor-pointer hidden text-[#C9A84C]/70 hover:text-[#C9A84C]">
                <span class="material-symbols-outlined text-5xl mb-4">add_circle</span>
                <span class="font-h2-ar text-xl">إضافة منتج جديد</span>
            </div>
        `;
        
        const addBtn = galleryGrid.querySelector('.add-product-btn');
        if (addBtn) addBtn.onclick = window.addNewProduct;
        
        mergedProducts.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card bg-[#141830] border border-[#C9A84C]/20 rounded-lg overflow-hidden group mb-6 relative break-inside-avoid shadow-lg transition-colors hover:border-[#C9A84C]/60 cursor-pointer";
            card.dataset.category = product.category;
            
            card.innerHTML = `
                <div class="block relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#141830] to-[#0A0F2C]">
                    <div class="move-product-btns absolute top-3 left-3 z-[60] hidden flex-col gap-2">
                        <button class="move-up-btn bg-[#C9A84C]/90 text-primary-container rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C9A84C] hover:scale-110 transition shadow-lg" onclick="event.stopPropagation(); window.moveProduct(${product.id}, -1)" title="تحريك لأعلى">
                            <span class="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                        <button class="move-down-btn bg-[#C9A84C]/90 text-primary-container rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C9A84C] hover:scale-110 transition shadow-lg" onclick="event.stopPropagation(); window.moveProduct(${product.id}, 1)" title="تحريك لأسفل">
                            <span class="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                    </div>
                    <button class="delete-product-btn absolute top-3 right-3 z-[60] bg-red-600/90 text-white rounded-full w-10 h-10 hidden flex items-center justify-center hover:bg-red-700 hover:scale-110 transition shadow-lg" onclick="event.stopPropagation(); if(confirm('حذف المنتج؟')) window.deleteProduct(${product.id})" title="حذف المنتج">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <div class="card-image w-full h-full relative" onclick="window.openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <img src="${product.image}" alt="${product.name}" data-editable="image" data-edit-key="product_${product.id}_image" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                    </div>
                    <div class="card-overlay absolute inset-0 bg-[#0A0F2C]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 pointer-events-none">
                        <span class="zoom-icon text-white text-4xl material-symbols-outlined drop-shadow-md">visibility</span>
                    </div>
                </div>
                <div class="card-info p-5 border-t border-[#C9A84C]/10 flex justify-between items-end">
                    <div class="flex-1">
                        <h3 class="font-h2-ar text-[#C9A84C] text-xl mb-2" data-editable="text" data-edit-key="product_${product.id}_name">${product.name}</h3>
                        <span class="category-badge text-xs text-on-surface-variant font-label-caps uppercase border border-[#C9A84C]/30 px-3 py-1 rounded-full" data-editable="text" data-edit-key="product_${product.id}_category">${product.category}</span>
                    </div>
                    <div class="text-[#C9A84C] font-bold text-lg" data-editable="text" data-edit-key="product_${product.id}_price">${product.price || ''}</div>
                </div>
            `;
            galleryGrid.appendChild(card);
        });

        gsap.from(".product-card", { opacity: 0, y: 40, scale: 0.9, duration: 0.6, stagger: 0.08, ease: "back.out(1.2)", clearProps: "all" });
        if (window.reinitEditor) window.reinitEditor();
    }

    // Modal Helper
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
        
        // Populate editable keys
        modalImage.dataset.editKey = `product_${product.id}_image`;
        modalCategory.dataset.editKey = `product_${product.id}_category`;
        modalTitle.dataset.editKey = `product_${product.id}_name`;
        modalDescription.dataset.editKey = `product_${product.id}_description`;
        modalMaterials.dataset.editKey = `product_${product.id}_materials`;
        modalPrice.dataset.editKey = `product_${product.id}_price`;

        try {
            const descData = JSON.parse(product.description);
            if (descData && descData.blocks) {
                let html = '';
                descData.blocks.forEach(block => {
                    if (block.type === 'paragraph') html += `<p class="mb-2">${block.data.text}</p>`;
                    else if (block.type === 'header') html += `<h${block.data.level} class="font-bold text-[#C9A84C] mb-2 mt-4 text-${block.data.level === 2 ? '2xl' : 'xl'}">${block.data.text}</h${block.data.level}>`;
                });
                modalDescription.innerHTML = html;
            } else {
                modalDescription.innerHTML = product.description;
            }
        } catch (e) {
            modalDescription.innerHTML = product.description || "";
        }

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
});
