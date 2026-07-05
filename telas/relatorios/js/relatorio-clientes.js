/* relatorio-clientes.js */
/* Dependencia propria do relatorio de Clientes. Busca via window.ErpApi.relatorioClientes
   (hoje le do localStorage no modo mock; quando o backend real entrar, so a flag
   ErpApi._usarMock muda - nenhuma linha deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioClientes")?.addEventListener("submit", gerarRelatorioClientes);
});

async function gerarRelatorioClientes(evento){
    evento.preventDefault();

    const dataInicio = document.getElementById("dataInicioClientes").value;
    const dataFim = document.getElementById("dataFimClientes").value;
    const somenteAtivos = document.getElementById("somenteAtivosClientes").checked;
    const incluirContato = document.getElementById("incluirContatoClientes").checked;

    definirCarregandoClientes(true);

    try{
        let clientes = await window.ErpApi.relatorioClientes(dataInicio || undefined, dataFim || undefined);

        if(somenteAtivos){
            clientes = clientes.filter(function(cliente) { return cliente.ativo !== false; });
        }

        const colunas = ["Nome", "CPF/CNPJ", "Cidade", "Estado", "Status"];
        if(incluirContato) colunas.splice(2, 0, "Telefone", "E-mail");

        const linhas = clientes.map(function(cliente) {
            const linha = [
                cliente.nome || "-",
                cliente.cpf || cliente.cnpj || "-"
            ];
            if(incluirContato){
                linha.push(cliente.telefone || "-", cliente.email || "-");
            }
            linha.push(cliente.cidade || "-", cliente.estado || cliente.uf || "-", cliente.ativo === false ? "Inativo" : "Ativo");
            return linha;
        });

        const resumo = [
            { rotulo: "Clientes no relatório", valor: String(clientes.length) },
            { rotulo: "Ativos", valor: String(clientes.filter(function(c) { return c.ativo !== false; }).length) },
            { rotulo: "Inativos", valor: String(clientes.filter(function(c) { return c.ativo === false; }).length) }
        ];

        window.RelatorioVisualizador.abrir({
            titulo: "Relatório de Clientes",
            periodoTexto: montarTextoPeriodoClientes(dataInicio, dataFim),
            resumo,
            colunas,
            linhas
        });
    }catch(erro){
        alert("Não foi possível gerar o relatório: " + (erro?.message || erro));
    }finally{
        definirCarregandoClientes(false);
    }
}

function montarTextoPeriodoClientes(inicio, fim){
    if(!inicio && !fim) return "Todos os clientes cadastrados";
    if(inicio && fim) return `Cadastrados entre ${formatarData(inicio)} e ${formatarData(fim)}`;
    if(inicio) return `Cadastrados a partir de ${formatarData(inicio)}`;
    return `Cadastrados até ${formatarData(fim)}`;
}

function definirCarregandoClientes(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar relatório';
}

})();
