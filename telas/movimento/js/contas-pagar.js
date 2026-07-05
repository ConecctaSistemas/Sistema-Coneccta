document.addEventListener("DOMContentLoaded", function(){
    inicializarEventos();
    renderizarContasPagar();
});

function inicializarEventos(){
    document.querySelectorAll("[data-periodo]").forEach(function(botao){
        botao.addEventListener("click", function(){
            document.querySelectorAll("[data-periodo]").forEach(function(item){ item.classList.remove("ativo"); });
            botao.classList.add("ativo");
            document.getElementById("periodoPersonalizado")?.classList.toggle("recolhido", botao.dataset.periodo !== "personalizado");
            renderizarContasPagar();
        });
    });

    ["dataInicio","dataFim","filtroStatus","filtroFornecedor","filtroTipo"].forEach(function(id){
        document.getElementById(id)?.addEventListener("change", renderizarContasPagar);
    });
    document.getElementById("buscaConta")?.addEventListener("input", renderizarContasPagar);
    document.getElementById("checkTodos")?.addEventListener("change", function(){ marcarTodos(this.checked); });
    document.getElementById("btnSelecionarTodos")?.addEventListener("click", function(){ marcarTodos(true); });
    document.getElementById("btnBaixarSelecionadas")?.addEventListener("click", baixarSelecionadas);
    document.getElementById("btnAtualizar")?.addEventListener("click", renderizarContasPagar);
    document.getElementById("btnExcel")?.addEventListener("click", exportarCsv);
    document.getElementById("btnPdf")?.addEventListener("click", function(){ window.print(); });
    document.getElementById("btnVencidas")?.addEventListener("click", function(){
        document.getElementById("filtroStatus").value = "vencido";
        renderizarContasPagar();
    });

    // Nova Conta a Pagar
    document.getElementById("btnNovaConta")?.addEventListener("click", function(){
        limparCamposNovaConta();
        abrirModal("modalNovaConta");
    });
    document.getElementById("btnSalvarNovaConta")?.addEventListener("click", salvarNovaConta);

    // Fechar modais via data-fechar
    document.querySelectorAll("[data-fechar]").forEach(function(btn){
        btn.addEventListener("click", function(){ fecharModal(btn.dataset.fechar); });
    });
    document.querySelectorAll(".modal-fundo").forEach(function(fundo){
        fundo.addEventListener("click", function(e){
            if(e.target === fundo) fecharModal(fundo.id);
        });
    });

    // Máscara de moeda para campo de valor
    document.getElementById("contaValor")?.addEventListener("input", function(){
        if(typeof mascaraMoedaInput === "function") mascaraMoedaInput(this);
    });
}

function abrirModal(id){
    const el = document.getElementById(id);
    if(el) el.classList.add("aberto");
}

function fecharModal(id){
    const el = document.getElementById(id);
    if(el) el.classList.remove("aberto");
}

