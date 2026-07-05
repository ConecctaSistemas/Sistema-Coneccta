/* relatorio-movimentoestoque.js */
/* Dependencia propria do relatorio de Entrada e Saida de Produtos. Busca via
   window.ErpApi.listarMovimentosEstoque (hoje le do localStorage no modo mock;
   os registros sao alimentados por telas/movimento/js/controle-estoque.js,
   telas/relatorios/js/planos.js e pelo ajuste manual de estoque. O formato de cada
   registro varia um pouco entre essas origens, por isso os campos sao lidos de forma
   defensiva abaixo. Quando o backend real entrar, so a flag ErpApi._usarMock muda -
   nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioMovimentoEstoque")?.addEventListener("submit", gerarRelatorioMovimentoEstoque);
});

async function gerarRelatorioMovimentoEstoque(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioMovimentoEstoque").value;
    const dataFim = document.getElementById("dataFimMovimentoEstoque").value;

    definirCarregandoMovimentoEstoque(true);

    try{
        const movimentos = await window.ErpApi.listarMovimentosEstoque(undefined, dataInicio || undefined, dataFim || undefined);

        const calculados = movimentos.map(function(mov) {
            const quantidade = numero(mov.quantidade ?? mov.qtd ?? (numero(mov.novo) - numero(mov.anterior)));
            return {
                data: mov.data,
                produto: mov.produto || mov.descricao || "-",
                tipo: mov.tipo || "-",
                quantidade,
                direcao: quantidade < 0 ? "Saída" : "Entrada"
            };
        }).sort(function(a, b) { return (b.data || "").localeCompare(a.data || ""); });

        const colunas = ["Data", "Produto", "Tipo", "Direção", "Quantidade"];
        const linhas = calculados.map(function(item) {
            return [
                formatarDataHora(item.data),
                item.produto,
                rotuloTipoMovimento(item.tipo),
                item.direcao,
                formatarQuantidade(Math.abs(item.quantidade))
            ];
        });

        const totalEntradas = calculados.filter(function(i) { return i.direcao === "Entrada"; })
            .reduce(function(soma, i) { return soma + i.quantidade; }, 0);
        const totalSaidas = calculados.filter(function(i) { return i.direcao === "Saída"; })
            .reduce(function(soma, i) { return soma + Math.abs(i.quantidade); }, 0);

        const resumo = [
            { rotulo: "Movimentações no período", valor: String(calculados.length) },
            { rotulo: "Unidades de entrada", valor: formatarQuantidade(totalEntradas) },
            { rotulo: "Unidades de saída", valor: formatarQuantidade(totalSaidas) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Entrada e Saída de Produtos",
            periodoTexto: montarTextoPeriodoMovimentoEstoque(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoMovimentoEstoque(false);
    }
}

function rotuloTipoMovimento(tipo){
    const rotulos = {
        entrada: "Entrada manual",
        saida: "Saída manual",
        ajuste: "Ajuste de estoque",
        contagem_confirmada: "Contagem de estoque",
        venda: "Venda"
    };
    return rotulos[tipo] || (tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "-");
}

function montarTextoPeriodoMovimentoEstoque(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoMovimentoEstoque(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
