// pdv-eventos.js
// Registro dos addEventListener não relacionados a atalho de teclado (click/input/change) e inicialização geral da tela.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Liga os botões principais (Cliente, Cancelar, Pesquisar etc.) aos comandos do caixa.
function conectarBotoesPrincipais(){
    document.querySelectorAll("[data-comando-caixa]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            executarComandoCaixa(botao.dataset.comandoCaixa);
        });
    });
}

// Liga os botões de abrir/fechar dos modais do PDV.
function conectarModaisPdv(){
    document.getElementById("overlayModalPdv")?.addEventListener("click", function(){
        if(document.getElementById("modalVendedorPdv")?.classList.contains("aberto")) return;

        const submodalAberto = document.querySelector(".modal-pdv.aberto:not(#modalFinalizarPdv)");
        if(submodalAberto && fecharSubmodalSobFinalizacaoPdv(submodalAberto.id)) return;

        fecharModaisPdv();
    });
    document.getElementById("buscaClientePdv")?.addEventListener("input", renderizarClientesPdv);
    document.getElementById("buscaImportarPedidoPdv")?.addEventListener("input", function(){ renderizarResultadosImportarPedidoPdv(this.value); });
    document.getElementById("btnNovoClienteVendaPdv")?.addEventListener("click", novoClienteVendaPdv);
    document.getElementById("btnEditarClienteVenda")?.addEventListener("click", editarClienteVendaSelecionadoPdv);
    document.getElementById("btnExcluirClienteVenda")?.addEventListener("click", excluirClienteVendaSelecionadoPdv);
    document.getElementById("btnVincularClienteSelecionado")?.addEventListener("click", vincularClienteSelecionadoPdv);
    document.getElementById("btnAplicarCpfNotaVenda")?.addEventListener("click", usarClienteOuCpfNaVendaPdv);
    document.getElementById("btnCancelarClienteVenda")?.addEventListener("click", fecharCadastroClienteVendaPdv);
    document.getElementById("formClienteVendaPdv")?.addEventListener("submit", salvarClienteVendaPdv);
    document.getElementById("buscaVendaPdv")?.addEventListener("input", renderizarMenuVendas);
    document.getElementById("buscaRecebimentoPdv")?.addEventListener("input", renderizarClientesRecebimentoPdv);
    document.getElementById("btnConfirmarVenda")?.addEventListener("click", confirmarFinalizacaoVenda);
    document.getElementById("modalFinalizarPdv")?.addEventListener("keydown", function(evento) {
        tratarTeclasMenuFinalizacaoAberto(evento);
    });
    document.getElementById("btnConfirmarParcelas")?.addEventListener("click", confirmarParcelasCreditoLoja);
    document.getElementById("numeroParcelas")?.addEventListener("input", atualizarParcelasCreditoLoja);
    document.getElementById("btnRegistrarMovimentoCaixa")?.addEventListener("click", registrarMovimentoCaixa);
    document.getElementById("btnConfirmarFechamentoCaixa")?.addEventListener("click", confirmarFechamentoCaixa);
    document.getElementById("btnBaixarRecebimentoPdv")?.addEventListener("click", baixarRecebimentoPdv);
    document.getElementById("btnConfirmarBaixaRecebimentoPdv")?.addEventListener("click", confirmarBaixaRecebimentoPdv);
    document.getElementById("btnImprimirRecebimentoPdv")?.addEventListener("click", imprimirPendenciasRecebimentoPdv);
    document.getElementById("btnNovoClienteRecebimentoPdv")?.addEventListener("click", abrirCadastroClienteRecebimentoPdv);
    document.getElementById("btnFecharCadastroClienteRecebimentoPdv")?.addEventListener("click", fecharCadastroClienteRecebimentoPdv);
    document.getElementById("btnCancelarClienteRecebimentoPdv")?.addEventListener("click", fecharCadastroClienteRecebimentoPdv);
    document.getElementById("formClienteRecebimentoPdv")?.addEventListener("submit", salvarClienteRecebimentoPdv);
    document.getElementById("btnConfirmarEntregaVendaPdv")?.addEventListener("click", confirmarEntregaVendaAtualPdv);
    document.getElementById("btnCancelarEntregaVendaPdv")?.addEventListener("click", cancelarEntregaVendaAtualPdv);
    document.getElementById("checkEntregaVendaPdv")?.addEventListener("change", alternarEntregaFinalizacaoPdv);
    document.getElementById("checkClienteVendaPdv")?.addEventListener("change", alternarClienteFinalizacaoPdv);
    document.getElementById("entregaVendaBuscaCliente")?.addEventListener("input", renderizarClientesEntregaPdv);
    document.getElementById("entregaVendaBuscaCliente")?.addEventListener("keydown", function(evento) {
        if(evento.key === "Escape"){
            ocultarListaClientesEntregaPdv();
            document.getElementById("entregaVendaDestinatario")?.focus();
        }
    });
    document.getElementById("btnAdicionarPagamentoFinalizacao")?.addEventListener("click", adicionarPagamentoFinalizacao);
    document.getElementById("buscaOrcamentosPdv")?.addEventListener("input", renderizarListaOrcamentosPdv);
    document.getElementById("btnLimparOrcamentosAntigos")?.addEventListener("click", limparOrcamentosAntigosPdv);
    document.getElementById("btnRegistrarEntregaPdv")?.addEventListener("click", registrarEntregaPdv);
    document.getElementById("tipoDescontoVenda")?.addEventListener("change", function() {
        aplicarPlaceholderDescontoPdv();
        atualizarTotaisFinalizacao();
    });
    document.getElementById("valorRecebidoPdv")?.addEventListener("input", atualizarTroco);
    document.getElementById("valorRecebidoPdv")?.addEventListener("keydown", function(evento) {
        if(evento.key === "Enter"){
            evento.preventDefault();
            evento.stopPropagation();
            executarEnterFinalizacaoVendaPdv();
        }
    });
    document.getElementById("valorRecebidoPdv")?.addEventListener("blur", function() {
        const campo = document.getElementById("valorRecebidoPdv");
        if(campo && campo.value.trim()){
            campo.value = formatarDecimalCampo(campo.value);
            atualizarTroco();
        }
    });

    document.getElementById("valorDescontoVenda")?.addEventListener("input", atualizarTotaisFinalizacao);
    document.getElementById("valorDescontoVenda")?.addEventListener("blur", function() {
        const campo = document.getElementById("valorDescontoVenda");

        if(campo){
            campo.value = campo.value.trim() ? formatarDecimalCampo(campo.value) : "";
            atualizarTotaisFinalizacao();
        }
    });

    document.querySelectorAll("[data-fechar-modal]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            const modalOrigem = botao.closest(".modal-pdv");

            if(modalOrigem && fecharSubmodalSobFinalizacaoPdv(modalOrigem.id)) return;

            fecharModaisPdv();
        });
    });


    document.querySelectorAll(".aba-menu-pdv").forEach(function(botao) {
        botao.addEventListener("click", function() {
            abrirAbaMenuPdv(botao.dataset.menuPdv);
        });
    });

    document.querySelectorAll(".opcoes-finalizacao").forEach(function(grupo) {
        grupo.addEventListener("click", function(event) {
            const botao = event.target.closest(".opcao-finalizacao");

            if(!botao) return;
            if(botao.disabled || botao.classList.contains("desabilitado")) return;

            grupo.querySelectorAll(".opcao-finalizacao").forEach(function(item) {
                item.classList.toggle("ativo", item === botao);
            });

            if(grupo.id === "tipoDocumentoVenda"){
                if(descontoPermitido()){
                    document.getElementById("grupoDescontoVenda")?.classList.remove("oculto");
                }else{
                    document.getElementById("grupoDescontoVenda")?.classList.add("oculto");
                    aplicarTipoDescontoPadraoPdv();
                    document.getElementById("valorDescontoVenda").value = "";
                }

                document.getElementById("grupoPagamentoVenda")?.classList.remove("oculto");
                atualizarTotaisFinalizacao();
            }

            if(grupo.id === "formaPagamentoVenda"){
                pagamentoPixManualConfirmado = false;
                atualizarTotaisFinalizacao();

                if(abrirPopupPixSeNecessario(botao)){
                    document.getElementById("btnConfirmarVenda")?.classList.add("oculto");
                    return;
                }

                abrirPopupRecebimentoFinalizacao();
                atualizarBotaoConfirmarFinalizacao();
            }
        });
    });

    document.querySelectorAll("#formaPagamentoRecebimentoPdv button").forEach(function(botao) {
        botao.addEventListener("click", function() {
            document.querySelectorAll("#formaPagamentoRecebimentoPdv button").forEach(function(opcao) {
                opcao.classList.remove("ativo");
            });

            botao.classList.add("ativo");
        });
    });

    document.querySelectorAll("[data-opcao-pdv]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            executarOpcaoPdv(botao.dataset.opcaoPdv);
        });
    });
}

