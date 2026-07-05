// pdv-pagamentos.js
// Formas de pagamento, finalização da venda, troco, PIX (popup + QR Code), parcelamento de crédito loja, resumo de pagamentos.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Inicia o fluxo de finalização da venda atual.
function finalizarVenda(){
    if(!usuarioTemPermissaoSistema("pdvVender")){
        solicitarOuBloquear("pdvVender", "Registrar venda", totalCarrinhoPdvAtual(), "Seu usuário não possui permissão para registrar vendas.");
        return;
    }

    if(itemEmDigitacao){
        alert("Finalize a sequência de quantidade e preço antes de fechar a venda.");
        return;
    }

    if(carrinhoVenda.length === 0){
        abrirFechamentoCaixa();
        return;
    }

    reiniciarFluxoFinalizacao();
    atualizarTotaisFinalizacao();
    abrirModalPdv("modalFinalizarPdv");
}

// Confirma a finalização da venda: valida, grava e dispara impressão/NFC-e.
async function confirmarFinalizacaoVenda(){
    if(carrinhoVenda.length === 0){
        alert("Nenhum produto na venda.");
        fecharModaisPdv();
        return;
    }

    const totais = calcularTotaisFinalizacao();
    const documento = valorOpcaoAtiva("tipoDocumentoVenda");
    const pagamento = valorOpcaoAtiva("formaPagamentoVenda");
    const configuracoes = obterConfiguracoesSistema();

    if(!documento){
        alert("Escolha NFC-e ou Pedido.");
        return;
    }

    if(documento === "NFC-e" && configuracoes.emitirNfce === false){
        alert("A emissão NFC-e está desativada nas configurações do sistema.");
        return;
    }

    if(!validarLimitesClienteConfiguradosPdv(totais.total, configuracoes)){
        return;
    }

    if(documento === "NFC-e"){
        const validacaoFiscal = validarProdutosPermitidosNfce();

        if(!validacaoFiscal.ok){
            alert(validacaoFiscal.mensagem);
            return;
        }
    }

    if(!pagamento && pagamentosFinalizacao.length === 0){
        alert("Escolha a forma de pagamento.");
        return;
    }

    if(configuracoes.pdvPagamentoParcialAtivado === false && pagamentosFinalizacao.length > 1){
        alert("Pagamento parcial esta desativado nas configuracoes do Caixa PDV.");
        return;
    }

    const botaoPagamento = botaoPagamentoSelecionado();
    if(pagamentoPixExigeConfirmacao(botaoPagamento) && !pagamentoPixManualConfirmado){
        abrirPopupPixPagamento(botaoPagamento);
        return;
    }

    const base = obterBase();
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const dadosPagamentoVenda = prepararPagamentosVenda(totais);
    if(!dadosPagamentoVenda.ok){
        alert(dadosPagamentoVenda.mensagem);
        return;
    }
    const pagamentoCreditoLoja = dadosPagamentoVenda.valorCreditoLoja > 0;
    const validacaoEstoque = validarEstoqueCarrinho(base);

    if(!validacaoEstoque.ok){
        alert(validacaoEstoque.mensagem);
        return;
    }

    if(pagamentoCreditoLoja){
        if(!_creditoLojaParcelamentoConfirmado){
            // Ainda não passou pelo fluxo de cliente + parcelas
            if(!clienteVenda?.id){
                _creditoLojaFluxoPendente = true;
                fecharModaisPdv();
                informarCliente();
                return;
            }
            const validacaoCredito = validarCreditoLoja(base, dadosPagamentoVenda.valorCreditoLoja);
            if(!validacaoCredito.ok){ alert(validacaoCredito.mensagem); return; }
            fecharModaisPdv();
            abrirModalParcelasCreditoLoja(dadosPagamentoVenda.valorCreditoLoja);
            return;
        }
        // Parcelamento já confirmado — continua normalmente
    }

    const ehNfce = documento === "NFC-e";
    const configFiscal = ehNfce ? obterConfiguracoesSistema() : null;
    const serieNfce = ehNfce ? (configFiscal.fiscalSerieNfce || "1") : null;
    const numeroNfce = ehNfce ? Number(configFiscal.fiscalProximoNfce || 1) : null;
    const vendedorVenda = vendedorPdvAtual || {
        login: usuario.login || "ADM",
        nome: usuario.nome || usuario.login || "Administrador"
    };

    const venda = {
        id: gerarId("ven"),
        data: new Date().toISOString(),
        cliente: clienteVenda,
        documento,
        pagamento: dadosPagamentoVenda.pagamento || pagamento,
        pagamentos: dadosPagamentoVenda.pagamentos,
        subtotal: totais.subtotal,
        desconto: totais.desconto,
        ajusteFormaPagamento: totais.ajusteFormaPagamento || 0,
        ajustePercFormaPagamento: totais.ajustePercFormaPagamento || 0,
        valorRecebido: dadosPagamentoVenda.valorRecebido,
        troco: dadosPagamentoVenda.troco,
        valorCreditoLoja: dadosPagamentoVenda.valorCreditoLoja,
        itens: carrinhoVenda.map(function(item) {
            return {
                ...item,
                total: item.qtd * item.precoUnitario,
                tabelaNome: (item.tabelaAplicadaId && !item.tabelaDesativadaManualmente)
                    ? (obterNomeTabela(item.tabelaAplicadaId) || null)
                    : null
            };
        }),
        total: totais.total,
        usuarioLogin: usuario.login || "ADM",
        usuarioNome: usuario.nome || "Administrador",
        vendedorLogin: vendedorVenda.login,
        vendedorNome: vendedorVenda.nome,
        // Campos fiscais NFC-e
        nfceSerie: serieNfce,
        nfceNumero: numeroNfce,
        nfceAmbiente: ehNfce ? (configFiscal.fiscalAmbiente || "homologacao") : null,
        nfceStatus: ehNfce ? "pendente" : null,
        nfceChaveAcesso: null,
        nfceQrCode: null,
        nfceProtocolo: null,
        entrega: entregaVendaPendente ? { ...entregaVendaPendente } : null,
        sessaoId: sessaoCaixaAtual?.id || null,
        pedidoOrigemId: pedidoImportadoAtual?.id || null
    };

    if(pagamentoCreditoLoja){
        registrarContaReceberCreditoLoja(base, venda, _creditoLojaParcelamentoConfirmado);
        _creditoLojaParcelamentoConfirmado = null;
    }

    base.vendas.push(venda);
    if(pedidoImportadoAtual){
        const idxPedido = (base.pedidosVenda || []).findIndex(function(p){ return p.id === pedidoImportadoAtual.id; });
        if(idxPedido >= 0){
            const pedido = base.pedidosVenda[idxPedido];
            const statusAnterior = pedido.status;
            if(pedido.reservaEstoque?.ativa){
                (pedido.reservaEstoque.itens || []).forEach(function(ri){
                    const idxProd = base.mercadorias.findIndex(function(m){ return m.id === ri.produtoId; });
                    if(idxProd >= 0) base.mercadorias[idxProd].estoqueReservado = Math.max(0, numero(base.mercadorias[idxProd].estoqueReservado) - numero(ri.quantidade));
                });
                pedido.reservaEstoque.ativa = false;
            }
            pedido.status = "FINALIZADO";
            pedido.atualizadoEm = new Date().toISOString();
            pedido.vendaId = venda.id;
            pedido.chaveNfce = venda.nfceChaveAcesso;
            pedido.numeroCaixa = venda.sessaoId;
            pedido.operador = venda.usuarioNome;
            pedido.historico = pedido.historico || [];
            pedido.historico.unshift({
                data: new Date().toISOString(),
                usuarioLogin: usuario.login || "",
                usuarioNome: usuario.nome || usuario.login || "Sistema",
                dispositivo: navigator.userAgent || "",
                alteracao: "Importado no Caixa PDV e venda finalizada",
                valorAnterior: statusAnterior,
                valorNovo: "FINALIZADO"
            });
        }
    }
    if(venda.entrega){
        base.entregas.push({
            id: gerarId("ent"),
            vendaId: venda.id,
            cliente: venda.entrega.destinatario || venda.cliente?.nome || "Consumidor",
            valor: numero(venda.total),
            endereco: formatarEnderecoEntregaPdv(venda.entrega),
            observacoes: venda.entrega.observacoes || "",
            status: "pendente",
            data: new Date().toISOString()
        });
    }
    registrarEventoCaixaNaBase(base, "Venda finalizada", `${venda.documento} ${venda.id} | ${venda.usuarioNome} | ${formatarMoedaRS(venda.total)}`, {
        vendaId: venda.id,
        operador: venda.usuarioNome,
        cliente: venda.cliente?.nome || "Consumidor",
        total: venda.total,
        pagamento: venda.pagamento,
        produtos: venda.itens
    });
    baixarEstoque(base, carrinhoVenda);
    salvarBase(base);
    chamarPdvApi("registrarVenda", [venda]);

    if(configuracoes.pdvControleImpressao === true){
        const deveImprimir = await confirmarImpressaoVenda();
        if(deveImprimir) imprimirVenda80mm(venda);
    }else{
        imprimirVenda80mm(venda);
    }

    if(venda.entrega){
        imprimirComprovanteEntrega80mm(venda);
    }

    if(ehNfce){
        emitirNfceViaWebservice(venda.id, venda, configFiscal);
    }

    carrinhoVenda = [];
    pedidoImportadoAtual = null;
    clienteVenda = null;
    itensCanceladosVenda = 0;
    pagamentoPixManualConfirmado = false;
    pagamentosFinalizacao = [];
    entregaVendaPendente = null;
    resetarVendedorAposFim();
    fecharModaisPdv();
    carregarSugestoesProdutos();
    atualizarTela();
    prepararCampoProduto();
}

