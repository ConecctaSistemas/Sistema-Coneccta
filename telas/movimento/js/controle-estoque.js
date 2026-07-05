document.addEventListener("DOMContentLoaded", function(){
    inicializarEventos();
    inicializarCamposContagem();
    renderizarEstoque();
});

function inicializarEventos(){
    ["buscaEstoque","filtroStatus","filtroCategoria","filtroFornecedor"].forEach(function(id){
        const evento = id === "buscaEstoque" ? "input" : "change";
        document.getElementById(id)?.addEventListener(evento, renderizarEstoque);
    });
    document.getElementById("btnSalvar")?.addEventListener("click", salvarAjustes);
    document.getElementById("btnSalvarRodape")?.addEventListener("click", salvarAjustes);
    document.getElementById("btnRecarregar")?.addEventListener("click", renderizarEstoque);
    document.getElementById("btnExcel")?.addEventListener("click", exportarCsv);
    document.getElementById("btnZerados")?.addEventListener("click", function(){
        document.getElementById("filtroStatus").value = "zerado";
        renderizarEstoque();
    });
    document.getElementById("btnBaixos")?.addEventListener("click", function(){
        document.getElementById("filtroStatus").value = "baixo";
        renderizarEstoque();
    });
    document.getElementById("btnAbrirModalContagem")?.addEventListener("click", abrirModalContagem);
    document.getElementById("btnFecharModalContagem")?.addEventListener("click", fecharModalContagem);
    document.getElementById("btnCancelarModalContagem")?.addEventListener("click", fecharModalContagem);
    document.getElementById("btnSalvarModalContagem")?.addEventListener("click", salvarModalContagem);
    document.getElementById("modalSelecionarTodosProdutos")?.addEventListener("change", alternarTodosProdutosModal);
    document.getElementById("modalContagemEscopo")?.addEventListener("change", aplicarEscopoModal);
    document.getElementById("modalContagemCategoria")?.addEventListener("change", aplicarEscopoModal);
    document.getElementById("modalContagem")?.addEventListener("click", function(evento){
        if(evento.target?.id === "modalContagem") fecharModalContagem();
    });
}

function renderizarEstoque(){
    const base = obterBase();
    preencherFiltros(base);
    let produtos = normalizarProdutos(base.mercadorias || []);
    const usandoDemo = produtos.length === 0;
    if(usandoDemo) produtos = produtosDemonstrativos();
    const contagem = obterContagemAtiva(base);

    renderizarListaContagens(base, produtos);

    const busca = normalizar(document.getElementById("buscaEstoque")?.value || "");
    const status = document.getElementById("filtroStatus")?.value || "";
    const categoria = document.getElementById("filtroCategoria")?.value || "";
    const fornecedor = document.getElementById("filtroFornecedor")?.value || "";

    const filtrados = produtos.filter(function(produto){
        if(status && classificarEstoque(produto) !== status) return false;
        if(categoria && produto.categoria !== categoria) return false;
        if(fornecedor && produto.fornecedor !== fornecedor) return false;
        if(busca && !normalizar([produto.codigo, produto.descricao, produto.categoria, produto.fornecedor].join(" ")).includes(busca)) return false;
        if(contagem && !produtoEstaNaContagem(contagem, produto.id)) return false;
        return true;
    });

    document.getElementById("painelContagemProdutos")?.classList.toggle("recolhido", !contagem);
    renderizarTabela(contagem ? filtrados : [], usandoDemo, contagem);
    atualizarStatusContagem();
}

function normalizarProdutos(produtos){
    return produtos.filter(function(produto){ return produto.ativo !== false; }).map(function(produto, index){
        return {
            id:produto.id || "produto-" + index,
            codigo:produto.codigo || produto.ean || "-",
            descricao:produto.descricao || produto.nome || "Produto",
            unidade:produto.unidade || "UN",
            categoria:produto.categoria || "Sem categoria",
            fornecedor:produto.fornecedor || produto.fornecedorNome || produto.fornecedorCnpj || "Sem fornecedor",
            estoque:numero(produto.estoque),
            estoqueMinimo:numero(produto.estoqueMinimo),
            precoCusto:numero(produto.precoCusto),
            precoVenda:numero(produto.precoPromocional) > 0 ? numero(produto.precoPromocional) : numero(produto.precoVenda)
        };
    });
}

