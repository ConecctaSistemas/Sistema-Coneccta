/* relatorio-fichacadastral.js */
/* Dependencia propria do relatorio de Ficha Cadastral. Busca via
   window.ErpApi.relatorioFichaCadastral (hoje le do localStorage no modo mock;
   quando o backend real entrar, so a flag ErpApi._usarMock muda - nenhuma linha
   deste arquivo precisa ser alterada). */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioFichaCadastral")?.addEventListener("submit", gerarRelatorioFichaCadastral);
});

async function gerarRelatorioFichaCadastral(evento){
    evento.preventDefault();

    const termo = document.getElementById("termoFichaCadastral").value.trim();
    if(!termo){
        alert("Informe o nome ou o CPF/CNPJ do cliente.");
        return;
    }

    definirCarregandoFichaCadastral(true);

    try{
        const dados = await window.ErpApi.relatorioFichaCadastral(termo);

        if(!dados.cliente){
            alert("Nenhum cliente encontrado com esse nome ou CPF/CNPJ.");
            return;
        }

        const cliente = dados.cliente;
        const vendas = dados.vendas || [];

        const secoes = [
            {
                titulo: "Dados cadastrais",
                colunas: ["Campo", "Valor"],
                linhas: [
                    ["Nome", cliente.nome || "-"],
                    ["CPF/CNPJ", cliente.cpf || "-"],
                    ["Telefone", cliente.telefone || "-"],
                    ["E-mail", cliente.email || "-"],
                    ["Data de nascimento", cliente.dataNascimento ? formatarData(cliente.dataNascimento) : "-"],
                    ["Endereço", [cliente.endereco, cliente.numero].filter(Boolean).join(", ") || "-"],
                    ["Bairro", cliente.bairro || "-"],
                    ["Cidade/UF", [cliente.cidade, cliente.estado].filter(Boolean).join("/") || "-"],
                    ["Limite de crédito", formatarMoeda(cliente.limite ?? 0)],
                    ["Situação", cliente.ativo !== false ? "Ativo" : "Inativo"],
                    ["Cadastrado em", formatarData(cliente.criadoEm)]
                ]
            },
            {
                titulo: "Histórico de compras",
                colunas: ["Data", "Nº venda", "Total"],
                linhas: vendas.map(function(venda) {
                    return [formatarData(venda.data), venda.numero || venda.id || "-", formatarMoeda(venda.total)];
                })
            }
        ];

        const totalComprado = somar(vendas, "total");
        const resumo = [
            { rotulo: "Compras registradas", valor: String(vendas.length) },
            { rotulo: "Total comprado", valor: formatarMoeda(totalComprado) }
        ];

        if(dados.totalEncontrados > 1){
            resumo.push({ rotulo: "Atenção", valor: `${dados.totalEncontrados} clientes encontrados, mostrando o primeiro` });
        }

        window.RelatorioVisualizador.abrir({
            titulo: "Ficha Cadastral — " + (cliente.nome || "Cliente"),
            periodoTexto: `Busca: "${termo}"`,
            resumo,
            secoes
        });
    }catch(erro){
        alert("Não foi possível gerar a ficha: " + (erro?.message || erro));
    }finally{
        definirCarregandoFichaCadastral(false);
    }
}

function definirCarregandoFichaCadastral(carregando){
    const botao = document.getElementById("btnGerarRelatorio");
    if(!botao) return;

    botao.disabled = carregando;
    botao.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'
        : '<i class="fa-solid fa-file-circle-check"></i> Gerar ficha';
}

})();
