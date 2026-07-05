// venda-service.js
// Gravação de dados fiscais da venda na base (sequência e campos fiscais da NFC-e).
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Atualiza os campos fiscais gravados da venda na base.
function _atualizarFiscalVenda(vendaId, campos){
    const base = obterBase();
    const idx = base.vendas.findIndex(function(v){ return v.id === vendaId; });
    if(idx < 0) return;
    base.vendas[idx] = Object.assign({}, base.vendas[idx], campos);

    if(campos.nfceChaveAcesso && base.vendas[idx].pedidoOrigemId){
        const idxPedido = (base.pedidosVenda || []).findIndex(function(p){ return p.id === base.vendas[idx].pedidoOrigemId; });
        if(idxPedido >= 0) base.pedidosVenda[idxPedido].chaveNfce = campos.nfceChaveAcesso;
    }

    salvarBase(base);
}

// Incrementa a sequência numérica de NFC-e configurada.
function _incrementarSequenciaNfce(config){
    const proximo = Number(config.fiscalProximoNfce || 1) + 1;
    window.ConfiguracoesSistema?.salvar?.({ fiscalProximoNfce: String(proximo) });
}

// Fachada para uso futuro (mesmas funções acima, sem alterar nenhum call-site existente).
window.VendaService = {
    _atualizarFiscalVenda,
    _incrementarSequenciaNfce
};
