// pdv-caixa.js
// Abertura e fechamento de caixa, suprimento/sangria, gaveta, parâmetros e eventos de caixa, resumo do fechamento.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Abre o modal de fechamento de caixa.
function abrirFechamentoCaixa(){
    atualizarResumoFechamentoCaixa();
    abrirModalPdv("modalFechamentoCaixaPdv");
}

// Calcula os totais do fechamento de caixa.
function calcularResumoFechamentoCaixa(){
    const base = obterBase();
    const sid = sessaoCaixaAtual?.id || null;

    // Filtrar apenas pela sessão atual quando existir
    const vendas = sid
        ? base.vendas.filter(function(v){ return v.sessaoId === sid; })
        : base.vendas;
    const canceladas = sid
        ? base.vendasCanceladas.filter(function(v){ return v.sessaoId === sid; })
        : base.vendasCanceladas;
    const movimentos = sid
        ? base.movimentosCaixa.filter(function(m){ return m.sessaoId === sid; })
        : base.movimentosCaixa;

    const totalVendas    = vendas.reduce(function(acc, v){ return acc + numero(v.total); }, 0);
    const totalCanceladas = canceladas.reduce(function(acc, v){ return acc + numero(v.total); }, 0);
    const suprimentos = movimentos
        .filter(function(m){ return m.tipo === "suprimento"; })
        .reduce(function(acc, m){ return acc + numero(m.valor); }, 0);
    const sangrias = movimentos
        .filter(function(m){ return m.tipo === "sangria"; })
        .reduce(function(acc, m){ return acc + numero(m.valor); }, 0);
    const valorAbertura = numero(sessaoCaixaAtual?.valorAbertura || 0);

    const porFormaPagamento = {};
    vendas.forEach(function(venda){
        acumularPagamentosVendaResumo(porFormaPagamento, venda);
    });

    return {
        totalVendas,
        totalCanceladas,
        suprimentos,
        sangrias,
        valorAbertura,
        saldo: valorAbertura + totalVendas + suprimentos - sangrias,
        quantidadeVendas: vendas.length,
        quantidadeCanceladas: canceladas.length,
        quantidadeMovimentos: movimentos.length,
        porFormaPagamento
    };
}

// Atualiza o DOM com o resumo do fechamento.
function atualizarResumoFechamentoCaixa(){
    const resumo = calcularResumoFechamentoCaixa();
    definirTexto("fechamentoTotalVendas", formatarMoedaRS(resumo.totalVendas));
    definirTexto("fechamentoSuprimentos", formatarMoedaRS(resumo.suprimentos));
    definirTexto("fechamentoSangrias", formatarMoedaRS(resumo.sangrias));
    definirTexto("fechamentoSaldo", formatarMoedaRS(resumo.saldo));
    definirTexto("fechamentoQtdVendas",      resumo.quantidadeVendas);
    definirTexto("fechamentoQtdCanceladas",  resumo.quantidadeCanceladas);
    definirTexto("fechamentoTotalCanceladas", formatarMoedaRS(resumo.totalCanceladas));
    definirTexto("fechamentoQtdMovimentos",  resumo.quantidadeMovimentos);
    definirTexto("fechamentoResumoTexto",    "");

    // Totais por forma de pagamento
    const destino = document.getElementById("fechamentoFormasPagamento");
    if(destino){
        if(!resumo.porFormaPagamento || Object.keys(resumo.porFormaPagamento).length === 0){
            destino.innerHTML = '<div class="fechamento-forma-vazia">Nenhuma venda registrada.</div>';
        } else {
            destino.innerHTML = Object.entries(resumo.porFormaPagamento)
                .sort(function(a, b){ return b[1] - a[1]; })
                .map(function(par){
                    const forma = par[0], total = par[1];
                    const pct = resumo.totalVendas > 0 ? Math.round((total / resumo.totalVendas) * 100) : 0;
                    return `
                        <div class="fechamento-forma-linha">
                            <span class="fechamento-forma-nome">${escapar(forma)}</span>
                            <div class="fechamento-forma-barra-wrap">
                                <div class="fechamento-forma-barra" style="width:${pct}%"></div>
                            </div>
                            <span class="fechamento-forma-pct">${pct}%</span>
                            <strong class="fechamento-forma-valor">${formatarMoedaRS(total)}</strong>
                        </div>
                    `;
                }).join("");
        }
    }

    // Orçamentos da sessão
    _renderizarOrcamentosFechamento();
}

