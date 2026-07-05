// pdv-menu.js
// Abrir/fechar painéis e modais genéricos, dispatcher dos botões de comando (F1/F2/F6/F7/F9/F12), navegação do painel de opções e das telas de devolução.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Executa o comando associado a um botão/atalho do caixa.
function executarComandoCaixa(comando){
    const acoes = {
        opcoes: abrirOpcoesPdv,
        cliente: informarCliente,
        cancelar: cancelarVenda,
        menu: abrirMenuVendas,
        pesquisar: abrirPainelPesquisaMercadoria,
        guardar: guardarVenda,
        recebimento: abrirRecebimento,
        finalizar: finalizarVenda,
        orcamento: gerarOrcamentoPdv,
        importarPedido: abrirModalImportarPedidoPdv
    };

    const acao = acoes[comando];

    if(acao){
        acao();
    }
}

// Fecha um submodal aberto sobre a tela de finalização.
function fecharSubmodalSobFinalizacaoPdv(idSubmodal){
    if(!modalFinalizacaoAbertoPdv() || idSubmodal === "modalFinalizarPdv") return false;

    if(idSubmodal === "modalEntregaVendaPdv" && entregaFluxoFinalizacaoAtivo){
        cancelarEntregaVendaAtualPdv();
        return true;
    }

    if(idSubmodal === "modalClientesPdv"){
        fecharModaisPdv();
        abrirModalPdv("modalFinalizarPdv");
        atualizarResumoClienteFinalizacaoPdv();
        return true;
    }

    return false;
}

// Abre o painel de configurações do caixa.
function abrirAjustes(){
    _carregarConfiguracoesAvancadasCaixa();
    document.getElementById("painelAjustes")?.classList.add("aberto");
    document.getElementById("overlayAjustes")?.classList.add("ativo");
}

// Fecha o painel de configurações do caixa.
function fecharAjustes(){
    document.getElementById("painelAjustes")?.classList.remove("aberto");
    document.getElementById("overlayAjustes")?.classList.remove("ativo");
}

// Navega para outro módulo do sistema.
function abrirModulo(tipo){
    if(tipo === "caixa"){
        abrirParametrosCaixaPdv();
        return;
    }

    const nomes = {
        impressoras: "Abrir gerenciamento de impressoras",
        balancas: "Abrir gerenciamento de balanças",
        reimpressao: "Abrir reimpressão NFC-e",
        caixa: "Abrir configurações do caixa"
    };
    alert(nomes[tipo] || "Configuração indisponível.");
}

// Abre a tela de recebimento (crédito loja).
function abrirRecebimento(){
    if(!usuarioTemPermissaoSistema("pdvRecebimento")){
        solicitarOuBloquear("pdvRecebimento", "Recebimento no caixa", null, "Seu usuário não possui permissão para recebimentos no caixa.");
        return;
    }

    sincronizarContasCreditoLojaPdv();
    clienteRecebimentoPdvAtual = null;
    definirTexto("clienteRecebimentoPdvNome", "Nenhum cliente aberto");
    definirTexto("clienteRecebimentoPdvCpf", "CPF/CNPJ não informado");
    definirTexto("totalRecebimentoPdv", "Selecionado: R$ 0,00");
    fecharCadastroClienteRecebimentoPdv();
    resetarPagamentoRecebimentoPdv();
    renderizarClientesRecebimentoPdv();
    renderizarPendenciasRecebimentoPdv();
    abrirModalPdv("modalRecebimentoPdv");
}

// Atalho para abrir o painel de opções (F1).
function abrirOpcoesPdv(){
    abrirPainelOpcoesPdv();
}

// Abre o painel lateral de opções do caixa.
function abrirPainelOpcoesPdv(){
    _atualizarInfoSessaoPainel();
    document.getElementById("painelOpcoesPdv")?.classList.add("aberto");
    document.getElementById("overlayOpcoesPdv")?.classList.add("ativo");
}

