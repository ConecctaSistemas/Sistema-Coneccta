const formCliente = document.getElementById("formCliente");
const tabelaClientes = document.getElementById("tabelaClientes");
const buscaCliente = document.getElementById("buscaCliente");
const filtroSituacaoCliente = document.getElementById("filtroSituacaoCliente");
const btnLimparCliente = document.getElementById("btnLimparCliente");

document.addEventListener("DOMContentLoaded", function() {
    fecharMovimentacoesCliente();

    formCliente?.addEventListener("submit", function(event) {
        event.preventDefault();
        salvarCliente();
    });

    buscaCliente?.addEventListener("input", renderizarClientes);
    filtroSituacaoCliente?.addEventListener("change", renderizarClientes);
    btnLimparCliente?.addEventListener("click", limparFormulario);
    prepararCamposMonetarios();
    conectarCadastroClienteSeparado();

    document.querySelectorAll(".aba-cadastro").forEach(function(botao) {
        botao.addEventListener("click", function() {
            abrirAbaCadastro(botao.dataset.aba);
        });
    });

    preencherSelectTabelasPreco();
    renderizarTudo();
    carregarCadastroClientePelaUrl();

    if (window.ControleSaida && estaNaTelaCadastroCliente()) {
        ControleSaida.ativarProtecaoCadastro();
    }
});

function gerarNumeroCartao(){
    return "7001 " +
        Math.floor(Math.random() * 9000 + 1000) + " " +
        Math.floor(Math.random() * 9000 + 1000) + " " +
        Math.floor(Math.random() * 9000 + 1000);
}

function conectarCadastroClienteSeparado(){
    const ativoSwitch = document.getElementById("ativoSwitch");
    const ativoSelect = document.getElementById("ativo");

    if(ativoSwitch && ativoSelect){
        ativoSwitch.addEventListener("change", function() {
            ativoSelect.value = ativoSwitch.checked ? "true" : "false";
        });
        ativoSelect.value = ativoSwitch.checked ? "true" : "false";
    }
}

