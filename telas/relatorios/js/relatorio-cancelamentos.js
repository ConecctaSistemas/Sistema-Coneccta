/* relatorio-cancelamentos.js */
/* Dependencia propria do relatorio de Cancelamentos. Busca via window.ErpApi.relatorioCancelamentos
   (hoje le do localStorage no modo mock; quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioCancelamentos")?.addEventListener("submit", gerarRelatorioCancelamentos);
});

async function gerarRelatorioCancelamentos(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioCancelamentos").value;
    const dataFim = document.getElementById("dataFimCancelamentos").value;
    const incluirMotivo = document.getElementById("incluirMotivoCancelamentos").checked;

    definirCarregandoCancelamentos(true);

    try{
        const vendas = await window.ErpApi.relatorioCancelamentos(dataInicio || undefined, dataFim || undefined);

        const colunas = ["Data do cancelamento", "Documento", "Cliente", "Total"];
        if(incluirMotivo) colunas.push("Motivo");

        const linhas = vendas.map(function(venda) {
            const linha = [
                formatarData(venda.canceladaEm || venda.data),
                venda.documento || "-",
                venda.cliente?.nome || "Consumidor final",
                formatarMoeda(venda.total)
            ];
            if(incluirMotivo) linha.push(venda.motivoCancelamento || venda.motivo || "-");
            return linha;
        });

        const totalCancelado = somar(vendas, "total");
        const resumo = [
            { rotulo: "Cancelamentos no período", valor: String(vendas.length) },
            { rotulo: "Valor total cancelado", valor: formatarMoeda(totalCancelado) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Relatório de Cancelamentos",
            periodoTexto: montarTextoPeriodoCancelamentos(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoCancelamentos(false);
    }
}

function montarTextoPeriodoCancelamentos(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoCancelamentos(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
