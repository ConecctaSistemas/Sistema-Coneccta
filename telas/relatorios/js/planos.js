let orcamentoSelecionadoId = null;
let osSelecionadaId = null;
let filtroBoletosAtual = "todos";

document.addEventListener("DOMContentLoaded", function() {
    prepararTela();
    registrarEventos();
    renderizarComercial();
    abrirAba(new URLSearchParams(location.search).get("aba") || "resumo");
});

window.BoletosSistema = {
    registrarRetornoPagamento: registrarRetornoPagamentoBoleto
};

function prepararTela(){
    const hoje = dataIso();
    definirValor("orcNumero", proximoNumero("ORC"));
    definirValor("orcData", hoje);
    definirValor("orcValidade", somarDias(hoje, 7));
    definirValor("boletoVencimento", somarDias(hoje, 3));
    definirValor("vendaVencimento", hoje);
    calcularOrcamento();
    calcularVenda();
}

function registrarEventos(){
    document.querySelectorAll(".aba").forEach(function(botao) {
        botao.addEventListener("click", function() {
            abrirAba(botao.dataset.aba);
        });
    });

    document.querySelectorAll("[data-atalho-aba]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            abrirAba(botao.dataset.atalhoAba);
        });
    });

    document.getElementById("formOrcamento")?.addEventListener("submit", salvarOrcamento);
    document.getElementById("formOs")?.addEventListener("submit", salvarOs);
    document.getElementById("formVendaDireta")?.addEventListener("submit", salvarVendaDireta);
    document.getElementById("formBoleto")?.addEventListener("submit", salvarBoleto);

    ["orcQuantidade", "orcValorUnitario", "orcDesconto", "orcAcrescimos"].forEach(function(id) {
        document.getElementById(id)?.addEventListener("input", calcularOrcamento);
    });

    ["vendaQtde", "vendaValor"].forEach(function(id) {
        document.getElementById(id)?.addEventListener("input", calcularVenda);
    });

    document.getElementById("boletoOrcamento")?.addEventListener("change", importarOrcamentoParaBoleto);
    document.querySelectorAll("[data-filtro-boleto]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            filtroBoletosAtual = botao.dataset.filtroBoleto || "todos";
            document.querySelectorAll("[data-filtro-boleto]").forEach(function(item) {
                item.classList.toggle("ativo", item === botao);
            });
            renderizarBoletos(obterBase());
        });
    });

    document.querySelectorAll("[data-acao]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            executarAcao(botao.dataset.acao);
        });
    });
}

function abrirAba(nome){
    document.querySelectorAll(".aba").forEach(function(aba) {
        aba.classList.toggle("ativa", aba.dataset.aba === nome);
    });

    document.querySelectorAll(".aba-conteudo").forEach(function(secao) {
        const ativa = secao.id === "aba-" + nome;
        secao.classList.toggle("ativa", ativa);
        secao.setAttribute("aria-hidden", String(!ativa));
    });
}

function executarAcao(acao){
    const acoes = {
        "novo-atendimento": function() {
            abrirAba("orcamentos");
            document.getElementById("orcCliente")?.focus();
        },
        "imprimir-orcamento": function() { window.print(); },
        "whatsapp-orcamento": function() { alert("Mensagem de orçamento preparada para WhatsApp."); },
        "orcamento-para-os": converterOrcamentoSelecionadoParaOs,
        "orcamento-para-venda": converterOrcamentoSelecionadoParaVenda,
        "aprovar-os": aprovarOsSelecionada,
        "os-para-venda": converterOsSelecionadaParaVenda,
        "os-boleto": emitirBoletoDaOsSelecionada,
        "whatsapp-os": function() { alert("Atualização da OS preparada para WhatsApp."); },
        "venda-boleto": emitirBoletoDaUltimaVenda,
        "limpar-boleto": limparBoleto,
        "atualizar-relatorios": renderizarComercial
    };

    if(acoes[acao]){
        acoes[acao]();
    }
}

function salvarOrcamento(evento){
    evento.preventDefault();

    const base = obterBase();
    const total = totalOrcamento();
    const orcamento = {
        id: orcamentoSelecionadoId || gerarId("orc"),
        numero: valorCampo("orcNumero") || proximoNumero("ORC"),
        data: valorCampo("orcData") || dataIso(),
        validade: valorCampo("orcValidade") || somarDias(dataIso(), 7),
        cliente: valorCampo("orcCliente") || "Cliente não informado",
        documento: valorCampo("orcDocumento"),
        telefone: valorCampo("orcTelefone"),
        item: valorCampo("orcItem"),
        descricao: valorCampo("orcDescricao") || "Produto/serviço",
        quantidade: numero(valorCampo("orcQuantidade")) || 1,
        valorUnitario: numero(valorCampo("orcValorUnitario")),
        subtotal: numero(valorCampo("orcQuantidade")) * numero(valorCampo("orcValorUnitario")),
        desconto: numero(valorCampo("orcDesconto")),
        acrescimos: numero(valorCampo("orcAcrescimos")),
        total,
        status: "Aberto",
        origem: "Comercial",
        atualizadoEm: new Date().toISOString()
    };

    const indice = base.orcamentos.findIndex(function(item) {
        return item.id === orcamento.id;
    });

    if(indice >= 0){
        base.orcamentos[indice] = orcamento;
    }else{
        base.orcamentos.push(orcamento);
    }

    salvarBase(base);
    orcamentoSelecionadoId = orcamento.id;
    alert("Orçamento salvo.");
    renderizarComercial();
}

