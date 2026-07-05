/* =============================================
   TABELAS DE PREÇO — lógica principal
   ============================================= */

let tabelaEditandoId = null;
let filtroTipoAtual  = "";

// ---------- CONFIRMAÇÃO ----------
function confirmar(mensagem) {
    return new Promise(function(resolve) {
        const modal  = document.getElementById("modalConfirmacao");
        const msg    = document.getElementById("modalConfirmacaoMensagem");
        const btnOk  = document.getElementById("btnConfirmacaoOk");
        const btnNao = document.getElementById("btnConfirmacaoCancelar");
        if (!modal) { resolve(window.confirm(mensagem)); return; }
        msg.textContent = mensagem;
        modal.classList.add("aberto");
        modal.setAttribute("aria-hidden", "false");
        function fechar(r) {
            modal.classList.remove("aberto");
            modal.setAttribute("aria-hidden", "true");
            btnOk.removeEventListener("click", onOk);
            btnNao.removeEventListener("click", onNao);
            modal.removeEventListener("click", onFundo);
            resolve(r);
        }
        function onOk()  { fechar(true); }
        function onNao() { fechar(false); }
        function onFundo(e) { if (e.target === modal) fechar(false); }
        btnOk.addEventListener("click", onOk);
        btnNao.addEventListener("click", onNao);
        modal.addEventListener("click", onFundo);
    });
}

// ---------- DADOS ----------
function obterTabelasPreco() { return obterBase().tabelasPreco || []; }
function obterTabela(id)     { return obterTabelasPreco().find(t => t.id === id) || null; }

function obterMercadorias() {
    return (obterBase().mercadorias || []).filter(m => m.ativo !== false);
}
function obterClientes() {
    return (obterBase().clientes || []).filter(c => c.ativo !== false);
}
function obterFormasPagamento() {
    return (obterBase().formasPagamento || []).filter(fp => fp.ativo !== false);
}

// ---------- HELPERS ----------
function labelAjuste(val) {
    const n = parseFloat(val) || 0;
    if (n === 0) return "";
    return n < 0 ? `${Math.abs(n)}% desconto` : `${n}% acréscimo`;
}

function classeAjuste(val) {
    const n = parseFloat(val) || 0;
    if (n < 0) return "ajuste-desconto";
    if (n > 0) return "ajuste-acrescimo";
    return "";
}

function iconePagamento(tipo) {
    const mapa = {
        dinheiro:       "fa-solid fa-money-bill-wave",
        pix:            "fa-solid fa-bolt",
        cartao_credito: "fa-solid fa-credit-card",
        cartao_debito:  "fa-solid fa-credit-card",
        credito_loja:   "fa-solid fa-store",
        boleto:         "fa-solid fa-barcode",
        sem_pagamento:  "fa-solid fa-ban"
    };
    return mapa[tipo] || "fa-solid fa-money-bill-wave";
}

// ---------- CRUD ----------
function coletarRegrasPagamento() {
    const itens = document.querySelectorAll("#listaRegrasPagamento .tp-regra-item");
    const regras = [];
    itens.forEach(function(el) {
        const ajuste = parseFloat(el.querySelector(".input-ajuste")?.value || "0") || 0;
        if (ajuste !== 0) {
            regras.push({
                formaPagamentoId: el.dataset.fpId,
                descricao:        el.dataset.fpDesc,
                ajuste
            });
        }
    });
    return regras;
}

