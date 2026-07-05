let itensNfe = [];
let produtoSelecionadoNfe = null;
let abaDocumentoFiscal = "nfe";
let documentoAcaoAtual = null;
let documentoDevolucaoAtual = null;
let itensDevolucaoFiscal = [];

document.addEventListener("DOMContentLoaded", function() {
    document.querySelector("[data-abrir-nfe]")?.addEventListener("click", function() {
        location.href = new URL("telas/notasfiscais/emitirnfe.html", document.baseURI).href;
    });
    document.querySelector("[data-toggle-cadastro-cliente]")?.addEventListener("click", function() {
        alternarCadastroRapido("cadastroRapidoCliente");
    });
    document.querySelector("[data-toggle-cadastro-produto]")?.addEventListener("click", function() {
        alternarCadastroRapido("cadastroRapidoProduto");
    });
    document.getElementById("nfeCliente")?.addEventListener("change", preencherClienteSelecionado);
    const buscaCliente = document.getElementById("nfeClienteBusca");
    buscaCliente?.addEventListener("input", atualizarSugestoesClientes);
    buscaCliente?.addEventListener("focus", atualizarSugestoesClientes);
    buscaCliente?.addEventListener("keydown", selecionarClienteComEnter);
    document.getElementById("btnRemoverClienteNfe")?.addEventListener("click", removerClienteNfe);
    document.addEventListener("click", fecharSugestoesClienteAoClicarFora);
    document.querySelectorAll("[data-fechar-cadastro-rapido]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            alternarCadastroRapido(botao.dataset.fecharCadastroRapido, true);
        });
    });
    document.querySelectorAll(".nfe-modal-cadastro").forEach(function(modal) {
        modal.addEventListener("click", function(evento) {
            if(evento.target === modal) alternarCadastroRapido(modal.id, true);
        });
    });
    document.addEventListener("keydown", function(evento) {
        if(evento.key === "Escape"){
            alternarCadastroRapido("cadastroRapidoCliente", true);
            alternarCadastroRapido("cadastroRapidoProduto", true);
        }
    });
    document.getElementById("nfeNaturezaOperacao")?.addEventListener("change", aplicarRegraNaturezaOperacao);
    document.getElementById("nfeFinalidade")?.addEventListener("change", aplicarRegraFinalidadeNfe);
    document.getElementById("nfeTipoOperacao")?.addEventListener("change", aplicarRegraTipoOperacao);
    document.getElementById("nfePagamento")?.addEventListener("change", atualizarCamposBoletoNfe);
    const buscaProduto = document.getElementById("nfeProdutoBusca");
    buscaProduto?.addEventListener("input", atualizarSugestoesProdutos);
    buscaProduto?.addEventListener("focus", atualizarSugestoesProdutos);
    buscaProduto?.addEventListener("keydown", selecionarSugestaoComEnter);
    document.addEventListener("click", fecharSugestoesProdutoAoClicarFora);
    document.getElementById("btnSalvarClienteRapido")?.addEventListener("click", salvarClienteRapido);
    document.getElementById("btnSalvarProdutoRapido")?.addEventListener("click", salvarProdutoRapido);
    document.getElementById("btnAdicionarItemNfe")?.addEventListener("click", adicionarItemNfe);
    document.getElementById("btnValidarNfe")?.addEventListener("click", validarNfe);
    document.getElementById("btnSalvarNfe")?.addEventListener("click", salvarRascunhoNfe);
    document.getElementById("btnNovoNfe")?.addEventListener("click", function() { location.reload(); });
    document.getElementById("btnPreviewDanfe")?.addEventListener("click", previewDanfe);
    document.getElementById("btnTransmitirNfe")?.addEventListener("click", transmitirNfe);
    document.getElementById("btnConsultarNfe")?.addEventListener("click", consultarStatusNfe);
    document.getElementById("btnCancelarNfe")?.addEventListener("click", cancelarNfe);
    document.getElementById("btnCartaCorrecao")?.addEventListener("click", cartaCorrecao);
    document.getElementById("btnBaixarXmlNfe")?.addEventListener("click", baixarXmlNfe);
    document.getElementById("btnBaixarDanfe")?.addEventListener("click", baixarDanfe);
    document.getElementById("btnEnviarEmailNfe")?.addEventListener("click", enviarEmailNfe);
    document.querySelector("[data-abrir-emitidas]")?.addEventListener("click", abrirDocumentosFiscais);
    document.querySelectorAll("[data-doc-tab]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            abaDocumentoFiscal = botao.dataset.docTab || "nfe";
            renderizarDocumentosFiscais();
        });
    });
    document.getElementById("filtroStatusDocumento")?.addEventListener("change", renderizarDocumentosFiscais);
    document.getElementById("buscaDocumentoFiscal")?.addEventListener("input", renderizarDocumentosFiscais);
    document.getElementById("filtroDataIniDoc")?.addEventListener("change", renderizarDocumentosFiscais);
    document.getElementById("filtroDataFimDoc")?.addEventListener("change", renderizarDocumentosFiscais);
    document.getElementById("listaDocumentosFiscais")?.addEventListener("click", tratarCliqueDocumentoFiscal);
    document.getElementById("btnFecharAcaoDocumento")?.addEventListener("click", fecharPainelAcaoDocumento);
    document.getElementById("conteudoAcaoDocumento")?.addEventListener("click", tratarAcaoPainelDocumento);
    document.getElementById("itensDevolucaoFiscal")?.addEventListener("change", tratarAlteracaoItemDevolucao);
    document.getElementById("btnSalvarDevolucaoFiscal")?.addEventListener("click", salvarDevolucaoFiscal);
    document.getElementById("btnBaixarXmlDevolucao")?.addEventListener("click", baixarXmlDevolucaoFiscal);
    ["nfeFrete", "nfeSeguro", "nfeDesconto", "nfeOutrasDespesas", "nfeValorPago"].forEach(function(id) {
        document.getElementById(id)?.addEventListener("input", atualizarTotaisNfe);
    });

    if(document.getElementById("emissaoNfe")){
        carregarDadosNfe();
    }
    inicializarDocumentosFiscais();
    inicializarDevolucaoFiscal();
});

