/* relatorio-financeiro.js */
/* Dependencia propria do relatorio Financeiro. Busca via window.ErpApi.relatorioFinanceiro
   (hoje le do localStorage no modo mock; quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioFinanceiro")?.addEventListener("submit", gerarRelatorioFinanceiro);
});

async function gerarRelatorioFinanceiro(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioFinanceiro").value;
    const dataFim = document.getElementById("dataFimFinanceiro").value;
    const incluirContasPagar = document.getElementById("incluirContasPagarFinanceiro").checked;
    const incluirContasReceber = document.getElementById("incluirContasReceberFinanceiro").checked;
    const incluirMovimentos = document.getElementById("incluirMovimentosFinanceiro").checked;

    definirCarregandoFinanceiro(true);

    try{
        const dados = await window.ErpApi.relatorioFinanceiro(dataInicio || undefined, dataFim || undefined);
        const movimentos = dados.movimentos || [];
        const contasPagar = dados.contasPagar || [];
        const contasReceber = dados.contasReceber || [];

        const secoes = [];

        if(incluirContasPagar){
            secoes.push({
                titulo: "Contas a pagar",
                colunas: ["Fornecedor", "Descrição", "Vencimento", "Valor", "Status"],
                linhas: contasPagar.map(function(conta) {
                    return [
                        conta.fornecedor || conta.fornecedorNome || "-",
                        conta.descricao || "-",
                        formatarData(conta.vencimento),
                        formatarMoeda(conta.valor ?? conta.saldo ?? 0),
                        conta.status || "-"
                    ];
                })
            });
        }

        if(incluirContasReceber){
            secoes.push({
                titulo: "Contas a receber",
                colunas: ["Cliente", "Descrição", "Vencimento", "Valor", "Status"],
                linhas: contasReceber.map(function(conta) {
                    return [
                        conta.clienteNome || conta.nome || "-",
                        conta.descricao || "-",
                        formatarData(conta.vencimento),
                        formatarMoeda(conta.valor ?? conta.saldo ?? 0),
                        conta.status || "-"
                    ];
                })
            });
        }

        if(incluirMovimentos){
            secoes.push({
                titulo: "Movimentações de caixa",
                colunas: ["Data", "Tipo", "Descrição", "Valor"],
                linhas: movimentos.map(function(mov) {
                    return [
                        formatarData(mov.data),
                        mov.tipo || "-",
                        mov.descricao || "-",
                        formatarMoeda(mov.valor ?? 0)
                    ];
                })
            });
        }

        const totalPagar = somar(contasPagar, "valor");
        const totalReceber = somar(contasReceber, "valor");
        const resumo = [
            { rotulo: "Total a pagar", valor: formatarMoeda(totalPagar) },
            { rotulo: "Total a receber", valor: formatarMoeda(totalReceber) },
            { rotulo: "Movimentações de caixa", valor: String(movimentos.length) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Relatório Financeiro",
            periodoTexto: montarTextoPeriodoFinanceiro(dataInicio, dataFim),
            resumo,
            secoes
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoFinanceiro(false);
    }
}

function montarTextoPeriodoFinanceiro(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoFinanceiro(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