// Verifica se um pagamento é do tipo crédito loja.
function ehPagamentoCreditoLoja(pagamento){
    const texto = normalizar(pagamento);
    return texto.includes("loja") && texto.includes("cr");
}

// Ativa/desativa a opção de entrega na finalização.
function alternarEntregaFinalizacaoPdv(){
    const marcado = document.getElementById("checkEntregaVendaPdv")?.checked === true;

    if(marcado){
        entregaFluxoFinalizacaoAtivo = true;
        abrirEntregaVendaAtualPdv();
        return;
    }

    entregaFluxoFinalizacaoAtivo = false;
    entregaVendaPendente = null;
    atualizarResumoEntregaFinalizacaoPdv();
}

// Ativa/desativa a vinculação de cliente na finalização.
function alternarClienteFinalizacaoPdv(){
    const marcado = document.getElementById("checkClienteVendaPdv")?.checked === true;

    if(marcado){
        informarCliente();
        return;
    }

    clienteVenda = null;
    recalcularPrecosTabelaCarrinho();
    atualizarResumoVenda();
    atualizarResumoClienteFinalizacaoPdv();
}

// Atualiza o resumo de entrega mostrado na finalização.
function atualizarResumoEntregaFinalizacaoPdv(){
    const resumo = document.getElementById("resumoEntregaFinalizacaoPdv");
    const check = document.getElementById("checkEntregaVendaPdv");

    if(check) check.checked = Boolean(entregaVendaPendente);
    if(!resumo) return;

    resumo.textContent = entregaVendaPendente ? formatarEnderecoEntregaPdv(entregaVendaPendente) : "";
}

// Atualiza o resumo de cliente mostrado na finalização.
function atualizarResumoClienteFinalizacaoPdv(){
    const resumo = document.getElementById("resumoClienteFinalizacaoPdv");
    const check = document.getElementById("checkClienteVendaPdv");
    const vinculado = Boolean(clienteVenda?.id || clienteVenda?.cpf);

    if(check) check.checked = vinculado;
    if(!resumo) return;

    resumo.textContent = vinculado ? [clienteVenda.nome, clienteVenda.cpf].filter(Boolean).join(" - ") : "";
}

// Abre o modal de parcelamento do crédito loja.
function abrirModalParcelasCreditoLoja(totalVenda){
    _totalParcelamentoCreditoLoja = totalVenda;
    const cfg = obterConfiguracoesSistema();
    const maxParcelas = cfg.financeiroMaxParcelasCreditoLoja || 12;
    const el = document.getElementById("numeroParcelas");
    if(el){
        el.max = maxParcelas;
        el.value = "1";
    }

    const resumo = document.getElementById("parcelasClienteResumo");
    if(resumo){
        resumo.innerHTML = `
            <div class="parcelas-info-cliente">
                <strong>${escapar(clienteVenda?.nome || "Cliente")}</strong>
                <span>Total da venda: <strong>${formatarMoedaRS(totalVenda)}</strong></span>
            </div>`;
    }

    atualizarParcelasCreditoLoja();
    abrirModalPdv("modalParcelasCreditoLoja");
}

