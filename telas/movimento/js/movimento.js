/* movimento.js */

var setorAtual = null;

var SETORES = {
    projecao:  { titulo: "Projecao de Lucro",     desc: "Receita, custo e margem por produto no periodo." }
};

document.addEventListener("DOMContentLoaded", function(){
    document.body.classList.add("hub-ativo");
    atualizarKpis();
    inicializarListeners();
    abrirSetorPorHashMovimento();
});

/* ── NAVEGACAO HUB/SETOR ── */
function abrirSetor(id){
    setorAtual = id;
    var info = SETORES[id] || {};
    document.body.classList.toggle("hub-ativo", false);
    document.getElementById("topoHub").classList.add("recolhido");
    document.getElementById("topoSetor").classList.remove("recolhido");
    definirTexto("tituloSetor", info.titulo || id);
    definirTexto("descSetor", info.desc || "");
    document.getElementById("hubCards").classList.add("recolhido");
    document.querySelectorAll(".setor-view").forEach(function(s){
        s.classList.toggle("recolhido", s.id !== "setor-" + id);
    });
    var setor = document.getElementById("setor-" + id);
    if(setor){
        setor.classList.remove("recolhido");
        setor.style.display = "block";
    }
    if(id === "projecao") preencherProjecaoPadrao();
    try{
        renderizarSetor(id);
    }catch(erro){
        if(id === "projecao") preencherProjecaoPadrao();
        console.error(erro);
    }
}

function abrirSetorPorHashMovimento(){
    var id = String(location.hash || "").replace("#setor-", "").replace("#", "");
    if(id && SETORES[id]){
        abrirSetor(id);
    }
}

function voltarHub(){
    setorAtual = null;
    document.body.classList.add("hub-ativo");
    document.getElementById("topoHub").classList.remove("recolhido");
    document.getElementById("topoSetor").classList.add("recolhido");
    document.getElementById("hubCards").classList.remove("recolhido");
    document.querySelectorAll(".setor-view").forEach(function(s){
        s.classList.add("recolhido");
        s.style.display = "";
    });
}

function renderizarSetor(id){
    var mapa = {
        projecao: renderizarProjecao
    };
    if(mapa[id]) mapa[id]();
}

/* ── KPIs ── */
function atualizarKpis(){
    var base = obterBase();
    var hoje = new Date().toISOString().slice(0, 10);
    var vendasHoje = base.vendas.filter(function(v){ return String(v.data || "").slice(0, 10) === hoje; });
    var totalReceber = (base.contasReceber || []).filter(function(c){ return normalizar(c.status || "") !== "pago"; }).reduce(function(s, c){ return s + numero(c.valor); }, 0);
    var totalPagar   = (base.contasPagar  || []).filter(function(c){ return normalizar(c.status || "") !== "pago"; }).reduce(function(s, c){ return s + numero(c.valor); }, 0);
    definirTexto("kpiVendasHoje", formatarMoedaRS(somar(vendasHoje, "total")));
    definirTexto("kpiReceber", formatarMoedaRS(totalReceber));
    definirTexto("kpiPagar", formatarMoedaRS(totalPagar));
    definirTexto("kpiSaldo", formatarMoedaRS(totalReceber - totalPagar));
}

/* ── LISTENERS ── */
function inicializarListeners(){
    document.getElementById("filtroProjecaoPeriodo")?.addEventListener("change", renderizarProjecao);
    document.querySelectorAll("[data-proj-periodo]").forEach(function(botao){
        botao.addEventListener("click", function(){
            document.querySelectorAll("[data-proj-periodo]").forEach(function(item){ item.classList.remove("ativo"); });
            botao.classList.add("ativo");
            if(botao.dataset.projPeriodo !== "personalizado"){
                var seletor = document.getElementById("filtroProjecaoPeriodo");
                if(seletor) seletor.value = botao.dataset.projPeriodo;
            }
            document.getElementById("filtroProjecaoPersonalizado")?.classList.toggle("recolhido", botao.dataset.projPeriodo !== "personalizado");
            renderizarProjecao();
        });
    });
    ["projDataInicio","projDataFim","projFiltroLoja","projFiltroCategoria","projFiltroFornecedor","projFiltroGrupoTributario"].forEach(function(id){
        document.getElementById(id)?.addEventListener("change", renderizarProjecao);
    });
    ["simCusto","simImpostos","simDespesas","simMargem"].forEach(function(id){
        document.getElementById(id)?.addEventListener("input", calcularSimuladorPreco);
    });
    document.getElementById("btnAtualizarProjecao")?.addEventListener("click", renderizarProjecao);
    document.getElementById("btnExportarProjecaoExcel")?.addEventListener("click", exportarProjecaoExcel);
    document.getElementById("btnExportarProjecaoPdf")?.addEventListener("click", exportarProjecaoPdf);
    document.getElementById("btnSimularCenario")?.addEventListener("click", calcularSimuladorPreco);
    document.getElementById("btnProdutosCriticos")?.addEventListener("click", destacarProdutosCriticos);
    document.getElementById("btnProjecaoDetalhes")?.addEventListener("click", function(){
        window.projecaoMostrarTudo = !window.projecaoMostrarTudo;
        renderizarProjecao();
    });
}

