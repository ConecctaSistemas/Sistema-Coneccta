let notaEntrada = null;
let produtoAtualId = null;
let produtoSistemaSelecionadoId = null;
let parcelasEntrada = [];
let contasConfirmadas = false;
let colunasProdutosVisiveis = new Set(["descricao", "ncm", "quantidade", "custoFinal", "produtoSistema", "precoAtual", "precoSugerido", "cfopNfce", "status", "alertas", "acoes"]);
let camposSecoesVisiveis = {};
let pendenciaAtual = null;
let catalogoNcmEntrada = [];
let catalogoNcmEntradaCarregado = false;
let carregandoCatalogoNcmEntrada = null;
let campoNcmEntradaAtivo = "novoNcm";

const COLUNAS_PRODUTOS_NOTA = [
    { id: "codigoXml", titulo: "Código XML", extra: true },
    { id: "descricao", titulo: "Descrição" },
    { id: "ean", titulo: "Código de barras", extra: true },
    { id: "ncm", titulo: "NCM" },
    { id: "quantidade", titulo: "Quantidade" },
    { id: "custoFinal", titulo: "Preço de custo" },
    { id: "produtoSistema", titulo: "Produto vinculado" },
    { id: "precoAtual", titulo: "Venda" },
    { id: "precoSugerido", titulo: "Preço sugerido" },
    { id: "cfopNfce", titulo: "CFOP de venda" },
    { id: "status", titulo: "Status" },
    { id: "alertas", titulo: "Alertas" },
    { id: "acoes", titulo: "Ações" },
    { id: "cest", titulo: "CEST", extra: true },
    { id: "cfopEntrada", titulo: "CFOP entrada", extra: true },
    { id: "custoXml", titulo: "Custo XML", extra: true },
    { id: "impostos", titulo: "Impostos", extra: true },
    { id: "frete", titulo: "Frete rateado", extra: true },
    { id: "desconto", titulo: "Desconto", extra: true },
    { id: "cfopNfeInterna", titulo: "CFOP NF-e interna", extra: true },
    { id: "cfopNfeInterestadual", titulo: "CFOP NF-e interestadual", extra: true }
];

const SECOES_AJUSTAVEIS = {
    dadosNota: {
        storage: "entradasNotasCamposDados",
        padrao: ["numero", "serie", "emissao", "entrada", "fornecedor", "cnpj", "total"],
        campos: [
            ["chave", "Chave de acesso"],
            ["numero", "Número"],
            ["serie", "Série"],
            ["emissao", "Emissão"],
            ["entrada", "Entrada"],
            ["fornecedor", "Fornecedor"],
            ["cnpj", "CNPJ fornecedor"],
            ["produtos", "Valor produtos"],
            ["total", "Valor total"],
            ["frete", "Frete"],
            ["desconto", "Desconto"],
            ["outras", "Outras despesas"]
        ]
    },
    fornecedor: {
        storage: "entradasNotasCamposFornecedor",
        padrao: ["razao", "cnpj", "cidade"],
        campos: [["razao", "Razão social"], ["fantasia", "Nome fantasia"], ["cnpj", "CNPJ"], ["ie", "Inscrição estadual"], ["cidade", "Cidade/UF"]]
    },
    precos: {
        storage: "entradasNotasCamposPrecos",
        padrao: ["custoFinal", "margem", "sugerido"],
        campos: [["custoNota", "Custo da nota"], ["frete", "Frete rateado"], ["despesas", "Despesas rateadas"], ["custoFinal", "Custo final"], ["margem", "Margem"], ["sugerido", "Preço sugerido"]]
    },
    tributos: {
        storage: "entradasNotasCamposTributos",
        padrao: ["cfop", "ncm", "cest", "icms"],
        campos: [["cfop", "CFOP"], ["cstIcms", "CST/CSOSN ICMS"], ["cstPis", "CST PIS"], ["cstCofins", "CST COFINS"], ["cstIpi", "CST IPI"], ["origem", "Origem"], ["ncm", "NCM"], ["cest", "CEST"], ["aliquota", "Alíquota ICMS"], ["base", "Base"], ["icms", "ICMS"], ["ipi", "IPI"], ["pis", "PIS"], ["cofins", "COFINS"]]
    },
    financeiro: {
        storage: "entradasNotasCamposFinanceiro",
        padrao: ["gerar", "forma", "parcelas", "valor"],
        campos: [["gerar", "Gerar contas"], ["forma", "Forma"], ["parcelas", "Parcelas"], ["vencimento", "Primeiro vencimento"], ["valor", "Valor total"]]
    },
    checklist: {
        storage: "entradasNotasCamposChecklist",
        padrao: ["xml", "fornecedor", "vinculados", "custos", "financeiro"],
        campos: [["xml", "XML importado"], ["fornecedor", "Fornecedor"], ["vinculados", "Produtos vinculados"], ["novos", "Produtos novos"], ["custos", "Custos"], ["estoque", "Estoque"], ["financeiro", "Financeiro"]]
    }
};

function confirmar(mensagem) {
    return new Promise(function(resolve) {
        const modal   = document.getElementById("modalConfirmacao");
        const msg     = document.getElementById("modalConfirmacaoMensagem");
        const btnOk   = document.getElementById("btnConfirmacaoOk");
        const btnNao  = document.getElementById("btnConfirmacaoCancelar");
        if(!modal) { resolve(window.confirm(mensagem)); return; }
        msg.textContent = mensagem;
        modal.classList.add("aberto");
        modal.setAttribute("aria-hidden", "false");
        function fechar(resultado) {
            modal.classList.remove("aberto");
            modal.setAttribute("aria-hidden", "true");
            btnOk.removeEventListener("click", onOk);
            btnNao.removeEventListener("click", onNao);
            modal.removeEventListener("click", onFundo);
            resolve(resultado);
        }
        function onOk()   { fechar(true);  }
        function onNao()  { fechar(false); }
        function onFundo(e) { if(e.target === modal) fechar(false); }
        btnOk.addEventListener("click",  onOk);
        btnNao.addEventListener("click", onNao);
        modal.addEventListener("click",  onFundo);
    });
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("btnImportarXml")?.addEventListener("click", function() {
        document.getElementById("arquivoXmlEntrada")?.click();
    });
    document.getElementById("arquivoXmlEntrada")?.addEventListener("change", importarXmlArquivo);
    document.getElementById("btnBuscarNfe")?.addEventListener("click", function() {
        mostrarToast("Busca de NF-e preparada para integração com manifestação do destinatário.");
    });
    document.getElementById("btnNovaEntrada")?.addEventListener("click", novaEntrada);
    document.getElementById("btnRecalcularPrecos")?.addEventListener("click", recalcularPrecos);
    document.getElementById("precoMargem")?.addEventListener("input", recalcularPrecos);
    document.getElementById("btnGerarParcelas")?.addEventListener("click", gerarParcelas);
    document.getElementById("btnConfirmarContas")?.addEventListener("click", confirmarContasPagar);
    document.getElementById("btnFinalizarEntrada")?.addEventListener("click", finalizarEntrada);
    document.getElementById("btnSalvarRascunho")?.addEventListener("click", salvarRascunho);
    document.getElementById("btnCancelarEntrada")?.addEventListener("click", cancelarEntrada);
    document.getElementById("btnVerFornecedor")?.addEventListener("click", function() { mostrarToast("Cadastro do fornecedor pronto para consulta."); });
    document.getElementById("btnCadastrarFornecedor")?.addEventListener("click", function() { mostrarToast("Fornecedor cadastrado localmente nesta entrada."); });
    document.getElementById("btnAtualizarFornecedor")?.addEventListener("click", function() { mostrarToast("Dados do fornecedor atualizados."); });
    document.getElementById("tabelaProdutosNota")?.addEventListener("change", tratarAlteracaoProduto);
    document.getElementById("tabelaProdutosNota")?.addEventListener("click", function(e) {
        if(e.target.closest("input, select, button, a")) return;
        const linha = e.target.closest("tr[data-id]");
        if(!linha) return;
        document.querySelectorAll("#tabelaProdutosNota tr.linha-selecionada").forEach(function(tr) {
            tr.classList.remove("linha-selecionada");
        });
        linha.classList.add("linha-selecionada");
        selecionarTributos(linha.dataset.id);
        atualizarPrecoProduto(linha.dataset.id);
    });
    document.getElementById("tabelaProdutosNota")?.addEventListener("dblclick", function(e) {
        if(e.target.closest("input, select, button, a")) return;
        const linha = e.target.closest("tr[data-id]");
        if(!linha) return;
        abrirDetalheProduto(linha.dataset.id);
    });
    document.getElementById("btnSalvarDetalheProduto")?.addEventListener("click", salvarDetalheProduto);
    document.getElementById("mdPrecoMargem")?.addEventListener("input", function() {
        const custo = numeroMoeda(document.getElementById("mdPrecoCustoFinal")?.value || "0");
        const margem = parseFloat(this.value || "0") || 0;
        const sugerido = margem >= 100 ? custo * 10 : custo / (1 - margem / 100);
        definirValor("mdPrecoSugerido", formatarMoeda(isFinite(sugerido) ? sugerido : 0));
    });
    document.getElementById("filtroProdutoNota")?.addEventListener("input", renderizarProdutos);
    document.getElementById("tabelaParcelas")?.addEventListener("click", tratarCliqueParcela);
    document.getElementById("buscaProdutoSistema")?.addEventListener("input", renderizarProdutosSistema);
    document.getElementById("listaProdutosSistema")?.addEventListener("click", selecionarProdutoSistema);
    document.getElementById("btnConfirmarVinculo")?.addEventListener("click", confirmarVinculoProduto);
    document.getElementById("btnSalvarNovoProduto")?.addEventListener("click", salvarNovoProduto);
    document.getElementById("btnPesquisarNcmEntrada")?.addEventListener("click", function() {
        abrirPesquisaNcmEntrada("novoNcm");
    });
    document.getElementById("novoNcm")?.addEventListener("input", function() {
        this.value = this.value.replace(/\D/g, "").slice(0, 8);
    });
    document.getElementById("alertasEntrada")?.addEventListener("click", abrirCorrecaoPendencia);
    document.getElementById("btnSalvarCorrecaoPendencia")?.addEventListener("click", salvarCorrecaoPendencia);
    document.querySelectorAll("[data-fechar-modal]").forEach(function(botao) {
        botao.addEventListener("click", fecharModais);
    });
    document.getElementById("modalBackdrop")?.addEventListener("click", fecharModais);
    document.addEventListener("click", fecharSeletoresColunasAoClicarFora);
    document.addEventListener("keydown", function(evento) {
        if(evento.key === "Escape") fecharSeletoresColunas();
    });
    inicializarColunasProdutos();
    inicializarCamposSecoes();
    if(!carregarEntradaSalvaPelaUrl()){
        definirDataInicial();
        atualizarTela();
    }
});

function criarNotaSimulada(){
    const produtosSistema = obterProdutosSistema();
    return {
        importada: true,
        finalizada: false,
        estoqueAtualizado: false,
        chave: "2926 0608 1234 5600 0195 5500 1000 3456 7812 3456 7890",
        numero: "345678",
        serie: "1",
        emissao: "2026-06-17",
        entrada: dataHoje(),
        fornecedor: {
            razao: "Distribuidora Brasil Alimentos Ltda",
            fantasia: "Brasil Atacado",
            cnpj: "08.123.456/0001-95",
            ie: "123456789",
            cidade: "Feira de Santana/BA",
            uf: "BA"
        },
        destinatario: {
            uf: obterEmpresaFiscalEntrada().uf
        },
        frete: 180,
        desconto: 75,
        outras: 42.5,
        produtos: [
            {
                id: "xml-001",
                codigoXml: "FOR-145",
                descricao: "CAFE TORRADO 500G CONECCTA",
                ean: "7891000001452",
                ncm: "09012100",
                cest: "",
                cfop: "1102",
                unidade: "UN",
                quantidade: 40,
                custoUnitario: 11.2,
                vendaAtual: 18.9,
                status: "vinculado",
                produtoVinculado: produtosSistema[0],
                cstIcms: "102",
                cstPis: "49",
                cstCofins: "49",
                aliquotaIcms: 7,
                ipi: 0,
                pis: 7.28,
                cofins: 33.6,
                totalTributos: 40.88
            },
            {
                id: "xml-002",
                codigoXml: "FOR-778",
                descricao: "MACARRAO ESPAGUETE 500G",
                ean: "7899000077801",
                ncm: "19021900",
                cest: "",
                cfop: "1102",
                unidade: "UN",
                quantidade: 80,
                custoUnitario: 3.15,
                vendaAtual: 0,
                status: "novo",
                produtoVinculado: null,
                cstIcms: "102",
                cstPis: "49",
                cstCofins: "49",
                aliquotaIcms: 7,
                ipi: 0,
                pis: 4.1,
                cofins: 18.9,
                totalTributos: 23
            },
            {
                id: "xml-003",
                codigoXml: "FOR-302",
                descricao: "OLEO DE SOJA 900ML",
                ean: "7891000003029",
                ncm: "15079011",
                cest: "1705600",
                cfop: "1403",
                unidade: "UN",
                quantidade: 60,
                custoUnitario: 7.25,
                vendaAtual: 8.99,
                status: "conferir",
                produtoVinculado: null,
                cstIcms: "060",
                cstPis: "49",
                cstCofins: "49",
                aliquotaIcms: 0,
                ipi: 0,
                pis: 7.08,
                cofins: 32.6,
                totalTributos: 39.68
            },
            {
                id: "xml-004",
                codigoXml: "FOR-500",
                descricao: "MOLHO DE TOMATE SACHE 300G",
                ean: "",
                ncm: "",
                cest: "",
                cfop: "1102",
                unidade: "UN",
                quantidade: 100,
                custoUnitario: 2.1,
                vendaAtual: 2,
                status: "divergencia",
                produtoVinculado: null,
                cstIcms: "102",
                cstPis: "49",
                cstCofins: "49",
                aliquotaIcms: 7,
                ipi: 0,
                pis: 3.42,
                cofins: 15.75,
                totalTributos: 19.17
            }
        ]
    };
}