function salvarTabela() {
    const base     = obterBase();
    const nome     = (document.getElementById("tpNome")?.value || "").trim();
    const tipo     = document.getElementById("tpTipo")?.value || "normal";
    const ativa    = document.getElementById("tpAtiva")?.value !== "false";
    const clienteId = document.getElementById("tpCliente")?.value || null;
    const regraQtd  = parseInt(document.getElementById("tpQuantMin")?.value || "0", 10) || 0;

    if (!nome) {
        notificar("Informe o nome da tabela.", "erro");
        document.getElementById("tpNome")?.focus();
        return;
    }
    if (tipo === "cliente" && !clienteId) {
        notificar("Selecione o cliente para esta tabela.", "erro");
        return;
    }

    if (!Array.isArray(base.tabelasPreco)) base.tabelasPreco = [];

    const duplicado = base.tabelasPreco.some(t =>
        normalizar(t.nome) === normalizar(nome) && t.id !== tabelaEditandoId
    );
    if (duplicado) {
        notificar("Já existe uma tabela com esse nome.", "erro");
        return;
    }

    const regrasPagamento = tipo === "pagamento" ? coletarRegrasPagamento() : [];
    const agora = new Date().toISOString();

    if (tabelaEditandoId) {
        const idx = base.tabelasPreco.findIndex(t => t.id === tabelaEditandoId);
        if (idx >= 0) {
            Object.assign(base.tabelasPreco[idx], {
                nome, tipo, ativa, clienteId, regrasPagamento,
                regraQuantidade: regraQtd, atualizadoEm: agora
            });
        }
    } else {
        tabelaEditandoId = gerarId("tp");
        base.tabelasPreco.push({
            id: tabelaEditandoId,
            nome, tipo, ativa, clienteId, regrasPagamento,
            regraQuantidade: regraQtd,
            criadoEm: agora
        });
    }

    salvarBase(base);
    notificar("Tabela salva!", "sucesso");
    renderizarTabelas();
    atualizarCards();

    // Vai para aba de produtos (exceto tipo pagamento, que não tem preço por produto)
    if (tipo !== "pagamento") {
        abrirAba("produtos");
        renderizarProdutosTabela();
        document.getElementById("btnAbaProdutos")?.focus();
    }
}

function excluirTabela(id) {
    const tabela = obterTabela(id);
    if (!tabela) return;
    confirmar(`Excluir a tabela "${tabela.nome}"? Os preços vinculados nos produtos serão removidos.`).then(ok => {
        if (!ok) return;
        const base = obterBase();
        base.tabelasPreco = base.tabelasPreco.filter(t => t.id !== id);
        (base.mercadorias || []).forEach(m => {
            if (m.tabelasPreco) delete m.tabelasPreco[id];
        });
        (base.clientes || []).forEach(c => {
            if (c.tabelaPrecoPadraoId === id) c.tabelaPrecoPadraoId = null;
        });
        salvarBase(base);
        notificar("Tabela excluída.", "sucesso");
        renderizarTabelas();
        atualizarCards();
    });
}

// ---------- PREÇOS DOS PRODUTOS ----------
function salvarPrecosProdutos() {
    if (!tabelaEditandoId) return;
    const base  = obterBase();
    const linhas = document.querySelectorAll("#listaProdutosTabela tr[data-produto-id]");

    linhas.forEach(tr => {
        const pid   = tr.dataset.produtoId;
        const campo = tr.querySelector(".input-preco-tabela");
        const chk   = tr.querySelector(".chk-ativo-tabela");
        if (!campo) return;

        const valorStr = (campo.value || "").replace(/\./g, "").replace(",", ".");
        const preco    = parseFloat(valorStr) || 0;
        const ativo    = chk ? chk.checked : preco > 0;

        const merc = (base.mercadorias || []).find(m => m.id === pid);
        if (!merc) return;
        if (!merc.tabelasPreco) merc.tabelasPreco = {};
        if (preco > 0 || ativo) {
            merc.tabelasPreco[tabelaEditandoId] = { ativa: ativo, preco };
        } else {
            delete merc.tabelasPreco[tabelaEditandoId];
        }
    });

    salvarBase(base);
}

