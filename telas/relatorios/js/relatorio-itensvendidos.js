/* relatorio-itensvendidos.js */
/* Dependencia propria do relatorio de Itens Vendidos. Busca via
   window.ErpApi.relatorioVendas (a mesma listagem usada no relatorio de Vendas;
   aqui cada item da venda vira uma linha propria). Quando o backend real entrar,
   so a flag ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioItensVendidos")?.addEventListener("submit", gerarRelatorioItensVendidos);
});

async function gerarRelatorioItensVendidos(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioItensVendidos").value;
    const dataFim = document.getElementById("dataFimItensVendidos").value;
    const incluirDesconto = document.getElementById("incluirDescontoItensVendidos").checked;

    definirCarregandoItensVendidos(true);

    try{
        const vendas = await window.ErpApi.relatorioVendas(dataInicio || undefined, dataFim || undefined);

        const colunas = ["Data", "Nº venda", "Produto", "Qtd", "Valor unitário"];
        if(incluirDesconto) colunas.push("Desconto");
        colunas.push("Total");

        const linhas = [];
        vendas.forEach(function(venda) {
            (venda.itens || []).forEach(function(item) {
                const qtd = numero(item.qtd ?? item.quantidade);
                const unitario = numero(item.precoUnitario);
                const total = numero(item.total ?? (unitario * qtd));
                const linha = [
                    formatarData(venda.data),
                    venda.numero || venda.id || "-",
                    item.descricao || item.nome || "-",
                    formatarQuantidade(qtd),
                    formatarMoeda(unitario)
                ];
                if(incluirDesconto) linha.push(formatarMoeda(item.desconto ?? 0));
                linha.push(formatarMoeda(total));
                linhas.push(linha);
            });
        });

        const totalItens = linhas.length;
        const totalQuantidade = vendas.reduce(function(soma, v) {
            return soma + (v.itens || []).reduce(function(s, i) { return s + numero(i.qtd ?? i.quantidade); }, 0);
        }, 0);
        const totalValor = vendas.reduce(function(soma, v) {
            return soma + (v.itens || []).reduce(function(s, i) { return s + numero(i.total ?? (numero(i.precoUnitario) * numero(i.qtd ?? i.quantidade))); }, 0);
        }, 0);

        const resumo = [
            { rotulo: "Itens vendidos", valor: String(totalItens) },
            { rotulo: "Quantidade total", valor: formatarQuantidade(totalQuantidade) },
            { rotulo: "Valor total", valor: formatarMoeda(totalValor) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Itens Vendidos",
            periodoTexto: montarTextoPeriodoItensVendidos(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoItensVendidos(false);
    }
}

function montarTextoPeriodoItensVendidos(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoItensVendidos(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