function importarXmlSimulado(){
    notaEntrada = criarNotaSimulada();
    contasConfirmadas = false;
    parcelasEntrada = [];
    preencherNota();
    recalcularPrecos();
    gerarParcelas();
    selecionarTributos(notaEntrada.produtos[0].id);
    mostrarToast("XML importado com dados simulados.");
}

function importarXmlArquivo(evento){
    const arquivo = evento.target.files?.[0];

    if(!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function() {
        try{
            const xml = new DOMParser().parseFromString(String(leitor.result || ""), "text/xml");
            const erro = xml.querySelector("parsererror");

            if(erro){
                mostrarToast("XML inválido.");
                return;
            }

            notaEntrada = extrairNotaXml(xml);
            contasConfirmadas = false;
            parcelasEntrada = notaEntrada.parcelasXml.map(function(parcela) {
                return { ...parcela, status: "Aberta", origem: "XML" };
            });
            preencherNota();
            aplicarFinanceiroXml();
            recalcularPrecos();
            if(notaEntrada.produtos[0]) selecionarTributos(notaEntrada.produtos[0].id);
            mostrarToast("XML importado do computador.");
        }catch(erro){
            mostrarToast("Não foi possível ler o XML.");
        }finally{
            evento.target.value = "";
        }
    };
    leitor.readAsText(arquivo);
}

function extrairNotaXml(xml){
    const infNFe = xml.querySelector("infNFe");
    const ide = xml.querySelector("ide");
    const emit = xml.querySelector("emit");
    const enderEmit = xml.querySelector("enderEmit");
    const dest = xml.querySelector("dest");
    const enderDest = xml.querySelector("enderDest");
    const total = xml.querySelector("ICMSTot");
    const empresaFiscal = obterEmpresaFiscalEntrada();
    const produtosSistema = obterProdutosSistema();
    const produtos = Array.from(xml.querySelectorAll("det")).map(function(det, indice) {
        const prod = det.querySelector("prod");
        const imposto = det.querySelector("imposto");
        const produtoSistema = localizarProdutoSistemaXml(produtosSistema, {
            codigo: textoTag(prod, "cProd"),
            ean: primeiroTextoTag(prod, ["cEAN", "cEANTrib"]),
            descricao: textoTag(prod, "xProd")
        });
        const custoUnitario = numeroXml(primeiroTextoTag(prod, ["vUnCom", "vUnTrib"]));
        const quantidade = numeroXml(primeiroTextoTag(prod, ["qCom", "qTrib"])) || 1;

        return {
            id: `xml-${indice + 1}`,
            codigoXml: textoTag(prod, "cProd"),
            descricao: textoTag(prod, "xProd"),
            ean: normalizarEanXml(primeiroTextoTag(prod, ["cEAN", "cEANTrib"])),
            ncm: textoTag(prod, "NCM"),
            cest: textoTag(prod, "CEST"),
            cfop: textoTag(prod, "CFOP"),
            unidade: primeiroTextoTag(prod, ["uCom", "uTrib"]) || "UN",
            quantidade,
            custoUnitario,
            vendaAtual: produtoSistema?.venda || 0,
            status: produtoSistema ? "vinculado" : "conferir",
            produtoVinculado: produtoSistema || null,
            cstIcms: extrairCstIcms(imposto),
            cstPis: textoTag(imposto?.querySelector("PIS"), "CST"),
            cstCofins: textoTag(imposto?.querySelector("COFINS"), "CST"),
            cstIpi: textoTag(imposto?.querySelector("IPI"), "CST"),
            origemMercadoria: textoTag(imposto?.querySelector("ICMS"), "orig") || produtoSistema?.origemMercadoria || produtoSistema?.origem || obterConfiguracaoFiscalEntrada("fiscalOrigemMercadoriaPadrao", "0"),
            aliquotaIcms: numeroXml(textoTag(imposto?.querySelector("ICMS"), "pICMS")),
            icms: numeroXml(textoTag(imposto?.querySelector("ICMS"), "vICMS")),
            valorIcmsSt: numeroXml(primeiroTextoTag(imposto?.querySelector("ICMS"), ["vICMSST", "vST"])),
            ipi: numeroXml(textoTag(imposto?.querySelector("IPI"), "vIPI")),
            pis: numeroXml(textoTag(imposto?.querySelector("PIS"), "vPIS")),
            cofins: numeroXml(textoTag(imposto?.querySelector("COFINS"), "vCOFINS")),
            totalTributos: numeroXml(textoTag(imposto, "vTotTrib")) || numeroXml(textoTag(prod, "vTotTrib")),
            valorTotalItem: numeroXml(textoTag(prod, "vProd")),
            fornecedor: textoTag(emit, "xNome"),
            ufFornecedor: textoTag(enderEmit, "UF"),
            tipoProduto: produtoSistema?.tipoProduto || produtoSistema?.origemProduto || "REVENDA",
            margemPadrao: numeroMoeda(produtoSistema?.margemLucro ?? produtoSistema?.margem ?? "")
        };
    });
    const parcelasXml = extrairParcelasXml(xml);

    return {
        importada: true,
        finalizada: false,
        estoqueAtualizado: false,
        chave: (infNFe?.getAttribute("Id") || "").replace(/^NFe/, ""),
        numero: textoTag(ide, "nNF"),
        serie: textoTag(ide, "serie"),
        emissao: formatarDataXml(primeiroTextoTag(ide, ["dhEmi", "dEmi"])),
        entrada: dataHoje(),
        fornecedor: {
            razao: textoTag(emit, "xNome"),
            fantasia: textoTag(emit, "xFant") || textoTag(emit, "xNome"),
            cnpj: formatarCnpj(textoTag(emit, "CNPJ")),
            ie: textoTag(emit, "IE"),
            cidade: [textoTag(enderEmit, "xMun"), textoTag(enderEmit, "UF")].filter(Boolean).join("/"),
            uf: textoTag(enderEmit, "UF")
        },
        destinatario: {
            cnpj: formatarCnpj(textoTag(dest, "CNPJ")),
            razao: textoTag(dest, "xNome"),
            uf: textoTag(enderDest, "UF") || empresaFiscal.uf
        },
        empresaFiscal,
        tipoOperacaoCompra: (textoTag(enderEmit, "UF") || "") === (empresaFiscal.uf || textoTag(enderDest, "UF") || "") ? "INTERNA" : "INTERESTADUAL",
        frete: numeroXml(textoTag(total, "vFrete")),
        desconto: numeroXml(textoTag(total, "vDesc")),
        outras: numeroXml(textoTag(total, "vOutro")),
        totalProdutosXml: numeroXml(textoTag(total, "vProd")),
        totalNotaXml: numeroXml(textoTag(total, "vNF")),
        parcelasXml,
        financeiro: {
            formaDetectada: detectarFormaPagamentoXml(xml, parcelasXml),
            parcelasDetectadas: parcelasXml.length
        },
        produtos
    };
}

function preencherNota(){
    if(!notaEntrada) return;

    const totalProdutos = notaEntrada.totalProdutosXml || calcularTotalProdutos();
    const totalNota = notaEntrada.totalNotaXml || calcularTotalNota();
    definirValor("notaChave", notaEntrada.chave);
    definirValor("notaNumero", notaEntrada.numero);
    definirValor("notaSerie", notaEntrada.serie);
    definirValor("notaEmissao", notaEntrada.emissao);
    definirValor("notaEntrada", notaEntrada.entrada);
    definirValor("notaFornecedor", notaEntrada.fornecedor.razao);
    definirValor("notaCnpj", notaEntrada.fornecedor.cnpj);
    definirValor("notaValorProdutos", formatarMoeda(totalProdutos));
    definirValor("notaValorTotal", formatarMoeda(totalNota));
    definirValor("notaFrete", formatarMoeda(notaEntrada.frete));
    definirValor("notaDesconto", formatarMoeda(notaEntrada.desconto));
    definirValor("notaOutras", formatarMoeda(notaEntrada.outras));
    definirTexto("forRazao", notaEntrada.fornecedor.razao);
    definirTexto("forFantasia", notaEntrada.fornecedor.fantasia);
    definirTexto("forCnpj", notaEntrada.fornecedor.cnpj);
    definirTexto("forIe", notaEntrada.fornecedor.ie);
    definirTexto("forCidade", notaEntrada.fornecedor.cidade);
    definirValor("finValorTotal", formatarMoeda(totalNota));
    atualizarTela();
}

function aplicarFinanceiroXml(){
    if(!notaEntrada) return;

    const forma = notaEntrada.financeiro?.formaDetectada || "Não identificado";
    const parcelas = notaEntrada.financeiro?.parcelasDetectadas || 0;
    definirValor("finForma", forma);

    if(parcelas > 0){
        definirValor("finParcelas", parcelas);
        definirValor("finPrimeiroVencimento", parcelasEntrada[0]?.vencimento || adicionarDias(dataHoje(), 30));
    }else{
        definirValor("finParcelas", 1);
        definirValor("finPrimeiroVencimento", adicionarDias(dataHoje(), 30));
    }

    atualizarOrigemParcelas();
}

function inicializarColunasProdutos(){
    const salvas = lerJson("entradasNotasColunasProdutos", null);

    if(Array.isArray(salvas) && salvas.length){
        colunasProdutosVisiveis = new Set(salvas.filter(function(id) {
            return COLUNAS_PRODUTOS_NOTA.some(function(coluna) {
                return coluna.id === id;
            });
        }));
    }

    renderizarSeletorColunasProdutos();
}

function renderizarSeletorColunasProdutos(){
    const destino = document.getElementById("opcoesColunasProdutos");

    if(!destino) return;

    destino.innerHTML = `
        <div class="opcoes-colunas-topo">
            <strong>Colunas</strong>
            <button type="button" data-fechar-colunas>Fechar</button>
        </div>
    ` + COLUNAS_PRODUTOS_NOTA.map(function(coluna) {
        const fixa = ["descricao", "ncm", "quantidade", "custoFinal", "produtoSistema", "precoAtual", "precoSugerido", "cfopNfce", "status", "alertas", "acoes"].includes(coluna.id);
        return `
            <label>
                <input type="checkbox" value="${escapar(coluna.id)}" ${colunasProdutosVisiveis.has(coluna.id) ? "checked" : ""} ${fixa ? "data-coluna-fixa" : ""}>
                ${escapar(coluna.titulo)}
            </label>
        `;
    }).join("");

    destino.querySelectorAll("input[type='checkbox']").forEach(function(campo) {
        campo.addEventListener("change", function() {
            if(campo.checked){
                colunasProdutosVisiveis.add(campo.value);
            }else if(!campo.dataset.colunaFixa){
                colunasProdutosVisiveis.delete(campo.value);
            }else{
                campo.checked = true;
            }

            localStorage.setItem("entradasNotasColunasProdutos", JSON.stringify([...colunasProdutosVisiveis]));
            renderizarProdutos();
        });
    });
    destino.querySelector("[data-fechar-colunas]")?.addEventListener("click", fecharSeletoresColunas);
}

function obterColunasProdutosVisiveis(){
    const colunas = COLUNAS_PRODUTOS_NOTA.filter(function(coluna) {
        return colunasProdutosVisiveis.has(coluna.id);
    });

    return colunas.length ? colunas : COLUNAS_PRODUTOS_NOTA.filter(function(coluna) {
        return ["descricao", "ncm", "quantidade", "custoFinal", "produtoSistema", "precoAtual", "precoSugerido", "cfopNfce", "status", "alertas", "acoes"].includes(coluna.id);
    });
}

function inicializarCamposSecoes(){
    Object.keys(SECOES_AJUSTAVEIS).forEach(function(secao) {
        const config = SECOES_AJUSTAVEIS[secao];
        const salvos = lerJson(config.storage, null);
        camposSecoesVisiveis[secao] = new Set(Array.isArray(salvos) && salvos.length ? salvos : config.padrao);
        renderizarSeletorSecao(secao);
        aplicarCamposSecao(secao);
    });
}

function renderizarSeletorSecao(secao){
    const config = SECOES_AJUSTAVEIS[secao];
    const destino = document.querySelector(`[data-secao-colunas="${secao}"]`);

    if(!config || !destino) return;

    destino.innerHTML = `
        <div class="opcoes-colunas-topo">
            <strong>Campos</strong>
            <button type="button" data-fechar-colunas>Fechar</button>
        </div>
    ` + config.campos.map(function(campo) {
        const id = campo[0];
        const titulo = campo[1];
        return `
            <label>
                <input type="checkbox" value="${escapar(id)}" ${camposSecoesVisiveis[secao].has(id) ? "checked" : ""}>
                ${escapar(titulo)}
            </label>
        `;
    }).join("");

    destino.querySelectorAll("input[type='checkbox']").forEach(function(input) {
        input.addEventListener("change", function() {
            if(input.checked){
                camposSecoesVisiveis[secao].add(input.value);
            }else{
                camposSecoesVisiveis[secao].delete(input.value);
            }

            localStorage.setItem(config.storage, JSON.stringify([...camposSecoesVisiveis[secao]]));
            aplicarCamposSecao(secao);
        });
    });
    destino.querySelector("[data-fechar-colunas]")?.addEventListener("click", fecharSeletoresColunas);
}

function fecharSeletoresColunasAoClicarFora(evento){
    if(evento.target.closest(".seletor-colunas")) return;
    fecharSeletoresColunas();
}

function fecharSeletoresColunas(){
    document.querySelectorAll(".seletor-colunas[open]").forEach(function(seletor) {
        seletor.removeAttribute("open");
    });
}

function aplicarCamposSecao(secao){
    const visiveis = camposSecoesVisiveis[secao];
    const container = document.querySelector(`[data-secao="${secao}"]`);

    if(!visiveis || !container) return;

    container.querySelectorAll("[data-campo]").forEach(function(elemento) {
        elemento.classList.toggle("campo-oculto", !visiveis.has(elemento.dataset.campo));
    });
}

function renderizarProdutos(){
    const tabela = document.getElementById("tabelaProdutosNota");
    const cabecalho = document.getElementById("cabecalhoProdutosNota");
    const colunas = obterColunasProdutosVisiveis();

    if(!tabela || !cabecalho) return;
    cabecalho.innerHTML = `<tr>${colunas.map(function(coluna) {
        return `<th>${escapar(coluna.titulo)}</th>`;
    }).join("")}</tr>`;

    if(!notaEntrada || notaEntrada.produtos.length === 0){
        tabela.innerHTML = `<tr><td colspan="${colunas.length}" class="vazio">Nenhuma nota importada.</td></tr>`;
        return;
    }

    const produtosFiltrados = filtrarProdutosNota(notaEntrada.produtos);

    if(produtosFiltrados.length === 0){
        tabela.innerHTML = `<tr><td colspan="${colunas.length}" class="vazio">Nenhum produto encontrado para os filtros.</td></tr>`;
        return;
    }

    tabela.innerHTML = produtosFiltrados.map(function(item) {
        const fiscal = calcularFiscalProdutoEntrada(item);
        const sugerido = fiscal.precoSugerido;
        const statusConferencia = produtoConferido(item) ? "Conferido" : "Pendente";
        const classeConferencia = produtoConferido(item) ? "status-vinculado" : "status-pendente";
        const precoEditavel = Boolean(item.produtoVinculado) && item.status !== "ignorado";
        return `<tr data-id="${escapar(item.id)}">${colunas.map(function(coluna) {
            return renderizarCelulaProduto(coluna.id, item, fiscal, {
                sugerido,
                statusConferencia,
                classeConferencia,
                precoEditavel
            });
        }).join("")}</tr>`;
    }).join("");

    tabela.querySelectorAll(".campo-preco-venda").forEach(function(input) {
        if(typeof mascaraMoedaInput === "function") mascaraMoedaInput(input);
    });
}

function renderizarCelulaProduto(coluna, item, fiscal, contexto){
    const celulas = {
        codigoXml: `<td><strong>${escapar(item.codigoXml)}</strong></td>`,
        descricao: `<td class="produto-nome">${escapar(item.descricao)}</td>`,
        ean: `<td>${escapar(item.ean || "-")}</td>`,
        ncm: `<td>${escapar(item.ncm || "-")}</td>`,
        cest: `<td>${escapar(item.cest || "-")}</td>`,
        cfopEntrada: `<td>${escapar(item.cfop || "-")}</td>`,
        quantidade: `<td><input type="text" class="campo-quantidade-estoque" data-quantidade-produto value="${formatarDecimal(item.quantidade || 0)}" title="Quantidade que será lançada no estoque"></td>`,
        custoXml: `<td>${formatarMoeda(item.custoUnitario)}</td>`,
        impostos: `<td>${formatarMoeda(fiscal.impostosUnitarios)}</td>`,
        frete: `<td>${formatarMoeda(fiscal.freteRateadoUnitario)}</td>`,
        desconto: `<td>${formatarMoeda(fiscal.descontoRateadoUnitario)}</td>`,
        custoFinal: `<td><strong>${formatarMoeda(fiscal.custoFinal)}</strong></td>`,
        produtoSistema: `<td class="produto-vinculado">${item.produtoVinculado ? escapar(item.produtoVinculado.descricao) : "Sem vínculo"}</td>`,
        precoAtual: `<td><div class="campo-venda-box"><span>R$</span><input type="text" class="campo-preco-venda" data-preco-venda value="${formatarDecimal(item.vendaAtual || 0)}" ${contexto.precoEditavel ? "" : "disabled"} title="${contexto.precoEditavel ? "Editar preço de venda" : "Vincule ou cadastre o produto antes de editar"}"></div></td>`,
        precoSugerido: `<td><strong>${formatarMoeda(contexto.sugerido)}</strong></td>`,
        cfopNfeInterna: `<td><strong>${escapar(fiscal.cfopNfeInterna || "-")}</strong></td>`,
        cfopNfeInterestadual: `<td><strong>${escapar(fiscal.cfopNfeInterestadual || "-")}</strong></td>`,
        cfopNfce: `<td><strong>${escapar(fiscal.cfopNfce || "-")}</strong></td>`,
        status: `<td><span class="status-badge ${fiscal.alertas.length ? "status-pendente" : "status-vinculado"}">${fiscal.statusFiscal}</span><span class="status-badge ${contexto.classeConferencia}">${contexto.statusConferencia}</span><span class="status-badge status-${classeStatus(item.status)}">${rotuloStatus(item.status)}</span>${fiscal.classificacaoFiscal ? `<span class="status-badge status-vinculado">${escapar(fiscal.classificacaoFiscal)}</span>` : ""}</td>`,
        alertas: `<td class="alertas-produto">${renderizarAlertasProduto(fiscal.alertas)}</td>`,
        acoes: `<td><div class="acoes-produto"><select class="select-acao-produto" data-acao-produto><option value="">Selecionar ação</option><option value="vincular">Vincular produto</option><option value="novo">Cadastrar produto</option><option value="custo">Editar custo</option><option value="ignorar">Ignorar item</option><option value="confirmar">Confirmar conferência</option></select></div></td>`
    };

    return celulas[coluna] || "<td>-</td>";
}

function tratarAlteracaoProduto(evento){
    if(evento.target.matches("[data-acao-produto]")){
        executarAcaoProdutoNota(evento);
        return;
    }

    if(evento.target.matches("[data-quantidade-produto]")){
        alterarQuantidadeProdutoNota(evento);
        return;
    }

    if(!evento.target.matches("[data-preco-venda]")) return;

    const linha = evento.target.closest("tr[data-id]");
    const produto = obterProdutoNota(linha?.dataset.id);

    if(!produto) return;

    const venda = numeroMoeda(evento.target.value);
    produto.vendaAtual = venda;
    evento.target.value = formatarDecimal(venda);
    if(produto.produtoVinculado){
        produto.produtoVinculado.venda = venda;
        produto.produtoVinculado.precoVenda = venda;
        atualizarProdutoSistema(produto.produtoVinculado);
    }
    atualizarTela();
}

function alterarQuantidadeProdutoNota(evento){
    const linha = evento.target.closest("tr[data-id]");
    const produto = obterProdutoNota(linha?.dataset.id);

    if(!produto) return;

    const quantidade = numeroMoeda(evento.target.value);

    if(quantidade <= 0){
        mostrarToast("Informe uma quantidade maior que zero.");
        evento.target.value = formatarDecimal(produto.quantidade || 0);
        return;
    }

    produto.quantidade = quantidade;
    evento.target.value = formatarDecimal(quantidade);
    preencherNota();
    recalcularPrecos();
}

function executarAcaoProdutoNota(evento){
    const select = evento.target;
    const linha = select.closest("tr[data-id]");
    const produto = obterProdutoNota(linha?.dataset.id);
    const acao = select.value;

    if(!produto || !acao) return;

    produtoAtualId = produto.id;
    select.value = "";

    if(acao === "vincular"){
        abrirModalVincular();
        return;
    }

    if(acao === "novo"){
        abrirModalCadastrarProduto(produto);
        return;
    }

    if(acao === "custo"){
        editarCustoProduto(produto);
        return;
    }

    if(acao === "ignorar"){
        produto.status = "ignorado";
        produto.produtoVinculado = null;
        atualizarTela();
        return;
    }

    if(acao === "confirmar"){
        confirmarProdutoNota(produto);
    }
}

function abrirModalVincular(){
    produtoSistemaSelecionadoId = null;
    definirValor("buscaProdutoSistema", "");
    renderizarProdutosSistema();
    abrirModal("modalVincular");
}

function renderizarProdutosSistema(){
    const destino = document.getElementById("listaProdutosSistema");
    const termo = normalizar(document.getElementById("buscaProdutoSistema")?.value || "");
    const produtosSistema = obterProdutosSistema();
    const encontrados = produtosSistema.filter(function(produto) {
        return normalizar([produto.codigo, produto.descricao, produto.ean, produto.ncm].join(" ")).includes(termo);
    });

    if(!destino) return;

    destino.innerHTML = encontrados.map(function(produto) {
        return `
            <label class="produto-opcao ${produto.id === produtoSistemaSelecionadoId ? "ativo" : ""}" data-produto-id="${escapar(produto.id)}">
                <input type="radio" name="produtoSistema" ${produto.id === produtoSistemaSelecionadoId ? "checked" : ""}>
                <span>
                    <strong>${escapar(produto.descricao)}</strong>
                    <span>${escapar(produto.codigo)} | ${escapar(produto.ean || "Sem EAN")} | NCM ${escapar(produto.ncm || "-")}</span>
                </span>
                <strong>${formatarMoeda(produto.venda)}</strong>
            </label>
        `;
    }).join("") || `<div class="alerta">Nenhum produto cadastrado encontrado.</div>`;
}

function selecionarProdutoSistema(evento){
    const opcao = evento.target.closest("[data-produto-id]");

    if(!opcao) return;

    produtoSistemaSelecionadoId = opcao.dataset.produtoId;
    renderizarProdutosSistema();
}

function filtrarProdutosNota(produtos){
    const termo = normalizar(document.getElementById("filtroProdutoNota")?.value || "");

    return produtos.filter(function(item) {
        const texto = normalizar([
            item.codigoXml,
            item.descricao,
            item.ean,
            item.ncm,
            item.cest,
            item.cfop,
            item.produtoVinculado?.descricao
        ].join(" "));

        return !termo || texto.includes(termo);
    });
}

function produtoConferido(item){
    if(item.status === "ignorado") return true;
    return Boolean(item.produtoVinculado) && item.custoUnitario > 0 && numeroMoeda(item.vendaAtual) > 0 && Boolean(item.ncm);
}

function sugerirCFOPVenda({
    ufEmpresa,
    ufCliente,
    tipoProduto,
    possuiST,
    modeloDocumento
}) {
    const mesmaUF = String(ufEmpresa || "").toUpperCase() === String(ufCliente || "").toUpperCase();
    const fabricacaoPropria = tipoProduto === "FABRICACAO_PROPRIA";

    if(modeloDocumento === "NFC-e") {
        if(possuiST) return "5405";
        if(fabricacaoPropria) return "5101";
        return "5102";
    }

    if(modeloDocumento === "NF-e") {
        if(mesmaUF) {
            if(possuiST) return "5405";
            if(fabricacaoPropria) return "5101";
            return "5102";
        }

        if(possuiST) return "6404";
        if(fabricacaoPropria) return "6101";
        return "6102";
    }

    return "";
}

window.sugerirCFOPVenda = sugerirCFOPVenda;

function calcularFiscalProdutoEntrada(item){
    const empresa = notaEntrada?.empresaFiscal || obterEmpresaFiscalEntrada();
    const ufEmpresa = (empresa.uf || "").toUpperCase();
    const ufFornecedor = (notaEntrada?.fornecedor?.uf || "").toUpperCase();
    const valorItem = numeroMoeda(item.valorTotalItem) || item.custoUnitario * item.quantidade;
    const totalProdutos = notaEntrada?.totalProdutosXml || calcularTotalProdutos() || valorItem || 1;
    const proporcao = valorItem / totalProdutos;
    const quantidade = item.quantidade || 1;
    const freteItem = numeroMoeda(notaEntrada?.frete) * proporcao;
    const despesasItem = numeroMoeda(notaEntrada?.outras) * proporcao;
    const descontoItem = numeroMoeda(notaEntrada?.desconto) * proporcao;
    const impostosItem = calcularImpostosComposicaoCusto(item, empresa);
    const impostosUnitarios = impostosItem / quantidade;
    const freteRateadoUnitario = freteItem / quantidade;
    const despesasRateadasUnitario = despesasItem / quantidade;
    const descontoRateadoUnitario = descontoItem / quantidade;
    const custoFinal = item.custoUnitario + impostosUnitarios + freteRateadoUnitario + despesasRateadasUnitario - descontoRateadoUnitario;
    const possuiST = produtoPossuiST(item);
    const tipoProduto = normalizarTipoProdutoFiscal(item.tipoProduto || item.produtoVinculado?.tipoProduto || item.produtoVinculado?.origemProduto);
    const sugestaoVenda = window.RegrasFiscaisSistema?.sugerirVendaXml?.(item, {
        regime: empresa.regimeTributario,
        ufEmpresa,
        ufFornecedor,
        tipoProduto,
        tipoOperacao: "compra_para_revenda",
        finalidadeVenda: "consumidor_final"
    }) || {};
    const margem = obterMargemProduto(item);
    const precoSugerido = margem >= 100 ? custoFinal : custoFinal / (1 - margem / 100);
    const cfopNfeInterna = sugestaoVenda.cfopVendaEstadual || sugerirCFOPVenda({ ufEmpresa, ufCliente: ufEmpresa, tipoProduto, possuiST, modeloDocumento: "NF-e" });
    const cfopNfeInterestadual = sugestaoVenda.cfopVendaInterestadual || sugerirCFOPVenda({ ufEmpresa, ufCliente: ufFornecedor && ufFornecedor !== ufEmpresa ? ufFornecedor : "EX", tipoProduto, possuiST, modeloDocumento: "NF-e" });
    const cfopNfce = sugestaoVenda.cfopNfce || sugestaoVenda.cfopConsumidorFinal || sugerirCFOPVenda({ ufEmpresa, ufCliente: ufEmpresa, tipoProduto, possuiST, modeloDocumento: "NFC-e" });
    const alertas = gerarAlertasFiscaisProduto(item, {
        custoFinal,
        precoSugerido,
        cfopNfeInterna,
        cfopNfeInterestadual,
        cfopNfce,
        possuiST,
        impostosItem,
        valorItem,
        ufEmpresa,
        ufFornecedor
    });

    return {
        ufEmpresa,
        ufFornecedor,
        tipoOperacaoCompra: ufEmpresa && ufFornecedor && ufEmpresa === ufFornecedor ? "INTERNA" : "INTERESTADUAL",
        impostosItem,
        impostosUnitarios,
        freteRateadoUnitario,
        despesasRateadasUnitario,
        descontoRateadoUnitario,
        custoFinal,
        margem,
        precoSugerido,
        cfopNfeInterna,
        cfopNfeInterestadual,
        cfopNfce,
        sugestaoVenda,
        classificacaoFiscal: sugestaoVenda.classificacaoFiscal || "",
        conferenciaObrigatoria: sugestaoVenda.conferenciaObrigatoria === true,
        csosnSugerido: sugestaoVenda.csosn || "",
        cstIcmsSugerido: sugestaoVenda.cstIcms || "",
        cstPisSugerido: sugestaoVenda.cstPis || "",
        cstCofinsSugerido: sugestaoVenda.cstCofins || "",
        cstIpiSugerido: sugestaoVenda.cstIpi || "",
        alertas,
        statusFiscal: alertas.length ? "Revisar" : "OK"
    };
}

function calcularImpostosComposicaoCusto(item, empresa){
    const icms = numeroMoeda(item.icms) || (item.custoUnitario * item.quantidade) * (numeroMoeda(item.aliquotaIcms) / 100);
    const impostos = icms + numeroMoeda(item.ipi) + numeroMoeda(item.pis) + numeroMoeda(item.cofins);
    const regime = normalizar(empresa.regimeTributario);

    if(["mei", "simples", "simplesnacional", "meiemissaofiscal"].includes(regime)){
        return impostos;
    }

    return numeroMoeda(item.ipi);
}

function gerarAlertasFiscaisProduto(item, fiscal){
    const alertas = [];
    const vendaAtual = numeroMoeda(item.vendaAtual);

    if(!item.ncm) alertas.push("Produto sem NCM");
    if(fiscal.possuiST && !item.cest) alertas.push("Produto sem CEST quando necessário");
    if(!fiscal.cfopNfeInterna || !fiscal.cfopNfeInterestadual || !fiscal.cfopNfce) alertas.push("CFOP de venda não definido");
    if(fiscal.conferenciaObrigatoria) alertas.push("Conferência fiscal obrigatória");
    if(fiscal.cfopNfeInterestadual?.startsWith("5")) alertas.push("Venda para outro estado usando CFOP 5xxx");
    if(fiscal.cfopNfeInterna?.startsWith("6")) alertas.push("Venda interna usando CFOP 6xxx");
    if(fiscal.cfopNfce?.startsWith("6")) alertas.push("NFC-e com CFOP interestadual");
    if(vendaAtual > 0 && fiscal.custoFinal > vendaAtual) alertas.push("Custo maior que preço de venda atual");
    if(vendaAtual > 0 && ((vendaAtual - fiscal.custoFinal) / fiscal.custoFinal) < 0) alertas.push("Margem negativa");
    if(fiscal.valorItem > 0 && fiscal.impostosItem / fiscal.valorItem > 0.25) alertas.push("Imposto alto no item");

    return alertas;
}

function renderizarAlertasProduto(alertas){
    if(!alertas.length) return `<span class="alerta-mini ok">Sem alertas</span>`;
    return alertas.map(function(alerta) {
        return `<span class="alerta-mini">${escapar(alerta)}</span>`;
    }).join("");
}

function confirmarProdutoNota(produto){
    if(!produto.produtoVinculado){
        mostrarToast("Vincule ou cadastre o produto antes de confirmar.");
        return;
    }

    if(produto.vendaAtual <= 0){
        mostrarToast("Informe o preço de venda antes de confirmar.");
        return;
    }

    if(!produto.ncm){
        mostrarToast("Informe ou corrija o NCM antes de confirmar.");
        return;
    }

    if(produto.custoUnitario <= 0){
        mostrarToast("Confira o custo antes de confirmar.");
        return;
    }

    produto.status = produto.status === "novo" ? "novo" : "vinculado";
    atualizarTela();
    mostrarToast("Produto conferido.");
}

function confirmarVinculoProduto(){
    const produtoNota = obterProdutoNota(produtoAtualId);
    const produtosSistema = obterProdutosSistema();
    const produtoSistema = produtosSistema.find(function(produto) {
        return produto.id === produtoSistemaSelecionadoId;
    });

    if(!produtoNota || !produtoSistema){
        mostrarToast("Selecione um produto para confirmar o vínculo.");
        return;
    }

    produtoNota.produtoVinculado = produtoSistema;
    produtoNota.vendaAtual = produtoSistema.venda;
    produtoNota.ncm = produtoNota.ncm || produtoSistema.ncm;
    produtoNota.cest = produtoNota.cest || produtoSistema.cest;
    produtoNota.status = "vinculado";
    aplicarSugestaoFiscalAoProdutoVinculado(produtoNota);
    fecharModais();
    atualizarTela();
    mostrarToast("Produto vinculado.");
}

function abrirModalCadastrarProduto(produto){
    definirValor("novoDescricao", produto.descricao);
    definirValor("novoEan", produto.ean);
    definirValor("novoNcm", produto.ncm);
    definirValor("novoCest", produto.cest);
    definirValor("novoUnidade", produto.unidade || "UN");
    definirValor("novoGrupo", "Mercadorias");
    definirValor("novoSubgrupo", "Compra");
    definirValor("novoCusto", formatarMoeda(produto.custoUnitario));
    definirValor("novoVenda", formatarMoeda(calcularPrecoSugeridoItem(produto)));
    definirValor("novoMargem", `${obterMargem()}%`);
    definirValor("novoTributacao", produtoPossuiST(produto) ? "Produto substituição tributária" : "Simples Nacional - Revenda");
    abrirModal("modalCadastrarProduto");
}

function salvarNovoProduto(){
    const produtoNota = obterProdutoNota(produtoAtualId);

    if(!produtoNota) return;

    const tributacao = document.getElementById("novoTributacao")?.value || "";
    const regraFiscalST = regraFiscalPorTributacaoProduto(tributacao, produtoNota);
    const fiscal = calcularFiscalProdutoEntrada(produtoNota);
    const novo = {
        id: `prd-${Date.now()}`,
        codigo: gerarCodigoProdutoSistema(),
        descricao: document.getElementById("novoDescricao")?.value || produtoNota.descricao,
        ean: document.getElementById("novoEan")?.value || produtoNota.ean,
        ncm: document.getElementById("novoNcm")?.value || produtoNota.ncm,
        cest: document.getElementById("novoCest")?.value || produtoNota.cest,
        unidade: document.getElementById("novoUnidade")?.value || produtoNota.unidade || "UN",
        venda: numeroMoeda(document.getElementById("novoVenda")?.value) || calcularPrecoSugeridoItem(produtoNota),
        precoVenda: numeroMoeda(document.getElementById("novoVenda")?.value) || calcularPrecoSugeridoItem(produtoNota),
        precoCusto: numeroMoeda(document.getElementById("novoCusto")?.value) || produtoNota.custoUnitario,
        grupo: document.getElementById("novoGrupo")?.value || "Mercadorias",
        subgrupo: document.getElementById("novoSubgrupo")?.value || "Compra",
        tributacaoPadrao: tributacao,
        origemMercadoria: produtoNota.origemMercadoria || obterConfiguracaoFiscalEntrada("fiscalOrigemMercadoriaPadrao", "0"),
        cst: produtoNota.csosn || produtoNota.cstIcmsVenda || fiscal.csosnSugerido || fiscal.cstIcmsSugerido || produtoNota.cstIcms || produtoNota.cst || obterConfiguracaoFiscalEntrada("fiscalCsosnPadrao", "102"),
        cstIcms: produtoNota.cstIcmsVenda || fiscal.cstIcmsSugerido || "",
        csosn: produtoNota.csosn || fiscal.csosnSugerido || "",
        cstPis: produtoNota.cstPisVenda || fiscal.cstPisSugerido || produtoNota.cstPis || obterConfiguracaoFiscalEntrada("fiscalCstPisPadrao", "49"),
        cstCofins: produtoNota.cstCofinsVenda || fiscal.cstCofinsSugerido || produtoNota.cstCofins || obterConfiguracaoFiscalEntrada("fiscalCstCofinsPadrao", "49"),
        cstIpi: produtoNota.cstIpiVenda || fiscal.cstIpiSugerido || produtoNota.cstIpi || obterConfiguracaoFiscalEntrada("fiscalCstIpiPadrao", "99"),
        classificacaoFiscal: produtoNota.classificacaoFiscal || fiscal.classificacaoFiscal || "",
        regraFiscalST
    };

    salvarProdutoSistema(novo);
    produtoNota.produtoVinculado = novo;
    produtoNota.vendaAtual = novo.venda;
    produtoNota.ncm = novo.ncm;
    produtoNota.cest = novo.cest;
    produtoNota.regraFiscalST = regraFiscalST;
    produtoNota.status = "novo";
    aplicarSugestaoFiscalAoProdutoVinculado(produtoNota);
    fecharModais();
    atualizarTela();
    mostrarToast("Produto novo cadastrado e vinculado.");
}

async function carregarCatalogoNcmEntrada(){
    if(catalogoNcmEntradaCarregado) return catalogoNcmEntrada;
    if(carregandoCatalogoNcmEntrada) return carregandoCatalogoNcmEntrada;

    carregandoCatalogoNcmEntrada = fetch("api/base/ncm.json")
        .then(function(resposta) {
            if(!resposta.ok) throw new Error("NCM indisponivel");
            return resposta.json();
        })
        .then(function(dados) {
            const lista = Array.isArray(dados?.Nomenclaturas) ? dados.Nomenclaturas : [];
            catalogoNcmEntrada = lista
                .map(function(item) {
                    return {
                        codigo: String(item.Codigo || "").replace(/\D/g, ""),
                        descricao: limparHtmlTextoEntrada(item.Descricao || ""),
                        dataFim: item.Data_Fim || ""
                    };
                })
                .filter(function(item) {
                    return item.codigo.length === 8 && (!item.dataFim || item.dataFim === "31/12/9999");
                });
            catalogoNcmEntradaCarregado = true;
            return catalogoNcmEntrada;
        })
        .catch(function() {
            catalogoNcmEntrada = [];
            catalogoNcmEntradaCarregado = true;
            return catalogoNcmEntrada;
        });

    return carregandoCatalogoNcmEntrada;
}

function criarModalNcmEntrada(){
    let modal = document.getElementById("modalPesquisaNcmEntrada");
    if(modal) return modal;

    modal = document.createElement("section");
    modal.id = "modalPesquisaNcmEntrada";
    modal.className = "modal modal-amplo modal-ncm-entrada";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
        <header>
            <h2>Pesquisar NCM</h2>
            <button type="button" data-fechar-ncm-entrada>&times;</button>
        </header>
        <div class="modal-corpo">
            <div class="campo-pesquisa-ncm">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="search" id="buscaNcmEntrada" placeholder="Digite o número ou descrição do NCM">
            </div>
            <div class="status-ncm-entrada" id="statusNcmEntrada">Digite pelo menos 2 caracteres para pesquisar.</div>
            <div class="lista-ncm-entrada" id="listaNcmEntrada"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-fechar-ncm-entrada]").forEach(function(botao) {
        botao.addEventListener("click", fecharPesquisaNcmEntrada);
    });
    modal.querySelector("#buscaNcmEntrada")?.addEventListener("input", renderizarPesquisaNcmEntrada);

    return modal;
}

