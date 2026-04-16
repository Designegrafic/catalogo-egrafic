document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    
    // Cargar configuración de la app
    fetch('data/config.json')
        .then(res => res.json())
        .then(config => {
            window.appConfig = config;
            
            // Renderizado dinámico del Header (Logo y Título)
            const logoContainer = document.getElementById('header-logo-container');
            const titleEl = document.getElementById('header-title');
            
            if (config.company_name) {
                if (titleEl) titleEl.textContent = config.company_name;
                document.title = `Catálogo ${config.company_name}`;
            }
            
            // Configuraciones de Apariencia (si el objeto existe en JSON)
            const appearance = config.appearance || {};
            const logoPath = appearance.logo || config.logo; // retrocompatibilidad
            
            // 1. Color de Acento Dinámico
            if (appearance.accent_color) {
                document.documentElement.style.setProperty('--accent-color', appearance.accent_color);
            }
            
            // 2. Alineación Dinámica del Header
            if (appearance.header_align) {
                const header = document.querySelector('header');
                if (header) {
                    header.style.textAlign = appearance.header_align;
                    logoContainer.style.justifyContent = appearance.header_align === 'left' ? 'flex-start' : 
                                                       appearance.header_align === 'right' ? 'flex-end' : 'center';
                }
            }
            
            // 3. Modificador de Logo Dinámico
            if (logoPath) {
                const img = document.createElement('img');
                img.src = logoPath;
                img.alt = config.company_name || 'Logo corporativo';
                img.className = 'site-logo';
                // Si el ancho está definido en el CMS, lo aplicamos explícitamente y aflojamos el alto para evitar distorsión
                if (appearance.logo_width) {
                    img.style.maxWidth = `${appearance.logo_width}px`;
                    img.style.width = '100%'; 
                    img.style.maxHeight = 'none'; // Overrides CSS max-height restrictivo temporal
                }
                logoContainer.innerHTML = ''; // Limpiar el fallback (texto h1)
                logoContainer.appendChild(img);
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
            
            // Asignar Link de WhatsApp para Botón Flotante
            const floatingWa = document.getElementById('floating-wa');
            if (floatingWa) {
                const phone = config.whatsapp || '+593959127634';
                floatingWa.href = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent('Hola E-Grafic, vengo desde su Catálogo móvil y deseo una cotización.')}`;
            }
        })
        .catch(err => console.error('Error al cargar config:', err));

    // Cargar productos
    fetch('data/products.json')
        .then(res => res.json())
        .then(products => {
            allProducts = products;
            renderCategories(products);
            renderProducts(products);
        })
        .catch(err => console.error('Error al cargar productos:', err));

    function renderCategories(products) {
        const menuContainer = document.getElementById('category-menu');
        const categories = {};

        // Agrupar por categoría y subcategoría
        products.forEach(p => {
            if (!categories[p.category]) {
                categories[p.category] = new Set();
            }
            if (p.subcategory) {
                categories[p.category].add(p.subcategory);
            }
        });

        // Generar HTML del menú anidado
        menuContainer.innerHTML = '';
        
        // Botón para resetear filtros
        const allBtn = document.createElement('div');
        allBtn.className = 'category-group';
        allBtn.innerHTML = '<div class="category-name" style="color: var(--accent-color)">Mostrar Todo</div>';
        allBtn.addEventListener('click', () => {
            document.querySelectorAll('.subcategory-item').forEach(el => el.classList.remove('active'));
            renderProducts(allProducts);
        });
        menuContainer.appendChild(allBtn);

        Object.keys(categories).forEach(catName => {
            const group = document.createElement('div');
            group.className = 'category-group open';
            
            const catHeader = document.createElement('div');
            catHeader.className = 'category-name';
            catHeader.textContent = catName;
            catHeader.addEventListener('click', () => {
                group.classList.toggle('open');
                renderProducts(allProducts.filter(p => p.category === catName));
            });

            const subList = document.createElement('ul');
            subList.className = 'subcategory-list';
            
            categories[catName].forEach(subName => {
                const subItem = document.createElement('li');
                subItem.className = 'subcategory-item';
                subItem.textContent = subName;
                subItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.subcategory-item').forEach(el => el.classList.remove('active'));
                    subItem.classList.add('active');
                    renderProducts(allProducts.filter(p => p.category === catName && p.subcategory === subName));
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
        
        if(products.length === 0) {
            app.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }

        products.forEach(p => {
            const card = document.createElement('article');
            card.className = 'product-card';
            
            const currency = window.appConfig?.currency || 'USD';
            const priceText = p.price ? `$${p.price} ${currency}` : 'Consultar precio';

            card.innerHTML = `
                <img src="${p.image}" alt="${p.title}" class="product-image" loading="lazy">
                <div class="product-info">
                    <span class="product-category">${p.category} | ${p.subcategory}</span>
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
