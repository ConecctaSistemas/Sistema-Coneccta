// pdv-utils.js
// Formatação de campos, foco de campo, aviso do sistema e utilitários específicos do PDV.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Exibe a faixa de aviso do sistema no topo.
function mostrarAvisoSistema(mensagem){
    if(window.notificar){
        window.notificar(mensagem, "aviso");
        return;
    }

    const aviso = document.getElementById("avisoSistemaPdv");
    const texto = document.getElementById("avisoSistemaTexto");

    if(!aviso || !texto){
        console.warn(mensagem);
        return;
    }

    texto.textContent = String(mensagem || "Informação do sistema.");
    aviso.classList.add("ativo");
    aviso.setAttribute("aria-hidden", "false");

    clearTimeout(temporizadorAvisoSistema);
    temporizadorAvisoSistema = setTimeout(ocultarAvisoSistema, 4200);
}

// Oculta a faixa de aviso do sistema.
function ocultarAvisoSistema(){
    const aviso = document.getElementById("avisoSistemaPdv");

    if(!aviso) return;

    aviso.classList.remove("ativo");
    aviso.setAttribute("aria-hidden", "true");
    clearTimeout(temporizadorAvisoSistema);
    temporizadorAvisoSistema = null;
}

// Agenda o retorno do foco ao campo de pesquisa de produto.
function agendarFocoPesquisaProduto(){
    window.setTimeout(focarPesquisaProdutoSeDisponivel, 0);
}

// Verifica se o PDV está num celular/touch (mesmo critério do scanner e do editor mobile).
function ehDispositivoMobilePdv(){
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

// Foca o campo de pesquisa quando nenhum outro campo precisa dele.
function focarPesquisaProdutoSeDisponivel(){
    // No celular o teclado virtual só deve abrir quando o cliente toca o campo.
    // Esse refoco automático (a cada toque na tela, ao sair do campo, ao voltar
    // o foco da janela) existe para manter o leitor de código de barras/teclado
    // físico do desktop sempre digitando na pesquisa — no touch ele só reabria
    // o teclado sozinho a cada ação.
    if(ehDispositivoMobilePdv()) return;

    const input = document.getElementById("pesquisaProduto");

    if(!input || !podeFocarPesquisaProduto()) return;

    input.focus({ preventScroll: true });
}

// Verifica se é seguro focar o campo de pesquisa agora.
function podeFocarPesquisaProduto(){
    const ativo = document.activeElement;
    const quantidade = document.getElementById("quantidadeItens");
    const valor = document.getElementById("valorUnitario");
    const popupPixAberto = !document.getElementById("popupPixPagamento")?.classList.contains("oculto");
    const ajustesAberto = document.getElementById("overlayAjustes")?.classList.contains("ativo");
    const modalAberto = Boolean(document.querySelector(".modal-pdv.aberto"));
    const painelPesquisaAberto = document.getElementById("painelPesquisaMercadoria")?.classList.contains("aberto");
    const modalQtdAberto = document.getElementById("modalQtdPesquisa")?.classList.contains("ativo");
    const editorMobileAberto = document.getElementById("editorLancamentoMobile")?.classList.contains("aberto");
    const modalAberturaCaixa = document.getElementById("modalAberturaCaixa");
    const aberturaCaixaAberta = modalAberturaCaixa && getComputedStyle(modalAberturaCaixa).display !== "none";

    if(popupPixAberto || ajustesAberto || modalAberto || painelPesquisaAberto || modalQtdAberto || editorMobileAberto || aberturaCaixaAberta) return false;
    if(ativo === quantidade && !quantidade.readOnly) return false;
    if(ativo === valor && !valor.readOnly) return false;
    if(itemEmDigitacao) return false;
    if(ativo?.closest?.(".sugestao-produto")) return false;
    if(ativo?.closest?.(".select-group")) return false;

    return true;
}

// Alterna o campo de quantidade/preço entre editável e somente leitura.
function liberarCampoMetrica(id, liberado){
    const campo = document.getElementById(id);

    if(!campo) return;

    campo.readOnly = !liberado;
    campo.closest(".metric-card")?.classList.toggle("ativo", liberado);
}

// Define o valor de um campo do formulário pelo id.
function definirValorCampoPdv(id, valor){
    const campo = document.getElementById(id);

    if(!campo) return;

    if("value" in campo){
        campo.value = valor;
        return;
    }

    campo.textContent = valor;
}

// Remove tudo que não for dígito de um valor.
function somenteNumerosPdv(valor){
    return String(valor || "").replace(/\D/g, "");
}

// Converte um texto digitado em número.
function numeroDigitado(valor){
    const texto = String(valor || "").trim();
    const normalizado = texto.includes(",")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto;

    return Number.parseFloat(normalizado) || 0;
}

// Verifica se o produto permite preço livre na venda.
function produtoTemPrecoLivre(produto){
    const cfg = obterConfiguracoesSistema();
    if(normalizarBooleano(cfg.precoLivrePdv, false)) return true;
    return normalizarBooleano(produto?.precoLivre, false);
}

// Atribui um valor a um campo do formulário pelo id, se ele existir.
function atribuirValorCampo(id, valor){
    const campo = document.getElementById(id);

    if(campo){
        campo.value = valor;
    }
}

// Formata um campo numérico decimal enquanto o usuário digita.
function formatarDecimalCampo(valor){
    return numeroDigitado(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Formata um valor de quantidade para exibição.
function formatarQuantidade(valor){
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

// Formata a quantidade de um item do carrinho.
function formatarQuantidadeItem(item){
    return `${formatarQuantidade(item?.qtd)} ${escapar(item?.unidade || "UN")}`;
}

// Formata uma data para exibição no padrão brasileiro.
function formatarData(valor){
    const data = new Date(valor);

    if(Number.isNaN(data.getTime())){
        return "-";
    }

    return data.toLocaleString("pt-BR");
}
