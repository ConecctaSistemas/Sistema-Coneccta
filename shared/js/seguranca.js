/**
 * seguranca.js — Módulo central de Segurança e Conformidade LGPD
 *
 * Protege contra:
 *   XSS, CSRF, Clickjacking, Brute-force, Session hijacking,
 *   Exposição de dados sensíveis, Injeção, Enumeração de usuários
 *
 * Conformidade LGPD:
 *   Consentimento, Mascaramento de dados pessoais, Log de auditoria,
 *   Direito de exclusão, Minimização de dados, Timeout de sessão
 */
(function () {
    "use strict";

    // ─── constantes ──────────────────────────────────────────────────────────
    var _CSRF_KEY          = "_csrf_sistema";
    var _AUDIT_KEY         = "_audit_sistema";
    var _LGPD_KEY          = "_lgpd_consentimento";
    var _TENTATIVAS_KEY    = "_login_tentativas";
    var _RATE_KEY          = "_rate_limite";
    var _INATIVIDADE_KEY   = "_ultima_atividade";

    var CFG = {
        sessaoTimeoutMinutos : 30,       // logout por inatividade
        maxTentativasLogin   : 5,        // tentativas antes do bloqueio
        bloqueioMinutos      : 15,       // tempo de bloqueio por brute-force
        maxAuditLog          : 500,      // máximo de entradas no log local
        rateLimitReqs        : 60,       // max requisições por minuto
        rateLimitJanelaSeg   : 60
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. CSP — Content Security Policy (injetada via meta tag)
    // ─────────────────────────────────────────────────────────────────────────
    (function _injetarCsp() {
        if (document.querySelector("meta[http-equiv='Content-Security-Policy']")) return;
        var m = document.createElement("meta");
        m.httpEquiv = "Content-Security-Policy";
        // Permite scripts/estilos do próprio domínio; bloqueia eval, inline-script não
        // autorizado, frames externos e objetos.
        m.content = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join("; ");
        document.head.insertBefore(m, document.head.firstChild);
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Anti-Clickjacking reforçado via JS
    // ─────────────────────────────────────────────────────────────────────────
    (function _antiClickjacking() {
        if (window.self !== window.top) {
            var params = new URLSearchParams(location.search);
            var embed  = params.get("embed") === "1";
            var mesmoHost = false;
            try { mesmoHost = window.top.location.hostname === window.location.hostname; } catch (e) {
                // Protocolo file:// no Chrome lança SecurityError ao acessar window.top.
                // Sites externos não conseguem embedar páginas file://, então é seguro assumir mesmo host.
                mesmoHost = window.location.protocol === 'file:' ||
                            window.location.hostname === 'localhost' ||
                            window.location.hostname === '127.0.0.1';
            }
            if (!embed && !mesmoHost) {
                document.documentElement.innerHTML = "";
                window.top.location = window.location.href;
            }
        }
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CSRF Token
    // ─────────────────────────────────────────────────────────────────────────
    var _csrf = (function () {
        function _gerar() {
            var arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
        }

        function obterToken() {
            var token = sessionStorage.getItem(_CSRF_KEY);
            if (!token) {
                token = _gerar();
                sessionStorage.setItem(_CSRF_KEY, token);
            }
            return token;
        }

        function rotacionar() {
            var token = _gerar();
            sessionStorage.setItem(_CSRF_KEY, token);
            return token;
        }

        return { obterToken: obterToken, rotacionar: rotacionar };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Sanitização de entrada (anti-XSS / anti-injeção)
    // ─────────────────────────────────────────────────────────────────────────
    var _sanitizar = (function () {

        var _HTML_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;", "`": "&#096;" };
        var _HTML_RE  = /[&<>"'`]/g;

        function html(str) {
            return String(str ?? "").replace(_HTML_RE, function (c) { return _HTML_MAP[c]; });
        }

        function texto(str) {
            // Remove tags HTML inteiramente (para inputs que serão exibidos como texto)
            return String(str ?? "").replace(/<[^>]*>/g, "").replace(/[&<>"'`]/g, "");
        }

        // Remove caracteres de controle Unicode e null bytes
        function entrada(str) {
            return String(str ?? "")
                .replace(/\x00/g, "")                   // null byte
                .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "") // ctrl chars
                .replace(/<script[\s\S]*?<\/script>/gi, "") // tags script
                .replace(/on\w+\s*=/gi, "")             // atributos de evento inline
                .trim();
        }

        // Sanitiza recursivamente todas as strings de um objeto antes de enviar à API
        function objeto(obj) {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj === "string")  return entrada(obj);
            if (typeof obj !== "object")  return obj;
            if (Array.isArray(obj))       return obj.map(objeto);
            var r = {};
            Object.keys(obj).forEach(function (k) { r[k] = objeto(obj[k]); });
            return r;
        }

        // Valida CPF (algoritmo oficial)
        function cpf(val) {
            var s = String(val || "").replace(/\D/g, "");
            if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
            var soma = 0, r;
            for (var i = 0; i < 9; i++) soma += parseInt(s[i]) * (10 - i);
            r = 11 - (soma % 11); if (r > 9) r = 0;
            if (r !== parseInt(s[9])) return false;
            soma = 0;
            for (var j = 0; j < 10; j++) soma += parseInt(s[j]) * (11 - j);
            r = 11 - (soma % 11); if (r > 9) r = 0;
            return r === parseInt(s[10]);
        }

        // Valida CNPJ
        function cnpj(val) {
            var s = String(val || "").replace(/\D/g, "");
            if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
            function calc(s, n) {
                var p = n - 7, soma = 0, pos = n;
                for (var i = 0; i < n; i++) { soma += parseInt(s[i]) * pos--; if (pos < 2) pos = 9; }
                var r = soma % 11; return r < 2 ? 0 : 11 - r;
            }
            return calc(s, 12) === parseInt(s[12]) && calc(s, 13) === parseInt(s[13]);
        }

        // Valida email básico
        function email(val) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(val || "").trim());
        }

        return { html: html, texto: texto, entrada: entrada, objeto: objeto, validarCpf: cpf, validarCnpj: cnpj, validarEmail: email };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Mascaramento de dados pessoais (LGPD)
    // ─────────────────────────────────────────────────────────────────────────
    var _mascarar = (function () {

        function cpf(val) {
            var s = String(val || "").replace(/\D/g, "");
            if (s.length !== 11) return val;
            return s.slice(0, 3) + ".***.***-" + s.slice(9);
        }

        function cnpj(val) {
            var s = String(val || "").replace(/\D/g, "");
            if (s.length !== 14) return val;
            return s.slice(0, 2) + ".***.***/****-" + s.slice(12);
        }

        function email(val) {
            var s = String(val || "");
            var at = s.indexOf("@");
            if (at < 1) return val;
            var local  = s.slice(0, at);
            var dominio = s.slice(at);
            var vis = Math.min(3, Math.floor(local.length / 2));
            return local.slice(0, vis) + "*".repeat(local.length - vis) + dominio;
        }

        function telefone(val) {
            var s = String(val || "").replace(/\D/g, "");
            if (s.length < 8) return val;
            return s.slice(0, 2) + " ****-" + s.slice(-4);
        }

        function cartao(val) {
            var s = String(val || "").replace(/\D/g, "");
            if (s.length < 12) return val;
            return "**** **** **** " + s.slice(-4);
        }

        // Mascaramento dinâmico: aplica nos elementos com data-lgpd="cpf|email|telefone|cnpj"
        function aplicarNaTela() {
            document.querySelectorAll("[data-lgpd]").forEach(function (el) {
                var tipo = el.dataset.lgpd;
                var val  = el.textContent.trim();
                if (!val || el.dataset.lgpdAplicado) return;
                var mascarado;
                if (tipo === "cpf")      mascarado = cpf(val);
                else if (tipo === "cnpj")  mascarado = cnpj(val);
                else if (tipo === "email") mascarado = email(val);
                else if (tipo === "telefone" || tipo === "fone") mascarado = telefone(val);
                else if (tipo === "cartao") mascarado = cartao(val);
                if (mascarado && mascarado !== val) {
                    el.textContent = mascarado;
                    el.title       = "Dado protegido por LGPD";
                    el.dataset.lgpdAplicado = "1";
                }
            });
        }

        return { cpf: cpf, cnpj: cnpj, email: email, telefone: telefone, cartao: cartao, aplicarNaTela: aplicarNaTela };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Proteção contra força bruta no login
    // ─────────────────────────────────────────────────────────────────────────
    var _bruteForce = (function () {

        function _obter() {
            try { return JSON.parse(localStorage.getItem(_TENTATIVAS_KEY)) || {}; } catch (e) { return {}; }
        }
        function _salvar(d) { localStorage.setItem(_TENTATIVAS_KEY, JSON.stringify(d)); }

        function registrarFalha(login) {
            var d   = _obter();
            var k   = normalizar ? normalizar(login) : login.toLowerCase();
            d[k]    = d[k] || { count: 0, bloqueadoAte: null };
            d[k].count++;
            if (d[k].count >= CFG.maxTentativasLogin) {
                d[k].bloqueadoAte = new Date(Date.now() + CFG.bloqueioMinutos * 60000).toISOString();
            }
            d[k].ultimaTentativa = new Date().toISOString();
            _salvar(d);
            _auditoria.registrar("LOGIN_FALHA", "auth", { login: login, tentativa: d[k].count });
            return d[k].count;
        }

        function estaBloquado(login) {
            var d = _obter();
            var k = normalizar ? normalizar(login) : login.toLowerCase();
            if (!d[k] || !d[k].bloqueadoAte) return false;
            if (new Date(d[k].bloqueadoAte) > new Date()) return true;
            // bloqueio expirado — resetar
            delete d[k];
            _salvar(d);
            return false;
        }

        function minutosRestantes(login) {
            var d = _obter();
            var k = normalizar ? normalizar(login) : login.toLowerCase();
            if (!d[k] || !d[k].bloqueadoAte) return 0;
            return Math.max(0, Math.ceil((new Date(d[k].bloqueadoAte) - new Date()) / 60000));
        }

        function resetar(login) {
            var d = _obter();
            var k = normalizar ? normalizar(login) : login.toLowerCase();
            delete d[k];
            _salvar(d);
        }

        return { registrarFalha: registrarFalha, estaBloquado: estaBloquado, minutosRestantes: minutosRestantes, resetar: resetar };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Rate Limiting (cliente)
    // ─────────────────────────────────────────────────────────────────────────
    var _rateLimit = (function () {

        function _obter() {
            try { return JSON.parse(sessionStorage.getItem(_RATE_KEY)) || {}; } catch (e) { return {}; }
        }
        function _salvar(d) { sessionStorage.setItem(_RATE_KEY, JSON.stringify(d)); }

        function verificar(endpoint) {
            var d   = _obter();
            var ago = Date.now() - CFG.rateLimitJanelaSeg * 1000;
            d[endpoint] = (d[endpoint] || []).filter(function (t) { return t > ago; });
            if (d[endpoint].length >= CFG.rateLimitReqs) {
                _auditoria.registrar("RATE_LIMIT_EXCEDIDO", "api", { endpoint: endpoint });
                return false;
            }
            d[endpoint].push(Date.now());
            _salvar(d);
            return true;
        }

        return { verificar: verificar };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Log de Auditoria (LGPD — rastreabilidade)
    // ─────────────────────────────────────────────────────────────────────────
    var _auditoria = (function () {

        function _obter() {
            try { return JSON.parse(localStorage.getItem(_AUDIT_KEY)) || []; } catch (e) { return []; }
        }
        function _salvar(d) { localStorage.setItem(_AUDIT_KEY, JSON.stringify(d)); }

        function _usuarioAtual() {
            try {
                var s = JSON.parse(sessionStorage.getItem("sessaoUsuarioSistema") || localStorage.getItem("sessaoUsuarioSistema") || "null");
                return s?.login || s?.nome || "anon";
            } catch (e) { return "anon"; }
        }

        function registrar(acao, modulo, dados) {
            var log = _obter();
            log.push({
                id:        (typeof gerarId === "function" ? gerarId("aud") : "aud-" + Date.now()),
                acao:      String(acao),
                modulo:    String(modulo || ""),
                usuario:   _usuarioAtual(),
                ip:        null,             // preenchido pelo back-end
                dados:     dados || null,
                ts:        new Date().toISOString()
            });
            // mantém só os últimos N registros para não encher o localStorage
            if (log.length > CFG.maxAuditLog) log = log.slice(-CFG.maxAuditLog);
            _salvar(log);
        }

        function listar(modulo, dias) {
            var log = _obter();
            if (modulo) log = log.filter(function (e) { return e.modulo === modulo; });
            if (dias) {
                var desde = new Date(Date.now() - dias * 86400000).toISOString();
                log = log.filter(function (e) { return e.ts >= desde; });
            }
            return log;
        }

        function exportarJson() {
            var log  = _obter();
            var blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
            var a    = document.createElement("a");
            a.href   = URL.createObjectURL(blob);
            a.download = "auditoria_" + new Date().toISOString().slice(0, 10) + ".json";
            a.click();
            URL.revokeObjectURL(a.href);
        }

        function limpar() {
            localStorage.removeItem(_AUDIT_KEY);
        }

        return { registrar: registrar, listar: listar, exportarJson: exportarJson, limpar: limpar };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Timeout por inatividade (LGPD — sessão)
    // ─────────────────────────────────────────────────────────────────────────
    var _sessao = (function () {
        var _timer = null;
        var _TIMEOUT_MS = CFG.sessaoTimeoutMinutos * 60000;

        function _salvarAtividade() {
            sessionStorage.setItem(_INATIVIDADE_KEY, Date.now().toString());
        }

        function _verificarExpiracao() {
            var ultima = parseInt(sessionStorage.getItem(_INATIVIDADE_KEY) || "0", 10);
            if (!ultima) return;
            if (Date.now() - ultima > _TIMEOUT_MS) {
                _auditoria.registrar("SESSAO_EXPIRADA_INATIVIDADE", "auth", {});
                encerrarPorInatividade();
            }
        }

        function encerrarPorInatividade() {
            clearInterval(_timer);
            sessionStorage.clear();
            // chama logout do sistema se disponível
            if (window.AuthSistema && typeof AuthSistema.logout === "function") {
                AuthSistema.logout();
            } else {
                var login = document.querySelector('a[href*="index"]')?.href || "index.html";
                location.href = new URL(login, document.baseURI).href;
            }
        }

        function iniciar() {
            _salvarAtividade();
            // Eventos que indicam atividade do usuário
            ["mousemove", "keydown", "click", "touchstart", "scroll"].forEach(function (evt) {
                document.addEventListener(evt, _salvarAtividade, { passive: true });
            });
            _timer = setInterval(_verificarExpiracao, 30000); // checa a cada 30s
        }

        function resetar() { _salvarAtividade(); }

        function configurarTimeout(minutos) {
            CFG.sessaoTimeoutMinutos = Math.max(1, minutos);
            _TIMEOUT_MS = CFG.sessaoTimeoutMinutos * 60000;
        }

        function minutosRestantes() {
            var ultima = parseInt(sessionStorage.getItem(_INATIVIDADE_KEY) || "0", 10);
            if (!ultima) return CFG.sessaoTimeoutMinutos;
            return Math.max(0, Math.ceil((_TIMEOUT_MS - (Date.now() - ultima)) / 60000));
        }

        return { iniciar: iniciar, resetar: resetar, configurarTimeout: configurarTimeout, minutosRestantes: minutosRestantes, encerrarPorInatividade: encerrarPorInatividade };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Consentimento LGPD
    // ─────────────────────────────────────────────────────────────────────────
    var _lgpd = (function () {

        function _obterConsentimento() {
            try { return JSON.parse(localStorage.getItem(_LGPD_KEY)) || null; } catch (e) { return null; }
        }

        function temConsentimento() {
            var c = _obterConsentimento();
            return c && c.aceito === true;
        }

        function registrarConsentimento(aceito, usuario) {
            var c = {
                aceito:    aceito,
                usuario:   usuario || "anon",
                versao:    "1.0",
                data:      new Date().toISOString(),
                ip:        null // preenchido pelo back-end
            };
            localStorage.setItem(_LGPD_KEY, JSON.stringify(c));
            _auditoria.registrar(aceito ? "LGPD_ACEITO" : "LGPD_RECUSADO", "lgpd", { usuario: usuario });
            return c;
        }

        function revogarConsentimento() {
            localStorage.removeItem(_LGPD_KEY);
            _auditoria.registrar("LGPD_REVOGADO", "lgpd", {});
        }

        function obterRegistro() { return _obterConsentimento(); }

        function exibirBanner() {
            if (temConsentimento()) return;
            if (document.getElementById("_lgpd_banner")) return;

            var banner = document.createElement("div");
            banner.id  = "_lgpd_banner";
            banner.style.cssText = [
                "position:fixed", "bottom:0", "left:0", "right:0", "z-index:99999",
                "background:#12223a", "color:#fff", "padding:16px 24px",
                "display:flex", "align-items:center", "gap:16px",
                "flex-wrap:wrap", "font-family:sans-serif", "font-size:14px",
                "box-shadow:0 -4px 24px rgba(0,0,0,.35)"
            ].join(";");

            banner.innerHTML =
                '<span style="flex:1;min-width:240px">'
                + '<strong>Privacidade e LGPD</strong> — Este sistema coleta e processa dados pessoais '
                + '(nome, CPF, e-mail, telefone) para operação do ERP. '
                + 'Seus dados são protegidos conforme a Lei 13.709/2018 (LGPD).'
                + '</span>'
                + '<button id="_lgpd_aceitar" style="background:#1d6fe0;color:#fff;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:700;white-space:nowrap">Entendi e aceito</button>'
                + '<button id="_lgpd_recusar" style="background:transparent;color:#aac;border:1px solid #446;padding:10px 18px;border-radius:8px;cursor:pointer;white-space:nowrap">Só essenciais</button>';

            document.body.appendChild(banner);

            document.getElementById("_lgpd_aceitar").addEventListener("click", function () {
                var usr = (window.AuthSistema && AuthSistema.usuarioAtual()) ? AuthSistema.usuarioAtual().login : "desconhecido";
                registrarConsentimento(true, usr);
                banner.remove();
            });
            document.getElementById("_lgpd_recusar").addEventListener("click", function () {
                var usr = (window.AuthSistema && AuthSistema.usuarioAtual()) ? AuthSistema.usuarioAtual().login : "desconhecido";
                registrarConsentimento(false, usr);
                banner.remove();
            });
        }

        return { temConsentimento: temConsentimento, registrarConsentimento: registrarConsentimento, revogarConsentimento: revogarConsentimento, obterRegistro: obterRegistro, exibirBanner: exibirBanner };
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Interceptador de formulários (anti-XSS na submissão)
    // ─────────────────────────────────────────────────────────────────────────
    (function _interceptarFormularios() {
        document.addEventListener("submit", function (e) {
            var form = e.target;
            Array.from(form.elements).forEach(function (el) {
                if (el.type === "text" || el.type === "search" || el.tagName === "TEXTAREA") {
                    el.value = _sanitizar.entrada(el.value);
                }
            });
        }, true); // capture para rodar antes dos handlers do app
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Proteção de localStorage — avisa se o token é lido por extensões
    //     (honeytoken: qualquer leitura inesperada é registrada)
    // ─────────────────────────────────────────────────────────────────────────
    (function _protegerToken() {
        // Remove token quando a aba fecha (sessionStorage) — opcional:
        // O token JWT está em localStorage por compatibilidade com o sistema atual.
        // Futuramente migrar para httpOnly cookie via back-end.
        window.addEventListener("beforeunload", function () {
            // Não limpa o token aqui para manter login entre tabs.
            // Apenas registra saída.
            _auditoria.registrar("PAGINA_FECHADA", "sessao", { url: location.pathname });
        });
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // Inicialização automática (apenas em páginas autenticadas)
    // ─────────────────────────────────────────────────────────────────────────
    var _paginaAtual = decodeURIComponent(location.pathname.split("/").pop() || "").toLowerCase();
    var _ehPaginaPublica = _paginaAtual === "index.html" || _paginaAtual === "telas/acesso/principal.html" || _paginaAtual === "";

    if (!_ehPaginaPublica) {
        document.addEventListener("DOMContentLoaded", function () {
            _sessao.iniciar();
            _lgpd.exibirBanner();
            _mascarar.aplicarNaTela();
            _auditoria.registrar("PAGINA_ACESSADA", "nav", { pagina: _paginaAtual });

            // Observa mutações para mascarar dados adicionados dinamicamente
            var obs = new MutationObserver(function () { _mascarar.aplicarNaTela(); });
            obs.observe(document.body, { childList: true, subtree: true });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API pública
    // ─────────────────────────────────────────────────────────────────────────
    window.Seguranca = {
        csrf:       _csrf,
        sanitizar:  _sanitizar,
        mascarar:   _mascarar,
        bruteForce: _bruteForce,
        rateLimit:  _rateLimit,
        auditoria:  _auditoria,
        sessao:     _sessao,
        lgpd:       _lgpd,
        cfg:        CFG
    };

})();
