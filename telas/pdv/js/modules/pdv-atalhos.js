// pdv-atalhos.js
// Handlers cuja lógica central decide o comportamento a partir da tecla pressionada (F1-F12, ESC, Enter, Ctrl, setas).
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Teclados virtuais móveis nem sempre reportam key:"Enter" em keydown (IME/autocomplete) — cobre keyCode/which também.
function teclaEnterPdv(evento){
    return evento.key === "Enter" || evento.keyCode === 13 || evento.which === 13;
}

// Trata navegação por teclado no dropdown de sugestões.
function tratarTeclasSugestoes(evento){
    const listaAberta = document.getElementById("listaProdutosPDV")?.classList.contains("ativo");

    if(!listaAberta || sugestoesProdutosPdv.length === 0){
        return false;
    }

    if(evento.key === "ArrowDown"){
        evento.preventDefault();
        sugestaoProdutoAtiva = Math.min(sugestoesProdutosPdv.length - 1, sugestaoProdutoAtiva + 1);
        atualizarSugestaoAtiva();
        return true;
    }

    if(evento.key === "ArrowUp"){
        evento.preventDefault();
        sugestaoProdutoAtiva = Math.max(0, sugestaoProdutoAtiva - 1);
        atualizarSugestaoAtiva();
        return true;
    }

    if(teclaEnterPdv(evento)){
        if(sugestaoProdutoAtiva < 0) return false;
        evento.preventDefault();
        selecionarSugestaoProduto(sugestaoProdutoAtiva);
        return true;
    }

    if(evento.key === "Escape"){
        ocultarSugestoesProdutos();
        return true;
    }

    return false;
}

// Trata os atalhos F1-F12 (exceto F10, reservado para Confirmar Venda) de forma de
// pagamento na finalização. A tecla de cada forma é definida no cadastro de Formas de
// Pagamento (campo "Tecla de atalho").
function tratarAtalhoPagamentoFinalizacao(evento){
    if(!modalFinalizacaoAbertoPdv()) return false;
    if(evento.key === "F10") return false;
    if(!/^F([1-9]|1[12])$/.test(evento.key)) return false;

    evento.preventDefault();
    evento.stopPropagation();

    const grupoPagamento = document.getElementById("grupoPagamentoVenda");
    if(!grupoPagamento || grupoPagamento.classList.contains("oculto")) return true;

    const botao = document.querySelector(`#formaPagamentoVenda .opcao-finalizacao[data-atalho="${evento.key}"]`);
    if(!botao || botao.disabled || botao.classList.contains("desabilitado")) return true;

    botao.click();
    botao.focus({ preventScroll:true });
    return true;
}

// Trata o teclado quando o modal de finalização está aberto.
function tratarTeclasMenuFinalizacaoAberto(evento){
    if(!modalFinalizacaoAbertoPdv()) return false;
    if(controleImpressaoVendaAbertoPdv()) return false;
    if(popupPixPagamentoAberto()) return false;
    if(alvoSubmodalFinalizacaoPdv(evento.target)) return false;

    if(tratarAtalhoPagamentoFinalizacao(evento)) return true;

    const modal = document.getElementById("modalFinalizarPdv");
    const dentroModal = Boolean(evento.target?.closest?.("#modalFinalizarPdv"));

    if(evento.key === "Enter"){
        if(evento.target?.closest?.("textarea")) return false;
        evento.preventDefault();
        evento.stopPropagation();
        executarEnterFinalizacaoVendaPdv();
        return true;
    }

    if(evento.key === "F10"){
        evento.preventDefault();
        evento.stopPropagation();
        const botao = document.getElementById("btnConfirmarVenda");
        if(botao && !botao.classList.contains("oculto") && !botao.disabled){
            botao.click();
        }
        return true;
    }

    if(evento.key === "Escape"){
        evento.preventDefault();
        evento.stopPropagation();
        if(popupRecebimentoFinalizacaoAberto()){
            fecharPopupRecebimentoFinalizacao();
            return true;
        }
        fecharModaisPdv();
        return true;
    }

    if(/^F\d{1,2}$/.test(evento.key) || evento.ctrlKey || evento.altKey || evento.metaKey){
        evento.preventDefault();
        evento.stopPropagation();
        return true;
    }

    if(!dentroModal){
        evento.preventDefault();
        evento.stopPropagation();
        modal?.focus({ preventScroll:true });
        return true;
    }

    evento.stopPropagation();
    return true;
}