async function abrirPesquisaNcmEntrada(campoId){
    campoNcmEntradaAtivo = campoId || "novoNcm";
    const modal = criarModalNcmEntrada();
    const busca = modal.querySelector("#buscaNcmEntrada");
    const status = modal.querySelector("#statusNcmEntrada");
    const lista = modal.querySelector("#listaNcmEntrada");
    const campo = document.getElementById(campoNcmEntradaAtivo);

    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    if(busca) busca.value = campo?.value || "";
    if(status) status.textContent = "Carregando tabela NCM...";
    if(lista) lista.innerHTML = "";
    busca?.focus();

    await carregarCatalogoNcmEntrada();
    renderizarPesquisaNcmEntrada();
}

function fecharPesquisaNcmEntrada(){
    const modal = document.getElementById("modalPesquisaNcmEntrada");
    if(!modal) return;
    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
}

function renderizarPesquisaNcmEntrada(){
    const termo = document.getElementById("buscaNcmEntrada")?.value || "";
    const lista = document.getElementById("listaNcmEntrada");
    const status = document.getElementById("statusNcmEntrada");

    if(!lista || !status) return;

    if(!catalogoNcmEntradaCarregado){
        status.textContent = "Carregando tabela NCM...";
        lista.innerHTML = "";
        return;
    }

    if(catalogoNcmEntrada.length === 0){
        status.textContent = "Tabela NCM indisponível.";
        lista.innerHTML = "";
        return;
    }

    const texto = normalizarBuscaNcmEntrada(termo);
    const numeros = termo.replace(/\D/g, "");

    if(texto.length < 2 && numeros.length < 2){
        status.textContent = "Digite pelo menos 2 caracteres para pesquisar.";
        lista.innerHTML = "";
        return;
    }

    const encontrados = catalogoNcmEntrada.filter(function(item) {
        return item.codigo.includes(numeros) || normalizarBuscaNcmEntrada(item.descricao).includes(texto);
    }).slice(0, 80);

    status.textContent = encontrados.length ? `${encontrados.length} resultado(s) encontrado(s).` : "Nenhum NCM encontrado.";
    lista.innerHTML = encontrados.map(function(item) {
        return `
            <button type="button" class="item-ncm-entrada" data-ncm="${escapar(item.codigo)}">
                <strong>${escapar(formatarCodigoNcmEntrada(item.codigo))}</strong>
                <span>${escapar(item.descricao)}</span>
            </button>
        `;
    }).join("");

    lista.querySelectorAll("[data-ncm]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            selecionarNcmEntrada(botao.dataset.ncm);
        });
    });
}

