// pdv-carrinho.js
// Lançamento de item no carrinho, quantidade/preço, remoção, recálculo de totais, desconto manual da venda, guardar/cancelar venda em andamento.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Inicia a digitação de um novo item (produto localizado).
function iniciarLancamentoProduto(termo){
    const decoded = _decodificarEtiquetaBalanca(termo);
    if(decoded){
        const produto = _buscarProdutoPorPlu(decoded.plu);
        if(produto){
            _iniciarLancamentoBalanca(produto, decoded.peso, decoded.preco);
            return;
        }
    }

    const entrada = interpretarEntradaProduto(termo);

    if(!normalizar(entrada.termoProduto)){
        alert("É necessário informar um produto antes de prosseguir.");
        prepararCampoProduto();
        if(quantidadePendentePesquisa > 0){
            definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidadePendentePesquisa));
        }
        return;
    }

    const produto = localizarProduto(entrada.termoProduto);

    if(!produto){
        alert("Produto não cadastrado no sistema");
        prepararCampoProduto();
        if(quantidadePendentePesquisa > 0){
            definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidadePendentePesquisa));
        }
        return;
    }

    const configuracoes = obterConfiguracoesSistema();
    const quantidadeDigitada = entrada.quantidade > 0 ? entrada.quantidade : quantidadePendentePesquisa;
    const quantidadeTexto = entrada.quantidade > 0 ? entrada.quantidadeTexto : quantidadePendenteTexto;
    const quantidadeInformada = quantidadeDigitada > 0;
    const solicitaQuantidade = (configuracoes.solicitarQuantidadePdv !== false || produto.vendaFracionada === true) && !quantidadeInformada;
    const precoLivre = produtoTemPrecoLivre(produto);
    const quantidade = quantidadeInformada ? normalizarQuantidadeProduto(produto, quantidadeDigitada, quantidadeTexto) : 1;

    const resolucaoInicio = resolverPrecoPdv(produto, quantidade);
    itemEmDigitacao = {
        etapa: solicitaQuantidade ? "quantidade" : (precoLivre ? "preco" : "finalizar"),
        produto,
        quantidade,
        precoUnitario: resolucaoInicio.preco,
        tabelaAplicadaId: resolucaoInicio.tabelaId,
        porQuantidade: resolucaoInicio.porQuantidade,
        precoOriginal: resolucaoInicio.precoOriginal
    };

    definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidade));
    definirValorCampoPdv("valorUnitario", formatarDecimalCampo(itemEmDigitacao.precoUnitario));

    if(solicitaQuantidade){
        prepararCampoQuantidade(produto);
        return;
    }

    if(precoLivre){
        prepararCampoPreco(produto);
        return;
    }

    finalizarLancamentoProduto();
}

// Recebe a quantidade digitada durante o lançamento do item.
function informarQuantidadeProduto(valor){
    const quantidadeDigitada = String(valor || "").trim() === "" ? 1 : numeroDigitado(valor);
    const quantidade = normalizarQuantidadeProduto(itemEmDigitacao.produto, quantidadeDigitada, valor);

    if(quantidade <= 0){
        alert("Informe uma quantidade maior que zero.");
        prepararCampoQuantidade(itemEmDigitacao.produto);
        return;
    }

    itemEmDigitacao.quantidade = quantidade;
    definirValorCampoPdv("quantidadeItens", formatarQuantidade(quantidade));

    if(produtoTemPrecoLivre(itemEmDigitacao.produto)){
        itemEmDigitacao.etapa = "preco";
        prepararCampoPreco(itemEmDigitacao.produto);
        return;
    }

    const resolucaoQtd = resolverPrecoPdv(itemEmDigitacao.produto, quantidade);
    itemEmDigitacao.precoUnitario = resolucaoQtd.preco;
    itemEmDigitacao.tabelaAplicadaId = resolucaoQtd.tabelaId;
    itemEmDigitacao.porQuantidade = resolucaoQtd.porQuantidade;
    itemEmDigitacao.precoOriginal = resolucaoQtd.precoOriginal;
    definirValorCampoPdv("valorUnitario", formatarDecimalCampo(resolucaoQtd.preco));

    finalizarLancamentoProduto();
}

