// api.js
// Wrapper fino sobre o window.PdvApi (telas/pdv/js/pdvApi.js) para chamadas ao backend real/mock.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Indica se o backend real está ativo (fora do modo mock).
function pdvApiBackendAtivo(){
    return Boolean(window.PdvApi && window.PdvApi._usarMock === false);
}

// Chama um método do PdvApi com tratamento de erro silencioso.
function chamarPdvApi(nome, args){
    if(!pdvApiBackendAtivo() || typeof window.PdvApi[nome] !== "function"){
        return Promise.resolve(null);
    }

    return window.PdvApi[nome].apply(window.PdvApi, args || []).catch(function(erro) {
        console.warn("[PdvApi] Falha em " + nome + ":", erro.message || erro);
        return null;
    });
}

// Fachada para uso futuro (mesmas funções acima, sem alterar nenhum call-site existente).
window.ApiService = {
    pdvApiBackendAtivo,
    chamarPdvApi
};
