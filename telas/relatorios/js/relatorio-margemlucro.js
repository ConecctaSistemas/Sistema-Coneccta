/* relatorio-margemlucro.js */
/* Dependencia propria do relatorio de Margem de Lucro. Busca via
   window.ErpApi.relatorioMargemLucro (hoje le do localStorage no modo mock;
   quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioMargemLucro")?.addEventListener("submit", gerarRelatorioMargemLucro);
});

async function gerarRelatorioMargemLucro(evento){
    evento.preventDefault();

    const categoria = document.getElementById("categoriaMargemLucro").value.trim();
    const ordenarPor = document.getElementById("ordenarMargemLucro").value;
    const somenteSemMargem = document.getElementById("somenteSemMargemLucro").checked;

    definirCarregandoMargemLucro(true);

    try{
        const produtos = await window.ErpApi.relatorioMargemLucro(categoria || undefined);

        let calculados = produtos.map(function(produto) {
            const custo = numero(produto.precoCusto);
            const venda = numero(produto.precoVenda);
            const margemValor = venda - custo;
            const margemPercentual = venda > 0 ? (margemValor / venda) * 100 : 0;
            return { produto, custo, venda, margemValor, margemPercentual };
        });

        if(somenteSemMargem){
            calculados = calculados.filter(function(c) { return c.margemValor <= 0; });
        }

        if(ordenarPor === "margemPercentualDesc"){
            calculados.sort(function(a, b) { return b.margemPercentual - a.margemPercentual; });
        }else if(ordenarPor === "nome"){
            calculados.sort(function(a, b) { return (a.produto.descricao || "").localeCompare(b.produto.descricao || ""); });
        }else{
            calculados.sort(function(a, b) { return a.margemPercentual - b.margemPercentual; });
        }

        const colunas = ["Produto", "Categoria", "Preço de custo", "Preço de venda", "Margem (R$)", "Margem (%)"];
        const linhas = calculados.map(function(c) {
            return [
                c.produto.descricao || c.produto.nome || "-",
                c.produto.categoria || "-",
                formatarMoeda(c.custo),
                formatarMoeda(c.venda),
                formatarMoeda(c.margemValor),
                c.margemPercentual.toFixed(1) + "%"
            ];
        });

        const totalProdutos = calculados.length;
        const margemMedia = totalProdutos
            ? calculados.reduce(function(soma, c) { return soma + c.margemPercentual; }, 0) / totalProdutos
            : 0;
        const produtosNegativos = calculados.filter(function(c) { return c.margemValor <= 0; }).length;

        const resumo = [
            { rotulo: "Produtos no relatório", valor: String(totalProdutos) },
            { rotulo: "Margem média", valor: margemMedia.toFixed(1) + "%" },
            { rotulo: "Produtos sem margem ou com prejuízo", valor: String(produtosNegativos) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Margem de Lucro",
            periodoTexto: categoria ? `Categoria: ${categoria}` : "Todas as categorias",
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoMargemLucro(false);
    }
}

function definirCarregandoMargemLucro(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
