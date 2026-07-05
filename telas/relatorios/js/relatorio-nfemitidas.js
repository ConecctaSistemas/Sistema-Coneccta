/* relatorio-nfemitidas.js */
/* Dependencia propria do relatorio de Notas Fiscais Emitidas. NF-e vem de base.notasSaida
   e NFC-e vem de base.vendas filtradas por documento === "NFC-e" - mesma normalizacao ja
   usada em telas/notasfiscais/js/notasfiscais.js (obterDocumentosFiscais/normalizarNfeDocumento/
   normalizarNfceDocumento), replicada aqui pois erpApi.js ainda nao cobre NFC-e neste relatorio. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formRelatorioNfEmitidas")?.addEventListener("submit", gerarRelatorioNfEmitidas);
});

function gerarRelatorioNfEmitidas(evento){
    evento.preventDefault();

    const tipo = document.getElementById("tipoNfEmitidas").value;
    const dataInicio = document.getElementById("dataInicioNfEmitidas").value;
    const dataFim = document.getElementById("dataFimNfEmitidas").value;
    const busca = document.getElementById("buscaNfEmitidas").value.trim().toLowerCase();
    const incluirCanceladas = document.getElementById("incluirCanceladasNfEmitidas").checked;

    let documentos = obterDocumentosNfEmitidos(tipo, incluirCanceladas);

    if(dataInicio) documentos = documentos.filter(function(doc) { return (doc.emissao || "").slice(0, 10) >= dataInicio; });
    if(dataFim) documentos = documentos.filter(function(doc) { return (doc.emissao || "").slice(0, 10) <= dataFim; });
    if(busca){
        documentos = documentos.filter(function(doc) {
            return String(doc.cliente || "").toLowerCase().includes(busca) || String(doc.numero || "").toLowerCase().includes(busca);
        });
    }

    documentos.sort(function(a, b) { return new Date(b.emissao || 0) - new Date(a.emissao || 0); });

    const colunas = ["Tipo", "Número", "Série", "Cliente", "Emissão", "Status", "Total"];
    const linhas = documentos.map(function(doc) {
        return [
            doc.tipo === "nfe" ? "NF-e" : "NFC-e",
            doc.numero || "-",
            doc.serie || "-",
            doc.cliente || "-",
            formatarData(doc.emissao),
            rotuloStatusNfEmitidas(doc.status),
            formatarMoeda(doc.total)
        ];
    });

    const canceladas = documentos.filter(function(doc) { return doc.status === "cancelada"; }).length;
    const resumo = [
        { rotulo: "Notas no relatório", valor: String(documentos.length) },
        { rotulo: "NF-e", valor: String(documentos.filter(function(doc) { return doc.tipo === "nfe"; }).length) },
        { rotulo: "NFC-e", valor: String(documentos.filter(function(doc) { return doc.tipo === "nfce"; }).length) },
        { rotulo: "Valor total", valor: formatarMoeda(somar(documentos, "total")) }
    ];
    if(incluirCanceladas){
        resumo.push({ rotulo: "Canceladas", valor: String(canceladas) });
    }

    window.RelatorioVisualizador.abrir({
        titulo: "Notas Fiscais Emitidas",
        periodoTexto: montarTextoPeriodoNfEmitidas(tipo, dataInicio, dataFim, busca),
        resumo,
        colunas,
        linhas
    });
}

function obterDocumentosNfEmitidos(tipo, incluirCanceladas){
    const base = obterBase();
    base.vendas = Array.isArray(base.vendas) ? base.vendas : [];
    base.vendasCanceladas = Array.isArray(base.vendasCanceladas) ? base.vendasCanceladas : [];
    base.notasSaida = Array.isArray(base.notasSaida) ? base.notasSaida : [];

    let documentos = [];

    if(tipo === "todos" || tipo === "nfce"){
        documentos = documentos.concat(
            base.vendas
                .filter(function(venda) { return venda.documento === "NFC-e"; })
                .map(function(venda, indice) { return normalizarNfceNfEmitidas(venda, venda.status || "emitida", indice + 1); })
        );

        if(incluirCanceladas){
            documentos = documentos.concat(
                base.vendasCanceladas
                    .filter(function(venda) { return venda.documento === "NFC-e"; })
                    .map(function(venda, indice) { return normalizarNfceNfEmitidas(venda, "cancelada", indice + 1); })
            );
        }
    }

    if(tipo === "todos" || tipo === "nfe"){
        let notasSaida = base.notasSaida;
        if(!incluirCanceladas) notasSaida = notasSaida.filter(function(nota) { return nota.status !== "cancelada"; });
        documentos = documentos.concat(notasSaida.map(normalizarNfeNfEmitidas));
    }

    return documentos;
}

function normalizarNfeNfEmitidas(nota){
    return {
        tipo: "nfe",
        numero: nota.numero,
        serie: nota.serie,
        cliente: nota.destinatario?.documento || nota.destinatario?.nome || "Destinatário",
        emissao: nota.dataHoraEmissao || nota.emissao || nota.criadoEm,
        status: nota.status === "rascunho" ? "emitida" : (nota.status || "emitida"),
        total: nota.totais?.nota || nota.total || 0
    };
}

function normalizarNfceNfEmitidas(venda, status, indice){
    const config = window.ConfiguracoesSistema?.obter?.() || {};
    return {
        tipo: "nfce",
        numero: venda.numeroNfce || venda.nfceNumero || venda.numero || String(indice).padStart(6, "0"),
        serie: venda.serieNfce || venda.nfceSerie || config.fiscalSerieNfce || "1",
        cliente: venda.cliente?.nome || "Consumidor",
        emissao: venda.data || venda.canceladaEm,
        status,
        total: venda.total || 0
    };
}

function rotuloStatusNfEmitidas(status){
    const rotulos = {
        emitida: "Emitida",
        autorizada: "Autorizada",
        cancelada: "Cancelada",
        pendente: "Pendente",
        rascunho: "Rascunho"
    };
    return rotulos[status] || status || "-";
}

function montarTextoPeriodoNfEmitidas(tipo, inicio, fim, busca){
    const partes = [];
    partes.push(tipo === "nfe" ? "Somente NF-e" : tipo === "nfce" ? "Somente NFC-e" : "NF-e e NFC-e");

    if(inicio && fim) partes.push(`Período de ${formatarData(inicio)} até ${formatarData(fim)}`);
    else if(inicio) partes.push(`A partir de ${formatarData(inicio)}`);
    else if(fim) partes.push(`Até ${formatarData(fim)}`);
    else partes.push("Todos os registros");

    if(busca) partes.push(`Busca: "${busca}"`);

    return partes.join(" · ");
}

})();
