// pdv-vendas.js
// Menu de vendas registradas/canceladas, devolução/troca, entregas, orçamentos e importação de pedido de venda.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Rola/foca a seção de entregas dentro do painel.
function focarEntregasPdv(){
    if(carrinhoVenda.length > 0){
        abrirEntregaVendaAtualPdv();
        return;
    }

    abrirParametrosCaixaPdv();
    setTimeout(function() {
        document.getElementById("btnRegistrarEntregaPdv")?.focus();
    }, 80);
}

// Abre o painel de devolução/cancelamento de vendas.
function abrirDevolucaoVendasPdv(){
    fecharPainelOpcoesPdv();
    _devVendaSelecionada = null;
    _devProdutoTrocaSel  = null;
    _devQtdTroca         = 1;

    _devExibir("painelDevolucaoPdv");
    document.getElementById("overlayDevolucaoPdv")?.classList.add("ativo");

    var busca = document.getElementById("buscaVendaDevolucao");
    if(busca){ busca.value = ""; }
    _renderizarListaVendasDevolucao("");
    setTimeout(function(){ busca?.focus(); }, 120);
}

// Fecha o painel de devolução.
function fecharDevolucaoPdv(){
    ["painelDevolucaoPdv","painelDevolucaoDetalhePdv","painelTrocaProdutoPdv"].forEach(function(id){
        document.getElementById(id)?.classList.remove("aberto");
    });
    var overlay = document.getElementById("overlayDevolucaoPdv");
    if(overlay){ overlay.classList.remove("ativo"); }
    _devVendaSelecionada = null;
    _devProdutoTrocaSel  = null;
}

// Auxilia a checar se uma venda deve ser exibida na lista de devolução.
function _devExibir(id){
    ["painelDevolucaoPdv","painelDevolucaoDetalhePdv","painelTrocaProdutoPdv"].forEach(function(pid){
        document.getElementById(pid)?.classList.remove("aberto");
    });
    document.getElementById(id)?.classList.add("aberto");
}

// Filtra a lista de vendas do painel de devolução.
function filtrarListaVendaDevolucao(q){
    _renderizarListaVendasDevolucao(q || "");
}

// Renderiza a lista de vendas filtradas para devolução.
function _renderizarListaVendasDevolucao(query){
    var base  = obterBase();
    var todas = (base.vendas || []).slice().reverse();
    var q     = (query || "").toLowerCase().trim();

    // Filtrar: somente vendas com itens ainda devolvíveis
    var vendas = todas.filter(function(v){ return _vendaTemItensDevolviveis(v.id, base); });

    if(q){
        vendas = vendas.filter(function(v){
            return (v.cliente?.nome || "").toLowerCase().includes(q)
                || (v.id           || "").toLowerCase().includes(q)
                || (String(v.data) || "").includes(q)
                || (v.nfceNumero ? String(v.nfceNumero) : "").includes(q);
        });
    }

    var el = document.getElementById("listaVendasDevolucao");
    if(!el) return;

    if(!vendas.length){
        el.innerHTML = '<p class="dev-vazio">Nenhuma venda disponível para devolução.</p>';
        return;
    }

    el.innerHTML = vendas.map(function(venda){
        var dt    = venda.data ? new Date(venda.data).toLocaleString("pt-BR") : "—";
        var cli   = venda.cliente?.nome || "Consumidor Final";
        var mapa  = _qtdRestanteDevolver(venda.id, base);
        var qtdRest = Object.values(mapa).filter(function(q){ return q > 0; }).length;
        var qtdTotal = (venda.itens || []).length;
        var parcial   = qtdRest < qtdTotal;
        var num   = venda.nfceNumero ? ("NFC-e #" + venda.nfceNumero) : venda.id.slice(-8).toUpperCase();
        var tagParcial = parcial
            ? '<span class="dev-tag-parcial">Devolução parcial</span>'
            : "";
        return '<div class="dev-venda-card">'
            + '<div class="dev-venda-info">'
            + '<strong>' + escapar(cli) + '</strong>'
            + '<span class="dev-venda-num">' + num + '</span>'
            + '<span class="dev-venda-dt">' + dt + '</span>'
            + '<span class="dev-venda-itens">' + qtdRest + '/' + qtdTotal + ' item(s) disponíveis' + tagParcial + '</span>'
            + '</div>'
            + '<div class="dev-venda-total">' + formatarMoedaRS(venda.total) + '</div>'
            + '<div class="dev-venda-acoes">'
            + '<button type="button" class="dev-btn-cancelar-venda"'
            + ' onclick="cancelarVendaDoPainel(\'' + escapar(venda.id) + '\')">Cancelar</button>'
            + '<button type="button" class="dev-btn-devolver-venda"'
            + ' onclick="abrirDetalhesDevolucao(\'' + escapar(venda.id) + '\')">Devolver →</button>'
            + '</div>'
            + '</div>';
    }).join("");
}

// Cancela uma venda diretamente pelo painel de devolução.
function cancelarVendaDoPainel(id){
    const base   = obterBase();
    const venda  = base.vendas.find(function(v){ return v.id === id; });

    if(!usuarioTemPermissaoSistema("cancelarVendas")){
        solicitarOuBloquear("cancelarVendas", "Cancelar venda " + id, venda?.total ?? null, "Sem permissão para cancelar vendas.");
        return;
    }

    if(!venda){ mostrarAvisoSistema("Venda não encontrada.", "erro"); return; }

    const motivo = prompt(`Cancelar venda de ${formatarMoedaRS(venda.total)} (${venda.cliente?.nome || "Consumidor"})?\n\nInforme o motivo:`);
    if(motivo === null) return;

    const idx = base.vendas.findIndex(function(v){ return v.id === id; });
    const cancelada = Object.assign({}, venda, {
        canceladaEm: new Date().toISOString(),
        motivoCancelamento: motivo.trim() || "Sem motivo"
    });
    base.vendas.splice(idx, 1);
    base.vendasCanceladas.push(cancelada);

    registrarEventoCaixaNaBase(base, "Venda cancelada via Devolução",
        `Venda ${venda.id} | ${formatarMoedaRS(venda.total)} | ${cancelada.motivoCancelamento}`,
        { vendaId: venda.id, total: venda.total, motivo: cancelada.motivoCancelamento });

    cancelarContaReceberDaVenda(base, venda.id);
    devolverEstoque(base, venda.itens || []);
    salvarBase(base);
    carregarSugestoesProdutos();

    mostrarAvisoSistema("Venda cancelada com sucesso.", "ok");
    _renderizarListaVendasDevolucao(document.getElementById("buscaVendaDevolucao")?.value || "");
}

// Abre o detalhe de itens de uma venda para devolução.
function abrirDetalhesDevolucao(id){
    const base  = obterBase();
    const venda = base.vendas.find(function(v){ return v.id === id; });
    if(!venda){ mostrarAvisoSistema("Venda não encontrada.", "erro"); return; }

    _devVendaSelecionada = venda;

    // Título
    const num = venda.nfceNumero ? ("NFC-e #" + venda.nfceNumero) : venda.id.slice(-8).toUpperCase();
    const el  = document.getElementById("tituloPainelDevolucaoDetalhe");
    if(el) el.textContent = num + " — " + formatarMoedaRS(venda.total);

    // Resumo
    const resumoEl = document.getElementById("devVendaResumo");
    if(resumoEl){
        const dt  = venda.data ? new Date(venda.data).toLocaleString("pt-BR") : "—";
        const cli = venda.cliente?.nome || "Consumidor Final";
        resumoEl.innerHTML = `
            <span><strong>${escapar(cli)}</strong></span>
            <span>${dt} · ${venda.pagamento || "—"}</span>`;
    }

    // Itens
    _renderizarItensDevolucao(venda.itens || []);

    _devExibir("painelDevolucaoDetalhePdv");
}