// Atualiza a lista de parcelas exibidas no modal.
function atualizarParcelasCreditoLoja(){
    const cfg = obterConfiguracoesSistema();
    const diasEntre = cfg.financeiroDiasEntreParcelasCreditoLoja || 30;
    const n = Math.max(1, parseInt(document.getElementById("numeroParcelas")?.value || "1", 10));
    const total = _totalParcelamentoCreditoLoja;
    const valorParcela = total / n;
    const lista = document.getElementById("parcelasLista");
    if(!lista) return;
    const base = new Date();
    let html = '<div class="parcelas-grid-header"><span>Parcela</span><span>Vencimento</span><span>Valor</span></div>';
    for(let i = 0; i < n; i++){
        const d = new Date(base);
        d.setDate(d.getDate() + diasEntre * (i + 1));
        const iso = d.toISOString().slice(0, 10);
        html += `<div class="parcela-linha">
            <span>${i + 1}/${n}</span>
            <input type="date" class="parcela-data" data-parcela="${i}" value="${iso}">
            <span>${formatarMoedaRS(valorParcela)}</span>
        </div>`;
    }
    lista.innerHTML = html;
}

// Confirma o parcelamento definido para o crédito loja.
function confirmarParcelasCreditoLoja(){
    const n = Math.max(1, parseInt(document.getElementById("numeroParcelas")?.value || "1", 10));
    const total = _totalParcelamentoCreditoLoja;
    const valorParcela = total / n;
    const inputs = document.querySelectorAll(".parcela-data");
    const parcelas = [];
    let valido = true;
    inputs.forEach(function(inp, i){
        if(!inp.value){ valido = false; return; }
        parcelas.push({
            vencimento: inp.value + "T23:59:59.000Z",
            valor: valorParcela
        });
    });
    if(!valido || parcelas.length !== n){
        if(window.notificar) notificar("Preencha todas as datas de vencimento.", "aviso");
        return;
    }
    _creditoLojaParcelamentoConfirmado = { parcelas };
    fecharModaisPdv();
    confirmarFinalizacaoVenda();
}

// Calcula subtotal, desconto e total para a tela de finalização.
function calcularTotaisFinalizacao(){
    const subtotal = calcularTotalVenda();

    let desconto = 0;
    if(descontoPermitido()){
        const tipo = document.getElementById("tipoDescontoVenda")?.value || "valor";
        const valorInformado = limitarDescontoConfiguradoPdv(tipo, numeroDigitado(document.getElementById("valorDescontoVenda")?.value || ""), subtotal);
        const descontoCalculado = tipo === "percentual" ? subtotal * valorInformado / 100 : valorInformado;
        desconto = Math.min(subtotal, descontoCalculado);
    }

    // Ajuste por tabela "Por Forma de Pagamento"
    const btnPag = botaoPagamentoSelecionado();
    const fpId   = btnPag ? (btnPag.dataset.id || "") : "";
    const ajustePerc  = obterAjusteFormaPagamentoPdv(fpId);
    const baseAjuste  = Math.max(0, subtotal - desconto);
    // negativo = desconto; positivo = acréscimo
    const ajusteValor = ajustePerc !== 0 ? baseAjuste * ajustePerc / 100 : 0;

    return {
        subtotal,
        desconto,
        ajusteFormaPagamento: ajusteValor,
        ajustePercFormaPagamento: ajustePerc,
        total: Math.max(0, baseAjuste + ajusteValor)
    };
}

// Renderiza as tabelas de preço aplicadas na finalização.
function renderizarTabelasFinalizacao() {
    const grupo = document.getElementById("grupoTabelasFinalizacao");
    const lista = document.getElementById("listaTabelasFinalizacao");
    if (!grupo || !lista) return;

    var itensCom = carrinhoVenda.filter(function(item) {
        return item.tabelaAplicadaId && !item.porQuantidade;
    });

    if (itensCom.length === 0) {
        grupo.style.display = "none";
        return;
    }

    lista.innerHTML = itensCom.map(function(item) {
        var nomeTab = obterNomeTabela(item.tabelaAplicadaId);
        var ativa = !item.tabelaDesativadaManualmente;
        return `<label class="item-tabela-fin">` +
            `<input type="checkbox" ${ativa ? "checked" : ""} data-linha-fin="${escapar(item.linhaId)}">` +
            `<span>${escapar(item.descricao)} — Tabela: ${escapar(nomeTab)}</span>` +
            `</label>`;
    }).join("");

    lista.querySelectorAll("input[type=checkbox]").forEach(function(cb) {
        cb.addEventListener("change", function() {
            var cartItem = carrinhoVenda.find(function(i) { return i.linhaId === cb.dataset.linhaFin; });
            if (!cartItem) return;

            if (cb.checked) {
                cartItem.tabelaDesativadaManualmente = false;
                var base = obterBase();
                var prod = (base.mercadorias || []).find(function(m) { return m.id === cartItem.id; });
                if (prod) {
                    var precoTab = precoTabelaAtiva(prod, cartItem.tabelaAplicadaId, cartItem.qtd);
                    if (precoTab > 0) cartItem.precoUnitario = precoTab;
                }
            } else {
                cartItem.tabelaDesativadaManualmente = true;
                cartItem.precoUnitario = cartItem.precoOriginal;
            }

            atualizarTela();
            atualizarTotaisFinalizacao();
        });
    });

    grupo.style.display = "";
}

// Atualiza os totais exibidos na finalização.
function atualizarTotaisFinalizacao(){
    renderizarTabelasFinalizacao();
    const totais = calcularTotaisFinalizacao();
    const totalItens = carrinhoVenda.reduce(function(acc, item) {
        return acc + numero(item.qtd || item.quantidade || 1);
    }, 0);
    definirTexto("subtotalFinalizacao", formatarMoedaRS(totais.subtotal));
    definirTexto("descontoFinalizacao", formatarMoedaRS(totais.desconto));
    definirTexto("totalFinalizacao", formatarMoedaRS(totais.total));
    definirTexto("itensFinalizacao", totalItens === 1 ? "1 item" : `${formatarDecimalCampo(String(totalItens).replace(".", ","))} itens`);
    atualizarResumoRecebimentoFinalizacao(totais);

    const grupoAjuste = document.getElementById("grupoAjustePagamentoFin");
    if(grupoAjuste){
        const ajuste     = totais.ajusteFormaPagamento || 0;
        const ajustePerc = totais.ajustePercFormaPagamento || 0;
        if(ajustePerc !== 0){
            const isDesconto = ajustePerc < 0;
            const percAbs    = Math.abs(ajustePerc);
            const label = document.getElementById("labelAjustePagamentoFin");
            const valor  = document.getElementById("ajustePagamentoFin");
            if(label) label.textContent = isDesconto
                ? `Desconto pagamento (${percAbs}%)`
                : `Acréscimo pagamento (${percAbs}%)`;
            if(valor){
                valor.textContent = formatarMoedaRS(Math.abs(ajuste));
                valor.style.color = isDesconto ? "var(--c-success)" : "var(--c-warn)";
            }
            grupoAjuste.style.display = "";
        } else {
            grupoAjuste.style.display = "none";
        }
    }
}

