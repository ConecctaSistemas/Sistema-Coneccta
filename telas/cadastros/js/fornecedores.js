document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("btnNovoFornecedor")?.addEventListener("click", novoFornecedor);
    document.getElementById("btnFecharModalFornecedor")?.addEventListener("click", fecharModalFornecedor);
    document.getElementById("modalFornecedor")?.addEventListener("click", function(evento) {
        if(evento.target === this) fecharModalFornecedor();
    });
    document.getElementById("buscaFornecedor")?.addEventListener("input", renderizarFornecedores);
    document.getElementById("filtroSituacao")?.addEventListener("change", renderizarFornecedores);
    document.getElementById("tabelaFornecedores")?.addEventListener("click", tratarAcaoFornecedor);
    document.addEventListener("keydown", function(evento) {
        if(evento.key === "Escape") fecharModalFornecedor();
    });
    renderizarFornecedores();
});

function novoFornecedor(){
    limparForm();
    abrirModalFornecedor();
    document.getElementById("razaoSocial")?.focus();
}

function abrirModalFornecedor(){
    const modal = document.getElementById("modalFornecedor");
    if(!modal) return;
    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-fornecedor-aberto");
}

function fecharModalFornecedor(){
    const modal = document.getElementById("modalFornecedor");
    if(!modal) return;
    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-fornecedor-aberto");
}

