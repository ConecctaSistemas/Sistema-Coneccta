/* vendaspdv.js */
/* Extraido de movimento.js (secao "1. VENDAS PDV - DASHBOARD") para virar pagina propria. */

document.addEventListener("DOMContentLoaded", function(){
    renderizarVendas();
    document.getElementById("btnFiltrarVendas")?.addEventListener("click", renderizarVendas);
    document.querySelector(".dash-vendas")?.addEventListener("click", function(ev){
        var btn = ev.target.closest(".btn-tipo-venda");
        if(!btn) return;
        document.querySelectorAll(".btn-tipo-venda").forEach(function(b){ b.classList.remove("ativo"); });
        btn.classList.add("ativo");
        _dashTipoFiltro = btn.dataset.tipo || "todos";
        renderizarVendas();
    });
    document.querySelector(".dash-vendas")?.addEventListener("change", function(ev){
        if(ev.target.name === "tipoGraficoDash") renderizarVendas();
    });
});

/* ══════════════════════════════════════
   VENDAS PDV — DASHBOARD
══════════════════════════════════════ */
var _dashTipoFiltro = "todos";

function renderizarVendas(){
    var hoje = new Date().toISOString().slice(0, 10);
    var di = document.getElementById("vendaDataInicio")?.value || "";
    var df = document.getElementById("vendaDataFim")?.value || "";
    if(!di && !df){
        di = df = hoje;
        var elDi = document.getElementById("vendaDataInicio");
        var elDf = document.getElementById("vendaDataFim");
        if(elDi) elDi.value = hoje;
        if(elDf) elDf.value = hoje;
    }
    var base = obterBase();
    if(window.ErpApi && window.ErpApi._usarMock === false) _carregarDashVendasApi(di, df, _dashTipoFiltro);
    _renderizarDashVendas(base, di, df, _dashTipoFiltro, hoje);
}

function _filtrarVendasDash(vendas, di, df, tipo){
    return (vendas || []).filter(function(v){
        var data = String(v.data || "").slice(0, 10);
        if(di && data < di) return false;
        if(df && data > df) return false;
        if(tipo !== "todos"){
            var doc = normalizar(v.documento || v.tipoDocumento || "");
            if(tipo === "NFC-e"  && !["nfc-e","nfce","nfc"].includes(doc)) return false;
            if(tipo === "Pedido" && !["pedido","não fiscal","nao fiscal"].includes(doc)) return false;
        }
        return true;
    });
}

function _renderizarDashVendas(base, di, df, tipo, hoje){
    var vendas = _filtrarVendasDash(base.vendas, di, df, tipo);
    var totalGeral = vendas.reduce(function(s,v){ return s + numero(v.total); }, 0);
    var qtd = vendas.length;
    var ticketMedio = qtd ? totalGeral / qtd : 0;
    var produtosVendidos = vendas.reduce(function(s,v){
        return s + (Array.isArray(v.itens) ? v.itens.reduce(function(si,it){ return si + numero(it.qtd||it.quantidade||1); }, 0) : 0);
    }, 0);
    var devolucoes = (base.vendasCanceladas || []).filter(function(v){
        var d = String(v.canceladaEm||v.data||"").slice(0,10);
        return (!di || d >= di) && (!df || d <= df);
    }).reduce(function(s,v){ return s + numero(v.total); }, 0);

    definirTexto("dashDataHoje", new Date(hoje+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}));
    definirTexto("dashTotalVendas", formatarMoedaRS(totalGeral));
    definirTexto("dashQtdVendas", qtd);
    definirTexto("dashTicketMedio", formatarMoedaRS(ticketMedio));
    definirTexto("dashProdutosVendidos", Math.round(produtosVendidos));
    definirTexto("dashDevolucoes", formatarMoedaRS(devolucoes));

    var dados7 = _calcularDash7Dias(base.vendas, tipo);
    var tipoGraf = document.querySelector("input[name='tipoGraficoDash']:checked")?.value || "linha";
    var elGraf = document.getElementById("dashGrafico7Dias");
    if(elGraf) elGraf.innerHTML = tipoGraf === "barra" ? _gerarSvgBarra(dados7) : _gerarSvgLinha(dados7);

    var top5 = _calcularTop5Dash(vendas);
    _renderizarDonutDash(top5);
    var listaEl = document.getElementById("dashTop5Lista");
    if(listaEl){
        var CORES7 = ["#2563eb","#16a34a","#f59e0b","#8b5cf6","#ef4444"];
        listaEl.innerHTML = top5.length
            ? top5.map(function(p,i){ return "<li class='dash-top5-item'><span class='dash-top5-cor' style='background:"+CORES7[i]+"'></span><span class='dash-top5-nome'>"+escapar(p.nome)+"</span><span class='dash-top5-val'>"+formatarMoedaRS(p.valor)+"</span></li>"; }).join("")
            : "<li class='dash-top5-vazio'>Sem dados no período.</li>";
    }

    _renderizarAvisosDash(base, vendas);
    _renderizarMovDash(base);
    _renderizarEstoqueDash(base);
}

