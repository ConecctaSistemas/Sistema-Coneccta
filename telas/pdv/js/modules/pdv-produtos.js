// pdv-produtos.js
// Pesquisa e sugestões de produto, leitura de código de barras/balança, painel de pesquisa de mercadoria, busca rápida de preço (Ctrl), preparação dos campos de lançamento.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Prepara a lista base usada nas sugestões de produto.
function carregarSugestoesProdutos(){
    const lista = document.getElementById("listaProdutosPDV");

    if(!lista) return;

    lista.innerHTML = "";
    sugestoesProdutosPdv = [];
    sugestaoProdutoAtiva = -1;
    ocultarSugestoesProdutos();
}

// Renderiza o dropdown de sugestões a partir do termo digitado.
function renderizarSugestoesProdutos(termo){
    const lista = document.getElementById("listaProdutosPDV");
    const busca = normalizar(termo);

    if(!lista || busca.length < 2 || String(termo || "").trim().startsWith("*")){
        ocultarSugestoesProdutos();
        return false;
    }

    sugestoesProdutosPdv = buscarProdutosParecidos(busca).slice(0, 6);
    sugestaoProdutoAtiva = sugestoesProdutosPdv.length === 1 ? 0 : -1;

    if(sugestoesProdutosPdv.length === 0){
        lista.innerHTML = `
            <div class="sugestao-produto vazio">
                <strong>Nenhum produto encontrado</strong>
                <span>Tente outra descrição, código ou referência.</span>
            </div>
        `;
        lista.classList.add("ativo");
        lista.setAttribute("aria-hidden", "false");
        return true;
    }

    lista.innerHTML = sugestoesProdutosPdv.map(function(item, indice) {
        const estoque = item.estoque !== undefined ? `${formatarQuantidade(item.estoque)} ${escapar(item.unidade || "UN")}` : "";

        return `
            <button type="button" class="sugestao-produto ${indice === sugestaoProdutoAtiva ? "ativo" : ""}" data-indice="${indice}">
                <span class="sugestao-codigo">${escapar(item.codigo || "Sem código")}</span>
                <strong>${escapar(item.descricao)}</strong>
                <small>${formatarMoedaRS(precoPdv(item))}${estoque ? ` · Estoque: ${estoque}` : ""}</small>
            </button>
        `;
    }).join("");

    lista.querySelectorAll("[data-indice]").forEach(function(botao) {
        botao.addEventListener("mousedown", function(evento) {
            evento.preventDefault();
            selecionarSugestaoProduto(Number.parseInt(botao.dataset.indice, 10));
        });
    });

    lista.classList.add("ativo");
    lista.setAttribute("aria-hidden", "false");
}

// Busca produtos por aproximação de código/descrição.
function buscarProdutosParecidos(busca){
    const termos = busca.split(" ").filter(Boolean);
    const usarReferencia = configuracaoPermiteReferenciaPdv();

    return obterMercadorias()
        .map(function(item) {
            const descricao = normalizar(item.descricao);
            const textoCompleto = normalizar([
                item.codigo,
                item.ean,
                item.descricao,
                usarReferencia ? item.referencia : "",
                item.categoria
            ].join(" "));
            const palavrasDescricao = descricao.split(" ").filter(Boolean);
            let pontos = 0;

            if(normalizar(item.codigo) === busca || normalizar(item.ean) === busca || (usarReferencia && normalizar(item.referencia) === busca)){
                pontos += 100;
            }

            if(descricao.startsWith(busca)) pontos += 60;
            if(textoCompleto.includes(busca)) pontos += 35;

            termos.forEach(function(termo) {
                if(palavrasDescricao.some(function(palavra) { return palavra.startsWith(termo); })) pontos += 18;
                if(textoCompleto.includes(termo)) pontos += 8;
            });

            return { item, pontos };
        })
        .filter(function(resultado) {
            return resultado.pontos > 0;
        })
        .sort(function(a, b) {
            return b.pontos - a.pontos || String(a.item.descricao).localeCompare(String(b.item.descricao));
        })
        .map(function(resultado) {
            return resultado.item;
        });
}