// Confirma e grava o fechamento do caixa.
function confirmarFechamentoCaixa(){
    const resumo = calcularResumoFechamentoCaixa();
    const base = obterBase();
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const agora = new Date().toISOString();

    const fechamento = {
        id: gerarId("fec"),
        data: agora,
        operador: usuario.nome || usuario.login || "Supervisor",
        operadorLogin: usuario.login || "ADM",
        sessaoId: sessaoCaixaAtual?.id || null,
        abertoEm: sessaoCaixaAtual?.abertoEm || null,
        fechadoEm: agora,
        ...resumo
    };

    base.fechamentosCaixa.push(fechamento);

    // Fechar sessão no array
    if(sessaoCaixaAtual?.id){
        const idx = base.sessoesCode.findIndex(function(s){ return s.id === sessaoCaixaAtual.id; });
        if(idx >= 0){
            base.sessoesCode[idx].status = "fechado";
            base.sessoesCode[idx].fechadoEm = agora;
        }
    }

    salvarBase(base);
    chamarPdvApi("fecharCaixa", [fechamento]);
    sessaoCaixaAtual = null;
    fecharModaisPdv();
    imprimirFechamentoCaixa80mm(fechamento);

}

// Redireciona para o login após o fechamento do caixa.
function voltarLoginAposFechamentoCaixa(){
    if(window.AuthSistema?.logout){
        window.AuthSistema.logout();
        return;
    }

    sessionStorage.removeItem("sessaoUsuarioSistema");
    localStorage.removeItem("sessaoUsuarioSistema");
    location.replace(new URL("index.html", document.baseURI).href);
}

// Botão "Sair" do caixa: se o caixa ainda estiver aberto, pergunta (no padrão de diálogo
// do sistema, não no confirm() nativo do navegador) se deve fechar antes de sair (fecha e
// imprime o comprovante se confirmado; se recusado, sai sem fechar). Depois decide o
// destino pela permissão do usuário: quem só tem acesso ao PDV volta para o login; quem
// também tem acesso ao restante do ERP volta para a tela principal.
function sairDoCaixaPdv(){
    if(!sessaoCaixaAtual){
        _navegarAposSairCaixaPdv();
        return;
    }

    const confirmar = window.notify
        ? notify.confirm({
            title: "Caixa aberto",
            message: "O caixa ainda está aberto. Deseja fechar o caixa atual?",
            confirmText: "Fechar caixa",
            cancelText: "Sair sem fechar",
            type: "warning"
        })
        : Promise.resolve(confirm("O caixa ainda está aberto. Deseja fechar o caixa atual?"));

    confirmar.then(function(fechar){
        if(fechar) confirmarFechamentoCaixa();
        _navegarAposSairCaixaPdv();
    });
}

// Decide para onde ir depois de sair do caixa, conforme a permissão do usuário.
function _navegarAposSairCaixaPdv(){
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const somentePdv = window.AuthSistema?.usuarioSomentePdv
        ? window.AuthSistema.usuarioSomentePdv(usuario)
        : true;

    if(somentePdv){
        voltarLoginAposFechamentoCaixa();
        return;
    }

    location.replace(new URL("telas/shell/sistema.html", document.baseURI).href);
}