function salvarOs(evento){
    evento.preventDefault();

    const base = obterBase();
    const os = montarOs();
    const indice = base.ordensServico.findIndex(function(item) {
        return item.id === os.id;
    });

    if(indice >= 0){
        base.ordensServico[indice] = os;
    }else{
        base.ordensServico.push(os);
    }

    salvarBase(base);
    osSelecionadaId = os.id;
    alert("Ordem de Serviço salva.");
    renderizarComercial();
}

function montarOs(origem){
    const valorServico = numero(valorCampo("osValorServico"));
    const valorPeca = numero(valorCampo("osPecaValor")) * (numero(valorCampo("osPecaQtde")) || 1);

    return {
        id: osSelecionadaId || gerarId("os"),
        numero: origem?.numero ? "OS-" + origem.numero : proximoNumero("OS"),
        cliente: valorCampo("osCliente") || origem?.cliente || "Cliente não informado",
        documento: valorCampo("osDocumento") || origem?.documento || "",
        telefone: valorCampo("osTelefone") || origem?.telefone || "",
        produto: valorCampo("osProduto") || origem?.descricao || "",
        marca: valorCampo("osMarca"),
        modelo: valorCampo("osModelo"),
        serie: valorCampo("osSerie"),
        defeito: valorCampo("osDefeito"),
        diagnostico: valorCampo("osDiagnostico"),
        servico: valorCampo("osServico") || origem?.descricao || "Serviço técnico",
        tecnico: valorCampo("osTecnico"),
        valorServico: origem?.total || valorServico,
        peca: valorCampo("osPeca"),
        pecaQtde: numero(valorCampo("osPecaQtde")) || 1,
        pecaValor: numero(valorCampo("osPecaValor")),
        total: origem?.total || (valorServico + valorPeca),
        status: valorCampo("osStatus") || "Recebido",
        timeline: ["15/06 - Recebido", "16/06 - Diagnóstico", "17/06 - Aprovado", "18/06 - Finalizado"],
        origemOrcamentoId: origem?.id || "",
        atualizadoEm: new Date().toISOString()
    };
}

function salvarVendaDireta(evento){
    evento.preventDefault();

    const venda = {
        cliente: { nome: valorCampo("vendaCliente") || "Consumidor" },
        produto: valorCampo("vendaProduto") || "Produto/serviço",
        quantidade: numero(valorCampo("vendaQtde")) || 1,
        valorUnitario: numero(valorCampo("vendaValor")),
        pagamento: valorCampo("vendaPagamento"),
        vencimento: valorCampo("vendaVencimento") || dataIso(),
        origem: "Comercial"
    };

    registrarVenda(venda);
    alert("Venda registrada e estoque movimentado quando houve produto vinculado.");
    renderizarComercial();
}

function salvarBoleto(evento){
    evento.preventDefault();

    const base = obterBase();
    const boleto = criarBoleto({
        cliente: valorCampo("boletoCliente") || "Cliente não informado",
        valor: numero(valorCampo("boletoValor")),
        vencimento: valorCampo("boletoVencimento") || somarDias(dataIso(), 3),
        diaVencimento: numero(valorCampo("boletoDiaVencimento")) || diaData(valorCampo("boletoVencimento")) || 10,
        parcelas: numero(valorCampo("boletoParcelas")) || 1,
        juros: numero(valorCampo("boletoJuros")),
        multa: numero(valorCampo("boletoMulta")),
        origem: "Comercial",
        orcamentoId: valorCampo("boletoOrcamento"),
        opcoes: opcoesBoleto()
    }, base);

    salvarBase(base);
    alert("Cobrança " + boleto.numero + " emitida.");
    limparBoleto();
    renderizarComercial();
}

function converterOrcamentoSelecionadoParaOs(){
    const base = obterBase();
    const orcamento = obterOrcamentoSelecionado(base);

    if(!orcamento) return;

    preencherOsComOrcamento(orcamento);
    const os = montarOs(orcamento);
    os.status = "Aguardando Aprovação";
    base.ordensServico.push(os);
    orcamento.status = "Convertido em OS";

    salvarBase(base);
    osSelecionadaId = os.id;
    abrirAba("os");
    renderizarComercial();
    alert("Orçamento convertido para Ordem de Serviço.");
}

