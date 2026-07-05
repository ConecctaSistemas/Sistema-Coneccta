const FORMAS_PAGAMENTO_BASE_KEY = "base_Sistema";

(function() {
    const formasPadrao = [
        { id: "dinheiro", descricao: "Dinheiro", codigoFiscal: "01", tipo: "dinheiro", atalho: "F1", ativo: true, aparecePdv: true, apareceNfe: true },
        { id: "pix", descricao: "PIX", codigoFiscal: "17", tipo: "pix", usarQrPix: false, chavePix: "", atalho: "F2", ativo: true, aparecePdv: true, apareceNfe: true },
        { id: "credito", descricao: "Cartao de credito", codigoFiscal: "03", tipo: "cartao_credito", usarIntegracaoCartao: false, integracaoCartao: "pos", atalho: "F3", ativo: true, aparecePdv: true, apareceNfe: true },
        { id: "debito", descricao: "Cartao de debito", codigoFiscal: "04", tipo: "cartao_debito", usarIntegracaoCartao: false, integracaoCartao: "pos", atalho: "F4", ativo: true, aparecePdv: true, apareceNfe: true },
        { id: "credito_loja", descricao: "Credito loja", codigoFiscal: "05", tipo: "credito_loja", atalho: "F5", ativo: true, aparecePdv: true, apareceNfe: false },
        { id: "boleto", descricao: "Boleto", codigoFiscal: "15", tipo: "boleto", atalho: "", ativo: true, aparecePdv: false, apareceNfe: true },
        { id: "sem_pagamento", descricao: "Sem pagamento", codigoFiscal: "90", tipo: "sem_pagamento", atalho: "", ativo: true, aparecePdv: false, apareceNfe: true }
    ];

    function obterBase(){
        try{
            return JSON.parse(localStorage.getItem(FORMAS_PAGAMENTO_BASE_KEY)) || {};
        }catch{
            return {};
        }
    }

    function salvarBase(base){
        localStorage.setItem(FORMAS_PAGAMENTO_BASE_KEY, JSON.stringify(base));
    }

    function obterTodas(){
        const base = obterBase();
        if(!Array.isArray(base.formasPagamento) || base.formasPagamento.length === 0){
            base.formasPagamento = formasPadrao.map(function(forma) {
                return { ...forma };
            });
            salvarBase(base);
        }
        return base.formasPagamento;
    }

    function salvarTodas(formas){
        const base = obterBase();
        base.formasPagamento = formas;
        salvarBase(base);
    }

    function ativasPara(destino){
        return obterTodas().filter(function(forma) {
            if(forma.ativo === false) return false;
            if(destino === "pdv") return forma.aparecePdv !== false;
            if(destino === "nfe") return forma.apareceNfe !== false;
            return true;
        });
    }

    function gerarId(descricao){
        const base = String(descricao || "forma").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        return `${base || "forma"}_${Date.now().toString(36)}`;
    }

    window.FormasPagamentoSistema = {
        padrao: formasPadrao,
        obterTodas,
        salvarTodas,
        ativasPara,
        gerarId
    };
})();