// Mostra os dados da sessão de caixa atual no painel de opções.
function _atualizarInfoSessaoPainel(){
    const el = document.getElementById("infoSessaoPainelOpcoes");
    if(!el) return;
    if(!sessaoCaixaAtual){
        el.innerHTML = "";
        return;
    }
    const abertoEm = new Date(sessaoCaixaAtual.abertoEm).toLocaleString("pt-BR");
    const resumo = calcularResumoFechamentoCaixa();
    const valorAbertura = numero(sessaoCaixaAtual.valorAbertura || 0);
    el.innerHTML = `
        <div class="sessao-pdv-info">
            <span>Caixa aberto em ${abertoEm}</span>
            <strong>${formatarMoedaRS(resumo.saldo)}</strong>
            <div class="sessao-pdv-valores">
                <span><b>Abertura</b>${formatarMoedaRS(valorAbertura)}</span>
                <span><b>Vendas</b>${formatarMoedaRS(resumo.totalVendas)}</span>
            </div>
            <small>${resumo.quantidadeVendas} venda(s) · ${sessaoCaixaAtual.usuarioNome || sessaoCaixaAtual.usuarioLogin}</small>
        </div>
    `;
}

// Abre a tela de parâmetros do caixa.
function abrirParametrosCaixaPdv(){
    fecharAjustes();
    renderizarEntregasPdv();
    abrirModalPdv("modalOpcoesPdv");
}

// Abre a aba de suprimento/sangria no menu de vendas.
function abrirSuprimentoSangriaPdv(){
    fecharModaisPdv();
    abrirMenuVendas();
    abrirAbaMenuPdv("caixa");
}

// Registra abertura manual da gaveta.
function abrirGavetaPdv(){
    registrarEventoCaixaPdv("Abertura de gaveta", "Solicitação manual pelo PDV");
    renderizarEventosCaixaPdv();
    alert("Solicitação de abertura de gaveta registrada.");
}

// Renderiza o formulário de parâmetros do caixa.
function renderizarParametrosCaixaPdv(){
    const parametros = obterBase().parametrosCaixa || {};
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const operador = usuario.nome || usuario.login || parametros.operador || "Supervisor";

    const configFiscalCaixa = obterConfiguracoesSistema();
    atribuirValorCampo("paramOperadorCaixa", operador);
    atribuirValorCampo("paramImpressoraCaixa", parametros.impressora || "Impressora padrão");
    atribuirValorCampo("paramTrocoInicialCaixa", formatarDecimalCampo(parametros.trocoInicial || 0));
    // Série e próximo número vêm das configurações fiscais (fonte única)
    atribuirValorCampo("paramSerieNfceCaixa", configFiscalCaixa.fiscalSerieNfce || parametros.serieNfce || "1");
    atribuirValorCampo("paramProximoNfceCaixa", configFiscalCaixa.fiscalProximoNfce || "1");
    atribuirValorCampo("paramAmbienteFiscalCaixa", configFiscalCaixa.fiscalAmbiente || "homologacao");
    atribuirValorCampo("paramCertificadoCaixa", configFiscalCaixa.fiscalCertificadoArquivo ? "Carregado" : "Não configurado");
    atribuirValorCampo("paramModeloVendaCaixa", parametros.modeloVenda || "pedido");
    atribuirValorCampo("paramPermiteDescontoCaixa", parametros.permiteDesconto === false ? "nao" : "sim");
}

// Salva os parâmetros configurados do caixa.
function salvarParametrosCaixaPdv(){
    const base = obterBase();
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    base.parametrosCaixa = {
        operador: usuario.nome || usuario.login || valorCampo("paramOperadorCaixa") || "Supervisor",
        impressora: valorCampo("paramImpressoraCaixa") || "Impressora padrão",
        trocoInicial: numero(valorCampo("paramTrocoInicialCaixa")),
        serieNfce: valorCampo("paramSerieNfceCaixa") || "001",
        modeloVenda: valorCampo("paramModeloVendaCaixa") || "pedido",
        permiteDesconto: valorCampo("paramPermiteDescontoCaixa") !== "nao",
        atualizadoEm: new Date().toISOString()
    };
    base.eventosCaixa.push({
        id: gerarId("evt"),
        tipo: "Parâmetros atualizados",
        detalhe: `Usuário: ${base.parametrosCaixa.operador}`,
        data: new Date().toISOString()
    });
    salvarBase(base);
    renderizarEventosCaixaPdv();
    notificar("Parâmetros do caixa salvos.", "sucesso");
}