// Verifica se o botão de pagamento selecionado é dinheiro.
function ehPagamentoDinheiro(botao){
    if(!botao) return false;
    return botao.dataset.tipo === "dinheiro"
        || (botao.dataset.valor || "").toLowerCase() === "dinheiro";
}

// Verifica se o botão de pagamento selecionado é crédito loja.
function ehPagamentoCreditoLojaBotao(botao){
    if(!botao) return false;
    return botao.dataset.tipo === "credito_loja" || ehPagamentoCreditoLoja(botao.dataset.valor || "");
}

// Calcula o valor ainda pendente de pagamento.
function obterPendenteFinalizacao(totais){
    const total = totais?.total ?? calcularTotaisFinalizacao().total;
    const recebido = pagamentosFinalizacao.reduce(function(acc, item) {
        return acc + numero(item.valorRecebido);
    }, 0);

    return Math.max(0, total - recebido);
}

// Marca visualmente a forma de pagamento selecionada.
function atualizarFormaRecebimentoSelecionada(){
    const botao = botaoPagamentoSelecionado();
    definirTexto("formaRecebimentoSelecionadaPdv", botao?.dataset.valor || "Selecione uma forma");
}

// Sugere automaticamente o valor recebido pendente.
function sugerirValorRecebidoPendente(){
    const input = document.getElementById("valorRecebidoPdv");
    if(!input) return;

    const pendente = obterPendenteFinalizacao();
    input.value = pendente > 0 ? formatarDecimalCampo(String(pendente.toFixed(2)).replace(".", ",")) : "";
}

// Abre o popup para informar o valor recebido.
function abrirPopupRecebimentoFinalizacao(){
    const grupoTroco = document.getElementById("grupoTrocoPdv");
    if(!grupoTroco) return;

    const modalFinalizacao = document.getElementById("modalFinalizarPdv");
    if(modalFinalizacao && grupoTroco.parentElement !== modalFinalizacao){
        modalFinalizacao.appendChild(grupoTroco);
    }

    grupoTroco.classList.remove("oculto");
    grupoTroco.classList.add("fin-recebimento-popup");
    atualizarFormaRecebimentoSelecionada();
    sugerirValorRecebidoPendente();
    atualizarTroco();

    setTimeout(function(){
        const input = document.getElementById("valorRecebidoPdv");
        input?.focus();
        input?.select();
    }, 60);
}

// Fecha o popup de valor recebido.
function fecharPopupRecebimentoFinalizacao(){
    const grupoTroco = document.getElementById("grupoTrocoPdv");
    if(!grupoTroco) return;

    grupoTroco.classList.add("oculto");
    grupoTroco.classList.remove("fin-recebimento-popup");
}

// Atualiza o resumo de subtotal/recebido/pendente/troco.
function atualizarResumoRecebimentoFinalizacao(totais){
    const total = totais?.total ?? calcularTotaisFinalizacao().total;
    const recebido = pagamentosFinalizacao.reduce(function(acc, item) {
        return acc + numero(item.valorRecebido);
    }, 0);
    const pendente = Math.max(0, total - recebido);

    definirTexto("resumoSubtotalFinalizacao", formatarMoedaRS(totais?.subtotal ?? calcularTotalVenda()));
    definirTexto("resumoRecebidoFinalizacao", formatarMoedaRS(Math.min(recebido, total)));
    definirTexto("resumoPendenteFinalizacao", formatarMoedaRS(pendente));
    definirTexto("resumoTotalPagamentoFinalizacao", formatarMoedaRS(total));
    document.getElementById("resumoPagamentosFinalizacao")?.classList.remove("oculto");
    atualizarBotaoConfirmarFinalizacao();
}

// Habilita o botão de confirmar quando o pagamento está completo.
function atualizarBotaoConfirmarFinalizacao(){
    const botao = document.getElementById("btnConfirmarVenda");
    if(!botao) return;

    const pendente = obterPendenteFinalizacao();
    const podeFinalizar = pagamentosFinalizacao.length > 0 && pendente <= 0.0001;
    botao.classList.toggle("oculto", !podeFinalizar);
}

// Renderiza a lista de pagamentos já adicionados.
function renderizarPagamentosFinalizacao(){
    const lista = document.getElementById("listaPagamentosFinalizacao");
    const grupo = document.getElementById("grupoPagamentosAdicionadosPdv");
    const contador = document.getElementById("contadorPagamentosFinalizacao");
    const totais = calcularTotaisFinalizacao();

    if(contador) contador.textContent = pagamentosFinalizacao.length + " forma(s)";
    if(grupo) grupo.classList.remove("oculto");
    if(!lista) return;

    if(pagamentosFinalizacao.length === 0){
        lista.innerHTML = '<div class="fin-pagamento-vazio">Nenhum pagamento adicionado.</div>';
    } else {
        lista.innerHTML = pagamentosFinalizacao.map(function(item, indice) {
            return `
                <div class="fin-pagamento-item">
                    <span>${escapar(item.forma)}</span>
                    <strong>${formatarMoedaRS(item.valorRecebido)}</strong>
                    <button type="button" onclick="removerPagamentoFinalizacao(${indice})">×</button>
                </div>
            `;
        }).join("");
    }

    atualizarResumoRecebimentoFinalizacao(totais);
    atualizarMarcacaoFormasPagamentoFinalizacao();
    atualizarTroco();
    atualizarBotaoConfirmarFinalizacao();
}

// Marca as formas de pagamento já utilizadas.
function atualizarMarcacaoFormasPagamentoFinalizacao(){
    const adicionadas = new Set(pagamentosFinalizacao.map(function(item){
        return item.id ? "id:" + item.id : "forma:" + item.forma;
    }));
    const pendente = obterPendenteFinalizacao();
    const completo = pendente <= 0.0001;

    document.querySelectorAll("#formaPagamentoVenda .opcao-finalizacao").forEach(function(botao){
        const chave = botao.dataset.id ? "id:" + botao.dataset.id : "forma:" + (botao.dataset.valor || "");
        botao.classList.toggle("pagamento-adicionado", adicionadas.has(chave));
        botao.disabled = completo;
        botao.classList.toggle("desabilitado", completo);
        if(completo) botao.classList.remove("ativo");
    });

    const input = document.getElementById("valorRecebidoPdv");
    const add = document.getElementById("btnAdicionarPagamentoFinalizacao");
    if(input) input.disabled = completo;
    if(add) add.disabled = completo;
}

