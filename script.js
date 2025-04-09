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
                    input.addEventListener('change', () => {
                        updateSvgColor(svg, hex, input.value);
                        block.style.backgroundColor = input.value;
                        block.innerHTML = `${input.value}<br>RGB: ${hexToRgb(input.value).join(', ')}`;
                        // Atualiza a paleta no histórico
                        const index = history.recolor[history.recolor.length - 1].findIndex(c => rgbToHex(c[0], c[1], c[2]) === hex);
                        if (index !== -1) {
                            history.recolor[history.recolor.length - 1][index] = hexToRgb(input.value);
                        }
                    });
                    block.appendChild(input);
                });
                history.recolor.push(colors);
                redoStack.recolor = [];
            };
            reader.readAsText(file);
        }
    });
