let clienteRecebimentoAtual = null;

document.addEventListener("DOMContentLoaded", function() {
    sincronizarContasCreditoLoja();
    atualizarResumoFinanceiro();
    renderizarClientesRecebimento();

    document.getElementById("buscaClienteRecebimento")?.addEventListener("input", renderizarClientesRecebimento);
    document.getElementById("btnDarBaixaRecebimento")?.addEventListener("click", darBaixaPendenciasSelecionadas);
    document.getElementById("btnImprimirPendencias")?.addEventListener("click", imprimirPendenciasCliente);

    const seletorModulos = document.querySelector(".financeiro-movimento") ? ".modulo-financeiro" : ".modulo";

    document.querySelectorAll(seletorModulos).forEach(function(modulo) {
        modulo.addEventListener("click", function() {
            if(modulo.getAttribute("href")) return;
            const titulo = modulo.querySelector("h2")?.textContent || "";

            if(normalizar(titulo).includes("receber")){
                document.getElementById("recebimentos")?.scrollIntoView({ behavior: "smooth" });
                return;
            }

            alert("Módulo financeiro: " + titulo);
        });
    });
});

function sincronizarContasCreditoLoja(){
    const base = obterBase();
    const contas = base.contasReceber;

    base.vendas.forEach(function(venda) {
        const pagamento = normalizar(venda.pagamento || "");
        const clienteId = venda.cliente?.id;

        if(!(pagamento.includes("loja") && pagamento.includes("cr")) || !clienteId) return;

        const jaExiste = contas.some(function(conta) {
            return conta.vendaId === venda.id;
        });

        if(jaExiste) return;

        contas.push({
            id: gerarId("rec"),
            vendaId: venda.id,
            clienteId,
            clienteNome: venda.cliente?.nome || "Cliente",
            documento: venda.documento || "Pedido",
            data: venda.data || new Date().toISOString(),
            vencimento: calcularVencimento(venda.data),
            valor: numero(venda.total),
            saldo: numero(venda.total),
            status: "pendente",
            origem: "Crédito loja"
        });
    });

    salvarBase(base);
}

function atualizarResumoFinanceiro(){
    const base = obterBase();
    const receber = base.contasReceber
        .filter(function(conta) { return conta.status !== "baixada"; })
        .reduce(function(total, conta) { return total + numero(conta.saldo); }, 0);
    const custoEstoque = base.mercadorias.reduce(function(total, item) {
        return total + (numero(item.estoque) * numero(item.precoCusto));
    }, 0);
    const receita = somar(base.vendas, "total");
    const saldo = receita - custoEstoque;
    const seletorCards = document.querySelector(".financeiro-movimento") ? ".financeiro-card h3" : ".card h3";
    const valores = document.querySelectorAll(seletorCards);

    if(valores.length >= 4){
        valores[0].textContent = formatarMoeda(receber);
        valores[1].textContent = formatarMoeda(custoEstoque);
        valores[2].textContent = formatarMoeda(saldo);
        valores[3].textContent = formatarMoeda(Math.max(0, saldo));
    }

    definirTexto("contadorPendencias", `${contasPendentes(base).length} pendência(s)`);
}

function renderizarClientesRecebimento(){
    const destino = document.getElementById("listaClientesRecebimento");

    if(!destino) return;

    const base = obterBase();
    const termo = normalizar(document.getElementById("buscaClienteRecebimento")?.value || "");
    const clientes = agruparPendenciasPorCliente(base)
        .filter(function(cliente) {
            const texto = [cliente.nome, cliente.cpf, cliente.cartao].join(" ");
            return normalizar(texto).includes(termo);
        });

    if(clientes.length === 0){
        destino.innerHTML = `<div class="vazio">Nenhum cliente com pendência.</div>`;
        return;
    }

    destino.innerHTML = clientes.map(function(cliente) {
        return `
            <div class="cliente-recebimento">
                <div>
                    <strong>${escapar(cliente.nome)}</strong>
                    <small>${cliente.quantidade} pendência(s) | ${formatarMoeda(cliente.total)}</small>
                </div>
                <button type="button" class="btn secundario" onclick="abrirClienteRecebimento('${cliente.id}')">Abrir</button>
            </div>
        `;
    }).join("");
}

function abrirClienteRecebimento(clienteId){
    clienteRecebimentoAtual = clienteId;
    renderizarPendenciasCliente();
}

function renderizarPendenciasCliente(){
    const destino = document.getElementById("listaPendenciasCliente");
    const base = obterBase();
    const cliente = base.clientes.find(function(item) {
        return item.id === clienteRecebimentoAtual;
    });
    const pendencias = contasPendentes(base).filter(function(conta) {
        return conta.clienteId === clienteRecebimentoAtual;
    });

    definirTexto("clienteRecebimentoNome", cliente?.nome || pendencias[0]?.clienteNome || "Cliente");
    definirTexto("totalSelecionadoRecebimento", "Selecionado: R$ 0,00");

    if(!destino) return;

    if(pendencias.length === 0){
        destino.innerHTML = `<div class="vazio">Este cliente não possui pendências em aberto.</div>`;
        return;
    }

    destino.innerHTML = pendencias.map(function(conta) {
        return `
            <label class="pendencia-item">
                <div>
                    <strong>${escapar(conta.documento)} ${escapar(conta.vendaId)}</strong>
                    <small>Emissão: ${formatarData(conta.data)} | Vencimento: ${formatarData(conta.vencimento)} | ${formatarMoeda(conta.saldo)}</small>
                </div>
                <input type="checkbox" class="pendencia-check" value="${escapar(conta.id)}" onchange="atualizarTotalSelecionadoRecebimento()">
            </label>
        `;
    }).join("");
}

