// pdv-configuracoes.js
// Configurações do caixa (visual, proporção de tela, mensagens, tela cheia) e painel de ajustes avançados.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Aplica no body a proporção de tela salva no localStorage.
function aplicarProporcaoTelaPdv(){
    const proporcao = normalizarProporcaoTelaPdv(localStorage.getItem(PROPORCAO_TELA_PDV_KEY));
    document.body.dataset.proporcaoTelaPdv = proporcao;
    atribuirValorCampo("proporcaoTelaPdv", proporcao);
}

// Salva no localStorage a proporção de tela escolhida.
function salvarProporcaoTelaPdv(valor){
    const proporcao = normalizarProporcaoTelaPdv(valor);
    localStorage.setItem(PROPORCAO_TELA_PDV_KEY, proporcao);
    document.body.dataset.proporcaoTelaPdv = proporcao;
}

// Garante que a proporção de tela seja um valor válido.
function normalizarProporcaoTelaPdv(valor){
    return ["auto", "compacta", "confortavel", "ampla"].includes(valor) ? valor : "auto";
}

// Lê as configurações do sistema (via configuracoes.js) já normalizadas para o PDV.
function obterConfiguracoesSistema(){
    let configuracoes;

    if(window.ConfiguracoesSistema?.obter){
        configuracoes = {
            ...CONFIGURACOES_PADRAO_PDV,
            ...window.ConfiguracoesSistema.obter()
        };
    }else{
        const base = lerJson(BASE_KEY, {});
        const configuracoesBase = base && typeof base.configuracoes === "object" ? base.configuracoes : {};
        const configuracoesAvulsas = lerJson("configuracoesSistema", {});

        configuracoes = {
            ...CONFIGURACOES_PADRAO_PDV,
            ...configuracoesBase,
            ...configuracoesAvulsas
        };
    }

    return normalizarConfiguracoesCaixaPdv(configuracoes);
}

// Aplica os valores padrão do PDV sobre as configurações carregadas.
function normalizarConfiguracoesCaixaPdv(configuracoes){
    const cfg = {
        ...CONFIGURACOES_PADRAO_PDV,
        ...(configuracoes || {})
    };

    cfg.emitirNfce = cfg.emitirNfce !== false && cfg.pdvVendasFiscais !== false;
    cfg.solicitarQuantidadePdv = cfg.solicitarQuantidadePdv !== false && cfg.pdvNaoSolicitarQuantidade !== true;
    cfg.usarVendedor = cfg.usarVendedor === true;
    cfg.permitirGuardarVendas = cfg.permitirGuardarVendas !== false;
    cfg.pdvPesquisarComEnter = cfg.pdvPesquisarComEnter !== false;
    cfg.pdvConsultarPorReferencia = cfg.pdvConsultarPorReferencia !== false;
    cfg.pdvVendasFiscais = cfg.pdvVendasFiscais !== false;
    cfg.pdvVendasNaoFiscais = cfg.pdvVendasNaoFiscais !== false;
    cfg.pdvTimeoutPix = Number(cfg.pdvTimeoutPix) || 120;

    [
        "pdvValorMaximoItem",
        "pdvQtdMaximaVenda",
        "pdvDescontoMaximo",
        "pdvQtdUltimasCompras",
        "pdvMaximoCaixa",
        "pdvTempoSessao",
        "pdvValorMaximoSemCpf",
        "pdvValorMaximoSemDest",
        "pdvCotacaoPeso",
        "pdvCotacaoDolar",
        "pdvDiasValidade",
        "pdvCashbackValorMinimo",
        "pdvCashbackPercentual",
        "pdvCashbackDiasExpiracao"
    ].forEach(function(campo) {
        cfg[campo] = Number(cfg[campo]) || 0;
    });

    return cfg;
}

// Aplica no DOM as configurações atuais (visual, recursos, mensagens).
function aplicarConfiguracoesPdv(){
    aplicarVisualConfiguradoCaixaPdv();
    aplicarMensagensPdv();
    atualizarRecursoGuardarVendas();
    atualizarRecursoOrcamentoPdv();
    atualizarRecursoPedidosVendaPdv();
    atualizarRecursoVendedorPdv();
    atualizarBotoesDocumentoFinalizacaoPdv();
    atualizarAtalhosConfiguradosCaixaPdv();
}

