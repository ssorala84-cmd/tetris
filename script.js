const COLS = 10;
const ROWS = 20;
const CELL = 30;
const BASE_DROP_INTERVAL = 900;
const MIN_DROP_INTERVAL = 100;

const PIECES = [
  { name: "I", color: "#54e7ff", shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { name: "J", color: "#6688ff", shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  { name: "L", color: "#ff9b5a", shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  { name: "O", color: "#ffe45c", shape: [[1, 1], [1, 1]] },
  { name: "S", color: "#76e36b", shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  { name: "T", color: "#c47aff", shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  { name: "Z", color: "#ff6687", shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const gameCanvas = document.querySelector("#gameCanvas");
const nextCanvas = document.querySelector("#nextCanvas");
const ctx = gameCanvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");
const scoreValue = document.querySelector("#scoreValue");
const levelValue = document.querySelector("#levelValue");
const linesValue = document.querySelector("#linesValue");
const levelBadge = document.querySelector("#levelBadge");
const headerStatus = document.querySelector("#headerStatus");
const statusDot = document.querySelector("#statusDot");
const boardOverlay = document.querySelector("#boardOverlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const overlayButton = document.querySelector("#overlayButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");

let board = createBoard();
let current = null;
let next = randomPieceDefinition();
let score = 0;
let lines = 0;
let level = 1;
let status = "start";
let dropCounter = 0;
let lastTime = 0;
let animationFrame;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPieceDefinition() {
  const definition = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { ...definition, shape: definition.shape.map((row) => [...row]) };
}

function makePiece(definition) {
  const width = definition.shape[0].length;
  return {
    name: definition.name,
    color: definition.color,
    shape: definition.shape.map((row) => [...row]),
    x: Math.floor((COLS - width) / 2),
    y: 0,
  };
}

function startGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  next = randomPieceDefinition();
  status = "playing";
  spawnNextPiece();
  hideOverlay();
  updateHud();
}

function spawnNextPiece() {
  current = makePiece(next);
  next = randomPieceDefinition();
  if (collides(board, current, 0, 0)) {
    endGame();
  }
}

function endGame() {
  status = "gameover";
  current = null;
  showOverlay("GAME OVER", "게임 오버", "최종 기록을 확인하고 다시 도전해보세요.", "다시 시작");
  updateHud();
}

function togglePause() {
  if (status === "playing") {
    status = "paused";
    showOverlay("PAUSED", "잠시 멈춤", "준비가 되면 게임을 다시 이어가세요.", "계속하기");
  } else if (status === "paused") {
    status = "playing";
    hideOverlay();
  }
  updateHud();
}

function movePiece(dx) {
  if (status !== "playing" || !current) return;
  if (!collides(board, current, dx, 0)) current.x += dx;
}

function softDrop() {
  if (status !== "playing" || !current) return;
  if (moveDown()) {
    score += 1;
    updateHud();
  }
}

function moveDown() {
  if (!current || collides(board, current, 0, 1)) {
    if (current) lockPiece();
    return false;
  }
  current.y += 1;
  return true;
}

function hardDrop() {
  if (status !== "playing" || !current) return;
  let distance = 0;
  while (!collides(board, current, 0, 1)) {
    current.y += 1;
    distance += 1;
  }
  score += distance * 2;
  lockPiece();
}

function rotatePiece() {
  if (status !== "playing" || !current) return;
  const rotated = current.shape[0].map((_, index) => current.shape.map((row) => row[index]).reverse());
  const originalShape = current.shape;
  current.shape = rotated;

  const offsets = [0, -1, 1, -2, 2];
  const originalX = current.x;
  for (const offset of offsets) {
    current.x = originalX + offset;
    if (!collides(board, current, 0, 0)) return;
  }
  current.x = originalX;
  current.shape = originalShape;
}

function collides(targetBoard, piece, dx, dy) {
  for (let row = 0; row < piece.shape.length; row += 1) {
    for (let col = 0; col < piece.shape[row].length; col += 1) {
      if (!piece.shape[row][col]) continue;
      const x = piece.x + col + dx;
      const y = piece.y + row + dy;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && targetBoard[y][x]) return true;
    }
  }
  return false;
}

function lockPiece() {
  if (!current) return;
  for (let row = 0; row < current.shape.length; row += 1) {
    for (let col = 0; col < current.shape[row].length; col += 1) {
      if (current.shape[row][col] && current.y + row >= 0) {
        board[current.y + row][current.x + col] = current.color;
      }
    }
  }
  clearLines();
  spawnNextPiece();
  dropCounter = 0;
  updateHud();
}

function clearLines() {
  let cleared = 0;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row].every(Boolean)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      row += 1;
    }
  }
  if (cleared > 0) {
    score += LINE_SCORES[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
  }
}

function getDropInterval() {
  return Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL - (level - 1) * 75);
}

function getGhostY() {
  if (!current) return 0;
  let ghostY = current.y;
  while (!collides(board, { ...current, y: ghostY }, 0, 1)) ghostY += 1;
  return ghostY;
}

function draw() {
  drawBoard();
  drawNext();
}

function drawBoard() {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  ctx.fillStyle = "#0a0d1b";
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col]) drawCell(ctx, col, row, board[row][col]);
    }
  }

  ctx.strokeStyle = "rgba(112, 133, 190, .14)";
  ctx.lineWidth = 1;
  for (let col = 0; col <= COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * CELL + 0.5, 0);
    ctx.lineTo(col * CELL + 0.5, ROWS * CELL);
    ctx.stroke();
  }
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * CELL + 0.5);
    ctx.lineTo(COLS * CELL, row * CELL + 0.5);
    ctx.stroke();
  }

  if (current) {
    const ghostY = getGhostY();
    drawPiece(current, ghostY, true);
    drawPiece(current, current.y, false);
  }
}

