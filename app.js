import {
  allCells,
  applyCatMove,
  createGame,
  isEdge,
  key,
  placeObstacle,
} from "./hex-core.js";
import { CatMoveAnimation, SpiderCatSprite } from "./spider-cat.js";

const COLORS = {
  empty: "#3d4a63",
  border: "#48556e",
  borderStroke: "#788caa",
  grid: "#5a6a82",
  obs: "#1e232c",
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const btnReset = document.getElementById("btn-reset");
const btnBlank = document.getElementById("btn-blank");

let state = createGame();
let hexSize = 28;
let originX = 0;
let originY = 0;
let spider = new SpiderCatSprite();
let catAnim = null;
let busy = false;
let rafId = 0;

function axialToPixel(q, r, size, ox, oy) {
  const x = size * Math.sqrt(3) * (q + r / 2) + ox;
  const y = size * (3 / 2) * r + oy;
  return [x, y];
}

function hexCorners(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const rad = ((60 * i - 30) * Math.PI) / 180;
    pts.push([cx + size * Math.cos(rad), cy + size * Math.sin(rad)]);
  }
  return pts;
}

function measureGridBounds(R, size) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const drawSize = size * 0.92;
  for (const [q, r] of allCells(R)) {
    const [cx, cy] = axialToPixel(q, r, size, 0, 0);
    for (const [px, py] of hexCorners(cx, cy, drawSize)) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function layoutBoard() {
  const R = state.R;
  const wrap = canvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const margin = 6;
  const availW = Math.max(1, w - margin * 2);
  const availH = Math.max(1, h - margin * 2);

  const gridUnit = measureGridBounds(R, 1);
  const padUnit = spider.getPadding(1);

  const hexByW = availW / (gridUnit.width + padUnit.left + padUnit.right);
  const hexByH = availH / (gridUnit.height + padUnit.top + padUnit.bottom);
  hexSize = Math.max(10, Math.min(hexByW, hexByH, 40));

  const grid = measureGridBounds(R, hexSize);
  const pad = spider.getPadding(hexSize);
  const totalW = grid.width + pad.left + pad.right;
  const totalH = grid.height + pad.top + pad.bottom;

  originX = margin + (availW - totalW) / 2 + pad.left - grid.minX;
  originY = margin + (availH - totalH) / 2 + pad.top - grid.minY;
}

function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  let best = null;
  let bestD = Infinity;
  const thresh = (hexSize * 0.88) ** 2;
  for (const [q, r] of allCells(state.R)) {
    const [cx, cy] = axialToPixel(q, r, hexSize, originX, originY);
    const d = (mx - cx) ** 2 + (my - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = [q, r];
    }
  }
  return bestD <= thresh ? best : null;
}

function drawHex(cx, cy, fill, stroke) {
  const pts = hexCorners(cx, cy, hexSize * 0.92);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBoard(now) {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  for (const [q, r] of allCells(state.R)) {
    const [cx, cy] = axialToPixel(q, r, hexSize, originX, originY);
    const k = key(q, r);
    let fill;
    let stroke = COLORS.grid;
    if (state.blocked.has(k)) {
      fill = COLORS.obs;
    } else if (isEdge(q, r, state.R)) {
      fill = COLORS.border;
      stroke = COLORS.borderStroke;
    } else {
      fill = COLORS.empty;
    }
    drawHex(cx, cy, fill, stroke);
  }

  if (catAnim) {
    const [cx, cy] = catAnim.pixelPos(hexSize, originX, originY, axialToPixel, now);
    spider.draw(ctx, cx, cy, hexSize, catAnim.gifFrameIndex(now));
  } else {
    const [cq, cr] = state.cat;
    const [cx, cy] = axialToPixel(cq, cr, hexSize, originX, originY);
    spider.draw(ctx, cx, cy, hexSize, 0);
  }
}

function stepCatAnim(now) {
  if (!catAnim) return;
  if (!catAnim.finished(now)) return;
  state = applyCatMove(state, catAnim.to);
  catAnim = null;
  busy = false;
  updateStatus();
}

function tick() {
  const now = performance.now();
  try {
    stepCatAnim(now);
    drawBoard(now);
    if (catAnim) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  } catch (err) {
    console.error(err);
    catAnim = null;
    busy = false;
    rafId = 0;
    updateStatus();
    drawBoard(now);
  }
}

function scheduleFrame() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function updateStatus() {
  if (busy) {
    statusEl.textContent = "猫爬行中…";
    statusEl.className = "status";
    hintEl.textContent = "\u00a0";
    return;
  }
  if (state.gameOver) {
    statusEl.textContent = state.winMessage;
    statusEl.className = "status over";
    hintEl.textContent = "点击棋盘开始新局";
  } else {
    statusEl.textContent = "点空格放障碍，围住耄耋";
    statusEl.className = "status";
    hintEl.textContent = `猫 (${state.cat[0]},${state.cat[1]}) · 障碍 ${state.blocked.size}`;
  }
}

function handleClick(q, r) {
  if (busy) return;
  const result = placeObstacle(state, q, r);
  if (!result.changed) return;

  state = result.state;
  if (result.catMove) {
    const startMs = performance.now();
    busy = true;
    catAnim = new CatMoveAnimation(
      [state.cat[0], state.cat[1]],
      result.catMove,
      spider,
      startMs
    );
    updateStatus();
    drawBoard(startMs);
    scheduleFrame();
  } else {
    catAnim = null;
    updateStatus();
    drawBoard(performance.now());
  }
}

function onPointer(clientX, clientY) {
  const cell = pickCell(clientX, clientY);
  if (cell) handleClick(cell[0], cell[1]);
}

function resetGame(randomObstacles = true) {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  catAnim = null;
  busy = false;
  state = createGame(state.R, { randomObstacles });
  updateStatus();
  layoutBoard();
  drawBoard(performance.now());
}

canvas.addEventListener("click", (e) => onPointer(e.clientX, e.clientY));
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onPointer(t.clientX, t.clientY);
  },
  { passive: false }
);

btnReset.addEventListener("click", () => resetGame(true));
btnBlank.addEventListener("click", () => resetGame(false));

window.addEventListener("resize", () => {
  layoutBoard();
  drawBoard(performance.now());
});

async function boot() {
  statusEl.textContent = "加载中…";
  hintEl.textContent = "\u00a0";
  try {
    await spider.load("assets/spider/meta.json");
    resetGame(true);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "素材加载失败";
    statusEl.className = "status over";
    const msg = e && e.message ? String(e.message) : "未知错误";
    hintEl.textContent = msg.includes("8765") || msg.includes("Failed")
      ? "请确认 start.bat 已启动，并访问 http://本机IP:8765/web/"
      : msg.slice(0, 80);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