// Registra um evento de caixa (wrapper de conveniência).
function registrarEventoCaixaPdv(tipo, detalhe, dados){
    const base = obterBase();
    registrarEventoCaixaNaBase(base, tipo, detalhe, dados);
    salvarBase(base);
}

// Renderiza a lista de eventos do caixa.
function renderizarEventosCaixaPdv(){
    const destino = document.getElementById("listaEventosCaixaPdv");

    if(!destino) return;

    const eventos = obterBase().eventosCaixa.slice().reverse().slice(0, 20);

    if(eventos.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhuma atividade registrada.</div>`;
        return;
    }

    destino.innerHTML = eventos.map(function(evento) {
        return `
            <div class="venda-pdv-item">
                <div>
                    <strong>${escapar(evento.tipo)}</strong>
                    <small>${formatarData(evento.data)} | ${escapar(evento.detalhe || "-")}</small>
                </div>
            </div>
        `;
    }).join("");
}

// Registra um suprimento ou sangria no caixa.
function registrarMovimentoCaixa(){
    const tipo = document.getElementById("tipoMovimentoCaixa")?.value || "suprimento";
    const valor = numeroDigitado(document.getElementById("valorMovimentoCaixa")?.value || "");
    const observacao = document.getElementById("observacaoMovimentoCaixa")?.value.trim() || "";

    if(valor <= 0){
        alert("Informe um valor maior que zero.");
        document.getElementById("valorMovimentoCaixa")?.focus();
        return;
    }

    const base = obterBase();
    const movimento = {
        id: gerarId(tipo === "sangria" ? "san" : "sup"),
        tipo,
        valor,
        observacao,
        data: new Date().toISOString(),
        sessaoId: sessaoCaixaAtual?.id || null
    };
    base.movimentosCaixa.push(movimento);
    registrarEventoCaixaNaBase(base, tipo === "sangria" ? "Sangria" : "Suprimento", `${formatarMoedaRS(valor)}${observacao ? ` | ${observacao}` : ""}`, {
        movimentoId: movimento.id,
        valor,
        observacao,
        operador: window.AuthSistema?.usuarioAtual?.().nome || window.AuthSistema?.usuarioAtual?.().login || "Usuário"
    });
    salvarBase(base);
    chamarPdvApi("registrarMovimento", [movimento]);
    document.getElementById("valorMovimentoCaixa").value = "";
    document.getElementById("observacaoMovimentoCaixa").value = "";
    renderizarMovimentosCaixa();
    notificar(tipo === "sangria" ? "Sangria registrada." : "Suprimento registrado.", "sucesso");
}

// Alterna o tipo de movimento entre suprimento e sangria.
function selecionarTipoMovimento(btn){
    document.querySelectorAll(".caixa-mov-tipo-btn").forEach(function(b){ b.classList.remove("ativo"); });
    btn.classList.add("ativo");
    const input = document.getElementById("tipoMovimentoCaixa");
    if(input) input.value = btn.dataset.tipo;
}

// Renderiza a lista de suprimentos/sangrias do caixa.
function renderizarMovimentosCaixa(){
    const destino = document.getElementById("listaMovimentosCaixa");
    if(!destino) return;

    const movimentos = obterBase().movimentosCaixa.slice().reverse();

    // Atualizar totais
    let totSup = 0, totSan = 0;
    movimentos.forEach(function(m){
        if(m.tipo === "sangria") totSan += numero(m.valor);
        else                     totSup += numero(m.valor);
    });
    const elSup = document.getElementById("totalSuprimentosCaixa");
    const elSan = document.getElementById("totalSangriasCaixa");
    if(elSup) elSup.textContent = formatarMoedaRS(totSup);
    if(elSan) elSan.textContent = formatarMoedaRS(totSan);

    if(movimentos.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhum suprimento ou sangria registrado.</div>`;
        return;
    }

    destino.innerHTML = movimentos.map(function(m){
        const isSan  = m.tipo === "sangria";
        const label  = isSan ? "Sangria" : "Suprimento";
        const icon   = isSan ? "fa-arrow-up-from-line" : "fa-arrow-down-to-line";
        const cls    = isSan ? "sangria" : "suprimento";
        const sinal  = isSan ? "−" : "+";
        const obs    = m.observacao ? escapar(m.observacao) : '<em style="color:#cbd5e1">Sem observação</em>';
        const oper   = m.operador   ? " · " + escapar(m.operador) : "";
        return `<div class="caixa-mov-item">
            <div class="caixa-mov-badge caixa-mov-badge--${cls}">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="caixa-mov-info">
                <strong>${label}</strong>
                <small>${formatarData(m.data)}${oper}</small>
                <small>${obs}</small>
            </div>
            <span class="caixa-mov-valor caixa-mov-valor--${cls}">${sinal} ${formatarMoedaRS(m.valor)}</span>
        </div>`;
    }).join("");
}