function salvarCliente(){
    const base = obterBase();
    const idAtual = valorCampo("clienteId");
    const nome = valorCampo("nome");
    const cpf = valorCampo("cpf");
    const limite = numero(valorCampo("limite"));

    if(!nome){
        alert("Informe o nome do cliente.");
        abrirAbaSeExistir("basicos");
        document.getElementById("nome")?.focus();
        return;
    }

    if(limite < 0){
        alert("O limite de crédito não pode ser negativo.");
        abrirAbaSeExistir("credito");
        document.getElementById("limite")?.focus();
        return;
    }

    const cpfDuplicado = cpf && base.clientes.some(function(item) {
        return normalizarDocumento(item.cpf) === normalizarDocumento(cpf) && item.id !== idAtual;
    });

    if(cpfDuplicado && !confirm("Já existe um cliente com esse CPF/CNPJ. Deseja salvar mesmo assim?")){
        return;
    }

    const clienteAnterior = base.clientes.find(function(item) {
        return item.id === idAtual;
    });
    const utilizado = numero(clienteAnterior?.utilizado);
    const cliente = {
        id: idAtual || gerarId(),
        nome,
        cpf,
        telefone: valorCampo("telefone"),
        dataNascimento: valorCampo("dataNascimento"),
        email: valorCampo("email"),
        nomeFantasia: valorCampo("nomeFantasia"),
        consumidorFinal: valorCampo("consumidorFinal"),
        contribuinteIcms: valorCampo("contribuinteIcms"),
        inscricaoEstadual: valorCampo("inscricaoEstadual"),
        inscricaoMunicipal: valorCampo("inscricaoMunicipal"),
        suframa: valorCampo("suframa"),
        cep: valorCampo("cep"),
        estado: valorCampo("estado").toUpperCase(),
        cidade: valorCampo("cidade"),
        bairro: valorCampo("bairro"),
        endereco: valorCampo("endereco"),
        numero: valorCampo("numero"),
        complemento: valorCampo("complemento"),
        pais: valorCampo("pais"),
        cepEntrega: valorCampo("cepEntrega"),
        enderecoEntrega: valorCampo("enderecoEntrega"),
        numeroEntrega: valorCampo("numeroEntrega"),
        complementoEntrega: valorCampo("complementoEntrega"),
        enteGovernamental: valorCampo("enteGovernamental"),
        codigoEnteGovernamental: valorCampo("codigoEnteGovernamental"),
        tipoCliente: document.getElementById("tipoCliente")?.checked !== false,
        tipoFornecedor: Boolean(document.getElementById("tipoFornecedor")?.checked),
        tipoTransportadora: Boolean(document.getElementById("tipoTransportadora")?.checked),
        limite,
        utilizado,
        disponivel: Math.max(0, limite - utilizado),
        ativo: document.getElementById("ativo").value === "true",
        observacoes: valorCampo("observacoes"),
        tabelaPrecoPadraoId: document.getElementById("tabelaPrecoPadraoId")?.value || null,
        cartao: clienteAnterior?.cartao || gerarNumeroCartao(),
        criadoEm: clienteAnterior?.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    const indice = base.clientes.findIndex(function(item) {
        return item.id === cliente.id;
    });

    if(indice >= 0){
        base.clientes[indice] = cliente;
    }else{
        base.clientes.push(cliente);
    }

    salvarBase(base);
    if (window.ControleSaida) ControleSaida.marcarSalvo();
    renderizarTudo();
    renderizarCartao(cliente);

    if(estaNaTelaCadastroCliente()){
        notificar("Cliente salvo na Base_Sistema.", "sucesso");
        window.location.href = new URL("telas/cadastros/clientes.html", document.baseURI).href;
        return;
    }

    limparFormulario();
    notificar("Cliente salvo na Base_Sistema.", "sucesso");
}

function editarCliente(id){
    if(!estaNaTelaCadastroCliente()){
        window.location.href = new URL(`telas/cadastros/cadastrocliente.html?cadastro=${encodeURIComponent(id)}`, document.baseURI).href;
        return;
    }

    const cliente = obterBase().clientes.find(function(item) {
        return item.id === id;
    });

    if(!cliente) return;

    document.getElementById("clienteId").value = cliente.id;
    document.getElementById("nome").value = cliente.nome || "";
    document.getElementById("cpf").value = cliente.cpf || "";
    document.getElementById("telefone").value = cliente.telefone || "";
    definirValorSeExistir("dataNascimento", cliente.dataNascimento || "");
    document.getElementById("email").value = cliente.email || "";
    definirValorSeExistir("nomeFantasia", cliente.nomeFantasia || "");
    definirValorSeExistir("consumidorFinal", cliente.consumidorFinal || "nao");
    definirValorSeExistir("contribuinteIcms", cliente.contribuinteIcms || "contribuinte");
    definirValorSeExistir("inscricaoEstadual", cliente.inscricaoEstadual || "");
    definirValorSeExistir("inscricaoMunicipal", cliente.inscricaoMunicipal || "");
    definirValorSeExistir("suframa", cliente.suframa || "");
    document.getElementById("cep").value = cliente.cep || "";
    document.getElementById("estado").value = cliente.estado || "";
    document.getElementById("cidade").value = cliente.cidade || "";
    document.getElementById("bairro").value = cliente.bairro || "";
    document.getElementById("endereco").value = cliente.endereco || "";
    definirValorSeExistir("numero", cliente.numero || "");
    definirValorSeExistir("complemento", cliente.complemento || "");
    definirValorSeExistir("pais", cliente.pais || "BRASIL");
    definirValorSeExistir("cepEntrega", cliente.cepEntrega || "");
    definirValorSeExistir("enderecoEntrega", cliente.enderecoEntrega || "");
    definirValorSeExistir("numeroEntrega", cliente.numeroEntrega || "");
    definirValorSeExistir("complementoEntrega", cliente.complementoEntrega || "");
    definirValorSeExistir("enteGovernamental", cliente.enteGovernamental || "nao");
    definirValorSeExistir("codigoEnteGovernamental", cliente.codigoEnteGovernamental || "");
    document.getElementById("limite").value = formatarDecimalCampo(cliente.limite);
    document.getElementById("ativo").value = String(cliente.ativo !== false);
    document.getElementById("ativoSwitch").checked = cliente.ativo !== false;
    definirCheckSeExistir("tipoCliente", cliente.tipoCliente !== false);
    definirCheckSeExistir("tipoFornecedor", Boolean(cliente.tipoFornecedor));
    definirCheckSeExistir("tipoTransportadora", Boolean(cliente.tipoTransportadora));
    document.getElementById("observacoes").value = cliente.observacoes || "";
    if (document.getElementById("tabelaPrecoPadraoId")) {
        document.getElementById("tabelaPrecoPadraoId").value = cliente.tabelaPrecoPadraoId || "";
    }
    definirTexto("statusFormulario", "Editando cliente");

    renderizarCartao(cliente);
    abrirAbaSeExistir("basicos");
    abrirAbaSeExistir("endereco");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirCliente(id){
    if(!confirm("Deseja excluir este cliente?")) return;

    const base = obterBase();
    base.clientes = base.clientes.filter(function(item) {
        return item.id !== id;
    });

    salvarBase(base);
    renderizarTudo();
}

function preencherSelectTabelasPreco() {
    const sel = document.getElementById("tabelaPrecoPadraoId");
    if (!sel) return;
    const tabelas = (obterBase().tabelasPreco || []).filter(t => t.ativa !== false && (!t.tipo || t.tipo === "normal" || t.tipo === "cliente"));
    sel.innerHTML = `<option value="">Nenhuma (preço normal)</option>` +
        tabelas.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
}

function limparFormulario(){
    formCliente?.reset();
    document.getElementById("clienteId").value = "";
    document.getElementById("limite").value = "0,00";
    document.getElementById("ativo").value = "true";
    if(document.getElementById("ativoSwitch")) document.getElementById("ativoSwitch").checked = true;
    definirCheckSeExistir("tipoCliente", true);
    definirCheckSeExistir("tipoFornecedor", false);
    definirCheckSeExistir("tipoTransportadora", false);
    definirTexto("statusFormulario", "Novo cadastro");
    limparCartaoCliente();
    abrirAbaSeExistir("basicos");
    abrirAbaSeExistir("endereco");
}

function renderizarTudo(){
    renderizarClientes();
}

function renderizarClientes(){
    const base = obterBase();
    const termo = normalizar(buscaCliente?.value || "");
    const situacao = filtroSituacaoCliente?.value || "";
    const filtrados = base.clientes.filter(function(cliente) {
        const texto = [
            cliente.nome,
            cliente.cpf,
            cliente.telefone,
            cliente.email,
            cliente.cidade,
            cliente.cartao
        ].join(" ");
        const correspondeBusca = normalizar(texto).includes(termo);
        const correspondeSituacao = !situacao ||
            (situacao === "ativo" && cliente.ativo !== false) ||
            (situacao === "inativo" && cliente.ativo === false);

        return correspondeBusca && correspondeSituacao;
    });

    atualizarResumo(base.clientes);

    if(!tabelaClientes) return;

    if(filtrados.length === 0){
        tabelaClientes.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum cliente encontrado.</td></tr>`;
        return;
    }

    tabelaClientes.innerHTML = filtrados.map(function(cliente) {
        const situacaoClasse = cliente.ativo === false ? "inativo" : "ativo";
        return `
            <tr>
                <td>
                    <strong>${escapar(cliente.nome)}</strong>
                    <small>${escapar(cliente.cpf || cliente.cartao || "")}</small>
                </td>
                <td>
                    ${escapar(cliente.telefone || "-")}
                    <small>${escapar(cliente.email || "")}</small>
                </td>
                <td>${escapar([cliente.cidade, cliente.estado].filter(Boolean).join(" / ") || "-")}</td>
                <td>
                    <strong>${formatarMoeda(cliente.limite)}</strong>
                    <small>Disponível ${formatarMoeda(cliente.disponivel)}</small>
                </td>
                <td><span class="tag ${situacaoClasse}">${situacaoClasse === "ativo" ? "Ativo" : "Inativo"}</span></td>
                <td>
                    <div class="acoes-tabela">
                        <button type="button" class="acao" onclick="editarCliente('${cliente.id}')">Alterar</button>
                        <button type="button" class="acao excluir" onclick="excluirCliente('${cliente.id}')">Excluir</button>
                        <button type="button" class="acao movimentacoes" onclick="verMovimentacoesCliente('${cliente.id}')">Ver movimentações</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function atualizarResumo(clientes){
    const totalLimite = clientes.reduce(function(total, cliente) {
        return total + numero(cliente.limite);
    }, 0);
    const totalDisponivel = clientes.reduce(function(total, cliente) {
        return total + numero(cliente.disponivel);
    }, 0);

    definirTexto("totalClientes", clientes.length);
    definirTexto("totalLimite", formatarMoedaRS(totalLimite));
    definirTexto("totalDisponivel", formatarMoedaRS(totalDisponivel));
    definirTexto("contadorClientes", `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}`);
}

function renderizarCartao(cliente){
    const destino = document.getElementById("cartaoVirtual");

    if(!destino) return;

    destino.innerHTML = `
        <div class="cartao">
            <h2>Cartão Crédito Loja</h2>
            <h1>${escapar(cliente.cartao)}</h1>
            <h3>${escapar(cliente.nome)}</h3>
            <p>Limite: ${formatarMoeda(cliente.limite)}</p>
            <p>Disponível: ${formatarMoeda(cliente.disponivel)}</p>
        </div>
    `;
}

function limparCartaoCliente(){
    const destino = document.getElementById("cartaoVirtual");

    if(destino){
        destino.innerHTML = "";
    }
}

function carregarCadastroClientePelaUrl(){
    if(!estaNaTelaCadastroCliente()) return;

    const cadastro = new URLSearchParams(window.location.search).get("cadastro");

    if(!cadastro || cadastro === "novo"){
        limparFormulario();
        document.getElementById("nome")?.focus();
        return;
    }

    editarCliente(cadastro);
}

function estaNaTelaCadastroCliente(){
    return document.body?.dataset.telaCadastroCliente === "true";
}

function abrirAbaSeExistir(aba){
    if(document.getElementById(`aba-${aba}`)){
        abrirAbaCadastro(aba);
    }
}

/* ═══════════════════════════════════════════════════════════════════════
   PAINEL LATERAL — MOVIMENTAÇÕES DO CLIENTE
   _movUsarMock = true  → lê localStorage (obterBase)
   _movUsarMock = false → chama ErpApi (endpoints reais)
   ═══════════════════════════════════════════════════════════════════════ */
var _movUsarMock     = true;
var _movClienteAtual = null;
var _movVendasCache  = [];
var _movContasCache  = [];

function _movBuscarDados_mock(clienteId) {
    var base  = obterBase();
    var cli   = base.clientes.find(function(c){ return c.id === clienteId; }) || {};
    var doc   = normalizarDocumento(cli.cpf || "");
    var vendas = (base.vendas || []).filter(function(v) {
        var vc = v.cliente || {};
        return v.clienteId === clienteId || vc.id === clienteId ||
               (doc && normalizarDocumento(vc.cpf || vc.documento || "") === doc) ||
               (cli.nome && normalizar(vc.nome || v.clienteNome || "") === normalizar(cli.nome));
    }).sort(function(a, b) {
        return new Date(b.data || b.criadoEm || 0) - new Date(a.data || a.criadoEm || 0);
    });
    var contas = (base.contasReceber || []).filter(function(c) {
        return c.clienteId === clienteId;
    });
    return Promise.resolve({ vendas: vendas, contas: contas });
}

function _movBuscarDados_real(clienteId) {
    return Promise.all([
        ErpApi.historicoVendasCliente(clienteId),
        ErpApi.listarContasReceber("", clienteId, "", "")
    ]).then(function(r) {
        return { vendas: r[0] || [], contas: r[1] || [] };
    });
}

function _movBuscarDados(clienteId) {
    return _movUsarMock ? _movBuscarDados_mock(clienteId) : _movBuscarDados_real(clienteId);
}

function verMovimentacoesCliente(id) {
    var base    = obterBase();
    var cliente = base.clientes.find(function(c){ return c.id === id; });
    if (!cliente) { notificar("Cliente não encontrado.", "erro"); return; }

    _movClienteAtual = cliente;
    _movVendasCache  = [];
    _movContasCache  = [];

    var painel = document.getElementById("movPainel");
    if (!painel) return;

    definirTexto("movNomeCliente", cliente.nome);
    definirTexto("movSubtitulo",
        [cliente.cidade, cliente.cpf ? "CPF " + cliente.cpf : ""].filter(Boolean).join("  ·  "));

    _movAtivarTab("compras");
    painel.hidden = false;
    painel.classList.add("aberto");
    painel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    var body = document.getElementById("movBodyContent");
    if (body) body.innerHTML = '<div class="mov-loading"><div class="mov-spinner"></div> Carregando...</div>';

    _movBuscarDados(id).then(function(dados) {
        _movVendasCache = dados.vendas;
        _movContasCache = dados.contas;
        _movRenderTab("compras");
    }).catch(function() {
        notificar("Erro ao carregar movimentações.", "erro");
    });
}

function fecharMovimentacoesCliente() {
    var painel = document.getElementById("movPainel");
    if (painel) {
        painel.classList.remove("aberto");
        painel.setAttribute("aria-hidden", "true");
        painel.hidden = true;
    }
    document.body.style.overflow = "";
    _movClienteAtual = null;
    _movVendasCache  = [];
    _movContasCache  = [];
}

function _movAtivarTab(aba) {
    document.querySelectorAll(".mov-tab").forEach(function(btn) {
        btn.classList.toggle("ativa", btn.dataset.aba === aba);
    });
}

function _movTrocarTab(aba) {
    _movAtivarTab(aba);
    _movRenderTab(aba);
}

function _movRenderTab(aba) {
    var el = document.getElementById("movBodyContent");
    if (!el) return;
    if (aba === "compras")    el.innerHTML = _movHtmlCompras();
    if (aba === "financeiro") el.innerHTML = _movHtmlFinanceiro();
    if (aba === "analise")    el.innerHTML = _movHtmlAnalise();

    if (aba === "compras") {
        el.querySelectorAll(".mov-venda").forEach(function(card) {
            card.querySelector(".mov-venda-header").addEventListener("click", function() {
                card.classList.toggle("expandida");
            });
        });
    }
    setTimeout(function() {
        el.querySelectorAll("[data-w]").forEach(function(bar) {
            bar.style.width = bar.dataset.w + "%";
        });
    }, 60);
}

function _movHtmlCompras() {
    var vendas     = _movVendasCache;
    var totalGeral = vendas.reduce(function(s, v){ return s + numero(v.total || v.valorTotal || 0); }, 0);
    var html = '<div class="mov-secao">';
    html += '<div class="mov-secao-titulo"><h3><i class="fa-solid fa-bag-shopping"></i> Últimas compras</h3>';
    html += '<span class="mov-secao-badge">' + vendas.length + ' venda' + (vendas.length !== 1 ? "s" : "") + '</span></div>';

    if (!vendas.length) {
        html += '<div class="mov-vazio"><i class="fa-solid fa-receipt"></i>Nenhuma compra registrada.</div>';
    } else {
        vendas.forEach(function(v) {
            var data  = _movFmtData(v.data || v.criadoEm);
            var pagto = _movCorrigirCodificacao(v.pagamento || v.formaPagamento || "—");
            var total = numero(v.total || v.valorTotal || 0);
            var itens = v.itens || [];
            html += '<div class="mov-venda">';
            html += '<div class="mov-venda-header">';
            html += '<div class="mov-venda-info">';
            html += '<div class="mov-venda-linha1">' + data + '<span class="mov-venda-pagto">' + escapar(pagto) + '</span></div>';
            if (itens.length) html += '<div class="mov-venda-sub">' + itens.length + ' item' + (itens.length > 1 ? "s" : "") + '</div>';
            html += '</div>';
            html += '<strong class="mov-venda-total">' + formatarMoeda(total) + '</strong>';
            html += '<i class="fa-solid fa-chevron-right mov-venda-chevron"></i>';
            html += '</div>';
            if (itens.length) {
                html += '<div class="mov-venda-itens">';
                itens.forEach(function(item) {
                    var qtd = numero(item.qtd || item.quantidade || 1);
                    var sub = qtd * numero(item.precoUnitario || item.preco || 0);
                    html += '<div class="mov-item"><span class="mov-item-nome">' + escapar(item.descricao || "Produto") + '</span>';
                    html += '<span class="mov-item-qtd">× ' + qtd + '</span>';
                    html += '<span class="mov-item-val">' + formatarMoeda(sub) + '</span></div>';
                });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '<div class="mov-rodape"><span>Total geral</span><strong>' + formatarMoeda(totalGeral) + '</strong></div>';
    }
    html += '</div>';
    return html;
}

function _movHtmlFinanceiro() {
    var cli = _movClienteAtual;
    if (!cli) return "";
    var limite     = numero(cli.limite);
    var utilizado  = numero(cli.utilizado);
    var disponivel = Math.max(0, limite - utilizado);
    var pct        = limite > 0 ? Math.min(100, Math.round(utilizado / limite * 100)) : 0;
    var alerta     = pct >= 80;
    var html = "";

    html += '<div class="mov-secao">';
    html += '<div class="mov-secao-titulo"><h3><i class="fa-solid fa-credit-card"></i> Cartão crédito loja</h3></div>';
    if (cli.cartao) {
        html += '<div class="mov-cartao">';
        html += '<div class="mov-cartao-topo">';
        html += '<div class="mov-cartao-chip"></div>';
        html += '<div class="mov-cartao-limites">';
        html += '<div><div class="mov-cartao-limite-label">Limite</div><div class="mov-cartao-limite-val">' + formatarMoeda(limite) + '</div></div>';
        html += '<div><div class="mov-cartao-limite-label">Utilizado</div><div class="mov-cartao-limite-val' + (alerta ? ' alto' : '') + '">' + formatarMoeda(utilizado) + '</div></div>';
        html += '</div></div>';
        html += '<div class="mov-cartao-numero">' + escapar(cli.cartao) + '</div>';
        html += '<div class="mov-cartao-rodape">';
        html += '<div><div class="mov-cartao-nome-label">Titular</div><div class="mov-cartao-titular">' + escapar(cli.nome) + '</div></div>';
        html += '<div class="mov-cartao-brand">CRÉDITO LOJA</div>';
        html += '</div></div>';
    }
    html += '<div class="mov-limite-wrap">';
    html += '<div class="mov-limite-header"><span>Crédito utilizado</span><span class="mov-limite-pct">' + pct + '%</span></div>';
    html += '<div class="mov-limite-track"><div class="mov-limite-fill' + (alerta ? ' alto' : '') + '" data-w="' + pct + '" style="width:0%"></div></div>';
    html += '</div>';
    html += '<div class="mov-limite-grid">';
    html += '<div class="mov-limite-item"><small>Limite</small><strong>' + formatarMoeda(limite) + '</strong></div>';
    html += '<div class="mov-limite-item usado"><small>Utilizado</small><strong>' + formatarMoeda(utilizado) + '</strong></div>';
    html += '<div class="mov-limite-item disponivel"><small>Disponível</small><strong>' + formatarMoeda(disponivel) + '</strong></div>';
    html += '</div></div>';

    var contas = _movContasCache;
    html += '<div class="mov-secao">';
    html += '<div class="mov-secao-titulo"><h3><i class="fa-solid fa-file-invoice-dollar"></i> Contas a receber</h3>';
    html += '<span class="mov-secao-badge">' + contas.length + '</span></div>';
    if (!contas.length) {
        html += '<div class="mov-vazio"><i class="fa-solid fa-circle-check"></i>Nenhuma conta pendente.</div>';
    } else {
        var hoje = new Date(); hoje.setHours(0,0,0,0);
        contas.forEach(function(c) {
            var venc    = c.vencimento ? new Date(c.vencimento) : null;
            var vencida = venc && venc < hoje && c.status !== "pago";
            html += '<div class="mov-conta' + (vencida ? ' vencida' : '') + '">';
            html += '<div class="mov-conta-info"><div class="mov-conta-desc">' + escapar(c.descricao || "Parcela") + '</div>';
            html += '<div class="mov-conta-venc">' + (venc ? "Venc. " + _movFmtData(c.vencimento, true) : "") + (vencida ? " · Em atraso" : "") + '</div></div>';
            html += '<strong class="mov-conta-val">' + formatarMoeda(numero(c.valor)) + '</strong></div>';
        });
        var tot = contas.reduce(function(s, c){ return s + numero(c.valor); }, 0);
        html += '<div class="mov-rodape"><span>Total a receber</span><strong>' + formatarMoeda(tot) + '</strong></div>';
    }
    html += '</div>';
    return html;
}

function _movHtmlAnalise() {
    var vendas = _movVendasCache;
    if (!vendas.length) {
        return '<div class="mov-secao"><div class="mov-vazio"><i class="fa-solid fa-chart-bar"></i>Sem dados suficientes para análise.</div></div>';
    }
    var DIAS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    var PERIOD = { manha:"Manhã", tarde:"Tarde", noite:"Noite", madrug:"Madrug." };
    var cDias  = [0,0,0,0,0,0,0];
    var cPerio = { manha:0, tarde:0, noite:0, madrug:0 };
    var cPagto = {};

    vendas.forEach(function(v) {
        var d = new Date(v.data || v.criadoEm || 0);
        if (!isNaN(d.getTime())) {
            cDias[d.getDay()]++;
            var h = d.getHours();
            if      (h >= 6  && h < 12) cPerio.manha++;
            else if (h >= 12 && h < 18) cPerio.tarde++;
            else if (h >= 18)           cPerio.noite++;
            else                         cPerio.madrug++;
        }
        var p = _movCorrigirCodificacao(v.pagamento || v.formaPagamento || "Não informado");
        cPagto[p] = (cPagto[p] || 0) + 1;
    });

    var maxDia = Math.max.apply(null, cDias) || 1;
    var maxPer = Math.max(cPerio.manha, cPerio.tarde, cPerio.noite, cPerio.madrug) || 1;
    var html = "";

    html += '<div class="mov-secao">';
    html += '<div class="mov-secao-titulo"><h3><i class="fa-solid fa-calendar-week"></i> Dias que mais compra</h3></div>';
    html += '<div class="mov-chart">';
    cDias.forEach(function(cnt, i) {
        var pct = Math.round(cnt / maxDia * 100);
        var top = cnt === Math.max.apply(null, cDias) && cnt > 0;
        html += '<div class="mov-chart-linha">';
        html += '<span class="mov-chart-label' + (top ? '" style="color:#0b66dd' : '') + '">' + DIAS[i] + '</span>';
        html += '<div class="mov-chart-track"><div class="mov-chart-fill' + (top ? ' destaque' : '') + '" data-w="' + pct + '" style="width:0%"></div></div>';
        html += '<span class="mov-chart-val">' + cnt + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="mov-secao">';
    html += '<div class="mov-secao-titulo"><h3><i class="fa-solid fa-clock"></i> Horário preferido</h3></div>';
    html += '<div class="mov-chart">';
    Object.keys(PERIOD).forEach(function(k) {
        var cnt = cPerio[k];
        var pct = Math.round(cnt / maxPer * 100);
        html += '<div class="mov-chart-linha">';
        html += '<span class="mov-chart-label longo">' + PERIOD[k] + '</span>';
        html += '<div class="mov-chart-track"><div class="mov-chart-fill" data-w="' + pct + '" style="width:0%"></div></div>';
        html += '<span class="mov-chart-val">' + cnt + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="mov-secao">';
    html += '<div class="mov-secao-titulo"><h3><i class="fa-solid fa-wallet"></i> Formas de pagamento</h3></div>';
    html += '<div class="mov-pagtos">';
    Object.keys(cPagto).sort(function(a,b){ return cPagto[b] - cPagto[a]; }).forEach(function(k) {
        html += '<div class="mov-pagto-pill">' + escapar(k) + '<span class="mov-pagto-count">' + cPagto[k] + 'x</span></div>';
    });
    html += '</div></div>';
    return html;
}

function _movCorrigirCodificacao(str) {
    if (!str) return str;
    try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
}

function _movFmtData(iso, soData) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    var dt = d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" });
    if (soData) return dt;
    return dt + " " + d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
}

function abrirAbaCadastro(aba){
    document.querySelectorAll(".aba-cadastro").forEach(function(botao) {
        botao.classList.toggle("ativa", botao.dataset.aba === aba);
    });

    document.querySelectorAll(".conteudo-aba").forEach(function(view) {
        view.classList.toggle("ativa", view.id === `aba-${aba}`);
    });
}function prepararCamposMonetarios(){
    const campo = document.getElementById("limite");

    campo?.addEventListener("blur", function() {
        campo.value = formatarDecimalCampo(campo.value);
    });
}
function normalizarDocumento(valor){
    return String(valor || "").replace(/\D/g, "");
}function definirValorSeExistir(id, valor){
    const elemento = document.getElementById(id);

    if(elemento){
        elemento.value = valor ?? "";
    }
}

function definirCheckSeExistir(id, valor){
    const elemento = document.getElementById(id);

    if(elemento){
        elemento.checked = Boolean(valor);
    }
}function escapar(valor){
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
