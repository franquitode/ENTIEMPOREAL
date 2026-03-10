document.addEventListener('DOMContentLoaded', () => {
    // 0. Historico para Badges de Fluctuación
    const priceHistory = {};

    function updateBadge(id, price) {
        const badgeEl = document.getElementById(`badge-${id}`);
        if (!badgeEl) return;

        const oldPrice = priceHistory[id];
        let pct = 0;
        if (oldPrice && oldPrice !== price) {
            pct = ((price - oldPrice) / oldPrice) * 100;
        }

        if (!oldPrice || oldPrice === price || pct === 0) {
            badgeEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">horizontal_rule</span><span>0.00%</span>`;
            badgeEl.className = "flex items-center gap-1 text-gray-500 text-sm font-medium bg-gray-500/10 w-fit px-2 py-0.5 rounded border border-gray-500/20 transition-all duration-300";
        } else if (pct > 0) {
            badgeEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">trending_up</span><span>+${pct.toFixed(2)}%</span>`;
            badgeEl.className = "flex items-center gap-1 text-green-500 text-sm font-medium bg-green-500/10 w-fit px-2 py-0.5 rounded border border-green-500/20 transition-all duration-300";
        } else if (pct < 0) {
            badgeEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">trending_down</span><span>${pct.toFixed(2)}%</span>`;
            badgeEl.className = "flex items-center gap-1 text-red-500 text-sm font-medium bg-red-500/10 w-fit px-2 py-0.5 rounded border border-red-500/20 transition-all duration-300";
        }
        priceHistory[id] = price;
    }

    // 1. Dark Mode Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const toggleAjustes = document.getElementById('toggle-oscuro-ajustes'); // Nuevo toggle en Ajustes
    const htmlElement = document.documentElement;

    const toggleDarkMode = () => {
        htmlElement.classList.toggle('dark');
        // Opcional: Estilizar visualmente el botón de ajustes si se requiere (o puede hacerlo CSS vía .dark)
    };

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    }
    if (toggleAjustes) {
        toggleAjustes.addEventListener('click', toggleDarkMode);
    }

    // 2. Fetch Dólares en vivo (DolarHoy vía Proxy con DOMParser)
    const btnActualizar = document.getElementById('btn-actualizar');
    const fechaActualizacion = document.getElementById('fecha-actualizacion');

    // Función Asíncrona para obtener precios de Yahoo Finance con fallback de proxies antibloqueo
    const obtenerPrecioYahoo = async (ticker) => {
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?url='
        ];
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d&nocache=${Date.now()}`;

        for (const proxy of proxies) {
            try {
                const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                // Extraer arreglo de precios de cierre para mayor estabilidad
                const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;

                if (!closes || !Array.isArray(closes) || closes.length === 0) {
                    throw new Error("Estructura JSON no reconocida (faltan arrays de close)");
                }

                // Filtrar nulos si hay huecos en el mercado
                const validCloses = closes.filter(p => p !== null && p !== undefined);
                if (validCloses.length === 0) throw new Error("No hay precios válidos.");

                // Obtener el último precio operado
                const price = validCloses[validCloses.length - 1];

                // Filtro estricto de seguridad para el SPY
                if (ticker === 'SPY' && (price > 1200 || price < 200)) {
                    throw new Error(`Aviso de Corrupción: Precio del SPY ilógico ($${price}). Abortando y probando siguiente proxy...`);
                }

                return price; // Retorna y corta la iteración en caso de éxito
            } catch (error) {
                console.error(`Proxy falló (${proxy}):`, error);
                continue;
            }
        }
        return undefined; // Retorna indeterminado si agotó todos los proxies sin suerte
    };

    const obtenerPrecioSPY = async () => {
        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 8000));
        const price = await Promise.race([obtenerPrecioYahoo('SPY'), timeout]);

        if (price !== undefined && price !== null && price > 0) {
            return { price: price, fallback: false };
        } else {
            return { price: 595.00, fallback: true };
        }
    };

    const cargarNoticias = async () => {
        const urlRSS = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.ambito.com%2Frss%2Fpages%2Ffinanzas.xml';
        const response = await fetch(urlRSS);
        if (!response.ok) throw new Error('Fallo al obtener RSS');
        const data = await response.json();
        return data.items || [];
    };

    const mostrarEsqueletos = (contenedorId, tipo) => {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        if (tipo === 'texto') {
            contenedor.innerHTML = '<div class="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block"></div>';
        } else if (tipo === 'noticias') {
            let skeletons = '';
            for (let i = 0; i < 6; i++) {
                skeletons += `
                    <div class="bg-white dark:bg-card-bg backdrop-blur-md rounded-xl p-5 border border-gray-200 dark:border-border-dark flex flex-col justify-start h-full shadow-lg">
                        <div class="mb-4 rounded-lg bg-gray-200 dark:bg-gray-700 h-40 w-full shrink-0 animate-pulse"></div>
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3 animate-pulse"></div>
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2 animate-pulse"></div>
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4 flex-grow animate-pulse"></div>
                        <div class="mt-auto h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    </div>
                `;
            }
            contenedor.innerHTML = skeletons;
        }
    };

    const updateDolares = async () => {
        try {
            // Animación de carga opcional al presionar el botón
            const btnIcon = btnActualizar?.querySelector('.material-symbols-outlined');
            if (btnIcon) btnIcon.classList.add('animate-spin');

            if (window.isFirstLoad === undefined) window.isFirstLoad = true;

            const animateUpdate = (el, val) => {
                if (!el) return;

                // Keep spans or inner HTML safely
                const oldHtml = el.innerHTML;
                if (window.isFirstLoad || val.includes('animate-pulse') || val === '---' || oldHtml === val) {
                    el.innerHTML = val;
                } else {
                    el.innerHTML = val;
                    el.classList.add('text-primary', 'dark:text-primary', 'scale-110', 'transition-all', 'duration-500');
                    setTimeout(() => el.classList.remove('text-primary', 'dark:text-primary', 'scale-110'), 800);
                }
            };
            const animateUpdateTextContent = (el, val) => {
                if (!el) return;
                const oldText = el.textContent;
                if (window.isFirstLoad || val === '---' || oldText === val) {
                    el.textContent = val;
                } else {
                    el.textContent = val;
                    el.classList.add('text-primary', 'dark:text-primary', 'scale-110', 'transition-all', 'duration-500');
                    setTimeout(() => el.classList.remove('text-primary', 'dark:text-primary', 'scale-110'), 800);
                }
            };

            if (window.isFirstLoad) {
                const idsACargar = [
                    'compra-oficial', 'venta-oficial', 'compra-tarjeta', 'venta-tarjeta',
                    'compra-blue', 'venta-blue', 'compra-mep', 'venta-mep',
                    'precio-cripto-compra', 'precio-cripto-venta',
                    'compra-euro', 'venta-euro', 'compra-real', 'venta-real',
                    'precio-spy', 'precio-spyd', 'panel-dolar-blue'
                ];
                idsACargar.forEach(id => mostrarEsqueletos(id, 'texto'));
                mostrarEsqueletos('contenedor-noticias', 'noticias');
            }

            const urls = {
                dolares: 'https://dolarapi.com/v1/dolares',
                cripto: 'https://dolarapi.com/v1/dolares/cripto',
                euro: 'https://dolarapi.com/v1/cotizaciones/eur',
                real: 'https://dolarapi.com/v1/cotizaciones/brl'
            };

            // Ejecutamos todos los fetchs simultáneamente, incluyendo las promesas de obtenerPrecioYahoo()
            const [resNoticias, resDolares, resCripto, resEuro, resReal, resSpy, resSpyd] = await Promise.allSettled([
                cargarNoticias(),
                fetch(urls.dolares).then(r => r.json()),
                fetch(urls.cripto).then(r => r.json()),
                fetch(urls.euro).then(r => r.json()),
                fetch(urls.real).then(r => r.json()),
                obtenerPrecioSPY(),
                obtenerPrecioYahoo('SPYD')
            ]);

            // 1. PROCESAR DÓLARES (vía DolarApi)
            let panelDolarBlueValue = '-';
            try {
                // Mapeo exacto identificadorDOM -> casaApi
                const casasTarget = [
                    { id: 'oficial', casa: 'oficial' },
                    { id: 'tarjeta', casa: 'tarjeta' },
                    { id: 'blue', casa: 'blue' },
                    { id: 'mep', casa: 'bolsa' }
                ];

                if (resDolares.status === 'fulfilled') {
                    const dolaresData = resDolares.value;

                    casasTarget.forEach(({ id, casa }) => {
                        const dataCasa = dolaresData.find(d => d.casa === casa);
                        const cEl = document.getElementById(`compra-${id}`);
                        const vEl = document.getElementById(`venta-${id}`);

                        if (dataCasa) {
                            let valCompra = Number(dataCasa.compra) || 0;
                            let valVenta = Number(dataCasa.venta) || 0;

                            // Invertir: El usuario quiere que COMPRA sea el valor más alto y VENTA el más bajo
                            if (valVenta > valCompra && valCompra > 0) {
                                const temp = valCompra;
                                valCompra = valVenta;
                                valVenta = temp;
                            }

                            if (cEl) animateUpdateTextContent(cEl, valCompra > 0 ? `$${valCompra.toFixed(2)}` : '---');
                            if (vEl) animateUpdateTextContent(vEl, valVenta > 0 ? `$${valVenta.toFixed(2)}` : '---');

                            // Update Fluctuation Badge (based on Venta as primary indicator)
                            if (valVenta > 0) updateBadge(id, valVenta);

                            // Guardamos Dólar Blue para el Panel de Usuario
                            if (id === 'blue' && valCompra > 0) {
                                panelDolarBlueValue = `$${valCompra.toFixed(2)}`;
                            }
                        } else {
                            if (cEl) animateUpdateTextContent(cEl, '---');
                            if (vEl) animateUpdateTextContent(vEl, '---');
                        }
                    });
                } else {
                    casasTarget.forEach(({ id, casa }) => {
                        const cEl = document.getElementById(`compra-${id}`);
                        const vEl = document.getElementById(`venta-${id}`);
                        if (cEl) animateUpdateTextContent(cEl, '---');
                        if (vEl) animateUpdateTextContent(vEl, '---');
                    });
                }

                // Procesar Dólar Cripto exclusivo
                const cCriptoEl = document.getElementById('precio-cripto-compra');
                const vCriptoEl = document.getElementById('precio-cripto-venta');

                if (resCripto.status === 'fulfilled') {
                    const dataCripto = resCripto.value;
                    let valCompra = Number(dataCripto.compra) || 0;
                    let valVenta = Number(dataCripto.venta) || 0;

                    // Invertir: COMPRA debe ser el mayor, VENTA el menor
                    if (valVenta > valCompra && valCompra > 0) {
                        const temp = valCompra;
                        valCompra = valVenta;
                        valVenta = temp;
                    }

                    if (cCriptoEl) animateUpdateTextContent(cCriptoEl, valCompra > 0 ? `$${valCompra.toFixed(2)}` : '---');
                    if (vCriptoEl) animateUpdateTextContent(vCriptoEl, valVenta > 0 ? `$${valVenta.toFixed(2)}` : '---');

                    if (valVenta > 0) updateBadge('cripto', valVenta);
                } else {
                    if (cCriptoEl) animateUpdateTextContent(cCriptoEl, '---');
                    if (vCriptoEl) animateUpdateTextContent(vCriptoEl, '---');
                }
            } catch (err) {
                console.error('Error procesando Dólares vía DolarApi:', err);
            }

            // Inyectamos Dólar Blue en el Panel de Usuario
            const panelDolarBlue = document.getElementById('panel-dolar-blue');
            if (panelDolarBlue) {
                animateUpdateTextContent(panelDolarBlue, panelDolarBlueValue !== '-' ? panelDolarBlueValue : '...');
            }

            // 2. PROCESAR NOTICIAS (RSS2JSON)
            const contenedorNoticias = document.getElementById('contenedor-noticias');
            if (contenedorNoticias) {
                if (resNoticias.status === 'fulfilled') {
                    const items = resNoticias.value;
                    contenedorNoticias.innerHTML = ''; // Limpiar 

                    if (items.length > 0) {
                        const topeNoticias = items.slice(0, 6);
                        topeNoticias.forEach(item => {
                            const imagen = item.thumbnail || (item.enclosure && item.enclosure.link) || '';
                            const titulo = item.title;
                            // Limpiar posibles etiquetas HTML de la descripción
                            const divTemp = document.createElement("div");
                            divTemp.innerHTML = item.description;
                            let descText = divTemp.textContent || divTemp.innerText || "";
                            descText = descText.length > 120 ? descText.substring(0, 120) + '...' : descText;
                            const link = item.link;

                            const imgHtml = imagen ? `<div class="mb-4 rounded-lg overflow-hidden h-40 w-full shrink-0"><img src="${imagen}" alt="Imagen noticia" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"></div>` : '';

                            const cardhtml = `
                                <a href="${link}" target="_blank" rel="noopener noreferrer" class="bg-white/80 dark:bg-card-bg backdrop-blur-2xl rounded-3xl p-6 border border-white/40 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] group relative overflow-hidden flex flex-col justify-start h-full">
                                    ${imgHtml}
                                    <h3 class="text-sm font-bold text-gray-900 dark:text-text-main group-hover:text-primary transition-colors mb-2 line-clamp-2">${titulo}</h3>
                                    <p class="text-xs text-gray-500 dark:text-text-muted mb-4 flex-grow line-clamp-3">${descText}</p>
                                    <div class="mt-auto pt-2 flex items-center gap-1 text-[11px] font-semibold text-primary uppercase float-bottom">
                                        <span>Leer más</span>
                                        <span class="material-symbols-outlined text-[14px]">arrow_outward</span>
                                    </div>
                                </a>
                            `;
                            contenedorNoticias.insertAdjacentHTML('beforeend', cardhtml);
                        });
                    } else {
                        contenedorNoticias.innerHTML = '<p class="text-gray-500">No se encontraron noticias recientes.</p>';
                    }
                } else {
                    contenedorNoticias.innerHTML = '<p class="text-gray-500 dark:text-text-muted">No se pudieron cargar las noticias en este momento.</p>';
                    console.error("Error resolviendo promesa de noticias");
                }
            }

            // 2. PROCESAR MERCADOS (Euro y Real)
            try {
                if (resEuro.status === 'fulfilled') {
                    const data = resEuro.value;
                    console.log('Datos Euro:', data);
                    const cEl = document.getElementById('compra-euro');
                    const vEl = document.getElementById('venta-euro');
                    let valCompra = Number(data.compra) || 0;
                    let valVenta = Number(data.venta) || 0;

                    if (valVenta > valCompra && valCompra > 0) {
                        const temp = valCompra;
                        valCompra = valVenta;
                        valVenta = temp;
                    }

                    if (cEl) animateUpdateTextContent(cEl, valCompra > 0 ? `$${valCompra.toFixed(2)}` : 'N/A');
                    if (vEl) animateUpdateTextContent(vEl, valVenta > 0 ? `$${valVenta.toFixed(2)}` : 'N/A');
                    if (valVenta > 0) updateBadge('euro', valVenta);
                }
            } catch (err) {
                console.error('Error procesando Euro', err);
            }

            try {
                if (resReal.status === 'fulfilled') {
                    const data = resReal.value;
                    console.log('Datos Real Brasileño:', data);
                    const cEl = document.getElementById('compra-real');
                    const vEl = document.getElementById('venta-real');
                    let valCompra = Number(data.compra) || 0;
                    let valVenta = Number(data.venta) || 0;

                    if (valVenta > valCompra && valCompra > 0) {
                        const temp = valCompra;
                        valCompra = valVenta;
                        valVenta = temp;
                    }

                    if (cEl) animateUpdateTextContent(cEl, valCompra > 0 ? `$${valCompra.toFixed(2)}` : 'N/A');
                    if (vEl) animateUpdateTextContent(vEl, valVenta > 0 ? `$${valVenta.toFixed(2)}` : 'N/A');
                    if (valVenta > 0) updateBadge('real', valVenta);
                }
            } catch (err) {
                console.error('Error procesando Real', err);
            }

            // 3. PROCESAR SPY Y SPYD (Yahoo Finance direct)
            const pSpy = document.getElementById('precio-spy');
            if (pSpy) {
                if (resSpy.status === 'fulfilled' && resSpy.value !== undefined && !resSpy.value.fallback) {
                    const spyData = resSpy.value;
                    animateUpdateTextContent(pSpy, `${Number(spyData.price).toFixed(2)}`);
                    updateBadge('spy', Number(spyData.price));
                } else if (resSpy.status === 'fulfilled' && resSpy.value?.fallback) {
                    animateUpdateTextContent(pSpy, `${Number(resSpy.value.price).toFixed(2)}`);
                    updateBadge('spy', Number(resSpy.value.price));
                } else {
                    animateUpdateTextContent(pSpy, 'Cargando...');
                }
            }

            const pSpyd = document.getElementById('precio-spyd');
            if (pSpyd) {
                if (resSpyd.status === 'fulfilled' && resSpyd.value !== undefined) {
                    animateUpdateTextContent(pSpyd, `${Number(resSpyd.value).toFixed(2)}`);
                    updateBadge('spyd', Number(resSpyd.value));
                } else {
                    animateUpdateTextContent(pSpyd, 'No disp.');
                }
            }

            // Actualizamos la fecha de la última carga
            if (fechaActualizacion) {
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = now.toLocaleString('es-ES', { month: 'short' }).substring(0, 3);
                const capitalizeMonth = month.charAt(0).toUpperCase() + month.slice(1);
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');

                fechaActualizacion.textContent = `Última actualización: ${day} ${capitalizeMonth} ${hours}:${minutes}`;
            }

            // Sistema Interactivo: Verificación de estado de APIs para el Avatar
            const estadoDot = document.getElementById('estado-sistema-dot');
            const estadoTextoDot = document.getElementById('estado-sistema-texto-dot');
            const estadoLabel = document.getElementById('estado-sistema-label');

            const hasErrors = [resNoticias, resDolares, resCripto, resEuro, resReal, resSpy, resSpyd].some(res => res.status === 'rejected')
                || resSpy.value === undefined
                || resSpyd.value === undefined;

            if (estadoDot && estadoTextoDot && estadoLabel) {
                if (hasErrors) {
                    estadoDot.classList.remove('bg-green-500');
                    estadoDot.classList.add('bg-red-500');
                    estadoTextoDot.classList.remove('bg-green-500');
                    estadoTextoDot.classList.add('bg-red-500');
                    estadoLabel.textContent = 'Offline (Errores)';
                } else {
                    estadoDot.classList.remove('bg-red-500');
                    estadoDot.classList.add('bg-green-500');
                    estadoTextoDot.classList.remove('bg-red-500');
                    estadoTextoDot.classList.add('bg-green-500');
                    estadoLabel.textContent = 'Sistema Online';
                }
            }

            // Quitamos animación si la pusimos
            if (btnIcon) btnIcon.classList.remove('animate-spin');

        } catch (error) {
            console.error('Error general de actualización:', error);
            if (fechaActualizacion) fechaActualizacion.textContent = 'Error al actualizar cotizaciones';
        }
    };

    // Agregar evento al botón
    if (btnActualizar) {
        btnActualizar.addEventListener('click', updateDolares);
    }

    // Ejecutar scraping automáticamente al cargar la página por primera vez
    updateDolares();

    // Lógica para intervalo de actualización
    const selectFrecuencia = document.getElementById('select-frecuencia');
    let refreshInterval = setInterval(updateDolares, 60000);

    const setUpdateInterval = () => {
        // Limpiar intervalo previo
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }

        if (selectFrecuencia) {
            const val = selectFrecuencia.value;
            if (val !== 'manual') {
                const ms = parseInt(val, 10);
                if (!isNaN(ms)) {
                    refreshInterval = setInterval(updateDolares, ms);
                }
            }
        }
    };

    if (selectFrecuencia) {
        selectFrecuencia.addEventListener('change', setUpdateInterval);
    }

    // 3. Calculadora de Interés Compuesto
    const btnCalcular = document.getElementById('btn-calcular');
    const inputCapital = document.getElementById('capital');
    const inputAporte = document.getElementById('aporte');
    const inputTasa = document.getElementById('tasa');
    const inputPlazo = document.getElementById('plazo');

    const resultFinal = document.getElementById('resultado-final');
    const resultAportes = document.getElementById('aportes-totales');
    const resultInteres = document.getElementById('interes-total');

    if (btnCalcular) {
        btnCalcular.addEventListener('click', () => {
            const capital = parseFloat(inputCapital.value) || 0;
            const aporte = parseFloat(inputAporte.value) || 0;
            const tasa = parseFloat(inputTasa.value) || 0;
            const plazo = parseFloat(inputPlazo.value) || 0;

            const tasaMensual = tasa / 100 / 12;
            const meses = Math.floor(plazo * 12);

            let balance = capital;
            let aportesTotales = capital;

            // Iteración mes a mes
            for (let i = 0; i < meses; i++) {
                balance = balance * (1 + tasaMensual);
                balance += aporte;
                aportesTotales += aporte;
            }

            const interesGanado = balance - aportesTotales;

            const formatNumber = (val) => new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(val);

            // Actualizar interfaz
            if (resultFinal) {
                resultFinal.innerHTML = `<span class="text-primary text-3xl align-top">$</span>${formatNumber(balance)}`;
            }
            if (resultAportes) resultAportes.textContent = '$' + formatNumber(aportesTotales);
            if (resultInteres) resultInteres.textContent = '+$' + formatNumber(interesGanado);
        });
    }

    // 4. Lógica de Pestañas (Tabs) SPA
    const tabs = {
        'tab-tablero': document.getElementById('seccion-tablero'),
        'tab-mercado': document.getElementById('seccion-mercado'),
        'tab-noticias': document.getElementById('seccion-noticias'),
        'tab-ajustes': document.getElementById('seccion-ajustes')
    };

    // Obtenemos todos los botones/links de tab
    const tabLinks = [
        document.getElementById('tab-tablero'),
        document.getElementById('tab-mercado'),
        document.getElementById('tab-noticias'),
        document.getElementById('tab-ajustes')
    ];

    const logoHome = document.getElementById('logo-home');

    const switchTab = (activeId) => {
        // Ocultar todas las secciones y resetear estilos de los tabs
        for (const [id, sectionEl] of Object.entries(tabs)) {
            if (sectionEl) sectionEl.classList.add('hidden');
        }
        tabLinks.forEach(link => {
            if (link) {
                link.classList.remove('text-gray-900', 'dark:text-white', 'text-primary'); // Activo viejo
                link.classList.add('text-gray-800', 'dark:text-text-muted'); // Inactivo estandar
            }
        });

        // Mostrar sección activa y darle estilos al link seleccionado
        if (tabs[activeId]) {
            tabs[activeId].classList.remove('hidden');
        }

        const activeLink = document.getElementById(activeId);
        if (activeLink) {
            activeLink.classList.remove('text-gray-800', 'dark:text-text-muted');
            activeLink.classList.add('text-gray-900', 'dark:text-white'); // Color claro cuando es el tab activo
        }
    };

    // Agregar event listeners a cada click de las tabs
    tabLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(link.id);
            });
        }
    });

    // El logo lleva al tablero principal
    if (logoHome) {
        logoHome.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('tab-tablero');
        });
    }

    // 5. Buscador Global - Autocompletado SPA
    const buscadorGlobal = document.getElementById('buscador-global');
    const resultadosBusqueda = document.getElementById('resultados-busqueda');

    if (buscadorGlobal && resultadosBusqueda) {
        const opcionesBusqueda = [
            { nombre: 'Dólar Oficial', tab: 'tab-tablero' },
            { nombre: 'Dólar Tarjeta', tab: 'tab-tablero' },
            { nombre: 'Dólar Blue', tab: 'tab-tablero' },
            { nombre: 'Dólar MEP', tab: 'tab-tablero' },
            { nombre: 'Dólar Cripto', tab: 'tab-tablero' },
            { nombre: 'Calculadora', tab: 'tab-tablero' },
            { nombre: 'Euro', tab: 'tab-mercado' },
            { nombre: 'Real Brasileño', tab: 'tab-mercado' },
            { nombre: 'SPY (S&P 500 ETF)', tab: 'tab-mercado' },
            { nombre: 'SPYD (Alto Dividendo ETF)', tab: 'tab-mercado' },
            { nombre: 'Noticias', tab: 'tab-noticias' },
            { nombre: 'Ajustes', tab: 'tab-ajustes' }
        ];

        buscadorGlobal.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            resultadosBusqueda.innerHTML = '';

            if (val.length > 0) {
                const filtrados = opcionesBusqueda.filter(op => op.nombre.toLowerCase().includes(val));

                if (filtrados.length > 0) {
                    resultadosBusqueda.classList.remove('hidden');

                    filtrados.forEach(op => {
                        const li = document.createElement('li');
                        li.textContent = op.nombre;
                        li.className = 'p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700';

                        li.addEventListener('click', () => {
                            switchTab(op.tab);
                            buscadorGlobal.value = '';
                            resultadosBusqueda.classList.add('hidden');
                            resultadosBusqueda.innerHTML = '';
                        });

                        resultadosBusqueda.appendChild(li);
                    });
                } else {
                    resultadosBusqueda.classList.add('hidden');
                }
            } else {
                resultadosBusqueda.classList.add('hidden');
            }
        });

        // Ocultar resultados al hacer click afuera
        document.addEventListener('click', (e) => {
            if (!buscadorGlobal.contains(e.target) && !resultadosBusqueda.contains(e.target)) {
                resultadosBusqueda.classList.add('hidden');
            }
        });
    }

    // 6. Panel de Usuario Interactivo (Centro de Control)
    const usuarioControl = document.getElementById('usuario-control');
    const panelUsuario = document.getElementById('panel-usuario');
    const botonesAcceso = document.querySelectorAll('.menu-acceso-rapido');

    if (usuarioControl && panelUsuario) {
        usuarioControl.addEventListener('click', (e) => {
            // Evitamos que este click dispare el listener del documento de abajo inmediatamente
            if (!panelUsuario.contains(e.target)) {
                panelUsuario.classList.toggle('hidden');
            }
        });

        botonesAcceso.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar cerrar/abrir de forma errática
                const targetTab = btn.getAttribute('data-tab');
                if (targetTab) {
                    switchTab(targetTab);
                }
                panelUsuario.classList.add('hidden');
            });
        });

        // Ocultar panel de usuario al hacer click afuera
        document.addEventListener('click', (e) => {
            if (!usuarioControl.contains(e.target)) {
                panelUsuario.classList.add('hidden');
            }
        });
    }

});
