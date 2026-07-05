/**
 * erpApi.js — Camada de integração API do ERP (módulos de gestão)
 *
 * COMO USAR
 * ---------
 * Modo mock (padrão — sem back-end):
 *   ErpApi.listarClientes("maria").then(function(res){ console.log(res); });
 *
 * Para ativar o back-end real, apague o bloco _mock e defina:
 *   ErpApi._usarMock = false;
 *   SistemaCore.configurarApi("https://api.suaempresa.com/api/v1");
 *
 * PDV (caixa, vendas, NFC-e) → pdvApi.js
 * Gestão (clientes, produtos, fiscal, financeiro, etc.) → este arquivo
 */
window.ErpApi = (function () {
    "use strict";

    var MOCK_DELAY = 80;

    // ─── helpers ─────────────────────────────────────────────────────────────
    function _delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function _ok(d)     { return _delay(MOCK_DELAY).then(function () { return d; }); }
    function _err(msg)  { return _delay(MOCK_DELAY).then(function () { throw new Error(msg); }); }

    // ─── segurança: wrappers para chamadas HTTP reais ─────────────────────────
    var _SEC_HEADERS = {};   // preenchido ao iniciar
    var _OPERACOES_SENSIVEIS = ["criar", "atualizar", "excluir", "baixar", "cancelar", "confirmar", "emitir", "inutilizar", "registrar", "utilizar", "alterar", "upload"];

    function _isSensivel(nome) {
        return _OPERACOES_SENSIVEIS.some(function (p) { return nome.startsWith(p); });
    }

    function _http() {
        if (!window.SistemaCore || !SistemaCore.http)
            throw new Error("SistemaCore não inicializado. Chame SistemaCore.configurarApi(url) antes de usar modo real.");
        return SistemaCore.http;
    }

    // Interceptador de segurança para chamadas reais:
    // — CSRF token no header
    // — Rate limit
    // — Sanitização do body
    // — Auditoria de operações sensíveis
    // — Renovação de token em 401
    function _req(metodo, path, body, nomeFuncao) {
        var seg = window.Seguranca;

        // Rate limit (client-side)
        if (seg && !seg.rateLimit.verificar(path)) {
            return Promise.reject(new Error("Muitas requisições. Aguarde alguns segundos."));
        }

        // Sanitiza body antes de enviar
        var bodyLimpo = (body && seg) ? seg.sanitizar.objeto(body) : body;

        // Adiciona CSRF token ao SistemaCore antes da chamada
        if (seg) {
            var csrfToken = seg.csrf.obterToken();
            try {
                // Injeta no header padrão do SistemaCore.http
                SistemaCore.http._csrfToken = csrfToken;
            } catch (e) { }
        }

        // Auditoria de operações sensíveis
        if (seg && nomeFuncao && _isSensivel(nomeFuncao)) {
            seg.auditoria.registrar("API_" + metodo.toUpperCase() + "_" + nomeFuncao.toUpperCase(), "api", {
                endpoint: path,
                bodyKeys: bodyLimpo ? Object.keys(bodyLimpo) : []
            });
        }

        var http = _http();
        var promise = metodo === "GET"    ? http.get(path)
                    : metodo === "POST"   ? http.post(path, bodyLimpo)
                    : metodo === "PUT"    ? http.put(path, bodyLimpo)
                    : metodo === "DELETE" ? http.delete(path)
                    : http.get(path);

        // Intercepta 401: tenta refresh do token antes de rejeitar
        return promise.then(_normalizarRespostaApi).catch(function (err) {
            if (err && err.status === 401 && nomeFuncao !== "login") {
                return _http().post("/auth/refresh", { token: localStorage.getItem("tokenApiSistema") })
                    .then(function (res) {
                        if (res && res.token) localStorage.setItem("tokenApiSistema", res.token);
                        // Re-tenta a chamada original
                        return metodo === "GET"    ? _http().get(path)
                             : metodo === "POST"   ? _http().post(path, bodyLimpo)
                             : metodo === "PUT"    ? _http().put(path, bodyLimpo)
                             : metodo === "DELETE" ? _http().delete(path)
                             : _http().get(path);
                    })
                    .then(_normalizarRespostaApi)
                    .catch(function () {
                        // Refresh falhou → logout forçado
                        if (window.Seguranca) Seguranca.auditoria.registrar("TOKEN_EXPIRADO", "auth", {});
                        if (window.AuthSistema) AuthSistema.logout();
                        throw err;
                    });
            }
            throw err;
        });
    }

    // Wrappers HTTP com segurança
    function _GET(path, nome)        { return _req("GET",    path, null, nome); }
    function _POST(path, body, nome) { return _req("POST",   path, body, nome); }
    function _PUT(path, body, nome)  { return _req("PUT",    path, body, nome); }
    function _DEL(path, nome)        { return _req("DELETE", path, null, nome); }

    function _qs(obj) {
        if (!obj) return "";
        var p = [];
        Object.keys(obj).forEach(function (k) {
            if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
                p.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
        });
        return p.length ? "?" + p.join("&") : "";
    }

    function _normalizarRespostaApi(res) {
        if (res && typeof res === "object" && Object.prototype.hasOwnProperty.call(res, "data")) {
            return res.data;
        }
        return res;
    }

    function _base()  { return obterBase(); }
    function _save(b) { salvarBase(b); }
    function _gid(p)  { return gerarId(p); }

    function _paginar(lista, limit, offset) {
        var l = Math.max(1, Number(limit)  || 50);
        var o = Math.max(0, Number(offset) || 0);
        return { total: lista.length, limit: l, offset: o, items: lista.slice(o, o + l) };
    }

    function _busca(lista, q, campos) {
        if (!q) return lista;
        var t = normalizar(q);
        return lista.filter(function (item) {
            return campos.some(function (c) {
                return normalizar(String(item[c] || "")).includes(t);
            });
        });
    }

    // ─── sanitização no mock ─────────────────────────────────────────────────
    function _sanitizarDados(dados) {
        if (!dados || !window.Seguranca) return dados;
        return Seguranca.sanitizar.objeto(dados);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MOCK — localStorage
    // ─────────────────────────────────────────────────────────────────────────
    var _mock = {

        // ══════════════════════════════════════════════════════════════════════
        //  AUTH
        // ══════════════════════════════════════════════════════════════════════
        login: function (login, senha) {
            var base = _base();
            var usr  = (base.usuarios || []).find(function (u) {
                return normalizar(u.login) === normalizar(login) && u.senha === senha && u.ativo !== false;
            });
            if (!usr) return _err("Usuário ou senha inválidos.");
            var token = "mock-jwt-" + usr.id + "-" + Date.now();
            localStorage.setItem("tokenApiSistema", token);
            return _ok({ token: token, expiresAt: new Date(Date.now() + 86400000).toISOString(), usuario: usr });
        },

        logout: function () {
            localStorage.removeItem("tokenApiSistema");
            return _ok({ sucesso: true });
        },

        refreshToken: function (token) {
            var novoToken = "mock-jwt-refresh-" + Date.now();
            localStorage.setItem("tokenApiSistema", novoToken);
            return _ok({ token: novoToken, expiresAt: new Date(Date.now() + 86400000).toISOString() });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  USUÁRIOS
        // ══════════════════════════════════════════════════════════════════════
        listarUsuarios: function () {
            return _ok(_base().usuarios || []);
        },

        obterUsuario: function (id) {
            var u = (_base().usuarios || []).find(function (x) { return x.id === id; });
            return u ? _ok(u) : _err("Usuário não encontrado.");
        },

        criarUsuario: function (dados) {
            var base = _base();
            var dup  = (base.usuarios || []).find(function (u) { return normalizar(u.login) === normalizar(dados.login); });
            if (dup) return _err("Login já cadastrado.");
            var u = Object.assign({ id: _gid("usr"), criadoEm: new Date().toISOString() }, dados);
            base.usuarios.push(u);
            _save(base);
            return _ok(u);
        },

        atualizarUsuario: function (id, dados) {
            var base = _base();
            var idx  = (base.usuarios || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Usuário não encontrado.");
            base.usuarios[idx] = Object.assign(base.usuarios[idx], dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.usuarios[idx]);
        },

        excluirUsuario: function (id) {
            var base = _base();
            var idx  = (base.usuarios || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Usuário não encontrado.");
            base.usuarios.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        alterarSenhaUsuario: function (id, senhaAtual, novaSenha) {
            var base = _base();
            var usr  = (base.usuarios || []).find(function (x) { return x.id === id; });
            if (!usr) return _err("Usuário não encontrado.");
            if (usr.senha !== senhaAtual) return _err("Senha atual incorreta.");
            usr.senha = novaSenha;
            usr.atualizadoEm = new Date().toISOString();
            _save(base);
            return _ok({ sucesso: true });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  CLIENTES
        // ══════════════════════════════════════════════════════════════════════
        listarClientes: function (q, limit, offset) {
            var lista = _base().clientes || [];
            return _ok(_paginar(_busca(lista, q, ["nome", "cpfCnpj", "email", "telefone"]), limit, offset));
        },

        obterCliente: function (id) {
            var c = (_base().clientes || []).find(function (x) { return x.id === id; });
            return c ? _ok(c) : _err("Cliente não encontrado.");
        },

        criarCliente: function (dados) {
            var base = _base();
            var c    = Object.assign({ id: _gid("cli"), criadoEm: new Date().toISOString() }, dados);
            base.clientes.push(c);
            _save(base);
            return _ok(c);
        },

        atualizarCliente: function (id, dados) {
            var base = _base();
            var idx  = (base.clientes || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Cliente não encontrado.");
            base.clientes[idx] = Object.assign(base.clientes[idx], dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.clientes[idx]);
        },

        excluirCliente: function (id) {
            var base = _base();
            var idx  = (base.clientes || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Cliente não encontrado.");
            base.clientes.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        historicoVendasCliente: function (id) {
            var base = _base();
            var v    = (base.vendas || []).filter(function (x) { return x.cliente?.id === id || x.clienteId === id; });
            return _ok(v);
        },

        // ══════════════════════════════════════════════════════════════════════
        //  MERCADORIAS
        // ══════════════════════════════════════════════════════════════════════
        listarMercadorias: function (q, categoria, ativo, limit, offset) {
            var lista = _base().mercadorias || [];
            if (categoria) lista = lista.filter(function (m) { return normalizar(m.categoria || "") === normalizar(categoria); });
            if (ativo !== undefined && ativo !== null && ativo !== "")
                lista = lista.filter(function (m) { return String(m.ativo !== false) === String(ativo !== "false" && ativo !== false); });
            return _ok(_paginar(_busca(lista, q, ["descricao", "nome", "codigo", "codigoBarras", "categoria"]), limit, offset));
        },

        obterMercadoria: function (id) {
            var m = (_base().mercadorias || []).find(function (x) { return x.id === id; });
            return m ? _ok(m) : _err("Mercadoria não encontrada.");
        },

        criarMercadoria: function (dados) {
            var base = _base();
            var m    = Object.assign({ id: _gid("mer"), criadoEm: new Date().toISOString() }, dados);
            base.mercadorias.push(m);
            _save(base);
            return _ok(m);
        },

        atualizarMercadoria: function (id, dados) {
            var base = _base();
            var idx  = (base.mercadorias || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Mercadoria não encontrada.");
            base.mercadorias[idx] = Object.assign(base.mercadorias[idx], dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.mercadorias[idx]);
        },

        excluirMercadoria: function (id) {
            var base = _base();
            var idx  = (base.mercadorias || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Mercadoria não encontrada.");
            base.mercadorias.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        ajustarEstoque: function (id, qtd, motivo, tipo) {
            var base = _base();
            var m    = (base.mercadorias || []).find(function (x) { return x.id === id; });
            if (!m) return _err("Mercadoria não encontrada.");
            var anterior   = numero(m.estoque) || 0;
            m.estoque      = Math.max(0, anterior + numero(qtd));
            m.atualizadoEm = new Date().toISOString();
            base.movimentosEstoque.push({
                id: _gid("est"), mercadoriaId: id, descricao: m.descricao || m.nome,
                qtdAntes: anterior, qtd: numero(qtd), qtdDepois: m.estoque,
                tipo: tipo || "ajuste", motivo: motivo || "", data: new Date().toISOString()
            });
            _save(base);
            return _ok({ id: id, estoqueAtual: m.estoque });
        },

        listarMovimentosEstoque: function (mercadoriaId, dataInicio, dataFim) {
            var lista = _base().movimentosEstoque || [];
            if (mercadoriaId) lista = lista.filter(function (x) { return x.mercadoriaId === mercadoriaId; });
            if (dataInicio)   lista = lista.filter(function (x) { return (x.data || "") >= dataInicio; });
            if (dataFim)      lista = lista.filter(function (x) { return (x.data || "") <= dataFim; });
            return _ok(lista);
        },

        listarTabelasPreco: function () {
            return _ok(_base().tabelasPreco || []);
        },

        salvarTabelaPreco: function (dados) {
            var base = _base();
            var idx  = base.tabelasPreco.findIndex(function (t) { return t.id === dados.id; });
            if (idx >= 0) {
                base.tabelasPreco[idx] = Object.assign(base.tabelasPreco[idx], dados, { atualizadoEm: new Date().toISOString() });
            } else {
                base.tabelasPreco.push(Object.assign({ id: _gid("tab"), criadoEm: new Date().toISOString() }, dados));
            }
            _save(base);
            return _ok(dados);
        },

        excluirTabelaPreco: function (id) {
            var base = _base();
            var idx  = base.tabelasPreco.findIndex(function (t) { return t.id === id; });
            if (idx < 0) return _err("Tabela de preço não encontrada.");
            base.tabelasPreco.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  FORNECEDORES
        // ══════════════════════════════════════════════════════════════════════
        listarFornecedores: function (q, limit, offset) {
            var lista = _base().fornecedores || [];
            return _ok(_paginar(_busca(lista, q, ["nome", "razaoSocial", "nomeFantasia", "cnpj", "email", "telefone"]), limit, offset));
        },

        obterFornecedor: function (id) {
            var f = (_base().fornecedores || []).find(function (x) { return x.id === id; });
            return f ? _ok(f) : _err("Fornecedor não encontrado.");
        },

        criarFornecedor: function (dados) {
            var base = _base();
            var f    = Object.assign({ id: _gid("for"), criadoEm: new Date().toISOString() }, dados);
            base.fornecedores.push(f);
            _save(base);
            return _ok(f);
        },

        atualizarFornecedor: function (id, dados) {
            var base = _base();
            var idx  = (base.fornecedores || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Fornecedor não encontrado.");
            base.fornecedores[idx] = Object.assign(base.fornecedores[idx], dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.fornecedores[idx]);
        },

        excluirFornecedor: function (id) {
            var base = _base();
            var idx  = (base.fornecedores || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Fornecedor não encontrado.");
            base.fornecedores.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  FORMAS DE PAGAMENTO
        // ══════════════════════════════════════════════════════════════════════
        listarFormasPagamento: function () {
            return _ok(_base().formasPagamento || []);
        },

        criarFormaPagamento: function (dados) {
            var base = _base();
            var f    = Object.assign({ id: _gid("fpg"), criadoEm: new Date().toISOString() }, dados);
            base.formasPagamento.push(f);
            _save(base);
            return _ok(f);
        },

        atualizarFormaPagamento: function (id, dados) {
            var base = _base();
            var idx  = base.formasPagamento.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Forma de pagamento não encontrada.");
            base.formasPagamento[idx] = Object.assign(base.formasPagamento[idx], dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.formasPagamento[idx]);
        },

        excluirFormaPagamento: function (id) {
            var base = _base();
            var idx  = base.formasPagamento.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Forma de pagamento não encontrada.");
            base.formasPagamento.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  ENTRADAS DE MERCADORIAS (NF de compra)
        // ══════════════════════════════════════════════════════════════════════
        listarEntradas: function (status, dataInicio, dataFim, fornecedorId) {
            var lista = _base().notasEntrada || [];
            if (status)      lista = lista.filter(function (x) { return x.status === status; });
            if (fornecedorId) lista = lista.filter(function (x) { return x.fornecedorId === fornecedorId; });
            if (dataInicio)  lista = lista.filter(function (x) { return (x.dataEmissao || x.data || "") >= dataInicio; });
            if (dataFim)     lista = lista.filter(function (x) { return (x.dataEmissao || x.data || "") <= dataFim; });
            return _ok(lista);
        },

        obterEntrada: function (id) {
            var e = (_base().notasEntrada || []).find(function (x) { return x.id === id; });
            return e ? _ok(e) : _err("Entrada não encontrada.");
        },

        criarEntrada: function (dados) {
            var base = _base();
            var e    = Object.assign({ id: _gid("ent"), status: "pendente", criadoEm: new Date().toISOString() }, dados);
            base.notasEntrada.push(e);
            _save(base);
            return _ok(e);
        },

        confirmarEntrada: function (id) {
            var base = _base();
            var idx  = base.notasEntrada.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Entrada não encontrada.");
            var entrada = base.notasEntrada[idx];
            if (entrada.status === "confirmada") return _err("Entrada já confirmada.");
            entrada.status      = "confirmada";
            entrada.confirmadaEm = new Date().toISOString();
            // Atualiza estoque
            (entrada.itens || []).forEach(function (item) {
                var m = (base.mercadorias || []).find(function (x) { return x.id === item.mercadoriaId || x.id === item.id; });
                if (m) {
                    var ant = numero(m.estoque) || 0;
                    m.estoque = ant + numero(item.qtd || item.quantidade);
                    base.movimentosEstoque.push({
                        id: _gid("est"), mercadoriaId: m.id, descricao: m.descricao || m.nome,
                        qtdAntes: ant, qtd: numero(item.qtd || item.quantidade), qtdDepois: m.estoque,
                        tipo: "entrada", entradaId: id, data: new Date().toISOString()
                    });
                }
            });
            _save(base);
            return _ok(entrada);
        },

        cancelarEntrada: function (id) {
            var base = _base();
            var idx  = base.notasEntrada.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Entrada não encontrada.");
            base.notasEntrada[idx].status = "cancelada";
            base.notasEntrada[idx].canceladaEm = new Date().toISOString();
            _save(base);
            return _ok(base.notasEntrada[idx]);
        },

        importarXmlEntrada: function (xmlBase64) {
            // Mock: retorna estrutura simulada de uma NF parseada
            return _ok({
                chave: "35" + Date.now(),
                serie: "001",
                numero: String(Math.floor(Math.random() * 9000) + 1000),
                dataEmissao: new Date().toISOString().slice(0, 10),
                fornecedor: { nome: "Fornecedor Importado XML", cnpj: "00.000.000/0001-00" },
                totalNota: 0,
                itens: []
            });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  FISCAL — NF-e / NFC-e / Documentos
        // ══════════════════════════════════════════════════════════════════════
        listarDocumentosFiscais: function (tipo, status, dataInicio, dataFim, q) {
            var base  = _base();
            var lista = (base.notasSaida || []).concat(base.notasFiscais || []);
            if (tipo && tipo !== "todos") lista = lista.filter(function (d) { return d.tipo === tipo; });
            if (status)     lista = lista.filter(function (d) { return d.status === status; });
            if (dataInicio) lista = lista.filter(function (d) { return (d.dataEmissao || d.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (d) { return (d.dataEmissao || d.data || "") <= dataFim; });
            if (q)          lista = _busca(lista, q, ["numero", "chave", "clienteNome", "destinatario"]);
            return _ok(lista);
        },

        obterDocumentoFiscal: function (id) {
            var base  = _base();
            var lista = (base.notasSaida || []).concat(base.notasFiscais || []);
            var d     = lista.find(function (x) { return x.id === id || x.chave === id; });
            return d ? _ok(d) : _err("Documento fiscal não encontrado.");
        },

        emitirNfe: function (dados) {
            var base   = _base();
            if (!base.notasSaida) base.notasSaida = [];
            var numero = String(base.notasSaida.filter(function (d) { return d.tipo === "nfe"; }).length + 1).padStart(9, "0");
            var nf     = Object.assign({
                id: _gid("nfe"), tipo: "nfe", status: "autorizada",
                numero: numero, serie: "001",
                chave: "35" + Date.now() + "55001",
                protocoloAutorizacao: "MOCK-" + Date.now(),
                dataEmissao: new Date().toISOString()
            }, dados);
            base.notasSaida.push(nf);
            _save(base);
            return _ok(nf);
        },

        cancelarDocumentoFiscal: function (chave, justificativa) {
            var base  = _base();
            var lista = base.notasSaida || [];
            var idx   = lista.findIndex(function (x) { return x.chave === chave; });
            if (idx < 0) return _err("Documento fiscal não encontrado.");
            lista[idx].status                  = "cancelada";
            lista[idx].canceladaEm             = new Date().toISOString();
            lista[idx].justificativaCancelamento = justificativa;
            lista[idx].protocoloCancelamento   = "MOCK-CANC-" + Date.now();
            _save(base);
            return _ok(lista[idx]);
        },

        inutilizarNfe: function (serie, numeroInicio, numeroFim, justificativa) {
            return _ok({ sucesso: true, protocolo: "MOCK-INUT-" + Date.now(), serie: serie, numeroInicio: numeroInicio, numeroFim: numeroFim });
        },

        obterXmlDocumentoFiscal: function (chave) {
            return _ok({ chave: chave, xml: "<?xml version=\"1.0\"?><nfeProc><!-- mock xml --></nfeProc>" });
        },

        reimprimirDocumentoFiscal: function (chave) {
            return _ok({ sucesso: true, urlPdf: "#mock-pdf-" + chave });
        },

        registrarDevolucaoFiscal: function (dados) {
            var base = _base();
            if (!base.devolucoesFiscais) base.devolucoesFiscais = [];
            var d = Object.assign({ id: _gid("dvf"), criadoEm: new Date().toISOString() }, dados);
            base.devolucoesFiscais.push(d);
            _save(base);
            return _ok(d);
        },

        // ══════════════════════════════════════════════════════════════════════
        //  MANIFESTAÇÃO DO DESTINATÁRIO (MDF-e / DF-e)
        // ══════════════════════════════════════════════════════════════════════

        // Lista as NF-e recebidas com filtros (q, status, dataInicio, dataFim, limit, offset)
        listarManifestacoes: function (filtros) {
            var base = _base();
            if (!Array.isArray(base.manifestacoesDestinatario)) base.manifestacoesDestinatario = _mockNfeDemo();
            var lista = base.manifestacoesDestinatario.slice();
            filtros = filtros || {};
            if (filtros.status)     lista = lista.filter(function (n) { return n.status === filtros.status; });
            if (filtros.dataInicio) lista = lista.filter(function (n) { return (n.dataEmissao || "") >= filtros.dataInicio; });
            if (filtros.dataFim)    lista = lista.filter(function (n) { return (n.dataEmissao || "") <= filtros.dataFim; });
            if (filtros.q) {
                lista = _busca(lista, filtros.q, ["emitenteNome", "emitenteCnpj", "numero", "chave"]);
            }
            return _ok({ total: lista.length, items: lista });
        },

        // Consulta DFe na SEFAZ e armazena NF-e novas localmente
        consultarDfeDestinatario: function (params) {
            var base = _base();
            if (!Array.isArray(base.manifestacoesDestinatario)) base.manifestacoesDestinatario = _mockNfeDemo();
            // Mock: simula chegada de 1 nova NF-e a cada consulta
            var nova = {
                id: _gid("md"),
                chave: "35" + Date.now() + String(Math.random()).slice(2, 8) + "55001",
                numero: String(base.manifestacoesDestinatario.length + 100).padStart(6, "0"),
                serie: "1",
                emitenteNome: "Fornecedor Simulado Ltda",
                emitenteCnpj: "12345678000199",
                valor: Math.round(Math.random() * 500000) / 100,
                dataEmissao: new Date().toISOString(),
                dhRecebimento: new Date().toISOString(),
                status: "pendente",
                situacaoSefaz: "autorizada",
                eventos: [],
                xmlDisponivel: true
            };
            base.manifestacoesDestinatario.push(nova);
            _save(base);
            return _ok({ novasNfe: 1, ultimoNsu: "000000000000099", total: base.manifestacoesDestinatario.length });
        },

        // Registra evento de manifestação para uma ou mais NF-e
        manifestarDestinatario: function (dados) {
            // dados: { chaves: [], tipoEvento: "confirmada"|"ciencia"|"desconhecida"|"nao_realizada", codigoEvento: 210200, justificativa: "" }
            var base = _base();
            if (!Array.isArray(base.manifestacoesDestinatario)) base.manifestacoesDestinatario = [];
            var chaves = dados.chaves || [];
            var resultados = chaves.map(function (chave) {
                var idx = base.manifestacoesDestinatario.findIndex(function (n) { return n.chave === chave; });
                if (idx < 0) return { chave: chave, sucesso: false, mensagem: "NF-e não encontrada." };
                var evento = {
                    tipo:         dados.tipoEvento,
                    codigoEvento: dados.codigoEvento,
                    dhEvento:     new Date().toISOString(),
                    protocolo:    "MOCK-MD-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
                    justificativa: dados.justificativa || ""
                };
                base.manifestacoesDestinatario[idx].status = dados.tipoEvento;
                base.manifestacoesDestinatario[idx].eventos = base.manifestacoesDestinatario[idx].eventos || [];
                base.manifestacoesDestinatario[idx].eventos.push(evento);
                return { chave: chave, sucesso: true, protocolo: evento.protocolo };
            });
            _save(base);
            return _ok({ resultados: resultados });
        },

        // Download do XML de uma NF-e recebida pelo destinatário
        baixarXmlMd: function (chave) {
            return _ok({ chave: chave, xml: '<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00"><!-- NF-e chave=' + chave + ' - mock --></nfeProc>' });
        },

        // Histórico de eventos de manifestação de uma NF-e
        historicoMd: function (chave) {
            var base  = _base();
            var lista = base.manifestacoesDestinatario || [];
            var nfe   = lista.find(function (n) { return n.chave === chave; });
            return nfe ? _ok(nfe.eventos || []) : _err("NF-e não encontrada.");
        },

        // ══════════════════════════════════════════════════════════════════════
        //  FINANCEIRO
        // ══════════════════════════════════════════════════════════════════════
        resumoFinanceiro: function (dataInicio, dataFim) {
            var base   = _base();
            var vendas = base.vendas || [];
            if (dataInicio) vendas = vendas.filter(function (v) { return (v.data || "") >= dataInicio; });
            if (dataFim)    vendas = vendas.filter(function (v) { return (v.data || "") <= dataFim; });
            var receita    = vendas.reduce(function (s, v) { return s + numero(v.total); }, 0);
            var receber    = (base.contasReceber || []).filter(function (c) { return c.status !== "baixada"; })
                              .reduce(function (s, c) { return s + numero(c.valor); }, 0);
            var pagar      = (base.contasPagar || []).filter(function (c) { return c.status !== "paga" && c.status !== "cancelada"; })
                              .reduce(function (s, c) { return s + numero(c.valor); }, 0);
            var sangrias   = (base.movimentosCaixa || []).filter(function (m) { return m.tipo === "sangria"; })
                              .reduce(function (s, m) { return s + numero(m.valor); }, 0);
            var suprimentos = (base.movimentosCaixa || []).filter(function (m) { return m.tipo === "suprimento"; })
                              .reduce(function (s, m) { return s + numero(m.valor); }, 0);
            return _ok({ receitaBruta: receita, totalReceber: receber, totalPagar: pagar, sangrias: sangrias, suprimentos: suprimentos });
        },

        listarMovimentosCaixa: function (tipo, dataInicio, dataFim) {
            var lista = _base().movimentosCaixa || [];
            if (tipo)       lista = lista.filter(function (m) { return m.tipo === tipo; });
            if (dataInicio) lista = lista.filter(function (m) { return (m.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (m) { return (m.data || "") <= dataFim; });
            return _ok(lista);
        },

        registrarMovimentoCaixa: function (dados) {
            var base = _base();
            var m    = Object.assign({ id: _gid("mov"), data: new Date().toISOString() }, dados);
            base.movimentosCaixa.push(m);
            _save(base);
            return _ok(m);
        },

        fluxoCaixa: function (dataInicio, dataFim) {
            var lista = _base().movimentosCaixa || [];
            if (dataInicio) lista = lista.filter(function (m) { return (m.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (m) { return (m.data || "") <= dataFim; });
            var entradas = lista.filter(function (m) { return m.tipo === "suprimento" || m.tipo === "entrada"; });
            var saidas   = lista.filter(function (m) { return m.tipo === "sangria" || m.tipo === "saida"; });
            var saldoEntradas = entradas.reduce(function (s, m) { return s + numero(m.valor); }, 0);
            var saldoSaidas   = saidas.reduce(function (s, m) { return s + numero(m.valor); }, 0);
            return _ok({ entradas: entradas, saidas: saidas, saldoEntradas: saldoEntradas, saldoSaidas: saldoSaidas, saldo: saldoEntradas - saldoSaidas });
        },

        // — Contas a Pagar —
        listarContasPagar: function (status, fornecedorId, dataInicio, dataFim) {
            var lista = _base().contasPagar || [];
            if (status)       lista = lista.filter(function (c) { return c.status === status; });
            if (fornecedorId) lista = lista.filter(function (c) { return c.fornecedorId === fornecedorId; });
            if (dataInicio)   lista = lista.filter(function (c) { return (c.vencimento || "") >= dataInicio; });
            if (dataFim)      lista = lista.filter(function (c) { return (c.vencimento || "") <= dataFim; });
            return _ok(lista);
        },

        criarContaPagar: function (dados) {
            var base = _base();
            var c    = Object.assign({ id: _gid("cpg"), status: "aberta", criadoEm: new Date().toISOString() }, dados);
            base.contasPagar.push(c);
            _save(base);
            return _ok(c);
        },

        atualizarContaPagar: function (id, dados) {
            var base = _base();
            var idx  = base.contasPagar.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Conta a pagar não encontrada.");
            base.contasPagar[idx] = Object.assign(base.contasPagar[idx], dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.contasPagar[idx]);
        },

        baixarContaPagar: function (id, dataPagamento, valorPago) {
            var base = _base();
            var idx  = base.contasPagar.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Conta a pagar não encontrada.");
            base.contasPagar[idx].status        = "paga";
            base.contasPagar[idx].dataPagamento = dataPagamento || new Date().toISOString().slice(0, 10);
            base.contasPagar[idx].valorPago     = numero(valorPago) || numero(base.contasPagar[idx].valor);
            _save(base);
            return _ok(base.contasPagar[idx]);
        },

        excluirContaPagar: function (id) {
            var base = _base();
            var idx  = base.contasPagar.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Conta a pagar não encontrada.");
            base.contasPagar.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        // — Contas a Receber —
        listarContasReceber: function (status, clienteId, dataInicio, dataFim) {
            var lista = _base().contasReceber || [];
            if (status)    lista = lista.filter(function (c) { return c.status === status; });
            if (clienteId) lista = lista.filter(function (c) { return c.clienteId === clienteId || c.cliente?.id === clienteId; });
            if (dataInicio) lista = lista.filter(function (c) { return (c.vencimento || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (c) { return (c.vencimento || "") <= dataFim; });
            return _ok(lista);
        },

        criarContaReceber: function (dados) {
            var base = _base();
            var c    = Object.assign({ id: _gid("crb"), status: "pendente", criadoEm: new Date().toISOString() }, dados);
            base.contasReceber.push(c);
            _save(base);
            return _ok(c);
        },

        baixarContaReceber: function (id, dataBaixa, valorRecebido) {
            var base = _base();
            var idx  = base.contasReceber.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Conta a receber não encontrada.");
            base.contasReceber[idx].status        = "baixada";
            base.contasReceber[idx].dataBaixa     = dataBaixa || new Date().toISOString().slice(0, 10);
            base.contasReceber[idx].valorRecebido = numero(valorRecebido) || numero(base.contasReceber[idx].valor);
            _save(base);
            return _ok(base.contasReceber[idx]);
        },

        excluirContaReceber: function (id) {
            var base = _base();
            var idx  = base.contasReceber.findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Conta a receber não encontrada.");
            base.contasReceber.splice(idx, 1);
            _save(base);
            return _ok({ sucesso: true });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  BOLETOS
        // ══════════════════════════════════════════════════════════════════════
        listarBoletos: function (status, clienteId, dataInicio, dataFim) {
            var lista = _base().boletos || [];
            if (status)    lista = lista.filter(function (b) { return b.status === status; });
            if (clienteId) lista = lista.filter(function (b) { return b.clienteId === clienteId; });
            if (dataInicio) lista = lista.filter(function (b) { return (b.vencimento || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (b) { return (b.vencimento || "") <= dataFim; });
            return _ok(lista);
        },

        emitirBoleto: function (dados) {
            var base = _base();
            var b    = Object.assign({
                id: _gid("bol"), status: "emitido",
                linhaDigitavel: "00000." + Math.random().toString().slice(2, 7) + " 00000.000000 0 00000000000000",
                criadoEm: new Date().toISOString()
            }, dados);
            base.boletos.push(b);
            _save(base);
            return _ok(b);
        },

        // ══════════════════════════════════════════════════════════════════════
        //  DASHBOARD
        // ══════════════════════════════════════════════════════════════════════
        resumoDashboard: function () {
            var base    = _base();
            var hoje    = new Date().toISOString().slice(0, 10);
            var vHoje   = (base.vendas || []).filter(function (v) { return (v.data || "").startsWith(hoje); });
            var fatHoje = vHoje.reduce(function (s, v) { return s + numero(v.total); }, 0);
            var semana  = new Date(Date.now() - 6 * 86400000).toISOString();
            var vSemana = (base.vendas || []).filter(function (v) { return (v.data || "") >= semana; });
            var mes     = new Date().toISOString().slice(0, 7);
            var vMes    = (base.vendas || []).filter(function (v) { return (v.data || "").startsWith(mes); });
            var prodEstMin = (base.mercadorias || []).filter(function (m) {
                return m.ativo !== false && numero(m.estoque) <= numero(m.estoqueMinimo || 0) && numero(m.estoqueMinimo || 0) > 0;
            }).length;
            var contasVencer = (base.contasPagar || []).filter(function (c) {
                return c.status === "aberta" && (c.vencimento || "") <= hoje;
            }).length;
            return _ok({
                vendasHoje:            vHoje.length,
                faturamentoHoje:       fatHoje,
                vendasSemana:          vSemana.length,
                faturamentoSemana:     vSemana.reduce(function (s, v) { return s + numero(v.total); }, 0),
                vendasMes:             vMes.length,
                faturamentoMes:        vMes.reduce(function (s, v) { return s + numero(v.total); }, 0),
                totalClientes:         (base.clientes || []).length,
                totalProdutos:         (base.mercadorias || []).filter(function (m) { return m.ativo !== false; }).length,
                produtosEstoqueMinimo: prodEstMin,
                contasPagarVencidas:   contasVencer,
                totalContasReceber:    (base.contasReceber || []).filter(function (c) { return c.status !== "baixada"; })
                                        .reduce(function (s, c) { return s + numero(c.valor); }, 0)
            });
        },

        vendasPorPeriodo: function (periodo, dataInicio, dataFim) {
            var base  = _base();
            var lista = base.vendas || [];
            if (dataInicio) lista = lista.filter(function (v) { return (v.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (v) { return (v.data || "") <= dataFim; });
            var total = lista.reduce(function (s, v) { return s + numero(v.total); }, 0);
            return _ok({ periodo: periodo, count: lista.length, total: total });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  RELATÓRIOS
        // ══════════════════════════════════════════════════════════════════════
        relatorioVendas: function (dataInicio, dataFim, vendedorLogin) {
            var lista = _base().vendas || [];
            if (dataInicio)    lista = lista.filter(function (v) { return (v.data || "") >= dataInicio; });
            if (dataFim)       lista = lista.filter(function (v) { return (v.data || "") <= dataFim; });
            if (vendedorLogin) lista = lista.filter(function (v) { return v.vendedorLogin === vendedorLogin || v.usuarioLogin === vendedorLogin; });
            return _ok(lista);
        },

        relatorioCancelamentos: function (dataInicio, dataFim) {
            var lista = _base().vendasCanceladas || [];
            if (dataInicio) lista = lista.filter(function (v) { return (v.canceladaEm || v.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (v) { return (v.canceladaEm || v.data || "") <= dataFim; });
            return _ok(lista);
        },

        relatorioEstoque: function (apenasAbaixoMinimo) {
            var lista = _base().mercadorias || [];
            if (apenasAbaixoMinimo) lista = lista.filter(function (m) { return numero(m.estoque) <= numero(m.estoqueMinimo || 0); });
            return _ok(lista);
        },

        relatorioFinanceiro: function (dataInicio, dataFim) {
            var base = _base();
            var mov  = base.movimentosCaixa || [];
            if (dataInicio) mov = mov.filter(function (m) { return (m.data || "") >= dataInicio; });
            if (dataFim)    mov = mov.filter(function (m) { return (m.data || "") <= dataFim; });
            return _ok({ movimentos: mov, contasPagar: base.contasPagar || [], contasReceber: base.contasReceber || [] });
        },

        relatorioClientes: function (dataInicio, dataFim) {
            var lista = _base().clientes || [];
            if (dataInicio) lista = lista.filter(function (c) { return (c.criadoEm || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (c) { return (c.criadoEm || "") <= dataFim; });
            return _ok(lista);
        },

        relatorioProdutosMaisVendidos: function (dataInicio, dataFim, limit) {
            var vendas = _base().vendas || [];
            if (dataInicio) vendas = vendas.filter(function (v) { return (v.data || "") >= dataInicio; });
            if (dataFim)    vendas = vendas.filter(function (v) { return (v.data || "") <= dataFim; });
            var mapa = {};
            vendas.forEach(function (v) {
                (v.itens || []).forEach(function (item) {
                    var k = item.produtoId || item.id || item.codigo;
                    if (!mapa[k]) mapa[k] = { id: k, descricao: item.descricao || item.nome, qtd: 0, total: 0 };
                    mapa[k].qtd   += numero(item.qtd || item.quantidade);
                    mapa[k].total += numero(item.total || (numero(item.precoUnitario) * numero(item.qtd || item.quantidade)));
                });
            });
            var lista = Object.values(mapa).sort(function (a, b) { return b.qtd - a.qtd; });
            return _ok(lista.slice(0, limit || 20));
        },

        relatorioMargemLucro: function (categoria) {
            var lista = (_base().mercadorias || []).filter(function (m) { return m.ativo !== false; });
            if (categoria) lista = lista.filter(function (m) { return m.categoria === categoria; });
            return _ok(lista);
        },

        relatorioInventario: function (categoria) {
            var lista = _base().mercadorias || [];
            if (categoria) lista = lista.filter(function (m) { return m.categoria === categoria; });
            return _ok(lista);
        },

        relatorioCurvaAbc: function (dataInicio, dataFim) {
            var vendas = _base().vendas || [];
            if (dataInicio) vendas = vendas.filter(function (v) { return (v.data || "") >= dataInicio; });
            if (dataFim)    vendas = vendas.filter(function (v) { return (v.data || "") <= dataFim; });
            var mapa = {};
            vendas.forEach(function (v) {
                (v.itens || []).forEach(function (item) {
                    var k = item.produtoId || item.id || item.codigo;
                    if (!mapa[k]) mapa[k] = { id: k, descricao: item.descricao || item.nome, qtd: 0, total: 0 };
                    mapa[k].qtd   += numero(item.qtd || item.quantidade);
                    mapa[k].total += numero(item.total || (numero(item.precoUnitario) * numero(item.qtd || item.quantidade)));
                });
            });
            var lista = Object.values(mapa).sort(function (a, b) { return b.total - a.total; });
            return _ok(lista);
        },

        relatorioComissao: function (dataInicio, dataFim) {
            var base = _base();
            var vendas = base.vendas || [];
            if (dataInicio) vendas = vendas.filter(function (v) { return (v.data || "") >= dataInicio; });
            if (dataFim)    vendas = vendas.filter(function (v) { return (v.data || "") <= dataFim; });
            var usuarios = (base.usuarios || []).filter(function (u) { return u.ativo !== false; });
            return _ok({ vendas: vendas, usuarios: usuarios });
        },

        relatorioFichaCadastral: function (termo) {
            var base = _base();
            var alvo = normalizar(termo);
            var digitosTermo = String(termo || "").replace(/\D/g, "");
            var encontrados = (base.clientes || []).filter(function (c) {
                var digitosCpf = String(c.cpf || "").replace(/\D/g, "");
                return normalizar(c.nome).includes(alvo) || (digitosTermo && digitosCpf.includes(digitosTermo));
            });
            if (!encontrados.length) return _ok({ cliente: null, vendas: [], totalEncontrados: 0 });
            var cliente = encontrados[0];
            var vendas = (base.vendas || []).filter(function (v) { return v.clienteId === cliente.id; });
            return _ok({ cliente: cliente, vendas: vendas, totalEncontrados: encontrados.length });
        },

        relatorioAlteracoesProdutos: function (dataInicio, dataFim) {
            var lista = _base().logAlteracoesProdutos || [];
            if (dataInicio) lista = lista.filter(function (l) { return (l.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (l) { return (l.data || "") <= dataFim; });
            return _ok(lista.slice().reverse());
        },

        // ══════════════════════════════════════════════════════════════════════
        //  CONFIGURAÇÕES DO SISTEMA
        // ══════════════════════════════════════════════════════════════════════
        obterConfiguracoes: function () {
            return _ok(_base().configuracoes || {});
        },

        salvarConfiguracoes: function (dados) {
            var base = _base();
            base.configuracoes = Object.assign(base.configuracoes || {}, dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.configuracoes);
        },

        uploadCertificadoDigital: function (arquivoBase64, senha) {
            return _ok({ sucesso: true, validade: "2028-12-31", emitido: "Certificado Mock CA" });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  DADOS DA EMPRESA
        // ══════════════════════════════════════════════════════════════════════
        obterEmpresa: function () {
            var base = _base();
            return _ok(base.empresa || base.configuracoes?.empresa || {});
        },

        atualizarEmpresa: function (dados) {
            var base = _base();
            if (!base.empresa) base.empresa = {};
            base.empresa = Object.assign(base.empresa, dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.empresa);
        },

        // ══════════════════════════════════════════════════════════════════════
        //  INTEGRAÇÕES
        // ══════════════════════════════════════════════════════════════════════
        listarIntegracoes: function () {
            return _ok(_base().integracoes || {});
        },

        salvarIntegracao: function (tipo, dados) {
            var base = _base();
            if (!base.integracoes) base.integracoes = {};
            base.integracoes[tipo] = Object.assign(base.integracoes[tipo] || {}, dados, { atualizadoEm: new Date().toISOString() });
            _save(base);
            return _ok(base.integracoes[tipo]);
        },

        testarIntegracao: function (tipo) {
            return _ok({ sucesso: true, mensagem: "Conexão com " + tipo + " estabelecida (mock).", latencia: 42 });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  DEVOLUÇÕES PDV
        // ══════════════════════════════════════════════════════════════════════
        listarDevolucoes: function (vendaId, tipo, dataInicio, dataFim) {
            var lista = _base().devolucoes || [];
            if (vendaId)    lista = lista.filter(function (d) { return d.vendaId === vendaId; });
            if (tipo)       lista = lista.filter(function (d) { return d.tipo === tipo; });
            if (dataInicio) lista = lista.filter(function (d) { return (d.data || "") >= dataInicio; });
            if (dataFim)    lista = lista.filter(function (d) { return (d.data || "") <= dataFim; });
            return _ok(lista);
        },

        registrarDevolucao: function (dados) {
            var base = _base();
            var d    = Object.assign({ id: _gid("dev"), data: new Date().toISOString() }, dados);
            base.devolucoes.push(d);
            _save(base);
            return _ok(d);
        },

        // ══════════════════════════════════════════════════════════════════════
        //  VALES DE CRÉDITO
        // ══════════════════════════════════════════════════════════════════════
        listarValesCredito: function (status) {
            var lista = _base().valesCredito || [];
            if (status) lista = lista.filter(function (v) { return v.status === status; });
            return _ok(lista);
        },

        obterValePorCodigo: function (codigo) {
            var v = (_base().valesCredito || []).find(function (x) { return x.codigo === codigo; });
            return v ? _ok(v) : _err("Vale de crédito não encontrado.");
        },

        utilizarVale: function (id, valorUtilizado) {
            var base = _base();
            var idx  = (base.valesCredito || []).findIndex(function (x) { return x.id === id; });
            if (idx < 0) return _err("Vale de crédito não encontrado.");
            var vale = base.valesCredito[idx];
            if (vale.status !== "ativo") return _err("Vale não está ativo.");
            if (numero(vale.saldo) < numero(valorUtilizado)) return _err("Saldo insuficiente no vale.");
            vale.saldo = Math.round((numero(vale.saldo) - numero(valorUtilizado)) * 100) / 100;
            if (vale.saldo <= 0) vale.status = "utilizado";
            _save(base);
            return _ok(vale);
        },

        // ══════════════════════════════════════════════════════════════════════
        //  PLANOS / ASSINATURA
        // ══════════════════════════════════════════════════════════════════════
        listarPlanos: function () {
            return _ok(_base().planos || [
                { id: "basico",    nome: "Básico",       preco: 79.90,  funcionalidades: ["PDV", "Cadastros", "Relatórios básicos"] },
                { id: "standard", nome: "Standard",      preco: 149.90, funcionalidades: ["PDV", "Cadastros", "Fiscal NF-e", "Financeiro", "Relatórios"] },
                { id: "premium",  nome: "Premium",       preco: 249.90, funcionalidades: ["Tudo do Standard", "NFC-e", "Integrações", "Suporte prioritário"] }
            ]);
        },

        obterPlanoAtivo: function () {
            return _ok(_base().planoAtivo || null);
        }
    };

    // ─── DADOS DEMO — Manifestação do Destinatário ───────────────────────────
    function _mockNfeDemo() {
        var emitentes = [
            { nome: "Distribuidora Central Ltda",    cnpj: "11222333000181" },
            { nome: "Indústria Alfa S.A.",            cnpj: "44555666000172" },
            { nome: "Comércio Beta Eireli",           cnpj: "77888999000163" },
            { nome: "Transportes Gama Ltda",          cnpj: "22333444000191" }
        ];
        var status = ["pendente", "pendente", "pendente", "ciencia", "confirmada", "desconhecida", "nao_realizada"];
        var itens  = [];
        for (var i = 0; i < 12; i++) {
            var emit  = emitentes[i % emitentes.length];
            var st    = status[i % status.length];
            var data  = new Date(Date.now() - i * 86400000 * 3);
            var chave = "35" + String(data.getFullYear()) + String(data.getMonth() + 1).padStart(2, "0")
                      + emit.cnpj.replace(/\D/g, "").slice(0, 8) + "55001"
                      + String(i + 1).padStart(9, "0") + "1" + String(i).padStart(9, "0") + "0";
            chave = chave.slice(0, 44);
            var eventos = [];
            if (st !== "pendente") {
                eventos.push({ tipo: st, codigoEvento: { ciencia: 210210, confirmada: 210200, desconhecida: 210220, nao_realizada: 210240 }[st],
                    dhEvento: new Date(data.getTime() + 3600000).toISOString(),
                    protocolo: "MOCK-" + Date.now() + i, justificativa: "" });
            }
            itens.push({
                id: "md-demo-" + (i + 1),
                chave: chave,
                numero: String(1000 + i),
                serie: "1",
                emitenteNome: emit.nome,
                emitenteCnpj: emit.cnpj,
                valor: Math.round((500 + i * 137.50) * 100) / 100,
                dataEmissao: data.toISOString(),
                dhRecebimento: new Date(data.getTime() + 1800000).toISOString(),
                status: st,
                situacaoSefaz: "autorizada",
                eventos: eventos,
                xmlDisponivel: true
            });
        }
        return itens;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REAL — requisições HTTP com segurança (CSRF, rate-limit, sanitização, auditoria)
    // ─────────────────────────────────────────────────────────────────────────
    var _real = {

        // Auth
        login:               function (login, senha)      { return _POST("/auth/login",   { login: login, senha: senha }, "login"); },
        logout:              function ()                   { return _POST("/auth/logout",  null, "logout"); },
        refreshToken:        function (token)              { return _POST("/auth/refresh", { token: token }, "refreshToken"); },

        // Usuários
        listarUsuarios:      function ()                   { return _GET("/usuarios", "listarUsuarios"); },
        obterUsuario:        function (id)                 { return _GET("/usuarios/" + id, "obterUsuario"); },
        criarUsuario:        function (d)                  { return _POST("/usuarios", d, "criarUsuario"); },
        atualizarUsuario:    function (id, d)              { return _PUT("/usuarios/" + id, d, "atualizarUsuario"); },
        excluirUsuario:      function (id)                 { return _DEL("/usuarios/" + id, "excluirUsuario"); },
        alterarSenhaUsuario: function (id, sa, sn)         { return _PUT("/usuarios/" + id + "/senha", { senhaAtual: sa, novaSenha: sn }, "alterarSenhaUsuario"); },

        // Clientes
        listarClientes:           function (q, l, o)      { return _GET("/clientes"     + _qs({ q: q, limit: l, offset: o }), "listarClientes"); },
        obterCliente:             function (id)            { return _GET("/clientes/" + id, "obterCliente"); },
        criarCliente:             function (d)             { return _POST("/clientes", d, "criarCliente"); },
        atualizarCliente:         function (id, d)         { return _PUT("/clientes/" + id, d, "atualizarCliente"); },
        excluirCliente:           function (id)            { return _DEL("/clientes/" + id, "excluirCliente"); },
        historicoVendasCliente:   function (id)            { return _GET("/clientes/" + id + "/historico", "historicoVendasCliente"); },

        // Mercadorias
        listarMercadorias:       function (q, cat, at, l, o) { return _GET("/mercadorias"  + _qs({ q: q, categoria: cat, ativo: at, limit: l, offset: o }), "listarMercadorias"); },
        obterMercadoria:         function (id)               { return _GET("/mercadorias/" + id, "obterMercadoria"); },
        criarMercadoria:         function (d)                { return _POST("/mercadorias", d, "criarMercadoria"); },
        atualizarMercadoria:     function (id, d)            { return _PUT("/mercadorias/" + id, d, "atualizarMercadoria"); },
        excluirMercadoria:       function (id)               { return _DEL("/mercadorias/" + id, "excluirMercadoria"); },
        ajustarEstoque:          function (id, qtd, mot, tp) { return _POST("/mercadorias/" + id + "/estoque", { qtd: qtd, motivo: mot, tipo: tp }, "ajustarEstoque"); },
        listarMovimentosEstoque: function (mid, di, df)      { return _GET("/mercadorias/movimentos-estoque" + _qs({ mercadoriaId: mid, dataInicio: di, dataFim: df }), "listarMovimentosEstoque"); },
        listarTabelasPreco:      function ()                 { return _GET("/mercadorias/tabelas-preco", "listarTabelasPreco"); },
        salvarTabelaPreco:       function (d)                { return d.id ? _PUT("/mercadorias/tabelas-preco/" + d.id, d, "salvarTabelaPreco") : _POST("/mercadorias/tabelas-preco", d, "salvarTabelaPreco"); },
        excluirTabelaPreco:      function (id)               { return _DEL("/mercadorias/tabelas-preco/" + id, "excluirTabelaPreco"); },

        // Fornecedores
        listarFornecedores:   function (q, l, o)    { return _GET("/fornecedores"  + _qs({ q: q, limit: l, offset: o }), "listarFornecedores"); },
        obterFornecedor:      function (id)          { return _GET("/fornecedores/" + id, "obterFornecedor"); },
        criarFornecedor:      function (d)           { return _POST("/fornecedores", d, "criarFornecedor"); },
        atualizarFornecedor:  function (id, d)       { return _PUT("/fornecedores/" + id, d, "atualizarFornecedor"); },
        excluirFornecedor:    function (id)          { return _DEL("/fornecedores/" + id, "excluirFornecedor"); },

        // Formas de Pagamento
        listarFormasPagamento:   function ()       { return _GET("/formas-pagamento", "listarFormasPagamento"); },
        criarFormaPagamento:     function (d)      { return _POST("/formas-pagamento", d, "criarFormaPagamento"); },
        atualizarFormaPagamento: function (id, d)  { return _PUT("/formas-pagamento/" + id, d, "atualizarFormaPagamento"); },
        excluirFormaPagamento:   function (id)     { return _DEL("/formas-pagamento/" + id, "excluirFormaPagamento"); },

        // Entradas
        listarEntradas:     function (st, di, df, fid) { return _GET("/entradas"    + _qs({ status: st, dataInicio: di, dataFim: df, fornecedorId: fid }), "listarEntradas"); },
        obterEntrada:       function (id)              { return _GET("/entradas/" + id, "obterEntrada"); },
        criarEntrada:       function (d)               { return _POST("/entradas", d, "criarEntrada"); },
        confirmarEntrada:   function (id)              { return _PUT("/entradas/" + id + "/confirmar", null, "confirmarEntrada"); },
        cancelarEntrada:    function (id)              { return _PUT("/entradas/" + id + "/cancelar",  null, "cancelarEntrada"); },
        importarXmlEntrada: function (xmlBase64)       { return _POST("/entradas/importar-xml", { xml: xmlBase64 }, "importarXmlEntrada"); },

        // Fiscal
        listarDocumentosFiscais:   function (tp, st, di, df, q) { return _GET("/fiscal/notas"    + _qs({ tipo: tp, status: st, dataInicio: di, dataFim: df, q: q }), "listarDocumentosFiscais"); },
        obterDocumentoFiscal:      function (id)                 { return _GET("/fiscal/notas/"   + id, "obterDocumentoFiscal"); },
        emitirNfe:                 function (d)                  { return _POST("/fiscal/nfe/emitir", d, "emitirNfe"); },
        cancelarDocumentoFiscal:   function (chave, just)        { return _POST("/fiscal/notas/"  + chave + "/cancelar", { justificativa: just }, "cancelarDocumentoFiscal"); },
        inutilizarNfe:             function (se, ni, nf, just)   { return _POST("/fiscal/nfe/inutilizar", { serie: se, numeroInicio: ni, numeroFim: nf, justificativa: just }, "inutilizarNfe"); },
        obterXmlDocumentoFiscal:   function (chave)              { return _GET("/fiscal/notas/"   + chave + "/xml", "obterXmlDocumentoFiscal"); },
        reimprimirDocumentoFiscal: function (chave)              { return _GET("/fiscal/notas/"   + chave + "/pdf", "reimprimirDocumentoFiscal"); },
        registrarDevolucaoFiscal:  function (d)                  { return _POST("/fiscal/devolucao", d, "registrarDevolucaoFiscal"); },

        // Manifestação do Destinatário
        listarManifestacoes:       function (f)     { return _GET("/fiscal/manifestacao" + _qs({ q: f.q, status: f.status, dataInicio: f.dataInicio, dataFim: f.dataFim, limit: f.limit, offset: f.offset }), "listarManifestacoes"); },
        consultarDfeDestinatario:  function (p)     { return _POST("/fiscal/manifestacao/consultar-dfe", p, "consultarDfeDestinatario"); },
        manifestarDestinatario:    function (d)     { return _POST("/fiscal/manifestacao/manifestar", d, "manifestarDestinatario"); },
        baixarXmlMd:               function (chave) { return _GET("/fiscal/manifestacao/" + chave + "/xml", "baixarXmlMd"); },
        historicoMd:               function (chave) { return _GET("/fiscal/manifestacao/" + chave + "/historico", "historicoMd"); },

        // Financeiro
        resumoFinanceiro:        function (di, df)           { return _GET("/financeiro/resumo"        + _qs({ dataInicio: di, dataFim: df }), "resumoFinanceiro"); },
        listarMovimentosCaixa:   function (tp, di, df)       { return _GET("/financeiro/movimentos"    + _qs({ tipo: tp, dataInicio: di, dataFim: df }), "listarMovimentosCaixa"); },
        registrarMovimentoCaixa: function (d)                { return _POST("/financeiro/movimentos",   d, "registrarMovimentoCaixa"); },
        fluxoCaixa:              function (di, df)           { return _GET("/financeiro/fluxo-caixa"   + _qs({ dataInicio: di, dataFim: df }), "fluxoCaixa"); },
        listarContasPagar:       function (st, fid, di, df)  { return _GET("/financeiro/contas-pagar"  + _qs({ status: st, fornecedorId: fid, dataInicio: di, dataFim: df }), "listarContasPagar"); },
        criarContaPagar:         function (d)                { return _POST("/financeiro/contas-pagar",  d, "criarContaPagar"); },
        atualizarContaPagar:     function (id, d)            { return _PUT("/financeiro/contas-pagar/"  + id, d, "atualizarContaPagar"); },
        baixarContaPagar:        function (id, dp, vp)       { return _PUT("/financeiro/contas-pagar/"  + id + "/baixar", { dataPagamento: dp, valorPago: vp }, "baixarContaPagar"); },
        excluirContaPagar:       function (id)               { return _DEL("/financeiro/contas-pagar/"  + id, "excluirContaPagar"); },
        listarContasReceber:     function (st, cid, di, df)  { return _GET("/financeiro/contas-receber" + _qs({ status: st, clienteId: cid, dataInicio: di, dataFim: df }), "listarContasReceber"); },
        criarContaReceber:       function (d)                { return _POST("/financeiro/contas-receber", d, "criarContaReceber"); },
        baixarContaReceber:      function (id, db, vr)       { return _PUT("/financeiro/contas-receber/" + id + "/baixar", { dataBaixa: db, valorRecebido: vr }, "baixarContaReceber"); },
        excluirContaReceber:     function (id)               { return _DEL("/financeiro/contas-receber/" + id, "excluirContaReceber"); },

        // Boletos
        listarBoletos: function (st, cid, di, df) { return _GET("/boletos"   + _qs({ status: st, clienteId: cid, dataInicio: di, dataFim: df }), "listarBoletos"); },
        emitirBoleto:  function (d)               { return _POST("/boletos",  d, "emitirBoleto"); },

        // Dashboard
        resumoDashboard:  function ()           { return _GET("/dashboard/resumo", "resumoDashboard"); },
        vendasPorPeriodo: function (p, di, df)  { return _GET("/dashboard/vendas" + _qs({ periodo: p, dataInicio: di, dataFim: df }), "vendasPorPeriodo"); },

        // Relatórios
        relatorioVendas:              function (di, df, vl) { return _GET("/relatorios/vendas"                + _qs({ dataInicio: di, dataFim: df, vendedorLogin: vl }), "relatorioVendas"); },
        relatorioCancelamentos:       function (di, df)     { return _GET("/relatorios/cancelamentos"         + _qs({ dataInicio: di, dataFim: df }), "relatorioCancelamentos"); },
        relatorioEstoque:             function (abaixoMin)  { return _GET("/relatorios/estoque"               + _qs({ apenasAbaixoMinimo: abaixoMin }), "relatorioEstoque"); },
        relatorioFinanceiro:          function (di, df)     { return _GET("/relatorios/financeiro"            + _qs({ dataInicio: di, dataFim: df }), "relatorioFinanceiro"); },
        relatorioClientes:            function (di, df)     { return _GET("/relatorios/clientes"              + _qs({ dataInicio: di, dataFim: df }), "relatorioClientes"); },
        relatorioProdutosMaisVendidos: function (di, df, l) { return _GET("/relatorios/produtos-mais-vendidos" + _qs({ dataInicio: di, dataFim: df, limit: l }), "relatorioProdutosMaisVendidos"); },
        relatorioMargemLucro:         function (cat)        { return _GET("/relatorios/margem-lucro"          + _qs({ categoria: cat }), "relatorioMargemLucro"); },
        relatorioInventario:          function (cat)        { return _GET("/relatorios/inventario"            + _qs({ categoria: cat }), "relatorioInventario"); },
        relatorioCurvaAbc:            function (di, df)     { return _GET("/relatorios/curva-abc"             + _qs({ dataInicio: di, dataFim: df }), "relatorioCurvaAbc"); },
        relatorioComissao:            function (di, df)     { return _GET("/relatorios/comissao"              + _qs({ dataInicio: di, dataFim: df }), "relatorioComissao"); },
        relatorioFichaCadastral:      function (termo)       { return _GET("/relatorios/ficha-cadastral"       + _qs({ termo: termo }), "relatorioFichaCadastral"); },
        relatorioAlteracoesProdutos:  function (di, df)     { return _GET("/relatorios/alteracoes-produtos"   + _qs({ dataInicio: di, dataFim: df }), "relatorioAlteracoesProdutos"); },

        // Configurações
        obterConfiguracoes:       function ()        { return _GET("/configuracoes", "obterConfiguracoes"); },
        salvarConfiguracoes:      function (d)       { return _PUT("/configuracoes", d, "salvarConfiguracoes"); },
        uploadCertificadoDigital: function (b64, pw) { return _POST("/configuracoes/certificado", { arquivo: b64, senha: pw }, "uploadCertificadoDigital"); },

        // Empresa
        obterEmpresa:    function ()   { return _GET("/empresa", "obterEmpresa"); },
        atualizarEmpresa: function (d) { return _PUT("/empresa", d, "atualizarEmpresa"); },

        // Integrações
        listarIntegracoes: function ()          { return _GET("/integracoes", "listarIntegracoes"); },
        salvarIntegracao:  function (tipo, d)   { return _PUT("/integracoes/" + tipo, d, "salvarIntegracao"); },
        testarIntegracao:  function (tipo)      { return _POST("/integracoes/" + tipo + "/testar", null, "testarIntegracao"); },

        // Devoluções PDV
        listarDevolucoes:   function (vid, tp, di, df) { return _GET("/devolucoes" + _qs({ vendaId: vid, tipo: tp, dataInicio: di, dataFim: df }), "listarDevolucoes"); },
        registrarDevolucao: function (d)               { return _POST("/devolucoes", d, "registrarDevolucao"); },

        // Vales de Crédito
        listarValesCredito:  function (st)      { return _GET("/vales-credito"    + _qs({ status: st }), "listarValesCredito"); },
        obterValePorCodigo:  function (codigo)  { return _GET("/vales-credito/"   + codigo, "obterValePorCodigo"); },
        utilizarVale:        function (id, val) { return _PUT("/vales-credito/"   + id + "/utilizar", { valor: val }, "utilizarVale"); },

        // Planos
        listarPlanos:    function () { return _GET("/planos", "listarPlanos"); },
        obterPlanoAtivo: function () { return _GET("/planos/ativo", "obterPlanoAtivo"); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // FAÇADE PÚBLICA
    // ─────────────────────────────────────────────────────────────────────────
    var api = { _usarMock: true };

    Object.keys(_mock).forEach(function (nome) {
        api[nome] = function () {
            var impl = api._usarMock ? _mock : _real;
            if (typeof impl[nome] !== "function")
                throw new Error("ErpApi." + nome + " não tem implementação " + (api._usarMock ? "mock" : "real") + ".");
            return impl[nome].apply(null, arguments);
        };
    });

    return api;
})();
