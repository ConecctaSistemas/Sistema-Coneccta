// pdv-cliente.js
// Cliente da venda (busca/cadastro/edição), vendedor da venda, telas de recebimento e crédito loja.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Abre o modal de seleção de cliente da venda.
function informarCliente(){
    clienteVendaPdvSelecionadoId = clienteVenda?.id || null;
    fecharCadastroClienteVendaPdv();
    atualizarResumoClienteVendaModal();
    renderizarClientesPdv();
    abrirModalPdv("modalClientesPdv");
    document.getElementById("buscaClientePdv")?.focus();
}

// Renderiza a lista de clientes cadastrados.
function renderizarClientesPdv(){
    const destino = document.getElementById("listaClientesPdv");

    if(!destino) return;

    const termo = normalizar(document.getElementById("buscaClientePdv")?.value || "");
    const clientes = obterBase().clientes.filter(function(cliente) {
        const texto = [
            cliente.nome,
            cliente.cpf,
            cliente.telefone,
            cliente.email,
            cliente.cartao
        ].join(" ");

        return cliente.ativo !== false && normalizar(texto).includes(termo);
    });

    definirTexto("contadorClientesVendaPdv", `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`);

    if(clientes.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhum cliente cadastrado ou ativo encontrado.</div>`;
        return;
    }

    destino.innerHTML = clientes.map(function(cliente) {
        const ativo = cliente.id === clienteVendaPdvSelecionadoId ? " ativo" : "";
        return `
            <button type="button" class="cliente-pdv-item${ativo}" onclick="selecionarClienteVendaModal('${cliente.id}')">
                <div>
                    <strong>${escapar(cliente.nome || "Cliente sem nome")}</strong>
                    <span>${escapar(cliente.cpf || "Sem CPF/CNPJ")} | ${escapar(cliente.telefone || "Sem telefone")} | ${formatarMoedaRS(cliente.disponivel)}</span>
                </div>
            </button>
        `;
    }).join("");
}

// Seleciona um cliente dentro do modal de clientes.
function selecionarClienteVendaModal(id){
    clienteVendaPdvSelecionadoId = id;
    fecharCadastroClienteVendaPdv();
    atualizarResumoClienteVendaModal();
    renderizarClientesPdv();
}

// Aplica o cliente selecionado à venda atual.
function selecionarClienteVenda(id){
    const cliente = obterBase().clientes.find(function(item) {
        return item.id === id;
    });

    if(!cliente) return;

    clienteVenda = {
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf || "",
        cartao: cliente.cartao || "",
        tabelaPrecoPadraoId: cliente.tabelaPrecoPadraoId || null
    };
    recalcularPrecosTabelaCarrinho();
    atualizarResumoVenda();

    const voltarFinalizacaoPdv = modalFinalizacaoAbertoPdv();
    fecharModaisPdv();

    if(_creditoLojaFluxoPendente){
        _creditoLojaFluxoPendente = false;
        const totais = calcularTotaisFinalizacao();
        const validacao = validarCreditoLoja(obterBase(), totais.total);
        if(!validacao.ok){ alert(validacao.mensagem); prepararCampoProduto(); return; }
        fecharModaisPdv();
        abrirModalParcelasCreditoLoja(totais.total);
        return;
    }

    if(voltarFinalizacaoPdv){
        abrirModalPdv("modalFinalizarPdv");
        atualizarResumoClienteFinalizacaoPdv();
        return;
    }

    prepararCampoProduto();
}

// Atualiza o resumo do cliente exibido no modal.
function atualizarResumoClienteVendaModal(){
    const cliente = obterBase().clientes.find(function(item) {
        return item.id === clienteVendaPdvSelecionadoId;
    });

    definirTexto("clienteVendaPdvNome", cliente?.nome || clienteVenda?.nome || "Consumidor");
    definirTexto("clienteVendaPdvCpf", cliente?.cpf || clienteVenda?.cpf ? `CPF/CNPJ: ${cliente?.cpf || clienteVenda?.cpf}` : "CPF/CNPJ não informado");
    document.getElementById("cpfNotaVendaPdv").value = cliente?.cpf || (!clienteVenda?.id ? clienteVenda?.cpf || "" : "");
}

// Confirma a vinculação do cliente selecionado à venda.
function vincularClienteSelecionadoPdv(){
    if(!clienteVendaPdvSelecionadoId){
        notificar("Selecione um cliente cadastrado ou informe apenas o CPF/CNPJ na nota.", "sucesso");
        return;
    }

    selecionarClienteVenda(clienteVendaPdvSelecionadoId);
}

// Aplica um CPF/CNPJ na nota sem vincular cadastro.
function aplicarCpfNotaVendaPdv(){
    const cpf = valorCampo("cpfNotaVendaPdv").trim();

    if(!cpf){
        alert("Informe o CPF/CNPJ para colocar na nota.");
        document.getElementById("cpfNotaVendaPdv")?.focus();
        return;
    }

    clienteVenda = {
        id: "",
        nome: "Consumidor",
        cpf,
        cartao: ""
    };
    atualizarResumoVenda();

    const voltarFinalizacaoPdv = modalFinalizacaoAbertoPdv();
    fecharModaisPdv();

    if(voltarFinalizacaoPdv){
        abrirModalPdv("modalFinalizarPdv");
        atualizarResumoClienteFinalizacaoPdv();
        return;
    }

    prepararCampoProduto();
}

// Decide se a venda usa cliente cadastrado ou CPF avulso.
function usarClienteOuCpfNaVendaPdv(){
    if(clienteVendaPdvSelecionadoId){
        vincularClienteSelecionadoPdv();
        return;
    }

    aplicarCpfNotaVendaPdv();
}

// Abre o formulário de cadastro rápido de cliente.
function novoClienteVendaPdv(){
    clienteVendaPdvSelecionadoId = null;
    document.getElementById("formClienteVendaPdv")?.classList.remove("oculto");
    definirValorClienteVendaPdv("", "", "");
    atualizarResumoClienteVendaModal();
    renderizarClientesPdv();
    document.getElementById("clienteVendaNome")?.focus();
}

// Abre para edição o cliente selecionado.
function editarClienteVendaSelecionadoPdv(){
    const cliente = obterBase().clientes.find(function(item) {
        return item.id === clienteVendaPdvSelecionadoId;
    });

    if(!cliente){
        alert("Selecione um cliente para editar.");
        return;
    }

    document.getElementById("formClienteVendaPdv")?.classList.remove("oculto");
    preencherFormularioClientePdv("clienteVenda", cliente);
    document.getElementById("clienteVendaNome")?.focus();
}

// Fecha o formulário de cadastro/edição de cliente.
function fecharCadastroClienteVendaPdv(){
    const formulario = document.getElementById("formClienteVendaPdv");
    if(!formulario) return;
    formulario.classList.add("oculto");
    formulario.reset();
}

// Salva o cliente cadastrado/editado na base.
function salvarClienteVendaPdv(evento){
    evento.preventDefault();

    const dadosCliente = coletarDadosClientePdv("clienteVenda");
    const nome = dadosCliente.nome;
    const cpf = dadosCliente.cpf;

    if(!nome){
        alert("Informe o nome do cliente.");
        document.getElementById("clienteVendaNome")?.focus();
        return;
    }

    const base = obterBase();
    const id = clienteVendaPdvSelecionadoId || gerarId("cli");
    const duplicado = cpf && base.clientes.some(function(cliente) {
        return cliente.id !== id && normalizarDocumentoPdv(cliente.cpf) === normalizarDocumentoPdv(cpf);
    });

    if(duplicado && !confirm("Já existe um cliente com esse CPF/CNPJ. Deseja salvar mesmo assim?")){
        return;
    }

    const existente = base.clientes.find(function(cliente) {
        return cliente.id === id;
    });
    const utilizado = numero(existente?.utilizado);
    const cliente = {
        ...(existente || {}),
        id,
        ...dadosCliente,
        utilizado,
        disponivel: Math.max(0, numero(dadosCliente.limite) - utilizado),
        atualizadoEm: new Date().toISOString()
    };

    if(!existente){
        cliente.cartao = gerarNumeroCartaoPdv();
        cliente.criadoEm = new Date().toISOString();
        base.clientes.push(cliente);
    }

    salvarBase(base);
    clienteVendaPdvSelecionadoId = id;
    fecharCadastroClienteVendaPdv();
    atualizarResumoClienteVendaModal();
    renderizarClientesPdv();
}

// Exclui o cliente selecionado.
function excluirClienteVendaSelecionadoPdv(){
    if(!clienteVendaPdvSelecionadoId){
        alert("Selecione um cliente para excluir.");
        return;
    }

    const base = obterBase();
    const cliente = base.clientes.find(function(item) {
        return item.id === clienteVendaPdvSelecionadoId;
    });

    if(!cliente) return;

    const temVenda = base.vendas.some(function(venda) {
        return venda.cliente?.id === cliente.id;
    });
    const temConta = base.contasReceber.some(function(conta) {
        return conta.clienteId === cliente.id;
    });

    if((temVenda || temConta) && !confirm("Este cliente possui histórico. Deseja desativar em vez de excluir?")){
        return;
    }

    if(temVenda || temConta){
        cliente.ativo = false;
        cliente.atualizadoEm = new Date().toISOString();
    }else{
        base.clientes = base.clientes.filter(function(item) {
            return item.id !== cliente.id;
        });
    }

    if(clienteVenda?.id === cliente.id){
        clienteVenda = null;
        recalcularPrecosTabelaCarrinho();
        atualizarResumoVenda();
    }

    clienteVendaPdvSelecionadoId = null;
    salvarBase(base);
    atualizarResumoClienteVendaModal();
    renderizarClientesPdv();
}

// Define nome/CPF/telefone do cliente da venda rapidamente.
function definirValorClienteVendaPdv(nome, cpf, telefone){
    preencherFormularioClientePdv("clienteVenda", { nome, cpf, telefone, ativo: true, limite: 0 });
}

// Renderiza a lista de clientes na tela de recebimento.
function renderizarClientesRecebimentoPdv(){
    const destino = document.getElementById("listaClientesRecebimentoPdv");

    if(!destino) return;

    const base = obterBase();
    const termo = normalizar(document.getElementById("buscaRecebimentoPdv")?.value || "");
    const resumoPendencias = agruparPendenciasRecebimento(base).reduce(function(retorno, cliente) {
        retorno[cliente.id] = cliente;
        return retorno;
    }, {});
    const clientes = base.clientes
        .filter(function(cliente) {
            return normalizar([
                cliente.nome,
                cliente.cpf,
                cliente.telefone,
                cliente.cartao
            ].join(" ")).includes(termo);
        })
        .sort(function(a, b) {
            const pendenciaA = resumoPendencias[a.id]?.total || 0;
            const pendenciaB = resumoPendencias[b.id]?.total || 0;
            if(pendenciaA !== pendenciaB) return pendenciaB - pendenciaA;
            return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
        });

    definirTexto("contadorClientesRecebimentoPdv", `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`);

    if(clientes.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhum cliente cadastrado encontrado.</div>`;
        return;
    }

    destino.innerHTML = clientes.map(function(cliente) {
        const pendencia = resumoPendencias[cliente.id] || { quantidade: 0, total: 0 };
        const ativo = cliente.id === clienteRecebimentoPdvAtual ? " ativo" : "";
        return `
            <button type="button" class="cliente-recebimento-item${ativo}" onclick="abrirClienteRecebimentoPdv('${cliente.id}')">
                <div>
                    <strong>${escapar(cliente.nome || "Cliente sem nome")}</strong>
                    <small>${escapar(cliente.cpf || "CPF/CNPJ não informado")} | ${escapar(cliente.telefone || "Sem telefone")}</small>
                </div>
                <span>${pendencia.quantidade} pend. | ${formatarMoedaRS(pendencia.total)}</span>
            </button>
        `;
    }).join("");
}

