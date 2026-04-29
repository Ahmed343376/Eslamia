document.addEventListener("DOMContentLoaded", () => {
    const galleryGrid = document.getElementById("gallery-grid");
    const filterButtons = document.querySelectorAll(".filter-bar button");

    // Initialize GLightbox
    let lightbox = GLightbox({
        selector: '.glightbox',
        touchNavigation: true,
        loop: true,
    });

    // 1. Define default products directly to bypass CORS issues on local viewing
    let defaultProducts = [
        {"id":1,"name":"طقم نوم كلاسيك فاخر","category":"غرف النوم","categoryEn":"bedroom","image":"https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1000&auto=format&fit=crop","description":"طقم غرفة نوم بخامات ممتازة وتصميم ملكي","materials":"خشب زان روماني، قماش مخمل مستورد، حفر يدوي","price":"١٤٥,٠٠٠ ج.م"},
        {"id":2,"name":"سرير مودرن مع التسريحة","category":"غرف النوم","categoryEn":"bedroom","image":"https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=1000&auto=format&fit=crop","description":"تصميم عصري بلمسة ذهبية","materials":"خشب كونتر طبيعي، ستانلس ستيل مذهب، إضاءة ليد مخفية","price":"٨٥,٠٠٠ ج.م"},
        {"id":3,"name":"غرفة نوم شبابية","category":"غرف النوم","categoryEn":"bedroom","image":"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop","description":"تصميم عملي وأنيق للشباب","materials":"خشب موسكي، دهانات دوكو فرن، زجاج فوميه","price":"٥٥,٠٠٠ ج.م"},
        {"id":4,"name":"ركنة مخمل ملكية","category":"غرف المعيشة","categoryEn":"living","image":"https://images.unsplash.com/photo-1550226891-ef816aed4a98?q=80&w=1000&auto=format&fit=crop","description":"ركنة مخمل بألوان هادئة","materials":"اسفنج سوبر سوفت كثافة 36، قماش قطيفة تركي، شاسيه زان","price":"٤٨,٥٠٠ ج.م"},
        {"id":5,"name":"كنبة L شكل فاخرة","category":"غرف المعيشة","categoryEn":"living","image":"https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop","description":"تصميم راقي يناسب المساحات الكبيرة","materials":"قماش كتان معالج ضد البقع، مخدات فايبر رول، قواعد معدنية","price":"٣٥,٠٠٠ ج.م"},
        {"id":6,"name":"طقم استقبال كلاسيك","category":"غرف المعيشة","categoryEn":"living","image":"https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1000&auto=format&fit=crop","description":"أثاث ملكي بزخارف ذهبية","materials":"خشب زان أحمر، دهان ورق دهب فرنساوي، تنجيد كابوتونيه","price":"١٢٠,٠٠٠ ج.م"},
        {"id":7,"name":"سفرة 8 كراسي خشب","category":"غرف الطعام","categoryEn":"dining","image":"https://images.unsplash.com/photo-1617806118233-18e1c094ddcb?q=80&w=1000&auto=format&fit=crop","description":"طاولة سفرة من الخشب الصلب","materials":"خشب أرو ماسيف، قماش جلد مقلوب، زجاج سيكوريت 10مم","price":"٩٥,٠0٠ ج.م"},
        {"id":8,"name":"سفرة زجاج وستانلس","category":"غرف الطعام","categoryEn":"dining","image":"https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=1000&auto=format&fit=crop","description":"تصميم مودرن بزجاج مقسى","materials":"قواعد ستانلس ستيل عيار 304، كراسي مخمل، زجاج كريستال","price":"٧٢,٠٠٠ ج.م"},
        {"id":9,"name":"سفرة كلاسيك منحوتة","category":"غرف الطعام","categoryEn":"dining","image":"https://images.unsplash.com/photo-1595521624992-48a59aef95e3?q=80&w=1000&auto=format&fit=crop","description":"منحوتات يدوية على الخشب","materials":"خشب زان معالج، دهانات بوليستر، تنجيد مستورد عالي الجودة","price":"١١٠,٠٠٠ ج.م"},
        {"id":10,"name":"مكتب تنفيذي فاخر","category":"المكاتب","categoryEn":"office","image":"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop","description":"مكتب واسع بأدراج متعددة","materials":"MDF اسباني مكسي قشرة جوز ترك، تطعيمات جلد طبيعي","price":"٤٢,٠٠٠ ج.م"},
        {"id":11,"name":"مكتبة خشبية كلاسيك","category":"المكاتب","categoryEn":"office","image":"https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1000&auto=format&fit=crop","description":"مكتبة بخشب الزان الفاخر","materials":"خشب زان روماني، إضاءة داخلية، مقابض نحاسية","price":"٣٨,٥٠٠ ج.م"},
        {"id":12,"name":"طقم استقبال رسمي","category":"الاستقبال","categoryEn":"reception","image":"https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop","description":"طقم استقبال لمكاتب وشركات","materials":"جلد طبيعي ايطالي، شاسيه معدني مقوى، اسفنج حقن","price":"٦٥,٠٠٠ ج.م"}
    ];

    // ✅ READ FROM LOCALSTORAGE FIRST (admin edits), fallback to defaultProducts
    const PRODUCTS_KEY = 'islamiya_products';
    const storedProducts = localStorage.getItem(PRODUCTS_KEY);
    let productsData = storedProducts ? JSON.parse(storedProducts) : defaultProducts;
    
    // Also expose globally so admin panel can update gallery live
    window._galleryProducts = productsData;
    window._galleryRenderFn = function(products) {
        renderCategories(products);
        renderGallery(products);
    };
    
    window.addNewProduct = function() {
        const newId = Date.now(); // unique ID
        const newProduct = {
            id: newId,
            name: "منتج جديد",
            category: "الكل",
            categoryEn: "all",
            image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop",
            description: "وصف المنتج الجديد",
            materials: "خشب زان",
            price: "٠ ج.م"
        };
        window._galleryProducts.unshift(newProduct);
        localStorage.setItem('islamiya_products', JSON.stringify(window._galleryProducts));
        window._galleryRenderFn(window._galleryProducts);
    };

    window.deleteProduct = function(id) {
        window._galleryProducts = window._galleryProducts.filter(p => p.id != id);
        localStorage.setItem('islamiya_products', JSON.stringify(window._galleryProducts));
        window._galleryRenderFn(window._galleryProducts);
    };

    window.moveProduct = function(id, direction) {
        const index = window._galleryProducts.findIndex(p => p.id == id);
        if (index === -1) return;
        
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= window._galleryProducts.length) return;
        
        // Swap
        const temp = window._galleryProducts[index];
        window._galleryProducts[index] = window._galleryProducts[newIndex];
        window._galleryProducts[newIndex] = temp;
        
        localStorage.setItem('islamiya_products', JSON.stringify(window._galleryProducts));
        window._galleryRenderFn(window._galleryProducts);
    };
    
    renderCategories(productsData);
    renderGallery(productsData);

    // Modal Elements
    const productModal = document.getElementById("product-modal");
    const modalBackdrop = productModal.querySelector(".modal-backdrop");
    const closeModalBtn = document.getElementById("close-modal");
    const modalImage = document.getElementById("modal-image");
    const modalCategory = document.getElementById("modal-category");
    const modalTitle = document.getElementById("modal-title");
    const modalDescription = document.getElementById("modal-description");
    const modalMaterials = document.getElementById("modal-materials");
    const modalPrice = document.getElementById("modal-price");

    function openModal(product) {
        // Populate Data
        modalImage.src = product.image;
        modalImage.alt = product.name;
        modalCategory.textContent = product.category;
        modalTitle.textContent = product.name;
        
        // Dynamic Edit Keys for Visual CMS
        modalImage.dataset.editable = "image";
        modalImage.dataset.editKey = `product_${product.id}_image`;
        modalCategory.dataset.editable = "text";
        modalCategory.dataset.editKey = `product_${product.id}_category`;
        modalTitle.dataset.editable = "text";
        modalTitle.dataset.editKey = `product_${product.id}_name`;
        modalDescription.dataset.editable = "long-text";
        modalDescription.dataset.editKey = `product_${product.id}_description`;
        modalMaterials.dataset.editable = "text";
        modalMaterials.dataset.editKey = `product_${product.id}_materials`;
        modalPrice.dataset.editable = "text";
        modalPrice.dataset.editKey = `product_${product.id}_price`;
        
        // Parse Editor.js JSON or fallback to text
        try {
            const descData = JSON.parse(product.description);
            if (descData && descData.blocks) {
                let html = '';
                descData.blocks.forEach(block => {
                    if (block.type === 'paragraph') html += `<p class="mb-2">${block.data.text}</p>`;
                    else if (block.type === 'header') html += `<h${block.data.level} class="font-bold text-[#C9A84C] mb-2 mt-4 text-${block.data.level === 2 ? '2xl' : 'xl'}">${block.data.text}</h${block.data.level}>`;
                    else if (block.type === 'list') {
                        const listTag = block.data.style === 'ordered' ? 'ol' : 'ul';
                        const listClass = block.data.style === 'ordered' ? 'list-decimal' : 'list-disc';
                        html += `<${listTag} class="${listClass} mr-5 pr-5 mb-2">`;
                        block.data.items.forEach(item => html += `<li>${item}</li>`);
                        html += `</${listTag}>`;
                    }
                    else if (block.type === 'image') {
                        html += `<img src="${block.data.file.url}" class="w-full rounded-lg my-4" />`;
                    }
                });
                modalDescription.innerHTML = html;
            } else {
                modalDescription.innerHTML = product.description;
            }
        } catch (e) {
            modalDescription.innerHTML = product.description || "";
        }

        modalMaterials.textContent = product.materials || "غير متوفر";
        modalPrice.textContent = product.price || "تواصل لمعرفة السعر";

        // Show Modal
        productModal.classList.remove("hidden");
        // Trigger layout reflow
        void productModal.offsetWidth;
        productModal.classList.remove("opacity-0");
        productModal.querySelector('.modal-content').classList.remove("scale-95");
        productModal.querySelector('.modal-content').classList.add("scale-100");
        
        if (window.reinitEditor) window.reinitEditor();
    }

    function closeModal() {
        productModal.classList.add("opacity-0");
        productModal.querySelector('.modal-content').classList.remove("scale-100");
        productModal.querySelector('.modal-content').classList.add("scale-95");
        setTimeout(() => {
            productModal.classList.add("hidden");
            modalImage.src = ""; // Clear memory
        }, 300);
    }

    // Attach Close Listeners
    closeModalBtn.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", closeModal);

    function renderGallery(products) {
        galleryGrid.innerHTML = `
            <div class="add-product-btn product-card bg-transparent border-2 border-dashed border-[#C9A84C]/40 rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[300px] mb-6 shadow-none transition-colors hover:border-[#C9A84C] cursor-pointer hidden text-[#C9A84C]/70 hover:text-[#C9A84C]">
                <span class="material-symbols-outlined text-5xl mb-4">add_circle</span>
                <span class="font-h2-ar text-xl">إضافة منتج جديد</span>
            </div>
        `;
        
        const addBtn = galleryGrid.querySelector('.add-product-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if(window.addNewProduct) window.addNewProduct();
            });
        }
        
        products.forEach((product, index) => {
            const card = document.createElement("div");
            card.className = "product-card bg-[#141830] border border-[#C9A84C]/20 rounded-lg overflow-hidden group mb-6 relative break-inside-avoid shadow-lg transition-colors hover:border-[#C9A84C]/60 cursor-pointer";
            card.dataset.category = product.category;
            
            card.innerHTML = `
                <div class="block relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#141830] to-[#0A0F2C]">
                    <div class="move-product-btns absolute top-3 left-3 z-[60] hidden flex-col gap-2">
                        <button class="move-up-btn bg-[#C9A84C]/90 text-primary-container rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C9A84C] hover:scale-110 transition shadow-lg" data-product-id="${product.id}" title="تحريك لأعلى">
                            <span class="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                        <button class="move-down-btn bg-[#C9A84C]/90 text-primary-container rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C9A84C] hover:scale-110 transition shadow-lg" data-product-id="${product.id}" title="تحريك لأسفل">
                            <span class="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                    </div>
                    <button class="delete-product-btn absolute top-3 right-3 z-[60] bg-red-600/90 text-white rounded-full w-10 h-10 hidden flex items-center justify-center hover:bg-red-700 hover:scale-110 transition shadow-lg" data-product-id="${product.id}" title="حذف المنتج">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <div class="card-image w-full h-full relative">
                        <img src="${product.image}" alt="${product.name}" data-editable="image" data-edit-key="product_${product.id}_image"
                             class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                             onerror="this.parentElement.classList.add('placeholder'); this.style.display='none';"/>
                        <span class="placeholder-text hidden absolute inset-0 flex items-center justify-center text-[#C9A84C] font-h1-ar text-xl z-10">${product.name}</span>
                    </div>
                    <div class="card-overlay absolute inset-0 bg-[#0A0F2C]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 pointer-events-none">
                        <span class="zoom-icon text-white text-4xl material-symbols-outlined drop-shadow-md">visibility</span>
                    </div>
                </div>
                <div class="card-info p-5 border-t border-[#C9A84C]/10 flex justify-between items-end">
                    <div class="flex-1" style="z-index: 30; position: relative;">
                        <h3 class="font-h2-ar text-[#C9A84C] text-xl mb-2" data-editable="text" data-edit-key="product_${product.id}_name">${product.name}</h3>
                        <span class="category-badge text-xs text-on-surface-variant font-label-caps uppercase border border-[#C9A84C]/30 px-3 py-1 rounded-full" data-editable="text" data-edit-key="product_${product.id}_category">${product.category}</span>
                    </div>
                    <div class="text-[#C9A84C] font-bold text-lg" style="z-index: 30; position: relative;" data-editable="text" data-edit-key="product_${product.id}_price">${product.price || ''}</div>
                </div>
            `;
            
            card.querySelector('.card-overlay').addEventListener("click", () => {
                openModal(product);
            });
            
            const delBtn = card.querySelector('.delete-product-btn');
            if (delBtn) {
                delBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if(confirm("هل أنت متأكد من حذف هذا المنتج؟") && window.deleteProduct) {
                        window.deleteProduct(product.id);
                    }
                });
            }

            const moveUpBtn = card.querySelector('.move-up-btn');
            if (moveUpBtn) {
                moveUpBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if(window.moveProduct) window.moveProduct(product.id, -1);
                });
            }

            const moveDownBtn = card.querySelector('.move-down-btn');
            if (moveDownBtn) {
                moveDownBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if(window.moveProduct) window.moveProduct(product.id, 1);
                });
            }

            galleryGrid.appendChild(card);
        });



        // GSAP ScrollTrigger Entrance
        gsap.from(".product-card", {
            opacity: 0,
            y: 40,
            scale: 0.9,
            duration: 0.6,
            stagger: 0.08,
            ease: "back.out(1.2)",
            clearProps: "all"
        });
        
        if (window.reinitEditor) window.reinitEditor();
    }

    function renderCategories(products) {
        const filterBar = document.getElementById("dynamic-filter-bar");
        if (!filterBar) return;
        
        // Extract unique categories
        const categories = [...new Set(products.map(p => p.category))];
        
        // Keep the 'الكل' button, remove others
        filterBar.innerHTML = `<button data-filter="الكل" class="bg-[#C9A84C] text-primary-container active" data-edit-key="cat_all">الكل</button>`;
        
        categories.forEach(cat => {
            if(!cat) return;
            const btn = document.createElement("button");
            btn.dataset.filter = cat;
            btn.className = "bg-[#141830] text-[#C9A84C] hover:border-[#C9A84C]/60";
            btn.textContent = cat;
            btn.dataset.editable = "text";
            btn.dataset.editKey = `category_${cat}`;
            filterBar.appendChild(btn);
        });
        
        if (window.reinitEditor) window.reinitEditor();

        // Re-attach filter listeners
        const newFilterButtons = document.querySelectorAll(".filter-bar button");
        newFilterButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const filter = btn.dataset.filter;
                
                // Update active button classes
                newFilterButtons.forEach(b => {
                    b.classList.remove("bg-[#C9A84C]", "text-primary-container", "active");
                    b.classList.add("bg-[#141830]", "text-[#C9A84C]", "hover:border-[#C9A84C]/60");
                });
                btn.classList.remove("bg-[#141830]", "text-[#C9A84C]", "hover:border-[#C9A84C]/60");
                btn.classList.add("bg-[#C9A84C]", "text-primary-container", "active");

                const cards = document.querySelectorAll(".product-card");
                
                // Animate out non-matching
                gsap.to(cards, {
                    opacity: 0,
                    scale: 0.8,
                    duration: 0.3,
                    onComplete: () => {
                        cards.forEach(card => {
                            if (filter === "الكل" || card.dataset.category === filter) {
                                card.style.display = "block";
                                gsap.fromTo(card, 
                                    {opacity: 0, scale: 0.8}, 
                                    {opacity: 1, scale: 1, duration: 0.4, clearProps: "all"}
                                );
                            } else {
                                card.style.display = "none";
                            }
                        });
                        lightbox.reload();
                    }
                });
            });
        });

        // Handle URL parameters for initial filter (e.g., from collections page)
        const urlParams = new URLSearchParams(window.location.search);
        const initialFilter = urlParams.get('filter');
        if (initialFilter) {
            setTimeout(() => {
                const matchingBtn = Array.from(newFilterButtons).find(b => b.dataset.filter === initialFilter);
                if (matchingBtn) {
                    matchingBtn.click();
                }
            }, 300); // slight delay for rendering
        }
    }
});
