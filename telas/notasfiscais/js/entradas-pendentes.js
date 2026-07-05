document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("buscaEntradaPendente")?.addEventListener("input", renderizarEntradasPendentes);
    document.getElementById("dataEntradaPendente")?.addEventListener("change", renderizarEntradasPendentes);
    document.getElementById("listaEntradasPendentes")?.addEventListener("click", tratarCliqueEntradaPendente);
    renderizarEntradasPendentes();
});

function renderizarEntradasPendentes(){
    const destino = document.getElementById("listaEntradasPendentes");
    const entradas = filtrarEntradasPendentes(obterEntradasPendentes());

    if(!destino) return;

    atualizarResumoPendentes(entradas);

    if(entradas.length === 0){
        destino.innerHTML = `<tr><td colspan="10" class="vazio">Nenhuma entrada pendente.</td></tr>`;
        return;
    }

    destino.innerHTML = entradas.map(function(registro) {
        const nota = registro.nota || {};
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
                <td>${formatarDataHora(nota.salvaEm || registro.atualizadoEm || registro.criadoEm)}</td>
                <td>${produtos.length}</td>
                <td><strong>${formatarMoeda(calcularTotalNotaPendente(nota))}</strong></td>
                <td><span class="status">Pendente</span></td>
                <td>
                    <div class="acoes">
                        <button type="button" class="btn claro" data-continuar="${escaparAtributo(registro.id)}">
                            <i class="fa-solid fa-pen-to-square"></i> Continuar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function obterEntradasPendentes(){
    const base = lerJson(BASE_KEY, {});
    const entradas = Array.isArray(base.entradasNotas) ? base.entradasNotas : [];

    return entradas.filter(function(registro) {
        return registro?.nota && registro.status !== "confirmada" && registro.nota.finalizada !== true;
    }).sort(function(a, b) {
        return new Date(b.nota?.salvaEm || b.atualizadoEm || b.criadoEm || 0) - new Date(a.nota?.salvaEm || a.atualizadoEm || a.criadoEm || 0);
    });
}

function filtrarEntradasPendentes(entradas){
    const termo = normalizar(document.getElementById("buscaEntradaPendente")?.value || "");
    const data = document.getElementById("dataEntradaPendente")?.value || "";

    return entradas.filter(function(registro) {
        const nota = registro.nota || {};
        const texto = normalizar([
            nota.numero,
            nota.serie,
            nota.chave,
            nota.fornecedor?.razao,
            nota.fornecedor?.cnpj
        ].join(" "));
        const dataRegistro = String(nota.salvaEm || registro.atualizadoEm || registro.criadoEm || "").slice(0, 10);

        return (!termo || texto.includes(termo)) && (!data || dataRegistro === data);
    });
}

function atualizarResumoPendentes(entradas){
    const total = entradas.reduce(function(soma, registro) {
        return soma + calcularTotalNotaPendente(registro.nota || {});
    }, 0);
    const produtos = entradas.reduce(function(soma, registro) {
        return soma + ((registro.nota?.produtos || []).filter(function(item) {
            return item.status !== "ignorado";
        }).length);
    }, 0);
    const ultima = entradas[0]?.nota?.salvaEm || entradas[0]?.atualizadoEm || entradas[0]?.criadoEm || "";

    definirTexto("resumoPendentes", entradas.length);
    definirTexto("resumoValorPendente", formatarMoedaRS(total));
    definirTexto("resumoProdutosPendentes", produtos);
    definirTexto("resumoUltimaPendente", ultima ? formatarDataHora(ultima) : "-");
}

function tratarCliqueEntradaPendente(evento){
    const botao = evento.target.closest("[data-continuar]");

    if(botao){
        window.location.href = new URL(`telas/notasfiscais/entradas-notas.html?entrada=${encodeURIComponent(botao.dataset.continuar)}`, document.baseURI).href;
    }
}

function calcularTotalNotaPendente(nota){
    if(nota.totalNotaXml) return numero(nota.totalNotaXml);
    const produtos = Array.isArray(nota.produtos) ? nota.produtos : [];
    const totalProdutos = produtos.reduce(function(total, item) {
        return item.status === "ignorado" ? total : total + numero(item.custoUnitario) * numero(item.quantidade);
    }, 0);
    return totalProdutos + numero(nota.frete) + numero(nota.outras) - numero(nota.desconto);
}function numero(valor){
    return Number.parseFloat(String(valor || "0").replace(/\./g, "").replace(",", ".")) || 0;
}function escaparAtributo(valor){
    return escapar(valor).replace(/`/g, "&#096;");
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