// Abre as pendências de um cliente no recebimento.
function abrirClienteRecebimentoPdv(clienteId){
    clienteRecebimentoPdvAtual = clienteId;
    resetarPagamentoRecebimentoPdv();
    renderizarClientesRecebimentoPdv();
    renderizarPendenciasRecebimentoPdv();
}

// Abre o cadastro rápido de cliente no recebimento.
function abrirCadastroClienteRecebimentoPdv(){
    document.getElementById("formClienteRecebimentoPdv")?.classList.remove("oculto");
    document.getElementById("recebimentoClienteNome")?.focus();
}

// Fecha o cadastro rápido de cliente no recebimento.
function fecharCadastroClienteRecebimentoPdv(){
    const formulario = document.getElementById("formClienteRecebimentoPdv");
    if(!formulario) return;

    formulario.classList.add("oculto");
    formulario.reset();
}

// Salva o cliente cadastrado a partir do recebimento.
function salvarClienteRecebimentoPdv(evento){
    evento.preventDefault();

    const dadosCliente = coletarDadosClientePdv("recebimentoCliente");
    const nome = dadosCliente.nome;
    const cpf = dadosCliente.cpf;

    if(!nome){
        alert("Informe o nome do cliente.");
        document.getElementById("recebimentoClienteNome")?.focus();
        return;
    }

    const base = obterBase();
    const documentoDuplicado = cpf && base.clientes.some(function(cliente) {
        return normalizarDocumentoPdv(cliente.cpf) === normalizarDocumentoPdv(cpf);
    });

    if(documentoDuplicado && !confirm("Já existe um cliente com esse CPF/CNPJ. Deseja cadastrar mesmo assim?")){
        return;
    }

    const cliente = {
        id: gerarId("cli"),
        ...dadosCliente,
        cartao: gerarNumeroCartaoPdv(),
        utilizado: 0,
        disponivel: numero(dadosCliente.limite),
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    base.clientes.push(cliente);
    salvarBase(base);
    clienteRecebimentoPdvAtual = cliente.id;
    fecharCadastroClienteRecebimentoPdv();
    renderizarClientesRecebimentoPdv();
    renderizarPendenciasRecebimentoPdv();
}

// Lê os campos do formulário de cliente.
function coletarDadosClientePdv(prefixo){
    const limite = numeroDigitado(valorCampo(`${prefixo}Limite`) || "0");

    return {
        nome: valorCampo(`${prefixo}Nome`).trim(),
        cpf: valorCampo(`${prefixo}Cpf`).trim(),
        nomeFantasia: valorCampo(`${prefixo}NomeFantasia`).trim(),
        telefone: valorCampo(`${prefixo}Telefone`).trim(),
        email: valorCampo(`${prefixo}Email`).trim(),
        consumidorFinal: "sim",
        contribuinteIcms: "naoContribuinte",
        inscricaoEstadual: valorCampo(`${prefixo}InscricaoEstadual`).trim(),
        inscricaoMunicipal: valorCampo(`${prefixo}InscricaoMunicipal`).trim(),
        suframa: "",
        cep: valorCampo(`${prefixo}Cep`).trim(),
        endereco: valorCampo(`${prefixo}Endereco`).trim(),
        numero: valorCampo(`${prefixo}Numero`).trim(),
        complemento: valorCampo(`${prefixo}Complemento`).trim(),
        bairro: valorCampo(`${prefixo}Bairro`).trim(),
        estado: valorCampo(`${prefixo}Estado`).trim().toUpperCase(),
        cidade: valorCampo(`${prefixo}Cidade`).trim(),
        pais: "BRASIL",
        cepEntrega: "",
        enderecoEntrega: "",
        numeroEntrega: "",
        complementoEntrega: "",
        enteGovernamental: "nao",
        codigoEnteGovernamental: "",
        tipoCliente: true,
        tipoFornecedor: false,
        tipoTransportadora: false,
        limite,
        ativo: document.getElementById(`${prefixo}Ativo`)?.value !== "false",
        observacoes: valorCampo(`${prefixo}Observacoes`).trim()
    };
}

// Preenche o formulário de cliente com os dados informados.
function preencherFormularioClientePdv(prefixo, cliente = {}){
    const valores = {
        Nome: cliente.nome || "",
        Cpf: cliente.cpf || "",
        NomeFantasia: cliente.nomeFantasia || "",
        Telefone: cliente.telefone || "",
        Email: cliente.email || "",
        InscricaoEstadual: cliente.inscricaoEstadual || "",
        InscricaoMunicipal: cliente.inscricaoMunicipal || "",
        Cep: cliente.cep || "",
        Endereco: cliente.endereco || "",
        Numero: cliente.numero || "",
        Complemento: cliente.complemento || "",
        Bairro: cliente.bairro || "",
        Estado: cliente.estado || "",
        Cidade: cliente.cidade || "",
        Limite: formatarDecimalCampo(cliente.limite || 0),
        Observacoes: cliente.observacoes || ""
    };

    Object.entries(valores).forEach(function([sufixo, valor]) {
        const campo = document.getElementById(`${prefixo}${sufixo}`);
        if(campo) campo.value = valor;
    });

    const ativo = document.getElementById(`${prefixo}Ativo`);
    if(ativo) ativo.value = String(cliente.ativo !== false);
}

// Renderiza as contas pendentes do cliente selecionado.
function renderizarPendenciasRecebimentoPdv(){
    const destino = document.getElementById("listaPendenciasRecebimentoPdv");
    const base = obterBase();
    const pendencias = contasRecebimentoPendentes(base).filter(function(conta) {
        return conta.clienteId === clienteRecebimentoPdvAtual;
    });
    const cliente = base.clientes.find(function(item) {
        return item.id === clienteRecebimentoPdvAtual;
    });

    definirTexto("clienteRecebimentoPdvNome", cliente?.nome || pendencias[0]?.clienteNome || "Nenhum cliente aberto");
    definirTexto("clienteRecebimentoPdvCpf", cliente?.cpf ? `CPF/CNPJ: ${cliente.cpf}` : "CPF/CNPJ não informado");
    definirTexto("totalRecebimentoPdv", "Selecionado: R$ 0,00");

    if(!destino) return;

    if(!clienteRecebimentoPdvAtual){
        destino.innerHTML = `<div class="vazio-modal">Clique em Abrir para ver as pendências do cliente.</div>`;
        return;
    }

    if(pendencias.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Cliente sem pendências em aberto.</div>`;
        return;
    }

    destino.innerHTML = pendencias.map(function(conta) {
        return `
            <label class="venda-pdv-item">
                <div>
                    <strong>${escapar(conta.documento)} ${escapar(conta.vendaId)}</strong>
                    <small>Emissão ${formatarData(conta.data)} | Vencimento ${formatarData(conta.vencimento)} | ${formatarMoedaRS(conta.saldo)}</small>
                </div>
                <input type="checkbox" class="recebimento-check" value="${escapar(conta.id)}" onchange="atualizarTotalRecebimentoPdv()">
            </label>
        `;
    }).join("");
}

// Recalcula o total selecionado para recebimento.
function atualizarTotalRecebimentoPdv(){
    const ids = idsRecebimentoSelecionadas();
    const total = obterBase().contasReceber
        .filter(function(conta) { return ids.includes(conta.id); })
        .reduce(function(soma, conta) { return soma + numero(conta.saldo); }, 0);

    definirTexto("totalRecebimentoPdv", `Selecionado: ${formatarMoedaRS(total)}`);
    resetarPagamentoRecebimentoPdv();
}

// Inicia a baixa das pendências selecionadas.
function baixarRecebimentoPdv(){
    const ids = idsRecebimentoSelecionadas();

    if(ids.length === 0){
        alert("Selecione ao menos uma pendência.");
        return;
    }

    document.getElementById("pagamentoRecebimentoPdv")?.classList.remove("oculto");
    document.getElementById("btnBaixarRecebimentoPdv")?.classList.add("oculto");
    document.getElementById("btnConfirmarBaixaRecebimentoPdv")?.classList.remove("oculto");
}

// Confirma a baixa de recebimento com a forma de pagamento.
function confirmarBaixaRecebimentoPdv(){
    const ids = idsRecebimentoSelecionadas();
    const formaPagamento = valorPagamentoRecebimentoPdv();

    if(ids.length === 0){
        alert("Selecione ao menos uma pendência.");
        resetarPagamentoRecebimentoPdv();
        return;
    }

    if(!formaPagamento){
        alert("Selecione a forma de pagamento para dar baixa.");
        return;
    }

    if(!confirm(`Dar baixa em ${ids.length} pendência(s) com ${formaPagamento}?`)){
        return;
    }

    const base = obterBase();
    const agora = new Date().toISOString();

    base.contasReceber.forEach(function(conta) {
        if(!ids.includes(conta.id)) return;

        conta.status = "baixada";
        conta.baixadaEm = agora;
        conta.valorBaixado = numero(conta.saldo);
        conta.formaPagamentoBaixa = formaPagamento;
        conta.saldo = 0;
    });

    atualizarCreditoClientesPdv(base);
    salvarBase(base);
    resetarPagamentoRecebimentoPdv();
    renderizarClientesRecebimentoPdv();
    renderizarPendenciasRecebimentoPdv();
    notificar("Baixa realizada com sucesso.", "sucesso");
}

// Retorna o valor total selecionado no recebimento.
function valorPagamentoRecebimentoPdv(){
    return document.querySelector("#formaPagamentoRecebimentoPdv button.ativo")?.dataset.valor || "";
}

// Limpa os campos de pagamento do recebimento.
function resetarPagamentoRecebimentoPdv(){
    document.getElementById("pagamentoRecebimentoPdv")?.classList.add("oculto");
    document.getElementById("btnConfirmarBaixaRecebimentoPdv")?.classList.add("oculto");
    document.getElementById("btnBaixarRecebimentoPdv")?.classList.remove("oculto");
    document.querySelectorAll("#formaPagamentoRecebimentoPdv button").forEach(function(botao) {
        botao.classList.remove("ativo");
    });
}

// Retorna os ids das contas marcadas no recebimento.
function idsRecebimentoSelecionadas(){
    return [...document.querySelectorAll(".recebimento-check:checked")].map(function(campo) {
        return campo.value;
    });
}

// Filtra as contas a receber ainda pendentes.
function contasRecebimentoPendentes(base){
    return base.contasReceber.filter(function(conta) {
        return conta.status !== "baixada" && numero(conta.saldo) > 0;
    });
}

// Agrupa as pendências de recebimento por cliente.
function agruparPendenciasRecebimento(base){
    const mapa = new Map();

    contasRecebimentoPendentes(base).forEach(function(conta) {
        const cliente = base.clientes.find(function(item) {
            return item.id === conta.clienteId;
        });
        const atual = mapa.get(conta.clienteId) || {
            id: conta.clienteId,
            nome: cliente?.nome || conta.clienteNome || "Cliente",
            cpf: cliente?.cpf || "",
            cartao: cliente?.cartao || "",
            quantidade: 0,
            total: 0
        };

        atual.quantidade += 1;
        atual.total += numero(conta.saldo);
        mapa.set(conta.clienteId, atual);
    });

    return [...mapa.values()].sort(function(a, b) {
        return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

// Calcula a data de vencimento de uma parcela.
function calcularVencimentoRecebimento(dataVenda){
    const data = dataVenda ? new Date(dataVenda) : new Date();

    if(Number.isNaN(data.getTime())){
        data.setTime(Date.now());
    }

    data.setDate(data.getDate() + 30);
    return data.toISOString();
}

// Carrega/solicita o vendedor no início do atendimento.
function inicializarVendedorPdv(){
    atualizarRecursoVendedorPdv();
}

// Abre o modal de seleção de vendedor.
function abrirModalVendedorPdv(callback){
    if(!obterConfiguracoesSistema().usarVendedor){
        const usuario = window.AuthSistema?.usuarioAtual?.() || {};
        vendedorPdvAtual = usuario.login ? {
            login: usuario.login,
            nome: usuario.nome || usuario.login
        } : null;
        _callbackVendedorPdv = null;
        const select = document.getElementById("vendedorPdv");
        if(select) select.value = vendedorPdvAtual?.login || "";
        atualizarOperadorLogadoPdv();
        if(callback) callback(vendedorPdvAtual);
        return;
    }

    const base = obterBase();
    const modal = document.getElementById("modalVendedorPdv");
    const lista = document.getElementById("listaVendedoresModal");
    if(!modal || !lista) { callback(null); return; }

    const sessaoAtual = window.AuthSistema?.usuarioAtual?.() || {};
    const podeTrocar = usuarioTemPermissaoSistema("alterarVendedor");
    const todosAtivos = (base.usuarios || []).filter(function(u){ return u.ativo !== false; });
    const opcoes = podeTrocar
        ? todosAtivos
        : todosAtivos.filter(function(u){ return normalizar(u.login) === normalizar(sessaoAtual.login); });

    if(!podeTrocar){
        const usuarioAtual = opcoes[0] || sessaoAtual;
        vendedorPdvAtual = usuarioAtual?.login ? {
            login: usuarioAtual.login,
            nome: usuarioAtual.nome || usuarioAtual.login
        } : null;
        const select = document.getElementById("vendedorPdv");
        if(select) select.value = vendedorPdvAtual?.login || "";
        if(callback) callback(vendedorPdvAtual);
        return;
    }

    if(modal.classList.contains("aberto")) return;

    _callbackVendedorPdv = callback;

    lista.innerHTML = opcoes.length
        ? opcoes.map(function(u){
            return '<button type="button" class="btn-vendedor-modal" onclick="selecionarVendedorModal(\'' + escapar(u.login) + '\',\'' + escapar(u.nome || u.login) + '\')">'
                + '<strong>' + escapar(u.nome || u.login) + '</strong>'
                + (u.login !== u.nome ? '<small>' + escapar(u.login) + '</small>' : '')
                + '</button>';
        }).join("")
        : '<button type="button" class="btn-vendedor-modal" onclick="selecionarVendedorModal(\'' + escapar(sessaoAtual.login || "") + '\',\'' + escapar(sessaoAtual.nome || sessaoAtual.login || "") + '\')">'
            + '<strong>' + escapar(sessaoAtual.nome || sessaoAtual.login || "Usuário") + '</strong>'
            + '</button>';

    abrirModalPdv("modalVendedorPdv");
}

// Confirma o vendedor selecionado no modal.
function selecionarVendedorModal(login, nome){
    const select = document.getElementById("vendedorPdv");
    vendedorPdvAtual = login ? { login: login, nome: nome } : null;
    if(select) select.value = login;
    fecharModaisPdv();
    const cb = _callbackVendedorPdv;
    _callbackVendedorPdv = null;
    if(cb) cb(vendedorPdvAtual);
}

// Limpa o vendedor após a finalização/cancelamento da venda.
function resetarVendedorAposFim(){
    vendedorPdvAtual = null;
    const select = document.getElementById("vendedorPdv");
    if(select) select.value = "";
    atualizarRecursoVendedorPdv();
}

