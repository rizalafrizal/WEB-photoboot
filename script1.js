const video = document.getElementById('video');
const canvas = document.getElementById('finalCanvas');
const ctx = canvas.getContext('2d');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const stickerLayer = document.getElementById('stickerLayer');
const sizeSlider = document.getElementById('stickerSize');
const sizeLabel = document.getElementById('sizeLabel');

let appState = {
    layout: '2x2',
    photos: [],
    isBusy: false,
    currentFrame: 'minion',
    selectedSticker: null
};

// --- WEBCAM INIT ---
async function initWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        video.srcObject = stream;
    } catch (e) {
        alert("Kamera tidak ditemukan. Pastikan izin diberikan.");
    }
}
initWebcam();

// --- STATE MANAGEMENT ---
function setLayout(type, btn) {
    if (appState.isBusy) return;
    appState.layout = type;
    document.querySelectorAll('#cameraControls .btn-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function setFilter(filter, btn) {
    video.style.filter = filter;
    btn.parentNode.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function setFrame(key, btn) {
    appState.currentFrame = key;
    document.querySelectorAll('.frame-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCanvas();
}

// --- CAPTURE SEQUENCE ---
async function startSequence() {
    if (appState.isBusy) return;
    appState.isBusy = true;
    appState.photos = [];
    const count = (appState.layout === 'wide') ? 3 : 4;
    for (let i = 0; i < count; i++) {
        await runCountdown(3);
        triggerFlash();
        capturePhoto();
        if (i < count - 1) await delay(800);
    }
    switchToEditor();
    appState.isBusy = false;
}

function runCountdown(sec) {
    return new Promise(resolve => {
        countdownEl.style.opacity = 1;
        let c = sec; countdownEl.innerText = c;
        const timer = setInterval(() => {
            c--;
            if (c > 0) countdownEl.innerText = c;
            else { clearInterval(timer); countdownEl.style.opacity = 0; resolve(); }
        }, 1000);
    });
}

function triggerFlash() {
    flashEl.classList.add('active');
    setTimeout(() => flashEl.classList.remove('active'), 200);
}

function capturePhoto() {
    const tempCan = document.createElement('canvas');
    const targetW = 800; const targetH = 600;
    tempCan.width = targetW; tempCan.height = targetH;
    const tCtx = tempCan.getContext('2d');
    tCtx.translate(targetW, 0); tCtx.scale(-1, 1);
    tCtx.filter = video.style.filter || 'none';
    const vidW = video.videoWidth; const vidH = video.videoHeight;
    const targetRatio = targetW / targetH; const vidRatio = vidW / vidH;
    let sw, sh, sx, sy;
    if (vidRatio > targetRatio) {
        sh = vidH; sw = vidH * targetRatio; sx = (vidW - sw) / 2; sy = 0;
    } else {
        sw = vidW; sh = vidW / targetRatio; sx = 0; sy = (vidH - sh) / 2;
    }
    tCtx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    appState.photos.push(tempCan);
}

function switchToEditor() {
    document.getElementById('cameraView').classList.add('hidden');
    document.getElementById('editorView').classList.add('flex');
    document.getElementById('cameraControls').classList.add('hidden');
    document.getElementById('editorControls').classList.remove('hidden');
    const date = new Date();
    const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('captionText').value = `Fhotobot • ${dateStr}`;
    renderCanvas();
}

// --- RENDER LOGIC ---
function renderCanvas() {
    const pW = 600, pH = 450;
    let cols, rows, padding, gap, footerH;
    if (appState.layout === '2x2') {
        cols = 2; rows = 2; padding = 80; gap = 40; footerH = 250;
    } else if (appState.layout === 'strip') {
        cols = 1; rows = 4; padding = 60; gap = 30; footerH = 220;
    } else {
        cols = 1; rows = 3; padding = 60; gap = 30; footerH = 220;
    }

    const totalW = (pW * cols) + (padding * 2) + (gap * (cols - 1));
    const totalH = (pH * rows) + (padding * 2) + (gap * (rows - 1)) + footerH;

    canvas.width = totalW;
    canvas.height = totalH;

    // 1. Draw Background
    drawFrameBackground(ctx, totalW, totalH, appState.currentFrame, footerH);

    // 2. Draw Foreground/Decoration (BEHIND PHOTOS)
    drawFrameForeground(ctx, totalW, totalH, appState.currentFrame, footerH);

    // 3. Draw Photos
    appState.photos.forEach((img, i) => {
        let x, y;
        if (appState.layout === '2x2') {
            x = padding + (i % 2 * (pW + gap));
            y = padding + (Math.floor(i / 2) * (pH + gap));
        } else {
            x = padding;
            y = padding + (i * (pH + gap));
        }

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
        ctx.drawImage(img, x, y, pW, pH);
        ctx.restore();

        // Photo Borders
        if (appState.currentFrame === 'blueprint') {
            ctx.strokeStyle = "rgba(0,116,217,0.8)"; ctx.lineWidth = 3;
        } else if (appState.currentFrame === 'minion') {
            ctx.strokeStyle = "#456184"; ctx.lineWidth = 4;
        } else if (appState.currentFrame === 'spiderman') {
            ctx.strokeStyle = "#0000CD"; ctx.lineWidth = 4;
        } else if (appState.currentFrame === 'doraemon') {
            ctx.strokeStyle = "#D90000"; ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2;
        }
        ctx.strokeRect(x, y, pW, pH);
    });

    // 4. Draw Footer Text (TOP LAYER)
    drawFooterText(ctx, totalW, totalH, footerH, appState.currentFrame);
}

function drawFrameBackground(ctx, w, h, type, footerH) {
    ctx.save();
    switch (type) {
        case 'minion':
            // Yellow body
            ctx.fillStyle = '#FCE029'; ctx.fillRect(0, 0, w, h);
            // Blue overalls (Start from bottom)
            ctx.fillStyle = '#456184'; ctx.fillRect(0, h - 250, w, 250);
            break;

        case 'spongebob':
            // Dynamic heights ensuring text gap
            const pantsStart = h - (footerH - 60); // Pants start 60px below footer top

            // Pants (Brown)
            ctx.fillStyle = '#8B4513'; ctx.fillRect(0, pantsStart, w, h - pantsStart);
            // Shirt (White - The 60px strip at footer top)
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h - footerH, w, 60);
            // Body (Yellow - Above footer)
            ctx.fillStyle = '#FFF600'; ctx.fillRect(0, 0, w, h - footerH);

            // Sponge texture
            ctx.fillStyle = '#d6cd00';
            for (let i = 0; i < 40; i++) {
                const r = 10 + Math.random() * 40;
                ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * (h - footerH), r, 0, Math.PI * 2); ctx.fill();
            }
            break;

        case 'patrick':
            // Pants (Green - Bottom 200px)
            ctx.fillStyle = '#66CC00'; ctx.fillRect(0, h - 200, w, 200);
            // Body (Pink - Rest)
            ctx.fillStyle = '#FF9B9B'; ctx.fillRect(0, 0, w, h - 200);
            // Skin texture
            ctx.fillStyle = '#e88a8a';
            for (let i = 0; i < 200; i++) {
                ctx.fillRect(Math.random() * w, Math.random() * (h - 200), 2, 2);
            }
            break;

        case 'mickey':
            // Pants (Red - Bottom 40%)
            ctx.fillStyle = '#E40010'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
            // Body (Black - Top 60%)
            ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h * 0.6);
            break;

        case 'spiderman':
            // Red background
            ctx.fillStyle = '#D90000'; ctx.fillRect(0, 0, w, h);
            // Web pattern
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
            const cx = w / 2, cy = h / 2;
            // Radial lines
            for (let i = 0; i < 12; i++) {
                ctx.beginPath(); ctx.moveTo(cx, cy);
                const angle = (Math.PI * 2 * i) / 12;
                ctx.lineTo(cx + Math.cos(angle) * w, cy + Math.sin(angle) * h);
                ctx.stroke();
            }
            // Concentric webs
            for (let r = 50; r < w; r += 50) {
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            }
            break;

        case 'doraemon':
            // Blue Body
            ctx.fillStyle = '#009FE3'; ctx.fillRect(0, 0, w, h);
            // White Stomach Area (Fixed from bottom)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            // Ellipse anchored to bottom
            ctx.ellipse(w / 2, h, w * 0.5, 350, 0, Math.PI, 0);
            ctx.fill();
            break;

        // Holo Theme Background
        case 'holo':
            const holoGrad = ctx.createLinearGradient(0, 0, w, h);
            holoGrad.addColorStop(0, '#ff9a9e');
            holoGrad.addColorStop(0.25, '#fad0c4');
            holoGrad.addColorStop(0.5, '#fbc2eb');
            holoGrad.addColorStop(0.75, '#a6c1ee');
            holoGrad.addColorStop(1, '#c2e9fb');
            ctx.fillStyle = holoGrad;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            for (let i = 0; i < w; i += 5) { if (i % 20 === 0) ctx.fillRect(i, 0, 2, h); }
            break;

        case 'travel_air': ctx.fillStyle = '#fdf3e0'; ctx.fillRect(0, 0, w, h); break;
        case 'blueprint':
            ctx.fillStyle = '#001f3f'; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(0, 116, 217, 0.2)'; ctx.lineWidth = 1;
            for (let i = 20; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
            for (let j = 20; j < h; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke(); }
            break;
        case 'film': ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); break;
        case 'retro':
            ctx.fillStyle = '#e8dcb5'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < w; i += 4) for (let j = 0; j < h; j += 4) if (Math.random() > 0.5) ctx.fillRect(i, j, 1, 1); break;
        case 'cyber':
            ctx.fillStyle = '#0f0026'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(0,255,204,0.05)'; for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1); break;
    }
    ctx.restore();
}