// ---------- RENDER: LISTA PRINCIPAL ----------
function renderizarTabelas() {
    const tbody = document.getElementById("listaTabelas");
    if (!tbody) return;

    const busca = normalizar(document.getElementById("buscaTabela")?.value || "");
    let tabelas = obterTabelasPreco();

    if (filtroTipoAtual) tabelas = tabelas.filter(t => (t.tipo || "normal") === filtroTipoAtual);
    if (busca)           tabelas = tabelas.filter(t => normalizar(t.nome || "").includes(busca));

    if (tabelas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhuma tabela encontrada.</td></tr>`;
        return;
    }

    const clientes   = obterBase().clientes || [];
    const mercadorias = obterBase().mercadorias || [];

    tbody.innerHTML = tabelas.map(t => {
        const tipo = t.tipo || "normal";
        const tipoLabel = { normal: "Normal", cliente: "Por Cliente", pagamento: "Por Pagamento" }[tipo] || "Normal";
        const tipoClass = { normal: "tag-normal", cliente: "tag-cliente", pagamento: "tag-pagamento" }[tipo] || "tag-normal";

        let vinculo = "—";
        if (tipo === "cliente" && t.clienteId) {
            const cli = clientes.find(c => c.id === t.clienteId);
            vinculo = cli ? escapar(cli.nome) : "<span class='muted'>Cliente não encontrado</span>";
        } else if (tipo === "pagamento") {
            const regras = (t.regrasPagamento || []).filter(r => r.ajuste !== 0);
            vinculo = regras.length > 0
                ? `${regras.length} forma${regras.length > 1 ? "s" : ""} configurada${regras.length > 1 ? "s" : ""}`
                : "<span class='muted'>Nenhum ajuste</span>";
        }

        const qtdProd = tipo !== "pagamento"
            ? mercadorias.filter(m => m.tabelasPreco?.[t.id]?.preco > 0).length
            : null;

        const regraLabel = t.regraQuantidade > 0
            ? `${t.regraQuantidade} itens`
            : `<span class='muted'>Sempre</span>`;

        return `<tr>
            <td><strong>${escapar(t.nome)}</strong></td>
            <td><span class="tp-tag ${tipoClass}">${tipoLabel}</span></td>
            <td>${vinculo}</td>
            <td>${regraLabel}</td>
            <td>${qtdProd !== null ? (qtdProd > 0 ? `${qtdProd} produto${qtdProd > 1 ? "s" : ""}` : "<span class='muted'>—</span>") : "<span class='muted'>N/A</span>"}</td>
            <td><span class="tp-situacao ${t.ativa !== false ? "ativa" : "inativa"}">${t.ativa !== false ? "Ativa" : "Inativa"}</span></td>
            <td class="acoes-celula">
                <button type="button" class="btn-icone" onclick="abrirEditarTabela('${t.id}')" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn-icone perigo" onclick="excluirTabela('${t.id}')" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join("");
}

// ---------- RENDER: REGRAS DE PAGAMENTO ----------
function renderizarRegrasPagamento(regrasSalvas) {
    const container = document.getElementById("listaRegrasPagamento");
    if (!container) return;

    const fps    = obterFormasPagamento();
    const regras = regrasSalvas || [];

    if (fps.length === 0) {
        container.innerHTML = `<p class="campo-dica">Nenhuma forma de pagamento cadastrada no sistema.</p>`;
        return;
    }

    container.innerHTML = fps.map(fp => {
        const regraAtual = regras.find(r => r.formaPagamentoId === fp.id) || { ajuste: 0 };
        const ajuste     = regraAtual.ajuste || 0;
        const label      = labelAjuste(ajuste);
        const cls        = classeAjuste(ajuste);
        return `<div class="tp-regra-item" data-fp-id="${escapar(fp.id)}" data-fp-desc="${escapar(fp.descricao)}">
            <span class="tp-regra-nome">
                <span class="tp-regra-icone">
                    <i class="${iconePagamento(fp.tipo)}"></i>
                </span>
                ${escapar(fp.descricao)}
            </span>
            <div class="tp-regra-campo">
                <div class="tp-regra-input-wrap">
                    <input type="number"
                        class="input-ajuste"
                        step="0.01"
                        placeholder="0"
                        value="${ajuste !== 0 ? ajuste : ""}">
                    <span class="tp-regra-sufixo">%</span>
                </div>
                <span class="tp-regra-desc ${cls}">${label}</span>
            </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".input-ajuste").forEach(function(inp) {
        inp.addEventListener("input", function() {
            const item  = inp.closest(".tp-regra-item");
            const desc  = item.querySelector(".tp-regra-desc");
            const val   = parseFloat(inp.value) || 0;
            desc.textContent  = labelAjuste(val);
            desc.className    = "tp-regra-desc " + classeAjuste(val);
        });
    });
}

// ---------- RENDER: PRODUTOS DA TABELA ----------
function renderizarProdutosTabela() {
    const tbody = document.getElementById("listaProdutosTabela");
    if (!tbody) return;

    if (!tabelaEditandoId) {
        tbody.innerHTML = `<tr><td colspan="5" class="vazio">Salve a configuração para definir preços dos produtos.</td></tr>`;
        return;
    }

    // Tabelas do tipo pagamento ajustam o total, não o preço por produto
    const tabela = obterTabela(tabelaEditandoId);
    if (tabela?.tipo === "pagamento") {
        tbody.innerHTML = `<tr><td colspan="5" class="vazio">Tabelas do tipo "Por Pagamento" aplicam ajuste percentual no total da venda, sem preço por produto.</td></tr>`;
        return;
    }

    const busca      = normalizar(document.getElementById("buscaProdutoTabela")?.value || "");
    const soComPreco = document.getElementById("filtroSoComPreco")?.checked;
    let mercadorias  = obterMercadorias();

    if (busca) {
        mercadorias = mercadorias.filter(m =>
            normalizar(m.descricao || "").includes(busca) ||
            String(m.codigo || "").toLowerCase().includes(busca)
        );
    }
    if (soComPreco) {
        mercadorias = mercadorias.filter(m => m.tabelasPreco?.[tabelaEditandoId]?.preco > 0);
    }

    if (mercadorias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="vazio">Nenhum produto encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = mercadorias.map(m => {
        const tp    = m.tabelasPreco?.[tabelaEditandoId] || { ativa: false, preco: 0 };
        const preco = tp.preco > 0 ? formatarMoeda(tp.preco) : "";
        return `<tr data-produto-id="${escapar(m.id)}">
            <td>${escapar(m.descricao || "—")}</td>
            <td class="muted">${escapar(String(m.codigo || "—"))}</td>
            <td>${formatarMoeda(m.precoVenda || 0)}</td>
            <td>
                <input type="text" class="input-preco-tabela" data-moeda
                    value="${escapar(preco)}"
                    placeholder="0,00">
            </td>
            <td style="text-align:center">
                <input type="checkbox" class="chk-ativo-tabela" ${tp.ativa && tp.preco > 0 ? "checked" : ""}>
            </td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll("[data-moeda]").forEach(inp => {
        if (typeof mascaraMoedaInput === "function") mascaraMoedaInput(inp);
        inp.addEventListener("change", salvarPrecosProdutos);
        inp.addEventListener("blur", salvarPrecosProdutos);
    });
    tbody.querySelectorAll(".chk-ativo-tabela").forEach(chk => {
        chk.addEventListener("change", salvarPrecosProdutos);
    });
}

// ---------- MODAL ----------
function abrirNovaTabela() {
    tabelaEditandoId = null;
    document.getElementById("tpNome").value        = "";
    document.getElementById("tpTipo").value        = "normal";
    document.getElementById("tpAtiva").value       = "true";
    document.getElementById("tpCliente").value     = "";
    document.getElementById("tpQuantMin").value    = "0";
    document.getElementById("modalTabelaTitulo").textContent = "Nova Tabela de Preço";

    atualizarCamposTipo();
    abrirAba("dados");
    renderizarProdutosTabela();
    abrirModal();
    setTimeout(() => document.getElementById("tpNome")?.focus(), 100);
}

function abrirEditarTabela(id) {
    const t = obterTabela(id);
    if (!t) return;
    tabelaEditandoId = id;

    document.getElementById("tpNome").value        = t.nome || "";
    document.getElementById("tpTipo").value        = t.tipo || "normal";
    document.getElementById("tpAtiva").value       = t.ativa !== false ? "true" : "false";
    document.getElementById("tpCliente").value     = t.clienteId || "";
    document.getElementById("tpQuantMin").value    = t.regraQuantidade || 0;
    document.getElementById("modalTabelaTitulo").textContent = `Editar: ${t.nome}`;

    atualizarCamposTipo(t.regrasPagamento || []);
    abrirAba("dados");
    renderizarProdutosTabela();
    abrirModal();
}

function abrirModal() {
    document.getElementById("modalTabela").classList.add("aberto");
    document.getElementById("backdropTabela").classList.add("aberto");
    document.getElementById("modalTabela").setAttribute("aria-hidden", "false");
}

function fecharModal() {
    document.getElementById("modalTabela").classList.remove("aberto");
    document.getElementById("backdropTabela").classList.remove("aberto");
    document.getElementById("modalTabela").setAttribute("aria-hidden", "true");
}

function abrirAba(aba) {
    document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
    document.querySelectorAll(".aba-tp-conteudo").forEach(c => c.classList.remove("ativa"));
    document.querySelector(`.aba-btn[data-aba="${aba}"]`)?.classList.add("ativa");
    document.getElementById(`aba-${aba}`)?.classList.add("ativa");
}

function atualizarCamposTipo(regrasSalvas) {
    const tipo = document.getElementById("tpTipo")?.value || "normal";
    document.querySelectorAll(".campo-tipo").forEach(el => (el.style.display = "none"));

    if (tipo === "cliente") {
        document.getElementById("campoTpCliente").style.display = "grid"; // label usa display:grid (design-base)
    } else if (tipo === "pagamento") {
        document.getElementById("campoTpRegrasPagamento").style.display = "block";
        renderizarRegrasPagamento(regrasSalvas || []);
    }

    // Aba de produtos só faz sentido para tipos que têm preço por produto
    const btnProd = document.getElementById("btnAbaProdutos");
    if (btnProd) {
        btnProd.style.opacity  = tipo === "pagamento" ? "0.45" : "1";
        btnProd.style.cursor   = tipo === "pagamento" ? "not-allowed" : "";
    }
}

// ---------- CARDS ----------
function atualizarCards() {
    const t  = obterTabelasPreco();
    const el = id => document.getElementById(id);
    el("cardTotal")     && (el("cardTotal").textContent     = t.length);
    el("cardNormais")   && (el("cardNormais").textContent   = t.filter(x => !x.tipo || x.tipo === "normal").length);
    el("cardClientes")  && (el("cardClientes").textContent  = t.filter(x => x.tipo === "cliente").length);
    el("cardPagamento") && (el("cardPagamento").textContent = t.filter(x => x.tipo === "pagamento").length);
}

// ---------- SELECTS ----------
function preencherSelects() {
    const selCliente = document.getElementById("tpCliente");
    const clientes   = obterClientes();
    selCliente.innerHTML = `<option value="">Selecione o cliente...</option>` +
        clientes.map(c => `<option value="${escapar(c.id)}">${escapar(c.nome)}</option>`).join("");
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("btnNovaTabela")?.addEventListener("click", abrirNovaTabela);
    document.getElementById("btnSalvarTabela")?.addEventListener("click", salvarTabela);
    document.getElementById("buscaTabela")?.addEventListener("input", renderizarTabelas);
    document.getElementById("buscaProdutoTabela")?.addEventListener("input", renderizarProdutosTabela);
    document.getElementById("filtroSoComPreco")?.addEventListener("change", renderizarProdutosTabela);

    document.getElementById("tpTipo")?.addEventListener("change", function() {
        atualizarCamposTipo([]);
    });

    document.getElementById("backdropTabela")?.addEventListener("click", fecharModal);
    document.querySelectorAll("[data-fechar-modal]").forEach(btn => btn.addEventListener("click", fecharModal));

    document.querySelectorAll(".aba-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const aba = btn.dataset.aba;
            const tipo = document.getElementById("tpTipo")?.value || "normal";
            if (aba === "produtos" && tipo === "pagamento") {
                notificar("Tabelas por pagamento não usam preço por produto.", "aviso");
                return;
            }
            if (aba === "produtos" && !tabelaEditandoId) {
                notificar("Salve os dados gerais antes de configurar os produtos.", "aviso");
                return;
            }
            abrirAba(aba);
            if (aba === "produtos") renderizarProdutosTabela();
        });
    });

    document.querySelectorAll(".tp-filtro-tipo .tab").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".tp-filtro-tipo .tab").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            filtroTipoAtual = btn.dataset.tipo;
            renderizarTabelas();
        });
    });

    preencherSelects();
    renderizarTabelas();
    atualizarCards();
});
