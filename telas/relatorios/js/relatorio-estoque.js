/* relatorio-estoque.js */
/* Dependencia propria do relatorio de Estoque. Busca via window.ErpApi.relatorioEstoque
   (hoje le do localStorage no modo mock; quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioEstoque")?.addEventListener("submit", gerarRelatorioEstoque);
});

async function gerarRelatorioEstoque(evento){
    evento.preventDefault();

    const apenasAbaixoMinimo = document.getElementById("apenasAbaixoMinimoEstoque").checked;
    const incluirCusto = document.getElementById("incluirCustoEstoque").checked;

    definirCarregandoEstoque(true);

    try{
        const mercadorias = await window.ErpApi.relatorioEstoque(apenasAbaixoMinimo);

        const colunas = ["Código", "Descrição", "Categoria", "Estoque", "Estoque mínimo", "Preço de venda"];
        if(incluirCusto) colunas.push("Preço de custo");

        const linhas = mercadorias.map(function(mercadoria) {
            const linha = [
                mercadoria.codigo || "-",
                mercadoria.descricao || mercadoria.nome || "-",
                mercadoria.categoria || "-",
                formatarQuantidade(mercadoria.estoque ?? 0),
                formatarQuantidade(mercadoria.estoqueMinimo ?? 0),
                formatarMoeda(mercadoria.precoVenda ?? 0)
            ];
            if(incluirCusto) linha.push(formatarMoeda(mercadoria.precoCusto ?? 0));
            return linha;
        });

        const valorTotalEstoque = mercadorias.reduce(function(total, m) {
            return total + numero(m.estoque) * numero(m.precoVenda);
        }, 0);
        const abaixoMinimo = mercadorias.filter(function(m) {
            return numero(m.estoque) <= numero(m.estoqueMinimo || 0) && numero(m.estoqueMinimo || 0) > 0;
        }).length;

        const resumo = [
            { rotulo: "Itens no relatório", valor: String(mercadorias.length) },
            { rotulo: "Valor total em estoque", valor: formatarMoeda(valorTotalEstoque) },
            { rotulo: "Itens abaixo do mínimo", valor: String(abaixoMinimo) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Relatório de Estoque",
            periodoTexto: apenasAbaixoMinimo ? "Somente produtos abaixo do estoque mínimo" : "Todos os produtos cadastrados",
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoEstoque(false);
    }
}

function definirCarregandoEstoque(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