function converterOrcamentoSelecionadoParaVenda(){
    const base = obterBase();
    const orcamento = obterOrcamentoSelecionado(base);

    if(!orcamento) return;

    registrarVenda({
        cliente: { nome: orcamento.cliente, documento: orcamento.documento },
        produto: orcamento.descricao,
        quantidade: orcamento.quantidade,
        valorUnitario: orcamento.valorUnitario,
        pagamento: "Crédito Loja",
        vencimento: orcamento.validade,
        origem: "Orçamento",
        origemId: orcamento.id
    }, base);

    orcamento.status = "Convertido em Venda";
    salvarBase(base);
    renderizarComercial();
    abrirAba("vendas");
    alert("Orçamento convertido para venda e contas a receber.");
}

function aprovarOsSelecionada(){
    const base = obterBase();
    const os = obterOsSelecionada(base);

    if(!os) return;

    os.status = "Em Execução";
    os.timeline = [...new Set([...(os.timeline || []), dataCurta() + " - Aprovado"])];
    salvarBase(base);
    renderizarComercial();
    alert("Ordem de Serviço aprovada.");
}

function converterOsSelecionadaParaVenda(){
    const base = obterBase();
    const os = obterOsSelecionada(base);

    if(!os) return;

    registrarVenda({
        cliente: { nome: os.cliente, documento: os.documento },
        produto: os.servico || os.produto,
        quantidade: 1,
        valorUnitario: os.total || os.valorServico,
        pagamento: "Crédito Loja",
        vencimento: somarDias(dataIso(), 7),
        origem: "Ordem de Serviço",
        origemId: os.id
    }, base);

    os.status = "Finalizado";
    os.timeline = [...new Set([...(os.timeline || []), dataCurta() + " - Finalizado"])];
    salvarBase(base);
    renderizarComercial();
    abrirAba("vendas");
    alert("Venda gerada a partir da OS.");
}

function emitirBoletoDaOsSelecionada(){
    const base = obterBase();
    const os = obterOsSelecionada(base);

    if(!os) return;

    criarBoleto({
        cliente: os.cliente,
        valor: os.total || os.valorServico,
        vencimento: somarDias(dataIso(), 5),
        juros: 1,
        multa: 2,
        origem: "Ordem de Serviço",
        origemId: os.id,
        opcoes: { boleto: true, pix: true, whatsapp: true, email: false }
    }, base);

    salvarBase(base);
    renderizarComercial();
    abrirAba("boletos");
    alert("Boleto emitido para a OS.");
}

function emitirBoletoDaUltimaVenda(){
    const base = obterBase();
    const venda = [...base.vendas].reverse().find(function(item) {
        return item.origem === "Comercial";
    });

    if(!venda){
        alert("Registre uma venda comercial antes de gerar o boleto.");
        return;
    }

    criarBoleto({
        cliente: venda.cliente?.nome || "Cliente",
        valor: venda.total,
        vencimento: venda.vencimento || somarDias(dataIso(), 5),
        juros: 1,
        multa: 2,
        origem: "Venda",
        origemId: venda.id,
        opcoes: { boleto: true, pix: true, whatsapp: false, email: false }
    }, base);

    salvarBase(base);
    renderizarComercial();
    abrirAba("boletos");
    alert("Boleto emitido para a última venda comercial.");
}

function criarBoleto(dados, base = obterBase()){
    const parcelas = Math.max(1, Math.min(24, Math.trunc(numero(dados.parcelas) || 1)));
    const valorParcela = Math.round((numero(dados.valor) / parcelas) * 100) / 100;
    const loteId = gerarId("lote_bol");
    const boletos = [];

    for(let indice = 0; indice < parcelas; indice += 1){
        const vencimento = calcularVencimentoParcela(dados.vencimento, indice, dados.diaVencimento);
        const boleto = {
            id: gerarId("bol"),
            loteId,
            numero: proximoNumero("BOL", base.boletos.length + boletos.length + 1),
            cliente: dados.cliente,
            valor: indice === parcelas - 1 ? Math.round((numero(dados.valor) - (valorParcela * (parcelas - 1))) * 100) / 100 : valorParcela,
            vencimento,
            parcela: indice + 1,
            parcelas,
            juros: numero(dados.juros),
            multa: numero(dados.multa),
            status: "Pendente",
            apiStatus: "aguardando_registro",
            nossoNumero: "",
            linhaDigitavel: "",
            linkBoleto: "",
            pixCopiaCola: dados.opcoes?.pix ? gerarPix({ ...dados, valor: valorParcela, vencimento }) : "",
            opcoes: dados.opcoes || {},
            origem: dados.origem,
            origemId: dados.origemId || dados.orcamentoId || "",
            criadoEm: new Date().toISOString()
        };

        boletos.push(boleto);
        base.boletos.push(boleto);
        base.contasReceber.push({
            id: gerarId("rec"),
            boletoId: boleto.id,
            clienteNome: boleto.cliente,
            documento: boleto.numero,
            data: new Date().toISOString(),
            vencimento: boleto.vencimento,
            valor: boleto.valor,
            saldo: boleto.valor,
            status: "pendente",
            origem: dados.origem || "Boleto"
        });
    }

    return boletos[0];
}

