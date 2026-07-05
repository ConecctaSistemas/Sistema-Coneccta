(function () {
    "use strict";

    // ─── ESTADO ─────────────────────────────────────────────────────────────
    var _abaAtual   = "grupos";
    var _editGrupoId = null;
    var _editMarcaId = null;
    var _editNivelId = null;

    // ─── ESTRUTURA BASE ──────────────────────────────────────────────────────
    function garantirEstrutura(base) {
        if (!Array.isArray(base.grupos))  base.grupos  = [];
        if (!Array.isArray(base.marcas))  base.marcas  = [];
        if (!Array.isArray(base.niveis))  base.niveis  = [];
        return base;
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    function norm(str) {
        return String(str || "").toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g, "");
    }

    function escapar(str) {
        return String(str || "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function gerarId(pre) {
        return pre + "-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
    }

    function el(id)   { return document.getElementById(id); }
    function val(id)  { return (el(id) ? el(id).value.trim() : ""); }
    function setVal(id, v) { if (el(id)) el(id).value = v != null ? v : ""; }
    function setText(id, v) { if (el(id)) el(id).textContent = v; }

    function badgeSit(sit) {
        var isAtivo = sit !== "inativo";
        return '<span class="badge ' + (isAtivo ? "badge-ativo" : "badge-inativo") + '">'
            + (isAtivo ? "Ativo" : "Inativo") + '</span>';
    }

    function acoesLinha(fnEdit, fnDel) {
        return '<div class="acoes-linha">'
            + '<button class="btn btn-secundario btn-sm" onclick="' + fnEdit + '" title="Editar"><i class="fa-solid fa-pen"></i></button>'
            + '<button class="btn btn-perigo btn-sm" onclick="' + fnDel  + '" title="Excluir"><i class="fa-solid fa-trash"></i></button>'
            + '</div>';
    }

    // ─── ABAS ────────────────────────────────────────────────────────────────
    function vincularAbas() {
        document.querySelectorAll(".aba").forEach(function (btn) {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".aba").forEach(function (b) {
                    b.classList.remove("ativo");
                    b.setAttribute("aria-selected", "false");
                });
                btn.classList.add("ativo");
                btn.setAttribute("aria-selected", "true");

                _abaAtual = btn.dataset.aba;

                document.querySelectorAll(".aba-view").forEach(function (v) { v.classList.add("oculto"); });
                var view = el("view-" + _abaAtual);
                if (view) view.classList.remove("oculto");

                renderizarAba(_abaAtual);
            });
        });
    }

    function renderizarAba(aba) {
        var base = garantirEstrutura(obterBase());
        if (aba === "grupos")  renderizarGrupos(base);
        if (aba === "marcas")  renderizarMarcas(base);
        if (aba === "niveis")  renderizarNiveis(base);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GRUPOS
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarGrupos(base) {
        var busca   = norm(val("buscaGrupos"));
        var grupos  = (base.grupos || []).filter(function (g) {
            return !busca || norm(g.nome).includes(busca) || norm(g.obs).includes(busca);
        });

        var html = "";
        if (!grupos.length) {
            html = '<tr><td colspan="5" class="vazio">Nenhum grupo encontrado.</td></tr>';
        } else {
            grupos.forEach(function (g) {
                html += '<tr>'
                    + '<td><span class="bolinha-cor" style="background:' + escapar(g.cor || "#1A436B") + '"></span></td>'
                    + '<td><strong>' + escapar(g.nome) + '</strong></td>'
                    + '<td style="color:#4a5d72">' + escapar(g.obs || "—") + '</td>'
                    + '<td>' + badgeSit(g.ativo) + '</td>'
                    + '<td>' + acoesLinha("editarGrupo('" + escapar(g.id) + "')", "excluirGrupo('" + escapar(g.id) + "')") + '</td>'
                    + '</tr>';
            });
        }
        el("listaGrupos").innerHTML = html;
    }

    function abrirModalGrupo(grupo) {
        _editGrupoId = grupo ? grupo.id : null;
        setText("tituloModalGrupo", grupo ? "Editar Grupo" : "Novo Grupo");
        setVal("grupoId",   grupo ? grupo.id : "");
        setVal("grupoNome", grupo ? grupo.nome : "");
        setVal("grupoCor",  grupo ? (grupo.cor || "#1A436B") : "#1A436B");
        setText("grupoCortexto", grupo ? (grupo.cor || "#1A436B") : "#1A436B");
        setVal("grupoAtivo", grupo ? (grupo.ativo || "ativo") : "ativo");
        setVal("grupoObs",   grupo ? (grupo.obs || "") : "");
        abrirModal("modalGrupo");
    }

    function salvarGrupo() {
        var nome = val("grupoNome");
        if (!nome) { if (window.notificar) notificar("Informe o nome do grupo.", "aviso"); return; }
        var base = garantirEstrutura(obterBase());
        var cor  = val("grupoCor") || "#1A436B";

        if (_editGrupoId) {
            var idx = base.grupos.findIndex(function (g) { return g.id === _editGrupoId; });
            if (idx >= 0) Object.assign(base.grupos[idx], { nome: nome, cor: cor, ativo: val("grupoAtivo"), obs: val("grupoObs") });
            _editGrupoId = null;
        } else {
            base.grupos.push({ id: gerarId("grp"), nome: nome, cor: cor, ativo: "ativo", obs: val("grupoObs") });
        }
        salvarBase(base);
        fecharModal("modalGrupo");
        renderizarGrupos(base);
        if (window.notificar) notificar("Grupo salvo!", "sucesso");
    }

    window.editarGrupo = function (id) {
        var base  = garantirEstrutura(obterBase());
        var grupo = base.grupos.find(function (g) { return g.id === id; });
        if (grupo) abrirModalGrupo(grupo);
    };

    window.excluirGrupo = function (id) {
        if (!confirm("Excluir este grupo?")) return;
        var base  = garantirEstrutura(obterBase());
        base.grupos = base.grupos.filter(function (g) { return g.id !== id; });
        salvarBase(base);
        renderizarGrupos(base);
        if (window.notificar) notificar("Grupo excluído.", "info");
    };

    // ═══════════════════════════════════════════════════════════════════════
    // MARCAS
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarMarcas(base) {
        var busca  = norm(val("buscaMarcas"));
        var marcas = (base.marcas || []).filter(function (m) {
            return !busca || norm(m.nome).includes(busca) || norm(m.obs).includes(busca);
        });

        var html = "";
        if (!marcas.length) {
            html = '<tr><td colspan="4" class="vazio">Nenhuma marca encontrada.</td></tr>';
        } else {
            marcas.forEach(function (m) {
                html += '<tr>'
                    + '<td><strong>' + escapar(m.nome) + '</strong></td>'
                    + '<td style="color:#4a5d72">' + escapar(m.obs || "—") + '</td>'
                    + '<td>' + badgeSit(m.ativo) + '</td>'
                    + '<td>' + acoesLinha("editarMarca('" + escapar(m.id) + "')", "excluirMarca('" + escapar(m.id) + "')") + '</td>'
                    + '</tr>';
            });
        }
        el("listaMarcas").innerHTML = html;
    }

    function abrirModalMarca(marca) {
        _editMarcaId = marca ? marca.id : null;
        setText("tituloModalMarca", marca ? "Editar Marca" : "Nova Marca");
        setVal("marcaId",   marca ? marca.id : "");
        setVal("marcaNome", marca ? marca.nome : "");
        setVal("marcaAtivo", marca ? (marca.ativo || "ativo") : "ativo");
        setVal("marcaObs",   marca ? (marca.obs || "") : "");
        abrirModal("modalMarca");
    }

    function salvarMarca() {
        var nome = val("marcaNome");
        if (!nome) { if (window.notificar) notificar("Informe o nome da marca.", "aviso"); return; }
        var base = garantirEstrutura(obterBase());

        if (_editMarcaId) {
            var idx = base.marcas.findIndex(function (m) { return m.id === _editMarcaId; });
            if (idx >= 0) Object.assign(base.marcas[idx], { nome: nome, ativo: val("marcaAtivo"), obs: val("marcaObs") });
            _editMarcaId = null;
        } else {
            base.marcas.push({ id: gerarId("mrc"), nome: nome, ativo: "ativo", obs: val("marcaObs") });
        }
        salvarBase(base);
        fecharModal("modalMarca");
        renderizarMarcas(base);
        if (window.notificar) notificar("Marca salva!", "sucesso");
    }

    window.editarMarca = function (id) {
        var base  = garantirEstrutura(obterBase());
        var marca = base.marcas.find(function (m) { return m.id === id; });
        if (marca) abrirModalMarca(marca);
    };

    window.excluirMarca = function (id) {
        if (!confirm("Excluir esta marca?")) return;
        var base  = garantirEstrutura(obterBase());
        base.marcas = base.marcas.filter(function (m) { return m.id !== id; });
        salvarBase(base);
        renderizarMarcas(base);
        if (window.notificar) notificar("Marca excluída.", "info");
    };

    // ═══════════════════════════════════════════════════════════════════════
    // NÍVEIS
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarNiveis(base) {
        var busca  = norm(val("buscaNiveis"));
        var niveis = (base.niveis || [])
            .filter(function (n) {
                return !busca || norm(n.nome).includes(busca) || norm(n.obs).includes(busca);
            })
            .sort(function (a, b) { return (Number(a.ordem) || 999) - (Number(b.ordem) || 999); });

        var html = "";
        if (!niveis.length) {
            html = '<tr><td colspan="6" class="vazio">Nenhum nível encontrado.</td></tr>';
        } else {
            niveis.forEach(function (n) {
                html += '<tr>'
                    + '<td><span class="bolinha-cor" style="background:' + escapar(n.cor || "#d97706") + '"></span></td>'
                    + '<td><strong>' + escapar(n.nome) + '</strong></td>'
                    + '<td style="color:#4a5d72;text-align:center">' + (n.ordem || "—") + '</td>'
                    + '<td style="color:#4a5d72">' + escapar(n.obs || "—") + '</td>'
                    + '<td>' + badgeSit(n.ativo) + '</td>'
                    + '<td>' + acoesLinha("editarNivel('" + escapar(n.id) + "')", "excluirNivel('" + escapar(n.id) + "')") + '</td>'
                    + '</tr>';
            });
        }
        el("listaNiveis").innerHTML = html;
    }

    function abrirModalNivel(nivel) {
        _editNivelId = nivel ? nivel.id : null;
        setText("tituloModalNivel", nivel ? "Editar Nível" : "Novo Nível");
        setVal("nivelId",    nivel ? nivel.id : "");
        setVal("nivelNome",  nivel ? nivel.nome : "");
        setVal("nivelCor",   nivel ? (nivel.cor || "#d97706") : "#d97706");
        setText("nivelCorTexto", nivel ? (nivel.cor || "#d97706") : "#d97706");
        setVal("nivelOrdem", nivel ? (nivel.ordem || "") : "");
        setVal("nivelAtivo", nivel ? (nivel.ativo || "ativo") : "ativo");
        setVal("nivelObs",   nivel ? (nivel.obs || "") : "");
        abrirModal("modalNivel");
    }

    function salvarNivel() {
        var nome = val("nivelNome");
        if (!nome) { if (window.notificar) notificar("Informe o nome do nível.", "aviso"); return; }
        var base  = garantirEstrutura(obterBase());
        var cor   = val("nivelCor")   || "#d97706";
        var ordem = val("nivelOrdem");

        if (_editNivelId) {
            var idx = base.niveis.findIndex(function (n) { return n.id === _editNivelId; });
            if (idx >= 0) Object.assign(base.niveis[idx], { nome: nome, cor: cor, ordem: ordem, ativo: val("nivelAtivo"), obs: val("nivelObs") });
            _editNivelId = null;
        } else {
            base.niveis.push({ id: gerarId("nvl"), nome: nome, cor: cor, ordem: ordem, ativo: "ativo", obs: val("nivelObs") });
        }
        salvarBase(base);
        fecharModal("modalNivel");
        renderizarNiveis(base);
        if (window.notificar) notificar("Nível salvo!", "sucesso");
    }

    window.editarNivel = function (id) {
        var base  = garantirEstrutura(obterBase());
        var nivel = base.niveis.find(function (n) { return n.id === id; });
        if (nivel) abrirModalNivel(nivel);
    };

    window.excluirNivel = function (id) {
        if (!confirm("Excluir este nível?")) return;
        var base  = garantirEstrutura(obterBase());
        base.niveis = base.niveis.filter(function (n) { return n.id !== id; });
        salvarBase(base);
        renderizarNiveis(base);
        if (window.notificar) notificar("Nível excluído.", "info");
    };

    // ═══════════════════════════════════════════════════════════════════════
    // MODAIS
    // ═══════════════════════════════════════════════════════════════════════
    function abrirModal(id) { var m = el(id); if (m) m.classList.add("aberto"); }
    function fecharModal(id) { var m = el(id); if (m) m.classList.remove("aberto"); }

    function vincularModais() {
        // fechar por botão data-fechar
        document.querySelectorAll("[data-fechar]").forEach(function (btn) {
            btn.addEventListener("click", function () { fecharModal(btn.dataset.fechar); });
        });
        // fechar ao clicar no fundo
        document.querySelectorAll(".modal-fundo").forEach(function (fundo) {
            fundo.addEventListener("click", function (e) {
                if (e.target === fundo) fundo.classList.remove("aberto");
            });
        });
        // fechar com Escape
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-fundo.aberto").forEach(function (m) {
                    m.classList.remove("aberto");
                });
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BOTÕES & FILTROS
    // ═══════════════════════════════════════════════════════════════════════
    function vincularBotoes() {
        // Grupos
        on("btnNovoGrupo",  function () { abrirModalGrupo(null); });
        on("btnSalvarGrupo", salvarGrupo);
        on("buscaGrupos",   function () { renderizarGrupos(garantirEstrutura(obterBase())); }, "input");

        // Marcas
        on("btnNovaMarca",  function () { abrirModalMarca(null); });
        on("btnSalvarMarca", salvarMarca);
        on("buscaMarcas",   function () { renderizarMarcas(garantirEstrutura(obterBase())); }, "input");

        // Níveis
        on("btnNovoNivel",  function () { abrirModalNivel(null); });
        on("btnSalvarNivel", salvarNivel);
        on("buscaNiveis",   function () { renderizarNiveis(garantirEstrutura(obterBase())); }, "input");

        // Preview cor em tempo real
        on("grupoCor", function () { setText("grupoCortexto", val("grupoCor")); }, "input");
        on("nivelCor", function () { setText("nivelCorTexto", val("nivelCor")); }, "input");
    }

    function on(id, fn, evt) {
        var e = el(id);
        if (e) e.addEventListener(evt || "click", fn);
    }

    // ─── INIT ─────────────────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", function () {
        vincularAbas();
        vincularBotoes();
        vincularModais();
        // Render da aba inicial
        renderizarAba(_abaAtual);
    });
})();