// Liga o botão de sair do caixa.
function configurarBotaoSairCaixa(){
    const botao = document.getElementById("btnSairCaixa");
    if(!botao) return;

    botao.addEventListener("click", function() {
        if(!carrinhoVenda.length){
            sairDoCaixaPdv();
            return;
        }

        const confirmar = window.notify
            ? notify.confirm({
                title: "Venda em andamento",
                message: "Existe uma venda em andamento. Deseja sair mesmo assim?",
                confirmText: "Sair mesmo assim",
                cancelText: "Cancelar",
                type: "warning"
            })
            : Promise.resolve(confirm("Existe uma venda em andamento. Deseja sair mesmo assim?"));

        confirmar.then(function(ok){
            if(ok) sairDoCaixaPdv();
        });
    });
}

// Ponto único de inicialização do PDV: liga todos os campos/telas e dispara as
// primeiras renderizações. Chamado por pdv.js no DOMContentLoaded.
// O dispatcher de atalhos globais (F1-F12/ESC/Ctrl) vive em pdv-atalhos.js (tratarAtalhosGeraisPdv).
window.PdvEventos = {
    inicializar: function() {
        const searchInput = document.getElementById("pesquisaProduto");
        aplicarProporcaoTelaPdv();
        aplicarConfiguracoesPdv();
        inicializarVendedorPdv();
        atualizarOperadorLogadoPdv();
        configurarBotaoSairCaixa();
        renderizarFormasPagamentoPdv();

        // Recuperação de venda em andamento
        if (window.ControleSaida) {
            ControleSaida.verificarVendaEmAndamento(
                function (venda) {
                    carrinhoVenda = venda.itens || [];
                    clienteVenda  = venda.cliente || null;
                    atualizarTela();
                }
            );
        }

        searchInput?.addEventListener("focus", function() {
            this.parentElement.style.boxShadow = "0 16px 40px rgba(3, 60, 120, 0.18)";
        });

        searchInput?.addEventListener("blur", function() {
            this.parentElement.style.boxShadow = "0 2px 10px rgba(0,0,0,.05)";
            setTimeout(ocultarSugestoesProdutos, 160);
            agendarFocoPesquisaProduto();
        });

        searchInput?.addEventListener("input", function() {
            if(itemEmDigitacao) return;
            if(obterConfiguracoesSistema().pdvNaoAbrirPesquisaAuto === true){
                ocultarSugestoesProdutos();
                return;
            }
            renderizarSugestoesProdutos(this.value);
        });

        searchInput?.addEventListener("keydown", function(e) {
            if(!itemEmDigitacao && e.key === "*"){
                e.preventDefault();
                ocultarSugestoesProdutos();
                this.value = "";
                prepararQuantidadePendente();
                return;
            }

            if(!itemEmDigitacao && tratarTeclasSugestoes(e)){
                return;
            }

            if(!teclaEnterPdv(e)) return;

            e.preventDefault();

            if(!itemEmDigitacao){
                const termoBusca = normalizar(interpretarEntradaProduto(this.value).termoProduto);
                const matchExato = obterMercadorias().find(function(p){
                    return normalizar(p.codigo) === termoBusca ||
                           normalizar(p.ean) === termoBusca ||
                           (configuracaoPermiteReferenciaPdv() && normalizar(p.referencia) === termoBusca);
                });
                if(!matchExato && obterConfiguracoesSistema().pdvPesquisarComEnter !== false){
                    const candidatos = buscarProdutosParecidos(termoBusca);
                    if(candidatos.length > 1){
                        renderizarSugestoesProdutos(this.value);
                        return;
                    }
                }
            }

            ocultarSugestoesProdutos();
            processarEntradaPDV(this.value);
            if(!itemEmDigitacao) this.value = "";
        });

        document.getElementById("quantidadeItens")?.addEventListener("keydown", function(e) {
            if(!teclaEnterPdv(e)) return;

            e.preventDefault();
            if(itemEmDigitacao?.etapa === "quantidade"){
                informarQuantidadeProduto(this.value);
                return;
            }

            if(!itemEmDigitacao && !this.readOnly){
                confirmarQuantidadePendente(this.value);
            }
        });

        document.getElementById("valorUnitario")?.addEventListener("keydown", function(e) {
            if(!teclaEnterPdv(e)) return;

            e.preventDefault();
            if(itemEmDigitacao?.etapa === "preco"){
                informarPrecoProduto(this.value);
            }
        });

        document.getElementById("btnInserirEditorLancamentoMobile")?.addEventListener("click", confirmarEditorLancamentoMobilePdv);
        document.getElementById("editorLancamentoMobileValor")?.addEventListener("keydown", function(e) {
            if(!teclaEnterPdv(e)) return;
            e.preventDefault();
            confirmarEditorLancamentoMobilePdv();
        });
        ["overlayEditorLancamentoMobile","btnCancelarEditorLancamentoMobile","btnFecharEditorLancamentoMobile"].forEach(function(id) {
            document.getElementById(id)?.addEventListener("click", function() {
                fecharEditorLancamentoMobilePdv(true);
            });
        });
        document.getElementById("btnScannerCodigoBarrasPdv")?.addEventListener("click", abrirScannerCodigoPdv);
        ["overlayScannerCodigoPdv","btnFecharScannerCodigoPdv"].forEach(function(id) {
            document.getElementById(id)?.addEventListener("click", fecharScannerCodigoPdv);
        });
        document.getElementById("quantidadeItens")?.closest(".metric-card")?.addEventListener("click", function() {
            if(itemEmDigitacao?.etapa === "quantidade"){
                prepararCampoQuantidade(itemEmDigitacao.produto);
                return;
            }
            if(!itemEmDigitacao){
                prepararQuantidadePendente();
            }
        });
        document.addEventListener("pointerdown", function(e) {
            const quantidade = document.getElementById("quantidadeItens");
            const cardQuantidade = quantidade?.closest(".metric-card");
            const editorMobile = document.getElementById("editorLancamentoMobile");
            if(!quantidade || quantidade.readOnly) return;
            if(cardQuantidade?.contains(e.target) || editorMobile?.contains(e.target)) return;
            if(itemEmDigitacao?.etapa === "quantidade") return;

            const valor = String(quantidade.value || "").trim();
            if(!valor){
                quantidadePendentePesquisa = 0;
                quantidadePendenteTexto = "";
                liberarCampoMetrica("quantidadeItens", false);
                resetarCamposLancamento();
                fecharEditorLancamentoMobilePdv(false);
                return;
            }

            confirmarQuantidadePendente(valor);
            fecharEditorLancamentoMobilePdv(false);
        }, true);
        document.getElementById("valorUnitario")?.closest(".metric-card")?.addEventListener("click", function() {
            if(!editorLancamentoMobileAtivoPdv()) return;
            if(itemEmDigitacao?.etapa === "preco"){
                prepararCampoPreco(itemEmDigitacao.produto);
            }
        });

        carregarSugestoesProdutos();
        carregarTabelasPrecoPdv();
        atualizarTela();
        prepararCampoProduto();
        conectarBotoesPrincipais();
        conectarModaisPdv();
        verificarAberturaCaixa();

        document.getElementById("btnFecharAvisoSistema")?.addEventListener("click", ocultarAvisoSistema);
        document.getElementById("btnConfirmarPixPagamento")?.addEventListener("click", confirmarPagamentoPixManual);
        document.getElementById("btnCancelarPixPagamento")?.addEventListener("click", cancelarPagamentoPixManual);
        document.getElementById("btnCancelarPixTopo")?.addEventListener("click", cancelarPagamentoPixManual);
        document.getElementById("popupPixPagamento")?.addEventListener("keydown", tratarTeclasPopupPixPagamento);
        document.getElementById("btnAjustes")?.addEventListener("click", abrirAjustes);
        document.getElementById("overlayAjustes")?.addEventListener("click", fecharAjustes);
        document.getElementById("proporcaoTelaPdv")?.addEventListener("change", function() {
            salvarProporcaoTelaPdv(this.value);
        });

        window.addEventListener("storage", function(evento) {
            if(["base_Sistema", "configuracoesSistema"].includes(evento.key)){
                aplicarConfiguracoesPdv();
            }
        });
        window.addEventListener("configuracoesSistemaAtualizadas", aplicarConfiguracoesPdv);

        document.addEventListener("keydown", protegerEventoCaixaComFinalizacaoAberta, true);
        document.addEventListener("pointerdown", protegerEventoCaixaComFinalizacaoAberta, true);
        document.addEventListener("click", protegerEventoCaixaComFinalizacaoAberta, true);

        document.addEventListener("keydown", tratarAtalhosGeraisPdv);

        document.addEventListener("pointerup", agendarFocoPesquisaProduto);
        window.addEventListener("focus", agendarFocoPesquisaProduto);

        document.getElementById("btnAbrirPesquisaMercadoria")?.addEventListener("click", function(){
            fecharModaisPdv();
            abrirPainelPesquisaMercadoria();
        });
        document.getElementById("btnFecharPesquisaMercadoria")?.addEventListener("click", fecharPainelPesquisaMercadoria);
        document.getElementById("buscaPesquisaMercadoria")?.addEventListener("input", function(){
            renderizarListaPesquisaMercadoria(this.value);
        });
        document.getElementById("buscaPesquisaMercadoria")?.addEventListener("keydown", tratarTeclasPainelPesquisa);
        document.getElementById("listaPesquisaMercadoria")?.addEventListener("keydown", tratarTeclasPainelPesquisa);
        document.querySelector(".pesquisa-pdv-tabela-wrap")?.addEventListener("scroll", carregarMaisPesquisaMercadoriaAoRolar);
        document.getElementById("listaPesquisaMercadoria")?.addEventListener("dblclick", function(e){
            const linha = e.target.closest("tr.pesquisa-linha");
            if(!linha) return;
            const idx = Number.parseInt(linha.dataset.indicePesquisa, 10);
            if(idx >= 0){ pesquisaMercadoriaIndice = idx; atualizarSelecaoPesquisa(); }
            abrirModalQtdPesquisa();
        });
        document.getElementById("listaPesquisaMercadoria")?.addEventListener("click", function(e){
            const linha = e.target.closest("tr.pesquisa-linha");
            if(!linha) return;
            const idx = Number.parseInt(linha.dataset.indicePesquisa, 10);
            if(idx >= 0){ pesquisaMercadoriaIndice = idx; atualizarSelecaoPesquisa(); }
        });
        document.getElementById("btnConfirmarQtdPesquisa")?.addEventListener("click", confirmarQtdPesquisa);
        document.getElementById("btnCancelarQtdPesquisa")?.addEventListener("click", fecharModalQtdPesquisa);
        document.getElementById("inputQtdPesquisa")?.addEventListener("keydown", function(e){
            if(teclaEnterPdv(e)){ e.preventDefault(); confirmarQtdPesquisa(); }
            if(e.key === "Escape"){ fecharModalQtdPesquisa(); }
        });
        document.getElementById("btnFecharBuscarPrecoPdv")?.addEventListener("click", fecharBuscaPrecoPdv);
        document.getElementById("btnFecharBuscaPrecoPdv")?.addEventListener("click", fecharBuscaPrecoPdv);
        document.getElementById("btnInserirBuscaPrecoPdv")?.addEventListener("click", inserirProdutoBuscaPrecoPdv);
        document.getElementById("buscaPrecoProdutoPdv")?.addEventListener("input", atualizarBuscaPrecoPdv);
        document.getElementById("buscaPrecoProdutoPdv")?.addEventListener("keydown", tratarTeclasBuscaPrecoPdv);
        document.getElementById("quantidadeBuscaPrecoPdv")?.addEventListener("input", renderizarResumoBuscaPrecoPdv);
        document.getElementById("quantidadeBuscaPrecoPdv")?.addEventListener("keydown", tratarTeclasBuscaPrecoPdv);
    }
};
