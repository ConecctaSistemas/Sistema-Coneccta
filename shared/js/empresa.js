(function(){
    const chaveBase = "base_Sistema";
    const chaveEmpresa = "empresaSistema";

    const empresaPadrao = {
        cnpj: "",
        razaoSocial: "Coneccta Sistemas",
        nomeFantasia: "Coneccta Sistemas",
        cep: "",
        endereco: "",
        numero: "",
        cidade: "",
        estado: "",
        email: "",
        telefone: "",
        site: "",
        inscricaoEstadual: "",
        inscricaoMunicipal: "",
        cnae: "",
        regimeTributario: "simples",
        aliquota: "",
        serieNfce: "",
        ultimoNfce: "",
        ambienteFiscal: "homologacao",
        observacoesFiscais: ""
    };

    window.EmpresaSistema = {
        obter: obterEmpresa,
        salvar: salvarEmpresa,
        padrao: empresaPadrao,
        atualizarTela: atualizarDadosEmpresaNaTela
    };

    document.addEventListener("DOMContentLoaded", atualizarDadosEmpresaNaTela);
    window.addEventListener("storage", atualizarDadosEmpresaNaTela);
    window.addEventListener("empresaSistemaAtualizada", atualizarDadosEmpresaNaTela);

    function obterEmpresa(){
        const base = lerJson(chaveBase, {});
        const empresaBase = base && typeof base.empresa === "object" ? base.empresa : {};
        const empresaAvulsa = lerJson(chaveEmpresa, {});
        return {
            ...empresaPadrao,
            ...empresaAvulsa,
            ...empresaBase
        };
    }

    function salvarEmpresa(dados){
        const empresa = {
            ...empresaPadrao,
            ...obterEmpresa(),
            ...dados,
            atualizadoEm: new Date().toISOString()
        };
        const base = lerJson(chaveBase, {});
        base.empresa = empresa;

        localStorage.setItem(chaveBase, JSON.stringify(base));
        localStorage.setItem(chaveEmpresa, JSON.stringify(empresa));
        window.dispatchEvent(new CustomEvent("empresaSistemaAtualizada", { detail: empresa }));

        return empresa;
    }

    function atualizarDadosEmpresaNaTela(){
        const empresa = obterEmpresa();
        const nome = empresa.nomeFantasia || empresa.razaoSocial || "Coneccta Sistemas";
        const cnpj = empresa.cnpj || "CNPJ não informado";
        const titulo = `${nome} - ${cnpj}`;

        preencherTexto("[data-empresa-titulo]", titulo);
        preencherTexto("[data-empresa-nome]", nome);
        preencherTexto("[data-empresa-cnpj]", cnpj);
        preencherTexto("[data-empresa-razao]", empresa.razaoSocial || "");
        preencherTexto("[data-empresa-endereco]", formatarEndereco(empresa));

        document.querySelectorAll("[data-empresa-pdv-titulo]").forEach(function(elemento) {
            elemento.innerHTML = `${escaparHtml(nome)}<br>PDV`;
        });

        if(document.querySelector("[data-empresa-titulo]")){
            document.title = nome;
        }

        if(document.querySelector("[data-empresa-pdv-titulo]")){
            document.title = `${nome} - PDV`;
        }
    }

    function formatarEndereco(empresa){
        const partes = [
            empresa.endereco,
            empresa.numero,
            empresa.cidade,
            empresa.estado,
            empresa.cep
        ].filter(Boolean);

        return partes.join(" - ");
    }

    function preencherTexto(seletor, valor){
        document.querySelectorAll(seletor).forEach(function(elemento) {
            elemento.textContent = valor;
        });
    }

    function lerJson(chave, fallback){
        try{
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? fallback;
        }catch{
            return fallback;
        }
    }

    function escaparHtml(valor){
        return String(valor ?? "").replace(/[&<>"']/g, function(caractere) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[caractere];
        });
    }
})();
