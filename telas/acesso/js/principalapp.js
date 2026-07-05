document.addEventListener("DOMContentLoaded", atualizarPainelPrincipal);
window.addEventListener("storage", atualizarPainelPrincipal);

function atualizarPainelPrincipal(){
    const base = obterBase();
    const vendas = Array.isArray(base.vendas) ? base.vendas : [];
    const hoje = new Date().toISOString().slice(0, 10);
    const vendasHoje = vendas.filter(function(venda) {
        return String(venda.data || "").slice(0, 10) === hoje;
    });

    definirTexto("clientes", base.clientes.length);
    definirTexto("produtos", base.mercadorias.length);
    definirTexto("vendas", vendasHoje.length);
    definirTexto("caixa", formatarMoedaRS(somar(vendasHoje, "total")));
}
