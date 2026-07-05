(function(){
    const frame = document.getElementById("frameSistema");
    const shell = document.querySelector(".sistema-frame-shell");
    const paginasForaDaCasca = ["index.html", "telas/pdv/pdv.html", "telas/shell/sistema.html"];
    const telaPadrao = "telas/acesso/principal.html";
    const REGEX_TELA_VALIDA = /^telas\/[^\/]+\/[^\/]+\.html$/i;
    const TIMEOUT_CARREGAMENTO_MS = 15000;

    // Telas cuja existência já foi confirmada nesta sessão (evita checar de novo a cada clique).
    const telasVerificadas = new Set();
    let erroOverlay = null;
    let requisicaoAtual = 0;
    let timeoutCarregamentoAtual = null;
    let inicioCarregamentoAtual = 0;
    let telaCarregandoAtual = "";
    // Só true entre o instante em que atribuímos frame.src e o "load" correspondente.
    // Evita tratar o "load" inicial do iframe vazio (about:blank) como se fosse a tela real.
    let aguardandoCargaReal = false;
    // Tela+hash que está de fato carregada e confirmada no iframe agora.
    let telaAtivaConfirmada = "";

    document.addEventListener("DOMContentLoaded", function() {
        if(!frame) return;

        configurarMenu();
        carregarTela(telaInicial(), false);

        frame.addEventListener("load", function() {
            // Só trata como "conclusão da navegação que pedimos" quando fomos nós que
            // disparamos o frame.src (evita reagir ao load inicial do iframe vazio).
            // sincronizarUrlComFrame() continua rodando sempre: uma tela pode navegar o
            // iframe por conta própria (link interno) e a URL/menu externos têm que refletir isso.
            if(aguardandoCargaReal){
                aguardandoCargaReal = false;
                finalizarCarregamento(true);
            }
            sincronizarUrlComFrame();
        });

        window.addEventListener("popstate", function(evento) {
            carregarTela(evento.state?.tela || telaInicial(), false);
        });
    });

    function configurarMenu(){
        document.addEventListener("click", function(evento) {
            const link = evento.target.closest(".menu-superior-sistema a[href]");
            if(!link || link.hasAttribute("data-logout")) return;

            const tela = normalizarTela(link.getAttribute("href"));
            if(!tela) return;

            window.dispatchEvent(new CustomEvent("sistema:fechar-menu-superior"));

            if(paginasForaDaCasca.includes(tela)){
                if(tela === "telas/shell/sistema.html"){
                    evento.preventDefault();
                    carregarTela(telaPadrao, true);
                    return;
                }

                evento.preventDefault();
                location.href = new URL(tela, document.baseURI).href;
                return;
            }

            evento.preventDefault();
            carregarTela(tela, true);
        });
    }

    // Ponto único de navegação entre telas dentro da shell.
    // 1) valida o caminho  2) confirma que a tela existe  3) mostra loading
    // 4) navega o iframe    5) trata erro/404             6) atualiza a URL
    async function carregarTela(tela, registrarHistorico){
        const inicio = performance.now();
        const telaSolicitada = tela;
        let telaNormalizada = normalizarTela(tela) || telaPadrao;
        const hashTela = extrairHashTela(tela);

        if(!REGEX_TELA_VALIDA.test(telaNormalizada) && !paginasForaDaCasca.includes(telaNormalizada)){
            console.error(`[Sistema] Caminho de tela inválido: "${telaSolicitada}" (normalizado para "${telaNormalizada}"). Usando tela padrão.`);
            telaNormalizada = telaPadrao;
        }

        if(paginasForaDaCasca.includes(telaNormalizada)){
            location.href = new URL(telaNormalizada === "telas/shell/sistema.html" ? telaPadrao : telaNormalizada, document.baseURI).href;
            return;
        }

        // Já está exatamente nesta tela? Não recarrega o iframe à toa (evita perder estado
        // de formulário e refazer requisições só porque o usuário clicou no mesmo item de menu).
        if(!aguardandoCargaReal && telaNormalizada + hashTela === telaAtivaConfirmada){
            atualizarMenuAtivo(telaNormalizada);
            atualizarHistorico(telaNormalizada, hashTela, registrarHistorico);
            return;
        }

        const idRequisicao = ++requisicaoAtual;
        const destino = comParametroEmbed(telaNormalizada, hashTela);

        esconderErro();
        shell?.classList.add("carregando");
        atualizarMenuAtivo(telaNormalizada);
        atualizarHistorico(telaNormalizada, hashTela, registrarHistorico);

        const existe = await telaExiste(telaNormalizada);

        // Se o usuário já navegou para outra tela enquanto verificávamos esta, descarta o resultado.
        if(idRequisicao !== requisicaoAtual) return;

        if(!existe){
            console.error(`[Sistema] Falha ao carregar a tela "${telaNormalizada}": arquivo não encontrado (404) ou inacessível.`);
            finalizarCarregamento(false, telaNormalizada);
            return;
        }

        clearTimeout(timeoutCarregamentoAtual);
        timeoutCarregamentoAtual = setTimeout(function(){
            if(idRequisicao !== requisicaoAtual) return;
            console.error(`[Sistema] Tempo esgotado ao carregar a tela "${telaNormalizada}" (>${TIMEOUT_CARREGAMENTO_MS}ms).`);
            finalizarCarregamento(false, telaNormalizada);
        }, TIMEOUT_CARREGAMENTO_MS);

        inicioCarregamentoAtual = inicio;
        telaCarregandoAtual = telaNormalizada;
        telaAtivaConfirmada = telaNormalizada + hashTela;
        aguardandoCargaReal = true;
        frame.src = destino;
        console.info(`[Sistema] Carregando "${telaNormalizada}"...`);
    }

    // Confirma que o arquivo da tela existe antes de navegar o iframe para ele.
    // Resultados positivos ficam em cache na sessão (o conjunto de telas do ERP é estático).
    // Só bloqueia a navegação em um 404 confirmado — qualquer outra falha (rede instável,
    // método bloqueado pelo servidor de hospedagem etc.) deixa passar e confia no timeout
    // de carregamento como rede de segurança, para nunca travar a navegação por engano.
    async function telaExiste(telaNormalizada){
        if(telasVerificadas.has(telaNormalizada)) return true;

        try{
            const url = new URL(telaNormalizada, document.baseURI).href;
            const resposta = await fetch(url, { method: "HEAD", cache: "force-cache" });
            if(resposta.status === 404) return false;
            if(resposta.ok) telasVerificadas.add(telaNormalizada);
            return true;
        }catch(erro){
            console.error(`[Sistema] Não foi possível verificar a tela "${telaNormalizada}" (seguindo com a navegação mesmo assim):`, erro);
            return true;
        }
    }

    function finalizarCarregamento(sucesso, telaComErro){
        clearTimeout(timeoutCarregamentoAtual);
        shell?.classList.remove("carregando");

        if(sucesso){
            esconderErro();
            if(inicioCarregamentoAtual){
                console.info(`[Sistema] Tela "${telaCarregandoAtual}" carregada em ${(performance.now() - inicioCarregamentoAtual).toFixed(0)}ms.`);
            }
            window.dispatchEvent(new CustomEvent("sistema:tela-carregada", { detail: { ok: true } }));
        }else{
            exibirErro(telaComErro);
            window.dispatchEvent(new CustomEvent("sistema:tela-carregada", { detail: { ok: false, tela: telaComErro } }));
        }
    }

    function exibirErro(tela){
        if(!erroOverlay){
            erroOverlay = document.createElement("div");
            erroOverlay.className = "sistema-erro-tela";
            erroOverlay.innerHTML = `
                <div class="sistema-erro-caixa">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p class="sistema-erro-titulo">Não foi possível carregar esta tela.</p>
                    <p class="sistema-erro-detalhe"></p>
                    <button type="button" class="sistema-erro-retry">Tentar novamente</button>
                </div>
            `;
            erroOverlay.querySelector(".sistema-erro-retry").addEventListener("click", function(){
                const telaParaRetentar = erroOverlay.dataset.tela || telaPadrao;
                carregarTela(telaParaRetentar, false);
            });
            shell?.appendChild(erroOverlay);
        }

        erroOverlay.dataset.tela = tela || telaPadrao;
        erroOverlay.querySelector(".sistema-erro-detalhe").textContent = tela || "";
        erroOverlay.classList.add("visivel");
    }

    function esconderErro(){
        erroOverlay?.classList.remove("visivel");
    }

    function atualizarHistorico(telaNormalizada, hashTela, registrarHistorico){
        if(registrarHistorico){
            const url = new URL(location.href);
            url.searchParams.set("tela", telaNormalizada + hashTela);
            history.pushState({ tela: telaNormalizada + hashTela }, "", url);
        }else{
            history.replaceState({ tela: telaNormalizada + hashTela }, "", location.href);
        }
    }

    function telaInicial(){
        const params = new URLSearchParams(location.search);
        return normalizarTela(params.get("tela")) || telaPadrao;
    }

    function sincronizarUrlComFrame(){
        try{
            const telaFrame = normalizarTela(frame.contentWindow.location.href);
            const hashFrame = frame.contentWindow.location.hash || "";
            if(!telaFrame) return;
            if(paginasForaDaCasca.includes(telaFrame)){
                if(telaFrame !== "telas/shell/sistema.html"){
                    location.href = new URL(telaFrame, document.baseURI).href;
                }
                return;
            }

            atualizarMenuAtivo(telaFrame);
            telaAtivaConfirmada = telaFrame + hashFrame;
            const url = new URL(location.href);
            if(url.searchParams.get("tela") !== telaFrame + hashFrame){
                url.searchParams.set("tela", telaFrame + hashFrame);
                history.replaceState({ tela: telaFrame + hashFrame }, "", url);
            }
        }catch(erro){
            shell?.classList.remove("carregando");
            console.error("[Sistema] Falha ao sincronizar a URL com o conteúdo do iframe:", erro);
        }
    }

    function atualizarMenuAtivo(tela){
        const telaAtual = normalizarTela(tela);
        document.querySelectorAll(".menu-superior-sistema a[href]").forEach(function(link) {
            const href = normalizarTela(link.getAttribute("href"));
            const ativo = href === telaAtual || menuContemPagina(href, telaAtual);
            link.classList.toggle("ativo", ativo);
        });
    }

    function menuContemPagina(href, tela){
        const grupos = {
            "telas/cadastros/abacadastros.html": [
                "telas/cadastros/clientes.html", "telas/cadastros/usuarios.html",
                "telas/cadastros/fornecedores.html", "telas/cadastros/formaspagamento.html",
                "telas/cadastros/cadastroproduto.html", "telas/cadastros/cadastrocliente.html",
                "telas/cadastros/setores.html", "telas/cadastros/tabelaprecos.html"
            ],
            "telas/movimento/movimento.html": [
                "telas/movimento/vendaspdv.html", "telas/movimento/promocoes.html", "telas/movimento/eventoscaixa.html",
                "telas/movimento/integracoes.html", "telas/relatorios/dashboard.html",
                "telas/movimento/controleestoque.html", "telas/movimento/movimento-fluxo.html",
                "telas/movimento/DESATIVADOmovimentoprojecao.html", "telas/movimento/financeiro.html",
                "telas/movimento/contasareceber.html", "telas/movimento/boleto.html",
                "telas/movimento/entregas.html", "telas/movimento/etiquetas.html"
            ],
            "telas/configuracoes/manutenção.html": [
                "telas/configuracoes/empresa.html", "telas/configuracoes/fiscal.html",
                "telas/configuracoes/baixarxml.html", "telas/configuracoes/sistema.html",
                "telas/configuracoes/conversaodados.html"
            ],
            "telas/relatorios/relatorios.html": [
                "telas/relatorios/relatorio-vendas.html", "telas/relatorios/relatorio-cancelamentos.html",
                "telas/relatorios/relatorio-estoque.html", "telas/relatorios/relatorio-financeiro.html",
                "telas/relatorios/relatorio-clientes.html", "telas/relatorios/relatorio-produtosvendidos.html",
                "telas/relatorios/relatorio-nfemitidas.html", "telas/relatorios/relatorio-margemlucro.html",
                "telas/relatorios/relatorio-inventario.html", "telas/relatorios/relatorio-curvaabc.html",
                "telas/relatorios/relatorio-itensvendidos.html", "telas/relatorios/relatorio-comissao.html",
                "telas/relatorios/relatorio-nfentradas.html", "telas/relatorios/relatorio-aniversario.html",
                "telas/relatorios/relatorio-fichacadastral.html", "telas/relatorios/relatorio-boletos.html",
                "telas/relatorios/relatorio-validademercadorias.html", "telas/relatorios/relatorio-alteracoesprodutos.html",
                "telas/relatorios/relatorio-movimentoestoque.html"
            ]
        };

        return (grupos[href] || []).includes(tela);
    }

    function comParametroEmbed(tela, hash){
        const url = new URL(tela, document.baseURI);
        const caminho = normalizarTela(url.href) || telaPadrao;
        url.searchParams.set("embed", "1");
        return caminho + url.search + (hash || "");
    }

    function normalizarTela(valor){
        if(!valor) return "";

        const valorTexto = String(valor).split("?")[0].split("#")[0].replace(/\\/g, "/");
        const indicePagesTexto = valorTexto.indexOf("telas/");
        if(indicePagesTexto >= 0) return valorTexto.slice(indicePagesTexto);

        try{
            const url = new URL(valor, document.baseURI);
            const caminho = decodeURIComponent(url.pathname).replace(/\\/g, "/");
            const indicePages = caminho.indexOf("/telas/");
            if(indicePages >= 0) return caminho.slice(indicePages + 1);
            return caminho.split("/").filter(Boolean).pop() || telaPadrao;
        }catch{
            return valorTexto.split("/").filter(Boolean).pop() || telaPadrao;
        }
    }

    function extrairHashTela(valor){
        if(!valor) return "";
        try{
            const texto = String(valor);
            if(texto.includes("#")) return "#" + texto.split("#").slice(1).join("#");
            return new URL(texto, document.baseURI).hash || "";
        }catch{
            return "";
        }
    }
})();
