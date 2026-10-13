/* ============================================================
 * 场景三：3D 四面体 Sierpinski 垫片（选做 E3，为 AP2 铺垫）
 * 递归细分四面体，CPU 计算顶点与逐面 Lambert 明暗，MVP 矩阵渲染。
 * ============================================================ */

const VS_3D = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_color;
uniform mat4 u_mvp;
out vec3 v_color;
void main() {
    gl_Position = u_mvp * vec4(a_pos, 1.0);
    v_color = a_color;
}`;

const FS_3D = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 f_color;
void main() { f_color = vec4(v_color, 1.0); }`;

const GasketMode = {
    create(gl, canvas) {
        const prog = initShadersFromStrings(gl, VS_3D, FS_3D);
        const loc = { mvp: gl.getUniformLocation(prog, "u_mvp") };
        const posVbo = gl.createBuffer();
        const colVbo = gl.createBuffer();

        const state = {
            depth: 3,
            scheme: 0,            // 0 单色 1 四角色 2 高度渐变
            autoRotate: true,
            paused: false,
            rotX: -0.35,
            rotY: 0.6,
            dist: 3.4             // 相机距离
        };

        // 中心在原点的正四面体
        const BASE = [
            [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
        ].map(v => v.map(x => x * 0.72));

        const CORNER_COLORS = [
            [0.95, 0.45, 0.20],
            [0.25, 0.75, 0.55],
            [0.30, 0.55, 0.95],
            [0.80, 0.40, 0.85]
        ];

        let triCount = 0;

        function mid(a, b) {
            return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        }

        /** 递归细分 + 计算颜色（逐面 Newell 法向 → Lambert 明暗） */
        function build() {
            const tris = [];
            (function subdiv(t, d, corner) {
                if (d === 0) {
                    tris.push([t[0], t[1], t[2], corner],
                              [t[0], t[2], t[3], corner],
                              [t[0], t[3], t[1], corner],
                              [t[1], t[3], t[2], corner]);
                    return;
                }
                subdiv([t[0], mid(t[0], t[1]), mid(t[0], t[2]), mid(t[0], t[3])], d - 1, corner);
                subdiv([t[1], mid(t[1], t[0]), mid(t[1], t[2]), mid(t[1], t[3])], d - 1, corner);
                subdiv([t[2], mid(t[2], t[0]), mid(t[2], t[1]), mid(t[2], t[3])], d - 1, corner);
                subdiv([t[3], mid(t[3], t[0]), mid(t[3], t[1]), mid(t[3], t[2])], d - 1, corner);
            })(BASE, state.depth, 0);

            triCount = tris.length;
            const positions = new Float32Array(triCount * 9);
            const colors = new Float32Array(triCount * 9);
            const lv = [0.4, 0.85, 0.5];
            const ll = Math.hypot(lv[0], lv[1], lv[2]);
            const light = [lv[0] / ll, lv[1] / ll, lv[2] / ll];

            let o = 0;
            for (const [a, b, c, corner] of tris) {
                // Newell 法计算法向量，并翻转到朝外
                let nx = 0, ny = 0, nz = 0;
                const vs = [a, b, c];
                for (let i = 0; i < 3; i++) {
                    const p = vs[i], q = vs[(i + 1) % 3];
                    nx += (p[1] - q[1]) * (p[2] + q[2]);
                    ny += (p[2] - q[2]) * (p[0] + q[0]);
                    nz += (p[0] - q[0]) * (p[1] + q[1]);
                }
                const fcx = (a[0] + b[0] + c[0]) / 3;
                const fcy = (a[1] + b[1] + c[1]) / 3;
                const fcz = (a[2] + b[2] + c[2]) / 3;
                if (nx * fcx + ny * fcy + nz * fcz < 0) { nx = -nx; ny = -ny; nz = -nz; }
                const nl = Math.hypot(nx, ny, nz) || 1;
                const lam = 0.30 + 0.70 * Math.max(0,
                    nx / nl * light[0] + ny / nl * light[1] + nz / nl * light[2]);
                let base;
                if (state.scheme === 1) {
                    base = CORNER_COLORS[corner % 4];
                } else if (state.scheme === 2) {
                    const t = Math.min(1, Math.max(0, (fcy + 0.6) / 1.4));
                    base = [0.20 + 0.60 * t, 0.45 + 0.40 * t, 0.95 - 0.55 * t];
                } else {
                    base = [0.95, 0.55, 0.25];
                }
                for (const v of [a, b, c]) {
                    positions[o] = v[0]; positions[o + 1] = v[1]; positions[o + 2] = v[2];
                    colors[o] = base[0] * lam; colors[o + 1] = base[1] * lam; colors[o + 2] = base[2] * lam;
                    o += 3;
                }
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, posVbo);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, colVbo);
            gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        }

        return {
            name: "gasket",
            state,
            onEnter() { build(); },
            rebuild: build,

            render() {
                if (state.autoRotate && !state.paused) state.rotY += 0.005;
                gl.clearColor(0.07, 0.08, 0.12, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.enable(gl.DEPTH_TEST);
                gl.useProgram(prog);

                const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
                const proj = MV.perspective(45 * Math.PI / 180, aspect, 0.1, 100);
                const view = MV.lookAt([0, 0, state.dist], [0, 0, 0], [0, 1, 0]);
                let model = MV.multiply(MV.yRotation(state.rotY), MV.xRotation(state.rotX));
                model = MV.multiply(MV.translation(0, -0.12, 0), model);
                const mvp = MV.multiply(proj, MV.multiply(view, model));
                gl.uniformMatrix4fv(loc.mvp, false, mvp);

                gl.bindBuffer(gl.ARRAY_BUFFER, posVbo);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, colVbo);
                gl.enableVertexAttribArray(1);
                gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, triCount * 3);
            },

            onDown() {},
            onDrag(dx, dy) {
                state.rotY += dx * 0.012;
                state.rotX += dy * 0.012;
            },
            onWheel(e) {
                state.dist = Math.min(10, Math.max(1.6,
                    state.dist * Math.exp(e.deltaY * 0.001)));
            },
            togglePause() {
                state.paused = !state.paused;
                return state.paused;
            },
            resetView() {
                state.rotX = -0.35;
                state.rotY = 0.6;
                state.dist = 3.4;
            },

            getStatus() {
                return `四面体垫片 · 深度 ${state.depth} · ${triCount.toLocaleString()} 三角形 · ` +
                    (state.autoRotate ? (state.paused ? "自动旋转（已暂停，按空格继续）" : "自动旋转中") : "手动旋转");
            }
        };
    }
};