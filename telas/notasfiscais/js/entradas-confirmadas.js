document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("buscaEntradaConfirmada")?.addEventListener("input", renderizarEntradasConfirmadas);
    document.getElementById("dataEntradaConfirmada")?.addEventListener("change", renderizarEntradasConfirmadas);
    renderizarEntradasConfirmadas();
});

function renderizarEntradasConfirmadas(){
    const destino = document.getElementById("listaEntradasConfirmadas");
    const entradas = filtrarEntradasConfirmadas(obterEntradasConfirmadas());

    if(!destino) return;

    atualizarResumoConfirmadas(entradas);

    if(entradas.length === 0){
        destino.innerHTML = `<tr><td colspan="10" class="vazio">Nenhuma entrada confirmada.</td></tr>`;
        return;
    }

    destino.innerHTML = entradas.map(function(registro) {
        const nota = registro.nota || {};
        const parcelas = Array.isArray(registro.parcelas) ? registro.parcelas : [];
        const produtos = Array.isArray(nota.produtos) ? nota.produtos.filter(function(item) {
            return item.status !== "ignorado";
        }) : [];

        return `
            <tr>
                <td><strong>${escapar(nota.numero || "-")}</strong></td>
                <td>${escapar(nota.serie || "-")}</td>
                <td>${escapar(nota.fornecedor?.razao || "-")}</td>
                <td>${escapar(nota.fornecedor?.cnpj || "-")}</td>
                <td>${formatarData(nota.emissao)}</td>
                <td>${formatarDataHora(nota.finalizadaEm || registro.criadoEm)}</td>
                <td>${produtos.length}</td>
                <td><strong>${formatarMoeda(calcularTotalNotaConfirmada(nota))}</strong></td>
                <td>${parcelas.length} parcela(s)</td>
                <td><span class="status">Confirmada</span></td>
            </tr>
        `;
    }).join("");
}

function obterEntradasConfirmadas(){
    const base = lerJson(BASE_KEY, {});
    const confirmadas = Array.isArray(base.entradasNotasConfirmadas) ? base.entradasNotasConfirmadas : [];
    const antigas = Array.isArray(base.entradasNotas)
        ? base.entradasNotas.filter(function(item) {
            return item.status === "confirmada" || item.nota?.finalizada === true;
        })
        : [];
    const mapa = new Map();

    [...confirmadas, ...antigas].forEach(function(item) {
        if(item?.id) mapa.set(item.id, item);
    });

    return [...mapa.values()].sort(function(a, b) {
        return new Date(b.nota?.finalizadaEm || b.criadoEm || 0) - new Date(a.nota?.finalizadaEm || a.criadoEm || 0);
    });
}

function filtrarEntradasConfirmadas(entradas){
    const termo = normalizar(document.getElementById("buscaEntradaConfirmada")?.value || "");
    const data = document.getElementById("dataEntradaConfirmada")?.value || "";

    return entradas.filter(function(registro) {
        const nota = registro.nota || {};
        const texto = normalizar([
            nota.numero,
            nota.serie,
            nota.chave,
            nota.fornecedor?.razao,
            nota.fornecedor?.cnpj
        ].join(" "));
        const dataRegistro = String(nota.finalizadaEm || registro.criadoEm || "").slice(0, 10);

        return (!termo || texto.includes(termo)) && (!data || dataRegistro === data);
    });
}

function atualizarResumoConfirmadas(entradas){
    const total = entradas.reduce(function(soma, registro) {
        return soma + calcularTotalNotaConfirmada(registro.nota || {});
    }, 0);
    const produtos = entradas.reduce(function(soma, registro) {
        return soma + ((registro.nota?.produtos || []).filter(function(item) {
            return item.status !== "ignorado";
        }).length);
    }, 0);
    const contas = entradas.reduce(function(soma, registro) {
        return soma + (Array.isArray(registro.parcelas) ? registro.parcelas.length : 0);
    }, 0);

    definirTexto("resumoNotasConfirmadas", entradas.length);
    definirTexto("resumoValorConfirmado", formatarMoedaRS(total));
    definirTexto("resumoProdutosConfirmados", produtos);
    definirTexto("resumoContasConfirmadas", contas);
}

function calcularTotalNotaConfirmada(nota){
    if(nota.totalNotaXml) return numero(nota.totalNotaXml);
    const produtos = Array.isArray(nota.produtos) ? nota.produtos : [];
    const totalProdutos = produtos.reduce(function(total, item) {
        return item.status === "ignorado" ? total : total + numero(item.custoUnitario) * numero(item.quantidade);
    }, 0);
    return totalProdutos + numero(nota.frete) + numero(nota.outras) - numero(nota.desconto);
}function numero(valor){
    return Number.parseFloat(String(valor || "0").replace(/\./g, "").replace(",", ".")) || 0;
}function formatarMoeda(valor){
    return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data){
    if(!data) return "-";
    const partes = String(data).slice(0, 10).split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

function formatarDataHora(data){
    if(!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
}