// Marca visualmente a sugestão ativa.
function atualizarSugestaoAtiva(){
    document.querySelectorAll("#listaProdutosPDV .sugestao-produto").forEach(function(botao, indice) {
        botao.classList.toggle("ativo", indice === sugestaoProdutoAtiva);
    });
}

// Seleciona uma sugestão e inicia o lançamento do produto.
function selecionarSugestaoProduto(indice){
    const produto = sugestoesProdutosPdv[indice];
    const input = document.getElementById("pesquisaProduto");

    if(!produto || !input) return;

    input.value = produto.codigo || produto.descricao;
    ocultarSugestoesProdutos();
    processarEntradaPDV(input.value);
    input.value = "";
}

// Oculta o dropdown de sugestões.
function ocultarSugestoesProdutos(){
    const lista = document.getElementById("listaProdutosPDV");

    if(!lista) return;

    lista.classList.remove("ativo");
    lista.setAttribute("aria-hidden", "true");
    lista.innerHTML = "";
    sugestoesProdutosPdv = [];
    sugestaoProdutoAtiva = -1;
}

// Processa o valor digitado/lido no campo de pesquisa (código, EAN, balança).
function processarEntradaPDV(valor){
    if(!itemEmDigitacao){
        iniciarLancamentoProduto(valor);
        return false;
    }

    if(itemEmDigitacao.etapa === "quantidade"){
        informarQuantidadeProduto(valor);
        return true;
    }

    if(itemEmDigitacao.etapa === "preco"){
        informarPrecoProduto(valor);
    }
}

// Lê a configuração de prefixo/formato de etiqueta de balança.
function _obterConfigBalancaPdv(){
    const cfg = obterConfiguracoesSistema();
    const b = cfg.balancaPdv;
    return (b && b.ativo) ? b : null;
}

// Decodifica uma etiqueta de balança em PLU/peso/preço.
function _decodificarEtiquetaBalanca(codigo){
    const cfg = _obterConfigBalancaPdv();
    if(!cfg) return null;
    const str = String(codigo || "").trim();
    if(str.length !== 13) return null;
    const prefixo = String(cfg.prefixo || "2");
    if(!str.startsWith(prefixo)) return null;
    const tamPlu = parseInt(cfg.tamanhoPlu, 10) || 5;
    const tamVal = parseInt(cfg.tamanhoValor, 10) || 5;
    const plu = String(parseInt(str.substring(1, 1 + tamPlu), 10) || 0);
    const valorRaw = parseInt(str.substring(1 + tamPlu, 1 + tamPlu + tamVal), 10) || 0;
    if(cfg.tipoCodigo === "preco"){
        return { plu, peso: null, preco: valorRaw / 100 };
    }
    return { plu, peso: valorRaw / 1000, preco: null };
}

// Localiza o produto correspondente a um código PLU de balança.
function _buscarProdutoPorPlu(plu){
    const base = obterBase();
    return (base.mercadorias || []).find(function(p){
        if(p.ativo === false) return false;
        if(!p.balanca || !p.balanca.ativo || !p.balanca.plu) return false;
        return String(parseInt(p.balanca.plu, 10) || 0) === plu;
    }) || null;
}

// Inicia o lançamento de um item pesado na balança.
function _iniciarLancamentoBalanca(produto, peso, preco){
    var quantidade, precoUnitario;

    if(preco !== null){
        // código preço: barcode já traz o valor total — qty=1, preço=valor codificado
        quantidade = 1;
        precoUnitario = preco;
    } else {
        // código peso: barcode traz gramas → converte para kg com 3 casas
        quantidade = Math.round((peso || 0) * 1000) / 1000;
        if(quantidade <= 0){
            alert("Etiqueta de balança com peso inválido.");
            prepararCampoProduto();
            return;
        }
        // Preço por kg direto do cadastro — não aplica regra de quantidade de tabela
        precoUnitario = numero(produto.precoVenda) || 0;
    }

    itemEmDigitacao = {
        etapa: "finalizar",
        produto,
        quantidade,
        precoUnitario,
        tabelaAplicadaId: null,
        porQuantidade: false,
        precoOriginal: precoUnitario,
        fromBalanca: true         // impede fusão com outros itens iguais no carrinho
    };

    definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidade));
    definirValorCampoPdv("valorUnitario", formatarDecimalCampo(precoUnitario));
    finalizarLancamentoProduto();
}

