/* eventoscaixa.js */
/* Extraido de movimento.js (secao "10. EVENTOS DO CAIXA") para virar pagina propria. */

document.addEventListener("DOMContentLoaded", function(){
    renderizarEventos();
    document.getElementById("filtroTipoEvento")?.addEventListener("change", renderizarEventos);
    document.getElementById("buscaEventos")?.addEventListener("input", renderizarEventos);
});

function renderizarEventos(){
    var base = obterBase();
    var filtroTipo = document.getElementById("filtroTipoEvento")?.value || "";
    var busca = normalizar(document.getElementById("buscaEventos")?.value || "");
    var eventos = montarEventosCaixa(base).filter(function(e){
        if(filtroTipo && e.tipo !== filtroTipo) return false;
        if(busca && !normalizar([e.tipo, e.detalhe || "", e.operador || "", e.cliente || ""].join(" ")).includes(busca)) return false;
        return true;
    });
    definirTexto("totalEventos", eventos.length + " evento(s)");
    var lista = document.getElementById("listaEventos");
    if(!lista) return;
    if(!eventos.length){ lista.innerHTML = "<div class='vazio'>Nenhum evento encontrado.</div>"; return; }
    lista.innerHTML = eventos.slice(0, 80).map(function(e){
        var produtos = Array.isArray(e.produtos) ? e.produtos.slice(0, 5) : [];
        var prodsHtml = produtos.length
            ? "<div class='evento-produtos'>" + produtos.map(function(p){ return "<span>" + escapar(p.nome || p.descricao || "Produto") + " x" + fmtQtd(p.qtd || p.quantidade || 1) + "</span>"; }).join("") + "</div>"
            : "";
        return "<div class='evento-item' data-tipo='" + escapar(e.tipo) + "'>"
            + "<div class='evento-info'>"
            + "<strong>" + escapar(e.tipo) + "</strong>"
            + "<small>" + escapar(e.detalhe || "-") + "</small>"
            + "<small>Operador: " + escapar(e.operador || "-") + " - Cliente: " + escapar(e.cliente || "Consumidor") + "</small>"
            + prodsHtml
            + "</div>"
            + "<div class='evento-meta'>"
            + (e.total !== undefined ? "<strong>" + formatarMoedaRS(e.total) + "</strong>" : "")
            + "<small>" + fmtDtHr(e.data) + "</small>"
            + "</div>"
            + "</div>";
    }).join("");
}

/* ── UTILIDADES (duplicadas de movimento.js — mesma origem do dashboard de Vendas PDV) ── */
function fmtQtd(v){ return numero(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:3}); }
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