// Adiciona um novo pagamento à finalização.
function adicionarPagamentoFinalizacao(){
    const botao = botaoPagamentoSelecionado();
    const input = document.getElementById("valorRecebidoPdv");

    if(!botao){
        alert("Escolha a forma de pagamento.");
        return;
    }

    const valorRecebido = numeroDigitado(input?.value || "");
    if(valorRecebido <= 0){
        alert("Informe o valor recebido.");
        input?.focus();
        return;
    }

    const pendente = obterPendenteFinalizacao();
    if(pendente <= 0.0001){
        alert("O total da venda ja foi preenchido.");
        return;
    }

    if(valorRecebido > pendente + 0.0001 && !ehPagamentoDinheiro(botao)){
        alert("O valor informado ultrapassa o pendente. Ajuste o valor ou use dinheiro para troco.");
        input?.focus();
        return;
    }

    pagamentosFinalizacao.push({
        id: botao.dataset.id || "",
        forma: botao.dataset.valor || "Pagamento",
        tipo: botao.dataset.tipo || "",
        valorRecebido,
        dinheiro: ehPagamentoDinheiro(botao),
        creditoLoja: ehPagamentoCreditoLojaBotao(botao)
    });

    if(input) input.value = "";
    renderizarPagamentosFinalizacao();
    sugerirValorRecebidoPendente();
    fecharPopupRecebimentoFinalizacao();
}

// Confirma a finalização via tecla Enter.
function executarEnterFinalizacaoVendaPdv(){
    const modalAberto = document.getElementById("modalFinalizarPdv")?.classList.contains("aberto");
    if(!modalAberto) return;

    const pendente = obterPendenteFinalizacao();
    const botao = botaoPagamentoSelecionado();
    const input = document.getElementById("valorRecebidoPdv");
    const valorInformado = numeroDigitado(input?.value || "");

    if(pendente <= 0.0001){
        confirmarFinalizacaoVenda();
        return;
    }

    if(botao && valorInformado <= 0){
        sugerirValorRecebidoPendente();
        input?.focus();
        input?.select();
        return;
    }

    if(botao){
        adicionarPagamentoFinalizacao();
        if(obterPendenteFinalizacao() <= 0.0001){
            document.getElementById("btnConfirmarVenda")?.focus();
        }
        return;
    }

    alert("Escolha a forma de pagamento.");
}

// Remove um pagamento adicionado.
function removerPagamentoFinalizacao(indice){
    pagamentosFinalizacao.splice(indice, 1);
    renderizarPagamentosFinalizacao();
    sugerirValorRecebidoPendente();
    atualizarBotaoConfirmarFinalizacao();
}

// Normaliza os pagamentos antes de gravar a venda.
function prepararPagamentosVenda(totais){
    let lista = pagamentosFinalizacao.slice();

    if(lista.length === 0){
        return {
            ok: false,
            mensagem: "Informe e adicione o pagamento antes de finalizar."
        };
    }

    const recebido = lista.reduce(function(acc, item) {
        return acc + numero(item.valorRecebido);
    }, 0);

    if(recebido + 0.0001 < totais.total){
        return {
            ok: false,
            mensagem: "Selecione uma nova forma de pagamento para completar o valor da venda."
        };
    }

    let excedente = Math.max(0, recebido - totais.total);
    if(excedente > 0 && !lista.some(function(item) { return item.dinheiro; })){
        return {
            ok: false,
            mensagem: "O valor recebido está maior que o total. Ajuste o pagamento ou use dinheiro para troco."
        };
    }

    const pagamentos = lista.map(function(item) {
        return {
            id: item.id,
            forma: item.forma,
            tipo: item.tipo,
            valorRecebido: numero(item.valorRecebido),
            valor: numero(item.valorRecebido),
            troco: 0
        };
    });

    for(let i = pagamentos.length - 1; i >= 0 && excedente > 0; i--){
        if(!lista[i].dinheiro) continue;
        const abatimento = Math.min(excedente, pagamentos[i].valor);
        pagamentos[i].valor -= abatimento;
        pagamentos[i].troco += abatimento;
        excedente -= abatimento;
    }

    return {
        ok: true,
        pagamentos: pagamentos.filter(function(item) { return item.valor > 0; }),
        valorRecebido: recebido,
        troco: Math.max(0, recebido - totais.total),
        pagamento: pagamentos.filter(function(item) { return item.valor > 0; }).map(function(item) { return item.forma; }).join(" + "),
        valorCreditoLoja: pagamentos.reduce(function(acc, item) {
            return acc + (item.tipo === "credito_loja" || ehPagamentoCreditoLoja(item.forma) ? numero(item.valor) : 0);
        }, 0)
    };
}

// Calcula e exibe o troco em dinheiro.
function atualizarTroco(){
    const totais = calcularTotaisFinalizacao();
    const input   = document.getElementById("valorRecebidoPdv");
    const elTroco = document.getElementById("valorTrocoPdv");
    const display = document.getElementById("trocoDisplay");
    if(!input || !elTroco || !display) return;

    const jaRecebido = pagamentosFinalizacao.reduce(function(acc, item) {
        return acc + numero(item.valorRecebido);
    }, 0);
    const recebido = jaRecebido + numeroDigitado(input.value || "");
    const troco = recebido > 0 ? Math.max(0, recebido - totais.total) : 0;
    elTroco.textContent = formatarMoedaRS(troco);

    if(troco > 0){
        display.classList.add("positivo");
    } else {
        display.classList.remove("positivo");
    }
}

// Bloqueia/libera campos da finalização durante o processamento.
function aplicarProtecaoCaixaFinalizacaoPdv(ativo){
    document.querySelectorAll("body > .header, body > .container").forEach(function(elemento) {
        if(ativo){
            elemento.setAttribute("inert", "");
        }else{
            elemento.removeAttribute("inert");
        }
    });

    if(ativo && document.activeElement && !document.activeElement.closest?.("#modalFinalizarPdv")){
        document.activeElement.blur();
    }
}

// Retorna o valor da opção marcada como ativa.
function valorOpcaoAtiva(id){
    return document.querySelector(`#${id} .opcao-finalizacao.ativo`)?.dataset.valor || "";
}

// Renderiza os botões de forma de pagamento cadastrados.
function renderizarFormasPagamentoPdv(){
    const destino = document.getElementById("formaPagamentoVenda");
    if(!destino || !window.FormasPagamentoSistema) return;

    const formas = window.FormasPagamentoSistema.ativasPara("pdv");
    destino.dataset.totalFormas = String(formas.length);
    destino.classList.toggle("fin-pagamentos-muitos", formas.length > 6);
    destino.classList.toggle("fin-pagamentos-compacto", formas.length > 8);
    destino.innerHTML = formas.map(function(forma) {
        const atalho = forma.atalho || "";
        return `
            <button
                type="button"
                class="opcao-finalizacao"
                data-id="${escapar(forma.id)}"
                data-valor="${escapar(forma.descricao)}"
                data-tipo="${escapar(forma.tipo || "")}"
                data-atalho="${atalho}"
                data-usar-qr-pix="${forma.usarQrPix === true ? "true" : "false"}"
                data-chave-pix="${escapar(forma.chavePix || "")}">
                <span class="pgto-label">${escapar(rotuloFormaPagamentoPdv(forma))}</span>
                ${atalho ? `<span class="pgto-fkey">${atalho}</span>` : ""}
            </button>
        `;
    }).join("");
}

