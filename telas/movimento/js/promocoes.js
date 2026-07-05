/* promocoes.js */
/* Extraido de movimento.js (secao "4. PROMOCOES") para virar pagina propria. */

document.addEventListener("DOMContentLoaded", function(){
    renderizarPromocoes();
    document.getElementById("buscaPromocoes")?.addEventListener("input", renderizarPromocoes);
    document.getElementById("filtroPromocoes")?.addEventListener("change", renderizarPromocoes);
    document.getElementById("btnSalvarPromocoes")?.addEventListener("click", salvarPromocoes);
});

function renderizarPromocoes(){
    var base = obterBase();
    var busca = normalizar(document.getElementById("buscaPromocoes")?.value || "");
    var filtro = document.getElementById("filtroPromocoes")?.value || "";
    var lista = (base.mercadorias || []).filter(function(p){
        if(p.ativo === false) return false;
        if(filtro === "ativas" && !numero(p.precoPromocional)) return false;
        if(filtro === "sem" && numero(p.precoPromocional) > 0) return false;
        if(busca && !normalizar(p.descricao || "").includes(busca)) return false;
        return true;
    });
    var tbody = document.getElementById("listaPromocoes");
    if(!tbody) return;
    if(!lista.length){ tbody.innerHTML = "<tr><td colspan='6' class='vazio'>Nenhum produto encontrado.</td></tr>"; return; }
    tbody.innerHTML = lista.map(function(p){
        var promo = numero(p.precoPromocional);
        var normal = numero(p.precoVenda);
        var descPct = promo > 0 && normal > 0 ? ((1 - promo / normal) * 100).toFixed(1) + "%" : "-";
        return "<tr>"
            + "<td>" + escapar(p.codigo || "-") + "</td>"
            + "<td>" + escapar(p.descricao || "") + "</td>"
            + "<td>" + formatarMoedaRS(normal) + "</td>"
            + "<td><input type='number' class='input-promocao' data-id='" + escapar(p.id) + "' value='" + (promo || "") + "' placeholder='0,00' step='0.01' min='0'></td>"
            + "<td>" + descPct + "</td>"
            + "<td>" + (promo > 0 ? "<button class='btn-remover-promo' onclick='removerPromocao(\"" + escapar(p.id) + "\")'>Remover</button>" : "-") + "</td>"
            + "</tr>";
    }).join("");
}

function removerPromocao(id){
    var base = obterBase();
    var idx = base.mercadorias.findIndex(function(p){ return p.id === id; });
    if(idx >= 0){ base.mercadorias[idx].precoPromocional = 0; salvarBase(base); }
    renderizarPromocoes();
    notificar("Promocao removida.", "sucesso");
}

function salvarPromocoes(){
    var base = obterBase();
    document.querySelectorAll(".input-promocao").forEach(function(input){
        var id = input.dataset.id;
        var idx = base.mercadorias.findIndex(function(p){ return p.id === id; });
        if(idx >= 0) base.mercadorias[idx].precoPromocional = numero(input.value);
    });
    salvarBase(base);
    notificar("Promocoes salvas.", "sucesso");
    renderizarPromocoes();
}