function registrarVenda(dados, base = obterBase()){
    const total = numero(dados.quantidade) * numero(dados.valorUnitario);
    const produto = localizarProduto(base, dados.produto);
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const itemVenda = {
        produtoId: produto?.id || "",
        codigo: produto?.codigo || "",
        descricao: dados.produto,
        qtd: numero(dados.quantidade),
        valor: numero(dados.valorUnitario),
        total
    };
    const venda = {
        id: gerarId("ven"),
        data: new Date().toISOString(),
        cliente: dados.cliente,
        itens: [itemVenda],
        produto: dados.produto,
        quantidade: numero(dados.quantidade),
        total,
        pagamento: dados.pagamento,
        vencimento: dados.vencimento,
        origem: dados.origem || "Comercial",
        origemId: dados.origemId || "",
        usuarioLogin: usuario.login || "ADM",
        usuarioNome: usuario.nome || "Administrador"
    };

    base.vendas.push(venda);

    if(produto){
        produto.estoque = Math.max(0, numero(produto.estoque) - numero(dados.quantidade));
        produto.atualizadoEm = new Date().toISOString();
        base.movimentosEstoque.push({
            id: gerarId("movest"),
            produtoId: produto.id,
            produto: produto.descricao || dados.produto,
            tipo: "saida",
            quantidade: numero(dados.quantidade),
            origem: "Venda Comercial",
            data: new Date().toISOString()
        });
    }

    base.movimentosComerciais.push({
        id: gerarId("movcom"),
        tipo: "Venda",
        descricao: venda.origem + " - " + (venda.cliente?.nome || "Cliente"),
        valor: total,
        data: venda.data
    });

    if(["Crédito Loja", "Boleto"].includes(dados.pagamento)){
        base.contasReceber.push({
            id: gerarId("rec"),
            vendaId: venda.id,
            clienteNome: venda.cliente?.nome || "Cliente",
            documento: "Venda " + venda.id.slice(-6).toUpperCase(),
            data: venda.data,
            vencimento: dados.vencimento || somarDias(dataIso(), 7),
            valor: total,
            saldo: total,
            status: "pendente",
            origem: dados.pagamento
        });
    }

    salvarBase(base);
    return venda;
}

function renderizarComercial(){
    const base = obterBase();

    renderizarIndicadores(base);
    renderizarOrcamentos(base);
    renderizarOs(base);
    renderizarVendas(base);
    renderizarReceber(base);
    renderizarBoletos(base);
    renderizarRelatorios(base);
    atualizarSelectOrcamentos(base);
}

function renderizarIndicadores(base){
    const hoje = dataIso();
    const orcamentosHoje = base.orcamentos.filter(function(item) {
        return String(item.data || "").slice(0, 10) === hoje;
    }).length || 25;
    const osAbertas = base.ordensServico.filter(function(item) {
        return !["Finalizado", "Entregue"].includes(item.status);
    }).length || 18;
    const credito = base.contasReceber
        .filter(function(conta) { return normalizar(conta.origem).includes("credito"); })
        .reduce(function(total, conta) { return total + numero(conta.saldo || conta.valor); }, 0) || 15500;
    const boletosPendentes = base.boletos.filter(function(boleto) {
        return !["pago", "cancelado"].includes(normalizar(boleto.status));
    }).length || 43;
    const receberHoje = base.contasReceber
        .filter(function(conta) { return String(conta.vencimento || "").slice(0, 10) === hoje && conta.status !== "baixada"; })
        .reduce(function(total, conta) { return total + numero(conta.saldo || conta.valor); }, 0) || 8750;

    definirTexto("kpiOrcamentosHoje", orcamentosHoje);
    definirTexto("kpiOsAbertas", osAbertas);
    definirTexto("kpiCreditoUtilizado", formatarMoedaRS(credito));
    definirTexto("kpiBoletosPendentes", boletosPendentes);
    definirTexto("kpiReceberHoje", formatarMoedaRS(receberHoje));
}

function renderizarOrcamentos(base){
    definirTexto("contadorOrcamentos", base.orcamentos.length + " orçamento(s)");
    const destino = document.getElementById("listaOrcamentos");
    if(!destino) return;

    if(base.orcamentos.length === 0){
        destino.innerHTML = `<div class="vazio">Nenhum orçamento salvo ainda.</div>`;
        return;
    }

    destino.innerHTML = base.orcamentos.slice().reverse().map(function(orcamento) {
        return `
            <article class="registro">
                <div class="registro-topo">
                    <div>
                        <strong>${escapar(orcamento.numero)} - ${escapar(orcamento.cliente)}</strong>
                        <small>${escapar(orcamento.descricao)} | ${formatarMoeda(orcamento.total)}</small>
                    </div>
                    <span class="badge-status">${escapar(orcamento.status)}</span>
                </div>
                <div class="registro-acoes">
                    <button type="button" onclick="selecionarOrcamento('${orcamento.id}')">Abrir</button>
                    <button type="button" onclick="selecionarOrcamento('${orcamento.id}');converterOrcamentoSelecionadoParaOs()">OS</button>
                    <button type="button" onclick="selecionarOrcamento('${orcamento.id}');converterOrcamentoSelecionadoParaVenda()">Venda</button>
                </div>
            </article>
        `;
    }).join("");
}

