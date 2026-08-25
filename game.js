// ===================================================================
//  SNAKE
//  ---------------------------------------------------------------
//  Everything you might want to change is in the SETTINGS block
//  right below. You do not need to understand the rest of the file.
// ===================================================================

const SETTINGS = {

  // ---- COLOURS -------------------------------------------------
  // Try: "blue", "red", "hotpink", "orange", "purple", "gold"
  snakeColour:      "gold",
  foodColour:       "#ff6b6b",
  backgroundColour: "#111318",
  gridColour:       "#1c2029",

  // ---- HOW IT PLAYS --------------------------------------------
  speed: 12,         // moves per second. Higher = faster.
  startingLength: 3, // how long the snake begins
  trailSeconds: 1.5, // how long the fading trail behind the snake lasts

  // ---- EAT EXPLOSION ---------------------------------------------
  particleCount: 14,    // how many bits fly out when you eat
  particleSeconds: 0.7, // how long they last

  // ---- THE BOARD -----------------------------------------------
  columns: 24,
  rows: 18,
  cellSize: 22,
};

// ===================================================================
//  From here down is the machinery that makes the game work.
//  Feel free to ignore it, or ask your AI assistant about it.
// ===================================================================

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const overlayEl = document.getElementById("overlay");
const overlayTextEl = document.getElementById("overlay-text");

canvas.width = SETTINGS.columns * SETTINGS.cellSize;
canvas.height = SETTINGS.rows * SETTINGS.cellSize;

let snake, direction, nextDirection, food, score, alive, started, trail, particles;

function reset() {
  const midX = Math.floor(SETTINGS.columns / 2);
  const midY = Math.floor(SETTINGS.rows / 2);

  snake = [];
  for (let i = 0; i < SETTINGS.startingLength; i++) {
    snake.push({ x: midX - i, y: midY });
  }

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  trail = [];
  particles = [];
  alive = true;
  started = false;
  placeFood();
  updateScore();
  showOverlay("Press any arrow key to start");
}

function placeFood() {
  let spot;
  do {
    spot = {
      x: Math.floor(Math.random() * SETTINGS.columns),
      y: Math.floor(Math.random() * SETTINGS.rows),
    };
  } while (snake.some((part) => part.x === spot.x && part.y === spot.y));
  food = spot;
}

function updateScore() {
  scoreEl.textContent = score;
}

function showOverlay(message) {
  overlayTextEl.textContent = message;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

// --- food explosion -------------------------------------------------
// Eating spawns little dots that fly outward, slow down, then vanish.
function explode(cellX, cellY) {
  for (let i = 0; i < SETTINGS.particleCount; i++) {
    const angle = Math.random() * Math.PI * 2; // pick a random direction
    const speed = 1 + Math.random() * 3;       // pick a random strength
    particles.push({
      x: cellX * SETTINGS.cellSize + SETTINGS.cellSize / 2,
      y: cellY * SETTINGS.cellSize + SETTINGS.cellSize / 2,
      vx: Math.cos(angle) * speed, // sideways push
      vy: Math.sin(angle) * speed, // up/down push
      size: 1.5 + Math.random() * 2, // dot size
      life: 1,
    });
  }
}

function step() {
  if (!alive || !started) return;

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall =
    head.x < 0 || head.y < 0 ||
    head.x >= SETTINGS.columns || head.y >= SETTINGS.rows;

  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);

  if (hitWall || hitSelf) {
    alive = false;
    showOverlay("Game over — press any arrow key to play again");
    return;
  }

  // leave a trail dot where the head used to be
  trail.push({ x: snake[0].x, y: snake[0].y, life: 1 });

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    explode(food.x, food.y);
    score += 1;
    updateScore();
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  const size = SETTINGS.cellSize;

  // background
  ctx.fillStyle = SETTINGS.backgroundColour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid lines
  ctx.strokeStyle = SETTINGS.gridColour;
  ctx.lineWidth = 1;
  for (let c = 0; c <= SETTINGS.columns; c++) {
    ctx.beginPath();
    ctx.moveTo(c * size, 0);
    ctx.lineTo(c * size, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= SETTINGS.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * size);
    ctx.lineTo(canvas.width, r * size);
    ctx.stroke();
  }

  // trail: the fading path behind the snake
  ctx.fillStyle = SETTINGS.snakeColour;
  trail.forEach((spot) => {
    ctx.globalAlpha = spot.life * 0.4; // fresh trail glows, old trail is faint
    ctx.fillRect(spot.x * size + 2, spot.y * size + 2, size - 4, size - 4);
  });
  ctx.globalAlpha = 1;

  // explosion bits left over from eaten food
  ctx.fillStyle = SETTINGS.foodColour;
  particles.forEach((bit) => {
    ctx.globalAlpha = bit.life; // fresh bits glow, old bits are faint
    ctx.beginPath();
    ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // food
  ctx.fillStyle = SETTINGS.foodColour;
  ctx.beginPath();
  ctx.arc(
    food.x * size + size / 2,
    food.y * size + size / 2,
    size / 2 - 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // snake
  ctx.fillStyle = SETTINGS.snakeColour;
  snake.forEach((part, index) => {
    ctx.globalAlpha = index === 0 ? 1 : Math.max(0.45, 1 - index * 0.04);
    ctx.fillRect(part.x * size + 2, part.y * size + 2, size - 4, size - 4);
  });
  ctx.globalAlpha = 1;
}

// --- main loop: draws smoothly, moves on a fixed tick -------------
let lastTick = 0;

function loop(timestamp) {
  const interval = 1000 / SETTINGS.speed;
  if (timestamp - lastTick >= interval) {
    step();
    lastTick = timestamp;
  }
  // fade the trail out a little bit every frame (~60 frames per second)
  const fadeStep = 1 / (SETTINGS.trailSeconds * 60);
  trail.forEach((spot) => { spot.life -= fadeStep; });
  trail = trail.filter((spot) => spot.life > 0);

  // nudge the explosion bits along and fade them out every frame
  const particleFade = 1 / (SETTINGS.particleSeconds * 60);
  particles.forEach((bit) => {
    bit.x += bit.vx;
    bit.y += bit.vy;
    bit.vx *= 0.94; // air resistance: bits slow down as they fly
    bit.vy *= 0.94;
    bit.life -= particleFade;
  });
  particles = particles.filter((bit) => bit.life > 0);

  draw();
  requestAnimationFrame(loop);
}

// --- controls -----------------------------------------------------
const KEYS = {
  ArrowUp:    { x: 0,  y: -1 },
  ArrowDown:  { x: 0,  y: 1  },
  ArrowLeft:  { x: -1, y: 0  },
  ArrowRight: { x: 1,  y: 0  },
};

document.addEventListener("keydown", (event) => {
  const turn = KEYS[event.key];
  if (!turn) return;

  event.preventDefault();

  if (!alive) {
    reset();
    started = true;
    hideOverlay();
    return;
  }

  if (!started) {
    started = true;
    hideOverlay();
  }

  // don't let the snake reverse into itself
  const isReverse =
    turn.x === -direction.x && turn.y === -direction.y;
  if (!isReverse) {
    nextDirection = turn;
  }
});

// --- go -----------------------------------------------------------
reset();
requestAnimationFrame(loop);
