/* 场景一：Sierpinski 垫片（混沌游戏 + 递归细分，含 E1 n 边形推广）*/

/* ---------- 着色器 ---------- */

const VS_2D = `#version 300 es
layout(location=0) in vec2 a_pos;       //2D顶点坐标
uniform vec2  u_pan;       // 视野中心（世界坐标）
uniform float u_halfH;     // 视野半高（世界单位）
uniform float u_aspect;    // 长宽比
uniform float u_pointSize; // 点大小
uniform float u_round;     // 1 = 把点画成圆点
uniform int   u_colorMode; // 0 单色 1 纵向渐变 2 横向渐变 3 角度渐变
uniform vec3  u_colorA;
uniform vec3  u_colorB;
out vec3 v_color;           // 传给片元着色器

void main() {
    vec2 p = (a_pos - u_pan) / u_halfH;
    p.x /= u_aspect;
    gl_Position = vec4(p, 0.0, 1.0);
    gl_PointSize = u_pointSize;
    float t;
    if      (u_colorMode == 1) t = (a_pos.y - u_pan.y) / u_halfH * 0.5 + 0.5;
    else if (u_colorMode == 2) t = (a_pos.x - u_pan.x) / (u_halfH * u_aspect) * 0.5 + 0.5;
    else if (u_colorMode == 3) t = atan(a_pos.y - u_pan.y, a_pos.x - u_pan.x) / 6.28318530718 + 0.5;
    else                       t = 0.0;
    v_color = mix(u_colorA, u_colorB, clamp(t, 0.0, 1.0));
}`;

const FS_2D = `#version 300 es
precision mediump float;
uniform float u_round;
in vec3 v_color;
out vec4 f_color;
void main() {
    if (u_round > 0.5) {   // 仅在点模式下把方形点裁成圆点
        if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
    }
    f_color = vec4(v_color, 1.0);
}`;

/* ---------- 配色方案 ---------- */

const SCHEMES_2D = [
    { name: "熔岩红",         a: [0.95, 0.25, 0.15], b: [1.00, 0.75, 0.20], mode: 0 },
    { name: "海洋蓝",         a: [0.05, 0.35, 0.85], b: [0.30, 0.95, 0.95], mode: 1 },
    { name: "霓虹紫青",       a: [0.70, 0.20, 1.00], b: [0.10, 1.00, 0.90], mode: 2 },
    { name: "翡翠绿",         a: [0.05, 0.60, 0.30], b: [0.70, 1.00, 0.40], mode: 3 },
    { name: "单色白",         a: [0.92, 0.92, 0.95], b: [0.92, 0.92, 0.95], mode: 0 }
];

/* ---------- 几何生成 ---------- */

/** 正 n 边形顶点（外接圆半径 1，第一个顶点朝上） */
function regularPolygon(sides) {
    const v = [];
    for (let i = 0; i < sides; i++) {
        const a = Math.PI / 2 + i * 2 * Math.PI / sides;
        v.push([Math.cos(a), Math.sin(a)]);
    }
    return v;
}

/**
 * 混沌游戏：p ← (p + 随机顶点) / 2，迭代 n 次。
 * rule: 'free' 完全随机；'noRepeat' 禁止与上一顶点重复；
 *       'noAdjacent' 禁止重复及相邻顶点。
 * 返回 Float32Array，每点两个分量 (x, y)。
 */
function genChaosPoints(n, sides, rule) {
    const poly = regularPolygon(sides);
    const cx = poly.reduce((s, p) => s + p[0], 0) / sides;
    const cy = poly.reduce((s, p) => s + p[1], 0) / sides;
    const data = new Float32Array(n * 2);
    // 初始点：质心附近的随机点
    let px = cx + (Math.random() - 0.5) * 0.4;
    let py = cy + (Math.random() - 0.5) * 0.4;
    let last = -1;
    for (let i = 0; i < n; i++) {
        let k;
        if (rule === "free") {
            k = Math.floor(Math.random() * sides);
        } else {
            const allowed = [];
            for (let j = 0; j < sides; j++) {
                if (rule === "noRepeat" && j === last) continue;
                if (rule === "noAdjacent" && last >= 0) {
                    const d = Math.min((j - last + sides) % sides, (last - j + sides) % sides);
                    if (d <= 1) continue;
                }
                allowed.push(j);
            }
            if (allowed.length === 0) {
                k = Math.floor(Math.random() * sides);
            } else {
                k = allowed[Math.floor(Math.random() * allowed.length)];
            }
        }
        px = (px + poly[k][0]) / 2;
        py = (py + poly[k][1]) / 2;
        data[i * 2] = px;
        data[i * 2 + 1] = py;
        last = k;
    }
    return data;
}

/**
 * 递归细分生成 n 边形垫片：把每个多边形替换为 n 个"以每个顶点为中心、
 * 缩放 1/2 的副本"（三角形时退化为经典 Sierpinski 细分）。
 * 返回 { data: 扁平顶点数组, count: 图元（多边形）个数 }。
 */
function genRecursivePolys(n, depth) {
    let polys = [regularPolygon(n)];
    for (let d = 0; d < depth; d++) {
        const next = [];
        for (const poly of polys) {
            for (const v of poly) {
                next.push(poly.map(p => [v[0] + (p[0] - v[0]) / 2,
                                         v[1] + (p[1] - v[1]) / 2]));
            }
        }
        polys = next;
    }
    const out = new Float32Array(polys.length * n * 2);
    let o = 0;
    for (const poly of polys) {
        for (const p of poly) { out[o++] = p[0]; out[o++] = p[1]; }
    }
    return { data: out, count: polys.length };
}

