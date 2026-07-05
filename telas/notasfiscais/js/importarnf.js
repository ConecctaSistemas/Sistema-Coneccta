let notaImportada = null;
let xmlOriginal = "";

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("arquivoXmlNf")?.addEventListener("change", carregarXml);
    document.getElementById("btnSalvarEntradaXml")?.addEventListener("click", salvarEntradaXml);
    document.getElementById("btnLimparXml")?.addEventListener("click", limparImportacao);
    document.getElementById("btnIrProdutos")?.addEventListener("click", function() {
        location.href = new URL("telas/cadastros/mercadorias.html", document.baseURI).href;
    });
});

function carregarXml(evento){
    const arquivo = evento.target.files?.[0];

    if(!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function() {
        xmlOriginal = String(leitor.result || "");
        processarXml(xmlOriginal);
    };
    leitor.readAsText(arquivo, "UTF-8");
}

function processarXml(textoXml){
    const doc = new DOMParser().parseFromString(textoXml, "application/xml");

    if(doc.querySelector("parsererror")){
        alert("XML inválido. Verifique o arquivo selecionado.");
        return;
    }

    const infNFe = doc.querySelector("infNFe");
    const ide = doc.querySelector("ide");
    const emit = doc.querySelector("emit");
    const total = doc.querySelector("ICMSTot");

    if(!infNFe || !ide || !emit){
        alert("Não foi possível identificar uma NF-e válida neste XML.");
        return;
    }

    const itens = [...doc.querySelectorAll("det")].map(function(det) {
        const prod = det.querySelector("prod");
        const imposto = det.querySelector("imposto");
        const icms = imposto?.querySelector("ICMS > *");

        return {
            item: det.getAttribute("nItem") || "",
            codigo: texto(prod, "cProd"),
            ean: texto(prod, "cEAN") || texto(prod, "cEANTrib"),
            descricao: texto(prod, "xProd"),
            ncm: texto(prod, "NCM"),
            cfop: texto(prod, "CFOP"),
            unidade: texto(prod, "uCom") || "UN",
            quantidade: numero(texto(prod, "qCom")),
            valorUnitario: numeroXml(texto(prod, "vUnCom")),
            total: numeroXml(texto(prod, "vProd")),
            cest: texto(prod, "CEST"),
            cst: texto(icms, "CST") || texto(icms, "CSOSN"),
            icms: numeroXml(texto(icms, "pICMS")),
            baseIcms: numeroXml(texto(icms, "vBC")),
            valorIcms: numeroXml(texto(icms, "vICMS")),
            origem: texto(icms, "orig")
        };
    });

    notaImportada = {
        id: gerarId("nfe"),
        chave: (infNFe.getAttribute("Id") || "").replace(/^NFe/i, ""),
        numero: texto(ide, "nNF"),
        serie: texto(ide, "serie"),
        modelo: texto(ide, "mod"),
        natureza: texto(ide, "natOp"),
        emissao: texto(ide, "dhEmi") || texto(ide, "dEmi"),
        entradaSaida: texto(ide, "tpNF"),
        fornecedor: {
            nome: texto(emit, "xNome"),
            fantasia: texto(emit, "xFant"),
            cnpj: texto(emit, "CNPJ") || texto(emit, "CPF"),
            ie: texto(emit, "IE"),
            uf: texto(emit.querySelector("enderEmit"), "UF"),
            municipio: texto(emit.querySelector("enderEmit"), "xMun")
        },
        totais: {
            produtos: numeroXml(texto(total, "vProd")),
            desconto: numeroXml(texto(total, "vDesc")),
            frete: numeroXml(texto(total, "vFrete")),
            seguro: numeroXml(texto(total, "vSeg")),
            ipi: numeroXml(texto(total, "vIPI")),
            icms: numeroXml(texto(total, "vICMS")),
            pis: numeroXml(texto(total, "vPIS")),
            cofins: numeroXml(texto(total, "vCOFINS")),
            nota: numeroXml(texto(total, "vNF"))
        },
        itens,
        xml: textoXml,
        importadoEm: new Date().toISOString(),
        status: "conferida"
    };

    renderizarNota();
}

function renderizarNota(){
    if(!notaImportada) return;

    definirTexto("statusXml", "XML carregado");
    definirTexto("nfChave", notaImportada.chave || "-");
    definirTexto("nfNumeroSerie", `${notaImportada.numero || "-"} / ${notaImportada.serie || "-"}`);
    definirTexto("nfEmissao", formatarData(notaImportada.emissao));
    definirTexto("nfTotal", formatarMoedaRS(notaImportada.totais.nota));
    definirTexto("fornecedorNome", notaImportada.fornecedor.nome || "-");
    definirTexto("fornecedorCnpj", notaImportada.fornecedor.cnpj || "-");
    definirTexto("fornecedorIe", notaImportada.fornecedor.ie || "-");
    definirTexto("fornecedorUf", notaImportada.fornecedor.uf || "-");
    definirTexto("contadorItensXml", `${notaImportada.itens.length} item(ns)`);

    const destino = document.getElementById("tabelaItensXml");

    if(!destino) return;

    if(notaImportada.itens.length === 0){
        destino.innerHTML = `<tr><td colspan="8" class="vazio">Nenhum item encontrado no XML.</td></tr>`;
        return;
    }

    destino.innerHTML = notaImportada.itens.map(function(item) {
        const indice = notaImportada.itens.indexOf(item);
        const precoVenda = item.precoVenda || item.valorUnitario;
        const margem = item.margemLucro || 0;

        return `
            <tr data-indice="${indice}">
                <td>${escapar(item.codigo)}</td>
                <td>
                    <input class="campo-tabela campo-descricao" data-campo="descricao" value="${escapar(item.descricao)}">
                    <small>EAN ${escapar(item.ean || "-")}</small>
                </td>
                <td><input class="campo-tabela curto" data-campo="ncm" value="${escapar(item.ncm || "")}"></td>
                <td><input class="campo-tabela curto" data-campo="cfop" value="${escapar(item.cfop || "")}"></td>
                <td><input class="campo-tabela curto" data-campo="cst" value="${escapar(item.cst || "")}"></td>
                <td><input class="campo-tabela numero" data-campo="quantidade" value="${formatarDecimalCampo(item.quantidade)}"> ${escapar(item.unidade)}</td>
                <td><input class="campo-tabela moeda" data-campo="valorUnitario" value="${formatarDecimalCampo(item.valorUnitario)}"></td>
                <td><input class="campo-tabela numero" data-campo="margemLucro" value="${formatarDecimalCampo(margem)}"></td>
                <td><input class="campo-tabela moeda" data-campo="precoVenda" value="${formatarDecimalCampo(precoVenda)}"></td>
                <td>${formatarMoeda(item.total)}</td>
            </tr>
        `;
    }).join("");

    destino.querySelectorAll("[data-campo]").forEach(function(campo) {
        campo.addEventListener("input", atualizarItemEditado);
        campo.addEventListener("blur", formatarCampoEditavel);
    });
}

function salvarEntradaXml(){
    if(!notaImportada){
        notificar("Selecione e confira um XML antes de salvar.", "sucesso");
        return;
    }

    sincronizarEdicoesTabela();
    const base = obterBase();

    if(notaImportada.chave && base.notasEntrada.some(function(nota) {
        return nota.chave === notaImportada.chave;
    })){
        notificar("Esta NF-e já foi importada.", "sucesso");
        return;
    }

    base.notasEntrada.push(notaImportada);
    salvarFornecedor(base, notaImportada.fornecedor);
    salvarProdutosDaNota(base, notaImportada);
    salvarBase(base);

    notificar("NF-e importada. Produtos e dados fiscais salvos no sistema.", "sucesso");
    location.href = new URL("telas/cadastros/mercadorias.html", document.baseURI).href;
}

function atualizarItemEditado(evento){
    const linha = evento.target.closest("tr[data-indice]");
    const indice = Number(linha?.dataset.indice);
    const campo = evento.target.dataset.campo;
    const item = notaImportada?.itens?.[indice];

    if(!item || !campo) return;

    const valor = evento.target.value;

    if(["quantidade", "valorUnitario", "margemLucro", "precoVenda"].includes(campo)){
        item[campo] = numeroCampo(valor);
    }else{
        item[campo] = valor;
    }

    if(campo === "margemLucro" || campo === "valorUnitario"){
        item.precoVenda = arredondarMoeda(numeroCampo(item.valorUnitario) * (1 + (numeroCampo(item.margemLucro) / 100)));
        const campoPreco = linha.querySelector('[data-campo="precoVenda"]');
        if(campoPreco) campoPreco.value = formatarDecimalCampo(item.precoVenda);
    }

    item.total = arredondarMoeda(numeroCampo(item.quantidade) * numeroCampo(item.valorUnitario));
    linha.lastElementChild.textContent = formatarMoeda(item.total);
}

function formatarCampoEditavel(evento){
    const campo = evento.target.dataset.campo;

    if(["quantidade", "valorUnitario", "margemLucro", "precoVenda"].includes(campo)){
        evento.target.value = formatarDecimalCampo(numeroCampo(evento.target.value));
    }
}

function sincronizarEdicoesTabela(){
    document.querySelectorAll("#tabelaItensXml tr[data-indice]").forEach(function(linha) {
        linha.querySelectorAll("[data-campo]").forEach(function(campo) {
            atualizarItemEditado({ target: campo });
        });
    });
}

function salvarFornecedor(base, fornecedor){
    if(!fornecedor?.cnpj) return;

    const existente = base.fornecedores.find(function(item) {
        return somenteNumeros(item.cnpj) === somenteNumeros(fornecedor.cnpj);
    });

    if(existente){
        existente.nome = fornecedor.nome || existente.nome;
        existente.ie = fornecedor.ie || existente.ie;
        existente.uf = fornecedor.uf || existente.uf;
        existente.atualizadoEm = new Date().toISOString();
        return;
    }

    base.fornecedores.push({
        id: gerarId("for"),
        nome: fornecedor.nome,
        fantasia: fornecedor.fantasia,
        cnpj: fornecedor.cnpj,
        ie: fornecedor.ie,
        uf: fornecedor.uf,
        municipio: fornecedor.municipio,
        origem: "Importação XML",
        criadoEm: new Date().toISOString()
    });
}

function salvarProdutosDaNota(base, nota){
    nota.itens.forEach(function(item) {
        const produto = localizarProduto(base.mercadorias, item);
        const dados = {
            codigo: item.codigo || gerarCodigo(base.mercadorias),
            ean: item.ean,
            descricao: item.descricao,
            referencia: item.codigo,
            categoria: "Importado XML",
            unidade: item.unidade || "UN",
            estoque: item.quantidade,
            estoqueMinimo: 0,
            precoCusto: item.valorUnitario,
            precoVenda: item.precoVenda || item.valorUnitario,
            precoPromocional: 0,
            ativo: true,
            precoLivre: false,
            vendaFracionada: false,
            ncm: item.ncm,
            cest: item.cest,
            cfop: item.cfop,
            cst: item.cst,
            icms: item.icms,
            fornecedorCnpj: nota.fornecedor.cnpj,
            fornecedorNome: nota.fornecedor.nome,
            notaEntradaId: nota.id,
            notaEntradaChave: nota.chave,
            atualizadoEm: new Date().toISOString()
        };

        if(produto){
            produto.ean = dados.ean || produto.ean;
            produto.descricao = dados.descricao || produto.descricao;
            produto.referencia = dados.referencia || produto.referencia;
            produto.unidade = dados.unidade || produto.unidade;
            produto.estoque = numero(produto.estoque) + numero(item.quantidade);
            produto.precoCusto = dados.precoCusto;
            produto.ncm = dados.ncm || produto.ncm;
            produto.cest = dados.cest || produto.cest;
            produto.cfop = dados.cfop || produto.cfop;
            produto.cst = dados.cst || produto.cst;
            produto.icms = dados.icms || produto.icms;
            produto.fornecedorCnpj = dados.fornecedorCnpj;
            produto.fornecedorNome = dados.fornecedorNome;
            produto.notaEntradaId = dados.notaEntradaId;
            produto.notaEntradaChave = dados.notaEntradaChave;
            produto.atualizadoEm = dados.atualizadoEm;
            return;
        }

        base.mercadorias.push({
            id: gerarId("prd"),
            ...dados,
            criadoEm: new Date().toISOString()
        });
    });
}

function localizarProduto(mercadorias, item){
    const ean = somenteNumeros(item.ean);
    const codigo = normalizar(item.codigo);

    return mercadorias.find(function(produto) {
        return (ean && somenteNumeros(produto.ean) === ean) ||
            (codigo && normalizar(produto.codigo) === codigo);
    });
}

function limparImportacao(){
    notaImportada = null;
    xmlOriginal = "";
    document.getElementById("arquivoXmlNf").value = "";
    definirTexto("statusXml", "Aguardando XML");
    definirTexto("nfChave", "-");
    definirTexto("nfNumeroSerie", "-");
    definirTexto("nfEmissao", "-");
    definirTexto("nfTotal", "R$ 0,00");
    definirTexto("fornecedorNome", "-");
    definirTexto("fornecedorCnpj", "-");
    definirTexto("fornecedorIe", "-");
    definirTexto("fornecedorUf", "-");
    definirTexto("contadorItensXml", "0 item(ns)");
    document.getElementById("tabelaItensXml").innerHTML = `<tr><td colspan="8" class="vazio">Nenhum XML carregado.</td></tr>`;
}function texto(raiz, seletor){
    return raiz?.querySelector(seletor)?.textContent?.trim() || "";
}

function numeroXml(valor){
    if(typeof valor === "number") return valor;
    const textoValor = String(valor || "").trim();
    return Number(textoValor) || 0;
}

function numeroCampo(valor){
    if(typeof valor === "number") return valor;
    const textoValor = String(valor || "0").trim();

    if(textoValor.includes(",")){
        return Number.parseFloat(textoValor.replace(/\./g, "").replace(",", ".")) || 0;
    }

    return Number(textoValor) || 0;
}

function numero(valor){
    return numeroCampo(valor);
}function formatarDecimalCampo(valor){
    return numeroCampo(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function arredondarMoeda(valor){
    return Math.round(numeroCampo(valor) * 100) / 100;
}

function formatarData(valor){
    if(!valor) return "-";
    const data = new Date(valor);
    if(Number.isNaN(data.getTime())) return "-";
    return data.toLocaleDateString("pt-BR");
}
function gerarCodigo(mercadorias){
    const maior = mercadorias.reduce(function(maximo, item) {
        const numeroCodigo = Number.parseInt(String(item.codigo || "").replace(/\D/g, ""), 10);
        return Number.isFinite(numeroCodigo) ? Math.max(maximo, numeroCodigo) : maximo;
    }, 0);

    return "PRD-" + String(maior + 1).padStart(6, "0");
}
function somenteNumeros(valor){
    return String(valor || "").replace(/\D/g, "");
}
