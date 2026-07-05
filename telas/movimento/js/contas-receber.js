(function () {
    "use strict";

    // ── estado ──────────────────────────────────────────────────────────────
    var _abaAtual        = "recebimentos";
    var _mesSal          = new Date();        // mês selecionado na aba salários
    var _mesFluxo        = new Date();
    var _mesDre          = new Date();
    var _baixaPendente   = null;              // id da conta em espera de baixa
    var _filtroCardReceber = "";
    var _clienteReceberConfirmado = "";
    var _descontoSalId   = null;
    var _editRecId       = null;
    var _editDespId      = null;
    var _editFuncId      = null;
    var _editMetaId      = null;              // id da meta em edição

    // ── inicialização ───────────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", function () {
        garantirEstruturaBase();
        iniciarMascaras();
        vincularAbas();
        vincularModais();
        vincularBotoesAbrir();
        vincularFiltros();
        vincularCardsReceber();
        vincularConfirmacaoClienteReceber();
        vincularCheckTodos();

        renderizarTudo();
    });

    // ── estrutura base ──────────────────────────────────────────────────────
    function garantirEstruturaBase() {
        var base = obterBase();
        if (!Array.isArray(base.despesas))    base.despesas    = [];
        if (!Array.isArray(base.funcionarios)) base.funcionarios = [];
        if (!Array.isArray(base.salarios))    base.salarios    = [];
        if (!Array.isArray(base.metas))       base.metas       = [];
        salvarBase(base);
    }

    // ── máscaras de moeda ───────────────────────────────────────────────────
    function iniciarMascaras() {
        document.querySelectorAll("[data-moeda]").forEach(mascaraMoedaInput);
    }

    // ── abas ─────────────────────────────────────────────────────────────────
    function vincularAbas() {
        document.querySelectorAll(".aba").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var aba = btn.dataset.aba;
                document.querySelectorAll(".aba").forEach(function (b) { b.classList.remove("ativa"); });
                document.querySelectorAll(".aba-view").forEach(function (v) { v.classList.remove("ativa"); });
                btn.classList.add("ativa");
                var view = document.getElementById("view-" + aba);
                if (view) view.classList.add("ativa");
                _abaAtual = aba;
                renderizarAba(aba);
            });
        });
    }

    function renderizarTudo() {
        // detecta aba ativa no DOM (pode diferir entre páginas)
        var abaAtivaDom = document.querySelector(".aba.ativa");
        if (abaAtivaDom && abaAtivaDom.dataset.aba) _abaAtual = abaAtivaDom.dataset.aba;
        atualizarCards();
        renderizarAba(_abaAtual);
        popularFiltrosMes();
    }

    function renderizarAba(aba) {
        if (aba === "recebimentos") renderizarReceber();
        else if (aba === "fluxo")   renderizarFluxo();
        else if (aba === "despesas") renderizarDespesas();
        else if (aba === "salarios") renderizarSalarios();
        else if (aba === "dre")     renderizarDre();
        // "contas-pagar" é tratada pelo contas-pagar.js
    }

    // ── cards resumo ─────────────────────────────────────────────────────────
    function atualizarCards() {
        var base = obterBase();
        var hoje = hojeStr();
        var mesAtual = hoje.slice(0, 7);

        var receber = base.contasReceber.filter(function (c) { return c.status !== "baixada"; });
        var vencidas = receber.filter(function (c) { return c.vencimento && c.vencimento < hoje; });
        var vencemHoje = receber.filter(function (c) { return c.vencimento && c.vencimento === hoje; });
        var pagos = base.contasReceber.filter(function (c) { return c.status === "baixada"; });

        var desp = base.despesas.filter(function (d) {
            return (d.vencimento || "").startsWith(mesAtual);
        });
        var despTotal = desp.reduce(function (t, d) { return t + numero(d.valor); }, 0);

        var salMes = base.salarios.filter(function (s) {
            var m = ("0" + (new Date().getMonth() + 1)).slice(-2);
            var a = String(new Date().getFullYear());
            return s.ano === a && s.mes === m;
        });
        var folha = salMes.reduce(function (t, s) { return t + numero(s.liquido); }, 0);

        var vendas = base.vendas.filter(function (v) { return (v.data || "").startsWith(mesAtual); });
        var receita = vendas.reduce(function (t, v) { return t + numero(v.total); }, 0);
        var resultado = receita - despTotal - folha;

        definirTexto("cardReceber",   "R$ " + formatarMoeda(receber.reduce(function (t, c) { return t + numero(c.saldo || c.valor); }, 0)));
        definirTexto("cardVencidas",  "R$ " + formatarMoeda(vencidas.reduce(function (t, c) { return t + numero(c.saldo || c.valor); }, 0)));
        definirTexto("cardVencemHoje", "R$ " + formatarMoeda(vencemHoje.reduce(function (t, c) { return t + numero(c.saldo || c.valor); }, 0)));
        definirTexto("cardPagos", "R$ " + formatarMoeda(pagos.reduce(function (t, c) { return t + numero(c.valorBaixa || c.valor); }, 0)));
        definirTexto("cardDespesas",  "R$ " + formatarMoeda(despTotal));
        definirTexto("cardFolha",     "R$ " + formatarMoeda(folha));
        definirTexto("cardResultado", "R$ " + formatarMoeda(resultado));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ABA 1 — RECEBIMENTOS
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarReceber() {
        var base  = obterBase();
        var buscaCliente = normalizar(valorCampo("buscaReceber"));
        var tbody = document.getElementById("listaReceber");

        if (!_filtroCardReceber && !_clienteReceberConfirmado) {
            definirTexto("totalReceber", "0 contas");
            if (tbody) {
                tbody.innerHTML = buscaCliente
                    ? renderizarClientesPesquisaReceber(base.contasReceber, buscaCliente)
                    : '<tr><td colspan="8" class="vazio">Pesquise um cliente e confirme para exibir as pendências.</td></tr>';
            }
            atualizarSelecionadosRec();
            atualizarCardsReceberAtivos();
            return;
        }

        var contas = filtrarContas(base.contasReceber);
        atualizarCardsReceberAtivos();
        definirTexto("totalReceber", contas.length + " conta" + (contas.length !== 1 ? "s" : ""));
        var hoje = hojeStr();
        var html = "";
        contas.forEach(function (c) {
            var status = statusContaReceber(c, hoje);
            var badgeClass = status === "pago" ? "badge-pago" : status === "vencido" ? "badge-vencido" : status === "vence-hoje" ? "badge-hoje" : "badge-pendente";
            var badgeLabel = status === "pago" ? "Pago" : status === "vencido" ? "Vencido" : status === "vence-hoje" ? "Vence hoje" : "A receber";
            var acao = status !== "pago"
                ? '<button class="btn-pago btn-sm" onclick="abrirBaixa(\'' + escapar(c.id) + '\')">Receber</button>'
                : '<span style="color:#8299b0;font-size:12px">' + formatarData(c.dataBaixa) + '</span>';
            html += '<tr>'
                + '<td><input type="checkbox" class="chk-rec" data-id="' + escapar(c.id) + '"></td>'
                + '<td><strong>' + escapar(c.clienteNome || "—") + '</strong><small>' + escapar(c.documento || c.id || "") + '</small></td>'
                + '<td>' + escapar(c.descricao || c.documento || c.origem || "—") + '<small>' + escapar(c.origem || "Sem origem informada") + '</small></td>'
                + '<td>' + formatarData(c.vencimento) + (c.dataBaixa ? '<small>Pago em ' + formatarData(c.dataBaixa) + '</small>' : '') + '</td>'
                + '<td>R$ ' + formatarMoeda(c.valor) + '</td>'
                + '<td><strong>R$ ' + formatarMoeda(c.saldo ?? c.valor) + '</strong></td>'
                + '<td><span class="badge ' + badgeClass + '">' + badgeLabel + '</span></td>'
                + '<td>' + acao + (c.formaBaixa ? '<small>' + escapar(c.formaBaixa) + '</small>' : '') + '</td>'
                + '</tr>';
        });
        if (tbody) {
            if (!_filtroCardReceber && !_clienteReceberConfirmado) {
                tbody.innerHTML = '<tr><td colspan="8" class="vazio">Pesquise um cliente e confirme para exibir as pendências.</td></tr>';
            } else {
                tbody.innerHTML = html || '<tr><td colspan="8" class="vazio">Nenhuma conta encontrada.</td></tr>';
            }
        }
        atualizarSelecionadosRec();
    }

    function filtrarContas(contas) {
        var status = valorCampo("filtroStatusReceber");
        var data   = valorCampo("filtroVencReceber");
        var busca  = _clienteReceberConfirmado || "";
        var hoje   = hojeStr();
        if (!busca && !_filtroCardReceber) return [];

        return contas.filter(function (c) {
            var real = statusContaReceber(c, hoje);
            if (_filtroCardReceber) {
                if (_filtroCardReceber === "a-receber" && real === "pago") return false;
                if (_filtroCardReceber === "vencidos" && real !== "vencido") return false;
                if (_filtroCardReceber === "vencem-hoje" && real !== "vence-hoje") return false;
                if (_filtroCardReceber === "pagos" && real !== "pago") return false;
            }
            if (busca && !_filtroCardReceber && !status && real === "pago") return false;
            if (status) {
                var statusFiltro = real === "pago" ? "baixada" : real === "vencido" ? "vencido" : "pendente";
                if (statusFiltro !== status) return false;
            }
            if (data && c.vencimento !== data) return false;
            if (busca) {
                var txt = normalizar(c.clienteNome || "");
                if (!txt.includes(busca)) return false;
            }
            return true;
        });
    }

    function renderizarClientesPesquisaReceber(contas, busca) {
        var mapa = {};
        contas.forEach(function (conta) {
            var nome = (conta.clienteNome || "").trim();
            if (!nome) return;
            var chave = normalizar(nome);
            if (!chave.includes(busca)) return;
            if (!mapa[chave]) {
                mapa[chave] = {
                    nome: nome,
                    quantidade: 0,
                    total: 0
                };
            }
            mapa[chave].quantidade += 1;
            mapa[chave].total += numero(conta.saldo ?? conta.valor);
        });

        var clientes = Object.keys(mapa).map(function (chave) { return mapa[chave]; })
            .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });

        if (!clientes.length) {
            return '<tr><td colspan="8" class="vazio">Nenhum cliente encontrado.</td></tr>';
        }

        return clientes.map(function (cliente) {
            return '<tr>'
                + '<td></td>'
                + '<td colspan="3"><strong>' + escapar(cliente.nome) + '</strong><small>' + cliente.quantidade + ' lançamento(s)</small></td>'
                + '<td colspan="2"><strong>R$ ' + formatarMoeda(cliente.total) + '</strong></td>'
                + '<td><span class="badge badge-aberto">Cliente</span></td>'
                + '<td><button type="button" class="btn-pago btn-sm" data-confirmar-cliente-receber="' + escapar(normalizar(cliente.nome)) + '" data-cliente-nome="' + escapar(cliente.nome) + '">Confirmar</button></td>'
                + '</tr>';
        }).join("");
    }

    window.confirmarClienteReceber = function (chave, nome) {
        _clienteReceberConfirmado = chave || normalizar(nome || "");
        _filtroCardReceber = "";
        definirValor("buscaReceber", nome || "");
        atualizarCardsReceberAtivos();
        renderizarReceber();
    };

    function vincularConfirmacaoClienteReceber() {
        document.addEventListener("click", function (evento) {
            var botao = evento.target.closest("[data-confirmar-cliente-receber]");
            if (!botao) return;
            window.confirmarClienteReceber(botao.dataset.confirmarClienteReceber, botao.dataset.clienteNome);
        });
    }

    function statusContaReceber(conta, hoje) {
        if (conta.status === "baixada") return "pago";
        if (conta.vencimento && conta.vencimento < hoje) return "vencido";
        if (conta.vencimento && conta.vencimento === hoje) return "vence-hoje";
        return "pendente";
    }

    function vincularCheckTodos() {
        var chkTodos = document.getElementById("checkTodosRec");
        if (chkTodos) {
            chkTodos.addEventListener("change", function () {
                document.querySelectorAll(".chk-rec").forEach(function (c) { c.checked = chkTodos.checked; });
                atualizarSelecionadosRec();
            });
        }
        document.addEventListener("change", function (e) {
            if (e.target.classList.contains("chk-rec")) atualizarSelecionadosRec();
        });
    }

    function vincularCardsReceber() {
        document.querySelectorAll(".card-filtro-receber").forEach(function (card) {
            function abrirGrupo() {
                _filtroCardReceber = card.dataset.filtroReceber || "";
                _clienteReceberConfirmado = "";
                definirValor("filtroStatusReceber", "");
                definirValor("filtroVencReceber", "");
                definirValor("buscaReceber", "");
                atualizarCardsReceberAtivos();
                renderizarReceber();
            }

            card.addEventListener("click", abrirGrupo);
            card.addEventListener("keydown", function (evento) {
                if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    abrirGrupo();
                }
            });
        });
    }

    function atualizarCardsReceberAtivos() {
        document.querySelectorAll(".card-filtro-receber").forEach(function (card) {
            card.classList.toggle("ativo", card.dataset.filtroReceber === _filtroCardReceber);
        });
    }

    function atualizarSelecionadosRec() {
        var sel = document.querySelectorAll(".chk-rec:checked");
        var label = document.getElementById("labelSelecionadosRec");
        if (label) label.textContent = sel.length > 0 ? sel.length + " selecionado(s)" : "";
    }

    window.abrirBaixa = function (id) {
        var base = obterBase();
        var conta = base.contasReceber.find(function (c) { return c.id === id; });
        if (!conta) return;
        _baixaPendente = id;
        var desc = document.getElementById("labelBaixaDesc");
        if (desc) desc.textContent = (conta.clienteNome || "Cliente") + " — " + (conta.descricao || conta.documento || conta.origem || "");
        var saldo = numero(conta.saldo ?? conta.valor);
        var acrescimo = calcularAcrescimoAtraso(conta);
        definirValor("baixaValor", formatarMoeda(saldo + acrescimo.total));
        definirValor("baixaData", hojeStr());
        var infoEl = document.getElementById("baixaInfoAtraso");
        if (infoEl) {
            if (acrescimo.total > 0) {
                infoEl.innerHTML = '<span style="color:#b45309;font-size:12px">'
                    + 'Multa: R$ ' + formatarMoeda(acrescimo.multa)
                    + ' | Juros: R$ ' + formatarMoeda(acrescimo.juros)
                    + ' | Acréscimo total: R$ ' + formatarMoeda(acrescimo.total)
                    + '</span>';
                infoEl.hidden = false;
            } else {
                infoEl.hidden = true;
            }
        }
        abrirModal("modalBaixa");
    };

    function calcularAcrescimoAtraso(conta) {
        var cfg = typeof obterConfiguracoesSistema === "function"
            ? obterConfiguracoesSistema()
            : (window.ConfiguracoesSistema?.obter?.() || {});
        var multa     = parseFloat(cfg.financeiroMultaAtraso)  || 0;
        var jurosMes  = parseFloat(cfg.financeiroJurosMensais) || 0;
        var carencia  = parseInt(cfg.financeiroDiasCarencia, 10) || 0;
        var hoje  = new Date();
        var venc  = conta.vencimento ? new Date(conta.vencimento) : null;
        if (!venc || venc >= hoje) return { multa: 0, juros: 0, total: 0 };
        var diasAtraso = Math.floor((hoje - venc) / 86400000);
        if (diasAtraso <= carencia) return { multa: 0, juros: 0, total: 0 };
        var saldo = numero(conta.saldo ?? conta.valor);
        var vlrMulta  = saldo * (multa  / 100);
        var vlrJuros  = saldo * (jurosMes / 100) * (diasAtraso / 30);
        return {
            multa: vlrMulta,
            juros: vlrJuros,
            total: vlrMulta + vlrJuros
        };
    }

    function confirmarBaixa() {
        if (!_baixaPendente) return;
        var base  = obterBase();
        var conta = base.contasReceber.find(function (c) { return c.id === _baixaPendente; });
        if (!conta) return;
        var vlr   = numero(valorCampo("baixaValor"));
        var data  = valorCampo("baixaData") || hojeStr();
        var forma = valorCampo("baixaForma");
        if (vlr <= 0) { if (window.notificar) notificar("Informe o valor recebido.", "aviso"); return; }
        conta.valorBaixa  = vlr;
        conta.dataBaixa   = data;
        conta.formaBaixa  = forma;
        conta.saldo       = Math.max(0, numero(conta.saldo ?? conta.valor) - vlr);
        if (conta.saldo <= 0.01) conta.status = "baixada";
        salvarBase(base);
        fecharModal("modalBaixa");
        _baixaPendente = null;
        renderizarReceber();
        atualizarCards();
        if (window.notificar) notificar("Recebimento registrado!", "sucesso");
    }

    function salvarReceber() {
        var base  = obterBase();
        var nome  = valorCampo("recClienteNome").trim();
        var desc  = valorCampo("recDescricao").trim();
        var vlr   = numero(valorCampo("recValor"));
        var venc  = valorCampo("recVencimento");
        var orig  = valorCampo("recOrigem");
        if (!nome || vlr <= 0 || !venc) { if (window.notificar) notificar("Preencha cliente, valor e vencimento.", "aviso"); return; }
        if (_editRecId) {
            var idx = base.contasReceber.findIndex(function (c) { return c.id === _editRecId; });
            if (idx >= 0) {
                base.contasReceber[idx] = Object.assign(base.contasReceber[idx], {
                    clienteNome: nome, descricao: desc, valor: vlr, saldo: vlr, vencimento: venc, origem: orig
                });
            }
            _editRecId = null;
        } else {
            base.contasReceber.push({
                id: gerarId("rec"), clienteNome: nome, descricao: desc,
                valor: vlr, saldo: vlr, vencimento: venc, origem: orig,
                status: "pendente", data: hojeStr()
            });
        }
        salvarBase(base);
        fecharModal("modalReceber");
        renderizarReceber();
        atualizarCards();
        if (window.notificar) notificar("Recebimento salvo!", "sucesso");
    }

    function baixaSelecioandos() {
        var selecionados = [];
        document.querySelectorAll(".chk-rec:checked").forEach(function (c) {
            selecionados.push(c.dataset.id);
        });
        if (!selecionados.length) { if (window.notificar) notificar("Selecione ao menos uma conta.", "aviso"); return; }
        var base = obterBase();
        selecionados.forEach(function (id) {
            var c = base.contasReceber.find(function (x) { return x.id === id; });
            if (c && c.status !== "baixada") {
                c.status = "baixada"; c.dataBaixa = hojeStr(); c.valorBaixa = numero(c.saldo ?? c.valor); c.saldo = 0;
            }
        });
        salvarBase(base);
        renderizarReceber();
        atualizarCards();
        if (window.notificar) notificar(selecionados.length + " conta(s) baixada(s).", "sucesso");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ABA 2 — FLUXO DE CAIXA
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarFluxo() {
        var meses = gerarMeses(_mesFluxo, 6);
        var base  = obterBase();
        var dados = meses.map(function (m) { return calcularFluxoMes(base, m.ano, m.mes); });
        var maxVal = Math.max.apply(null, dados.map(function (d) { return Math.max(d.entrada, d.saida, 1); }));

        definirTexto("labelFluxoMes", meses[0].label + " – " + meses[meses.length - 1].label);

        // Gráfico
        var grafico = document.getElementById("graficoFluxo");
        if (grafico) {
            var ghml = "";
            dados.forEach(function (d, i) {
                var hE = Math.max(4, Math.round((d.entrada / maxVal) * 160));
                var hS = Math.max(4, Math.round((d.saida / maxVal) * 160));
                ghml += '<div class="col-mes">'
                    + '<div class="barras-duplas">'
                    + '<div class="barra barra-entrada" style="height:' + hE + 'px" title="Entradas: R$ ' + formatarMoeda(d.entrada) + '"></div>'
                    + '<div class="barra barra-saida" style="height:' + hS + 'px" title="Saídas: R$ ' + formatarMoeda(d.saida) + '"></div>'
                    + '</div>'
                    + '<div class="label-mes">' + escapar(meses[i].label) + '</div>'
                    + '</div>';
            });
            grafico.innerHTML = ghml;
        }

        // Tabela
        var acumulado = 0;
        var html = "";
        dados.forEach(function (d, i) {
            acumulado += d.saldo;
            var cls = d.saldo >= 0 ? "positivo-val" : "negativo-val";
            var clsAc = acumulado >= 0 ? "positivo-val" : "negativo-val";
            html += '<tr>'
                + '<td><strong>' + escapar(meses[i].label) + '</strong></td>'
                + '<td class="positivo-val">R$ ' + formatarMoeda(d.entrada) + '</td>'
                + '<td class="negativo-val">R$ ' + formatarMoeda(d.saida) + '</td>'
                + '<td class="' + cls + '">R$ ' + formatarMoeda(d.saldo) + '</td>'
                + '<td class="' + clsAc + '">R$ ' + formatarMoeda(acumulado) + '</td>'
                + '</tr>';
        });
        var tbl = document.getElementById("tabelaFluxo");
        if (tbl) tbl.innerHTML = html || '<tr><td colspan="5" class="vazio">Sem dados.</td></tr>';

        // Indicadores
        var totE = dados.reduce(function (t, d) { return t + d.entrada; }, 0);
        var totS = dados.reduce(function (t, d) { return t + d.saida; }, 0);
        var totSaldo = totE - totS;
        definirTexto("indTotalEntradas", "R$ " + formatarMoeda(totE));
        definirTexto("indTotalSaidas",   "R$ " + formatarMoeda(totS));
        definirTexto("indSaldoPeriodo",  "R$ " + formatarMoeda(totSaldo));
        definirTexto("indMediaEntradas", "R$ " + formatarMoeda(totE / (meses.length || 1)));
        definirTexto("indMediaSaidas",   "R$ " + formatarMoeda(totS / (meses.length || 1)));

        var indSaldo = document.getElementById("indSaldoPeriodo")?.parentElement;
        if (indSaldo) { indSaldo.classList.toggle("positivo", totSaldo >= 0); indSaldo.classList.toggle("negativo", totSaldo < 0); }
    }

    function calcularFluxoMes(base, ano, mes) {
        var prefixo = ano + "-" + mes;
        var entrada = base.vendas.filter(function (v) { return (v.data || "").startsWith(prefixo); })
            .reduce(function (t, v) { return t + numero(v.total); }, 0);
        entrada += base.contasReceber.filter(function (c) { return c.status === "baixada" && (c.dataBaixa || "").startsWith(prefixo); })
            .reduce(function (t, c) { return t + numero(c.valorBaixa || 0); }, 0);

        var saida = base.despesas.filter(function (d) { return (d.vencimento || "").startsWith(prefixo); })
            .reduce(function (t, d) { return t + numero(d.valor); }, 0);
        saida += base.salarios.filter(function (s) { return s.ano === ano && s.mes === mes; })
            .reduce(function (t, s) { return t + numero(s.liquido); }, 0);
        saida += base.contasPagar.filter(function (c) { return c.status === "pago" && (c.dataBaixa || (c.vencimento || "")).startsWith(prefixo); })
            .reduce(function (t, c) { return t + numero(c.valor); }, 0);

        return { entrada: entrada, saida: saida, saldo: entrada - saida };
    }

    function gerarMeses(refDate, qtd) {
        var meses = [];
        for (var i = qtd - 1; i >= 0; i--) {
            var d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
            meses.push({
                ano:   String(d.getFullYear()),
                mes:   ("0" + (d.getMonth() + 1)).slice(-2),
                label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
            });
        }
        return meses;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ABA 3 — DESPESAS
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarDespesas() {
        var base  = obterBase();
        var hoje  = hojeStr();
        var lista = filtrarDespesas(base.despesas, hoje);
        definirTexto("totalDespesas", lista.length + " despesa" + (lista.length !== 1 ? "s" : ""));
        var html = "";
        lista.forEach(function (d) {
            var status = d.status === "pago" ? "pago" : (d.vencimento && d.vencimento < hoje ? "vencido" : "pendente");
            var badgeClass = status === "pago" ? "badge-pago" : status === "vencido" ? "badge-vencido" : "badge-pendente";
            var badgeLabel = status === "pago" ? "Pago" : status === "vencido" ? "Vencido" : "Pendente";
            var btnPagar = status !== "pago"
                ? '<button class="btn-pago" onclick="pagarDespesa(\'' + escapar(d.id) + '\')">Pago</button> '
                : '<span style="font-size:11.5px;color:#8299b0">' + formatarData(d.dataPagamento) + '</span> ';
            html += '<tr>'
                + '<td><strong>' + escapar(d.descricao) + '</strong><small>' + escapar(d.obs || "") + '</small></td>'
                + '<td>' + escapar(d.categoria) + '</td>'
                + '<td>' + formatarData(d.vencimento) + '</td>'
                + '<td><strong>R$ ' + formatarMoeda(d.valor) + '</strong></td>'
                + '<td>' + (d.recorrencia && d.recorrencia !== "nao" ? '<span class="badge badge-aberto">' + escapar(d.recorrencia) + '</span>' : '—') + '</td>'
                + '<td><span class="badge ' + badgeClass + '">' + badgeLabel + '</span></td>'
                + '<td style="white-space:nowrap">'
                + btnPagar
                + '<button class="btn btn-secundario btn-sm" onclick="editarDespesa(\'' + escapar(d.id) + '\')">Editar</button> '
                + '<button class="btn btn-perigo btn-sm" onclick="excluirDespesa(\'' + escapar(d.id) + '\')">Excluir</button>'
                + '</td></tr>';
        });
        var tbody = document.getElementById("listaDespesas");
        if (tbody) tbody.innerHTML = html || '<tr><td colspan="7" class="vazio">Nenhuma despesa encontrada.</td></tr>';
    }

    function filtrarDespesas(lista, hoje) {
        var mes    = valorCampo("filtroMesDespesas");
        var cat    = valorCampo("filtroCategoriaDespesas");
        var status = valorCampo("filtroStatusDespesas");
        var busca  = normalizar(valorCampo("buscaDespesas"));
        return lista.filter(function (d) {
            if (mes && !(d.vencimento || "").startsWith(mes)) return false;
            if (cat && d.categoria !== cat) return false;
            if (status) {
                var real = d.status === "pago" ? "pago" : (d.vencimento && d.vencimento < hoje ? "vencido" : "pendente");
                if (real !== status) return false;
            }
            if (busca && !normalizar(d.descricao + " " + d.categoria).includes(busca)) return false;
            return true;
        });
    }

    function popularFiltrosMes() {
        var sel = document.getElementById("filtroMesDespesas");
        if (!sel) return;
        var html = '<option value="">Todos os meses</option>';
        for (var i = 5; i >= -6; i--) {
            var d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
            var val = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
            var lbl = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            html += '<option value="' + val + '">' + lbl + '</option>';
        }
        sel.innerHTML = html;
    }

    window.pagarDespesa = function (id) {
        var base = obterBase();
        var d    = base.despesas.find(function (x) { return x.id === id; });
        if (!d) return;
        d.status = "pago";
        d.dataPagamento = hojeStr();
        salvarBase(base);
        renderizarDespesas();
        atualizarCards();
        if (window.notificar) notificar("Despesa marcada como paga!", "sucesso");
    };

    window.editarDespesa = function (id) {
        var base = obterBase();
        var d    = base.despesas.find(function (x) { return x.id === id; });
        if (!d) return;
        _editDespId = id;
        definirValor("despDescricao", d.descricao);
        definirValor("despCategoria", d.categoria);
        definirValor("despValor", formatarMoeda(d.valor));
        definirValor("despVencimento", d.vencimento);
        definirValor("despRecorrencia", d.recorrencia || "nao");
        definirValor("despObs", d.obs || "");
        definirTexto("tituloModalDespesa", "Editar Despesa");
        abrirModal("modalDespesa");
    };

    window.excluirDespesa = function (id) {
        if (!confirm("Excluir esta despesa?")) return;
        var base = obterBase();
        base.despesas = base.despesas.filter(function (d) { return d.id !== id; });
        salvarBase(base);
        renderizarDespesas();
        atualizarCards();
        if (window.notificar) notificar("Despesa excluída.", "info");
    };

    function salvarDespesa() {
        var base = obterBase();
        var desc = valorCampo("despDescricao").trim();
        var cat  = valorCampo("despCategoria");
        var vlr  = numero(valorCampo("despValor"));
        var venc = valorCampo("despVencimento");
        var rec  = valorCampo("despRecorrencia");
        var obs  = valorCampo("despObs").trim();
        if (!desc || vlr <= 0 || !venc) { if (window.notificar) notificar("Preencha descrição, valor e vencimento.", "aviso"); return; }

        if (_editDespId) {
            var idx = base.despesas.findIndex(function (d) { return d.id === _editDespId; });
            if (idx >= 0) base.despesas[idx] = Object.assign(base.despesas[idx], { descricao: desc, categoria: cat, valor: vlr, vencimento: venc, recorrencia: rec, obs: obs });
            _editDespId = null;
        } else {
            var entrada = { id: gerarId("dep"), descricao: desc, categoria: cat, valor: vlr, vencimento: venc, recorrencia: rec, obs: obs, status: "pendente" };
            base.despesas.push(entrada);
            // gerar parcelas futuras para recorrentes
            if (rec === "mensal") {
                for (var m = 1; m <= 11; m++) {
                    var dv = new Date(venc + "T12:00:00");
                    dv.setMonth(dv.getMonth() + m);
                    var nextVenc = dv.toISOString().slice(0, 10);
                    base.despesas.push(Object.assign({}, entrada, { id: gerarId("dep"), vencimento: nextVenc, status: "pendente" }));
                }
            } else if (rec === "trimestral") {
                for (var t = 1; t <= 3; t++) {
                    var dv2 = new Date(venc + "T12:00:00");
                    dv2.setMonth(dv2.getMonth() + t * 3);
                    base.despesas.push(Object.assign({}, entrada, { id: gerarId("dep"), vencimento: dv2.toISOString().slice(0, 10), status: "pendente" }));
                }
            } else if (rec === "anual") {
                for (var a = 1; a <= 1; a++) {
                    var dv3 = new Date(venc + "T12:00:00");
                    dv3.setFullYear(dv3.getFullYear() + a);
                    base.despesas.push(Object.assign({}, entrada, { id: gerarId("dep"), vencimento: dv3.toISOString().slice(0, 10), status: "pendente" }));
                }
            }
        }
        salvarBase(base);
        fecharModal("modalDespesa");
        renderizarDespesas();
        atualizarCards();
        if (window.notificar) notificar("Despesa salva!", "sucesso");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ABA 4 — SALÁRIOS
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarSalarios() {
        var base   = obterBase();
        var anoSal = String(_mesSal.getFullYear());
        var mesSal = ("0" + (_mesSal.getMonth() + 1)).slice(-2);
        definirTexto("labelSalMes", _mesSal.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

        var busca = normalizar(valorCampo("buscaSalarios"));
        var salDoMes = base.salarios.filter(function (s) { return s.ano === anoSal && s.mes === mesSal; });

        // Se não existir registro para este mês, gerar a partir dos funcionários ativos
        var funcIds = salDoMes.map(function (s) { return s.funcionarioId; });
        base.funcionarios.filter(function (f) { return f.ativo === "ativo" && !funcIds.includes(f.id); }).forEach(function (f) {
            salDoMes.push(criarSalarioMes(f, anoSal, mesSal));
            base.salarios.push(salDoMes[salDoMes.length - 1]);
        });
        salvarBase(base);

        var lista = salDoMes.filter(function (s) {
            return !busca || normalizar(s.nome + " " + s.cargo).includes(busca);
        });

        var html = "";
        lista.forEach(function (s) {
            var badge = s.status === "pago" ? "badge-pago" : "badge-pendente";
            var label = s.status === "pago" ? "Pago" : "Pendente";
            var btnPagar = s.status !== "pago"
                ? '<button class="btn-pago" onclick="pagarSalario(\'' + escapar(s.id) + '\')">Pago</button> '
                : '<span style="font-size:11.5px;color:#8299b0">' + formatarData(s.dataPagamento) + '</span> ';
            html += '<tr>'
                + '<td><strong>' + escapar(s.nome) + '</strong></td>'
                + '<td>' + escapar(s.cargo) + '</td>'
                + '<td>R$ ' + formatarMoeda(s.salarioBase) + '</td>'
                + '<td>R$ ' + formatarMoeda(s.descontos || 0) + '</td>'
                + '<td><strong>R$ ' + formatarMoeda(s.liquido) + '</strong></td>'
                + '<td><span class="badge ' + badge + '">' + label + '</span></td>'
                + '<td style="white-space:nowrap">'
                + btnPagar
                + '<button class="btn btn-secundario btn-sm" onclick="editarDescSal(\'' + escapar(s.id) + '\')">Desconto</button>'
                + '</td></tr>';
        });
        var tbody = document.getElementById("listaSalarios");
        if (tbody) tbody.innerHTML = html || '<tr><td colspan="7" class="vazio">Sem registros neste mês.</td></tr>';

        var total = lista.reduce(function (t, s) { return t + numero(s.liquido); }, 0);
        definirTexto("totalFolhaMes", "R$ " + formatarMoeda(total));

        renderizarHistoricoSalarios(base);
        popularSelectFuncionarios(base);
    }

    function criarSalarioMes(func, ano, mes) {
        return {
            id:            gerarId("sal"),
            funcionarioId: func.id,
            nome:          func.nome,
            cargo:         func.cargo,
            salarioBase:   func.salarioBase,
            descontos:     0,
            adicionais:    0,
            liquido:       numero(func.salarioBase),
            mes:           mes,
            ano:           ano,
            status:        "pendente"
        };
    }

    function renderizarHistoricoSalarios(base) {
        var filtroFunc = valorCampo("filtroFuncHistorico");
        var meses12    = [];
        for (var i = 11; i >= 0; i--) {
            var d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
            meses12.push({ ano: String(d.getFullYear()), mes: ("0" + (d.getMonth() + 1)).slice(-2), label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) });
        }
        var html = "";
        meses12.forEach(function (m) {
            var salMes = base.salarios.filter(function (s) {
                return s.ano === m.ano && s.mes === m.mes && (!filtroFunc || s.funcionarioId === filtroFunc);
            });
            var pago    = salMes.filter(function (s) { return s.status === "pago"; }).length;
            var total   = salMes.length;
            var totalVlr = salMes.reduce(function (t, s) { return t + numero(s.liquido); }, 0);
            var badge   = total === 0 ? "" : (pago === total ? "badge-pago" : "badge-pendente");
            var label   = total === 0 ? "—" : (pago + "/" + total + " pago" + (pago !== 1 ? "s" : ""));
            html += '<div class="mes-sal-row">'
                + '<span class="mes-nome">' + escapar(m.label) + '</span>'
                + '<span class="mes-valor">R$ ' + formatarMoeda(totalVlr) + '</span>'
                + (total > 0 ? '<span class="badge ' + badge + '">' + label + '</span>' : '<span class="badge badge-aberto">Sem reg.</span>')
                + '</div>';
        });
        var cont = document.getElementById("historicoSalarios");
        if (cont) cont.innerHTML = html || '<p style="color:#8299b0;text-align:center;padding:20px">Sem registros</p>';
    }

    function popularSelectFuncionarios(base) {
        var sel = document.getElementById("filtroFuncHistorico");
        if (!sel) return;
        var opts = '<option value="">Todos os funcionários</option>';
        base.funcionarios.forEach(function (f) {
            opts += '<option value="' + escapar(f.id) + '">' + escapar(f.nome) + '</option>';
        });
        sel.innerHTML = opts;
    }

    window.pagarSalario = function (id) {
        var base = obterBase();
        var s    = base.salarios.find(function (x) { return x.id === id; });
        if (!s) return;
        s.status = "pago";
        s.dataPagamento = hojeStr();
        salvarBase(base);
        renderizarSalarios();
        atualizarCards();
        if (window.notificar) notificar("Salário marcado como pago!", "sucesso");
    };

    window.editarDescSal = function (id) {
        _descontoSalId = id;
        var base = obterBase();
        var s    = base.salarios.find(function (x) { return x.id === id; });
        if (!s) return;
        definirTexto("labelDescSalFunc", s.nome + " — " + s.cargo);
        definirValor("descSalDesconto", formatarMoeda(s.descontos || 0));
        definirValor("descSalAdicional", formatarMoeda(s.adicionais || 0));
        definirValor("descSalObs", s.obsDesconto || "");
        abrirModal("modalDescSal");
    };

    function salvarDescSal() {
        if (!_descontoSalId) return;
        var base = obterBase();
        var s    = base.salarios.find(function (x) { return x.id === _descontoSalId; });
        if (!s) return;
        s.descontos  = numero(valorCampo("descSalDesconto"));
        s.adicionais = numero(valorCampo("descSalAdicional"));
        s.obsDesconto = valorCampo("descSalObs");
        s.liquido    = Math.max(0, numero(s.salarioBase) - s.descontos + s.adicionais);
        salvarBase(base);
        fecharModal("modalDescSal");
        renderizarSalarios();
        atualizarCards();
        _descontoSalId = null;
        if (window.notificar) notificar("Desconto aplicado!", "sucesso");
    }

    function salvarFuncionario() {
        var nome   = valorCampo("funcNome").trim();
        var cargo  = valorCampo("funcCargo").trim();
        var sal    = numero(valorCampo("funcSalario"));
        var adm    = valorCampo("funcAdmissao");
        var ativo  = valorCampo("funcAtivo");
        if (!nome || sal <= 0) { if (window.notificar) notificar("Informe nome e salário.", "aviso"); return; }
        var base = obterBase();
        if (_editFuncId) {
            var idx = base.funcionarios.findIndex(function (f) { return f.id === _editFuncId; });
            if (idx >= 0) base.funcionarios[idx] = Object.assign(base.funcionarios[idx], { nome: nome, cargo: cargo, salarioBase: sal, dataAdmissao: adm, ativo: ativo });
            _editFuncId = null;
        } else {
            var func = { id: gerarId("func"), nome: nome, cargo: cargo, salarioBase: sal, dataAdmissao: adm, ativo: ativo };
            base.funcionarios.push(func);
            // Gerar 12 meses de salário
            for (var i = 0; i < 12; i++) {
                var d = new Date(new Date().getFullYear(), new Date().getMonth() - 5 + i, 1);
                var a = String(d.getFullYear());
                var m = ("0" + (d.getMonth() + 1)).slice(-2);
                var jaExiste = base.salarios.some(function (s) { return s.funcionarioId === func.id && s.ano === a && s.mes === m; });
                if (!jaExiste) base.salarios.push(criarSalarioMes(func, a, m));
            }
        }
        salvarBase(base);
        fecharModal("modalFuncionario");
        renderizarSalarios();
        atualizarCards();
        if (window.notificar) notificar("Funcionário salvo!", "sucesso");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ABA 5 — DRE
    // ═══════════════════════════════════════════════════════════════════════
    function renderizarDre() {
        var base = obterBase();
        var ano  = String(_mesDre.getFullYear());
        var mes  = ("0" + (_mesDre.getMonth() + 1)).slice(-2);
        definirTexto("labelDreMes", _mesDre.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

        var d = calcularDreMes(base, ano, mes);
        renderizarDreMes(d, base, ano, mes);
        renderizarProjecao(base);
        renderizarMetaMes(base, ano, mes);
        renderizarMetas(base);
    }

    function calcularDreMes(base, ano, mes) {
        var prefixo = ano + "-" + mes;
        var vendas  = base.vendas.filter(function (v) { return (v.data || "").startsWith(prefixo); });
        var recBruta = vendas.reduce(function (t, v) { return t + numero(v.total); }, 0);
        var cancelados = base.vendasCanceladas ? base.vendasCanceladas.filter(function (v) { return (v.data || "").startsWith(prefixo); })
            .reduce(function (t, v) { return t + numero(v.total); }, 0) : 0;
        var recLiq = recBruta - cancelados;

        var cmv = vendas.reduce(function (t, v) {
            return t + (v.itens || []).reduce(function (tt, it) { return tt + (numero(it.quantidade) * numero(it.precoCusto || 0)); }, 0);
        }, 0);

        var lucroBruto = recLiq - cmv;
        var despOp = base.despesas.filter(function (d) { return (d.vencimento || "").startsWith(prefixo); })
            .reduce(function (t, d) { return t + numero(d.valor); }, 0);
        var folha = base.salarios.filter(function (s) { return s.ano === ano && s.mes === mes; })
            .reduce(function (t, s) { return t + numero(s.liquido); }, 0);
        var ebitda = lucroBruto - despOp - folha;
        return { recBruta: recBruta, cancelados: cancelados, recLiq: recLiq, cmv: cmv, lucroBruto: lucroBruto, despOp: despOp, folha: folha, ebitda: ebitda };
    }

    function renderizarDreMes(d, base, ano, mes) {
        function lin(label, val, cls, extra) {
            var valFmt = "R$ " + formatarMoeda(Math.abs(val));
            var signal = val < 0 ? "− " : (extra === "negativo" ? "− " : "");
            return '<div class="linha-dre ' + (cls || "") + '"><span>' + label + '</span><span class="' + (val < 0 || extra === "negativo" ? "negativo-val" : "") + '">' + signal + valFmt + '</span></div>';
        }
        var html = ''
            + '<div class="linha-dre grupo"><span>RECEITAS</span></div>'
            + lin("(+) Receita Bruta de Vendas", d.recBruta, "")
            + (d.cancelados > 0 ? lin("(−) Devoluções / Cancelamentos", d.cancelados, "", "negativo") : "")
            + lin("= Receita Líquida", d.recLiq, "subtotal")
            + '<div class="linha-dre grupo"><span>CUSTOS</span></div>'
            + lin("(−) Custo das Mercadorias Vendidas (CMV)", d.cmv, "", "negativo")
            + lin("= Lucro Bruto", d.lucroBruto, "subtotal")
            + '<div class="linha-dre grupo"><span>DESPESAS</span></div>'
            + lin("(−) Despesas Operacionais", d.despOp, "", "negativo")
            + lin("(−) Despesas com Pessoal / Salários", d.folha, "", "negativo")
            + '<div class="linha-dre resultado"><span><strong>= Resultado do Período (EBITDA)</strong></span><span><strong>R$ ' + formatarMoeda(d.ebitda) + '</strong></span></div>';
        var cont = document.getElementById("dreMes");
        if (cont) cont.innerHTML = html;

        // Indicadores laterais
        definirTexto("dreIndReceita",     "R$ " + formatarMoeda(d.recBruta));
        definirTexto("dreIndCmv",         "R$ " + formatarMoeda(d.cmv));
        definirTexto("dreIndLucroBruto",  "R$ " + formatarMoeda(d.lucroBruto));
        definirTexto("dreIndDespesas",    "R$ " + formatarMoeda(d.despOp));
        definirTexto("dreIndSalarios",    "R$ " + formatarMoeda(d.folha));
        definirTexto("dreIndResultado",   "R$ " + formatarMoeda(d.ebitda));
        var margem = d.recLiq > 0 ? ((d.ebitda / d.recLiq) * 100).toFixed(1) + "%" : "—";
        definirTexto("dreIndMargem", margem);
        var card = document.getElementById("dreIndResultadoCard");
        if (card) { card.classList.toggle("positivo", d.ebitda >= 0); card.classList.toggle("negativo", d.ebitda < 0); }
    }

    function obterPeriodoProjecao() {
        return {
            inicio: valorCampo("projDataInicio"),
            fim: valorCampo("projDataFim")
        };
    }

    function montarMesesProjecao() {
        var hojeData = new Date();
        var mesAtual = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1);
        var filtro   = obterPeriodoProjecao();
        var inicioRef, fimRef;

        if (filtro.inicio && filtro.fim) {
            var di = new Date(filtro.inicio + "T12:00:00");
            var df = new Date(filtro.fim + "T12:00:00");
            inicioRef = new Date(di.getFullYear(), di.getMonth(), 1);
            fimRef    = new Date(df.getFullYear(), df.getMonth(), 1);
        } else {
            inicioRef = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 5, 1);
            fimRef    = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 6, 1);
        }

        // o mês atual sempre aparece na lista, mesmo fora do período filtrado
        if (mesAtual < inicioRef) inicioRef = mesAtual;
        if (mesAtual > fimRef)    fimRef    = mesAtual;

        var meses  = [];
        var cursor = new Date(inicioRef);
        var limite = 60; // trava de segurança para períodos muito longos
        while (cursor <= fimRef && meses.length < limite) {
            meses.push({ ano: String(cursor.getFullYear()), mes: ("0" + (cursor.getMonth() + 1)).slice(-2), d: new Date(cursor) });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return meses;
    }

    function renderizarProjecao(base) {
        var meses = montarMesesProjecao();
        var hoje = hojeStr().slice(0, 7);
        var html = "";
        meses.forEach(function (m) {
            var prefixo = m.ano + "-" + m.mes;
            var ehFuturo = prefixo > hoje;
            var ehAtual  = prefixo === hoje;
            var label    = m.d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
            var dados;
            if (!ehFuturo) {
                dados = calcularDreMes(base, m.ano, m.mes);
            } else {
                var mediaVendas = mediaVendasUltimos(base, 3);
                var despRecorr  = base.despesas.filter(function (d) { return d.recorrencia === "mensal"; })
                    .reduce(function (t, d) { return t + numero(d.valor); }, 0);
                var folhaEstim  = base.salarios.filter(function (s) { return s.ano === m.ano && s.mes === m.mes; })
                    .reduce(function (t, s) { return t + numero(s.liquido); }, 0);
                if (folhaEstim === 0) {
                    folhaEstim = base.funcionarios.filter(function (f) { return f.ativo === "ativo"; })
                        .reduce(function (t, f) { return t + numero(f.salarioBase); }, 0);
                }
                dados = { recBruta: mediaVendas, cancelados: 0, recLiq: mediaVendas, cmv: mediaVendas * 0.45, despOp: despRecorr, folha: folhaEstim, ebitda: mediaVendas - mediaVendas * 0.45 - despRecorr - folhaEstim };
            }

            // meta do mês
            var meta = obterMeta(base, m.ano, m.mes);
            var colMetaVendas  = meta ? miniProgress(dados.recBruta, meta.metaVendas, m.ano, m.mes) : '<span class="sem-meta">—</span>';
            var colMetaResult  = meta ? miniProgress(dados.ebitda, meta.metaResultado, m.ano, m.mes) : '<span class="sem-meta">—</span>';

            var resultado = dados.ebitda;
            var resCls    = resultado >= 0 ? "positivo-val" : "negativo-val";
            var tipoBadge = ehFuturo ? "badge badge-projecao" : (ehAtual ? "badge badge-aberto" : "badge badge-pago");
            var tipoLabel = ehFuturo ? "Projeção" : (ehAtual ? "Atual" : "Realizado");
            var rowCls    = ehFuturo ? "mes-futuro" : (ehAtual ? "mes-atual" : "mes-passado");
            var btnMeta   = '<button class="btn btn-secundario btn-sm" style="font-size:11px;padding:4px 9px" onclick="abrirModalMetaMes(\'' + m.ano + '\',\'' + m.mes + '\')">'
                + (meta ? '<i class="fa-solid fa-pen"></i>' : '<i class="fa-solid fa-plus"></i>')
                + '</button>';

            html += '<tr class="' + rowCls + '">'
                + '<td><strong>' + label + '</strong></td>'
                + '<td class="positivo-val">R$ ' + formatarMoeda(dados.recBruta) + '</td>'
                + '<td class="meta-prog-cell">' + colMetaVendas + '</td>'
                + '<td class="negativo-val">R$ ' + formatarMoeda(dados.cmv) + '</td>'
                + '<td class="negativo-val">R$ ' + formatarMoeda(dados.despOp) + '</td>'
                + '<td class="negativo-val">R$ ' + formatarMoeda(dados.folha) + '</td>'
                + '<td class="' + resCls + '"><strong>' + (resultado < 0 ? "− " : "") + 'R$ ' + formatarMoeda(Math.abs(resultado)) + '</strong></td>'
                + '<td class="meta-prog-cell">' + colMetaResult + '</td>'
                + '<td><span class="' + tipoBadge + '">' + tipoLabel + '</span></td>'
                + '<td>' + btnMeta + '</td>'
                + '</tr>';
        });
        var tbody = document.getElementById("tabelaProjecao");
        if (tbody) tbody.innerHTML = html || '<tr><td colspan="10" class="vazio">Sem dados.</td></tr>';
    }

    function miniProgress(real, meta, ano, mes) {
        if (!meta || meta <= 0) return '<span class="sem-meta">—</span>';
        var pct = Math.min(Math.round((real / meta) * 100), 100);
        var cls = pct >= 100 ? "progress-ok" : (pct >= 75 ? "progress-quase" : "progress-baixo");
        var lblCls = pct >= 100 ? "ok" : (pct >= 75 ? "quase" : "baixo");
        return '<div class="meta-prog-mini">'
            + '<div class="progress-wrap"><div class="progress-bar ' + cls + '" style="width:' + pct + '%"></div></div>'
            + '<span class="progress-label ' + lblCls + '">' + pct + '% · R$ ' + formatarMoeda(meta) + '</span>'
            + '</div>';
    }

    function mediaVendasUltimos(base, meses) {
        var total = 0;
        for (var i = 1; i <= meses; i++) {
            var d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
            var pref = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
            total += base.vendas.filter(function (v) { return (v.data || "").startsWith(pref); })
                .reduce(function (t, v) { return t + numero(v.total); }, 0);
        }
        return total / meses;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // METAS
    // ═══════════════════════════════════════════════════════════════════════
    function obterMeta(base, ano, mes) {
        return (base.metas || []).find(function (mt) { return mt.ano === ano && mt.mes === mes; }) || null;
    }

    function renderizarMetaMes(base, ano, mes) {
        var meta = obterMeta(base, ano, mes);
        var cont = document.getElementById("resumoMetaMes");
        if (!cont) return;
        if (!meta) {
            cont.innerHTML = '<p style="color:#8299b0;font-size:13px;text-align:center;padding:14px 0">Nenhuma meta definida para este mês.</p>';
            return;
        }
        var dre     = calcularDreMes(base, ano, mes);
        var html    = '<div class="meta-mes-grid">';
        if (meta.metaVendas > 0)    html += metaMesRow("Meta de Vendas",     dre.recBruta, meta.metaVendas);
        if (meta.metaResultado > 0) html += metaMesRow("Meta de Resultado",  dre.ebitda,   meta.metaResultado);
        if (meta.metaDespesas > 0) {
            var totalDesp = dre.despOp + dre.folha;
            html += metaMesRowLimite("Limite de Despesas", totalDesp, meta.metaDespesas);
        }
        if (meta.metaMargem > 0) {
            var margemReal = dre.recLiq > 0 ? (dre.ebitda / dre.recLiq) * 100 : 0;
            html += metaMesRowPct("Margem mínima", margemReal, meta.metaMargem);
        }
        if (meta.obs) html += '<p style="font-size:12px;color:#8299b0;margin-top:6px;font-style:italic">' + escapar(meta.obs) + '</p>';
        html += '</div>';
        cont.innerHTML = html;
    }

    function metaMesRow(label, real, meta) {
        var pct    = meta > 0 ? Math.min(Math.round((real / meta) * 100), 999) : 0;
        var barPct = Math.min(pct, 100);
        var cls    = pct >= 100 ? "progress-ok" : (pct >= 75 ? "progress-quase" : "progress-baixo");
        var lCls   = pct >= 100 ? "ok" : (pct >= 75 ? "quase" : "baixo");
        return '<div class="meta-mes-row">'
            + '<div class="mm-label">' + label + '</div>'
            + '<div class="mm-vals"><strong>' + (real < 0 ? "− " : "") + 'R$ ' + formatarMoeda(Math.abs(real)) + '</strong><span>de R$ ' + formatarMoeda(meta) + '</span></div>'
            + '<div class="progress-wrap"><div class="progress-bar ' + cls + '" style="width:' + barPct + '%"></div></div>'
            + '<div class="progress-label ' + lCls + '" style="margin-top:4px">' + pct + '% atingido</div>'
            + '</div>';
    }

    function metaMesRowLimite(label, real, limite) {
        // para limites: quanto MENOS gastar, melhor; inverso do progresso
        var pct    = limite > 0 ? Math.min(Math.round((real / limite) * 100), 999) : 0;
        var barPct = Math.min(pct, 100);
        // cores invertidas: verde = abaixo do limite
        var cls    = pct <= 80 ? "progress-ok" : (pct <= 100 ? "progress-quase" : "progress-baixo");
        var lCls   = pct <= 80 ? "ok" : (pct <= 100 ? "quase" : "baixo");
        var status = pct > 100 ? "⚠ Acima do limite!" : (pct > 80 ? "Próximo do limite" : "Dentro do limite");
        return '<div class="meta-mes-row">'
            + '<div class="mm-label">' + label + '</div>'
            + '<div class="mm-vals"><strong>R$ ' + formatarMoeda(real) + '</strong><span>limite R$ ' + formatarMoeda(limite) + '</span></div>'
            + '<div class="progress-wrap"><div class="progress-bar ' + cls + '" style="width:' + barPct + '%"></div></div>'
            + '<div class="progress-label ' + lCls + '" style="margin-top:4px">' + pct + '% usado · ' + status + '</div>'
            + '</div>';
    }

    function metaMesRowPct(label, real, meta) {
        var pct    = Math.round(real * 10) / 10;
        var barPct = Math.min(Math.round((real / meta) * 100), 100);
        var cls    = real >= meta ? "progress-ok" : (real >= meta * 0.75 ? "progress-quase" : "progress-baixo");
        var lCls   = real >= meta ? "ok" : (real >= meta * 0.75 ? "quase" : "baixo");
        return '<div class="meta-mes-row">'
            + '<div class="mm-label">' + label + '</div>'
            + '<div class="mm-vals"><strong>' + pct + '%</strong><span>mínimo ' + meta + '%</span></div>'
            + '<div class="progress-wrap"><div class="progress-bar ' + cls + '" style="width:' + barPct + '%"></div></div>'
            + '<div class="progress-label ' + lCls + '" style="margin-top:4px">' + (real >= meta ? "Atingida" : "Abaixo da meta") + '</div>'
            + '</div>';
    }

    function renderizarMetas(base) {
        var cont = document.getElementById("painelMetas");
        if (!cont) return;
        var metas = (base.metas || []).slice().sort(function (a, b) {
            return (b.ano + b.mes).localeCompare(a.ano + a.mes);
        });
        if (!metas.length) {
            cont.innerHTML = '<p style="color:#8299b0;text-align:center;padding:24px;grid-column:1/-1">Nenhuma meta cadastrada. Clique em <strong>Nova Meta</strong> para começar.</p>';
            return;
        }
        var html = "";
        metas.forEach(function (mt) {
            var dre   = calcularDreMes(base, mt.ano, mt.mes);
            var dLabel = new Date(Number(mt.ano), Number(mt.mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            var itens = "";
            if (mt.metaVendas > 0) {
                var pV = mt.metaVendas > 0 ? Math.min(Math.round((dre.recBruta / mt.metaVendas) * 100), 100) : 0;
                var cV = pV >= 100 ? "progress-ok" : (pV >= 75 ? "progress-quase" : "progress-baixo");
                itens += '<div class="meta-item">'
                    + '<span class="meta-item-label">Vendas</span>'
                    + '<div class="meta-item-vals"><strong>R$ ' + formatarMoeda(dre.recBruta) + '</strong><span>/ R$ ' + formatarMoeda(mt.metaVendas) + '</span></div>'
                    + '<div class="progress-wrap"><div class="progress-bar ' + cV + '" style="width:' + pV + '%"></div></div>'
                    + '<div class="progress-label ' + (pV >= 100 ? "ok" : pV >= 75 ? "quase" : "baixo") + '">' + pV + '%</div>'
                    + '</div>';
            }
            if (mt.metaResultado > 0) {
                var pR = mt.metaResultado > 0 ? Math.min(Math.round((dre.ebitda / mt.metaResultado) * 100), 100) : 0;
                if (pR < 0) pR = 0;
                var cR = pR >= 100 ? "progress-ok" : (pR >= 75 ? "progress-quase" : "progress-baixo");
                itens += '<div class="meta-item">'
                    + '<span class="meta-item-label">Resultado</span>'
                    + '<div class="meta-item-vals"><strong>R$ ' + formatarMoeda(dre.ebitda) + '</strong><span>/ R$ ' + formatarMoeda(mt.metaResultado) + '</span></div>'
                    + '<div class="progress-wrap"><div class="progress-bar ' + cR + '" style="width:' + pR + '%"></div></div>'
                    + '<div class="progress-label ' + (pR >= 100 ? "ok" : pR >= 75 ? "quase" : "baixo") + '">' + pR + '%</div>'
                    + '</div>';
            }
            if (mt.metaDespesas > 0) {
                var totalDesp = dre.despOp + dre.folha;
                var pD = Math.min(Math.round((totalDesp / mt.metaDespesas) * 100), 100);
                var cD = pD <= 80 ? "progress-ok" : (pD <= 100 ? "progress-quase" : "progress-baixo");
                itens += '<div class="meta-item">'
                    + '<span class="meta-item-label">Limite desp.</span>'
                    + '<div class="meta-item-vals"><strong>R$ ' + formatarMoeda(totalDesp) + '</strong><span>limite R$ ' + formatarMoeda(mt.metaDespesas) + '</span></div>'
                    + '<div class="progress-wrap"><div class="progress-bar ' + cD + '" style="width:' + pD + '%"></div></div>'
                    + '<div class="progress-label ' + (pD <= 80 ? "ok" : pD <= 100 ? "quase" : "baixo") + '">' + pD + '%</div>'
                    + '</div>';
            }
            if (mt.obs) itens += '<p style="font-size:11.5px;color:#8299b0;font-style:italic;margin-top:2px">' + escapar(mt.obs) + '</p>';

            html += '<div class="meta-card">'
                + '<div class="meta-card-header">'
                + '<span class="meta-card-mes"><i class="fa-solid fa-bullseye" style="color:#1A436B;margin-right:5px;font-size:12px"></i>' + escapar(dLabel) + '</span>'
                + '<div class="meta-card-acoes">'
                + '<button class="btn btn-secundario btn-sm" onclick="editarMeta(\'' + escapar(mt.id) + '\')" title="Editar"><i class="fa-solid fa-pen"></i></button>'
                + '<button class="btn btn-perigo btn-sm" onclick="excluirMeta(\'' + escapar(mt.id) + '\')" title="Excluir"><i class="fa-solid fa-trash"></i></button>'
                + '</div></div>'
                + itens
                + '</div>';
        });
        cont.innerHTML = html;
    }

    // abre modal pre-preenchendo mês/ano (chamado da tabela de projeção)
    window.abrirModalMetaMes = function (ano, mes) {
        var base  = obterBase();
        var meta  = obterMeta(base, ano, mes);
        _editMetaId = meta ? meta.id : null;
        definirTexto("tituloModalMeta", meta ? "Editar Meta" : "Definir Meta");
        definirTexto("subtituloModalMeta", new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
        definirValor("metaMes", mes);
        definirValor("metaAno", ano);
        definirValor("metaVendas",          meta ? formatarMoeda(meta.metaVendas || 0)    : "0,00");
        definirValor("metaResultado",       meta ? formatarMoeda(meta.metaResultado || 0) : "0,00");
        definirValor("metaMargem",          meta ? (meta.metaMargem || "")                : "");
        definirValor("metaLimiteDespesas",  meta ? formatarMoeda(meta.metaDespesas || 0)  : "0,00");
        definirValor("metaLimiteFolha",     meta ? formatarMoeda(meta.metaLimiteFolha || 0) : "0,00");
        definirValor("metaObs",             meta ? (meta.obs || "")                       : "");
        abrirModal("modalMeta");
    };

    window.editarMeta = function (id) {
        var base = obterBase();
        var mt   = (base.metas || []).find(function (m) { return m.id === id; });
        if (!mt) return;
        window.abrirModalMetaMes(mt.ano, mt.mes);
    };

    window.excluirMeta = function (id) {
        if (!confirm("Excluir esta meta?")) return;
        var base  = obterBase();
        base.metas = base.metas.filter(function (m) { return m.id !== id; });
        salvarBase(base);
        renderizarMetas(base);
        renderizarProjecao(base);
        if (window.notificar) notificar("Meta excluída.", "info");
    };

    function salvarMeta() {
        var mes   = valorCampo("metaMes");
        var ano   = valorCampo("metaAno").trim();
        var vV    = numero(valorCampo("metaVendas"));
        var vR    = numero(valorCampo("metaResultado"));
        var vMg   = parseFloat(valorCampo("metaMargem")) || 0;
        var vD    = numero(valorCampo("metaLimiteDespesas"));
        var vF    = numero(valorCampo("metaLimiteFolha"));
        var obs   = valorCampo("metaObs").trim();

        if (!mes || !ano || ano.length !== 4) { if (window.notificar) notificar("Informe mês e ano.", "aviso"); return; }
        if (vV <= 0 && vR <= 0 && vD <= 0) { if (window.notificar) notificar("Defina ao menos uma meta ou limite.", "aviso"); return; }

        var base = obterBase();
        if (!Array.isArray(base.metas)) base.metas = [];

        if (_editMetaId) {
            var idx = base.metas.findIndex(function (m) { return m.id === _editMetaId; });
            if (idx >= 0) {
                base.metas[idx] = Object.assign(base.metas[idx], { mes: mes, ano: ano, metaVendas: vV, metaResultado: vR, metaMargem: vMg, metaDespesas: vD, metaLimiteFolha: vF, obs: obs });
            }
            _editMetaId = null;
        } else {
            // garante unicidade por ano+mês
            var jaExiste = base.metas.findIndex(function (m) { return m.ano === ano && m.mes === mes; });
            if (jaExiste >= 0) {
                base.metas[jaExiste] = Object.assign(base.metas[jaExiste], { metaVendas: vV, metaResultado: vR, metaMargem: vMg, metaDespesas: vD, metaLimiteFolha: vF, obs: obs });
            } else {
                base.metas.push({ id: gerarId("meta"), mes: mes, ano: ano, metaVendas: vV, metaResultado: vR, metaMargem: vMg, metaDespesas: vD, metaLimiteFolha: vF, obs: obs });
            }
        }
        salvarBase(base);
        fecharModal("modalMeta");
        renderizarDre();
        if (window.notificar) notificar("Meta salva com sucesso!", "sucesso");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAIS
    // ═══════════════════════════════════════════════════════════════════════
    function abrirModal(id) { var m = document.getElementById(id); if (m) m.classList.add("aberto"); }
    function fecharModal(id) { var m = document.getElementById(id); if (m) m.classList.remove("aberto"); }

    function vincularModais() {
        document.querySelectorAll("[data-fechar]").forEach(function (btn) {
            btn.addEventListener("click", function () { fecharModal(btn.dataset.fechar); });
        });
        document.querySelectorAll(".modal-fundo").forEach(function (fundo) {
            fundo.addEventListener("click", function (e) { if (e.target === fundo) fundo.classList.remove("aberto"); });
        });
    }

    function vincularBotoesAbrir() {
        el("btnNovoReceber", function () {
            _editRecId = null;
            limparModal(["recClienteNome", "recDescricao", "recValor", "recVencimento"]);
            definirValor("recVencimento", hojeStr());
            definirTexto("tituloModalReceber", "Novo Recebimento");
            abrirModal("modalReceber");
        });
        el("btnSalvarReceber",    salvarReceber);
        el("btnConfirmarBaixa",   confirmarBaixa);
        el("btnBaixaRec",         baixaSelecioandos);

        el("btnNovaDespesa", function () {
            _editDespId = null;
            limparModal(["despDescricao", "despValor", "despObs"]);
            definirValor("despVencimento", hojeStr());
            definirValor("despRecorrencia", "nao");
            definirTexto("tituloModalDespesa", "Nova Despesa");
            abrirModal("modalDespesa");
        });
        el("btnSalvarDespesa", salvarDespesa);

        el("btnNovoFuncionario", function () {
            _editFuncId = null;
            limparModal(["funcNome", "funcCargo", "funcSalario", "funcObs"]);
            definirValor("funcAdmissao", hojeStr());
            definirValor("funcAtivo", "ativo");
            definirTexto("tituloModalFunc", "Cadastrar Funcionário");
            abrirModal("modalFuncionario");
        });
        el("btnSalvarFuncionario", salvarFuncionario);
        el("btnSalvarDescSal", salvarDescSal);

        // Metas
        el("btnNovaMeta", function () {
            _editMetaId = null;
            var agora = new Date();
            definirTexto("tituloModalMeta", "Nova Meta");
            definirTexto("subtituloModalMeta", "");
            definirValor("metaMes", ("0" + (agora.getMonth() + 1)).slice(-2));
            definirValor("metaAno", String(agora.getFullYear()));
            limparModal(["metaVendas", "metaResultado", "metaMargem", "metaLimiteDespesas", "metaLimiteFolha", "metaObs"]);
            definirValor("metaVendas", "0,00");
            definirValor("metaResultado", "0,00");
            definirValor("metaLimiteDespesas", "0,00");
            definirValor("metaLimiteFolha", "0,00");
            abrirModal("modalMeta");
        });
        el("btnSalvarMeta", salvarMeta);
        el("btnDefinirMetaMes", function () {
            var ano = String(_mesDre.getFullYear());
            var mes = ("0" + (_mesDre.getMonth() + 1)).slice(-2);
            window.abrirModalMetaMes(ano, mes);
        });

        // Navegação meses
        el("btnFluxoAnt",  function () { _mesFluxo = addMes(_mesFluxo, -1); renderizarFluxo(); });
        el("btnFluxoProx", function () { _mesFluxo = addMes(_mesFluxo, 1); renderizarFluxo(); });
        el("btnSalAnt",    function () { _mesSal   = addMes(_mesSal, -1);  renderizarSalarios(); });
        el("btnSalProx",   function () { _mesSal   = addMes(_mesSal, 1);   renderizarSalarios(); });
        el("btnDreAnt",    function () { _mesDre   = addMes(_mesDre, -1);  renderizarDre(); });
        el("btnDreProx",   function () { _mesDre   = addMes(_mesDre, 1);   renderizarDre(); });
    }

    function vincularFiltros() {
        ["filtroStatusReceber", "filtroVencReceber", "buscaReceber"].forEach(function (id) {
            el(id, function () {
                _filtroCardReceber = "";
                if (id === "buscaReceber") _clienteReceberConfirmado = "";
                atualizarCardsReceberAtivos();
                renderizarReceber();
            }, "input");
            el(id, function () {
                _filtroCardReceber = "";
                if (id === "buscaReceber") _clienteReceberConfirmado = "";
                atualizarCardsReceberAtivos();
                renderizarReceber();
            }, "change");
        });
        ["filtroMesDespesas", "filtroCategoriaDespesas", "filtroStatusDespesas", "buscaDespesas"].forEach(function (id) {
            el(id, function () { renderizarDespesas(); }, "input");
            el(id, function () { renderizarDespesas(); }, "change");
        });
        el("buscaSalarios", function () { renderizarSalarios(); }, "input");
        el("filtroFuncHistorico", function () { renderizarHistoricoSalarios(obterBase()); }, "change");

        ["projDataInicio", "projDataFim"].forEach(function (id) {
            el(id, function () { renderizarProjecao(obterBase()); }, "change");
        });
        el("btnLimparProjecao", function () {
            definirValor("projDataInicio", "");
            definirValor("projDataFim", "");
            renderizarProjecao(obterBase());
        });
    }

    // ── helpers ─────────────────────────────────────────────────────────────
    function el(id, fn, evento) {
        var e = document.getElementById(id);
        if (e) e.addEventListener(evento || "click", fn);
    }

    function limparModal(ids) {
        ids.forEach(function (id) { definirValor(id, ""); });
    }

    function hojeStr() {
        var d = new Date();
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }

    function addMes(date, delta) {
        var d = new Date(date.getFullYear(), date.getMonth() + delta, 1);
        return d;
    }

})();
