// cliente-service.js
// Acesso a dados de cliente: crédito loja, contas a receber e geração de identificador de cartão.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Grava as parcelas de crédito loja como contas a receber.
function registrarContaReceberCreditoLoja(base, venda, parcelamento){
    const cliente = base.clientes.find(function(item) {
        return item.id === venda.cliente?.id;
    });

    if(!cliente) return;

    const jaExiste = base.contasReceber.some(function(conta) {
        return conta.vendaId === venda.id;
    });

    if(!jaExiste){
        const parcelas = parcelamento?.parcelas;
        if(Array.isArray(parcelas) && parcelas.length > 1){
            parcelas.forEach(function(p, i){
                base.contasReceber.push({
                    id: gerarId("rec"),
                    vendaId: venda.id,
                    clienteId: cliente.id,
                    clienteNome: cliente.nome,
                    documento: venda.documento || "Pedido",
                    descricao: "Parcela " + (i + 1) + "/" + parcelas.length,
                    data: venda.data,
                    vencimento: p.vencimento,
                    valor: numero(p.valor),
                    saldo: numero(p.valor),
                    status: "pendente",
                    origem: "Crédito loja"
                });
            });
        } else {
            const vencimento = (Array.isArray(parcelas) && parcelas[0]?.vencimento)
                || calcularVencimentoRecebimento(venda.data);
            base.contasReceber.push({
                id: gerarId("rec"),
                vendaId: venda.id,
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                documento: venda.documento || "Pedido",
                data: venda.data,
                vencimento: vencimento,
                valor: numero(venda.valorCreditoLoja || venda.total),
                saldo: numero(venda.valorCreditoLoja || venda.total),
                status: "pendente",
                origem: "Crédito loja"
            });
        }
    }

    atualizarCreditoCliente(base, cliente.id);
    venda.cliente = {
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf || "",
        cartao: cliente.cartao || ""
    };
}

// Calcula o crédito loja já utilizado por um cliente.
function calcularCreditoUtilizadoCliente(base, clienteId){
    return base.contasReceber
        .filter(function(conta) {
            return conta.clienteId === clienteId && conta.status !== "baixada" && conta.status !== "cancelada";
        })
        .reduce(function(total, conta) {
            return total + numero(conta.saldo);
        }, 0);
}

// Recalcula e grava o crédito disponível de um cliente.
function atualizarCreditoCliente(base, clienteId){
    const cliente = base.clientes.find(function(item) {
        return item.id === clienteId;
    });

    if(!cliente) return;

    const utilizado = calcularCreditoUtilizadoCliente(base, clienteId);
    cliente.utilizado = utilizado;
    cliente.disponivel = Math.max(0, numero(cliente.limite) - utilizado);
}

// Sincroniza as contas de crédito loja com a base.
function sincronizarContasCreditoLojaPdv(){
    const base = obterBase();

    base.vendas.forEach(function(venda) {
        const pagamento = normalizar(venda.pagamento || "");
        const clienteId = venda.cliente?.id;

        if(!(pagamento.includes("loja") && pagamento.includes("cr")) || !clienteId) return;

        const jaExiste = base.contasReceber.some(function(conta) {
            return conta.vendaId === venda.id;
        });

        if(jaExiste) return;

        base.contasReceber.push({
            id: gerarId("rec"),
            vendaId: venda.id,
            clienteId,
            clienteNome: venda.cliente?.nome || "Cliente",
            documento: venda.documento || "Pedido",
            data: venda.data || new Date().toISOString(),
            vencimento: calcularVencimentoRecebimento(venda.data),
            valor: numero(venda.total),
            saldo: numero(venda.total),
            status: "pendente",
            origem: "Crédito loja"
        });
    });

    salvarBase(base);
}

// Gera um número de cartão de crédito loja único.
function gerarNumeroCartaoPdv(){
    return String(Math.floor(1000000000000 + Math.random() * 9000000000000));
}

// Atualiza o crédito disponível de todos os clientes.
function atualizarCreditoClientesPdv(base){
    base.clientes.forEach(function(cliente) {
        const pendente = contasRecebimentoPendentes(base)
            .filter(function(conta) { return conta.clienteId === cliente.id; })
            .reduce(function(total, conta) { return total + numero(conta.saldo); }, 0);

        cliente.utilizado = pendente;
        cliente.disponivel = Math.max(0, numero(cliente.limite) - pendente);
    });
}

// Cancela a conta a receber vinculada a uma venda cancelada.
function cancelarContaReceberDaVenda(base, vendaId){
    const contas = base.contasReceber.filter(function(conta) {
        return conta.vendaId === vendaId && conta.status !== "baixada";
    });

    contas.forEach(function(conta) {
        conta.status = "cancelada";
        conta.canceladaEm = new Date().toISOString();
        conta.saldo = 0;
        atualizarCreditoCliente(base, conta.clienteId);
    });
}

// Fachada para uso futuro (mesmas funções acima, sem alterar nenhum call-site existente).
window.ClienteService = {
    registrarContaReceberCreditoLoja,
    calcularCreditoUtilizadoCliente,
    atualizarCreditoCliente,
    sincronizarContasCreditoLojaPdv,
    gerarNumeroCartaoPdv,
    atualizarCreditoClientesPdv,
    cancelarContaReceberDaVenda
};
