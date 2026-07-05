let mostrarDetalhes = false;

document.addEventListener("DOMContentLoaded", function(){
    inicializarEventos();
    renderizarFluxo();
});

function inicializarEventos(){
    document.querySelectorAll("[data-periodo]").forEach(function(botao){
        botao.addEventListener("click", function(){
            document.querySelectorAll("[data-periodo]").forEach(function(item){ item.classList.remove("ativo"); });
            botao.classList.add("ativo");
            document.getElementById("periodoPersonalizado")?.classList.toggle("recolhido", botao.dataset.periodo !== "personalizado");
            renderizarFluxo();
        });
    });

    ["dataInicio","dataFim","filtroTipo","filtroOrigem","buscaFluxo"].forEach(function(id){
        const evento = id === "buscaFluxo" ? "input" : "change";
        document.getElementById(id)?.addEventListener(evento, renderizarFluxo);
    });

    document.getElementById("btnAtualizar")?.addEventListener("click", renderizarFluxo);
    document.getElementById("btnVerDetalhes")?.addEventListener("click", function(){
        mostrarDetalhes = !mostrarDetalhes;
        renderizarFluxo();
    });
    document.getElementById("btnExcel")?.addEventListener("click", exportarCsv);
    document.getElementById("btnPdf")?.addEventListener("click", function(){ window.print(); });
    document.getElementById("btnCriticos")?.addEventListener("click", destacarDiasCriticos);
}

function renderizarFluxo(){
    const base = obterBase();
    const periodo = obterPeriodo();
    const dias = montarDias(periodo);
    let movimentos = montarMovimentos(base, periodo);

    const tipo = document.getElementById("filtroTipo")?.value || "";
    const origem = document.getElementById("filtroOrigem")?.value || "";
    const busca = normalizar(document.getElementById("buscaFluxo")?.value || "");

    movimentos = movimentos.filter(function(item){
        if(tipo && item.tipo !== tipo) return false;
        if(origem && item.origem !== origem) return false;
        if(busca && !normalizar([item.descricao, item.cliente, item.operador, item.origem].join(" ")).includes(busca)) return false;
        return true;
    });

    const mapa = {};
    dias.forEach(function(dia){
        mapa[dia.chave] = { data:dia.chave, entradas:0, saidas:0, movimentos:[] };
    });

    movimentos.forEach(function(item){
        if(!mapa[item.data]) return;
        if(item.tipo === "entrada") mapa[item.data].entradas += item.valor;
        else mapa[item.data].saidas += item.valor;
        mapa[item.data].movimentos.push(item);
    });

    const linhas = Object.values(mapa);
    const entradas = linhas.reduce(function(total, item){ return total + item.entradas; }, 0);
    const saidas = linhas.reduce(function(total, item){ return total + item.saidas; }, 0);
    const saldo = entradas - saidas;
    const maiorEntrada = Math.max(...linhas.map(function(item){ return item.entradas; }), 0);
    const maiorSaida = Math.max(...linhas.map(function(item){ return item.saidas; }), 0);
    const diasComMovimento = Math.max(1, linhas.filter(function(item){ return item.entradas || item.saidas; }).length || linhas.length);

    definirTexto("resumoEntradas", formatarMoedaRS(entradas));
    definirTexto("resumoSaidas", formatarMoedaRS(saidas));
    definirTexto("resumoSaldo", formatarMoedaRS(saldo));
    definirTexto("resumoMaiorEntrada", formatarMoedaRS(maiorEntrada));
    definirTexto("resumoMaiorSaida", formatarMoedaRS(maiorSaida));
    definirTexto("mediaEntradas", formatarMoedaRS(entradas / diasComMovimento));
    definirTexto("mediaSaidas", formatarMoedaRS(saidas / diasComMovimento));
    definirTexto("diasPositivos", String(linhas.filter(function(item){ return item.entradas - item.saidas > 0; }).length));
    definirTexto("diasNegativos", String(linhas.filter(function(item){ return item.entradas - item.saidas < 0; }).length));
    definirTexto("projecao30Dias", formatarMoedaRS(saldo / Math.max(1, linhas.length) * 30));
    definirTexto("totalDias", linhas.length + " dia(s)");
    definirTexto("totalMovimentos", movimentos.length + " movimento(s)");

    renderizarTabelaDias(linhas);
    renderizarGrafico(linhas);
    renderizarMovimentos(movimentos);
}

