function setupWebGL(canvas, opt_attribs) {
    let gl = null;
    try { gl = canvas.getContext("webgl2", opt_attribs || {}); }
    catch (e) { gl = null; }
    if (!gl) {
        const msg = "无法创建 WebGL 2.0 上下文，请使用支持 WebGL2 的现代浏览器（Chrome / Edge / Firefox / Safari 最新版）。";
        alert(msg);
        throw new Error(msg);
    }
    return gl;
}