// Aplica tema/cores configurados no caixa.
function aplicarVisualConfiguradoCaixaPdv(){
    const cfg = obterConfiguracoesSistema();
    const raiz = document.documentElement;
    const corBotao = normalizarCorHexPdv(cfg.pdvCorBotoes, CONFIGURACOES_PADRAO_PDV.pdvCorBotoes);
    const corTexto = normalizarCorHexPdv(cfg.pdvCorTextos, CONFIGURACOES_PADRAO_PDV.pdvCorTextos);
    const corVenda = normalizarCorHexPdv(cfg.pdvCorVenda, CONFIGURACOES_PADRAO_PDV.pdvCorVenda);
    const temaEscuro = cfg.pdvTemaVenda === "escuro";

    raiz.style.setProperty("--azul", corBotao);
    raiz.style.setProperty("--azul-botao-pdv", corBotao);
    raiz.style.setProperty("--azul-botao-pdv-hover", ajustarCorHexPdv(corBotao, -18));
    raiz.style.setProperty("--azul-escuro", ajustarCorHexPdv(corBotao, -32));
    raiz.style.setProperty("--azul-vivo", corVenda);
    raiz.style.setProperty("--azul-borda", ajustarCorHexPdv(corBotao, 62));
    raiz.style.setProperty("--texto", corTexto);
    raiz.style.setProperty("--fundo", temaEscuro ? "#17202b" : "#edf1f5");
    document.body.dataset.temaCaixaPdv = temaEscuro ? "escuro" : "claro";
}

// Valida/normaliza uma cor hexadecimal com fallback.
function normalizarCorHexPdv(valor, fallback){
    const texto = String(valor || "").trim();
    return /^#[0-9a-f]{6}$/i.test(texto) ? texto : fallback;
}

// Clareia/escurece uma cor hex por um percentual.
function ajustarCorHexPdv(hex, percentual){
    const limiar = Math.max(-100, Math.min(100, Number(percentual) || 0));
    const valor = hex.replace("#", "");
    const canais = [0, 2, 4].map(function(indice) {
        const canal = parseInt(valor.slice(indice, indice + 2), 16);
        const ajustado = limiar >= 0
            ? canal + (255 - canal) * (limiar / 100)
            : canal * (1 + limiar / 100);
        return Math.max(0, Math.min(255, Math.round(ajustado))).toString(16).padStart(2, "0");
    });
    return "#" + canais.join("");
}

// Atualiza rótulos de atalho configurados no caixa.
function atualizarAtalhosConfiguradosCaixaPdv(){
    const cfg = obterConfiguracoesSistema();
    document.body.classList.toggle("pdv-atalhos-ocultos", cfg.pdvMostrarBotoesAtalho === false);
    document.body.classList.toggle("pdv-item-simples", cfg.pdvItemDetalhado === false);
}

// Aplica a mensagem de boas-vindas configurada no marquee do topo.
function aplicarMensagensPdv(){
    const destino = document.getElementById("mensagensPdvMarquee");
    if(!destino) return;

    const mensagens = normalizarMensagensPdv(obterConfiguracoesSistema().pdvMensagens);
    destino.textContent = mensagens.join("   •   ");
}

// Normaliza a lista de mensagens do sistema.
function normalizarMensagensPdv(valor){
    const mensagens = String(valor || "")
        .split(/\r?\n/)
        .map(function(mensagem) {
            return mensagem.trim();
        })
        .filter(Boolean);

    return mensagens.length ? mensagens : ["Seja Bem-Vindo(a)!!"];
}

// Indica se a busca por referência está habilitada.
function configuracaoPermiteReferenciaPdv(){
    return obterConfiguracoesSistema().pdvConsultarPorReferencia !== false;
}

// Preenche o painel de ajustes avançados com os valores salvos.
function _carregarConfiguracoesAvancadasCaixa(){
    const cfg = obterConfiguracoesSistema();
    const check = function(id, val){ const el = document.getElementById(id); if(el) el.checked = !!val; };
    const val   = function(id, v){  const el = document.getElementById(id); if(el) el.value  = v ?? ""; };

    check("cfgVendasFiscais",     cfg.pdvVendasFiscais !== false);
    check("cfgVendasNaoFiscais",  cfg.pdvVendasNaoFiscais !== false);
    check("cfgControleImpressao", !!cfg.pdvControleImpressao);
    check("cfgForcaContingencia", !!cfg.pdvForcaContingencia);
    check("cfgTelaCheia",         !!document.fullscreenElement);
    val("cfgMaquininha",   cfg.pdvMaquininha    || "");
    val("cfgTimeoutPix",   cfg.pdvTimeoutPix    || "120");
}