// Verifica se o modal de finalização está aberto.
function modalFinalizacaoAbertoPdv(){
    return document.getElementById("modalFinalizarPdv")?.classList.contains("aberto") === true;
}

// Verifica se o popup de confirmação de impressão está aberto.
function controleImpressaoVendaAbertoPdv(){
    return document.getElementById("confirmacaoImpressaoVenda")?.classList.contains("ativo") === true;
}

// Verifica se o popup de valor recebido está aberto.
function popupRecebimentoFinalizacaoAberto(){
    const popup = document.getElementById("grupoTrocoPdv");
    return Boolean(popup && popup.classList.contains("fin-recebimento-popup") && !popup.classList.contains("oculto"));
}

// Identifica a qual submodal da finalização um elemento pertence.
function alvoSubmodalFinalizacaoPdv(alvo){
    return Boolean(alvo?.closest?.(".modal-pdv.aberto:not(#modalFinalizarPdv), #popupPixPagamento:not(.oculto), #confirmacaoImpressaoVenda.ativo"));
}

// Retorna o rótulo de exibição de uma forma de pagamento.
function rotuloFormaPagamentoPdv(forma){
    const mapa = {
        cartao_credito: "Credito",
        cartao_debito: "Debito",
        credito_loja: "Credito loja",
        pix: "PIX",
        dinheiro: "Dinheiro"
    };

    const rotulo = mapa[forma.tipo] || forma.descricao;

    if(["cartao_credito", "cartao_debito"].includes(forma.tipo) && forma.usarIntegracaoCartao === true){
        return `${rotulo} ${String(forma.integracaoCartao || "pos").toUpperCase()}`;
    }

    return rotulo;
}

// Limpa o fluxo de finalização após concluir/cancelar a venda.
function reiniciarFluxoFinalizacao(){
    document.querySelectorAll("#tipoDocumentoVenda .opcao-finalizacao, #formaPagamentoVenda .opcao-finalizacao").forEach(function(botao) {
        botao.classList.remove("ativo", "pagamento-adicionado");
        botao.disabled = false;
        botao.classList.remove("desabilitado");
    });
    aplicarTipoDescontoPadraoPdv();
    document.getElementById("valorDescontoVenda").value = "";
    document.getElementById("grupoDescontoVenda")?.classList.add("oculto");
    document.getElementById("grupoPagamentoVenda")?.classList.add("oculto");
    document.getElementById("grupoTrocoPdv")?.classList.add("oculto");
    document.getElementById("grupoPagamentosAdicionadosPdv")?.classList.add("oculto");
    document.getElementById("resumoPagamentosFinalizacao")?.classList.add("oculto");
    pagamentosFinalizacao = [];
    const inputTrocoReset = document.getElementById("valorRecebidoPdv");
    if(inputTrocoReset){
        inputTrocoReset.value = "";
        inputTrocoReset.disabled = false;
    }
    const addPagamentoReset = document.getElementById("btnAdicionarPagamentoFinalizacao");
    if(addPagamentoReset) addPagamentoReset.disabled = false;
    const elTrocoReset = document.getElementById("valorTrocoPdv");
    if(elTrocoReset) elTrocoReset.textContent = "R$ 0,00";
    document.getElementById("trocoDisplay")?.classList.remove("positivo");
    const grupoAjuste = document.getElementById("grupoAjustePagamentoFin");
    if(grupoAjuste) grupoAjuste.style.display = "none";
    fecharPopupRecebimentoFinalizacao();
    entregaFluxoFinalizacaoAtivo = false;
    const checkEntrega = document.getElementById("checkEntregaVendaPdv");
    if(checkEntrega) checkEntrega.checked = Boolean(entregaVendaPendente);
    atualizarResumoEntregaFinalizacaoPdv();
    atualizarResumoClienteFinalizacaoPdv();
    fecharPopupPixPagamento();
    pagamentoPixManualConfirmado = false;
    document.getElementById("btnConfirmarVenda")?.classList.add("oculto");
    aplicarConfiguracoesFinalizacaoPdv();
    renderizarPagamentosFinalizacao();
}

// Retorna o botão de forma de pagamento atualmente selecionado.
function botaoPagamentoSelecionado(){
    return document.querySelector("#formaPagamentoVenda .opcao-finalizacao.ativo");
}

// Verifica se o pagamento PIX exige confirmação manual.
function pagamentoPixExigeConfirmacao(botao){
    return botao?.dataset.tipo === "pix"
        && botao?.dataset.usarQrPix === "true"
        && Boolean(botao?.dataset.chavePix?.trim());
}

// Abre o popup do PIX quando necessário.
function abrirPopupPixSeNecessario(botao){
    if(!pagamentoPixExigeConfirmacao(botao)){
        fecharPopupPixPagamento();
        return false;
    }

    abrirPopupPixPagamento(botao);
    return true;
}

// Abre o popup de pagamento PIX com o QR Code.
function abrirPopupPixPagamento(botao){
    const popup = document.getElementById("popupPixPagamento");
    const qr = document.getElementById("popupPixQrCode");
    const chave = botao?.dataset.chavePix?.trim() || "";
    const totais = calcularTotaisFinalizacao();
    const pendente = obterPendenteFinalizacao(totais);
    const empresa = obterEmpresaPdv();

    if(!popup || !qr || !chave) return;
    if(pendente <= 0.0001) return;

    definirTexto("popupPixEmpresaNome", empresa.nomeFantasia || empresa.razaoSocial || "Empresa");
    definirTexto("popupPixEmpresaCnpj", empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "CNPJ não informado");
    definirTexto("popupPixEmpresaEndereco", formatarEnderecoEmpresaPdv(empresa));
    definirTexto("popupPixValor", formatarMoedaRS(pendente));
    const payloadPix = gerarPayloadPixPdv(chave, pendente, empresa);
    definirTexto("popupPixChave", `Chave PIX: ${chave}`);
    qr.innerHTML = gerarQrCodeSvgPix(payloadPix, 320);

    popup.classList.remove("oculto");
    popup.setAttribute("aria-hidden", "false");
    document.getElementById("btnConfirmarPixPagamento")?.focus();
}

