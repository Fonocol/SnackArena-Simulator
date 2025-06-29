const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const frameInfo = document.getElementById("currentFrame");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevFrameBtn");
const nextBtn = document.getElementById("nextFrameBtn");
const speedControl = document.getElementById("speedControl");
const speedValue = document.getElementById("speedValue");
const snakeLengthDisplay = document.getElementById("snakeLength");
const targetPosDisplay = document.getElementById("targetPos");
const simStatusDisplay = document.getElementById("simStatus");
const totalFramesDisplay = document.getElementById("totalFrames");

let data = [];
let frame = 0;
let interval = null;
let playing = false;
const CELL_SIZE = 20;

// Update speed display
speedControl.addEventListener("input", () => {
    speedValue.textContent = `${speedControl.value}ms`;
});

// Load simulation data
fetch("episode_001.json")
    .then((res) => res.json())
    .then((json) => {
        data = json;
        totalFramesDisplay.textContent = data.length;
        drawFrame();
    });

function drawFrame() {
    if (!data[frame]) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Draw target
    const target = data[frame].target;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(target.x * CELL_SIZE, target.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Add target highlight
    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 2;
    ctx.strokeRect(target.x * CELL_SIZE, target.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    targetPosDisplay.textContent = `(${target.x}, ${target.y})`;

    // Draw snake
    const snake = data[frame].snake;
    snake.forEach((p, i) => {
        // Head is a different color
        if (i === 0) {
            ctx.fillStyle = "#4ade80";
        } else {
            // Gradient body
            const intensity = 1 - (i / snake.length) * 0.7;
            ctx.fillStyle = `rgb(74, 222, ${128 * intensity})`;
        }
        ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        // Add border to each segment
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    snakeLengthDisplay.textContent = snake.length;

    // Update UI
    frameInfo.textContent = `Frame: ${frame + 1}/${data.length}`;

    if (data[frame].done) {
        simStatusDisplay.textContent = "Terminated";
        simStatusDisplay.classList.remove("running");
        simStatusDisplay.classList.add("terminated");
    } else {
        simStatusDisplay.textContent = "Running";
        simStatusDisplay.classList.remove("terminated");
        simStatusDisplay.classList.add("running");
    }
}

function drawGrid() {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x <= canvas.width; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function play() {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
        if (frame < data.length - 1) {
            frame++;
            drawFrame();
        } else {
            pause();
        }
    }, speedControl.value);
}

function pause() {
    clearInterval(interval);
    interval = null;
    playing = false;
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i> Play`;
    playPauseBtn.classList.remove("primary");
}

playPauseBtn.onclick = () => {
    playing = !playing;
    if (playing) {
        playPauseBtn.innerHTML = `<i class="fas fa-pause"></i> Pause`;
        playPauseBtn.classList.add("primary");
        play();
    } else {
        pause();
    }
};

prevBtn.onclick = () => {
    if (frame > 0) frame--;
    drawFrame();
};

nextBtn.onclick = () => {
    if (frame < data.length - 1) frame++;
    drawFrame();
};

speedControl.oninput = () => {
    speedValue.textContent = `${speedControl.value}ms`;
    if (playing) {
        pause();
        play();
    }
};

// Initialize speed display
speedValue.textContent = `${speedControl.value}ms`;