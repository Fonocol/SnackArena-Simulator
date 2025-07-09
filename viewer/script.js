class SnakeSimulator {
    constructor() {
        // Initialisation du canvas
        this.canvas = document.getElementById("simCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.cellSize = 80; //20
        this.zoomLevel = 0.5;
        this.offsetX = 0;
        this.offsetY = 0;

        // État de la simulation
        this.data = [];
        this.frame = 0;
        this.playing = false;
        this.interval = null;

        // Configuration visuelle
        this.settings = {
            showVision: true,
            showGrid: true,
            showTrail: true
        };

        // Initialisation
        this.initControls();
        this.loadSimulationData();
    }

    async loadSimulationData() {
        try {
            // Chargement des données depuis le fichier JSON
            const response = await fetch("episode_001.json");
            this.data = await response.json();

            // Données de démo si le fichier n'existe pas
            if (!this.data || this.data.length === 0) {
                this.data = this.createDemoData();
            }

            this.updateUI();
            this.renderFrame();
        } catch (error) {
            console.error("Erreur de chargement:", error);
            this.data = this.createDemoData();
            this.updateUI();
            this.renderFrame();
        }
    }

    createDemoData() {
        // Crée des données de démo basées sur votre backend Python
        return [{
                snake: [
                    { x: 40, y: 40 },
                    { x: 39, y: 40 },
                    { x: 38, y: 40 }
                ],
                targets: [
                    { x: 45, y: 45, etype: "target" },
                    { x: 35, y: 35, etype: "target" }
                ],
                facing: {
                    facing_angle: Math.PI / 4, // 45 degrés
                    fov: Math.PI / 2, // 90 degrés
                    range: 30 // 30 cellules
                },
                objects: [
                    { x: 42, y: 42, etype: "obstacle" },
                    { x: 37, y: 37, etype: "obstacle" }
                ],
                done: false
            },
            {
                snake: [
                    { x: 41, y: 40 },
                    { x: 40, y: 40 },
                    { x: 39, y: 40 }
                ],
                targets: [
                    { x: 45, y: 45, etype: "target" },
                    { x: 35, y: 35, etype: "target" }
                ],
                facing: {
                    facing_angle: Math.PI / 2, // 90 degrés
                    fov: Math.PI / 2,
                    range: 30
                },
                objects: [
                    { x: 42, y: 42, etype: "obstacle" },
                    { x: 37, y: 37, etype: "obstacle" }
                ],
                done: false
            }
        ];
    }

    initControls() {
        // Boutons de contrôle
        document.getElementById("playPauseBtn").addEventListener("click", () => this.togglePlayPause());
        document.getElementById("prevFrameBtn").addEventListener("click", () => this.prevFrame());
        document.getElementById("nextFrameBtn").addEventListener("click", () => this.nextFrame());
        document.getElementById("restartBtn").addEventListener("click", () => this.restart());
        document.getElementById("jumpBtn").addEventListener("click", () => this.jumpToFrame());
        document.getElementById("exportBtn").addEventListener("click", () => this.exportData());

        // Contrôles de vitesse
        const speedControl = document.getElementById("speedControl");
        speedControl.addEventListener("input", () => {
            document.getElementById("speedValue").textContent = speedControl.value + "ms";
            if (this.playing) {
                this.pause();
                this.play();
            }
        });

        // Options d'affichage
        document.getElementById("toggleVision").addEventListener("change", (e) => {
            this.settings.showVision = e.target.checked;
            this.renderFrame();
        });

        document.getElementById("toggleGrid").addEventListener("change", (e) => {
            this.settings.showGrid = e.target.checked;
            this.renderFrame();
        });

        document.getElementById("toggleTrail").addEventListener("change", (e) => {
            this.settings.showTrail = e.target.checked;
            this.renderFrame();
        });

        // Contrôles de zoom
        document.getElementById("zoomIn").addEventListener("click", () => this.adjustZoom(1.2));
        document.getElementById("zoomOut").addEventListener("click", () => this.adjustZoom(0.8));
        document.getElementById("resetZoom").addEventListener("click", () => this.resetZoom());

        // Interactions canvas
        this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
        this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        this.canvas.addEventListener("mouseup", () => this.handleMouseUp());
        this.canvas.addEventListener("wheel", (e) => this.handleWheel(e), { passive: false });
    }

    renderFrame() {
        if (!this.data[this.frame]) return;

        const frameData = this.data[this.frame];
        const ctx = this.ctx;

        // Effacer le canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();

        // Appliquer le zoom et le décalage
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoomLevel, this.zoomLevel);

        // Dessiner la grille si activée
        if (this.settings.showGrid) {
            this.drawGrid();
        }

        // Dessiner le champ de vision si activé
        if (this.settings.showVision && frameData.facing && frameData.snake && frameData.snake[0]) {
            this.drawVisionField(frameData.snake[0], frameData.facing);
        }

        // Dessiner les objets
        if (frameData.objects && frameData.objects.length > 0) {
            frameData.objects.forEach(obj => this.drawObject(obj));
        }

        // Dessiner les cibles
        if (frameData.targets && frameData.targets.length > 0) {
            frameData.targets.forEach(target => this.drawTarget(target, frameData));
        }

        // Dessiner le serpent
        if (frameData.snake && frameData.snake.length > 0) {
            this.drawSnake(frameData.snake);
        }

        // Dessiner la traînée si activée
        if (this.settings.showTrail) {
            this.drawSnakeTrail();
        }

        ctx.restore();
        this.updateUI(frameData);
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;

        const width = this.canvas.width / (this.zoomLevel * this.cellSize);
        const height = this.canvas.height / (this.zoomLevel * this.cellSize);
        const startX = Math.max(0, Math.floor(-this.offsetX / (this.zoomLevel * this.cellSize)));
        const startY = Math.max(0, Math.floor(-this.offsetY / (this.zoomLevel * this.cellSize)));

        // Lignes verticales
        for (let x = startX; x <= startX + width; x++) {
            const px = x * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, height * this.cellSize);
            ctx.stroke();
        }

        // Lignes horizontales
        for (let y = startY; y <= startY + height; y++) {
            const py = y * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(width * this.cellSize, py);
            ctx.stroke();
        }
    }

    drawVisionField(head, facing) {
        const ctx = this.ctx;
        const cellSize = this.cellSize;

        const headX = head.x * cellSize + cellSize / 2;
        const headY = head.y * cellSize + cellSize / 2;

        const range = facing.range * cellSize;
        const fov = facing.fov;

        // Inverser l'angle Y pour compenser repère canvas
        const angle = facing.facing_angle;

        ctx.save();

        // 1. Cône de vision
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.arc(
            headX, headY,
            range,
            angle - fov / 2,
            angle + fov / 2
        );
        ctx.closePath();

        const gradient = ctx.createLinearGradient(
            headX, headY,
            headX + Math.cos(angle) * range,
            headY + Math.sin(angle) * range
        );
        gradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0.1)');

        ctx.fillStyle = gradient;
        ctx.fill();

        // 2. Cercles de distance
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
        const ringSpacing = 5 * cellSize;
        const ringCount = Math.floor(facing.range / 5);

        for (let i = 1; i <= ringCount; i++) {
            ctx.beginPath();
            ctx.arc(headX, headY, i * ringSpacing, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. Lignes radiales
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        const lineCount = 8;
        for (let i = 0; i <= lineCount; i++) {
            const a = angle - fov / 2 + (fov / lineCount) * i;
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.lineTo(
                headX + Math.cos(a) * range,
                headY + Math.sin(a) * range
            );
            ctx.stroke();
        }

        // 4. Ligne centrale
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(
            headX + Math.cos(angle) * range,
            headY + Math.sin(angle) * range
        );
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // 5. Bordure du cône
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(
            headX + Math.cos(angle - fov / 2) * range,
            headY + Math.sin(angle - fov / 2) * range
        );
        ctx.arc(
            headX, headY,
            range,
            angle - fov / 2,
            angle + fov / 2
        );
        ctx.lineTo(headX, headY);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }


    drawSnake(snake) {
        const ctx = this.ctx;

        snake.forEach((segment, i) => {
            const x = segment.x * this.cellSize;
            const y = segment.y * this.cellSize;

            // Tête du serpent
            if (i === 0) {
                ctx.fillStyle = "#4ade80";
                ctx.fillRect(x, y, this.cellSize, this.cellSize);

                // Dessiner les yeux pour indiquer la direction
                if (this.data[this.frame].facing) {
                    const angle = this.data[this.frame].facing.facing_angle;
                    const dx = Math.sin(angle);
                    const dy = Math.cos(angle);

                    ctx.fillStyle = "white";
                    const eyeSize = this.cellSize / 5;
                    const eyeOffset = this.cellSize / 4;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        // Direction horizontale
                        const eyeX = dx > 0 ? x + this.cellSize - eyeOffset - eyeSize : x + eyeOffset;
                        ctx.fillRect(eyeX, y + eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(eyeX, y + this.cellSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                    } else {
                        // Direction verticale
                        const eyeY = dy > 0 ? y + this.cellSize - eyeOffset - eyeSize : y + eyeOffset;
                        ctx.fillRect(x + eyeOffset, eyeY, eyeSize, eyeSize);
                        ctx.fillRect(x + this.cellSize - eyeOffset - eyeSize, eyeY, eyeSize, eyeSize);
                    }
                }
            } else {
                // Corps du serpent avec dégradé de couleur
                const intensity = 1 - (i / snake.length) * 0.7;
                ctx.fillStyle = `rgb(74, 222, ${128 * intensity})`;
                ctx.fillRect(x, y, this.cellSize, this.cellSize);
            }

            // Bordure pour chaque segment
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.strokeRect(x, y, this.cellSize, this.cellSize);
        });
    }

    drawSnakeTrail() {
        const ctx = this.ctx;
        const maxFrames = Math.min(30, this.frame);

        ctx.save();

        for (let i = 0; i < maxFrames; i++) {
            const frameIndex = this.frame - i - 1;
            if (frameIndex < 0 || !this.data[frameIndex]) continue;

            const head = this.data[frameIndex].snake[0];
            const x = head.x * this.cellSize;
            const y = head.y * this.cellSize;
            const size = this.cellSize * (0.5 + 0.5 * (i / maxFrames));
            const offset = (this.cellSize - size) / 2;

            ctx.fillStyle = `rgba(74, 222, 128, ${0.2 * (1 - i/maxFrames)})`;
            ctx.fillRect(x + offset, y + offset, size, size);
        }

        ctx.restore();
    }

    drawTarget(target, frameData) {
        const ctx = this.ctx;
        const x = target.x * this.cellSize;
        const y = target.y * this.cellSize;

        // Animation de pulsation pour les cibles
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 300);
        ctx.fillStyle = `rgba(239, 68, 68, ${pulseIntensity})`;
        ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // Indicateur de détection si la cible est dans le champ de vision
        if (this.isTargetInView(target, frameData.snake[0], frameData.facing)) {
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 2, y - 2, this.cellSize + 4, this.cellSize + 4);
        }

        // Croix pour marquer la cible
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        const crossSize = this.cellSize / 3;

        ctx.beginPath();
        ctx.moveTo(centerX - crossSize, centerY);
        ctx.lineTo(centerX + crossSize, centerY);
        ctx.moveTo(centerX, centerY - crossSize);
        ctx.lineTo(centerX, centerY + crossSize);
        ctx.stroke();
    }

    drawObject(obj) {
        const ctx = this.ctx;
        const x = obj.x * this.cellSize;
        const y = obj.y * this.cellSize;

        // Dessin différent selon le type d'objet
        if (obj.etype === "obstacle") {
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(x, y, this.cellSize, this.cellSize);

            // Motif pour les obstacles
            ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + this.cellSize, y + this.cellSize);
            ctx.moveTo(x + this.cellSize, y);
            ctx.lineTo(x, y + this.cellSize);
            ctx.stroke();
        }
        // Ajouter d'autres types d'objets ici si nécessaire
    }

    isTargetInView(target, headPos, facing) {
        if (!facing || !headPos || !target) return false;

        const dx = target.x - headPos.x;
        const dy = target.y - headPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > facing.range) return false;

        const angle = Math.atan2(dy, dx);
        const angleDiff = this.normalizeAngle(angle - facing.facing_angle);

        return Math.abs(angleDiff) <= facing.fov / 2;
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    updateUI(frameData) {
        if (!frameData) frameData = this.data[this.frame] || {};

        // Mettre à jour les informations de frame
        document.getElementById("currentFrame").textContent =
            `Frame: ${this.frame + 1}/${this.data.length}`;

        // Mettre à jour la longueur du serpent
        document.getElementById("snakeLength").textContent =
            frameData.snake ? frameData.snake.length : 0;

        // Mettre à jour l'état de la simulation
        const statusElement = document.getElementById("simStatus");
        if (frameData.done) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Terminated';
            statusElement.className = "status-badge terminated";
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Running';
            statusElement.className = "status-badge running";
        }

        // Mettre à jour les informations de vision
        if (frameData.facing) {
            const angleDeg = Math.round(frameData.facing.facing_angle * (180 / Math.PI));
            document.getElementById("facingAngle").textContent = `${angleDeg}°`;
            document.getElementById("fovValue").textContent =
                `${Math.round(frameData.facing.fov * (180 / Math.PI))}°`;
            document.getElementById("visionRange").textContent = frameData.facing.range;
        }

        // Mettre à jour le nombre de cibles visibles
        let targetsInView = 0;
        if (frameData.targets && frameData.targets.length > 0 &&
            frameData.snake && frameData.snake.length > 0 &&
            frameData.facing) {
            targetsInView = frameData.targets.filter(t =>
                this.isTargetInView(t, frameData.snake[0], frameData.facing)
            ).length;
        }
        const totalTargets = frameData.targets ? frameData.targets.length : 0;
        document.getElementById("targetsVisible").textContent =
            `${targetsInView}/${totalTargets}`;

        // Mettre à jour les informations sur la cible la plus proche
        this.updateTargetInfo(frameData);

        // Mettre à jour la liste des objets visibles
        this.updateVisibleObjectsList(frameData);
    }

    updateTargetInfo(frameData) {
        if (!frameData.targets || frameData.targets.length === 0 ||
            !frameData.facing || !frameData.snake || frameData.snake.length === 0) {
            document.getElementById("targetDistance").textContent = "-";
            document.getElementById("targetAngle").textContent = "-";
            document.getElementById("distanceBar").style.width = "0%";
            document.getElementById("angleBar").style.width = "0%";
            return;
        }

        const headPos = frameData.snake[0];
        const facing = frameData.facing;

        // Trouver la cible la plus proche dans le champ de vision
        let nearestTarget = null;
        let minDistance = Infinity;

        frameData.targets.forEach(target => {
            if (!this.isTargetInView(target, headPos, facing)) return;

            const dx = target.x - headPos.x;
            const dy = target.y - headPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = target;
            }
        });

        if (!nearestTarget) {
            document.getElementById("targetDistance").textContent = "-";
            document.getElementById("targetAngle").textContent = "-";
            document.getElementById("distanceBar").style.width = "0%";
            document.getElementById("angleBar").style.width = "0%";
            return;
        }

        // Calculer l'angle de la cible par rapport à la direction
        const dx = nearestTarget.x - headPos.x;
        const dy = nearestTarget.y - headPos.y;
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = this.normalizeAngle(targetAngle - facing.facing_angle);
        const angleDeg = Math.round(angleDiff * (180 / Math.PI));

        // Mettre à jour l'UI
        document.getElementById("targetDistance").textContent =
            (Math.round(minDistance * 10) / 10).toString();
        document.getElementById("targetAngle").textContent = `${angleDeg}°`;

        // Mettre à jour les barres de progression
        const distancePercent = Math.min(100, Math.round(minDistance / facing.range * 100));
        document.getElementById("distanceBar").style.width = `${100 - distancePercent}%`;

        const anglePercent = Math.round((1 - Math.abs(angleDiff) / (facing.fov / 2)) * 100);
        document.getElementById("angleBar").style.width = `${anglePercent}%`;
    }

    updateVisibleObjectsList(frameData) {
        const container = document.getElementById("visibleObjects");
        container.innerHTML = '';

        if ((!frameData.targets || frameData.targets.length === 0) &&
            (!frameData.objects || frameData.objects.length === 0)) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye-slash"></i> No objects detected
                </div>
            `;
            return;
        }

        // Ajouter les cibles à la liste
        if (frameData.targets && frameData.targets.length > 0) {
            frameData.targets.forEach(target => {
                const inView = frameData.snake && frameData.snake.length > 0 && frameData.facing ?
                    this.isTargetInView(target, frameData.snake[0], frameData.facing) : false;

                const item = document.createElement('div');
                item.className = `object-item ${inView ? 'visible' : ''}`;
                item.innerHTML = `
                    <div class="object-icon target">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <div class="object-info">
                        <div class="object-type">Target</div>
                        <div class="object-position">(${target.x}, ${target.y})</div>
                    </div>
                    <div class="object-status">
                        ${inView ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'}
                    </div>
                `;
                container.appendChild(item);
            });
        }

        // Ajouter les autres objets à la liste
        if (frameData.objects && frameData.objects.length > 0) {
            frameData.objects.forEach(obj => {
                const inView = frameData.snake && frameData.snake.length > 0 && frameData.facing ?
                    this.isTargetInView(obj, frameData.snake[0], frameData.facing) : false;

                const item = document.createElement('div');
                item.className = `object-item ${inView ? 'visible' : ''}`;

                let icon = 'fa-question';
                let type = 'Object';

                if (obj.etype === 'obstacle') {
                    icon = 'fa-mountain';
                    type = 'Obstacle';
                }

                item.innerHTML = `
                    <div class="object-icon ${type.toLowerCase()}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="object-info">
                        <div class="object-type">${type}</div>
                        <div class="object-position">(${obj.x}, ${obj.y})</div>
                    </div>
                    <div class="object-status">
                        ${inView ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'}
                    </div>
                `;
                container.appendChild(item);
            });
        }
    }

    // Contrôles de la simulation
    togglePlayPause() {
        this.playing = !this.playing;
        const btn = document.getElementById("playPauseBtn");

        if (this.playing) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            this.play();
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Play';
            this.pause();
        }
    }

    play() {
        if (this.interval) clearInterval(this.interval);
        const speed = parseInt(document.getElementById("speedControl").value);
        this.interval = setInterval(() => this.nextFrame(), speed);
    }

    pause() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    nextFrame() {
        if (this.frame < this.data.length - 1) {
            this.frame++;
            this.renderFrame();
        } else {
            this.pause();
        }
    }

    prevFrame() {
        if (this.frame > 0) {
            this.frame--;
            this.renderFrame();
        }
    }

    restart() {
        this.frame = 0;
        this.renderFrame();
        if (this.playing) {
            this.pause();
            this.play();
        }
    }

    jumpToFrame() {
        const frameNum = parseInt(document.getElementById("frameJump").value) - 1;
        if (!isNaN(frameNum)) {
            this.frame = Math.max(0, Math.min(this.data.length - 1, frameNum));
            this.renderFrame();
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `snake_simulation_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Contrôles de vue
    adjustZoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));
        this.renderFrame();
    }

    resetZoom() {
        this.zoomLevel = 0.5;
        this.offsetX = 0;
        this.offsetY = 0;
        this.renderFrame();
    }

    // Gestion des interactions souris
    handleMouseDown(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;

        this.offsetX += dx;
        this.offsetY += dy;

        this.lastX = e.clientX;
        this.lastY = e.clientY;

        this.renderFrame();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();

        const zoomFactor = e.deltaY > 0 ? 0.8 : 1.2;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculer les coordonnées du monde avant le zoom
        const worldX = (mouseX - this.offsetX) / this.zoomLevel;
        const worldY = (mouseY - this.offsetY) / this.zoomLevel;

        // Appliquer le zoom
        this.zoomLevel *= zoomFactor;
        this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));

        // Ajuster le décalage pour que le point sous la souris reste au même endroit
        this.offsetX = mouseX - worldX * this.zoomLevel;
        this.offsetY = mouseY - worldY * this.zoomLevel;

        this.renderFrame();
    }
}

// Initialiser la simulation quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    new SnakeSimulator();
});