// Fecha o popup de pagamento PIX.
function fecharPopupPixPagamento(){
    const popup = document.getElementById("popupPixPagamento");
    if(!popup) return;

    popup.classList.add("oculto");
    popup.setAttribute("aria-hidden", "true");
    definirTexto("popupPixChave", "");
    const qr = document.getElementById("popupPixQrCode");
    if(qr) qr.innerHTML = "";
}

// Confirma manualmente o recebimento do PIX.
function confirmarPagamentoPixManual(){
    pagamentoPixManualConfirmado = true;
    fecharPopupPixPagamento();
    if(botaoPagamentoSelecionado()){
        sugerirValorRecebidoPendente();
        adicionarPagamentoFinalizacao();
    }
    confirmarFinalizacaoVenda();
}

// Cancela o pagamento PIX em andamento.
function cancelarPagamentoPixManual(){
    pagamentoPixManualConfirmado = false;
    fecharPopupPixPagamento();
    botaoPagamentoSelecionado()?.classList.remove("ativo");
    document.getElementById("btnConfirmarVenda")?.classList.add("oculto");
}

// Verifica se o popup do PIX está aberto.
function popupPixPagamentoAberto(){
    return !document.getElementById("popupPixPagamento")?.classList.contains("oculto");
}

// Monta o payload BR Code do PIX.
function gerarPayloadPixPdv(chave, valor, empresa){
    const nome = normalizarTextoPayloadPix(empresa.nomeFantasia || empresa.razaoSocial || "CONECCTA", 25);
    const cidade = normalizarTextoPayloadPix(empresa.cidade || "BRASIL", 15);
    const txid = normalizarTextoPayloadPix(`PDV${Date.now().toString().slice(-10)}`, 25);
    const merchant = tlvPix("00", "br.gov.bcb.pix") + tlvPix("01", String(chave || "").trim());
    const payloadSemCrc =
        tlvPix("00", "01") +
        tlvPix("26", merchant) +
        tlvPix("52", "0000") +
        tlvPix("53", "986") +
        tlvPix("54", Number(valor || 0).toFixed(2)) +
        tlvPix("58", "BR") +
        tlvPix("59", nome) +
        tlvPix("60", cidade) +
        tlvPix("62", tlvPix("05", txid)) +
        "6304";

    return payloadSemCrc + crc16Pix(payloadSemCrc);
}

// Monta um campo TLV do payload PIX.
function tlvPix(id, valor){
    const texto = String(valor || "");
    return id + String(texto.length).padStart(2, "0") + texto;
}

// Sanitiza um texto para uso no payload PIX.
function normalizarTextoPayloadPix(texto, limite){
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9 ]/g, "")
        .trim()
        .toUpperCase()
        .slice(0, limite);
}

