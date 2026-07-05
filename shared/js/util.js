const BASE_KEY = "base_Sistema";

function lerJson(chave, fallback){
    try{
        const valor = JSON.parse(localStorage.getItem(chave));
        return valor ?? fallback;
    }catch{
        return fallback;
    }
}

function obterBase(){
    const base = lerJson(BASE_KEY, {});
    base.clientes = Array.isArray(base.clientes) ? base.clientes : lerJson("clientes", []);
    base.usuarios = Array.isArray(base.usuarios) ? base.usuarios : [];
    base.mercadorias = Array.isArray(base.mercadorias) ? base.mercadorias : lerJson("mercadorias", []);
    base.vendas = Array.isArray(base.vendas) ? base.vendas : [];
    base.vendasCanceladas = Array.isArray(base.vendasCanceladas) ? base.vendasCanceladas : [];
    base.tabelasPreco = Array.isArray(base.tabelasPreco) ? base.tabelasPreco : [];
    base.formasPagamento = Array.isArray(base.formasPagamento) ? base.formasPagamento : [];
    base.contasReceber = Array.isArray(base.contasReceber) ? base.contasReceber : [];
    base.contasPagar = Array.isArray(base.contasPagar) ? base.contasPagar : [];
    base.entregas = Array.isArray(base.entregas) ? base.entregas : [];
    base.movimentosCaixa = Array.isArray(base.movimentosCaixa) ? base.movimentosCaixa : [];
    base.fechamentosCaixa = Array.isArray(base.fechamentosCaixa) ? base.fechamentosCaixa : [];
    base.eventosCaixa = Array.isArray(base.eventosCaixa) ? base.eventosCaixa : [];
    base.notasSaida = Array.isArray(base.notasSaida) ? base.notasSaida : [];
    base.notasEntrada = Array.isArray(base.notasEntrada) ? base.notasEntrada : [];
    base.fornecedores = Array.isArray(base.fornecedores) ? base.fornecedores : [];
    base.boletos = Array.isArray(base.boletos) ? base.boletos : [];
    base.orcamentos = Array.isArray(base.orcamentos) ? base.orcamentos : [];
    base.ordensServico = Array.isArray(base.ordensServico) ? base.ordensServico : [];
    base.movimentosEstoque = Array.isArray(base.movimentosEstoque) ? base.movimentosEstoque : [];
    base.contagensEstoque = Array.isArray(base.contagensEstoque) ? base.contagensEstoque : [];
    base.movimentosComerciais = Array.isArray(base.movimentosComerciais) ? base.movimentosComerciais : [];
    base.parametrosCaixa = base.parametrosCaixa && typeof base.parametrosCaixa === "object" && !Array.isArray(base.parametrosCaixa) ? base.parametrosCaixa : {};
    base.sessoesCode  = Array.isArray(base.sessoesCode)  ? base.sessoesCode  : [];
    base.devolucoes   = Array.isArray(base.devolucoes)   ? base.devolucoes   : [];
    base.valesCredito = Array.isArray(base.valesCredito) ? base.valesCredito : [];
    base.pedidosVenda = Array.isArray(base.pedidosVenda) ? base.pedidosVenda : [];
    base.logAlteracoesProdutos = Array.isArray(base.logAlteracoesProdutos) ? base.logAlteracoesProdutos : [];
    return base;
}

function salvarBase(base){
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
    // Hook para sync com API quando configurada (fire-and-forget)
    if(window.SistemaCore && window.SistemaCore.dados._modoApi){
        window.SistemaCore.dados._onBaseSalva(base);
    }
}

function numero(valor){
    const texto = String(valor || "").trim();
    const normalizado = texto.includes(",")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto;
    return Number.parseFloat(normalizado) || 0;
}

function somar(lista, campo){
    return (lista || []).reduce(function(total, item){
        return total + numero(item[campo] || 0);
    }, 0);
}