function selecionarNcmEntrada(codigo){
    const campo = document.getElementById(campoNcmEntradaAtivo || "novoNcm");
    if(campo){
        campo.value = String(codigo || "").replace(/\D/g, "").slice(0, 8);
        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.focus();
    }
    fecharPesquisaNcmEntrada();
}

function formatarCodigoNcmEntrada(codigo){
    const numeros = String(codigo || "").replace(/\D/g, "").padEnd(8, " ");
    return `${numeros.slice(0, 4)}.${numeros.slice(4, 6)}.${numeros.slice(6, 8)}`.trim();
}

function normalizarBuscaNcmEntrada(valor){
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/<[^>]*>/g, "")
        .toLowerCase()
        .trim();
}

function limparHtmlTextoEntrada(valor){
    const temporario = document.createElement("div");
    temporario.innerHTML = String(valor || "");
    return temporario.textContent.replace(/\s+/g, " ").trim();
}

function editarCustoProduto(produto){
    const valor = prompt("Informe o novo custo unitário:", formatarDecimal(produto.custoUnitario));
    const custo = numeroMoeda(valor);

    if(!valor) return;
    if(custo <= 0){
        mostrarToast("Custo inválido.");
        return;
    }

    produto.custoUnitario = custo;
    preencherNota();
    recalcularPrecos();
}