function produtosDemonstrativos(){
    return [
        { id:"demo-arroz", codigo:"789001", descricao:"Arroz 5kg", unidade:"UN", categoria:"Mercearia", fornecedor:"Fornecedor Padrao", estoque:100, estoqueMinimo:30, precoCusto:20, precoVenda:30 },
        { id:"demo-feijao", codigo:"789002", descricao:"Feijao 1kg", unidade:"UN", categoria:"Mercearia", fornecedor:"Fornecedor Padrao", estoque:200, estoqueMinimo:60, precoCusto:8, precoVenda:12 },
        { id:"demo-refri", codigo:"789003", descricao:"Refrigerante 2L", unidade:"UN", categoria:"Bebidas", fornecedor:"Distribuidora Premium", estoque:8, estoqueMinimo:20, precoCusto:6, precoVenda:8 },
        { id:"demo-agua", codigo:"789004", descricao:"Agua Mineral", unidade:"UN", categoria:"Bebidas", fornecedor:"Distribuidora Premium", estoque:0, estoqueMinimo:25, precoCusto:1.5, precoVenda:2.5 },
        { id:"demo-limpeza", codigo:"789005", descricao:"Kit Limpeza", unidade:"UN", categoria:"Limpeza", fornecedor:"Fornecedor Limpeza", estoque:45, estoqueMinimo:15, precoCusto:18, precoVenda:30 }
    ];
}

function preencherFiltros(base){
    if(window.filtrosEstoqueCarregados) return;
    const produtos = normalizarProdutos(base.mercadorias || []);
    const lista = produtos.length ? produtos : produtosDemonstrativos();
    preencherSelect("filtroCategoria", [...new Set(lista.map(function(p){ return p.categoria; }).filter(Boolean))], "Todas");
    preencherSelect("modalContagemCategoria", [...new Set(lista.map(function(p){ return p.categoria; }).filter(Boolean))], "Todas");
    preencherSelect("filtroFornecedor", [...new Set(lista.map(function(p){ return p.fornecedor; }).filter(Boolean))], "Todos");
    window.filtrosEstoqueCarregados = true;
}

function preencherSelect(id, valores, textoInicial){
    const select = document.getElementById(id);
    if(!select) return;
    select.innerHTML = `<option value="">${textoInicial}</option>` + valores.sort().map(function(valor){
        return `<option value="${escapar(valor)}">${escapar(valor)}</option>`;
    }).join("");
}

function renderizarResumo(produtos){
    const totalQtd = produtos.reduce(function(total, p){ return total + p.estoque; }, 0);
    const valorVenda = produtos.reduce(function(total, p){ return total + p.estoque * p.precoVenda; }, 0);
    const valorCusto = produtos.reduce(function(total, p){ return total + p.estoque * p.precoCusto; }, 0);
    definirTexto("resumoQuantidade", formatarQuantidade(totalQtd));
    definirTexto("resumoVenda", formatarMoedaRS(valorVenda));
    definirTexto("resumoCusto", formatarMoedaRS(valorCusto));
    definirTexto("resumoBaixo", String(produtos.filter(function(p){ return classificarEstoque(p) === "baixo"; }).length));
    definirTexto("resumoZerado", String(produtos.filter(function(p){ return classificarEstoque(p) === "zerado"; }).length));
}

function renderizarIndicadores(produtos){
    const ordenado = produtos.slice().sort(function(a, b){ return b.estoque - a.estoque; });
    const totalValor = produtos.reduce(function(total, p){ return total + p.estoque * p.precoVenda; }, 0);
    const totalQtd = produtos.reduce(function(total, p){ return total + p.estoque; }, 0);
    definirTexto("qtdProdutos", String(produtos.length));
    definirTexto("valorMedio", formatarMoedaRS(totalQtd ? totalValor / totalQtd : 0));
    definirTexto("maiorEstoque", ordenado[0] ? ordenado[0].descricao + " (" + formatarQuantidade(ordenado[0].estoque) + ")" : "-");
    definirTexto("menorEstoque", ordenado.length ? ordenado[ordenado.length - 1].descricao + " (" + formatarQuantidade(ordenado[ordenado.length - 1].estoque) + ")" : "-");
    atualizarAjustesPendentes();
}