// Recebe o preço digitado quando o produto permite preço livre.
function informarPrecoProduto(valor){
    const preco = String(valor || "").trim() === "" ? itemEmDigitacao.precoUnitario : numeroDigitado(valor);

    if(preco <= 0){
        alert("Informe um preço unitário maior que zero.");
        prepararCampoPreco(itemEmDigitacao.produto);
        return;
    }

    itemEmDigitacao.precoUnitario = preco;
    finalizarLancamentoProduto();
}

// Valida e conclui o lançamento do item, inserindo no carrinho.
function finalizarLancamentoProduto(){
    if(!itemEmDigitacao) return;

    if(vendedorObrigatorioPdv() && carrinhoVenda.length === 0 && !vendedorPdvAtual){
        abrirModalVendedorPdv(function(){
            finalizarLancamentoProduto();
        });
        return;
    }

    if(!adicionarProdutoAoCarrinho(itemEmDigitacao)){
        itemEmDigitacao = null;
        quantidadePendentePesquisa = 0;
        quantidadePendenteTexto = "";
        prepararCampoProduto();
        definirValorCampoPdv("pesquisaProduto", "");
        return;
    }

    itemEmDigitacao = null;
    quantidadePendentePesquisa = 0;
    quantidadePendenteTexto = "";
    atualizarTela();
    prepararCampoProduto();
    definirValorCampoPdv("pesquisaProduto", "");
}

// Valida a quantidade informada contra o texto original/estoque.
function normalizarQuantidadeProduto(produto, quantidade, textoOriginal){
    const fracionado = produto?.vendaFracionada === true;
    const unidade = normalizar(produto?.unidade || "");
    const texto = String(textoOriginal || "").trim();
    const digitouDecimal = texto.includes(",") || texto.includes(".");

    if(!fracionado){
        return quantidade;
    }

    if(unidade === "kg" && !digitouDecimal && quantidade >= 10){
        return quantidade / 1000;
    }

    return quantidade;
}

// Remove um item do carrinho pela linha.
function removerItemCarrinho(linhaId){
    const tamanhoAntes = carrinhoVenda.length;
    carrinhoVenda = carrinhoVenda.filter(function(item) {
        return item.linhaId !== linhaId;
    });

    if(carrinhoVenda.length < tamanhoAntes){
        itensCanceladosVenda += 1;
    }

    if(carrinhoVenda.length === 0) resetarVendedorAposFim();

    atualizarTela();
    prepararCampoProduto();
}

// Cancela a digitação de item em andamento.
function cancelarDigitacaoProduto(){
    itemEmDigitacao = null;
    atualizarResumoVenda();
    prepararCampoProduto();
}

// Renderiza o carrinho e atualiza o resumo da venda.
function atualizarTela(){
    if (window.ControleSaida) {
        if (carrinhoVenda.length > 0) {
            ControleSaida.salvarVendaEmAndamento({ itens: carrinhoVenda, cliente: clienteVenda });
        } else {
            ControleSaida.limparVendaEmAndamento();
        }
    }

    const corpoCarrinho = document.getElementById("carrinho");

    if(!corpoCarrinho) return;

    if(carrinhoVenda.length === 0){
        mostrarLogoCarrinho();
        atualizarResumoVenda();
        return;
    }

    corpoCarrinho.innerHTML = carrinhoVenda.map(function(item) {
        const total = item.qtd * item.precoUnitario;

        return `
            <tr>
                <td><button type="button" class="btn-remover-item" onclick="removerItemCarrinho('${item.linhaId}')" aria-label="Remover ${escapar(item.descricao)}">×</button></td>
                <td>${escapar(item.codigo)}</td>
                <td>${escapar(item.descricao)}${item.tabelaAplicadaId && !item.tabelaDesativadaManualmente ? `<br><small class="tabela-item-cart">Tabela: ${escapar(obterNomeTabela(item.tabelaAplicadaId))} (Ativa)</small>` : ""}</td>
                <td>${formatarQuantidadeItem(item)}</td>
                <td>${formatarMoedaRS(item.precoUnitario)}</td>
                <td>${item.promocao ? "Sim" : "-"}</td>
                <td>${formatarMoedaRS(total)}</td>
            </tr>
        `;
    }).join("");

    atualizarResumoVenda();
    rolarCarrinhoParaUltimoItem();
}