function _calcularDash7Dias(todasVendas, tipo){
    var lista = [];
    for(var i = 6; i >= 0; i--){
        var d = new Date(); d.setDate(d.getDate() - i);
        var chave = d.toISOString().slice(0,10);
        var label = d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
        var total = _filtrarVendasDash(todasVendas, chave, chave, tipo).reduce(function(s,v){ return s + numero(v.total); }, 0);
        lista.push({ label: label, total: total });
    }
    return lista;
}

function _calcularTop5Dash(vendas){
    var mapa = {};
    (vendas || []).forEach(function(v){
        (v.itens || []).forEach(function(it){
            var id = it.id || it.produtoId || it.descricao || "?";
            var nome = it.descricao || it.nome || id;
            var val = numero(it.total || (numero(it.precoUnitario||it.valor||0) * numero(it.qtd||it.quantidade||1)));
            if(!mapa[id]) mapa[id] = { nome: nome, valor: 0 };
            mapa[id].valor += val;
        });
    });
    return Object.values(mapa).sort(function(a,b){ return b.valor - a.valor; }).slice(0,5);
}

function _renderizarDonutDash(dados){
    var canvas = document.getElementById("dashGraficoDonut");
    if(!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(!dados || !dados.length){
        ctx.font = "10px Segoe UI"; ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center";
        ctx.fillText("Sem dados", canvas.width/2, canvas.height/2 + 4); return;
    }
    var CORES = ["#2563eb","#16a34a","#f59e0b","#8b5cf6","#ef4444"];
    var total = dados.reduce(function(s,d){ return s + d.valor; }, 0) || 1;
    var cx = canvas.width/2, cy = canvas.height/2;
    var r = Math.min(cx,cy) - 4, rIn = r * 0.58;
    var ang = -Math.PI / 2;
    dados.forEach(function(d,i){
        var fatia = (d.valor / total) * 2 * Math.PI;
        ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.arc(cx, cy, r, ang, ang + fatia);
        ctx.closePath(); ctx.fillStyle = CORES[i % CORES.length]; ctx.fill();
        ang += fatia;
    });
    ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, 2*Math.PI);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.textAlign = "center"; ctx.fillStyle = "#0f172a";
    ctx.font = "bold 10px Segoe UI"; ctx.fillText("Top 5", cx, cy - 2);
}

function _fmtKDash(v){
    if(v >= 1000000) return "R$"+(v/1000000).toFixed(1)+"M";
    if(v >= 1000)    return "R$"+(v/1000).toFixed(1)+"k";
    return "R$"+v.toFixed(0);
}

