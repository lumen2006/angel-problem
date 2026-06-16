/** 蜘蛛耄耋：锚点对齐格心，平移 + 腿帧（须全部加载完再显示） */

const HEAD_RADIUS_RATIO = 0.62;
/** 相对格心向上微调 */
const HEAD_LIFT_RATIO = 0.05;
/** 始终相对本脚本所在目录（/web/），不受地址栏有无尾斜杠影响 */
const WEB_ROOT = new URL("./", import.meta.url);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

export class SpiderCatSprite {
  constructor() {
    this.frames = [];
    this.anchor = [0, 0];
    this.headRadiusSrc = 34;
    this.durationMs = 400;
    this.msPerFrame = 65;
    this.ready = false;
    this._loading = null;
  }

  async load(metaPath = "assets/spider/meta.json") {
    if (this.ready) return true;
    if (this._loading) return this._loading;
    this._loading = this._doLoad(metaPath).finally(() => {
      this._loading = null;
    });
    return this._loading;
  }

  async _doLoad(metaPath) {
    const metaUrl = new URL(metaPath, WEB_ROOT).href;
    const res = await fetch(metaUrl);
    if (!res.ok) throw new Error(`meta ${res.status}: ${metaUrl}`);
    const meta = await res.json();

    this.anchor = meta.anchor;
    this.headRadiusSrc = meta.headRadiusSrc;
    this.durationMs = meta.durationMs ?? 400;
    this.msPerFrame = meta.msPerFrame ?? 65;

    const urls = meta.frames.map((p) => new URL(p, WEB_ROOT).href);
    const images = await Promise.all(
      urls.map((u) => loadImage(u).catch(() => Promise.reject(new Error(u))))
    );
    this.frames = images;
    this.ready = this.frames.length > 0;
    if (!this.ready) throw new Error("无有效帧");
    return true;
  }

  frameCount() {
    return this.frames.length;
  }

  _scale(hexSize) {
    return (hexSize * HEAD_RADIUS_RATIO) / this.headRadiusSrc;
  }

  getPadding(hexSize) {
    if (!this.ready) {
      return {
        left: hexSize * 0.55,
        right: hexSize * 0.55,
        top: hexSize * 0.2,
        bottom: hexSize * 0.35,
      };
    }
    const scale = this._scale(hexSize);
    const src = this.frames[0];
    const w = src.width * scale;
    const h = src.height * scale;
    const ax = this.anchor[0] * scale;
    const ay = this.anchor[1] * scale;
    return { left: ax, right: w - ax, top: ay, bottom: h - ay };
  }

  draw(ctx, cx, cy, hexSize, frameIndex = 0) {
    if (!this.ready || !this.frames.length) return;
    const scale = this._scale(hexSize);
    const src = this.frames[frameIndex % this.frames.length];
    const w = src.width * scale;
    const h = src.height * scale;
    const ax = this.anchor[0] * scale;
    const ay = this.anchor[1] * scale;
    const lift = hexSize * HEAD_LIFT_RATIO;
    ctx.drawImage(src, cx - ax, cy - ay - lift, w, h);
  }
}

export class CatMoveAnimation {
  constructor(fr, to, spider, startMs = performance.now()) {
    this.fr = [fr[0], fr[1]];
    this.to = [to[0], to[1]];
    this.spider = spider;
    this.startMs = startMs;
    this.durationMs = Number(spider.durationMs) || 400;
    this.msPerFrame = Number(spider.msPerFrame) || 65;
  }

  progress(now) {
    const t = (now - this.startMs) / this.durationMs;
    return Math.min(1, Math.max(0, t));
  }

  finished(now) {
    return this.progress(now) >= 1;
  }

  pixelPos(hexSize, ox, oy, axialToPixel, now) {
    let t = this.progress(now);
    t = 1 - (1 - t) ** 2;
    const [x0, y0] = axialToPixel(this.fr[0], this.fr[1], hexSize, ox, oy);
    const [x1, y1] = axialToPixel(this.to[0], this.to[1], hexSize, ox, oy);
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  }

  gifFrameIndex(now) {
    const n = this.spider.frameCount();
    if (n <= 0) return 0;
    return Math.floor((now - this.startMs) / this.msPerFrame) % n;
  }
}