// Rola a tabela do carrinho até o último item.
function rolarCarrinhoParaUltimoItem(){
    const corpoCarrinho = document.getElementById("carrinho");
    if(!corpoCarrinho || carrinhoVenda.length === 0) return;

    requestAnimationFrame(function(){
        corpoCarrinho.scrollTop = corpoCarrinho.scrollHeight;
    });
}

// Atualiza subtotal, desconto e total exibidos.
function atualizarResumoVenda(){
    const quantidade = carrinhoVenda.reduce(function(total, item) {
        return total + numero(item.qtd);
    }, 0);
    const total = calcularTotalVenda();

    definirTexto("produtosResumo", `Produtos: ${carrinhoVenda.length}`);
    definirTexto("itensResumo", `Total de itens: ${formatarQuantidade(quantidade)}`);
    definirTexto("canceladosResumo", `Itens cancelados: ${itensCanceladosVenda}`);
    definirTexto("descontoResumo", clienteVenda ? `Cliente: ${clienteVenda.nome}` : "Cliente: Consumidor");

    const totalElement = document.querySelector(".valor-total");
    if(totalElement){
        totalElement.textContent = formatarMoedaRS(total);
    }
}

// Cancela a venda em andamento e limpa o carrinho.
function cancelarVenda(){
    if(carrinhoVenda.length > 0 && !usuarioTemPermissaoSistema("pdvCancelarVendaAtual")){
        solicitarOuBloquear("pdvCancelarVendaAtual", "Cancelar venda em andamento", totalCarrinhoPdvAtual(), "Seu usuário não possui permissão para cancelar venda em andamento.");
        return;
    }

    itemEmDigitacao = null;
    quantidadePendentePesquisa = 0;
    quantidadePendenteTexto = "";
    carrinhoVenda = [];
    pedidoImportadoAtual = null;
    clienteVenda = null;
    itensCanceladosVenda = 0;
    resetarVendedorAposFim();
    fecharModaisPdv();
    atualizarTela();
    prepararCampoProduto();
}

// Retorna o total atual do carrinho.
function totalCarrinhoPdvAtual(){
    return carrinhoVenda.reduce(function(soma, item){ return soma + numero(item.qtd) * numero(item.precoUnitario); }, 0);
}

// Guarda a venda em andamento sem finalizar.
function guardarVenda(){
    if(!recursoGuardarVendasAtivo()){
        alert("Guardar vendas está desativado.");
        return;
    }
    if(!usuarioTemPermissaoSistema("pdvGuardarVendas")){
        solicitarOuBloquear("pdvGuardarVendas", "Guardar venda em andamento", totalCarrinhoPdvAtual(), "Seu usuário não possui permissão para guardar vendas.");
        return;
    }

    if(carrinhoVenda.length === 0){
        alert("Nenhum item para guardar.");
        return;
    }

    localStorage.setItem("vendaGuardada", JSON.stringify({
        cliente: clienteVenda,
        itens: carrinhoVenda,
        data: new Date().toISOString()
    }));
    registrarEventoCaixaPdv("Venda guardada", `Itens: ${carrinhoVenda.length} | Total: ${formatarMoedaRS(calcularTotalVenda())}`, {
        cliente: clienteVenda?.nome || "Consumidor",
        total: calcularTotalVenda(),
        produtos: carrinhoVenda
    });
    notificar("Venda guardada.", "sucesso");
    carrinhoVenda = [];
    pedidoImportadoAtual = null;
    clienteVenda = null;
    itensCanceladosVenda = 0;
    fecharModaisPdv();
    atualizarTela();
    prepararCampoProduto();
}