function renderizarTabela(produtos, usandoDemo, contagem){
    const destino = document.getElementById("tabelaEstoque");
    if(!destino) return;
    if(!contagem){
        destino.innerHTML = "<tr><td colspan='6' class='vazio'>Crie uma contagem para listar os produtos.</td></tr>";
        return;
    }
    if(!produtos.length){
        destino.innerHTML = "<tr><td colspan='6' class='vazio'>Nenhum produto selecionado para esta contagem.</td></tr>";
        return;
    }
    destino.innerHTML = produtos.map(function(p){
        const itemContado = obterItemContagem(contagem, p.id);
        const contado = itemContado ? itemContado.contado : p.estoque;
        return `<tr>
            <td>${escapar(p.codigo)}</td>
            <td>${escapar(p.descricao)}</td>
            <td>${escapar(p.categoria)}</td>
            <td>${formatarQuantidade(p.estoque)}</td>
            <td><input type="number" class="input-contagem" data-id="${escapar(p.id)}" data-atual="${p.estoque}" value="${contado}" step="0.001" ${usandoDemo ? "disabled" : ""}></td>
            <td class="neutro" id="diff-${escaparId(p.id)}">-</td>
        </tr>`;
    }).join("");
    document.querySelectorAll(".input-contagem").forEach(function(input){
        input.addEventListener("input", function(){ atualizarDiferenca(input); });
        atualizarDiferenca(input);
    });
}

function renderizarListaContagens(base, produtos){
    const destino = document.getElementById("listaContagens");
    const total = document.getElementById("totalContagens");
    if(!destino) return;
    base.contagensEstoque = Array.isArray(base.contagensEstoque) ? base.contagensEstoque : [];
    definirTexto("totalContagens", base.contagensEstoque.length + " contagem(ns)");
    if(!base.contagensEstoque.length){
        destino.innerHTML = "<div class='vazio'>Nenhuma contagem criada.</div>";
        return;
    }
    destino.innerHTML = base.contagensEstoque.slice().reverse().map(function(contagem){
        const ids = idsProdutosContagem(contagem);
        const itens = Array.isArray(contagem.itens) ? contagem.itens : [];
        const confirmada = contagem.status === "confirmada";
        const aberta = contagem.status === "aberta";
        const statusTexto = confirmada ? "Confirmada" : aberta ? "Aberta" : "Pendente";
        const nomesProdutos = produtos.filter(function(produto){ return ids.includes(produto.id); }).slice(0, 3).map(function(produto){ return produto.descricao; }).join(", ");
        return `<article class="contagem-card ${confirmada ? "confirmada" : ""}">
            <div>
                <div class="contagem-card-topo">
                    <strong>${escapar(contagem.nome || "Contagem")}</strong>
                    <span class="status-contagem ${confirmada ? "confirmada" : aberta ? "aberta" : "pendente"}">${statusTexto}</span>
                </div>
                <small>${escapar(contagem.responsavel || "-")} | ${formatarData(contagem.data)} | ${escapar(rotuloTipoContagem(contagem.tipo))}</small>
                <p>${ids.length} produto(s) selecionado(s) | ${itens.length} contado(s)</p>
                <p>${escapar(nomesProdutos || "Produtos selecionados na contagem")}</p>
                ${contagem.observacao ? `<p>${escapar(contagem.observacao)}</p>` : ""}
            </div>
            <div class="acoes-card-contagem">
                ${!confirmada ? `<button type="button" class="btn secundario btn-abrir-contagem" data-id="${escapar(contagem.id)}"><i class="fa-solid fa-folder-open"></i>Abrir</button>` : ""}
                ${!confirmada ? `<button type="button" class="btn btn-confirmar-contagem" data-id="${escapar(contagem.id)}"><i class="fa-solid fa-check"></i>Confirmar</button>` : ""}
            </div>
        </article>`;
    }).join("");
    document.querySelectorAll(".btn-abrir-contagem").forEach(function(botao){
        botao.addEventListener("click", function(){ abrirContagem(botao.dataset.id); });
    });
    document.querySelectorAll(".btn-confirmar-contagem").forEach(function(botao){
        botao.addEventListener("click", function(){ confirmarContagem(botao.dataset.id); });
    });
}

