/* relatorio-curvaabc.js */
/* Dependencia propria do relatorio de Curva ABC. Busca via
   window.ErpApi.relatorioCurvaAbc (hoje le do localStorage no modo mock;
   quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioCurvaAbc")?.addEventListener("submit", gerarRelatorioCurvaAbc);
});

async function gerarRelatorioCurvaAbc(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioCurvaAbc").value;
    const dataFim = document.getElementById("dataFimCurvaAbc").value;

    definirCarregandoCurvaAbc(true);

    try{
        const produtos = await window.ErpApi.relatorioCurvaAbc(dataInicio || undefined, dataFim || undefined);

        const valorTotal = produtos.reduce(function(soma, p) { return soma + numero(p.total); }, 0);
        let acumulado = 0;
        let countA = 0, countB = 0, countC = 0;

        const linhas = produtos.map(function(produto) {
            acumulado += numero(produto.total);
            const percentual = valorTotal > 0 ? (numero(produto.total) / valorTotal) * 100 : 0;
            const percentualAcumulado = valorTotal > 0 ? (acumulado / valorTotal) * 100 : 0;
            let classe = "C";
            if(percentualAcumulado <= 80) classe = "A";
            else if(percentualAcumulado <= 95) classe = "B";

            if(classe === "A") countA++;
            else if(classe === "B") countB++;
            else countC++;

            return [
                produto.descricao || "-",
                formatarQuantidade(produto.qtd),
                formatarMoeda(produto.total),
                percentual.toFixed(1) + "%",
                percentualAcumulado.toFixed(1) + "%",
                classe
            ];
        });

        const colunas = ["Produto", "Quantidade vendida", "Valor vendido", "% do total", "% acumulado", "Classe"];

        const resumo = [
            { rotulo: "Valor total vendido", valor: formatarMoeda(valorTotal) },
            { rotulo: "Produtos classe A", valor: String(countA) },
            { rotulo: "Produtos classe B", valor: String(countB) },
            { rotulo: "Produtos classe C", valor: String(countC) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Curva ABC",
            periodoTexto: montarTextoPeriodoCurvaAbc(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoCurvaAbc(false);
    }
}

function montarTextoPeriodoCurvaAbc(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoCurvaAbc(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
