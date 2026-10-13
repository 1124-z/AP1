/* 极简 4x4 矩阵 / 向量工具 */

const MV = (function () {

    function mat4() { return identity(); }

    function identity() {
        const m = new Float32Array(16);
        m[0] = m[5] = m[10] = m[15] = 1.0;
        return m;
    }

    /* r = a * b（列主序） */
    function multiply(a, b) {
        const r = new Float32Array(16);
        for (let c = 0; c < 4; c++) {
            for (let row = 0; row < 4; row++) {
                let s = 0.0;
                for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[c * 4 + k];
                r[c * 4 + row] = s;
            }
        }
        return r;
    }

    function translation(x, y, z) {
        const m = identity();
        m[12] = x; m[13] = y; m[14] = z;
        return m;
    }

    function scaling(x, y, z) {
        const m = identity();
        m[0] = x; m[5] = y; m[10] = z;
        return m;
    }

    function xRotation(a) {
        const c = Math.cos(a), s = Math.sin(a);
        const m = identity();
        m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
        return m;
    }

    function yRotation(a) {
        const c = Math.cos(a), s = Math.sin(a);
        const m = identity();
        m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
        return m;
    }

    function zRotation(a) {
        const c = Math.cos(a), s = Math.sin(a);
        const m = identity();
        m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
        return m;
    }

    function perspective(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const m = new Float32Array(16);
        m[0] = f / aspect;
        m[5] = f;
        m[10] = (far + near) / (near - far);
        m[11] = -1.0;
        m[14] = 2 * far * near / (near - far);
        return m;
    }

    function vec3(x, y, z) { return [x, y, z]; }
    function vec4(x, y, z, w) { return [x, y, z, w]; }

    function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross(a, b) {
        return [a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0]];
    }
    function normalize(v) {
        const l = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / l, v[1] / l, v[2] / l];
    }
    function radians(deg) { return deg * Math.PI / 180.0; }

    function lookAt(eye, at, up) {
        const n  = normalize(subtract(eye, at));   // 相机后向
        const u  = normalize(cross(up, n));        // 相机右向
        const v  = cross(n, u);                    // 相机上向
        const m = new Float32Array(16);
        m[0] = u[0]; m[4] = u[1]; m[8]  = u[2];
        m[1] = v[0]; m[5] = v[1]; m[9]  = v[2];
        m[2] = n[0]; m[6] = n[1]; m[10] = n[2];
        m[12] = -dot(u, eye);
        m[13] = -dot(v, eye);
        m[14] = -dot(n, eye);
        m[15] = 1.0;
        return m;
    }

    function flatten(m) { return m; }

    return {
        mat4, identity, multiply, translation, scaling,
        xRotation, yRotation, zRotation,
        perspective, lookAt, flatten,
        vec3, vec4, subtract, dot, cross, normalize, radians
    };
})();