// Interpreta o texto digitado (código, quantidade*código etc.).
function interpretarEntradaProduto(valor){
    const texto = String(valor || "").trim();
    return {
        termoProduto: texto,
        quantidade: 0,
        quantidadeTexto: "",
        apenasMultiplicador: false
    };
}

// Busca um produto por código/EAN/referência.
function localizarProduto(termo){
    const busca = normalizar(termo);
    const usarReferencia = configuracaoPermiteReferenciaPdv();

    if(!busca) return null;

    const produtos = obterMercadorias();

    return produtos.find(function(item) {
        return normalizar(item.codigo) === busca ||
            normalizar(item.ean) === busca ||
            (usarReferencia && normalizar(item.referencia) === busca);
    }) || produtos.find(function(item) {
        return normalizar([
            item.codigo,
            item.ean,
            item.descricao,
            usarReferencia ? item.referencia : ""
        ].join(" ")).includes(busca);
    });
}

// Abre o modo de digitação de quantidade pendente (tecla *).
function prepararQuantidadePendente(){
    const input = document.getElementById("quantidadeItens");

    if(!input) return;

    liberarCampoMetrica("quantidadeItens", true);
    liberarCampoMetrica("valorUnitario", false);
    definirValorCampoPdv("valorUnitario", formatarDecimalCampo(1));
    ocultarSugestoesProdutos();
    input.value = quantidadePendentePesquisa > 0 ? formatarQuantidade(quantidadePendentePesquisa) : "";
    input.placeholder = "0,000";
    if(abrirEditorLancamentoMobilePdv("quantidade-pendente", null)) return;
    input.focus();
    input.select();
}

// Confirma a quantidade pendente digitada.
function confirmarQuantidadePendente(valor){
    const quantidadeDigitada = numeroDigitado(valor);

    if(quantidadeDigitada <= 0){
        alert("Informe uma quantidade maior que zero.");
        prepararQuantidadePendente();
        return;
    }

    quantidadePendentePesquisa = quantidadeDigitada;
    quantidadePendenteTexto = String(valor || "").trim();
    definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidadeDigitada));
    liberarCampoMetrica("quantidadeItens", false);
    document.getElementById("pesquisaProduto")?.focus();
}

// Prepara o campo de pesquisa para novo lançamento.
function prepararCampoProduto(){
    const input = document.getElementById("pesquisaProduto");

    if(!input) return;

    fecharEditorLancamentoMobilePdv(false);
    liberarCampoMetrica("quantidadeItens", false);
    liberarCampoMetrica("valorUnitario", false);
    if(quantidadePendentePesquisa > 0){
        definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidadePendentePesquisa));
        definirValorCampoPdv("valorUnitario", formatarDecimalCampo(1));
    } else {
        resetarCamposLancamento();
    }
    input.type = "text";
    input.removeAttribute("list");
    input.placeholder = "Pesquise por código, EAN, produto ou referência";
    input.inputMode = "text";
    input.autocomplete = "off";
    ocultarSugestoesProdutos();
    input.focus();
}