function _gerarSvgLinha(dados){
    if(!dados || !dados.length) return "<p class='dash-sem-dados'>Sem dados.</p>";
    var W=560, H=195, padL=50, padR=14, padT=22, padB=36;
    var w=W-padL-padR, h=H-padT-padB;
    var max = Math.max.apply(null, dados.map(function(d){ return d.total; }).concat([1]));
    function X(i){ return padL + (dados.length > 1 ? (i/(dados.length-1))*w : w/2); }
    function Y(v){ return padT + h - (v/max)*h; }
    var pontos = dados.map(function(d,i){ return { x:X(i), y:Y(d.total), d:d }; });
    var linha = pontos.map(function(p,i){ return (i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1); }).join(" ");
    var area  = linha + " L"+pontos[pontos.length-1].x.toFixed(1)+","+(padT+h)+" L"+padL+","+(padT+h)+" Z";
    var grid  = [0,0.25,0.5,0.75,1].map(function(p){
        var y = (padT+h-p*h).toFixed(1);
        return "<line x1='"+padL+"' y1='"+y+"' x2='"+(padL+w)+"' y2='"+y+"' stroke='#e2e8f0' stroke-width='1' stroke-dasharray='4,4'/>"+
               "<text x='"+(padL-5)+"' y='"+(parseFloat(y)+4)+"' text-anchor='end' font-size='9' fill='#94a3b8'>"+_fmtKDash(max*p)+"</text>";
    }).join("");
    var circles = pontos.map(function(p){ return "<circle cx='"+p.x.toFixed(1)+"' cy='"+p.y.toFixed(1)+"' r='4' fill='#2563eb' stroke='#fff' stroke-width='2'/>"; }).join("");
    var vals2   = pontos.map(function(p){ return "<text x='"+p.x.toFixed(1)+"' y='"+(p.y-9).toFixed(1)+"' text-anchor='middle' font-size='9' fill='#2563eb' font-weight='700'>"+_fmtKDash(p.d.total)+"</text>"; }).join("");
    var labels  = pontos.map(function(p){ return "<text x='"+p.x.toFixed(1)+"' y='"+(padT+h+15)+"' text-anchor='middle' font-size='9.5' fill='#94a3b8'>"+escapar(p.d.label)+"</text>"; }).join("");
    return "<svg viewBox='0 0 "+W+" "+H+"' width='100%' style='display:block'>"+
        "<defs><linearGradient id='dg1' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#2563eb' stop-opacity='.14'/><stop offset='100%' stop-color='#2563eb' stop-opacity='.01'/></linearGradient></defs>"+
        grid+"<path d='"+area+"' fill='url(#dg1)'/><path d='"+linha+"' fill='none' stroke='#2563eb' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>"+
        circles+vals2+labels+"</svg>";
}

function _gerarSvgBarra(dados){
    if(!dados || !dados.length) return "<p class='dash-sem-dados'>Sem dados.</p>";
    var W=560, H=195, padL=50, padR=14, padT=22, padB=36;
    var w=W-padL-padR, h=H-padT-padB;
    var max = Math.max.apply(null, dados.map(function(d){ return d.total; }).concat([1]));
    var segW = w / dados.length, bw = Math.min(44, segW - 10);
    var grid = [0,0.25,0.5,0.75,1].map(function(p){
        var y = (padT+h-p*h).toFixed(1);
        return "<line x1='"+padL+"' y1='"+y+"' x2='"+(padL+w)+"' y2='"+y+"' stroke='#e2e8f0' stroke-width='1' stroke-dasharray='4,4'/>"+
               "<text x='"+(padL-5)+"' y='"+(parseFloat(y)+4)+"' text-anchor='end' font-size='9' fill='#94a3b8'>"+_fmtKDash(max*p)+"</text>";
    }).join("");
    var barras = dados.map(function(d,i){
        var cx = padL + i*segW + segW/2, bx = cx - bw/2;
        var bh = max > 0 ? (d.total/max)*h : 0, by = padT+h-bh;
        return "<rect x='"+bx.toFixed(1)+"' y='"+by.toFixed(1)+"' width='"+bw+"' height='"+bh.toFixed(1)+"' fill='#2563eb' rx='5' opacity='.85'/>"+
               "<text x='"+cx.toFixed(1)+"' y='"+(padT+h+15)+"' text-anchor='middle' font-size='9.5' fill='#94a3b8'>"+escapar(d.label)+"</text>";
    }).join("");
    return "<svg viewBox='0 0 "+W+" "+H+"' width='100%' style='display:block'>"+grid+barras+"</svg>";
}