/* ---------- 场景对象 ---------- */

const SierpinskiMode = {
    create(gl, canvas) {
        const prog = initShadersFromStrings(gl, VS_2D, FS_2D);
        const loc = {
            pan:       gl.getUniformLocation(prog, "u_pan"),
            halfH:     gl.getUniformLocation(prog, "u_halfH"),
            aspect:    gl.getUniformLocation(prog, "u_aspect"),
            pointSize: gl.getUniformLocation(prog, "u_pointSize"),
            round:     gl.getUniformLocation(prog, "u_round"),
            colorMode: gl.getUniformLocation(prog, "u_colorMode"),
            colorA:    gl.getUniformLocation(prog, "u_colorA"),
            colorB:    gl.getUniformLocation(prog, "u_colorB")
        };
        const vbo = gl.createBuffer();
        const ibo = gl.createBuffer();

        const vp = new PanZoom();   // 默认视野：单位圆图形完整可见

        const state = {
            method: "chaos",        // 'chaos' | 'recursive'
            pointCount: 20000,      // 混沌游戏顶点数（≥5000）
            sides: 3,               // 多边形边数 n（E1）
            rule: "free",           // 完全随机规则
            depth: 4,               // 递归深度 0–6
            renderMode: "points",   // points | lines | solid
            pointSize: 2,
            scheme: 0,
            grow: true,             // 逐点生长动画
            grown: 0,               // 当前已生长的点数
            paused: false
        };

        let positions = new Float32Array(0);
        let indices = new Uint32Array(0);
        let nVerts = 0;
        let nPolys = 0;

        function rebuild() {
            state.grown = 0;
            if (state.method === "chaos") {
                positions = genChaosPoints(state.pointCount, state.sides, state.rule);
                nVerts = state.pointCount;
                indices = new Uint32Array(0);
                nPolys = 0;
            } else {
                const res = genRecursivePolys(state.sides, state.depth);
                positions = res.data;
                nVerts = positions.length / 2;
                nPolys = res.count;
                // 每个 n 边形的 n 条边 → 2n 个线框索引
                const n = state.sides;
                const idx = new Uint32Array(nPolys * n * 2);
                let o = 0;
                for (let t = 0; t < nPolys; t++) {
                    const base = t * n;
                    for (let j = 0; j < n; j++) {
                        idx[o++] = base + j;
                        idx[o++] = base + (j + 1) % n;
                    }
                }
                indices = idx;
            }
        }

        return {
            name: "sierpinski",
            state,
            vp,
            maxDepthFor(sides) { return sides <= 3 ? 6 : sides <= 5 ? 5 : 4; },
            onEnter() { rebuild(); },
            rebuild,
            setRenderMode(m) { state.renderMode = m; },

            render() {
                // 逐点生长动画（空格可暂停）
                if (state.method === "chaos" && state.grow && !state.paused) {
                    state.grown = Math.min(state.pointCount,
                        state.grown + Math.max(1, Math.round(state.pointCount / 180)));
                }
                gl.disable(gl.DEPTH_TEST);
                gl.clearColor(0.07, 0.08, 0.12, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.useProgram(prog);

                gl.uniform2f(loc.pan, vp.cx, vp.cy);
                gl.uniform1f(loc.halfH, vp.height / 2);
                gl.uniform1f(loc.aspect, canvas.clientWidth / Math.max(1, canvas.clientHeight));
                const sch = SCHEMES_2D[state.scheme];
                gl.uniform1i(loc.colorMode, sch.mode);
                gl.uniform3fv(loc.colorA, sch.a);
                gl.uniform3fv(loc.colorB, sch.b);

                gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
                gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

                if (state.method === "chaos") {
                    gl.uniform1f(loc.pointSize, state.pointSize);
                    gl.uniform1f(loc.round, 1);
                    gl.drawArrays(gl.POINTS, 0, state.grow ? state.grown : state.pointCount);
                } else if (state.renderMode === "points") {
                    gl.uniform1f(loc.pointSize, state.pointSize);
                    gl.uniform1f(loc.round, 1);
                    gl.drawArrays(gl.POINTS, 0, nVerts);
                } else if (state.renderMode === "lines") {
                    gl.uniform1f(loc.round, 0);
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
                    gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_INT, 0);
                } else {
                    gl.uniform1f(loc.round, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, nVerts);
                }
            },

            onDown() {},
            onDrag(dx, dy) { vp.pan(dx, dy, canvas); },
            onWheel(e) {
                vp.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015), canvas);
            },
            togglePause() {
                state.paused = !state.paused;
                return state.paused;
            },
            resetView() { vp.reset(); },

            getStatus() {
                let base;
                if (state.method === "chaos") {
                    const ruleName = { free: "完全随机", noRepeat: "禁重复", noAdjacent: "禁重复及相邻" }[state.rule];
                    base = `混沌游戏 · ${state.sides} 边形 · ${state.pointCount.toLocaleString()} 点 · 规则：${ruleName}`;
                    if (state.grow) {
                        base += state.paused
                            ? ` · 生长 ${state.grown.toLocaleString()}/${state.pointCount.toLocaleString()}（已暂停，按空格继续）`
                            : ` · 生长中 ${state.grown.toLocaleString()}/${state.pointCount.toLocaleString()}`;
                    }
                } else {
                    const modeName = { points: "点云", lines: "线框", solid: "实体" }[state.renderMode];
                    base = `递归细分 · ${state.sides} 边形 · 深度 ${state.depth} · ${nPolys.toLocaleString()} 图元 · ${modeName}`;
                }
                return base;
            }
        };
    }
};