/* ══════════════════════════════════════
   3. CONTAGEM DE ESTOQUE
══════════════════════════════════════ */
function renderizarEstoque(){
    var base = obterBase();
    var busca = normalizar(document.getElementById("buscaEstoque")?.value || "");
    var filtro = document.getElementById("filtroEstoque")?.value || "";
    var lista = (base.mercadorias || []).filter(function(p){
        if(p.ativo === false) return false;
        if(filtro === "baixo" && numero(p.estoque) > numero(p.estoqueMinimo)) return false;
        if(filtro === "zerado" && numero(p.estoque) > 0) return false;
        if(busca && !normalizar(p.descricao || "").includes(busca) && !normalizar(p.codigo || "").includes(busca)) return false;
        return true;
    });
    var tbody = document.getElementById("listaEstoque");
    if(!tbody) return;
    if(!lista.length){ tbody.innerHTML = "<tr><td colspan='6' class='vazio'>Nenhum produto encontrado.</td></tr>"; return; }
    tbody.innerHTML = lista.map(function(p){
        var est = numero(p.estoque);
        return "<tr>"
            + "<td>" + escapar(p.codigo || "-") + "</td>"
            + "<td>" + escapar(p.descricao || "") + "</td>"
            + "<td>" + escapar(p.unidade || "UN") + "</td>"
            + "<td>" + fmtQtd(est) + "</td>"
            + "<td><input type='number' class='input-contagem' data-id='" + escapar(p.id) + "' value='" + est + "' step='0.001' min='0' oninput='atualizarDiff(this)'></td>"
            + "<td class='diff-neutro' id='diff-" + escapar(p.id) + "'>-</td>"
            + "</tr>";
    }).join("");
}

function atualizarDiff(input){
    var id = input.dataset.id;
    var base = obterBase();
    var prod = (base.mercadorias || []).find(function(p){ return p.id === id; });
    if(!prod) return;
    var novo = numero(input.value);
    var atual = numero(prod.estoque);
    var diff = novo - atual;
    var celula = document.getElementById("diff-" + id);
    if(!celula) return;
    if(diff > 0){ celula.className = "diff-positivo"; celula.textContent = "+" + fmtQtd(diff); }
    else if(diff < 0){ celula.className = "diff-negativo"; celula.textContent = fmtQtd(diff); }
    else { celula.className = "diff-neutro"; celula.textContent = "-"; }
}

function salvarContagem(){
    var base = obterBase();
    var alterados = 0;
    document.querySelectorAll(".input-contagem").forEach(function(input){
        var id = input.dataset.id;
        var idx = base.mercadorias.findIndex(function(p){ return p.id === id; });
        if(idx < 0) return;
        var novo = numero(input.value);
        if(novo !== numero(base.mercadorias[idx].estoque)){
            base.mercadorias[idx].estoque = novo;
            alterados++;
        }
    });
    if(!alterados){ notificar("Nenhuma alteracao detectada."); return; }
    salvarBase(base);
    notificar(alterados + " produto(s) atualizado(s).", "sucesso");
    renderizarEstoque();
}

