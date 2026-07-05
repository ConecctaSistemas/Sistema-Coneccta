// produto-service.js
// Acesso a dados de produto: catálogo, normalização e baixa/devolução de estoque na base.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Carrega a lista de produtos da base.
function obterMercadorias(){
    return obterBase().mercadorias
        .map(normalizarProdutoPdv)
        .filter(function(item) {
            return item.ativo !== false;
        });
}

// Normaliza a estrutura de um produto vindo da base.
function normalizarProdutoPdv(item){
    return {
        ...item,
        ativo: normalizarBooleano(item.ativo, true),
        precoLivre: normalizarBooleano(item.precoLivre, false),
        vendaFracionada: normalizarBooleano(item.vendaFracionada, false),
        tabelasPreco: item.tabelasPreco && typeof item.tabelasPreco === "object" ? item.tabelasPreco : {}
    };
}

// Decrementa o estoque dos itens vendidos.
function baixarEstoque(base, itens){
    if(obterConfiguracoesSistema().controleEstoque === false) return;

    itens.forEach(function(itemVenda) {
        const produto = base.mercadorias.find(function(item) {
            return item.id === itemVenda.id;
        });

        if(produto){
            produto.estoque = Math.max(0, numero(produto.estoque) - numero(itemVenda.qtd));
            produto.atualizadoEm = new Date().toISOString();
        }
    });
}

// Incrementa o estoque dos itens cancelados/devolvidos.
function devolverEstoque(base, itens){
    if(obterConfiguracoesSistema().controleEstoque === false) return;

    itens.forEach(function(itemVenda) {
        const produto = base.mercadorias.find(function(item) {
            return item.id === itemVenda.id;
        });

        if(produto){
            produto.estoque = numero(produto.estoque) + numero(itemVenda.qtd);
            produto.atualizadoEm = new Date().toISOString();
        }
    });
}

// Fachada para uso futuro (mesmas funções acima, sem alterar nenhum call-site existente).
window.ProdutoService = {
    obterMercadorias,
    normalizarProdutoPdv,
    baixarEstoque,
    devolverEstoque
};