function regraFiscalPorTributacaoProduto(tributacao, produto){
    if(tributacao === "Produto substituição tributária" || produtoPossuiST(produto)){
        return "5405_6404";
    }

    return "";
}

function alterarPrecoVenda(produto){
    const valor = prompt("Informe o novo preço de venda:", produto.vendaAtual ? formatarDecimal(produto.vendaAtual) : formatarDecimal(calcularPrecoSugeridoItem(produto)));
    const venda = numeroMoeda(valor);

    if(!valor) return;
    if(venda <= 0){
        mostrarToast("Preço de venda inválido.");
        return;
    }

    produto.vendaAtual = venda;
    if(produto.produtoVinculado) produto.produtoVinculado.venda = venda;
    atualizarTela();
}

function recalcularPrecos(){
    if(!notaEntrada){
        limparPrecos();
        return;
    }

    const produtosAtivos = obterProdutosAtivos();
    const custoNota = produtosAtivos.reduce(function(total, item) {
        return total + item.custoUnitario * item.quantidade;
    }, 0);
    const quantidade = produtosAtivos.reduce(function(total, item) {
        return total + item.quantidade;
    }, 0) || 1;
    const freteRateado = notaEntrada.frete / quantidade;
    const despesasRateadas = notaEntrada.outras / quantidade;
    const custoMedio = custoNota / quantidade;
    const custoFinal = custoMedio + freteRateado + despesasRateadas;
    const sugerido = custoFinal * (1 + obterMargem() / 100);

    definirValor("precoCustoNota", formatarMoeda(custoMedio));
    definirValor("precoFreteRateado", formatarMoeda(freteRateado));
    definirValor("precoDespesasRateadas", formatarMoeda(despesasRateadas));
    definirValor("precoCustoFinal", formatarMoeda(custoFinal));
    definirValor("precoSugerido", formatarMoeda(sugerido));
    renderizarProdutos();
    atualizarResumo();
    atualizarChecklist();
    renderizarAlertas();
}

function selecionarTributos(id){
    const produto = obterProdutoNota(id);

    if(!produto) return;

    const base = produto.custoUnitario * produto.quantidade;
    const fiscal = calcularFiscalProdutoEntrada(produto);
    const cstVenda = produto.csosn || produto.cstIcmsVenda || fiscal.csosnSugerido || fiscal.cstIcmsSugerido || produto.cstIcms || "";

    definirValor("tribCfop", produto.cfopNfce || produto.cfopVendaEstadual || fiscal.cfopNfce || fiscal.cfopNfeInterna || produto.cfop || "");
    definirValor("tribCstIcms", cstVenda);
    definirValor("tribCstPis", produto.cstPisVenda || fiscal.cstPisSugerido || produto.cstPis || "");
    definirValor("tribCstCofins", produto.cstCofinsVenda || fiscal.cstCofinsSugerido || produto.cstCofins || "");
    definirValor("tribCstIpi", produto.cstIpiVenda || fiscal.cstIpiSugerido || produto.cstIpi || produto.produtoVinculado?.cstIpi || obterConfiguracaoFiscalEntrada("fiscalCstIpiPadrao", "99"));
    definirValor("tribOrigem", produto.origemMercadoria || produto.produtoVinculado?.origemMercadoria || produto.produtoVinculado?.origem || obterConfiguracaoFiscalEntrada("fiscalOrigemMercadoriaPadrao", "0"));
    definirValor("tribNcm", produto.ncm || "");
    definirValor("tribCest", produto.cest || "");
    definirValor("tribAliquota", `${formatarDecimal(produto.aliquotaIcms || 0)}%`);
    definirValor("tribBase", formatarMoeda(base));
    definirValor("tribIcms", formatarMoeda(base * (produto.aliquotaIcms || 0) / 100));
    definirValor("tribIpi", formatarMoeda(produto.ipi || 0));
    definirValor("tribPis", formatarMoeda(produto.pis || 0));
    definirValor("tribCofins", formatarMoeda(produto.cofins || 0));

    // Atualiza indicador de produto selecionado
    const nome = produto.descricao || "Produto";
    const classeHint = "conf-hint produto-ativo";
    const htmlHint = `<i class="fa-solid fa-circle-dot"></i> ${escapar(nome)}`;
    const hTrib = document.getElementById("confHintTributos");
    if(hTrib){ hTrib.className = classeHint; hTrib.innerHTML = htmlHint; }
    const hPrec = document.getElementById("confHintPrecos");
    if(hPrec){ hPrec.className = classeHint; hPrec.innerHTML = htmlHint; }
}

function atualizarPrecoProduto(id){
    const produto = obterProdutoNota(id);
    if(!produto) return;

    const fiscal = calcularFiscalProdutoEntrada(produto);

    definirValor("precoCustoNota",       formatarMoeda(produto.custoUnitario || 0));
    definirValor("precoFreteRateado",    formatarMoeda(fiscal.freteRateadoUnitario || 0));
    definirValor("precoDespesasRateadas",formatarMoeda(fiscal.despesasRateadasUnitario || 0));
    definirValor("precoCustoFinal",      formatarMoeda(fiscal.custoFinal || 0));
    definirValor("precoSugerido",        formatarMoeda(fiscal.precoSugerido || 0));
}

var _detalheProdutoId = null;

function abrirDetalheProduto(id){
    const produto = obterProdutoNota(id);
    if(!produto) return;
    _detalheProdutoId = id;

    const fiscal   = calcularFiscalProdutoEntrada(produto);
    const base     = (produto.custoUnitario || 0) * (produto.quantidade || 1);
    const cstVenda = produto.csosn || produto.cstIcmsVenda || fiscal.csosnSugerido || fiscal.cstIcmsSugerido || produto.cstIcms || "";

    // Cabeçalho
    const titulo = document.getElementById("mdProdutoTitulo");
    if(titulo) titulo.textContent = produto.descricao || "Produto";
    definirTexto("mdProdutoNcm", "NCM " + (produto.ncm || "—"));
    const statusEl = document.getElementById("mdProdutoStatus");
    if(statusEl){
        const vinculado = !!(produto.produtoVinculadoId || produto.produtoVinculado);
        statusEl.textContent = vinculado ? "Vinculado" : "Sem vínculo";
        statusEl.style.background = vinculado ? "#dcfce7" : "#fef3c7";
        statusEl.style.color      = vinculado ? "#166534" : "#92400e";
        statusEl.style.borderColor= vinculado ? "#bbf7d0" : "#fde68a";
    }

    // Tributos
    definirValor("mdTribCfop",      produto.cfopNfce || produto.cfopVendaEstadual || fiscal.cfopNfce || fiscal.cfopNfeInterna || produto.cfop || "");
    definirValor("mdTribNcm",       produto.ncm || "");
    definirValor("mdTribCest",      produto.cest || "");
    definirValor("mdTribAliquota",  formatarDecimal(produto.aliquotaIcms || 0) + "%");
    definirValor("mdTribBase",      formatarMoeda(base));
    definirValor("mdTribIcms",      formatarMoeda(base * (produto.aliquotaIcms || 0) / 100));
    definirValor("mdTribIpi",       formatarMoeda(produto.ipi || 0));
    definirValor("mdTribPis",       formatarMoeda(produto.pis || 0));
    definirValor("mdTribCofins",    formatarMoeda(produto.cofins || 0));
    definirValor("mdTribCstIcms",   cstVenda);
    definirValor("mdTribCstPis",    produto.cstPisVenda  || fiscal.cstPisSugerido    || produto.cstPis    || "");
    definirValor("mdTribCstCofins", produto.cstCofinsVenda || fiscal.cstCofinsSugerido || produto.cstCofins || "");
    definirValor("mdTribCstIpi",    produto.cstIpiVenda  || fiscal.cstIpiSugerido    || produto.cstIpi    || "");
    definirValor("mdTribOrigem",    produto.origemMercadoria || (produto.produtoVinculado && produto.produtoVinculado.origemMercadoria) || "");

    // Preços
    definirValor("mdPrecoCusto",       formatarMoeda(produto.custoUnitario || 0));
    definirValor("mdPrecoFrete",       formatarMoeda(fiscal.freteRateadoUnitario || 0));
    definirValor("mdPrecoDespesas",    formatarMoeda(fiscal.despesasRateadasUnitario || 0));
    definirValor("mdPrecoCustoFinal",  formatarMoeda(fiscal.custoFinal || 0));
    const margemEl = document.getElementById("mdPrecoMargem");
    if(margemEl) margemEl.value = produto.margemPadrao != null ? produto.margemPadrao : (fiscal.margemSugerida || "");
    definirValor("mdPrecoSugerido",    formatarMoeda(fiscal.precoSugerido || 0));
    definirValor("mdPrecoVenda",       formatarMoeda(produto.vendaAtual || (produto.produtoVinculado && produto.produtoVinculado.precoVenda) || 0));

    abrirModal("modalDetalheProduto");
}

function salvarDetalheProduto(){
    if(!_detalheProdutoId) return;
    const produto = obterProdutoNota(_detalheProdutoId);
    if(!produto) return;

    const margem = parseFloat(document.getElementById("mdPrecoMargem")?.value || "") || null;
    if(margem != null) produto.margemPadrao = margem;

    const vendaStr = (document.getElementById("mdPrecoVenda")?.value || "").trim();
    if(vendaStr){
        const venda = numeroMoeda(vendaStr);
        if(venda > 0){
            produto.vendaAtual = venda;
            if(produto.produtoVinculado){
                produto.produtoVinculado.precoVenda = venda;
            }
        }
    }

    fecharModais();
    _detalheProdutoId = null;
    atualizarTela();
    mostrarToast("Dados do produto salvos.");
}

function gerarParcelas(){
    if(!notaEntrada){
        mostrarToast("Importe uma nota antes de gerar parcelas.");
        return;
    }

    if(document.getElementById("finGerar")?.value === "nao"){
        parcelasEntrada = [];
        contasConfirmadas = true;
        renderizarParcelas();
        atualizarTela();
        return;
    }

    const quantidade = Math.max(1, Number.parseInt(document.getElementById("finParcelas")?.value || "1", 10));
    const total = numeroMoeda(document.getElementById("finValorTotal")?.value) || calcularTotalNota();
    const primeiraData = document.getElementById("finPrimeiroVencimento")?.value || dataHoje();
    const valorBase = Math.floor((total / quantidade) * 100) / 100;
    let acumulado = 0;

    parcelasEntrada = Array.from({ length: quantidade }, function(_, indice) {
        const valor = indice === quantidade - 1 ? arredondar(total - acumulado) : valorBase;
        acumulado += valor;
        return {
            parcela: indice + 1,
            vencimento: adicionarMeses(primeiraData, indice),
            valor,
            status: "Aberta",
            origem: "Manual"
        };
    });

    contasConfirmadas = false;
    renderizarParcelas();
    atualizarTela();
}

function renderizarParcelas(){
    const destino = document.getElementById("tabelaParcelas");

    if(!destino) return;

    if(parcelasEntrada.length === 0){
        destino.innerHTML = `<tr><td colspan="5" class="vazio">Nenhuma parcela gerada.</td></tr>`;
        return;
    }

    destino.innerHTML = parcelasEntrada.map(function(parcela) {
        return `
            <tr data-parcela="${parcela.parcela}">
                <td>${parcela.parcela}</td>
                <td>${formatarData(parcela.vencimento)}</td>
                <td>${formatarMoeda(parcela.valor)}</td>
                <td><span class="status-badge status-conferir">${escapar(parcela.status)}</span></td>
                <td><button type="button" class="btn-icone" data-editar-parcela="${parcela.parcela}" aria-label="Editar parcela"><i class="fa-solid fa-pen"></i></button></td>
            </tr>
        `;
    }).join("");
}

function tratarCliqueParcela(evento){
    const botao = evento.target.closest("[data-editar-parcela]");

    if(!botao) return;

    const parcela = parcelasEntrada.find(function(item) {
        return String(item.parcela) === String(botao.dataset.editarParcela);
    });

    if(!parcela) return;

    const vencimento = prompt("Informe o vencimento da parcela:", parcela.vencimento);
    if(!vencimento) return;

    const valor = prompt("Informe o valor da parcela:", formatarDecimal(parcela.valor));
    if(!valor) return;

    parcela.vencimento = vencimento;
    parcela.valor = numeroMoeda(valor);
    parcela.origem = "Editada";
    contasConfirmadas = false;
    renderizarParcelas();
    atualizarResumo();
    atualizarChecklist();
}

function confirmarContasPagar(){
    if(document.getElementById("finGerar")?.value === "nao"){
        contasConfirmadas = true;
        atualizarTela();
        mostrarToast("Geração financeira desativada.");
        return;
    }

    if(parcelasEntrada.length === 0){
        gerarParcelas();
    }

    contasConfirmadas = parcelasEntrada.length > 0;
    atualizarTela();
    mostrarToast("Contas a pagar confirmadas.");
}