// Volta da tela de detalhe para a lista de devolução.
function voltarListaDevolucao(){
    _devVendaSelecionada = null;
    _devExibir("painelDevolucaoPdv");
}

// Renderiza os itens devolvíveis de uma venda.
function _renderizarItensDevolucao(itens){
    var el = document.getElementById("itensDevolucaoLista");
    if(!el) return;

    if(!itens.length){
        el.innerHTML = '<p class="dev-vazio">Esta venda não tem itens.</p>';
        return;
    }

    var base  = obterBase();
    var mapa  = _qtdRestanteDevolver(_devVendaSelecionada.id, base);

    el.innerHTML = itens.map(function(item, idx){
        var qtdOrig  = numero(item.qtd);
        var qtdDisp  = mapa[item.id] !== undefined ? mapa[item.id] : qtdOrig;
        var jaDevolvida = qtdOrig - qtdDisp;
        var nome     = escapar(item.descricao || item.nome || "Produto");
        var preco    = numero(item.precoUnitario || item.preco || 0);
        var esgotado = qtdDisp <= 0;

        var tagJaDev = jaDevolvida > 0 && !esgotado
            ? ' <span class="dev-tag-parcial">−' + jaDevolvida + ' devolvido(s)</span>'
            : "";
        var tagEsg = esgotado
            ? '<span class="dev-tag-esgotado">Já devolvido</span>'
            : "";

        return '<label class="dev-item-linha' + (esgotado ? " dev-item-esgotado" : "") + '" data-item-idx="' + idx + '">'
            + '<input type="checkbox" class="dev-item-check" data-item-idx="' + idx + '"'
            + (esgotado ? ' disabled' : '')
            + ' onchange="_atualizarTotalDevolucao()">'
            + '<div class="dev-item-info">'
            + '<strong>' + nome + tagEsg + '</strong>'
            + '<small>Vendido: ' + qtdOrig + (jaDevolvida > 0 ? tagJaDev : "") + ' · Disponível: ' + qtdDisp + '</small>'
            + '</div>'
            + '<div class="dev-item-qtd">'
            + '<input type="number" class="dev-item-qtd-input" data-item-idx="' + idx + '"'
            + ' data-max="' + qtdDisp + '"'
            + ' min="1" max="' + qtdDisp + '" step="1" value="' + qtdDisp + '"'
            + (esgotado ? ' disabled' : '')
            + ' onchange="_atualizarTotalDevolucao()" onclick="event.stopPropagation()">'
            + '</div>'
            + '<div class="dev-item-subtotal" data-subtotal-idx="' + idx + '">'
            + formatarMoedaRS(qtdDisp * preco)
            + '</div>'
            + '</label>';
    }).join("");

    _atualizarTotalDevolucao();
}

// Recalcula o total dos itens selecionados para devolução.
function _atualizarTotalDevolucao(){
    if(!_devVendaSelecionada) return;
    const itens = _devVendaSelecionada.itens || [];
    let total = 0;

    document.querySelectorAll(".dev-item-check:checked").forEach(function(chk){
        var idx   = parseInt(chk.dataset.itemIdx, 10);
        var item  = itens[idx];
        if(!item) return;
        var qtdEl = document.querySelector(".dev-item-qtd-input[data-item-idx=\"" + idx + "\"]");
        var max   = numero(qtdEl?.dataset.max || item.qtd);
        var qtd   = Math.min(Math.max(1, numero(qtdEl?.value || 1)), max);
        var preco = numero(item.precoUnitario || item.preco || 0);
        total += qtd * preco;

        var subEl = document.querySelector("[data-subtotal-idx=\"" + idx + "\"]");
        if(subEl) subEl.textContent = formatarMoedaRS(qtd * preco);
    });

    const el = document.getElementById("devTotalSelecionado");
    if(el) el.textContent = formatarMoedaRS(total);
}

// Coleta os itens marcados para devolução.
function _coletarItensDevolucaoSelecionados(){
    if(!_devVendaSelecionada) return [];
    const itens = _devVendaSelecionada.itens || [];
    const selecionados = [];

    document.querySelectorAll(".dev-item-check:checked").forEach(function(chk){
        const idx  = parseInt(chk.dataset.itemIdx, 10);
        const item = itens[idx];
        if(!item) return;
        const qtdEl = document.querySelector(`.dev-item-qtd-input[data-item-idx="${idx}"]`);
        const qtd   = Math.min(numero(qtdEl?.value || 1), numero(item.qtd));
        selecionados.push(Object.assign({}, item, { qtd, qtdDevolvida: qtd }));
    });

    return selecionados;
}

// Confirma o tipo de devolução escolhido (estoque/troca/vale).
function confirmarDevolucaoPdv(tipo){
    const itensSel = _coletarItensDevolucaoSelecionados();
    if(!itensSel.length){
        mostrarAvisoSistema("Selecione ao menos um item para devolver.", "erro");
        return;
    }

    if(tipo === "estoque")  _executarDevolucaoEstoque(itensSel);
    if(tipo === "vale")     _executarDevolucaoVale(itensSel);
    if(tipo === "troca")    _abrirSelecaoProdutoTroca(itensSel);
}

// Soma a quantidade de itens selecionados.
function _totalItensSel(itens){
    return itens.reduce(function(s, i){
        return s + numero(i.qtd) * numero(i.precoUnitario || i.preco || 0);
    }, 0);
}

// Executa a devolução ao estoque dos itens selecionados.
function _executarDevolucaoEstoque(itensSel){
    const base   = obterBase();
    const agora  = new Date().toISOString();
    const total  = _totalItensSel(itensSel);

    if(!Array.isArray(base.devolucoes)) base.devolucoes = [];

    // Devolver estoque de cada item
    itensSel.forEach(function(item){
        const prod = base.mercadorias.find(function(m){ return m.id === item.id; });
        if(prod && obterConfiguracoesSistema().controleEstoque !== false){
            prod.estoque = numero(prod.estoque) + numero(item.qtd);
            prod.atualizadoEm = agora;
        }
    });

    const dev = {
        id:           gerarId("dev"),
        vendaId:      _devVendaSelecionada.id,
        data:         agora,
        tipo:         "estoque",
        itens:        itensSel,
        totalDevolvido: total,
        sessaoId:     sessaoCaixaAtual?.id || null,
        operadorLogin: (window.AuthSistema?.usuarioAtual?.() || {}).login || "ADM"
    };
    base.devolucoes.push(dev);

    registrarEventoCaixaNaBase(base, "Devolução ao estoque",
        `${itensSel.length} item(s) · ${formatarMoedaRS(total)} | Venda ${_devVendaSelecionada.id}`,
        { devolucaoId: dev.id, vendaId: dev.vendaId });

    salvarBase(base);
    carregarSugestoesProdutos();
    mostrarAvisoSistema(`Devolução registrada — ${formatarMoedaRS(total)} voltou ao estoque.`, "ok");
    fecharDevolucaoPdv();
}