function limparCamposNovaConta(){
    ["contaFornecedor","contaDescricao","contaDocumento","contaVencimento","contaValor","contaObs"].forEach(function(id){
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
    const tipo = document.getElementById("contaTipo");
    if(tipo) tipo.value = "manual";
}

// ─── RENDER PRINCIPAL ──────────────────────────────────────────────────────────

function renderizarContasPagar(){
    const base = obterBase();
    preencherFornecedores(base);

    const periodo = obterPeriodo();

    // Contas a pagar reais: lançamentos manuais e parcelas geradas a partir de NF de entrada
    const contas = normalizarContas(base.contasPagar || []);

    const hoje = new Date().toISOString().slice(0, 10);
    const status   = document.getElementById("filtroStatus")?.value  || "";
    const fornecedor = document.getElementById("filtroFornecedor")?.value || "";
    const tipo     = document.getElementById("filtroTipo")?.value    || "";
    const busca    = normalizar(document.getElementById("buscaConta")?.value || "");

    const contasPeriodo = contas.filter(function(conta){
        const dataRef = conta.status === "pago" ? conta.pagoEm || conta.vencimento : conta.vencimento;
        return dataDentro(dataRef, periodo);
    });

    const filtradas = contasPeriodo.filter(function(conta){
        const vencida = conta.status !== "pago" && conta.vencimento < hoje;
        if(status === "vencido" && !vencida) return false;
        if(status === "hoje" && (conta.status === "pago" || conta.vencimento !== hoje)) return false;
        if(status && !["vencido","hoje"].includes(status) && conta.status !== status) return false;
        if(fornecedor && conta.fornecedor !== fornecedor) return false;
        if(tipo && conta.tipo !== tipo) return false;
        if(busca && !normalizar([conta.fornecedor, conta.descricao, conta.documento].join(" ")).includes(busca)) return false;
        return true;
    });

    renderizarResumo(contasPeriodo);
    renderizarTabela(filtradas);
    renderizarIndicadores(contasPeriodo);
    renderizarFornecedores(contasPeriodo);
    renderizarGrafico(contasPeriodo, periodo);
}

// ─── NORMALIZAÇÃO ──────────────────────────────────────────────────────────────

const STATUS_PAGOS = ["pago", "paga", "pagas", "pagos", "baixado", "baixada", "quitado", "quitada", "liquidado", "liquidada"];

function normalizarContas(contas){
    return contas.map(function(conta, index){
        const status = STATUS_PAGOS.includes(normalizar(conta.status || "")) ? "pago" : "aberto";
        return {
            id:         conta.id || "conta-" + index,
            fornecedor: conta.fornecedor || conta.cliente || conta.fornecedorNome || "Fornecedor",
            descricao:  conta.descricao  || conta.origem  || "Conta a pagar",
            documento:  conta.documento  || conta.numero  || conta.nota || "-",
            vencimento: String(conta.vencimento || conta.data || new Date().toISOString()).slice(0, 10),
            valor:      numero(conta.valorBaixado || conta.valorPago || conta.valor || conta.saldo || conta.total || conta.valorParcela),
            status,
            pagoEm:     String(conta.pagoEm || conta.dataPagamento || conta.baixadaEm || "").slice(0, 10),
            tipo:       conta.tipo || (conta.origemEntradaNotaId ? "nf-entrada" : "manual")
        };
    });
}

// ─── FORNECEDORES ──────────────────────────────────────────────────────────────

function preencherFornecedores(base){
    if(window.fornecedoresCarregados) return;
    const select = document.getElementById("filtroFornecedor");
    if(!select) return;

    const contasForn = normalizarContas(base.contasPagar || []).map(function(c){ return c.fornecedor; });
    const cadastroForn = (base.fornecedores || [])
        .filter(function(f){ return f.ativo !== false; })
        .map(function(f){ return f.razaoSocial || f.nomeFantasia || f.nome || f.fantasia; });
    const todos = [...new Set([...contasForn, ...cadastroForn].filter(Boolean))].sort();

    select.innerHTML = '<option value="">Todos</option>' + todos.map(function(f){
        return `<option value="${escapar(f)}">${escapar(f)}</option>`;
    }).join("");
    window.fornecedoresCarregados = true;
}

// ─── RESUMO (CARDS TOPO) ───────────────────────────────────────────────────────

function renderizarResumo(contas){
    const hoje = new Date().toISOString().slice(0, 10);
    const aberto   = contas.filter(function(c){ return c.status !== "pago"; });
    const vencidas = aberto.filter(function(c){ return c.vencimento < hoje; });
    const venceHoje = aberto.filter(function(c){ return c.vencimento === hoje; });
    const pagas    = contas.filter(function(c){ return c.status === "pago"; });
    definirTexto("resumoAberto",   formatarMoedaRS(somarValor(aberto)));
    definirTexto("resumoVencido",  formatarMoedaRS(somarValor(vencidas)));
    definirTexto("resumoHoje",     formatarMoedaRS(somarValor(venceHoje)));
    definirTexto("resumoPago",     formatarMoedaRS(somarValor(pagas)));
}

// ─── TABELA ────────────────────────────────────────────────────────────────────

function renderizarTabela(contas){
    const destino = document.getElementById("tabelaContas");
    if(!destino) return;
    if(!contas.length){
        destino.innerHTML = "<tr><td colspan='8' class='vazio'>Nenhuma conta a pagar encontrada.</td></tr>";
        return;
    }
    const hoje = new Date().toISOString().slice(0, 10);
    destino.innerHTML = contas.map(function(conta){
        const vencida = conta.status !== "pago" && conta.vencimento < hoje;
        const classe  = conta.status === "pago" ? "pago" : vencida ? "vencido" : "aberto";
        const label   = conta.status === "pago" ? "Pago"  : vencida ? "Vencido" : "Em aberto";
        const origem  = conta.tipo === "nf-entrada"
            ? '<span class="badge-origem nf">NF Entrada</span>'
            : '<span class="badge-origem manual">Manual</span>';
        return `<tr>
            <td><input type="checkbox" class="check-conta" value="${escapar(conta.id)}" ${conta.status === "pago" ? "disabled" : ""}></td>
            <td>${escapar(conta.fornecedor)}</td>
            <td>${escapar(conta.descricao)}</td>
            <td>${escapar(conta.documento)}</td>
            <td>${formatarDataLocal(conta.vencimento)}</td>
            <td><strong>${formatarMoeda(conta.valor)}</strong></td>
            <td>${origem}</td>
            <td><span class="status ${classe}">${label}</span></td>
        </tr>`;
    }).join("");
}

// ─── INDICADORES ───────────────────────────────────────────────────────────────

function renderizarIndicadores(contas){
    const hoje = new Date().toISOString().slice(0, 10);
    const aberto   = contas.filter(function(c){ return c.status !== "pago"; });
    const vencido  = aberto.filter(function(c){ return c.vencimento < hoje; });
    const sete = new Date();
    sete.setDate(sete.getDate() + 7);
    const seteStr  = sete.toISOString().slice(0, 10);
    const proximos = aberto.filter(function(c){ return c.vencimento >= hoje && c.vencimento <= seteStr; });
    definirTexto("qtdAberto",  String(aberto.length));
    definirTexto("qtdVencido", String(vencido.length));
    definirTexto("maiorConta", formatarMoedaRS(Math.max(...contas.map(function(c){ return c.valor; }), 0)));
    definirTexto("mediaConta", formatarMoedaRS(contas.length ? somarValor(contas) / contas.length : 0));
    definirTexto("proximos7",  formatarMoedaRS(somarValor(proximos)));
}

// ─── POR FORNECEDOR ────────────────────────────────────────────────────────────

function renderizarFornecedores(contas){
    const mapa = {};
    const hoje = new Date().toISOString().slice(0, 10);
    contas.forEach(function(conta){
        if(conta.status === "pago") return;
        if(!mapa[conta.fornecedor]) mapa[conta.fornecedor] = { aberto:0, vencido:0 };
        mapa[conta.fornecedor].aberto += conta.valor;
        if(conta.vencimento < hoje) mapa[conta.fornecedor].vencido += conta.valor;
    });
    const destino = document.getElementById("tabelaFornecedores");
    if(!destino) return;
    const linhas = Object.entries(mapa).sort(function(a,b){ return b[1].aberto - a[1].aberto; });
    if(!linhas.length){
        destino.innerHTML = "<tr><td colspan='3' class='vazio'>Sem fornecedores em aberto.</td></tr>";
        return;
    }
    destino.innerHTML = linhas.map(function(entry){
        return `<tr><td>${escapar(entry[0])}</td><td>${formatarMoeda(entry[1].aberto)}</td><td class="negativo">${formatarMoeda(entry[1].vencido)}</td></tr>`;
    }).join("");
}

// ─── GRÁFICO ───────────────────────────────────────────────────────────────────

function renderizarGrafico(contas, periodo){
    const destino = document.getElementById("graficoVencimentos");
    if(!destino) return;
    const dias  = montarDias(periodo).slice(-15);
    const hoje  = new Date().toISOString().slice(0, 10);
    const dados = dias.map(function(dia){
        const total = contas.filter(function(c){ return c.status !== "pago" && c.vencimento === dia; })
                            .reduce(function(s,c){ return s + c.valor; }, 0);
        return { dia, total, vencido: dia < hoje };
    });
    const maior = Math.max(...dados.map(function(item){ return item.total; }), 1);
    definirTexto("totalDias", dados.length + " dia(s)");
    destino.innerHTML = dados.map(function(item){
        const altura = Math.max(12, Math.round(item.total / maior * 180));
        return `<div class="barra-dia ${item.vencido ? "vencido" : ""}">
            <strong>${formatarMoeda(item.total)}</strong>
            <span style="height:${altura}px"></span>
            <small>${formatarDia(item.dia)}</small>
        </div>`;
    }).join("");
}

// ─── AÇÕES ─────────────────────────────────────────────────────────────────────

function baixarSelecionadas(){
    const checkboxes = Array.from(document.querySelectorAll(".check-conta:checked"));
    if(!checkboxes.length){
        notificar("Selecione ao menos uma conta.", "aviso");
        return;
    }
    const ids = checkboxes.map(function(i){ return i.value; });

    const base  = obterBase();
    const agora = new Date().toISOString();

    base.contasPagar = (base.contasPagar || []).map(function(conta){
        if(ids.includes(conta.id)){
            conta.status       = "pago";
            conta.pagoEm       = agora;
            conta.baixadaEm    = agora;
            conta.valorBaixado = numero(conta.valorBaixado || conta.valor || conta.saldo);
            conta.saldo        = 0;
        }
        return conta;
    });

    salvarBase(base);
    notificar(ids.length + " conta(s) baixada(s). O valor já aparece como saída no Fluxo de Caixa.", "sucesso");
    renderizarContasPagar();
}

function salvarNovaConta(){
    const fornecedor = String(document.getElementById("contaFornecedor")?.value || "").trim();
    const descricao  = String(document.getElementById("contaDescricao")?.value  || "").trim();
    const tipo       = String(document.getElementById("contaTipo")?.value        || "manual");
    const documento  = String(document.getElementById("contaDocumento")?.value  || "").trim();
    const vencimento = String(document.getElementById("contaVencimento")?.value || "").trim();
    const valor      = numero(document.getElementById("contaValor")?.value       || "0");
    const obs        = String(document.getElementById("contaObs")?.value         || "").trim();

    if(!fornecedor){
        notificar("Informe o fornecedor / credor.", "aviso");
        return;
    }
    if(!vencimento){
        notificar("Informe o vencimento.", "aviso");
        return;
    }
    if(!valor){
        notificar("Informe o valor.", "aviso");
        return;
    }

    const base = obterBase();
    if(!Array.isArray(base.contasPagar)) base.contasPagar = [];

    const descFinal = descricao || _labelTipo(tipo);

    base.contasPagar.push({
        id:         gerarId("conta"),
        fornecedor: fornecedor,
        descricao:  descFinal,
        documento:  documento,
        vencimento: vencimento,
        valor:      valor,
        status:     "aberto",
        tipo:       tipo,
        obs:        obs
    });

    salvarBase(base);
    fecharModal("modalNovaConta");
    notificar("Conta lançada com sucesso.", "sucesso");
    window.fornecedoresCarregados = false;
    renderizarContasPagar();
}

function _labelTipo(tipo){
    const map = {
        energia: "Energia Elétrica",
        agua:    "Água / Saneamento",
        internet:"Internet / Telefone",
        aluguel: "Aluguel",
        folha:   "Folha de Pagamento",
        imposto: "Impostos / Taxas",
        outros:  "Outras despesas",
        manual:  "Conta a pagar"
    };
    return map[tipo] || "Conta a pagar";
}

function marcarTodos(marcado){
    document.querySelectorAll(".check-conta:not(:disabled)").forEach(function(input){ input.checked = marcado; });
    const check = document.getElementById("checkTodos");
    if(check) check.checked = marcado;
}

function exportarCsv(){
    const linhas = [["Fornecedor","Descricao","Documento","Vencimento","Valor","Origem","Status"]];
    document.querySelectorAll("#tabelaContas tr").forEach(function(tr){
        const cols = Array.from(tr.children).slice(1).map(function(td){ return td.textContent.trim(); });
        if(cols.length === 7 && !tr.querySelector(".vazio")) linhas.push(cols);
    });
    const csv  = linhas.map(function(linha){ return linha.map(function(col){ return `"${String(col).replaceAll('"','""')}"`; }).join(";"); }).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = "contas_a_pagar.csv";
    link.click();
    URL.revokeObjectURL(url);
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function obterPeriodo(){
    const ativo = document.querySelector("[data-periodo].ativo")?.dataset.periodo || "30";
    if(ativo === "personalizado"){
        return { inicio: document.getElementById("dataInicio")?.value || "", fim: document.getElementById("dataFim")?.value || "" };
    }
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - Number(ativo) + 1);
    return { inicio: inicio.toISOString().slice(0, 10), fim: hoje.toISOString().slice(0, 10) };
}

function montarDias(periodo){
    const inicio = periodo.inicio ? new Date(periodo.inicio + "T12:00:00") : new Date();
    const fim    = periodo.fim    ? new Date(periodo.fim    + "T12:00:00") : new Date();
    const dias   = [];
    const atual  = new Date(inicio);
    while(atual <= fim){
        dias.push(atual.toISOString().slice(0, 10));
        atual.setDate(atual.getDate() + 1);
    }
    return dias.length ? dias : [new Date().toISOString().slice(0, 10)];
}

function dataDentro(data, periodo){
    if(!data) return false;
    const chave = String(data).slice(0, 10);
    if(periodo.inicio && chave < periodo.inicio) return false;
    if(periodo.fim    && chave > periodo.fim)    return false;
    return true;
}

function somarValor(contas){
    return contas.reduce(function(total, conta){ return total + numero(conta.valor); }, 0);
}

function formatarDataLocal(valor){
    const data = new Date(String(valor || "") + "T12:00:00");
    return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function formatarDia(valor){
    const data = new Date(valor + "T12:00:00");
    return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
}