// Calcula o checksum CRC16 do payload PIX.
function crc16Pix(payload){
    let crc = 0xffff;
    for(let i = 0; i < payload.length; i++){
        crc ^= payload.charCodeAt(i) << 8;
        for(let bit = 0; bit < 8; bit++){
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Gera o SVG do QR Code do PIX.
function gerarQrCodeSvgPix(texto, tamanho){
    const qr = criarQrCodePix(texto);
    const margem = 4;
    const total = qr.size + margem * 2;
    const escala = Math.max(1, Math.floor((Number(tamanho) || 320) / total));
    const lado = total * escala;
    const partes = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR Code PIX" shape-rendering="crispEdges">`,
        `<rect width="100%" height="100%" fill="#fff"/>`
    ];

    for(let y = 0; y < qr.size; y++){
        for(let x = 0; x < qr.size; x++){
            if(qr.modules[y][x]){
                partes.push(`<rect x="${x + margem}" y="${y + margem}" width="1" height="1" fill="#061d36"/>`);
            }
        }
    }

    partes.push("</svg>");
    return partes.join("");
}

// Cria a matriz do QR Code do PIX (Reed-Solomon).
function criarQrCodePix(texto){
    const bytes = Array.from(new TextEncoder().encode(String(texto || "")));
    const totalCodewords = [0,26,44,70,100,134,172,196,242,292,346];
    const eccPorBloco = [0,10,16,26,18,24,16,18,22,22,26];
    const blocos = [0,1,1,1,2,2,4,4,4,5,5];
    let versao = 1;

    for(; versao <= 10; versao++){
        const dados = totalCodewords[versao] - eccPorBloco[versao] * blocos[versao];
        const contador = versao <= 9 ? 8 : 16;
        if(4 + contador + bytes.length * 8 <= dados * 8) break;
    }

    if(versao > 10) versao = 10;

    const tamanho = versao * 4 + 17;
    const modulos = Array.from({ length:tamanho }, () => Array(tamanho).fill(false));
    const reservado = Array.from({ length:tamanho }, () => Array(tamanho).fill(false));

    function setFunc(x, y, escuro){
        modulos[y][x] = escuro;
        reservado[y][x] = true;
    }

    function setData(x, y, escuro){
        modulos[y][x] = escuro;
    }

    function finder(x, y){
        for(let dy = -1; dy <= 7; dy++){
            for(let dx = -1; dx <= 7; dx++){
                const xx = x + dx;
                const yy = y + dy;
                if(xx < 0 || xx >= tamanho || yy < 0 || yy >= tamanho) continue;
                const escuro = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6
                    && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
                setFunc(xx, yy, escuro);
            }
        }
    }

    finder(0, 0);
    finder(tamanho - 7, 0);
    finder(0, tamanho - 7);

    for(let i = 0; i < tamanho; i++){
        if(!reservado[6][i]) setFunc(i, 6, i % 2 === 0);
        if(!reservado[i][6]) setFunc(6, i, i % 2 === 0);
    }

    const alinhamentos = {
        1:[], 2:[6,18], 3:[6,22], 4:[6,26], 5:[6,30],
        6:[6,34], 7:[6,22,38], 8:[6,24,42], 9:[6,26,46], 10:[6,28,50]
    }[versao];

    alinhamentos.forEach(function(cx){
        alinhamentos.forEach(function(cy){
            if(reservado[cy][cx]) return;
            for(let dy = -2; dy <= 2; dy++){
                for(let dx = -2; dx <= 2; dx++){
                    setFunc(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        });
    });

    setFunc(8, tamanho - 8, true);
    setFunc(8, 8, false);
    for(let i = 0; i < 8; i++){
        if(!reservado[8][i]) setFunc(i, 8, false);
        if(!reservado[i][8]) setFunc(8, i, false);
        if(!reservado[8][tamanho - 1 - i]) setFunc(tamanho - 1 - i, 8, false);
        if(!reservado[tamanho - 1 - i][8]) setFunc(8, tamanho - 1 - i, false);
    }

    if(versao >= 7){
        let rem = versao;
        for(let i = 0; i < 12; i++){
            rem = (rem << 1) ^ (((rem >>> 11) & 1) ? 0x1f25 : 0);
        }
        const bits = (versao << 12) | rem;
        for(let i = 0; i < 18; i++){
            const bit = ((bits >>> i) & 1) !== 0;
            const a = tamanho - 11 + (i % 3);
            const b = Math.floor(i / 3);
            setFunc(a, b, bit);
            setFunc(b, a, bit);
        }
    }

    const data = montarDadosQrPix(bytes, versao, totalCodewords[versao], eccPorBloco[versao], blocos[versao]);
    let bitIndex = 0;
    let subir = true;

    for(let x = tamanho - 1; x >= 1; x -= 2){
        if(x === 6) x--;
        for(let i = 0; i < tamanho; i++){
            const y = subir ? tamanho - 1 - i : i;
            for(let dx = 0; dx < 2; dx++){
                const xx = x - dx;
                if(reservado[y][xx]) continue;
                let bit = bitIndex < data.length * 8 && ((data[Math.floor(bitIndex / 8)] >>> (7 - (bitIndex % 8))) & 1) !== 0;
                if((xx + y) % 2 === 0) bit = !bit;
                setData(xx, y, bit);
                bitIndex++;
            }
        }
        subir = !subir;
    }

    desenharFormatoQrPix(modulos, reservado, tamanho);
    return { size:tamanho, modules:modulos };
}

// Monta os dados codificados do QR Code.
function montarDadosQrPix(bytes, versao, totalCw, eccLen, numBlocos){
    const dataCw = totalCw - eccLen * numBlocos;
    const bits = [];
    const addBits = function(valor, qtd){
        for(let i = qtd - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
    };

    addBits(4, 4);
    addBits(bytes.length, versao <= 9 ? 8 : 16);
    bytes.forEach(function(byte){ addBits(byte, 8); });
    for(let i = 0; i < Math.min(4, dataCw * 8 - bits.length); i++) bits.push(0);
    while(bits.length % 8) bits.push(0);

    const dados = [];
    for(let i = 0; i < bits.length; i += 8){
        dados.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
    }

    for(let pad = 0; dados.length < dataCw; pad ^= 1){
        dados.push(pad ? 0x11 : 0xec);
    }

    return intercalarBlocosQrPix(dados, totalCw, dataCw, eccLen, numBlocos);
}

// Intercala os blocos de dados/correção do QR Code.
function intercalarBlocosQrPix(dados, totalCw, dataCw, eccLen, numBlocos){
    const numCurtos = numBlocos - (totalCw % numBlocos);
    const lenCurto = Math.floor(totalCw / numBlocos);
    const gerador = geradorRsQrPix(eccLen);
    const blocosDados = [];
    const blocosEcc = [];
    let k = 0;

    for(let i = 0; i < numBlocos; i++){
        const lenDados = lenCurto - eccLen + (i < numCurtos ? 0 : 1);
        const bloco = dados.slice(k, k + lenDados);
        k += lenDados;
        blocosDados.push(bloco);
        blocosEcc.push(restoRsQrPix(bloco, gerador));
    }

    const resultado = [];
    const maxDados = Math.max(...blocosDados.map(b => b.length));
    for(let i = 0; i < maxDados; i++){
        blocosDados.forEach(function(bloco){
            if(i < bloco.length) resultado.push(bloco[i]);
        });
    }
    for(let i = 0; i < eccLen; i++){
        blocosEcc.forEach(function(bloco){ resultado.push(bloco[i]); });
    }
    return resultado;
}

// Gera o polinômio gerador Reed-Solomon do QR Code.
function geradorRsQrPix(grau){
    let poly = [1];
    for(let i = 0, raiz = 1; i < grau; i++){
        const prox = Array(poly.length + 1).fill(0);
        poly.forEach(function(coef, j){
            prox[j] ^= multiplicarGfQrPix(coef, raiz);
            prox[j + 1] ^= coef;
        });
        poly = prox;
        raiz = multiplicarGfQrPix(raiz, 2);
    }
    return poly.slice(0, grau);
}

// Calcula o resto da divisão polinomial Reed-Solomon.
function restoRsQrPix(dados, gerador){
    const res = Array(gerador.length).fill(0);
    dados.forEach(function(byte){
        const fator = byte ^ res.shift();
        res.push(0);
        gerador.forEach(function(coef, i){
            res[i] ^= multiplicarGfQrPix(coef, fator);
        });
    });
    return res;
}

// Multiplicação em corpo de Galois usada no QR Code.
function multiplicarGfQrPix(x, y){
    let z = 0;
    for(let i = 7; i >= 0; i--){
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        if(((y >>> i) & 1) !== 0) z ^= x;
    }
    return z & 0xff;
}

// Desenha os padrões de formato fixos do QR Code.
function desenharFormatoQrPix(modulos, reservado, tamanho){
    let data = 0 << 3;
    let rem = data;
    for(let i = 0; i < 10; i++){
        rem = (rem << 1) ^ (((rem >>> 9) & 1) ? 0x537 : 0);
    }
    const bits = ((data << 10) | rem) ^ 0x5412;
    const set = function(x, y, i){
        modulos[y][x] = ((bits >>> i) & 1) !== 0;
        reservado[y][x] = true;
    };

    for(let i = 0; i <= 5; i++) set(8, i, i);
    set(8, 7, 6);
    set(8, 8, 7);
    set(7, 8, 8);
    for(let i = 9; i < 15; i++) set(14 - i, 8, i);
    for(let i = 0; i < 8; i++) set(tamanho - 1 - i, 8, i);
    for(let i = 8; i < 15; i++) set(8, tamanho - 15 + i, i);
    modulos[tamanho - 8][8] = true;
}

// Mostra/oculta os botões de tipo de documento (NFC-e/Pedido).
function atualizarBotoesDocumentoFinalizacaoPdv(){
    aplicarConfiguracoesFinalizacaoPdv();
}

// Retorna o ajuste de preço configurado para uma forma de pagamento.
function obterAjusteFormaPagamentoPdv(fpId) {
    if (!fpId) return 0;
    var tabelas = (obterBase().tabelasPreco || []).filter(function(t) {
        return t.ativa !== false && t.tipo === "pagamento";
    });
    for (var i = 0; i < tabelas.length; i++) {
        var regras = tabelas[i].regrasPagamento || [];
        var regra  = regras.find(function(r) { return r.formaPagamentoId === fpId; });
        if (regra && regra.ajuste !== 0) return regra.ajuste;
    }
    return 0;
}