// Executa a devolução gerando um vale-crédito.
function _executarDevolucaoVale(itensSel){
    const base   = obterBase();
    const agora  = new Date().toISOString();
    const total  = _totalItensSel(itensSel);

    if(!Array.isArray(base.devolucoes))   base.devolucoes   = [];
    if(!Array.isArray(base.valesCredito)) base.valesCredito = [];

    const codigo = "VALE-" + agora.slice(0,10).replace(/-/g,"") + "-" + Math.floor(Math.random()*9000+1000);

    const vale = {
        id:        gerarId("val"),
        codigo,
        valor:     total,
        saldo:     total,
        geradoEm:  agora,
        vendaOrigemId: _devVendaSelecionada.id,
        status:    "ativo"
    };
    base.valesCredito.push(vale);

    const dev = {
        id:            gerarId("dev"),
        vendaId:       _devVendaSelecionada.id,
        data:          agora,
        tipo:          "vale",
        itens:         itensSel,
        totalDevolvido: total,
        valeId:        vale.id,
        valeCodigo:    codigo,
        sessaoId:      sessaoCaixaAtual?.id || null,
        operadorLogin: (window.AuthSistema?.usuarioAtual?.() || {}).login || "ADM"
    };
    base.devolucoes.push(dev);

    registrarEventoCaixaNaBase(base, "Vale de crédito gerado",
        `Código ${codigo} · ${formatarMoedaRS(total)} | Venda ${_devVendaSelecionada.id}`,
        { valeId: vale.id, codigo, total });

    salvarBase(base);
    mostrarAvisoSistema("Vale gerado: " + codigo + " — " + formatarMoedaRS(total), "ok");
    fecharDevolucaoPdv();
    setTimeout(function(){ imprimirValePdv(vale); }, 200);
}

// Abre a tela de seleção de produto para troca.
function _abrirSelecaoProdutoTroca(itensSel){
    _devProdutoTrocaSel = { itens: itensSel, produtoEscolhido: null };
    const total = _totalItensSel(itensSel);

    const credEl = document.getElementById("devCreditoTroca");
    if(credEl) credEl.textContent = `Crédito disponível: ${formatarMoedaRS(total)}`;

    const busca = document.getElementById("buscaProdutoTroca");
    if(busca){ busca.value = ""; }

    const btnConf = document.getElementById("btnConfirmarTrocaProduto");
    if(btnConf){ btnConf.disabled = true; }

    const textoConf = document.getElementById("textoConfirmarTroca");
    if(textoConf) textoConf.textContent = "Selecione um produto";

    _renderizarProdutosTroca("");
    _devExibir("painelTrocaProdutoPdv");
    setTimeout(function(){ busca?.focus(); }, 120);
}

// Volta da seleção de produto de troca para o detalhe da devolução.
function voltarDetalheDeVoltar(){
    _devProdutoTrocaSel = null;
    _devExibir("painelDevolucaoDetalhePdv");
}

// Filtra os produtos disponíveis para troca.
function filtrarProdutosTroca(q){
    _renderizarProdutosTroca(q || "");
}

// Calcula a diferença de preço entre o item devolvido e o de troca.
function _calcDiferencaTroca(precoProduto, qtd){
    if(!_devProdutoTrocaSel) return 0;
    var credito  = _totalItensSel(_devProdutoTrocaSel.itens);
    var totalProd = numero(precoProduto) * (qtd || _devQtdTroca || 1);
    return Math.round((totalProd - credito) * 100) / 100;
}

// Calcula a quantidade ainda não devolvida de uma venda.
function _qtdRestanteDevolver(vendaId, base){
    var venda = (base.vendas || []).find(function(v){ return v.id === vendaId; });
    if(!venda) return {};
    var mapa = {};
    (venda.itens || []).forEach(function(item){
        mapa[item.id] = numero(item.qtd);
    });
    // Subtrair devoluções já registradas para esta venda
    (base.devolucoes || []).filter(function(d){ return d.vendaId === vendaId; })
        .forEach(function(dev){
            (dev.itens || []).forEach(function(it){
                if(mapa[it.id] !== undefined){
                    mapa[it.id] = Math.max(0, mapa[it.id] - numero(it.qtd));
                }
            });
        });
    return mapa;
}

// Verifica se a venda ainda possui itens devolvíveis.
function _vendaTemItensDevolviveis(vendaId, base){
    var mapa = _qtdRestanteDevolver(vendaId, base);
    return Object.values(mapa).some(function(q){ return q > 0; });
}

// Renderiza a lista de produtos disponíveis para troca.
function _renderizarProdutosTroca(query){
    var base     = obterBase();
    var produtos = (base.mercadorias || []).filter(function(m){ return m.ativo !== false; });
    var q        = (query || "").toLowerCase().trim();

    var filtrados = q ? produtos.filter(function(p){
        return (p.descricao || "").toLowerCase().includes(q)
            || (p.codigo    || "").toLowerCase().includes(q)
            || (p.ean       || "").includes(q);
    }) : produtos;

    var el = document.getElementById("listaProdutosTroca");
    if(!el) return;

    if(!filtrados.length){
        el.innerHTML = '<p class="dev-vazio">Nenhum produto encontrado.</p>';
        return;
    }

    el.innerHTML = filtrados.slice(0, 60).map(function(p){
        var ativo     = _devProdutoTrocaSel?.produtoEscolhido?.id === p.id;
        var preco     = numero(p.preco || p.precoVenda || 0);
        var dif       = _calcDiferencaTroca(preco);
        var estStr    = numero(p.estoque) > 0
            ? "Estoque: " + p.estoque
            : '<span class="dev-sem-estoque">Sem estoque</span>';
        var badge;
        if(dif > 0.001){
            badge = '<span class="dev-badge dev-badge-pagar">+ ' + formatarMoedaRS(dif) + '</span>';
        } else if(dif < -0.001){
            badge = '<span class="dev-badge dev-badge-vale">Vale ' + formatarMoedaRS(Math.abs(dif)) + '</span>';
        } else {
            badge = '<span class="dev-badge dev-badge-exato">Sem diferença</span>';
        }
        return '<div class="dev-produto-card' + (ativo ? " selecionado" : "") + '"'
            + ' onclick="selecionarProdutoTroca(\'' + escapar(p.id) + '\')">'
            + '<div class="dev-produto-info">'
            + '<strong>' + escapar(p.descricao || "Produto") + '</strong>'
            + '<small>' + escapar(p.codigo || "") + ' ' + estStr + '</small>'
            + badge
            + '</div>'
            + '<div class="dev-produto-preco">' + formatarMoedaRS(preco) + '</div>'
            + '</div>';
    }).join("");
}

// Ajusta a quantidade do produto escolhido para troca.
function ajustarQtdTroca(delta){
    _devQtdTroca = Math.max(1, (_devQtdTroca || 1) + delta);
    var el = document.getElementById("devTrocaQtdValor");
    if(el) el.textContent = _devQtdTroca;
    _atualizarBotaoTroca();
    _renderizarProdutosTroca(document.getElementById("buscaProdutoTroca")?.value || "");
}

// Habilita/desabilita o botão de confirmar troca.
function _atualizarBotaoTroca(){
    if(!_devProdutoTrocaSel?.produtoEscolhido) return;
    var prod  = _devProdutoTrocaSel.produtoEscolhido;
    var preco = numero(prod.preco || prod.precoVenda || 0);
    var dif   = _calcDiferencaTroca(preco, _devQtdTroca);
    var total = preco * _devQtdTroca;

    var btn  = document.getElementById("btnConfirmarTrocaProduto");
    var txt  = document.getElementById("textoConfirmarTroca");
    var tot  = document.getElementById("devTrocaQtdTotal");

    if(tot) tot.textContent = formatarMoedaRS(total);

    var cls = "dev-btn-acao dev-btn-confirmar-troca ";
    if(dif > 0.001){
        if(txt) txt.textContent = "Cliente paga diferença de " + formatarMoedaRS(dif);
        if(btn) btn.className = cls + "dev-pagar-dif";
    } else if(dif < -0.001){
        if(txt) txt.textContent = "Troca + gerar vale de " + formatarMoedaRS(Math.abs(dif));
        if(btn) btn.className = cls + "dev-vale";
    } else {
        if(txt) txt.textContent = "Confirmar troca — sem diferença";
        if(btn) btn.className = cls + "dev-estoque";
    }
}

