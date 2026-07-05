window.ControleSaida = (function () {
    "use strict";

    // ─── CSS ──────────────────────────────────────────────────────────────────
    (function () {
        if (document.getElementById("cs-styles")) return;
        var s = document.createElement("style");
        s.id = "cs-styles";
        s.textContent = [
            ".cs-overlay{position:fixed;inset:0;background:rgba(8,18,40,.54);z-index:99999;",
            "display:flex;align-items:center;justify-content:center;opacity:0;",
            "transition:opacity .2s ease;pointer-events:none;}",
            ".cs-overlay.cs-visivel{opacity:1;pointer-events:all;}",
            ".cs-modal{background:#fff;border-radius:18px;padding:32px 28px 24px;",
            "width:min(420px,93vw);box-shadow:0 22px 64px rgba(8,30,90,.22);",
            "transform:translateY(14px);transition:transform .22s ease;}",
            ".cs-overlay.cs-visivel .cs-modal{transform:translateY(0);}",
            ".cs-modal-icone{text-align:center;line-height:1;margin-bottom:14px;display:flex;justify-content:center;}",
            ".cs-modal-titulo{font-size:17px;font-weight:800;color:#12467d;",
            "text-align:center;margin-bottom:8px;}",
            ".cs-modal-msg{font-size:14px;color:#4a5568;text-align:center;",
            "line-height:1.65;margin-bottom:24px;}",
            ".cs-modal-btns{display:flex;gap:10px;justify-content:center;}",
            ".cs-btn{flex:1;max-width:170px;padding:11px 18px;border-radius:10px;",
            "border:none;font-size:14px;font-weight:700;cursor:pointer;",
            "transition:opacity .14s,transform .1s;}",
            ".cs-btn:hover{opacity:.86;transform:translateY(-1px);}",
            ".cs-btn:active{transform:translateY(0);}",
            ".cs-btn-sim{background:#1d6fe0;color:#fff;}",
            ".cs-btn-nao{background:#f0f4f8;color:#34445a;border:1.5px solid #dde7f0;}",
            ".cs-btn-sair{background:#e53e3e;color:#fff;}"
        ].join("");
        document.head.appendChild(s);
    })();

    // ─── MODAL ────────────────────────────────────────────────────────────────
    var _modal = null;

    function _abrirModal(cfg) {
        _fecharModal();
        var o = document.createElement("div");
        o.id = "cs-overlay";
        o.className = "cs-overlay";
        o.innerHTML =
            '<div class="cs-modal">' +
                (cfg.icone ? '<div class="cs-modal-icone">' + cfg.icone + "</div>" : "") +
                '<div class="cs-modal-titulo">' + (cfg.titulo || "Atenção") + "</div>" +
                '<div class="cs-modal-msg">' + (cfg.msg || "").replace(/\n/g, "<br>") + "</div>" +
                '<div class="cs-modal-btns">' +
                    '<button class="cs-btn cs-btn-nao" id="cs-btn-nao">' + (cfg.txtNao || "Não") + "</button>" +
                    '<button class="cs-btn ' + (cfg.classSim || "cs-btn-sim") + '" id="cs-btn-sim">' + (cfg.txtSim || "Sim") + "</button>" +
                "</div>" +
            "</div>";
        document.body.appendChild(o);
        _modal = o;
        document.getElementById("cs-btn-sim").addEventListener("click", function () {
            _fecharModal();
            if (cfg.onSim) cfg.onSim();
        });
        document.getElementById("cs-btn-nao").addEventListener("click", function () {
            _fecharModal();
            if (cfg.onNao) cfg.onNao();
        });
        requestAnimationFrame(function () { o.classList.add("cs-visivel"); });
    }

    function _fecharModal() {
        if (_modal) { _modal.remove(); _modal = null; }
    }

    // ─── PDV — AUTO-SAVE ──────────────────────────────────────────────────────
    var CHAVE_PDV = "pdv_venda_em_andamento";

    function salvarVendaEmAndamento(dados) {
        try { localStorage.setItem(CHAVE_PDV, JSON.stringify(dados)); } catch (e) {}
    }

    function buscarVendaEmAndamento() {
        try {
            var v = localStorage.getItem(CHAVE_PDV);
            return v ? JSON.parse(v) : null;
        } catch (e) { return null; }
    }

    function limparVendaEmAndamento() {
        localStorage.removeItem(CHAVE_PDV);
    }

    function verificarVendaEmAndamento(onRecuperar, onDescartar) {
        var venda = buscarVendaEmAndamento();
        if (!venda || !Array.isArray(venda.itens) || venda.itens.length === 0) return;
        _abrirModal({
            icone: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#eef5ff"/><path d="M7 8h10l-1.5 7H8.5L7 8z" stroke="#1A436B" stroke-width="1.5" stroke-linejoin="round" fill="#dceeff"/><path d="M5 6h2l.5 2" stroke="#1A436B" stroke-width="1.5" stroke-linecap="round"/><circle cx="9.5" cy="17" r="1" fill="#1A436B"/><circle cx="14.5" cy="17" r="1" fill="#1A436B"/></svg>',
            titulo: "Venda em andamento",
            msg: "Foi encontrada uma venda em andamento.\nDeseja continuar?",
            txtSim: "Sim",
            txtNao: "Não",
            onSim: function () { if (onRecuperar) onRecuperar(venda); },
            onNao: function () { limparVendaEmAndamento(); if (onDescartar) onDescartar(); }
        });
    }

    // ─── CADASTRO — DIRTY TRACKING ────────────────────────────────────────────
    var _alterado = false;

    function ativarProtecaoCadastro() {
        _alterado = false;

        // Marca como alterado ao editar campos dentro de <form>
        document.addEventListener("input",  _onInput);
        document.addEventListener("change", _onInput);

        // Intercepta cliques em links <a href> — mostra modal customizado
        document.addEventListener("click", _onLinkClick, true);

        // beforeunload só dispara ao fechar/recarregar o navegador (inevitável — dialog nativo)
        window.addEventListener("beforeunload", _onBeforeUnload);
    }

    function _onInput(e) {
        var el  = e.target;
        var tag = el && el.tagName;
        if ((tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") && el.closest("form")) {
            _alterado = true;
        }
    }

    function _onLinkClick(e) {
        if (!_alterado) return;
        var link = e.target.closest("a[href]");
        if (!link) return;
        var href = link.getAttribute("href") || "";
        // Ignora âncoras, javascript:, links externos em nova aba
        if (!href || href === "#" || href.startsWith("#") || href.startsWith("javascript") || link.target === "_blank") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        confirmarSaida(function () { window.location.href = new URL(href, document.baseURI).href; });
    }

    function _onBeforeUnload(e) {
        if (_alterado) { e.preventDefault(); e.returnValue = ""; }
    }

    function marcarAlterado() { _alterado = true; }
    function marcarSalvo()    { _alterado = false; }
    function estaAlterado()   { return _alterado; }

    function confirmarSaida(onSair, onFicar) {
        if (!_alterado) { if (onSair) onSair(); return; }
        _abrirModal({
            icone: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#fff8ec"/><path d="M12 7v5" stroke="#985200" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#985200"/><path d="M12 3L2 20h20L12 3z" stroke="#985200" stroke-width="1.5" stroke-linejoin="round" fill="#fff3e0"/></svg>',
            titulo: "Atenção",
            msg: "Tem certeza que deseja sair?\nVocê pode perder todas as informações não salvas.",
            txtSim: "Sim, sair",
            txtNao: "Não, continuar",
            classSim: "cs-btn-sair",
            onSim: function () { marcarSalvo(); if (onSair) onSair(); },
            onNao: onFicar || null
        });
    }

    return {
        // PDV
        salvarVendaEmAndamento:    salvarVendaEmAndamento,
        buscarVendaEmAndamento:    buscarVendaEmAndamento,
        limparVendaEmAndamento:    limparVendaEmAndamento,
        verificarVendaEmAndamento: verificarVendaEmAndamento,
        // Cadastro
        ativarProtecaoCadastro: ativarProtecaoCadastro,
        marcarAlterado:         marcarAlterado,
        marcarSalvo:            marcarSalvo,
        estaAlterado:           estaAlterado,
        confirmarSaida:         confirmarSaida
    };
})();
