/* 着色器装载工具
 * initShaders(gl, "顶点shader的script元素id", "片元shader的script元素id")
 * initShadersFromStrings(gl, vsSrc, fsSrc) 直接传入源码字符串。 */

function initShaders(gl, vertexShaderId, fragmentShaderId) {
    const vEl = document.getElementById(vertexShaderId);
    const fEl = document.getElementById(fragmentShaderId);
    if (!vEl || !fEl) throw new Error("initShaders: 找不到 shader 脚本元素");
    return initShadersFromStrings(gl, vEl.textContent, fEl.textContent);
}

function initShadersFromStrings(gl, vShaderSrc, fShaderSrc) {
    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            throw new Error("着色器编译失败");
        }
        return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vShaderSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fShaderSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prog));
        throw new Error("着色器程序链接失败");
    }
    return prog;
}