// Seleciona o produto que será usado na troca.
function selecionarProdutoTroca(produtoId){
    var base = obterBase();
    var prod = base.mercadorias.find(function(p){ return p.id === produtoId; });
    if(!prod || !_devProdutoTrocaSel) return;

    _devProdutoTrocaSel.produtoEscolhido = prod;
    _devQtdTroca = 1;

    // Mostrar stepper de quantidade
    var row = document.getElementById("devTrocaQtdRow");
    var qtdEl = document.getElementById("devTrocaQtdValor");
    if(row)  row.style.display  = "flex";
    if(qtdEl) qtdEl.textContent = "1";

    var btn = document.getElementById("btnConfirmarTrocaProduto");
    if(btn) btn.disabled = false;

    _atualizarBotaoTroca();
    _renderizarProdutosTroca(document.getElementById("buscaProdutoTroca")?.value || "");
}

// Confirma a troca de produto.
function finalizarTrocaProduto(){
    if(!_devProdutoTrocaSel?.produtoEscolhido || !_devVendaSelecionada) return;

    var base     = obterBase();
    var agora    = new Date().toISOString();
    var itensSel = _devProdutoTrocaSel.itens;
    var prod     = _devProdutoTrocaSel.produtoEscolhido;
    var credito  = _totalItensSel(itensSel);
    var precoProd = numero(prod.preco || prod.precoVenda || 0);
    var dif      = Math.round((precoProd - credito) * 100) / 100;

    if(!Array.isArray(base.devolucoes))   base.devolucoes   = [];
    if(!Array.isArray(base.valesCredito)) base.valesCredito = [];

    // Devolver estoque dos itens originais
    itensSel.forEach(function(item){
        var p = base.mercadorias.find(function(m){ return m.id === item.id; });
        if(p && obterConfiguracoesSistema().controleEstoque !== false){
            p.estoque = numero(p.estoque) + numero(item.qtd);
        }
    });

    var qtd      = _devQtdTroca || 1;
    var dif      = Math.round((precoProd * qtd - credito) * 100) / 100;

    var valeGerado = null;
    var precoNoCarrinho;
    var descricaoEvento;

    if(dif > 0.001){
        // Produto mais caro: cliente paga diferença → preço no carrinho = diferença / qtd
        precoNoCarrinho  = Math.round((dif / qtd) * 100) / 100;
        descricaoEvento  = "Troca: cliente paga diferença de " + formatarMoedaRS(dif);
    } else if(dif < -0.001){
        // Produto mais barato: produto grátis + gerar vale com o restante
        precoNoCarrinho  = 0;
        var valorVale    = Math.abs(dif);
        var codigo       = "VALE-" + agora.slice(0,10).replace(/-/g,"") + "-" + Math.floor(Math.random()*9000+1000);
        valeGerado       = {
            id:            gerarId("val"),
            codigo:        codigo,
            valor:         valorVale,
            saldo:         valorVale,
            geradoEm:      agora,
            vendaOrigemId: _devVendaSelecionada.id,
            status:        "ativo"
        };
        base.valesCredito.push(valeGerado);
        descricaoEvento = "Troca: produto(s) grátis + vale " + formatarMoedaRS(valorVale) + " (" + codigo + ")";
    } else {
        // Troca exata: sem diferença
        precoNoCarrinho  = 0;
        descricaoEvento  = "Troca exata sem diferença";
    }

    var dev = {
        id:               gerarId("dev"),
        vendaId:          _devVendaSelecionada.id,
        data:             agora,
        tipo:             "troca",
        itens:            itensSel,
        credito:          credito,
        totalDevolvido:   credito,
        produtoTrocaId:   prod.id,
        produtoTrocaNome: prod.descricao || "Produto",
        precoProdutoTroca: precoProd,
        diferenca:        dif,
        precoNoCarrinho:  precoNoCarrinho,
        valeId:           valeGerado ? valeGerado.id   : null,
        valeCodigo:       valeGerado ? valeGerado.codigo : null,
        sessaoId:         sessaoCaixaAtual?.id || null,
        operadorLogin:    (window.AuthSistema?.usuarioAtual?.() || {}).login || "ADM"
    };
    base.devolucoes.push(dev);

    registrarEventoCaixaNaBase(base, "Troca de produto", descricaoEvento, { devolucaoId: dev.id });
    salvarBase(base);
    carregarSugestoesProdutos();
    fecharDevolucaoPdv();

    // Mensagem e ação pós-fechamento
    setTimeout(function(){
        var p = obterBase().mercadorias.find(function(m){ return m.id === prod.id; });
        if(!p) return;

        adicionarProdutoAoCarrinho({ produto: p, quantidade: qtd, precoUnitario: precoNoCarrinho });

        if(dif > 0.001){
            mostrarAvisoSistema(
                "\"" + prod.descricao + "\" (×" + qtd + ") adicionado — cliente paga diferença de " + formatarMoedaRS(dif) + ".",
                "ok"
            );
        } else if(valeGerado){
            mostrarAvisoSistema(
                "\"" + prod.descricao + "\" grátis. Vale: " + valeGerado.codigo + " (" + formatarMoedaRS(valeGerado.valor) + ").",
                "ok"
            );
            imprimirValePdv(valeGerado);
        } else {
            mostrarAvisoSistema("Troca exata — \"" + prod.descricao + "\" (×" + qtd + ") adicionado sem custo.", "ok");
        }

        atualizarResumoVenda();
    }, 250);
}

// Acumula os pagamentos de uma venda para exibição resumida.
function acumularPagamentosVendaResumo(destino, venda){
    if(Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0){
        venda.pagamentos.forEach(function(pagamento) {
            const forma = pagamento.forma || "Outros";
            destino[forma] = (destino[forma] || 0) + numero(pagamento.valor);
        });
        return;
    }

    const forma = venda.pagamento || "Outros";
    destino[forma] = (destino[forma] || 0) + numero(venda.total);
}

