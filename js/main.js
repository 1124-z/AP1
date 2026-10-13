/** 应用入口：创建 GL 上下文与三个场景，分发鼠标/键盘事件，驱动渲染循环。 */
(function () {
    
    const $ = id => document.getElementById(id);
    const HELP = {
        sierpinski: "键盘（需先点击右侧画布使其获得焦点）：1/2/3 切换渲染模式（点云/线框/实体）<br>"+
                    "空格 暂停/继续逐点生长<br>"+"R 重置视图<br>"+
                    "] 切换下一个场景  [ 切换上一个场景<br>"+
                    "鼠标：左键拖动平移，滚轮缩放",
        explorer:   "鼠标：左键拖动平移，滚轮以光标为中心缩放<br>"+
                    "键盘（需先点击右侧画布使其获得焦点）：R 重置视图<br> "+
                    "] 切换下一个场景  [ 切换上一个场景",
        gasket:     "鼠标：左键拖动旋转视角，滚轮推拉相机<br>"+"键盘（需先点击右侧画布使其获得焦点）：空格 暂停/继续自动旋转<br>"+"R 重置视图<br>"+"] 切换下一个场景  [ 切换上一个场景",
    };

    const ORDER = ["sierpinski", "explorer", "gasket"];
    const SECTIONS = {
        sierpinski: "sec-sierpinski",
        explorer: "sec-explorer",
        gasket: "sec-gasket"
    };

    document.addEventListener("DOMContentLoaded", () => {
        const canvas = document.getElementById("glcanvas");
        const gl = setupWebGL(canvas, { antialias: true });

    window.addEventListener("error", ev => {
        const s = document.getElementById("status");
        if (s) s.textContent = "错误: " + ev.message;
    });
    
        const App = {
            canvas,
            gl,
            scenes: {
                sierpinski: SierpinskiMode.create(gl, canvas),
                explorer:   ExplorerMode.create(gl, canvas),
                gasket:     GasketMode.create(gl, canvas)
            },
            current: null,
            currentName: "sierpinski",

            switchScene(name) {
                this.currentName = name;
                this.current = this.scenes[name];
                document.querySelectorAll("#sceneButtons button").forEach(b =>
                    b.classList.toggle("active", b.dataset.scene === name));
                for (const key in SECTIONS) {
                    document.getElementById(SECTIONS[key])
                        .classList.toggle("hidden", key !== name);
                }
                this.current.onEnter();
                document.getElementById("help").innerHTML = HELP[name];
                UI.syncFromState();
                UI.updateStatus();
            }
        };

        /* ---- 画布尺寸（支持 HiDPI） ---- */
        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const w = Math.round(canvas.clientWidth * dpr);
            const h = Math.round(canvas.clientHeight * dpr);
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        window.addEventListener("resize", resize);
        resize();

        /* ---- 鼠标交互：左键拖动 + 滚轮缩放，分发给当前场景 ---- */
        let dragging = false, lastX = 0, lastY = 0;
        canvas.addEventListener("mousedown", e => {
            if (e.button !== 0) return;
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            App.current.onDown(e);
        });
        window.addEventListener("mousemove", e => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            App.current.onDrag(dx, dy, e);
        });
        window.addEventListener("mouseup", () => { dragging = false; });
        canvas.addEventListener("wheel", e => {
            e.preventDefault();
            App.current.onWheel(e);
            UI.updateStatus();
        }, { passive: false });

        /* ---- 键盘交互 ---- */
        window.addEventListener("keydown", e => {
            const tag = (e.target.tagName || "").toLowerCase();
            if (tag === "input" || tag === "select" || tag === "textarea" || tag === "button") return;
            const scene = App.current;
            switch (e.key) {
                case "1": case "2": case "3": {
                    // 按规格：1/2/3 切换渲染模式（作用于 Sierpinski 场景的递归细分）
                    if (scene !== App.scenes.sierpinski) break;
                    const modes = ["points", "lines", "solid"];
                    scene.setRenderMode(modes[+e.key - 1]);
                    document.getElementById("renderMode").value = modes[+e.key - 1];
                    UI.updateStatus();
                    break;
                }
                case " ": {
                    e.preventDefault();
                    scene.togglePause();
                    UI.updateStatus();
                    break;
                }
                case "r": case "R":
                    scene.resetView();
                    break;
                case "[": case "]": {
                    const i = ORDER.indexOf(App.currentName);
                    const n = ORDER.length;
                    const next = e.key === "]" ? (i + 1) % n : (i - 1 + n) % n;
                    App.switchScene(ORDER[next]);
                    break;
                }
            }
        });

        UI.init(App);
        App.switchScene("sierpinski");

        /* ---- 渲染循环 ---- */
        let frame = 0;
        (function loop() {
            App.current.render();
            if (frame++ % 12 === 0) UI.updateStatus();   // 状态栏节流刷新
            requestAnimationFrame(loop);
        })();
    });
})();