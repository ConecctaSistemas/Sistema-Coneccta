/* relatorio-produtosvendidos.js */
/* Dependencia propria do relatorio de Produtos Mais Vendidos. Busca via
   window.ErpApi.relatorioProdutosMaisVendidos (hoje le do localStorage no modo mock;
   quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioProdutosVendidos")?.addEventListener("submit", gerarRelatorioProdutosVendidos);
});

async function gerarRelatorioProdutosVendidos(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioProdutosVendidos").value;
    const dataFim = document.getElementById("dataFimProdutosVendidos").value;
    const limite = Number(document.getElementById("limiteProdutosVendidos").value) || 20;
    const incluirValor = document.getElementById("incluirValorProdutosVendidos").checked;

    definirCarregandoProdutosVendidos(true);

    try{
        const produtos = await window.ErpApi.relatorioProdutosMaisVendidos(dataInicio || undefined, dataFim || undefined, limite);

        const colunas = ["Posição", "Produto", "Quantidade vendida"];
        if(incluirValor) colunas.push("Valor total vendido");

        const linhas = produtos.map(function(produto, indice) {
            const linha = [
                String(indice + 1),
                produto.descricao || produto.nome || "-",
                formatarQuantidade(produto.qtd ?? produto.quantidade ?? 0)
            ];
            if(incluirValor) linha.push(formatarMoeda(produto.total ?? 0));
            return linha;
        });

        const totalVendido = somar(produtos, "total");
        const totalUnidades = produtos.reduce(function(total, p) { return total + numero(p.qtd ?? p.quantidade); }, 0);
        const resumo = [
            { rotulo: "Produtos no ranking", valor: String(produtos.length) },
            { rotulo: "Unidades vendidas", valor: formatarQuantidade(totalUnidades) },
            { rotulo: "Valor total vendido", valor: formatarMoeda(totalVendido) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Produtos Mais Vendidos",
            periodoTexto: montarTextoPeriodoProdutosVendidos(dataInicio, dataFim, limite),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoProdutosVendidos(false);
    }
}

function montarTextoPeriodoProdutosVendidos(inicio, fim, limite){
    const partes = [];
    if(!inicio && !fim) partes.push("Todos os registros");
    else if(inicio && fim) partes.push(`Período de ${formatarData(inicio)} até ${formatarData(fim)}`);
    else if(inicio) partes.push(`A partir de ${formatarData(inicio)}`);
    else partes.push(`Até ${formatarData(fim)}`);

    partes.push(`Top ${limite} produtos`);
    return partes.join(" · ");
}

function definirCarregandoProdutosVendidos(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