function drawFrameForeground(ctx, w, h, type, footerH) {
    ctx.save();
    if (type === 'minion') {
        const cx = w / 2; const cy = 50;
        // Goggle Strap
        ctx.fillStyle = '#222'; ctx.fillRect(0, cy - 10, w, 20);
        // Eye
        ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5c4033'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        // Border
        ctx.strokeStyle = '#FCE029'; ctx.lineWidth = 15; ctx.strokeRect(0, 0, w, h);
    }
    else if (type === 'spongebob') {
        const footerTop = h - footerH;
        // Tie (At top of footer)
        const ax = w / 2;
        ctx.fillStyle = '#E40010';
        ctx.beginPath(); ctx.moveTo(ax - 25, footerTop); ctx.lineTo(ax + 25, footerTop); ctx.lineTo(ax, footerTop + 50); ctx.fill();

        // Belt (Move UP so text sits on pants)
        // Pants start at footerTop + 60
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.setLineDash([15, 15]);
        ctx.beginPath(); ctx.moveTo(0, footerTop + 60); ctx.lineTo(w, footerTop + 60); ctx.stroke();
    }
    else if (type === 'patrick') {
        // Flowers on pants
        ctx.fillStyle = '#8B5CF6';
        const footerTop = h - footerH;
        // Keep flowers away from center text area (w/2 +/- 150)
        for (let i = 30; i < w; i += 100) {
            // Random Y in footer area
            const py = footerTop + 40 + Math.random() * (footerH - 60);

            // Skip center area for text legibility
            if (i > w / 2 - 120 && i < w / 2 + 120) continue;

            ctx.beginPath(); ctx.arc(i, py, 15, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(i + 10, py + 5, 8, 0, Math.PI * 2); ctx.fill();
        }
    }
    else if (type === 'mickey') {
        // Buttons (Anchored relative to bottom)
        ctx.fillStyle = '#FFD700';
        const btnY = h - 200;
        ctx.beginPath(); ctx.ellipse(w / 2 - 60, btnY, 20, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w / 2 + 60, btnY, 20, 30, 0, 0, Math.PI * 2); ctx.fill();

        // Ears (Decorative, top corners)
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(60, 60, 50, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w - 60, 60, 50, 0, Math.PI * 2); ctx.fill();
    }
    else if (type === 'spiderman') {
        // Blue Borders
        ctx.strokeStyle = '#0000CD'; ctx.lineWidth = 20;
        ctx.strokeRect(0, 0, w, h);

        // Eyes (Bottom corners, stylized)
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5;

        // Left Eye
        ctx.beginPath();
        ctx.moveTo(0, h - 120);
        ctx.quadraticCurveTo(80, h - 100, 100, h);
        ctx.lineTo(0, h);
        ctx.fill(); ctx.stroke();

        // Right Eye
        ctx.beginPath();
        ctx.moveTo(w, h - 120);
        ctx.quadraticCurveTo(w - 80, h - 100, w - 100, h);
        ctx.lineTo(w, h);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    else if (type === 'doraemon') {
        const footerTop = h - footerH;

        // Red Collar (At top of footer)
        ctx.fillStyle = '#D90000';
        ctx.fillRect(50, footerTop + 10, w - 100, 20);

        // Bell (Below collar)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(w / 2, footerTop + 40, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(w / 2 - 20, footerTop + 35, 40, 2);
        ctx.beginPath(); ctx.arc(w / 2, footerTop + 50, 5, 0, Math.PI * 2); ctx.fill();

        // Whiskers (Sides) - Frame Border decorations
        const whiskerStartY = footerTop + 80;
        ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
        // Left
        ctx.beginPath(); ctx.moveTo(0, whiskerStartY); ctx.lineTo(60, whiskerStartY + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, whiskerStartY + 30); ctx.lineTo(60, whiskerStartY + 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, whiskerStartY + 60); ctx.lineTo(60, whiskerStartY + 50); ctx.stroke();
        // Right
        ctx.beginPath(); ctx.moveTo(w, whiskerStartY); ctx.lineTo(w - 60, whiskerStartY + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w, whiskerStartY + 30); ctx.lineTo(w - 60, whiskerStartY + 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w, whiskerStartY + 60); ctx.lineTo(w - 60, whiskerStartY + 50); ctx.stroke();
    }

    // Holo Frame Border
    else if (type === 'holo') {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, w - 10, h - 10);
    }
    else if (type === 'travel_air') {
        const size = 40; const sw = 40;
        ctx.beginPath(); ctx.rect(0, 0, w, size); ctx.rect(0, h - size, w, size); ctx.rect(0, 0, size, h); ctx.rect(w - size, 0, size, h); ctx.clip();
        for (let i = -h; i < w + h; i += sw * 2) {
            ctx.fillStyle = "#d64545"; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + sw, 0); ctx.lineTo(i - h + sw, h + h); ctx.lineTo(i - h, h + h); ctx.fill();
            ctx.fillStyle = "#3e5f8a"; ctx.beginPath(); ctx.moveTo(i + sw, 0); ctx.lineTo(i + sw * 2, 0); ctx.lineTo(i - h + sw * 2, h + h); ctx.lineTo(i - h + sw, h + h); ctx.fill();
        }
    }
    else if (type === 'blueprint') {
        ctx.strokeStyle = '#0074D9'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.lineWidth = 3; const crSize = 50;
        ctx.beginPath(); ctx.moveTo(20, 20 + crSize); ctx.lineTo(20, 20); ctx.lineTo(20 + crSize, 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - 20, 20 + crSize); ctx.lineTo(w - 20, 20); ctx.lineTo(w - 20 - crSize, 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, h - 20 - crSize); ctx.lineTo(20, h - 20); ctx.lineTo(20 + crSize, h - 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - 20, h - 20 - crSize); ctx.lineTo(w - 20, h - 20); ctx.lineTo(w - 20 - crSize, h - 20); ctx.stroke();
    }
    else if (type === 'film') {
        ctx.fillStyle = '#fff'; const holeSize = 30; const spacing = 60;
        for (let y = 60; y < h - 60; y += spacing) {
            ctx.fillRect(10, y, holeSize, holeSize * 0.7);
            ctx.fillRect(w - 10 - holeSize, y, holeSize, holeSize * 0.7);
        }
    }
    else if (type === 'cyber') {
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 4; ctx.setLineDash([]);
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.beginPath(); ctx.moveTo(30, 30); ctx.lineTo(150, 30); ctx.lineTo(150, 60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - 30, h - 30); ctx.lineTo(w - 150, h - 30); ctx.lineTo(w - 150, h - 60); ctx.stroke();
    }
    ctx.restore();
}

