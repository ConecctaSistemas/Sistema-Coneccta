/* relatorio-inventario.js */
/* Dependencia propria do relatorio de Inventario. Busca via
   window.ErpApi.relatorioInventario (hoje le do localStorage no modo mock;
   quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioInventario")?.addEventListener("submit", gerarRelatorioInventario);
});

async function gerarRelatorioInventario(evento){
    evento.preventDefault();

    const categoria = document.getElementById("categoriaInventario").value.trim();
    const somenteComEstoque = document.getElementById("somenteComEstoqueInventario").checked;

    definirCarregandoInventario(true);

    try{
        let produtos = await window.ErpApi.relatorioInventario(categoria || undefined);

        if(somenteComEstoque){
            produtos = produtos.filter(function(p) { return numero(p.estoque) > 0; });
        }

        produtos = produtos.slice().sort(function(a, b) {
            return (a.descricao || "").localeCompare(b.descricao || "");
        });

        const colunas = ["Produto", "Categoria", "Estoque", "Preço custo", "Valor em estoque (custo)", "Preço venda", "Valor em estoque (venda)"];
        const linhas = produtos.map(function(produto) {
            const estoque = numero(produto.estoque);
            const custo = numero(produto.precoCusto);
            const venda = numero(produto.precoVenda);
            return [
                produto.descricao || produto.nome || "-",
                produto.categoria || "-",
                formatarQuantidade(estoque),
                formatarMoeda(custo),
                formatarMoeda(estoque * custo),
                formatarMoeda(venda),
                formatarMoeda(estoque * venda)
            ];
        });

        const valorTotalCusto = produtos.reduce(function(soma, p) { return soma + numero(p.estoque) * numero(p.precoCusto); }, 0);
        const valorTotalVenda = produtos.reduce(function(soma, p) { return soma + numero(p.estoque) * numero(p.precoVenda); }, 0);
        const quantidadeTotal = produtos.reduce(function(soma, p) { return soma + numero(p.estoque); }, 0);

        const resumo = [
            { rotulo: "Produtos no inventário", valor: String(produtos.length) },
            { rotulo: "Unidades em estoque", valor: formatarQuantidade(quantidadeTotal) },
            { rotulo: "Valor total (custo)", valor: formatarMoeda(valorTotalCusto) },
            { rotulo: "Valor total (venda)", valor: formatarMoeda(valorTotalVenda) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Inventário",
            periodoTexto: categoria ? `Categoria: ${categoria}` : "Todas as categorias",
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoInventario(false);
    }
}

function definirCarregandoInventario(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
