/* baixarxml.js */
/* Extraido de manutencao.js (painel "Baixar XML") para virar pagina propria. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    prepararMesXmlPadrao();
    atualizarResumoXmlDownload();
    conectarDownloadXml();
    document.getElementById("xmlMesDownload")?.focus({ preventScroll: true });
});

function conectarDownloadXml(){
        document.getElementById("xmlMesDownload")?.addEventListener("change", atualizarResumoXmlDownload);
        document.getElementById("xmlTipoDownload")?.addEventListener("change", atualizarResumoXmlDownload);
        document.getElementById("btnBaixarXmlMes")?.addEventListener("click", baixarXmlDoMes);
    }

function prepararMesXmlPadrao(){
        const campo = document.getElementById("xmlMesDownload");
        if(campo && !campo.value){
            campo.value = new Date().toISOString().slice(0, 7);
        }
    }

function baixarXmlDoMes(){
        const mes = document.getElementById("xmlMesDownload")?.value || "";
        const xmls = obterXmlsFiltrados();

        if(!mes){
            alert("Selecione o mês para baixar os XMLs.");
            return;
        }

        if(xmls.length === 0){
            alert("Nenhum XML encontrado para o período selecionado.");
            atualizarResumoXmlDownload();
            return;
        }

        xmls.forEach(function(nota, indice) {
            setTimeout(function() {
                baixarArquivo(nomeXml(nota), nota.xml, "application/xml;charset=utf-8");
            }, indice * 120);
        });

        definirTexto("statusXmlDownload", `${xmls.length} XML(s) baixado(s)`);
    }

function atualizarResumoXmlDownload(){
        prepararMesXmlPadrao();
        const xmls = obterXmlsFiltrados();
        definirTexto("statusXmlDownload", `${xmls.length} XML(s)`);

        const resumo = document.getElementById("xmlDownloadResumo");
        if(resumo){
            resumo.innerHTML = `
                <strong>${xmls.length} XML(s) encontrado(s)</strong>
                <span>Baixe os arquivos do mês selecionado de forma manual.</span>
            `;
        }
    }

function obterXmlsFiltrados(){
        const base = obterBaseLocal();
        const mes = document.getElementById("xmlMesDownload")?.value || "";
        const tipo = document.getElementById("xmlTipoDownload")?.value || "todos";
        const entradas = Array.isArray(base.notasEntrada) ? base.notasEntrada.map(function(nota) {
            return { ...nota, tipoXml: "entrada" };
        }) : [];
        const saidas = []
            .concat(Array.isArray(base.notasSaida) ? base.notasSaida : [])
            .concat(Array.isArray(base.notasEmitidas) ? base.notasEmitidas : [])
            .map(function(nota) {
                return { ...nota, tipoXml: "saida" };
            });

        return entradas.concat(saidas).filter(function(nota) {
            if(!nota.xml) return false;
            if(tipo !== "todos" && nota.tipoXml !== tipo) return false;
            return dataNotaXml(nota).startsWith(mes);
        });
    }

function nomeXml(nota){
        const chave = nota.chave || nota.numero || nota.id || "nota";
        return `${nota.tipoXml || "xml"}_${String(chave).replace(/\D/g, "") || dataArquivo()}.xml`;
    }

function dataNotaXml(nota){
        return String(nota.emissao || nota.data || nota.criadoEm || nota.importadoEm || "").slice(0, 10);
    }

/* ---- utilidades compartilhadas (copiadas de manutencao.js) ---- */

function mostrarStatus(id, texto){
        const status = document.getElementById(id);

        if(status){
            status.textContent = texto;
        }
    }

function definirTexto(id, texto){
        const elemento = document.getElementById(id);
        if(elemento){
            elemento.textContent = texto;
        }
    }

function obterBaseLocal(){
        const base = lerJson("base_Sistema", {});
        base.mercadorias = Array.isArray(base.mercadorias) ? base.mercadorias : lerJson("mercadorias", []);
        base.notasEntrada = Array.isArray(base.notasEntrada) ? base.notasEntrada : [];
        return base;
    }

function baixarArquivo(nome, conteudo, tipo){
        const blob = new Blob([conteudo], { type: tipo });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

function dataArquivo(){
        return new Date().toISOString().slice(0, 10);
    }

})();