function drawFooterText(ctx, w, h, footerH, type) {
    const text = document.getElementById('captionText').value;
    const isDark = ['black', 'film', 'cyber', 'mickey', 'blueprint', 'spiderman', 'doraemon'].includes(type);
    const color = isDark ? '#ffffff' : '#333333';
    const cy = h - (footerH / 2);

    ctx.save();
    if (type === 'blueprint') {
        ctx.font = '500 22px "Roboto Mono", monospace';
        ctx.fillStyle = '#0074D9';
        ctx.textAlign = 'center';
        ctx.fillText("PROJECT: FHOTOBOT // REV. C", w / 2, cy - 25);

        ctx.font = '700 34px "Roboto Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.letterSpacing = "1px";
        ctx.fillText(text.toUpperCase(), w / 2, cy + 30);
    } else {
        // Dynamic Color Logic
        let mainColor = '#333';
        let subColor = '#8B5CF6';

        if (type === 'minion') { mainColor = '#FCE029'; subColor = '#FFF'; }
        else if (type === 'spongebob') { mainColor = '#FFF'; subColor = '#FFF600'; } // White text on Brown pants
        else if (type === 'patrick') { mainColor = '#FFF'; subColor = '#8B5CF6'; } // White text on Green pants
        else if (type === 'mickey') { mainColor = '#FFF'; subColor = '#FFD700'; }
        else if (type === 'spiderman') { mainColor = '#FFF'; subColor = '#000'; }
        else if (type === 'doraemon') { mainColor = '#333'; subColor = '#D90000'; }
        else if (isDark) { mainColor = '#FFF'; subColor = '#FFD700'; }
        if (type === 'cyber') subColor = '#00ffcc';

        ctx.font = 'italic 500 24px "Fredoka One", cursive';
        ctx.fillStyle = subColor;
        ctx.textAlign = 'center';
        ctx.fillText("Fhotobot Studio", w / 2, cy - 25);

        ctx.font = '800 38px "Montserrat", sans-serif';
        ctx.fillStyle = mainColor;
        ctx.textAlign = 'center';
        ctx.letterSpacing = "1px";
        const maxTextWidth = w - 100;
        let displayText = text;
        if (ctx.measureText(displayText).width > maxTextWidth) {
            while (ctx.measureText(displayText + '...').width > maxTextWidth && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
            }
            displayText += '...';
        }
        ctx.fillText(displayText, w / 2, cy + 30);
    }
    ctx.restore();
}

