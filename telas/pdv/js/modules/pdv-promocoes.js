// pdv-promocoes.js
// Tabelas de preço, preço por tabela/quantidade e recálculo de preços promocionais do carrinho.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Verifica se o produto possui preço numa tabela específica.
function produtoPossuiTabelaPreco(produto, tabelaId){
    const tabelaProduto = produto?.tabelasPreco?.[tabelaId];

    return normalizarBooleano(tabelaProduto?.ativa, false) && numero(tabelaProduto?.preco) > 0;
}

// Carrega as tabelas de preço ativas para o caixa.
function carregarTabelasPrecoPdv(){
    const select = document.getElementById("tabelaPrecoFechamento");

    if(!select) return;

    const valorAtual = tabelaPrecoPdvAtual || "";
    const tabelas = obterBase().tabelasPreco.filter(function(tabela) {
        return tabela.ativa !== false;
    });

    select.innerHTML = `<option value="">Padrão</option>` + tabelas.map(function(tabela) {
        return `<option value="${escapar(tabela.id)}">${escapar(tabela.nome)}</option>`;
    }).join("");

    const existe = tabelas.some(function(tabela) { return tabela.id === valorAtual; });
    select.value = existe ? valorAtual : "";
    tabelaPrecoPdvAtual = select.value || "";
}

// Verifica se o caixa tem acesso a uma tabela de preço.
function _tabelaPermitida(tabela) {
    // "pagamento" é ajuste percentual na forma de pgto, nunca preço direto
    var tipo = tabela.tipo || "normal";
    if (tipo === "pagamento") return false;
    // "cliente" só se aplica quando o cliente específico estiver na venda
    if (tipo === "cliente") {
        return Boolean(clienteVenda && clienteVenda.id && clienteVenda.id === tabela.clienteId);
    }
    // "normal": aplica sempre (regra de quantidade verificada separadamente)
    return true;
}

// Resolve o preço final de um item considerando tabela e quantidade.
function resolverPrecoPdv(item, quantidade) {
    var base = obterBase();
    var cfgPdv = obterConfiguracoesSistema();
    var desativarPrecoPorQuantidade = cfgPdv.pdvDesativarQtdPorPreco === true;
    var produto = (base.mercadorias || []).find(function(m) { return m.id === item.id; }) || item;
    var qty = quantidade || 1;
    var precoOriginal = numero(item.precoPromocional) > 0 ? numero(item.precoPromocional) : numero(item.precoVenda);

    // 1. Tabela padrão do cliente (atribuída explicitamente ao cadastro do cliente)
    if (clienteVenda && clienteVenda.tabelaPrecoPadraoId) {
        var tabCliente = (base.tabelasPreco || []).find(function(t) { return t.id === clienteVenda.tabelaPrecoPadraoId; });
        if (tabCliente && tabCliente.ativa !== false && tabCliente.tipo !== "pagamento") {
            if (!(desativarPrecoPorQuantidade && numero(tabCliente.regraQuantidade) > 0)) {
                var p1 = precoTabelaAtiva(produto, clienteVenda.tabelaPrecoPadraoId, qty);
                if (p1 > 0) {
                    return { preco: p1, tabelaId: clienteVenda.tabelaPrecoPadraoId, porQuantidade: numero(tabCliente.regraQuantidade) > 0, precoOriginal: precoOriginal };
                }
            }
        }
    }
    // 2. Tabela selecionada globalmente (sem regra de quantidade), respeitando tipo
    if (tabelaPrecoPdvAtual) {
        var tabela2 = (base.tabelasPreco || []).find(function(t) { return t.id === tabelaPrecoPdvAtual; });
        if (tabela2 && _tabelaPermitida(tabela2) && !(tabela2.regraQuantidade > 0)) {
            var p2 = precoTabelaAtiva(produto, tabelaPrecoPdvAtual, qty);
            if (p2 > 0) {
                return { preco: p2, tabelaId: tabelaPrecoPdvAtual, porQuantidade: false, precoOriginal: precoOriginal };
            }
        }
    }
    // 3. Auto-detecta tabelas próprias do produto, respeitando tipo e regras
    if (produto.tabelasPreco) {
        var tabelasGlobais = base.tabelasPreco || [];
        var melhor = 0, melhorId = null, melhorPorQtd = false;
        Object.keys(produto.tabelasPreco).forEach(function(tabelaId) {
            var tp = produto.tabelasPreco[tabelaId];
            if (!tp || !tp.ativa || !(numero(tp.preco) > 0)) return;
            var tabela = tabelasGlobais.find(function(t) { return t.id === tabelaId; });
            if (!tabela || tabela.ativa === false) return;
            if (!_tabelaPermitida(tabela)) return; // respeita tipo da tabela
            var regra = numero(tabela.regraQuantidade);
            if (desativarPrecoPorQuantidade && regra > 0) return;
            if (regra > 0 && qty < regra) return;
            var preco = numero(tp.preco);
            if (preco > 0 && (melhor === 0 || preco < melhor)) {
                melhor = preco;
                melhorId = tabelaId;
                melhorPorQtd = regra > 0;
            }
        });
        if (melhor > 0) {
            return { preco: melhor, tabelaId: melhorId, porQuantidade: melhorPorQtd, precoOriginal: precoOriginal };
        }
    }
    // 4. Preço padrão
    return { preco: precoOriginal, tabelaId: null, porQuantidade: false, precoOriginal: precoOriginal };
}