const STATUS_PAGOS_FLUXO = ["pago", "paga", "pagas", "pagos", "baixado", "baixada", "quitado", "quitada", "liquidado", "liquidada"];

function montarMovimentos(base, periodo){
    const movimentos = [];

    (base.vendas || []).forEach(function(venda){
        const data = dataChave(venda.data);
        if(!dataDentro(data, periodo)) return;
        movimentos.push({
            data,
            tipo:"entrada",
            origem:"venda",
            descricao:venda.documento || venda.id ? "Venda " + (venda.documento || venda.id) : "Venda PDV",
            valor:numero(venda.total),
            cliente:venda.cliente?.nome || venda.cliente || "Consumidor",
            operador:venda.usuarioNome || venda.usuarioLogin || ""
        });
    });

    (base.movimentosCaixa || []).forEach(function(item){
        const data = dataChave(item.data);
        if(!dataDentro(data, periodo)) return;
        movimentos.push({
            data,
            tipo:item.tipo === "sangria" ? "saida" : "entrada",
            origem:"caixa",
            descricao:item.tipo === "sangria" ? "Sangria" : "Suprimento",
            valor:numero(item.valor),
            cliente:"",
            operador:item.operador || "",
            observacao:item.observacao || item.detalhe || ""
        });
    });

    (base.contasPagar || []).forEach(function(conta){
        if(!STATUS_PAGOS_FLUXO.includes(normalizar(conta.status || ""))) return;
        const data = dataChave(conta.pagoEm || conta.dataPagamento || conta.baixadaEm || conta.vencimento || conta.data);
        if(!dataDentro(data, periodo)) return;
        movimentos.push({
            data,
            tipo:"saida",
            origem:"pagar",
            descricao:conta.descricao || conta.fornecedor || "Conta paga",
            valor:numero(conta.valorBaixado || conta.valorPago || conta.valor || conta.saldo),
            cliente:conta.fornecedor || "",
            operador:""
        });
    });

    (base.contasReceber || []).forEach(function(conta){
        if(!STATUS_PAGOS_FLUXO.includes(normalizar(conta.status || ""))) return;
        const data = dataChave(conta.recebidoEm || conta.baixadaEm || conta.data);
        if(!dataDentro(data, periodo)) return;
        movimentos.push({
            data,
            tipo:"entrada",
            origem:"receber",
            descricao:conta.documento || conta.origem || "Conta recebida",
            valor:numero(conta.valorBaixado || conta.valor || conta.saldo),
            cliente:conta.clienteNome || "",
            operador:""
        });
    });

    return movimentos.sort(function(a, b){ return a.data.localeCompare(b.data); });
}

function montarDias(periodo){
    const inicio = periodo.inicio ? new Date(periodo.inicio + "T12:00:00") : new Date();
    const fim = periodo.fim ? new Date(periodo.fim + "T12:00:00") : new Date();
    const dias = [];
    const atual = new Date(inicio);
    while(atual <= fim){
        dias.push({ chave:atual.toISOString().slice(0, 10) });
        atual.setDate(atual.getDate() + 1);
    }
    return dias.length ? dias : [{ chave:new Date().toISOString().slice(0, 10) }];
}

function obterPeriodo(){
    const ativo = document.querySelector("[data-periodo].ativo")?.dataset.periodo || "30";
    if(ativo === "personalizado"){
        return {
            inicio:document.getElementById("dataInicio")?.value || "",
            fim:document.getElementById("dataFim")?.value || ""
        };
    }
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - Number(ativo) + 1);
    return { inicio:inicio.toISOString().slice(0, 10), fim:hoje.toISOString().slice(0, 10) };
}