function finalizarEntrada(){
    const validacao = validarFinalizacao();

    if(!validacao.ok){
        mostrarToast(validacao.mensagem);
        return;
    }

    notaEntrada.finalizada = true;
    notaEntrada.status = "confirmada";
    notaEntrada.finalizadaEm = new Date().toISOString();
    importarProdutosDaNota();
    gerarContasPagarDaNota();
    notaEntrada.estoqueAtualizado = true;
    salvarEntradaNaBase();
    atualizarTela();
    mostrarToast("Nota importada e confirmada.");
}

function atualizarEstoque(){
    if(!notaEntrada || notaEntrada.produtos.length === 0){
        mostrarToast("Importe uma nota antes de atualizar estoque.");
        return;
    }

    notaEntrada.estoqueAtualizado = true;
    atualizarTela();
    mostrarToast("Estoque preparado para atualização.");
}

function importarProdutosDaNota(){
    const base = lerJson(BASE_KEY, {});
    const produtosSistema = obterProdutosSistema();
    const mapa = new Map(produtosSistema.map(function(produto) {
        return [produto.id, produto];
    }));

    obterProdutosAtivos().forEach(function(item) {
        if(!item.produtoVinculado) return;

        const fiscal = calcularFiscalProdutoEntrada(item);
        const atual = mapa.get(item.produtoVinculado.id) || item.produtoVinculado;
        const atualizado = {
            ...atual,
            ...item.produtoVinculado,
            descricao: item.produtoVinculado.descricao || item.descricao,
            ean: item.produtoVinculado.ean || item.ean,
            ncm: item.ncm || item.produtoVinculado.ncm || "",
            cest: item.cest || item.produtoVinculado.cest || "",
            unidade: item.unidade || item.produtoVinculado.unidade || "UN",
            estoque: numeroMoeda(atual.estoque) + numeroMoeda(item.quantidade),
            precoCusto: fiscal.custoFinal,
            custoUltimaCompra: fiscal.custoFinal,
            precoVenda: numeroMoeda(item.vendaAtual),
            venda: numeroMoeda(item.vendaAtual),
            cfopEntrada: item.cfop || atual.cfopEntrada || "",
            cfopVendaEstadual: fiscal.cfopNfeInterna,
            cfopVendaInterestadual: fiscal.cfopNfeInterestadual,
            cfopNfce: fiscal.cfopNfce,
            origemMercadoria: item.origemMercadoria || item.produtoVinculado.origemMercadoria || obterConfiguracaoFiscalEntrada("fiscalOrigemMercadoriaPadrao", "0"),
            cst: item.csosn || item.cstIcmsVenda || fiscal.csosnSugerido || fiscal.cstIcmsSugerido || item.produtoVinculado.cst || "",
            cstIcms: item.cstIcmsVenda || fiscal.cstIcmsSugerido || item.produtoVinculado.cstIcms || "",
            csosn: item.csosn || fiscal.csosnSugerido || item.produtoVinculado.csosn || "",
            cstPis: item.cstPisVenda || fiscal.cstPisSugerido || item.produtoVinculado.cstPis || obterConfiguracaoFiscalEntrada("fiscalCstPisPadrao", "49"),
            cstCofins: item.cstCofinsVenda || fiscal.cstCofinsSugerido || item.produtoVinculado.cstCofins || obterConfiguracaoFiscalEntrada("fiscalCstCofinsPadrao", "49"),
            cstIpi: item.cstIpiVenda || fiscal.cstIpiSugerido || item.produtoVinculado.cstIpi || obterConfiguracaoFiscalEntrada("fiscalCstIpiPadrao", "99"),
            classificacaoFiscal: item.classificacaoFiscal || fiscal.classificacaoFiscal || item.produtoVinculado.classificacaoFiscal || "",
            regraFiscalST: item.regraFiscalST || item.produtoVinculado.regraFiscalST || "",
            ultimaEntradaNota: notaEntrada.numero || notaEntrada.chave || "",
            atualizadoEm: new Date().toISOString()
        };

        mapa.set(atualizado.id, atualizado);
        item.produtoVinculado = atualizado;
    });

    base.mercadorias = [...mapa.values()];
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
}

function gerarContasPagarDaNota(){
    if(document.getElementById("finGerar")?.value === "nao") return;

    if(parcelasEntrada.length === 0){
        gerarParcelas();
    }

    const base = lerJson(BASE_KEY, {});
    base.contasPagar = Array.isArray(base.contasPagar) ? base.contasPagar : [];
    const notaId = notaEntrada.id || gerarIdEntradaNota();
    notaEntrada.id = notaId;

    base.contasPagar = base.contasPagar.filter(function(conta) {
        return conta.origemEntradaNotaId !== notaId;
    });

    parcelasEntrada.forEach(function(parcela) {
        base.contasPagar.push({
            id: `cp-${notaId}-${parcela.parcela}`,
            origemEntradaNotaId: notaId,
            fornecedor: notaEntrada.fornecedor?.razao || "",
            cnpjFornecedor: notaEntrada.fornecedor?.cnpj || "",
            documento: notaEntrada.numero || notaEntrada.chave || "",
            serie: notaEntrada.serie || "",
            parcela: parcela.parcela,
            vencimento: parcela.vencimento,
            valor: numeroMoeda(parcela.valor),
            status: parcela.status || "Aberta",
            formaPagamento: document.getElementById("finForma")?.value || notaEntrada.financeiro?.formaDetectada || "",
            criadoEm: new Date().toISOString()
        });
    });

    contasConfirmadas = true;
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
}

function salvarRascunho(){
    if(!notaEntrada){
        mostrarToast("Nenhuma entrada para salvar.");
        return;
    }

    notaEntrada.status = "pendente";
    notaEntrada.salvaEm = new Date().toISOString();
    salvarEntradaNaBase();
    mostrarToast("Entrada salva em pendentes.");
}

function cancelarEntrada(){
    if(!notaEntrada){
        novaEntrada();
        return;
    }

    confirmar("Cancelar esta entrada? Os dados não salvos serão perdidos.").then(function(ok) {
        if(ok) novaEntrada();
    });
}

function novaEntrada(){
    notaEntrada = null;
    produtoAtualId = null;
    produtoSistemaSelecionadoId = null;
    parcelasEntrada = [];
    contasConfirmadas = false;
    document.querySelectorAll("input").forEach(function(input) {
        if(input.type !== "checkbox" && input.id !== "precoMargem") input.value = "";
    });
    definirDataInicial();
    limparFornecedor();
    limparTributos();
    limparPrecos();
    atualizarTela();
}

function atualizarTela(){
    renderizarProdutos();
    renderizarParcelas();
    atualizarResumo();
    atualizarChecklist();
    renderizarAlertas();
    atualizarStatusEntrada();
    atualizarOrigemParcelas();
    atualizarBotaoImportarNota();
}

function atualizarResumo(){
    const produtos = notaEntrada?.produtos || [];
    const ativos = obterProdutosAtivos();
    const novos = produtos.filter(function(item) { return item.status === "novo"; }).length;
    const conferidos = produtos.filter(produtoConferido).length;
    definirTexto("cardNotasImportadas", notaEntrada?.importada ? "1" : "0");
    definirTexto("cardProdutosConferidos", conferidos);
    definirTexto("cardProdutosNovos", novos);
    definirTexto("cardValorNota", formatarMoedaRS(notaEntrada ? calcularTotalNota() : 0));
    definirTexto("cardImpostos", formatarMoedaRS(notaEntrada ? calcularTotalImpostos() : 0));
    definirTexto("cardContasPagar", parcelasEntrada.length);
}

function atualizarChecklist(){
    const produtos = notaEntrada?.produtos || [];
    const ativos = obterProdutosAtivos();
    const finalizaveis = ativos.length > 0 && ativos.every(produtoConferido);

    definirCheck("checkXml", Boolean(notaEntrada?.importada));
    definirCheck("checkFornecedor", Boolean(notaEntrada?.fornecedor?.razao));
    definirCheck("checkVinculados", finalizaveis);
    definirCheck("checkNovos", produtos.filter(function(item) { return item.status === "novo"; }).every(function(item) { return item.produtoVinculado; }));
    definirCheck("checkCustos", ativos.every(function(item) { return item.custoUnitario > 0; }));
    definirCheck("checkEstoque", Boolean(notaEntrada?.estoqueAtualizado) || finalizaveis);
    definirCheck("checkFinanceiro", contasConfirmadas || document.getElementById("finGerar")?.value === "nao");
}

function renderizarAlertas(){
    const destino = document.getElementById("alertasEntrada");
    const contador = document.getElementById("contadorPendenciasEntrada");
    const aba = document.getElementById("abaPendenciasEntrada");

    if(!destino) return;
    if(!notaEntrada){
        if(contador) contador.textContent = "0";
        destino.innerHTML = `<div class="alerta">Importe um XML para iniciar a conferência.</div>`;
        return;
    }

    const alertas = [];
    obterProdutosAtivos().forEach(function(item) {
        const fiscal = calcularFiscalProdutoEntrada(item);
        fiscal.alertas.forEach(function(alerta) {
            alertas.push({
                produtoId: item.id,
                acao: tipoAcaoPendencia(alerta),
                tipo: alerta.includes("sem NCM") || alerta.includes("CFOP") ? "erro" : "",
                produto: item.descricao,
                texto: alerta
            });
        });
        if(!item.produtoVinculado){
            alertas.push({
                produtoId: item.id,
                acao: "vinculo",
                tipo: "erro",
                produto: item.descricao,
                texto: "Produto sem vínculo"
            });
        }
    });

    if(contador) contador.textContent = alertas.length;
    if(aba) aba.classList.toggle("tem-pendencias", alertas.length > 0);
    destino.innerHTML = alertas.length
        ? alertas.map(function(alerta) {
            return `
                <button type="button" class="pendencia-item ${alerta.tipo}" data-produto-id="${escapar(alerta.produtoId)}" data-pendencia="${escapar(alerta.acao)}" data-texto="${escapar(alerta.texto)}">
                    <strong>${escapar(alerta.produto)}</strong>
                    <span>${escapar(alerta.texto)}</span>
                </button>
            `;
        }).join("")
        : `<div class="alerta ok">Conferência sem alertas bloqueantes.</div>`;
}

function tipoAcaoPendencia(texto){
    const normalizado = normalizar(texto);
    if(normalizado.includes("sem ncm")) return "ncm";
    if(normalizado.includes("sem cest")) return "cest";
    if(normalizado.includes("sem regra fiscal")) return "regraST";
    if(normalizado.includes("preco de venda") || normalizado.includes("margem")) return "preco";
    if(normalizado.includes("cfop")) return "cfop";
    return "fiscal";
}

function abrirCorrecaoPendencia(evento){
    const item = evento.target.closest("[data-produto-id][data-pendencia]");

    if(!item) return;

    const produto = obterProdutoNota(item.dataset.produtoId);

    if(!produto) return;

    pendenciaAtual = {
        produtoId: produto.id,
        acao: item.dataset.pendencia,
        texto: item.dataset.texto || ""
    };

    definirTexto("pendenciaProdutoTitulo", produto.descricao || "Produto");
    definirTexto("pendenciaDescricaoTexto", pendenciaAtual.texto);
    renderizarFormularioPendencia(produto, pendenciaAtual);
    abrirModal("modalCorrigirPendencia");
}

function renderizarFormularioPendencia(produto, pendencia){
    const destino = document.getElementById("pendenciaAcaoConteudo");

    if(!destino) return;

    if(pendencia.acao === "vinculo"){
        destino.innerHTML = `
            <label class="campo-total">Buscar produto cadastrado
                <input type="search" id="pendenciaBuscaProduto" placeholder="Digite descrição, código, EAN ou NCM">
            </label>
            <div class="lista-produtos campo-total" id="pendenciaListaProdutos"></div>
        `;
        document.getElementById("pendenciaBuscaProduto")?.addEventListener("input", renderizarProdutosPendencia);
        renderizarProdutosPendencia();
        return;
    }

    if(pendencia.acao === "ncm"){
        destino.innerHTML = `
            <label>NCM
                <span class="campo-com-botao">
                    <input type="text" id="pendenciaNcm" value="${escapar(produto.ncm || "")}">
                    <button type="button" id="btnPesquisarNcmPendencia" aria-label="Pesquisar NCM" title="Pesquisar NCM"><i class="fa-solid fa-magnifying-glass"></i></button>
                </span>
            </label>
        `;
        document.getElementById("pendenciaNcm")?.addEventListener("input", function() {
            this.value = this.value.replace(/\D/g, "").slice(0, 8);
        });
        document.getElementById("btnPesquisarNcmPendencia")?.addEventListener("click", function() {
            abrirPesquisaNcmEntrada("pendenciaNcm");
        });
        return;
    }

    if(pendencia.acao === "cest"){
        destino.innerHTML = `<label>CEST<input type="text" id="pendenciaCest" value="${escapar(produto.cest || "")}"></label>`;
        return;
    }

    if(pendencia.acao === "preco"){
        destino.innerHTML = `<label>Preço de venda<input type="text" id="pendenciaPreco" value="${formatarDecimal(produto.vendaAtual || calcularPrecoSugeridoItem(produto))}"></label>`;
        return;
    }

    if(pendencia.acao === "cfop"){
        const fiscal = calcularFiscalProdutoEntrada(produto);
        destino.innerHTML = `
            <label>CFOP NF-e interna<input type="text" id="pendenciaCfopInterna" value="${escapar(fiscal.cfopNfeInterna || "")}"></label>
            <label>CFOP NF-e interestadual<input type="text" id="pendenciaCfopInterestadual" value="${escapar(fiscal.cfopNfeInterestadual || "")}"></label>
            <label>CFOP NFC-e<input type="text" id="pendenciaCfopNfce" value="${escapar(fiscal.cfopNfce || "")}"></label>
        `;
        return;
    }

    if(pendencia.acao === "regraST"){
        destino.innerHTML = `
            <label class="campo-total">
                Regra fiscal ST
                <select id="pendenciaRegraST">
                    <option value="">Selecione</option>
                    <option value="5405_6404">ST revenda - 5405 / 6404</option>
                    <option value="validacao_manual">Validação manual</option>
                </select>
            </label>
        `;
        return;
    }

    if(pendencia.acao === "fiscal"){
        const fiscal = calcularFiscalProdutoEntrada(produto);
        destino.innerHTML = `
            <label>Classificação<input type="text" id="pendenciaClassificacaoFiscal" value="${escapar(produto.classificacaoFiscal || fiscal.classificacaoFiscal || "")}"></label>
            <label>CFOP venda estadual<input type="text" id="pendenciaCfopInterna" value="${escapar(produto.cfopVendaEstadual || fiscal.cfopNfeInterna || "")}"></label>
            <label>CFOP venda interestadual<input type="text" id="pendenciaCfopInterestadual" value="${escapar(produto.cfopVendaInterestadual || fiscal.cfopNfeInterestadual || "")}"></label>
            <label>CFOP NFC-e<input type="text" id="pendenciaCfopNfce" value="${escapar(produto.cfopNfce || fiscal.cfopNfce || "")}"></label>
            <label>CSOSN<input type="text" id="pendenciaCsosn" value="${escapar(produto.csosn || fiscal.csosnSugerido || "")}"></label>
            <label>CST ICMS<input type="text" id="pendenciaCstIcms" value="${escapar(produto.cstIcmsVenda || fiscal.cstIcmsSugerido || "")}"></label>
            <label>CST PIS<input type="text" id="pendenciaCstPis" value="${escapar(produto.cstPisVenda || fiscal.cstPisSugerido || "")}"></label>
            <label>CST COFINS<input type="text" id="pendenciaCstCofins" value="${escapar(produto.cstCofinsVenda || fiscal.cstCofinsSugerido || "")}"></label>
            <label>CST IPI<input type="text" id="pendenciaCstIpi" value="${escapar(produto.cstIpiVenda || fiscal.cstIpiSugerido || "")}"></label>
        `;
        return;
    }

    destino.innerHTML = `
        <label class="campo-total">Observação fiscal
            <input type="text" id="pendenciaObservacao" value="${escapar(pendencia.texto)}">
        </label>
    `;
}

