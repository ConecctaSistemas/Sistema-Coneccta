/* relatorio-validademercadorias.js */
/* Dependencia propria do relatorio de Validade de Mercadorias. Busca via
   window.ErpApi.relatorioEstoque (mesma listagem de mercadorias usada no relatorio de
   Estoque; aqui so entram os produtos com data de validade cadastrada). Quando o
   backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha deste arquivo
   precisa ser alterada. */

(function(){

const UM_DIA_MS = 24 * 60 * 60 * 1000;

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioValidadeMercadorias")?.addEventListener("submit", gerarRelatorioValidadeMercadorias);
});

async function gerarRelatorioValidadeMercadorias(evento){
    evento.preventDefault();

    const dias = Number(document.getElementById("diasValidadeMercadorias").value) || 30;

    definirCarregandoValidadeMercadorias(true);

    try{
        const produtos = await window.ErpApi.relatorioEstoque(false);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let comValidade = produtos
            .filter(function(p) { return p.validade; })
            .map(function(p) {
                const dataValidade = new Date(String(p.validade).slice(0, 10) + "T00:00:00");
                const diasRestantes = Math.round((dataValidade.getTime() - hoje.getTime()) / UM_DIA_MS);
                return { produto: p, diasRestantes };
            })
            .filter(function(item) { return item.diasRestantes <= dias; })
            .sort(function(a, b) { return a.diasRestantes - b.diasRestantes; });

        const colunas = ["Produto", "Código", "Validade", "Estoque", "Situação"];
        const linhas = comValidade.map(function(item) {
            return [
                item.produto.descricao || item.produto.nome || "-",
                item.produto.codigo || "-",
                formatarData(item.produto.validade),
                formatarQuantidade(item.produto.estoque),
                situacaoValidade(item.diasRestantes)
            ];
        });

        const vencidos = comValidade.filter(function(item) { return item.diasRestantes < 0; }).length;
        const aVencer = comValidade.filter(function(item) { return item.diasRestantes >= 0; }).length;

        const resumo = [
            { rotulo: "Produtos no relatório", valor: String(comValidade.length) },
            { rotulo: "Já vencidos", valor: String(vencidos) },
            { rotulo: `A vencer em até ${dias} dias`, valor: String(aVencer) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Validade de Mercadorias",
            periodoTexto: `Vencidos ou a vencer em até ${dias} dias`,
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoValidadeMercadorias(false);
    }
}

function situacaoValidade(diasRestantes){
    if(diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} dia(s)`;
    if(diasRestantes === 0) return "Vence hoje";
    return `Vence em ${diasRestantes} dia(s)`;
}

function definirCarregandoValidadeMercadorias(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