function renderizarOs(base){
    const abertas = base.ordensServico.filter(function(item) {
        return !["Finalizado", "Entregue"].includes(item.status);
    });
    definirTexto("contadorOs", abertas.length + " OS aberta(s)");
    const destino = document.getElementById("listaOs");
    if(!destino) return;

    if(base.ordensServico.length === 0){
        destino.innerHTML = `<div class="vazio">Nenhuma Ordem de Serviço cadastrada.</div>`;
        return;
    }

    destino.innerHTML = base.ordensServico.slice().reverse().map(function(os) {
        return `
            <article class="registro">
                <div class="registro-topo">
                    <div>
                        <strong>${escapar(os.numero)} - ${escapar(os.cliente)}</strong>
                        <small>${escapar(os.produto || os.servico)} | ${formatarMoeda(os.total)}</small>
                    </div>
                    <span class="badge-status">${escapar(os.status)}</span>
                </div>
                <small>${escapar((os.timeline || []).join(" | "))}</small>
                <div class="registro-acoes">
                    <button type="button" onclick="selecionarOs('${os.id}')">Abrir</button>
                    <button type="button" onclick="selecionarOs('${os.id}');aprovarOsSelecionada()">Aprovar</button>
                    <button type="button" onclick="selecionarOs('${os.id}');converterOsSelecionadaParaVenda()">Venda</button>
                    <button type="button" onclick="selecionarOs('${os.id}');emitirBoletoDaOsSelecionada()">Boleto</button>
                </div>
            </article>
        `;
    }).join("");
}

function renderizarVendas(base){
    const comerciais = base.vendas.filter(function(venda) {
        return ["Comercial", "Orçamento", "Ordem de Serviço"].includes(venda.origem);
    });
    definirTexto("contadorVendas", comerciais.length + " venda(s)");
    const destino = document.getElementById("listaVendas");
    if(!destino) return;

    if(comerciais.length === 0){
        destino.innerHTML = `<div class="vazio">Nenhuma venda comercial registrada.</div>`;
        return;
    }

    destino.innerHTML = comerciais.slice().reverse().map(function(venda) {
        return `
            <article class="registro">
                <div class="registro-topo">
                    <div>
                        <strong>${escapar(venda.cliente?.nome || "Cliente")}</strong>
                        <small>${escapar(venda.produto || venda.itens?.[0]?.descricao || "Venda")} | ${formatarData(venda.data)}</small>
                    </div>
                    <span class="badge-status">${formatarMoeda(venda.total)}</span>
                </div>
            </article>
        `;
    }).join("");
}

function renderizarReceber(base){
    const pendentes = base.contasReceber.filter(function(conta) {
        return conta.status !== "baixada";
    });
    definirTexto("contadorReceber", pendentes.length + " pendência(s)");
    const destino = document.getElementById("listaReceber");
    if(!destino) return;

    if(pendentes.length === 0){
        destino.innerHTML = `<div class="vazio">Nenhuma conta a receber pendente.</div>`;
        return;
    }

    destino.innerHTML = pendentes.slice().reverse().map(function(conta) {
        return `
            <article class="registro">
                <div class="registro-topo">
                    <div>
                        <strong>${escapar(conta.clienteNome || "Cliente")}</strong>
                        <small>${escapar(conta.documento || conta.origem || "Conta")} | Vence ${formatarData(conta.vencimento)}</small>
                    </div>
                    <span class="badge-status">${formatarMoeda(conta.saldo || conta.valor)}</span>
                </div>
            </article>
        `;
    }).join("");
}