/* ══════════════════════════════════════
   11. FLUXO DE CAIXA
══════════════════════════════════════ */
function renderizarFluxo(){
    var base = obterBase();
    var dias = Number(document.getElementById("filtroFluxoPeriodo")?.value || 30);
    var hoje = new Date();
    var mapa = {};
    for(var i = dias - 1; i >= 0; i--){
        var d = new Date(hoje);
        d.setDate(d.getDate() - i);
        var chave = d.toISOString().slice(0, 10);
        mapa[chave] = { entradas: 0, saidas: 0 };
    }
    (base.vendas || []).forEach(function(v){
        var d = String(v.data || "").slice(0, 10);
        if(mapa[d]) mapa[d].entradas += numero(v.total);
    });
    (base.movimentosCaixa || []).forEach(function(m){
        var d = String(m.data || "").slice(0, 10);
        if(!mapa[d]) return;
        if(m.tipo === "suprimento") mapa[d].entradas += numero(m.valor);
        else mapa[d].saidas += numero(m.valor);
    });
    (base.contasPagar || []).forEach(function(c){
        if(normalizar(c.status || "") !== "pago") return;
        var d = String(c.pagoEm || c.vencimento || "").slice(0, 10);
        if(mapa[d]) mapa[d].saidas += numero(c.valor);
    });
    var totalEntradas = 0, totalSaidas = 0;
    Object.values(mapa).forEach(function(v){ totalEntradas += v.entradas; totalSaidas += v.saidas; });
    definirTexto("fluxoEntradas", "Entradas: " + formatarMoedaRS(totalEntradas));
    definirTexto("fluxoSaidas", "Saidas: " + formatarMoedaRS(totalSaidas));
    definirTexto("fluxoSaldo", "Saldo: " + formatarMoedaRS(totalEntradas - totalSaidas));
    var lista = document.getElementById("listaFluxo");
    if(!lista) return;
    var linhas = Object.entries(mapa).reverse();
    if(!linhas.some(function(l){ return l[1].entradas > 0 || l[1].saidas > 0; })){
        lista.innerHTML = "<div class='vazio'>Sem movimentacao no periodo.</div>";
        return;
    }
    lista.innerHTML = linhas.map(function(entry){
        var data = entry[0]; var v = entry[1];
        var saldo = v.entradas - v.saidas;
        var ds = new Date(data + "T12:00:00");
        var label = ds.toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit" });
        return "<div class='fluxo-dia'>"
            + "<span class='fluxo-data'>" + label + "</span>"
            + "<span class='fluxo-entrada'>Entradas: " + formatarMoedaRS(v.entradas) + "</span>"
            + "<span class='fluxo-saida'>Saidas: " + formatarMoedaRS(v.saidas) + "</span>"
            + "<span class='fluxo-saldo'>Saldo: " + formatarMoedaRS(saldo) + "</span>"
            + "</div>";
    }).join("");
}