function _renderizarAvisosDash(base, vendas){
    var el = document.getElementById("dashAvisos");
    if(!el) return;
    var avisos = [];
    var mercs = base.mercadorias || [];
    var semEst  = mercs.filter(function(p){ return numero(p.estoque||p.estoqueAtual) <= 0; }).length;
    var baixoEst = mercs.filter(function(p){
        var e = numero(p.estoque||p.estoqueAtual), m = numero(p.estoqueMinimo||p.minEstoque);
        return e > 0 && m > 0 && e <= m;
    }).length;
    var aReceber = (base.contasReceber||[]).filter(function(c){ return normalizar(c.status||"") !== "pago"; }).length;
    var aPagar   = (base.contasPagar||[]).filter(function(c){ return normalizar(c.status||"") !== "pago"; }).length;
    if(semEst)   avisos.push({ tipo:"perigo", msg: semEst + " produto(s) sem estoque." });
    if(baixoEst) avisos.push({ tipo:"aviso",  msg: baixoEst + " produto(s) com estoque abaixo do mínimo." });
    if(aPagar)   avisos.push({ tipo:"aviso",  msg: aPagar + " conta(s) a pagar em aberto." });
    if(aReceber) avisos.push({ tipo:"info",   msg: aReceber + " recebimento(s) pendente(s)." });
    if(!vendas.length) avisos.push({ tipo:"info", msg:"Nenhuma venda no período selecionado." });
    else avisos.push({ tipo:"ok", msg: vendas.length + " venda(s) no período — " + formatarMoedaRS(vendas.reduce(function(s,v){ return s+numero(v.total); },0)) });
    el.innerHTML = avisos.map(function(a){
        return "<li class='dash-aviso-item'><span class='dash-aviso-dot dash-aviso-"+a.tipo+"'></span><span>"+escapar(a.msg)+"</span></li>";
    }).join("");
}

function _renderizarMovDash(base){
    var tbody = document.getElementById("dashMovimentacoes");
    if(!tbody) return;
    var ICONES = {
        "venda finalizada": "<i class='fa-solid fa-arrow-trend-up dash-icon-venda'></i>",
        "venda cancelada":  "<i class='fa-solid fa-xmark dash-icon-cancelado'></i>",
        "sangria":          "<i class='fa-solid fa-arrow-trend-down dash-icon-sangria'></i>",
        "suprimento":       "<i class='fa-solid fa-plus dash-icon-suprimento'></i>",
        "venda guardada":   "<i class='fa-regular fa-clock dash-icon-guardado'></i>"
    };
    var eventos = montarEventosCaixa(base).slice(0, 10);
    if(!eventos.length){ tbody.innerHTML = "<tr><td colspan='5' class='vazio'>Nenhuma movimentação.</td></tr>"; return; }
    tbody.innerHTML = eventos.map(function(e){
        var ic = ICONES[normalizar(e.tipo||"")] || "<i class='fa-solid fa-circle-dot'></i>";
        return "<tr><td><span class='dash-mov-tipo'>"+ic+" "+escapar(e.tipo)+"</span></td>"+
            "<td>"+escapar(String(e.detalhe||e.descricao||"").slice(0,40))+"</td>"+
            "<td><strong>"+formatarMoedaRS(e.total||0)+"</strong></td>"+
            "<td>"+fmtDtHr(e.data)+"</td><td>"+escapar(e.operador||"-")+"</td></tr>";
    }).join("");
}

function _renderizarEstoqueDash(base){
    var mercs = base.mercadorias || [];
    definirTexto("dashProdutosCadastrados", mercs.length);
    definirTexto("dashEstoqueBaixo", mercs.filter(function(p){ var e=numero(p.estoque||p.estoqueAtual),m=numero(p.estoqueMinimo||p.minEstoque); return e>0&&m>0&&e<=m; }).length);
    definirTexto("dashSemEstoque", mercs.filter(function(p){ return numero(p.estoque||p.estoqueAtual) <= 0; }).length);
    definirTexto("dashValorEstoque", formatarMoedaRS(mercs.reduce(function(s,p){ return s+numero(p.estoque||p.estoqueAtual)*numero(p.precoCusto||p.custo||p.precoCompra||0); },0)));
}