// Salva as configurações avançadas do caixa.
function salvarConfiguracoesAvancadasCaixa(){
    const get = function(id){ return document.getElementById(id); };
    const dados = {
        pdvVendasFiscais:     get("cfgVendasFiscais")?.checked !== false,
        pdvVendasNaoFiscais:  get("cfgVendasNaoFiscais")?.checked !== false,
        pdvControleImpressao: !!get("cfgControleImpressao")?.checked,
        pdvForcaContingencia: !!get("cfgForcaContingencia")?.checked,
        pdvMaquininha:        get("cfgMaquininha")?.value || "",
        pdvTimeoutPix:        Number(get("cfgTimeoutPix")?.value) || 120
    };

    window.ConfiguracoesSistema?.salvar?.(dados);
    aplicarConfiguracoesFinalizacaoPdv();

    // Tela cheia
    const querTelaCheia = !!get("cfgTelaCheia")?.checked;
    if(querTelaCheia && !document.fullscreenElement){
        document.documentElement.requestFullscreen?.().catch(function(){});
    } else if(!querTelaCheia && document.fullscreenElement){
        document.exitFullscreen?.();
    }

    mostrarAvisoSistema("Configurações salvas e aplicadas.");
    setTimeout(fecharAjustes, 900);
}

// Liga/desliga o modo tela cheia do PDV.
function alternarTelaCheia(ligar){
    if(ligar && !document.fullscreenElement){
        document.documentElement.requestFullscreen?.().catch(function(){});
    } else if(!ligar && document.fullscreenElement){
        document.exitFullscreen?.();
    }
}

// Mostra o usuário/vendedor logado no cabeçalho.
function atualizarOperadorLogadoPdv(){
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const nome = usuario.nome || usuario.login || "Supervisor";
    const vendedor = vendedorPdvAtual?.nome || nome;
    definirTexto("usuarioLogadoPdv", "Usuário: " + nome);
    definirTexto("vendedorLogadoPdv", "Vendedor: " + vendedor);
}

// Aplica as configurações fiscais na tela de finalização.
function aplicarConfiguracoesFinalizacaoPdv(){
    const configuracoes = obterConfiguracoesSistema();
    const botaoNfce = document.querySelector('#tipoDocumentoVenda .opcao-finalizacao[data-valor="NFC-e"]');
    const botaoPedido = document.querySelector('#tipoDocumentoVenda .opcao-finalizacao[data-valor="Pedido"]');
    const nfceAtiva = configuracoes.emitirNfce !== false && configuracoes.pdvVendasFiscais !== false;
    const pedidoAtivo = configuracoes.pdvVendasNaoFiscais !== false;

    if(botaoNfce){
        botaoNfce.innerHTML = "<strong>Cupom Fiscal</strong><span>(NFC-e)</span>";
        botaoNfce.disabled = !nfceAtiva;
        botaoNfce.classList.toggle("desabilitado", !nfceAtiva);
        botaoNfce.title = nfceAtiva ? "" : "NFC-e desativada nas configurações do sistema";
    }

    if(botaoPedido){
        botaoPedido.innerHTML = "<strong>N\u00E3o fiscal</strong><span>(Pedido)</span>";
        botaoPedido.disabled = !pedidoAtivo;
        botaoPedido.classList.toggle("desabilitado", !pedidoAtivo);
        botaoPedido.title = pedidoAtivo ? "" : "Pedido desativado nas configurações do sistema";
    }

    if(!valorOpcaoAtiva("tipoDocumentoVenda")){
        if(nfceAtiva && botaoNfce){
            botaoNfce.classList.add("ativo");
        }else if(pedidoAtivo && botaoPedido){
            botaoPedido.classList.add("ativo");
        }
    }

    if(valorOpcaoAtiva("tipoDocumentoVenda")){
        if(descontoPermitido()){
            document.getElementById("grupoDescontoVenda")?.classList.remove("oculto");
        }

        document.getElementById("grupoPagamentoVenda")?.classList.remove("oculto");
        atualizarTotaisFinalizacao();
    }
}

