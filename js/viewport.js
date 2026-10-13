/**
 * 二维视口：平移 + 缩放（世界坐标系 y 轴向上）。
 * height = 视野在世界坐标中的高度，其余量均可由它推导。
 */
class PanZoom {
    constructor() {
        this.cx = 0;
        this.cy = 0;
        this.height = 2.4;
        this._def = { cx: 0, cy: 0, height: 2.4 };
    }

    setDefault(cx, cy, height) {
        this._def = { cx, cy, height };
        this.reset();
    }

    reset() {
        this.cx = this._def.cx;
        this.cy = this._def.cy;
        this.height = this._def.height;
    }

    aspect(canvas) {
        return canvas.clientWidth / Math.max(1, canvas.clientHeight);
    }

    /** CSS 像素坐标（y 向下）→ 世界坐标（y 向上） */
    worldFromScreen(px, py, canvas) {
        const r = canvas.getBoundingClientRect();
        const nx = ((px - r.left) / r.width) * 2 - 1;
        const ny = -(((py - r.top) / r.height) * 2 - 1);
        return {
            x: this.cx + nx * (this.height / 2) * this.aspect(canvas),
            y: this.cy + ny * (this.height / 2)
        };
    }

    /** 拖动平移（dx/dy 为 CSS 像素增量） */
    pan(dxCSS, dyCSS, canvas) {
        const wpp = this.height / Math.max(1, canvas.clientHeight);
        this.cx -= dxCSS * wpp;
        this.cy += dyCSS * wpp;
    }

    /** 以屏幕上 (px,py) 为不动点缩放 */
    zoomAt(px, py, factor, canvas) {
        const before = this.worldFromScreen(px, py, canvas);
        this.height = Math.min(1e13, Math.max(1e-14, this.height * factor));
        const after = this.worldFromScreen(px, py, canvas);
        this.cx += before.x - after.x;
        this.cy += before.y - after.y;
    }

    zoomFactor(f) {
        this.height = Math.min(1e13, Math.max(1e-14, this.height * f));
    }
}