function abrirModalContagem(){
    const base = obterBase();
    preencherUsuariosModal(base);
    preencherProdutosModal();
    const data = document.getElementById("modalContagemData");
    if(data && !data.value) data.value = new Date().toISOString().slice(0, 10);
    document.body.classList.add("modal-aberto");
    document.getElementById("modalContagem")?.classList.remove("recolhido");
    setTimeout(function(){ document.getElementById("modalContagemNome")?.focus(); }, 50);
}

function fecharModalContagem(){
    document.body.classList.remove("modal-aberto");
    document.getElementById("modalContagem")?.classList.add("recolhido");
}

function preencherUsuariosModal(base){
    const select = document.getElementById("modalContagemResponsavel");
    if(!select) return;
    const usuarios = Array.isArray(base.usuarios) ? base.usuarios : [];
    const opcoes = usuarios.filter(function(usuario){ return usuario.ativo !== false; }).map(function(usuario){
        const nome = usuario.nome || usuario.login || usuario.usuario || "Usuario";
        return `<option value="${escapar(nome)}">${escapar(nome)}</option>`;
    });
    select.innerHTML = opcoes.length ? opcoes.join("") : "<option value='Administrador'>Administrador</option>";
}

function preencherProdutosModal(){
    let produtos = normalizarProdutos((obterBase().mercadorias || []));
    if(!produtos.length) produtos = produtosDemonstrativos();
    const destino = document.getElementById("modalListaProdutos");
    if(!destino) return;
    destino.innerHTML = produtos.map(function(produto){
        return `<label class="modal-produto" data-categoria="${escapar(produto.categoria)}">
            <input type="checkbox" class="modal-produto-check" value="${escapar(produto.id)}">
            <span>
                <strong>${escapar(produto.descricao)}</strong>
                <small>${escapar(produto.codigo)} | ${escapar(produto.categoria)} | Estoque ${formatarQuantidade(produto.estoque)}</small>
            </span>
            <span class="status ${classificarEstoque(produto)}">${rotuloStatus(classificarEstoque(produto))}</span>
        </label>`;
    }).join("") || "<div class='vazio'>Nenhum produto cadastrado.</div>";
    document.querySelectorAll(".modal-produto-check").forEach(function(input){
        input.addEventListener("change", atualizarTotalProdutosModal);
    });
    aplicarEscopoModal();
}

function alternarTodosProdutosModal(){
    const marcado = Boolean(document.getElementById("modalSelecionarTodosProdutos")?.checked);
    document.querySelectorAll(".modal-produto-check").forEach(function(input){
        input.checked = marcado;
    });
    const escopo = document.getElementById("modalContagemEscopo");
    if(escopo && marcado) escopo.value = "todos";
    atualizarTotalProdutosModal();
}

function aplicarEscopoModal(){
    const escopo = document.getElementById("modalContagemEscopo")?.value || "manual";
    const categoria = document.getElementById("modalContagemCategoria")?.value || "";
    document.querySelectorAll(".modal-produto-check").forEach(function(input){
        const item = input.closest(".modal-produto");
        const categoriaProduto = item?.dataset.categoria || "";
        if(escopo === "todos") input.checked = true;
        if(escopo === "manual") input.checked = input.checked && true;
        if(escopo === "categoria") input.checked = !categoria || categoriaProduto === categoria;
    });
    atualizarTotalProdutosModal();
}

