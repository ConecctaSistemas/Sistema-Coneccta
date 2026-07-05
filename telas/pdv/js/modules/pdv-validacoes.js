// pdv-validacoes.js
// Validações de estoque, crédito loja, limites de cliente, produtos permitidos em NFC-e, desconto e documentos.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Valida se o cliente tem limite de crédito loja disponível.
function validarCreditoLoja(base, valorVenda){
    if(!clienteVenda?.id){
        return {
            ok: false,
            mensagem: "Selecione um cliente para usar Crédito loja."
        };
    }

    const cliente = base.clientes.find(function(item) {
        return item.id === clienteVenda.id;
    });

    if(!cliente){
        return {
            ok: false,
            mensagem: "Cliente não encontrado. Atualize o cadastro ou selecione outra forma de pagamento."
        };
    }

    if(cliente.ativo === false){
        return {
            ok: false,
            mensagem: "Cliente inativo. Atualize o cadastro ou selecione outra forma de pagamento."
        };
    }

    const usado = calcularCreditoUtilizadoCliente(base, cliente.id);
    const limite = numero(cliente.limite);
    const disponivel = Math.max(0, limite - usado);

    if(numero(valorVenda) > disponivel){
        return {
            ok: false,
            mensagem: `Cliente sem crédito disponível. Disponível: ${formatarMoedaRS(disponivel)}. Atualize o limite ou selecione outra forma de pagamento.`
        };
    }

    return { ok: true };
}

// Valida se há estoque disponível para os itens do carrinho.
function validarEstoqueCarrinho(base){
    const configuracoes = obterConfiguracoesSistema();

    if(configuracoes.controleEstoque === false || !configuracoes.bloquearVendaSemEstoque){
        return { ok: true };
    }

    const quantidades = new Map();
    carrinhoVenda.forEach(function(item) {
        quantidades.set(item.id, (quantidades.get(item.id) || 0) + numero(item.qtd));
    });

    for(const [id, quantidade] of quantidades.entries()){
        const produto = base.mercadorias.find(function(item) {
            return item.id === id;
        });

        if(produto && quantidade > numero(produto.estoque)){
            return {
                ok: false,
                mensagem: `Estoque insuficiente para ${produto.descricao}. Disponível: ${formatarQuantidade(produto.estoque)}.`
            };
        }
    }

    return { ok: true };
}

// Valida se todos os itens do carrinho podem ir em NFC-e.
function validarProdutosPermitidosNfce(){
    const produtoBloqueado = carrinhoVenda
        .map(validarProdutoPermitidoNfce)
        .find(function(validacao) {
            return !validacao.ok;
        });

    if(!produtoBloqueado){
        return { ok: true };
    }

    return produtoBloqueado;
}

// Valida se um item específico pode ir em NFC-e.
function validarProdutoPermitidoNfce(item){
    const codigoFiscal = String(item?.csosn || item?.cst || "").trim();

    if(codigoFiscal !== "900"){
        return { ok: true };
    }

    return {
        ok: false,
        mensagem: `${item?.descricao || "Produto"}: Mercadoria com o CST:900, N\u00e3o \u00e9 permitida para Emiss\u00e3o do Cupom Fiscal, altere no cadastro do produto.`
    };
}

// Valida/normaliza um CPF ou CNPJ.
function normalizarDocumentoPdv(valor){
    return String(valor || "").replace(/\D/g, "");
}

// Verifica se o usuário tem permissão para aplicar desconto.
function descontoPermitido(){
    return obterConfiguracoesSistema().permitirDescontoPdv !== false && usuarioTemPermissaoSistema("descontos");
}

// Limita o desconto informado ao máximo configurado.
function limitarDescontoConfiguradoPdv(tipo, valor, subtotal){
    const cfg = obterConfiguracoesSistema();
    const maximoPercentual = Math.max(0, numero(cfg.pdvDescontoMaximo));
    let desconto = Math.max(0, valor);

    if(maximoPercentual <= 0 || subtotal <= 0) return desconto;

    if(tipo === "percentual"){
        if(desconto > maximoPercentual){
            desconto = maximoPercentual;
            ajustarCampoDescontoLimitadoPdv(desconto, "Desconto limitado ao maximo configurado no Caixa PDV.");
        }
        return desconto;
    }

    const maximoValor = subtotal * maximoPercentual / 100;
    if(desconto > maximoValor){
        desconto = maximoValor;
        ajustarCampoDescontoLimitadoPdv(desconto, "Desconto limitado ao maximo configurado no Caixa PDV.");
    }

    return desconto;
}

// Valida a venda contra os limites configurados para o cliente.
function validarLimitesClienteConfiguradosPdv(totalVenda, configuracoes){
    const total = numero(totalVenda);
    const limiteSemCpf = numero(configuracoes.pdvValorMaximoSemCpf);
    const limiteSemDestinatario = numero(configuracoes.pdvValorMaximoSemDest);
    const temCliente = Boolean(clienteVenda?.id || clienteVenda?.nome);
    const documentoCliente = somenteNumerosPdv(clienteVenda?.cpfCnpj || clienteVenda?.cpf_cnpj || clienteVenda?.cnpj || clienteVenda?.cpf || "");
    const temDocumento = documentoCliente.length === 11 || documentoCliente.length === 14;

    if(configuracoes.pdvNaoSolicitarCpf !== true && limiteSemCpf > 0 && total > limiteSemCpf && !temDocumento){
        alert(`Informe CPF/CNPJ do cliente para vendas acima de ${formatarMoedaRS(limiteSemCpf)}.`);
        return false;
    }

    if(limiteSemDestinatario > 0 && total > limiteSemDestinatario && !temCliente){
        alert(`Informe o cliente para vendas acima de ${formatarMoedaRS(limiteSemDestinatario)}.`);
        return false;
    }

    return true;
}

