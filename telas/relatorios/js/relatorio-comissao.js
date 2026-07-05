/* relatorio-comissao.js */
/* Dependencia propria do relatorio de Comissao. Busca via
   window.ErpApi.relatorioComissao (hoje le do localStorage no modo mock;
   quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioComissao")?.addEventListener("submit", gerarRelatorioComissao);
});

async function gerarRelatorioComissao(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioComissao").value;
    const dataFim = document.getElementById("dataFimComissao").value;
    const somenteComVendas = document.getElementById("somenteComVendasComissao").checked;

    definirCarregandoComissao(true);

    try{
        const dados = await window.ErpApi.relatorioComissao(dataInicio || undefined, dataFim || undefined);
        const vendas = dados.vendas || [];
        const usuarios = dados.usuarios || [];

        let linhasCalculadas = usuarios.map(function(usuario) {
            const vendasDoVendedor = vendas.filter(function(v) {
                const login = normalizar(v.usuarioLogin || v.vendedorLogin);
                return login === normalizar(usuario.login);
            });
            const valorVendido = somar(vendasDoVendedor, "total");
            const percentualComissao = numero(usuario.comissao);
            const valorComissao = valorVendido * (percentualComissao / 100);

            return {
                nome: usuario.nome || usuario.login,
                qtdVendas: vendasDoVendedor.length,
                valorVendido,
                percentualComissao,
                valorComissao
            };
        });

        if(somenteComVendas){
            linhasCalculadas = linhasCalculadas.filter(function(l) { return l.qtdVendas > 0; });
        }

        linhasCalculadas.sort(function(a, b) { return b.valorComissao - a.valorComissao; });

        const colunas = ["Vendedor", "Qtd. vendas", "Valor vendido", "% comissão", "Valor da comissão"];
        const linhas = linhasCalculadas.map(function(l) {
            return [
                l.nome,
                String(l.qtdVendas),
                formatarMoeda(l.valorVendido),
                l.percentualComissao.toFixed(1) + "%",
                formatarMoeda(l.valorComissao)
            ];
        });

        const totalVendido = linhasCalculadas.reduce(function(soma, l) { return soma + l.valorVendido; }, 0);
        const totalComissao = linhasCalculadas.reduce(function(soma, l) { return soma + l.valorComissao; }, 0);

        const resumo = [
            { rotulo: "Vendedores no relatório", valor: String(linhasCalculadas.length) },
            { rotulo: "Total vendido", valor: formatarMoeda(totalVendido) },
            { rotulo: "Total de comissão a pagar", valor: formatarMoeda(totalComissao) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Comissão",
            periodoTexto: montarTextoPeriodoComissao(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoComissao(false);
    }
}

function montarTextoPeriodoComissao(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoComissao(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
