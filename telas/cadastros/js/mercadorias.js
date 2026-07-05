const form = document.getElementById("formMercadoria");
const tabela = document.getElementById("tabelaMercadorias");
const busca = document.getElementById("buscaMercadoria");
const btnLimpar = document.getElementById("btnLimpar");
const btnExportar = document.getElementById("btnExportar");
const filtroCategoriaLista = document.getElementById("filtroCategoriaLista");
const filtroSituacaoLista = document.getElementById("filtroSituacaoLista");
const btnAplicarPreco = document.getElementById("btnAplicarPreco");
const btnAplicarTributos = document.getElementById("btnAplicarTributos");
const selecionadosMercadorias = new Set();
let tabelaPrecoEditandoId = "";
let catalogoNcm = [];
let catalogoNcmCarregado = false;
let carregandoCatalogoNcm = null;
let scannerEanProdutoStream = null;
let scannerEanProdutoDetector = null;
let scannerEanProdutoAtivo = false;

document.addEventListener("DOMContentLoaded", function() {
    form?.addEventListener("submit", salvarMercadoria);
    busca?.addEventListener("input", renderizarMercadorias);
    btnLimpar?.addEventListener("click", limparFormulario);
    btnExportar?.addEventListener("click", exportarCsv);
    filtroCategoriaLista?.addEventListener("change", renderizarMercadorias);
    filtroSituacaoLista?.addEventListener("change", renderizarMercadorias);
    btnAplicarPreco?.addEventListener("click", aplicarPrecoMassa);
    btnAplicarTributos?.addEventListener("click", aplicarTributosMassa);
    document.getElementById("btnNovoProduto")?.addEventListener("click", novoProduto);
    document.getElementById("codigo")?.addEventListener("input", function() {
        this.value = somenteNumeros(this.value);
        validarCodigoDuplicadoEmTempoReal();
    });
    document.getElementById("icmsSt")?.addEventListener("change", atualizarObrigatoriedadeCest);
    document.getElementById("btnAlterarSelecionado")?.addEventListener("click", alterarSelecionado);
    document.getElementById("btnExcluirSelecionados")?.addEventListener("click", excluirSelecionados);
    document.getElementById("btnAjusteDadosSelecionados")?.addEventListener("click", function() {
        document.getElementById("painelAjusteDados")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    document.getElementById("btnAjustePrecoSelecionados")?.addEventListener("click", function() {
        abrirSetor("precos");
    });
    document.getElementById("btnAjusteTributosSelecionados")?.addEventListener("click", function() {
        abrirSetor("tributos");
    });
    document.getElementById("btnAplicarDadosMassa")?.addEventListener("click", aplicarDadosMassa);
    document.getElementById("btnSugerirFiscalProduto")?.addEventListener("click", aplicarSugestaoFiscalProduto);
    document.getElementById("ncm")?.addEventListener("blur", sugerirFiscalPorNcm);
    document.getElementById("selecionarTodosMercadorias")?.addEventListener("change", alternarSelecaoVisivel);
    document.getElementById("btnSalvarTabelaPreco")?.addEventListener("click", salvarTabelaPreco);
    document.getElementById("grupoTributarioProduto")?.addEventListener("change", aplicarGrupoTributarioProduto);
    document.getElementById("btnScannerEanProduto")?.addEventListener("click", abrirScannerEanProduto);
    document.getElementById("overlayScannerEanProduto")?.addEventListener("click", fecharScannerEanProduto);
    document.getElementById("btnFecharScannerEanProduto")?.addEventListener("click", fecharScannerEanProduto);
    tabela?.addEventListener("change", tratarAlteracaoTabela);
    document.getElementById("listaProdutosPrecoMassa")?.addEventListener("change", tratarAlteracaoTabela);
    document.getElementById("listaProdutosTributosMassa")?.addEventListener("change", tratarAlteracaoTabela);
    tabela?.addEventListener("click", tratarCliqueTabela);
    tabela?.addEventListener("keydown", tratarTeclasTabela);
    tabela?.addEventListener("blur", tratarBlurTabela, true);
    document.querySelectorAll("[data-fechar-cadastro]").forEach(function(elemento) {
        elemento.addEventListener("click", fecharCadastroModal);
    });
    document.addEventListener("keydown", function(evento) {
        if(evento.key === "Escape"){
            if(!document.getElementById("modalPesquisaNcm")?.hidden){
                fecharPesquisaNcm();
                return;
            }
            fecharCadastroModal();
            fecharMenusProduto();
        }
    });
    document.addEventListener("click", function(evento) {
        if(!evento.target.closest(".menu-produto")){
            fecharMenusProduto();
        }
    });
    prepararCamposMonetarios();
    inicializarCamposFiscaisProduto();
    inicializarBuscaNcmProduto();

    document.querySelectorAll(".setor-tab").forEach(function(botao) {
        botao.addEventListener("click", function() {
            if(botao.hasAttribute("data-abrir-cadastro")){
                novoProduto();
                return;
            }

            if(!botao.dataset.setor) return;
            abrirSetor(botao.dataset.setor);
        });
    });

    document.querySelectorAll(".aba-cadastro").forEach(function(botao) {
        botao.addEventListener("click", function() {
            abrirAbaCadastro(botao.dataset.aba);
        });
    });

    [
        "precoCategoria",
        "precoSituacao",
        "tributoCategoria",
        "tributoSituacao"
    ].forEach(function(id) {
        document.getElementById(id)?.addEventListener("change", function() {
            atualizarPreviewsMassa();
            renderizarListasMassa();
        });
    });

    renderizarTudo();
    preencherCodigoAutomaticoSeNovo();
    aplicarRecursosConfigurados();
    abrirSetorInicial();
    carregarCadastroPelaUrl();
    inicializarCadastroProdutoSeparado();
    atualizarObrigatoriedadeCest();

    if (window.ControleSaida) ControleSaida.ativarProtecaoCadastro();
});

window.addEventListener("configuracoesSistemaAtualizadas", function() {
    aplicarRecursosConfigurados();
    inicializarCamposFiscaisProduto();
});
window.addEventListener("storage", function() {
    aplicarRecursosConfigurados();
    inicializarCamposFiscaisProduto();
});

function inicializarCamposFiscaisProduto(){
    preencherSelectFiscalProduto("origemMercadoria", "origemMercadoria", obterPadraoFiscalProduto("fiscalOrigemMercadoriaPadrao", "0"));
    preencherSelectFiscalProduto("csosn", "csosn", obterPadraoFiscalProduto("fiscalCsosnPadrao", "102"));
    preencherSelectFiscalProduto("cstIcms", "cstIcms", obterPadraoFiscalProduto("fiscalCstIcmsPadrao", "00"));
    preencherSelectFiscalProduto("cstPis", "cstPis", obterPadraoFiscalProduto("fiscalCstPisPadrao", "49"));
    preencherSelectFiscalProduto("cstIpi", "cstIpi", obterPadraoFiscalProduto("fiscalCstIpiPadrao", "99"));
    sincronizarCstCofins();
    document.getElementById("cstPis")?.addEventListener("change", sincronizarCstCofins);
    atualizarFiltroCstIcmsProduto();
}

function sincronizarCstCofins(){
    const cstCofins = document.getElementById("cstCofins");
    if(cstCofins) cstCofins.value = document.getElementById("cstPis")?.value || "";
}

function preencherSelectFiscalProduto(id, catalogoId, valorPadrao){
    const select = document.getElementById(id);
    const catalogo = window.RegrasFiscaisSistema?.situacoesTributarias?.[catalogoId] || [];

    if(!select || select.tagName !== "SELECT") return;

    const valorAtual = String(select.value || valorPadrao || "");
    select.innerHTML = catalogo.map(function(item) {
        const codigo = String(item.codigo || "");
        return `<option value="${escapar(codigo)}"${codigo === valorAtual ? " selected" : ""}>${escapar(codigo + " - " + item.descricao)}</option>`;
    }).join("");

    if(valorAtual && !catalogo.some(function(item) { return String(item.codigo || "") === valorAtual; })){
        select.insertAdjacentHTML("afterbegin", `<option value="${escapar(valorAtual)}" selected>${escapar(valorAtual)}</option>`);
    }
}

function atualizarFiltroCstIcmsProduto(){
    const regime = window.ConfiguracoesSistema?.obter?.()?.fiscalRegimeTributario || "simplesNacional";
    const usaCsosn = ["mei", "simplesNacional", "meiEmissaoFiscal"].includes(regime);
    alternarCampoProdutoFiscal("csosn", usaCsosn);
    alternarCampoProdutoFiscal("cstIcms", !usaCsosn);
    if(usaCsosn && document.getElementById("cstIcms")) document.getElementById("cstIcms").value = "";
    if(!usaCsosn && document.getElementById("csosn")) document.getElementById("csosn").value = "";
}

function alternarCampoProdutoFiscal(id, visivel){
    const campo = document.getElementById(id);
    const label = campo?.closest("label");
    if(label) label.hidden = !visivel;
    if(campo) campo.disabled = !visivel;
}

function obterValorCstIcmsProduto(){
    const regime = window.ConfiguracoesSistema?.obter?.()?.fiscalRegimeTributario || "simplesNacional";
    return ["mei", "simplesNacional", "meiEmissaoFiscal"].includes(regime) ? valorCampo("csosn") : valorCampo("cstIcms");
}

function validarCodigoDuplicadoEmTempoReal(){
    const campo = document.getElementById("codigo");
    if(!campo) return false;

    const duplicado = codigoJaExiste(campo.value, document.getElementById("mercadoriaId")?.value || "");
    definirAvisoCodigoDuplicado(duplicado);
    return duplicado;
}

function codigoJaExiste(codigo, idAtual = ""){
    const codigoNormalizado = normalizarCodigo(codigo);
    if(!codigoNormalizado) return false;

    return obterMercadorias().some(function(item) {
        return normalizarCodigo(item.codigo) === codigoNormalizado && item.id !== idAtual;
    });
}

function definirAvisoCodigoDuplicado(exibir){
    const campo = document.getElementById("codigo");
    if(!campo) return;

    let aviso = document.getElementById("avisoCodigoDuplicado");

    if(!aviso){
        aviso = document.createElement("div");
        aviso.id = "avisoCodigoDuplicado";
        aviso.className = "aviso-codigo-duplicado";
        aviso.textContent = "Codigo já existe em outro produto";
        campo.closest("label")?.appendChild(aviso);
    }

    campo.classList.toggle("campo-codigo-duplicado", exibir);
    aviso.hidden = !exibir;
}

function inicializarBuscaNcmProduto(){
    const campo = document.getElementById("ncm");
    if(!campo || campo.dataset.ncmBuscaInicializada === "true") return;

    campo.dataset.ncmBuscaInicializada = "true";
    campo.autocomplete = "off";
    campo.inputMode = "numeric";

    const wrapper = document.createElement("div");
    wrapper.className = "ncm-busca-campo";
    campo.parentNode.insertBefore(wrapper, campo);
    wrapper.appendChild(campo);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-ncm-busca";
    botao.id = "btnPesquisarNcmProduto";
    botao.setAttribute("aria-label", "Pesquisar NCM");
    botao.title = "Pesquisar NCM";
    botao.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
    wrapper.appendChild(botao);

    campo.addEventListener("input", function() {
        campo.value = campo.value.replace(/\D/g, "").slice(0, 8);
    });

    botao.addEventListener("click", abrirPesquisaNcm);
}

async function carregarCatalogoNcm(){
    if(catalogoNcmCarregado) return catalogoNcm;
    if(carregandoCatalogoNcm) return carregandoCatalogoNcm;

    carregandoCatalogoNcm = fetch("api/base/ncm.json")
        .then(function(resposta) {
            if(!resposta.ok) throw new Error("NCM indisponivel");
            return resposta.json();
        })
        .then(function(dados) {
            const lista = Array.isArray(dados?.Nomenclaturas) ? dados.Nomenclaturas : [];
            catalogoNcm = lista
                .map(function(item) {
                    const codigo = String(item.Codigo || "").replace(/\D/g, "");
                    return {
                        codigo,
                        codigoFormatado: String(item.Codigo || ""),
                        descricao: limparHtmlTexto(item.Descricao || ""),
                        dataFim: item.Data_Fim || ""
                    };
                })
                .filter(function(item) {
                    return item.codigo.length === 8 && (!item.dataFim || item.dataFim === "31/12/9999");
                });
            catalogoNcmCarregado = true;
            return catalogoNcm;
        })
        .catch(function() {
            catalogoNcm = [];
            catalogoNcmCarregado = true;
            return catalogoNcm;
        });

    return carregandoCatalogoNcm;
}

function criarModalNcm(){
    let modal = document.getElementById("modalPesquisaNcm");
    if(modal) return modal;

    modal = document.createElement("section");
    modal.id = "modalPesquisaNcm";
    modal.className = "modal-ncm";
    modal.hidden = true;
    modal.innerHTML = `
        <div class="modal-ncm-backdrop" data-fechar-ncm></div>
        <div class="modal-ncm-caixa" role="dialog" aria-modal="true" aria-labelledby="tituloModalNcm">
            <header>
                <div>
                    <span>NCM</span>
                    <h2 id="tituloModalNcm">Pesquisar NCM</h2>
                </div>
                <button type="button" class="btn-fechar-ncm" data-fechar-ncm aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
            </header>
            <div class="modal-ncm-busca">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="search" id="buscaNcmProduto" placeholder="Digite o número ou descrição do NCM">
            </div>
            <div class="modal-ncm-status" id="statusNcmProduto">Digite pelo menos 2 caracteres para pesquisar.</div>
            <div class="lista-ncm" id="listaNcmProduto"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-fechar-ncm]").forEach(function(elemento) {
        elemento.addEventListener("click", fecharPesquisaNcm);
    });
    modal.querySelector("#buscaNcmProduto")?.addEventListener("input", renderizarPesquisaNcm);

    return modal;
}

async function abrirPesquisaNcm(){
    const modal = criarModalNcm();
    const busca = modal.querySelector("#buscaNcmProduto");
    const status = modal.querySelector("#statusNcmProduto");
    const lista = modal.querySelector("#listaNcmProduto");
    const valorAtual = valorCampo("ncm");

    modal.hidden = false;
    document.body.classList.add("modal-ncm-aberto");
    if(busca) busca.value = valorAtual || "";
    if(status) status.textContent = "Carregando tabela NCM...";
    if(lista) lista.innerHTML = "";
    busca?.focus();

    await carregarCatalogoNcm();
    renderizarPesquisaNcm();
}

function fecharPesquisaNcm(){
    const modal = document.getElementById("modalPesquisaNcm");
    if(modal) modal.hidden = true;
    document.body.classList.remove("modal-ncm-aberto");
}

function renderizarPesquisaNcm(){
    const termo = document.getElementById("buscaNcmProduto")?.value || "";
    const lista = document.getElementById("listaNcmProduto");
    const status = document.getElementById("statusNcmProduto");

    if(!lista || !status) return;

    if(!catalogoNcmCarregado){
        status.textContent = "Carregando tabela NCM...";
        lista.innerHTML = "";
        return;
    }

    if(catalogoNcm.length === 0){
        status.textContent = "Tabela NCM indisponível.";
        lista.innerHTML = "";
        return;
    }

    const termoNormalizado = normalizarBuscaNcm(termo);
    const numeros = termo.replace(/\D/g, "");

    if(termoNormalizado.length < 2 && numeros.length < 2){
        status.textContent = "Digite pelo menos 2 caracteres para pesquisar.";
        lista.innerHTML = "";
        return;
    }

    const encontrados = catalogoNcm.filter(function(item) {
        return item.codigo.includes(numeros) || normalizarBuscaNcm(item.descricao).includes(termoNormalizado);
    }).slice(0, 80);

    status.textContent = encontrados.length ? `${encontrados.length} resultado(s) encontrado(s).` : "Nenhum NCM encontrado.";
    lista.innerHTML = encontrados.map(function(item) {
        return `
            <button type="button" class="item-ncm" data-ncm="${escapar(item.codigo)}">
                <strong>${escapar(formatarCodigoNcm(item.codigo))}</strong>
                <span>${escapar(item.descricao)}</span>
            </button>
        `;
    }).join("");

    lista.querySelectorAll("[data-ncm]").forEach(function(botao) {
        botao.addEventListener("click", function() {
            selecionarNcmProduto(botao.dataset.ncm);
        });
    });
}

function selecionarNcmProduto(codigo){
    const campo = document.getElementById("ncm");
    if(campo){
        campo.value = String(codigo || "").replace(/\D/g, "").slice(0, 8);
        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.focus();
    }
    fecharPesquisaNcm();
}

function scannerEanProdutoDisponivel(){
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

async function abrirScannerEanProduto(){
    if(!scannerEanProdutoDisponivel()) return;

    const scanner = document.getElementById("scannerEanProduto");
    const overlay = document.getElementById("overlayScannerEanProduto");
    const video = document.getElementById("videoScannerEanProduto");
    const status = document.getElementById("statusScannerEanProduto");

    if(!scanner || !overlay || !video) return;

    if(!("BarcodeDetector" in window)){
        if(status) status.textContent = "Leitor indisponivel neste navegador.";
        if(typeof notificar === "function") notificar("Leitor de codigo de barras indisponivel neste navegador.", "erro");
        else alert("Leitor de codigo de barras indisponivel neste navegador.");
        return;
    }

    try{
        scannerEanProdutoDetector = new BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"]
        });

        scannerEanProdutoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });

        video.srcObject = scannerEanProdutoStream;
        await video.play();

        scannerEanProdutoAtivo = true;
        document.body.classList.add("scanner-ean-produto-aberto");
        overlay.classList.add("ativo");
        scanner.classList.add("ativo");
        overlay.setAttribute("aria-hidden", "false");
        scanner.setAttribute("aria-hidden", "false");
        if(status) status.textContent = "Aponte a camera para o codigo de barras do produto.";
        detectarEanProdutoCamera();
    }catch(erro){
        fecharScannerEanProduto();
        if(typeof notificar === "function") notificar("Nao foi possivel acessar a camera.", "erro");
        else alert("Nao foi possivel acessar a camera.");
    }
}

async function detectarEanProdutoCamera(){
    const video = document.getElementById("videoScannerEanProduto");

    if(!scannerEanProdutoAtivo || !scannerEanProdutoDetector || !video) return;

    try{
        const codigos = await scannerEanProdutoDetector.detect(video);
        const codigo = codigos?.[0]?.rawValue || "";

        if(codigo){
            const campo = document.getElementById("ean");
            if(campo){
                campo.value = String(codigo).replace(/\D/g, "");
                campo.dispatchEvent(new Event("input", { bubbles: true }));
                campo.dispatchEvent(new Event("change", { bubbles: true }));
                campo.focus();
            }
            fecharScannerEanProduto();
            return;
        }
    }catch(erro){}

    if(scannerEanProdutoAtivo) requestAnimationFrame(detectarEanProdutoCamera);
}

function fecharScannerEanProduto(){
    const scanner = document.getElementById("scannerEanProduto");
    const overlay = document.getElementById("overlayScannerEanProduto");
    const video = document.getElementById("videoScannerEanProduto");

    scannerEanProdutoAtivo = false;

    if(scannerEanProdutoStream){
        scannerEanProdutoStream.getTracks().forEach(function(track) {
            track.stop();
        });
    }

    scannerEanProdutoStream = null;
    scannerEanProdutoDetector = null;

    if(video) video.srcObject = null;
    document.body.classList.remove("scanner-ean-produto-aberto");
    overlay?.classList.remove("ativo");
    scanner?.classList.remove("ativo");
    overlay?.setAttribute("aria-hidden", "true");
    scanner?.setAttribute("aria-hidden", "true");
}

function formatarCodigoNcm(codigo){
    const numeros = String(codigo || "").replace(/\D/g, "").padEnd(8, " ");
    return `${numeros.slice(0, 4)}.${numeros.slice(4, 6)}.${numeros.slice(6, 8)}`.trim();
}

function normalizarBuscaNcm(valor){
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/<[^>]*>/g, "")
        .toLowerCase()
        .trim();
}

function limparHtmlTexto(valor){
    const temporario = document.createElement("div");
    temporario.innerHTML = String(valor || "");
    return temporario.textContent.replace(/\s+/g, " ").trim();
}function obterMercadorias(){
    return obterBase().mercadorias;
}

function obterTabelasPreco(){
    return obterBase().tabelasPreco;
}

function campoProdutoExiste(id){
    return Boolean(document.getElementById(id));
}

function valorCampoProduto(id, fallback = ""){
    return campoProdutoExiste(id) ? valorCampo(id) : fallback;
}

function numeroCampoProduto(id, fallback = 0){
    return campoProdutoExiste(id) ? numero(valorCampo(id)) : numero(fallback);
}

function inteiroCampoProduto(id, fallback = 0){
    return campoProdutoExiste(id) ? (parseInt(valorCampo(id) || "0", 10) || 0) : (parseInt(fallback || "0", 10) || 0);
}

function checkCampoProduto(id, fallback = false){
    return campoProdutoExiste(id) ? document.getElementById(id).checked === true : normalizarBooleano(fallback, false);
}

function selecionarValorPreservado(id, valor){
    const campo = document.getElementById(id);
    const valorTexto = String(valor || "");

    if(!campo) return;

    if(valorTexto && campo.tagName === "SELECT" && !Array.from(campo.options).some(function(opcao) {
        return opcao.value === valorTexto;
    })){
        campo.insertAdjacentHTML("beforeend", `<option value="${escapar(valorTexto)}">${escapar(valorTexto)}</option>`);
    }

    campo.value = valorTexto;
}

function salvarMercadoria(event){
    event.preventDefault();

    const base = obterBase();
    const idAtual = document.getElementById("mercadoriaId").value;
    const mercadoriaOriginal = idAtual ? (base.mercadorias || []).find(function(item) {
        return item.id === idAtual;
    }) : null;
    const descricao = valorCampo("descricao");
    const precoVenda = numero(valorCampo("precoVenda"));
    const precoLivre = document.getElementById("precoLivre").value === "true";

    if(!descricao){
        alert("Informe a descrição da mercadoria.");
        abrirAbaCadastro("basicos");
        document.getElementById("descricao").focus();
        return;
    }

    if(!precoLivre && precoVenda <= 0){
        alert("Informe um preço de venda maior que zero.");
        abrirAbaCadastro(document.getElementById("aba-precos") ? "precos" : "basicos");
        document.getElementById("precoVenda").focus();
        return;
    }

    if(!validarDadosFiscaisMinimos()){
        return;
    }
    const codigoInformado = somenteNumeros(valorCampo("codigo"));
    const codigo = codigoInformado || gerarCodigo(base.mercadorias);

    const codigoDuplicado = codigoJaExiste(codigo, idAtual);

    if(codigoDuplicado){
        definirAvisoCodigoDuplicado(true);
        alert("Já existe uma mercadoria com esse código interno.");
        abrirAbaCadastro("basicos");
        document.getElementById("codigo").focus();
        return;
    }

    const mercadoria = {
        ...(mercadoriaOriginal || {}),
        id: idAtual || gerarId(),
        codigo,
        ean: valorCampoProduto("ean", mercadoriaOriginal?.ean || ""),
        descricao,
        descricaoReduzida: valorCampoProduto("descricaoReduzida", mercadoriaOriginal?.descricaoReduzida || ""),
        marca: valorCampoProduto("marcaSelect", mercadoriaOriginal?.marca || ""),
        grupo: valorCampoProduto("grupo", mercadoriaOriginal?.grupo || ""),
        nivel: valorCampoProduto("nivel", mercadoriaOriginal?.nivel || ""),
        fornecedor: valorCampoProduto("fornecedor", mercadoriaOriginal?.fornecedor || ""),
        referencia: valorCampoProduto("referencia", mercadoriaOriginal?.referencia || ""),
        categoria: valorCampoProduto("categoria", mercadoriaOriginal?.categoria || ""),
        unidade: valorCampoProduto("unidade", mercadoriaOriginal?.unidade || "UN"),
        pesoLiquido: numeroCampoProduto("pesoLiquido", mercadoriaOriginal?.pesoLiquido || 0),
        pesoBruto: numeroCampoProduto("pesoBruto", mercadoriaOriginal?.pesoBruto || 0),
        origemMercadoria: valorCampoProduto("origemMercadoria", mercadoriaOriginal?.origemMercadoria || mercadoriaOriginal?.origem || "0") || "0",
        estoque: numeroCampoProduto("estoque", mercadoriaOriginal?.estoque || 0),
        estoqueMinimo: numeroCampoProduto("estoqueMinimo", mercadoriaOriginal?.estoqueMinimo || 0),
        validade: valorCampoProduto("validade", mercadoriaOriginal?.validade || ""),
        lote: valorCampoProduto("lote", mercadoriaOriginal?.lote || ""),
        precoCusto: numeroCampoProduto("precoCusto", mercadoriaOriginal?.precoCusto || 0),
        precoVenda,
        precoPromocional: numeroCampoProduto("precoPromocional", mercadoriaOriginal?.precoPromocional || 0),
        tabelasPreco: document.getElementById("tabelasPrecoProduto") ? coletarTabelasPrecoProduto() : (mercadoriaOriginal?.tabelasPreco || {}),
        ativo: valorCampoProduto("ativo", String(mercadoriaOriginal?.ativo !== false)) === "true",
        precoLivre,
        vendaFracionada: valorCampoProduto("vendaFracionada", String(normalizarBooleano(mercadoriaOriginal?.vendaFracionada, false))) === "true",
        ncm: valorCampoProduto("ncm", mercadoriaOriginal?.ncm || ""),
        cest: valorCampoProduto("cest", mercadoriaOriginal?.cest || ""),
        cfop: valorCampoProduto("cfopVendaEstadual", mercadoriaOriginal?.cfopVendaEstadual || mercadoriaOriginal?.cfop || ""),
        cfopVendaEstadual: valorCampoProduto("cfopVendaEstadual", mercadoriaOriginal?.cfopVendaEstadual || mercadoriaOriginal?.cfop || ""),
        cfopVendaInterestadual: valorCampoProduto("cfopVendaInterestadual", mercadoriaOriginal?.cfopVendaInterestadual || ""),
        cfopConsumidorFinal: valorCampoProduto("cfopConsumidorFinal", mercadoriaOriginal?.cfopConsumidorFinal || mercadoriaOriginal?.cfop || ""),
        cfopDevolucao: valorCampoProduto("cfopDevolucao", mercadoriaOriginal?.cfopDevolucao || ""),
        cst: obterValorCstIcmsProduto(),
        cstIcms: valorCampoProduto("cstIcms", mercadoriaOriginal?.cstIcms || ""),
        csosn: valorCampoProduto("csosn", mercadoriaOriginal?.csosn || ""),
        cstPis: valorCampoProduto("cstPis", mercadoriaOriginal?.cstPis || ""),
        cstCofins: valorCampoProduto("cstCofins", mercadoriaOriginal?.cstCofins || ""),
        cstIpi: valorCampoProduto("cstIpi", mercadoriaOriginal?.cstIpi || ""),
        cstIbsCbs: valorCampoProduto("cstIbsCbs", mercadoriaOriginal?.cstIbsCbs || ""),
        classificacaoIbsCbs: valorCampoProduto("classificacaoIbsCbs", mercadoriaOriginal?.classificacaoIbsCbs || ""),
        ibsCbs: valorCampoProduto("cstIbsCbs", mercadoriaOriginal?.ibsCbs || mercadoriaOriginal?.cstIbsCbs || ""),
        icms: numeroCampoProduto("aliquotaIcms", mercadoriaOriginal?.aliquotaIcms ?? mercadoriaOriginal?.icms ?? 0),
        aliquotaIcms: numeroCampoProduto("aliquotaIcms", mercadoriaOriginal?.aliquotaIcms ?? mercadoriaOriginal?.icms ?? 0),
        aliquotaPis: numeroCampoProduto("aliquotaPis", mercadoriaOriginal?.aliquotaPis || 0),
        aliquotaCofins: numeroCampoProduto("aliquotaCofins", mercadoriaOriginal?.aliquotaCofins || 0),
        aliquotaIpi: numeroCampoProduto("aliquotaIpi", mercadoriaOriginal?.aliquotaIpi || 0),
        icmsSt: valorCampoProduto("icmsSt", String(normalizarBooleano(mercadoriaOriginal?.icmsSt, false))) === "true",
        monofasico: valorCampoProduto("monofasico", String(normalizarBooleano(mercadoriaOriginal?.monofasico, false))) === "true",
        codigoAnp: valorCampoProduto("codigoAnp", mercadoriaOriginal?.codigoAnp || ""),
        descricaoAnp: valorCampoProduto("descricaoAnp", mercadoriaOriginal?.descricaoAnp || ""),
        valorKgSemIcms: numeroCampoProduto("valorKgSemIcms", mercadoriaOriginal?.valorKgSemIcms || 0),
        kgUnGlp: valorCampoProduto("kgUnGlp", mercadoriaOriginal?.kgUnGlp || ""),
        percentualLp: numeroCampoProduto("percentualLp", mercadoriaOriginal?.percentualLp || 0),
        percentualNi: numeroCampoProduto("percentualNi", mercadoriaOriginal?.percentualNi || 0),
        percentualNn: numeroCampoProduto("percentualNn", mercadoriaOriginal?.percentualNn || 0),
        codif: valorCampoProduto("codif", mercadoriaOriginal?.codif || ""),
        percentualVPart: numeroCampoProduto("percentualVPart", mercadoriaOriginal?.percentualVPart || 0),
        beneficioFiscal: valorCampoProduto("beneficioFiscal", mercadoriaOriginal?.beneficioFiscal || ""),
        mvaOriginal: numeroCampoProduto("mvaOriginal", mercadoriaOriginal?.mvaOriginal || 0),
        diferimento: numeroCampoProduto("diferimento", mercadoriaOriginal?.diferimento || 0),
        naturezaReceita: valorCampoProduto("naturezaReceita", mercadoriaOriginal?.naturezaReceita || ""),
        unidadeTributavel: valorCampoProduto("unidadeTributavel", mercadoriaOriginal?.unidadeTributavel || ""),
        fatorConversao: numeroCampoProduto("fatorConversao", mercadoriaOriginal?.fatorConversao || 0),
        informacoesAdicionaisNfe: valorCampoProduto("informacoesAdicionaisNfe", mercadoriaOriginal?.informacoesAdicionaisNfe || ""),
        alterarValorQuantidadePdv: checkCampoProduto("alterarValorQuantidadePdv", mercadoriaOriginal?.alterarValorQuantidadePdv || false),
        bemMovelUsado: checkCampoProduto("bemMovelUsado", mercadoriaOriginal?.bemMovelUsado || false),
        fabricacaoPropria: checkCampoProduto("fabricacaoPropria", mercadoriaOriginal?.fabricacaoPropria || false),
        balanca: {
            ...(mercadoriaOriginal?.balanca || {}),
            ativo: campoProdutoExiste("balancaAtivo") ? document.getElementById("balancaAtivo").checked === true : normalizarBooleano(mercadoriaOriginal?.balanca?.ativo, false),
            plu: campoProdutoExiste("balancaPlu") ? (somenteNumeros(valorCampo("balancaPlu")).padStart(6, "0") || "000001") : (mercadoriaOriginal?.balanca?.plu || ""),
            tara: inteiroCampoProduto("balancaTara", mercadoriaOriginal?.balanca?.tara || 0),
            validade: inteiroCampoProduto("balancaValidade", mercadoriaOriginal?.balanca?.validade || 0),
            departamento: valorCampoProduto("balancaDepartamento", mercadoriaOriginal?.balanca?.departamento || "")
        },
        atualizadoEm: new Date().toISOString()
    };

    const indice = base.mercadorias.findIndex(function(item) {
        return item.id === mercadoria.id;
    });

    const usuarioLog = window.AuthSistema?.usuarioAtual?.() || {};
    base.logAlteracoesProdutos = Array.isArray(base.logAlteracoesProdutos) ? base.logAlteracoesProdutos : [];
    base.logAlteracoesProdutos.push({
        id: gerarId("logprod"),
        produtoId: mercadoria.id,
        produtoCodigo: mercadoria.codigo,
        produtoDescricao: mercadoria.descricao,
        tipo: indice >= 0 ? "edicao" : "criacao",
        usuarioLogin: usuarioLog.login || "-",
        usuarioNome: usuarioLog.nome || usuarioLog.login || "-",
        data: new Date().toISOString()
    });

    if(indice >= 0){
        base.mercadorias[indice] = mercadoria;
    }else{
        base.mercadorias.push(mercadoria);
    }

    salvarBase(base);
    if (window.ControleSaida) ControleSaida.marcarSalvo();
    limparFormulario();
    renderizarTudo();

    if(estaNaTelaCadastro()){
        notificar("Mercadoria salva na Base_Sistema e disponivel no Caixa PDV.", "sucesso");
        window.location.href = new URL("telas/cadastros/mercadorias.html", document.baseURI).href;
        return;
    }

    abrirSetor("lista");
    notificar("Mercadoria salva na Base_Sistema e disponível no Caixa PDV.", "sucesso");
}

function inicializarCadastroProdutoSeparado(){
    if(!estaNaTelaCadastro()) return;

    ajustarGrupoTributarioAoRegime();
    aplicarGrupoTributarioProduto({ preservarInformados: true });
    abrirAbaCadastro("basicos");

    if(document.body?.dataset.telaCadastroProduto === "true"){
        preencherCodigoAutomaticoSeNovo();
        document.getElementById("descricao")?.focus();
    }
}

function ajustarGrupoTributarioAoRegime(){
    const campo = document.getElementById("grupoTributarioProduto");
    if(!campo) return;

    const regime = window.ConfiguracoesSistema?.obter?.()?.fiscalRegimeTributario || "simplesNacional";
    const usaRegimeNormal = ["presumido", "real", "simplesExcessoSubLimite"].includes(regime);

    if(usaRegimeNormal && campo.value === "simples102"){
        campo.value = "normal00";
    }
}

function aplicarGrupoTributarioProduto(opcoes = {}){
    const grupo = document.getElementById("grupoTributarioProduto")?.value;
    if(!grupo) return;

    const preservarInformados = opcoes.preservarInformados === true;
    const grupos = {
        simples102: { csosn: "102", cstIcms: "", aliquotaIcms: "0", cstPis: "49", cstCofins: "49", cstIpi: "99", cstIbsCbs: "000", classificacaoIbsCbs: "01", icmsSt: "false" },
        simples500: { csosn: "500", cstIcms: "", aliquotaIcms: "0", cstPis: "49", cstCofins: "49", cstIpi: "99", cstIbsCbs: "000", classificacaoIbsCbs: "01", icmsSt: "true" },
        normal00: { csosn: "", cstIcms: "00", aliquotaIcms: "18", cstPis: "01", cstCofins: "01", cstIpi: "99", cstIbsCbs: "000", classificacaoIbsCbs: "01", icmsSt: "false" },
        normal40: { csosn: "", cstIcms: "40", aliquotaIcms: "0", cstPis: "07", cstCofins: "07", cstIpi: "99", cstIbsCbs: "040", classificacaoIbsCbs: "05", icmsSt: "false" }
    };
    const valores = grupos[grupo];

    if(!valores) return;

    Object.entries(valores).forEach(function([id, valor]) {
        const campo = document.getElementById(id);
        if(!campo) return;
        if(preservarInformados && String(campo.value || "").trim()) return;
        campo.value = valor;
    });

    atualizarObrigatoriedadeCest();
}

function editarMercadoria(id){
    if(!estaNaTelaCadastro()){
        window.location.href = new URL(`telas/cadastros/cadastroproduto.html?cadastro=${encodeURIComponent(id)}`, document.baseURI).href;
        return;
    }

    const item = obterMercadorias().find(function(mercadoria) {
        return mercadoria.id === id;
    });

    if(!item) return;

    document.getElementById("mercadoriaId").value = item.id;
    document.getElementById("codigo").value = somenteNumeros(item.codigo);
    definirAvisoCodigoDuplicado(false);
    document.getElementById("ean").value = item.ean || "";
    document.getElementById("descricao").value = item.descricao;
    document.getElementById("descricaoReduzida").value = item.descricaoReduzida || "";
    popularSelectsSetores();
    selecionarValorPreservado("marcaSelect", item.marca || "");
    selecionarValorPreservado("grupo", item.grupo || "");
    selecionarValorPreservado("nivel", item.nivel || "");
    document.getElementById("fornecedor").value = item.fornecedor || "";
    document.getElementById("referencia").value = item.referencia || "";
    definirValorSeExistir("categoria", item.categoria || "");
    selecionarValorPreservado("unidade", item.unidade || "UN");
    document.getElementById("pesoLiquido").value = item.pesoLiquido || "";
    document.getElementById("pesoBruto").value = item.pesoBruto || "";
    document.getElementById("origemMercadoria").value = item.origemMercadoria || item.origem || "0";
    document.getElementById("estoque").value = item.estoque || 0;
    document.getElementById("estoqueMinimo").value = item.estoqueMinimo || 0;
    document.getElementById("validade").value = item.validade || "";
    document.getElementById("lote").value = item.lote || "";
    document.getElementById("precoCusto").value = formatarDecimalCampo(item.precoCusto);
    document.getElementById("precoVenda").value = formatarDecimalCampo(item.precoVenda);
    document.getElementById("precoPromocional").value = numero(item.precoPromocional) > 0 ? formatarDecimalCampo(item.precoPromocional) : "";
    renderizarTabelasPrecoProduto(item.tabelasPreco || {});
    document.getElementById("ativo").value = String(item.ativo !== false);
    document.getElementById("precoLivre").value = String(normalizarBooleano(item.precoLivre, false));
    document.getElementById("vendaFracionada").value = String(normalizarBooleano(item.vendaFracionada, false));
    document.getElementById("ncm").value = item.ncm || "";
    document.getElementById("cest").value = item.cest || "";
    document.getElementById("cfopVendaEstadual").value = item.cfopVendaEstadual || item.cfop || "";
    document.getElementById("cfopVendaInterestadual").value = item.cfopVendaInterestadual || "";
    document.getElementById("cfopConsumidorFinal").value = item.cfopConsumidorFinal || item.cfop || "";
    document.getElementById("cfopDevolucao").value = item.cfopDevolucao || "";
    document.getElementById("cstIcms").value = item.cstIcms || "";
    document.getElementById("csosn").value = item.csosn || item.cst || "";
    document.getElementById("cstPis").value = item.cstPis || "";
    document.getElementById("cstCofins").value = item.cstCofins || "";
    definirValorSeExistir("cstIpi", item.cstIpi || obterPadraoFiscalProduto("fiscalCstIpiPadrao", "99"));
    definirValorSeExistir("cstIbsCbs", item.cstIbsCbs || item.ibsCbs || obterPadraoFiscalProduto("fiscalCstIbsCbs", "000"));
    definirValorSeExistir("classificacaoIbsCbs", item.classificacaoIbsCbs || obterPadraoFiscalProduto("fiscalClassificacaoIbsCbs", "01"));
    document.getElementById("aliquotaIcms").value = item.aliquotaIcms || item.icms || "";
    document.getElementById("aliquotaPis").value = item.aliquotaPis || "";
    document.getElementById("aliquotaCofins").value = item.aliquotaCofins || "";
    document.getElementById("aliquotaIpi").value = item.aliquotaIpi || "";
    document.getElementById("icmsSt").value = String(normalizarBooleano(item.icmsSt, false));
    document.getElementById("monofasico").value = String(normalizarBooleano(item.monofasico, false));
    definirValorSeExistir("codigoAnp", item.codigoAnp || "");
    definirValorSeExistir("descricaoAnp", item.descricaoAnp || "");
    definirValorSeExistir("valorKgSemIcms", item.valorKgSemIcms ? formatarDecimalCampo(item.valorKgSemIcms) : "");
    definirValorSeExistir("kgUnGlp", item.kgUnGlp || "");
    definirValorSeExistir("percentualLp", item.percentualLp || "");
    definirValorSeExistir("percentualNi", item.percentualNi || "");
    definirValorSeExistir("percentualNn", item.percentualNn || "");
    definirValorSeExistir("codif", item.codif || "");
    definirValorSeExistir("percentualVPart", item.percentualVPart || "");
    definirValorSeExistir("beneficioFiscal", item.beneficioFiscal || "");
    definirValorSeExistir("mvaOriginal", item.mvaOriginal || "");
    definirValorSeExistir("diferimento", item.diferimento || "");
    definirValorSeExistir("naturezaReceita", item.naturezaReceita || "");
    definirValorSeExistir("unidadeTributavel", item.unidadeTributavel || "");
    definirValorSeExistir("fatorConversao", item.fatorConversao || "");
    definirValorSeExistir("informacoesAdicionaisNfe", item.informacoesAdicionaisNfe || "");
    const elFabricacaoPropria = document.getElementById("fabricacaoPropria");
    if(elFabricacaoPropria) elFabricacaoPropria.checked = normalizarBooleano(item.fabricacaoPropria, false);
    const elAlterarValorQuantidadePdv = document.getElementById("alterarValorQuantidadePdv");
    if(elAlterarValorQuantidadePdv) elAlterarValorQuantidadePdv.checked = normalizarBooleano(item.alterarValorQuantidadePdv, false);
    const elBemMovelUsado = document.getElementById("bemMovelUsado");
    if(elBemMovelUsado) elBemMovelUsado.checked = normalizarBooleano(item.bemMovelUsado, false);
    const bal = item.balanca || {};
    const elBalAtivo = document.getElementById("balancaAtivo");
    if(elBalAtivo) elBalAtivo.checked = bal.ativo === true;
    definirValorSeExistir("balancaPlu", bal.plu || "");
    definirValorSeExistir("balancaTara", bal.tara != null ? bal.tara : "0");
    definirValorSeExistir("balancaValidade", bal.validade != null ? bal.validade : "0");
    definirValorSeExistir("balancaDepartamento", bal.departamento || "");
    atualizarObrigatoriedadeCest();
    definirTexto("statusFormulario", "Editando produto");

    abrirCadastroModal();
    abrirAbaCadastro("basicos");
}

function excluirMercadoria(id){
    if(!confirm("Deseja excluir esta mercadoria?")) return;

    const base = obterBase();
    base.mercadorias = base.mercadorias.filter(function(item) {
        return item.id !== id;
    });

    salvarBase(base);
    renderizarTudo();
}

function duplicarMercadoria(id){
    const base = obterBase();
    const original = base.mercadorias.find(function(item) {
        return item.id === id;
    });

    if(!original) return;

    const duplicado = {
        ...original,
        id: gerarId(),
        codigo: gerarCodigo(base.mercadorias),
        ean: "",
        descricao: `${original.descricao || "Produto"} - Copia`,
        atualizadoEm: new Date().toISOString()
    };

    base.mercadorias.push(duplicado);
    salvarBase(base);
    renderizarTudo();
    editarMercadoria(duplicado.id);
}

function limparFormulario(){
    form.reset();
    document.getElementById("mercadoriaId").value = "";
    document.getElementById("codigo").value = gerarCodigo(obterMercadorias());
    definirAvisoCodigoDuplicado(false);
    document.getElementById("estoque").value = "0";
    document.getElementById("estoqueMinimo").value = "0";
    document.getElementById("validade").value = "";
    document.getElementById("lote").value = "";
    document.getElementById("descricaoReduzida").value = "";
    const elMarcaL = document.getElementById("marcaSelect");
    if(elMarcaL) elMarcaL.value = "";
    const elGrupoL = document.getElementById("grupo");
    if(elGrupoL) elGrupoL.value = "";
    const elNivelL = document.getElementById("nivel");
    if(elNivelL) elNivelL.value = "";
    document.getElementById("fornecedor").value = "";
    document.getElementById("pesoLiquido").value = "";
    document.getElementById("pesoBruto").value = "";
    document.getElementById("origemMercadoria").value = "0";
    limparCamposFiscaisProduto();
    document.getElementById("precoCusto").value = "0,00";
    document.getElementById("precoVenda").value = "0,00";
    document.getElementById("precoPromocional").value = "";
    renderizarTabelasPrecoProduto({});
    document.getElementById("precoLivre").value = "false";
    document.getElementById("vendaFracionada").value = "false";
    const elBalAtivoC = document.getElementById("balancaAtivo");
    if(elBalAtivoC) elBalAtivoC.checked = false;
    definirValorSeExistir("balancaPlu", "");
    definirValorSeExistir("balancaTara", "0");
    definirValorSeExistir("balancaValidade", "0");
    definirValorSeExistir("balancaDepartamento", "");
    ajustarGrupoTributarioAoRegime();
    aplicarGrupoTributarioProduto();
    definirTexto("statusFormulario", "Novo cadastro");
}

function limparCamposFiscaisProduto(){
    [
        "ncm",
        "cest",
        "cfopVendaEstadual",
        "cfopVendaInterestadual",
        "cfopConsumidorFinal",
        "cfopDevolucao",
        "cstIcms",
        "csosn",
        "cstPis",
        "cstCofins",
        "cstIpi",
        "aliquotaIcms",
        "aliquotaPis",
        "aliquotaCofins",
        "aliquotaIpi",
        "codigoAnp",
        "percentualLp",
        "percentualNi",
        "percentualNn",
        "percentualVPart",
        "beneficioFiscal",
        "mvaOriginal",
        "diferimento",
        "naturezaReceita",
        "cstIbsCbs",
        "classificacaoIbsCbs",
        "unidadeTributavel",
        "fatorConversao"
    ].forEach(function(id) {
        const campo = document.getElementById(id);
        if(campo) campo.value = "";
    });
    document.getElementById("icmsSt").value = "false";
    document.getElementById("monofasico").value = "false";
    definirValorSeExistir("cstIbsCbs", obterPadraoFiscalProduto("fiscalCstIbsCbs", "000"));
    definirValorSeExistir("classificacaoIbsCbs", obterPadraoFiscalProduto("fiscalClassificacaoIbsCbs", "01"));
    definirValorSeExistir("cstIpi", obterPadraoFiscalProduto("fiscalCstIpiPadrao", "99"));
    atualizarObrigatoriedadeCest();
}

function aplicarSugestaoFiscalProduto(){
    if(!window.RegrasFiscaisSistema){
        alert("Regras fiscais não carregadas.");
        return;
    }

    const produto = {
        descricao: valorCampo("descricao"),
        marca: valorCampo("marcaSelect"),
        fornecedor: valorCampo("fornecedor"),
        categoria: valorCampo("categoria"),
        ncm: valorCampo("ncm"),
        cest: valorCampo("cest"),
        origemMercadoria: valorCampo("origemMercadoria")
    };
    const sugestao = window.RegrasFiscaisSistema.sugerirProduto(produto, { modelo: "nfce", consumidorFinal: true });

    if(!valorCampo("origemMercadoria")) document.getElementById("origemMercadoria").value = sugestao.origem || "0";
    document.getElementById("cfopVendaEstadual").value = sugestao.cfopVendaEstadual || sugestao.cfop || "5102";
    document.getElementById("cfopVendaInterestadual").value = sugestao.cfopVendaInterestadual || "6102";
    document.getElementById("cfopConsumidorFinal").value = sugestao.cfopConsumidorFinal || "5102";
    document.getElementById("cfopDevolucao").value = sugestao.cfopDevolucao || "1202";
    document.getElementById("cstIcms").value = sugestao.cstIcms || "";
    document.getElementById("csosn").value = sugestao.csosn || "";
    document.getElementById("cstPis").value = sugestao.cstPis || "";
    document.getElementById("cstCofins").value = sugestao.cstCofins || "";
    definirValorSeExistir("cstIpi", sugestao.cstIpi || obterPadraoFiscalProduto("fiscalCstIpiPadrao", "99"));
    definirValorSeExistir("cstIbsCbs", sugestao.cstIbsCbs || sugestao.ibsCbs || obterPadraoFiscalProduto("fiscalCstIbsCbs", "000"));
    definirValorSeExistir("classificacaoIbsCbs", sugestao.classificacaoIbsCbs || obterPadraoFiscalProduto("fiscalClassificacaoIbsCbs", "01"));
    document.getElementById("aliquotaIcms").value = sugestao.aliquotaIcms || "0";
    document.getElementById("aliquotaPis").value = sugestao.aliquotaPis || "0";
    document.getElementById("aliquotaCofins").value = sugestao.aliquotaCofins || "0";
    document.getElementById("aliquotaIpi").value = sugestao.aliquotaIpi || "0";
    document.getElementById("icmsSt").value = String(Boolean(sugestao.icmsSt));
    document.getElementById("monofasico").value = String(Boolean(sugestao.monofasico));
    atualizarObrigatoriedadeCest();
    abrirAbaCadastro("tributacoes");
}

function sugerirFiscalPorNcm(){
    const ncm = valorCampo("ncm").replace(/\D/g, "");
    if(ncm.length < 8) return;
    const idProduto = document.getElementById("idProduto")?.value || "";
    const jaTemCst = valorCampo("csosn") || valorCampo("cstIcms");
    if(idProduto && jaTemCst) return;
    aplicarSugestaoFiscalProduto();
}

function atualizarObrigatoriedadeCest(){
    const stAtivo = document.getElementById("icmsSt")?.value === "true";
    const campo = document.getElementById("campoCestFiscal");
    const input = document.getElementById("cest");

    campo?.classList.toggle("obrigatorio-nf", stAtivo);
    input?.toggleAttribute("data-obrigatorio-st", stAtivo);
}

function validarDadosFiscaisMinimos(){
    const regime = window.ConfiguracoesSistema?.obter?.()?.fiscalRegimeTributario || "simplesNacional";
    const exigeCsosn = ["mei", "simplesNacional", "meiEmissaoFiscal"].includes(regime);
    const erros = [];

    if(!valorCampo("ncm")) erros.push({ id: "ncm", texto: "Informe o NCM do produto." });
    if(!valorCampo("origemMercadoria")) erros.push({ id: "origemMercadoria", texto: "Informe a origem da mercadoria." });
    if(exigeCsosn && !valorCampo("csosn")) erros.push({ id: "csosn", texto: "Informe o CSOSN para o regime Simples/MEI." });
    if(!exigeCsosn && !valorCampo("cstIcms")) erros.push({ id: "cstIcms", texto: "Informe o CST ICMS para o regime tributário da empresa." });
    if(valorCampo("aliquotaIcms") === "") erros.push({ id: "aliquotaIcms", texto: "Informe a alíquota de ICMS, mesmo que seja 0." });
    if(!valorCampo("cstPis")) erros.push({ id: "cstPis", texto: "Informe o CST PIS." });
    if(!valorCampo("cstCofins")) erros.push({ id: "cstCofins", texto: "Informe o CST COFINS." });
    if(!valorCampo("cstIpi")) erros.push({ id: "cstIpi", texto: "Informe o CST IPI." });
    if(!valorCampo("cstIbsCbs")) erros.push({ id: "cstIbsCbs", texto: "Informe o CST IBS/CBS da Reforma Tributaria." });
    if(document.getElementById("icmsSt")?.value === "true" && !valorCampo("cest")){
        erros.push({ id: "cest", texto: "Informe o CEST para produto com Substituição Tributária." });
    }

    if(erros.length === 0) return true;

    abrirAbaCadastro("tributacoes");
    const primeiro = erros[0];
    document.getElementById(primeiro.id)?.focus();
    alert(primeiro.texto);
    return false;
}

function abrirCadastroModal(){
    if(!estaNaTelaCadastro()){
        window.location.href = new URL("telas/cadastros/mercadorias.html?cadastro=novo", document.baseURI).href;
        return;
    }

    abrirSetor("itens");
}

function fecharCadastroModal(){
    var _fechar = function () {
        if(estaNaTelaCadastro()){
            window.location.href = new URL("telas/cadastros/mercadorias.html", document.baseURI).href;
            return;
        }
        abrirSetor("lista");
    };
    if (window.ControleSaida) {
        ControleSaida.confirmarSaida(_fechar);
    } else {
        _fechar();
    }
}

function renderizarTudo(){
    atualizarCategorias();
    limparSelecaoInexistente();
    renderizarMercadorias();
    renderizarListasMassa();
    renderizarTabelasPreco();
    renderizarTabelasPrecoProduto(obterTabelasPrecoProdutoFormulario());
    atualizarPreviewsMassa();
    preencherCodigoAutomaticoSeNovo();
}

function preencherCodigoAutomaticoSeNovo(){
    const idAtual = document.getElementById("mercadoriaId")?.value || "";
    const codigo = document.getElementById("codigo");

    if(!codigo || idAtual || codigo.value.trim()){
        return;
    }

    codigo.value = gerarCodigo(obterMercadorias());
    definirAvisoCodigoDuplicado(false);
}

function renderizarMercadorias(){
    const mercadorias = obterMercadorias();
    const filtradas = obterMercadoriasFiltradas(mercadorias);

    atualizarResumo(mercadorias);
    renderizarSetores(mercadorias);
    atualizarResumoSelecao(filtradas);
    atualizarPreviewsMassa();

    if(!tabela) return;

    if(filtradas.length === 0){
        tabela.innerHTML = `<tr><td colspan="9" class="vazio">Nenhuma mercadoria encontrada.</td></tr>`;
        return;
    }

    tabela.innerHTML = filtradas.map(function(item) {
        const situacao = item.ativo === false ? "inativo" : "ativo";
        const estoqueBaixo = numero(item.estoque) <= numero(item.estoqueMinimo) && numero(item.estoqueMinimo) > 0;

        return `
            <tr class="${selecionadosMercadorias.has(item.id) ? "selecionada" : ""}" data-id="${escapar(item.id)}" tabindex="0">
                <td class="coluna-selecao">
                    <input type="checkbox" class="selecionar-mercadoria" value="${escapar(item.id)}" ${selecionadosMercadorias.has(item.id) ? "checked" : ""} aria-label="Selecionar ${escapar(item.descricao)}">
                </td>
                <td>${escapar(item.codigo)}</td>
                <td>
                    <strong>${escapar(item.descricao)}</strong>
                    <small>${escapar(item.ean || item.referencia || "")}${normalizarBooleano(item.precoLivre, false) ? " | Preço livre" : ""}</small>
                </td>
                <td><span class="tag setor">${escapar(item.categoria || "Sem setor")}</span></td>
                <td>${formatarQuantidade(item.estoque)} ${escapar(item.unidade || "UN")}${estoqueBaixo ? " - mínimo" : ""}</td>
                <td>
                    <input type="text" class="preco-rapido" data-id="${escapar(item.id)}" value="${formatarDecimalCampo(item.precoVenda)}" aria-label="Preço de venda de ${escapar(item.descricao)}">
                    <small>${numero(item.precoPromocional) > 0 ? `Promo ${formatarMoeda(item.precoPromocional)}` : "Venda"}</small>
                </td>
                <td>
                    <strong>${escapar(item.ncm || "Sem NCM")}</strong>
                    <small>CFOP ${escapar(item.cfop || "-")} | CST ${escapar(item.cst || "-")} | ICMS ${formatarPercentual(item.icms)}</small>
                </td>
                <td><span class="tag ${situacao}">${situacao === "ativo" ? "Ativo" : "Inativo"}</span></td>
                <td class="coluna-acoes-produto">
                    <div class="menu-produto">
                        <button type="button" class="btn-acoes-produto" data-menu-produto="${escapar(item.id)}" aria-label="Acoes de ${escapar(item.descricao)}">
                            <i class="fa-solid fa-pencil"></i>
                        </button>
                        <div class="menu-produto-opcoes" role="menu">
                            <button type="button" data-produto-acao="editar" data-id="${escapar(item.id)}"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
                            <button type="button" data-produto-acao="duplicar" data-id="${escapar(item.id)}"><i class="fa-solid fa-copy"></i> Duplicar</button>
                            <button type="button" class="perigo" data-produto-acao="deletar" data-id="${escapar(item.id)}"><i class="fa-solid fa-trash"></i> Deletar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function atualizarResumo(mercadorias){
    const totalEstoque = mercadorias.reduce(function(total, item) {
        return total + numero(item.estoque);
    }, 0);
    const totalCusto = mercadorias.reduce(function(total, item) {
        return total + (numero(item.estoque) * numero(item.precoCusto));
    }, 0);
    const totalVenda = mercadorias.reduce(function(total, item) {
        return total + (numero(item.estoque) * precoPdv(item));
    }, 0);

    definirTexto("contadorMercadorias", `${mercadorias.length} ${mercadorias.length === 1 ? "mercadoria" : "mercadorias"}`);
    definirTexto("totalProdutos", mercadorias.length);
    definirTexto("totalEstoque", formatarQuantidade(totalEstoque));
    definirTexto("totalVendaEstoque", formatarMoedaRS(totalVenda));
    definirTexto("totalInvestido", formatarMoedaRS(totalCusto));
}

function obterMercadoriasFiltradas(mercadorias = obterMercadorias()){
    const termo = normalizar(busca?.value || "");
    const categoriaFiltro = filtroCategoriaLista?.value || "";
    const situacaoFiltro = filtroSituacaoLista?.value || "";

    return mercadorias.filter(function(item) {
        const texto = [
            item.codigo,
            item.ean,
            item.descricao,
            item.referencia,
            item.categoria,
            item.ncm,
            item.cfop,
            item.cst
        ].join(" ");
        const correspondeBusca = normalizar(texto).includes(termo);
        const correspondeCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
        const correspondeSituacao = !situacaoFiltro ||
            (situacaoFiltro === "ativo" && item.ativo !== false) ||
            (situacaoFiltro === "inativo" && item.ativo === false);

        return correspondeBusca && correspondeCategoria && correspondeSituacao;
    });
}

function atualizarResumoSelecao(visiveis = obterMercadoriasFiltradas()){
    limparSelecaoInexistente();
    definirTexto("totalSelecionadosMercadorias", `${selecionadosMercadorias.size} selecionado${selecionadosMercadorias.size === 1 ? "" : "s"}`);

    const selecionarTodos = document.getElementById("selecionarTodosMercadorias");

    if(selecionarTodos){
        const idsVisiveis = visiveis.map(function(item) { return item.id; });
        const marcados = idsVisiveis.filter(function(id) { return selecionadosMercadorias.has(id); }).length;
        selecionarTodos.checked = idsVisiveis.length > 0 && marcados === idsVisiveis.length;
        selecionarTodos.indeterminate = marcados > 0 && marcados < idsVisiveis.length;
    }
}

function limparSelecaoInexistente(){
    const ids = new Set(obterMercadorias().map(function(item) { return item.id; }));

    [...selecionadosMercadorias].forEach(function(id) {
        if(!ids.has(id)){
            selecionadosMercadorias.delete(id);
        }
    });
}

function tratarAlteracaoTabela(evento){
    const checkbox = evento.target.closest(".selecionar-mercadoria");

    if(!checkbox) return;

    if(checkbox.checked){
        selecionadosMercadorias.add(checkbox.value);
    }else{
        selecionadosMercadorias.delete(checkbox.value);
    }

    renderizarTudo();
}

function alternarSelecaoVisivel(evento){
    const visiveis = obterMercadoriasFiltradas();

    visiveis.forEach(function(item) {
        if(evento.target.checked){
            selecionadosMercadorias.add(item.id);
        }else{
            selecionadosMercadorias.delete(item.id);
        }
    });

    renderizarTudo();
}

function obterProdutosSelecionados(base = obterBase()){
    return base.mercadorias.filter(function(item) {
        return selecionadosMercadorias.has(item.id);
    });
}

function novoProduto(){
    if(!estaNaTelaCadastro()){
        window.location.href = new URL("telas/cadastros/cadastroproduto.html?cadastro=novo", document.baseURI).href;
        return;
    }

    limparFormulario();
    abrirCadastroModal();
    abrirAbaCadastro("basicos");
    document.getElementById("descricao")?.focus();
}

function alterarSelecionado(){
    if(selecionadosMercadorias.size !== 1){
        alert("Selecione exatamente um produto para alterar.");
        return;
    }

    editarMercadoria([...selecionadosMercadorias][0]);
}

function excluirSelecionados(){
    if(selecionadosMercadorias.size === 0){
        alert("Selecione ao menos um produto para deletar.");
        return;
    }

    if(!confirm(`Deseja excluir ${selecionadosMercadorias.size} produto(s) selecionado(s)?`)){
        return;
    }

    const base = obterBase();
    base.mercadorias = base.mercadorias.filter(function(item) {
        return !selecionadosMercadorias.has(item.id);
    });
    selecionadosMercadorias.clear();
    salvarBase(base);
    renderizarTudo();
}

function aplicarDadosMassa(){
    const base = obterBase();
    const produtos = obterProdutosSelecionados(base);

    if(produtos.length === 0){
        alert("Selecione produtos na lista para aplicar ajuste de dados.");
        return;
    }

    const categoria = valorCampo("dadosCategoriaMassa");
    const situacao = valorCampo("dadosSituacaoMassa");
    const precoLivre = valorCampo("dadosPrecoLivreMassa");
    const vendaFracionada = valorCampo("dadosVendaFracionadaMassa");
    const estoqueMinimoTexto = valorCampo("dadosEstoqueMinimoMassa");
    const possuiAlteracao = categoria || situacao || precoLivre || vendaFracionada || estoqueMinimoTexto;

    if(!possuiAlteracao){
        alert("Informe ao menos um dado para alterar.");
        return;
    }

    if(!confirm(`Aplicar ajuste de dados em ${produtos.length} produto(s)?`)){
        return;
    }

    produtos.forEach(function(item) {
        if(categoria) item.categoria = categoria;
        if(situacao) item.ativo = situacao === "ativo";
        if(precoLivre) item.precoLivre = precoLivre === "true";
        if(vendaFracionada) item.vendaFracionada = vendaFracionada === "true";
        if(estoqueMinimoTexto) item.estoqueMinimo = numero(estoqueMinimoTexto);
        item.atualizadoEm = new Date().toISOString();
    });

    salvarBase(base);
    renderizarTudo();
    notificar("Ajuste de dados aplicado.", "sucesso");
}

function tratarTeclasTabela(evento){
    if(evento.target.closest("tr[data-id]") && evento.key === "Enter" && !evento.target.classList.contains("preco-rapido")){
        editarMercadoria(evento.target.closest("tr[data-id]").dataset.id);
        return;
    }

    if(!evento.target.classList.contains("preco-rapido") || evento.key !== "Enter") return;

    evento.preventDefault();
    salvarPrecoRapido(evento.target);
    evento.target.blur();
}

function tratarCliqueTabela(evento){
    const botaoMenu = evento.target.closest("[data-menu-produto]");

    if(botaoMenu){
        evento.stopPropagation();
        alternarMenuProduto(botaoMenu);
        return;
    }

    const acaoProduto = evento.target.closest("[data-produto-acao]");

    if(acaoProduto){
        evento.stopPropagation();
        executarAcaoProduto(acaoProduto.dataset.produtoAcao, acaoProduto.dataset.id);
        return;
    }

    if(evento.target.closest("input, button, select, a")) return;

    const linha = evento.target.closest("tr[data-id]");

    if(linha){
        editarMercadoria(linha.dataset.id);
    }
}

function tratarBlurTabela(evento){
    if(!evento.target.classList.contains("preco-rapido")) return;

    salvarPrecoRapido(evento.target);
}

function salvarPrecoRapido(campo){
    const id = campo.dataset.id;
    const base = obterBase();
    const produto = base.mercadorias.find(function(item) {
        return item.id === id;
    });

    if(!produto) return;

    const novoPreco = numero(campo.value);

    if(novoPreco < 0){
        alert("Informe um preço válido.");
        campo.value = formatarDecimalCampo(produto.precoVenda);
        return;
    }

    if(numero(produto.precoVenda) === novoPreco){
        campo.value = formatarDecimalCampo(novoPreco);
        return;
    }

    produto.precoVenda = arredondarMoeda(novoPreco);
    produto.atualizadoEm = new Date().toISOString();
    salvarBase(base);
    campo.value = formatarDecimalCampo(produto.precoVenda);
    renderizarTudo();
}

function salvarTabelaPreco(){
    const base = obterBase();
    const nome = valorCampo("nomeTabelaPreco");
    const ativa = document.getElementById("ativoTabelaPreco")?.value !== "false";

    if(!nome){
        alert("Informe o nome da tabela de preço.");
        document.getElementById("nomeTabelaPreco")?.focus();
        return;
    }

    const duplicada = base.tabelasPreco.some(function(tabela) {
        return normalizar(tabela.nome) === normalizar(nome) && tabela.id !== tabelaPrecoEditandoId;
    });

    if(duplicada){
        alert("Já existe uma tabela de preço com esse nome.");
        return;
    }

    if(tabelaPrecoEditandoId){
        const tabela = base.tabelasPreco.find(function(item) {
            return item.id === tabelaPrecoEditandoId;
        });

        if(tabela){
            tabela.nome = nome;
            tabela.ativa = ativa;
            tabela.atualizadoEm = new Date().toISOString();
        }
    }else{
        base.tabelasPreco.push({
            id: gerarId(),
            nome,
            ativa,
            criadoEm: new Date().toISOString()
        });
    }

    tabelaPrecoEditandoId = "";
    document.getElementById("nomeTabelaPreco").value = "";
    document.getElementById("ativoTabelaPreco").value = "true";
    document.getElementById("btnSalvarTabelaPreco").textContent = "Cadastrar tabela";
    salvarBase(base);
    renderizarTudo();
}

function editarTabelaPreco(id){
    const tabela = obterTabelasPreco().find(function(item) {
        return item.id === id;
    });

    if(!tabela) return;

    tabelaPrecoEditandoId = tabela.id;
    document.getElementById("nomeTabelaPreco").value = tabela.nome || "";
    document.getElementById("ativoTabelaPreco").value = tabela.ativa === false ? "false" : "true";
    document.getElementById("btnSalvarTabelaPreco").textContent = "Salvar tabela";
    document.getElementById("nomeTabelaPreco")?.focus();
}

function excluirTabelaPreco(id){
    if(!confirm("Deseja excluir esta tabela de preço? Ela será removida também dos produtos.")){
        return;
    }

    const base = obterBase();
    base.tabelasPreco = base.tabelasPreco.filter(function(tabela) {
        return tabela.id !== id;
    });
    base.mercadorias.forEach(function(produto) {
        if(produto.tabelasPreco && typeof produto.tabelasPreco === "object"){
            delete produto.tabelasPreco[id];
        }
    });
    salvarBase(base);
    renderizarTudo();
}

function renderizarTabelasPreco(){
    const destino = document.getElementById("listaTabelasPreco");
    const tabelas = obterTabelasPreco();

    definirTexto("contadorTabelasPreco", `${tabelas.length} tabela${tabelas.length === 1 ? "" : "s"}`);

    if(!destino) return;

    if(tabelas.length === 0){
        destino.innerHTML = `<div class="vazio-mini">Nenhuma tabela de preço cadastrada.</div>`;
        return;
    }

    destino.innerHTML = tabelas.map(function(tabela) {
        return `
            <div class="tabela-preco-linha">
                <div>
                    <strong>${escapar(tabela.nome)}</strong>
                    <span>${tabela.ativa === false ? "Inativa" : "Ativa"}</span>
                </div>
                <div class="acoes-tabela-preco">
                    <button type="button" class="acao" onclick="editarTabelaPreco('${tabela.id}')">Editar</button>
                    <button type="button" class="acao excluir" onclick="excluirTabelaPreco('${tabela.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderizarTabelasPrecoProduto(valoresProduto = {}){
    const destino = document.getElementById("tabelasPrecoProduto");
    const tabelas = obterTabelasPreco();

    if(!destino) return;

    if(tabelas.length === 0){
        destino.innerHTML = `<div class="vazio-mini">Nenhuma tabela de preço cadastrada.</div>`;
        return;
    }

    destino.innerHTML = tabelas.map(function(tabela) {
        const configuracao = valoresProduto[tabela.id] || {};
        const ativa = normalizarBooleano(configuracao.ativa, false);
        const preco = numero(configuracao.preco);

        return `
            <div class="tabela-produto-linha">
                <label class="check-tabela-produto">
                    <input type="checkbox" data-tabela-preco-ativo="${escapar(tabela.id)}" ${ativa ? "checked" : ""}>
                    ${escapar(tabela.nome)}
                </label>
                <input type="text" data-tabela-preco-valor="${escapar(tabela.id)}" inputmode="decimal" value="${preco > 0 ? formatarDecimalCampo(preco) : ""}" placeholder="0,00">
            </div>
        `;
    }).join("");
}

function obterTabelasPrecoProdutoFormulario(){
    const valores = {};

    document.querySelectorAll("[data-tabela-preco-ativo]").forEach(function(checkbox) {
        const id = checkbox.dataset.tabelaPrecoAtivo;
        const campoPreco = document.querySelector(`[data-tabela-preco-valor="${CSS.escape(id)}"]`);
        const preco = numero(campoPreco?.value || "");

        if(checkbox.checked || preco > 0){
            valores[id] = {
                ativa: checkbox.checked,
                preco
            };
        }
    });

    return valores;
}

function coletarTabelasPrecoProduto(){
    return obterTabelasPrecoProdutoFormulario();
}

function renderizarSetores(mercadorias){
    const destino = document.getElementById("listaSetores");

    if(!destino) return;

    const mapa = new Map();
    mercadorias.forEach(function(item) {
        const categoria = item.categoria || "Sem setor";
        const atual = mapa.get(categoria) || { produtos: 0, estoque: 0 };
        atual.produtos += 1;
        atual.estoque += numero(item.estoque);
        mapa.set(categoria, atual);
    });

    if(mapa.size === 0){
        destino.innerHTML = `<div class="vazio-mini">Nenhum setor cadastrado.</div>`;
        return;
    }

    destino.innerHTML = [...mapa.entries()].map(function([categoria, dados]) {
        return `
            <div class="setor-linha">
                <strong>${escapar(categoria)}</strong>
                <span>${dados.produtos} produto(s) | ${formatarQuantidade(dados.estoque)} em estoque</span>
            </div>
        `;
    }).join("");
}

function popularSelectsSetores(){
    const base = obterBase();
    function popularSelect(id, lista, valorAtual){
        const el = document.getElementById(id);
        if(!el) return;
        const ativos = (lista || []).filter(function(r){ return r.ativo !== "inativo"; })
            .sort(function(a, b){ return (a.nome || "").localeCompare(b.nome || "", "pt-BR"); });
        el.innerHTML = '<option value="">— Selecione —</option>'
            + ativos.map(function(r){ return '<option value="' + escapar(r.nome) + '">' + escapar(r.nome) + '</option>'; }).join("");
        if(valorAtual !== undefined) el.value = valorAtual;
    }
    popularSelect("grupo",       base.grupos,  undefined);
    popularSelect("marcaSelect", base.marcas,  undefined);
    popularSelect("nivel",       base.niveis,  undefined);
}

function atualizarCategorias(){
    popularSelectsSetores();
    const categoriasExistentes = obterCategorias(obterMercadorias());
    const gruposCadastrados = (obterBase().grupos || [])
        .filter(function(g){ return g.ativo !== "inativo"; })
        .map(function(g){ return g.nome; });
    const categorias = [...new Set([...gruposCadastrados, ...categoriasExistentes])]
        .sort(function(a, b){ return a.localeCompare(b, "pt-BR"); });

    const selects = [
        filtroCategoriaLista,
        document.getElementById("precoCategoria"),
        document.getElementById("tributoCategoria")
    ];
    const datalist = document.getElementById("listaCategorias");

    selects.forEach(function(select) {
        if(!select) return;

        const valorAtual = select.value;
        const primeiraOpcao = select.querySelector("option")?.outerHTML || `<option value="">Todos os setores</option>`;
        select.innerHTML = primeiraOpcao + categorias.map(function(categoria) {
            return `<option value="${escapar(categoria)}">${escapar(categoria)}</option>`;
        }).join("");
        select.value = categorias.includes(valorAtual) ? valorAtual : "";
    });

    if(datalist){
        datalist.innerHTML = categorias.map(function(categoria) {
            return `<option value="${escapar(categoria)}"></option>`;
        }).join("");
    }
}

function aplicarPrecoMassa(){
    const base = obterBase();
    const produtos = obterProdutosSelecionados(base);
    const campo = document.getElementById("precoCampo").value;
    const tipo = document.getElementById("precoTipo").value;
    const valor = numero(valorCampo("precoValor"));

    if(produtos.length === 0){
        alert("Selecione os produtos que deseja ajustar.");
        return;
    }

    if(valor === 0 && tipo !== "definir"){
        alert("Informe um valor diferente de zero para o ajuste.");
        return;
    }

    if(!confirm(`Aplicar ajuste de preço em ${produtos.length} produto(s)?`)){
        return;
    }

    produtos.forEach(function(item) {
        const precoAtual = numero(item[campo]);

        if(tipo === "percentual"){
            item[campo] = arredondarMoeda(precoAtual + (precoAtual * valor / 100));
        }

        if(tipo === "valor"){
            item[campo] = arredondarMoeda(Math.max(0, precoAtual + valor));
        }

        if(tipo === "definir"){
            item[campo] = arredondarMoeda(Math.max(0, valor));
        }

        item.atualizadoEm = new Date().toISOString();
    });

    salvarBase(base);
    renderizarTudo();
    notificar("Ajuste de preço aplicado com sucesso.", "sucesso");
}

function aplicarTributosMassa(){
    const base = obterBase();
    const produtos = obterProdutosSelecionados(base);
    const campos = {
        ncm: valorCampo("tributoNcm"),
        cest: valorCampo("tributoCest"),
        cfop: valorCampo("tributoCfop"),
        cst: valorCampo("tributoCst"),
        icms: valorCampo("tributoIcms")
    };
    const possuiAlteracao = Object.values(campos).some(function(valor) {
        return valor !== "";
    });

    if(produtos.length === 0){
        alert("Selecione os produtos que deseja ajustar.");
        return;
    }

    if(!possuiAlteracao){
        alert("Informe ao menos um campo fiscal para alterar.");
        return;
    }

    if(!confirm(`Aplicar ajuste tributário em ${produtos.length} produto(s)?`)){
        return;
    }

    produtos.forEach(function(item) {
        if(campos.ncm !== "") item.ncm = campos.ncm;
        if(campos.cest !== "") item.cest = campos.cest;
        if(campos.cfop !== "") item.cfop = campos.cfop;
        if(campos.cst !== "") item.cst = campos.cst;
        if(campos.icms !== "") item.icms = numero(campos.icms);
        item.atualizadoEm = new Date().toISOString();
    });

    salvarBase(base);
    renderizarTudo();
    notificar("Ajuste de tributos aplicado com sucesso.", "sucesso");
}

function filtrarParaMassa(mercadorias, tipo){
    const categoria = document.getElementById(tipo === "preco" ? "precoCategoria" : "tributoCategoria")?.value || "";
    const situacao = document.getElementById(tipo === "preco" ? "precoSituacao" : "tributoSituacao")?.value || "";

    return mercadorias.filter(function(item) {
        const correspondeCategoria = !categoria || item.categoria === categoria;
        const correspondeSituacao = !situacao ||
            (situacao === "ativo" && item.ativo !== false) ||
            (situacao === "inativo" && item.ativo === false);

        return correspondeCategoria && correspondeSituacao;
    });
}

function renderizarListasMassa(){
    renderizarListaMassa("listaProdutosPrecoMassa", "preco");
    renderizarListaMassa("listaProdutosTributosMassa", "tributo");
}

function renderizarListaMassa(idContainer, tipo){
    const container = document.getElementById(idContainer);

    if(!container) return;

    const produtos = filtrarParaMassa(obterMercadorias(), tipo);

    if(produtos.length === 0){
        container.innerHTML = `<div class="vazio-mini">Nenhum produto encontrado para os filtros.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="lista-massa-topo">
            <strong>Produtos para ajuste</strong>
            <span>Selecione os itens que receberão a alteração</span>
        </div>
        <div class="tabela-wrap tabela-massa-wrap">
            <table class="tabela-massa">
                <thead>
                    <tr>
                        <th class="coluna-selecao"></th>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Setor</th>
                        <th>Preço</th>
                        <th>Tributos</th>
                    </tr>
                </thead>
                <tbody>
                    ${produtos.map(function(item) {
                        return `
                            <tr class="${selecionadosMercadorias.has(item.id) ? "selecionada" : ""}">
                                <td class="coluna-selecao">
                                    <input type="checkbox" class="selecionar-mercadoria" value="${escapar(item.id)}" ${selecionadosMercadorias.has(item.id) ? "checked" : ""} aria-label="Selecionar ${escapar(item.descricao)}">
                                </td>
                                <td>${escapar(item.codigo)}</td>
                                <td><strong>${escapar(item.descricao)}</strong><small>${escapar(item.ean || item.referencia || "")}</small></td>
                                <td><span class="tag setor">${escapar(item.categoria || "Sem setor")}</span></td>
                                <td>${formatarMoeda(item.precoVenda)}</td>
                                <td><strong>${escapar(item.ncm || "Sem NCM")}</strong><small>CFOP ${escapar(item.cfop || "-")} | CST ${escapar(item.cst || "-")}</small></td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function atualizarPreviewsMassa(){
    const mercadorias = obterMercadorias();
    const selecionados = selecionadosMercadorias.size;

    definirTexto("previewPrecoMassa", selecionados > 0 ? `${selecionados} selecionado(s)` : `${filtrarParaMassa(mercadorias, "preco").length} disponíveis`);
    definirTexto("previewTributos", selecionados > 0 ? `${selecionados} selecionado(s)` : `${filtrarParaMassa(mercadorias, "tributo").length} disponíveis`);
}

function exportarCsv(){
    const mercadorias = obterMercadorias();

    if(mercadorias.length === 0){
        alert("Não há mercadorias para exportar.");
        return;
    }

    const colunas = [
        "codigo",
        "ean",
        "descricao",
        "referencia",
        "categoria",
        "unidade",
        "estoque",
        "estoqueMinimo",
        "validade",
        "lote",
        "precoCusto",
        "precoVenda",
        "precoPromocional",
        "ativo",
        "precoLivre",
        "vendaFracionada",
        "ncm",
        "cest",
        "cfop",
        "cst",
        "icms",
        "codigoAnp",
        "percentualLp",
        "percentualNi",
        "percentualNn",
        "percentualVPart",
        "beneficioFiscal",
        "mvaOriginal",
        "diferimento",
        "naturezaReceita",
        "cstIbsCbs",
        "classificacaoIbsCbs",
        "unidadeTributavel",
        "fatorConversao"
    ];

    const linhas = [
        colunas.join(";"),
        ...mercadorias.map(function(item) {
            return colunas.map(function(coluna) {
                return `"${String(item[coluna] ?? "").replaceAll('"', '""')}"`;
            }).join(";");
        })
    ];

    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "base_sistema_mercadorias.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function aplicarRecursosConfigurados(){
    const configuracoes = window.ConfiguracoesSistema?.obter?.() || {};

    document.querySelectorAll("[data-config-recurso]").forEach(function(elemento) {
        const recurso = elemento.dataset.configRecurso;
        const ativo = configuracoes[recurso] !== false;
        elemento.classList.toggle("recurso-desativado", !ativo);
    });

    document.querySelectorAll("[data-config-recurso] input, [data-config-recurso] select, [data-config-recurso] textarea").forEach(function(campo) {
        const recurso = campo.closest("[data-config-recurso]")?.dataset.configRecurso;
        campo.disabled = configuracoes[recurso] === false;
    });
}

function abrirSetor(setor){
    document.querySelectorAll(".setor-tab").forEach(function(botao) {
        const ativo = botao.dataset.setor === setor || (setor === "itens" && botao.hasAttribute("data-abrir-cadastro"));
        botao.classList.toggle("ativo", ativo);
    });

    document.querySelectorAll(".setor-view").forEach(function(view) {
        const ativo = view.id === `setor-${setor}`;
        view.classList.toggle("ativo", ativo);
        view.setAttribute("aria-hidden", String(!ativo));
    });
}

function abrirSetorInicial(){
    const params = new URLSearchParams(window.location.search);
    const cadastro = params.get("cadastro");
    const aba = params.get("aba");
    const abasValidas = ["lista", "itens", "precos", "tributos", "tabelas"];

    if(cadastro){
        abrirSetor("itens");
        return;
    }

    abrirSetor(abasValidas.includes(aba) ? aba : "lista");
}

function carregarCadastroPelaUrl(){
    const params = new URLSearchParams(window.location.search);
    const cadastro = params.get("cadastro");

    if(!cadastro) return;

    if(cadastro === "novo"){
        limparFormulario();
        abrirAbaCadastro("basicos");
        document.getElementById("descricao")?.focus();
        return;
    }

    editarMercadoria(cadastro);
}

function estaNaTelaCadastro(){
    return Boolean(new URLSearchParams(window.location.search).get("cadastro")) ||
        document.body?.dataset.telaCadastroProduto === "true";
}

function abrirAbaCadastro(aba){
    document.querySelectorAll(".aba-cadastro").forEach(function(botao) {
        botao.classList.toggle("ativa", botao.dataset.aba === aba);
    });

    document.querySelectorAll(".conteudo-aba").forEach(function(view) {
        view.classList.toggle("ativa", view.id === `aba-${aba}`);
    });
}

function gerarCodigo(mercadorias){
    const usados = new Set((mercadorias || []).map(function(item) {
        const numeroCodigo = Number.parseInt(somenteNumeros(item.codigo), 10);
        return Number.isFinite(numeroCodigo) && numeroCodigo > 0 ? numeroCodigo : null;
    }).filter(Boolean));
    let proximo = 1;

    while(usados.has(proximo)){
        proximo += 1;
    }

    return String(proximo);
}

function normalizarCodigo(valor){
    return somenteNumeros(valor);
}

function somenteNumeros(valor){
    return String(valor || "").replace(/\D/g, "");
}

function precoPdv(item){
    return numero(item.precoPromocional) > 0 ? numero(item.precoPromocional) : numero(item.precoVenda);
}function arredondarMoeda(valor){
    return Math.round(numero(valor) * 100) / 100;
}
function alternarMenuProduto(botao){
    const menu = botao.closest(".menu-produto");
    const aberto = menu?.classList.contains("aberto");

    fecharMenusProduto();

    if(menu && !aberto){
        menu.classList.add("aberto");
    }
}

function fecharMenusProduto(){
    document.querySelectorAll(".menu-produto.aberto").forEach(function(menu) {
        menu.classList.remove("aberto");
    });
}

function executarAcaoProduto(acao, id){
    fecharMenusProduto();

    if(acao === "editar"){
        editarMercadoria(id);
        return;
    }

    if(acao === "deletar"){
        excluirMercadoria(id);
        return;
    }

    if(acao === "duplicar"){
        duplicarMercadoria(id);
    }
}

function obterPadraoFiscalProduto(chave, fallback = ""){
    const configuracoes = window.ConfiguracoesSistema?.obter?.() || {};
    const padrao = window.ConfiguracoesSistema?.padrao || {};

    return configuracoes[chave] ?? padrao[chave] ?? fallback;
}

function prepararCamposMonetarios(){
    ["precoCusto", "precoVenda", "precoPromocional"].forEach(function(id) {
        const campo = document.getElementById(id);
        if(!campo) return;
        if(typeof mascaraMoedaInput === "function") mascaraMoedaInput(campo);
        else campo.addEventListener("blur", function() {
            if(campo.value.trim() === "" && id === "precoPromocional") return;
            campo.value = formatarDecimalCampo(campo.value);
        });
    });
}function obterCategorias(mercadorias){
    return [...new Set(mercadorias.map(function(item) {
        return item.categoria || "Sem setor";
    }))].sort(function(a, b) {
        return a.localeCompare(b, "pt-BR");
    });
}function formatarPercentual(valor){
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "%";
}