function atualizarTotalProdutosModal(){
    const total = document.querySelectorAll(".modal-produto-check:checked").length;
    const todos = document.querySelectorAll(".modal-produto-check").length;
    definirTexto("modalTotalProdutos", total + " selecionado(s)");
    const checkTodos = document.getElementById("modalSelecionarTodosProdutos");
    if(checkTodos) checkTodos.checked = total > 0 && total === todos;
}

function salvarModalContagem(){
    const base = obterBase();
    base.contagensEstoque = Array.isArray(base.contagensEstoque) ? base.contagensEstoque : [];
    const nome = document.getElementById("modalContagemNome")?.value.trim() || "";
    const responsavel = document.getElementById("modalContagemResponsavel")?.value || "";
    const data = document.getElementById("modalContagemData")?.value || new Date().toISOString().slice(0, 10);
    const tipo = document.getElementById("modalContagemTipo")?.value || "geral";
    const escopo = document.getElementById("modalContagemEscopo")?.value || "manual";
    const categoria = document.getElementById("modalContagemCategoria")?.value || "";
    const observacao = document.getElementById("modalContagemObservacao")?.value.trim() || "";
    const produtosIds = Array.from(document.querySelectorAll(".modal-produto-check:checked")).map(function(input){ return input.value; });
    if(!nome){
        notificar("Informe o nome da contagem.", "aviso");
        document.getElementById("modalContagemNome")?.focus();
        return;
    }
    if(!responsavel){
        notificar("Selecione o responsavel.", "aviso");
        return;
    }
    if(!produtosIds.length){
        notificar("Selecione pelo menos um produto.", "aviso");
        return;
    }
    base.contagensEstoque.forEach(function(contagem){
        if(contagem.status === "aberta") contagem.status = "pendente";
    });
    base.contagensEstoque.push({
        id:gerarId("cnt"),
        nome,
        responsavel,
        data,
        tipo,
        escopo,
        categoria,
        produtosIds,
        observacao,
        status:"aberta",
        criadoEm:new Date().toISOString(),
        itens:[]
    });
    salvarBase(base);
    limparModalContagem();
    fecharModalContagem();
    renderizarEstoque();
    notificar("Contagem criada.", "sucesso");
}

function limparModalContagem(){
    ["modalContagemNome","modalContagemObservacao"].forEach(function(id){
        const campo = document.getElementById(id);
        if(campo) campo.value = "";
    });
    const data = document.getElementById("modalContagemData");
    if(data) data.value = new Date().toISOString().slice(0, 10);
    const tipo = document.getElementById("modalContagemTipo");
    if(tipo) tipo.value = "geral";
    const escopo = document.getElementById("modalContagemEscopo");
    if(escopo) escopo.value = "manual";
    const categoria = document.getElementById("modalContagemCategoria");
    if(categoria) categoria.value = "";
    const todos = document.getElementById("modalSelecionarTodosProdutos");
    if(todos) todos.checked = false;
    document.querySelectorAll(".modal-produto-check").forEach(function(input){ input.checked = false; });
    atualizarTotalProdutosModal();
}

function salvarAjustes(){
    const base = obterBase();
    const contagem = obterContagemAtiva(base);
    if(!contagem){
        notificar("Abra uma contagem antes de salvar.", "aviso");
        return;
    }
    let alterados = 0;
    const agora = new Date().toISOString();
    contagem.itens = Array.isArray(contagem.itens) ? contagem.itens : [];
    document.querySelectorAll(".input-contagem:not(:disabled)").forEach(function(input){
        const id = input.dataset.id;
        const produto = (base.mercadorias || []).find(function(item){ return item.id === id; });
        if(!produto) return;
        const anterior = numero(produto.estoque);
        const contado = numero(input.value);
        const existente = contagem.itens.find(function(item){ return item.produtoId === id; });
        const dados = {
            produtoId:id,
            produto:produto.descricao || produto.nome || "",
            anterior,
            contado,
            diferenca:contado - anterior,
            atualizadoEm:agora
        };
        if(existente){
            Object.assign(existente, dados);
        }else{
            contagem.itens.push(dados);
        }
        alterados++;
    });
    if(!alterados){
        notificar("Nenhum produto contado.", "aviso");
        return;
    }
    contagem.atualizadoEm = agora;
    salvarBase(base);
    notificar(alterados + " item(ns) salvo(s) na contagem.", "sucesso");
    renderizarEstoque();
}

