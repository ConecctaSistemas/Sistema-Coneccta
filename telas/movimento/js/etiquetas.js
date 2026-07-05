"use strict";

// ── Code128B — renderizador SVG nativo ──────────────────
// Tabela Code128 (valores 0-106, índices diretos)
var _C128T = ["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];

function svgBarcode(texto, alturaBar, modW, showTxt, fontSz){
    alturaBar = alturaBar || 32;
    modW      = modW      || 1.5;
    showTxt   = showTxt !== false;
    fontSz    = fontSz   || 9;

    var START_B = 104, STOP = 106;
    var syms = [START_B], check = START_B;
    for(var i=0;i<texto.length;i++){
        var v = texto.charCodeAt(i) - 32;
        if(v<0||v>95) v=0;
        syms.push(v);
        check += v*(i+1);
    }
    syms.push(check%103);
    syms.push(STOP);

    // Expandir padrões em lista de módulos
    var mods = [];
    for(var i=0;i<syms.length;i++){
        var pat = _C128T[syms[i]];
        for(var j=0;j<pat.length;j++) mods.push(+pat[j]);
    }

    var qz    = Math.ceil(10 * modW); // quiet zone em px
    var totalModW = mods.reduce(function(a,b){return a+b;},0)*modW;
    var W     = qz*2 + totalModW;
    var H     = showTxt ? alturaBar + fontSz + 3 : alturaBar;

    var rects = '';
    var x = qz, isBar = true;
    for(var i=0;i<mods.length;i++){
        var w = mods[i]*modW;
        if(isBar) rects += '<rect x="'+x.toFixed(2)+'" y="0" width="'+w.toFixed(2)+'" height="'+alturaBar+'" fill="#000"/>';
        x += w;
        isBar = !isBar;
    }

    var txt = showTxt
        ? '<text x="'+(W/2).toFixed(2)+'" y="'+(alturaBar+fontSz+1)+'" text-anchor="middle" font-family="monospace" font-size="'+fontSz+'" fill="#000">'+texto+'</text>'
        : '';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W.toFixed(2)+' '+H+'" style="width:100%;height:auto;display:block">'+rects+txt+'</svg>';
}

// ── Estado ───────────────────────────────────────────────
var etqModeloAtual  = "40x25";
var etqSelecionados = {}; // { id: qtd }
var etqCamposAtivos = ["nome","preco","codigo","barcode","unidade"];
var etqMostrarPromo = true;
var etqNomeLoja     = "";

var ETQ_MODELOS = [
    { id:"40x25",   label:"40 × 25 mm",  sub:"Térmica padrão",  tipo:"termica", wMM:40,  hMM:25  },
    { id:"50x30",   label:"50 × 30 mm",  sub:"Térmica média",   tipo:"termica", wMM:50,  hMM:30  },
    { id:"100x50",  label:"100 × 50 mm", sub:"Térmica grande",  tipo:"termica", wMM:100, hMM:50  },
    { id:"a4-2x7",  label:"A4 — 14 etq", sub:"2 colunas × 7",  tipo:"a4", pCols:2, pRows:7  },
    { id:"a4-3x10", label:"A4 — 30 etq", sub:"3 colunas × 10", tipo:"a4", pCols:3, pRows:10 },
    { id:"a4-4x13", label:"A4 — 52 etq", sub:"4 colunas × 13", tipo:"a4", pCols:4, pRows:13 },
];

var ETQ_CAMPOS = [
    { id:"nome",        label:"Nome do produto"  },
    { id:"codigo",      label:"Código / SKU"     },
    { id:"barcode",     label:"Código de barras" },
    { id:"preco",       label:"Preço de venda"   },
    { id:"unidade",     label:"Unidade (UN/KG)"  },
    { id:"loja",        label:"Nome da loja"     },
    { id:"preco_custo", label:"Preço de custo"   },
    { id:"validade",    label:"Validade"         },
];

// ── Geração de EAN-13 ─────────────────────────────────────
function hashSimples(str){
    var h = 5381;
    for(var i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i);
    return Math.abs(h >>> 0);
}

function gerarEan13(seed){
    // Prefixo 200 (faixa reservada para uso interno/livre)
    var base12 = "200" + String(seed % 1000000000).padStart(9,"0");
    base12 = base12.slice(0,12);
    var soma = 0;
    for(var i=0;i<12;i++) soma += parseInt(base12[i]) * (i%2===0 ? 1 : 3);
    var dv = (10 - (soma%10)) % 10;
    return base12 + dv;
}

function obterCodigoBc(p){
    return p.ean || p.codigo || null;
}

function gerarESalvarCodigosSemEan(){
    var base = obterBase();
    var gerados = 0;
    base.mercadorias.forEach(function(p, i){
        if(!p || p.ean) return;
        p.ean = gerarEan13(hashSimples((p.id||String(i)) + (p.descricao||"")));
        gerados++;
    });
    if(gerados > 0){
        salvarBase(base);
        notificar(gerados+" produto(s) receberam código de barras EAN-13 automaticamente.","sucesso");
    }
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function(){
    try{
        var cfg = window.ConfiguracoesSistema ? window.ConfiguracoesSistema.obter() : {};
        etqNomeLoja = (cfg && cfg.nomeEmpresa) ? cfg.nomeEmpresa : "";
        document.getElementById("etqNomeLoja").value = etqNomeLoja;
    }catch(e){}

    gerarESalvarCodigosSemEan();
    renderizarModelos();
    renderizarCampos();
    carregarCategorias();
    renderizarProdutos();

    document.getElementById("etqBuscaProd").addEventListener("input", renderizarProdutos);
    document.getElementById("etqCategoria").addEventListener("change", renderizarProdutos);
});

// ── Modelos ──────────────────────────────────────────────
function renderizarModelos(){
    var html = ETQ_MODELOS.map(function(m){
        var ativo = m.id === etqModeloAtual;
        var ehA4 = m.tipo === "a4";
        var mW = ehA4 ? 32 : Math.round(m.wMM * 1.2);
        var mH = ehA4 ? 44 : Math.round(m.hMM * 1.2);
        return '<button type="button" class="etq-modelo-btn'+(ativo?" ativo":"")+'" onclick="selecionarModelo(\''+m.id+'\')">'+
            '<div class="etq-modelo-mini" style="width:'+mW+'px;height:'+mH+'px"></div>'+
            '<strong>'+m.label+'</strong>'+
            '<span>'+m.sub+'</span>'+
        '</button>';
    }).join("");
    document.getElementById("etqModelosGrid").innerHTML = html;
}

window.selecionarModelo = function(id){
    etqModeloAtual = id;
    renderizarModelos();
};

// ── Campos ───────────────────────────────────────────────
function renderizarCampos(){
    var html = ETQ_CAMPOS.map(function(c){
        var ativo = etqCamposAtivos.indexOf(c.id) >= 0;
        return '<label class="etq-campo-item">'+
            '<input type="checkbox"'+(ativo?" checked":"")+' onchange="toggleCampo(\''+c.id+'\',this.checked)">'+
            '<span>'+c.label+'</span>'+
        '</label>';
    }).join("");
    document.getElementById("etqCamposLista").innerHTML = html;
}

window.toggleCampo = function(id, checked){
    var idx = etqCamposAtivos.indexOf(id);
    if(checked && idx < 0) etqCamposAtivos.push(id);
    if(!checked && idx >= 0) etqCamposAtivos.splice(idx,1);
};

window.etqSetPromo    = function(v){ etqMostrarPromo = v; };
window.etqSetNomeLoja = function(v){ etqNomeLoja = v; };

// ── Produtos ─────────────────────────────────────────────
function carregarCategorias(){
    var base = obterBase();
    var cats = [];
    (base.mercadorias || []).forEach(function(p){
        if(p && p.categoria && cats.indexOf(p.categoria) < 0) cats.push(p.categoria);
    });
    cats.sort();
    var sel = document.getElementById("etqCategoria");
    cats.forEach(function(c){
        var opt = document.createElement("option");
        opt.value = c; opt.textContent = c;
        sel.appendChild(opt);
    });
}

function renderizarProdutos(){
    var base  = obterBase();
    var termo = normalizar(document.getElementById("etqBuscaProd").value || "");
    var cat   = document.getElementById("etqCategoria").value || "";

    var lista = (base.mercadorias || []).filter(function(p){
        if(!p || p.ativo === false) return false;
        if(cat && p.categoria !== cat) return false;
        if(termo){
            var txt = normalizar([p.descricao,p.nome,p.codigo,p.ean,p.referencia,p.categoria].join(" "));
            if(txt.indexOf(termo) < 0) return false;
        }
        return true;
    });

    var grid = document.getElementById("etqProdGrid");

    if(lista.length === 0){
        grid.innerHTML = '<div class="etq-vazio"><i class="fa-solid fa-box-open"></i><p>'+(termo||cat?"Nenhum produto encontrado.":"Nenhum produto cadastrado.")+'</p></div>';
        atualizarSel();
        return;
    }

    grid.innerHTML = lista.map(function(p){
        var sel  = etqSelecionados[p.id] !== undefined;
        var qtd  = etqSelecionados[p.id] || 1;
        var bc   = obterCodigoBc(p);
        var preco = (etqMostrarPromo && p.precoPromocional && p.precoPromocional < p.precoVenda)
            ? p.precoPromocional : (p.precoVenda || 0);

        return '<div class="etq-prod-card'+(sel?" sel":"")+'" onclick="toggleProd(\''+p.id+'\',event)">'+
            '<div class="etq-check-box"><i class="fa-solid fa-check"></i></div>'+
            '<div class="etq-prod-nome">'+escapar(p.descricao||p.nome||"—")+'</div>'+
            '<div class="etq-prod-cod">'+(p.codigo?escapar(p.codigo):"—")+'</div>'+
            '<div class="etq-prod-preco">'+formatarMoedaRS(preco)+'</div>'+
            (bc?'<div class="etq-prod-bc">'+svgBarcode(bc,22,0.9,true,7)+'</div>':'')+
            (sel?'<div class="etq-qtd-row" onclick="event.stopPropagation()">'+
                '<span>Qtd. etiquetas</span>'+
                '<input class="etq-qtd-inp" type="number" min="1" max="999" value="'+qtd+'" '+
                'oninput="setQtd(\''+p.id+'\',this.value)">'+
            '</div>':'')+
        '</div>';
    }).join("");

    // barcodes já renderizados via svgBarcode() inline

    atualizarSel();
}

window.toggleProd = function(id, evt){
    if(evt && (evt.target.classList.contains("etq-qtd-inp") || evt.target.tagName==="INPUT")) return;
    if(etqSelecionados[id] !== undefined) delete etqSelecionados[id];
    else etqSelecionados[id] = 1;
    renderizarProdutos();
};

window.setQtd = function(id, val){
    etqSelecionados[id] = Math.max(1, Math.min(999, parseInt(val)||1));
};

function atualizarSel(){
    var qtdProd = Object.keys(etqSelecionados).length;
    var qtdEtq  = Object.values(etqSelecionados).reduce(function(a,b){return a+(b||1);},0);
    document.getElementById("etqSelInfo").textContent =
        qtdProd===0 ? "Nenhum produto selecionado" : qtdProd+" produto(s) · "+qtdEtq+" etiqueta(s)";
    document.getElementById("btnEtqImprimir").disabled = qtdProd===0;
}

window.selecionarTodosEtq = function(){
    var base  = obterBase();
    var termo = normalizar(document.getElementById("etqBuscaProd").value || "");
    var cat   = document.getElementById("etqCategoria").value || "";
    (base.mercadorias||[]).forEach(function(p){
        if(!p||p.ativo===false) return;
        if(cat && p.categoria!==cat) return;
        if(termo){
            var txt=normalizar([p.descricao,p.nome,p.codigo,p.ean,p.referencia,p.categoria].join(" "));
            if(txt.indexOf(termo)<0) return;
        }
        if(etqSelecionados[p.id]===undefined) etqSelecionados[p.id]=1;
    });
    renderizarProdutos();
};

window.limparSelEtq = function(){
    etqSelecionados = {};
    renderizarProdutos();
};

// ── Impressão ─────────────────────────────────────────────
window.imprimirEtiquetas = function(){
    var base = obterBase();
    var ids  = Object.keys(etqSelecionados);
    if(!ids.length){ notificar("Selecione ao menos um produto.","aviso"); return; }

    var modelo = ETQ_MODELOS.find(function(m){return m.id===etqModeloAtual;});
    if(!modelo) return;

    var lista = [];
    ids.forEach(function(id){
        var p = (base.mercadorias||[]).find(function(x){return x.id===id;});
        if(!p) return;
        for(var i=0;i<(etqSelecionados[id]||1);i++) lista.push(p);
    });

    var corpo = modelo.tipo==="a4" ? _a4Html(lista,modelo) : _termicaHtml(lista,modelo);
    var css   = _cssPrint(modelo);

    var w = window.open("","_etq","width=960,height=720");
    if(!w){ notificar("Permita popups e tente novamente.","erro"); return; }

    w.document.write(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquetas</title>'+
        '<style>'+css+'</style>'+
        '</head><body>'+corpo+
        '<script>setTimeout(function(){window.focus();window.print();},200);<\/script>'+
        '</body></html>'
    );
    w.document.close();
};

function _etqItem(p, modelo){
    var campos = "";
    var preco = (etqMostrarPromo && p.precoPromocional && p.precoPromocional < p.precoVenda)
        ? p.precoPromocional : (p.precoVenda||0);
    var bc = obterCodigoBc(p);

    // Dimensões do barcode proporcionais ao modelo
    var isA4 = modelo.tipo==="a4";
    var cols  = isA4 ? modelo.pCols : 1;
    var bcH   = isA4 ? (cols>=4?13:cols>=3?15:18)   : (modelo.hMM<=25?14:modelo.hMM<=30?18:28);
    var bcW   = isA4 ? (cols>=4?0.55:cols>=3?0.65:0.8): (modelo.wMM<=40?0.75:modelo.wMM<=50?0.85:1.1);
    var bcFs  = isA4 ? 5 : (modelo.hMM<=25?5:modelo.hMM<=30?6:8);

    if(etqCamposAtivos.indexOf("loja")>=0 && etqNomeLoja)
        campos += '<div class="ef loja">'+escapar(etqNomeLoja)+'</div>';
    if(etqCamposAtivos.indexOf("nome")>=0)
        campos += '<div class="ef nome">'+escapar(p.descricao||p.nome||"")+'</div>';
    if(etqCamposAtivos.indexOf("codigo")>=0 && p.codigo)
        campos += '<div class="ef cod">Cód: '+escapar(p.codigo)+'</div>';
    if(etqCamposAtivos.indexOf("unidade")>=0 && p.unidade)
        campos += '<div class="ef und">'+escapar(p.unidade)+'</div>';
    if(etqCamposAtivos.indexOf("preco")>=0)
        campos += '<div class="ef preco">'+formatarMoedaRS(preco)+'</div>';
    if(etqCamposAtivos.indexOf("preco_custo")>=0 && p.precoCusto)
        campos += '<div class="ef custo">Custo: '+formatarMoedaRS(p.precoCusto)+'</div>';
    if(etqCamposAtivos.indexOf("validade")>=0 && p.validade)
        campos += '<div class="ef val">Val: '+escapar(p.validade)+'</div>';
    if(etqCamposAtivos.indexOf("barcode")>=0 && bc)
        campos += '<div class="etq-bc">'+svgBarcode(bc,bcH,bcW,true,bcFs)+'</div>';

    return campos;
}

function _termicaHtml(lista, modelo){
    return lista.map(function(p){
        return '<div class="etq">'+_etqItem(p,modelo)+'</div>';
    }).join("");
}

function _a4Html(lista, modelo){
    var html = '<div class="folha">';
    lista.forEach(function(p){ html += '<div class="etq">'+_etqItem(p,modelo)+'</div>'; });
    html += '</div>';
    return html;
}

function _cssPrint(modelo){
    var isA4 = modelo.tipo==="a4";
    var base = '*{box-sizing:border-box;margin:0;padding:0}body{background:#fff;font-family:Arial,sans-serif}';

    if(!isA4){
        // ── Térmica: cada etiqueta = uma página exata ──
        var nomeFt  = modelo.wMM>=100?12:modelo.wMM>=50?10:8;
        var precoFt = modelo.wMM>=100?20:modelo.wMM>=50?15:12;
        return base+
            '@media print{@page{size:'+modelo.wMM+'mm '+modelo.hMM+'mm;margin:0}body{margin:0}}'+
            '.etq{'+
                'width:'+modelo.wMM+'mm;height:'+modelo.hMM+'mm;'+   // dimensão exata em mm
                'overflow:hidden;'+                                    // corta o que não cabe
                'page-break-after:always;'+                           // cada etiqueta = 1 página
                'display:flex;flex-direction:column;justify-content:center;'+
                'padding:1.5mm 2mm;'+
            '}'+
            '.ef{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
            '.nome{font-size:'+nomeFt+'px;font-weight:700;color:#000;line-height:1.25;white-space:normal}'+
            '.loja{font-size:6px;color:#555;text-align:center}'+
            '.cod{font-size:6px;color:#666}'+
            '.und{font-size:6px;color:#666}'+
            '.preco{font-size:'+precoFt+'px;font-weight:900;color:#000;margin:0.8mm 0}'+
            '.custo{font-size:6px;color:#888}'+
            '.val{font-size:6px;color:#555}'+
            '.etq-bc{width:100%;flex-shrink:0;margin-top:1mm}';
    }

    // ── A4: grade de etiquetas por folha ──
    var cols    = modelo.pCols;
    var nomeFt  = cols>=4?7:cols>=3?8:9;
    var precoFt = cols>=4?10:cols>=3?12:14;
    return base+
        '@media print{@page{size:A4 portrait;margin:0}body{margin:0}}'+
        '.folha{display:grid;grid-template-columns:repeat('+cols+',1fr);gap:1mm;padding:6mm}'+
        '.etq{'+
            'border:0.4px solid #ccc;overflow:hidden;'+
            'display:flex;flex-direction:column;justify-content:center;'+
            'padding:2mm 2mm;page-break-inside:avoid;min-height:18mm;'+
        '}'+
        '.ef{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}'+
        '.loja{font-size:6px;color:#555;text-align:center;margin-bottom:1px}'+
        '.nome{font-size:'+nomeFt+'px;font-weight:700;color:#000;margin:1px 0;line-height:1.2;white-space:normal}'+
        '.cod{font-size:6px;color:#666}'+
        '.und{font-size:6px;color:#666}'+
        '.preco{font-size:'+precoFt+'px;font-weight:900;color:#000;margin:1px 0}'+
        '.custo{font-size:6px;color:#888}'+
        '.val{font-size:6px;color:#666}'+
        '.etq-bc{width:100%;display:block;margin-top:1mm}';
}
