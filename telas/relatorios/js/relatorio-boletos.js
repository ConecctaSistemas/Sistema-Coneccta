/* relatorio-boletos.js */
/* Dependencia propria do relatorio de Boletos Bancarios. Busca via
   window.ErpApi.listarBoletos (mesma listagem usada em telas/movimento/boleto.html;
   hoje le do localStorage no modo mock - quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioBoletos")?.addEventListener("submit", gerarRelatorioBoletos);
});

async function gerarRelatorioBoletos(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioBoletos").value;
    const dataFim = document.getElementById("dataFimBoletos").value;
    const status = document.getElementById("statusBoletos").value;

    definirCarregandoBoletos(true);

    try{
        const boletos = await window.ErpApi.listarBoletos(status || undefined, undefined, dataInicio || undefined, dataFim || undefined);

        const colunas = ["Cliente", "Número/Nosso número", "Vencimento", "Valor", "Status"];
        const linhas = boletos.map(function(boleto) {
            return [
                boleto.clienteNome || "-",
                boleto.numero || boleto.nossoNumero || "-",
                formatarData(boleto.vencimento),
                formatarMoeda(boleto.valor),
                rotuloStatusBoleto(boleto.status)
            ];
        });

        const valorTotal = somar(boletos, "valor");
        const valorPago = somar(boletos.filter(function(b) { return b.status === "pago"; }), "valor");
        const valorAberto = somar(boletos.filter(function(b) { return b.status !== "pago" && b.status !== "cancelado"; }), "valor");

        const resumo = [
            { rotulo: "Boletos no relatório", valor: String(boletos.length) },
            { rotulo: "Valor total", valor: formatarMoeda(valorTotal) },
            { rotulo: "Valor pago", valor: formatarMoeda(valorPago) },
            { rotulo: "Valor em aberto", valor: formatarMoeda(valorAberto) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Boletos Bancários",
            periodoTexto: montarTextoPeriodoBoletos(dataInicio, dataFim, status),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoBoletos(false);
    }
}

function rotuloStatusBoleto(status){
    if(status === "aberto") return "Em aberto";
    if(status === "pago") return "Pago";
    if(status === "vencido") return "Vencido";
    if(status === "cancelado") return "Cancelado";
    return status || "-";
}

function montarTextoPeriodoBoletos(inicio, fim, status){
    const partes = [];
    if(!inicio && !fim) partes.push("Todos os registros");
    else if(inicio && fim) partes.push(`Vencimento de ${formatarData(inicio)} até ${formatarData(fim)}`);
    else if(inicio) partes.push(`Vencimento a partir de ${formatarData(inicio)}`);
    else partes.push(`Vencimento até ${formatarData(fim)}`);

    if(status) partes.push(`Status: ${rotuloStatusBoleto(status)}`);
    return partes.join(" · ");
}

function definirCarregandoBoletos(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