function abrirContagem(id){
    const base = obterBase();
    base.contagensEstoque = Array.isArray(base.contagensEstoque) ? base.contagensEstoque : [];
    const alvo = base.contagensEstoque.find(function(contagem){ return contagem.id === id; });
    if(!alvo || alvo.status === "confirmada") return;
    base.contagensEstoque.forEach(function(contagem){
        if(contagem.status === "aberta") contagem.status = "pendente";
    });
    alvo.status = "aberta";
    alvo.abertaEm = new Date().toISOString();
    salvarBase(base);
    renderizarEstoque();
}

function confirmarContagem(id){
    const base = obterBase();
    base.contagensEstoque = Array.isArray(base.contagensEstoque) ? base.contagensEstoque : [];
    base.movimentosEstoque = Array.isArray(base.movimentosEstoque) ? base.movimentosEstoque : [];
    const contagem = base.contagensEstoque.find(function(item){ return item.id === id; });
    if(!contagem || contagem.status === "confirmada") return;
    const itens = Array.isArray(contagem.itens) ? contagem.itens : [];
    if(!itens.length){
        notificar("Salve a contagem dos produtos antes de confirmar.", "aviso");
        return;
    }
    const agora = new Date().toISOString();
    let aplicados = 0;
    itens.forEach(function(item){
        const produto = (base.mercadorias || []).find(function(p){ return p.id === item.produtoId; });
        if(!produto) return;
        const anterior = numero(produto.estoque);
        const novo = numero(item.contado);
        produto.estoque = novo;
        base.movimentosEstoque.push({
            id:gerarId("est"),
            contagemId:contagem.id,
            produtoId:item.produtoId,
            produto:produto.descricao || produto.nome || item.produto || "",
            tipo:"contagem_confirmada",
            quantidade:novo - anterior,
            anterior,
            novo,
            data:agora
        });
        item.anterior = anterior;
        item.contado = novo;
        item.diferenca = novo - anterior;
        aplicados++;
    });
    contagem.status = "confirmada";
    contagem.confirmadaEm = agora;
    salvarBase(base);
    window.filtrosEstoqueCarregados = false;
    renderizarEstoque();
    notificar(aplicados + " produto(s) confirmado(s) no estoque.", "sucesso");
}

function inicializarCamposContagem(){
    const data = document.getElementById("modalContagemData");
    if(data && !data.value) data.value = new Date().toISOString().slice(0, 10);
    atualizarStatusContagem();
}

function obterContagemAtiva(base){
    base = base || obterBase();
    base.contagensEstoque = Array.isArray(base.contagensEstoque) ? base.contagensEstoque : [];
    return base.contagensEstoque.find(function(contagem){ return contagem.status === "aberta"; }) || null;
}

function atualizarStatusContagem(){
    const contagem = obterContagemAtiva();
    const destino = document.getElementById("contagemAtivaStatus");
    if(!destino) return;
    if(!contagem){
        destino.textContent = "Nenhuma contagem aberta";
        return;
    }
    const total = Array.isArray(contagem.itens) ? contagem.itens.length : 0;
    const selecionados = idsProdutosContagem(contagem).length;
    destino.textContent = contagem.nome + " | " + selecionados + " produto(s) | " + total + " contado(s)";
}

function idsProdutosContagem(contagem){
    contagem.produtosIds = Array.isArray(contagem.produtosIds) ? contagem.produtosIds : [];
    return contagem.produtosIds;
}

function produtoEstaNaContagem(contagem, produtoId){
    return idsProdutosContagem(contagem).includes(produtoId);
}

function obterItemContagem(contagem, produtoId){
    contagem.itens = Array.isArray(contagem.itens) ? contagem.itens : [];
    return contagem.itens.find(function(item){ return item.produtoId === produtoId; }) || null;
}