// Verifica se o caixa já está aberto e exige abertura se não estiver.
function verificarAberturaCaixa(){
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const login   = usuario.login || "ADM";
    const base    = obterBase();
    const hoje    = new Date().toDateString();

    // Sessão aberta para este usuário
    const sessaoAberta = base.sessoesCode.find(function(s){
        return s.status === "aberto" && s.usuarioLogin === login;
    });

    if(sessaoAberta){
        const aberturaDia = new Date(sessaoAberta.abertoEm).toDateString();

        if(aberturaDia === hoje){
            // Mesma data → continua com a sessão
            sessaoCaixaAtual = sessaoAberta;
            _ocultarModalAberturaCaixa();
            return;
        }

        // Data diferente → fechar sessão esquecida automaticamente e abrir nova
        _autoFecharSessaoEsquecida(sessaoAberta, base);
    }

    // Sem sessão aberta → exibir modal de abertura
    sessaoCaixaAtual = null;
    _exibirModalAberturaCaixa(usuario);
}

// Fecha automaticamente uma sessão de caixa esquecida aberta.
function _autoFecharSessaoEsquecida(sessao, base){
    const agora = new Date().toISOString();

    // Criar fechamento automático
    const vendas = base.vendas.filter(function(v){ return v.sessaoId === sessao.id; });
    const canceladas = base.vendasCanceladas.filter(function(v){ return v.sessaoId === sessao.id; });
    const movimentos = base.movimentosCaixa.filter(function(m){ return m.sessaoId === sessao.id; });

    const totalVendas = vendas.reduce(function(a, v){ return a + numero(v.total); }, 0);
    const totalCanceladas = canceladas.reduce(function(a, v){ return a + numero(v.total); }, 0);
    const suprimentos = movimentos.filter(function(m){ return m.tipo === "suprimento"; })
        .reduce(function(a, m){ return a + numero(m.valor); }, 0);
    const sangrias = movimentos.filter(function(m){ return m.tipo === "sangria"; })
        .reduce(function(a, m){ return a + numero(m.valor); }, 0);

    const porFormaPagamento = {};
    vendas.forEach(function(v){
        acumularPagamentosVendaResumo(porFormaPagamento, v);
    });

    base.fechamentosCaixa.push({
        id: gerarId("fec"),
        data: agora,
        operador: sessao.usuarioNome || sessao.usuarioLogin,
        operadorLogin: sessao.usuarioLogin,
        sessaoId: sessao.id,
        abertoEm: sessao.abertoEm,
        fechadoEm: agora,
        fechamentoAutomatico: true,
        totalVendas,
        totalCanceladas,
        suprimentos,
        sangrias,
        valorAbertura: numero(sessao.valorAbertura),
        saldo: numero(sessao.valorAbertura) + totalVendas + suprimentos - sangrias,
        quantidadeVendas: vendas.length,
        quantidadeCanceladas: canceladas.length,
        quantidadeMovimentos: movimentos.length,
        porFormaPagamento
    });

    const idx = base.sessoesCode.findIndex(function(s){ return s.id === sessao.id; });
    if(idx >= 0){
        base.sessoesCode[idx].status = "fechado";
        base.sessoesCode[idx].fechadoEm = agora;
        base.sessoesCode[idx].fechamentoAutomatico = true;
    }

    salvarBase(base);

    // Informar ao usuário que sessão anterior foi fechada
    const el = document.getElementById("aberturaSessaoAnterior");
    const txt = document.getElementById("aberturaSessaoAnteriorTexto");
    if(el && txt){
        const dt = new Date(sessao.abertoEm).toLocaleString("pt-BR");
        txt.textContent = `Sessão de ${dt} foi fechada automaticamente (${vendas.length} venda(s) · ${formatarMoedaRS(totalVendas)}).`;
        el.style.display = "block";
    }
}