function formatarMoeda(valor){
    var str = String(valor ?? "").trim();
    // Número decimal armazenado (ex: 10.5, -1234.50) → converte diretamente
    if(/^-?\d+(\.\d+)?$/.test(str)){
        return parseFloat(str || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    // Máscara de dígitos (input do usuário ou valor já formatado)
    var digitos = str.replace(/\D/g, "").padStart(3, "0");
    return Number(digitos.slice(0, -2) + "." + digitos.slice(-2)).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarMoedaRS(valor){
    return "R$ " + formatarMoeda(valor);
}

function formatarDecimalCampo(valor){
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function mascaraMoedaInput(input){
    function aplicar(){
        var digitos = input.value.replace(/\D/g, "").padStart(3, "0");
        input.value = Number(digitos.slice(0, -2) + "." + digitos.slice(-2))
            .toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    input.addEventListener("input", aplicar);
    input.addEventListener("blur", function(){
        if(!input.value.trim()) input.value = "0,00";
        else aplicar();
    });
    input.addEventListener("focus", function(){
        if(input.value === "0,00") input.value = "";
    });
}

document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll("[data-moeda]").forEach(mascaraMoedaInput);
});

function formatarQuantidade(valor){
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarData(valor){
    if(!valor) return "-";
    // Parseia YYYY-MM-DD localmente para evitar desvio de fuso (UTC vs horário local)
    const iso = String(valor).slice(0, 10);
    const partes = iso.split("-");
    if(partes.length === 3 && partes[0].length === 4){
        return partes[2] + "/" + partes[1] + "/" + partes[0];
    }
    const data = new Date(valor);
    if(Number.isNaN(data.getTime())) return "-";
    return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor){
    if(!valor) return "-";
    const data = new Date(valor);
    if(Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR");
}

function definirTexto(id, valor){
    const elemento = document.getElementById(id);
    if(elemento) elemento.textContent = valor;
}

function definirValor(id, valor){
    const elemento = document.getElementById(id);
    if(elemento) elemento.value = valor ?? "";
}

function definirValorSeExistir(id, valor){
    const elemento = document.getElementById(id);
    if(elemento) elemento.value = valor ?? "";
}

function valorCampo(id){
    return document.getElementById(id)?.value.trim() || "";
}

function normalizar(valor){
    return String(valor || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

function escapar(valor){
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function gerarId(prefixo){
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + "-" + Math.random().toString(16).slice(2);
    return prefixo ? prefixo + "-" + id : id;
}

function normalizarBooleano(valor, fallback){
    if(fallback === undefined) fallback = false;
    if(typeof valor === "boolean") return valor;
    if(typeof valor === "number") return valor === 1;
    const texto = normalizar(String(valor || ""));
    if(["true", "sim", "s", "1", "ativo", "yes"].includes(texto)) return true;
    if(["false", "nao", "n", "0", "inativo", "no"].includes(texto)) return false;
    return fallback;
}

(function(){
    function registrarAvisoSistema(texto, tipo){
        if(tipo !== "aviso" && tipo !== "erro" && tipo !== "warning" && tipo !== "error") return;
        try{
            const lista = lerJson("avisosSistema", []);
            lista.unshift({
                id: "avs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
                texto: String(texto || "Aviso do sistema."),
                tipo: tipo === "error" ? "erro" : tipo === "warning" ? "aviso" : tipo,
                data: new Date().toISOString()
            });
            localStorage.setItem("avisosSistema", JSON.stringify(lista.slice(0, 50)));
            window.dispatchEvent(new CustomEvent("sistema:aviso"));
        }catch(_e){}
    }

    window.registrarAvisoSistema = registrarAvisoSistema;

    window.notificar = function(texto, tipo){
        registrarAvisoSistema(texto, tipo);
        if(window.notify){
            return window.notify.show(tipo || "info", texto);
        }
        console[tipo === "erro" || tipo === "error" ? "error" : "log"](texto);
        return null;
    };
})();
// ═══════════════════════════════════════════════════════════════════════════
//  SISTEMA CORE  —  Dados · Autenticação · Permissões
//  v2.0  |  Modo atual: localStorage  |  Pronto para migração a API REST
//
// ┌─────────────────────────────────────────────────────────────────────┐
//  GUIA RÁPIDO PARA A EQUIPE DE BACKEND
//
//  1. ATIVAR API:
//       SistemaCore.configurarApi('https://api.empresa.com/api/v1');
//       SistemaCore.sincronizar();   // carrega dados na inicialização
//
//  2. AUTENTICAÇÃO  (JWT Bearer Token)
//       POST /auth/login
//         Body → { login: string, senha: string }
//         Resp → { token: string, expiresAt: ISO-8601, usuario: UsuarioObj }
//       POST /auth/logout
//         Header → Authorization: Bearer <token>
//         Resp  → { sucesso: true }
//       POST /auth/refresh
//         Body  → { token: string }
//         Resp  → { token: string, expiresAt: ISO-8601 }
//
//  3. ENDPOINTS CRUD (padrão REST + JSON)
//       GET    /{colecao}          → { data:[...], total:n }
//       GET    /{colecao}/{id}     → { data:{...} }
//       POST   /{colecao}          → { data:{...} }          [201]
//       PUT    /{colecao}/{id}     → { data:{...} }
//       DELETE /{colecao}/{id}     → { sucesso:true }        [200]
//
//  4. ENDPOINTS ESPECIAIS
//       GET    /base               → { ...todas as coleções }
//       GET    /config             → ConfiguracaoObj
//       PUT    /config             → Body: ConfiguracaoObj
//
//  5. FORMATO DE ERRO PADRÃO
//       { erro: true, codigo: 'CODIGO_ERRO', mensagem: 'Descrição' }
//       HTTP 400 – dados inválidos   HTTP 401 – não autenticado
//       HTTP 403 – sem permissão     HTTP 404 – não encontrado
//       HTTP 422 – validação falhou  HTTP 500 – erro interno
//
//  6. COLEÇÕES DISPONÍVEIS (base.{colecao})
//       usuarios  clientes  mercadorias  vendas  vendasCanceladas
//       formasPagamento  tabelasPreco  contasReceber  contasPagar
//       movimentosCaixa  fechamentosCaixa  notasSaida  notasEntrada
//       fornecedores  boletos  orcamentos  ordensServico
//       movimentosEstoque  contagensEstoque  movimentosComerciais
// └─────────────────────────────────────────────────────────────────────┘
//
// SCHEMAS DE REFERÊNCIA PARA O BACKEND
//
//  UsuarioObj { id, nome, login, senha(hash), comissao, salario,
//    contratacao, aniversario, permissoes:{[chave]:bool}, ativo,
//    criadoEm, atualizadoEm }
//
//  ClienteObj { id, nome, cpfCnpj, telefone, email, endereco,
//    cidade, uf(2), limiteCredito, tabelaPrecoId, ativo,
//    criadoEm, atualizadoEm }
//
//  MercadoriaObj { id, codigo, nome, descricao, unidade, categoria,
//    precoCusto, precoVenda, estoque, estoqueMinimo,
//    cfop, ncm, ativo, criadoEm, atualizadoEm }
//
//  VendaObj { id, numero, data(ISO), usuarioLogin, vendedorLogin,
//    vendedorNome, clienteId, clienteNome,
//    itens:[{produtoId,codigo,nome,quantidade,precoUnitario,desconto,total}],
//    subtotal, desconto, total, formaPagamento,
//    status:'concluida'|'cancelada', criadoEm }
//
//  FornecedorObj { id, razaoSocial, nomeFantasia, cnpj, telefone,
//    email, endereco, cidade, estado, origem:'manual'|'nfe',
//    ativo, criadoEm, atualizadoEm }
// ═══════════════════════════════════════════════════════════════════════════
(function(){
    "use strict";

    var _BASE_KEY   = "base_Sistema";
    var _SESSAO_KEY = "sessaoUsuarioSistema";
    var _TOKEN_KEY  = "tokenApiSistema";

    // ── Mapa permissão-filha → permissão-pai (fonte única) ────────────────
    var PERMISSOES_PAI = {
        pdvVender:"pdv",            pdvGuardarVendas:"pdv",
        pdvRecebimento:"pdv",       descontos:"pdv",
        pdvCancelarVendaAtual:"pdv",cancelarVendas:"pdv",
        pdvReimprimir:"pdv",        pdvSangriaSuprimento:"pdv",
        alterarVendedor:"pdv",
        clientesEditar:"cadastros", clientesExcluir:"cadastros",
        mercadoriasEditar:"cadastros",mercadoriasExcluir:"cadastros",
        tabelasPrecoEditar:"cadastros",formasPagamentoEditar:"cadastros",
        usuariosEditar:"usuarios",  usuariosExcluir:"usuarios",
        emitirNfe:"notas",          emitirNfce:"notas",
        importarXml:"notas",        cancelarNotas:"notas",
        devolucaoFiscal:"notas",
        financeiroLancar:"financeiro",financeiroBaixar:"financeiro",
        financeiroExcluir:"financeiro",
        relatoriosVer:"relatorios", relatoriosExportar:"relatorios",
        configEmpresa:"manutencao", configFiscal:"manutencao",
        configSistema:"manutencao", integracoesEditar:"manutencao",
        backupSistema:"manutencao"
    };

    // ── Lista completa de permissões (fonte única) ────────────────────────
    var TODAS_PERMISSOES = [
        "pdv","comercial","cadastros","notas","financeiro","movimento",
        "relatorios","manutencao","dashboard","usuarios",
        "pdvVender","pdvGuardarVendas","pdvRecebimento","descontos",
        "pdvCancelarVendaAtual","cancelarVendas","pdvReimprimir",
        "pdvSangriaSuprimento","alterarVendedor",
        "clientesEditar","clientesExcluir","mercadoriasEditar","mercadoriasExcluir",
        "tabelasPrecoEditar","formasPagamentoEditar","usuariosEditar","usuariosExcluir",
        "emitirNfe","emitirNfce","importarXml","cancelarNotas","devolucaoFiscal",
        "financeiroLancar","financeiroBaixar","financeiroExcluir",
        "relatoriosVer","relatoriosExportar",
        "configEmpresa","configFiscal","configSistema","integracoesEditar","backupSistema"
    ];

    // ════════════════════════════════════════════════════════════════════
    //  HTTP CLIENT — todas as chamadas REST passam aqui
    //  BACKEND: implemente CORS permitindo o domínio do frontend
    // ════════════════════════════════════════════════════════════════════
    var Http = {
        _baseUrl: null,
        _token:   null,
        _timeout: 20000,

        _headers: function(){
            var h = {"Content-Type":"application/json","Accept":"application/json"};
            if(this._token) h["Authorization"] = "Bearer " + this._token;
            return h;
        },

        _request: function(method, path, body, tentativa){
            if(!this._baseUrl) return Promise.reject(new Error("API não configurada"));
            tentativa = tentativa || 1;
            var self = this;
            var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
            var tid  = ctrl ? setTimeout(function(){ ctrl.abort(); }, self._timeout) : null;

            return fetch(self._baseUrl + path, {
                method:  method,
                headers: self._headers(),
                body:    body !== undefined ? JSON.stringify(body) : undefined,
                signal:  ctrl ? ctrl.signal : undefined
            })
            .then(function(res){
                if(tid) clearTimeout(tid);
                if(res.status === 401){
                    sessionStorage.removeItem(_TOKEN_KEY);
                    localStorage.removeItem(_TOKEN_KEY);
                    self._token = null;
                    var e = new Error("Sessão expirada");
                    e.codigo = "SESSAO_EXPIRADA";
                    throw e;
                }
                if(!res.ok){
                    return res.json().then(function(corpo){
                        var e = new Error(corpo.mensagem || "Erro " + res.status);
                        e.codigo   = corpo.codigo || "ERRO_API";
                        e.status   = res.status;
                        e.detalhes = corpo;
                        throw e;
                    });
                }
                return res.json();
            })
            .catch(function(err){
                if(tid) clearTimeout(tid);
                var transiente = err.status === 503 || err.name === "AbortError";
                if(transiente && tentativa < 3){
                    return new Promise(function(r){ setTimeout(r, tentativa * 1000); })
                        .then(function(){ return self._request(method, path, body, tentativa + 1); });
                }
                throw err;
            });
        },

        get:    function(path)       { return this._request("GET",    path); },
        post:   function(path, body) { return this._request("POST",   path, body); },
        put:    function(path, body) { return this._request("PUT",    path, body); },
        patch:  function(path, body) { return this._request("PATCH",  path, body); },
        delete: function(path)       { return this._request("DELETE", path); }
    };

    // ════════════════════════════════════════════════════════════════════
    //  DATA ADAPTER
    //  Modo local: lê/grava no localStorage.
    //  Modo API: mantém localStorage como cache + replica na API.
    // ════════════════════════════════════════════════════════════════════
    var DataAdapter = {
        _modoApi: false,

        lerBase: function(){
            try{ return JSON.parse(localStorage.getItem(_BASE_KEY)) || {}; }
            catch(e){ return {}; }
        },

        lerSessao: function(){
            try{
                return JSON.parse(sessionStorage.getItem(_SESSAO_KEY))
                    || JSON.parse(localStorage.getItem(_SESSAO_KEY))
                    || null;
            }catch(e){ return null; }
        },

        // Chamado por salvarBase() global quando _modoApi está ativo
        _onBaseSalva: function(base){
            Http.put("/base", base).catch(function(err){
                console.warn("[SistemaCore] Falha ao sincronizar base com API:", err.message || err);
            });
        },

        // ── CRUD assíncrono — use em código novo ─────────────────────────
        // GET /{colecao}
        listar: function(colecao, filtros){
            if(this._modoApi){
                var qs = filtros ? "?" + new URLSearchParams(filtros).toString() : "";
                return Http.get("/" + colecao + qs).then(function(res){
                    var lista = res.data !== undefined ? res.data : res;
                    var base  = DataAdapter.lerBase();
                    base[colecao] = lista;
                    localStorage.setItem(_BASE_KEY, JSON.stringify(base));
                    return lista;
                });
            }
            var base = this.lerBase();
            return Promise.resolve(Array.isArray(base[colecao]) ? base[colecao] : []);
        },

        // GET /{colecao}/{id}
        buscar: function(colecao, id){
            if(this._modoApi){
                return Http.get("/" + colecao + "/" + id).then(function(res){
                    return res.data !== undefined ? res.data : res;
                });
            }
            var base  = this.lerBase();
            var lista = Array.isArray(base[colecao]) ? base[colecao] : [];
            return Promise.resolve(lista.find(function(i){ return i.id === id; }) || null);
        },

        // POST /{colecao}
        criar: function(colecao, item){
            var base = this.lerBase();
            if(!Array.isArray(base[colecao])) base[colecao] = [];
            if(!item.criadoEm)    item.criadoEm    = new Date().toISOString();
            if(!item.atualizadoEm) item.atualizadoEm = item.criadoEm;
            base[colecao].push(item);
            localStorage.setItem(_BASE_KEY, JSON.stringify(base));
            if(this._modoApi){
                return Http.post("/" + colecao, item).then(function(res){
                    return res.data !== undefined ? res.data : res;
                });
            }
            return Promise.resolve(item);
        },

        // PUT /{colecao}/{id}
        atualizar: function(colecao, id, dados){
            var base = this.lerBase();
            if(!Array.isArray(base[colecao])) base[colecao] = [];
            var idx = base[colecao].findIndex(function(i){ return i.id === id; });
            var item = null;
            if(idx >= 0){
                dados.atualizadoEm = new Date().toISOString();
                base[colecao][idx] = Object.assign({}, base[colecao][idx], dados);
                item = base[colecao][idx];
                localStorage.setItem(_BASE_KEY, JSON.stringify(base));
            }
            if(this._modoApi){
                return Http.put("/" + colecao + "/" + id, dados).then(function(res){
                    return res.data !== undefined ? res.data : res;
                });
            }
            return Promise.resolve(item);
        },

        // DELETE /{colecao}/{id}
        excluir: function(colecao, id){
            var base  = this.lerBase();
            if(!Array.isArray(base[colecao])) return Promise.resolve(false);
            var antes = base[colecao].length;
            base[colecao] = base[colecao].filter(function(i){ return i.id !== id; });
            var removido  = base[colecao].length < antes;
            if(removido) localStorage.setItem(_BASE_KEY, JSON.stringify(base));
            if(this._modoApi){
                return Http.delete("/" + colecao + "/" + id).then(function(){ return true; });
            }
            return Promise.resolve(removido);
        }
    };

    // ════════════════════════════════════════════════════════════════════
    //  AUTH  —  gerencia token JWT e sessão do usuário
    // ════════════════════════════════════════════════════════════════════
    var Auth = {
        // POST /auth/login
        login: function(login, senha){
            if(!Http._baseUrl) return Promise.resolve(null);
            return Http.post("/auth/login", {login:login, senha:senha})
                .then(function(res){
                    var payload = res && res.data !== undefined ? res.data : res;
                    Http._token = payload.token;
                    sessionStorage.setItem(_TOKEN_KEY, payload.token);
                    localStorage.setItem(_TOKEN_KEY, payload.token);
                    return payload.usuario || null;
                });
        },

        // POST /auth/logout
        logout: function(){
            if(Http._baseUrl && Http._token){
                Http.post("/auth/logout").catch(function(){});
            }
            sessionStorage.removeItem(_TOKEN_KEY);
            localStorage.removeItem(_TOKEN_KEY);
            Http._token = null;
        },

        // POST /auth/refresh
        refresh: function(){
            var tok = Http._token || sessionStorage.getItem(_TOKEN_KEY);
            if(!Http._baseUrl || !tok) return Promise.resolve(null);
            return Http.post("/auth/refresh", {token:tok})
                .then(function(res){
                    var payload = res && res.data !== undefined ? res.data : res;
                    Http._token = payload.token;
                    sessionStorage.setItem(_TOKEN_KEY, payload.token);
                    localStorage.setItem(_TOKEN_KEY, payload.token);
                    return payload;
                });
        },

        usuario: function(){ return DataAdapter.lerSessao(); }
    };

    // ── Permissão (fonte única) ───────────────────────────────────────────
    function _ehAdm(u){
        return String(((u || Auth.usuario()) || {}).login || "").toLowerCase() === "adm";
    }

    function _temLiberacaoTemporaria(login, permissao){
        if(!login || !permissao) return false;
        try{
            var lista = JSON.parse(localStorage.getItem("liberacoesTemporariasSistema")) || [];
            var agora = Date.now();
            return lista.some(function(l){
                return l.usuarioLogin === login && l.permissao === permissao && new Date(l.expiraEm).getTime() > agora;
            });
        }catch(_e){ return false; }
    }

    function _temPermissao(permissao, usuario){
        var u = usuario || Auth.usuario();
        if(!u) return false;
        if(_ehAdm(u)) return true;
        if(_temLiberacaoTemporaria(u.login, permissao)) return true;
        var perm = u.permissoes || {};
        if(Object.prototype.hasOwnProperty.call(perm, permissao)) return perm[permissao] === true;
        var pai = PERMISSOES_PAI[permissao];
        return pai ? perm[pai] === true : false;
    }

    function _permissoesTodas(){
        return TODAS_PERMISSOES.reduce(function(acc, p){ acc[p] = true; return acc; }, {});
    }

    // ════════════════════════════════════════════════════════════════════
    //  PUBLIC API — window.SistemaCore
    // ════════════════════════════════════════════════════════════════════
    window.SistemaCore = {
        dados: DataAdapter,
        http:  Http,
        auth:  Auth,

        usuario:         function(){ return Auth.usuario(); },
        ehAdm:           _ehAdm,
        temPermissao:    _temPermissao,
        permissoesTodas: _permissoesTodas,

        PERMISSOES:     TODAS_PERMISSOES,
        PERMISSOES_PAI: PERMISSOES_PAI,

        // Ativa modo API — chame na inicialização quando o backend estiver pronto:
        //   SistemaCore.configurarApi('https://api.empresa.com/api/v1');
        //   SistemaCore.sincronizar();
        configurarApi: function(baseUrl, token){
            Http._baseUrl        = (baseUrl || "").replace(/\/$/, "");
            DataAdapter._modoApi = true;
            Http._token          = token || sessionStorage.getItem(_TOKEN_KEY) || localStorage.getItem(_TOKEN_KEY) || null;
        },

        // GET /base → carrega toda a base e salva no cache local
        sincronizar: function(){
            if(!DataAdapter._modoApi) return Promise.resolve();
            return Http.get("/base").then(function(base){
                localStorage.setItem(_BASE_KEY, JSON.stringify(base));
                return base;
            }).catch(function(err){
                console.error("[SistemaCore] Falha ao sincronizar:", err.message || err);
                throw err;
            });
        }
    };
})();

// ═══════════════════════════════════════════════════════════════════════════
//  CONTROLE REMOTO DE PERMISSÕES — solicitação de autorização ao admin
// ═══════════════════════════════════════════════════════════════════════════
function controleRemotoHabilitado(){
    return (window.ConfiguracoesSistema?.obter?.() || {}).controleRemotoHabilitado !== false;
}

function criarSolicitacaoRemota(usuario, permissao, descricao, valor){
    try{
        const lista = lerJson("solicitacoesRemotasSistema", []);
        const solicitacao = {
            id: "sol_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            data: new Date().toISOString(),
            usuarioLogin: usuario?.login || "",
            usuarioNome: usuario?.nome || usuario?.login || "Usuário",
            permissao: permissao,
            descricao: descricao || "Ação restrita",
            valor: valor ?? null,
            status: "pendente",
            resolvidoPor: null,
            resolvidoEm: null,
            avisadoSolicitante: false,
            avisadoNoToast: false
        };
        lista.unshift(solicitacao);
        localStorage.setItem("solicitacoesRemotasSistema", JSON.stringify(lista.slice(0, 100)));
        window.dispatchEvent(new CustomEvent("sistema:solicitacao"));
        return solicitacao;
    }catch(_e){ return null; }
}

function aprovarSolicitacaoRemota(id, minutosLiberacao){
    const lista = lerJson("solicitacoesRemotasSistema", []);
    const idx = lista.findIndex(function(s){ return s.id === id; });
    if(idx < 0) return;

    const solicitacao = lista[idx];
    solicitacao.status = "aprovado";
    solicitacao.resolvidoPor = window.SistemaCore?.usuario?.()?.nome || "Administrador";
    solicitacao.resolvidoEm = new Date().toISOString();

    const liberacoes = lerJson("liberacoesTemporariasSistema", []);
    const expiraEm = new Date(Date.now() + (minutosLiberacao || 3) * 60000).toISOString();
    liberacoes.push({ usuarioLogin: solicitacao.usuarioLogin, permissao: solicitacao.permissao, expiraEm: expiraEm });
    localStorage.setItem("liberacoesTemporariasSistema", JSON.stringify(liberacoes));

    localStorage.setItem("solicitacoesRemotasSistema", JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent("sistema:solicitacao"));
}

function negarSolicitacaoRemota(id){
    const lista = lerJson("solicitacoesRemotasSistema", []);
    const idx = lista.findIndex(function(s){ return s.id === id; });
    if(idx < 0) return;

    lista[idx].status = "negado";
    lista[idx].resolvidoPor = window.SistemaCore?.usuario?.()?.nome || "Administrador";
    lista[idx].resolvidoEm = new Date().toISOString();

    localStorage.setItem("solicitacoesRemotasSistema", JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent("sistema:solicitacao"));
}
window.aprovarSolicitacaoRemota = aprovarSolicitacaoRemota;
window.negarSolicitacaoRemota = negarSolicitacaoRemota;

function solicitarOuBloquear(permissao, descricao, valor, mensagemPadrao){
    if(!controleRemotoHabilitado()){
        if(window.notify) notify.permissionDenied(mensagemPadrao);
        else notificar(mensagemPadrao, "erro");
        return;
    }

    const usuario = window.SistemaCore?.usuario?.();
    if(!usuario){
        if(window.notify) notify.permissionDenied(mensagemPadrao);
        else notificar(mensagemPadrao, "erro");
        return;
    }

    const confirmar = window.notify
        ? notify.confirm({
            title: "Solicitar autorização",
            message: mensagemPadrao + "\n\nDeseja solicitar autorização a um administrador?",
            confirmText: "Solicitar",
            cancelText: "Cancelar",
            type: "warning"
        })
        : Promise.resolve(false);

    confirmar.then(function(ok){
        if(!ok) return;
        criarSolicitacaoRemota(usuario, permissao, descricao, valor);
        notificar("Solicitação enviada. Aguarde a aprovação de um administrador.", "aviso");
    });
}
window.solicitarOuBloquear = solicitarOuBloquear;

// ── Popup de aprovação + aviso ativo (toast) pro administrador ──────────────
(function(){
    const CSS = `
#popup-solicitacao-overlay{
    position:fixed;inset:0;z-index:2147483646;
    background:rgba(15,23,42,.5);
    display:none;align-items:center;justify-content:center;padding:20px;
}
#popup-solicitacao-overlay.aberto{ display:flex; }
#popup-solicitacao-caixa{
    width:min(420px,100%);background:#fff;border-radius:14px;
    box-shadow:0 24px 60px rgba(15,23,42,.35);overflow:hidden;
    font-family:"Segoe UI",sans-serif;
}
#popup-solicitacao-caixa .psr-topo{
    background:#1A436B;color:#fff;padding:18px 22px;
    display:flex;align-items:center;gap:10px;
}
#popup-solicitacao-caixa .psr-topo i{ font-size:20px; }
#popup-solicitacao-caixa .psr-topo strong{ font-size:15px; font-weight:800; }
#popup-solicitacao-caixa .psr-corpo{ padding:22px; display:grid; gap:12px; }
#popup-solicitacao-caixa .psr-linha{ display:flex; justify-content:space-between; gap:12px; font-size:13px; color:#334155; }
#popup-solicitacao-caixa .psr-linha label{ font-weight:700; color:#64748b; }
#popup-solicitacao-caixa .psr-valor{ font-size:20px; font-weight:900; color:#1A436B; text-align:center; padding:10px 0; }
#popup-solicitacao-caixa .psr-acoes{ display:flex; gap:10px; padding:0 22px 22px; }
#popup-solicitacao-caixa .psr-btn{ flex:1; border:none; border-radius:9px; padding:12px; font-size:14px; font-weight:800; cursor:pointer; }
#popup-solicitacao-caixa .psr-btn-aprovar{ background:#16a34a; color:#fff; }
#popup-solicitacao-caixa .psr-btn-aprovar:hover{ background:#15803d; }
#popup-solicitacao-caixa .psr-btn-negar{ background:#fee2e2; color:#b91c1c; }
#popup-solicitacao-caixa .psr-btn-negar:hover{ background:#fecaca; }
#popup-solicitacao-caixa .psr-fechar{ background:none;border:none;color:#fff;margin-left:auto;font-size:16px;cursor:pointer; }
.notif-solicitacao{ cursor:pointer; }
`;
    function injetarEstiloPopup(){
        if(document.getElementById("estilo-popup-solicitacao")) return;
        const el = document.createElement("style");
        el.id = "estilo-popup-solicitacao";
        el.textContent = CSS;
        (document.head || document.documentElement).appendChild(el);
    }

    function obterOverlay(){
        injetarEstiloPopup();
        let overlay = document.getElementById("popup-solicitacao-overlay");
        if(overlay) return overlay;

        overlay = document.createElement("div");
        overlay.id = "popup-solicitacao-overlay";
        overlay.innerHTML = `
            <div id="popup-solicitacao-caixa">
                <div class="psr-topo">
                    <i class="fas fa-user-clock"></i>
                    <strong>Solicitação de autorização</strong>
                    <button type="button" class="psr-fechar" id="psrBtnFechar">&times;</button>
                </div>
                <div class="psr-corpo" id="psrCorpo"></div>
                <div class="psr-acoes" id="psrAcoes"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", function(e){ if(e.target === overlay) fecharPopupSolicitacaoRemota(); });
        overlay.querySelector("#psrBtnFechar").addEventListener("click", fecharPopupSolicitacaoRemota);

        return overlay;
    }

    window.abrirPopupSolicitacaoRemota = function(id){
        const lista = lerJson("solicitacoesRemotasSistema", []);
        const solicitacao = lista.find(function(s){ return s.id === id; });
        if(!solicitacao) return;

        const overlay = obterOverlay();
        const corpo = overlay.querySelector("#psrCorpo");
        const acoes = overlay.querySelector("#psrAcoes");

        corpo.innerHTML = `
            <div class="psr-linha"><label>Usuário</label><span>${escapar(solicitacao.usuarioNome)}</span></div>
            <div class="psr-linha"><label>Ação</label><span>${escapar(solicitacao.descricao)}</span></div>
            <div class="psr-linha"><label>Data</label><span>${new Date(solicitacao.data).toLocaleString("pt-BR")}</span></div>
            ${solicitacao.valor != null ? `<div class="psr-valor">${escapar(formatarMoedaRS(solicitacao.valor))}</div>` : ""}
        `;

        if(solicitacao.status === "pendente"){
            acoes.innerHTML = `
                <button type="button" class="psr-btn psr-btn-negar" id="psrBtnNegar">Negar</button>
                <button type="button" class="psr-btn psr-btn-aprovar" id="psrBtnAprovar">Aprovar</button>
            `;
            acoes.querySelector("#psrBtnAprovar").addEventListener("click", function(){
                aprovarSolicitacaoRemota(solicitacao.id);
                fecharPopupSolicitacaoRemota();
            });
            acoes.querySelector("#psrBtnNegar").addEventListener("click", function(){
                negarSolicitacaoRemota(solicitacao.id);
                fecharPopupSolicitacaoRemota();
            });
        }else{
            acoes.innerHTML = `<span style="padding:0 22px 4px;color:#64748b;font-size:12.5px;">Já ${escapar(solicitacao.status)}${solicitacao.resolvidoPor ? " por " + escapar(solicitacao.resolvidoPor) : ""}.</span>`;
        }

        overlay.classList.add("aberto");
    };

    window.fecharPopupSolicitacaoRemota = function(){
        document.getElementById("popup-solicitacao-overlay")?.classList.remove("aberto");
    };

    function toastSolicitacaoRemota(solicitacao){
        const container = document.getElementById("notif-container") || (function(){
            const c = document.createElement("div");
            c.id = "notif-container";
            document.body.appendChild(c);
            return c;
        })();

        const item = document.createElement("div");
        item.className = "notif notif-erro notif-solicitacao";
        item.setAttribute("role", "alert");
        item.innerHTML = `
            <span class="notif-icone">!</span>
            <span class="notif-texto">Nova solicitação de <strong>${escapar(solicitacao.usuarioNome)}</strong>: ${escapar(solicitacao.descricao)}${solicitacao.valor != null ? " — " + escapar(formatarMoedaRS(solicitacao.valor)) : ""}. Clique para revisar.</span>
            <button type="button" class="notif-fechar" aria-label="Fechar">x</button>
        `;

        function remover(){
            if(!item.isConnected) return;
            item.classList.add("saindo");
            item.addEventListener("animationend", function(){ item.remove(); }, { once: true });
        }

        item.addEventListener("click", function(e){
            if(e.target.closest(".notif-fechar")) return;
            window.abrirPopupSolicitacaoRemota(solicitacao.id);
            remover();
        });
        item.querySelector(".notif-fechar").addEventListener("click", function(e){ e.stopPropagation(); remover(); });

        container.appendChild(item);
        window.setTimeout(remover, 15000);
    }

    function verificarNovasSolicitacoesRemotas(){
        if(!window.SistemaCore?.ehAdm?.()) return;

        const lista = lerJson("solicitacoesRemotasSistema", []);
        let mudou = false;

        lista.filter(function(s){ return s.status === "pendente" && !s.avisadoNoToast; }).forEach(function(s){
            s.avisadoNoToast = true;
            mudou = true;
            toastSolicitacaoRemota(s);
        });

        if(mudou) localStorage.setItem("solicitacoesRemotasSistema", JSON.stringify(lista));
    }

    document.addEventListener("DOMContentLoaded", verificarNovasSolicitacoesRemotas);
    window.addEventListener("sistema:solicitacao", verificarNovasSolicitacoesRemotas);
    window.addEventListener("storage", function(evento){
        if(evento.key === "solicitacoesRemotasSistema") verificarNovasSolicitacoesRemotas();
    });
})();