function renderizarGraficoCategorias(produtos){
    const destino = document.getElementById("graficoCategorias");
    if(!destino) return;
    const mapa = {};
    produtos.forEach(function(p){
        if(!mapa[p.categoria]) mapa[p.categoria] = 0;
        mapa[p.categoria] += p.estoque;
    });
    const linhas = Object.entries(mapa).sort(function(a, b){ return b[1] - a[1]; });
    definirTexto("totalCategorias", linhas.length + " categoria(s)");
    const maior = Math.max(...linhas.map(function(l){ return l[1]; }), 1);
    destino.innerHTML = linhas.map(function(linha){
        const altura = Math.max(12, Math.round(linha[1] / maior * 180));
        return `<div class="barra-categoria"><strong>${formatarQuantidade(linha[1])}</strong><span style="height:${altura}px"></span><small>${escapar(linha[0])}</small></div>`;
    }).join("");
}

function renderizarCriticos(produtos){
    const destino = document.getElementById("listaCriticos");
    if(!destino) return;
    const criticos = produtos.filter(function(p){ return ["baixo", "zerado", "negativo"].includes(classificarEstoque(p)); })
        .sort(function(a, b){ return a.estoque - b.estoque; });
    if(!criticos.length){
        destino.innerHTML = "<div class='vazio'>Nenhum produto critico.</div>";
        return;
    }
    destino.innerHTML = criticos.slice(0, 20).map(function(p){
        const status = classificarEstoque(p);
        return `<div class="critico-item ${status}">
            <div>
                <strong>${escapar(p.descricao)}</strong>
                <small>${escapar(p.categoria)} | Minimo ${formatarQuantidade(p.estoqueMinimo)}</small>
            </div>
            <span class="status ${status}">${formatarQuantidade(p.estoque)}</span>
        </div>`;
    }).join("");
}

function atualizarDiferenca(input){
    const id = input.dataset.id || "";
    const atual = numero(input.dataset.atual);
    const novo = numero(input.value);
    const diff = novo - atual;
    const celula = document.getElementById("diff-" + escaparId(id));
    if(!celula) return;
    if(diff > 0){
        celula.className = "positivo";
        celula.textContent = "+" + formatarQuantidade(diff);
    }else if(diff < 0){
        celula.className = "negativo";
        celula.textContent = formatarQuantidade(diff);
    }else{
        celula.className = "neutro";
        celula.textContent = "-";
    }
    atualizarAjustesPendentes();
}

function atualizarAjustesPendentes(){
    const total = Array.from(document.querySelectorAll(".input-contagem:not(:disabled)")).filter(function(input){
        return numero(input.value) !== numero(input.dataset.atual);
    }).length;
    definirTexto("ajustesPendentes", String(total));
}

function exportarCsv(){
    const linhas = [["Codigo","Produto","Categoria","Estoque atual","Nova contagem","Diferenca"]];
    document.querySelectorAll("#tabelaEstoque tr").forEach(function(tr){
        const cols = Array.from(tr.children).map(function(td){ return td.textContent.trim(); });
        if(cols.length === 6 && !tr.querySelector(".vazio")) linhas.push(cols);
    });
    const csv = linhas.map(function(linha){ return linha.map(function(coluna){ return `"${String(coluna).replaceAll('"','""')}"`; }).join(";"); }).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "controle_estoque.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function classificarEstoque(p){
    if(p.estoque < 0) return "negativo";
    if(p.estoque <= 0) return "zerado";
    if(p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo) return "baixo";
    return "ok";
}

function rotuloStatus(status){
    return { ok:"OK", baixo:"Baixo", zerado:"Zerado", negativo:"Negativo" }[status] || status;
}

function rotuloTipoContagem(tipo){
    return { geral:"Geral", parcial:"Parcial", ciclica:"Ciclica", auditoria:"Auditoria" }[tipo] || tipo || "Geral";
}

function formatarData(data){
    if(!data) return "-";
    const partes = String(data).slice(0, 10).split("-");
    if(partes.length !== 3) return data;
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function escaparId(valor){
    return String(valor || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}