function abrirEmissaoNfe(){
    const painel = document.getElementById("emissaoNfe");
    painel?.classList.remove("recolhido");
    painel?.setAttribute("aria-hidden", "false");
    painel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function inicializarDocumentosFiscais(){
    if(!document.getElementById("documentosFiscais")) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const ini  = document.getElementById("filtroDataIniDoc");
    const fim  = document.getElementById("filtroDataFimDoc");
    if(ini && !ini.value) ini.value = hoje;
    if(fim && !fim.value) fim.value = hoje;
    renderizarDocumentosFiscais();
}

function abrirDocumentosFiscais(){
    const painel = document.getElementById("documentosFiscais");
    painel?.classList.remove("recolhido");
    painel?.scrollIntoView({ behavior: "smooth", block: "start" });
    renderizarDocumentosFiscais();
}

function renderizarDocumentosFiscais(){
    const destino = document.getElementById("listaDocumentosFiscais");
    const cabecalho = document.getElementById("cabecalhoDocumentosFiscais");
    if(!destino || !cabecalho) return;

    document.querySelectorAll("[data-doc-tab]").forEach(function(botao) {
        botao.classList.toggle("ativa", botao.dataset.docTab === abaDocumentoFiscal);
    });

    cabecalho.innerHTML = abaDocumentoFiscal === "nfe"
        ? `<tr><th>Número</th><th>Série</th><th>Cliente</th><th>Emissão</th><th>Status</th><th>Total</th><th>Opções</th></tr>`
        : `<tr><th>Número</th><th>Série</th><th>PDV</th><th>Operador</th><th>Emissão</th><th>Status</th><th>Total</th><th>Opções</th></tr>`;

    const documentos = filtrarDocumentosFiscais(obterDocumentosFiscais(abaDocumentoFiscal));

    if(documentos.length === 0){
        destino.innerHTML = `<tr><td colspan="${abaDocumentoFiscal === "nfe" ? 7 : 8}" class="vazio">Nenhum documento encontrado.</td></tr>`;
        return;
    }

    destino.innerHTML = documentos.map(function(documento) {
        const status = normalizarStatusDocumento(documento.status);
        const comum = `
            <td><strong>${escapar(documento.numero || documento.id || "-")}</strong></td>
            <td>${escapar(documento.serie || "-")}</td>
        `;

        if(documento.tipo === "nfe"){
            return `
                <tr>
                    ${comum}
                    <td>${escapar(documento.cliente || "-")}</td>
                    <td>${formatarDataHoraDocumento(documento.emissao)}</td>
                    <td><span class="badge-status ${status}">${rotuloStatusDocumento(status)}</span></td>
                    <td>${formatarMoeda(documento.total || 0)}</td>
                    <td>${menuOpcoesDocumento(documento)}</td>
                </tr>
            `;
        }

        return `
            <tr>
                ${comum}
                <td>${escapar(documento.pdv || "Caixa PDV")}</td>
                <td>${escapar(documento.operador || "-")}</td>
                <td>${formatarDataHoraDocumento(documento.emissao)}</td>
                <td><span class="badge-status ${status}">${rotuloStatusDocumento(status)}</span></td>
                <td>${formatarMoeda(documento.total || 0)}</td>
                <td>${menuOpcoesDocumento(documento)}</td>
            </tr>
        `;
    }).join("");
}

function obterDocumentosFiscais(tipo){
    const base = obterBase();
    base.vendas = Array.isArray(base.vendas) ? base.vendas : [];
    base.vendasCanceladas = Array.isArray(base.vendasCanceladas) ? base.vendasCanceladas : [];
    base.devolucoesFiscais = Array.isArray(base.devolucoesFiscais) ? base.devolucoesFiscais : [];

    if(tipo === "nfce"){
        const emitidas = base.vendas
            .filter(function(venda) { return venda.documento === "NFC-e"; })
            .map(function(venda, indice) {
                return normalizarNfceDocumento(venda, venda.status || "emitida", indice + 1);
            });
        const canceladas = base.vendasCanceladas
            .filter(function(venda) { return venda.documento === "NFC-e"; })
            .map(function(venda, indice) {
                return normalizarNfceDocumento(venda, "cancelada", indice + 1);
            });
        const devolvidas = base.devolucoesFiscais
            .filter(function(doc) { return doc.tipoOrigem === "nfce"; })
            .map(function(doc) { return normalizarDevolucaoDocumento(doc, "nfce"); });
        return [...emitidas, ...canceladas, ...devolvidas].sort(ordenarPorEmissaoDesc);
    }

    return [
        ...base.notasSaida.map(normalizarNfeDocumento),
        ...base.devolucoesFiscais.filter(function(doc) { return doc.tipoOrigem === "nfe"; }).map(function(doc) {
            return normalizarDevolucaoDocumento(doc, "nfe");
        })
    ].sort(ordenarPorEmissaoDesc);
}

function filtrarDocumentosFiscais(documentos){
    const statusFiltro = document.getElementById("filtroStatusDocumento")?.value || "todos";
    const termo        = normalizarBusca(document.getElementById("buscaDocumentoFiscal")?.value || "");
    const dataIni      = document.getElementById("filtroDataIniDoc")?.value || "";
    const dataFim      = document.getElementById("filtroDataFimDoc")?.value || "";

    return documentos.filter(function(documento) {
        const statusOk = statusFiltro === "todos" || normalizarStatusDocumento(documento.status) === statusFiltro;
        const texto = normalizarBusca([
            documento.numero,
            documento.serie,
            documento.cliente,
            documento.operador,
            documento.pdv,
            documento.status,
            documento.id
        ].join(" "));
        const dataDoc = (documento.emissao || "").slice(0, 10);
        const dataIniOk = !dataIni || dataDoc >= dataIni;
        const dataFimOk = !dataFim || dataDoc <= dataFim;
        return statusOk && dataIniOk && dataFimOk && (!termo || texto.includes(termo));
    });
}

function normalizarNfeDocumento(nota){
    return {
        tipo: "nfe",
        id: nota.id,
        numero: nota.numero,
        serie: nota.serie,
        cliente: nota.destinatario?.documento || nota.destinatario?.nome || "Destinatário",
        emissao: nota.dataHoraEmissao || nota.emissao || nota.criadoEm,
        status: nota.status === "rascunho" ? "emitida" : nota.status || "emitida",
        total: nota.totais?.nota || 0,
        origem: nota,
        xml: nota.xml || ""
    };
}

function normalizarNfceDocumento(venda, status, indice){
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    return {
        tipo: "nfce",
        id: venda.id,
        numero: venda.numeroNfce || venda.numero || String(indice).padStart(6, "0"),
        serie: venda.serieNfce || config.fiscalSerieNfce || "1",
        cliente: venda.cliente?.nome || "Consumidor",
        pdv: venda.pdv || "Caixa PDV",
        operador: venda.usuarioNome || venda.usuarioLogin || "Administrador",
        emissao: venda.data || venda.canceladaEm,
        status,
        total: venda.total || 0,
        origem: venda,
        xml: venda.xml || ""
    };
}

function normalizarDevolucaoDocumento(devolucao, tipo){
    return {
        tipo,
        id: devolucao.id,
        numero: devolucao.numero || devolucao.origemNumero || "-",
        serie: devolucao.serie || devolucao.origemSerie || "-",
        cliente: devolucao.cliente || devolucao.destinatario || "Destinatário",
        pdv: devolucao.pdv || "Caixa PDV",
        operador: devolucao.operador || "-",
        emissao: devolucao.criadoEm,
        status: "devolvida",
        total: devolucao.total || 0,
        origem: devolucao,
        xml: devolucao.xml || ""
    };
}

function menuOpcoesDocumento(documento){
    const podeCancelar = documento.tipo === "nfe" || podeCancelarNfce(documento);
    const opcoesCancelamento = podeCancelar
        ? `<button type="button" data-doc-acao="cancelar" data-doc-tipo="${documento.tipo}" data-doc-id="${escapar(documento.id)}">Cancelar</button>`
        : "";
    const carta = documento.tipo === "nfe"
        ? `<button type="button" data-doc-acao="carta" data-doc-tipo="${documento.tipo}" data-doc-id="${escapar(documento.id)}">Carta correção</button>`
        : "";
    const duplicar = documento.tipo === "nfe"
        ? `<button type="button" data-doc-acao="duplicar" data-doc-tipo="${documento.tipo}" data-doc-id="${escapar(documento.id)}">Duplicar</button>`
        : "";

    return `
        <div class="doc-opcoes">
            <button type="button" class="btn-doc secundario" data-doc-menu>Opções</button>
            <div class="menu-doc recolhido">
                ${opcoesCancelamento}
                <button type="button" data-doc-acao="devolucao" data-doc-tipo="${documento.tipo}" data-doc-id="${escapar(documento.id)}">Devolução</button>
                ${duplicar}
                ${carta}
                <button type="button" data-doc-acao="xml" data-doc-tipo="${documento.tipo}" data-doc-id="${escapar(documento.id)}">Baixar XML</button>
            </div>
        </div>
    `;
}

function tratarCliqueDocumentoFiscal(evento){
    const menu = evento.target.closest("[data-doc-menu]");
    if(menu){
        const opcoes = menu.parentElement.querySelector(".menu-doc");
        document.querySelectorAll(".menu-doc").forEach(function(item) {
            if(item !== opcoes) item.classList.add("recolhido");
        });
        opcoes?.classList.toggle("recolhido");
        return;
    }

    const acao = evento.target.closest("[data-doc-acao]");
    if(!acao) return;

    const documento = localizarDocumentoFiscal(acao.dataset.docTipo, acao.dataset.docId);
    if(!documento) return;

    document.querySelectorAll(".menu-doc").forEach(function(item) { item.classList.add("recolhido"); });
    executarAcaoDocumentoFiscal(acao.dataset.docAcao, documento);
}

function executarAcaoDocumentoFiscal(acao, documento){
    if(acao === "cancelar") return cancelarDocumentoFiscal(documento);
    if(acao === "devolucao") return abrirTelaDevolucaoDocumento(documento);
    if(acao === "duplicar") return duplicarDocumentoFiscal(documento);
    if(acao === "carta") return abrirCartaCorrecaoDocumento(documento);
    if(acao === "xml") return baixarXmlDocumentoFiscal(documento);
}

function localizarDocumentoFiscal(tipo, id){
    return obterDocumentosFiscais(tipo).find(function(documento) {
        return documento.id === id;
    });
}

function abrirTelaDevolucaoDocumento(documento){
    location.href = new URL(`telas/notasfiscais/devolucaofiscal.html?tipo=${encodeURIComponent(documento.tipo)}&id=${encodeURIComponent(documento.id)}`, document.baseURI).href;
}

function cancelarDocumentoFiscal(documento){
    if(documento.tipo === "nfce" && !podeCancelarNfce(documento)){
        alert("NFC-e com mais de 30 minutos. Use devolução.");
        abrirTelaDevolucaoDocumento(documento);
        return;
    }

    const motivo = prompt("Informe o motivo do cancelamento:");
    if(motivo === null) return;

    const base = obterBase();
    if(documento.tipo === "nfe"){
        const nota = base.notasSaida.find(function(item) { return item.id === documento.id; });
        if(nota){
            nota.status = "cancelada";
            nota.canceladaEm = new Date().toISOString();
            nota.motivoCancelamento = motivo.trim() || "Cancelamento fiscal";
        }
    }else{
        const indice = base.vendas.findIndex(function(item) { return item.id === documento.id; });
        if(indice >= 0){
            const venda = base.vendas[indice];
            base.vendas.splice(indice, 1);
            base.vendasCanceladas.push({
                ...venda,
                canceladaEm: new Date().toISOString(),
                motivoCancelamento: motivo.trim() || "Cancelamento fiscal"
            });
        }
    }

    salvarBase(base);
    renderizarDocumentosFiscais();
}

function abrirDevolucaoDocumento(documento){
    documentoAcaoAtual = documento;
    const painel = document.getElementById("painelAcaoDocumento");
    definirTexto("tituloAcaoDocumento", "Devolução fiscal");
    definirTexto("subtituloAcaoDocumento", `${documento.tipo.toUpperCase()} ${documento.numero} série ${documento.serie}`);
    document.getElementById("conteudoAcaoDocumento").innerHTML = `
        <div class="acao-grid">
            <div class="campo-total doc-resumo">${resumoDocumentoFiscal(documento)}</div>
            <label>Natureza da devolução
                <input type="text" id="docNaturezaDevolucao" value="${documento.tipo === "nfce" ? "Devolução de Venda NFC-e" : "Devolução de Venda"}">
            </label>
            <label>Data e hora
                <input type="datetime-local" id="docDataDevolucao" value="${dataHoraLocalAtual()}">
            </label>
            <label class="campo-total">Motivo / informações complementares
                <textarea id="docMotivoDevolucao" rows="4" placeholder="Informe o motivo da devolução e referência da nota original"></textarea>
            </label>
        </div>
        <div class="acoes-doc">
            <button type="button" class="btn-doc" data-painel-acao="confirmar-devolucao">Gerar devolução</button>
        </div>
    `;
    painel?.classList.remove("recolhido");
    painel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function abrirCartaCorrecaoDocumento(documento){
    if(!document.getElementById("conteudoAcaoDocumento")){
        const texto = prompt(`Carta de correção da NF-e ${documento.numero} série ${documento.serie}:`);
        if(!texto) return;
        salvarCartaCorrecaoDocumento(documento, texto);
        renderizarDocumentosFiscais();
        return;
    }

    documentoAcaoAtual = documento;
    const painel = document.getElementById("painelAcaoDocumento");
    definirTexto("tituloAcaoDocumento", "Carta de Correção");
    definirTexto("subtituloAcaoDocumento", `NF-e ${documento.numero} série ${documento.serie}`);
    document.getElementById("conteudoAcaoDocumento").innerHTML = `
        <div class="acao-grid">
            <div class="campo-total doc-resumo">${resumoDocumentoFiscal(documento)}</div>
            <label class="campo-total">Correção
                <textarea id="docTextoCarta" rows="5" placeholder="Descreva a correção permitida para a NF-e"></textarea>
            </label>
        </div>
        <div class="acoes-doc">
            <button type="button" class="btn-doc" data-painel-acao="confirmar-carta">Salvar carta de correção</button>
        </div>
    `;
    painel?.classList.remove("recolhido");
    painel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function tratarAcaoPainelDocumento(evento){
    const botao = evento.target.closest("[data-painel-acao]");
    if(!botao || !documentoAcaoAtual) return;

    if(botao.dataset.painelAcao === "confirmar-devolucao") confirmarDevolucaoDocumento();
    if(botao.dataset.painelAcao === "confirmar-carta") confirmarCartaCorrecaoDocumento();
}

function confirmarDevolucaoDocumento(){
    const base = obterBase();
    base.devolucoesFiscais = Array.isArray(base.devolucoesFiscais) ? base.devolucoesFiscais : [];

    const devolucao = {
        id: gerarId("dev"),
        tipoOrigem: documentoAcaoAtual.tipo,
        origemId: documentoAcaoAtual.id,
        origemNumero: documentoAcaoAtual.numero,
        origemSerie: documentoAcaoAtual.serie,
        numero: `DEV-${documentoAcaoAtual.numero}`,
        serie: documentoAcaoAtual.serie,
        cliente: documentoAcaoAtual.cliente,
        pdv: documentoAcaoAtual.pdv,
        operador: documentoAcaoAtual.operador,
        natureza: valor("docNaturezaDevolucao"),
        finalidade: "4",
        tipoOperacao: documentoAcaoAtual.tipo === "nfce" ? "0" : "0",
        motivo: valor("docMotivoDevolucao"),
        itens: documentoAcaoAtual.origem.itens || [],
        total: documentoAcaoAtual.total,
        criadoEm: valor("docDataDevolucao") || dataHoraLocalAtual(),
        status: "devolvida"
    };

    base.devolucoesFiscais.push(devolucao);
    marcarDocumentoComoDevolvido(base, documentoAcaoAtual);
    salvarBase(base);
    fecharPainelAcaoDocumento();
    renderizarDocumentosFiscais();
}

function confirmarCartaCorrecaoDocumento(){
    const texto = valor("docTextoCarta");
    if(!texto){
        alert("Informe o texto da carta de correção.");
        return;
    }

    salvarCartaCorrecaoDocumento(documentoAcaoAtual, texto);
    fecharPainelAcaoDocumento();
    renderizarDocumentosFiscais();
}

function salvarCartaCorrecaoDocumento(documento, texto){
    const base = obterBase();
    const nota = base.notasSaida.find(function(item) { return item.id === documento.id; });
    if(nota){
        nota.cartasCorrecao = Array.isArray(nota.cartasCorrecao) ? nota.cartasCorrecao : [];
        nota.cartasCorrecao.push({
            id: gerarId("cce"),
            texto,
            criadoEm: new Date().toISOString()
        });
    }
    salvarBase(base);
}

function duplicarDocumentoFiscal(documento){
    const base = obterBase();
    if(documento.tipo === "nfe"){
        const original = documento.origem;
        base.notasSaida.push({
            ...original,
            id: gerarId("nfe"),
            numero: `${original.numero || documento.numero}-C`,
            status: "emitida",
            criadoEm: new Date().toISOString(),
            duplicadaDe: original.id
        });
    }else{
        base.vendas.push({
            ...documento.origem,
            id: gerarId("ven"),
            data: new Date().toISOString(),
            duplicadaDe: documento.origem.id
        });
    }
    salvarBase(base);
    renderizarDocumentosFiscais();
}

function baixarXmlDocumentoFiscal(documento){
    const xml = documento.xml || gerarXmlDocumentoFiscal(documento);
    baixarArquivo(`${documento.tipo}_${documento.numero || documento.id}.xml`, xml, "application/xml;charset=utf-8");
}

function marcarDocumentoComoDevolvido(base, documento){
    if(documento.tipo === "nfe"){
        const nota = base.notasSaida.find(function(item) { return item.id === documento.id; });
        if(nota){
            nota.status = "devolvida";
            nota.devolvidaEm = new Date().toISOString();
        }
        return;
    }

    const venda = base.vendas.find(function(item) { return item.id === documento.id; });
    if(venda){
        venda.status = "devolvida";
        venda.devolvidaEm = new Date().toISOString();
    }
}

function fecharPainelAcaoDocumento(){
    document.getElementById("painelAcaoDocumento")?.classList.add("recolhido");
    documentoAcaoAtual = null;
}

function podeCancelarNfce(documento){
    const emissao = new Date(documento.emissao);
    if(Number.isNaN(emissao.getTime())) return false;
    return (Date.now() - emissao.getTime()) <= 30 * 60 * 1000;
}

function resumoDocumentoFiscal(documento){
    return `
        <strong>${documento.tipo.toUpperCase()} ${escapar(documento.numero || "-")} série ${escapar(documento.serie || "-")}</strong><br>
        Cliente: ${escapar(documento.cliente || "Consumidor")}<br>
        Emissão: ${formatarDataHoraDocumento(documento.emissao)}<br>
        Total: ${formatarMoeda(documento.total || 0)}<br>
        Itens importados: ${(documento.origem.itens || []).length}
    `;
}

function gerarXmlDocumentoFiscal(documento){
    return `<?xml version="1.0" encoding="UTF-8"?>\n<DocumentoFiscal>\n  <modelo>${documento.tipo === "nfe" ? "55" : "65"}</modelo>\n  <serie>${escaparXml(documento.serie || "")}</serie>\n  <numero>${escaparXml(documento.numero || "")}</numero>\n  <status>${escaparXml(normalizarStatusDocumento(documento.status))}</status>\n  <total>${numero(documento.total).toFixed(2)}</total>\n</DocumentoFiscal>`;
}

function ordenarPorEmissaoDesc(a, b){
    return new Date(b.emissao || 0) - new Date(a.emissao || 0);
}

function normalizarStatusDocumento(status){
    const texto = normalizarBusca(status || "emitida");
    if(texto.includes("cancel")) return "cancelada";
    if(texto.includes("devol")) return "devolvida";
    return "emitida";
}

function rotuloStatusDocumento(status){
    return status === "cancelada" ? "Cancelada" : status === "devolvida" ? "Devolvida" : "Emitida";
}

function formatarDataHoraDocumento(data){
    if(!data) return "-";
    const valorData = new Date(data);
    if(Number.isNaN(valorData.getTime())) return escapar(String(data));
    return valorData.toLocaleString("pt-BR");
}

function inicializarDevolucaoFiscal(){
    if(!document.getElementById("devolucaoFiscal")) return;

    const parametros = new URLSearchParams(location.search);
    const tipo = parametros.get("tipo") || "nfe";
    const id = parametros.get("id") || "";
    documentoDevolucaoAtual = localizarDocumentoFiscal(tipo, id);

    if(!documentoDevolucaoAtual){
        definirTexto("statusDevolucaoFiscal", "Documento não encontrado");
        definirTexto("resumoDocumentoOrigem", "Documento fiscal não encontrado.");
        return;
    }

    prepararDadosDevolucao(documentoDevolucaoAtual);
    renderizarItensDevolucaoFiscal();
    atualizarTotaisDevolucaoFiscal();
}

function prepararDadosDevolucao(documento){
    const natureza = documento.tipo === "nfce" ? "Devolução de Venda NFC-e" : "Devolução de Venda";
    definirValorCampo("devolucaoNatureza", natureza);
    definirValorCampo("devolucaoFinalidade", "4");
    definirValorCampo("devolucaoTipoOperacao", "0");
    definirValorCampo("devolucaoDataHora", dataHoraLocalAtual());
    definirValorCampo("devolucaoSerie", documento.serie || "1");
    definirValorCampo("devolucaoNumero", `DEV-${documento.numero || documento.id}`);
    definirValorCampo("devolucaoInformacoes", `Documento de devolução referente a ${documento.tipo.toUpperCase()} ${documento.numero || documento.id}, série ${documento.serie || "-"}.`);

    const resumo = document.getElementById("resumoDocumentoOrigem");
    if(resumo){
        resumo.innerHTML = `
            <strong>${documento.tipo.toUpperCase()} ${escapar(documento.numero || documento.id)} - Série ${escapar(documento.serie || "-")}</strong>
            <span>Cliente: ${escapar(documento.cliente || "Consumidor")}</span>
            <span>Emissão original: ${formatarDataHoraDocumento(documento.emissao)}</span>
            <span>Status: ${rotuloStatusDocumento(normalizarStatusDocumento(documento.status))} | Total: ${formatarMoeda(documento.total || 0)}</span>
        `;
    }

    itensDevolucaoFiscal = (documento.origem.itens || []).map(function(item, indice) {
        const quantidade = numero(item.quantidade ?? item.qtd ?? 1);
        const valorUnitario = numero(item.valorUnitario ?? item.precoUnitario ?? item.valor ?? 0);
        return {
            id: item.id || item.linhaId || `item-${indice}`,
            codigo: item.codigo || "",
            descricao: item.descricao || item.produto || "Item",
            quantidadeOriginal: quantidade,
            quantidadeDevolvida: quantidade,
            valorUnitario,
            cfop: item.cfop || item.fiscal?.cfop || "1202",
            ncm: item.ncm || item.fiscal?.ncm || "",
            cst: item.cst || item.csosn || item.fiscal?.cst || "",
            total: quantidade * valorUnitario
        };
    });
}

function renderizarItensDevolucaoFiscal(){
    const destino = document.getElementById("itensDevolucaoFiscal");
    if(!destino) return;

    if(itensDevolucaoFiscal.length === 0){
        destino.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum item importado da nota original.</td></tr>`;
        return;
    }

    destino.innerHTML = itensDevolucaoFiscal.map(function(item) {
        return `
            <tr>
                <td><strong>${escapar(item.descricao)}</strong><br><small>${escapar(item.codigo || "-")}</small></td>
                <td>${formatarQuantidade(item.quantidadeOriginal)}</td>
                <td><input class="item-editavel" type="number" min="0" max="${escapar(item.quantidadeOriginal)}" step="0.01" value="${escapar(item.quantidadeDevolvida)}" data-dev-id="${escapar(item.id)}"></td>
                <td>${formatarMoeda(item.valorUnitario)}</td>
                <td><input class="item-editavel" type="text" value="${escapar(item.cfop)}" data-dev-cfop="${escapar(item.id)}"></td>
                <td>${escapar(item.ncm || "-")}</td>
                <td>${formatarMoeda(item.total)}</td>
            </tr>
        `;
    }).join("");
}

function tratarAlteracaoItemDevolucao(evento){
    const qtdId = evento.target.dataset.devId;
    const cfopId = evento.target.dataset.devCfop;
    const id = qtdId || cfopId;
    const item = itensDevolucaoFiscal.find(function(registro) {
        return registro.id === id;
    });
    if(!item) return;

    if(qtdId){
        item.quantidadeDevolvida = Math.min(item.quantidadeOriginal, Math.max(0, numero(evento.target.value)));
    }

    if(cfopId){
        item.cfop = evento.target.value.trim() || item.cfop;
    }

    item.total = item.quantidadeDevolvida * item.valorUnitario;
    renderizarItensDevolucaoFiscal();
    atualizarTotaisDevolucaoFiscal();
}

function atualizarTotaisDevolucaoFiscal(){
    const itensValidos = itensDevolucaoFiscal.filter(function(item) {
        return numero(item.quantidadeDevolvida) > 0;
    });
    const total = itensValidos.reduce(function(soma, item) {
        return soma + numero(item.total);
    }, 0);
    definirTexto("devolucaoTotalItens", String(itensValidos.length));
    definirTexto("devolucaoTotalNota", formatarMoedaRS(total));
}

function montarDevolucaoFiscal(){
    const itens = itensDevolucaoFiscal.filter(function(item) {
        return numero(item.quantidadeDevolvida) > 0;
    });
    const total = itens.reduce(function(soma, item) {
        return soma + numero(item.total);
    }, 0);

    return {
        id: gerarId("dev"),
        tipoOrigem: documentoDevolucaoAtual.tipo,
        origemId: documentoDevolucaoAtual.id,
        origemNumero: documentoDevolucaoAtual.numero,
        origemSerie: documentoDevolucaoAtual.serie,
        numero: valor("devolucaoNumero"),
        serie: valor("devolucaoSerie"),
        cliente: documentoDevolucaoAtual.cliente,
        pdv: documentoDevolucaoAtual.pdv,
        operador: documentoDevolucaoAtual.operador,
        natureza: valor("devolucaoNatureza"),
        finalidade: "4",
        tipoOperacao: valor("devolucaoTipoOperacao"),
        dataHoraEmissao: valor("devolucaoDataHora") || dataHoraLocalAtual(),
        motivo: valor("devolucaoMotivo"),
        informacoesComplementares: valor("devolucaoInformacoes"),
        itens,
        total,
        status: "devolvida",
        xml: gerarXmlDocumentoFiscal({
            tipo: documentoDevolucaoAtual.tipo,
            numero: valor("devolucaoNumero"),
            serie: valor("devolucaoSerie"),
            status: "devolvida",
            total
        }),
        criadoEm: new Date().toISOString()
    };
}

function salvarDevolucaoFiscal(){
    if(!documentoDevolucaoAtual) return;
    const devolucao = montarDevolucaoFiscal();

    if(devolucao.itens.length === 0){
        alert("Informe ao menos uma quantidade devolvida.");
        return;
    }

    const base = obterBase();
    base.devolucoesFiscais = Array.isArray(base.devolucoesFiscais) ? base.devolucoesFiscais : [];
    base.devolucoesFiscais.push(devolucao);
    marcarDocumentoComoDevolvido(base, documentoDevolucaoAtual);
    salvarBase(base);
    definirTexto("statusDevolucaoFiscal", "Devolução salva");
    notificar("Devolução fiscal salva e vinculada ao documento original.", "sucesso");
}

function baixarXmlDevolucaoFiscal(){
    if(!documentoDevolucaoAtual) return;
    const devolucao = montarDevolucaoFiscal();
    baixarArquivo(`${devolucao.tipoOrigem}_devolucao_${devolucao.numero || devolucao.id}.xml`, devolucao.xml, "application/xml;charset=utf-8");
}

function carregarDadosNfe(){
    carregarEmitente();
    carregarClientesSelect();
    carregarProdutosSelect();
    carregarFormasPagamentoNfe();
    preencherPadroesNfe();
    inicializarAbasImpostos();
    ajustarCamposRegime();
    renderizarItensNfe();
    atualizarTotaisNfe();
    carregarStagingBoletoParaNfe();
}

function carregarStagingBoletoParaNfe(){
    const bruto = localStorage.getItem("boletoParaNfe");
    if(!bruto) return;
    localStorage.removeItem("boletoParaNfe");

    let staging;
    try{ staging = JSON.parse(bruto); }catch(erro){ return; }
    if(!staging) return;

    const base = obterBase();

    if(staging.clienteId){
        const select = document.getElementById("nfeCliente");
        if(select){
            select.value = staging.clienteId;
            preencherClienteSelecionado();
        }
    }

    (staging.itens || []).forEach(function(itemStaging){
        const produto = (base.mercadorias || []).find(function(p){ return p.id === itemStaging.produtoId; });
        if(!produto) return;
        definirValorCampo("nfeProdutoBusca", textoProdutoBusca(produto));
        preencherProdutoSelecionado();
        definirValorCampo("nfeProdutoQtde", itemStaging.quantidade || 1);
        if(numero(itemStaging.valorUnitario) > 0) definirValorCampo("nfeProdutoValor", itemStaging.valorUnitario);
        adicionarItemNfe();
    });

    if(staging.formaPagamento){
        const selectPagamento = document.getElementById("nfePagamento");
        if(selectPagamento){
            selectPagamento.value = staging.formaPagamento;
            atualizarCamposBoletoNfe();
        }
    }

    if(staging.boletoVencimento) definirValorCampo("nfeBoletoVencimento", staging.boletoVencimento);
    if(staging.boletoParcelas) definirValorCampo("nfeBoletoParcelas", staging.boletoParcelas);
    if(staging.observacao) definirValorCampo("nfeObservacoesFiscais", staging.observacao);

    notificar("Dados da cobranca carregados. Revise e emita a NF-e.", "sucesso");
}

function inicializarAbasImpostos(){
    document.querySelectorAll("[data-aba-imposto]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            const aba = botao.dataset.abaImposto;
            document.querySelectorAll("[data-aba-imposto]").forEach(function(b) {
                b.classList.toggle("ativa", b.dataset.abaImposto === aba);
            });
            document.querySelectorAll(".conteudo-aba-imposto").forEach(function(div) {
                div.classList.add("recolhido");
            });
            document.getElementById("abaImposto" + aba.charAt(0).toUpperCase() + aba.slice(1))?.classList.remove("recolhido");
        });
    });
}

function ajustarCamposRegime(){
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    const regime = (config.fiscalRegimeTributario || "").toLowerCase();
    const ehSimplesOuMei = regime === "simples" || regime === "mei";

    const labels = {
        "simples": "Simples Nacional",
        "mei": "MEI",
        "presumido": "Lucro Presumido",
        "real": "Lucro Real"
    };
    const badge = document.getElementById("badgeRegime");
    if(badge){
        badge.textContent = labels[regime] || regime || "Regime não configurado";
        badge.className = "badge-regime badge-regime-" + (regime || "nd");
    }

    // CSOSN visível apenas para Simples/MEI; CST ICMS para os demais
    document.getElementById("grupoImpCsosn")?.classList.toggle("recolhido", !ehSimplesOuMei);
    document.getElementById("grupoImpCstIcms")?.classList.toggle("recolhido", ehSimplesOuMei);

    // Preencher alíquotas padrão da configuração
    if(config.fiscalAliquotaIcmsPadrao) definirValorCampo("impAliquotaIcms", config.fiscalAliquotaIcmsPadrao);
    if(config.fiscalAliquotaPisPadrao) definirValorCampo("impAliquotaPis", config.fiscalAliquotaPisPadrao);
    if(config.fiscalAliquotaCofinsPadrao) definirValorCampo("impAliquotaCofins", config.fiscalAliquotaCofinsPadrao);
    if(config.fiscalAliquotaIpiPadrao) definirValorCampo("impAliquotaIpi", config.fiscalAliquotaIpiPadrao);
    if(config.fiscalCsosnPadrao) definirValorCampo("impCsosn", config.fiscalCsosnPadrao);
    if(config.fiscalCstIcmsPadrao) definirValorCampo("impCstIcms", config.fiscalCstIcmsPadrao);
    if(config.fiscalCstPisPadrao) definirValorCampo("impCstPis", config.fiscalCstPisPadrao);
    if(config.fiscalCstCofinsPadrao) definirValorCampo("impCstCofins", config.fiscalCstCofinsPadrao);
    if(config.fiscalCstIpiPadrao) definirValorCampo("impCstIpi", config.fiscalCstIpiPadrao);
}

function atualizarPainelImpostos(){
    const base = itensNfe.reduce(function(acc, item) {
        return acc + numero(item.total);
    }, 0);

    const icms = itensNfe.reduce(function(acc, item) { return acc + numero(item.impostos?.icms?.valor); }, 0);
    const pis  = itensNfe.reduce(function(acc, item) { return acc + numero(item.impostos?.pis?.valor);  }, 0);
    const cof  = itensNfe.reduce(function(acc, item) { return acc + numero(item.impostos?.cofins?.valor); }, 0);
    const ipi  = itensNfe.reduce(function(acc, item) { return acc + numero(item.impostos?.ipi?.valor);  }, 0);

    const alqFcp   = numero(document.getElementById("impAlqFcp")?.value);
    const alqFcpSt = numero(document.getElementById("impAlqFcpSt")?.value);
    const alqSt    = numero(document.getElementById("impAlqIcmsSt")?.value);
    const mva      = numero(document.getElementById("impMva")?.value);
    const alqPis   = numero(document.getElementById("impAlqPis")?.value);
    const alqCof   = numero(document.getElementById("impAlqCofins")?.value);
    const alqIpi   = numero(document.getElementById("impAlqIpi")?.value);
    const alqIss   = numero(document.getElementById("impAlqIss")?.value);
    const alqIbs   = numero(document.getElementById("impAlqIbs")?.value);
    const alqCbs   = numero(document.getElementById("impAlqCbs")?.value);
    const alqDifalInt   = numero(document.getElementById("impAlqInterna")?.value);
    const alqDifalInter = numero(document.getElementById("impAlqInterestadual")?.value);

    const bcSt     = base * (1 + mva / 100);
    const valSt    = alqSt > 0 ? bcSt * alqSt / 100 - icms : 0;
    const valFcp   = base * alqFcp   / 100;
    const valFcpSt = base * alqFcpSt / 100;
    const valPis   = base * alqPis   / 100;
    const valCof   = base * alqCof   / 100;
    const valIpi   = base * alqIpi   / 100;
    const valIss   = base * alqIss   / 100;
    const valIbs   = base * alqIbs   / 100;
    const valCbs   = base * alqCbs   / 100;
    const valDifalDest = alqDifalInt > alqDifalInter ? base * (alqDifalInt - alqDifalInter) / 100 : 0;
    const valDifalOrig = valDifalDest * 0.2; // cota-parte UF origem (exemplo 20%)

    // Aba básica — totais
    definirTexto("impTotalIcms", formatarMoedaRS(icms));
    definirTexto("impTotalPis", formatarMoedaRS(pis));
    definirTexto("impTotalCofins", formatarMoedaRS(cof));
    definirTexto("impTotalIpi", formatarMoedaRS(ipi));

    // Aba avançada — readonly fields
    const m = formatarMoeda;
    definirCampoReadonly("impBcIcms",          m(base));
    definirCampoReadonly("impValorIcms",        m(icms));
    definirCampoReadonly("impBcIcmsSt",         m(bcSt));
    definirCampoReadonly("impValorIcmsSt",      m(Math.max(0, valSt)));
    definirCampoReadonly("impValorFcp",         m(valFcp));
    definirCampoReadonly("impValorFcpSt",       m(valFcpSt));
    definirCampoReadonly("impBcDifal",          m(base));
    definirCampoReadonly("impValorDifalDestino",m(valDifalDest));
    definirCampoReadonly("impValorDifalOrigem", m(valDifalOrig));
    definirCampoReadonly("impBcPis",            m(base));
    definirCampoReadonly("impValorPis",         m(valPis));
    definirCampoReadonly("impBcCofins",         m(base));
    definirCampoReadonly("impValorCofins",      m(valCof));
    definirCampoReadonly("impBcIpi",            m(base));
    definirCampoReadonly("impValorIpi",         m(valIpi));
    definirCampoReadonly("impBcIss",            m(base));
    definirCampoReadonly("impValorIss",         m(valIss));
    definirCampoReadonly("impBcIi",             m(base));
    definirCampoReadonly("impBcIbs",            m(base));
    definirCampoReadonly("impValorIbs",         m(valIbs));
    definirCampoReadonly("impBcCbs",            m(base));
    definirCampoReadonly("impValorCbs",         m(valCbs));
}

function definirCampoReadonly(id, texto){
    const el = document.getElementById(id);
    if(el) el.value = texto;
}

function montarImpostosDaNota(){
    return {
        csosn: valor("impCsosn"),
        cstIcms: valor("impCstIcms"),
        icms: {
            base: numero(document.getElementById("impBcIcms")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")),
            aliquota: numero(document.getElementById("impAlqIcmsAdv")?.value || document.getElementById("impAliquotaIcms")?.value),
            reducaoBc: numero(document.getElementById("impReducaoBc")?.value),
            valor: numero(document.getElementById("impValorIcms")?.value?.replace(/[^0-9,]/g, "").replace(",", "."))
        },
        icmsSt: {
            possuiSt: valor("impPossuiSt") === "1",
            mva: numero(document.getElementById("impMva")?.value),
            base: numero(document.getElementById("impBcIcmsSt")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")),
            aliquota: numero(document.getElementById("impAlqIcmsSt")?.value),
            valor: numero(document.getElementById("impValorIcmsSt")?.value?.replace(/[^0-9,]/g, "").replace(",", "."))
        },
        fcp: { aliquota: numero(document.getElementById("impAlqFcp")?.value), valor: numero(document.getElementById("impValorFcp")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        fcpSt: { aliquota: numero(document.getElementById("impAlqFcpSt")?.value), valor: numero(document.getElementById("impValorFcpSt")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        difal: {
            aliquotaInterestadual: numero(document.getElementById("impAlqInterestadual")?.value),
            aliquotaInterna: numero(document.getElementById("impAlqInterna")?.value),
            valorDestino: numero(document.getElementById("impValorDifalDestino")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")),
            valorOrigem: numero(document.getElementById("impValorDifalOrigem")?.value?.replace(/[^0-9,]/g, "").replace(",", "."))
        },
        pis: { cst: valor("impCstPis"), aliquota: numero(document.getElementById("impAlqPis")?.value), valor: numero(document.getElementById("impValorPis")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        cofins: { cst: valor("impCstCofins"), aliquota: numero(document.getElementById("impAlqCofins")?.value), valor: numero(document.getElementById("impValorCofins")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        ipi: { cst: valor("impCstIpi"), cEnq: valor("impCEnqIpi"), aliquota: numero(document.getElementById("impAlqIpi")?.value), valor: numero(document.getElementById("impValorIpi")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        issqn: { codServico: valor("impCodServico"), aliquota: numero(document.getElementById("impAlqIss")?.value), valor: numero(document.getElementById("impValorIss")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        ii: { valor: numero(document.getElementById("impValorIi")?.value), despesasAduaneiras: numero(document.getElementById("impDespesasAduaneiras")?.value), iof: numero(document.getElementById("impIof")?.value) },
        beneficio: { cBenef: valor("impCbenef"), motivo: valor("impMotivoBenef") },
        ibs: { cst: valor("impCstIbs"), aliquota: numero(document.getElementById("impAlqIbs")?.value), valor: numero(document.getElementById("impValorIbs")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) },
        cbs: { cst: valor("impCstCbs"), aliquota: numero(document.getElementById("impAlqCbs")?.value), valor: numero(document.getElementById("impValorCbs")?.value?.replace(/[^0-9,]/g, "").replace(",", ".")) }
    };
}

function carregarFormasPagamentoNfe(){
    const select = document.getElementById("nfePagamento");
    if(!select || !window.FormasPagamentoSistema) return;

    const formas = window.FormasPagamentoSistema.ativasPara("nfe");
    select.innerHTML = formas.map(function(forma) {
        return `<option value="${escapar(forma.codigoFiscal || "99")}" data-forma-id="${escapar(forma.id)}">${escapar(forma.codigoFiscal || "99")} - ${escapar(forma.descricao)}</option>`;
    }).join("");
    atualizarCamposBoletoNfe();
}

function atualizarCamposBoletoNfe(){
    const ehBoleto = valor("nfePagamento") === "15";
    document.querySelectorAll(".campo-boleto-nfe").forEach(function(campo) {
        campo.hidden = !ehBoleto;
    });

    if(ehBoleto && !valor("nfeBoletoVencimento")){
        definirValorCampo("nfeBoletoVencimento", somarDiasNfe(dataIsoNfe(), 3));
    }
}

function carregarEmitente(){
    const empresa = window.EmpresaSistema?.obter?.() || {};
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    const destino = document.getElementById("resumoEmitente");
    const endereco = formatarEnderecoEmpresaNfe(empresa);
    const cidade = [empresa.cidade, empresa.estado || config.fiscalUf].filter(Boolean).join(" / ");

    if(destino){
        destino.innerHTML = `
            <strong>${escapar(empresa.razaoSocial || empresa.nomeFantasia || "Empresa não cadastrada")}</strong>
            <span>CNPJ: ${escapar(empresa.cnpj || "não informado")}</span>
            <span>IE: ${escapar(config.fiscalInscricaoEstadual || "não informada")}</span>
            <span>Endereço: ${escapar(endereco || "não informado")}</span>
            <span>Cidade: ${escapar(cidade || "não informada")}</span>
        `;
    }

    definirValorCampo("nfeSerie", config.fiscalSerieNfe || "1");
    definirValorCampo("nfeNumero", config.fiscalProximoNfe || "1");
    definirValorCampo("nfeInformacoesComplementares", config.fiscalInformacoesComplementares || "");
    definirValorCampo("nfeObservacoesFiscais", config.fiscalInformacoesComplementares || "");
    iniciarRelogioEmissao();
}

function formatarEnderecoEmpresaNfe(empresa){
    return [
        empresa.endereco,
        empresa.numero,
        empresa.bairro,
        empresa.cep
    ].filter(Boolean).join(", ");
}

function iniciarRelogioEmissao(){
    const campo = document.getElementById("nfeDataEmissao");
    if(!campo) return;
    campo.value = dataHoraLocalAtual();
    // Atualiza a cada 30s — SEFAZ exige hora atual (tolerância ~5 min)
    setInterval(function(){
        campo.value = dataHoraLocalAtual();
    }, 30000);
}

function preencherPadroesNfe(){
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    definirValorCampo("nfeProdutoCfop", config.fiscalCfopVendaEstadual || "5102");
    aplicarRegraNaturezaOperacao();
}

function aplicarRegraNaturezaOperacao(){
    const natureza = valor("nfeNaturezaOperacao");
    const regras = {
        "Compra": { tipo: "0", finalidade: "1" },
        "Compra para uso e consumo": { tipo: "0", finalidade: "1" },
        "Devolução de Compra": { tipo: "1", finalidade: "4" },
        "Devolução de Venda": { tipo: "0", finalidade: "4" },
        "Entrada de reclassificação": { tipo: "0", finalidade: "3" },
        "Recebimento de crédito loja": { tipo: "0", finalidade: "1" },
        "Saída para reclassificação": { tipo: "1", finalidade: "3" },
        "Venda": { tipo: "1", finalidade: "1" },
        "Venda bonificada": { tipo: "1", finalidade: "1" },
        "Venda referenciada de NFC-e": { tipo: "1", finalidade: "1" }
    };
    const regra = regras[natureza] || regras.Venda;
    definirValorCampo("nfeTipoOperacao", regra.tipo);
    definirValorCampo("nfeFinalidade", regra.finalidade);
}

function aplicarRegraFinalidadeNfe(){
    const finalidade = valor("nfeFinalidade");

    if(finalidade === "4"){
        if(valor("nfeNaturezaOperacao") !== "Devolução de Compra" && valor("nfeNaturezaOperacao") !== "Devolução de Venda"){
            definirValorCampo("nfeNaturezaOperacao", "Devolução de Venda");
        }
        definirValorCampo("nfeTipoOperacao", valor("nfeNaturezaOperacao") === "Devolução de Compra" ? "1" : "0");
        return;
    }

    if(finalidade === "3"){
        const natureza = valor("nfeTipoOperacao") === "0" ? "Entrada de reclassificação" : "Saída para reclassificação";
        definirValorCampo("nfeNaturezaOperacao", natureza);
        return;
    }

    if(["Devolução de Compra", "Devolução de Venda", "Entrada de reclassificação", "Saída para reclassificação"].includes(valor("nfeNaturezaOperacao"))){
        definirValorCampo("nfeNaturezaOperacao", valor("nfeTipoOperacao") === "0" ? "Compra" : "Venda");
    }
}

function aplicarRegraTipoOperacao(){
    const tipo = valor("nfeTipoOperacao");
    const natureza = valor("nfeNaturezaOperacao");

    if(tipo === "0" && ["Venda", "Venda bonificada", "Venda referenciada de NFC-e", "Saída para reclassificação"].includes(natureza)){
        definirValorCampo("nfeNaturezaOperacao", valor("nfeFinalidade") === "3" ? "Entrada de reclassificação" : "Compra");
    }

    if(tipo === "1" && ["Compra", "Compra para uso e consumo", "Entrada de reclassificação", "Recebimento de crédito loja"].includes(natureza)){
        definirValorCampo("nfeNaturezaOperacao", valor("nfeFinalidade") === "3" ? "Saída para reclassificação" : "Venda");
    }
}

function carregarClientesSelect(){
    const base = obterBase();
    const select = document.getElementById("nfeCliente");
    if(!select) return;

    select.innerHTML = `<option value="">Selecione o cliente</option>` + base.clientes.map(function(cliente) {
        return `<option value="${escapar(cliente.id)}">${escapar(textoClienteBusca(cliente))}</option>`;
    }).join("");
}

function atualizarSugestoesClientes(){
    const lista = document.getElementById("listaClientesNfe");
    const campo = document.getElementById("nfeClienteBusca");
    if(!lista || !campo) return;
    if(campo.readOnly) return;

    const termo = valor("nfeClienteBusca");
    const clienteExato = localizarClienteBusca();
    if(clienteExato){
        document.getElementById("nfeCliente").value = clienteExato.id;
        preencherClienteSelecionado();
    }else{
        document.getElementById("nfeCliente").value = "";
    }

    const sugestoes = obterClientesSugeridos(termo).slice(0, 8);
    if(sugestoes.length === 0){
        lista.innerHTML = "";
        lista.classList.add("recolhido");
        return;
    }

    lista.innerHTML = sugestoes.map(function(cliente) {
        const doc = cliente.cpf || cliente.cnpj || "";
        const cidade = [cliente.cidade, cliente.estado].filter(Boolean).join(" / ");
        return `
            <button type="button" class="cliente-sugestao" data-cliente-id="${escapar(cliente.id)}">
                <strong>${escapar(cliente.nome || "Cliente")}</strong>
                <span>${escapar([doc, cidade].filter(Boolean).join(" - ") || "Sem documento")}</span>
            </button>
        `;
    }).join("");
    lista.classList.remove("recolhido");
    lista.querySelectorAll("[data-cliente-id]").forEach(function(botao) {
        botao.addEventListener("click", selecionarClienteSugerido);
    });
}

function localizarClienteBusca(){
    const termo = normalizarBusca(valor("nfeClienteBusca"));
    if(!termo) return null;

    return obterBase().clientes.find(function(cliente) {
        return normalizarBusca(textoClienteBusca(cliente)) === termo ||
            normalizarBusca(cliente.nome || "") === termo ||
            normalizarBusca(cliente.cpf || cliente.cnpj || "") === termo;
    }) || null;
}

function obterClientesSugeridos(termoOriginal){
    const termo = normalizarBusca(termoOriginal);
    if(termo.length < 2) return [];

    return obterBase().clientes
        .map(function(cliente) {
            return { cliente, pontuacao: pontuarClienteBusca(cliente, termo) };
        })
        .filter(function(item) {
            return item.pontuacao < 100;
        })
        .sort(function(a, b) {
            return a.pontuacao - b.pontuacao || String(a.cliente.nome || "").localeCompare(String(b.cliente.nome || ""));
        })
        .map(function(item) {
            return item.cliente;
        });
}

function pontuarClienteBusca(cliente, termo){
    const nome = normalizarBusca(cliente.nome || "");
    const doc = normalizarBusca(cliente.cpf || cliente.cnpj || "");
    const textoCompleto = normalizarBusca(textoClienteBusca(cliente));

    if(nome === termo || doc === termo || textoCompleto === termo) return 0;
    if(nome.startsWith(termo)) return 1;
    if(doc.startsWith(termo)) return 2;
    if(textoCompleto.startsWith(termo)) return 3;
    if(nome.includes(termo)) return 4 + nome.indexOf(termo) / 100;
    if(doc.includes(termo)) return 5 + doc.indexOf(termo) / 100;
    if(textoCompleto.includes(termo)) return 6 + textoCompleto.indexOf(termo) / 100;
    return 100;
}

function selecionarClienteSugerido(evento){
    const id = evento.currentTarget.dataset.clienteId;
    selecionarClientePorId(id);
}

function selecionarClienteComEnter(evento){
    if(evento.key !== "Enter") return;
    const cliente = localizarClienteBusca() || obterClientesSugeridos(valor("nfeClienteBusca"))[0];
    if(!cliente) return;

    evento.preventDefault();
    selecionarClientePorId(cliente.id);
}

function selecionarClientePorId(id){
    const cliente = obterBase().clientes.find(function(item) {
        return item.id === id;
    });
    if(!cliente) return;

    document.getElementById("nfeCliente").value = cliente.id;
    definirValorCampo("nfeClienteBusca", "");
    document.getElementById("listaClientesNfe")?.classList.add("recolhido");
    bloquearClienteNfe(true);
    preencherClienteSelecionado();
}

function bloquearClienteNfe(bloquear){
    const campo = document.getElementById("nfeClienteBusca");
    const botao = document.getElementById("btnRemoverClienteNfe");
    if(campo){
        campo.readOnly = bloquear;
        campo.tabIndex = bloquear ? -1 : 0;
        campo.placeholder = bloquear ? "Cliente inserido" : "Digite nome, CPF, CNPJ, telefone ou cidade";
        campo.classList.toggle("cliente-bloqueado", bloquear);
    }
    if(botao) botao.hidden = !bloquear;
}

function removerClienteNfe(){
    definirValorCampo("nfeCliente", "");
    definirValorCampo("nfeClienteBusca", "");
    bloquearClienteNfe(false);
    document.getElementById("listaClientesNfe")?.classList.add("recolhido");
    [
        "nfeClienteCnpj",
        "nfeClienteRazaoSocial",
        "nfeClienteNomeFantasia",
        "nfeClienteIe",
        "nfeClienteCpf",
        "nfeClienteNome",
        "nfeClienteCep",
        "nfeClienteEndereco",
        "nfeClienteNumero",
        "nfeClienteComplemento",
        "nfeClienteBairro",
        "nfeClienteCidade",
        "nfeClienteUf",
        "nfeClienteCodigoIbge",
        "nfeClientePais",
        "nfeClienteTelefone",
        "nfeClienteEmail"
    ].forEach(function(id) {
        definirValorCampo(id, "");
    });
    definirValorCampo("nfeClientePais", "Brasil");
    document.getElementById("nfeClienteBusca")?.focus();
}

function fecharSugestoesClienteAoClicarFora(evento){
    if(evento.target.closest(".cliente-busca")) return;
    document.getElementById("listaClientesNfe")?.classList.add("recolhido");
}

function textoClienteBusca(cliente){
    return [cliente.nome, cliente.cpf || cliente.cnpj, cliente.telefone, cliente.cidade].filter(Boolean).join(" - ");
}

function carregarProdutosSelect(){
    const lista = document.getElementById("listaProdutosNfe");
    if(!lista) return;

    lista.innerHTML = "";
    lista.classList.add("recolhido");
}

function localizarProdutoBusca(){
    const termoOriginal = valor("nfeProdutoBusca");
    const termo = normalizarBusca(termoOriginal);
    if(!termo) return null;

    return obterBase().mercadorias.find(function(produto) {
        const codigo = normalizarBusca(produto.codigo || "");
        const descricao = normalizarBusca(produto.descricao || "");
        const textoCompleto = normalizarBusca(textoProdutoBusca(produto));
        return textoCompleto === termo || codigo === termo || descricao === termo;
    }) || null;
}

function atualizarSugestoesProdutos(){
    const lista = document.getElementById("listaProdutosNfe");
    if(!lista) return;

    produtoSelecionadoNfe = localizarProdutoBusca();
    if(produtoSelecionadoNfe){
        preencherProdutoSelecionado();
    }

    const sugestoes = obterProdutosSugeridos(valor("nfeProdutoBusca")).slice(0, 8);
    if(sugestoes.length === 0){
        lista.innerHTML = "";
        lista.classList.add("recolhido");
        return;
    }

    lista.innerHTML = sugestoes.map(function(produto) {
        return `
            <button type="button" class="produto-sugestao" data-produto-id="${escapar(produto.id)}">
                <strong>${escapar(produto.codigo || "-")}</strong>
                <span>${escapar(produto.descricao || "")}</span>
            </button>
        `;
    }).join("");
    lista.classList.remove("recolhido");
    lista.querySelectorAll("[data-produto-id]").forEach(function(botao) {
        botao.addEventListener("click", selecionarProdutoSugerido);
    });
}

function obterProdutosSugeridos(termoOriginal){
    const termo = normalizarBusca(termoOriginal);
    if(termo.length < 2) return [];

    return obterBase().mercadorias
        .map(function(produto) {
            return { produto, pontuacao: pontuarProdutoBusca(produto, termo) };
        })
        .filter(function(item) {
            return item.pontuacao < 100;
        })
        .sort(function(a, b) {
            return a.pontuacao - b.pontuacao || String(a.produto.descricao || "").localeCompare(String(b.produto.descricao || ""));
        })
        .map(function(item) {
            return item.produto;
        });
}

function pontuarProdutoBusca(produto, termo){
    const codigo = normalizarBusca(produto.codigo || "");
    const descricao = normalizarBusca(produto.descricao || "");
    const textoCompleto = normalizarBusca(textoProdutoBusca(produto));

    if(codigo === termo || descricao === termo || textoCompleto === termo) return 0;
    if(codigo.startsWith(termo)) return 1;
    if(descricao.startsWith(termo)) return 2;
    if(textoCompleto.startsWith(termo)) return 3;
    if(descricao.includes(termo)) return 4 + descricao.indexOf(termo) / 100;
    if(codigo.includes(termo)) return 5 + codigo.indexOf(termo) / 100;
    if(textoCompleto.includes(termo)) return 6 + textoCompleto.indexOf(termo) / 100;
    return 100;
}

function selecionarProdutoSugerido(evento){
    const id = evento.currentTarget.dataset.produtoId;
    const produto = obterBase().mercadorias.find(function(item) {
        return item.id === id;
    });
    if(!produto) return;

    produtoSelecionadoNfe = produto;
    document.getElementById("nfeProdutoBusca").value = textoProdutoBusca(produto);
    document.getElementById("listaProdutosNfe")?.classList.add("recolhido");
    preencherProdutoSelecionado();
}

function selecionarSugestaoComEnter(evento){
    if(evento.key !== "Enter") return;
    const produto = produtoSelecionadoNfe || obterProdutosSugeridos(valor("nfeProdutoBusca"))[0];
    if(!produto) return;

    evento.preventDefault();
    produtoSelecionadoNfe = produto;
    document.getElementById("nfeProdutoBusca").value = textoProdutoBusca(produto);
    document.getElementById("listaProdutosNfe")?.classList.add("recolhido");
    preencherProdutoSelecionado();
}

function fecharSugestoesProdutoAoClicarFora(evento){
    if(evento.target.closest(".produto-busca")) return;
    document.getElementById("listaProdutosNfe")?.classList.add("recolhido");
}

function textoProdutoBusca(produto){
    return [produto.codigo, produto.descricao].filter(Boolean).join(" - ");
}

function normalizarBusca(texto){
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function preencherClienteSelecionado(){
    const selectCliente = document.getElementById("nfeCliente");
    if(!selectCliente) return;

    const cliente = obterBase().clientes.find(function(item) {
        return item.id === selectCliente.value;
    });

    if(!cliente) return;
    bloquearClienteNfe(true);

    const doc = cliente.cpf || cliente.cnpj || "";
    const ehPj = somenteNumeros(doc).length === 14;
    definirValorCampo("nfeClienteTipo", ehPj ? "pj" : "pf");
    alternarTipoDestinatario();

    if(ehPj){
        definirValorCampo("nfeClienteCnpj", doc);
        definirValorCampo("nfeClienteRazaoSocial", cliente.nome || "");
        definirValorCampo("nfeClienteNomeFantasia", cliente.nomeFantasia || cliente.fantasia || "");
    } else {
        definirValorCampo("nfeClienteCpf", doc);
        definirValorCampo("nfeClienteNome", cliente.nome || "");
    }

    definirValorCampo("nfeClienteIe", cliente.ie || "");
    definirValorCampo("nfeClienteCep", cliente.cep || "");
    definirValorCampo("nfeClienteEndereco", cliente.endereco || "");
    definirValorCampo("nfeClienteNumero", cliente.numero || "");
    definirValorCampo("nfeClienteComplemento", cliente.complemento || "");
    definirValorCampo("nfeClienteBairro", cliente.bairro || "");
    definirValorCampo("nfeClienteCidade", cliente.cidade || "");
    definirValorCampo("nfeClienteUf", cliente.estado || "");
    definirValorCampo("nfeClienteCodigoIbge", cliente.codigoIbge || "");
    definirValorCampo("nfeClientePais", cliente.pais || "Brasil");
    definirValorCampo("nfeClienteTelefone", cliente.telefone || "");
    definirValorCampo("nfeClienteEmail", cliente.email || "");
}

function alternarTipoDestinatario(){
    const ehPj = (valor("nfeClienteTipo") || "pj") === "pj";
    document.getElementById("camposDestinatarioPJ")?.classList.toggle("recolhido", !ehPj);
    document.getElementById("camposDestinatarioPF")?.classList.toggle("recolhido", ehPj);
}

function preencherProdutoSelecionado(){
    const produto = localizarProdutoBusca();
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    const fiscal = window.RegrasFiscaisSistema?.fiscalDoItem?.(produto, { modelo: "nfe", consumidorFinal: true }) || {};

    produtoSelecionadoNfe = produto || null;
    if(!produto) return;

    document.getElementById("nfeProdutoValor").value = numero(produto.precoPromocional) > 0 ? produto.precoPromocional : produto.precoVenda || 0;
    document.getElementById("nfeProdutoCfop").value = produto.cfop || fiscal.cfop || config.fiscalCfopVendaEstadual || "5102";
}

function salvarClienteRapido(){
    const base = obterBase();
    const nome = valor("novoClienteNome");

    if(!nome){
        alert("Informe o nome do cliente.");
        return;
    }

    const cliente = {
        id: gerarId("cli"),
        nome,
        cpf: valor("novoClienteCpf"),
        telefone: valor("novoClienteTelefone"),
        email: valor("novoClienteEmail"),
        cep: valor("novoClienteCep"),
        endereco: valor("novoClienteEndereco"),
        numero: valor("novoClienteNumero"),
        complemento: valor("novoClienteComplemento"),
        bairro: valor("novoClienteBairro"),
        cidade: valor("novoClienteCidade"),
        estado: valor("novoClienteUf").toUpperCase(),
        codigoIbge: valor("novoClienteCodigoIbge"),
        pais: valor("novoClientePais") || "Brasil",
        limite: 0,
        utilizado: 0,
        disponivel: 0,
        ativo: true,
        criadoEm: new Date().toISOString()
    };

    base.clientes.push(cliente);
    salvarBase(base);
    carregarClientesSelect();
    selecionarClientePorId(cliente.id);
    alternarCadastroRapido("cadastroRapidoCliente", true);
}

function salvarProdutoRapido(){
    const base = obterBase();
    const descricao = valor("novoProdutoDescricao");

    if(!descricao){
        alert("Informe a descrição do produto.");
        return;
    }

    const produtoBase = {
        id: gerarId("prd"),
        codigo: valor("novoProdutoCodigo") || gerarCodigoProduto(base.mercadorias),
        descricao,
        unidade: "UN",
        estoque: 0,
        precoVenda: numero(valor("novoProdutoPreco")),
        precoCusto: 0,
        ncm: valor("novoProdutoNcm"),
        cfop: valor("novoProdutoCfop"),
        cst: valor("novoProdutoCst"),
        csosn: valor("novoProdutoCst"),
        cstIcms: valor("novoProdutoCst"),
        cstPis: valor("novoProdutoCstPis") || window.ConfiguracoesSistema?.obter?.()?.fiscalCstPisPadrao || "49",
        cstCofins: valor("novoProdutoCstCofins") || window.ConfiguracoesSistema?.obter?.()?.fiscalCstCofinsPadrao || "49",
        cstIpi: valor("novoProdutoCstIpi") || window.ConfiguracoesSistema?.obter?.()?.fiscalCstIpiPadrao || "99",
        origemMercadoria: valor("novoProdutoOrigem") || window.ConfiguracoesSistema?.obter?.()?.fiscalOrigemMercadoriaPadrao || "0",
        ativo: true,
        criadoEm: new Date().toISOString()
    };
    const produto = window.RegrasFiscaisSistema?.aplicarAoProduto?.(produtoBase, { modelo: "nfe", consumidorFinal: true }) || produtoBase;

    base.mercadorias.push(produto);
    salvarBase(base);
    carregarProdutosSelect();
    produtoSelecionadoNfe = produto;
    document.getElementById("nfeProdutoBusca").value = textoProdutoBusca(produto);
    preencherProdutoSelecionado();
    alternarCadastroRapido("cadastroRapidoProduto", true);
}

function adicionarItemNfe(){
    const produto = produtoSelecionadoNfe || localizarProdutoBusca() || obterProdutosSugeridos(valor("nfeProdutoBusca"))[0];
    const config = window.ConfiguracoesSistema?.obter?.() || {};

    if(!produto){
        notificar("Informe o código ou descrição de um produto cadastrado.", "sucesso");
        return;
    }

    const quantidade = numero(valor("nfeProdutoQtde"));
    const valorUnitario = numero(valor("nfeProdutoValor"));
    const desconto = 0;
    const baseCalculo = quantidade * valorUnitario;
    const fiscal = window.RegrasFiscaisSistema?.fiscalDoItem?.(produto, { modelo: "nfe", consumidorFinal: true }) || {};
    const icmsAliquota = numero(fiscal.aliquotaIcms ?? config.fiscalAliquotaIcmsPadrao);
    const pisAliquota = numero(fiscal.aliquotaPis ?? config.fiscalAliquotaPisPadrao);
    const cofinsAliquota = numero(fiscal.aliquotaCofins ?? config.fiscalAliquotaCofinsPadrao);
    const ipiAliquota = numero(fiscal.aliquotaIpi ?? config.fiscalAliquotaIpiPadrao);

    if(quantidade <= 0 || valorUnitario <= 0){
        alert("Informe quantidade e valor unitário válidos.");
        return;
    }

    itensNfe.push({
        id: gerarId("item"),
        produtoId: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        ncm: fiscal.ncm || produto.ncm || "",
        cest: fiscal.cest || produto.cest || "",
        cfop: valor("nfeProdutoCfop") || fiscal.cfop || produto.cfop || config.fiscalCfopVendaEstadual || "5102",
        cst: fiscal.cst || produto.cst || config.fiscalCsosnPadrao || config.fiscalCstIcmsPadrao || "102",
        csosn: fiscal.csosn || produto.csosn || "",
        cstIcms: fiscal.cstIcms || produto.cstIcms || "",
        cstPis: fiscal.cstPis || produto.cstPis || "",
        cstCofins: fiscal.cstCofins || produto.cstCofins || "",
        cstIpi: fiscal.cstIpi || produto.cstIpi || config.fiscalCstIpiPadrao || "99",
        origem: fiscal.origem || produto.origemMercadoria || "0",
        icmsSt: fiscal.icmsSt === true,
        monofasico: fiscal.monofasico === true,
        unidade: produto.unidade || "UN",
        quantidade,
        valorUnitario,
        desconto,
        total: baseCalculo,
        impostos: {
            icms: { base: baseCalculo, aliquota: icmsAliquota, valor: baseCalculo * icmsAliquota / 100 },
            pis: { base: baseCalculo, aliquota: pisAliquota, valor: baseCalculo * pisAliquota / 100 },
            cofins: { base: baseCalculo, aliquota: cofinsAliquota, valor: baseCalculo * cofinsAliquota / 100 },
            ipi: { base: baseCalculo, aliquota: ipiAliquota, valor: baseCalculo * ipiAliquota / 100 }
        }
    });

    produtoSelecionadoNfe = null;
    document.getElementById("nfeProdutoBusca").value = "";
    document.getElementById("nfeProdutoQtde").value = "1";
    document.getElementById("nfeProdutoValor").value = "0";
    document.getElementById("nfeProdutoCfop").value = config.fiscalCfopVendaEstadual || "5102";
    renderizarItensNfe();
    atualizarTotaisNfe();
}

function renderizarItensNfe(){
    const destino = document.getElementById("itensNfe");
    if(!destino) return;

    if(itensNfe.length === 0){
        destino.innerHTML = `<tr><td colspan="8" class="vazio">Nenhum item adicionado.</td></tr>`;
        return;
    }

    destino.innerHTML = itensNfe.map(function(item) {
        return `
            <tr>
                <td><strong>${escapar(item.descricao)}</strong><br><small>Cód. ${escapar(item.codigo || "-")} | ${escapar(item.unidade || "UN")}</small></td>
                <td><input class="item-editavel" type="number" min="0.01" step="0.01" value="${escapar(item.quantidade)}" data-item-id="${escapar(item.id)}" data-item-campo="quantidade"></td>
                <td><input class="item-editavel" type="number" min="0" step="0.01" value="${escapar(item.valorUnitario)}" data-item-id="${escapar(item.id)}" data-item-campo="valorUnitario"></td>
                <td><input class="item-editavel" type="text" value="${escapar(item.cfop)}" data-item-id="${escapar(item.id)}" data-item-campo="cfop"></td>
                <td>${escapar(item.ncm)}</td>
                <td>${escapar(item.cst)}</td>
                <td>${formatarMoeda(item.total)}</td>
                <td><button type="button" class="remover-item" onclick="removerItemNfe('${item.id}')">Remover</button></td>
            </tr>
        `;
    }).join("");

    destino.querySelectorAll("[data-item-campo]").forEach(function(campo) {
        campo.addEventListener("change", editarItemNfe);
    });
}

function editarItemNfe(evento){
    const campo = evento.currentTarget;
    const item = itensNfe.find(function(registro) {
        return registro.id === campo.dataset.itemId;
    });
    if(!item) return;

    if(campo.dataset.itemCampo === "cfop"){
        item.cfop = campo.value.trim() || item.cfop;
    } else {
        item[campo.dataset.itemCampo] = numero(campo.value);
    }

    recalcularItemNfe(item);
    renderizarItensNfe();
    atualizarTotaisNfe();
}

function recalcularItemNfe(item){
    const baseCalculo = Math.max(0, numero(item.quantidade) * numero(item.valorUnitario) - numero(item.desconto));
    item.total = baseCalculo;
    item.impostos = item.impostos || {};
    ["icms", "pis", "cofins", "ipi"].forEach(function(nome) {
        item.impostos[nome] = item.impostos[nome] || {};
        item.impostos[nome].base = baseCalculo;
        item.impostos[nome].valor = baseCalculo * numero(item.impostos[nome].aliquota) / 100;
    });
}

function removerItemNfe(id){
    itensNfe = itensNfe.filter(function(item) {
        return item.id !== id;
    });
    renderizarItensNfe();
    atualizarTotaisNfe();
}

function atualizarTotaisNfe(){
    const produtos = itensNfe.reduce(function(total, item) {
        return total + numero(item.total);
    }, 0);
    const qtdTotal = itensNfe.reduce(function(total, item) {
        return total + numero(item.quantidade);
    }, 0);
    const impostos = calcularTotalImpostos();
    // Valor NF = produtos + frete + seguro + outras - desconto (SEFAZ calcula impostos separadamente)
    const totalNota = Math.max(0, produtos + numero(valor("nfeFrete")) + numero(valor("nfeSeguro")) + numero(valor("nfeOutrasDespesas")) - numero(valor("nfeDesconto")));
    const troco = Math.max(0, numero(valor("nfeValorPago")) - totalNota);

    definirTexto("nfeTotalQtd", formatarQuantidade(qtdTotal));
    definirTexto("nfeTotalProdutos", formatarMoedaRS(produtos));
    definirTexto("nfeTotalImpostos", formatarMoedaRS(impostos));
    definirTexto("nfeTotalNota", formatarMoedaRS(totalNota));
    const campoTroco = document.getElementById("nfeTroco");
    if(campoTroco) campoTroco.value = troco.toFixed(2);
    atualizarPainelImpostos();
}

function calcularTotalImpostos(){
    return itensNfe.reduce(function(total, item) {
        const impostos = item.impostos || {};
        return total + numero(impostos.icms?.valor) + numero(impostos.pis?.valor) + numero(impostos.cofins?.valor) + numero(impostos.ipi?.valor);
    }, 0);
}

function validarNfe(){
    const erros = validarDadosNfe();
    if(erros.length){
        alert(erros.join("\n"));
        definirTexto("statusNfe", "Pendências");
        return false;
    }

    definirTexto("statusNfe", "Validada");
    alert("NF-e validada para geração do rascunho.");
    return true;
}

function salvarRascunhoNfe(){
    if(!validarNfe()) return;

    const base = obterBase();
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    const empresa = window.EmpresaSistema?.obter?.() || {};
    const nota = montarNota(base, empresa, config);

    base.notasSaida.push(nota);
    baixarEstoqueNotaSaida(base, nota.itens);
    if(valor("nfePagamento") === "15"){
        gerarBoletosDaNfe(base, nota);
    }
    salvarBase(base);
    definirTexto("statusNfe", "Rascunho gerado");
    notificar("Rascunho de NF-e salvo no sistema.", "sucesso");
}

function baixarEstoqueNotaSaida(base, itens){
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    if(config.controleEstoque === false) return;
    (itens || []).forEach(function(item){
        const produto = (base.mercadorias || []).find(function(p){ return p.id === item.produtoId; });
        if(produto){
            produto.estoque = Math.max(0, numero(produto.estoque) - numero(item.quantidade));
            produto.atualizadoEm = new Date().toISOString();
        }
    });
}

function validarDadosNfe(){
    const empresa = window.EmpresaSistema?.obter?.() || {};
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    const regime = config.fiscalRegimeTributario || "";
    const ehSimplesOuMei = regime === "simples" || regime === "mei";
    const tipoDest = valor("nfeClienteTipo") || "pj";
    const erros = [];

    // Emitente
    if(!empresa.cnpj) erros.push("Cadastre o CNPJ da empresa em Manutenção > Cadastro da Empresa.");
    if(!regime) erros.push("Configure o regime tributário em Configurações Fiscais.");
    if(!config.fiscalCertificadoArquivo) erros.push("Faça upload do certificado digital A1 em Configurações Fiscais.");

    // Destinatário — Pessoa Jurídica
    if(tipoDest === "pj"){
        if(!valor("nfeClienteCnpj")) erros.push("Informe o CNPJ do destinatário.");
        if(!valor("nfeClienteRazaoSocial")) erros.push("Informe a Razão Social do destinatário.");
        if(!valor("nfeClienteIndIe")) erros.push("Informe o Indicador IE do destinatário.");
        if(valor("nfeClienteIndIe") === "1" && !valor("nfeClienteIe")) erros.push("Informe a Inscrição Estadual do destinatário contribuinte.");
    }

    // Destinatário — Pessoa Física
    if(tipoDest === "pf"){
        if(!valor("nfeClienteCpf")) erros.push("Informe o CPF do destinatário.");
        if(!valor("nfeClienteNome")) erros.push("Informe o nome do destinatário.");
    }

    // Endereço (obrigatório para ambos)
    if(!valor("nfeClienteCep")) erros.push("Informe o CEP do destinatário.");
    if(!valor("nfeClienteEndereco")) erros.push("Informe o logradouro do destinatário.");
    if(!valor("nfeClienteNumero")) erros.push("Informe o número do endereço do destinatário.");
    if(!valor("nfeClienteBairro")) erros.push("Informe o bairro do destinatário.");
    if(!valor("nfeClienteCidade")) erros.push("Informe a cidade do destinatário.");
    if(!valor("nfeClienteUf")) erros.push("Informe a UF do destinatário.");
    if(!valor("nfeClienteCodigoIbge")) erros.push("Informe o Código IBGE do município do destinatário.");
    if(!valor("nfeClientePais")) erros.push("Informe o país do destinatário.");

    // Produtos
    if(itensNfe.length === 0) erros.push("Adicione ao menos um item na NF-e.");

    itensNfe.forEach(function(item, indice) {
        const n = indice + 1;
        if(!item.codigo) erros.push(`Item ${n}: informe o Código Interno.`);
        if(!item.descricao) erros.push(`Item ${n}: informe a Descrição.`);
        if(!item.ncm) erros.push(`Item ${n}: informe o NCM.`);
        if(!item.cfop) erros.push(`Item ${n}: informe o CFOP.`);
        if(!item.unidade) erros.push(`Item ${n}: informe a Unidade Comercial.`);
        if(!(numero(item.quantidade) > 0)) erros.push(`Item ${n}: informe a Quantidade.`);
        if(!(numero(item.valorUnitario) > 0)) erros.push(`Item ${n}: informe o Valor Unitário.`);
        if(!item.origem && item.origem !== "0") erros.push(`Item ${n}: informe a Origem da mercadoria.`);

        // Tributação — Simples Nacional / MEI: precisa de CSOSN
        if(ehSimplesOuMei){
            if(!item.csosn) erros.push(`Item ${n}: informe o CSOSN (regime Simples/MEI).`);
        } else {
            // Lucro Real / Presumido: precisa de CST ICMS + Base + Alíquota + Valor ICMS
            if(!item.cstIcms) erros.push(`Item ${n}: informe o CST ICMS.`);
            if(!(numero(item.impostos?.icms?.base) > 0)) erros.push(`Item ${n}: informe a Base de Cálculo do ICMS.`);
            if(!(numero(item.impostos?.icms?.aliquota) >= 0)) erros.push(`Item ${n}: informe a Alíquota do ICMS.`);
        }

        if(!item.cst) erros.push(`Item ${n}: informe o CST/CSOSN.`);
    });

    // Transporte
    if(valor("nfeModalidadeFrete") === "") erros.push("Informe a Modalidade do Frete.");

    // Pagamento
    if(!valor("nfePagamento")) erros.push("Informe a forma de pagamento.");

    return erros;
}

function montarNota(base, empresa, config){
    const totalProdutos = itensNfe.reduce(function(total, item) {
        return total + numero(item.total);
    }, 0);
    const totalImpostos = calcularTotalImpostos();
    // Valor NF = produtos + frete + seguro + outras - desconto (impostos são informativos, SEFAZ calcula)
    const totalNota = Math.max(0, totalProdutos + numero(valor("nfeFrete")) + numero(valor("nfeSeguro")) + numero(valor("nfeOutrasDespesas")) - numero(valor("nfeDesconto")));
    const numeroNfe = valor("nfeNumero") || config.fiscalProximoNfe || "1";
    const serie = valor("nfeSerie") || config.fiscalSerieNfe || "1";

    return {
        id: gerarId("nfe"),
        tipoXml: "saida",
        status: "rascunho",
        modelo: "55",
        serie,
        numero: numeroNfe,
        emissao: (valor("nfeDataEmissao") || dataHoraLocalAtual()).slice(0, 10),
        dataHoraEmissao: valor("nfeDataEmissao") || dataHoraLocalAtual(),
        tipoOperacao: valor("nfeTipoOperacao"),
        naturezaOperacao: valor("nfeNaturezaOperacao"),
        finalidade: valor("nfeFinalidade"),
        emitente: {
            razaoSocial: empresa.razaoSocial || empresa.nomeFantasia || "",
            cnpj: empresa.cnpj || "",
            uf: config.fiscalUf || empresa.estado || "",
            regime: config.fiscalRegimeTributario || ""
        },
        destinatario: {
            clienteId: valor("nfeCliente"),
            tipo: valor("nfeClienteTipo") || "pj",
            cnpj: valor("nfeClienteCnpj"),
            cpf: valor("nfeClienteCpf"),
            razaoSocial: valor("nfeClienteRazaoSocial"),
            nomeFantasia: valor("nfeClienteNomeFantasia"),
            nome: valor("nfeClienteNome"),
            indIe: valor("nfeClienteIndIe") || "9",
            ie: valor("nfeClienteIe"),
            cep: valor("nfeClienteCep"),
            logradouro: valor("nfeClienteEndereco"),
            numero: valor("nfeClienteNumero"),
            complemento: valor("nfeClienteComplemento"),
            bairro: valor("nfeClienteBairro"),
            cidade: valor("nfeClienteCidade"),
            uf: valor("nfeClienteUf").toUpperCase(),
            codigoIbge: valor("nfeClienteCodigoIbge"),
            pais: valor("nfeClientePais") || "Brasil",
            telefone: valor("nfeClienteTelefone"),
            email: valor("nfeClienteEmail")
        },
        itens: [...itensNfe],
        totais: {
            produtos: totalProdutos,
            impostos: totalImpostos,
            frete: numero(valor("nfeFrete")),
            seguro: numero(valor("nfeSeguro")),
            desconto: numero(valor("nfeDesconto")),
            outrasDespesas: numero(valor("nfeOutrasDespesas")),
            nota: totalNota
        },
        transporte: {
            modalidadeFrete: valor("nfeModalidadeFrete"),
            transportadora: valor("nfeTransportadora"),
            placa: valor("nfePlaca"),
            uf: valor("nfeTransporteUf").toUpperCase(),
            volume: numero(valor("nfeVolume")),
            pesoBruto: numero(valor("nfePesoBruto")),
            pesoLiquido: numero(valor("nfePesoLiquido"))
        },
        pagamento: {
            forma: valor("nfePagamento"),
            descricao: document.getElementById("nfePagamento")?.selectedOptions?.[0]?.textContent || "",
            valorPago: numero(valor("nfeValorPago")),
            troco: numero(valor("nfeTroco"))
        },
        impostosDaNota: montarImpostosDaNota(),
        observacoesFiscais: valor("nfeObservacoesFiscais"),
        informacoesComplementares: valor("nfeInformacoesComplementares"),
        xml: gerarXmlBasico(numeroNfe, serie, empresa, totalNota, valor("nfeDataEmissao") || dataHoraLocalAtual()),
        criadoEm: new Date().toISOString()
    };
}

function gerarBoletosDaNfe(base, nota){
    base.boletos = Array.isArray(base.boletos) ? base.boletos : [];
    base.contasReceber = Array.isArray(base.contasReceber) ? base.contasReceber : [];

    const parcelas = Math.max(1, Math.min(24, Math.trunc(numero(valor("nfeBoletoParcelas")) || 1)));
    const total = numero(nota.totais?.nota);
    const valorParcela = Math.round((total / parcelas) * 100) / 100;
    const dia = numero(valor("nfeBoletoDiaVencimento")) || diaDataNfe(valor("nfeBoletoVencimento")) || 10;
    const loteId = gerarId("lote_nfe_bol");
    const cliente = clienteSelecionadoNfeTexto(nota);
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const itensResumo = (nota.itens || []).map(function(item){
        return { produtoId: item.produtoId, codigo: item.codigo, descricao: item.descricao, quantidade: item.quantidade, valorUnitario: item.valorUnitario, valorTotal: item.total };
    });

    for(let indice = 0; indice < parcelas; indice += 1){
        const valorBoleto = indice === parcelas - 1 ? Math.round((total - (valorParcela * (parcelas - 1))) * 100) / 100 : valorParcela;
        const vencimento = calcularVencimentoParcelaNfe(valor("nfeBoletoVencimento") || somarDiasNfe(dataIsoNfe(), 3), indice, dia);
        const boleto = {
            id: gerarId("bol"),
            loteId,
            numero: proximoNumeroBoletoNfe(base, base.boletos.length + 1),
            cliente,
            clienteNome: cliente,
            clienteId: nota.destinatario?.clienteId || "",
            itens: itensResumo,
            valor: valorBoleto,
            vencimento,
            parcela: indice + 1,
            totalParcelas: parcelas,
            parcelas,
            juros: 0,
            multa: 0,
            status: "gerado",
            statusIntegracao: "pendente_configuracao",
            apiStatus: "aguardando_registro",
            origem: "NF-e",
            origemId: nota.id,
            notaNumero: nota.numero,
            usuarioNome: usuario.nome || usuario.login || "Administrador",
            linhaDigitavel: "",
            linkBoleto: "",
            pixCopiaCola: "",
            criadoEm: new Date().toISOString(),
            dataHora: new Date().toISOString()
        };

        base.boletos.push(boleto);
        base.contasReceber.push({
            id: gerarId("rec"),
            boletoId: boleto.id,
            clienteNome: cliente,
            documento: boleto.numero,
            data: new Date().toISOString(),
            vencimento,
            valor: valorBoleto,
            saldo: valorBoleto,
            status: "aberto",
            origem: "Boleto NF-e"
        });
    }
}

function gerarXmlBasico(numero, serie, empresa, totalNota, dataHoraEmissao){
    return `<?xml version="1.0" encoding="UTF-8"?>\n<NFe>\n  <infNFe versao="4.00">\n    <ide><mod>55</mod><serie>${escaparXml(serie)}</serie><nNF>${escaparXml(numero)}</nNF><dhEmi>${escaparXml(formatarDataHoraXml(dataHoraEmissao))}</dhEmi></ide>\n    <emit><CNPJ>${somenteNumeros(empresa.cnpj || "")}</CNPJ><xNome>${escaparXml(empresa.razaoSocial || empresa.nomeFantasia || "")}</xNome></emit>\n    <total><ICMSTot><vNF>${totalNota.toFixed(2)}</vNF></ICMSTot></total>\n  </infNFe>\n</NFe>`;
}

function previewDanfe(){
    alert("Pré-visualização do DANFE preparada. A geração fiscal em PDF depende do motor DANFE/SEFAZ.");
}

function transmitirNfe(){
    if(!validarNfe()) return;
    definirTexto("statusNfe", "Pronta para transmissão");
    alert("Fluxo padrão: gerar XML, assinar com certificado A1/A3, enviar para SEFAZ e gravar protocolo. A transmissão real exige backend fiscal.");
}

function consultarStatusNfe(){
    alert("Consulta de status exige chave/protocolo autorizado pela SEFAZ.");
}

function cancelarNfe(){
    alert("Cancelamento exige NF-e autorizada, justificativa e evento enviado à SEFAZ.");
}

function cartaCorrecao(){
    alert("Carta de correção exige NF-e autorizada e evento CC-e.");
}

function baixarXmlNfe(){
    const empresa = window.EmpresaSistema?.obter?.() || {};
    const totalProdutos = itensNfe.reduce(function(total, item) {
        return total + numero(item.total);
    }, 0);
    const total = Math.max(0, totalProdutos + numero(valor("nfeFrete")) + numero(valor("nfeSeguro")) + numero(valor("nfeOutrasDespesas")) - numero(valor("nfeDesconto")));
    const xml = gerarXmlBasico(valor("nfeNumero") || "1", valor("nfeSerie") || "1", empresa, total, valor("nfeDataEmissao") || dataHoraLocalAtual());
    baixarArquivo(`nfe_${valor("nfeNumero") || "rascunho"}.xml`, xml, "application/xml;charset=utf-8");
}

function baixarDanfe(){
    const texto = `DANFE - Prévia\nNF-e: ${valor("nfeNumero") || "rascunho"}\nTotal: ${document.getElementById("nfeTotalNota")?.textContent || "R$ 0,00"}`;
    baixarArquivo(`danfe_${valor("nfeNumero") || "rascunho"}.txt`, texto, "text/plain;charset=utf-8");
}

function enviarEmailNfe(){
    alert("Envio por e-mail/WhatsApp depende de integração de comunicação.");
}

function baixarArquivo(nome, conteudo, tipo){
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function alternarCadastroRapido(id, fechar){
    const elemento = document.getElementById(id);
    if(!elemento) return;
    const abrir = !fechar && elemento.classList.contains("recolhido");
    if(abrir && elemento.parentElement !== document.body){
        document.body.appendChild(elemento);
    }
    elemento.classList.toggle("recolhido", !abrir);
    elemento.setAttribute("aria-hidden", abrir ? "false" : "true");
    document.body.classList.toggle("nfe-modal-aberto", document.querySelector(".nfe-modal-cadastro:not(.recolhido)") !== null);

    if(abrir){
        const primeiroCampo = elemento.querySelector(".form-grid input, .form-grid select, .form-grid textarea");
        setTimeout(function() {
            primeiroCampo?.focus();
        }, 60);
    }
}function gerarCodigoProduto(mercadorias){
    const maior = mercadorias.reduce(function(maximo, item) {
        const numeroCodigo = Number.parseInt(String(item.codigo || "").replace(/\D/g, ""), 10);
        return Number.isFinite(numeroCodigo) ? Math.max(maximo, numeroCodigo) : maximo;
    }, 0);
    return String(maior + 1).padStart(6, "0");
}

function gerarId(prefixo){
    return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function dataIsoNfe(){
    return new Date().toISOString().slice(0, 10);
}

function somarDiasNfe(dataTexto, dias){
    const data = new Date(dataTexto + "T00:00:00");
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
}

function diaDataNfe(dataTexto){
    const dia = Number.parseInt(String(dataTexto || "").slice(8, 10), 10);
    return Number.isFinite(dia) ? dia : 0;
}

function calcularVencimentoParcelaNfe(dataInicial, indice, diaPreferido){
    const base = new Date((dataInicial || somarDiasNfe(dataIsoNfe(), 3)) + "T00:00:00");
    base.setMonth(base.getMonth() + indice);
    const dia = Math.max(1, Math.min(31, Math.trunc(numero(diaPreferido) || base.getDate())));
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(dia, ultimoDia));
    return base.toISOString().slice(0, 10);
}

function proximoNumeroBoletoNfe(base, quantidade){
    return "BOL-" + String(quantidade || ((base.boletos?.length || 0) + 1)).padStart(5, "0");
}

function clienteSelecionadoNfeTexto(nota){
    const select = document.getElementById("nfeCliente");
    const nomeSelect = select?.selectedOptions?.[0]?.textContent || "";
    return nomeSelect && !nomeSelect.includes("Selecione") ? nomeSelect : nota.destinatario?.documento || "Cliente NF-e";
}

function valor(id){
    return document.getElementById(id)?.value.trim() || "";
}function definirValorCampo(id, texto){
    const elemento = document.getElementById(id);
    if(elemento) elemento.value = texto;
}

function dataHoraLocalAtual(){
    const agora = new Date();
    const offset = agora.getTimezoneOffset();
    const local = new Date(agora.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

function formatarDataHoraXml(dataHora){
    const texto = String(dataHora || dataHoraLocalAtual());
    const base = texto.length === 16 ? `${texto}:00` : texto;
    const offsetMinutos = -new Date().getTimezoneOffset();
    const sinal = offsetMinutos >= 0 ? "+" : "-";
    const absoluto = Math.abs(offsetMinutos);
    const horas = String(Math.floor(absoluto / 60)).padStart(2, "0");
    const minutos = String(absoluto % 60).padStart(2, "0");
    return `${base}${sinal}${horas}:${minutos}`;
}

function somenteNumeros(texto){
    return String(texto || "").replace(/\D/g, "");
}
function escaparXml(valorEntrada){
    return escapar(valorEntrada);
}
window.removerItemNfe = removerItemNfe;
window.alternarTipoDestinatario = alternarTipoDestinatario;
