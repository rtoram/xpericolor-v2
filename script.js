document.addEventListener('DOMContentLoaded', () => {
    const colorThief = new ColorThief();
    const { jsPDF } = window.jspdf;
    let history = { extract: [], wheel: [], table: [], explore: [], recolor: [] };
    let redoStack = { extract: [], wheel: [], table: [], explore: [], recolor: [] };
    let currentTab = 'extract';

    // Alternância de Tema
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.body.removeAttribute('data-theme');
            themeToggle.textContent = '☀️';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '🌙';
        }
    });

    // Abas
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            currentTab = tab.dataset.tab;
        });
    });

    // Extrair Temas
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const colorPalette = document.getElementById('color-palette');
    const variationsDiv = document.getElementById('variations');
    const extractFilter = document.getElementById('extract-filter');
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            imagePreview.innerHTML = '';
            imagePreview.appendChild(img);
            img.onload = () => {
                let colors = colorThief.getPalette(img, 5);
                colors = applyFilter(colors, extractFilter.value);
                renderPalette(colors, colorPalette, variationsDiv, 'extract');
                history.extract.push(colors);
                redoStack.extract = [];
            };
        }
    });
    extractFilter.addEventListener('change', () => {
        if (history.extract.length > 0) {
            let colors = history.extract[history.extract.length - 1];
            colors = applyFilter(colors, extractFilter.value);
            renderPalette(colors, colorPalette, variationsDiv, 'extract');
        }
    });

    // Disco de Cores
    const baseColor = document.getElementById('base-color');
    const harmonySelect = document.getElementById('harmony');
    const harmonyPalette = document.getElementById('harmony-palette');
    function updateHarmony() {
        const hex = baseColor.value;
        const rgb = hexToRgb(hex);
        let colors = [rgb];
        switch (harmonySelect.value) {
            case 'analogous':
                colors.push(adjustHue(rgb, 30), adjustHue(rgb, -30));
                break;
            case 'monochromatic':
                colors.push(lighten(rgb, 20), darken(rgb, 20));
                break;
            case 'triad':
                colors.push(adjustHue(rgb, 120), adjustHue(rgb, -120));
                break;
            case 'complementary':
                colors.push(adjustHue(rgb, 180));
                break;
        }
        renderPalette(colors, harmonyPalette, null, 'wheel');
        history.wheel.push(colors);
        redoStack.wheel = [];
    }
    baseColor.addEventListener('change', updateHarmony);
    harmonySelect.addEventListener('change', updateHarmony);
    updateHarmony();

    // Tabela Cromática
    const colorTable = document.getElementById('color-table');
    const tableVariations = document.getElementById('table-variations');
    const predefinedColors = [
        '#FF5733', '#33FF57', '#3357FF', '#FF33A1',
        '#FFD700', '#8A2BE2', '#00CED1', '#FF4500'
    ].map(hexToRgb);
    renderPalette(predefinedColors, colorTable, tableVariations, 'table');
    history.table.push(predefinedColors);

    // Explorar
    const exploreSearch = document.getElementById('explore-search');
    const exploreGallery = document.getElementById('explore-gallery');
    const explorePalettes = [
        { name: 'Crepúsculo', colors: ['#4B0082', '#8A2BE2', '#DDA0DD', '#FFB6C1', '#FF69B4'].map(hexToRgb) },
        { name: 'Oceano', colors: ['#00CED1', '#20B2AA', '#48D1CC', '#87CEEB', '#4682B4'].map(hexToRgb) },
        { name: 'Floresta', colors: ['#228B22', '#32CD32', '#9ACD32', '#FFD700', '#8B4513'].map(hexToRgb) }
    ];
    function renderExplore() {
        exploreGallery.innerHTML = '';
        explorePalettes.forEach(palette => {
            if (!exploreSearch.value || palette.name.toLowerCase().includes(exploreSearch.value.toLowerCase()) || palette.colors.some(c => rgbToHex(c[0], c[1], c[2]).toLowerCase().includes(exploreSearch.value.toLowerCase()))) {
                const div = document.createElement('div');
                div.className = 'color-block';
                div.innerHTML = `<strong>${palette.name}</strong>`;
                palette.colors.forEach(rgb => {
                    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
                    const span = document.createElement('span');
                    span.style.backgroundColor = hex;
                    span.style.width = '20px';
                    span.style.height = '20px';
                    span.style.display = 'inline-block';
                    div.appendChild(span);
                });
                const useBtn = document.createElement('button');
                useBtn.textContent = 'Usar';
                useBtn.addEventListener('click', () => {
                    renderPalette(palette.colors, colorPalette, variationsDiv, 'extract');
                    history.extract.push(palette.colors);
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));
                    document.querySelector('[data-tab="extract"]').classList.add('active');
                    document.getElementById('extract').classList.add('active');
                    currentTab = 'extract';
                });
                div.appendChild(useBtn);
                exploreGallery.appendChild(div);
            }
        });
    }
    renderExplore();
    exploreSearch.addEventListener('input', renderExplore);

    // Recolorir SVG
    const svgUpload = document.getElementById('svg-upload');
    const svgPreview = document.getElementById('svg-preview');
    const svgPalette = document.getElementById('svg-palette');
    svgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                svgPreview.innerHTML = event.target.result;
                const svg = svgPreview.querySelector('svg');
                const colors = extractSvgColors(svg);
                renderPalette(colors, svgPalette, null, 'recolor', (hex, block) => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = hex;
                    input.addEventListener('input', () => {
                        updateSvgColor(svg, hex, input.value);
                        block.style.backgroundColor = input.value;
                        block.innerHTML = `${input.value}<br>RGB: ${hexToRgb(input.value).join(', ')}`;
                        const currentColors = history.recolor[history.recolor.length - 1];
                        const index = currentColors.findIndex(c => rgbToHex(c[0], c[1], c[2]) === hex);
                        if (index !== -1) {
                            currentColors[index] = hexToRgb(input.value);
                        }
                    });
                    block.appendChild(input);
                });
                history.recolor.push([...colors]);
                redoStack.recolor = [];
            };
            reader.readAsText(file);
        }
    });

    // Renderização de Paleta
    function renderPalette(colors, container, variationsContainer, tab, extraCallback) {
        container.innerHTML = '';
        colors.forEach(rgb => {
            const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
            const block = document.createElement('div');
            block.className = 'color-block';
            block.style.backgroundColor = hex;
            block.innerHTML = `${hex}<br>RGB: ${rgb.join(', ')}`;
            if (variationsContainer) {
                block.addEventListener('click', () => {
                    variationsContainer.innerHTML = '';
                    const variations = [
                        lighten(rgb, 20), darken(rgb, 20),
                        adjustHue(rgb, 15), adjustHue(rgb, -15)
                    ];
                    variations.forEach(varRgb => {
                        const varHex = rgbToHex(varRgb[0], varRgb[1], varRgb[2]);
                        const varBlock = document.createElement('div');
                        varBlock.className = 'color-block';
                        varBlock.style.backgroundColor = varHex;
                        varBlock.innerHTML = `${varHex}<br>RGB: ${varRgb.join(', ')}`;
                        variationsContainer.appendChild(varBlock);
                    });
                });
            }
            if (extraCallback) extraCallback(hex, block);
            container.appendChild(block);
        });
    }

    // Ferramentas
    document.getElementById('undo').addEventListener('click', () => {
        if (history[currentTab].length > 1) {
            redoStack[currentTab].push(history[currentTab].pop());
            const lastColors = history[currentTab][history[currentTab].length - 1];
            const container = currentTab === 'extract' ? colorPalette : currentTab === 'wheel' ? harmonyPalette : currentTab === 'table' ? colorTable : svgPalette;
            const variations = currentTab === 'extract' ? variationsDiv : currentTab === 'table' ? tableVariations : null;
            renderPalette(lastColors, container, variations, currentTab);
        }
    });

    document.getElementById('redo').addEventListener('click', () => {
        if (redoStack[currentTab].length > 0) {
            const colors = redoStack[currentTab].pop();
            history[currentTab].push(colors);
            const container = currentTab === 'extract' ? colorPalette : currentTab === 'wheel' ? harmonyPalette : currentTab === 'table' ? colorTable : svgPalette;
            const variations = currentTab === 'extract' ? variationsDiv : currentTab === 'table' ? tableVariations : null;
            renderPalette(colors, container, variations, currentTab);
        }
    });

    document.getElementById('fullscreen').addEventListener('click', () => document.body.requestFullscreen());

    document.getElementById('share').addEventListener('click', () => {
        const colors = history[currentTab][history[currentTab].length - 1];
        if (colors) {
            const hexColors = colors.map(c => rgbToHex(c[0], c[1], c[2]).slice(1)).join(',');
            const url = `${window.location.origin}${window.location.pathname}?colors=${hexColors}`;
            const shareModal = document.getElementById('share-modal');
            const shareUrl = document.getElementById('share-url');
            const qrcodeDiv = document.getElementById('qrcode');
            shareUrl.value = url;
            qrcodeDiv.innerHTML = '';
            new QRCode(qrcodeDiv, { text: url, width: 128, height: 128 });
            shareModal.style.display = 'flex';
        }
    });

    document.getElementById('download').addEventListener('click', (event) => {
        const content = document.querySelector('.content.active');
        if (currentTab === 'recolor') {
            const svg = document.querySelector('#svg-preview svg');
            if (!svg) return alert('Nenhum SVG carregado!');
            const menu = document.createElement('div');
            menu.style.position = 'absolute';
            menu.style.background = '#fff';
            menu.style.border = '1px solid #ccc';
            menu.style.zIndex = '1000';
            menu.innerHTML = `
                <button class="download-option" data-format="jpeg">JPEG</button>
                <button class="download-option" data-format="png">PNG</button>
                <button class="download-option" data-format="svg">SVG</button>
                <button class="download-option" data-format="pdf">PDF</button>
            `;
            document.body.appendChild(menu);
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;

            menu.querySelectorAll('.download-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const format = btn.dataset.format;
                    downloadFile(format);
                    document.body.removeChild(menu);
                });
            });

            setTimeout(() => {
                if (document.body.contains(menu)) document.body.removeChild(menu);
            }, 3000);
        } else {
            html2canvas(content).then(canvas => {
                const link = document.createElement('a');
                link.download = 'XperiColor_palette.jpg';
                link.href = canvas.toDataURL('image/jpeg');
                link.click();
            });
        }
    });

    // Modal de Instruções
    const instructionsBtn = document.getElementById('instructions');
    const instructionsModal = document.getElementById('instructions-modal');
    const closeModal = document.getElementById('close-modal');
    instructionsBtn.addEventListener('click', () => instructionsModal.style.display = 'flex');
    closeModal.addEventListener('click', () => instructionsModal.style.display = 'none');

    // Modal de Compartilhamento
    const closeShare = document.getElementById('close-share');
    closeShare.addEventListener('click', () => document.getElementById('share-modal').style.display = 'none');

    // Funções Auxiliares
    function applyFilter(colors, filter) {
        return colors.map(rgb => {
            const hsl = rgbToHsl(rgb);
            switch (filter) {
                case 'colorful': hsl[1] = Math.min(100, hsl[1] + 20); break;
                case 'soft': hsl[2] = Math.min(100, hsl[2] + 15); hsl[1] = Math.min(100, hsl[1] + 10); break;
                case 'deep': hsl[2] = Math.max(0, hsl[2] - 10); hsl[1] = Math.min(100, hsl[1] + 15); break;
                case 'dark': hsl[2] = Math.max(0, hsl[2] - 30); break;
            }
            return hslToRgb(hsl);
        });
    }

    function rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    function adjustHue(rgb, degrees) {
        const hsl = rgbToHsl(rgb);
        hsl[0] = (hsl[0] + degrees) % 360;
        return hslToRgb(hsl);
    }

    function lighten(rgb, amount) {
        const hsl = rgbToHsl(rgb);
        hsl[2] = Math.min(100, hsl[2] + amount);
        return hslToRgb(hsl);
    }

    function darken(rgb, amount) {
        const hsl = rgbToHsl(rgb);
        hsl[2] = Math.max(0, hsl[2] - amount);
        return hslToRgb(hsl);
    }

    function rgbToHsl(rgb) {
        let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s * 100, l * 100];
    }

    function hslToRgb(hsl) {
        let h = hsl[0] / 360, s = hsl[1] / 100, l = hsl[2] / 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hueToRgb(p, q, h + 1/3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    function extractSvgColors(svg) {
        const colors = new Set();
        svg.querySelectorAll('[fill]').forEach(el => {
            const fill = el.getAttribute('fill');
            if (fill && fill.startsWith('#')) colors.add(fill);
        });
        return Array.from(colors).map(hexToRgb);
    }

    function updateSvgColor(svg, oldColor, newColor) {
        svg.querySelectorAll(`[fill="${oldColor}"]`).forEach(el => el.setAttribute('fill', newColor));
    }

    window.downloadFile = function(format) {
        const svg = document.querySelector('#svg-preview svg');
        if (!svg) return;
        if (format === 'svg') {
            const serializer = new XMLSerializer();
            const source = serializer.serializeToString(svg);
            const link = document.createElement('a');
            link.href = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(source)));
            link.download = 'XperiColor_recolored.svg';
            link.click();
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            const width = svg.width.baseVal.value;
            const height = svg.height.baseVal.value;
            doc.addSvgAsImage(svg.outerHTML, 0, 0, width / 2, height / 2);
            doc.save('XperiColor_recolored.pdf');
        } else {
            html2canvas(document.querySelector('#recolor')).then(canvas => {
                const link = document.createElement('a');
                link.download = `XperiColor_recolored.${format}`;
                link.href = canvas.toDataURL(`image/${format}`);
                link.click();
            });
        }
    };

    // Carregar Paleta do URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlColors = urlParams.get('colors');
    if (urlColors) {
        const colors = urlColors.split(',').map(c => hexToRgb(`#${c}`));
        renderPalette(colors, colorPalette, variationsDiv, 'extract');
        history.extract.push(colors);
    }
});