function renderizarTabelaDias(linhas){
    const destino = document.getElementById("tabelaDias");
    if(!destino) return;
    const dados = mostrarDetalhes ? linhas.slice().reverse() : linhas.filter(function(item){ return item.entradas || item.saidas; }).slice().reverse();
    if(!dados.length){
        destino.innerHTML = "<tr><td colspan='4' class='vazio'>Sem movimentacao no periodo.</td></tr>";
        return;
    }
    destino.innerHTML = dados.map(function(item){
        const saldo = item.entradas - item.saidas;
        return `<tr>
            <td>${formatarDataCurta(item.data)}</td>
            <td class="positivo">${formatarMoeda(item.entradas)}</td>
            <td class="negativo">${formatarMoeda(item.saidas)}</td>
            <td class="${saldo >= 0 ? "positivo" : "negativo"}">${formatarMoeda(saldo)}</td>
        </tr>`;
    }).join("");
    const botao = document.getElementById("btnVerDetalhes");
    if(botao) botao.innerHTML = mostrarDetalhes ? `<i class="fa-solid fa-list"></i>Ver somente dias com movimento` : `<i class="fa-solid fa-list"></i>Ver detalhes`;
}

function renderizarGrafico(linhas){
    const destino = document.getElementById("graficoFluxo");
    if(!destino) return;
    const dados = linhas.slice(-15);
    const maior = Math.max(...dados.map(function(item){ return Math.abs(item.entradas - item.saidas); }), 1);
    destino.innerHTML = dados.map(function(item){
        const saldo = item.entradas - item.saidas;
        const altura = Math.max(12, Math.round(Math.abs(saldo) / maior * 180));
        return `<div class="barra-dia ${saldo < 0 ? "negativo" : ""}">
            <strong>${formatarMoeda(saldo)}</strong>
            <span style="height:${altura}px"></span>
            <small>${formatarDia(item.data)}</small>
        </div>`;
    }).join("");
}

function renderizarMovimentos(movimentos){
    const destino = document.getElementById("listaMovimentos");
    if(!destino) return;
    if(!movimentos.length){
        destino.innerHTML = "<div class='vazio'>Sem movimentos no periodo.</div>";
        return;
    }
    destino.innerHTML = movimentos.slice().reverse().slice(0, mostrarDetalhes ? 200 : 60).map(function(item){
        return `<div class="movimento-item ${item.tipo === "saida" ? "saida" : ""}">
            <div>
                <strong>${escapar(item.descricao)}</strong>
                <small>${formatarDataCurta(item.data)} | ${escapar(rotuloOrigem(item.origem))}${item.cliente ? " | " + escapar(item.cliente) : ""}</small>
                ${item.observacao ? `<small>${escapar(item.observacao)}</small>` : ""}
            </div>
            <span class="movimento-valor ${item.tipo === "saida" ? "negativo" : "positivo"}">${item.tipo === "saida" ? "-" : "+"} ${formatarMoeda(item.valor)}</span>
        </div>`;
    }).join("");
}

function destacarDiasCriticos(){
    document.querySelectorAll("#tabelaDias tr").forEach(function(tr){
        const texto = tr.children[3]?.textContent || "";
        if(texto.includes("-")) tr.style.background = "#fff1f2";
    });
}

function exportarCsv(){
    const linhas = [["Data","Entradas","Saidas","Saldo"]];
    document.querySelectorAll("#tabelaDias tr").forEach(function(tr){
        const cols = Array.from(tr.children).map(function(td){ return td.textContent.trim(); });
        if(cols.length === 4 && !tr.querySelector(".vazio")) linhas.push(cols);
    });
    const csv = linhas.map(function(linha){ return linha.map(function(coluna){ return `"${String(coluna).replaceAll('"','""')}"`; }).join(";"); }).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fluxo_caixa.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function dataDentro(data, periodo){
    if(!data) return false;
    if(periodo.inicio && data < periodo.inicio) return false;
    if(periodo.fim && data > periodo.fim) return false;
    return true;
}

function dataChave(valor){
    return String(valor || "").slice(0, 10);
}

function formatarDataCurta(valor){
    const data = new Date(valor + "T12:00:00");
    return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function formatarDia(valor){
    const data = new Date(valor + "T12:00:00");
    return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
}

function rotuloOrigem(origem){
    return {
        venda:"Vendas",
        caixa:"Caixa",
        pagar:"Contas pagas",
        receber:"Contas recebidas"
    }[origem] || origem || "-";
}