// Exibe o modal obrigatório de abertura de caixa.
function _exibirModalAberturaCaixa(usuario){
    const titulo = document.getElementById("aberturaCaixaTitulo");
    const info   = document.getElementById("aberturaOperadorInfo");
    if(titulo) titulo.textContent = "Abertura de Caixa";
    if(info)   info.innerHTML = `<span>Usuário: <strong>${escapar(usuario.nome || usuario.login || "Supervisor")}</strong></span>`;

    const overlay = document.getElementById("overlayAberturaCaixa");
    const modal   = document.getElementById("modalAberturaCaixa");
    if(overlay) overlay.style.display = "flex";
    if(modal){
        modal.style.display = "flex";
        modal.removeAttribute("aria-hidden");
    }
    document.getElementById("valorAberturaCode")?.focus();
}

// Oculta o modal de abertura de caixa.
function _ocultarModalAberturaCaixa(){
    const overlay = document.getElementById("overlayAberturaCaixa");
    const modal   = document.getElementById("modalAberturaCaixa");
    if(overlay) overlay.style.display = "none";
    if(modal){
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }
    const el = document.getElementById("aberturaSessaoAnterior");
    if(el) el.style.display = "none";
}

// Confirma a abertura de uma nova sessão de caixa.
function confirmarAberturaCaixa(){
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const login   = usuario.login || "ADM";
    const valorStr = document.getElementById("valorAberturaCode")?.value || "";
    const valorAbertura = valorStr.trim() ? numero(valorStr) : 0;
    const base = obterBase();

    const sessao = {
        id: gerarId("ses"),
        usuarioLogin: login,
        usuarioNome:  usuario.nome || login,
        abertoEm:     new Date().toISOString(),
        fechadoEm:    null,
        valorAbertura,
        status:       "aberto"
    };

    base.sessoesCode.push(sessao);
    salvarBase(base);
    chamarPdvApi("abrirCaixa", [sessao]);

    sessaoCaixaAtual = sessao;
    _ocultarModalAberturaCaixa();

    atualizarOperadorLogadoPdv();
    prepararCampoProduto();
}

// Renderiza os orçamentos emitidos na sessão dentro do fechamento.
function _renderizarOrcamentosFechamento(){
    const base = obterBase();
    const sid = sessaoCaixaAtual?.id || null;
    const lista = (base.orcamentos || []).filter(function(o){
        return sid ? o.sessaoId === sid : true;
    });

    const secao = document.getElementById("fechamentoSecaoOrcamentos");
    const destino = document.getElementById("fechamentoListaOrcamentos");
    if(!secao || !destino) return;

    if(lista.length === 0){
        secao.style.display = "none";
        return;
    }

    secao.style.display = "";
    destino.innerHTML = lista.map(function(orc){
        const data = new Date(orc.data).toLocaleString("pt-BR");
        const cliente = orc.cliente?.nome || "Consumidor";
        return `
            <div class="fechamento-orcamento-linha">
                <span>N° ${orc.numero}</span>
                <span>${escapar(cliente)}</span>
                <span>${data}</span>
                <span>${orc.itens.length} item(ns)</span>
                <strong>${formatarMoedaRS(orc.total)}</strong>
            </div>
        `;
    }).join("");
}

