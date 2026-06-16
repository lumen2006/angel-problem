/**
 * 抓住神经猫 — 六角格逻辑（与 game_hex_pygame.py 一致）
 */
export const HEX_DIRECTIONS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export const DEFAULT_R = 5;

export function key(q, r) {
  return `${q},${r}`;
}

export function isValid(q, r, R) {
  return Math.abs(q) <= R && Math.abs(r) <= R && Math.abs(q + r) <= R;
}

export function isEdge(q, r, R) {
  return Math.abs(q) === R || Math.abs(r) === R || Math.abs(q + r) === R;
}

export function allCells(R) {
  const out = [];
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
      out.push([q, r]);
    }
  }
  return out;
}

export function getCatNextMove(catPos, blockedSet, R) {
  const [cq, cr] = catPos;
  const queue = [[cq, cr, []]];
  const visited = new Set([key(cq, cr)]);

  while (queue.length > 0) {
    const [q, r, path] = queue.shift();
    if (isEdge(q, r, R)) {
      return path.length > 0 ? path[0] : [q, r];
    }
    for (const [dq, dr] of HEX_DIRECTIONS) {
      const nq = q + dq;
      const nr = r + dr;
      const nk = key(nq, nr);
      if (!isValid(nq, nr, R)) continue;
      if (blockedSet.has(nk)) continue;
      if (visited.has(nk)) continue;
      visited.add(nk);
      queue.push([nq, nr, path.concat([[nq, nr]])]);
    }
  }
  return null;
}

/** 新局：默认约 10% 随机初始障碍（同 game_hex_pygame.reset_game） */
export function createGame(R = DEFAULT_R, { randomObstacles = true } = {}) {
  const blocked = new Set();
  const cat = [0, 0];
  if (randomObstacles) {
    const cells = allCells(R).filter(([q, r]) => q !== 0 || r !== 0);
    const n = Math.floor(cells.length * 0.1);
    const shuffled = cells.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < n; i++) {
      blocked.add(key(shuffled[i][0], shuffled[i][1]));
    }
  }
  return {
    R,
    cat,
    blocked,
    gameOver: false,
    winMessage: "",
  };
}

/**
 * 玩家放障碍；猫移动由前端动画完成后再 applyCatMove。
 * @returns {{ state, changed, catMove: [number,number]|null, playerWin: boolean }}
 */
export function placeObstacle(state, q, r) {
  if (state.gameOver) {
    return {
      state: createGame(state.R, { randomObstacles: true }),
      changed: true,
      catMove: null,
      playerWin: false,
    };
  }

  const k = key(q, r);
  const catKey = key(state.cat[0], state.cat[1]);
  if (k === catKey || state.blocked.has(k)) {
    return { state, changed: false, catMove: null, playerWin: false };
  }

  const blocked = new Set(state.blocked);
  blocked.add(k);

  const nextMove = getCatNextMove(state.cat, blocked, state.R);
  if (!nextMove) {
    return {
      state: {
        ...state,
        blocked,
        gameOver: true,
        winMessage: "你赢了！猫被困住了。",
      },
      changed: true,
      catMove: null,
      playerWin: true,
    };
  }

  return {
    state: { ...state, blocked },
    changed: true,
    catMove: nextMove.slice(),
    playerWin: false,
  };
}

/** 动画结束后更新猫位置并判猫是否到边境 */
export function applyCatMove(state, catPos) {
  const escaped = isEdge(catPos[0], catPos[1], state.R);
  return {
    ...state,
    cat: catPos.slice(),
    gameOver: escaped,
    winMessage: escaped ? "猫逃到边境了！" : "",
  };
}