/* ══════════════════════════════════════
   12. PROJECAO DE LUCRO
══════════════════════════════════════ */
function renderizarProjecao(){
    var base = obterBase();
    preencherProjecaoPadrao();
    preencherFiltrosProjecao(base);
    var periodo = obterPeriodoProjecao();
    var vendas = (base.vendas || []).filter(function(v){
        var data = String(v.data || "").slice(0, 10);
        return (!periodo.inicio || data >= periodo.inicio) && (!periodo.fim || data <= periodo.fim);
    });
    var filtroLoja = document.getElementById("projFiltroLoja")?.value || "";
    var filtroCategoria = document.getElementById("projFiltroCategoria")?.value || "";
    var filtroFornecedor = document.getElementById("projFiltroFornecedor")?.value || "";
    var filtroGrupo = document.getElementById("projFiltroGrupoTributario")?.value || "";
    var mapaLucro = {};
    vendas.forEach(function(venda){
        if(filtroLoja && String(venda.loja || venda.lojaId || venda.empresa || "") !== filtroLoja) return;
        (venda.itens || []).forEach(function(item){
            var id = item.id || item.produtoId || "";
            var descricao = item.descricao || item.nome || "";
            var qtd = numero(item.qtd || item.quantidade || 1);
            var receitaItem = numero(item.total || (item.precoUnitario * qtd));
            var prod = (base.mercadorias || []).find(function(p){ return p.id === id; });
            var categoria = prod?.categoria || item.categoria || "Sem categoria";
            var fornecedor = prod?.fornecedor || prod?.fornecedorNome || prod?.fornecedorCnpj || "";
            var grupoTributario = prod?.grupoTributario || prod?.grupoTributarioProduto || prod?.perfilFiscal || prod?.tributacao || "";
            if(filtroCategoria && categoria !== filtroCategoria) return;
            if(filtroFornecedor && fornecedor !== filtroFornecedor) return;
            if(filtroGrupo && grupoTributario !== filtroGrupo) return;
            var custoUnitario = numero(prod?.precoCusto || item.custo || item.precoCusto || 0);
            var custo = custoUnitario * qtd;
            var impostos = calcularImpostosProduto(prod, receitaItem);
            if(!mapaLucro[id]) mapaLucro[id] = { id: id, descricao: descricao, qtd: 0, receita: 0, custo: 0, impostos: 0, categoria: categoria, fornecedor: fornecedor, grupoTributario: grupoTributario, custoUnitario: custoUnitario };
            mapaLucro[id].qtd += qtd;
            mapaLucro[id].receita += receitaItem;
            mapaLucro[id].custo += custo;
            mapaLucro[id].impostos += impostos.total;
        });
    });
    var linhas = Object.values(mapaLucro).sort(function(a, b){ return b.receita - a.receita; });
    var usandoDemonstracao = !linhas.length;
    if(usandoDemonstracao) linhas = obterProjecaoDemonstrativa();
    var totalReceita = linhas.reduce(function(s, l){ return s + l.receita; }, 0);
    var totalCusto   = linhas.reduce(function(s, l){ return s + l.custo; }, 0);
    var totalImpostos = linhas.reduce(function(s, l){ return s + l.impostos; }, 0);
    var despesas = usandoDemonstracao ? 18000 : calcularDespesasPrevistas(base, periodo);
    var totalLucro   = totalReceita - totalCusto - despesas - totalImpostos;
    var margem = totalReceita > 0 ? (totalLucro / totalReceita * 100).toFixed(1) : 0;
    definirTexto("projReceita", formatarMoedaRS(totalReceita));
    definirTexto("projCusto", formatarMoedaRS(totalCusto));
    definirTexto("projDespesas", formatarMoedaRS(despesas));
    definirTexto("projLucro", formatarMoedaRS(totalLucro));
    definirTexto("projMargem", margem + "%");
    definirTexto("projTotalProdutos", linhas.length + " produto(s)");
    var tbody = document.getElementById("listaProjecao");
    if(!tbody) return;
    if(!linhas.length){
        tbody.innerHTML = "<tr><td colspan='6' class='vazio'>Sem vendas no periodo.</td></tr>";
        renderizarComplementosProjecao(base, periodo, [], {receita:0,custo:0,despesas:0,impostos:0,lucro:0});
        calcularSimuladorPreco();
        return;
    }
    tbody.innerHTML = linhas.slice(0, window.projecaoMostrarTudo ? linhas.length : 50).map(function(l){
        var lucro = l.receita - l.custo - l.impostos;
        var marg = l.receita > 0 ? (lucro / l.receita * 100).toFixed(1) : 0;
        return "<tr>"
            + "<td>" + escapar(l.descricao) + "</td>"
            + "<td>" + fmtQtd(l.qtd) + "</td>"
            + "<td>" + formatarMoedaRS(l.receita) + "</td>"
            + "<td>" + formatarMoedaRS(l.custo) + "</td>"
            + "<td class='" + (lucro >= 0 ? "diff-positivo" : "diff-negativo") + "'>" + formatarMoedaRS(lucro) + "</td>"
            + "<td>" + marg + "%</td>"
            + "</tr>";
    }).join("");
    document.getElementById("btnProjecaoDetalhes") && (document.getElementById("btnProjecaoDetalhes").innerHTML = window.projecaoMostrarTudo ? "<i class='fa-solid fa-list'></i>Ver menos" : "<i class='fa-solid fa-list'></i>Ver mais detalhes");
    renderizarComplementosProjecao(base, periodo, linhas, {receita:totalReceita,custo:totalCusto,despesas:despesas,impostos:totalImpostos,lucro:totalLucro});
    calcularSimuladorPreco();
}