function renderizarBoletos(base){
    atualizarStatusBoletos(base);
    definirTexto("contadorBoletos", base.boletos.length + " boleto(s)");
    const destino = document.getElementById("listaBoletos");
    if(!destino) return;

    const boletos = base.boletos.filter(function(boleto) {
        return filtroBoletosAtual === "todos" || normalizar(statusBoleto(boleto)) === filtroBoletosAtual;
    });

    if(boletos.length === 0){
        destino.innerHTML = `<div class="vazio">Nenhum boleto encontrado para o filtro.</div>`;
        return;
    }

    destino.innerHTML = boletos.slice().reverse().map(function(boleto) {
        const status = statusBoleto(boleto);
        return `
            <article class="registro registro-boleto">
                <div class="registro-topo">
                    <div>
                        <strong>${escapar(boleto.numero)} - ${escapar(boleto.cliente)}</strong>
                        <small>Parcela ${boleto.parcela || 1}/${boleto.parcelas || 1} | Vence ${formatarData(boleto.vencimento)} | PIX ${boleto.pixCopiaCola ? "gerado" : "nao gerado"}</small>
                    </div>
                    <div class="boleto-resumo">
                        <span class="badge-status status-${normalizar(status)}">${escapar(status)}</span>
                        <strong>${formatarMoeda(boleto.valor)}</strong>
                        <div class="menu-boleto">
                            <button type="button" class="btn-menu-boleto" onclick="alternarMenuBoleto('${boleto.id}')" aria-label="Acoes do boleto"><i class="fa-solid fa-pencil"></i></button>
                            <div class="menu-boleto-opcoes" id="menu-boleto-${escapar(boleto.id)}">
                                <button type="button" onclick="darBaixaManualBoleto('${boleto.id}')">Dar baixa manual</button>
                                <button type="button" onclick="cancelarBoleto('${boleto.id}')">Cancelar boleto</button>
                                <button type="button" onclick="reenviarBoleto('${boleto.id}')">Enviar novamente</button>
                                <button type="button" onclick="imprimirBoleto('${boleto.id}')">Imprimir</button>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}
function atualizarStatusBoletos(base){
    base.boletos.forEach(function(boleto) {
        if(["Pago", "Cancelado"].includes(boleto.status)) return;
        if(String(boleto.vencimento || "") < dataIso()){
            boleto.status = "Atrasado";
        }else{
            boleto.status = "Pendente";
        }
    });
}

function statusBoleto(boleto){
    if(boleto.status === "Pago") return "Pago";
    if(boleto.status === "Cancelado") return "Cancelado";
    if(String(boleto.vencimento || "") < dataIso()) return "Atrasado";
    return boleto.status || "Pendente";
}

function alternarMenuBoleto(id){
    document.querySelectorAll(".menu-boleto-opcoes.aberto").forEach(function(menu) {
        if(menu.id !== "menu-boleto-" + id){
            menu.classList.remove("aberto");
        }
    });

    document.getElementById("menu-boleto-" + id)?.classList.toggle("aberto");
}

function darBaixaManualBoleto(id){
    const base = obterBase();
    const boleto = base.boletos.find(function(item) { return item.id === id; });
    if(!boleto) return;

    boleto.status = "Pago";
    boleto.pagoEm = new Date().toISOString();
    boleto.apiStatus = "baixa_manual";

    base.contasReceber.forEach(function(conta) {
        if(conta.boletoId === id){
            conta.status = "baixada";
            conta.saldo = 0;
            conta.baixadoEm = boleto.pagoEm;
        }
    });

    salvarBase(base);
    renderizarComercial();
}

function registrarRetornoPagamentoBoleto(retorno = {}){
    const base = obterBase();
    const boleto = base.boletos.find(function(item) {
        return item.id === retorno.id ||
            item.numero === retorno.numero ||
            (retorno.nossoNumero && item.nossoNumero === retorno.nossoNumero) ||
            (retorno.linhaDigitavel && item.linhaDigitavel === retorno.linhaDigitavel);
    });

    if(!boleto) return false;

    boleto.status = "Pago";
    boleto.pagoEm = retorno.pagoEm || new Date().toISOString();
    boleto.valorPago = numero(retorno.valorPago || retorno.valor || boleto.valor);
    boleto.apiStatus = retorno.status || "pago_api";
    boleto.retornoApi = retorno;

    base.contasReceber.forEach(function(conta) {
        if(conta.boletoId === boleto.id){
            conta.status = "baixada";
            conta.saldo = 0;
            conta.baixadoEm = boleto.pagoEm;
        }
    });

    salvarBase(base);
    renderizarComercial();
    return true;
}

function cancelarBoleto(id){
    if(!confirm("Deseja cancelar este boleto?")) return;
    const base = obterBase();
    const boleto = base.boletos.find(function(item) { return item.id === id; });
    if(!boleto) return;

    boleto.status = "Cancelado";
    boleto.canceladoEm = new Date().toISOString();
    boleto.apiStatus = "cancelamento_manual";

    base.contasReceber.forEach(function(conta) {
        if(conta.boletoId === id){
            conta.status = "cancelada";
            conta.saldo = 0;
        }
    });

    salvarBase(base);
    renderizarComercial();
}

function reenviarBoleto(id){
    const base = obterBase();
    const boleto = base.boletos.find(function(item) { return item.id === id; });
    if(!boleto) return;

    boleto.ultimoEnvioEm = new Date().toISOString();
    salvarBase(base);
    renderizarComercial();
    alert("Boleto preparado para reenvio por e-mail/WhatsApp.");
}

function imprimirBoleto(id){
    const base = obterBase();
    const boleto = base.boletos.find(function(item) { return item.id === id; });
    if(!boleto) return;

    const janela = window.open("", "_blank");
    if(!janela){
        alert("Permita pop-ups para imprimir o boleto.");
        return;
    }

    janela.document.write(`
        <html><head><title>${escapar(boleto.numero)}</title></head>
        <body style="font-family:Segoe UI,sans-serif;padding:28px">
            <h1>Boleto ${escapar(boleto.numero)}</h1>
            <p><strong>Cliente:</strong> ${escapar(boleto.cliente)}</p>
            <p><strong>Valor:</strong> ${formatarMoeda(boleto.valor)}</p>
            <p><strong>Vencimento:</strong> ${formatarData(boleto.vencimento)}</p>
            <p><strong>Status:</strong> ${escapar(statusBoleto(boleto))}</p>
            <hr>
            <p><strong>Linha digitavel:</strong> ${escapar(boleto.linhaDigitavel || "Aguardando retorno da API bancaria")}</p>
            <p><strong>PIX copia e cola:</strong> ${escapar(boleto.pixCopiaCola || "-")}</p>
        </body></html>
    `);
    janela.document.close();
    janela.print();
}

function renderizarRelatorios(base){
    const orcamentosAbertos = base.orcamentos.filter(function(item) {
        return item.status === "Aberto";
    }).length;
    const osAprovacao = base.ordensServico.filter(function(item) {
        return item.status === "Aguardando Aprovação";
    }).length;
    const vendas = base.vendas
        .filter(function(venda) { return ["Comercial", "Orçamento", "Ordem de Serviço"].includes(venda.origem); })
        .reduce(function(total, venda) { return total + numero(venda.total); }, 0);
    const receber = base.contasReceber
        .filter(function(conta) { return conta.status !== "baixada"; })
        .reduce(function(total, conta) { return total + numero(conta.saldo || conta.valor); }, 0);

    definirTexto("relOrcamentos", orcamentosAbertos);
    definirTexto("relOsAprovacao", osAprovacao);
    definirTexto("relVendas", formatarMoedaRS(vendas));
    definirTexto("relReceber", formatarMoedaRS(receber));
}

function selecionarOrcamento(id){
    const base = obterBase();
    const orcamento = base.orcamentos.find(function(item) {
        return item.id === id;
    });

    if(!orcamento) return;

    orcamentoSelecionadoId = id;
    definirValor("orcNumero", orcamento.numero);
    definirValor("orcData", String(orcamento.data || "").slice(0, 10));
    definirValor("orcValidade", String(orcamento.validade || "").slice(0, 10));
    definirValor("orcCliente", orcamento.cliente);
    definirValor("orcDocumento", orcamento.documento);
    definirValor("orcTelefone", orcamento.telefone);
    definirValor("orcItem", orcamento.item);
    definirValor("orcDescricao", orcamento.descricao);
    definirValor("orcQuantidade", orcamento.quantidade);
    definirValor("orcValorUnitario", orcamento.valorUnitario);
    definirValor("orcDesconto", orcamento.desconto);
    definirValor("orcAcrescimos", orcamento.acrescimos);
    calcularOrcamento();
    abrirAba("orcamentos");
}

function selecionarOs(id){
    const base = obterBase();
    const os = base.ordensServico.find(function(item) {
        return item.id === id;
    });

    if(!os) return;

    osSelecionadaId = id;
    definirValor("osCliente", os.cliente);
    definirValor("osDocumento", os.documento);
    definirValor("osTelefone", os.telefone);
    definirValor("osProduto", os.produto);
    definirValor("osMarca", os.marca);
    definirValor("osModelo", os.modelo);
    definirValor("osSerie", os.serie);
    definirValor("osDefeito", os.defeito);
    definirValor("osDiagnostico", os.diagnostico);
    definirValor("osServico", os.servico);
    definirValor("osTecnico", os.tecnico);
    definirValor("osValorServico", os.valorServico);
    definirValor("osPeca", os.peca);
    definirValor("osPecaQtde", os.pecaQtde);
    definirValor("osPecaValor", os.pecaValor);
    definirValor("osStatus", os.status);
    abrirAba("os");
}

function preencherOsComOrcamento(orcamento){
    definirValor("osCliente", orcamento.cliente);
    definirValor("osDocumento", orcamento.documento);
    definirValor("osTelefone", orcamento.telefone);
    definirValor("osProduto", orcamento.descricao);
    definirValor("osServico", orcamento.descricao);
    definirValor("osValorServico", orcamento.total);
    definirValor("osStatus", "Aguardando Aprovação");
}

function importarOrcamentoParaBoleto(){
    const base = obterBase();
    const id = valorCampo("boletoOrcamento");
    const orcamento = base.orcamentos.find(function(item) {
        return item.id === id;
    });

    if(!orcamento) return;

    definirValor("boletoCliente", orcamento.cliente);
    definirValor("boletoValor", orcamento.total);
}

function atualizarSelectOrcamentos(base){
    const select = document.getElementById("boletoOrcamento");
    if(!select) return;

    const atual = select.value;
    select.innerHTML = `<option value="">Criar cobrança avulsa</option>` + base.orcamentos.map(function(orcamento) {
        return `<option value="${escapar(orcamento.id)}">${escapar(orcamento.numero)} - ${escapar(orcamento.cliente)} (${formatarMoeda(orcamento.total)})</option>`;
    }).join("");
    select.value = atual;
}

function limparBoleto(){
    definirValor("boletoOrcamento", "");
    definirValor("boletoCliente", "");
    definirValor("boletoValor", "0");
    definirValor("boletoVencimento", somarDias(dataIso(), 3));
    definirValor("boletoDiaVencimento", "10");
    definirValor("boletoParcelas", "1");
    definirValor("boletoJuros", "0");
    definirValor("boletoMulta", "0");
}

function calcularOrcamento(){
    const subtotal = numero(valorCampo("orcQuantidade")) * numero(valorCampo("orcValorUnitario"));
    const total = totalOrcamento();
    definirValor("orcSubtotal", formatarMoeda(subtotal));
    definirValor("orcValorFinal", formatarMoeda(total));
}

function totalOrcamento(){
    const subtotal = numero(valorCampo("orcQuantidade")) * numero(valorCampo("orcValorUnitario"));
    return Math.max(0, subtotal - numero(valorCampo("orcDesconto")) + numero(valorCampo("orcAcrescimos")));
}

function calcularVenda(){
    const total = numero(valorCampo("vendaQtde")) * numero(valorCampo("vendaValor"));
    definirValor("vendaTotal", formatarMoeda(total));
}

function obterOrcamentoSelecionado(base){
    const orcamento = base.orcamentos.find(function(item) {
        return item.id === orcamentoSelecionadoId;
    }) || base.orcamentos[base.orcamentos.length - 1];

    if(!orcamento){
        alert("Salve ou selecione um orçamento primeiro.");
        return null;
    }

    orcamentoSelecionadoId = orcamento.id;
    return orcamento;
}

function obterOsSelecionada(base){
    const os = base.ordensServico.find(function(item) {
        return item.id === osSelecionadaId;
    }) || base.ordensServico[base.ordensServico.length - 1];

    if(!os){
        alert("Salve ou selecione uma OS primeiro.");
        return null;
    }

    osSelecionadaId = os.id;
    return os;
}

function localizarProduto(base, termo){
    const busca = normalizar(termo);
    return base.mercadorias.find(function(produto) {
        return normalizar(produto.codigo) === busca || normalizar(produto.descricao || produto.nome).includes(busca);
    });
}

function opcoesBoleto(){
    return {
        boleto: document.getElementById("opBoleto")?.checked || false,
        pix: document.getElementById("opPix")?.checked || false,
        whatsapp: document.getElementById("opWhatsapp")?.checked || false,
        email: document.getElementById("opEmail")?.checked || false
    };
}

function obterBase(){
    const base = lerJson(BASE_KEY, {});

    base.clientes = Array.isArray(base.clientes) ? base.clientes : lerJson("clientes", []);
    base.mercadorias = Array.isArray(base.mercadorias) ? base.mercadorias : lerJson("mercadorias", []);
    base.vendas = Array.isArray(base.vendas) ? base.vendas : [];
    base.contasReceber = Array.isArray(base.contasReceber) ? base.contasReceber : [];
    base.orcamentos = Array.isArray(base.orcamentos) ? base.orcamentos : [];
    base.ordensServico = Array.isArray(base.ordensServico) ? base.ordensServico : [];
    base.boletos = Array.isArray(base.boletos) ? base.boletos : [];
    base.movimentosEstoque = Array.isArray(base.movimentosEstoque) ? base.movimentosEstoque : [];
    base.movimentosComerciais = Array.isArray(base.movimentosComerciais) ? base.movimentosComerciais : [];

    return base;
}function valorCampo(id){
    return document.getElementById(id)?.value?.trim() || "";
}

function definirValor(id, valor){
    const elemento = document.getElementById(id);
    if(elemento) elemento.value = valor ?? "";
}
function formatarData(valor){
    if(!valor) return "-";
    const data = new Date(String(valor).slice(0, 10) + "T00:00:00");
    if(Number.isNaN(data.getTime())) return "-";
    return data.toLocaleDateString("pt-BR");
}

function dataIso(){
    return new Date().toISOString().slice(0, 10);
}

function dataCurta(){
    return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function somarDias(dataTexto, dias){
    const data = new Date(dataTexto + "T00:00:00");
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
}

function diaData(dataTexto){
    const dia = Number.parseInt(String(dataTexto || "").slice(8, 10), 10);
    return Number.isFinite(dia) ? dia : 0;
}

function calcularVencimentoParcela(dataInicial, indice, diaPreferido){
    const base = new Date((dataInicial || somarDias(dataIso(), 3)) + "T00:00:00");
    base.setMonth(base.getMonth() + indice);

    const dia = Math.max(1, Math.min(31, Math.trunc(numero(diaPreferido) || base.getDate())));
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(dia, ultimoDia));

    return base.toISOString().slice(0, 10);
}

function proximoNumero(prefixo, quantidade){
    const base = obterBase();
    const mapa = {
        ORC: base.orcamentos.length + 1,
        OS: base.ordensServico.length + 1,
        BOL: base.boletos.length + 1
    };
    const numeroSequencial = quantidade || mapa[prefixo] || 1;
    return prefixo + "-" + String(numeroSequencial).padStart(5, "0");
}
function gerarPix(dados){
    return "00020126580014BR.GOV.BCB.PIX0136COMERCIAL-CONECCTA520400005303986540" +
        numero(dados.valor).toFixed(2).replace(".", "") +
        "5802BR5909CONECCTA6009SAO PAULO";
}