function renderizarProdutosPendencia(){
    const destino = document.getElementById("pendenciaListaProdutos");
    const termo = normalizar(document.getElementById("pendenciaBuscaProduto")?.value || "");
    const produtos = obterProdutosSistema().filter(function(produto) {
        return normalizar([produto.codigo, produto.descricao, produto.ean, produto.ncm].join(" ")).includes(termo);
    }).slice(0, 12);

    if(!destino) return;

    destino.innerHTML = produtos.map(function(produto) {
        return `
            <label class="produto-opcao" data-produto-pendencia="${escapar(produto.id)}">
                <input type="radio" name="produtoPendencia">
                <span>
                    <strong>${escapar(produto.descricao)}</strong>
                    <span>${escapar(produto.codigo || "-")} | ${escapar(produto.ean || "Sem EAN")} | NCM ${escapar(produto.ncm || "-")}</span>
                </span>
                <strong>${formatarMoeda(produto.venda || 0)}</strong>
            </label>
        `;
    }).join("") || `<div class="alerta">Nenhum produto cadastrado encontrado.</div>`;
}

function salvarCorrecaoPendencia(){
    const produto = obterProdutoNota(pendenciaAtual?.produtoId);

    if(!produto || !pendenciaAtual) return;

    if(pendenciaAtual.acao === "vinculo"){
        const selecionado = document.querySelector("[data-produto-pendencia] input:checked")?.closest("[data-produto-pendencia]");
        const produtoSistema = obterProdutosSistema().find(function(item) {
            return item.id === selecionado?.dataset.produtoPendencia;
        });

        if(!produtoSistema){
            mostrarToast("Selecione um produto para vincular.");
            return;
        }

        produto.produtoVinculado = produtoSistema;
        produto.vendaAtual = produtoSistema.venda || produto.vendaAtual || 0;
        produto.ncm = produto.ncm || produtoSistema.ncm || "";
        produto.cest = produto.cest || produtoSistema.cest || "";
        produto.status = "vinculado";
        aplicarSugestaoFiscalAoProdutoVinculado(produto);
    }

    if(pendenciaAtual.acao === "ncm"){
        produto.ncm = document.getElementById("pendenciaNcm")?.value.trim() || "";
    }

    if(pendenciaAtual.acao === "cest"){
        produto.cest = document.getElementById("pendenciaCest")?.value.trim() || "";
    }

    if(pendenciaAtual.acao === "preco"){
        const preco = numeroMoeda(document.getElementById("pendenciaPreco")?.value);
        if(preco <= 0){
            mostrarToast("Informe um preço de venda válido.");
            return;
        }
        produto.vendaAtual = preco;
        if(produto.produtoVinculado){
            produto.produtoVinculado.venda = preco;
            produto.produtoVinculado.precoVenda = preco;
            atualizarProdutoSistema(produto.produtoVinculado);
        }
    }

    if(pendenciaAtual.acao === "cfop" && produto.produtoVinculado){
        produto.produtoVinculado.cfopVendaEstadual = document.getElementById("pendenciaCfopInterna")?.value.trim() || "";
        produto.produtoVinculado.cfopVendaInterestadual = document.getElementById("pendenciaCfopInterestadual")?.value.trim() || "";
        produto.produtoVinculado.cfopNfce = document.getElementById("pendenciaCfopNfce")?.value.trim() || "";
        atualizarProdutoSistema(produto.produtoVinculado);
    }

    if(pendenciaAtual.acao === "regraST"){
        const regra = document.getElementById("pendenciaRegraST")?.value || "";
        produto.regraFiscalST = regra;
        if(produto.produtoVinculado){
            produto.produtoVinculado.regraFiscalST = regra;
            atualizarProdutoSistema(produto.produtoVinculado);
        }
    }

    if(pendenciaAtual.acao === "fiscal"){
        produto.classificacaoFiscal = document.getElementById("pendenciaClassificacaoFiscal")?.value.trim() || "";
        produto.cfopVendaEstadual = document.getElementById("pendenciaCfopInterna")?.value.trim() || "";
        produto.cfopVendaInterestadual = document.getElementById("pendenciaCfopInterestadual")?.value.trim() || "";
        produto.cfopNfce = document.getElementById("pendenciaCfopNfce")?.value.trim() || "";
        produto.csosn = document.getElementById("pendenciaCsosn")?.value.trim() || "";
        produto.cstIcmsVenda = document.getElementById("pendenciaCstIcms")?.value.trim() || "";
        produto.cstPisVenda = document.getElementById("pendenciaCstPis")?.value.trim() || "";
        produto.cstCofinsVenda = document.getElementById("pendenciaCstCofins")?.value.trim() || "";
        produto.cstIpiVenda = document.getElementById("pendenciaCstIpi")?.value.trim() || "";

        if(produto.produtoVinculado){
            produto.produtoVinculado.classificacaoFiscal = produto.classificacaoFiscal;
            produto.produtoVinculado.cfopVendaEstadual = produto.cfopVendaEstadual;
            produto.produtoVinculado.cfopVendaInterestadual = produto.cfopVendaInterestadual;
            produto.produtoVinculado.cfopNfce = produto.cfopNfce;
            produto.produtoVinculado.csosn = produto.csosn;
            produto.produtoVinculado.cstIcms = produto.cstIcmsVenda;
            produto.produtoVinculado.cst = produto.csosn || produto.cstIcmsVenda;
            produto.produtoVinculado.cstPis = produto.cstPisVenda;
            produto.produtoVinculado.cstCofins = produto.cstCofinsVenda;
            produto.produtoVinculado.cstIpi = produto.cstIpiVenda;
            atualizarProdutoSistema(produto.produtoVinculado);
        }
    }

    pendenciaAtual = null;
    fecharModais();
    atualizarTela();
    mostrarToast("Pendência corrigida.");
}

function atualizarStatusEntrada(){
    const status = document.getElementById("statusEntrada");

    if(!status) return;

    if(!notaEntrada){
        status.textContent = "Aguardando XML";
        status.className = "selo pendente";
        return;
    }

    if(notaEntrada.finalizada){
        status.textContent = "Entrada finalizada";
        status.className = "selo status-vinculado";
        return;
    }

    status.textContent = "Em conferência";
    status.className = "selo status-conferir";
}

function atualizarOrigemParcelas(){
    const status = document.getElementById("finOrigemParcelas");

    if(!status) return;

    if(!notaEntrada){
        status.textContent = "Aguardando XML";
        status.className = "selo pendente";
        return;
    }

    const detectadas = notaEntrada.financeiro?.parcelasDetectadas || 0;

    if(detectadas > 0){
        status.textContent = `${detectadas} parcela(s) do XML`;
        status.className = "selo status-vinculado";
        return;
    }

    status.textContent = "Sem boleto/duplicata no XML";
    status.className = "selo status-conferir";
}

function atualizarBotaoImportarNota(){
    const botao = document.getElementById("btnFinalizarEntrada");
    if(!botao) return;

    const validacao = validarFinalizacao({ silencioso: true });
    botao.disabled = !validacao.ok;
    botao.title = validacao.ok ? "Importar nota, atualizar cadastro e gerar financeiro" : validacao.mensagem || "Ajuste as pendências antes de importar";
}

function validarFinalizacao(opcoes = {}){
    if(!notaEntrada?.fornecedor?.razao) return { ok: false, mensagem: "Fornecedor não preenchido." };
    if(!notaEntrada.produtos.length) return { ok: false, mensagem: "Inclua pelo menos um produto." };

    const pendente = obterProdutosAtivos().find(function(item) {
        return !produtoConferido(item);
    });

    if(pendente) return { ok: false, mensagem: "Todos os produtos precisam estar conferidos." };
    if(document.getElementById("finGerar")?.value !== "nao" && parcelasEntrada.length === 0) return { ok: false, mensagem: "Gere as parcelas antes de importar a nota." };

    return { ok: true };
}

function salvarEntradaNaBase(){
    const base = lerJson(BASE_KEY, {});
    base.entradasNotas = Array.isArray(base.entradasNotas) ? base.entradasNotas : [];
    base.entradasNotasConfirmadas = Array.isArray(base.entradasNotasConfirmadas) ? base.entradasNotasConfirmadas : [];
    const agora = new Date().toISOString();
    const entradaExistente = [...base.entradasNotas, ...base.entradasNotasConfirmadas].find(function(item) {
        return item.id === notaEntrada.id;
    });

    const registro = {
        id: notaEntrada.id || gerarIdEntradaNota(),
        criadoEm: entradaExistente?.criadoEm || agora,
        atualizadoEm: agora,
        status: notaEntrada.status || (notaEntrada.finalizada ? "confirmada" : "pendente"),
        nota: notaEntrada,
        parcelas: parcelasEntrada,
        contasConfirmadas: contasConfirmadas
    };

    notaEntrada.id = registro.id;
    base.entradasNotas = base.entradasNotas.filter(function(item) {
        return item.id !== registro.id;
    });
    base.entradasNotasConfirmadas = base.entradasNotasConfirmadas.filter(function(item) {
        return item.id !== registro.id;
    });

    if(registro.status === "confirmada"){
        base.entradasNotasConfirmadas.unshift(registro);
    }else{
        base.entradasNotas.unshift(registro);
    }

    localStorage.setItem(BASE_KEY, JSON.stringify(base));
}

function gerarIdEntradaNota(){
    return `ent-${Date.now()}`;
}

function carregarEntradaSalvaPelaUrl(){
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("entrada") || parametros.get("pendente") || parametros.get("id");

    if(!id) return false;

    const base = lerJson(BASE_KEY, {});
    const entradas = Array.isArray(base.entradasNotas) ? base.entradasNotas : [];
    const registro = entradas.find(function(item) {
        return item.id === id && item.status !== "confirmada" && item.nota?.finalizada !== true;
    });

    if(!registro?.nota){
        mostrarToast("Entrada pendente não encontrada.");
        definirDataInicial();
        atualizarTela();
        return true;
    }

    notaEntrada = registro.nota;
    notaEntrada.id = registro.id;
    notaEntrada.status = registro.status || "pendente";
    parcelasEntrada = Array.isArray(registro.parcelas) ? registro.parcelas : [];
    contasConfirmadas = Boolean(registro.contasConfirmadas);
    produtoAtualId = null;
    produtoSistemaSelecionadoId = null;
    pendenciaAtual = null;

    preencherNota();
    recalcularPrecos();
    selecionarTributos(notaEntrada.produtos?.[0]?.id);
    atualizarTela();
    mostrarToast("Entrada pendente carregada.");
    return true;
}

function abrirModal(id){
    document.getElementById("modalBackdrop")?.classList.add("ativo");
    const modal = document.getElementById(id);
    modal?.classList.add("aberto");
    modal?.setAttribute("aria-hidden", "false");
}

function fecharModais(){
    document.getElementById("modalBackdrop")?.classList.remove("ativo");
    document.querySelectorAll(".modal").forEach(function(modal) {
        modal.classList.remove("aberto");
        modal.setAttribute("aria-hidden", "true");
    });
}

function obterProdutoNota(id){
    return notaEntrada?.produtos.find(function(item) {
        return item.id === id;
    });
}

function obterProdutosAtivos(){
    return (notaEntrada?.produtos || []).filter(function(item) {
        return item.status !== "ignorado";
    });
}

function calcularTotalProdutos(){
    return obterProdutosAtivos().reduce(function(total, item) {
        return total + item.quantidade * item.custoUnitario;
    }, 0);
}

function calcularTotalNota(){
    if(!notaEntrada) return 0;
    return arredondar(calcularTotalProdutos() + notaEntrada.frete + notaEntrada.outras - notaEntrada.desconto);
}

function calcularTotalImpostos(){
    return obterProdutosAtivos().reduce(function(total, item) {
        const totalItem = numeroMoeda(item.totalTributos);
        if(totalItem > 0) return total + totalItem;
        const base = item.custoUnitario * item.quantidade;
        const icms = numeroMoeda(item.icms) || base * (numeroMoeda(item.aliquotaIcms) / 100);
        return total + icms + numeroMoeda(item.ipi) + numeroMoeda(item.pis) + numeroMoeda(item.cofins);
    }, 0);
}