function preencherProjecaoPadrao(){
    definirTexto("projReceita", "R$ 85.000,00");
    definirTexto("projCusto", "R$ 52.000,00");
    definirTexto("projDespesas", "R$ 18.000,00");
    definirTexto("projLucro", "R$ 15.000,00");
    definirTexto("projMargem", "17,65%");
    definirTexto("projLucro30Dias", "30 dias: R$ 15.000,00");
    definirTexto("intelMaiorLucro", "Whisky X");
    definirTexto("intelMenorLucro", "Acucar");
    definirTexto("intelParado", "Produto sem giro");
    definirTexto("intelAbaixoCusto", "Revisar precos criticos");
    definirTexto("intelCategoriaMais", "Bebidas");
    definirTexto("intelCategoriaMenos", "Mercearia");
    definirTexto("simPrecoSugerido", "R$ 19,50");
    definirTexto("simLucroLiquido", "R$ 6,50");
    definirTexto("cenarioConservador", "R$ 12.500,00");
    definirTexto("cenarioRealista", "R$ 15.000,00");
    definirTexto("cenarioOtimista", "R$ 19.800,00");
    var lista = document.getElementById("listaProjecao");
    if(lista) lista.innerHTML = "<tr><td>Arroz 5kg</td><td>100</td><td>R$ 3.000,00</td><td>R$ 2.000,00</td><td class='diff-positivo'>R$ 1.000,00</td><td>33,3%</td></tr><tr><td>Feijao 1kg</td><td>200</td><td>R$ 2.400,00</td><td>R$ 1.600,00</td><td class='diff-positivo'>R$ 800,00</td><td>33,3%</td></tr>";
    var mais = document.getElementById("projMaisLucrativos");
    if(mais) mais.innerHTML = "<tr><td>Whisky X</td><td>R$ 35,00</td></tr><tr><td>Perfume Y</td><td>R$ 28,00</td></tr><tr><td>Vinho Z</td><td>R$ 22,00</td></tr>";
    var menor = document.getElementById("projMenorMargem");
    if(menor) menor.innerHTML = "<tr><td>Refrigerante</td><td>5%</td></tr><tr><td>Agua Mineral</td><td>4%</td></tr><tr><td>Acucar</td><td>3%</td></tr>";
    var impostos = document.getElementById("projImpostos");
    if(impostos) impostos.innerHTML = "<tr><td>ICMS</td><td>R$ 2.500,00</td></tr><tr><td>PIS</td><td>R$ 450,00</td></tr><tr><td>COFINS</td><td>R$ 1.100,00</td></tr><tr><td>IPI</td><td>R$ 300,00</td></tr>";
    var categorias = document.getElementById("projCategorias");
    if(categorias) categorias.innerHTML = "<tr><td>Bebidas</td><td>R$ 25.000,00</td><td>R$ 8.000,00</td></tr><tr><td>Mercearia</td><td>R$ 40.000,00</td><td>R$ 6.500,00</td></tr><tr><td>Limpeza</td><td>R$ 20.000,00</td><td>R$ 4.000,00</td></tr>";
    var grafico = document.getElementById("graficoLucroMes");
    if(grafico) grafico.innerHTML = "<div class='barra-mes'><strong>R$ 8.500,00</strong><span style='height:82px'></span><small>Jan</small></div><div class='barra-mes'><strong>R$ 9.200,00</strong><span style='height:89px'></span><small>Fev</small></div><div class='barra-mes'><strong>R$ 12.800,00</strong><span style='height:123px'></span><small>Mar</small></div><div class='barra-mes'><strong>R$ 15.400,00</strong><span style='height:148px'></span><small>Abr</small></div><div class='barra-mes'><strong>R$ 18.700,00</strong><span style='height:180px'></span><small>Mai</small></div>";
}

function obterPeriodoProjecao(){
    var ativo = document.querySelector("[data-proj-periodo].ativo")?.dataset.projPeriodo;
    var dias = ativo && ativo !== "personalizado" ? Number(ativo) : Number(document.getElementById("filtroProjecaoPeriodo")?.value || 30);
    if(ativo === "personalizado"){
        return { inicio: document.getElementById("projDataInicio")?.value || "", fim: document.getElementById("projDataFim")?.value || "" };
    }
    var hoje = new Date();
    var inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - Math.max(1, dias) + 1);
    return { inicio: inicio.toISOString().slice(0, 10), fim: hoje.toISOString().slice(0, 10) };
}

