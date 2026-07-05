(function(){
    // ── Constantes ────────────────────────────────────────────────────────
    var STATUS = {
        EM_DIGITACAO:        { label:"Em digitação",        cls:"digitacao" },
        ORCAMENTO:            { label:"Orçamento",           cls:"orcamento" },
        RESERVADO:            { label:"Reservado",           cls:"reservado" },
        SEPARACAO:            { label:"Separação",           cls:"separacao" },
        PRONTO_RETIRADA:      { label:"Pronto p/ retirada",  cls:"pronto" },
        AGUARDANDO_PAGAMENTO: { label:"Aguard. pagamento",   cls:"aguardando" },
        IMPORTADO_PDV:        { label:"Importado no PDV",    cls:"importado" },
        FINALIZADO:           { label:"Finalizado",          cls:"finalizado" },
        CANCELADO:            { label:"Cancelado",           cls:"cancelado" }
    };
    var ORDEM_STATUS_FLUXO = ["EM_DIGITACAO","ORCAMENTO","RESERVADO","SEPARACAO","PRONTO_RETIRADA","AGUARDANDO_PAGAMENTO","IMPORTADO_PDV","FINALIZADO"];
    var STATUS_BLOQUEADOS = ["FINALIZADO","IMPORTADO_PDV","CANCELADO"]; // pedido já resolvido no caixa/cancelado: some da lista padrão e trava edição

    // ── Estado ────────────────────────────────────────────────────────────
    var filtroStatus  = "ATIVOS";
    var filtroPeriodo = "mes";
    var filtroDataIni = "";
    var filtroDataFim = "";
    var listaAtual    = [];
    var paginaAtual   = 1;
    var TAMANHO_PAGINA = 60;

    var pedidoEmEdicao   = null; // objeto em edição no drawer (pode ser novo, ainda sem id)

    // ── Init ──────────────────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", function(){
        removerMenuSuperiorSistema();

        if(!moduloHabilitado()){
            exibirModuloDesativado();
            return;
        }
        inicializarFiltroPeriodo();
        conectarFiltros();
        conectarBotoesTopo();
        conectarDrawer();
        carregarPedidos();
    });

    // ── Tela isolada (sem o menu superior do ERP), igual ao Caixa PDV ──────
    function removerMenuSuperiorSistema(){
        document.querySelector(".menu-superior-sistema")?.remove();
        document.getElementById("menu-overlay-sistema")?.remove();
        document.body.classList.remove("menu-superior-ativo");
    }

    function usuarioAtualComoVendedor(){
        var usuario = window.AuthSistema?.usuarioAtual?.() || {};
        return { login: usuario.login || "", nome: usuario.nome || usuario.login || "Vendedor" };
    }

    function moduloHabilitado(){
        var cfg = window.ConfiguracoesSistema?.obter?.() || {};
        return cfg.pedidosVendaHabilitado !== false;
    }

    function exibirModuloDesativado(){
        var main = document.querySelector("main.container");
        if(main){
            main.innerHTML =
                '<div class="modulo-desativado">' +
                    '<i class="fa-solid fa-toggle-off"></i>' +
                    '<h2>Módulo desativado</h2>' +
                    '<p>O módulo Pedidos de Venda não está habilitado para esta empresa.</p>' +
                    '<button type="button" class="btn-primario">Contratar módulo</button>' +
                '</div>';
        }
    }

    function configuracoesModulo(){
        var cfg = window.ConfiguracoesSistema?.obter?.() || {};
        return {
            validadeDias: Number(cfg.pedidosVendaValidadeOrcamentoDias || 7),
            reservaModo: cfg.pedidosVendaReservaEstoqueModo || "nao_reserva",
            impressaoAutomatica: cfg.pedidosVendaImpressaoAutomatica === true,
            prefixo: cfg.pedidosVendaPrefixo || "PED",
            permitirEditarAposCaixa: cfg.pedidosVendaPermitirEditarAposCaixa === true,
            permitirCancelarImportado: cfg.pedidosVendaPermitirCancelarImportado === true
        };
    }

    // ── Filtros de período ───────────────────────────────────────────────
    function inicializarFiltroPeriodo(){
        var hoje = new Date().toISOString().slice(0,10);
        document.getElementById("filtroPersonalizadoIni").value = hoje;
        document.getElementById("filtroPersonalizadoFim").value = hoje;
    }

    function conectarFiltros(){
        var debounce;
        document.getElementById("buscaPedidos").addEventListener("input", function(){
            clearTimeout(debounce);
            debounce = setTimeout(function(){ paginaAtual = 1; carregarPedidos(); }, 260);
        });
        document.getElementById("filtroStatusPedido").addEventListener("change", function(){
            filtroStatus = this.value;
            paginaAtual = 1;
            carregarPedidos();
        });
        document.querySelectorAll(".pv-periodo-btn").forEach(function(btn){
            btn.addEventListener("click", function(){
                document.querySelectorAll(".pv-periodo-btn").forEach(function(b){ b.classList.remove("ativo"); });
                btn.classList.add("ativo");
                filtroPeriodo = btn.dataset.periodo;
                document.getElementById("filtroPersonalizadoWrap").hidden = filtroPeriodo !== "personalizado";
                paginaAtual = 1;
                carregarPedidos();
            });
        });
        document.getElementById("filtroPersonalizadoIni").addEventListener("change", function(){ paginaAtual = 1; carregarPedidos(); });
        document.getElementById("filtroPersonalizadoFim").addEventListener("change", function(){ paginaAtual = 1; carregarPedidos(); });
        document.getElementById("btnLimparFiltrosPedidos").addEventListener("click", function(){
            document.getElementById("buscaPedidos").value = "";
            document.getElementById("filtroStatusPedido").value = "ATIVOS";
            filtroStatus = "ATIVOS";
            document.querySelectorAll(".pv-periodo-btn").forEach(function(b){ b.classList.toggle("ativo", b.dataset.periodo === "mes"); });
            filtroPeriodo = "mes";
            document.getElementById("filtroPersonalizadoWrap").hidden = true;
            paginaAtual = 1;
            carregarPedidos();
        });
        document.getElementById("btnCarregarMaisPedidos")?.addEventListener("click", function(){
            paginaAtual++;
            renderizarListagem(listaAtual);
        });
    }

    function conectarBotoesTopo(){
        document.getElementById("btnNovoPedidoVenda").addEventListener("click", function(){ abrirPedido(null); });
    }

    function limitesPeriodo(){
        var hoje = new Date();
        var iniStr, fimStr;
        if(filtroPeriodo === "hoje"){
            iniStr = fimStr = hoje.toISOString().slice(0,10);
        }else if(filtroPeriodo === "semana"){
            var d = new Date(hoje);
            var diaSemana = d.getDay() === 0 ? 7 : d.getDay();
            d.setDate(d.getDate() - (diaSemana - 1));
            iniStr = d.toISOString().slice(0,10);
            fimStr = hoje.toISOString().slice(0,10);
        }else if(filtroPeriodo === "mes"){
            iniStr = hoje.toISOString().slice(0,8) + "01";
            fimStr = hoje.toISOString().slice(0,10);
        }else if(filtroPeriodo === "personalizado"){
            iniStr = document.getElementById("filtroPersonalizadoIni").value || "";
            fimStr = document.getElementById("filtroPersonalizadoFim").value || "";
        }else{
            iniStr = ""; fimStr = "";
        }
        return { ini: iniStr, fim: fimStr };
    }

    // ── Carregar / renderizar listagem ───────────────────────────────────
    function carregarPedidos(){
        var base = obterBase();
        var todos = base.pedidosVenda || [];
        var busca = normalizar(document.getElementById("buscaPedidos").value || "");
        var periodo = limitesPeriodo();

        var filtrados = todos.filter(function(p){
            if(filtroStatus === "ATIVOS"){
                if(STATUS_BLOQUEADOS.includes(p.status)) return false;
            }else if(filtroStatus === "EM_ABERTO"){
                if(p.status !== "EM_DIGITACAO") return false;
            }else if(filtroStatus){
                if(p.status !== filtroStatus) return false;
            }
            if(periodo.ini || periodo.fim){
                var d = (p.data || "").slice(0,10);
                if(periodo.ini && d < periodo.ini) return false;
                if(periodo.fim && d > periodo.fim) return false;
            }
            if(busca){
                var hay = normalizar([p.codigo, p.numero, p.cliente?.nome, p.cliente?.cpf, p.cliente?.telefone, p.vendedor?.nome].join(" "));
                if(!hay.includes(busca)) return false;
            }
            return true;
        });

        filtrados.sort(function(a,b){ return (b.data||"").localeCompare(a.data||""); });

        listaAtual = filtrados;
        renderizarDashboard(todos);
        renderizarListagem(filtrados);
    }

    function renderizarDashboard(todos){
        var hoje = new Date().toISOString().slice(0,10);
        var emAberto = 0, aguardandoPagamento = 0, finalizadosHoje = 0, valorEmAberto = 0;
        var somaTicket = 0, qtdTicket = 0, somaTempo = 0, qtdTempo = 0;

        todos.forEach(function(p){
            var valor = numero(p.resumo?.valorFinal);
            if(p.status === "EM_DIGITACAO") emAberto++;
            if(p.status === "AGUARDANDO_PAGAMENTO") aguardandoPagamento++;
            if(p.status === "FINALIZADO" && (p.atualizadoEm||"").slice(0,10) === hoje) finalizadosHoje++;
            if(!STATUS_BLOQUEADOS.includes(p.status)) valorEmAberto += valor;
            if(p.status !== "CANCELADO" && valor > 0){ somaTicket += valor; qtdTicket++; }
            if(p.status === "FINALIZADO" && p.criadoEm && p.atualizadoEm){
                var minutos = (new Date(p.atualizadoEm) - new Date(p.criadoEm)) / 60000;
                if(minutos >= 0){ somaTempo += minutos; qtdTempo++; }
            }
        });

        definirTexto("pvEmAberto", emAberto);
        definirTexto("pvAguardandoPagamento", aguardandoPagamento);
        definirTexto("pvFinalizadosHoje", finalizadosHoje);
        definirTexto("pvValorEmAberto", formatarMoedaRS(valorEmAberto));
        definirTexto("pvTicketMedio", formatarMoedaRS(qtdTicket ? somaTicket / qtdTicket : 0));
        definirTexto("pvTempoMedio", formatarMinutos(qtdTempo ? somaTempo / qtdTempo : 0));
    }

    function formatarMinutos(min){
        if(!min) return "—";
        var h = Math.floor(min / 60);
        var m = Math.round(min % 60);
        return h > 0 ? (h + "h " + m + "min") : (m + " min");
    }

    function renderizarListagem(lista){
        var tbody = document.getElementById("listaPedidosVenda");
        var fatia = lista.slice(0, paginaAtual * TAMANHO_PAGINA);

        if(!lista.length){
            tbody.innerHTML = '<tr><td colspan="12" class="vazio">Nenhum pedido encontrado.</td></tr>';
        }else{
            tbody.innerHTML = fatia.map(function(p){
                return '<tr>' +
                    '<td><strong>' + escapar(p.codigo || "—") + '</strong></td>' +
                    '<td>' + escapar(p.cliente?.nome || "Consumidor") + '</td>' +
                    '<td>' + escapar(p.cliente?.telefone || "—") + '</td>' +
                    '<td>' + escapar(p.vendedor?.nome || "—") + '</td>' +
                    '<td class="td-num">' + (p.resumo?.qtdItens || 0) + '</td>' +
                    '<td><strong>' + formatarMoedaRS(p.resumo?.valorFinal || 0) + '</strong></td>' +
                    '<td>' + fmtData(p.data) + '</td>' +
                    '<td>' + fmtHora(p.data) + '</td>' +
                    '<td>' + badgeStatusPedido(p.status) + '</td>' +
                    '<td>' + (p.vendaId ? '<span class="pv-origem pv-origem-pdv">PDV</span>' : '<span class="pv-origem pv-origem-pedido">Pedido</span>') + '</td>' +
                    '<td>' + fmtDataHora(p.atualizadoEm) + '</td>' +
                    '<td class="col-acoes-pv">' + botoesLinhaPedido(p) + '</td>' +
                '</tr>';
            }).join("");
        }

        definirTexto("infoResultadosPedidos", lista.length + " pedido(s)");
        var btnMais = document.getElementById("btnCarregarMaisPedidos");
        if(btnMais) btnMais.hidden = fatia.length >= lista.length;
    }

    function badgeStatusPedido(status){
        var s = STATUS[status] || STATUS.EM_DIGITACAO;
        return '<span class="pv-badge pv-badge-' + s.cls + '">' + escapar(s.label) + '</span>';
    }

    function botoesLinhaPedido(p){
        var btns = '<button type="button" class="pv-btn-acao" title="Visualizar" onclick="abrirPedido(\'' + escapar(p.id) + '\')"><i class="fa-solid fa-eye"></i></button>';
        if(!STATUS_BLOQUEADOS.includes(p.status)){
            btns += '<button type="button" class="pv-btn-acao" title="Editar" onclick="abrirPedido(\'' + escapar(p.id) + '\')"><i class="fa-solid fa-pen"></i></button>';
        }
        btns += '<button type="button" class="pv-btn-acao" title="Duplicar" onclick="duplicarPedido(\'' + escapar(p.id) + '\')"><i class="fa-solid fa-copy"></i></button>';
        btns += '<button type="button" class="pv-btn-acao" title="Imprimir" onclick="imprimirPedido(\'' + escapar(p.id) + '\')"><i class="fa-solid fa-print"></i></button>';
        if(p.cliente?.telefone){
            btns += '<a class="pv-btn-acao" title="WhatsApp" target="_blank" rel="noopener" href="' + linkWhatsappPedido(p) + '"><i class="fa-brands fa-whatsapp"></i></a>';
        }
        if(p.status !== "CANCELADO" && (p.status !== "FINALIZADO" && p.status !== "IMPORTADO_PDV" || configuracoesModulo().permitirCancelarImportado)){
            btns += '<button type="button" class="pv-btn-acao pv-btn-perigo" title="Cancelar" onclick="cancelarPedido(\'' + escapar(p.id) + '\')"><i class="fa-solid fa-ban"></i></button>';
        }
        btns += '<button type="button" class="pv-btn-acao pv-btn-perigo" title="Excluir" onclick="excluirPedido(\'' + escapar(p.id) + '\')"><i class="fa-solid fa-trash"></i></button>';
        return '<div class="pv-acoes-linha">' + btns + '</div>';
    }

    // ── Numeração sequencial ─────────────────────────────────────────────
    function obterProximoNumeroPedido(){
        var cfg = window.ConfiguracoesSistema.obter();
        var numeroAtual = Number(cfg.pedidosVendaProximoNumero || 1);
        window.ConfiguracoesSistema.salvar({ pedidosVendaProximoNumero: numeroAtual + 1 });
        var prefixo = cfg.pedidosVendaPrefixo || "PED";
        return { numero: numeroAtual, codigo: prefixo + "-" + String(numeroAtual).padStart(6, "0") };
    }

    // ── Estoque / reserva ─────────────────────────────────────────────────
    function estoqueDisponivel(produto){
        return numero(produto.estoque) - numero(produto.estoqueReservado || 0);
    }

    function reservarEstoquePedido(pedido, base){
        if(pedido.reservaEstoque?.ativa) return;
        var itensReservados = [];
        pedido.itens.forEach(function(item){
            var idx = base.mercadorias.findIndex(function(m){ return m.id === item.produtoId; });
            if(idx >= 0){
                base.mercadorias[idx].estoqueReservado = numero(base.mercadorias[idx].estoqueReservado) + numero(item.quantidade);
                itensReservados.push({ produtoId: item.produtoId, quantidade: numero(item.quantidade) });
                item.estoqueReservado = true;
            }
        });
        pedido.reservaEstoque = { modo: pedido.reservaEstoque?.modo || configuracoesModulo().reservaModo, ativa: true, itens: itensReservados };
    }

    function liberarReservaEstoquePedido(pedido, base){
        if(!pedido.reservaEstoque?.ativa) return;
        (pedido.reservaEstoque.itens || []).forEach(function(ri){
            var idx = base.mercadorias.findIndex(function(m){ return m.id === ri.produtoId; });
            if(idx >= 0){
                base.mercadorias[idx].estoqueReservado = Math.max(0, numero(base.mercadorias[idx].estoqueReservado) - numero(ri.quantidade));
            }
        });
        pedido.reservaEstoque.ativa = false;
        pedido.itens.forEach(function(item){ item.estoqueReservado = false; });
    }

    // ── Histórico ─────────────────────────────────────────────────────────
    function registrarHistoricoPedido(pedido, alteracao, valorAnterior, valorNovo){
        var usuario = window.AuthSistema?.usuarioAtual?.() || {};
        pedido.historico = pedido.historico || [];
        pedido.historico.unshift({
            data: new Date().toISOString(),
            usuarioLogin: usuario.login || "",
            usuarioNome: usuario.nome || usuario.login || "Sistema",
            dispositivo: navigator.userAgent || "",
            alteracao: alteracao,
            valorAnterior: valorAnterior ?? null,
            valorNovo: valorNovo ?? null
        });
    }

    // ── Criar / abrir pedido ─────────────────────────────────────────────
    function criarPedidoVazio(){
        var base = obterBase();
        var empresa = base.empresa || {};
        var cfg = configuracoesModulo();
        var agora = new Date().toISOString();
        return {
            id: null,
            numero: null,
            codigo: null,
            data: agora,
            atualizadoEm: agora,
            status: "EM_DIGITACAO",
            validadeOrcamento: null,
            vendedor: usuarioAtualComoVendedor(),
            empresa: { nome: empresa.nomeFantasia || empresa.razaoSocial || "Coneccta" },
            cliente: null,
            itens: [],
            resumo: { qtdItens:0, subtotal:0, desconto:0, acrescimos:0, frete:0, valorFinal:0, margemEstimada:0, lucroEstimado:0, pesoTotal:0 },
            reservaEstoque: { modo: cfg.reservaModo, ativa:false, itens:[] },
            observacoes: "",
            vendaId: null,
            chaveNfce: null,
            numeroCaixa: null,
            operador: null,
            qrCodeTexto: null,
            historico: [],
            criadoEm: agora
        };
    }

    window.abrirPedido = function(id){
        if(!id){
            pedidoEmEdicao = criarPedidoVazio();
        }else{
            var base = obterBase();
            var original = (base.pedidosVenda || []).find(function(p){ return p.id === id; });
            if(!original){ notificar("Pedido não encontrado.", "erro"); return; }
            pedidoEmEdicao = JSON.parse(JSON.stringify(original));
        }
        renderizarTelaPedido();
        abrirDrawer();
    };

    window.duplicarPedido = function(id){
        var base = obterBase();
        var original = (base.pedidosVenda || []).find(function(p){ return p.id === id; });
        if(!original) return;

        var clone = JSON.parse(JSON.stringify(original));
        clone.vendedor = usuarioAtualComoVendedor();
        var agora = new Date().toISOString();
        var numeracao = obterProximoNumeroPedido();

        clone.id = gerarId("ped");
        clone.numero = numeracao.numero;
        clone.codigo = numeracao.codigo;
        clone.qrCodeTexto = numeracao.codigo;
        clone.data = agora;
        clone.atualizadoEm = agora;
        clone.criadoEm = agora;
        clone.status = "EM_DIGITACAO";
        clone.validadeOrcamento = null;
        clone.vendaId = null;
        clone.chaveNfce = null;
        clone.numeroCaixa = null;
        clone.operador = null;
        clone.reservaEstoque = { modo: configuracoesModulo().reservaModo, ativa:false, itens:[] };
        clone.itens.forEach(function(item){ item.estoqueReservado = false; });
        clone.historico = [];
        registrarHistoricoPedido(clone, "Pedido duplicado do " + (original.codigo || original.id), null, null);

        base = obterBase();
        base.pedidosVenda.push(clone);
        salvarBase(base);
        notificar("Pedido duplicado: " + clone.codigo, "sucesso");
        carregarPedidos();
        window.abrirPedido(clone.id);
    };

    window.excluirPedido = function(id){
        var base = obterBase();
        var pedido = (base.pedidosVenda || []).find(function(p){ return p.id === id; });
        if(!pedido) return;

        var cfg = configuracoesModulo();
        var bloqueado = ["IMPORTADO_PDV","FINALIZADO"].includes(pedido.status) && !cfg.permitirCancelarImportado;
        if(bloqueado){
            notificar("Este pedido já foi importado/finalizado. Habilite a permissão em Configurações para excluir.", "erro");
            return;
        }
        if(!window.AuthSistema?.usuarioTemPermissao?.("movimento")){
            notificar("Seu usuário não tem permissão para excluir pedidos.", "erro");
            return;
        }
        if(!confirm("Excluir o pedido " + (pedido.codigo || pedido.id) + "? Esta ação não pode ser desfeita.")) return;

        liberarReservaEstoquePedido(pedido, base);
        base.pedidosVenda = base.pedidosVenda.filter(function(p){ return p.id !== id; });
        salvarBase(base);
        notificar("Pedido excluído.", "sucesso");
        carregarPedidos();
    };

    window.cancelarPedido = function(id){
        var base = obterBase();
        var idx = (base.pedidosVenda || []).findIndex(function(p){ return p.id === id; });
        if(idx < 0) return;
        var pedido = base.pedidosVenda[idx];

        if(["FINALIZADO","IMPORTADO_PDV"].includes(pedido.status) && !configuracoesModulo().permitirCancelarImportado){
            notificar("Este pedido já foi resolvido no Caixa PDV. Habilite a permissão em Configurações para cancelar.", "erro");
            return;
        }

        var motivo = prompt("Motivo do cancelamento (opcional):", "") || "";
        var statusAnterior = pedido.status;
        liberarReservaEstoquePedido(pedido, base);
        pedido.status = "CANCELADO";
        pedido.atualizadoEm = new Date().toISOString();
        registrarHistoricoPedido(pedido, "Pedido cancelado" + (motivo ? (": " + motivo) : ""), statusAnterior, "CANCELADO");
        salvarBase(base);
        notificar("Pedido cancelado.", "sucesso");
        carregarPedidos();
        if(pedidoEmEdicao && pedidoEmEdicao.id === id) fecharDrawer();
    };

    window.mudarStatusPedidoAtual = function(novoStatus){
        if(!pedidoEmEdicao) return;
        var statusAnterior = pedidoEmEdicao.status;
        pedidoEmEdicao.status = novoStatus;
        registrarHistoricoPedido(pedidoEmEdicao, "Status alterado", statusAnterior, novoStatus);
        salvarPedidoAtual({});
    };

    // ── Salvar pedido ─────────────────────────────────────────────────────
    function salvarPedido(opts){
        opts = opts || {};
        if(!pedidoEmEdicao) return;

        if(!pedidoEmEdicao.vendedor || !pedidoEmEdicao.vendedor.login){
            pedidoEmEdicao.vendedor = usuarioAtualComoVendedor();
        }
        if(!pedidoEmEdicao.vendedor.login){
            notificar("Todo pedido precisa de um vendedor identificado.", "erro");
            return;
        }

        recalcularResumoPedido();

        var base = obterBase();
        var cfg = configuracoesModulo();
        var novo = !pedidoEmEdicao.id;

        if(novo){
            pedidoEmEdicao.id = gerarId("ped");
            var numeracao = obterProximoNumeroPedido();
            pedidoEmEdicao.numero = numeracao.numero;
            pedidoEmEdicao.codigo = numeracao.codigo;
            pedidoEmEdicao.qrCodeTexto = numeracao.codigo;
            registrarHistoricoPedido(pedidoEmEdicao, "Pedido criado", null, null);
        }

        if(opts.comoOrcamento){
            if(!pedidoEmEdicao.itens.length){
                notificar("Adicione ao menos um item para salvar como orçamento.", "aviso");
                return;
            }
            pedidoEmEdicao.status = "ORCAMENTO";
            var validade = new Date();
            validade.setDate(validade.getDate() + cfg.validadeDias);
            pedidoEmEdicao.validadeOrcamento = validade.toISOString();
        }

        pedidoEmEdicao.atualizadoEm = new Date().toISOString();

        // Reserva automática
        if(cfg.reservaModo === "automatica" && pedidoEmEdicao.itens.length && !pedidoEmEdicao.reservaEstoque?.ativa){
            reservarEstoquePedido(pedidoEmEdicao, base);
            if(pedidoEmEdicao.status === "EM_DIGITACAO") pedidoEmEdicao.status = "RESERVADO";
        }

        var idx = base.pedidosVenda.findIndex(function(p){ return p.id === pedidoEmEdicao.id; });
        if(idx >= 0) base.pedidosVenda[idx] = pedidoEmEdicao;
        else base.pedidosVenda.push(pedidoEmEdicao);

        var idSalvo = pedidoEmEdicao.id;
        var codigoSalvo = pedidoEmEdicao.codigo;

        salvarBase(base);
        notificar("Pedido salvo: " + codigoSalvo, "sucesso");
        carregarPedidos();

        if(cfg.impressaoAutomatica && novo) window.imprimirPedido(idSalvo);

        fecharDrawer();
    }
    window.salvarPedidoAtual = salvarPedido;

    window.reservarEstoquePedidoAtual = function(){
        if(!pedidoEmEdicao) return;
        if(!pedidoEmEdicao.itens.length){ notificar("Adicione itens antes de reservar estoque.", "aviso"); return; }
        var base = obterBase();
        reservarEstoquePedido(pedidoEmEdicao, base);
        if(pedidoEmEdicao.status === "EM_DIGITACAO" || pedidoEmEdicao.status === "ORCAMENTO") pedidoEmEdicao.status = "RESERVADO";
        registrarHistoricoPedido(pedidoEmEdicao, "Estoque reservado manualmente", null, null);
        salvarPedido({});
    };

    window.enviarParaSeparacaoAtual = function(){
        if(!pedidoEmEdicao) return;
        window.mudarStatusPedidoAtual("SEPARACAO");
    };

    window.enviarParaCaixaAtual = function(){
        if(!pedidoEmEdicao) return;
        window.mudarStatusPedidoAtual("AGUARDANDO_PAGAMENTO");
    };

    window.cancelarPedidoAtual = function(){
        if(!pedidoEmEdicao || !pedidoEmEdicao.id){ fecharDrawer(); return; }
        window.cancelarPedido(pedidoEmEdicao.id);
    };

    window.duplicarPedidoAtual = function(){
        if(!pedidoEmEdicao || !pedidoEmEdicao.id){ notificar("Salve o pedido antes de duplicar.", "aviso"); return; }
        window.duplicarPedido(pedidoEmEdicao.id);
    };

    // ── Recalcular resumo ────────────────────────────────────────────────
    function recalcularResumoPedido(){
        var itens = pedidoEmEdicao.itens || [];
        var qtdItens = 0, subtotal = 0, desconto = 0, acrescimos = 0, custoTotal = 0, pesoTotal = 0;

        itens.forEach(function(item){
            var qtd = numero(item.quantidade);
            qtdItens += qtd;
            subtotal += qtd * numero(item.precoUnitario);
            desconto += numero(item.desconto);
            acrescimos += numero(item.acrescimo);
            custoTotal += qtd * numero(item.custoUnitario);
            pesoTotal += qtd * numero(item.pesoUnitario);
            item.total = (qtd * numero(item.precoUnitario)) - numero(item.desconto) + numero(item.acrescimo);
        });

        var frete = numero(pedidoEmEdicao.resumo?.frete);
        var valorFinal = subtotal - desconto + acrescimos + frete;
        var lucroEstimado = valorFinal - custoTotal;

        pedidoEmEdicao.resumo = {
            qtdItens: qtdItens,
            subtotal: subtotal,
            desconto: desconto,
            acrescimos: acrescimos,
            frete: frete,
            valorFinal: valorFinal,
            margemEstimada: valorFinal > 0 ? (lucroEstimado / valorFinal * 100) : 0,
            lucroEstimado: lucroEstimado,
            pesoTotal: pesoTotal
        };
    }

    // ── Cliente do pedido ─────────────────────────────────────────────────
    function buscarClientesPedido(termo){
        var t = normalizar(termo);
        if(!t) return [];
        return obterBase().clientes.filter(function(c){
            return c.ativo !== false && normalizar([c.nome, c.cpf, c.telefone, c.cidade].join(" ")).includes(t);
        }).slice(0, 15);
    }

    window.selecionarClientePedido = function(id){
        var cliente = obterBase().clientes.find(function(c){ return c.id === id; });
        if(!cliente) return;
        pedidoEmEdicao.cliente = {
            id: cliente.id,
            nome: cliente.nome,
            cpf: cliente.cpf || "",
            telefone: cliente.telefone || "",
            cidade: cliente.cidade || "",
            endereco: cliente.endereco || "",
            tabelaPrecoId: cliente.tabelaPrecoPadraoId || "",
            limiteCredito: numero(cliente.limite)
        };
        document.getElementById("buscaClientePedidoVenda").value = "";
        document.getElementById("resultadoBuscaClientePedido").innerHTML = "";
        renderizarClientePedido();
    };

    window.removerClientePedido = function(){
        pedidoEmEdicao.cliente = null;
        renderizarClientePedido();
    };

    function renderizarClientePedido(){
        var box = document.getElementById("clientePedidoSelecionado");
        var c = pedidoEmEdicao.cliente;
        if(!c){
            box.innerHTML = '<span class="pv-sem-cliente">Consumidor não identificado</span>';
        }else{
            box.innerHTML =
                '<div class="pv-cliente-card">' +
                    '<div><strong>' + escapar(c.nome) + '</strong><button type="button" class="pv-btn-remover" onclick="removerClientePedido()"><i class="fa-solid fa-xmark"></i></button></div>' +
                    '<div class="pv-cliente-grid">' +
                        '<span><label>CPF/CNPJ</label>' + escapar(c.cpf || "—") + '</span>' +
                        '<span><label>Telefone</label>' + escapar(c.telefone || "—") + '</span>' +
                        '<span><label>Cidade</label>' + escapar(c.cidade || "—") + '</span>' +
                        '<span><label>Limite crédito</label>' + formatarMoedaRS(c.limiteCredito || 0) + '</span>' +
                    '</div>' +
                    '<span class="pv-cliente-endereco">' + escapar(c.endereco || "") + '</span>' +
                '</div>';
        }
    }

    // ── Produtos no pedido ────────────────────────────────────────────────
    function buscarProdutosPedido(termo){
        var t = normalizar(termo);
        if(!t) return [];
        return obterBase().mercadorias.filter(function(p){
            if(p.ativo === false) return false;
            var hay = normalizar([p.codigo, p.ean, p.descricao, p.referencia, p.marca, p.ncm, p.grupo, p.categoria].join(" "));
            return hay.includes(t);
        }).slice(0, 20);
    }

    function precoResolvidoProduto(produto){
        var cliente = pedidoEmEdicao.cliente;
        if(cliente?.tabelaPrecoId && produto.tabelasPreco && numero(produto.tabelasPreco[cliente.tabelaPrecoId]) > 0){
            return numero(produto.tabelasPreco[cliente.tabelaPrecoId]);
        }
        if(numero(produto.precoPromocional) > 0) return numero(produto.precoPromocional);
        return numero(produto.precoVenda);
    }

    window.adicionarItemPedidoPorId = function(produtoId){
        var produto = obterBase().mercadorias.find(function(p){ return p.id === produtoId; });
        if(!produto) return;

        var existente = pedidoEmEdicao.itens.find(function(i){ return i.produtoId === produto.id; });
        if(existente){
            existente.quantidade = numero(existente.quantidade) + 1;
        }else{
            pedidoEmEdicao.itens.push({
                linhaId: gerarId("pit"),
                produtoId: produto.id,
                codigo: produto.codigo,
                descricao: produto.descricao,
                unidade: produto.unidade || "UN",
                quantidade: 1,
                precoUnitario: precoResolvidoProduto(produto),
                desconto: 0,
                acrescimo: 0,
                total: 0,
                observacoes: "",
                custoUnitario: numero(produto.precoCusto),
                pesoUnitario: numero(produto.pesoLiquido || produto.pesoBruto || 0),
                estoqueDisponivelNoMomento: estoqueDisponivel(produto),
                estoqueReservado: false,
                precoLivre: produto.precoLivre === true
            });
        }

        document.getElementById("buscaProdutoPedidoVenda").value = "";
        document.getElementById("resultadoBuscaProdutoPedido").innerHTML = "";
        recalcularResumoPedido();
        renderizarItensPedido();
        renderizarResumoLateralPedido();
    };

    window.removerItemPedidoLinha = function(linhaId){
        pedidoEmEdicao.itens = pedidoEmEdicao.itens.filter(function(i){ return i.linhaId !== linhaId; });
        recalcularResumoPedido();
        renderizarItensPedido();
        renderizarResumoLateralPedido();
    };

    function atualizarCampoItemPedido(linhaId, campo, valor){
        var item = pedidoEmEdicao.itens.find(function(i){ return i.linhaId === linhaId; });
        if(!item) return;
        item[campo] = ["observacoes"].includes(campo) ? valor : numero(valor);
        recalcularResumoPedido();
        renderizarResumoLateralPedido();
        atualizarLinhaTotalPedido(linhaId);
    }

    function atualizarLinhaTotalPedido(linhaId){
        var item = pedidoEmEdicao.itens.find(function(i){ return i.linhaId === linhaId; });
        var el = document.getElementById("totalLinha_" + linhaId);
        if(item && el) el.textContent = formatarMoedaRS(item.total);
    }

    // ── Renderização do drawer ──────────────────────────────────────────
    function pedidoSomenteLeitura(){
        return Boolean(pedidoEmEdicao) && STATUS_BLOQUEADOS.includes(pedidoEmEdicao.status) && !configuracoesModulo().permitirEditarAposCaixa;
    }

    function renderizarTelaPedido(){
        var p = pedidoEmEdicao;
        var travado = pedidoSomenteLeitura();

        document.getElementById("pvDrawerTitulo").textContent = p.id ? ("Pedido " + p.codigo) : "Novo pedido";
        document.getElementById("pvCabecalhoNumero").textContent = p.codigo || "Será gerado ao salvar";
        document.getElementById("pvCabecalhoData").textContent = fmtDataHora(p.data);
        document.getElementById("pvCabecalhoVendedor").textContent = p.vendedor?.nome || "—";
        document.getElementById("pvCabecalhoEmpresa").textContent = p.empresa?.nome || "—";
        document.getElementById("pvCabecalhoStatus").innerHTML = badgeStatusPedido(p.status);
        document.getElementById("pvObservacoesPedido").value = p.observacoes || "";
        document.getElementById("pvObservacoesPedido").disabled = travado;
        document.getElementById("buscaClientePedidoVenda").disabled = travado;
        document.getElementById("buscaProdutoPedidoVenda").disabled = travado;
        document.getElementById("pvBannerTravado").hidden = !travado;

        var seloReserva = document.getElementById("pvSeloReserva");
        seloReserva.hidden = !p.reservaEstoque?.ativa;

        renderizarClientePedido();
        renderizarItensPedido(travado);
        renderizarResumoLateralPedido();
        renderizarHistoricoPedido();
        renderizarQrPedido();
        renderizarBotoesRodapePedido();
    }

    function renderizarItensPedido(travado){
        travado = travado === undefined ? pedidoSomenteLeitura() : travado;
        var tbody = document.getElementById("pvItensTabela");
        var itens = pedidoEmEdicao.itens || [];

        if(!itens.length){
            tbody.innerHTML = '<tr><td colspan="10" class="vazio">Nenhum item adicionado. Use a busca acima.</td></tr>';
        }else{
            var dis = travado ? " disabled" : "";
            tbody.innerHTML = itens.map(function(item){
                var disponivel = item.estoqueDisponivelNoMomento;
                var disPreco = (travado || !item.precoLivre) ? " disabled" : "";
                return '<tr>' +
                    '<td>' + escapar(item.codigo) + '</td>' +
                    '<td>' + escapar(item.descricao) + (item.estoqueReservado ? ' <span class="pv-selo-mini">Reservado</span>' : '') + '</td>' +
                    '<td><input type="number" min="0.001" step="0.001" class="pv-input-linha" value="' + item.quantidade + '"' + dis + ' onchange="window._pvAtualizarItem(\'' + item.linhaId + '\',\'quantidade\',this.value)"></td>' +
                    '<td><input type="number" min="0" step="0.01" class="pv-input-linha" value="' + item.precoUnitario + '"' + disPreco + ' title="' + (item.precoLivre ? "Preço livre" : "Preço travado pelo cadastro do produto — habilite \'preço livre\' no produto para editar") + '" onchange="window._pvAtualizarItem(\'' + item.linhaId + '\',\'precoUnitario\',this.value)"></td>' +
                    '<td><input type="number" min="0" step="0.01" class="pv-input-linha" value="' + item.desconto + '"' + dis + ' onchange="window._pvAtualizarItem(\'' + item.linhaId + '\',\'desconto\',this.value)"></td>' +
                    '<td><input type="number" min="0" step="0.01" class="pv-input-linha" value="' + item.acrescimo + '"' + dis + ' onchange="window._pvAtualizarItem(\'' + item.linhaId + '\',\'acrescimo\',this.value)"></td>' +
                    '<td id="totalLinha_' + item.linhaId + '"><strong>' + formatarMoedaRS(item.total || 0) + '</strong></td>' +
                    '<td><input type="text" class="pv-input-linha pv-input-obs" placeholder="Obs." value="' + escapar(item.observacoes || "") + '"' + dis + ' onchange="window._pvAtualizarItem(\'' + item.linhaId + '\',\'observacoes\',this.value)"></td>' +
                    '<td class="td-num">' + formatarQtdSimples(disponivel) + '</td>' +
                    '<td>' + (travado ? "" : '<button type="button" class="pv-btn-remover" onclick="removerItemPedidoLinha(\'' + item.linhaId + '\')"><i class="fa-solid fa-trash"></i></button>') + '</td>' +
                '</tr>';
            }).join("");
        }
    }
    window._pvAtualizarItem = atualizarCampoItemPedido;

    function formatarQtdSimples(v){
        return (v === undefined || v === null) ? "—" : Number(v).toLocaleString("pt-BR");
    }

    function comissaoVendedorPedido(){
        var login = pedidoEmEdicao?.vendedor?.login;
        if(!login) return 0;
        var usuario = (obterBase().usuarios || []).find(function(u){ return normalizar(u.login) === normalizar(login); });
        var percentual = numero(usuario?.comissao);
        if(!percentual) return 0;
        return numero(pedidoEmEdicao.resumo?.valorFinal) * (percentual / 100);
    }

    function renderizarResumoLateralPedido(){
        var r = pedidoEmEdicao.resumo || {};
        definirTexto("pvResumoQtdItens", r.qtdItens || 0);
        definirTexto("pvResumoSubtotal", formatarMoedaRS(r.subtotal || 0));
        definirTexto("pvResumoDesconto", formatarMoedaRS(r.desconto || 0));
        definirTexto("pvResumoAcrescimos", formatarMoedaRS(r.acrescimos || 0));
        definirTexto("pvResumoValorFinal", formatarMoedaRS(r.valorFinal || 0));
        definirTexto("pvResumoMargem", (r.margemEstimada || 0).toFixed(1) + "%");
        definirTexto("pvResumoLucro", formatarMoedaRS(r.lucroEstimado || 0));
        definirTexto("pvResumoComissao", formatarMoedaRS(comissaoVendedorPedido()));
        var linhaPeso = document.getElementById("pvLinhaPeso");
        if(r.pesoTotal > 0){
            linhaPeso.hidden = false;
            definirTexto("pvResumoPeso", r.pesoTotal.toLocaleString("pt-BR") + " kg");
        }else{
            linhaPeso.hidden = true;
        }
        var freteInput = document.getElementById("pvResumoFreteInput");
        freteInput.disabled = pedidoSomenteLeitura();
        if(document.activeElement !== freteInput) freteInput.value = formatarDecimalCampo(r.frete || 0);
    }

    function atualizarFretePedido(valor){
        pedidoEmEdicao.resumo = pedidoEmEdicao.resumo || {};
        pedidoEmEdicao.resumo.frete = numero(valor);
        recalcularResumoPedido();
        definirTexto("pvResumoQtdItens", pedidoEmEdicao.resumo.qtdItens || 0);
        definirTexto("pvResumoSubtotal", formatarMoedaRS(pedidoEmEdicao.resumo.subtotal || 0));
        definirTexto("pvResumoDesconto", formatarMoedaRS(pedidoEmEdicao.resumo.desconto || 0));
        definirTexto("pvResumoAcrescimos", formatarMoedaRS(pedidoEmEdicao.resumo.acrescimos || 0));
        definirTexto("pvResumoValorFinal", formatarMoedaRS(pedidoEmEdicao.resumo.valorFinal || 0));
        definirTexto("pvResumoMargem", (pedidoEmEdicao.resumo.margemEstimada || 0).toFixed(1) + "%");
        definirTexto("pvResumoLucro", formatarMoedaRS(pedidoEmEdicao.resumo.lucroEstimado || 0));
        definirTexto("pvResumoComissao", formatarMoedaRS(comissaoVendedorPedido()));
    }

    window.atualizarObservacoesPedido = function(valor){
        pedidoEmEdicao.observacoes = valor;
    };

    function renderizarHistoricoPedido(){
        var box = document.getElementById("pvHistoricoLista");
        var hist = pedidoEmEdicao.historico || [];
        if(!hist.length){
            box.innerHTML = '<p class="pv-historico-vazio">Sem alterações registradas.</p>';
            return;
        }
        box.innerHTML = hist.map(function(h){
            return '<div class="pv-historico-item">' +
                '<div class="pv-historico-topo"><strong>' + escapar(h.usuarioNome || "Sistema") + '</strong><span>' + fmtDataHora(h.data) + '</span></div>' +
                '<div class="pv-historico-desc">' + escapar(h.alteracao || "") +
                (h.valorAnterior != null || h.valorNovo != null ? (' — de <em>' + escapar(String(h.valorAnterior ?? "—")) + '</em> para <em>' + escapar(String(h.valorNovo ?? "—")) + '</em>') : "") +
                '</div>' +
            '</div>';
        }).join("");
    }

    function renderizarBotoesRodapePedido(){
        var podeEditar = !pedidoSomenteLeitura();
        document.querySelectorAll("[data-pv-somente-edicao]").forEach(function(el){
            el.style.display = podeEditar ? "" : "none";
        });
    }

    // ── Código de barras (Code 39, gerado localmente — sem CDN/lib externa) ─
    var CODE39_PADROES = {
        "0":"000110100", "1":"100100001", "2":"001100001", "3":"101100000",
        "4":"000110001", "5":"100110000", "6":"001110000", "7":"000100101",
        "8":"100100100", "9":"001100100", "A":"100001001", "B":"001001001",
        "C":"101001000", "D":"000011001", "E":"100011000", "F":"001011000",
        "G":"000001101", "H":"100001100", "I":"001001100", "J":"000011100",
        "K":"100000011", "L":"001000011", "M":"101000010", "N":"000010011",
        "O":"100010010", "P":"001010010", "Q":"000000111", "R":"100000110",
        "S":"001000110", "T":"000010110", "U":"110000001", "V":"011000001",
        "W":"111000000", "X":"010010001", "Y":"110010000", "Z":"011010000",
        "-":"010000101", ".":"110000100", " ":"011000100", "$":"010101000",
        "/":"010100010", "+":"010001010", "%":"000101010", "*":"010010100"
    };

    function sanitizarCode39(texto){
        return String(texto || "").toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "");
    }

    function gerarSvgCode39(texto){
        var estreita = 2, larga = 5;
        var conteudo = "*" + sanitizarCode39(texto) + "*";
        var x = 0;
        var barras = "";

        for(var i = 0; i < conteudo.length; i++){
            var padrao = CODE39_PADROES[conteudo[i]];
            if(!padrao) continue;
            for(var j = 0; j < padrao.length; j++){
                var largura = padrao[j] === "1" ? larga : estreita;
                var ehBarra = (j % 2 === 0);
                if(ehBarra){
                    barras += '<rect x="' + x + '" y="0" width="' + largura + '" height="60"></rect>';
                }
                x += largura;
            }
            x += estreita;
        }

        var larguraTotal = x;
        return '<svg viewBox="0 0 ' + larguraTotal + ' 78" width="100%" height="90" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
            '<rect x="0" y="0" width="' + larguraTotal + '" height="60" fill="#fff"></rect>' +
            '<g fill="#000">' + barras + '</g>' +
            '<text x="' + (larguraTotal / 2) + '" y="74" text-anchor="middle" font-family="monospace" font-size="13" fill="#0f172a">' + escapar(texto) + '</text>' +
            '</svg>';
    }

    function renderizarQrPedido(){
        var container = document.getElementById("pvQrContainer");
        var texto = pedidoEmEdicao.qrCodeTexto || pedidoEmEdicao.codigo;
        if(!texto){
            container.innerHTML = '<span class="pv-qr-indisponivel">Código de barras gerado ao salvar</span>';
            return;
        }
        container.innerHTML = gerarSvgCode39(texto);
    }

    // ── Drawer (abrir/fechar) ────────────────────────────────────────────
    function abrirDrawer(){
        document.getElementById("pvDrawerOverlay").hidden = false;
        requestAnimationFrame(function(){
            document.getElementById("pvDrawerOverlay").classList.add("aberto");
        });
    }

    function fecharDrawer(){
        document.getElementById("pvDrawerOverlay").classList.remove("aberto");
        setTimeout(function(){ document.getElementById("pvDrawerOverlay").hidden = true; }, 220);
        pedidoEmEdicao = null;
    }
    window.fecharDrawerPedido = fecharDrawer;

    function conectarDrawer(){
        document.getElementById("pvDrawerOverlay").addEventListener("click", function(e){
            if(e.target === this) fecharDrawer();
        });
        document.getElementById("btnFecharDrawerPedido").addEventListener("click", fecharDrawer);

        document.getElementById("pvResumoFreteInput").addEventListener("input", function(){
            atualizarFretePedido(this.value);
        });

        var debounceCliente;
        document.getElementById("buscaClientePedidoVenda").addEventListener("input", function(){
            clearTimeout(debounceCliente);
            var termo = this.value;
            debounceCliente = setTimeout(function(){
                var resultados = buscarClientesPedido(termo);
                var box = document.getElementById("resultadoBuscaClientePedido");
                box.innerHTML = resultados.map(function(c){
                    return '<button type="button" class="pv-resultado-item" onclick="selecionarClientePedido(\'' + c.id + '\')">' +
                        '<strong>' + escapar(c.nome) + '</strong><span>' + escapar(c.cpf || c.telefone || "") + '</span></button>';
                }).join("");
            }, 200);
        });

        var debounceProduto;
        document.getElementById("buscaProdutoPedidoVenda").addEventListener("input", function(){
            clearTimeout(debounceProduto);
            var termo = this.value;
            debounceProduto = setTimeout(function(){
                var resultados = buscarProdutosPedido(termo);
                var box = document.getElementById("resultadoBuscaProdutoPedido");
                box.innerHTML = resultados.map(function(p){
                    return '<button type="button" class="pv-resultado-item" onclick="adicionarItemPedidoPorId(\'' + p.id + '\')">' +
                        '<strong>' + escapar(p.descricao) + '</strong><span>' + escapar(p.codigo || "") + ' · ' + formatarMoedaRS(numero(p.precoVenda)) + ' · Estoque: ' + formatarQtdSimples(estoqueDisponivel(p)) + '</span></button>';
                }).join("") || '<div class="pv-resultado-vazio">Nenhum produto encontrado.</div>';
            }, 200);
        });

        document.getElementById("formPedidoVenda").addEventListener("submit", function(e){ e.preventDefault(); });
    }

    // ── Impressão ─────────────────────────────────────────────────────────
    window.imprimirPedido = function(id){
        var base = obterBase();
        var pedido = pedidoEmEdicao && pedidoEmEdicao.id === id ? pedidoEmEdicao : (base.pedidosVenda || []).find(function(p){ return p.id === id; });
        if(!pedido){ notificar("Pedido não encontrado para impressão.", "erro"); return; }
        abrirJanelaImpressaoPedido(pedido, base);
    };
    window.gerarPdfPedido = window.imprimirPedido;

    window.imprimirPedidoAtual = function(){
        if(!pedidoEmEdicao) return;
        if(!pedidoEmEdicao.id){ notificar("Salve o pedido antes de imprimir.", "aviso"); return; }
        window.imprimirPedido(pedidoEmEdicao.id);
    };

    function abrirJanelaImpressaoPedido(pedido, base){
        var empresa = base.empresa || {};
        var nomeEmpresa = empresa.razaoSocial || empresa.nomeFantasia || "ERP Coneccta";
        var agora = new Date().toLocaleString("pt-BR");

        var linhasItens = (pedido.itens || []).map(function(item){
            return '<tr>' +
                '<td style="padding:6px 8px;border-bottom:1px solid #eee;">' + escapar(item.descricao) + '<br><small style="color:#888">' + escapar(item.codigo || "") + '</small></td>' +
                '<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">' + item.quantidade + '</td>' +
                '<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">' + formatarMoedaRS(item.precoUnitario) + '</td>' +
                '<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">' + formatarMoedaRS(item.total || 0) + '</td>' +
            '</tr>';
        }).join("");

        var c = pedido.cliente;
        var clienteHtml = c
            ? '<strong>' + escapar(c.nome) + '</strong><br>' + escapar(c.cpf || "") + ' — ' + escapar(c.telefone || "") + '<br>' + escapar(c.endereco || "") + ' ' + escapar(c.cidade || "")
            : "Consumidor não identificado";

        var codigoBarrasSvg = pedido.qrCodeTexto || pedido.codigo ? gerarSvgCode39(pedido.qrCodeTexto || pedido.codigo) : "";

        var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Pedido ' + escapar(pedido.codigo || "") + '</title>' +
            '<style>*{margin:0;padding:0;box-sizing:border-box;font-family:"Segoe UI",Arial,sans-serif;}body{padding:24px;color:#000;font-size:13px;}' +
            '@media print{body{padding:6mm;}@page{margin:8mm;}}</style></head><body>' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1A436B;padding-bottom:14px;margin-bottom:16px;">' +
                '<div><div style="font-size:20px;font-weight:900;color:#1A436B;">' + escapar(nomeEmpresa) + '</div>' +
                '<div style="font-size:12px;color:#555;margin-top:4px;">Pedido de Venda — Emitido em ' + agora + '</div></div>' +
                '<div style="text-align:right;width:190px;">' + codigoBarrasSvg + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:24px;margin-bottom:16px;font-size:12px;">' +
                '<div style="flex:1;"><label style="color:#888;text-transform:uppercase;font-size:10px;">Cliente</label><div>' + clienteHtml + '</div></div>' +
                '<div><label style="color:#888;text-transform:uppercase;font-size:10px;">Vendedor</label><div>' + escapar(pedido.vendedor?.nome || "—") + '</div>' +
                (pedido.validadeOrcamento ? '<label style="color:#888;text-transform:uppercase;font-size:10px;margin-top:6px;display:block;">Validade</label><div>' + fmtData(pedido.validadeOrcamento) + '</div>' : '') +
                '</div>' +
            '</div>' +
            '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
            '<thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:6px 8px;">Produto</th><th style="padding:6px 8px;">Qtd</th><th style="padding:6px 8px;text-align:right;">Preço</th><th style="padding:6px 8px;text-align:right;">Total</th></tr></thead>' +
            '<tbody>' + linhasItens + '</tbody></table>' +
            '<div style="margin-top:14px;padding-top:10px;border-top:2px solid #1A436B;display:flex;justify-content:flex-end;gap:24px;font-size:13px;">' +
                '<span>Subtotal: ' + formatarMoedaRS(pedido.resumo?.subtotal || 0) + '</span>' +
                '<span>Desconto: ' + formatarMoedaRS(pedido.resumo?.desconto || 0) + '</span>' +
                '<span style="font-weight:900;color:#1A436B;">Total: ' + formatarMoedaRS(pedido.resumo?.valorFinal || 0) + '</span>' +
            '</div>' +
            (pedido.observacoes ? '<div style="margin-top:14px;font-size:12px;color:#555;"><strong>Observações:</strong> ' + escapar(pedido.observacoes) + '</div>' : '') +
            '</body></html>';

        var w = window.open("", "_blank", "width=860,height=720");
        if(!w){ notificar("Permita pop-ups para imprimir.", "info"); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(function(){ w.print(); }, 400);
    }

    // ── WhatsApp ──────────────────────────────────────────────────────────
    function linkWhatsappPedido(pedido){
        var telefone = (pedido.cliente?.telefone || "").replace(/\D/g, "");
        var numeroCompleto = telefone ? ("55" + telefone) : "";
        var msg = "Olá " + (pedido.cliente?.nome || "") + "! Segue o resumo do seu pedido " + (pedido.codigo || "") + " — total " + formatarMoedaRS(pedido.resumo?.valorFinal || 0) + ".";
        return "https://wa.me/" + numeroCompleto + "?text=" + encodeURIComponent(msg);
    }
    window.linkWhatsappPedido = linkWhatsappPedido;

    window.enviarWhatsappPedidoAtual = function(){
        if(!pedidoEmEdicao) return;
        if(!pedidoEmEdicao.cliente?.telefone){ notificar("Cliente sem telefone cadastrado.", "aviso"); return; }
        window.open(linkWhatsappPedido(pedidoEmEdicao), "_blank", "noopener");
    };

    // ── Relatórios ────────────────────────────────────────────────────────
    window.alternarPainelRelatoriosPedidos = function(){
        var painel = document.getElementById("pvPainelRelatorios");
        var abrir = painel.hidden;
        painel.hidden = !abrir;
        if(abrir) renderizarRelatoriosPedidos();
    };

    function renderizarRelatoriosPedidos(){
        var todos = obterBase().pedidosVenda || [];
        var ativos = todos.filter(function(p){ return p.status !== "CANCELADO"; });

        var porVendedor = {}, porCliente = {}, porProduto = {}, porProdutoVendido = {};
        var cancelados = 0, convertidos = 0, somaTempoConversao = 0, qtdTempoConversao = 0;
        var emAberto = 0, reservados = 0;

        todos.forEach(function(p){
            if(p.status === "CANCELADO") cancelados++;
            if(p.status === "FINALIZADO") convertidos++;
            if(p.status === "EM_DIGITACAO" || p.status === "ORCAMENTO") emAberto++;
            if(p.reservaEstoque?.ativa) reservados++;
            if(p.status === "FINALIZADO" && p.criadoEm && p.atualizadoEm){
                var min = (new Date(p.atualizadoEm) - new Date(p.criadoEm)) / 60000;
                if(min >= 0){ somaTempoConversao += min; qtdTempoConversao++; }
            }
        });

        ativos.forEach(function(p){
            var vend = p.vendedor?.nome || "—";
            porVendedor[vend] = (porVendedor[vend] || 0) + numero(p.resumo?.valorFinal);

            var cli = p.cliente?.nome || "Consumidor";
            porCliente[cli] = (porCliente[cli] || 0) + numero(p.resumo?.valorFinal);

            (p.itens || []).forEach(function(item){
                porProduto[item.descricao] = (porProduto[item.descricao] || 0) + numero(item.quantidade);
                if(p.status === "FINALIZADO"){
                    porProdutoVendido[item.descricao] = (porProdutoVendido[item.descricao] || 0) + numero(item.quantidade);
                }
            });
        });

        renderizarRankingRelatorio("pvRelVendedores", porVendedor, true);
        renderizarRankingRelatorio("pvRelClientes", porCliente, true);
        renderizarRankingRelatorio("pvRelProdutosOrcados", porProduto, false);
        renderizarRankingRelatorio("pvRelProdutosVendidos", porProdutoVendido, false);

        definirTexto("pvRelCancelados", cancelados);
        definirTexto("pvRelConvertidos", convertidos);
        definirTexto("pvRelEmAberto", emAberto);
        definirTexto("pvRelReservados", reservados);
        definirTexto("pvRelTempoConversao", formatarMinutos(qtdTempoConversao ? somaTempoConversao / qtdTempoConversao : 0));
        definirTexto("pvRelConversaoTaxa", todos.length ? ((convertidos / todos.length) * 100).toFixed(1) + "%" : "0%");
    }

    function renderizarRankingRelatorio(elId, mapa, moeda){
        var el = document.getElementById(elId);
        if(!el) return;
        var lista = Object.keys(mapa).map(function(k){ return { nome:k, valor:mapa[k] }; })
            .sort(function(a,b){ return b.valor - a.valor; }).slice(0, 8);

        el.innerHTML = lista.length ? lista.map(function(i){
            return '<div class="pv-rel-item"><span>' + escapar(i.nome) + '</span><strong>' + (moeda ? formatarMoedaRS(i.valor) : formatarQtdSimples(i.valor)) + '</strong></div>';
        }).join("") : '<div class="pv-rel-vazio">Sem dados.</div>';
    }

    // ── Utils de data ────────────────────────────────────────────────────
    function fmtData(iso){
        if(!iso) return "—";
        try{ return new Date(iso).toLocaleDateString("pt-BR"); }catch(e){ return iso; }
    }
    function fmtHora(iso){
        if(!iso) return "—";
        try{ return new Date(iso).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }); }catch(e){ return ""; }
    }
    function fmtDataHora(iso){
        if(!iso) return "—";
        try{ return new Date(iso).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }); }catch(e){ return iso; }
    }
})();