// --- STICKER LOGIC ---
function addSticker(emoji) {
    const el = document.createElement('div'); el.className = 'draggable-sticker'; el.innerText = emoji;
    el.style.fontSize = sizeSlider.value + 'rem';
    el.style.left = (30 + Math.random() * 30) + '%';
    el.style.top = (30 + Math.random() * 30) + '%';
    makeInteractable(el); stickerLayer.appendChild(el); selectSticker(el);
}

function selectSticker(el) {
    document.querySelectorAll('.draggable-sticker').forEach(s => s.classList.remove('selected'));
    appState.selectedSticker = el; el.classList.add('selected');
    sizeSlider.value = parseFloat(el.style.fontSize);
    sizeLabel.innerText = "Size: " + sizeSlider.value;
}

function resizeCurrentSticker(val) {
    if (appState.selectedSticker) {
        appState.selectedSticker.style.fontSize = val + 'rem';
        sizeLabel.innerText = "Size: " + val;
    }
}

function makeInteractable(el) {
    let isDown = false, startX, startY, startL, startT;
    const onStart = (e) => {
        selectSticker(el); isDown = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        startX = clientX; startY = clientY;
        startL = el.offsetLeft; startT = el.offsetTop;
        el.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
        if (!isDown) return; e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        el.style.left = (startL + (clientX - startX)) + 'px';
        el.style.top = (startT + (clientY - startY)) + 'px';
    };
    const onEnd = () => { isDown = false; el.style.cursor = 'grab'; };
    el.addEventListener('mousedown', onStart); el.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove); window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd); window.addEventListener('touchend', onEnd);
    el.addEventListener('dblclick', () => { el.remove(); appState.selectedSticker = null; });
}

