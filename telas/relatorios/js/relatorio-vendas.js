/* relatorio-vendas.js */
/* Dependencia propria do relatorio de Vendas. Busca via window.ErpApi.relatorioVendas
   (hoje le do localStorage no modo mock; quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioVendas")?.addEventListener("submit", gerarRelatorioVendas);
});

async function gerarRelatorioVendas(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioVendas").value;
    const dataFim = document.getElementById("dataFimVendas").value;
    const vendedor = document.getElementById("vendedorVendas").value.trim();
    const incluirItens = document.getElementById("incluirItensVendas").checked;

    definirCarregandoVendas(true);

    try{
        const vendas = await window.ErpApi.relatorioVendas(dataInicio || undefined, dataFim || undefined, vendedor || undefined);

        const colunas = ["Data", "Documento", "Cliente", "Vendedor", "Forma de pagamento", "Total"];
        const linhas = vendas.map(function(venda) {
            return [
                formatarData(venda.data),
                venda.documento || "-",
                venda.cliente?.nome || "Consumidor final",
                venda.vendedorNome || venda.vendedorLogin || "-",
                venda.formaPagamento || venda.pagamento || "-",
                formatarMoeda(venda.total)
            ];
        });

        const totalVendido = somar(vendas, "total");
        const resumo = [
            { rotulo: "Vendas no período", valor: String(vendas.length) },
            { rotulo: "Valor total", valor: formatarMoeda(totalVendido) },
            { rotulo: "Ticket médio", valor: formatarMoeda(vendas.length ? totalVendido / vendas.length : 0) }
        ];

        const secoes = [{ titulo: "Vendas", colunas, linhas }];

        if(incluirItens){
            const linhasItens = [];
            vendas.forEach(function(venda) {
                (venda.itens || []).forEach(function(item) {
                    linhasItens.push([
                        formatarData(venda.data),
                        item.descricao || item.nome || "-",
                        formatarQuantidade(item.qtd ?? item.quantidade ?? 0),
                        formatarMoeda(item.precoUnitario ?? item.preco ?? 0),
                        formatarMoeda(item.total ?? ((item.qtd || 0) * (item.precoUnitario || 0)))
                    ]);
                });
            });

            secoes.push({ titulo: "Itens detalhados", colunas: ["Data da venda", "Produto", "Qtd", "Preço unitário", "Total"], linhas: linhasItens });
        }

        // Sempre no final da pagina: resumo por forma de pagamento.
        secoes.push({
            titulo: "Resumo por forma de pagamento",
            colunas: ["Forma de pagamento", "Qtd. de vendas", "Valor total"],
            linhas: agruparPorFormaPagamentoVendas(vendas)
        });

        window.RelatorioVisualizador.abrir({
            titulo: "Relatório de Vendas",
            periodoTexto: montarTextoPeriodoVendas(dataInicio, dataFim),
            resumo,
            secoes
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoVendas(false);
    }
}

function agruparPorFormaPagamentoVendas(vendas){
    const porForma = {};

    vendas.forEach(function(venda) {
        const forma = venda.formaPagamento || venda.pagamento || "Não informado";
        if(!porForma[forma]) porForma[forma] = { qtd: 0, total: 0 };
        porForma[forma].qtd += 1;
        porForma[forma].total += numero(venda.total);
    });

    return Object.keys(porForma).map(function(forma) {
        return [forma, String(porForma[forma].qtd), formatarMoeda(porForma[forma].total)];
    });
}

function montarTextoPeriodoVendas(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoVendas(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
