(function () {
    "use strict";

    // ─── CONSTANTES ──────────────────────────────────────────────────────────
    var EVENTOS = {
        ciencia:      { label: "Ciência da Operação",     codigo: 210210, cor: "#1A436B", bg: "#eef5ff" },
        confirmada:   { label: "Confirmação da Operação", codigo: 210200, cor: "#0e7a57", bg: "#e6f4ee" },
        desconhecida: { label: "Desconhecimento",         codigo: 210220, cor: "#b42318", bg: "#fff4f4" },
        nao_realizada:{ label: "Operação não Realizada",  codigo: 210240, cor: "#b42318", bg: "#fff4f4" }
    };

    var POR_PAGINA = 20;

    // ─── ESTADO ──────────────────────────────────────────────────────────────
    var _pagina    = 1;
    var _total     = 0;
    var _lista     = [];        // lista filtrada atual
    var _selecionadas = new Set();
    var _chaveDetalhe = null;

    // ─── INIT ─────────────────────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", function () {
        vincularModais();
        vincularFiltros();
        vincularBotoesLote();
        vincularBotoesTopo();
        vincularModalConsulta();
        vincularModalManifestar();
        vincularModalDetalhe();
        carregarLista();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CARREGAR E RENDERIZAR
    // ═══════════════════════════════════════════════════════════════════════
    function carregarLista() {
        ErpApi.listarManifestacoes(obterFiltros())
            .then(function (res) {
                _lista = Array.isArray(res) ? res : (res.items || []);
                _total = typeof res.total === "number" ? res.total : _lista.length;
                _pagina = 1;
                _selecionadas.clear();
                renderizarTabela();
                atualizarCards();
                atualizarBarraLote();
            })
            .catch(function (err) {
                if (window.notificar) notificar("Erro ao carregar lista: " + (err.message || err), "erro");
            });
    }

    function obterFiltros() {
        return {
            q:          el("buscaMd")        ? el("buscaMd").value.trim()        : "",
            status:     el("filtroStatusMd") ? el("filtroStatusMd").value         : "",
            dataInicio: el("filtroDataIni")  ? el("filtroDataIni").value          : "",
            dataFim:    el("filtroDataFim")  ? el("filtroDataFim").value          : "",
            limit:      POR_PAGINA,
            offset:     (_pagina - 1) * POR_PAGINA
        };
    }

    function renderizarTabela() {
        var tbody   = el("listaMd");
        var inicio  = (_pagina - 1) * POR_PAGINA;
        var fatia   = _lista.slice(inicio, inicio + POR_PAGINA);

        if (!fatia.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="vazio">Nenhuma NF-e encontrada para os filtros selecionados.</td></tr>';
            el("paginacaoMd").innerHTML = "";
            return;
        }

        tbody.innerHTML = fatia.map(function (nfe) {
            var ev    = EVENTOS[nfe.status] || {};
            var badge = '<span class="badge badge-' + escapar(nfe.status || "pendente") + '">'
                      + escapar(ev.label || nfe.status || "Pendente") + '</span>';
            var chave = nfe.chave || "";
            var chaveCurta = chave ? (chave.slice(0, 10) + "..." + chave.slice(-10)) : "—";

            return '<tr class="' + (_selecionadas.has(nfe.id) ? "selecionada" : "") + '" data-id="' + escapar(nfe.id) + '">'
                + '<td class="col-check"><input type="checkbox" class="chk-md" data-id="' + escapar(nfe.id) + '"'
                + (_selecionadas.has(nfe.id) ? " checked" : "") + ' aria-label="Selecionar NF-e ' + escapar(nfe.numero) + '"></td>'
                + '<td><span class="emitente-nome">' + escapar(nfe.emitenteNome || "—") + '</span>'
                + '<span class="emitente-cnpj">' + formatarCnpj(nfe.emitenteCnpj) + '</span></td>'
                + '<td><span class="nfe-numero">Nº ' + escapar(nfe.numero || "—") + '</span>'
                + '<span class="nfe-serie">Série ' + escapar(nfe.serie || "1") + '</span>'
                + '<span class="nfe-chave" title="' + escapar(chave) + '">' + escapar(chaveCurta) + '</span></td>'
                + '<td class="col-valor"><strong>R$ ' + formatarMoeda(nfe.valor || 0) + '</strong></td>'
                + '<td>' + formatarDataHora(nfe.dataEmissao) + '</td>'
                + '<td>' + formatarDataHora(nfe.dhRecebimento) + '</td>'
                + '<td>' + badge + (nfe.situacaoSefaz === "cancelada" ? ' <span class="badge badge-cancelada" style="margin-left:3px">Cancelada</span>' : "") + '</td>'
                + '<td class="col-acoes"><div class="acoes-linha">'
                + '<button class="btn-acao btn-acao-detalhe" data-detalhe="' + escapar(nfe.id) + '" title="Detalhar"><i class="fa-solid fa-eye"></i></button>'
                + (nfe.status === "cancelada" ? "" : '<button class="btn-acao btn-acao-manifestar" data-manifestar="' + escapar(nfe.id) + '" title="Manifestar"><i class="fa-solid fa-paper-plane"></i></button>')
                + '</div></td>'
                + '</tr>';
        }).join("");

        // Seleção de linha
        tbody.querySelectorAll(".chk-md").forEach(function (chk) {
            chk.addEventListener("change", function () {
                var id = chk.dataset.id;
                if (chk.checked) { _selecionadas.add(id); } else { _selecionadas.delete(id); }
                var tr = chk.closest("tr");
                if (tr) tr.classList.toggle("selecionada", chk.checked);
                atualizarSelecionarTodos();
                atualizarBarraLote();
            });
        });

        // Botões de ação por linha
        tbody.querySelectorAll("[data-detalhe]").forEach(function (btn) {
            btn.addEventListener("click", function () { abrirDetalhe(btn.dataset.detalhe); });
        });
        tbody.querySelectorAll("[data-manifestar]").forEach(function (btn) {
            btn.addEventListener("click", function () { abrirModalManifestar([btn.dataset.manifestar]); });
        });

        renderizarPaginacao();
    }

    function renderizarPaginacao() {
        var totalPaginas = Math.max(1, Math.ceil(_lista.length / POR_PAGINA));
        if (totalPaginas <= 1) { el("paginacaoMd").innerHTML = ""; return; }
        var html = '<button ' + (_pagina <= 1 ? "disabled" : "") + ' data-pag="prev">‹ Anterior</button>';
        for (var i = 1; i <= totalPaginas; i++) {
            html += '<button class="' + (_pagina === i ? "ativa" : "") + '" data-pag="' + i + '">' + i + '</button>';
        }
        html += '<button ' + (_pagina >= totalPaginas ? "disabled" : "") + ' data-pag="next">Próximo ›</button>';
        var wrap = el("paginacaoMd");
        wrap.innerHTML = html;
        wrap.querySelectorAll("button:not(:disabled)").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var v = btn.dataset.pag;
                if (v === "prev") { _pagina = Math.max(1, _pagina - 1); }
                else if (v === "next") { _pagina = Math.min(Math.ceil(_lista.length / POR_PAGINA), _pagina + 1); }
                else { _pagina = Number(v); }
                renderizarTabela();
            });
        });
    }

    function atualizarCards() {
        var todos  = _lista;
        var counts = { pendente: 0, ciencia: 0, confirmada: 0, desconhecida: 0, nao_realizada: 0 };
        todos.forEach(function (n) { if (counts[n.status] !== undefined) counts[n.status]++; });
        setText("crdTotal",        todos.length);
        setText("crdPendentes",    counts.pendente);
        setText("crdConfirmadas",  counts.confirmada);
        setText("crdCiencia",      counts.ciencia);
        setText("crdDesconhecidas", counts.desconhecida + counts.nao_realizada);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SELEÇÃO EM LOTE
    // ═══════════════════════════════════════════════════════════════════════
    function vincularBotoesLote() {
        var chkAll = el("selecionarTodosMd");
        if (chkAll) {
            chkAll.addEventListener("change", function () {
                var chks = document.querySelectorAll(".chk-md");
                chks.forEach(function (chk) {
                    chk.checked = chkAll.checked;
                    var id = chk.dataset.id;
                    var tr = chk.closest("tr");
                    if (chkAll.checked) { _selecionadas.add(id); if (tr) tr.classList.add("selecionada"); }
                    else { _selecionadas.delete(id); if (tr) tr.classList.remove("selecionada"); }
                });
                atualizarBarraLote();
            });
        }

        document.querySelectorAll(".btn-lote[data-evento]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (!_selecionadas.size) return;
                abrirModalManifestar([..._selecionadas], btn.dataset.evento);
            });
        });

        on("btnCancelarLote", function () {
            _selecionadas.clear();
            document.querySelectorAll(".chk-md").forEach(function (c) {
                c.checked = false;
                var tr = c.closest("tr");
                if (tr) tr.classList.remove("selecionada");
            });
            var chkAll = el("selecionarTodosMd");
            if (chkAll) { chkAll.checked = false; chkAll.indeterminate = false; }
            atualizarBarraLote();
        });
    }

    function atualizarBarraLote() {
        var barra = el("barraLote");
        var lbl   = el("lblSelecionadas");
        if (barra) barra.hidden = !_selecionadas.size;
        if (lbl)   lbl.textContent = _selecionadas.size + " nota" + (_selecionadas.size !== 1 ? "s" : "") + " selecionada" + (_selecionadas.size !== 1 ? "s" : "");
    }

    function atualizarSelecionarTodos() {
        var chkAll = el("selecionarTodosMd");
        var total  = document.querySelectorAll(".chk-md").length;
        if (!chkAll || !total) return;
        chkAll.checked       = _selecionadas.size === total;
        chkAll.indeterminate = _selecionadas.size > 0 && _selecionadas.size < total;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL MANIFESTAR
    // ═══════════════════════════════════════════════════════════════════════
    function abrirModalManifestar(ids, tipoPreSelecionado) {
        if (!ids || !ids.length) return;
        var notas = ids.map(function (id) { return _lista.find(function (n) { return n.id === id; }); }).filter(Boolean);
        if (!notas.length) return;

        el("mdChavesAlvo").value = JSON.stringify(ids);
        setText("tituloModalManifestar", ids.length === 1 ? "Manifestar NF-e" : "Manifestar " + ids.length + " NF-e");
        setText("subtituloModalManifestar", "Registre seu posicionamento junto à SEFAZ.");

        // Pré-selecionar tipo se veio da barra lote
        if (tipoPreSelecionado) {
            var radio = document.querySelector('input[name="tipoEvento"][value="' + tipoPreSelecionado + '"]');
            if (radio) radio.checked = true;
            toggleJustificativa(tipoPreSelecionado);
        } else {
            document.querySelectorAll('input[name="tipoEvento"]').forEach(function (r) { r.checked = false; });
            toggleJustificativa(null);
        }

        // Preview das notas
        el("previewNotasMd").innerHTML = notas.map(function (nfe) {
            return '<div class="preview-nota-item"><strong>' + escapar(nfe.emitenteNome || "—") + '</strong>'
                + '<span>Nº ' + escapar(nfe.numero || "?") + ' · R$ ' + formatarMoeda(nfe.valor || 0) + '</span></div>';
        }).join("");

        if (el("mdJustificativa")) el("mdJustificativa").value = "";
        if (el("contadorJust"))    el("contadorJust").textContent = "0 / 255";
        abrirModal("modalManifestar");
    }

    function vincularModalManifestar() {
        document.querySelectorAll('input[name="tipoEvento"]').forEach(function (radio) {
            radio.addEventListener("change", function () { toggleJustificativa(radio.value); });
        });

        var just = el("mdJustificativa");
        if (just) {
            just.addEventListener("input", function () {
                if (el("contadorJust")) el("contadorJust").textContent = just.value.length + " / 255";
            });
        }

        on("btnConfirmarManifestar", executarManifestacao);
    }

    function toggleJustificativa(tipo) {
        var campo = el("campoJustificativa");
        if (!campo) return;
        var requer = tipo === "desconhecida" || tipo === "nao_realizada";
        campo.hidden = !requer;
        var textarea = el("mdJustificativa");
        if (textarea) textarea.required = requer;
    }

    function executarManifestacao() {
        var ids   = JSON.parse(el("mdChavesAlvo").value || "[]");
        var tipo  = document.querySelector('input[name="tipoEvento"]:checked')?.value;
        var just  = el("mdJustificativa") ? el("mdJustificativa").value.trim() : "";

        if (!tipo) { if (window.notificar) notificar("Selecione o tipo de manifestação.", "aviso"); return; }
        if ((tipo === "desconhecida" || tipo === "nao_realizada") && just.length < 15) {
            if (window.notificar) notificar("A justificativa precisa ter pelo menos 15 caracteres.", "aviso");
            return;
        }

        var notas = ids.map(function (id) { return _lista.find(function (n) { return n.id === id; }); }).filter(Boolean);
        var chaves = notas.map(function (n) { return n.chave; });
        var codigo = EVENTOS[tipo] ? EVENTOS[tipo].codigo : null;

        var btnEnv = el("btnConfirmarManifestar");
        setLoading(btnEnv, true);

        ErpApi.manifestarDestinatario({ chaves: chaves, tipoEvento: tipo, codigoEvento: codigo, justificativa: just })
            .then(function (res) {
                fecharModal("modalManifestar");
                _selecionadas.clear();
                var qtdOk = Array.isArray(res.resultados)
                    ? res.resultados.filter(function (r) { return r.sucesso; }).length
                    : ids.length;

                if (tipo === "confirmada") {
                    // Baixa os XMLs das notas confirmadas e redireciona para Entradas Pendentes
                    if (window.notificar) notificar(
                        qtdOk + " NF-e(s) confirmada(s). Baixando XML e abrindo Entradas Pendentes…", "sucesso");

                    baixarXmlsSequencial(notas, 0, function () {
                        window.location.href = new URL("telas/notasfiscais/entradas-pendentes.html", document.baseURI).href;
                    });
                } else {
                    var ev = EVENTOS[tipo];
                    if (window.notificar) notificar(
                        qtdOk + " NF-e(s) manifestada(s) como " + (ev ? ev.label : tipo) + ".", "sucesso");
                    carregarLista();
                }
            })
            .catch(function (err) {
                if (window.notificar) notificar("Erro ao manifestar: " + (err.message || err), "erro");
            })
            .finally(function () { setLoading(btnEnv, false); });
    }

    // Baixa XMLs um a um para não bloquear pop-up blocker, depois chama callback
    function baixarXmlsSequencial(notas, indice, callback) {
        if (indice >= notas.length) { callback(); return; }
        var nfe = notas[indice];
        if (!nfe || !nfe.chave) { baixarXmlsSequencial(notas, indice + 1, callback); return; }

        ErpApi.baixarXmlMd(nfe.chave)
            .then(function (res) {
                var blob = new Blob([res.xml || ""], { type: "application/xml" });
                var url  = URL.createObjectURL(blob);
                var a    = document.createElement("a");
                a.href = url;
                a.download = nfe.chave + ".xml";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(function () {
                // falha silenciosa no download individual — continua para a próxima
            })
            .finally(function () {
                // Pequeno intervalo entre downloads para não acionar bloqueio de pop-ups
                setTimeout(function () {
                    baixarXmlsSequencial(notas, indice + 1, callback);
                }, 400);
            });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL CONSULTA SEFAZ
    // ═══════════════════════════════════════════════════════════════════════
    function vincularModalConsulta() {
        var selTipo = el("mdTipoConsulta");
        if (selTipo) {
            selTipo.addEventListener("change", function () {
                el("campoChaveConsulta").hidden = selTipo.value !== "chave";
                el("campoNsuConsulta").hidden   = selTipo.value !== "nsu_especifico";
            });
        }
        on("btnExecutarConsulta", executarConsultaSefaz);
    }

    function executarConsultaSefaz() {
        var tipo     = el("mdTipoConsulta") ? el("mdTipoConsulta").value : "nsu";
        var chave    = el("mdChaveConsulta") ? el("mdChaveConsulta").value.trim() : "";
        var nsu      = el("mdNsuEspecifico") ? el("mdNsuEspecifico").value.trim() : "";
        var ambiente = el("mdAmbienteConsulta") ? Number(el("mdAmbienteConsulta").value) : 1;
        var status   = el("statusConsultaSefaz");

        if (tipo === "chave" && chave.length !== 44) {
            if (window.notificar) notificar("Chave de acesso inválida (44 dígitos).", "aviso"); return;
        }

        if (status) {
            status.className = "consulta-status carregando";
            status.textContent = "Consultando SEFAZ…";
            status.hidden = false;
        }

        var btnExec = el("btnExecutarConsulta");
        setLoading(btnExec, true);

        ErpApi.consultarDfeDestinatario({ tipo: tipo, chave: chave, nsu: nsu, ambiente: ambiente })
            .then(function (res) {
                var qtd = res.novasNfe || res.total || 0;
                if (status) {
                    status.className = "consulta-status sucesso";
                    status.textContent = "Consulta concluída! " + qtd + " NF-e(s) nova(s) encontrada(s).";
                }
                carregarLista();
            })
            .catch(function (err) {
                if (status) {
                    status.className = "consulta-status erro";
                    status.textContent = "Erro: " + (err.message || "Falha na comunicação com SEFAZ.");
                }
            })
            .finally(function () { setLoading(btnExec, false); });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL DETALHE
    // ═══════════════════════════════════════════════════════════════════════
    function abrirDetalhe(id) {
        _chaveDetalhe = id;
        var nfe = _lista.find(function (n) { return n.id === id; });
        if (!nfe) return;

        setText("subtituloDetalheNfe", "Emitente: " + escapar(nfe.emitenteNome || "—"));

        var eventos = (nfe.eventos || []).map(function (ev) {
            var cfg = EVENTOS[ev.tipo] || {};
            return '<div class="evento-item">'
                + '<div class="evento-dot" style="background:' + (cfg.cor || "#8299b0") + '"></div>'
                + '<div><strong>' + escapar(cfg.label || ev.tipo) + '</strong>'
                + '<small style="display:block;color:#8299b0">' + formatarDataHora(ev.dhEvento)
                + (ev.protocolo ? ' · Protocolo: ' + escapar(ev.protocolo) : '')
                + (ev.justificativa ? '<br>' + escapar(ev.justificativa) : '')
                + '</small></div></div>';
        }).join("") || '<p style="color:#8299b0;font-size:13px">Nenhum evento registrado.</p>';

        el("conteudoDetalheNfe").innerHTML =
            '<div class="detalhe-grid">'
            + detalheItem("Emitente",    nfe.emitenteNome || "—")
            + detalheItem("CNPJ",        formatarCnpj(nfe.emitenteCnpj))
            + detalheItem("Número",      "Nº " + (nfe.numero || "—") + " · Série " + (nfe.serie || "1"))
            + detalheItem("Valor Total", "R$ " + formatarMoeda(nfe.valor || 0))
            + detalheItem("Emissão",     formatarDataHora(nfe.dataEmissao))
            + detalheItem("Recebimento", formatarDataHora(nfe.dhRecebimento))
            + '</div>'
            + '<div class="detalhe-chave">' + escapar(nfe.chave || "Chave não disponível") + '</div>'
            + '<div class="historico-eventos"><h3>Histórico de Eventos</h3>' + eventos + '</div>';

        // Botões do rodapé
        var btnBaixar    = el("btnBaixarXmlMd");
        var btnManifestar = el("btnManifestarDetalhe");
        if (btnBaixar)     btnBaixar.onclick    = function () { baixarXml(nfe); };
        if (btnManifestar) btnManifestar.onclick = function () {
            fecharModal("modalDetalheNfe");
            abrirModalManifestar([nfe.id]);
        };
        if (btnManifestar) btnManifestar.hidden = nfe.situacaoSefaz === "cancelada";

        abrirModal("modalDetalheNfe");
    }

    function vincularModalDetalhe() { /* botões vinculados em abrirDetalhe */ }

    function detalheItem(label, valor) {
        return '<div class="detalhe-campo"><span>' + label + '</span><strong>' + escapar(String(valor)) + '</strong></div>';
    }

    function baixarXml(nfe) {
        if (!nfe || !nfe.chave) { if (window.notificar) notificar("Chave não disponível.", "aviso"); return; }
        ErpApi.baixarXmlMd(nfe.chave)
            .then(function (res) {
                var blob = new Blob([res.xml || ""], { type: "application/xml" });
                var url  = URL.createObjectURL(blob);
                var a    = document.createElement("a");
                a.href = url; a.download = nfe.chave + ".xml"; a.click();
                URL.revokeObjectURL(url);
            })
            .catch(function (err) { if (window.notificar) notificar("Erro ao baixar XML: " + (err.message || err), "erro"); });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAIS / UTILITÁRIOS
    // ═══════════════════════════════════════════════════════════════════════
    function vincularModais() {
        document.querySelectorAll("[data-fechar]").forEach(function (btn) {
            btn.addEventListener("click", function () { fecharModal(btn.dataset.fechar); });
        });
        document.querySelectorAll(".modal-fundo").forEach(function (fundo) {
            fundo.addEventListener("click", function (e) { if (e.target === fundo) fundo.classList.remove("aberto"); });
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-fundo.aberto").forEach(function (m) { m.classList.remove("aberto"); });
            }
        });
    }

    function vincularFiltros() {
        ["buscaMd", "filtroStatusMd", "filtroDataIni", "filtroDataFim"].forEach(function (id) {
            on(id, function () { _pagina = 1; carregarLista(); }, "change");
        });
        on("buscaMd", function () { _pagina = 1; carregarLista(); }, "input");
    }

    function vincularBotoesTopo() {
        on("btnConsultarSefaz", function () {
            var status = el("statusConsultaSefaz");
            if (status) status.hidden = true;
            abrirModal("modalConsultarSefaz");
        });
        on("btnAtualizarLista", function () { carregarLista(); });
    }

    function abrirModal(id)  { var m = el(id); if (m) m.classList.add("aberto"); }
    function fecharModal(id) { var m = el(id); if (m) m.classList.remove("aberto"); }

    function setLoading(btn, on) {
        if (!btn) return;
        btn.disabled = on;
        if (on) {
            btn._textoOriginal = btn.innerHTML;
            btn.innerHTML = '<span class="spinner"></span>';
        } else if (btn._textoOriginal) {
            btn.innerHTML = btn._textoOriginal;
        }
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    function el(id)       { return document.getElementById(id); }
    function setText(id, v) { var e = el(id); if (e) e.textContent = v; }
    function on(id, fn, evt) { var e = el(id); if (e) e.addEventListener(evt || "click", fn); }

    function escapar(str) {
        return String(str || "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function formatarMoeda(v) {
        return Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatarDataHora(str) {
        if (!str) return "—";
        var d = new Date(str);
        if (isNaN(d)) return str;
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    function formatarCnpj(v) {
        var s = String(v || "").replace(/\D/g, "");
        if (s.length !== 14) return v || "—";
        return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
})();
