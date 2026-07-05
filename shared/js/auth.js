(function(){
    const BASE_KEY = "base_Sistema";
    const SESSAO_KEY = "sessaoUsuarioSistema";
    const TRANSICAO_LOGIN_KEY = "transicaoLoginSistema";
    const paginaAtual = normalizarUrlInterna(location.href);
    const paginaLogin = "index.html";
    const paginaSistema = "telas/shell/sistema.html";
    const modoEmbutido = window.self !== window.top || new URLSearchParams(location.search).get("embed") === "1";

    inicializarUsuarios();

    window.AuthSistema = {
        usuarioAtual,
        login,
        logout,
        exigirAutenticacao,
        usuarioTemPermissao,
        usuarioSomentePdv,
        usuarios: obterUsuarios
    };

    if(paginaAtual !== paginaLogin){
        exigirAutenticacao();
        redirecionarOperadorPdv();
        verificarPermissaoPagina();
        prepararTransicaoEntradaSistema();
    }

    document.addEventListener("DOMContentLoaded", function() {
        injetarFavicon();

        if(modoEmbutido){
            aplicarLayoutEmbutido();
        }

        if(!modoEmbutido){
            criarMenuSuperiorPadrao();
        }
        preencherUsuarioLogado();
        if(!modoEmbutido && paginaAtual !== "telas/pdv/pdv.html" && paginaAtual !== "telas/shell/sistema.html"){
            prepararTransicaoNavegacao();
        }

        document.querySelectorAll("[data-logout]").forEach(function(elemento) {
            elemento.addEventListener("click", function(evento) {
                evento.preventDefault();
                logout();
            });
        });

        aplicarPermissoesVisuais();
    });

    function exigirAutenticacao(){
        if(!usuarioAtual()){
            redirecionarForaDoFrame(paginaLogin);
        }
    }

    function aplicarLayoutEmbutido(){
        if(document.getElementById("estiloLayoutEmbutidoSistema")) return;

        document.body.classList.add("sistema-embed");

        const estilo = document.createElement("style");
        estilo.id = "estiloLayoutEmbutidoSistema";
        estilo.textContent = `
            html {
                min-height: 100%;
                background: #edf1f5;
            }

            body.sistema-embed {
                width: 100% !important;
                min-height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #edf1f5 !important;
                overflow: auto !important;
            }

            body.sistema-embed > .container,
            body.sistema-embed > .app,
            body.sistema-embed > .pagamentos-app,
            body.sistema-embed > .conteudo {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: clamp(14px, 2.2vw, 34px) !important;
            }

            body.sistema-embed .app-shell {
                display: block !important;
                min-height: auto !important;
            }

            body.sistema-embed .conteudo-comercial {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: clamp(14px, 2.2vw, 34px) !important;
                overflow: visible !important;
            }

            body.sistema-embed .topo,
            body.sistema-embed .topbar,
            body.sistema-embed .pagamentos-topo,
            body.sistema-embed .topo-comercial {
                width: 100%;
            }

            @media(max-width: 900px) {
                body.sistema-embed > .container,
                body.sistema-embed > .app,
                body.sistema-embed > .pagamentos-app,
                body.sistema-embed > .conteudo,
                body.sistema-embed .conteudo-comercial {
                    padding: 14px !important;
                }
            }
        `;
        document.head.appendChild(estilo);

        // Garante que links internos dentro do iframe sempre carregam com embed=1
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (!link || link.hasAttribute('data-logout')) return;
            const href = link.getAttribute('href');
            if (!href || /^(https?:|mailto:|javascript:|#|data:)/.test(href) || href.includes('embed=')) return;
            if (href.includes('.html') || href.startsWith('telas/')) {
                e.preventDefault();
                const sep = href.includes('?') ? '&' : '?';
                window.location.href = href + sep + 'embed=1';
            }
        }, true);
    }

    function prepararTransicaoNavegacao(){
        if(document.getElementById("estiloTransicaoNavegacaoSistema")) return;

        const estilo = document.createElement("style");
        estilo.id = "estiloTransicaoNavegacaoSistema";
        estilo.textContent = `
            @view-transition {
                navigation: auto;
            }

            ::view-transition-old(root) {
                animation: telaSaindo .18s ease both;
            }

            ::view-transition-new(root) {
                animation: telaEntrando .22s ease both;
            }

            .menu-superior-sistema {
                contain: layout;
                view-transition-name: menu-sistema;
            }

            ::view-transition-old(menu-sistema),
            ::view-transition-new(menu-sistema) {
                animation-duration: .01s;
            }

            @keyframes telaSaindo {
                from {
                    opacity: 1;
                }

                to {
                    opacity: .92;
                }
            }

            @keyframes telaEntrando {
                from {
                    opacity: .88;
                    transform: translateY(4px);
                }

                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(estilo);
    }

    function prepararTransicaoEntradaSistema(){
        const dadosTransicao = lerJsonSessao(TRANSICAO_LOGIN_KEY, null);
        if(!dadosTransicao){
            document.documentElement.classList.remove("transicao-login-pendente");
            return;
        }

        sessionStorage.removeItem(TRANSICAO_LOGIN_KEY);

        if(Date.now() - Number(dadosTransicao.criadoEm || 0) > 8000){
            document.documentElement.classList.remove("transicao-login-pendente");
            return;
        }

        const estilo = document.createElement("style");
        estilo.id = "estiloTransicaoEntradaSistema";
        estilo.textContent = `
            .loading-screen.transicao-entrada-sistema {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: grid;
                place-items: center;
                background: #eef3f8;
                opacity: 1;
                pointer-events: auto;
                visibility: visible;
            }

            .loading-screen.transicao-entrada-sistema.saindo .container,
            .loading-screen.transicao-entrada-sistema.saindo .loading-message {
                opacity: 0;
                transition: opacity .35s ease, transform .35s ease;
            }

            .loading-screen.transicao-entrada-sistema.saindo .container {
                transform: translateY(-8px);
            }

            .loading-screen.transicao-entrada-sistema.saindo .loading-message {
                transform: translate(-50%, -8px);
            }

            .loading-screen.transicao-entrada-sistema .container {
                position: relative;
                width: 220px;
                height: 190px;
                opacity: 1;
                transform: translateY(0);
                transition: opacity .35s ease, transform .35s ease;
            }

            .loading-screen.transicao-entrada-sistema .loader {
                position: absolute;
                top: 50%;
                left: 50%;
                z-index: 10;
                width: 160px;
                height: 100px;
                margin-left: -80px;
                margin-top: -50px;
                border-radius: 5px;
                background: #1e3f57;
                animation: dot1_ 3s cubic-bezier(0.55,0.3,0.24,0.99) infinite;
            }

            .loading-screen.transicao-entrada-sistema .loader:nth-child(2) {
                z-index: 11;
                width: 150px;
                height: 90px;
                margin-top: -45px;
                margin-left: -75px;
                border-radius: 3px;
                background: #3c517d;
                animation-name: dot2_;
            }

            .loading-screen.transicao-entrada-sistema .loader:nth-child(3) {
                z-index: 12;
                width: 40px;
                height: 20px;
                margin-top: 50px;
                margin-left: -20px;
                border-radius: 0 0 5px 5px;
                background: #6bb2cd;
                animation-name: dot3_;
            }

            .loading-screen.transicao-entrada-sistema .loading-message {
                position: absolute;
                top: calc(50% + 112px);
                left: 50%;
                transform: translate(-50%, 0);
                width: min(90vw,480px);
                text-align: center;
                color: #12467d;
                font-size: 20px;
                font-weight: 900;
                opacity: 1;
                transition: opacity .45s ease, transform .45s ease;
            }

            @keyframes dot1_ {
                3%,97% {
                    width: 160px;
                    height: 100px;
                    margin-top: -50px;
                    margin-left: -80px;
                }

                30%,36% {
                    width: 80px;
                    height: 120px;
                    margin-top: -60px;
                    margin-left: -40px;
                }

                63%,69% {
                    width: 40px;
                    height: 80px;
                    margin-top: -40px;
                    margin-left: -20px;
                }
            }

            @keyframes dot2_ {
                3%,97% {
                    height: 90px;
                    width: 150px;
                    margin-left: -75px;
                    margin-top: -45px;
                }

                30%,36% {
                    width: 70px;
                    height: 96px;
                    margin-left: -35px;
                    margin-top: -48px;
                }

                63%,69% {
                    width: 32px;
                    height: 60px;
                    margin-left: -16px;
                    margin-top: -30px;
                }
            }

            @keyframes dot3_ {
                3%,97% {
                    height: 20px;
                    width: 40px;
                    margin-left: -20px;
                    margin-top: 50px;
                }

                30%,36% {
                    width: 8px;
                    height: 8px;
                    margin-left: -5px;
                    margin-top: 49px;
                    border-radius: 8px;
                }

                63%,69% {
                    width: 16px;
                    height: 4px;
                    margin-left: -8px;
                    margin-top: -37px;
                    border-radius: 10px;
                }
            }
        `;
        document.head.appendChild(estilo);

        const nome = dadosTransicao.nome || usuarioAtual()?.nome || usuarioAtual()?.login || "usuario";
        const overlay = document.createElement("div");
        overlay.className = "loading-screen transicao-entrada-sistema";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
            <div class="container">
                <div class="loader"></div>
                <div class="loader"></div>
                <div class="loader"></div>
            </div>
            <p class="loading-message">Como e bom ter voce aqui!</p>
        `;
        document.body.appendChild(overlay);
        document.documentElement.classList.remove("transicao-login-pendente");

        let transicaoEncerrada = false;
        const encerrarTransicao = function() {
            if(transicaoEncerrada) return;
            transicaoEncerrada = true;
            document.documentElement.classList.remove("login-carregando");
            overlay.classList.add("saindo");
            setTimeout(function() {
                overlay.remove();
                estilo.remove();
            }, 450);
        };

        // Se a página tem iframe (telas/shell/sistema.html), espera a tela real carregar também.
        // Não usamos o evento "load" bruto do iframe aqui: como ele começa sem src, esse "load"
        // pode disparar cedo demais (documento about:blank inicial), encerrando a transição antes
        // do conteúdo real aparecer. sistema.js dispara "sistema:tela-carregada" só quando a
        // navegação que ele mesmo iniciou termina (com sucesso ou erro tratado).
        const iframe = document.getElementById("frameSistema");
        if(iframe){
            window.addEventListener("sistema:tela-carregada", function(){
                setTimeout(encerrarTransicao, 350);
            }, { once: true });
            // Fallback caso o evento nunca chegue (ex.: script da shell falhar)
            setTimeout(encerrarTransicao, 2800);
        } else if(document.readyState === "complete"){
            setTimeout(encerrarTransicao, 650);
        }else{
            window.addEventListener("load", function() {
                setTimeout(encerrarTransicao, 650);
            }, { once: true });
            setTimeout(encerrarTransicao, 1800);
        }
    }

    function login(loginInformado, senhaInformada){
        var seg = window.Seguranca;

        // Proteção brute-force
        if(seg && seg.bruteForce.estaBloquado(loginInformado)){
            var mins = seg.bruteForce.minutosRestantes(loginInformado);
            if(window.notificar) notificar("Conta bloqueada por tentativas excessivas. Aguarde " + mins + " min.", "erro");
            return null;
        }

        if(window.SistemaCore && window.SistemaCore.dados && window.SistemaCore.dados._modoApi && window.SistemaCore.auth){
            return window.SistemaCore.auth.login(loginInformado, senhaInformada)
                .then(function(usuarioApi) {
                    if(!usuarioApi){
                        if(seg) seg.bruteForce.registrarFalha(loginInformado);
                        return null;
                    }

                    if(seg){
                        seg.bruteForce.resetar(loginInformado);
                        seg.auditoria.registrar("LOGIN_SUCESSO", "auth", { login: loginInformado });
                        seg.csrf.rotacionar();
                    }

                    return salvarSessaoUsuario(usuarioApi);
                })
                .catch(function() {
                    if(seg) seg.bruteForce.registrarFalha(loginInformado);
                    return null;
                });
        }

        const usuario = obterUsuarios().find(function(item) {
            return normalizar(item.login) === normalizar(loginInformado) && String(item.senha) === String(senhaInformada);
        });

        if(!usuario){
            if(seg) seg.bruteForce.registrarFalha(loginInformado);
            return null;
        }

        // Sucesso: reseta contador e registra auditoria
        if(seg){
            seg.bruteForce.resetar(loginInformado);
            seg.auditoria.registrar("LOGIN_SUCESSO", "auth", { login: loginInformado });
            seg.csrf.rotacionar();        // novo token CSRF a cada login
        }

        return salvarSessaoUsuario(usuario);
    }

    function salvarSessaoUsuario(usuario){
        const sessao = {
            id:         usuario.id,
            nome:       usuario.nome,
            login:      usuario.login,
            permissoes: usuario.permissoes || {},
            iniciadoEm: new Date().toISOString()
        };

        sessionStorage.setItem(SESSAO_KEY, JSON.stringify(sessao));
        localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao));
        return sessao;
    }

    function logout(){
        var seg = window.Seguranca;
        var usuario = usuarioAtual() || {};
        var nomeUsuario = usuario.nome || usuario.login || "usuário";
        if(seg) seg.auditoria.registrar("LOGOUT", "auth", {});
        if(window.SistemaCore?.dados?._modoApi && window.SistemaCore?.auth?.logout){
            window.SistemaCore.auth.logout();
        }

        sessionStorage.removeItem(SESSAO_KEY);
        localStorage.removeItem(SESSAO_KEY);
        localStorage.removeItem("tokenApiSistema");
        sessionStorage.removeItem("_csrf_sistema");
        _mostrarTransicaoSaida(nomeUsuario, function(){ redirecionarForaDoFrame(paginaLogin); });
    }

    function _mostrarTransicaoSaida(nomeUsuario, callback){
        if(!document.getElementById("_estilo_saida")){
            var s = document.createElement("style");
            s.id = "_estilo_saida";
            s.textContent = [
                "#_overlay_saida{position:fixed;inset:0;z-index:99999;background:#fff;",
                "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;",
                "opacity:0;transition:opacity .25s ease;}",
                "#_overlay_saida.v{opacity:1;}",
                "#_overlay_saida .msg-saida{font:800 24px 'Segoe UI',Arial,sans-serif;color:#1A436B;text-align:center;}",
                "#_overlay_saida .dots-saida{display:flex;align-items:center;justify-content:center;}",
                "#_overlay_saida .dot{height:20px;width:20px;margin-right:10px;",
                "border-radius:10px;background-color:#b3d4fc;",
                "animation:_pulso 1.5s infinite ease-in-out;}",
                "#_overlay_saida .dot:last-child{margin-right:0;}",
                "#_overlay_saida .dot:nth-child(1){animation-delay:-0.3s;}",
                "#_overlay_saida .dot:nth-child(2){animation-delay:-0.1s;}",
                "#_overlay_saida .dot:nth-child(3){animation-delay:0.1s;}",
                "#_overlay_saida .dot:nth-child(4){animation-delay:0.3s;}",
                "#_overlay_saida .dot:nth-child(5){animation-delay:0.5s;}",
                "@keyframes _pulso{",
                "0%{transform:scale(.8);background-color:#b3d4fc;box-shadow:0 0 0 0 rgba(178,212,252,.7);}",
                "50%{transform:scale(1.2);background-color:#6793fb;box-shadow:0 0 0 10px rgba(178,212,252,0);}",
                "100%{transform:scale(.8);background-color:#b3d4fc;box-shadow:0 0 0 0 rgba(178,212,252,.7);}}"
            ].join("");
            document.head.appendChild(s);
        }

        var el = document.createElement("div");
        el.id = "_overlay_saida";
        var msg = document.createElement("div");
        msg.className = "msg-saida";
        msg.textContent = "Até logo 🖐️: " + nomeUsuario;
        var dots = document.createElement("div");
        dots.className = "dots-saida";
        dots.innerHTML = "<div class='dot'></div>".repeat(5);
        el.appendChild(msg);
        el.appendChild(dots);
        document.body.appendChild(el);

        requestAnimationFrame(function(){
            requestAnimationFrame(function(){ el.classList.add("v"); });
        });

        setTimeout(callback, 750);
    }

    function redirecionarForaDoFrame(destino){
        const urlDestino = resolverUrlInterna(destino);
        if(modoEmbutido && window.top){
            window.top.location.replace(urlDestino);
            return;
        }

        location.replace(urlDestino);
    }

    function usuarioAtual(){
        return lerJsonSessao(SESSAO_KEY, null) || lerJsonLocal(SESSAO_KEY, null);
    }

    function usuarioTemPermissao(permissao){
        return window.SistemaCore.temPermissao(permissao, usuarioAtual());
    }

    function mapaPermissoesPai(){
        return window.SistemaCore.PERMISSOES_PAI;
    }

    function redirecionarOperadorPdv(){
        const usuario = usuarioAtual();

        if(paginaAtual === "telas/pdv/pdv.html" || !usuario || !usuarioSomentePdv(usuario)) return;

        redirecionarForaDoFrame("telas/pdv/pdv.html");
    }

    function usuarioSomentePdv(usuario){
        const permissoes = usuario.permissoes || {};
        const ativas = Object.keys(permissoes).filter(function(chave) {
            return permissoes[chave] === true;
        });
        const permissoesPdv = [
            "pdv",
            "pdvVender",
            "pdvGuardarVendas",
            "pdvRecebimento",
            "descontos",
            "pdvCancelarVendaAtual",
            "cancelarVendas",
            "pdvReimprimir",
            "pdvSangriaSuprimento",
            "alterarVendedor"
        ];

        return permissoes.pdv === true && ativas.every(function(chave) {
            return permissoesPdv.includes(chave);
        });
    }

    function verificarPermissaoPagina(){
        const permissoesPorPagina = {
            "telas/pdv/pdv.html": "pdv",
            "telas/relatorios/DESATIVADAcomercial.html": "comercial",
            "telas/cadastros/abacadastros.html": "cadastros",
            "telas/cadastros/clientes.html": "cadastros",
            "telas/cadastros/mercadorias.html": "cadastros",
            "telas/cadastros/fornecedores.html": "cadastros",
            "telas/cadastros/cadastroproduto.html": "cadastros",
            "telas/cadastros/cadastrocliente.html": "cadastros",
            "telas/cadastros/formaspagamento.html": "cadastros",
            "telas/cadastros/usuarios.html": "usuarios",
            "telas/notasfiscais/notasfiscais.html": "notas",
            "telas/notasfiscais/emitirnfe.html": "notas",
            "telas/notasfiscais/importarnf.html": "notas",
            "telas/notasfiscais/documentosfiscais.html": "notas",
            "telas/notasfiscais/devolucaofiscal.html": "notas",
            "telas/notasfiscais/entradas-notas.html": "notas",
            "telas/notasfiscais/entradas-pendentes.html": "notas",
            "telas/notasfiscais/entradas-confirmadas.html": "notas",
            "telas/movimento/entregas.html": "movimento",
            "telas/movimento/pedidosvenda.html": "movimento",
            "telas/movimento/etiquetas.html": "movimento",
            "telas/movimento/sugestaocompras.html": "movimento",
            "telas/movimento/integracoes.html": "movimento",
            "telas/movimento/movimento.html": "movimento",
            "telas/movimento/vendaspdv.html": "movimento",
            "telas/movimento/promocoes.html": "movimento",
            "telas/movimento/eventoscaixa.html": "movimento",
            "telas/movimento/controleestoque.html": "movimento",
            "telas/movimento/movimento-fluxo.html": "movimento",
            "telas/movimento/DESATIVADOmovimentoprojecao.html": "movimento",
            "telas/movimento/financeiro.html": "movimento",
            "telas/movimento/boleto.html": "movimento",
            "telas/relatorios/relatorios.html": "relatorios",
            "telas/configuracoes/manutenção.html": "manutencao",
            "telas/configuracoes/empresa.html": "configEmpresa",
            "telas/configuracoes/fiscal.html": "configFiscal",
            "telas/configuracoes/baixarxml.html": "backupSistema",
            "telas/configuracoes/sistema.html": "configSistema",
            "telas/configuracoes/conversaodados.html": "configSistema",
            "telas/relatorios/relatorio-vendas.html": "relatorios",
            "telas/relatorios/relatorio-cancelamentos.html": "relatorios",
            "telas/relatorios/relatorio-estoque.html": "relatorios",
            "telas/relatorios/relatorio-financeiro.html": "relatorios",
            "telas/relatorios/relatorio-clientes.html": "relatorios",
            "telas/relatorios/relatorio-produtosvendidos.html": "relatorios",
            "telas/relatorios/relatorio-nfemitidas.html": "relatorios",
            "telas/relatorios/relatorio-margemlucro.html": "relatorios",
            "telas/relatorios/relatorio-inventario.html": "relatorios",
            "telas/relatorios/relatorio-curvaabc.html": "relatorios",
            "telas/relatorios/relatorio-itensvendidos.html": "relatorios",
            "telas/relatorios/relatorio-comissao.html": "relatorios",
            "telas/relatorios/relatorio-nfentradas.html": "relatorios",
            "telas/relatorios/relatorio-aniversario.html": "relatorios",
            "telas/relatorios/relatorio-fichacadastral.html": "relatorios",
            "telas/relatorios/relatorio-boletos.html": "relatorios",
            "telas/relatorios/relatorio-validademercadorias.html": "relatorios",
            "telas/relatorios/relatorio-alteracoesprodutos.html": "relatorios",
            "telas/relatorios/relatorio-movimentoestoque.html": "relatorios",
            "telas/relatorios/dashboard.html": "dashboard"
        };
        const permissao = permissoesPorPagina[paginaAtual];

        if(permissao && !usuarioTemPermissao(permissao)){
            const mensagem = "Seu usuário não tem permissão para acessar esta tela.";
            if(window.solicitarOuBloquear){
                window.solicitarOuBloquear(permissao, "Acessar a tela " + (document.title || paginaAtual), null, mensagem);
            }else{
                alert(mensagem);
            }
            location.replace(modoEmbutido ? "telas/acesso/principal.html?embed=1" : "telas/acesso/principal.html");
        }
    }

    function preencherUsuarioLogado(){
        const usuario = usuarioAtual();
        if(!usuario) return;

        preencherTexto("[data-usuario-nome]", usuario.nome || usuario.login);
        preencherTexto("[data-usuario-login]", usuario.login);
        preencherTexto("[data-usuario-inicial]", iniciais(usuario.nome || usuario.login));
    }

    function aplicarPermissoesVisuais(){
        injetarEstilosPermissao();
        const tooltip = document.getElementById("_sp_tooltip") || criarTooltipPermissao();

        document.querySelectorAll("[data-permissao]").forEach(function(el){
            const permissao = el.dataset.permissao;
            if(!permissao || usuarioTemPermissao(permissao)) return;
            if(el.dataset.spBloqueado) return;

            el.dataset.spBloqueado = "1";
            el.classList.add("sem-permissao");
            el.setAttribute("aria-disabled", "true");

            if(el.matches("button, input, select, textarea")){
                el.disabled = true;
            }

            el.addEventListener("click", function(e){
                e.preventDefault();
                e.stopImmediatePropagation();
            }, true);

            el.addEventListener("mousedown", function(e){
                e.preventDefault();
                e.stopImmediatePropagation();
            }, true);

            el.addEventListener("mouseenter", function(){
                const rect = el.getBoundingClientRect();
                tooltip.style.display = "block";
                tooltip.style.left = (rect.left + rect.width / 2) + "px";
                tooltip.style.top = (rect.top - 34) + "px";
            });

            el.addEventListener("mouseleave", function(){
                tooltip.style.display = "none";
            });
        });
    }

    function injetarEstilosPermissao(){
        if(document.getElementById("_sp_estilos")) return;
        const s = document.createElement("style");
        s.id = "_sp_estilos";
        s.textContent = [
            ".sem-permissao,",
            ".sem-permissao * {",
            "  cursor: not-allowed !important;",
            "}",
            ".sem-permissao {",
            "  opacity: 0.45 !important;",
            "  filter: grayscale(0.3) !important;",
            "  user-select: none !important;",
            "  text-decoration: none !important;",
            "}",
            ".sem-permissao:hover,",
            ".sem-permissao:focus {",
            "  background: transparent !important;",
            "  transform: none !important;",
            "  box-shadow: none !important;",
            "  outline: none !important;",
            "}",
            "#_sp_tooltip {",
            "  position: fixed;",
            "  background: #1e293b;",
            "  color: #fff;",
            "  font-size: 11px;",
            "  font-weight: 600;",
            "  padding: 5px 10px;",
            "  border-radius: 6px;",
            "  z-index: 99999;",
            "  pointer-events: none;",
            "  display: none;",
            "  white-space: nowrap;",
            "  transform: translateX(-50%);",
            "  box-shadow: 0 2px 8px rgba(0,0,0,.25);",
            "}",
            "#_sp_tooltip::after {",
            "  content: '';",
            "  position: absolute;",
            "  top: 100%;",
            "  left: 50%;",
            "  transform: translateX(-50%);",
            "  border: 5px solid transparent;",
            "  border-top-color: #1e293b;",
            "}"
        ].join("\n");
        document.head.appendChild(s);
    }

    function criarTooltipPermissao(){
        const div = document.createElement("div");
        div.id = "_sp_tooltip";
        div.textContent = "Sem permissão de acesso";
        document.body.appendChild(div);
        return div;
    }

    function injetarFavicon(){
        if(document.querySelector("link[rel~='icon']")) return;
        const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
            + "<rect width='32' height='32' rx='7' fill='%231A436B'/>"
            + "<path d='M11 9 L5 16 L11 23' stroke='white' stroke-width='2.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"
            + "<path d='M21 9 L27 16 L21 23' stroke='white' stroke-width='2.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"
            + "<line x1='19' y1='8' x2='13' y2='24' stroke='white' stroke-width='2.4' stroke-linecap='round' opacity='.85'/>"
            + "</svg>";
        const link = document.createElement("link");
        link.rel  = "icon";
        link.type = "image/svg+xml";
        link.href = "data:image/svg+xml," + svg;
        document.head.appendChild(link);
    }

    function criarMenuSuperiorPadrao(){
        const paginasSemMenu = ["index.html", "telas/pdv/pdv.html", "telas/movimento/pedidosvenda.html"];

        if(
            paginasSemMenu.includes(paginaAtual) ||
            document.querySelector(".menu-superior-sistema") ||
            document.getElementById("formLogin")
        ){
            return;
        }

        if(!document.getElementById("estiloMenuSuperiorSistema")){
            const estilo = document.createElement("style");
            estilo.id = "estiloMenuSuperiorSistema";
            estilo.textContent = `
            body.menu-superior-ativo {
                display: block !important;
                min-height: 100dvh;
                padding: 0 !important;
                background: #f1f5f9 !important;
            }

            body.sistema-shell-ativo.menu-superior-ativo {
                display: flex !important;
                flex-direction: column !important;
                height: 100dvh !important;
                min-height: 100dvh !important;
                overflow: hidden !important;
            }

            body.sistema-shell-ativo.menu-superior-ativo .sistema-frame-shell {
                flex: 1 1 auto !important;
                min-height: 0 !important;
                height: 0 !important;
                width: 100% !important;
            }

            body.sistema-shell-ativo.menu-superior-ativo #frameSistema {
                width: 100% !important;
                height: 100% !important;
                min-height: 0 !important;
            }

            body.menu-superior-ativo > .container,
            body.menu-superior-ativo > .app,
            body.menu-superior-ativo > .conteudo,
            body.menu-superior-ativo .conteudo-comercial {
                width: min(1500px, 100%);
                max-width: 1500px;
                margin: 0 auto;
                padding: 32px 48px calc(48px + env(safe-area-inset-bottom, 0px));
            }

            body.menu-superior-ativo .app-shell {
                display: block !important;
                min-height: auto !important;
            }

            body.pdv-page.menu-superior-ativo {
                display: flex !important;
                flex-direction: column !important;
                height: 100dvh !important;
                min-height: 100dvh !important;
                overflow: hidden !important;
                padding: 0 !important;
            }

            body.pdv-page.menu-superior-ativo > .container {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: var(--pdv-padding) !important;
            }

            /* ── Cabeçalho principal (duas linhas) ── */
            .menu-superior-sistema {
                background: #1A436B !important;
                color: #fff;
                display: flex;
                flex-direction: column;
                position: sticky;
                top: 0;
                z-index: 9990;
                box-shadow: 0 3px 14px rgba(15, 23, 42, .18);
            }

            /* Linha 1: busca + usuário */
            .menu-superior-sistema .menu-topo {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 6px 20px;
            }

            .menu-superior-sistema .marca-menu {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: #fff;
                font-size: 15px;
                font-weight: 800;
                text-decoration: none;
                white-space: nowrap;
                flex-shrink: 0;
                margin-right: 2px;
            }

            .menu-superior-sistema .menu-emoji {
                font-size: 16px;
                line-height: 1;
            }

            .menu-superior-sistema .menu-busca {
                position: relative;
                flex: 1;
                max-width: 460px;
            }

            .menu-superior-sistema .menu-busca input {
                width: 100%;
                background: rgba(255,255,255,.10);
                border: 1.5px solid rgba(255,255,255,.14);
                border-radius: 8px;
                color: #fff;
                font-size: 13px;
                height: 32px;
                padding: 0 12px 0 32px;
                outline: none;
                font-family: inherit;
                transition: background .2s, border-color .2s;
            }

            .menu-superior-sistema .menu-busca input::placeholder {
                color: rgba(255,255,255,.5);
            }

            .menu-superior-sistema .menu-busca input:focus {
                background: rgba(255,255,255,.16);
                border-color: rgba(255,255,255,.3);
            }

            .menu-superior-sistema .busca-icon {
                position: absolute;
                left: 9px;
                top: 50%;
                transform: translateY(-50%);
                color: rgba(255,255,255,.55);
                font-size: 11px;
                pointer-events: none;
            }

            .menu-superior-sistema .menu-busca-resultados {
                position: absolute;
                top: calc(100% + 8px);
                left: 0;
                right: 0;
                z-index: 10020;
                display: none;
                max-height: min(420px, calc(100dvh - 120px));
                overflow-y: auto;
                padding: 8px;
                background: #fff;
                border: 1px solid rgba(148, 163, 184, .28);
                border-radius: 12px;
                box-shadow: 0 18px 42px rgba(15, 23, 42, .24);
            }

            .menu-superior-sistema .menu-busca-resultados.aberto {
                display: block;
            }

            .menu-superior-sistema .busca-atalho-item {
                width: 100%;
                min-height: 54px;
                display: grid;
                grid-template-columns: 34px minmax(0, 1fr) auto;
                align-items: center;
                gap: 10px;
                padding: 9px 10px;
                border-radius: 10px;
                color: #0f2f54;
                text-decoration: none;
                background: transparent;
                border: 0;
                cursor: pointer;
            }

            .menu-superior-sistema .busca-atalho-item:hover,
            .menu-superior-sistema .busca-atalho-item.ativo {
                background: #eef6ff;
                color: #0b4f92;
            }

            .menu-superior-sistema .busca-atalho-icone {
                width: 34px;
                height: 34px;
                display: grid;
                place-items: center;
                border-radius: 9px;
                background: #e7f1ff;
                color: #0f63b6;
                font-size: 14px;
            }

            .menu-superior-sistema .busca-atalho-textos {
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .menu-superior-sistema .busca-atalho-titulo {
                color: #0f2f54;
                font-size: 13px;
                font-weight: 800;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .menu-superior-sistema .busca-atalho-desc {
                color: #64748b;
                font-size: 11px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .menu-superior-sistema .busca-atalho-tag {
                color: #2563eb;
                background: #dbeafe;
                border-radius: 999px;
                padding: 5px 8px;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .02em;
                white-space: nowrap;
            }

            .menu-superior-sistema .busca-atalho-vazio {
                padding: 14px 12px;
                color: #64748b;
                font-size: 12px;
                font-weight: 700;
                text-align: center;
            }

            .menu-superior-sistema .menu-direito {
                position: relative;
                display: flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
                flex-shrink: 0;
            }

            .menu-superior-sistema .btn-sino {
                position: relative;
                background: rgba(255,255,255,.10);
                border: 1px solid rgba(255,255,255,.12);
                color: rgba(255,255,255,.86);
                width: 34px;
                height: 34px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 16px;
                transition: background .18s, color .18s;
                flex-shrink: 0;
            }

            .menu-superior-sistema .btn-sino:hover {
                background: rgba(255,255,255,.18);
                color: #fff;
            }

            .menu-superior-sistema .sino-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                min-width: 18px;
                height: 18px;
                padding: 0 5px;
                display: none;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: #ef4444;
                color: #fff;
                border: 2px solid #1A436B;
                font-size: 10px;
                font-weight: 900;
                line-height: 1;
            }

            .menu-superior-sistema .sino-badge.visivel {
                display: flex;
            }

            .menu-superior-sistema .painel-notificacoes {
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                z-index: 10025;
                width: min(390px, calc(100vw - 24px));
                max-height: min(470px, calc(100dvh - 118px));
                display: none;
                overflow: hidden;
                background: #fff;
                border: 1px solid rgba(148, 163, 184, .28);
                border-radius: 14px;
                box-shadow: 0 20px 48px rgba(15, 23, 42, .26);
                color: #0f2f54;
            }

            .menu-superior-sistema .painel-notificacoes.aberto {
                display: flex;
                flex-direction: column;
            }

            .menu-superior-sistema .notificacoes-topo {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 14px 16px;
                border-bottom: 1px solid #e2e8f0;
            }

            .menu-superior-sistema .notificacoes-topo strong {
                font-size: 14px;
                font-weight: 900;
                color: #0f2f54;
            }

            .menu-superior-sistema .notificacoes-topo span {
                font-size: 11px;
                font-weight: 800;
                color: #2563eb;
                background: #dbeafe;
                border-radius: 999px;
                padding: 5px 9px;
                margin-right: auto;
            }

            .menu-superior-sistema .btn-limpar-notificacoes {
                background: none;
                border: none;
                color: #64748b;
                font-size: 11px;
                font-weight: 800;
                cursor: pointer;
                padding: 4px 6px;
            }

            .menu-superior-sistema .btn-limpar-notificacoes:hover {
                color: #2563eb;
                text-decoration: underline;
            }

            .menu-superior-sistema .notificacoes-lista {
                overflow-y: auto;
                padding: 8px;
            }

            .menu-superior-sistema .notificacao-item {
                display: grid;
                grid-template-columns: 34px minmax(0, 1fr);
                gap: 10px;
                padding: 10px;
                border-radius: 11px;
                background: #f8fafc;
                border: 1px solid #edf2f7;
            }

            .menu-superior-sistema .notificacao-item + .notificacao-item {
                margin-top: 8px;
            }

            .menu-superior-sistema .notificacao-icone {
                width: 34px;
                height: 34px;
                display: grid;
                place-items: center;
                border-radius: 10px;
                background: #e7f1ff;
                color: #0f63b6;
                font-size: 14px;
            }

            .menu-superior-sistema .notificacao-item.aviso .notificacao-icone {
                background: #fff7ed;
                color: #ea580c;
            }

            .menu-superior-sistema .notificacao-item.erro .notificacao-icone {
                background: #fef2f2;
                color: #dc2626;
            }

            .menu-superior-sistema .notificacao-texto strong {
                display: block;
                color: #0f2f54;
                font-size: 13px;
                font-weight: 900;
                margin-bottom: 2px;
            }

            .menu-superior-sistema .notificacao-texto span {
                display: block;
                color: #64748b;
                font-size: 11px;
                font-weight: 650;
                line-height: 1.35;
            }

            .menu-superior-sistema .notificacao-texto .notificacao-valor {
                display: inline-block;
                margin-top: 4px;
                font-weight: 900;
                color: #0f2f54;
                font-size: 12px;
            }

            .menu-superior-sistema .notificacao-item.clicavel {
                cursor: pointer;
                transition: background .15s;
            }
            .menu-superior-sistema .notificacao-item.clicavel:hover {
                background: #eef5ff;
            }

            .menu-superior-sistema .notificacao-dica {
                display: inline-block;
                margin-top: 6px;
                font-weight: 800;
                color: #0b66dd;
                font-size: 10.5px;
                text-transform: uppercase;
                letter-spacing: .03em;
            }

            .menu-superior-sistema .menu-usuario-info {
                position: relative;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 3px 10px 3px 4px;
                border-radius: 8px;
                cursor: pointer;
                transition: background .18s;
                flex-shrink: 0;
            }

            .menu-superior-sistema .menu-usuario-info:hover {
                background: rgba(255,255,255,.10);
            }

            .menu-superior-sistema .avatar-mini {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: rgba(255,255,255,.22);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 800;
                color: #fff;
                flex-shrink: 0;
            }

            .menu-superior-sistema .usuario-detalhes {
                display: flex;
                flex-direction: column;
                line-height: 1.25;
            }

            .menu-superior-sistema .usuario-nome-txt {
                font-size: 13px;
                font-weight: 700;
                color: #fff;
                white-space: nowrap;
            }

            .menu-superior-sistema .usuario-loja-txt {
                font-size: 11px;
                color: rgba(255,255,255,.72);
                font-weight: 500;
                white-space: nowrap;
            }

            .menu-superior-sistema .usuario-chevron {
                color: rgba(255,255,255,.6);
                font-size: 11px;
                flex-shrink: 0;
                transition: transform .2s;
            }

            .menu-superior-sistema .menu-usuario-info.aberto .usuario-chevron {
                transform: rotate(180deg);
            }

            .menu-superior-sistema .usuario-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 148px;
                background: #fff;
                border-radius: 10px;
                box-shadow: 0 8px 28px rgba(15,23,42,.18);
                overflow: hidden;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-6px);
                transition: opacity .2s ease, transform .2s ease, visibility .2s;
            }

            .menu-superior-sistema .menu-usuario-info.aberto .usuario-dropdown {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .menu-superior-sistema .dropdown-sair {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 11px 16px;
                color: #dc2626;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                transition: background .15s;
                width: 100%;
                height: auto;
                border-radius: 0;
                background: transparent;
                flex: unset;
            }

            .menu-superior-sistema .dropdown-sair:hover {
                background: #fef2f2 !important;
                color: #b91c1c;
            }

            .menu-superior-sistema .dropdown-sair i {
                font-size: 13px;
                opacity: 1;
            }

            .menu-superior-sistema .menu-toggle-sistema {
                border: 0;
                border-radius: 7px;
                background: rgba(255,255,255,.13);
                color: #fff;
                height: 32px;
                padding: 0 10px;
                display: none;
                align-items: center;
                justify-content: center;
                gap: 5px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                flex: 0 0 auto;
                white-space: nowrap;
            }

            /* Linha 2: navegação */
            .menu-superior-sistema nav {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
                padding: 0 16px;
                height: 44px;
                overflow-x: auto;
                scrollbar-width: none;
                flex-shrink: 0;
            }

            .menu-superior-sistema nav::-webkit-scrollbar { display: none; }

            .menu-superior-sistema a {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: rgba(255,255,255,.85);
                text-decoration: none;
                height: 36px;
                border-radius: 7px;
                padding: 0 13px;
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
                transition: background .18s, color .18s;
                flex: 0 0 auto;
            }

            .menu-superior-sistema a[hidden] {
                display: none !important;
            }

            .menu-superior-sistema a i {
                font-size: 13px;
                opacity: .85;
            }

            .menu-superior-sistema a:hover {
                background: rgba(255,255,255,.13);
                color: #fff;
            }

            .menu-superior-sistema a:hover i { opacity: 1; }

            .menu-superior-sistema a.ativo {
                background: rgba(255,255,255,.20);
                color: #fff;
                font-weight: 700;
            }

            .menu-superior-sistema a.ativo i { opacity: 1; }

            .menu-superior-sistema .menu-sair-mobile {
                display: none;
            }

            @media(max-width: 960px) {
                .menu-superior-sistema {
                    width: 100%;
                    max-width: 100vw;
                }

                .menu-superior-sistema .menu-topo {
                    width: 100%;
                    max-width: 100vw;
                    overflow: visible;
                }

                .menu-superior-sistema .marca-menu {
                    width: auto;
                    min-width: 0;
                    height: 36px;
                    padding: 0 8px;
                }

                .menu-superior-sistema .menu-toggle-sistema {
                    display: inline-flex;
                }

                .menu-superior-sistema .usuario-detalhes {
                    display: none;
                }

                .menu-superior-sistema nav {
                    position: fixed;
                    left: 0;
                    top: 88px;
                    width: min(300px, 82vw);
                    height: calc(100dvh - 88px);
                    max-height: calc(100dvh - 88px);
                    flex-direction: column;
                    align-items: stretch;
                    justify-content: flex-start;
                    gap: 5px;
                    overflow-y: auto;
                    padding: 14px 10px calc(24px + env(safe-area-inset-bottom, 0px)) 14px;
                    background: #1A436B !important;
                    box-shadow: 14px 0 30px rgba(15, 23, 42, .22);
                    transform: translateX(-105%);
                    transition: transform .22s ease;
                }

                .menu-superior-sistema.aberto nav {
                    transform: translateX(0);
                }

                #menu-overlay-sistema {
                    position: fixed;
                    inset: 88px 0 0 0;
                    z-index: 9989;
                    display: none;
                    cursor: default;
                    background: rgba(15, 23, 42, .28);
                    touch-action: none;
                }

                .menu-superior-sistema.aberto ~ #menu-overlay-sistema {
                    display: block;
                }

                .menu-superior-sistema nav a {
                    font-size: 14px;
                    justify-content: flex-start;
                    width: 100%;
                    height: 42px;
                }

                .menu-superior-sistema .menu-sair-mobile {
                    display: inline-flex;
                    margin-top: 10px;
                    color: #fecaca;
                    background: rgba(239,68,68,.14);
                    border: 1px solid rgba(248,113,113,.28);
                }

                .menu-superior-sistema .menu-sair-mobile:hover {
                    color: #fff;
                    background: rgba(239,68,68,.24);
                }

                body.menu-superior-ativo > .container,
                body.menu-superior-ativo > .app,
                body.menu-superior-ativo > .conteudo,
                body.menu-superior-ativo .conteudo-comercial {
                    padding: 20px 20px calc(80px + env(safe-area-inset-bottom, 0px));
                }

                body.pdv-page.menu-superior-ativo > .container {
                    padding: var(--pdv-padding) !important;
                }
            }

            @media(max-width: 640px) {
                .menu-superior-sistema .menu-topo {
                    min-height: 52px;
                    padding: 7px 10px;
                    gap: 8px;
                }

                .menu-superior-sistema .menu-busca {
                    display: none;
                }

                .menu-superior-sistema .marca-menu {
                    flex: 0 0 auto;
                    margin-right: 0;
                    gap: 7px;
                }

                .menu-superior-sistema .marca-menu .marca-texto {
                    display: inline;
                    font-size: 13px;
                    font-weight: 900;
                }

                .menu-superior-sistema .menu-direito {
                    min-width: 0;
                    margin-left: auto;
                    gap: 5px;
                }

                .menu-superior-sistema .menu-usuario-info {
                    display: none;
                }

                .menu-superior-sistema .menu-toggle-sistema {
                    height: 34px;
                    padding: 0 11px;
                    min-width: 78px;
                }

                .menu-superior-sistema nav {
                    top: 52px;
                    height: calc(100dvh - 52px);
                    max-height: calc(100dvh - 52px);
                    width: min(320px, 88vw);
                }

                #menu-overlay-sistema {
                    inset: 52px 0 0 0;
                }
            }
        `;
            document.head.appendChild(estilo);
        }

        const menu = document.createElement("header");
        menu.className = "menu-superior-sistema";
        menu.innerHTML = `
            <div class="menu-topo">
                <a href="${resolverUrlInterna(paginaSistema)}" class="marca-menu">
                    <span class="menu-emoji">🔷</span>
                    <span class="marca-texto">ERP</span>
                </a>
                <div class="menu-busca">
                    <i class="fas fa-search busca-icon"></i>
                    <input type="search" placeholder="Pesquisar no sistema…" aria-label="Buscar">
                </div>
                <div class="menu-direito">
                    <button type="button" class="btn-sino" aria-label="Notificações" title="Notificações">
                        <svg class="icone-sino" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>
                    <div class="menu-usuario-info">
                        <div class="avatar-mini" data-usuario-inicial>AD</div>
                        <div class="usuario-detalhes">
                            <span class="usuario-nome-txt" data-usuario-nome>Usuário</span>
                            <span class="usuario-loja-txt">Loja: Coneccta</span>
                        </div>
                        <i class="fas fa-chevron-down usuario-chevron"></i>
                        <div class="usuario-dropdown">
                            <a href="${resolverUrlInterna("index.html")}" class="dropdown-sair" data-logout>
                                <i class="fas fa-sign-out-alt"></i>
                                Sair
                            </a>
                        </div>
                    </div>
                    <button type="button" class="menu-toggle-sistema" aria-label="Abrir menu" aria-expanded="false">
                        <i class="fas fa-bars"></i> Menu
                    </button>
                </div>
            </div>
            <nav aria-label="Menu principal">
                ${linkMenu("telas/pdv/pdv.html", "Caixa PDV", "pdv", "fa-cash-register")}
                ${linkMenu("telas/cadastros/abacadastros.html", "Cadastros", "cadastros", "fa-address-book")}
                ${linkMenu("telas/notasfiscais/notasfiscais.html", "Notas Fiscais", "notas", "fa-file-invoice")}
                ${linkMenu("telas/movimento/movimento.html", "Movimento", "movimento", "fa-wallet")}
                ${linkMenu("telas/movimento/pedidosvenda.html", "Pedidos de Venda", "movimento", "fa-cart-shopping", "menuItemPedidosVenda")}
                ${linkMenu("telas/relatorios/relatorios.html", "Relatórios", "relatorios", "fa-chart-bar")}
                ${linkMenu("telas/configuracoes/manutenção.html", "Configurações", "manutencao", "fa-gear")}
                <a href="${resolverUrlInterna("index.html")}" class="menu-sair-mobile" data-logout><i class="fas fa-sign-out-alt"></i>Sair</a>
            </nav>
        `;

        const overlay = document.createElement("div");
        overlay.id = "menu-overlay-sistema";
        overlay.setAttribute("aria-hidden", "true");

        document.body.classList.add("menu-superior-ativo");
        document.body.prepend(menu);
        prepararEstruturaBuscaENotificacoes(menu);

        try {
            const _bd = JSON.parse(localStorage.getItem("base_Sistema") || "{}");
            const _emp = _bd.empresa || {};
            const _nomeEmp = _emp.nomeFantasia || _emp.razaoSocial || "Coneccta";
            const _lojaEl = menu.querySelector(".usuario-loja-txt");
            if(_lojaEl) _lojaEl.textContent = "Loja: " + _nomeEmp;
        } catch(_e) {}

        document.body.insertBefore(overlay, menu.nextSibling);

        const btnToggle = menu.querySelector(".menu-toggle-sistema");

        function fecharMenu() {
            menu.classList.remove("aberto");
            btnToggle?.setAttribute("aria-expanded", "false");
            fecharBuscaGlobalSistema(menu);
            fecharPainelNotificacoesSistema(menu);
        }

        function abrirFecharMenu(evento) {
            evento?.preventDefault();
            evento?.stopPropagation();
            const aberto = menu.classList.toggle("aberto");
            btnToggle?.setAttribute("aria-expanded", String(aberto));
            if(aberto){
                fecharBuscaGlobalSistema(menu);
                fecharPainelNotificacoesSistema(menu);
                menu.querySelector(".menu-usuario-info")?.classList.remove("aberto");
            }
        }

        btnToggle?.addEventListener("click", abrirFecharMenu);

        menu.querySelector("nav")?.addEventListener("click", function(evento) {
            if(evento.target.closest("a[href]")){
                fecharMenu();
            }
        });

        overlay.addEventListener("click", fecharMenu);
        overlay.addEventListener("touchstart", fecharMenu, { passive: true });

        document.addEventListener("keydown", function(evento) {
            if(evento.key === "Escape"){
                fecharMenu();
                menu.querySelector(".menu-usuario-info")?.classList.remove("aberto");
            }
        });

        window.addEventListener("resize", function() {
            if(window.innerWidth > 960){
                fecharMenu();
            }
        }, { passive: true });

        window.addEventListener("sistema:fechar-menu-superior", fecharMenu);

        const btnUsuarioMenu = menu.querySelector(".menu-usuario-info");
        if(btnUsuarioMenu) {
            btnUsuarioMenu.addEventListener("click", function(e) {
                e.stopPropagation();
                btnUsuarioMenu.classList.toggle("aberto");
                menu.classList.remove("aberto");
                fecharBuscaGlobalSistema(menu);
                fecharPainelNotificacoesSistema(menu);
            });
            document.addEventListener("click", function() {
                btnUsuarioMenu.classList.remove("aberto");
            });
        }

        configurarBuscaGlobalSistema(menu);
        configurarSinoNotificacoes(menu);
        aplicarPermissoesVisuais();

        atualizarVisibilidadeMenuPedidosVenda();
        window.addEventListener("configuracoesSistemaAtualizadas", atualizarVisibilidadeMenuPedidosVenda);
    }

    function atualizarVisibilidadeMenuPedidosVenda(){
        const item = document.getElementById("menuItemPedidosVenda");
        if(!item) return;
        const habilitado = window.ConfiguracoesSistema?.obter?.()?.pedidosVendaHabilitado !== false;
        item.hidden = !habilitado;
    }

    function prepararEstruturaBuscaENotificacoes(menu){
        const busca = menu.querySelector(".menu-busca");
        const input = busca?.querySelector("input[type='search']");
        if(input){
            input.id = "buscaGlobalSistema";
            input.setAttribute("autocomplete", "off");
            input.setAttribute("placeholder", "Pesquisar no sistema...");
            if(!busca.querySelector("#resultadosBuscaGlobalSistema")){
                busca.insertAdjacentHTML("beforeend", `<div class="menu-busca-resultados" id="resultadosBuscaGlobalSistema" role="listbox" aria-label="Atalhos encontrados"></div>`);
            }
        }

        const sino = menu.querySelector(".btn-sino");
        if(sino && !sino.querySelector("#badgeNotificacoesSistema")){
            sino.insertAdjacentHTML("beforeend", `<span class="sino-badge" id="badgeNotificacoesSistema">0</span>`);
        }

        const direito = menu.querySelector(".menu-direito");
        if(direito && !direito.querySelector("#painelNotificacoesSistema")){
            sino?.insertAdjacentHTML("afterend", `
                <div class="painel-notificacoes" id="painelNotificacoesSistema" aria-hidden="true">
                    <div class="notificacoes-topo">
                        <strong>Notificacoes</strong>
                        <span id="resumoNotificacoesSistema">0 avisos</span>
                        <button type="button" class="btn-limpar-notificacoes" id="btnLimparNotificacoesSistema">Limpar</button>
                    </div>
                    <div class="notificacoes-lista" id="listaNotificacoesSistema"></div>
                </div>
            `);
        }
    }

    function configurarBuscaGlobalSistema(menu){
        const input = menu.querySelector("#buscaGlobalSistema");
        const resultados = menu.querySelector("#resultadosBuscaGlobalSistema");
        if(!input || !resultados) return;

        const atalhos = obterAtalhosBuscaSistema();
        let indiceAtivo = -1;

        function renderizar(){
            const termo = normalizar(input.value);
            indiceAtivo = -1;

            if(!termo){
                resultados.classList.remove("aberto");
                resultados.innerHTML = "";
                return;
            }

            const encontrados = atalhos
                .map(function(item) {
                    const texto = normalizar([item.titulo, item.descricao, item.categoria, item.tags].join(" "));
                    return texto.includes(termo) ? item : null;
                })
                .filter(Boolean)
                .slice(0, 10);

            resultados.classList.add("aberto");
            resultados.innerHTML = encontrados.length
                ? encontrados.map(renderizarAtalhoBuscaSistema).join("")
                : `<div class="busca-atalho-vazio">Nenhum atalho encontrado.</div>`;
        }

        input.addEventListener("input", renderizar);
        input.addEventListener("focus", renderizar);

        input.addEventListener("keydown", function(evento) {
            const itens = Array.from(resultados.querySelectorAll(".busca-atalho-item"));
            if(evento.key === "Escape"){
                fecharBuscaGlobalSistema(menu);
                input.blur();
                return;
            }

            if(!itens.length) return;

            if(evento.key === "ArrowDown" || evento.key === "ArrowUp"){
                evento.preventDefault();
                indiceAtivo = evento.key === "ArrowDown"
                    ? Math.min(indiceAtivo + 1, itens.length - 1)
                    : Math.max(indiceAtivo - 1, 0);
                itens.forEach(function(item, indice) {
                    item.classList.toggle("ativo", indice === indiceAtivo);
                });
                itens[indiceAtivo]?.scrollIntoView({ block: "nearest" });
            }

            if(evento.key === "Enter"){
                evento.preventDefault();
                (itens[indiceAtivo] || itens[0])?.click();
            }
        });

        resultados.addEventListener("click", function(evento) {
            const item = evento.target.closest(".busca-atalho-item");
            if(!item) return;
            evento.preventDefault();
            navegarParaAtalhoSistema(item.dataset.destino || "");
            fecharBuscaGlobalSistema(menu);
            input.value = "";
        });

        document.addEventListener("click", function(evento) {
            if(!menu.contains(evento.target)) fecharBuscaGlobalSistema(menu);
        });
    }

    function renderizarAtalhoBuscaSistema(item){
        return `
            <button type="button" class="busca-atalho-item" role="option" data-destino="${escaparHtml(item.destino)}">
                <span class="busca-atalho-icone"><i class="fas ${escaparHtml(item.icone || "fa-arrow-right")}"></i></span>
                <span class="busca-atalho-textos">
                    <span class="busca-atalho-titulo">${escaparHtml(item.titulo)}</span>
                    <span class="busca-atalho-desc">${escaparHtml(item.descricao || item.categoria || "")}</span>
                </span>
                <span class="busca-atalho-tag">${escaparHtml(item.categoria || "Atalho")}</span>
            </button>
        `;
    }

    function fecharBuscaGlobalSistema(menu){
        const resultados = menu?.querySelector("#resultadosBuscaGlobalSistema");
        if(resultados){
            resultados.classList.remove("aberto");
            resultados.innerHTML = "";
        }
    }

    function navegarParaAtalhoSistema(destino){
        if(!destino || normalizarUrlInterna(destino) === "telas/pdv/pdv.html") return;

        const tela = normalizarUrlInterna(destino);
        const hash = destino.includes("#") ? "#" + destino.split("#").slice(1).join("#") : "";

        if(paginaAtual === paginaSistema){
            const url = new URL(location.href);
            url.searchParams.set("tela", tela + hash);
            location.href = url.href;
            return;
        }

        location.href = resolverUrlInterna("telas/shell/sistema.html?tela=" + encodeURIComponent(tela + hash));
    }

    function obterAtalhosBuscaSistema(){
        return [
            { titulo:"Inicio", descricao:"Resumo geral do sistema", categoria:"Sistema", destino:"telas/acesso/principal.html", icone:"fa-house", tags:"dashboard inicio home" },
            { titulo:"Cadastros", descricao:"Central de clientes, produtos, usuarios e fornecedores", categoria:"Cadastros", destino:"telas/cadastros/abacadastros.html", icone:"fa-address-book", tags:"cliente produto fornecedor usuario" },
            { titulo:"Clientes", descricao:"Lista de clientes cadastrados", categoria:"Cadastros", destino:"telas/cadastros/clientes.html", icone:"fa-users", tags:"cliente consumidor limite credito" },
            { titulo:"Novo cliente", descricao:"Cadastro de cliente", categoria:"Cadastros", destino:"telas/cadastros/cadastrocliente.html", icone:"fa-user-plus", tags:"cliente cadastro" },
            { titulo:"Usuarios", descricao:"Usuarios, permissoes e acessos", categoria:"Cadastros", destino:"telas/cadastros/usuarios.html", icone:"fa-user-gear", tags:"usuario permissao senha operador" },
            { titulo:"Fornecedores", descricao:"Cadastro e consulta de fornecedores", categoria:"Cadastros", destino:"telas/cadastros/fornecedores.html", icone:"fa-truck-field", tags:"fornecedor cnpj compra" },
            { titulo:"Mercadorias", descricao:"Produtos e estoque", categoria:"Produtos", destino:"telas/cadastros/cadastroproduto.html", icone:"fa-boxes-stacked", tags:"produto mercadoria estoque ean codigo ncm" },
            { titulo:"Setores", descricao:"Departamentos e setores de produtos", categoria:"Produtos", destino:"telas/cadastros/setores.html", icone:"fa-layer-group", tags:"departamento grupo categoria" },
            { titulo:"Tabela de precos", descricao:"Tabelas de preco de produtos", categoria:"Produtos", destino:"telas/cadastros/tabelaprecos.html", icone:"fa-tags", tags:"preco tabela desconto" },
            { titulo:"Formas de pagamento", descricao:"Dinheiro, PIX, credito, debito e outras formas", categoria:"Caixa", destino:"telas/cadastros/formaspagamento.html", icone:"fa-credit-card", tags:"pagamento pix dinheiro cartao" },
            { titulo:"Notas Fiscais", descricao:"NF-e, NFC-e, entradas e documentos fiscais", categoria:"Fiscal", destino:"telas/notasfiscais/notasfiscais.html", icone:"fa-file-invoice", tags:"nota fiscal nfe nfce xml sefaz" },
            { titulo:"Emitir NF-e", descricao:"Emissao de nota fiscal eletronica", categoria:"Fiscal", destino:"telas/notasfiscais/emitirnfe.html", icone:"fa-file-circle-plus", tags:"nfe emitir fiscal" },
            { titulo:"Entrada de notas", descricao:"Importacao e conferencia de notas de entrada", categoria:"Fiscal", destino:"telas/notasfiscais/entradas-notas.html", icone:"fa-file-import", tags:"entrada compra xml fornecedor" },
            { titulo:"Entradas pendentes", descricao:"Notas de entrada aguardando confirmacao", categoria:"Fiscal", destino:"telas/notasfiscais/entradas-pendentes.html", icone:"fa-clock", tags:"entrada pendente compra" },
            { titulo:"Entradas confirmadas", descricao:"Historico de entradas confirmadas", categoria:"Fiscal", destino:"telas/notasfiscais/entradas-confirmadas.html", icone:"fa-check-double", tags:"entrada confirmada compra" },
            { titulo:"Manifestacao do destinatario", descricao:"Ciencia, confirmacao e desconhecimento de operacao", categoria:"Fiscal", destino:"telas/notasfiscais/manifestacao-destinatario.html", icone:"fa-clipboard-check", tags:"manifestacao destinatario nfe" },
            { titulo:"Movimento", descricao:"Vendas, financeiro, entregas e eventos", categoria:"Movimento", destino:"telas/movimento/movimento.html", icone:"fa-wallet", tags:"venda financeiro movimento caixa" },
            { titulo:"Vendas PDV", descricao:"Dashboard e movimentacoes de vendas", categoria:"Movimento", destino:"telas/movimento/vendaspdv.html", icone:"fa-chart-line", tags:"vendas pdv resumo ticket" },
            { titulo:"Entregas", descricao:"Controle de entregas", categoria:"Movimento", destino:"telas/movimento/entregas.html", icone:"fa-truck", tags:"entrega motoboy endereco" },
            { titulo:"Pedidos de Venda", descricao:"Pre-atendimento de balcao, orcamentos e reserva de estoque", categoria:"Movimento", destino:"telas/movimento/pedidosvenda.html", icone:"fa-cart-shopping", tags:"pedido venda balcao orcamento reserva importar caixa" },
            { titulo:"Promocoes", descricao:"Promocoes por produto", categoria:"Movimento", destino:"telas/movimento/promocoes.html", icone:"fa-percent", tags:"promocao desconto produto" },
            { titulo:"Etiquetas", descricao:"Impressao e configuracao de etiquetas", categoria:"Movimento", destino:"telas/movimento/etiquetas.html", icone:"fa-barcode", tags:"etiqueta codigo barras preco" },
            { titulo:"Sugestao de Compras", descricao:"Analise de giro, estoque minimo e geracao de pedido de compra", categoria:"Movimento", destino:"telas/movimento/sugestaocompras.html", icone:"fa-cart-plus", tags:"compra reposicao estoque minimo fornecedor pedido" },
            { titulo:"Contas a receber", descricao:"Recebimentos e pendencias de clientes", categoria:"Financeiro", destino:"telas/movimento/contasareceber.html", icone:"fa-hand-holding-dollar", tags:"receber cliente vencimento" },
            { titulo:"Contas a pagar", descricao:"Pagamentos e fornecedores", categoria:"Financeiro", destino:"telas/movimento/financeiro.html", icone:"fa-money-bill-transfer", tags:"pagar fornecedor vencimento" },
            { titulo:"Boletos", descricao:"Boletos bancarios", categoria:"Financeiro", destino:"telas/movimento/boleto.html", icone:"fa-barcode", tags:"boleto banco remessa" },
            { titulo:"Salarios", descricao:"Controle de salarios", categoria:"Financeiro", destino:"telas/movimento/financeiro.html", icone:"fa-id-card", tags:"salario funcionario pagamento" },
            { titulo:"Eventos do caixa", descricao:"Log e auditoria do caixa", categoria:"Movimento", destino:"telas/movimento/eventoscaixa.html", icone:"fa-list-check", tags:"evento caixa auditoria operador" },
            { titulo:"Fluxo de caixa", descricao:"Entradas, saidas e saldo", categoria:"Financeiro", destino:"telas/movimento/movimento-fluxo.html", icone:"fa-arrow-trend-up", tags:"fluxo caixa saldo financeiro" },
            { titulo:"Relatorios", descricao:"Central de relatorios do sistema", categoria:"Relatorios", destino:"telas/relatorios/relatorios.html", icone:"fa-chart-bar", tags:"relatorio vendas produtos clientes" },
            { titulo:"Relatorio de vendas", descricao:"Vendas do periodo, itens e forma de pagamento", categoria:"Relatorios", destino:"telas/relatorios/relatorio-vendas.html", icone:"fa-cart-shopping", tags:"relatorio venda periodo vendedor pdf" },
            { titulo:"Relatorio de cancelamentos", descricao:"Vendas canceladas e motivo do cancelamento", categoria:"Relatorios", destino:"telas/relatorios/relatorio-cancelamentos.html", icone:"fa-rotate-left", tags:"relatorio cancelamento venda motivo" },
            { titulo:"Relatorio de estoque", descricao:"Situacao do estoque e itens no minimo", categoria:"Relatorios", destino:"telas/relatorios/relatorio-estoque.html", icone:"fa-boxes-stacked", tags:"relatorio estoque minimo produto mercadoria" },
            { titulo:"Relatorio financeiro", descricao:"Contas a pagar, a receber e movimentos de caixa", categoria:"Relatorios", destino:"telas/relatorios/relatorio-financeiro.html", icone:"fa-sack-dollar", tags:"relatorio financeiro contas pagar receber caixa" },
            { titulo:"Relatorio de clientes", descricao:"Relacao de clientes cadastrados", categoria:"Relatorios", destino:"telas/relatorios/relatorio-clientes.html", icone:"fa-users", tags:"relatorio cliente cadastro contato" },
            { titulo:"Produtos mais vendidos", descricao:"Ranking de produtos por quantidade e valor vendido", categoria:"Relatorios", destino:"telas/relatorios/relatorio-produtosvendidos.html", icone:"fa-ranking-star", tags:"relatorio produto ranking mais vendido" },
            { titulo:"Notas fiscais emitidas", descricao:"NF-e e NFC-e emitidas, busca por cliente ou numero", categoria:"Relatorios", destino:"telas/relatorios/relatorio-nfemitidas.html", icone:"fa-file-invoice", tags:"relatorio nota fiscal nfe nfce emitida numero cliente" },
            { titulo:"Margem de lucro", descricao:"Preco de custo, preco de venda e margem dos produtos", categoria:"Relatorios", destino:"telas/relatorios/relatorio-margemlucro.html", icone:"fa-scale-balanced", tags:"relatorio margem lucro custo venda produto" },
            { titulo:"Inventario", descricao:"Quantidade em estoque e valorizacao pelo custo e venda", categoria:"Relatorios", destino:"telas/relatorios/relatorio-inventario.html", icone:"fa-warehouse", tags:"relatorio inventario estoque valorizacao produto" },
            { titulo:"Curva ABC", descricao:"Classificacao dos produtos por importancia no faturamento", categoria:"Relatorios", destino:"telas/relatorios/relatorio-curvaabc.html", icone:"fa-chart-pie", tags:"relatorio curva abc classificacao produto faturamento" },
            { titulo:"Itens vendidos", descricao:"Listagem detalhada de cada item vendido no periodo", categoria:"Relatorios", destino:"telas/relatorios/relatorio-itensvendidos.html", icone:"fa-list-check", tags:"relatorio item vendido detalhe venda" },
            { titulo:"Comissao", descricao:"Comissao por vendedor no periodo", categoria:"Relatorios", destino:"telas/relatorios/relatorio-comissao.html", icone:"fa-hand-holding-dollar", tags:"relatorio comissao vendedor venda" },
            { titulo:"NF de entradas", descricao:"Notas fiscais de compra/entrada no periodo", categoria:"Relatorios", destino:"telas/relatorios/relatorio-nfentradas.html", icone:"fa-file-import", tags:"relatorio nota fiscal entrada compra fornecedor" },
            { titulo:"Aniversario de clientes", descricao:"Clientes que fazem aniversario no mes selecionado", categoria:"Relatorios", destino:"telas/relatorios/relatorio-aniversario.html", icone:"fa-cake-candles", tags:"relatorio aniversario cliente nascimento mes" },
            { titulo:"Ficha cadastral", descricao:"Dados completos de um cliente, com historico de compras", categoria:"Relatorios", destino:"telas/relatorios/relatorio-fichacadastral.html", icone:"fa-id-card", tags:"relatorio ficha cadastral cliente historico" },
            { titulo:"Boletos bancarios", descricao:"Boletos emitidos no periodo, vencimento, valor e status", categoria:"Relatorios", destino:"telas/relatorios/relatorio-boletos.html", icone:"fa-barcode", tags:"relatorio boleto banco vencimento" },
            { titulo:"Validade de mercadorias", descricao:"Produtos vencidos ou proximos do vencimento", categoria:"Relatorios", destino:"telas/relatorios/relatorio-validademercadorias.html", icone:"fa-hourglass-half", tags:"relatorio validade vencimento mercadoria produto" },
            { titulo:"Alteracoes de produtos", descricao:"Historico de criacoes e edicoes de produtos", categoria:"Relatorios", destino:"telas/relatorios/relatorio-alteracoesprodutos.html", icone:"fa-clock-rotate-left", tags:"relatorio alteracao edicao produto historico auditoria" },
            { titulo:"Entrada e saida de produtos", descricao:"Movimentacoes de estoque no periodo", categoria:"Relatorios", destino:"telas/relatorios/relatorio-movimentoestoque.html", icone:"fa-truck-ramp-box", tags:"relatorio entrada saida movimento estoque produto" },
            { titulo:"Configuracoes", descricao:"Manutencao e parametros do sistema", categoria:"Configuracoes", destino:"telas/configuracoes/manutenção.html", icone:"fa-gear", tags:"configuracao parametro manutencao" },
            { titulo:"Cadastro da empresa", descricao:"Dados da empresa usados no sistema", categoria:"Configuracoes", destino:"telas/configuracoes/empresa.html", icone:"fa-building", tags:"empresa cnpj razao social endereco" },
            { titulo:"Configuracoes fiscais", descricao:"Certificado, NF-e, NFC-e, CFOP e impostos", categoria:"Configuracoes", destino:"telas/configuracoes/fiscal.html", icone:"fa-file-shield", tags:"fiscal certificado nfe nfce cfop imposto" },
            { titulo:"Configuracoes do sistema", descricao:"Tema, backup, seguranca e comportamento", categoria:"Configuracoes", destino:"telas/configuracoes/sistema.html", icone:"fa-sliders", tags:"sistema tema backup seguranca parametros" },
            { titulo:"Parametros do caixa", descricao:"Atalhos, pesquisa, balanca, impressao e finalizacao", categoria:"Configuracoes", destino:"telas/configuracoes/sistema.html", icone:"fa-cash-register", tags:"caixa pdv balanca pesquisa impressao atalhos finalizacao" },
            { titulo:"Baixar XML", descricao:"Download de documentos XML", categoria:"Configuracoes", destino:"telas/configuracoes/baixarxml.html", icone:"fa-download", tags:"xml baixar backup fiscal" },
            { titulo:"Conversao de dados", descricao:"Importar e exportar dados do sistema", categoria:"Configuracoes", destino:"telas/configuracoes/conversaodados.html", icone:"fa-right-left", tags:"importar exportar conversao csv excel json" },
            { titulo:"Pedidos de Venda (configuracao)", descricao:"Ativar modulo, reserva de estoque e numeracao", categoria:"Configuracoes", destino:"telas/configuracoes/sistema.html", icone:"fa-cart-shopping", tags:"pedidos venda configuracao reserva numeracao" },
            { titulo:"Controle remoto", descricao:"Solicitacao de autorizacao remota para acoes restritas", categoria:"Configuracoes", destino:"telas/configuracoes/sistema.html", icone:"fa-user-shield", tags:"controle remoto autorizacao permissao solicitar" }
        ].filter(function(item) {
            return normalizarUrlInterna(item.destino) !== "telas/pdv/pdv.html";
        });
    }

    function configurarSinoNotificacoes(menu){
        const botao = menu.querySelector(".btn-sino");
        const painel = menu.querySelector("#painelNotificacoesSistema");
        if(!botao || !painel) return;

        renderizarNotificacoesSistema(menu);

        botao.addEventListener("click", function(evento) {
            evento.stopPropagation();
            fecharBuscaGlobalSistema(menu);
            menu.querySelector(".menu-usuario-info")?.classList.remove("aberto");
            const aberto = painel.classList.toggle("aberto");
            painel.setAttribute("aria-hidden", String(!aberto));
            if(aberto) renderizarNotificacoesSistema(menu);
        });

        document.addEventListener("click", function(evento) {
            if(!painel.contains(evento.target) && !botao.contains(evento.target)) fecharPainelNotificacoesSistema(menu);
        });

        const btnLimpar = menu.querySelector("#btnLimparNotificacoesSistema");
        btnLimpar?.addEventListener("click", function(evento) {
            evento.stopPropagation();
            localStorage.setItem("avisosSistema", "[]");
            renderizarNotificacoesSistema(menu);
        });

        window.addEventListener("sistema:aviso", function() {
            renderizarNotificacoesSistema(menu);
        });

        window.addEventListener("sistema:solicitacao", function() {
            renderizarNotificacoesSistema(menu);
        });

        window.addEventListener("storage", function(evento) {
            if(["avisosSistema", "solicitacoesRemotasSistema"].includes(evento.key) || evento.key === null) renderizarNotificacoesSistema(menu);
        });
    }

    function fecharPainelNotificacoesSistema(menu){
        const painel = menu?.querySelector("#painelNotificacoesSistema");
        if(painel){
            painel.classList.remove("aberto");
            painel.setAttribute("aria-hidden", "true");
        }
    }

    function renderizarNotificacoesSistema(menu){
        const lista = menu.querySelector("#listaNotificacoesSistema");
        const resumo = menu.querySelector("#resumoNotificacoesSistema");
        const badge = menu.querySelector("#badgeNotificacoesSistema");
        if(!lista || !resumo || !badge) return;

        const notificacoes = obterNotificacoesSistema();
        const total = notificacoes.length;

        resumo.textContent = total === 1 ? "1 aviso" : total + " avisos";
        badge.textContent = String(Math.min(total, 99));
        badge.classList.toggle("visivel", total > 0);

        lista.innerHTML = total
            ? notificacoes.map(function(item) {
                const valorHtml = item.valor != null ? `<span class="notificacao-valor">${escaparHtml(formatarMoedaRS(item.valor))}</span>` : "";
                const clicavel = item.solicitacaoId ? ` clicavel" onclick="abrirPopupSolicitacaoRemota('${escaparHtml(item.solicitacaoId)}')` : "";
                const dica = item.solicitacaoId ? `<span class="notificacao-dica">Clique para revisar e aprovar/negar</span>` : "";
                return `
                    <div class="notificacao-item ${escaparHtml(item.tipo || "info")}${clicavel}">
                        <span class="notificacao-icone"><i class="fas ${escaparHtml(item.icone || "fa-bell")}"></i></span>
                        <span class="notificacao-texto">
                            <strong>${escaparHtml(item.titulo)}</strong>
                            <span>${escaparHtml(item.texto)}</span>
                            ${valorHtml}
                            ${dica}
                        </span>
                    </div>
                `;
            }).join("")
            : `
                <div class="notificacao-item">
                    <span class="notificacao-icone"><i class="fas fa-check"></i></span>
                    <span class="notificacao-texto">
                        <strong>Tudo em dia</strong>
                        <span>Nenhuma notificacao importante no momento.</span>
                    </span>
                </div>
            `;
    }

    function obterNotificacoesSistema(){
        const base = obterBase();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const contasReceberVencidas = (base.contasReceber || []).filter(function(conta) {
            return !conta.pago && !conta.baixado && dataVencidaSistema(conta.vencimento || conta.dataVencimento, hoje);
        }).length;

        const contasPagarVencidas = (base.contasPagar || []).filter(function(conta) {
            return !conta.pago && !conta.baixado && dataVencidaSistema(conta.vencimento || conta.dataVencimento, hoje);
        }).length;

        const estoqueBaixo = (base.mercadorias || []).filter(function(produto) {
            const estoque = numero(produto.estoque ?? produto.quantidade ?? produto.qtd);
            const minimo = numero(produto.estoqueMinimo ?? produto.minimo);
            return minimo > 0 && estoque <= minimo;
        }).length;

        const entregasPendentes = (base.entregas || []).filter(function(entrega) {
            const status = normalizar(entrega.status || entrega.situacao);
            return !["entregue", "finalizada", "cancelada", "concluida"].includes(status);
        }).length;

        const itens = [];
        if(contasReceberVencidas) itens.push({ tipo:"aviso", icone:"fa-hand-holding-dollar", titulo:"Contas a receber vencidas", texto:contasReceberVencidas + " conta(s) aguardando recebimento." });
        if(contasPagarVencidas) itens.push({ tipo:"erro", icone:"fa-money-bill-transfer", titulo:"Contas a pagar vencidas", texto:contasPagarVencidas + " conta(s) aguardando pagamento." });
        if(estoqueBaixo) itens.push({ tipo:"aviso", icone:"fa-boxes-stacked", titulo:"Estoque baixo", texto:estoqueBaixo + " produto(s) abaixo do estoque minimo." });
        if(entregasPendentes) itens.push({ tipo:"info", icone:"fa-truck", titulo:"Entregas pendentes", texto:entregasPendentes + " entrega(s) em aberto." });

        const avisosSistema = lerJson("avisosSistema", []);
        avisosSistema.forEach(function(aviso) {
            itens.push({
                tipo: aviso.tipo === "erro" ? "erro" : "aviso",
                icone: aviso.tipo === "erro" ? "fa-circle-exclamation" : "fa-triangle-exclamation",
                titulo: aviso.tipo === "erro" ? "Erro do sistema" : "Aviso do sistema",
                texto: aviso.texto
            });
        });

        if(window.SistemaCore?.ehAdm?.()){
            const solicitacoes = lerJson("solicitacoesRemotasSistema", []);
            solicitacoes.filter(function(s) { return s.status === "pendente"; }).forEach(function(s) {
                itens.push({
                    tipo: "erro",
                    icone: "fa-user-clock",
                    titulo: "Solicitação de " + s.usuarioNome,
                    texto: s.descricao,
                    valor: s.valor,
                    solicitacaoId: s.id
                });
            });
        }

        avisarSolicitanteSobreResolucao();

        return itens;
    }

    function avisarSolicitanteSobreResolucao(){
        const usuario = window.SistemaCore?.usuario?.();
        if(!usuario) return;

        const lista = lerJson("solicitacoesRemotasSistema", []);
        let mudou = false;

        lista.forEach(function(s) {
            if(s.usuarioLogin === usuario.login && s.status !== "pendente" && !s.avisadoSolicitante){
                s.avisadoSolicitante = true;
                mudou = true;
                if(s.status === "aprovado"){
                    notificar("Solicitação autorizada: " + s.descricao + ". Tente novamente.", "sucesso");
                }else if(s.status === "negado"){
                    notificar("Solicitação negada: " + s.descricao + ".", "erro");
                }
            }
        });

        if(mudou) localStorage.setItem("solicitacoesRemotasSistema", JSON.stringify(lista));
    }

    function dataVencidaSistema(valor, hoje){
        if(!valor) return false;
        const data = new Date(String(valor).slice(0, 10) + "T00:00:00");
        if(Number.isNaN(data.getTime())) return false;
        return data < hoje;
    }

    function linkMenu(href, texto, permissao, icone, idAttr){
        const telaSistema = paginaAtual === paginaSistema ? normalizarTelaSistema() : paginaAtual;
        const ativo = telaSistema === href.toLowerCase() || paginaPertenceAoMenu(telaSistema, href);
        return `<a ${idAttr ? `id="${idAttr}" ` : ""}href="${resolverUrlInterna(href)}" data-permissao="${permissao}" class="${ativo ? "ativo" : ""}"><i class="fas ${icone}"></i>${texto}</a>`;
    }

    function normalizarTelaSistema(){
        const tela = new URLSearchParams(location.search).get("tela") || "telas/acesso/principal.html";
        return normalizarUrlInterna(tela);
    }

    function normalizarUrlInterna(url){
        const valorTexto = String(url || "telas/acesso/principal.html").split("?")[0].split("#")[0].replace(/\\/g, "/");
        const indicePagesTexto = valorTexto.indexOf("telas/");
        if(indicePagesTexto >= 0) return valorTexto.slice(indicePagesTexto);

        try{
            const caminho = decodeURIComponent(new URL(url, document.baseURI).pathname).replace(/\\/g, "/");
            const indicePages = caminho.indexOf("/telas/");
            if(indicePages >= 0) return caminho.slice(indicePages + 1);
            const ultimoSegmento = caminho.split("/").filter(Boolean).pop() || "";
            // Sem segmento .html (raiz, pasta ou barra final) = documento padrao servido: index.html
            return ultimoSegmento.toLowerCase().endsWith(".html") ? ultimoSegmento : "index.html";
        }catch{
            const ultimoSegmento = valorTexto.split("/").filter(Boolean).pop() || "";
            return ultimoSegmento.toLowerCase().endsWith(".html") ? ultimoSegmento : "index.html";
        }
    }

    function obterBaseErp(){
        try {
            const caminho = decodeURIComponent(new URL(location.href).pathname).replace(/\\/g, "/");
            const idx = caminho.indexOf("/telas/");
            const base = idx >= 0
                ? location.origin + caminho.slice(0, idx + 1)
                : location.origin + caminho.slice(0, caminho.lastIndexOf("/") + 1);
            return base;
        } catch(e) {
            return document.baseURI.replace(/[^/]*$/, "");
        }
    }

    function resolverUrlInterna(url){
        return new URL(url || "telas/acesso/principal.html", obterBaseErp()).href;
    }

    function paginaPertenceAoMenu(pagina, href){
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
                "telas/movimento/entregas.html", "telas/movimento/etiquetas.html",
                "telas/movimento/sugestaocompras.html"
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

        return (grupos[href] || []).includes(pagina);
    }

    function inicializarUsuarios(){
        const base = obterBase();

        if(!Array.isArray(base.usuarios) || base.usuarios.length === 0){
            base.usuarios = [usuarioAdm()];
            salvarBase(base);
        }
    }

    function usuarioAdm(){
        return {
            id: "usr_adm",
            nome: "Administrador",
            login: "ADM",
            senha: "123",
            comissao: 0,
            salario: 0,
            contratacao: "",
            aniversario: "",
            permissoes: permissoesTodas(),
            criadoEm: new Date().toISOString()
        };
    }

    function permissoesTodas(){
        return window.SistemaCore.permissoesTodas();
    }

    function obterUsuarios(){
        return obterBase().usuarios;
    }

    function preencherTexto(seletor, valor){
        document.querySelectorAll(seletor).forEach(function(elemento) {
            elemento.textContent = valor || "";
        });
    }

    function escaparHtml(valor){ return escapar(valor); }

    function iniciais(nome){
        return String(nome || "US")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function(parte) { return parte[0]; })
            .join("")
            .toUpperCase() || "US";
    }

    function lerJsonLocal(chave, fallback){
        try{
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? fallback;
        }catch{
            return fallback;
        }
    }

    function lerJsonSessao(chave, fallback){
        try{
            const valor = JSON.parse(sessionStorage.getItem(chave));
            return valor ?? fallback;
        }catch{
            return fallback;
        }
    }
})();