// Abre o modal de endereço de entrega da venda atual.
function abrirEntregaVendaAtualPdv(){
    if(carrinhoVenda.length === 0){
        alert("Adicione produtos na venda antes de informar a entrega.");
        const check = document.getElementById("checkEntregaVendaPdv");
        if(check) check.checked = Boolean(entregaVendaPendente);
        entregaFluxoFinalizacaoAtivo = false;
        return;
    }

    const cliente = clienteVenda || {};
    const enderecoCliente = [cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(" - ");
    definirTexto("entregaVendaResumoPdv", carrinhoVenda.length + " item(ns) | Total previsto: " + formatarMoedaRS(calcularTotalVenda()));
    definirValor("entregaVendaDestinatario", entregaVendaPendente?.destinatario || cliente.nome || "");
    definirValor("entregaVendaTelefone", entregaVendaPendente?.telefone || cliente.telefone || "");
    definirValor("entregaVendaEndereco", entregaVendaPendente?.endereco || enderecoCliente || "");
    definirValor("entregaVendaNumero", entregaVendaPendente?.numero || "");
    definirValor("entregaVendaComplemento", entregaVendaPendente?.complemento || "");
    definirValor("entregaVendaObservacoes", entregaVendaPendente?.observacoes || "");
    definirValor("entregaVendaBuscaCliente", "");
    ocultarListaClientesEntregaPdv();
    abrirModalPdv("modalEntregaVendaPdv");
    document.getElementById("entregaVendaDestinatario")?.focus();
}

// Confirma os dados de entrega da venda atual.
function confirmarEntregaVendaAtualPdv(){
    const endereco = valorCampo("entregaVendaEndereco");

    if(!endereco){
        alert("Informe o endereco da entrega.");
        document.getElementById("entregaVendaEndereco")?.focus();
        return;
    }

    entregaVendaPendente = {
        destinatario: valorCampo("entregaVendaDestinatario") || clienteVenda?.nome || "Consumidor",
        telefone: valorCampo("entregaVendaTelefone"),
        endereco,
        numero: valorCampo("entregaVendaNumero"),
        complemento: valorCampo("entregaVendaComplemento"),
        observacoes: valorCampo("entregaVendaObservacoes"),
        criadoEm: new Date().toISOString()
    };
    fecharModaisPdv();
    atualizarResumoEntregaFinalizacaoPdv();
    if(entregaFluxoFinalizacaoAtivo){
        entregaFluxoFinalizacaoAtivo = false;
        abrirModalPdv("modalFinalizarPdv");
        return;
    }
    notificar("Entrega vinculada a venda.", "sucesso");
    prepararCampoProduto();
}

// Cancela a entrega da venda atual.
function cancelarEntregaVendaAtualPdv(){
    fecharModaisPdv();
    if(entregaFluxoFinalizacaoAtivo){
        entregaFluxoFinalizacaoAtivo = false;
        atualizarResumoEntregaFinalizacaoPdv();
        abrirModalPdv("modalFinalizarPdv");
        return;
    }
    prepararCampoProduto();
}

// Renderiza a lista de clientes para preencher a entrega.
function renderizarClientesEntregaPdv(){
    const lista = document.getElementById("entregaVendaListaClientes");
    const busca = normalizar(document.getElementById("entregaVendaBuscaCliente")?.value || "");

    if(!lista) return;

    if(busca.length < 2){
        ocultarListaClientesEntregaPdv();
        return;
    }

    const clientes = (obterBase().clientes || []).filter(function(cliente) {
        const texto = [
            cliente.nome,
            cliente.cpf,
            cliente.cpfCnpj,
            cliente.cpf_cnpj,
            cliente.cnpj,
            cliente.telefone,
            cliente.email,
            cliente.endereco,
            cliente.bairro,
            cliente.cidade
        ].join(" ");

        return cliente.ativo !== false && normalizar(texto).includes(busca);
    }).slice(0, 8);

    if(clientes.length === 0){
        lista.innerHTML = `<div class="entrega-cliente-vazio">Nenhum cliente encontrado.</div>`;
        lista.classList.add("ativo");
        lista.setAttribute("aria-hidden", "false");
        return;
    }

    lista.innerHTML = clientes.map(function(cliente) {
        const documento = cliente.cpf || cliente.cpfCnpj || cliente.cpf_cnpj || cliente.cnpj || "Sem CPF/CNPJ";
        return `
            <button type="button" class="entrega-cliente-item" data-cliente-entrega="${escapar(cliente.id)}">
                <strong>${escapar(cliente.nome || "Cliente sem nome")}</strong>
                <span>${escapar(documento)} | ${escapar(cliente.telefone || "Sem telefone")}</span>
            </button>
        `;
    }).join("");

    lista.querySelectorAll("[data-cliente-entrega]").forEach(function(botao) {
        botao.addEventListener("mousedown", function(evento) {
            evento.preventDefault();
            selecionarClienteEntregaPdv(botao.dataset.clienteEntrega);
        });
    });

    lista.classList.add("ativo");
    lista.setAttribute("aria-hidden", "false");
}

// Seleciona um cliente para preencher os dados de entrega.
function selecionarClienteEntregaPdv(id){
    const cliente = (obterBase().clientes || []).find(function(item) {
        return item.id === id;
    });

    if(!cliente) return;

    preencherEntregaComClientePdv(cliente);
    definirValor("entregaVendaBuscaCliente", cliente.nome || "");
    ocultarListaClientesEntregaPdv();
    document.getElementById("entregaVendaEndereco")?.focus();
}

// Preenche o formulário de entrega com dados do cliente.
function preencherEntregaComClientePdv(cliente){
    const endereco = [
        cliente.endereco,
        cliente.bairro,
        cliente.cidade,
        cliente.uf || cliente.estado,
        cliente.cep
    ].filter(Boolean).join(" - ");

    definirValor("entregaVendaDestinatario", cliente.nome || "");
    definirValor("entregaVendaTelefone", cliente.telefone || "");
    definirValor("entregaVendaEndereco", endereco);
    definirValor("entregaVendaNumero", cliente.numero || "");
    definirValor("entregaVendaComplemento", cliente.complemento || "");
}

// Oculta a lista de sugestões de cliente da entrega.
function ocultarListaClientesEntregaPdv(){
    const lista = document.getElementById("entregaVendaListaClientes");
    if(!lista) return;

    lista.innerHTML = "";
    lista.classList.remove("ativo");
    lista.setAttribute("aria-hidden", "true");
}

// Formata o endereço de entrega para exibição/impressão.
function formatarEnderecoEntregaPdv(entrega){
    if(!entrega) return "";

    return [
        entrega.endereco,
        entrega.numero,
        entrega.complemento
    ].filter(Boolean).join(" - ");
}

// Registra uma nova entrega.
function registrarEntregaPdv(){
    const base = obterBase();
    const vendaId = prompt("Informe o código da venda para entrega:");

    if(vendaId === null) return;

    const venda = base.vendas.find(function(item) {
        return item.id === vendaId.trim();
    });

    if(!venda){
        alert("Venda não encontrada.");
        return;
    }

    const endereco = prompt("Informe o endereço ou referência da entrega:", venda.cliente?.endereco || "");

    if(endereco === null) return;

    base.entregas.push({
        id: gerarId("ent"),
        vendaId: venda.id,
        cliente: venda.cliente?.nome || "Consumidor",
        valor: numero(venda.total),
        endereco: endereco.trim(),
        status: "pendente",
        data: new Date().toISOString()
    });
    base.eventosCaixa.push({
        id: gerarId("evt"),
        tipo: "Entrega registrada",
        detalhe: `Venda ${venda.id}`,
        data: new Date().toISOString()
    });
    salvarBase(base);
    renderizarEntregasPdv();
    renderizarEventosCaixaPdv();
    alert("Entrega registrada.");
}

// Marca uma entrega como concluída.
function concluirEntregaPdv(id){
    const base = obterBase();
    const entrega = base.entregas.find(function(item) {
        return item.id === id;
    });

    if(!entrega) return;

    entrega.status = "entregue";
    entrega.entregueEm = new Date().toISOString();
    base.eventosCaixa.push({
        id: gerarId("evt"),
        tipo: "Entrega concluída",
        detalhe: `Venda ${entrega.vendaId}`,
        data: new Date().toISOString()
    });
    salvarBase(base);
    renderizarEntregasPdv();
    renderizarEventosCaixaPdv();
}

// Renderiza a lista de entregas do caixa.
function renderizarEntregasPdv(){
    const destino = document.getElementById("listaEntregasPdv");

    if(!destino) return;

    const entregas = obterBase().entregas.slice().reverse();

    if(entregas.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhuma entrega registrada.</div>`;
        return;
    }

    destino.innerHTML = entregas.map(function(entrega) {
        const entregue = entrega.status === "entregue";

        return `
            <div class="venda-pdv-item">
                <div>
                    <strong>${escapar(entrega.cliente)} <span class="status-entrega-pdv ${entregue ? "ok" : ""}">${entregue ? "Entregue" : "Pendente"}</span></strong>
                    <small>Venda ${escapar(entrega.vendaId)} | ${formatarMoedaRS(entrega.valor)} | ${escapar(entrega.endereco || "Sem endereço")}</small>
                </div>
                <div class="venda-pdv-acoes">
                    <button type="button" class="btn-menu-acao" onclick="concluirEntregaPdv('${entrega.id}')" ${entregue ? "disabled" : ""}>Concluir</button>
                </div>
            </div>
        `;
    }).join("");
}

// Abre o modal de importação de pedido de venda.
function abrirModalImportarPedidoPdv(){
    if(obterConfiguracoesSistema().pedidosVendaHabilitado === false){
        notificar("Módulo Pedidos de Venda está desativado nas configurações.", "info");
        return;
    }
    const base = obterBase();
    const pendentes = (base.pedidosVenda || []).filter(function(p){
        return p.status === "AGUARDANDO_PAGAMENTO";
    });
    if(!pendentes.length){
        notificar("Nenhum pedido enviado ao caixa para importar. Pedidos em digitação não aparecem aqui — envie o pedido ao caixa na tela de Pedidos de Venda.", "info");
    }
    const busca = document.getElementById("buscaImportarPedidoPdv");
    if(busca) busca.value = "";
    renderizarResultadosImportarPedidoPdv("");
    abrirModalPdv("modalImportarPedidoPdv");
    setTimeout(function(){ busca?.focus(); }, 60);
}

// Renderiza os pedidos encontrados na busca.
function renderizarResultadosImportarPedidoPdv(termo){
    const destino = document.getElementById("listaImportarPedidoPdv");
    if(!destino) return;

    const base = obterBase();
    const t = normalizar(termo || "");
    const pendentes = (base.pedidosVenda || []).filter(function(p){
        if(p.status !== "AGUARDANDO_PAGAMENTO") return false;
        if(!t) return true;
        const hay = normalizar([p.codigo, p.numero, p.cliente?.nome, p.cliente?.cpf, p.cliente?.telefone].join(" "));
        return hay.includes(t);
    }).sort(function(a, b){ return (b.data || "").localeCompare(a.data || ""); }).slice(0, 40);

    if(!pendentes.length){
        destino.innerHTML = `<div class="vazio-modal">Nenhum pedido encontrado.</div>`;
        return;
    }

    destino.innerHTML = pendentes.map(function(p){
        const dataFmt = p.data ? new Date(p.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
        return `
            <button type="button" class="cliente-pdv-item" onclick="selecionarPedidoParaImportar('${p.id}')">
                <strong>${escapar(p.codigo || p.id)} — ${escapar(p.cliente?.nome || "Consumidor")}</strong>
                <span>${formatarMoedaRS(p.resumo?.valorFinal || 0)} · ${(p.itens || []).length} item(ns) · ${escapar(p.vendedor?.nome || "")} · ${dataFmt}</span>
            </button>
        `;
    }).join("");
}

// Seleciona um pedido para importar ao carrinho.
function selecionarPedidoParaImportar(pedidoId){
    const base = obterBase();
    const pedido = (base.pedidosVenda || []).find(function(p){ return p.id === pedidoId; });
    if(!pedido) return;

    if(pedido.status !== "AGUARDANDO_PAGAMENTO"){
        alert("Este pedido não está mais disponível para importação (só pedidos enviados ao caixa podem ser importados).");
        renderizarResultadosImportarPedidoPdv(document.getElementById("buscaImportarPedidoPdv")?.value || "");
        return;
    }

    if(!pedido.itens || !pedido.itens.length){
        alert("Este pedido não possui itens.");
        return;
    }

    carregarItensPedidoNoCarrinho(pedido);
    pedidoImportadoAtual = { id: pedido.id, codigo: pedido.codigo };

    if(pedido.cliente?.id){
        const clienteBase = base.clientes.find(function(c){ return c.id === pedido.cliente.id; });
        if(clienteBase) clienteVenda = clienteBase;
    }

    fecharModaisPdv();
    notificar("Pedido " + (pedido.codigo || "") + " importado. Confira os itens antes de finalizar.", "sucesso");
    atualizarTela();
    prepararCampoProduto();
}

// Carrega os itens do pedido selecionado no carrinho.
function carregarItensPedidoNoCarrinho(pedido){
    const mercadorias = obterBase().mercadorias;
    (pedido.itens || []).forEach(function(item){
        const produto = mercadorias.find(function(m){ return m.id === item.produtoId; });
        if(!produto) return;
        adicionarProdutoAoCarrinho({
            produto: produto,
            quantidade: numero(item.quantidade) || 1,
            precoUnitario: numero(item.precoUnitario),
            precoOriginal: numero(item.precoUnitario),
            tabelaAplicadaId: null,
            porQuantidade: false
        });
    });
}

// Abre o menu de vendas registradas no caixa.
function abrirMenuVendas(){
    vendaMenuItensAbertaId = null;

    // Datas padrão: dia atual completo
    const hoje = new Date().toISOString().slice(0,10);
    const elIni = document.getElementById("vendaDataIni");
    const elFim = document.getElementById("vendaDataFim");
    if(elIni && !elIni.value) elIni.value = hoje;
    if(elFim && !elFim.value) elFim.value = hoje;

    // Conectar filtros (apenas uma vez)
    ["buscaVendaPdv","vendaDataIni","vendaDataFim"].forEach(function(id){
        const el = document.getElementById(id);
        if(el && !el.dataset.filtroConectado){
            el.addEventListener("input", renderizarMenuVendas);
            el.dataset.filtroConectado = "1";
        }
    });

    abrirAbaMenuPdv("vendas");
    renderizarMenuVendas();
    renderizarVendasCanceladas();
    renderizarMovimentosCaixa();
    abrirModalPdv("modalMenuVendasPdv");
}

// Limpa os filtros de data do menu de vendas para o dia de hoje.
window.limparFiltrosVendas = function(){
    const hoje = new Date().toISOString().slice(0,10);
    const elIni = document.getElementById("vendaDataIni");
    const elFim = document.getElementById("vendaDataFim");
    if(elIni) elIni.value = hoje;
    if(elFim) elFim.value = hoje;
    renderizarMenuVendas();
};

// Renderiza a lista de vendas registradas.
function renderizarMenuVendas(){
    const destino = document.getElementById("listaVendasPdv");
    if(!destino) return;

    const termo = normalizar(document.getElementById("buscaVendaPdv")?.value || "");
    const dtIni = document.getElementById("vendaDataIni")?.value || "";
    const dtFim = document.getElementById("vendaDataFim")?.value || "";

    const vendas = obterBase().vendas
        .filter(function(venda){
            const d = (venda.data || "").slice(0,10);
            if(dtIni && d < dtIni) return false;
            if(dtFim && d > dtFim) return false;
            if(termo){
                const texto = [venda.id, venda.documento, venda.pagamento, venda.cliente?.nome, venda.total].join(" ");
                if(!normalizar(texto).includes(termo)) return false;
            }
            return true;
        })
        .slice()
        .reverse();

    const contador = document.getElementById("vendasContador");
    if(contador) contador.textContent = vendas.length + " venda(s)";

    if(vendas.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhuma venda encontrada para o período selecionado.</div>`;
        return;
    }

    destino.innerHTML = vendas.map(function(venda) {
        const pagamentoResumo = resumoPagamentosVendaRegistradaPdv(venda);
        const itensAbertos = vendaMenuItensAbertaId === venda.id;
        const itensHtml = itensAbertos ? renderizarItensVendaRegistradaPdv(venda) : "";
        const ehNfce = venda.documento === "NFC-e";
        const labelDoc = ehNfce ? "NFC-e" : "Cupom fiscal";
        return `
            <div class="venda-pdv-item venda-pdv-card">
                <div class="venda-pdv-info">
                    <strong>${labelDoc} ${escapar(venda.id)}</strong>
                    <small>${formatarData(venda.data)} | ${escapar(venda.cliente?.nome || "Consumidor")}</small>
                    <div class="venda-pdv-metas">
                        <span>${escapar(pagamentoResumo)}</span>
                        <b>${formatarMoedaRS(venda.total)}</b>
                    </div>
                </div>
                <div class="venda-pdv-acoes">
                    <button type="button" class="btn-menu-acao" onclick="reimprimirVenda('${venda.id}')">Reimprimir</button>
                    <button type="button" class="btn-menu-acao" onclick="verItensVendaRegistrada('${venda.id}')">${itensAbertos ? "Ocultar itens" : "Ver itens"}</button>
                    ${!ehNfce ? `<button type="button" class="btn-menu-acao" onclick="transformarEmNfce('${venda.id}')">Transformar em NFC-e</button>` : ""}
                    <button type="button" class="btn-menu-acao perigo" onclick="cancelarVendaRegistrada('${venda.id}')">Cancelar</button>
                </div>
                ${itensHtml}
            </div>
        `;
    }).join("");
}

// Monta o resumo das formas de pagamento de uma venda registrada.
function resumoPagamentosVendaRegistradaPdv(venda){
    if(Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0){
        return venda.pagamentos.map(function(pagamento) {
            return `${pagamento.forma || "Pagamento"} ${formatarMoedaRS(pagamento.valorRecebido ?? pagamento.valor ?? 0)}`;
        }).join(" + ");
    }

    return venda.pagamento || "Pagamento nao informado";
}

// Renderiza os itens de uma venda registrada.
function renderizarItensVendaRegistradaPdv(venda){
    const itens = venda.itens || [];

    if(itens.length === 0){
        return `<div class="venda-pdv-detalhes"><span>Nenhum item registrado nesta venda.</span></div>`;
    }

    return `
        <div class="venda-pdv-detalhes">
            ${itens.map(function(item) {
                const total = numero(item.total) || (numero(item.qtd) * numero(item.precoUnitario));
                return `
                    <div class="venda-pdv-detalhe-item">
                        <span>${escapar(item.descricao || "Produto")}</span>
                        <small>${formatarQuantidadeItem(item)} x ${formatarMoedaRS(item.precoUnitario)}</small>
                        <strong>${formatarMoedaRS(total)}</strong>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// Abre o detalhe de itens de uma venda registrada.
function verItensVendaRegistrada(id){
    vendaMenuItensAbertaId = vendaMenuItensAbertaId === id ? null : id;
    renderizarMenuVendas();
}

// Cancela uma venda já registrada.
function cancelarVendaRegistrada(id){
    if(!usuarioTemPermissaoSistema("cancelarVendas")){
        const vendaAlvo = obterBase().vendas.find(function(v){ return v.id === id; });
        solicitarOuBloquear("cancelarVendas", "Cancelar venda " + id, vendaAlvo?.total ?? null, "Seu usuário não possui permissão para cancelar vendas registradas.");
        return;
    }

    const motivo = prompt("Informe o motivo do cancelamento da venda:");

    if(motivo === null) return;

    const base = obterBase();
    const indice = base.vendas.findIndex(function(item) {
        return item.id === id;
    });

    if(indice < 0){
        alert("Venda não encontrada.");
        return;
    }

    const venda = base.vendas[indice];
    base.vendas.splice(indice, 1);
    const vendaCancelada = {
        ...venda,
        canceladaEm: new Date().toISOString(),
        motivoCancelamento: motivo.trim() || "Cancelamento sem motivo informado"
    };
    base.vendasCanceladas.push(vendaCancelada);
    registrarEventoCaixaNaBase(base, "Venda cancelada", `Venda ${venda.id} | ${formatarMoedaRS(venda.total)} | ${vendaCancelada.motivoCancelamento}`, {
        vendaId: venda.id,
        operador: venda.usuarioNome || venda.usuarioLogin || "Usuário",
        cliente: venda.cliente?.nome || "Consumidor",
        total: venda.total,
        motivo: vendaCancelada.motivoCancelamento,
        produtos: venda.itens || []
    });
    cancelarContaReceberDaVenda(base, venda.id);
    devolverEstoque(base, venda.itens || []);
    salvarBase(base);
    chamarPdvApi("cancelarVenda", [venda.id, vendaCancelada.motivoCancelamento]);
    carregarSugestoesProdutos();
    renderizarMenuVendas();
    renderizarVendasCanceladas();
    alert("Venda cancelada e movida para a lista de canceladas.");
}

// Renderiza a lista de vendas canceladas.
function renderizarVendasCanceladas(){
    const destino = document.getElementById("listaVendasCanceladasPdv");

    if(!destino) return;

    const vendas = obterBase().vendasCanceladas.slice().reverse();

    if(vendas.length === 0){
        destino.innerHTML = `<div class="vazio-modal">Nenhuma venda cancelada.</div>`;
        return;
    }

    destino.innerHTML = vendas.map(function(venda) {
        return `
            <div class="venda-pdv-item">
                <div>
                    <strong>${escapar(venda.documento || "Venda")} ${escapar(venda.id)}</strong>
                    <small>Cancelada em ${formatarData(venda.canceladaEm)} | ${escapar(venda.cliente?.nome || "Consumidor")} | ${formatarMoedaRS(venda.total)}</small>
                    <small>Motivo: ${escapar(venda.motivoCancelamento || "-")}</small>
                </div>
                <div class="venda-pdv-acoes">
                    <button type="button" class="btn-menu-acao" onclick="reimprimirVendaCancelada('${venda.id}')">Reimprimir</button>
                </div>
            </div>
        `;
    }).join("");
}

// Gera um orçamento a partir do carrinho atual.
function gerarOrcamentoPdv(){
    if(carrinhoVenda.length === 0){
        alert("Nenhum item no carrinho para gerar orçamento.");
        return;
    }

    const base = obterBase();
    if(!base.orcamentos) base.orcamentos = [];

    const subtotal = calcularTotalVenda();
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};

    const orc = {
        id: gerarId("orc"),
        numero: (base.orcamentos.length + 1),
        data: new Date().toISOString(),
        sessaoId: sessaoCaixaAtual?.id || null,
        cliente: clienteVenda ? { id: clienteVenda.id, nome: clienteVenda.nome } : null,
        itens: carrinhoVenda.map(function(item){
            return {
                id: item.id,
                descricao: item.descricao,
                codigo: item.codigo || "",
                quantidade: numero(item.qtd),
                precoUnitario: numero(item.precoUnitario),
                total: numero(item.qtd) * numero(item.precoUnitario)
            };
        }),
        subtotal: subtotal,
        desconto: 0,
        total: subtotal,
        usuarioNome: usuario.nome || usuario.login || "PDV"
    };

    base.orcamentos.push(orc);
    salvarBase(base);

    registrarEventoCaixaPdv("Orçamento gerado", `N° ${orc.numero} | Total: ${formatarMoedaRS(orc.total)}`, {
        orcamentoId: orc.id,
        total: orc.total,
        itens: orc.itens.length
    });

    imprimirOrcamento80mm(orc);
    notificar(`Orçamento N° ${orc.numero} gerado.`, "sucesso");

    carrinhoVenda = [];
    pedidoImportadoAtual = null;
    clienteVenda = null;
    itensCanceladosVenda = 0;
    fecharModaisPdv();
    atualizarTela();
    prepararCampoProduto();
}

// Abre a lista de orçamentos para importação.
function abrirListaOrcamentosPdv(){
    // Datas padrão: últimos 30 dias
    const hoje = new Date().toISOString().slice(0,10);
    const trintaDias = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const elIni = document.getElementById("orcDataIni");
    const elFim = document.getElementById("orcDataFim");
    if(elIni && !elIni.value) elIni.value = trintaDias;
    if(elFim && !elFim.value) elFim.value = hoje;

    renderizarListaOrcamentosPdv();
    abrirModalPdv("modalOrcamentosPdv");

    // Conectar filtros
    ["buscaOrcamentosPdv","orcDataIni","orcDataFim"].forEach(function(id){
        const el = document.getElementById(id);
        if(el && !el.dataset.orcFiltroConectado){
            el.addEventListener("input", renderizarListaOrcamentosPdv);
            el.dataset.orcFiltroConectado = "1";
        }
    });
}

// Limpa os filtros de busca/data da lista de orçamentos.
window.limparFiltrosOrcamentos = function(){
    const hoje = new Date().toISOString().slice(0,10);
    const trintaDias = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const elBusca = document.getElementById("buscaOrcamentosPdv");
    const elIni   = document.getElementById("orcDataIni");
    const elFim   = document.getElementById("orcDataFim");
    if(elBusca) elBusca.value = "";
    if(elIni)   elIni.value   = trintaDias;
    if(elFim)   elFim.value   = hoje;
    renderizarListaOrcamentosPdv();
};

// Mostra/oculta os itens de um orçamento na lista.
window.toggleItensOrcamento = function(id){
    orcItensAbertosId = orcItensAbertosId === id ? null : id;
    renderizarListaOrcamentosPdv();
};

// Renderiza a lista de orçamentos filtrados.
function renderizarListaOrcamentosPdv(){
    const base    = obterBase();
    const todos   = base.orcamentos || [];
    const busca   = (document.getElementById("buscaOrcamentosPdv")?.value || "").toLowerCase().trim();
    const dtIni   = document.getElementById("orcDataIni")?.value || "";
    const dtFim   = document.getElementById("orcDataFim")?.value || "";
    const destino = document.getElementById("listaOrcamentosPdv");
    if(!destino) return;

    // Atualizar stats totais
    const elTotal  = document.getElementById("orcStatTotal");
    const elValor  = document.getElementById("orcStatValor");
    const elFiltro = document.getElementById("orcStatFiltrado");
    if(elTotal) elTotal.textContent  = todos.length;
    const valorTotal = todos.reduce(function(s,o){ return s + numero(o.total); }, 0);
    if(elValor) elValor.textContent  = formatarMoedaRS(valorTotal);

    const filtrado = todos
        .filter(function(orc){
            const d = (orc.data || "").slice(0,10);
            if(dtIni && d < dtIni) return false;
            if(dtFim && d > dtFim) return false;
            if(busca){
                const hay = [String(orc.numero), orc.cliente?.nome || "", orc.id].join(" ").toLowerCase();
                if(!hay.includes(busca)) return false;
            }
            return true;
        })
        .sort(function(a,b){ return new Date(b.data) - new Date(a.data); });

    if(elFiltro) elFiltro.textContent = filtrado.length;

    if(filtrado.length === 0){
        destino.innerHTML = '<div class="lista-vazia-pdv">Nenhum orçamento encontrado para os filtros selecionados.</div>';
        return;
    }

    destino.innerHTML = filtrado.map(function(orc){
        const dtStr   = new Date(orc.data).toLocaleString("pt-BR", {dateStyle:"short", timeStyle:"short"});
        const cliente = orc.cliente?.nome || "Consumidor";
        const aberto  = orcItensAbertosId === orc.id;

        const itensHtml = aberto
            ? `<div class="orc-card-itens">
                <table class="orc-itens-table">
                    <thead><tr>
                        <th>Produto</th>
                        <th class="th-c">Qtd</th>
                        <th class="th-c">Unit.</th>
                        <th class="th-c">Total</th>
                    </tr></thead>
                    <tbody>
                    ${(orc.itens||[]).map(function(item){
                        const total = numero(item.total)||(numero(item.quantidade)*numero(item.precoUnitario));
                        return `<tr>
                            <td>${escapar(item.descricao||"Produto")}</td>
                            <td class="td-c">${item.quantidade}</td>
                            <td class="td-c">${formatarMoedaRS(item.precoUnitario)}</td>
                            <td class="td-c"><strong>${formatarMoedaRS(total)}</strong></td>
                        </tr>`;
                    }).join("")}
                    </tbody>
                </table>
                <div class="orc-card-acoes">
                    <button type="button" class="btn-menu-acao" onclick="imprimirOrcamento80mm(obterOrcamentoPorId('${orc.id}'))">
                        <i class="fa-solid fa-print"></i> Imprimir
                    </button>
                    <button type="button" class="btn-confirmar-venda" onclick="importarOrcamentoPdv('${orc.id}')">
                        <i class="fa-solid fa-file-import"></i> Importar para venda
                    </button>
                </div>
              </div>`
            : "";

        return `<div class="orc-card ${aberto ? "orc-card--aberto" : ""}">
            <button type="button" class="orc-card-header" onclick="toggleItensOrcamento('${orc.id}')">
                <div class="orc-card-num">
                    <span class="orc-badge">N° ${orc.numero}</span>
                    <strong class="orc-card-cliente">${escapar(cliente)}</strong>
                </div>
                <div class="orc-card-meta">
                    <span><i class="fa-regular fa-clock"></i> ${dtStr}</span>
                    <span><i class="fa-solid fa-box"></i> ${(orc.itens||[]).length} item(ns)</span>
                </div>
                <div class="orc-card-valor">${formatarMoedaRS(orc.total)}</div>
                <i class="fa-solid fa-chevron-${aberto?"up":"down"} orc-chevron"></i>
            </button>
            ${itensHtml}
        </div>`;
    }).join("");
}

// Busca um orçamento pelo id.
function obterOrcamentoPorId(id){
    const base = obterBase();
    return (base.orcamentos || []).find(function(o){ return o.id === id; }) || null;
}

// Importa os itens de um orçamento para o carrinho.
function importarOrcamentoPdv(id){
    const orc = obterOrcamentoPorId(id);
    if(!orc){ alert("Orçamento não encontrado."); return; }

    if(carrinhoVenda.length > 0){
        const confirmar = window.confirm("Há itens no carrinho. Deseja substituir pelos itens do orçamento?");
        if(!confirmar) return;
        carrinhoVenda.length = 0;
    }

    const base = obterBase();
    orc.itens.forEach(function(item){
        const produto = base.mercadorias.find(function(m){ return m.id === item.id; });
        const prod = produto ? normalizarProdutoPdv(produto) : {
            id: item.id,
            descricao: item.descricao,
            codigo: item.codigo || "",
            precoVenda: item.precoUnitario
        };

        const lancamento = {
            produto: prod,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario
        };

        adicionarProdutoAoCarrinho(lancamento);
    });

    if(orc.cliente){
        clienteVenda = orc.cliente;
    }

    fecharModaisPdv();
    atualizarTela();
    notificar(`Orçamento N° ${orc.numero} importado.`, "sucesso");
}

// Remove orçamentos antigos expirados da base local.
function limparOrcamentosAntigosPdv(){
    const base = obterBase();
    if(!base.orcamentos || base.orcamentos.length === 0){ notificar("Nenhum orçamento para limpar.", "info"); return; }
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const antes = base.orcamentos.length;
    base.orcamentos = base.orcamentos.filter(function(o){ return new Date(o.data) >= limite; });
    const removidos = antes - base.orcamentos.length;
    salvarBase(base);
    renderizarListaOrcamentosPdv();
    notificar(`${removidos} orçamento(s) removido(s).`, "sucesso");
}