// Importa para o carrinho uma venda guardada anteriormente.
function importarVendaGuardada(){
    const vendaGuardada = lerJson("vendaGuardada", null);

    if(!vendaGuardada || !Array.isArray(vendaGuardada.itens) || vendaGuardada.itens.length === 0){
        notificar("Nenhuma venda guardada encontrada.", "sucesso");
        return;
    }

    if(carrinhoVenda.length > 0 && !confirm("Substituir os itens atuais pela venda guardada?")){
        return;
    }

    carrinhoVenda = vendaGuardada.itens.map(function(item) {
        return {
            ...item,
            qtd: numero(item.qtd),
            precoUnitario: numero(item.precoUnitario)
        };
    });
    clienteVenda = vendaGuardada.cliente || null;
    itemEmDigitacao = null;
    localStorage.removeItem("vendaGuardada");
    registrarEventoCaixaPdv("Venda guardada importada", `Itens: ${carrinhoVenda.length}`, {
        cliente: clienteVenda?.nome || "Consumidor",
        total: calcularTotalVenda(),
        produtos: carrinhoVenda
    });
    fecharModaisPdv();
    atualizarTela();
    prepararCampoProduto();
    notificar("Venda guardada importada para o caixa.", "sucesso");
}

// Recalcula o total da venda a partir do carrinho.
function calcularTotalVenda(){
    return carrinhoVenda.reduce(function(total, item) {
        return total + (numero(item.qtd) * numero(item.precoUnitario));
    }, 0);
}

// Retorna o tipo de desconto padrão (valor ou percentual).
function obterTipoDescontoPadraoPdv(){
    const priorizado = obterConfiguracoesSistema().pdvPriorizarDesconto;
    return priorizado === "percentual" || priorizado === "acrescimo" ? "percentual" : "valor";
}

// Aplica o tipo de desconto padrão no campo de desconto.
function aplicarTipoDescontoPadraoPdv(){
    const campo = document.getElementById("tipoDescontoVenda");
    if(campo) campo.value = obterTipoDescontoPadraoPdv();
    aplicarPlaceholderDescontoPdv();
}

// Ajusta o placeholder do campo de desconto.
function aplicarPlaceholderDescontoPdv(){
    const tipo = document.getElementById("tipoDescontoVenda")?.value || obterTipoDescontoPadraoPdv();
    const campo = document.getElementById("valorDescontoVenda");
    if(campo) campo.placeholder = tipo === "percentual" ? "0,00 %" : "0,00";
}

// Corrige o campo de desconto quando o limite é excedido.
function ajustarCampoDescontoLimitadoPdv(valor, mensagem){
    const campo = document.getElementById("valorDescontoVenda");
    if(campo) campo.value = formatarDecimalCampo(valor);
    if(typeof mostrarAvisoSistema === "function") mostrarAvisoSistema(mensagem, "aviso");
}

// Exibe a logo no carrinho quando não há itens.
function mostrarLogoCarrinho(){
    const carrinho = document.getElementById("carrinho");

    if(!carrinho) return;

    carrinho.innerHTML = `
        <tr class="empty-row" id="linhaLogo">
            <td colspan="7">
                <div class="empty-state">
                    <img
                        src="shared/img/logo.png"
                        class="logo-carrinho"
                        alt="Coneccta">
                </div>
            </td>
        </tr>
    `;
}