function atualizarTotalSelecionadoRecebimento(){
    const base = obterBase();
    const ids = idsPendenciasSelecionadas();
    const total = base.contasReceber
        .filter(function(conta) { return ids.includes(conta.id); })
        .reduce(function(soma, conta) { return soma + numero(conta.saldo); }, 0);

    definirTexto("totalSelecionadoRecebimento", `Selecionado: ${formatarMoeda(total)}`);
}

function darBaixaPendenciasSelecionadas(){
    const ids = idsPendenciasSelecionadas();

    if(ids.length === 0){
        alert("Selecione ao menos uma pendência.");
        return;
    }

    if(!confirm(`Dar baixa em ${ids.length} pendência(s) selecionada(s)?`)){
        return;
    }

    const base = obterBase();
    const agora = new Date().toISOString();

    base.contasReceber.forEach(function(conta) {
        if(!ids.includes(conta.id)) return;

        conta.status = "baixada";
        conta.baixadaEm = agora;
        conta.valorBaixado = numero(conta.saldo);
        conta.saldo = 0;
    });

    atualizarCreditoClientes(base);
    salvarBase(base);
    atualizarResumoFinanceiro();
    renderizarClientesRecebimento();
    renderizarPendenciasCliente();
    notificar("Baixa realizada com sucesso.", "sucesso");
}

function imprimirPendenciasCliente(){
    if(!clienteRecebimentoAtual){
        alert("Abra um cliente antes de imprimir.");
        return;
    }

    const base = obterBase();
    const cliente = base.clientes.find(function(item) {
        return item.id === clienteRecebimentoAtual;
    });
    const pendencias = contasPendentes(base).filter(function(conta) {
        return conta.clienteId === clienteRecebimentoAtual;
    });

    if(pendencias.length === 0){
        alert("Este cliente não possui pendências para imprimir.");
        return;
    }

    const total = pendencias.reduce(function(soma, conta) {
        return soma + numero(conta.saldo);
    }, 0);
    const janela = window.open("", "_blank", "width=820,height=720");

    if(!janela){
        alert("Permita pop-ups para imprimir a lista de pendências.");
        return;
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Pendências ${escapar(cliente?.nome || pendencias[0].clienteNome)}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
                h1 { margin: 0; font-size: 22px; }
                p { color: #4b5563; }
                table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; }
                th { background: #f3f4f6; }
                .total { margin-top: 18px; text-align: right; font-size: 18px; font-weight: 800; }
            </style>
        </head>
        <body>
            <h1>Lista de pendências - Crédito Loja</h1>
            <p>Cliente: ${escapar(cliente?.nome || pendencias[0].clienteNome)}</p>
            <table>
                <thead>
                    <tr>
                        <th>Venda</th>
                        <th>Documento</th>
                        <th>Emissão</th>
                        <th>Vencimento</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendencias.map(function(conta) {
                        return `
                            <tr>
                                <td>${escapar(conta.vendaId)}</td>
                                <td>${escapar(conta.documento)}</td>
                                <td>${formatarData(conta.data)}</td>
                                <td>${formatarData(conta.vencimento)}</td>
                                <td>${formatarMoeda(conta.saldo)}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
            <div class="total">Total pendente: ${formatarMoeda(total)}</div>
            <script>window.onload = function(){ window.print(); }<\/script>
        </body>
        </html>
    `);
    janela.document.close();
}

function idsPendenciasSelecionadas(){
    return [...document.querySelectorAll(".pendencia-check:checked")].map(function(campo) {
        return campo.value;
    });
}

function contasPendentes(base){
    return base.contasReceber.filter(function(conta) {
        return conta.status !== "baixada" && numero(conta.saldo) > 0;
    });
}

function agruparPendenciasPorCliente(base){
    const mapa = new Map();

    contasPendentes(base).forEach(function(conta) {
        const cliente = base.clientes.find(function(item) {
            return item.id === conta.clienteId;
        });
        const atual = mapa.get(conta.clienteId) || {
            id: conta.clienteId,
            nome: cliente?.nome || conta.clienteNome || "Cliente",
            cpf: cliente?.cpf || "",
            cartao: cliente?.cartao || "",
            quantidade: 0,
            total: 0
        };

        atual.quantidade += 1;
        atual.total += numero(conta.saldo);
        mapa.set(conta.clienteId, atual);
    });

    return [...mapa.values()].sort(function(a, b) {
        return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function atualizarCreditoClientes(base){
    base.clientes.forEach(function(cliente) {
        const pendente = contasPendentes(base)
            .filter(function(conta) { return conta.clienteId === cliente.id; })
            .reduce(function(total, conta) { return total + numero(conta.saldo); }, 0);

        cliente.utilizado = pendente;
        cliente.disponivel = Math.max(0, numero(cliente.limite) - pendente);
    });
}function calcularVencimento(dataVenda){
    const data = dataVenda ? new Date(dataVenda) : new Date();

    if(Number.isNaN(data.getTime())){
        data.setTime(Date.now());
    }

    data.setDate(data.getDate() + 30);
    return data.toISOString();
}