// Prepara o campo de quantidade para edição.
function prepararCampoQuantidade(produto){
    const input = document.getElementById("quantidadeItens");

    if(!input) return;

    liberarCampoMetrica("quantidadeItens", true);
    liberarCampoMetrica("valorUnitario", false);
    ocultarSugestoesProdutos();
    exibirProdutoEmDigitacaoNaPesquisa(produto);
    input.value = formatarQuantidade(itemEmDigitacao?.quantidade || 1);
    input.closest(".metric-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if(abrirEditorLancamentoMobilePdv("quantidade", produto)) return;
    input.focus();
    input.select();
}

// Prepara o campo de preço para edição.
function prepararCampoPreco(produto){
    const input = document.getElementById("valorUnitario");

    if(!input) return;

    liberarCampoMetrica("quantidadeItens", false);
    liberarCampoMetrica("valorUnitario", true);
    ocultarSugestoesProdutos();
    exibirProdutoEmDigitacaoNaPesquisa(produto);
    input.value = formatarDecimalCampo(itemEmDigitacao?.precoUnitario || precoPdv(produto));
    input.closest(".metric-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if(abrirEditorLancamentoMobilePdv("preco", produto)) return;
    input.focus();
    input.select();
}

// Mostra no campo de pesquisa o produto em digitação.
function editorLancamentoMobileAtivoPdv(){
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

function abrirEditorLancamentoMobilePdv(etapa, produto){
    if(!editorLancamentoMobileAtivoPdv()) return false;

    const editor = document.getElementById("editorLancamentoMobile");
    const overlay = document.getElementById("overlayEditorLancamentoMobile");
    const input = document.getElementById("editorLancamentoMobileValor");
    const etapaEl = document.getElementById("editorLancamentoMobileEtapa");
    const labelEl = document.getElementById("editorLancamentoMobileLabel");
    const produtoEl = document.getElementById("editorLancamentoMobileProduto");
    if(!editor || !overlay || !input) return false;

    const usandoPreco = etapa === "preco";
    const campoOrigem = document.getElementById(usandoPreco ? "valorUnitario" : "quantidadeItens");
    const nomeProduto = produto?.descricao || itemEmDigitacao?.produto?.descricao || "Produto selecionado";
    const titulo = usandoPreco ? "Preço unitário" : "Quantidade";

    if(etapaEl) etapaEl.textContent = titulo;
    if(labelEl) labelEl.textContent = usandoPreco ? "Informe o preço" : "Informe a quantidade";
    if(produtoEl) produtoEl.textContent = nomeProduto;
    input.value = campoOrigem?.value || (usandoPreco ? "0,00" : "1,000");
    input.inputMode = "decimal";
    editor.dataset.etapa = etapa;
    editor.classList.add("aberto");
    overlay.classList.add("ativo");
    editor.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("editor-lancamento-mobile-aberto");

    setTimeout(function(){
        input.focus();
        input.select();
    }, 80);

    return true;
}

function fecharEditorLancamentoMobilePdv(cancelar){
    const editor = document.getElementById("editorLancamentoMobile");
    const overlay = document.getElementById("overlayEditorLancamentoMobile");
    const input = document.getElementById("editorLancamentoMobileValor");

    editor?.classList.remove("aberto");
    overlay?.classList.remove("ativo");
    editor?.setAttribute("aria-hidden", "true");
    overlay?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("editor-lancamento-mobile-aberto");
    if(input) input.value = "";

    if(cancelar){
        itemEmDigitacao = null;
        quantidadePendentePesquisa = 0;
        quantidadePendenteTexto = "";
        liberarCampoMetrica("quantidadeItens", false);
        liberarCampoMetrica("valorUnitario", false);
        resetarCamposLancamento();
        definirValorCampoPdv("pesquisaProduto", "");
        ocultarSugestoesProdutos();
    }
}

function confirmarEditorLancamentoMobilePdv(){
    const editor = document.getElementById("editorLancamentoMobile");
    const input = document.getElementById("editorLancamentoMobileValor");
    const etapa = editor?.dataset.etapa || "";
    const valor = input?.value || "";

    if(etapa === "quantidade-pendente"){
        definirValorCampoPdv("quantidadeItens", valor);
        confirmarQuantidadePendente(valor);
        fecharEditorLancamentoMobilePdv(false);
        return;
    }

    if(itemEmDigitacao?.etapa === "quantidade"){
        definirValorCampoPdv("quantidadeItens", valor);
        informarQuantidadeProduto(valor);
        if(!itemEmDigitacao || itemEmDigitacao.etapa !== "preco"){
            fecharEditorLancamentoMobilePdv(false);
        }
        return;
    }

    if(itemEmDigitacao?.etapa === "preco"){
        definirValorCampoPdv("valorUnitario", valor);
        informarPrecoProduto(valor);
        fecharEditorLancamentoMobilePdv(false);
    }
}

function scannerCodigoMobileDisponivelPdv(){
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

async function abrirScannerCodigoPdv(){
    if(!scannerCodigoMobileDisponivelPdv()) return;

    const painel = document.getElementById("scannerCodigoPdv");
    const overlay = document.getElementById("overlayScannerCodigoPdv");
    const video = document.getElementById("videoScannerCodigoPdv");
    const status = document.getElementById("statusScannerCodigoPdv");
    if(!painel || !overlay || !video) return;

    if(!("BarcodeDetector" in window)){
        mostrarAvisoSistema("Leitor por camera nao disponivel neste navegador.", "aviso");
        return;
    }

    try{
        scannerCodigoDetectorPdv = scannerCodigoDetectorPdv || new BarcodeDetector({
            formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf"]
        });
        scannerCodigoStreamPdv = await navigator.mediaDevices.getUserMedia({
            video:{ facingMode:{ ideal:"environment" } },
            audio:false
        });
        video.srcObject = scannerCodigoStreamPdv;
        await video.play();
        scannerCodigoAtivoPdv = true;
        painel.classList.add("aberto");
        overlay.classList.add("ativo");
        painel.setAttribute("aria-hidden", "false");
        overlay.setAttribute("aria-hidden", "false");
        if(status) status.textContent = "Aponte a camera para o codigo de barras do produto.";
        detectarCodigoCameraPdv();
    }catch(erro){
        fecharScannerCodigoPdv();
        mostrarAvisoSistema("Nao foi possivel acessar a camera.", "erro");
    }
}

async function detectarCodigoCameraPdv(){
    const video = document.getElementById("videoScannerCodigoPdv");
    const status = document.getElementById("statusScannerCodigoPdv");
    if(!scannerCodigoAtivoPdv || !video || !scannerCodigoDetectorPdv) return;

    try{
        const codigos = await scannerCodigoDetectorPdv.detect(video);
        if(codigos.length){
            const codigo = String(codigos[0].rawValue || "").trim();
            if(codigo){
                if(status) status.textContent = "Codigo lido: " + codigo;
                processarCodigoCameraPdv(codigo);
                return;
            }
        }
    }catch(erro){}

    requestAnimationFrame(detectarCodigoCameraPdv);
}

function processarCodigoCameraPdv(codigo){
    fecharScannerCodigoPdv();
    const input = document.getElementById("pesquisaProduto");
    if(input) input.value = codigo;
    ocultarSugestoesProdutos();
    processarEntradaPDV(codigo);
    if(!itemEmDigitacao && input) input.value = "";
}

function fecharScannerCodigoPdv(){
    scannerCodigoAtivoPdv = false;
    const painel = document.getElementById("scannerCodigoPdv");
    const overlay = document.getElementById("overlayScannerCodigoPdv");
    const video = document.getElementById("videoScannerCodigoPdv");

    painel?.classList.remove("aberto");
    overlay?.classList.remove("ativo");
    painel?.setAttribute("aria-hidden", "true");
    overlay?.setAttribute("aria-hidden", "true");

    if(video){
        video.pause();
        video.srcObject = null;
    }

    if(scannerCodigoStreamPdv){
        scannerCodigoStreamPdv.getTracks().forEach(function(track){ track.stop(); });
        scannerCodigoStreamPdv = null;
    }
}

function exibirProdutoEmDigitacaoNaPesquisa(produto){
    const pesquisa = document.getElementById("pesquisaProduto");

    if(!pesquisa || !produto) return;

    pesquisa.value = produto.descricao || produto.codigo || "";
}

// Limpa os campos de lançamento após adicionar o item.
function resetarCamposLancamento(){
    definirValorCampoPdv("quantidadeItens", formatarQuantidade(1));
    definirValorCampoPdv("valorUnitario", formatarDecimalCampo(1));
}

// Abre o modal de busca rápida de preço (Ctrl).
function abrirBuscaPrecoPdv(){
    produtoBuscaPrecoPdv = null;
    definirValorCampoPdv("buscaPrecoProdutoPdv", "");
    definirValorCampoPdv("quantidadeBuscaPrecoPdv", formatarQuantidade(1));
    renderizarResumoBuscaPrecoPdv();
    abrirModalPdv("modalBuscarPrecoPdv");
    window.setTimeout(function(){
        const campo = document.getElementById("buscaPrecoProdutoPdv");
        campo?.focus();
        campo?.select();
    }, 50);
}

// Fecha o modal de busca rápida de preço.
function fecharBuscaPrecoPdv(){
    produtoBuscaPrecoPdv = null;
    fecharModaisPdv();
    prepararCampoProduto();
}

// Atualiza o produto localizado na busca rápida de preço.
function atualizarBuscaPrecoPdv(){
    const termo = normalizar(document.getElementById("buscaPrecoProdutoPdv")?.value || "");
    produtoBuscaPrecoPdv = termo ? localizarProdutoBuscaPrecoPdv(termo) : null;
    renderizarResumoBuscaPrecoPdv();
}

// Localiza o produto pelo termo digitado na busca de preço.
function localizarProdutoBuscaPrecoPdv(termo){
    const produtos = obterMercadorias().filter(function(p){ return p.ativo !== false; });
    const usarReferencia = configuracaoPermiteReferenciaPdv();
    return produtos.find(function(p){
        return normalizar(p.codigo || "") === termo || normalizar(p.ean || "") === termo || (usarReferencia && normalizar(p.referencia || "") === termo);
    }) || produtos.find(function(p){
        return normalizar(p.descricao || "").includes(termo) || normalizar(p.codigo || "").includes(termo) || normalizar(p.ean || "").includes(termo);
    }) || null;
}

// Retorna a quantidade informada na busca de preço.
function quantidadeBuscaPrecoPdv(){
    const quantidade = numeroDigitado(document.getElementById("quantidadeBuscaPrecoPdv")?.value || "1");
    return quantidade > 0 ? quantidade : 1;
}

// Renderiza o resumo do produto encontrado na busca de preço.
function renderizarResumoBuscaPrecoPdv(){
    const destino = document.getElementById("resumoBuscaPrecoPdv");
    if(!destino) return;

    if(!produtoBuscaPrecoPdv){
        destino.innerHTML = "<span>Nenhum produto selecionado.</span>";
        return;
    }

    const quantidade = normalizarQuantidadeProduto(produtoBuscaPrecoPdv, quantidadeBuscaPrecoPdv(), document.getElementById("quantidadeBuscaPrecoPdv")?.value || "1");
    const resolucao = resolverPrecoPdv(produtoBuscaPrecoPdv, quantidade);
    const preco = numero(resolucao.preco || precoPdv(produtoBuscaPrecoPdv));
    const total = quantidade * preco;
    const estoque = numero(produtoBuscaPrecoPdv.estoque || 0);

    destino.innerHTML = `
        <span>${escapar(produtoBuscaPrecoPdv.codigo || "Sem codigo")}</span>
        <strong>${escapar(produtoBuscaPrecoPdv.descricao || "Produto")}</strong>
        <div class="buscar-preco-linha"><span>Estoque</span><b>${formatarQuantidade(estoque)} ${escapar(produtoBuscaPrecoPdv.unidade || "UN")}</b></div>
        <div class="buscar-preco-linha"><span>Quantidade a inserir</span><b>${formatarQuantidade(quantidade)} ${escapar(produtoBuscaPrecoPdv.unidade || "UN")}</b></div>
        <div class="buscar-preco-linha"><span>Valor unitario</span><b>${formatarMoedaRS(preco)}</b></div>
        <div class="buscar-preco-linha buscar-preco-total"><span>Total</span><b>${formatarMoedaRS(total)}</b></div>
    `;
}

// Insere no carrinho o produto localizado na busca de preço.
function inserirProdutoBuscaPrecoPdv(){
    atualizarBuscaPrecoPdv();
    if(!produtoBuscaPrecoPdv){
        mostrarAvisoSistema("Informe um codigo ou descricao valida.", "aviso");
        document.getElementById("buscaPrecoProdutoPdv")?.focus();
        return;
    }

    const textoQuantidade = document.getElementById("quantidadeBuscaPrecoPdv")?.value || "1";
    const quantidade = normalizarQuantidadeProduto(produtoBuscaPrecoPdv, quantidadeBuscaPrecoPdv(), textoQuantidade);
    if(quantidade <= 0){
        mostrarAvisoSistema("Informe uma quantidade maior que zero.", "aviso");
        document.getElementById("quantidadeBuscaPrecoPdv")?.focus();
        return;
    }

    const resolucao = resolverPrecoPdv(produtoBuscaPrecoPdv, quantidade);
    const lancamento = {
        produto: produtoBuscaPrecoPdv,
        quantidade,
        precoUnitario: numero(resolucao.preco || precoPdv(produtoBuscaPrecoPdv)),
        tabelaAplicadaId: resolucao.tabelaId || null,
        porQuantidade: resolucao.porQuantidade === true,
        precoOriginal: resolucao.precoOriginal || numero(resolucao.preco || precoPdv(produtoBuscaPrecoPdv))
    };

    if(adicionarProdutoAoCarrinho(lancamento)){
        atualizarTela();
        fecharBuscaPrecoPdv();
    }
}

// Abre o painel lateral de pesquisa de mercadoria.
function abrirPainelPesquisaMercadoria(){
    const painel = document.getElementById("painelPesquisaMercadoria");
    if(!painel) return;
    painel.classList.add("aberto");
    painel.setAttribute("aria-hidden", "false");
    const busca = document.getElementById("buscaPesquisaMercadoria");
    if(busca){ busca.value = ""; }
    const inputQtd = document.getElementById("inputQtdPesquisa");
    if(inputQtd){ inputQtd.value = "1"; }
    renderizarListaPesquisaMercadoria("");
    setTimeout(function(){ busca?.focus(); }, 80);
}

// Fecha o painel lateral de pesquisa de mercadoria.
function fecharPainelPesquisaMercadoria(){
    const painel = document.getElementById("painelPesquisaMercadoria");
    painel?.classList.remove("aberto");
    painel?.setAttribute("aria-hidden", "true");
    pesquisaMercadoriaLista = [];
    pesquisaMercadoriaIndice = -1;
    pesquisaMercadoriaProduto = null;
    pesquisaMercadoriaRenderizados = 0;
}

// Renderiza a lista filtrada de produtos na pesquisa.
function renderizarListaPesquisaMercadoria(filtro){
    const tbody = document.getElementById("listaPesquisaMercadoria");
    if(!tbody) return;
    const wrap = document.querySelector(".pesquisa-pdv-tabela-wrap");
    if(wrap) wrap.scrollTop = 0;
    const base = obterBase();
    const todos = (base.mercadorias || []).filter(function(p){ return p.ativo !== false; });
    const termo = normalizar(filtro || "");
    pesquisaMercadoriaLista = termo
        ? todos.filter(function(p){
            return normalizar(p.descricao || "").includes(termo)
                || normalizar(p.codigo || "").includes(termo)
                || normalizar(p.ean || "").includes(termo);
        })
        : todos;
    pesquisaMercadoriaIndice = pesquisaMercadoriaLista.length > 0 ? 0 : -1;
    pesquisaMercadoriaRenderizados = Math.min(PESQUISA_MERCADORIA_INICIAL, pesquisaMercadoriaLista.length);
    tbody.innerHTML = montarLinhasPesquisaMercadoria(0, pesquisaMercadoriaRenderizados);
    atualizarSelecaoPesquisa();
}

// Monta um intervalo de linhas da lista (paginação).
function montarLinhasPesquisaMercadoria(inicio, fim){
    return pesquisaMercadoriaLista.slice(inicio, fim).map(function(p, indiceLocal){
        const indice = inicio + indiceLocal;
        const estoque = numero(p.estoque || 0);
        const estoqueClass = estoque <= 0 ? " pesquisa-estoque-zero" : "";
        return "<tr class=\"pesquisa-linha\" data-indice-pesquisa=\"" + indice + "\" data-produto-id=\"" + escapar(p.id) + "\" tabindex=\"-1\">"
            + "<td class=\"pesquisa-col-codigo\">" + escapar(p.codigo || "-") + "</td>"
            + "<td class=\"pesquisa-col-descricao\">" + escapar(p.descricao || "") + "</td>"
            + "<td class=\"pesquisa-col-r" + estoqueClass + "\">" + formatarQuantidade(estoque) + "</td>"
            + "<td class=\"pesquisa-col-r pesquisa-preco\">" + formatarMoedaRS(precoPdv(p)) + "</td>"
            + "</tr>";
    }).join("");
}

// Carrega mais itens ao rolar a lista até o fim.
function carregarMaisPesquisaMercadoriaAoRolar(){
    const wrap = document.querySelector(".pesquisa-pdv-tabela-wrap");
    if(!wrap || pesquisaMercadoriaRenderizados >= pesquisaMercadoriaLista.length) return;
    if(wrap.scrollTop + wrap.clientHeight < wrap.scrollHeight - 80) return;
    carregarMaisPesquisaMercadoria();
}

// Adiciona mais itens renderizados à lista da pesquisa.
function carregarMaisPesquisaMercadoria(){
    const tbody = document.getElementById("listaPesquisaMercadoria");
    if(!tbody || pesquisaMercadoriaRenderizados >= pesquisaMercadoriaLista.length) return;
    const inicio = pesquisaMercadoriaRenderizados;
    const fim = Math.min(inicio + PESQUISA_MERCADORIA_INCREMENTO, pesquisaMercadoriaLista.length);
    tbody.insertAdjacentHTML("beforeend", montarLinhasPesquisaMercadoria(inicio, fim));
    pesquisaMercadoriaRenderizados = fim;
    atualizarSelecaoPesquisa(false);
}

// Atualiza a linha selecionada na pesquisa de mercadoria.
function atualizarSelecaoPesquisa(rolar = true){
    const tbody = document.getElementById("listaPesquisaMercadoria");
    if(!tbody) return;
    while(pesquisaMercadoriaIndice >= pesquisaMercadoriaRenderizados && pesquisaMercadoriaRenderizados < pesquisaMercadoriaLista.length){
        carregarMaisPesquisaMercadoria();
    }
    tbody.querySelectorAll("tr.pesquisa-linha").forEach(function(tr){
        tr.classList.toggle("selecionado", Number.parseInt(tr.dataset.indicePesquisa, 10) === pesquisaMercadoriaIndice);
    });
    if(rolar && pesquisaMercadoriaIndice >= 0){
        const selecionada = tbody.querySelector(`tr.pesquisa-linha[data-indice-pesquisa="${pesquisaMercadoriaIndice}"]`);
        selecionada?.scrollIntoView({ block: "nearest" });
    }
}

// Abre o modal de quantidade ao adicionar pela pesquisa.
function abrirModalQtdPesquisa(){
    if(pesquisaMercadoriaIndice < 0 || pesquisaMercadoriaIndice >= pesquisaMercadoriaLista.length) return;
    pesquisaMercadoriaProduto = pesquisaMercadoriaLista[pesquisaMercadoriaIndice];
    const titulo = document.getElementById("pesquisaQtdTitulo");
    if(titulo) titulo.textContent = pesquisaMercadoriaProduto.descricao || "";
    const input = document.getElementById("inputQtdPesquisa");
    if(input){
        input.value = "1";
        input.step = normalizarBooleano(pesquisaMercadoriaProduto.vendaFracionada, false) ? "0.001" : "1";
    }
    const modal = document.getElementById("modalQtdPesquisa");
    modal?.classList.add("ativo");
    modal?.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function(){
        requestAnimationFrame(function(){
            input?.focus();
            input?.select();
        });
    });
}

// Fecha o modal de quantidade da pesquisa.
function fecharModalQtdPesquisa(){
    const modal = document.getElementById("modalQtdPesquisa");
    modal?.classList.remove("ativo");
    modal?.setAttribute("aria-hidden", "true");
    pesquisaMercadoriaProduto = null;
    document.getElementById("buscaPesquisaMercadoria")?.focus();
}

// Confirma a quantidade informada e adiciona o item pela pesquisa.
function confirmarQtdPesquisa(){
    if(!pesquisaMercadoriaProduto) return;
    const input = document.getElementById("inputQtdPesquisa");
    const qtd = numero(input?.value || "1") || 1;
    const lancamento = {
        produto: pesquisaMercadoriaProduto,
        quantidade: qtd,
        precoUnitario: precoPdv(pesquisaMercadoriaProduto)
    };
    fecharModalQtdPesquisa();
    adicionarProdutoAoCarrinho(lancamento);
    atualizarTela();
}
