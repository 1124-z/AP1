/** 参数面板绑定：把 HTML 控件与场景 state 双向同步（几何/交互/UI 分离中的 UI 层） */
const UI = {
    App: null,

    init(App) {
        this.App = App;
        const $ = id => document.getElementById(id);

        // ---- 配色方案选项 ----
        const schemeSel = $("colorScheme");
        SCHEMES_2D.forEach((s, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = s.name;
            schemeSel.appendChild(opt);
        });

        // ---- 场景切换按钮 ----
        document.querySelectorAll("#sceneButtons button").forEach(btn => {
            btn.addEventListener("click", () => App.switchScene(btn.dataset.scene));
        });

        /* ================= Sierpinski 面板 ================= */
        const S = App.scenes.sierpinski, st = S.state;

        $("genMethod").addEventListener("change", e => {
            st.method = e.target.value;
            $("chaosControls").classList.toggle("hidden", st.method !== "chaos");
            $("recControls").classList.toggle("hidden", st.method !== "recursive");
            //混沌游戏时禁用渲染模式
            if (st.method === "chaos") {
                st.renderMode = "points";
                $("renderMode").value = "points";
                $("renderMode").disabled = true;
            } else {
                $("renderMode").disabled = false;
            }
            S.rebuild();
            this.updateStatus();
        });

        $("pointCount").addEventListener("input", e => {
            $("pointCountVal").textContent = (+e.target.value).toLocaleString();
        });
        $("pointCount").addEventListener("change", e => {
            st.pointCount = +e.target.value;
            st.grown = 0;
            if (st.method === "chaos") S.rebuild();
            this.updateStatus();
        });

        $("polySides").addEventListener("input", e => {
            $("polySidesVal").textContent = e.target.value;
        });
        $("polySides").addEventListener("change", e => {
            st.sides = +e.target.value;
            const md = S.maxDepthFor(st.sides);       // 边数多时限深，防图元爆炸
            const rd = $("recDepth");
            rd.max = md;
            if (+rd.value > md) {
                rd.value = md;
                st.depth = md;
                $("recDepthVal").textContent = md;
            }
            S.rebuild();
            this.updateStatus();
        });

        $("chaosRule").addEventListener("change", e => {
            st.rule = e.target.value;
            S.rebuild();
            this.updateStatus();
        });

        $("regen").addEventListener("click", () => { S.rebuild(); this.updateStatus(); });

        $("growAnim").addEventListener("change", e => {
            st.grow = e.target.checked;
            if (!st.grow) st.grown = st.pointCount;
            this.updateStatus();
        });

        $("recDepth").addEventListener("input", e => {
            $("recDepthVal").textContent = e.target.value;
        });
        $("recDepth").addEventListener("change", e => {
            st.depth = +e.target.value;
            if (st.method === "recursive") S.rebuild();
            this.updateStatus();
        });

        $("renderMode").addEventListener("change", e => {
            S.setRenderMode(e.target.value);
            this.updateStatus();
        });

        $("pointSize").addEventListener("input", e => {
            $("pointSizeVal").textContent = e.target.value;
            st.pointSize = +e.target.value;
        });

        $("colorScheme").addEventListener("change", e => {
            st.scheme = +e.target.value;
        });

        /* ================= Explorer 面板 ================= */
        const E = App.scenes.explorer, es = E.state;

        $("maxIter").addEventListener("input", e => {
            $("maxIterVal").textContent = e.target.value;
            es.maxIter = +e.target.value;
        });

        $("expPalette").addEventListener("change", e => { es.palette = +e.target.value; });

        $("resetView").addEventListener("click", () => { E.resetView(); this.updateStatus(); });

        /* ================= Gasket 面板 ================= */
        const G = App.scenes.gasket, gs = G.state;

        $("gasketDepth").addEventListener("input", e => {
            $("gasketDepthVal").textContent = e.target.value;
        });
        $("gasketDepth").addEventListener("change", e => {
            gs.depth = +e.target.value;
            G.rebuild();
            this.updateStatus();
        });

        $("gasketColor").addEventListener("change", e => {
            gs.scheme = +e.target.value;
            G.rebuild();
        });

        $("autoRotate").addEventListener("change", e => {
            gs.autoRotate = e.target.checked;
            this.updateStatus();
        });

        this.syncFromState();
    },

    /** state 控件（切换场景时调用） */
    syncFromState() {
         const $ = id => document.getElementById(id);

        // ---- Sierpinski 同步 ----
        const S = this.App.scenes.sierpinski, st = S.state;
        $("genMethod").value = st.method;
        $("chaosControls").classList.toggle("hidden", st.method !== "chaos");
        $("recControls").classList.toggle("hidden", st.method !== "recursive");
        $("pointCount").value = st.pointCount;
        $("pointCountVal").textContent = st.pointCount.toLocaleString();
        $("polySides").value = st.sides;
        $("polySidesVal").textContent = st.sides;
        $("chaosRule").value = st.rule;
        $("growAnim").checked = st.grow;
        $("recDepth").max = S.maxDepthFor(st.sides);
        $("recDepth").value = st.depth;
        $("recDepthVal").textContent = st.depth;
        $("renderMode").value = st.renderMode;
        $("renderMode").disabled = (st.method === "chaos"); // 混沌游戏禁用渲染模式切换
        $("pointSize").value = st.pointSize;
        $("pointSizeVal").textContent = st.pointSize;
        $("colorScheme").value = st.scheme;

        // ---- Explorer 同步 ----
        const E = this.App.scenes.explorer, es = E.state;
        $("maxIter").value = es.maxIter;
        $("maxIterVal").textContent = es.maxIter;
        $("expPalette").value = es.palette;

        // ---- Gasket 同步 ----
        const G = this.App.scenes.gasket, gs = G.state;
        $("gasketDepth").value = gs.depth;
        $("gasketDepthVal").textContent = gs.depth;
        $("gasketColor").value = gs.scheme;
        $("autoRotate").checked = gs.autoRotate;
    },

    updateStatus() {
        document.getElementById("status").textContent = this.App.current.getStatus();
    }
};