/* relatorio-alteracoesprodutos.js */
/* Dependencia propria do relatorio de Alteracoes de Produtos. Busca via
   window.ErpApi.relatorioAlteracoesProdutos (hoje le do localStorage no modo mock;
   o log e alimentado em telas/cadastros/js/mercadorias.js a cada criacao/edicao de
   produto. Quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma
   linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioAlteracoesProdutos")?.addEventListener("submit", gerarRelatorioAlteracoesProdutos);
});

async function gerarRelatorioAlteracoesProdutos(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioAlteracoesProdutos").value;
    const dataFim = document.getElementById("dataFimAlteracoesProdutos").value;

    definirCarregandoAlteracoesProdutos(true);

    try{
        const registros = await window.ErpApi.relatorioAlteracoesProdutos(dataInicio || undefined, dataFim || undefined);

        const colunas = ["Data", "Produto", "Código", "Tipo", "Usuário"];
        const linhas = registros.map(function(registro) {
            return [
                formatarDataHora(registro.data),
                registro.produtoDescricao || "-",
                registro.produtoCodigo || "-",
                registro.tipo === "criacao" ? "Criação" : "Edição",
                registro.usuarioNome || registro.usuarioLogin || "-"
            ];
        });

        const totalCriacoes = registros.filter(function(r) { return r.tipo === "criacao"; }).length;
        const totalEdicoes = registros.filter(function(r) { return r.tipo === "edicao"; }).length;

        const resumo = [
            { rotulo: "Alterações no período", valor: String(registros.length) },
            { rotulo: "Produtos criados", valor: String(totalCriacoes) },
            { rotulo: "Produtos editados", valor: String(totalEdicoes) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Alterações de Produtos",
            periodoTexto: montarTextoPeriodoAlteracoesProdutos(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoAlteracoesProdutos(false);
    }
}

function montarTextoPeriodoAlteracoesProdutos(inicio, fim){
    if(!inicio && !fim) return "Todos os registros (sem filtro de período)";
    if(inicio && fim) return `Período de ${formatarData(inicio)} até ${formatarData(fim)}`;
    if(inicio) return `A partir de ${formatarData(inicio)}`;
    return `Até ${formatarData(fim)}`;
}

function definirCarregandoAlteracoesProdutos(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