function drawPiece(piece, y, ghost) {
  for (let row = 0; row < piece.shape.length; row += 1) {
    for (let col = 0; col < piece.shape[row].length; col += 1) {
      if (piece.shape[row][col] && y + row >= 0) {
        drawCell(ctx, piece.x + col, y + row, piece.color, ghost);
      }
    }
  }
}

function drawCell(context, col, row, color, ghost = false, size = CELL) {
  const x = col * size;
  const y = row * size;
  const padding = 2;
  context.save();
  if (ghost) {
    context.globalAlpha = 0.22;
    context.fillStyle = color;
    context.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
    context.restore();
    return;
  }
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8;
  roundRect(context, x + padding, y + padding, size - padding * 2, size - padding * 2, 5);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(255,255,255,.32)";
  roundRect(context, x + 5, y + 5, size - 10, 3, 2);
  context.fill();
  context.restore();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#0d1123";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!next) return;
  const size = 25;
  const width = next.shape[0].length * size;
  const height = next.shape.length * size;
  const offsetX = (nextCanvas.width - width) / 2;
  const offsetY = (nextCanvas.height - height) / 2;
  next.shape.forEach((row, rowIndex) => row.forEach((filled, colIndex) => {
    if (filled) drawCell(nextCtx, (offsetX / size) + colIndex, (offsetY / size) + rowIndex, next.color, false, size);
  }));
}

function updateHud() {
  scoreValue.textContent = String(score).padStart(6, "0");
  linesValue.textContent = String(lines).padStart(2, "0");
  levelValue.textContent = String(level).padStart(2, "0");
  levelBadge.textContent = `LV ${String(level).padStart(2, "0")}`;
  const labels = { start: "READY", playing: "PLAYING", paused: "PAUSED", gameover: "GAME OVER" };
  headerStatus.textContent = labels[status];
  statusDot.className = `status-dot${status === "paused" ? " paused" : status === "gameover" ? " over" : ""}`;
  pauseButton.innerHTML = status === "paused" ? "계속하기 <span>P</span>" : "일시정지 <span>P</span>";
}

function showOverlay(kicker, title, text, buttonText) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonText;
  boardOverlay.classList.remove("hidden");
}

function hideOverlay() {
  boardOverlay.classList.add("hidden");
}

function handleAction(action) {
  if (action === "left") movePiece(-1);
  if (action === "right") movePiece(1);
  if (action === "down") softDrop();
  if (action === "rotate") rotatePiece();
  if (action === "drop") hardDrop();
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  if (status === "playing") {
    dropCounter += delta;
    if (dropCounter > getDropInterval()) {
      moveDown();
      dropCounter = 0;
      updateHud();
    }
  }
  draw();
  animationFrame = requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(key)) event.preventDefault();
  if (key === "ArrowLeft") movePiece(-1);
  else if (key === "ArrowRight") movePiece(1);
  else if (key === "ArrowDown") softDrop();
  else if (key === "ArrowUp") rotatePiece();
  else if (key === " ") hardDrop();
  else if (key.toLowerCase() === "p") togglePause();
  else if (key.toLowerCase() === "r" && (status === "start" || status === "gameover")) startGame();
});

overlayButton.addEventListener("click", () => {
  if (status === "paused") togglePause();
  else startGame();
});
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", startGame);
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

updateHud();
draw();
animationFrame = requestAnimationFrame(update);