function preencherFiltrosProjecao(base){
    if(window.filtrosProjecaoCarregados) return;
    preencherSelectProjecao("projFiltroCategoria", [...new Set((base.mercadorias || []).map(function(p){ return p.categoria || ""; }).filter(Boolean))], "Todas");
    preencherSelectProjecao("projFiltroFornecedor", [...new Set((base.mercadorias || []).map(function(p){ return p.fornecedor || p.fornecedorNome || p.fornecedorCnpj || ""; }).filter(Boolean))], "Todos");
    preencherSelectProjecao("projFiltroGrupoTributario", [...new Set((base.mercadorias || []).map(function(p){ return p.grupoTributario || p.grupoTributarioProduto || p.perfilFiscal || p.tributacao || ""; }).filter(Boolean))], "Todos");
    preencherSelectProjecao("projFiltroLoja", [...new Set((base.vendas || []).map(function(v){ return v.loja || v.lojaId || v.empresa || ""; }).filter(Boolean))], "Todas");
    window.filtrosProjecaoCarregados = true;
}

function preencherSelectProjecao(id, valores, textoInicial){
    var select = document.getElementById(id);
    if(!select) return;
    var valorAtual = select.value;
    select.innerHTML = "<option value=''>" + textoInicial + "</option>" + valores.sort().map(function(valor){
        return "<option value='" + escapar(valor) + "'>" + escapar(valor) + "</option>";
    }).join("");
    select.value = valores.includes(valorAtual) ? valorAtual : "";
}

function calcularDespesasPrevistas(base, periodo){
    return (base.contasPagar || []).filter(function(conta){
        var data = String(conta.vencimento || conta.data || "").slice(0, 10);
        return (!periodo.inicio || data >= periodo.inicio) && (!periodo.fim || data <= periodo.fim) && normalizar(conta.status || "") !== "pago";
    }).reduce(function(total, conta){ return total + numero(conta.saldo || conta.valor); }, 0);
}

function calcularImpostosProduto(produto, receita){
    produto = produto || {};
    var icms = receita * (numero(produto.aliquotaIcms || produto.icms) / 100);
    var pis = receita * (numero(produto.aliquotaPis || produto.pis) / 100);
    var cofins = receita * (numero(produto.aliquotaCofins || produto.cofins) / 100);
    var ipi = receita * (numero(produto.aliquotaIpi || produto.ipi) / 100);
    return { icms: icms, pis: pis, cofins: cofins, ipi: ipi, total: icms + pis + cofins + ipi };
}

function obterProjecaoDemonstrativa(){
    return [
        { id:"demo-arroz", descricao:"Arroz 5kg", qtd:100, receita:3000, custo:2000, impostos:0, categoria:"Mercearia", fornecedor:"Fornecedor Padrao", grupoTributario:"Tributado" },
        { id:"demo-feijao", descricao:"Feijao 1kg", qtd:200, receita:2400, custo:1600, impostos:0, categoria:"Mercearia", fornecedor:"Fornecedor Padrao", grupoTributario:"Tributado" },
        { id:"demo-whisky", descricao:"Whisky X", qtd:300, receita:25000, custo:14500, impostos:0, categoria:"Bebidas", fornecedor:"Distribuidora Premium", grupoTributario:"Tributado" },
        { id:"demo-perfume", descricao:"Perfume Y", qtd:250, receita:20000, custo:13000, impostos:0, categoria:"Perfumaria", fornecedor:"Fornecedor Premium", grupoTributario:"Tributado" },
        { id:"demo-vinho", descricao:"Vinho Z", qtd:200, receita:14600, custo:10200, impostos:0, categoria:"Bebidas", fornecedor:"Distribuidora Premium", grupoTributario:"Tributado" },
        { id:"demo-limpeza", descricao:"Kit Limpeza", qtd:180, receita:20000, custo:10700, impostos:0, categoria:"Limpeza", fornecedor:"Fornecedor Limpeza", grupoTributario:"Tributado" }
    ];
}