function saveFinalImage() {
    if (appState.selectedSticker) appState.selectedSticker.classList.remove('selected');
    const stickers = document.querySelectorAll('.draggable-sticker');
    const layerRect = stickerLayer.getBoundingClientRect();
    const scale = canvas.width / layerRect.width;
    ctx.save();
    stickers.forEach(st => {
        const rect = st.getBoundingClientRect();
        const fontSize = parseFloat(window.getComputedStyle(st).fontSize);
        ctx.font = `${fontSize * scale}px "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = 'white';
        const x = (rect.left - layerRect.left) * scale;
        const y = (rect.top - layerRect.top) * scale;
        ctx.fillText(st.innerText, x, y + (5 * scale));
    });
    ctx.restore();
    const link = document.createElement('a');
    link.download = `Fhotobot_Print_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    setTimeout(renderCanvas, 1000);
}

function resetToCamera() {
    stickerLayer.innerHTML = '';
    document.getElementById('editorView').classList.remove('flex');
    document.getElementById('cameraView').classList.remove('hidden');
    document.getElementById('editorControls').classList.add('hidden');
    document.getElementById('cameraControls').classList.remove('hidden');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// =========================================
// FITUR BACKSOUND MUSIC
// =========================================
const bgMusic = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicControl');
let isMusicPlaying = false;

// Set volume awal
bgMusic.volume = 0.4;

function toggleMusic() {
    if (bgMusic.paused) {
        bgMusic.play();
        musicBtn.innerHTML = "🎵 Music: ON";
        musicBtn.classList.remove('muted');
        isMusicPlaying = true;
    } else {
        bgMusic.pause();
        musicBtn.innerHTML = "🔇 Music: OFF";
        musicBtn.classList.add('muted');
        isMusicPlaying = false;
    }
}

// Coba putar otomatis saat website dimuat
window.addEventListener('DOMContentLoaded', () => {
    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            isMusicPlaying = true;
        })
            .catch(error => {
                // Autoplay diblokir browser, tunggu klik pertama
                musicBtn.innerHTML = "🔇 Click to Play";
                musicBtn.classList.add('muted');

                document.body.addEventListener('click', function startMusicOnFirstClick() {
                    bgMusic.play();
                    musicBtn.innerHTML = "🎵 Music: ON";
                    musicBtn.classList.remove('muted');
                    isMusicPlaying = true;
                    document.body.removeEventListener('click', startMusicOnFirstClick);
                }, { once: true });
            });
    }
});