function calcularPrecoSugeridoItem(item){
    if(!notaEntrada) return 0;
    return arredondar(calcularFiscalProdutoEntrada(item).precoSugerido);
}

function calcularMargemAtual(item){
    if(!item.vendaAtual) return obterMargem();
    return ((item.vendaAtual - item.custoUnitario) / item.custoUnitario) * 100;
}

function obterMargem(){
    return Number.parseFloat(document.getElementById("precoMargem")?.value || "0") || 0;
}

function opcaoStatus(valor, texto, atual){
    return `<option value="${valor}" ${valor === atual ? "selected" : ""}>${texto}</option>`;
}

function rotuloStatus(status){
    const mapa = {
        vinculado: "Vinculado",
        novo: "Produto novo",
        divergencia: "Divergência fiscal",
        conferir: "Conferir",
        ignorado: "Ignorado"
    };
    return mapa[status] || "Conferir";
}

function classeStatus(status){
    return status === "divergencia" ? "divergencia" : status === "novo" ? "novo" : status === "ignorado" ? "ignorado" : status === "vinculado" ? "vinculado" : "conferir";
}

function obterProdutosSistema(){
    const base = lerJson(BASE_KEY, {});
    const mercadoriasBase = Array.isArray(base.mercadorias) ? base.mercadorias : [];
    const mercadoriasSoltas = lerJson("mercadorias", []);
    const mapa = new Map();

    [...mercadoriasBase, ...(Array.isArray(mercadoriasSoltas) ? mercadoriasSoltas : [])].forEach(function(item) {
        const produto = normalizarProdutoSistema(item);
        if(produto.id) mapa.set(produto.id, produto);
    });

    return [...mapa.values()];
}

function obterEmpresaFiscalEntrada(){
    const base = lerJson(BASE_KEY, {});
    const empresaAvulsa = lerJson("empresaSistema", {});
    const configuracoes = window.ConfiguracoesSistema?.obter?.() || lerJson("configuracoesSistema", {});
    const empresa = {
        ...(base.empresa || {}),
        ...empresaAvulsa
    };

    return {
        cnpj: empresa.cnpj || configuracoes.fiscalCertificadoCnpj || "",
        razaoSocial: empresa.razaoSocial || empresa.nomeFantasia || "",
        uf: (configuracoes.fiscalUf || empresa.estado || empresa.uf || "").toUpperCase(),
        regimeTributario: configuracoes.fiscalRegimeTributario || empresa.regimeTributario || "simplesNacional",
        tipoAtividade: empresa.tipoAtividade || configuracoes.tipoAtividade || "comercio"
    };
}

function obterConfiguracaoFiscalEntrada(campo, fallback){
    const configuracoes = window.ConfiguracoesSistema?.obter?.() || lerJson("configuracoesSistema", {});
    return configuracoes[campo] ?? fallback;
}

function normalizarProdutoSistema(item){
    const venda = numeroMoeda(item.precoVenda ?? item.venda ?? item.preco ?? item.valorVenda);

    return {
        ...item,
        id: String(item.id || item.codigo || item.ean || `produto-${Date.now()}-${Math.random()}`),
        codigo: String(item.codigo || item.codigoInterno || ""),
        descricao: String(item.descricao || item.nome || item.produto || ""),
        ean: String(item.ean || item.codigoBarras || item.codigoBarra || ""),
        ncm: String(item.ncm || ""),
        cest: String(item.cest || ""),
        origemMercadoria: String(item.origemMercadoria || item.origem || obterConfiguracaoFiscalEntrada("fiscalOrigemMercadoriaPadrao", "0")),
        cstIpi: String(item.cstIpi || obterConfiguracaoFiscalEntrada("fiscalCstIpiPadrao", "99")),
        cstPis: String(item.cstPis || obterConfiguracaoFiscalEntrada("fiscalCstPisPadrao", "49")),
        cstCofins: String(item.cstCofins || obterConfiguracaoFiscalEntrada("fiscalCstCofinsPadrao", "49")),
        unidade: String(item.unidade || "UN"),
        venda,
        precoVenda: venda,
        tipoProduto: normalizarTipoProdutoFiscal(item.tipoProduto || item.origemProduto || item.tipo || "REVENDA"),
        margemLucro: numeroMoeda(item.margemLucro ?? item.margem ?? "")
    };
}

function normalizarTipoProdutoFiscal(valor){
    const texto = normalizar(valor);
    if(["fabricacao_propria", "fabricacaopropria", "fabricacao", "industrializado", "industria", "producao"].includes(texto)) return "FABRICACAO_PROPRIA";
    return "REVENDA";
}

function produtoPossuiST(item){
    const cst = String(item.cstIcms || "").trim();
    const cfop = String(item.cfop || "").trim();
    return Boolean(item.cest) || numeroMoeda(item.valorIcmsSt) > 0 || ["010", "030", "060", "10", "30", "60", "201", "202", "203", "500"].includes(cst) || ["1403", "2403", "5405", "6404"].includes(cfop);
}

function obterMargemProduto(item){
    const margemProduto = numeroMoeda(item.margemPadrao ?? item.produtoVinculado?.margemLucro ?? item.produtoVinculado?.margem ?? "");
    if(margemProduto > 0) return margemProduto;
    return obterMargem();
}

function localizarProdutoSistemaXml(produtos, itemXml){
    const ean = normalizarEanXml(itemXml.ean);
    const codigo = normalizar(itemXml.codigo);
    const descricao = normalizar(itemXml.descricao);

    return produtos.find(function(produto) {
        return ean && normalizarEanXml(produto.ean) === ean;
    }) || produtos.find(function(produto) {
        return codigo && normalizar(produto.codigo) === codigo;
    }) || produtos.find(function(produto) {
        return descricao && normalizar(produto.descricao) === descricao;
    }) || null;
}

function salvarProdutoSistema(produto){
    const base = lerJson(BASE_KEY, {});
    const existentes = obterProdutosSistema();
    base.mercadorias = [...existentes.filter(function(item) {
        return item.id !== produto.id;
    }), produto];
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
}

function atualizarProdutoSistema(produto){
    const base = lerJson(BASE_KEY, {});
    const existentes = obterProdutosSistema();
    base.mercadorias = existentes.map(function(item) {
        return item.id === produto.id ? { ...item, ...produto } : item;
    });
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
}

function aplicarSugestaoFiscalAoProdutoVinculado(item){
    if(!item.produtoVinculado) return;

    const fiscal = calcularFiscalProdutoEntrada(item);
    const produto = {
        ...item.produtoVinculado,
        ncm: item.ncm || item.produtoVinculado.ncm || "",
        cest: item.cest || item.produtoVinculado.cest || "",
        cfopEntrada: item.cfop || item.produtoVinculado.cfopEntrada || "",
        cfopVendaEstadual: fiscal.cfopNfeInterna,
        cfopVendaInterestadual: fiscal.cfopNfeInterestadual,
        cfopNfce: fiscal.cfopNfce,
        origemMercadoria: item.origemMercadoria || item.produtoVinculado.origemMercadoria || obterConfiguracaoFiscalEntrada("fiscalOrigemMercadoriaPadrao", "0"),
        cst: item.csosn || item.cstIcmsVenda || fiscal.csosnSugerido || fiscal.cstIcmsSugerido || item.produtoVinculado.cst || "",
        cstIcms: item.cstIcmsVenda || fiscal.cstIcmsSugerido || item.produtoVinculado.cstIcms || "",
        csosn: item.csosn || fiscal.csosnSugerido || item.produtoVinculado.csosn || "",
        cstPis: item.cstPisVenda || fiscal.cstPisSugerido || item.produtoVinculado.cstPis || obterConfiguracaoFiscalEntrada("fiscalCstPisPadrao", "49"),
        cstCofins: item.cstCofinsVenda || fiscal.cstCofinsSugerido || item.produtoVinculado.cstCofins || obterConfiguracaoFiscalEntrada("fiscalCstCofinsPadrao", "49"),
        cstIpi: item.cstIpiVenda || fiscal.cstIpiSugerido || item.produtoVinculado.cstIpi || obterConfiguracaoFiscalEntrada("fiscalCstIpiPadrao", "99"),
        classificacaoFiscal: item.classificacaoFiscal || fiscal.classificacaoFiscal || item.produtoVinculado.classificacaoFiscal || "",
        regraFiscalST: item.regraFiscalST || item.produtoVinculado.regraFiscalST || "",
        precoCusto: fiscal.custoFinal,
        custoUltimaCompra: fiscal.custoFinal,
        precoVenda: numeroMoeda(item.vendaAtual),
        venda: numeroMoeda(item.vendaAtual),
        atualizadoEm: new Date().toISOString()
    };

    item.produtoVinculado = produto;
    atualizarProdutoSistema(produto);
}

function gerarCodigoProdutoSistema(){
    const maior = obterProdutosSistema().reduce(function(maximo, item) {
        const numero = Number.parseInt(String(item.codigo || "").replace(/\D/g, ""), 10);
        return Number.isFinite(numero) ? Math.max(maximo, numero) : maximo;
    }, 0);
    return String(maior + 1).padStart(6, "0");
}

function extrairParcelasXml(xml){
    const duplicatas = Array.from(xml.querySelectorAll("dup"));

    if(duplicatas.length > 0){
        return duplicatas.map(function(dup, indice) {
            return {
                parcela: textoTag(dup, "nDup") || indice + 1,
                vencimento: formatarDataXml(textoTag(dup, "dVenc")) || adicionarMeses(dataHoje(), indice),
                valor: numeroXml(textoTag(dup, "vDup"))
            };
        });
    }

    const pagamentos = Array.from(xml.querySelectorAll("pag detPag"));
    if(pagamentos.length === 0) return [];

    return pagamentos.map(function(pagamento, indice) {
        return {
            parcela: indice + 1,
            vencimento: adicionarMeses(dataHoje(), indice),
            valor: numeroXml(textoTag(pagamento, "vPag"))
        };
    }).filter(function(parcela) {
        return parcela.valor > 0;
    });
}

function detectarFormaPagamentoXml(xml, parcelas){
    if(parcelas.length > 1 || xml.querySelector("dup")) return "Boleto";

    const tipo = textoTag(xml.querySelector("detPag"), "tPag");
    const mapa = {
        "01": "Carteira",
        "03": "Cartão",
        "04": "Cartão",
        "15": "Boleto",
        "16": "Depósito",
        "17": "PIX",
        "18": "Transferência",
        "90": "Sem pagamento",
        "99": "Outro"
    };

    return mapa[tipo] || "Não identificado";
}

function textoTag(contexto, tag){
    return contexto?.querySelector(tag)?.textContent?.trim() || "";
}

function primeiroTextoTag(contexto, tags){
    for(const tag of tags){
        const texto = textoTag(contexto, tag);
        if(texto) return texto;
    }
    return "";
}

function extrairCstIcms(imposto){
    const icms = imposto?.querySelector("ICMS");
    return textoTag(icms, "CST") || textoTag(icms, "CSOSN");
}

function numeroXml(valor){
    return Number.parseFloat(String(valor || "0").replace(",", ".")) || 0;
}

function formatarDataXml(valor){
    if(!valor) return "";
    return String(valor).slice(0, 10);
}

function normalizarEanXml(valor){
    const texto = String(valor || "").trim();
    return ["SEM GTIN", "SEMGTIN"].includes(texto.toUpperCase()) ? "" : texto;
}

function formatarCnpj(valor){
    const numeros = String(valor || "").replace(/\D/g, "");
    if(numeros.length !== 14) return valor || "";
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function limparFornecedor(){
    ["forRazao", "forFantasia", "forCnpj", "forIe", "forCidade"].forEach(function(id) {
        definirTexto(id, "-");
    });
}

function limparTributos(){
    ["tribCfop", "tribCstIcms", "tribCstPis", "tribCstCofins", "tribCstIpi", "tribOrigem", "tribNcm", "tribCest", "tribAliquota", "tribBase", "tribIcms", "tribIpi", "tribPis", "tribCofins"].forEach(function(id) {
        definirValor(id, "");
    });
}

function limparPrecos(){
    ["precoCustoNota", "precoFreteRateado", "precoDespesasRateadas", "precoCustoFinal", "precoSugerido"].forEach(function(id) {
        definirValor(id, "");
    });
}

function definirDataInicial(){
    definirValor("notaEntrada", dataHoje());
    definirValor("finPrimeiroVencimento", adicionarDias(dataHoje(), 30));
}
function definirValor(id, valor){
    const elemento = document.getElementById(id);
    if(elemento) elemento.value = valor;
}

function definirCheck(id, marcado){
    const elemento = document.getElementById(id);
    if(elemento) elemento.checked = marcado;
}

function mostrarToast(texto){
    const toast = document.getElementById("toastEntrada");
    if(!toast) return;
    toast.textContent = texto;
    toast.classList.add("ativo");
    window.clearTimeout(mostrarToast.timer);
    mostrarToast.timer = window.setTimeout(function() {
        toast.classList.remove("ativo");
    }, 2600);
}function escapar(valor){
    return String(valor ?? "").replace(/[&<>"']/g, function(caractere) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[caractere];
    });
}

function numeroMoeda(valor){
    if(typeof valor === "number") return valor;
    const texto = String(valor || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    return Number.parseFloat(texto) || 0;
}

function arredondar(valor){
    return Math.round((Number(valor) || 0) * 100) / 100;
}
function formatarDecimal(valor){
    return (Number(valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarQuantidade(valor){
    return (Number(valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function dataHoje(){
    return new Date().toISOString().slice(0, 10);
}

function adicionarDias(data, dias){
    const base = new Date(`${data}T12:00:00`);
    base.setDate(base.getDate() + dias);
    return base.toISOString().slice(0, 10);
}

function adicionarMeses(data, meses){
    const base = new Date(`${data}T12:00:00`);
    base.setMonth(base.getMonth() + meses);
    return base.toISOString().slice(0, 10);
}

function formatarData(data){
    if(!data) return "-";
    const partes = String(data).slice(0, 10).split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}
