// caixa-service.js
// Gravação de eventos de caixa na base.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Grava um evento de caixa na base de dados.
function registrarEventoCaixaNaBase(base, tipo, detalhe, dados){
    base.eventosCaixa.push({
        id: gerarId("evt"),
        tipo,
        detalhe,
        data: new Date().toISOString(),
        ...(dados || {})
    });
}

// Fachada para uso futuro (mesmas funções acima, sem alterar nenhum call-site existente).
window.CaixaService = {
    registrarEventoCaixaNaBase
};
