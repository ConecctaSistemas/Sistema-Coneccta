/* relatorio-nfentradas.js */
/* Dependencia propria do relatorio de NF de Entradas. Busca via
   window.ErpApi.listarEntradas (mesma listagem usada em telas/notasfiscais/entradas-notas.html;
   hoje le do localStorage no modo mock - quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioNfEntradas")?.addEventListener("submit", gerarRelatorioNfEntradas);
});

async function gerarRelatorioNfEntradas(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioNfEntradas").value;
    const dataFim = document.getElementById("dataFimNfEntradas").value;
    const status = document.getElementById("statusNfEntradas").value;

    definirCarregandoNfEntradas(true);

    try{
        const notas = await window.ErpApi.listarEntradas(status || undefined, dataInicio || undefined, dataFim || undefined);

        const colunas = ["Data", "Número", "Fornecedor", "Valor", "Status"];
        const linhas = notas.map(function(nota) {
            const dataNota = nota.emissao || nota.dataEmissao || nota.data;
            const valor = numero(nota.totais?.nota ?? nota.valorTotal ?? nota.valor);
            return [
                formatarData(dataNota),
                nota.numero || "-",
                nota.fornecedor?.nome || nota.fornecedorNome || "-",
                formatarMoeda(valor),
                rotuloStatusNfEntrada(nota.status)
            ];
        });

        const valorTotal = notas.reduce(function(soma, nota) {
            return soma + numero(nota.totais?.nota ?? nota.valorTotal ?? nota.valor);
        }, 0);

        const resumo = [
            { rotulo: "Notas no período", valor: String(notas.length) },
            { rotulo: "Valor total", valor: formatarMoeda(valorTotal) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "NF de Entradas",
            periodoTexto: montarTextoPeriodoNfEntradas(dataInicio, dataFim, status),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoNfEntradas(false);
    }
}

function rotuloStatusNfEntrada(status){
    if(status === "pendente") return "Pendente";
    if(status === "conferida") return "Conferida";
    if(status === "confirmada") return "Confirmada";
    return status || "-";
}

function montarTextoPeriodoNfEntradas(inicio, fim, status){
    const partes = [];
    if(!inicio && !fim) partes.push("Todos os registros");
    else if(inicio && fim) partes.push(`Período de ${formatarData(inicio)} até ${formatarData(fim)}`);
    else if(inicio) partes.push(`A partir de ${formatarData(inicio)}`);
    else partes.push(`Até ${formatarData(fim)}`);

    if(status) partes.push(`Status: ${rotuloStatusNfEntrada(status)}`);
    return partes.join(" · ");
}

function definirCarregandoNfEntradas(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