function _carregarDashVendasApi(di, df, tipo){
    var cfg = window.SistemaApiConfig ? window.SistemaApiConfig.obter() : null;
    if(!cfg || !cfg.baseUrl) return;
    var token = localStorage.getItem("tokenApiSistema") || "";
    fetch(cfg.baseUrl+"/dashboard/vendas?dataInicio="+di+"&dataFim="+df+"&tipo="+encodeURIComponent(tipo), {
        headers: { "Authorization":"Bearer "+token, "Accept":"application/json" }
    }).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(d){
        if(d.resumo){
            definirTexto("dashTotalVendas",    formatarMoedaRS(d.resumo.totalVendas||0));
            definirTexto("dashQtdVendas",       d.resumo.qtdVendas||0);
            definirTexto("dashTicketMedio",    formatarMoedaRS(d.resumo.ticketMedio||0));
            definirTexto("dashProdutosVendidos", d.resumo.produtosVendidos||0);
            definirTexto("dashDevolucoes",     formatarMoedaRS(d.resumo.devolucoes||0));
        }
        if(d.chart7dias){
            var tg = document.querySelector("input[name='tipoGraficoDash']:checked")?.value || "linha";
            var el = document.getElementById("dashGrafico7Dias");
            if(el) el.innerHTML = tg==="barra" ? _gerarSvgBarra(d.chart7dias) : _gerarSvgLinha(d.chart7dias);
        }
        if(d.top5) _renderizarDonutDash(d.top5);
        if(d.estoque){
            definirTexto("dashProdutosCadastrados", d.estoque.total||0);
            definirTexto("dashEstoqueBaixo",        d.estoque.baixo||0);
            definirTexto("dashSemEstoque",          d.estoque.semEstoque||0);
            definirTexto("dashValorEstoque",       formatarMoedaRS(d.estoque.valorTotal||0));
        }
    }).catch(function(e){ console.warn("[DashVendas] API offline:", e.message); });
}

/* ── UTILIDADES (duplicadas de movimento.js — tambem usadas por "Eventos do Caixa" la) ── */
function fmtDtHr(v){ if(!v) return "-"; var d = new Date(v); return isNaN(d) ? "-" : d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}); }

function montarEventosCaixa(base){
    var reg = (base.eventosCaixa || []).map(function(e){
        return { tipo:e.tipo||"Evento", detalhe:e.detalhe||"", data:e.data||e.criadoEm||"", operador:e.operador, cliente:e.cliente, total:e.total??e.valor, produtos:Array.isArray(e.produtos)?e.produtos:[], vendaId:e.vendaId };
    });
    var chaves = new Set(reg.map(function(e){ return normalizar(e.tipo)+":"+(e.vendaId||""); }));
    var vendas = (base.vendas||[]).filter(function(v){ return !chaves.has("venda finalizada:"+(v.id||"")); }).map(function(v){
        return {tipo:"Venda finalizada",detalhe:(v.documento||"Venda")+" "+(v.id||"")+" | "+(v.pagamento||""),data:v.data,operador:v.usuarioNome||v.usuarioLogin,cliente:v.cliente?.nome||v.cliente||"Consumidor",total:v.total,produtos:v.itens||[],vendaId:v.id};
    });
    var cancel = (base.vendasCanceladas||[]).filter(function(v){ return !chaves.has("venda cancelada:"+(v.id||"")); }).map(function(v){
        return {tipo:"Venda cancelada",detalhe:(v.documento||"Venda")+" "+(v.id||""),data:v.canceladaEm||v.data,operador:v.usuarioNome,cliente:v.cliente?.nome||v.cliente||"Consumidor",total:v.total,produtos:v.itens||[]};
    });
    var movs = (base.movimentosCaixa||[]).filter(Boolean).map(function(m){
        return {tipo:m.tipo==="sangria"?"Sangria":"Suprimento",detalhe:m.observacao||"",data:m.data,operador:m.operador,total:m.valor,produtos:[]};
    });
    var gd = lerJson("vendaGuardada",null);
    var guard = gd?.itens?.length ? [{tipo:"Venda guardada",detalhe:"Venda em espera - "+gd.itens.length+" itens",data:gd.data||"",cliente:gd.cliente?.nome||"Consumidor",total:(gd.itens||[]).reduce(function(s,i){ return s+numero(i.total||0); },0),produtos:gd.itens}] : [];
    return reg.concat(vendas,cancel,movs,guard).sort(function(a,b){ return new Date(b.data||0)-new Date(a.data||0); });
}
