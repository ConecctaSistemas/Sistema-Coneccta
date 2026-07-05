document.addEventListener("DOMContentLoaded", function() {
    prepararPeriodo();
    document.getElementById("btnAtualizarDre")?.addEventListener("click", renderizarDre);
    renderizarDre();
});

function prepararPeriodo(){
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    definirValor("dreDataInicial", inicio.toISOString().slice(0, 10));
    definirValor("dreDataFinal", hoje.toISOString().slice(0, 10));
}

function renderizarDre(){
    const base = obterBase();
    const inicio = valorCampo("dreDataInicial");
    const fim = valorCampo("dreDataFinal");
    const vendas = filtrarPorPeriodo(base.vendas, inicio, fim, "data");
    const vendasCanceladas = filtrarPorPeriodo(base.vendasCanceladas, inicio, fim, "canceladaEm");
    const movimentosCaixa = filtrarPorPeriodo(base.movimentosCaixa, inicio, fim, "data");
    const contasReceber = filtrarPorPeriodo(base.contasReceber, inicio, fim, "vencimento")
        .filter(function(conta) { return conta.status !== "baixada"; });

    const receitaBruta = somar(vendas, "total");
    const descontos = vendas.reduce(function(total, venda) {
        return total + numero(venda.desconto || venda.totalDesconto || venda.descontos);
    }, 0);
    const cancelamentos = somar(vendasCanceladas, "total");
    const receitaLiquida = Math.max(0, receitaBruta - descontos - cancelamentos);
    const cmv = calcularCmv(vendas, base.mercadorias);
    const lucroBruto = receitaLiquida - cmv;
    const sangrias = movimentosCaixa
        .filter(function(item) { return item.tipo === "sangria"; })
        .reduce(function(total, item) { return total + numero(item.valor); }, 0);
    const suprimentos = movimentosCaixa
        .filter(function(item) { return item.tipo === "suprimento"; })
        .reduce(function(total, item) { return total + numero(item.valor); }, 0);
    const resultadoLiquido = lucroBruto - sangrias + suprimentos;
    const contasReceberTotal = contasReceber.reduce(function(total, conta) {
        return total + numero(conta.saldo || conta.valor);
    }, 0);
    const valorEstoque = base.mercadorias.reduce(function(total, item) {
        return total + (numero(item.estoque) * numero(item.precoCusto));
    }, 0);
    const margemLiquida = receitaLiquida > 0 ? (resultadoLiquido / receitaLiquida) * 100 : 0;

    definirTexto("drePeriodoTexto", formatarPeriodo(inicio, fim));
    definirTexto("dreReceitaBruta", formatarMoedaRS(receitaBruta));
    definirTexto("dreDeducoes", formatarMoedaRS(descontos + cancelamentos));
    definirTexto("dreLucroBruto", formatarMoedaRS(lucroBruto));
    definirTexto("dreResultadoLiquido", formatarMoedaRS(resultadoLiquido));
    definirTexto("linhaReceitaBruta", formatarMoedaRS(receitaBruta));
    definirTexto("linhaDescontos", formatarMoedaRS(descontos));
    definirTexto("linhaCancelamentos", formatarMoedaRS(cancelamentos));
    definirTexto("linhaReceitaLiquida", formatarMoedaRS(receitaLiquida));
    definirTexto("linhaCmv", formatarMoedaRS(cmv));
    definirTexto("linhaLucroBruto", formatarMoedaRS(lucroBruto));
    definirTexto("linhaSangrias", formatarMoedaRS(sangrias));
    definirTexto("linhaSuprimentos", formatarMoedaRS(suprimentos));
    definirTexto("linhaResultadoLiquido", formatarMoedaRS(resultadoLiquido));
    definirTexto("dreQuantidadeVendas", vendas.length);
    definirTexto("dreTicketMedio", formatarMoedaRS(vendas.length ? receitaBruta / vendas.length : 0));
    definirTexto("dreContasReceber", formatarMoedaRS(contasReceberTotal));
    definirTexto("dreValorEstoque", formatarMoedaRS(valorEstoque));
    definirTexto("dreMargemLiquida", formatarPercentual(margemLiquida));

    renderizarMovimentos(vendas, vendasCanceladas, movimentosCaixa, contasReceber);
}