function renderizarComplementosProjecao(base, periodo, linhas, totais){
    var porLucro = linhas.map(function(l){ return Object.assign({}, l, { lucro: l.receita - l.custo - l.impostos, margem: l.receita ? (l.receita - l.custo - l.impostos) / l.receita * 100 : 0, lucroUnitario: l.qtd ? (l.receita - l.custo - l.impostos) / l.qtd : 0 }); });
    renderizarTabelaSimples("projMaisLucrativos", porLucro.slice().sort(function(a,b){ return b.lucroUnitario - a.lucroUnitario; }).slice(0, 5), function(item){
        return "<tr><td>" + escapar(item.descricao) + "</td><td>" + formatarMoedaRS(item.lucroUnitario) + "</td></tr>";
    }, 2);
    renderizarTabelaSimples("projMenorMargem", porLucro.filter(function(i){ return i.receita > 0; }).sort(function(a,b){ return a.margem - b.margem; }).slice(0, 5), function(item){
        return "<tr><td>" + escapar(item.descricao) + "</td><td>" + item.margem.toFixed(1) + "%</td></tr>";
    }, 2);
    var impostos = linhas.reduce(function(total, l){
        var prod = (base.mercadorias || []).find(function(p){ return p.id === l.id; });
        var imp = calcularImpostosProduto(prod, l.receita);
        total.icms += imp.icms; total.pis += imp.pis; total.cofins += imp.cofins; total.ipi += imp.ipi;
        return total;
    }, {icms:0,pis:0,cofins:0,ipi:0});
    if(!impostos.icms && !impostos.pis && !impostos.cofins && !impostos.ipi && linhas.some(function(l){ return String(l.id || "").indexOf("demo-") === 0; })){
        impostos = { icms:2500, pis:450, cofins:1100, ipi:300 };
    }
    renderizarTabelaSimples("projImpostos", [["ICMS", impostos.icms], ["PIS", impostos.pis], ["COFINS", impostos.cofins], ["IPI", impostos.ipi]], function(item){
        return "<tr><td>" + item[0] + "</td><td>" + formatarMoedaRS(item[1]) + "</td></tr>";
    }, 2);
    var categorias = Object.values(porLucro.reduce(function(mapa, item){
        var chave = item.categoria || "Sem categoria";
        if(!mapa[chave]) mapa[chave] = { categoria: chave, receita: 0, lucro: 0 };
        mapa[chave].receita += item.receita;
        mapa[chave].lucro += item.lucro;
        return mapa;
    }, {})).sort(function(a,b){ return b.lucro - a.lucro; });
    renderizarTabelaSimples("projCategorias", categorias, function(item){
        return "<tr><td>" + escapar(item.categoria) + "</td><td>" + formatarMoedaRS(item.receita) + "</td><td>" + formatarMoedaRS(item.lucro) + "</td></tr>";
    }, 3);
    renderizarGraficoLucro(base, linhas);
    definirTexto("cenarioConservador", formatarMoedaRS(totais.lucro * .9));
    definirTexto("cenarioRealista", formatarMoedaRS(totais.lucro));
    definirTexto("cenarioOtimista", formatarMoedaRS(totais.lucro * 1.15));
    definirTexto("intelMaiorLucro", porLucro.slice().sort(function(a,b){ return b.lucro - a.lucro; })[0]?.descricao || "-");
    definirTexto("intelMenorLucro", porLucro.slice().sort(function(a,b){ return a.lucro - b.lucro; })[0]?.descricao || "-");
    definirTexto("intelAbaixoCusto", porLucro.find(function(i){ return i.lucro < 0; })?.descricao || "-");
    definirTexto("intelCategoriaMais", categorias[0]?.categoria || "-");
    definirTexto("intelCategoriaMenos", categorias.slice().sort(function(a,b){ return a.lucro - b.lucro; })[0]?.categoria || "-");
    definirTexto("intelParado", produtoParado(base));
    definirTexto("projLucro30Dias", "30 dias: " + formatarMoedaRS(projetarLucro30Dias(totais.lucro, periodo)));
}

function renderizarTabelaSimples(id, itens, render, colspan){
    var tbody = document.getElementById(id);
    if(!tbody) return;
    tbody.innerHTML = itens.length ? itens.map(render).join("") : "<tr><td colspan='" + colspan + "' class='vazio'>Sem dados.</td></tr>";
}

