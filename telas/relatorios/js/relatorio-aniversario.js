/* relatorio-aniversario.js */
/* Dependencia propria do relatorio de Aniversario de Clientes. Busca via
   window.ErpApi.relatorioClientes (mesma listagem do relatorio de Clientes; o filtro
   por mes de nascimento e feito aqui, pois dataNascimento nao filtra por criadoEm).
   Quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada. */

(function(){

const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioAniversario")?.addEventListener("submit", gerarRelatorioAniversario);
});

async function gerarRelatorioAniversario(evento){
    evento.preventDefault();

    const mesInformado = document.getElementById("mesAniversario").value;
    const mes = mesInformado ? Number(mesInformado) : (new Date().getMonth() + 1);
    const somenteAtivos = document.getElementById("somenteAtivosAniversario").checked;

    definirCarregandoAniversario(true);

    try{
        let clientes = await window.ErpApi.relatorioClientes();

        if(somenteAtivos){
            clientes = clientes.filter(function(c) { return c.ativo !== false; });
        }

        let aniversariantes = clientes
            .filter(function(c) { return c.dataNascimento; })
            .map(function(c) {
                const partes = String(c.dataNascimento).slice(0, 10).split("-");
                const mesNascimento = Number(partes[1]);
                const diaNascimento = Number(partes[2]);
                return { cliente: c, mesNascimento, diaNascimento };
            })
            .filter(function(a) { return a.mesNascimento === mes; })
            .sort(function(a, b) { return a.diaNascimento - b.diaNascimento; });

        const colunas = ["Dia", "Nome", "Telefone", "E-mail"];
        const linhas = aniversariantes.map(function(a) {
            return [
                String(a.diaNascimento).padStart(2, "0"),
                a.cliente.nome || "-",
                a.cliente.telefone || "-",
                a.cliente.email || "-"
            ];
        });

        const resumo = [
            { rotulo: "Mês selecionado", valor: NOMES_MES[mes - 1] },
            { rotulo: "Aniversariantes encontrados", valor: String(aniversariantes.length) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Aniversário de Clientes",
            periodoTexto: `Aniversariantes de ${NOMES_MES[mes - 1]}`,
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoAniversario(false);
    }
}

function definirCarregandoAniversario(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
