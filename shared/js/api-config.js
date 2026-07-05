(function () {
    "use strict";

    var STORAGE = {
        baseUrl: "sistemaApiUrl",
        usarMock: "sistemaApiMock",
        sincronizar: "sistemaApiSync",
        token: "tokenApiSistema"
    };

    var DEFAULTS = {
        baseUrl: "",
        usarMock: true,
        sincronizarAoIniciar: false,
        token: ""
    };

    function bool(valor, fallback) {
        if (valor === undefined || valor === null || valor === "") return fallback;
        if (typeof valor === "boolean") return valor;
        return ["1", "true", "sim", "s", "yes", "on"].includes(String(valor).trim().toLowerCase());
    }

    function texto(valor) {
        return String(valor || "").trim();
    }

    function normalizarUrl(url) {
        return texto(url).replace(/\/+$/, "");
    }

    function paramsUrl() {
        try {
            return new URLSearchParams(window.location.search || "");
        } catch (erro) {
            return new URLSearchParams("");
        }
    }

    function salvarLocal(cfg) {
        if (cfg.baseUrl) {
            localStorage.setItem(STORAGE.baseUrl, cfg.baseUrl);
        }

        localStorage.setItem(STORAGE.usarMock, String(cfg.usarMock));
        localStorage.setItem(STORAGE.sincronizar, String(cfg.sincronizarAoIniciar));

        if (cfg.token) {
            localStorage.setItem(STORAGE.token, cfg.token);
            sessionStorage.setItem(STORAGE.token, cfg.token);
        }
    }

    function carregarConfig() {
        var params = paramsUrl();
        var globalCfg = window.SISTEMA_API_CONFIG || {};
        var baseUrl = params.get("apiUrl") || localStorage.getItem(STORAGE.baseUrl) || globalCfg.baseUrl || DEFAULTS.baseUrl;
        var token = params.get("apiToken") || sessionStorage.getItem(STORAGE.token) || localStorage.getItem(STORAGE.token) || globalCfg.token || DEFAULTS.token;

        var cfg = {
            baseUrl: normalizarUrl(baseUrl),
            usarMock: bool(params.get("apiMock"), bool(localStorage.getItem(STORAGE.usarMock), bool(globalCfg.usarMock, DEFAULTS.usarMock))),
            sincronizarAoIniciar: bool(params.get("apiSync"), bool(localStorage.getItem(STORAGE.sincronizar), bool(globalCfg.sincronizarAoIniciar, DEFAULTS.sincronizarAoIniciar))),
            token: texto(token)
        };

        salvarLocal(cfg);
        return cfg;
    }

    function backendAtivo(cfg) {
        return Boolean(cfg && cfg.baseUrl && cfg.usarMock === false);
    }

    function aplicarCore(cfg) {
        if (!window.SistemaCore) return;

        if (backendAtivo(cfg)) {
            window.SistemaCore.configurarApi(cfg.baseUrl, cfg.token || undefined);
            return;
        }

        if (window.SistemaCore.dados) {
            window.SistemaCore.dados._modoApi = false;
        }

        if (window.SistemaCore.http) {
            window.SistemaCore.http._baseUrl = null;
            window.SistemaCore.http._token = null;
        }
    }

    function aplicarApis(cfg) {
        var usarMock = !backendAtivo(cfg);

        if (window.ErpApi) {
            window.ErpApi._usarMock = usarMock;
        }

        if (window.PdvApi) {
            window.PdvApi._usarMock = usarMock;
        }
    }

    function sincronizarInicial(cfg) {
        if (!backendAtivo(cfg) || !cfg.sincronizarAoIniciar || !window.SistemaCore?.sincronizar) {
            return Promise.resolve(null);
        }

        return window.SistemaCore.sincronizar().catch(function (erro) {
            console.warn("[SistemaApiConfig] Sincronizacao inicial falhou:", erro.message || erro);
            return null;
        });
    }

    function aplicar() {
        var cfg = carregarConfig();
        aplicarCore(cfg);
        aplicarApis(cfg);
        sincronizarConfiguracoesLocais(cfg);
        sincronizarInicial(cfg);
        window.dispatchEvent(new CustomEvent("sistemaApiConfigAtualizada", { detail: status(cfg) }));
        return cfg;
    }

    function sincronizarConfiguracoesLocais(cfg) {
        if (!backendAtivo(cfg) || !window.ConfiguracoesSistema?.sincronizarApi) {
            return;
        }

        window.ConfiguracoesSistema.sincronizarApi();
    }

    function ativarBackend(baseUrl, sincronizar, token) {
        localStorage.setItem(STORAGE.baseUrl, normalizarUrl(baseUrl || ""));
        localStorage.setItem(STORAGE.usarMock, "false");
        localStorage.setItem(STORAGE.sincronizar, String(sincronizar !== false));

        if (token) {
            localStorage.setItem(STORAGE.token, token);
            sessionStorage.setItem(STORAGE.token, token);
        }

        return aplicar();
    }

    function ativarMock() {
        localStorage.setItem(STORAGE.usarMock, "true");
        return aplicar();
    }

    function limpar() {
        Object.keys(STORAGE).forEach(function (chave) {
            localStorage.removeItem(STORAGE[chave]);
            sessionStorage.removeItem(STORAGE[chave]);
        });
        return aplicar();
    }

    function status(cfgInformada) {
        var cfg = cfgInformada || carregarConfig();
        return {
            backendAtivo: backendAtivo(cfg),
            baseUrl: cfg.baseUrl,
            usarMock: cfg.usarMock,
            sincronizarAoIniciar: cfg.sincronizarAoIniciar,
            temToken: Boolean(cfg.token),
            erpApiReal: Boolean(window.ErpApi && window.ErpApi._usarMock === false),
            pdvApiReal: Boolean(window.PdvApi && window.PdvApi._usarMock === false),
            sistemaCoreApi: Boolean(window.SistemaCore?.dados?._modoApi)
        };
    }

    window.SistemaApiConfig = {
        obter: carregarConfig,
        aplicar: aplicar,
        status: status,
        ativarBackend: ativarBackend,
        ativarMock: ativarMock,
        limpar: limpar
    };

    aplicar();
    document.addEventListener("DOMContentLoaded", aplicar);
    window.addEventListener("load", aplicar);
})();
