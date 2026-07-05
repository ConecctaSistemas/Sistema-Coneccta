(function(){
    // ── Estado ────────────────────────────────────────────────────────────
    var filtroStatus = "pendente";
    var selecionados = new Set();
    var listaAtual   = [];
    var entregaModalId = null; // entrega aberta no modal

    // ── Init ──────────────────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", function(){
        inicializarFiltrosDatas();
        conectarAbas();
        conectarFiltros();
        conectarModais();
        carregarEntregas();
    });

    // ── Filtros de data padrão (últimos 30 dias) ──────────────────────────
    function inicializarFiltrosDatas(){
        var hoje       = new Date().toISOString().slice(0,10);
        var trintaDias = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
        document.getElementById("filtroDataInicio").value = trintaDias;
        document.getElementById("filtroDataFim").value    = hoje;
    }

    // ── Abas ──────────────────────────────────────────────────────────────
    function conectarAbas(){
        document.getElementById("abasStatus").addEventListener("click", function(e){
            var aba = e.target.closest(".aba-status");
            if(!aba) return;
            document.querySelectorAll(".aba-status").forEach(function(b){ b.classList.remove("ativo"); });
            aba.classList.add("ativo");
            filtroStatus = aba.dataset.filtro;
            limparSelecao();
            carregarEntregas();
        });
    }

    // ── Filtros ───────────────────────────────────────────────────────────
    function conectarFiltros(){
        var debounce;
        document.getElementById("buscaEntregas").addEventListener("input", function(){
            clearTimeout(debounce);
            debounce = setTimeout(carregarEntregas, 280);
        });
        document.getElementById("filtroDataInicio").addEventListener("change", carregarEntregas);
        document.getElementById("filtroDataFim").addEventListener("change", carregarEntregas);
    }

    window.limparFiltros = function(){
        inicializarFiltrosDatas();
        document.getElementById("buscaEntregas").value = "";
        carregarEntregas();
    };

    // ── Carregar e renderizar ─────────────────────────────────────────────
    function carregarEntregas(){
        var base   = obterBase();
        var todas  = base.entregas || [];
        var busca  = (document.getElementById("buscaEntregas").value || "").toLowerCase();
        var dtIni  = document.getElementById("filtroDataInicio").value;
        var dtFim  = document.getElementById("filtroDataFim").value;

        atualizarBadges(todas);
        atualizarStats(todas);

        var filtradas = todas.filter(function(e){
            if(filtroStatus && e.status !== filtroStatus) return false;
            if(dtIni || dtFim){
                var d = (e.data || "").slice(0,10);
                if(dtIni && d < dtIni) return false;
                if(dtFim && d > dtFim) return false;
            }
            if(busca){
                var hay = [e.cliente, e.endereco, e.id, e.observacoes].join(" ").toLowerCase();
                if(!hay.includes(busca)) return false;
            }
            return true;
        });

        filtradas.sort(function(a, b){
            return filtroStatus === "entregue"
                ? (b.entregueEm || b.data || "").localeCompare(a.entregueEm || a.data || "")
                : (a.data || "").localeCompare(b.data || "");
        });

        listaAtual = filtradas;
        renderizarTabela(filtradas, base);
        document.getElementById("infoResultados").textContent = filtradas.length + " entrega(s)";
    }

    function atualizarBadges(todas){
        var p=0, r=0, en=0;
        todas.forEach(function(e){
            if(e.status==="pendente")  p++;
            else if(e.status==="em rota") r++;
            else if(e.status==="entregue") en++;
        });
        document.getElementById("badgePendente").textContent = p;
        document.getElementById("badgeRota").textContent     = r;
        document.getElementById("badgeEntregue").textContent = en;
        document.getElementById("badgeTodas").textContent    = todas.length;
    }

    function atualizarStats(todas){
        var hoje = new Date().toISOString().slice(0,10);
        var p=0, r=0, en=0;
        todas.forEach(function(e){
            if(e.status==="pendente") p++;
            else if(e.status==="em rota") r++;
            else if(e.status==="entregue" && (e.entregueEm||"").slice(0,10)===hoje) en++;
        });
        document.getElementById("numPendente").textContent = p;
        document.getElementById("numRota").textContent     = r;
        document.getElementById("numEntregue").textContent = en;
    }

    // ── Renderização da tabela ────────────────────────────────────────────
    function renderizarTabela(lista, base){
        var tbody = document.getElementById("listaEntregas");

        if(lista.length === 0){
            var msgs = { pendente:"Nenhuma entrega pendente.", "em rota":"Nenhuma entrega em rota.", entregue:"Nenhuma entrega concluída no período.", "":"Nenhuma entrega encontrada." };
            tbody.innerHTML = '<tr><td colspan="8" class="vazio">'+(msgs[filtroStatus]||"Nenhuma entrega encontrada.")+'</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map(function(e, idx){
            var isSel   = selecionados.has(e.id);
            var trClass = isSel ? ' class="selecionada"' : '';
            var venda   = (base.vendas||[]).find(function(v){ return v.id===e.vendaId; });
            var prog    = calcularProgresso(e, venda);
            var statusHtml = badgeStatus(e.status) + progressoMinibadge(prog);

            return '<tr'+trClass+'>' +
                '<td class="col-check"><input type="checkbox" onchange="toggleItem(this,\''+escapar(e.id)+'\')" '+(isSel?"checked":"")+'></td>' +
                '<td><strong>#'+(idx+1)+'</strong><small style="display:block;font-size:11px;color:#94a3b8">'+escapar(e.id)+'</small></td>' +
                '<td><strong>'+escapar(e.cliente||"—")+'</strong></td>' +
                '<td>'+escapar(e.endereco||"—")+(e.observacoes?'<br><small style="color:#94a3b8"><i class="fa-solid fa-note-sticky"></i> '+escapar(e.observacoes)+'</small>':'')+'</td>' +
                '<td><strong>'+formatarMoedaRS(e.valor||0)+'</strong></td>' +
                '<td style="white-space:nowrap">'+fmtDataHora(e.data)+'</td>' +
                '<td>'+statusHtml+'</td>' +
                '<td class="col-acoes"><div class="acoes-linha">'+botoesLinha(e)+'</div></td>' +
            '</tr>';
        }).join("");
    }

    function progressoMinibadge(prog){
        if(!prog || prog.totalUnid === 0) return "";
        var pct = Math.round(prog.entreguesUnid / prog.totalUnid * 100);
        if(pct === 0) return "";
        var cor = pct === 100 ? "#16a34a" : "#2563eb";
        return '<div style="margin-top:5px;display:flex;align-items:center;gap:6px;">'+
            '<div style="flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;">'+
            '<div style="height:100%;background:'+cor+';width:'+pct+'%;border-radius:3px;transition:width .3s;"></div></div>'+
            '<span style="font-size:11px;font-weight:700;color:'+cor+';">'+prog.entreguesUnid+'/'+prog.totalUnid+'</span>'+
            '</div>';
    }

    function badgeStatus(status){
        var cfg = {
            pendente: { cls:"badge-pendente", icon:"fa-clock",       label:"Pendente" },
            "em rota":{ cls:"badge-rota",     icon:"fa-truck-fast",  label:"Em Rota"  },
            entregue: { cls:"badge-entregue", icon:"fa-circle-check",label:"Entregue" },
            cancelado:{ cls:"badge-cancelado",icon:"fa-ban",         label:"Cancelado"}
        };
        var c = cfg[status] || cfg.pendente;
        return '<span class="badge-status '+c.cls+'"><i class="fa-solid '+c.icon+'"></i> '+c.label+'</span>';
    }

    function botoesLinha(e){
        var btns = '<button type="button" class="btn-acao btn-acao-ver" onclick="verDetalhes(\''+escapar(e.id)+'\')"><i class="fa-solid fa-boxes-stacked"></i> Itens</button>';
        if(e.status==="pendente")  btns += '<button type="button" class="btn-acao btn-acao-rota" onclick="mudarStatus(\''+escapar(e.id)+'\',\'em rota\')"><i class="fa-solid fa-truck-fast"></i> Sair</button>';
        if(e.status==="em rota")   btns += '<button type="button" class="btn-acao btn-acao-entregue" onclick="mudarStatus(\''+escapar(e.id)+'\',\'entregue\')"><i class="fa-solid fa-circle-check"></i> Entregue</button>';
        return btns;
    }

    // ── Progresso de itens ────────────────────────────────────────────────
    function calcularProgresso(entrega, venda){
        if(!venda || !venda.itens || !venda.itens.length) return { totalItens:0, entreguesItens:0, totalUnid:0, entreguesUnid:0 };
        var itensEntregues = entrega.itensEntregues || {};
        var totalUnid=0, entreguesUnid=0, totalItens=venda.itens.length, entreguesItens=0;
        venda.itens.forEach(function(item, i){
            var qtd  = numero(item.qtd || item.quantidade || 1);
            var ent  = Math.min(numero(itensEntregues[i] || 0), qtd);
            totalUnid     += qtd;
            entreguesUnid += ent;
            if(ent >= qtd) entreguesItens++;
        });
        return { totalItens:totalItens, entreguesItens:entreguesItens, totalUnid:totalUnid, entreguesUnid:entreguesUnid };
    }

    // ── Modal de detalhes com itens ───────────────────────────────────────
    window.verDetalhes = function(id){
        var base   = obterBase();
        var entrega = (base.entregas||[]).find(function(e){ return e.id===id; });
        if(!entrega) return;

        entregaModalId = id;
        var venda = (base.vendas||[]).find(function(v){ return v.id===entrega.vendaId; });
        var prog  = calcularProgresso(entrega, venda);

        document.getElementById("modalEntregaTitulo").textContent = "Entrega — " + (entrega.cliente||"sem nome");

        // ── Informações gerais ──
        var infoHtml =
            '<div class="detalhe-grid">'+
            '<div class="detalhe-item"><label>Cliente / Destinatário</label><p><strong>'+escapar(entrega.cliente||"—")+'</strong></p></div>'+
            '<div class="detalhe-item"><label>Status</label><p>'+badgeStatus(entrega.status)+'</p></div>'+
            '<div class="detalhe-item campo-total"><label>Endereço</label><p>'+escapar(entrega.endereco||"—")+'</p></div>'+
            '<div class="detalhe-item"><label>Valor total</label><p><strong>'+formatarMoedaRS(entrega.valor||0)+'</strong></p></div>'+
            '<div class="detalhe-item"><label>Pedido em</label><p>'+fmtDataHora(entrega.data)+'</p></div>'+
            (entrega.saiuEm    ? '<div class="detalhe-item"><label>Saiu em</label><p>'+fmtDataHora(entrega.saiuEm)+'</p></div>' : '')+
            (entrega.entregueEm? '<div class="detalhe-item"><label>Entregue em</label><p>'+fmtDataHora(entrega.entregueEm)+'</p></div>' : '')+
            (entrega.observacoes? '<div class="detalhe-item campo-total"><label>Observações</label><div class="obs-box">'+escapar(entrega.observacoes)+'</div></div>' : '')+
            '</div>';

        // ── Itens da venda ──
        var itensHtml = "";
        if(venda && venda.itens && venda.itens.length){
            var itensEntregues = entrega.itensEntregues || {};

            itensHtml =
                '<div class="itens-entrega">'+
                '<div class="itens-entrega-header">'+
                    '<h4><i class="fa-solid fa-boxes-stacked"></i> Itens do pedido</h4>'+
                    '<span class="itens-resumo-mini" id="resumoItensModal">'+
                        prog.entreguesUnid+' / '+prog.totalUnid+' unidade(s) entregue(s)'+
                    '</span>'+
                '</div>'+
                '<div class="barra-prog-wrap">'+
                    '<div class="barra-prog-track"><div class="barra-prog-fill" id="barraProgFill" style="width:'+(prog.totalUnid?Math.round(prog.entreguesUnid/prog.totalUnid*100):0)+'%"></div></div>'+
                '</div>'+
                '<table class="itens-table">'+
                '<thead><tr>'+
                    '<th>Produto</th>'+
                    '<th class="th-num">Pedido</th>'+
                    '<th class="th-num">Entregue</th>'+
                    '<th class="th-num">Restante</th>'+
                '</tr></thead>'+
                '<tbody>'+
                venda.itens.map(function(item, i){
                    var qtdTotal = numero(item.qtd || item.quantidade || 1);
                    var qtdEnt   = Math.min(numero(itensEntregues[i]||0), qtdTotal);
                    var qtdRest  = qtdTotal - qtdEnt;
                    var allDone  = qtdEnt >= qtdTotal;
                    return '<tr class="item-row'+(allDone?" item-entregue":"")+'">'+
                        '<td>'+
                            '<strong>'+escapar(item.nome||item.descricao||"Produto")+'</strong>'+
                            (item.codigo? '<small style="display:block;color:#94a3b8">'+escapar(item.codigo)+'</small>' : '')+
                        '</td>'+
                        '<td class="td-num">'+qtdTotal+'</td>'+
                        '<td class="td-num">'+
                            '<div class="qtd-controle">'+
                                '<button type="button" class="qtd-btn" onclick="ajustarQtdItem('+i+',-1)">−</button>'+
                                '<input type="number" class="input-qtd-ent" id="qtdItem'+i+'" '+
                                    'data-idx="'+i+'" data-max="'+qtdTotal+'" '+
                                    'min="0" max="'+qtdTotal+'" value="'+qtdEnt+'" '+
                                    'oninput="onQtdChange(this)">'+
                                '<button type="button" class="qtd-btn" onclick="ajustarQtdItem('+i+',1)">+</button>'+
                            '</div>'+
                        '</td>'+
                        '<td class="td-num td-restante" id="rest'+i+'">'+
                            '<span class="restante-badge'+(qtdRest===0?" restante-zero":"")+'">'+qtdRest+'</span>'+
                        '</td>'+
                    '</tr>';
                }).join("")+
                '</tbody></table>'+

                // Ação rápida: marcar todos
                '<div class="itens-acoes-rapidas">'+
                    '<button type="button" class="btn-todos-entregues" onclick="marcarTodosItens()">'+
                        '<i class="fa-solid fa-check-double"></i> Marcar todos como entregues'+
                    '</button>'+
                    '<button type="button" class="btn-limpar-itens" onclick="limparTodosItens()">'+
                        '<i class="fa-solid fa-rotate-left"></i> Limpar'+
                    '</button>'+
                '</div>'+
                '</div>';
        } else {
            // Venda sem itens detalhados — fallback simples
            itensHtml = '<div class="itens-sem-detalhe"><i class="fa-solid fa-circle-info"></i> Esta entrega não possui itens detalhados. Use os botões de status.</div>';
        }

        document.getElementById("modalEntregaCorpo").innerHTML = infoHtml + itensHtml;

        // ── Rodapé do modal ──
        var footer = "";
        if(entrega.status==="pendente"){
            footer += '<button type="button" class="btn-acao btn-acao-rota" style="padding:10px 16px" onclick="mudarStatus(\''+escapar(entrega.id)+'\',\'em rota\')"><i class="fa-solid fa-truck-fast"></i> Sair para entrega</button>';
        }
        footer +=
            '<button type="button" class="btn-primario" onclick="salvarProgressoItens()">'+
                '<i class="fa-solid fa-floppy-disk"></i> Salvar progresso'+
            '</button>'+
            '<button type="button" class="btn-acao btn-acao-ver" style="padding:10px 16px" onclick="imprimirUnica(\''+escapar(entrega.id)+'\')">'+
                '<i class="fa-solid fa-print"></i> Imprimir'+
            '</button>';

        document.getElementById("modalEntregaFooter").innerHTML =
            '<button type="button" class="btn-secundario" onclick="fecharModal(\'modalEntrega\')">Fechar</button>' + footer;

        abrirModal("modalEntrega");
    };

    // ── Controle de quantidade no modal ───────────────────────────────────
    window.onQtdChange = function(input){
        var max = parseInt(input.dataset.max)||0;
        var val = Math.max(0, Math.min(parseInt(input.value)||0, max));
        input.value = val;
        atualizarRestante(parseInt(input.dataset.idx), max, val);
        atualizarResumoModal();
    };

    window.ajustarQtdItem = function(idx, delta){
        var input = document.getElementById("qtdItem"+idx);
        if(!input) return;
        var max = parseInt(input.dataset.max)||0;
        var val = Math.max(0, Math.min((parseInt(input.value)||0)+delta, max));
        input.value = val;
        atualizarRestante(idx, max, val);
        atualizarResumoModal();
    };

    function atualizarRestante(idx, max, val){
        var rest = max - val;
        var el   = document.getElementById("rest"+idx);
        if(!el) return;
        el.innerHTML = '<span class="restante-badge'+(rest===0?" restante-zero":"")+'">'+rest+'</span>';
        var row = document.getElementById("qtdItem"+idx)?.closest("tr");
        if(row) row.classList.toggle("item-entregue", val>=max && max>0);
    }

    function atualizarResumoModal(){
        var inputs = document.querySelectorAll(".input-qtd-ent");
        var totEnt=0, totMax=0;
        inputs.forEach(function(inp){
            totEnt += parseInt(inp.value)||0;
            totMax += parseInt(inp.dataset.max)||0;
        });
        var el = document.getElementById("resumoItensModal");
        if(el) el.textContent = totEnt+" / "+totMax+" unidade(s) entregue(s)";
        var pct = totMax ? Math.round(totEnt/totMax*100) : 0;
        var fill = document.getElementById("barraProgFill");
        if(fill) fill.style.width = pct+"%";
    }

    window.marcarTodosItens = function(){
        document.querySelectorAll(".input-qtd-ent").forEach(function(inp){
            inp.value = inp.dataset.max;
            atualizarRestante(parseInt(inp.dataset.idx), parseInt(inp.dataset.max), parseInt(inp.dataset.max));
        });
        atualizarResumoModal();
    };

    window.limparTodosItens = function(){
        document.querySelectorAll(".input-qtd-ent").forEach(function(inp){
            inp.value = 0;
            atualizarRestante(parseInt(inp.dataset.idx), parseInt(inp.dataset.max), 0);
        });
        atualizarResumoModal();
    };

    // ── Salvar progresso de itens ─────────────────────────────────────────
    window.salvarProgressoItens = function(){
        if(!entregaModalId) return;

        var base = obterBase();
        var idx  = (base.entregas||[]).findIndex(function(e){ return e.id===entregaModalId; });
        if(idx<0) return;

        var entrega = base.entregas[idx];
        var venda   = (base.vendas||[]).find(function(v){ return v.id===entrega.vendaId; });

        // Coletar quantidades do formulário
        var novoProgresso = {};
        document.querySelectorAll(".input-qtd-ent").forEach(function(inp){
            novoProgresso[parseInt(inp.dataset.idx)] = parseInt(inp.value)||0;
        });
        base.entregas[idx].itensEntregues = novoProgresso;

        // Verificar se todos os itens foram entregues
        var prog = calcularProgresso(base.entregas[idx], venda);
        if(prog.totalUnid>0 && prog.entreguesUnid>=prog.totalUnid && entrega.status!=="entregue"){
            base.entregas[idx].status     = "entregue";
            base.entregas[idx].entregueEm = new Date().toISOString();
            notificar("Todos os itens entregues! Entrega concluída.", "sucesso");
        } else if(prog.entreguesUnid>0 && entrega.status==="pendente"){
            // Se saiu com algum item mas ainda não estava em rota, vai para em rota
            // (mantém o status — o usuário escolhe quando mudar)
            notificar("Progresso salvo: "+prog.entreguesUnid+" / "+prog.totalUnid+" unidade(s).", "sucesso");
        } else {
            notificar("Progresso salvo.", "sucesso");
        }

        salvarBase(base);

        // Fechar modal e recarregar apenas se entregue
        if(base.entregas[idx].status==="entregue"){
            fecharModal("modalEntrega");
        }
        carregarEntregas();
    };

    // ── Seleção em lote ───────────────────────────────────────────────────
    window.toggleItem = function(el, id){
        if(el.checked) selecionados.add(id);
        else           selecionados.delete(id);
        var tr = el.closest("tr");
        if(tr) tr.classList.toggle("selecionada", el.checked);
        atualizarBarraLote();
    };

    window.toggleTodos = function(checked){
        listaAtual.forEach(function(e){
            if(checked) selecionados.add(e.id);
            else        selecionados.delete(e.id);
        });
        document.querySelectorAll("#listaEntregas input[type='checkbox']").forEach(function(cb){
            cb.checked = checked;
            var tr = cb.closest("tr");
            if(tr) tr.classList.toggle("selecionada", checked);
        });
        atualizarBarraLote();
    };

    window.limparSelecao = function(){
        selecionados.clear();
        document.getElementById("checkTodos").checked = false;
        document.querySelectorAll("#listaEntregas input[type='checkbox']").forEach(function(cb){ cb.checked=false; });
        document.querySelectorAll("#listaEntregas tr").forEach(function(tr){ tr.classList.remove("selecionada"); });
        atualizarBarraLote();
    };

    function atualizarBarraLote(){
        var n = selecionados.size;
        document.getElementById("barraLote").hidden = n===0;
        document.getElementById("numSelecionados").textContent = n;
    }

    // ── Status ────────────────────────────────────────────────────────────
    window.mudarStatus = function(id, novoStatus){
        var base = obterBase();
        var idx  = (base.entregas||[]).findIndex(function(e){ return e.id===id; });
        if(idx<0) return;
        base.entregas[idx].status = novoStatus;
        if(novoStatus==="entregue") base.entregas[idx].entregueEm = new Date().toISOString();
        if(novoStatus==="em rota")  base.entregas[idx].saiuEm     = new Date().toISOString();
        salvarBase(base);
        notificar(novoStatus==="em rota" ? "Saiu para entrega." : "Marcada como entregue.", "sucesso");
        limparSelecao();
        carregarEntregas();
        fecharModal("modalEntrega");
    };

    window.enviarLoteParaRota = function(){
        if(!selecionados.size) return;
        var base = obterBase();
        selecionados.forEach(function(id){
            var i = (base.entregas||[]).findIndex(function(e){ return e.id===id; });
            if(i>=0 && base.entregas[i].status==="pendente"){
                base.entregas[i].status = "em rota";
                base.entregas[i].saiuEm = new Date().toISOString();
            }
        });
        salvarBase(base);
        notificar(selecionados.size+" entrega(s) enviada(s) para rota.", "sucesso");
        limparSelecao();
        carregarEntregas();
    };

    window.marcarLoteEntregue = function(){
        if(!selecionados.size) return;
        var base = obterBase();
        selecionados.forEach(function(id){
            var i = (base.entregas||[]).findIndex(function(e){ return e.id===id; });
            if(i>=0 && base.entregas[i].status!=="cancelado"){
                base.entregas[i].status     = "entregue";
                base.entregas[i].entregueEm = new Date().toISOString();
                // Marcar todos itens como entregues automaticamente
                var venda = (base.vendas||[]).find(function(v){ return v.id===base.entregas[i].vendaId; });
                if(venda && venda.itens){
                    var prog = {};
                    venda.itens.forEach(function(item, idx){
                        prog[idx] = numero(item.qtd||item.quantidade||1);
                    });
                    base.entregas[i].itensEntregues = prog;
                }
            }
        });
        salvarBase(base);
        notificar(selecionados.size+" entrega(s) marcada(s) como entregue.", "sucesso");
        limparSelecao();
        carregarEntregas();
    };

    // ── Agrupamento por proximidade ───────────────────────────────────────
    window.sugerirAgrupamento = function(){
        var base     = obterBase();
        var pendentes = (base.entregas||[]).filter(function(e){ return e.status==="pendente"||e.status==="em rota"; });
        if(!pendentes.length){ notificar("Nenhuma entrega pendente ou em rota.", "info"); return; }

        var grupos = {};
        pendentes.forEach(function(e){
            var rua = extrairLogradouro(e.endereco||"");
            if(!grupos[rua]) grupos[rua] = [];
            grupos[rua].push(e);
        });

        var html = "";
        Object.keys(grupos).sort().forEach(function(rua){
            var itens = grupos[rua];
            var total = itens.reduce(function(s,e){ return s+(e.valor||0); }, 0);
            html +=
                '<div class="grupo-card">'+
                '<div class="grupo-header">'+
                    '<input type="checkbox" class="grupo-chk" data-grupo="'+escapar(rua)+'" '+
                        'data-ids=\''+JSON.stringify(itens.map(function(e){ return e.id; }))+'\' checked>'+
                    '<strong><i class="fa-solid fa-location-dot"></i> '+escapar(rua)+'</strong>'+
                    '<span class="grupo-count">'+itens.length+' entr. · '+formatarMoedaRS(total)+'</span>'+
                '</div>'+
                '<div class="grupo-itens">'+
                itens.map(function(e){
                    var venda = (base.vendas||[]).find(function(v){ return v.id===e.vendaId; });
                    var prog  = calcularProgresso(e, venda);
                    var progTxt = prog.totalUnid>0 ? ' <span style="font-size:11px;color:#2563eb">'+prog.entreguesUnid+'/'+prog.totalUnid+' un.</span>' : '';
                    return '<div class="grupo-item">'+
                        badgeStatus(e.status)+
                        '<span class="grupo-item-nome">'+escapar(e.cliente||"—")+progTxt+'</span>'+
                        '<span class="grupo-item-end">'+escapar(e.endereco||"—")+'</span>'+
                        '<span class="grupo-item-val">'+formatarMoedaRS(e.valor||0)+'</span>'+
                        '</div>';
                }).join("")+
                '</div></div>';
        });

        document.getElementById("listaGrupos").innerHTML = html || '<p class="vazio">Nenhum agrupamento disponível.</p>';
        abrirModal("modalAgrupamento");
    };

    window.selecionarGruposMarcados = function(){
        selecionados.clear();
        document.querySelectorAll(".grupo-chk:checked").forEach(function(chk){
            JSON.parse(chk.dataset.ids||"[]").forEach(function(id){ selecionados.add(id); });
        });
        fecharModal("modalAgrupamento");
        atualizarBarraLote();
        carregarEntregas();
        notificar(selecionados.size+" entrega(s) selecionadas.", "sucesso");
    };

    function extrairLogradouro(end){
        return end.replace(/[,–\-]\s*\d.*$/,"").replace(/\s+\d+\s*$/,"").trim() || end.trim();
    }

    // ── Impressão ─────────────────────────────────────────────────────────
    window.imprimirRomaneio = function(){
        if(!selecionados.size){ notificar("Selecione as entregas para imprimir o romaneio.","info"); return; }
        var base  = obterBase();
        var lista = [...selecionados].map(function(id){ return (base.entregas||[]).find(function(e){ return e.id===id; }); }).filter(Boolean);
        abrirJanelaImpressao(lista, base);
    };

    window.imprimirUnica = function(id){
        var base = obterBase();
        var e = (base.entregas||[]).find(function(x){ return x.id===id; });
        if(e) abrirJanelaImpressao([e], base);
    };

    function abrirJanelaImpressao(lista, base){
        var empresa     = (base.empresa||{});
        var nomeEmpresa = empresa.razaoSocial||empresa.nomeFantasia||"ERP Coneccta";
        var agora       = new Date().toLocaleString("pt-BR");

        // Agrupar por logradouro
        var grupos = {};
        lista.forEach(function(e){
            var rua = extrairLogradouro(e.endereco||"");
            if(!grupos[rua]) grupos[rua] = [];
            grupos[rua].push(e);
        });

        var totalGeral = lista.reduce(function(s,e){ return s+(e.valor||0); },0);
        var seq = 0;

        var corpoGrupos = Object.keys(grupos).sort().map(function(rua){
            return '<div style="margin-bottom:28px;">'+
                '<div style="font-size:11px;font-weight:700;color:#1A436B;text-transform:uppercase;letter-spacing:.08em;'+
                    'border-left:3px solid #1A436B;padding:4px 0 4px 10px;margin-bottom:12px;background:#f0f4ff;">'+
                    '&#128205; '+rua+
                '</div>'+
                grupos[rua].map(function(e){
                    seq++;
                    var venda = (base.vendas||[]).find(function(v){ return v.id===e.vendaId; });
                    var ient  = e.itensEntregues||{};

                    // ── Tabela de itens ──
                    var itensHtml = "";
                    if(venda && venda.itens && venda.itens.length){
                        var linhas = venda.itens.map(function(item, i){
                            var qtd  = numero(item.qtd||item.quantidade||1);
                            var ent  = ient[i] !== undefined ? Math.min(numero(ient[i]), qtd) : null;
                            var rest = ent !== null ? (qtd - ent) : null;
                            var bgRow = rest === 0 ? '#f0fdf4' : (ent > 0 ? '#fffbeb' : '#fff');

                            var tdEnt  = ent  !== null
                                ? '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee;font-weight:700;color:'+(ent>0?'#15803d':'#999')+';">'+ent+'</td>'
                                : '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee;"><span style="display:inline-block;width:40px;border-bottom:1px solid #aaa;">&nbsp;</span></td>';
                            var tdRest = rest !== null
                                ? '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee;font-weight:700;color:'+(rest>0?'#c2410c':'#15803d')+';">'+rest+'</td>'
                                : '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee;"><span style="display:inline-block;width:40px;border-bottom:1px solid #aaa;">&nbsp;</span></td>';

                            return '<tr style="background:'+bgRow+';">'+
                                '<td style="padding:5px 8px;border-bottom:1px solid #eee;">'+
                                    '<strong style="font-size:12px;">'+escapar(item.nome||item.descricao||"Produto")+'</strong>'+
                                    (item.codigo ? '<span style="display:block;font-size:10px;color:#888;">'+escapar(item.codigo)+'</span>' : '')+
                                '</td>'+
                                '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee;font-weight:600;">'+qtd+'</td>'+
                                tdEnt+
                                tdRest+
                            '</tr>';
                        }).join("");

                        itensHtml =
                            '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">'+
                            '<thead>'+
                                '<tr style="background:#f1f5f9;">'+
                                '<th style="text-align:left;padding:5px 8px;font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd;">Produto</th>'+
                                '<th style="text-align:center;padding:5px 8px;font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd;width:56px;">Pedido</th>'+
                                '<th style="text-align:center;padding:5px 8px;font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd;width:70px;">Entregue</th>'+
                                '<th style="text-align:center;padding:5px 8px;font-size:10px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd;width:70px;">Restante</th>'+
                                '</tr>'+
                            '</thead>'+
                            '<tbody>'+linhas+'</tbody>'+
                            '</table>';
                    } else {
                        itensHtml = '<div style="margin-top:8px;font-size:11px;color:#888;font-style:italic;">Itens não disponíveis</div>';
                    }

                    // ── Bloco de assinatura ──
                    var assinaturaHtml =
                        '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed #ccc;">'+
                            '<div style="display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap;">'+
                                '<div style="flex:1;min-width:180px;">'+
                                    '<div style="font-size:10px;color:#555;margin-bottom:22px;">Nome de quem recebeu</div>'+
                                    '<div style="border-bottom:1px solid #333;"></div>'+
                                '</div>'+
                                '<div style="flex:1;min-width:180px;">'+
                                    '<div style="font-size:10px;color:#555;margin-bottom:22px;">Assinatura do recebedor</div>'+
                                    '<div style="border-bottom:1px solid #333;"></div>'+
                                '</div>'+
                                '<div style="min-width:110px;">'+
                                    '<div style="font-size:10px;color:#555;margin-bottom:22px;">Data / Hora</div>'+
                                    '<div style="border-bottom:1px solid #333;"></div>'+
                                '</div>'+
                            '</div>'+
                        '</div>';

                    return '<div style="border:1px solid #d1d5db;border-radius:8px;margin-bottom:16px;overflow:hidden;page-break-inside:avoid;">'+

                        // Cabeçalho do card
                        '<div style="display:flex;align-items:center;justify-content:space-between;'+
                            'padding:10px 14px;background:#1A436B;color:#fff;">'+
                            '<div style="display:flex;align-items:center;gap:10px;">'+
                                '<span style="font-size:22px;font-weight:900;opacity:.7;">#'+seq+'</span>'+
                                '<div>'+
                                    '<div style="font-size:14px;font-weight:700;">'+escapar(e.cliente||"—")+'</div>'+
                                    '<div style="font-size:11px;opacity:.85;margin-top:1px;">'+
                                        '&#128205; '+escapar(e.endereco||"—")+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                            '<div style="text-align:right;flex-shrink:0;">'+
                                '<div style="font-size:16px;font-weight:900;">'+formatarMoedaRS(e.valor||0)+'</div>'+
                                '<div style="font-size:10px;opacity:.7;margin-top:2px;">valor total</div>'+
                            '</div>'+
                        '</div>'+

                        // Observações (se houver)
                        (e.observacoes
                            ? '<div style="padding:7px 14px;background:#fffbeb;border-bottom:1px solid #fde68a;font-size:11px;color:#78350f;">'+
                                '&#9888; Obs: '+escapar(e.observacoes)+
                              '</div>'
                            : '')+

                        // Itens + assinatura
                        '<div style="padding:12px 14px;">'+
                            itensHtml+
                            assinaturaHtml+
                        '</div>'+

                    '</div>';
                }).join("")+
            '</div>';
        }).join("");

        var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Romaneio de Entregas</title>'+
            '<style>'+
            '*{margin:0;padding:0;box-sizing:border-box;font-family:"Segoe UI",Arial,sans-serif;}'+
            'body{padding:24px;color:#000;font-size:13px;background:#fff;}'+
            '@media print{'+
                'body{padding:6mm;}'+
                '@page{margin:8mm;}'+
                'a{text-decoration:none;}'+
            '}'+
            '</style>'+
            '</head><body>'+

            // Cabeçalho do romaneio
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:14px;border-bottom:3px solid #1A436B;">'+
                '<div>'+
                    '<div style="font-size:22px;font-weight:900;color:#1A436B;">'+nomeEmpresa+'</div>'+
                    '<div style="font-size:12px;color:#555;margin-top:4px;">Romaneio de Entregas &mdash; Emitido em '+agora+'</div>'+
                    '<div style="font-size:12px;color:#555;margin-top:2px;">Total: '+lista.length+' entrega(s) &mdash; <strong>'+formatarMoedaRS(totalGeral)+'</strong></div>'+
                '</div>'+
                '<div style="text-align:right;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;">'+
                    '<div style="font-size:11px;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;">Motorista responsável</div>'+
                    '<div style="font-size:11px;color:#555;margin-bottom:20px;">Nome: ________________________________</div>'+
                    '<div style="font-size:11px;color:#555;">Assinatura: ___________________________</div>'+
                '</div>'+
            '</div>'+

            corpoGrupos+

            // Rodapé
            '<div style="margin-top:14px;padding-top:10px;border-top:2px solid #1A436B;display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#1A436B;">'+
                '<span>'+lista.length+' entrega(s)</span>'+
                '<span>Valor total: '+formatarMoedaRS(totalGeral)+'</span>'+
            '</div>'+
            '</body></html>';

        var w = window.open("","_blank","width=860,height=720");
        if(!w){ notificar("Permita pop-ups para imprimir.","info"); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(function(){ w.print(); }, 400);
    }

    // ── Modal helpers ─────────────────────────────────────────────────────
    function abrirModal(id){
        var el = document.getElementById(id);
        if(el) el.setAttribute("aria-hidden","false");
    }

    window.fecharModal = function(id){
        var el = document.getElementById(id);
        if(el) el.setAttribute("aria-hidden","true");
        if(id==="modalEntrega") entregaModalId = null;
    };

    function conectarModais(){
        document.getElementById("btnFecharModal")?.addEventListener("click", function(){ fecharModal("modalEntrega"); });
        document.getElementById("modalEntrega")?.addEventListener("click", function(e){ if(e.target===this) fecharModal("modalEntrega"); });
        document.getElementById("modalAgrupamento")?.addEventListener("click", function(e){ if(e.target===this) fecharModal("modalAgrupamento"); });
    }

    // ── Utils ─────────────────────────────────────────────────────────────
    function fmtDataHora(iso){
        if(!iso) return "—";
        try{ return new Date(iso).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}); }
        catch(e){ return iso; }
    }

})();
