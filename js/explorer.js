/* ============================================================
 * 场景二：Mandelbrot集交互探索器（选做 E2）
 * 逃逸时间算法 平滑着色 片元着色器内迭代
 * ============================================================ */

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FS_FRACTAL = `#version 300 es
precision highp float;
uniform vec2  u_center;
uniform float u_height;
uniform vec2  u_res;
uniform int   u_maxIter;
uniform int   u_palette;
out vec4 f_color;

vec3 palette(float t) {
    t = fract(t);
    if (u_palette == 0) {
        vec3 c = mix(vec3(0.02, 0.02, 0.05), vec3(0.80, 0.10, 0.05), smoothstep(0.00, 0.35, t));
        c = mix(c, vec3(1.00, 0.70, 0.10), smoothstep(0.35, 0.70, t));
        return mix(c, vec3(1.00, 1.00, 0.85), smoothstep(0.70, 1.00, t));
    } else if (u_palette == 1) {
        vec3 c = mix(vec3(0.01, 0.02, 0.08), vec3(0.05, 0.25, 0.60), smoothstep(0.00, 0.40, t));
        c = mix(c, vec3(0.10, 0.80, 0.90), smoothstep(0.40, 0.75, t));
        return mix(c, vec3(0.90, 1.00, 1.00), smoothstep(0.75, 1.00, t));
    } else if (u_palette == 2) {
        return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67)));
    }
    return vec3(pow(t, 0.6));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_res.x / u_res.y;
    vec2 c = u_center + p * (u_height * 0.5);
    vec2 z = vec2(0.0);

    float sn = -1.0;
    float m2 = 0.0;
    for (int i = 0; i < 4000; i++) {
        if (i >= u_maxIter) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        m2 = dot(z, z);
        if (m2 > 65536.0) {
            sn = float(i) + 1.0 - log2(0.5 * log2(m2));
            break;
        }
    }
    if (sn < 0.0) { f_color = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float t = sqrt(clamp(sn / float(u_maxIter), 0.0, 1.0));
    f_color = vec4(palette(t * 1.5), 1.0);
}`;

const ExplorerMode = {
    create(gl, canvas) {
        const prog = initShadersFromStrings(gl, VS_QUAD, FS_FRACTAL);
        const loc = {
            center:  gl.getUniformLocation(prog, "u_center"),
            height:  gl.getUniformLocation(prog, "u_height"),
            res:     gl.getUniformLocation(prog, "u_res"),
            maxIter: gl.getUniformLocation(prog, "u_maxIter"),
            palette: gl.getUniformLocation(prog, "u_palette")
        };
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const vp = new PanZoom();
        vp.setDefault(-0.6, 0.0, 2.6);

        const state = {
            maxIter: 300,
            palette: 0
        };

        return {
            name: "explorer",
            state,
            vp,
            onEnter() {},

            render() {
                gl.disable(gl.DEPTH_TEST);
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.useProgram(prog);
                gl.uniform2f(loc.center, vp.cx, vp.cy);
                gl.uniform1f(loc.height, vp.height);
                gl.uniform2f(loc.res, canvas.width, canvas.height);
                gl.uniform1i(loc.maxIter, state.maxIter);
                gl.uniform1i(loc.palette, state.palette);
                gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
                gl.enableVertexAttribArray(0);
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            },

            onDown() {},
            onDrag(dx, dy) { vp.pan(dx, dy, canvas); },
            onWheel(e) {
                vp.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015), canvas);
            },
            togglePause() { return null; },
            resetView() { vp.setDefault(-0.6, 0.0, 2.6); },

            getStatus() {
                const zoom = 2.6 / vp.height;
                const zt = zoom >= 1 ? zoom.toFixed(1) + "×" : "1/" + (1 / zoom).toFixed(1) + "×";
                return `Mandelbrot 集 · 迭代 ${state.maxIter} · 缩放 ${zt}` +
                    ` · 中心 (${vp.cx.toFixed(6)}, ${vp.cy.toFixed(6)})`;
            }
        };
    }
};