function calcularCmv(vendas, mercadorias){
    const mapaProdutos = new Map();

    mercadorias.forEach(function(item) {
        if(item.id) mapaProdutos.set(item.id, item);
        if(item.codigo) mapaProdutos.set(String(item.codigo), item);
        if(item.descricao) mapaProdutos.set(normalizar(item.descricao), item);
    });

    return vendas.reduce(function(totalVenda, venda) {
        return totalVenda + (venda.itens || []).reduce(function(totalItem, item) {
            const produto = mapaProdutos.get(item.produtoId) ||
                mapaProdutos.get(String(item.codigo || "")) ||
                mapaProdutos.get(normalizar(item.descricao));
            const custo = produto ? numero(produto.precoCusto) : numero(item.custo || item.precoCusto);
            const quantidade = numero(item.qtd || item.quantidade || 1);

            return totalItem + (custo * quantidade);
        }, 0);
    }, 0);
}

function renderizarMovimentos(vendas, vendasCanceladas, movimentosCaixa, contasReceber){
    const linhas = [
        ...vendas.map(function(venda) {
            return {
                data: venda.data,
                tipo: "Receita",
                origem: venda.origem || venda.documento || "Venda",
                descricao: venda.cliente?.nome || venda.produto || "Venda registrada",
                valor: numero(venda.total)
            };
        }),
        ...vendasCanceladas.map(function(venda) {
            return {
                data: venda.canceladaEm || venda.data,
                tipo: "Dedução",
                origem: "Venda cancelada",
                descricao: venda.cliente?.nome || "Cancelamento",
                valor: -numero(venda.total)
            };
        }),
        ...movimentosCaixa.map(function(item) {
            return {
                data: item.data,
                tipo: item.tipo === "sangria" ? "Despesa" : "Entrada",
                origem: item.tipo === "sangria" ? "Sangria" : "Suprimento",
                descricao: item.observacao || item.detalhe || "Movimento de caixa",
                valor: item.tipo === "sangria" ? -numero(item.valor) : numero(item.valor)
            };
        }),
        ...contasReceber.map(function(conta) {
            return {
                data: conta.vencimento || conta.data,
                tipo: "Recebível",
                origem: conta.origem || "Conta a receber",
                descricao: conta.clienteNome || conta.documento || "Título pendente",
                valor: numero(conta.saldo || conta.valor)
            };
        })
    ].sort(function(a, b) {
        return new Date(b.data || 0) - new Date(a.data || 0);
    });

    const destino = document.getElementById("tabelaMovimentosDre");
    definirTexto("dreTotalMovimentos", linhas.length + " movimento(s)");

    if(!destino) return;

    if(linhas.length === 0){
        destino.innerHTML = `<tr><td colspan="5" class="vazio">Nenhuma movimentação encontrada.</td></tr>`;
        return;
    }

    destino.innerHTML = linhas.map(function(item) {
        return `
            <tr>
                <td>${formatarData(item.data)}</td>
                <td><span class="tag ${item.valor < 0 ? "negativa" : "positiva"}">${escapar(item.tipo)}</span></td>
                <td>${escapar(item.origem)}</td>
                <td>${escapar(item.descricao)}</td>
                <td class="${item.valor < 0 ? "valor-negativo" : "valor-positivo"}">${formatarMoeda(item.valor)}</td>
            </tr>
        `;
    }).join("");
}
function filtrarPorPeriodo(lista, inicio, fim, campo){
    const dataInicio = inicio ? new Date(inicio + "T00:00:00") : null;
    const dataFim = fim ? new Date(fim + "T23:59:59") : null;

    return lista.filter(function(item) {
        const data = new Date(item[campo] || item.data || item.criadoEm || "");
        if(Number.isNaN(data.getTime())) return false;
        if(dataInicio && data < dataInicio) return false;
        if(dataFim && data > dataFim) return false;
        return true;
    });
}
function definirValor(id, valor){
    const elemento = document.getElementById(id);
    if(elemento) elemento.value = valor || "";
}
function formatarPercentual(valor){
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "%";
}

function formatarData(valor){
    if(!valor) return "-";
    const data = new Date(String(valor).slice(0, 10) + "T00:00:00");
    if(Number.isNaN(data.getTime())) return "-";
    return data.toLocaleDateString("pt-BR");
}

function formatarPeriodo(inicio, fim){
    return (inicio ? formatarData(inicio) : "Início") + " até " + (fim ? formatarData(fim) : "Hoje");
}