function renderizarGraficoLucro(base, linhasFallback){
    var destino = document.getElementById("graficoLucroMes");
    if(!destino) return;
    var meses = [];
    var agora = new Date();
    for(var i = 4; i >= 0; i--){
        var d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        meses.push({ chave: d.toISOString().slice(0, 7), label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), lucro: 0 });
    }
    (base.vendas || []).forEach(function(venda){
        var chave = String(venda.data || "").slice(0, 7);
        var mes = meses.find(function(m){ return m.chave === chave; });
        if(!mes) return;
        (venda.itens || []).forEach(function(item){
            var qtd = numero(item.qtd || item.quantidade || 1);
            var receita = numero(item.total || numero(item.precoUnitario) * qtd);
            var prod = (base.mercadorias || []).find(function(p){ return p.id === (item.id || item.produtoId || ""); });
            mes.lucro += receita - (numero(prod?.precoCusto || item.custo || item.precoCusto) * qtd) - calcularImpostosProduto(prod, receita).total;
        });
    });
    if(!(base.vendas || []).length && (linhasFallback || []).length){
        var valores = [8500, 9200, 12800, 15400, 18700];
        meses.forEach(function(m, i){ m.lucro = valores[i] || 0; });
    }
    var maior = Math.max.apply(null, meses.map(function(m){ return Math.abs(m.lucro); }).concat([1]));
    destino.innerHTML = meses.map(function(m){
        var altura = Math.max(18, Math.round(Math.abs(m.lucro) / maior * 180));
        return "<div class='barra-mes'><strong>" + formatarMoedaRS(m.lucro) + "</strong><span style='height:" + altura + "px'></span><small>" + escapar(m.label) + "</small></div>";
    }).join("");
}

function produtoParado(base){
    var limite = new Date();
    limite.setDate(limite.getDate() - 90);
    var vendidos = new Set();
    (base.vendas || []).filter(function(v){ return new Date(v.data || 0) >= limite; }).forEach(function(v){
        (v.itens || []).forEach(function(item){ vendidos.add(item.id || item.produtoId || ""); });
    });
    return (base.mercadorias || []).find(function(p){ return !vendidos.has(p.id) && numero(p.estoque) > 0; })?.descricao || "-";
}

function projetarLucro30Dias(lucro, periodo){
    var inicio = periodo.inicio ? new Date(periodo.inicio + "T12:00:00") : new Date();
    var fim = periodo.fim ? new Date(periodo.fim + "T12:00:00") : new Date();
    var dias = Math.max(1, Math.round((fim - inicio) / 86400000) + 1);
    return lucro / dias * 30;
}

function calcularSimuladorPreco(){
    var custo = numero(document.getElementById("simCusto")?.value || 0);
    var impostos = numero(document.getElementById("simImpostos")?.value || 0);
    var despesas = numero(document.getElementById("simDespesas")?.value || 0);
    var margem = numero(document.getElementById("simMargem")?.value || 0) / 100;
    var base = custo + impostos + despesas;
    var preco = base * (1 + margem);
    definirTexto("simPrecoSugerido", formatarMoedaRS(preco));
    definirTexto("simLucroLiquido", formatarMoedaRS(preco - base));
}

function exportarProjecaoExcel(){
    var linhas = [["Produto","Quantidade","Receita","Custo","Lucro","Margem"]];
    document.querySelectorAll("#listaProjecao tr").forEach(function(tr){
        var cols = Array.from(tr.children).map(function(td){ return td.textContent.trim(); });
        if(cols.length === 6 && !tr.querySelector(".vazio")) linhas.push(cols);
    });
    baixarArquivo("projecao_lucro.csv", linhas.map(function(l){ return l.map(function(c){ return '"' + String(c).replaceAll('"','""') + '"'; }).join(";"); }).join("\n"), "text/csv;charset=utf-8");
}

function exportarProjecaoPdf(){
    window.print();
}

function destacarProdutosCriticos(){
    document.querySelectorAll("#listaProjecao tr").forEach(function(tr){
        var lucro = normalizar(tr.children[4]?.textContent || "");
        if(lucro.includes("-")) tr.style.background = "#fff1f2";
    });
}

function baixarArquivo(nome, conteudo, tipo){
    var blob = new Blob([conteudo], { type: tipo });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
}

/* ── UTILIDADES LOCAIS ── */
function fmtQtd(v){ return numero(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:3}); }
