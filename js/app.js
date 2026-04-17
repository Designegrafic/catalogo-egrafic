document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    const appContainer = document.getElementById('app');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // Parámetro "cache buster" para evitar carga de JSON viejos
    const cacheBuster = `?v=${Date.now()}`;

    // Función para obtener productos individuales (.md) desde el Front-End
    async function loadProducts() {
        let filesFound = [];
        try {
            // 1. Escaneo vía API de GitHub para Netlify/Producción
            const ghRes = await fetch('https://api.github.com/repos/Designegrafic/catalogo-egrafic/contents/content/productos');
            if (ghRes.ok) {
                const arr = await ghRes.json();
                filesFound = arr.filter(f => f.name.endsWith('.md')).map(f => f.name);
            } else {
                // 2. Intento local (Live Server directory listing fallback)
                const localRes = await fetch('content/productos/');
                if (localRes.ok) {
                    const text = await localRes.text();
                    const matches = [...text.matchAll(/href="([^"]+\.md)"/gi)];
                    filesFound = matches.map(m => m[1].split('/').pop()); 
                }
            }
        } catch (e) {
            console.warn("No se pudo listar el directorio dinámicamente:", e);
        }

        // 3. Fallback de archivos fijos migrados
        if (filesFound.length === 0) {
            filesFound = [
                '1-identidad-de-marca.md', 
                '2-sitio-web-corporativo.md', 
                '3-gestion-de-redes-sociales.md', 
                '4-papeleria-premium.md'
            ];
        }

        // Proceso de lectura y mapeo
        const productsList = [];
        for (const filename of [...new Set(filesFound)]) {
            try {
                const mdRes = await fetch(`content/productos/${filename}${cacheBuster}`);
                if (mdRes.ok) {
                    const text = await mdRes.text();
                    // Extraer Frontmatter (YAML)
                    const fmMatch = text.match(/---\r?\n([\s\S]*?)\r?\n---/);
                    if (fmMatch) {
                        const lines = fmMatch[1].split(/\r?\n/);
                        const product = {};
                        let currentKey = '';
                        
                        lines.forEach(line => {
                            if (line.startsWith(' ') || line.startsWith('\t')) {
                                if (currentKey) product[currentKey] += ' ' + line.trim();
                            } else if (line.trim().length > 0) {
                                const sepIndex = line.indexOf(':');
                                if (sepIndex > 0) {
                                    currentKey = line.substring(0, sepIndex).trim();
                                    let val = line.substring(sepIndex + 1).trim();
                                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                                        val = val.substring(1, val.length - 1);
                                    }
                                    product[currentKey] = val;
                                }
                            }
                        });
                        productsList.push(product);
                    }
                }
            } catch(e) {}
        }
        return productsList;
    }

    // Cargar Configuración y Productos en paralelo
    Promise.all([
        fetch(`data/config.json${cacheBuster}`).then(res => {
            if (!res.ok) throw new Error('Network response was not ok for config.json');
            return res.json();
        }),
        loadProducts()
    ])
    .then(([config, products]) => {
        window.appConfig = config;
        
        // Renderizado dinámico del Header (Logo y Título)
        const logoContainer = document.getElementById('header-logo-container');
        const titleEl = document.getElementById('header-title');
        
        if (config.company_name) {
            if (titleEl) titleEl.textContent = config.company_name;
            document.title = `Catálogo ${config.company_name}`;
        }
        
        // Configuraciones de Apariencia
        const appearance = config.appearance || {};
        const logoPath = appearance.logo || config.logo; // retrocompatibilidad
        
        if (appearance.accent_color) {
            document.documentElement.style.setProperty('--accent-color', appearance.accent_color);
        }
        
        if (appearance.header_align) {
            const header = document.querySelector('header');
            if (header) {
                header.style.textAlign = appearance.header_align;
                logoContainer.style.justifyContent = appearance.header_align === 'left' ? 'flex-start' : 
                                                   appearance.header_align === 'right' ? 'flex-end' : 'center';
            }
        }
        
        if (logoPath) {
            const img = document.createElement('img');
            img.src = logoPath;
            img.alt = config.company_name || 'Logo corporativo';
            img.className = 'site-logo';
            if (appearance.logo_width) {
                img.style.maxWidth = `${appearance.logo_width}px`;
                img.style.width = '100%'; 
                img.style.maxHeight = 'none';
            }
            if (logoContainer) {
                logoContainer.innerHTML = '';
                logoContainer.appendChild(img);
            }
        }
        
        // Configuraciones de Textos
        const texts = config.texts || {};
        const subtitleEl = document.getElementById('header-subtitle');
        const footerEl = document.getElementById('footer-text');
        window.appConfig.buttonLabel = texts.button_label || 'Cotizar ahora';
        
        if (subtitleEl) {
            subtitleEl.textContent = texts.main_title || 'Catálogo Minimalista';
        }
        
        if (texts.description) {
            let descEl = document.getElementById('header-description');
            if (!descEl) {
                descEl = document.createElement('p');
                descEl.id = 'header-description';
                descEl.style.color = 'var(--text-color)';
                descEl.style.marginTop = '0.5rem';
                descEl.style.fontSize = '0.95rem';
                document.querySelector('header').appendChild(descEl);
            }
            descEl.textContent = texts.description;
        }
        
        if (footerEl) {
            footerEl.innerHTML = texts.footer_text || '&copy; ' + new Date().getFullYear() + ' E-Grafic';
        }
        
        // WhatsApp link
        const floatingWa = document.getElementById('floating-wa');
        if (floatingWa) {
            const phone = config.whatsapp || '+593959127634';
            floatingWa.href = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent('Hola E-Grafic, vengo desde su Catálogo móvil y deseo una cotización.')}`;
        }

        // Asignación de Productos y quitar loader
        allProducts = products || [];
        
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }

        renderCategories(allProducts);
        renderProducts(allProducts);

    })
    .catch(err => {
        console.error('Error inicializando el catálogo:', err);
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="text-align:center; padding:3rem; color:var(--text-color);">
                    <h2 style="color:red; margin-bottom:1rem;">Problema de Conexión</h2>
                    <p>No se pudieron cargar los datos del catálogo. Por favor, revisa tu conexión y vuelve a intentarlo.</p>
                    <button onclick="window.location.reload()" style="margin-top:1.5rem; padding:10px 20px; border-radius:5px; background:var(--accent-color, #128C7E); color:white; border:none; cursor:pointer;">Recargar Página</button>
                </div>
            `;
        }
    });

    function renderCategories(products) {
        const menuContainer = document.getElementById('category-menu');
        const categoriesDef = window.appConfig.categories || [];
        
        // Mapeo útil de categorías (hacia nombres visuales, orden e iconos)
        const catMap = {};
        categoriesDef.forEach(c => {
            catMap[c.id] = { name: c.name, order: c.order || 0 };
        });

        // Agrupar IDs por los que tienen productos
        const usedCategories = {};
        products.forEach(p => {
            if (!usedCategories[p.category]) usedCategories[p.category] = new Set();
            if (p.subcategory) usedCategories[p.category].add(p.subcategory);
        });

        // Ordenamiento natural o por peso predefinido en config
        let sortedCatIds = Object.keys(usedCategories);
        if (categoriesDef.length > 0) {
            sortedCatIds.sort((a, b) => {
                const orderA = catMap[a] ? catMap[a].order : 999;
                const orderB = catMap[b] ? catMap[b].order : 999;
                return orderA - orderB;
            });
        }

        menuContainer.innerHTML = '';
        
        // Toggle de vistas
        const allBtn = document.createElement('div');
        allBtn.className = 'category-group';
        allBtn.innerHTML = '<div class="category-name" style="color: var(--accent-color)">Mostrar Todo</div>';
        allBtn.addEventListener('click', () => {
            document.querySelectorAll('.subcategory-item').forEach(el => el.classList.remove('active'));
            renderProducts(allProducts);
        });
        menuContainer.appendChild(allBtn);

        sortedCatIds.forEach(catId => {
            const group = document.createElement('div');
            group.className = 'category-group open';
            
            const catNameDisplay = catMap[catId] ? catMap[catId].name : catId;
            const catHeader = document.createElement('div');
            catHeader.className = 'category-name';
            catHeader.textContent = catNameDisplay;
            catHeader.addEventListener('click', () => {
                group.classList.toggle('open');
                renderProducts(allProducts.filter(p => p.category === catId));
            });

            const subList = document.createElement('ul');
            subList.className = 'subcategory-list';
            
            usedCategories[catId].forEach(subName => {
                const subItem = document.createElement('li');
                subItem.className = 'subcategory-item';
                subItem.textContent = subName;
                subItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.subcategory-item').forEach(el => el.classList.remove('active'));
                    subItem.classList.add('active');
                    renderProducts(allProducts.filter(p => p.category === catId && p.subcategory === subName));
                });
                subList.appendChild(subItem);
            });

            group.appendChild(catHeader);
            group.appendChild(subList);
            menuContainer.appendChild(group);
        });
    }

    function renderProducts(products) {
        const app = document.getElementById('app');
        app.innerHTML = '';
        
        const categoriesDef = window.appConfig.categories || [];
        const catMap = {};
        categoriesDef.forEach(c => catMap[c.id] = c.name);
        
        if(products.length === 0) {
            app.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }

        products.forEach(p => {
            const card = document.createElement('article');
            card.className = 'product-card';
            
            const currency = window.appConfig?.currency || 'USD';
            const priceText = p.price ? `$${p.price} ${currency}` : 'Consultar precio';
            const catDisplay = catMap[p.category] || p.category;

            card.innerHTML = `
                <img src="${p.image}" alt="${p.title}" class="product-image" loading="lazy">
                <div class="product-info">
                    <span class="product-category">${catDisplay} | ${p.subcategory}</span>
                    <h2 class="product-title">${p.title}</h2>
                    <p style="font-size:0.95rem">${p.description}</p>
                    <span class="product-price">${priceText}</span>
                    <button class="btn-whatsapp">
                        <svg viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.098.824z"/></svg>
                        <span>${window.appConfig.buttonLabel}</span>
                    </button>
                </div>
            `;
            
            card.addEventListener('click', () => {
                const phone = window.appConfig?.whatsapp || '+593959127634';
                const msg = encodeURIComponent(`Hola, me interesa el servicio: ${p.title}`);
                window.open(`https://wa.me/${phone.replace('+','')}?text=${msg}`, '_blank');
            });

            app.appendChild(card);
        });
    }
});