function salvarFornecedor(){
    const razaoSocial = valorCampo("razaoSocial");
    if(!razaoSocial){
        alert("Informe a razao social do fornecedor.");
        document.getElementById("razaoSocial")?.focus();
        return;
    }

    const base = obterBase();
    const fornecedores = Array.isArray(base.fornecedores) ? base.fornecedores : [];
    const idAtual = valorCampo("fornecedorId");
    const existente = fornecedores.find(function(item) { return item.id === idAtual; });
    const fornecedor = {
        id: idAtual || gerarId("fornecedor"),
        razaoSocial,
        nomeFantasia: valorCampo("nomeFantasia"),
        cnpj: valorCampo("cnpj"),
        telefone: valorCampo("telefone"),
        email: valorCampo("email"),
        endereco: valorCampo("endereco"),
        cidade: valorCampo("cidade"),
        estado: valorCampo("estado").toUpperCase(),
        ativo: document.getElementById("ativo")?.value !== "false",
        origem: existente?.origem || "manual",
        criadoEm: existente?.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    const indice = fornecedores.findIndex(function(item) { return item.id === fornecedor.id; });
    if(indice >= 0){
        fornecedores[indice] = Object.assign({}, fornecedores[indice], fornecedor);
    }else{
        fornecedores.push(fornecedor);
    }

    base.fornecedores = fornecedores;
    salvarBase(base);
    limparForm();
    renderizarFornecedores();
    fecharModalFornecedor();
}

function limparForm(){
    definirValorFornecedor("fornecedorId", "");
    definirValorFornecedor("razaoSocial", "");
    definirValorFornecedor("nomeFantasia", "");
    definirValorFornecedor("cnpj", "");
    definirValorFornecedor("telefone", "");
    definirValorFornecedor("email", "");
    definirValorFornecedor("endereco", "");
    definirValorFornecedor("cidade", "");
    definirValorFornecedor("estado", "");
    definirValorFornecedor("ativo", "true");
    definirTexto("tituloForm", "Novo fornecedor");
}

function editarFornecedor(id){
    const fornecedor = obterFornecedores().find(function(item) { return item.id === id; });
    if(!fornecedor) return;

    definirValorFornecedor("fornecedorId", fornecedor.id);
    definirValorFornecedor("razaoSocial", fornecedor.razaoSocial || fornecedor.nome || "");
    definirValorFornecedor("nomeFantasia", fornecedor.nomeFantasia || "");
    definirValorFornecedor("cnpj", fornecedor.cnpj || fornecedor.cpf || "");
    definirValorFornecedor("telefone", fornecedor.telefone || "");
    definirValorFornecedor("email", fornecedor.email || "");
    definirValorFornecedor("endereco", fornecedor.endereco || "");
    definirValorFornecedor("cidade", fornecedor.cidade || "");
    definirValorFornecedor("estado", fornecedor.estado || fornecedor.uf || "");
    definirValorFornecedor("ativo", String(fornecedor.ativo !== false));
    definirTexto("tituloForm", "Editar fornecedor");
    abrirModalFornecedor();
    document.getElementById("razaoSocial")?.focus();
}

function excluirFornecedor(id){
    if(!confirm("Deseja excluir este fornecedor?")) return;

    const base = obterBase();
    base.fornecedores = obterFornecedores().filter(function(item) { return item.id !== id; });
    salvarBase(base);
    limparForm();
    renderizarFornecedores();
}

function renderizarFornecedores(){
    const fornecedores = obterFornecedores();
    const busca = normalizar(valorCampo("buscaFornecedor"));
    const situacao = valorCampo("filtroSituacao");
    const filtrados = fornecedores.filter(function(item) {
        const ativo = String(item.ativo !== false);
        const texto = normalizar([
            item.razaoSocial,
            item.nome,
            item.nomeFantasia,
            item.cnpj,
            item.cpf,
            item.email,
            item.telefone,
            item.cidade,
            item.estado,
            item.uf
        ].join(" "));
        return (!busca || texto.includes(busca)) && (!situacao || ativo === situacao);
    });

    atualizarKpisFornecedores(fornecedores);
    definirTexto("contadorFornecedores", `${filtrados.length} fornecedor${filtrados.length === 1 ? "" : "es"}`);

    const destino = document.getElementById("tabelaFornecedores");
    if(!destino) return;

    if(!filtrados.length){
        destino.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum fornecedor encontrado.</td></tr>';
        return;
    }

    destino.innerHTML = filtrados.map(function(item) {
        const nome = item.razaoSocial || item.nome || "Fornecedor";
        const contato = item.telefone || item.email || "-";
        return `
            <tr>
                <td><strong>${escapar(nome)}</strong>${item.nomeFantasia ? `<small>${escapar(item.nomeFantasia)}</small>` : ""}</td>
                <td>${escapar(item.cnpj || item.cpf || "-")}</td>
                <td>${escapar(contato)}</td>
                <td>${escapar(cidadeUfFornecedor(item))}</td>
                <td><span class="tag ${origemNfeFornecedor(item) ? "nfe" : "manual"}">${origemNfeFornecedor(item) ? "NF-e" : "Manual"}</span></td>
                <td><span class="tag ${item.ativo === false ? "inativo" : "ativo"}">${item.ativo === false ? "Inativo" : "Ativo"}</span></td>
                <td>
                    <div class="acoes-tabela">
                        <button type="button" class="acao" data-acao-fornecedor="editar" data-id="${escapar(item.id)}">Editar</button>
                        <button type="button" class="acao excluir" data-acao-fornecedor="excluir" data-id="${escapar(item.id)}">Excluir</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function tratarAcaoFornecedor(evento){
    const botao = evento.target.closest("[data-acao-fornecedor]");
    if(!botao) return;

    if(botao.dataset.acaoFornecedor === "editar"){
        editarFornecedor(botao.dataset.id);
    }

    if(botao.dataset.acaoFornecedor === "excluir"){
        excluirFornecedor(botao.dataset.id);
    }
}

function atualizarKpisFornecedores(fornecedores){
    const ativos = fornecedores.filter(function(item) { return item.ativo !== false; }).length;
    const nfe = fornecedores.filter(origemNfeFornecedor).length;
    definirTexto("kpiTotal", fornecedores.length);
    definirTexto("kpiAtivos", ativos);
    definirTexto("kpiNfe", nfe);
}

function obterFornecedores(){
    const base = obterBase();
    return Array.isArray(base.fornecedores) ? base.fornecedores : [];
}

function cidadeUfFornecedor(item){
    const cidade = item.cidade || "";
    const uf = item.estado || item.uf || "";
    if(cidade && uf) return `${cidade} / ${uf}`;
    return cidade || uf || "-";
}

function origemNfeFornecedor(item){
    const origem = normalizar(item.origem || "");
    return item.importadoNfe === true || origem.includes("nfe") || origem.includes("nf-e");
}

function definirValorFornecedor(id, valor){
    const campo = document.getElementById(id);
    if(campo) campo.value = valor ?? "";
}

window.salvarFornecedor = salvarFornecedor;
window.limparForm = limparForm;
window.editarFornecedor = editarFornecedor;
window.excluirFornecedor = excluirFornecedor;
