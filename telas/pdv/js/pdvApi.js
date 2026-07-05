/**
 * pdvApi.js — Camada de integração API do PDV
 *
 * Cada operação tem duas implementações:
 *   _mock  → dados simulados, usada enquanto o back não está pronto
 *   _real  → requisições HTTP reais via SistemaCore.http
 *
 * Para ativar o back-end real: mude  PdvApi._usarMock = false
 * Depois apague o bloco _mock inteiro.
 *
 * URL base da API é configurada com:
 *   SistemaCore.configurarApi('https://api.suaempresa.com/api/v1')
 * URL do webservice fiscal em configuracoes.fiscalWebserviceUrl
 */
window.PdvApi = (function(){

    var MOCK_DELAY = 100; // ms — simula latência de rede no modo mock

    function _delay(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function _ok(dados){ return _delay(MOCK_DELAY).then(function(){ return dados; }); }
    function _err(msg){ return _delay(MOCK_DELAY).then(function(){ throw new Error(msg); }); }

    function _http(){
        if(!window.SistemaCore || !window.SistemaCore.http){
            throw new Error("SistemaCore não inicializado. Chame SistemaCore.configurarApi(url) antes.");
        }
        return window.SistemaCore.http;
    }

    function _qs(obj){
        if(!obj) return "";
        var p = new URLSearchParams(obj).toString();
        return p ? "?" + p : "";
    }

    function _normalizarRespostaApi(res){
        if(res && typeof res === "object" && Object.prototype.hasOwnProperty.call(res, "data")){
            return res.data;
        }
        return res;
    }

    /* ─────────────────────────────────────────────────────────────
       MOCK — dados simulados para desenvolvimento sem back-end
    ───────────────────────────────────────────────────────────── */
    var _mock = {

        // ── Caixa ─────────────────────────────────────────────
        abrirCaixa: function(dados){
            return _ok({
                sucesso: true,
                sessao: {
                    id: "ses_mock_" + Date.now(),
                    usuarioLogin: dados.usuarioLogin,
                    usuarioNome:  dados.usuarioNome,
                    abertoEm:     new Date().toISOString(),
                    fechadoEm:    null,
                    valorAbertura: dados.valorAbertura || 0,
                    status:       "aberto"
                }
            });
        },

        fecharCaixa: function(dados){
            return _ok({
                sucesso: true,
                fechamento: {
                    id:         "fec_mock_" + Date.now(),
                    sessaoId:   dados.sessaoId,
                    fechadoEm:  new Date().toISOString(),
                    totalVendas: dados.totalVendas || 0,
                    saldo:       dados.saldo || 0
                }
            });
        },

        obterSessaoAtual: function(usuarioLogin){
            var base   = obterBase();
            var sessao = base.sessoesCode.find(function(s){
                return s.status === "aberto" && s.usuarioLogin === usuarioLogin;
            }) || null;
            return _ok({ sessao: sessao });
        },

        listarFechamentos: function(filtros){
            var base = obterBase();
            var list = base.fechamentosCaixa || [];
            if(filtros && filtros.usuarioLogin){
                list = list.filter(function(f){ return f.operadorLogin === filtros.usuarioLogin; });
            }
            if(filtros && filtros.dataInicio){
                list = list.filter(function(f){ return f.data >= filtros.dataInicio; });
            }
            if(filtros && filtros.dataFim){
                list = list.filter(function(f){ return f.data <= filtros.dataFim; });
            }
            return _ok({ data: list, total: list.length });
        },

        // ── Vendas ────────────────────────────────────────────
        registrarVenda: function(venda){
            return _ok({ sucesso: true, venda: Object.assign({ sincronizado: false }, venda) });
        },

        listarVendas: function(filtros){
            var base   = obterBase();
            var vendas = base.vendas || [];
            if(filtros && filtros.sessaoId){
                vendas = vendas.filter(function(v){ return v.sessaoId === filtros.sessaoId; });
            }
            if(filtros && filtros.dataInicio){
                vendas = vendas.filter(function(v){ return v.data >= filtros.dataInicio; });
            }
            if(filtros && filtros.usuarioLogin){
                vendas = vendas.filter(function(v){ return v.usuarioLogin === filtros.usuarioLogin; });
            }
            return _ok({ data: vendas, total: vendas.length });
        },

        obterVenda: function(vendaId){
            var base  = obterBase();
            var venda = (base.vendas || []).find(function(v){ return v.id === vendaId; }) || null;
            if(!venda) return _err("Venda não encontrada.");
            return _ok({ data: venda });
        },

        cancelarVenda: function(vendaId, motivo){
            return _ok({
                sucesso: true,
                vendaId:     vendaId,
                motivo:      motivo || "",
                canceladoEm: new Date().toISOString()
            });
        },

        reimprimirVenda: function(vendaId){
            var base  = obterBase();
            var venda = (base.vendas || []).find(function(v){ return v.id === vendaId; });
            if(!venda) return _err("Venda não encontrada.");
            return _ok({ data: venda });
        },

        // ── Movimentos de Caixa ───────────────────────────────
        registrarMovimento: function(movimento){
            return _ok({ sucesso: true, movimento: Object.assign({ sincronizado: false }, movimento) });
        },

        listarMovimentos: function(filtros){
            var base   = obterBase();
            var movimentos = base.movimentosCaixa || [];
            if(filtros && filtros.sessaoId){
                movimentos = movimentos.filter(function(m){ return m.sessaoId === filtros.sessaoId; });
            }
            return _ok({ data: movimentos, total: movimentos.length });
        },

        // ── NFC-e ─────────────────────────────────────────────
        emitirNfce: function(payload){
            var numero = (payload.nfce && payload.nfce.numero) || 1;
            var cnpj   = ((payload.emitente && payload.emitente.cnpj) || "").replace(/\D/g, "");
            var chave  = (cnpj + "000000000000000" + numero).substring(0, 44);
            return _ok({
                sucesso:     true,
                status:      "autorizada",
                chaveAcesso: chave,
                protocolo:   "141" + Date.now(),
                qrCode:      "https://nfce.sefaz.mock/qr?chave=" + chave + "&tpAmb=2",
                xml:         "<nfeProc versao=\"4.00\"><NFe/><protNFe/></nfeProc>"
            });
        },

        emitirNfce_contingencia: function(payload){
            var numero = (payload.nfce && payload.nfce.numero) || 1;
            var chave  = ("00000000000000" + numero).slice(-44);
            return _ok({
                sucesso:          true,
                status:           "contingencia",
                chaveAcesso:      chave,
                protocolo:        "",
                qrCode:           "https://nfce.sefaz.mock/qr?chave=" + chave + "&tpAmb=2",
                xml:              "<nfeProc versao=\"4.00\" contingencia=\"true\" />"
            });
        },

        cancelarNfce: function(chaveAcesso, motivo){
            return _ok({
                sucesso:     true,
                chaveAcesso: chaveAcesso,
                motivo:      motivo,
                protocolo:   "151" + Date.now(),
                canceladoEm: new Date().toISOString()
            });
        },

        reimprimirNfce: function(chaveAcesso){
            return _ok({
                sucesso:     true,
                chaveAcesso: chaveAcesso,
                xml:         "<nfeProc versao=\"4.00\" mock=\"true\" />"
            });
        },

        // ── Clientes ──────────────────────────────────────────
        listarClientes: function(filtros){
            var base     = obterBase();
            var clientes = base.clientes || [];
            if(filtros && filtros.q){
                var q = filtros.q.toLowerCase();
                clientes = clientes.filter(function(c){
                    return (c.nome || "").toLowerCase().includes(q)
                        || (c.cpf  || "").includes(q)
                        || (c.cnpj || "").includes(q)
                        || (c.cartao || "").includes(q);
                });
            }
            return _ok({ data: clientes, total: clientes.length });
        },

        obterCliente: function(clienteId){
            var base     = obterBase();
            var cliente  = (base.clientes || []).find(function(c){ return c.id === clienteId; });
            if(!cliente) return _err("Cliente não encontrado.");
            return _ok({ data: cliente });
        },

        criarCliente: function(dados){
            return _ok({
                sucesso:  true,
                cliente:  Object.assign({ id: "cli_mock_" + Date.now(), criadoEm: new Date().toISOString() }, dados)
            });
        },

        // ── Mercadorias ───────────────────────────────────────
        listarMercadorias: function(filtros){
            var base        = obterBase();
            var mercadorias = base.mercadorias || [];
            if(filtros && filtros.q){
                var q = filtros.q.toLowerCase();
                mercadorias = mercadorias.filter(function(m){
                    return (m.descricao || "").toLowerCase().includes(q)
                        || (m.codigo    || "").toLowerCase() === q
                        || (m.ean       || "") === q
                        || (m.referencia|| "").toLowerCase() === q;
                });
            }
            if(filtros && filtros.ativo !== undefined){
                mercadorias = mercadorias.filter(function(m){ return m.ativo !== false; });
            }
            return _ok({ data: mercadorias, total: mercadorias.length });
        },

        obterMercadoria: function(id){
            var base = obterBase();
            var prod = (base.mercadorias || []).find(function(m){ return m.id === id || m.codigo === id || m.ean === id; });
            if(!prod) return _err("Produto não encontrado.");
            return _ok({ data: prod });
        },

        // ── Configurações ─────────────────────────────────────
        obterConfiguracoes: function(){
            var cfg = window.ConfiguracoesSistema ? window.ConfiguracoesSistema.obter() : {};
            return _ok({ data: cfg });
        },

        salvarConfiguracoes: function(dados){
            if(window.ConfiguracoesSistema) window.ConfiguracoesSistema.salvar(dados);
            return _ok({ sucesso: true });
        },

        // ── Entregas ──────────────────────────────────────────
        listarEntregas: function(filtros){
            var base     = obterBase();
            var entregas = base.entregas || [];
            if(filtros && filtros.status){
                entregas = entregas.filter(function(e){ return e.status === filtros.status; });
            }
            return _ok({ data: entregas, total: entregas.length });
        },

        atualizarEntrega: function(entregaId, dados){
            return _ok({ sucesso: true, entregaId: entregaId, dados: dados, atualizadoEm: new Date().toISOString() });
        }
    };

    /* ─────────────────────────────────────────────────────────────
       API REAL — substitui _mock quando back-end estiver disponível
    ───────────────────────────────────────────────────────────── */
    var _real = {

        // ── Caixa ─────────────────────────────────────────────
        abrirCaixa:         function(d){ return _http().post("/pdv/caixa/abrir", d); },
        fecharCaixa:        function(d){ return _http().post("/pdv/caixa/fechar", d); },
        obterSessaoAtual:   function(u){ return _http().get("/pdv/caixa/sessao-atual" + _qs({ usuarioLogin: u })); },
        listarFechamentos:  function(f){ return _http().get("/pdv/caixa/fechamentos" + _qs(f)); },

        // ── Vendas ────────────────────────────────────────────
        registrarVenda:     function(d){ return _http().post("/pdv/vendas", d); },
        listarVendas:       function(f){ return _http().get("/pdv/vendas" + _qs(f)); },
        obterVenda:         function(id){ return _http().get("/pdv/vendas/" + id); },
        cancelarVenda:      function(id, motivo){ return _http().post("/pdv/vendas/" + id + "/cancelar", { motivo: motivo }); },
        reimprimirVenda:    function(id){ return _http().get("/pdv/vendas/" + id + "/reimprimir"); },

        // ── Movimentos de Caixa ───────────────────────────────
        registrarMovimento: function(d){ return _http().post("/pdv/movimentos", d); },
        listarMovimentos:   function(f){ return _http().get("/pdv/movimentos" + _qs(f)); },

        // ── NFC-e ─────────────────────────────────────────────
        emitirNfce:              function(d){ return _http().post("/pdv/nfce/emitir", d); },
        emitirNfce_contingencia: function(d){ return _http().post("/pdv/nfce/emitir/contingencia", d); },
        cancelarNfce:            function(chave, motivo){ return _http().post("/pdv/nfce/" + chave + "/cancelar", { motivo: motivo }); },
        reimprimirNfce:          function(chave){ return _http().get("/pdv/nfce/" + chave + "/xml"); },

        // ── Clientes ──────────────────────────────────────────
        listarClientes:     function(f){ return _http().get("/clientes" + _qs(f)); },
        obterCliente:       function(id){ return _http().get("/clientes/" + id); },
        criarCliente:       function(d){ return _http().post("/clientes", d); },

        // ── Mercadorias ───────────────────────────────────────
        listarMercadorias:  function(f){ return _http().get("/mercadorias" + _qs(f)); },
        obterMercadoria:    function(id){ return _http().get("/mercadorias/" + id); },

        // ── Configurações ─────────────────────────────────────
        obterConfiguracoes:  function(){  return _http().get("/configuracoes"); },
        salvarConfiguracoes: function(d){ return _http().put("/configuracoes", d); },

        // ── Entregas ──────────────────────────────────────────
        listarEntregas:     function(f){ return _http().get("/entregas" + _qs(f)); },
        atualizarEntrega:   function(id, d){ return _http().patch("/entregas/" + id, d); }
    };

    /* ─────────────────────────────────────────────────────────────
       API PÚBLICA
       Para trocar para real: PdvApi._usarMock = false
    ───────────────────────────────────────────────────────────── */
    function _use(fn, args){
        var impl = PdvApi._usarMock ? _mock : _real;
        return Promise.resolve(impl[fn].apply(impl, args)).then(_normalizarRespostaApi);
    }

    var PdvApi = {
        _usarMock: true, // ← mude para false quando o back-end estiver pronto

        // Caixa
        abrirCaixa:              function(d){ return _use("abrirCaixa", [d]); },
        fecharCaixa:             function(d){ return _use("fecharCaixa", [d]); },
        obterSessaoAtual:        function(u){ return _use("obterSessaoAtual", [u]); },
        listarFechamentos:       function(f){ return _use("listarFechamentos", [f]); },

        // Vendas
        registrarVenda:          function(d){ return _use("registrarVenda", [d]); },
        listarVendas:            function(f){ return _use("listarVendas", [f]); },
        obterVenda:              function(id){ return _use("obterVenda", [id]); },
        cancelarVenda:           function(id, m){ return _use("cancelarVenda", [id, m]); },
        reimprimirVenda:         function(id){ return _use("reimprimirVenda", [id]); },

        // Movimentos
        registrarMovimento:      function(d){ return _use("registrarMovimento", [d]); },
        listarMovimentos:        function(f){ return _use("listarMovimentos", [f]); },

        // NFC-e
        emitirNfce:              function(d){ return _use("emitirNfce", [d]); },
        emitirNfce_contingencia: function(d){ return _use("emitirNfce_contingencia", [d]); },
        cancelarNfce:            function(chave, m){ return _use("cancelarNfce", [chave, m]); },
        reimprimirNfce:          function(chave){ return _use("reimprimirNfce", [chave]); },

        // Clientes
        listarClientes:          function(f){ return _use("listarClientes", [f]); },
        obterCliente:            function(id){ return _use("obterCliente", [id]); },
        criarCliente:            function(d){ return _use("criarCliente", [d]); },

        // Mercadorias
        listarMercadorias:       function(f){ return _use("listarMercadorias", [f]); },
        obterMercadoria:         function(id){ return _use("obterMercadoria", [id]); },

        // Configurações
        obterConfiguracoes:      function(){ return _use("obterConfiguracoes", []); },
        salvarConfiguracoes:     function(d){ return _use("salvarConfiguracoes", [d]); },

        // Entregas
        listarEntregas:          function(f){ return _use("listarEntregas", [f]); },
        atualizarEntrega:        function(id, d){ return _use("atualizarEntrega", [id, d]); }
    };

    return PdvApi;
})();