// Retorna o nome de exibição de uma tabela de preço.
function obterNomeTabela(tabelaId) {
    if (!tabelaId) return "";
    var tabela = (obterBase().tabelasPreco || []).find(function(t) { return t.id === tabelaId; });
    return tabela ? tabela.nome : tabelaId;
}

// Retorna o preço do produto na tabela ativa.
function precoTabelaAtiva(produto, tabelaId, quantidade) {
    if (!tabelaId || !produto) return 0;
    const tp = produto.tabelasPreco && produto.tabelasPreco[tabelaId];
    if (!tp || !tp.ativa || !(tp.preco > 0)) return 0;
    const tabelas = obterBase().tabelasPreco || [];
    const tabela  = tabelas.find(function(t) { return t.id === tabelaId; });
    if (!tabela || tabela.ativa === false) return 0;
    const regra = tabela.regraQuantidade || 0;
    if (regra > 0 && quantidade < regra) return 0;
    return numero(tp.preco);
}

// Recalcula os preços do carrinho após trocar de tabela.
function recalcularPrecosTabelaCarrinho() {
    if (carrinhoVenda.length === 0) return;
    var base  = obterBase();
    var mudou = false;

    carrinhoVenda.forEach(function(item) {
        if (item.tabelaDesativadaManualmente) return;
        var produto = (base.mercadorias || []).find(function(m) { return m.id === item.id; });
        if (!produto) return;

        var resolucao = resolverPrecoPdv(produto, item.qtd);
        var novoPreco = resolucao.preco;

        if (novoPreco > 0 && novoPreco !== item.precoUnitario) {
            item.precoUnitario = novoPreco;
            item.tabelaAplicadaId = resolucao.tabelaId;
            item.porQuantidade = resolucao.porQuantidade;
            item.precoOriginal = resolucao.precoOriginal;
            mudou = true;
        }
    });

    if (mudou) {
        atualizarTela();
        notificar("Preços atualizados pela tabela.", "sucesso");
    }
}

// Aplica preço promocional automático por faixa de quantidade.
function precoTabelaAutoQuantidade(produto, quantidade) {
    if (obterConfiguracoesSistema().pdvDesativarQtdPorPreco === true) return 0;
    if (!produto || !produto.tabelasPreco) return 0;
    var tabelasGlobais = obterBase().tabelasPreco || [];
    var melhor = 0;
    Object.keys(produto.tabelasPreco).forEach(function(tabelaId) {
        var tp = produto.tabelasPreco[tabelaId];
        if (!tp || !tp.ativa || !(numero(tp.preco) > 0)) return;
        var tabela = tabelasGlobais.find(function(t) { return t.id === tabelaId; });
        if (!tabela || tabela.ativa === false) return;
        var regra = numero(tabela.regraQuantidade);
        if (regra <= 0 || quantidade < regra) return;
        var preco = numero(tp.preco);
        // Em caso de múltiplas tabelas, usa o menor preço
        if (preco > 0 && (melhor === 0 || preco < melhor)) melhor = preco;
    });
    return melhor;
}

// Verifica se a quantidade do item muda o preço da tabela.
function verificarPrecoTabelaQuantidade(produto, quantidade) {
    if (obterConfiguracoesSistema().pdvDesativarQtdPorPreco === true) return 0;
    const base    = obterBase();
    const prodRef = (base.mercadorias || []).find(function(m) { return m.id === produto.id; }) || produto;
    // Tabela do cliente
    if (clienteVenda && clienteVenda.tabelaPrecoPadraoId) {
        const p = precoTabelaAtiva(prodRef, clienteVenda.tabelaPrecoPadraoId, quantidade);
        if (p > 0) return p;
    }
    // Tabela do PDV com regra de quantidade
    if (tabelaPrecoPdvAtual) {
        const p = precoTabelaAtiva(prodRef, tabelaPrecoPdvAtual, quantidade);
        if (p > 0) return p;
    }
    // Tabelas automáticas por quantidade ativas no próprio produto
    const pAuto = precoTabelaAutoQuantidade(prodRef, quantidade);
    if (pAuto > 0) return pAuto;
    return 0;
}

// Retorna o preço final de um item do carrinho.
function precoPdv(item){
    return resolverPrecoPdv(item, 1).preco;
}