// Fecha o painel lateral de opções do caixa.
function fecharPainelOpcoesPdv(){
    document.getElementById("painelOpcoesPdv")?.classList.remove("aberto");
    document.getElementById("overlayOpcoesPdv")?.classList.remove("ativo");
}

// Executa a opção selecionada no painel de opções.
function executarOpcaoPdv(opcao){
    const acoes = {
        "importar-guardada": importarVendaGuardada,
        menu: abrirMenuVendas,
        entregas: focarEntregasPdv,
        fechamento: abrirFechamentoOpcoesPdv,
        devolucao: abrirDevolucaoVendasPdv,
        "suprimento-sangria": abrirSuprimentoSangriaPdv,
        recebimentos: abrirRecebimentoOpcoesPdv,
        "reimprimir-ultima": reimprimirUltimaVendaPdv,
        "abrir-gaveta": abrirGavetaPdv,
        "importar-orcamento": abrirListaOrcamentosPdv
    };
    const acao = acoes[opcao];

    if(acao){
        fecharAjustes();
        fecharPainelOpcoesPdv();
        acao();
    }
}

// Abre o fechamento de caixa a partir do painel de opções.
function abrirFechamentoOpcoesPdv(){
    fecharModaisPdv();
    abrirFechamentoCaixa();
}

// Abre o recebimento a partir do painel de opções.
function abrirRecebimentoOpcoesPdv(){
    fecharModaisPdv();
    abrirRecebimento();
}

// Alterna entre as abas do menu de vendas (vendas/canceladas/caixa).
function abrirAbaMenuPdv(aba){
    document.querySelectorAll(".aba-menu-pdv").forEach(function(botao) {
        botao.classList.toggle("ativa", botao.dataset.menuPdv === aba);
    });

    document.querySelectorAll(".menu-pdv-view").forEach(function(view) {
        view.classList.toggle("ativo", view.id === `menu-pdv-${aba}`);
    });
}

// Abre um modal genérico do PDV pelo id.
function abrirModalPdv(id){
    if(id === "modalVendedorPdv" && !obterConfiguracoesSistema().usarVendedor) return;
    const finalizacaoJaAberta = modalFinalizacaoAbertoPdv();
    const finalizacaoAtiva = id === "modalFinalizarPdv" || finalizacaoJaAberta;
    document.body.classList.toggle("modal-finalizar-aberto", finalizacaoAtiva);
    document.getElementById("overlayModalPdv")?.classList.add("ativo");
    const modal = document.getElementById(id);
    modal?.classList.add("aberto");
    modal?.setAttribute("aria-hidden", "false");
    aplicarProtecaoCaixaFinalizacaoPdv(finalizacaoAtiva);

    const modalFinalizar = document.getElementById("modalFinalizarPdv");
    if(modalFinalizar){
        if(id === "modalFinalizarPdv"){
            modalFinalizar.removeAttribute("inert");
        }else if(finalizacaoJaAberta){
            // Um popup abriu por cima do fechamento de venda: bloqueia a tela de baixo.
            modalFinalizar.setAttribute("inert", "");
        }
    }

    if(id === "modalFinalizarPdv"){
        if(!modal.hasAttribute("tabindex")) modal.setAttribute("tabindex", "-1");
        window.setTimeout(function(){
            const foco = modal.querySelector("#tipoDocumentoVenda .opcao-finalizacao.ativo, #tipoDocumentoVenda .opcao-finalizacao:not(:disabled), button:not(:disabled), input:not(:disabled), select:not(:disabled)");
            (foco || modal).focus({ preventScroll:true });
        }, 0);
    }
}

// Fecha todos os modais abertos do PDV.
function fecharModaisPdv(){
    document.body.classList.remove("modal-finalizar-aberto");
    aplicarProtecaoCaixaFinalizacaoPdv(false);
    document.getElementById("overlayModalPdv")?.classList.remove("ativo");
    document.querySelectorAll(".modal-pdv").forEach(function(modal) {
        modal.classList.remove("aberto");
        modal.setAttribute("aria-hidden", "true");
        modal.removeAttribute("inert");
    });
}