// Bloqueia eventos globais indevidos enquanto a finalização está aberta.
function protegerEventoCaixaComFinalizacaoAberta(evento){
    if(!modalFinalizacaoAbertoPdv()) return;
    if(controleImpressaoVendaAbertoPdv()) return;
    if(evento.target?.closest?.("#modalFinalizarPdv")) return;
    if(evento.target?.closest?.("#confirmacaoImpressaoVenda")) return;
    if(alvoSubmodalFinalizacaoPdv(evento.target)) return;

    if(evento.type === "keydown"){
        tratarTeclasMenuFinalizacaoAberto(evento);
        return;
    }

    if(evento.type === "click" && evento.target?.id === "overlayModalPdv"){
        return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    document.getElementById("modalFinalizarPdv")?.focus({ preventScroll:true });
}

// Trata o teclado enquanto o popup do PIX está aberto.
function tratarTeclasPopupPixPagamento(evento){
    if(!popupPixPagamentoAberto()) return;

    if(evento.key === "Enter"){
        evento.preventDefault();
        evento.stopPropagation();
        confirmarPagamentoPixManual();
        return;
    }

    if(evento.key === "Escape"){
        evento.preventDefault();
        evento.stopPropagation();
        cancelarPagamentoPixManual();
    }
}

// Decide se uma tecla digitada deve ser redirecionada à pesquisa.
function deveDirecionarTeclaParaPesquisaProduto(evento){
    const ativo = document.activeElement;
    const digitavel = ativo && ["INPUT", "TEXTAREA", "SELECT"].includes(ativo.tagName);

    if(evento.ctrlKey || evento.altKey || evento.metaKey) return false;
    if(evento.key.length !== 1) return false;
    if(digitavel || !podeFocarPesquisaProduto()) return false;

    return true;
}

// Trata o teclado dentro do modal de busca rápida de preço.
function tratarTeclasBuscaPrecoPdv(evento){
    if(evento.key === "Escape"){
        evento.preventDefault();
        fecharBuscaPrecoPdv();
        return;
    }
    if(evento.key === "Enter"){
        evento.preventDefault();
        inserirProdutoBuscaPrecoPdv();
    }
}

// Trata o teclado (setas/Enter) no painel de pesquisa de mercadoria.
function tratarTeclasPainelPesquisa(e){
    if(e.key === "ArrowDown"){
        e.preventDefault();
        if(pesquisaMercadoriaIndice < pesquisaMercadoriaLista.length - 1){
            pesquisaMercadoriaIndice++;
            atualizarSelecaoPesquisa();
        }
    } else if(e.key === "ArrowUp"){
        e.preventDefault();
        if(pesquisaMercadoriaIndice > 0){
            pesquisaMercadoriaIndice--;
            atualizarSelecaoPesquisa();
        }
    } else if(e.key === "Enter"){
        e.preventDefault();
        if(pesquisaMercadoriaIndice >= 0) abrirModalQtdPesquisa();
    } else if(e.key === "Escape"){
        e.preventDefault();
        fecharPainelPesquisaMercadoria();
    }
}

// Dispatcher global de atalhos de teclado do caixa: Ctrl (busca de preço), redireciona
// digitação solta para a pesquisa, ESC (fecha modais/cancela digitação) e F1/F2/F4/F6/F7/F8/F9/F10/F12.
// Registrado em pdv-eventos.js via document.addEventListener("keydown", tratarAtalhosGeraisPdv).
function tratarAtalhosGeraisPdv(e) {
    if(modalFinalizacaoAbertoPdv() && alvoSubmodalFinalizacaoPdv(e.target)) return;
    if(tratarTeclasMenuFinalizacaoAberto(e)) return;

    if(e.key === "Control" && !e.repeat && podeAbrirBuscaPrecoPdv()){
        e.preventDefault();
        abrirBuscaPrecoPdv();
        return;
    }

    if(deveDirecionarTeclaParaPesquisaProduto(e)){
        document.getElementById("pesquisaProduto")?.focus();
        return;
    }

    if(e.key === "Escape"){
        if(!document.getElementById("popupPixPagamento")?.classList.contains("oculto")){
            cancelarPagamentoPixManual();
            return;
        }

        if(itemEmDigitacao){
            cancelarDigitacaoProduto();
            return;
        }

        fecharAjustes();
        fecharModaisPdv();
    }

    if(e.key === "F1"){
        e.preventDefault();
        executarComandoCaixa("opcoes");
    }

    if(e.key === "F2"){
        e.preventDefault();
        executarComandoCaixa("cliente");
    }

    if(e.key === "F4"){
        e.preventDefault();
        if(!recursoGuardarVendasAtivo()){
            alert("Guardar vendas está desativado.");
            return;
        }
        if(!usuarioTemPermissaoSistema("pdvGuardarVendas")){
            solicitarOuBloquear("pdvGuardarVendas", "Guardar venda em andamento", totalCarrinhoPdvAtual(), "Seu usuário não possui permissão para guardar vendas.");
            return;
        }
        executarComandoCaixa("guardar");
    }

    if(e.key === "F6" || e.key === "F8"){
        e.preventDefault();
        executarComandoCaixa("cancelar");
    }

    if(e.key === "F7"){
        e.preventDefault();
        executarComandoCaixa("recebimento");
    }

    if(e.key === "F9"){
        e.preventDefault();
        executarComandoCaixa("importarPedido");
    }

    if(e.key === "F10"){
        e.preventDefault();
        executarComandoCaixa("finalizar");
    }

    if(e.key === "F12"){
        e.preventDefault();
        executarComandoCaixa("pesquisar");
    }
}