// Insere um item (já validado) no carrinho da venda.
function adicionarProdutoAoCarrinho(lancamento){
    const produto = lancamento.produto;
    const configuracoes = obterConfiguracoesSistema();
    const fiscal = window.RegrasFiscaisSistema?.fiscalDoItem?.(produto, { modelo: "nfce", consumidorFinal: true }) || {};
    const validacaoFiscal = validarProdutoPermitidoNfce({
        descricao: produto.descricao,
        csosn: fiscal.csosn || produto.csosn || "",
        cst: fiscal.cst || produto.cst || ""
    });

    if(!validacaoFiscal.ok){
        alert(validacaoFiscal.mensagem);
        return false;
    }

    const quantidadeNoCarrinho = carrinhoVenda.reduce(function(total, item) {
        return item.id === produto.id ? total + numero(item.qtd) : total;
    }, 0);
    const quantidadeFinal = quantidadeNoCarrinho + numero(lancamento.quantidade);
    const estoqueDisponivel = numero(produto.estoque);
    const estoqueMinimo = numero(produto.estoqueMinimo);
    const valorMaximoItem = numero(configuracoes.pdvValorMaximoItem);
    const quantidadeMaximaVenda = numero(configuracoes.pdvQtdMaximaVenda);
    const precoUnitario = numero(lancamento.precoUnitario);

    if(valorMaximoItem > 0 && precoUnitario > valorMaximoItem){
        alert(`Valor do item acima do limite configurado no Caixa PDV. Limite: ${formatarMoedaRS(valorMaximoItem)}.`);
        return false;
    }

    if(quantidadeMaximaVenda > 0 && quantidadeFinal > quantidadeMaximaVenda){
        alert(`Quantidade acima do limite configurado no Caixa PDV. Limite: ${formatarQuantidade(quantidadeMaximaVenda)}.`);
        return false;
    }

    if(configuracoes.controleEstoque !== false && !configuracoes.bloquearVendaSemEstoque && quantidadeFinal > estoqueDisponivel){
        alert(`Estoque insuficiente para ${produto.descricao}. Disponível: ${formatarQuantidade(estoqueDisponivel)}.`);
    }else if(configuracoes.controleEstoque !== false && configuracoes.alertaEstoqueMinimo !== false && estoqueMinimo > 0 && (estoqueDisponivel - quantidadeFinal) <= estoqueMinimo){
        alert(`Atenção: ${produto.descricao} ficará com estoque baixo. Saldo previsto: ${formatarQuantidade(estoqueDisponivel - quantidadeFinal)}. Mínimo: ${formatarQuantidade(estoqueMinimo)}.`);
    }

    if(configuracoes.controleEstoque !== false && configuracoes.bloquearVendaSemEstoque && quantidadeFinal > numero(produto.estoque)){
        alert(`Estoque insuficiente para ${produto.descricao}. Disponível: ${formatarQuantidade(produto.estoque)}.`);
        return false;
    }

    // Itens de balança nunca fundem: cada pesagem é uma linha separada
    const naoJuntarItens = configuracoes.pdvNaoJuntarItens === true || (lancamento.fromBalanca && configuracoes.pdvNaoJuntarItensBalanca === true);
    const itemExistente = (lancamento.fromBalanca || naoJuntarItens) ? null : carrinhoVenda.find(function(item) {
        return item.id === produto.id && item.precoUnitario === lancamento.precoUnitario;
    });

    if(itemExistente){
        itemExistente.qtd += lancamento.quantidade;
        if (!itemExistente.tabelaDesativadaManualmente) {
            var resolucaoExist = resolverPrecoPdv(produto, itemExistente.qtd);
            if (resolucaoExist.preco > 0 && resolucaoExist.preco !== itemExistente.precoUnitario) {
                itemExistente.precoUnitario = resolucaoExist.preco;
                itemExistente.tabelaAplicadaId = resolucaoExist.tabelaId;
                itemExistente.porQuantidade = resolucaoExist.porQuantidade;
                itemExistente.precoOriginal = resolucaoExist.precoOriginal;
                if(typeof notificar === "function") notificar("Preço de tabela aplicado: " + produto.descricao, "sucesso");
            }
        }
        return true;
    }

    carrinhoVenda.push({
        linhaId: gerarId("lin"),
        id: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        unidade: lancamento.fromBalanca ? (produto.unidade || "KG") : (produto.unidade || "UN"),
        vendaFracionada: lancamento.fromBalanca ? true : produto.vendaFracionada === true,
        qtd: lancamento.quantidade,
        precoUnitario: lancamento.precoUnitario,
        tabelaAplicadaId: lancamento.tabelaAplicadaId || null,
        porQuantidade: lancamento.porQuantidade === true,
        precoOriginal: lancamento.precoOriginal || lancamento.precoUnitario,
        tabelaDesativadaManualmente: false,
        fiscal,
        ncm: fiscal.ncm || produto.ncm || "",
        cest: fiscal.cest || produto.cest || "",
        cfop: fiscal.cfop || produto.cfop || "5102",
        cst: fiscal.cst || produto.cst || "",
        csosn: fiscal.csosn || produto.csosn || "",
        cstPis: fiscal.cstPis || produto.cstPis || "",
        cstCofins: fiscal.cstCofins || produto.cstCofins || "",
        origem: fiscal.origem || produto.origemMercadoria || "0",
        promocao: numero(produto.precoPromocional) > 0
    });

    return true;
}

