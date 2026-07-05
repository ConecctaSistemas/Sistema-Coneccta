(function(){
    const chaveConfiguracoes = "configuracoesSistema";
    const chaveBase = "base_Sistema";

    const origensMercadoria = [
        { codigo: "0", descricao: "Nacional" },
        { codigo: "1", descricao: "Estrangeira - Importação Direta" },
        { codigo: "2", descricao: "Estrangeira - Adquirida no Mercado Interno" },
        { codigo: "3", descricao: "Nacional com conteúdo de importação superior a 40%" },
        { codigo: "4", descricao: "Nacional produzida conforme PPB" },
        { codigo: "5", descricao: "Nacional com conteúdo de importação inferior ou igual a 40%" },
        { codigo: "6", descricao: "Estrangeira importação direta sem similar nacional" },
        { codigo: "7", descricao: "Estrangeira adquirida no mercado interno sem similar nacional" },
        { codigo: "8", descricao: "Nacional conteúdo importação superior a 70%" }
    ];

    const cfopsFiscais = [
        { codigo: "1102", grupo: "Entradas", descricao: "Compra para comercializacao (dentro do estado)" },
        { codigo: "2102", grupo: "Entradas", descricao: "Compra para comercializacao (fora do estado)" },
        { codigo: "1403", grupo: "Entradas", descricao: "Compra para comercializacao em operacao com ST" },
        { codigo: "2403", grupo: "Entradas", descricao: "Compra para comercializacao em operacao com ST (interestadual)" },
        { codigo: "1556", grupo: "Entradas", descricao: "Compra de material para uso e consumo" },
        { codigo: "2556", grupo: "Entradas", descricao: "Compra de material para uso e consumo (interestadual)" },
        { codigo: "1551", grupo: "Entradas", descricao: "Compra de bem para ativo imobilizado" },
        { codigo: "2551", grupo: "Entradas", descricao: "Compra de bem para ativo imobilizado (interestadual)" },
        { codigo: "1910", grupo: "Entradas", descricao: "Entrada por bonificacao, doacao ou brinde" },
        { codigo: "1949", grupo: "Entradas", descricao: "Outras entradas" },
        { codigo: "5102", grupo: "Saidas - Venda de Mercadorias", descricao: "Venda de mercadoria adquirida de terceiros (dentro do estado)" },
        { codigo: "6102", grupo: "Saidas - Venda de Mercadorias", descricao: "Venda de mercadoria adquirida de terceiros (fora do estado)" },
        { codigo: "5405", grupo: "Saidas - Venda de Mercadorias", descricao: "Venda de mercadoria com ST" },
        { codigo: "6405", grupo: "Saidas - Venda de Mercadorias", descricao: "Venda de mercadoria com ST (interestadual)" },
        { codigo: "5101", grupo: "Saidas - Venda de Mercadorias", descricao: "Venda de producao propria" },
        { codigo: "6101", grupo: "Saidas - Venda de Mercadorias", descricao: "Venda de producao propria (interestadual)" },
        { codigo: "5202", grupo: "Devolucoes de Compra", descricao: "Devolucao de compra para comercializacao" },
        { codigo: "6202", grupo: "Devolucoes de Compra", descricao: "Devolucao de compra para comercializacao (interestadual)" },
        { codigo: "5556", grupo: "Devolucoes de Compra", descricao: "Devolucao de material de uso e consumo" },
        { codigo: "6556", grupo: "Devolucoes de Compra", descricao: "Devolucao de material de uso e consumo (interestadual)" },
        { codigo: "1202", grupo: "Devolucoes de Venda", descricao: "Devolucao de venda de mercadoria" },
        { codigo: "2202", grupo: "Devolucoes de Venda", descricao: "Devolucao de venda de mercadoria (interestadual)" },
        { codigo: "1201", grupo: "Devolucoes de Venda", descricao: "Devolucao de venda de producao propria" },
        { codigo: "2201", grupo: "Devolucoes de Venda", descricao: "Devolucao de venda de producao propria (interestadual)" },
        { codigo: "5152", grupo: "Transferencias", descricao: "Transferencia de mercadoria" },
        { codigo: "6152", grupo: "Transferencias", descricao: "Transferencia de mercadoria interestadual" },
        { codigo: "1152", grupo: "Transferencias", descricao: "Entrada por transferencia" },
        { codigo: "2152", grupo: "Transferencias", descricao: "Entrada por transferencia interestadual" },
        { codigo: "5901", grupo: "Remessas", descricao: "Remessa para industrializacao" },
        { codigo: "6901", grupo: "Remessas", descricao: "Remessa para industrializacao (interestadual)" },
        { codigo: "5904", grupo: "Remessas", descricao: "Remessa para venda fora do estabelecimento" },
        { codigo: "5949", grupo: "Remessas", descricao: "Outras remessas" },
        { codigo: "6949", grupo: "Remessas", descricao: "Outras remessas interestaduais" },
        { codigo: "5910", grupo: "Bonificacao, Brindes e Doacoes", descricao: "Remessa em bonificacao" },
        { codigo: "6910", grupo: "Bonificacao, Brindes e Doacoes", descricao: "Remessa em bonificacao interestadual" },
        { codigo: "5911", grupo: "Bonificacao, Brindes e Doacoes", descricao: "Remessa de amostra gratis" },
        { codigo: "6911", grupo: "Bonificacao, Brindes e Doacoes", descricao: "Remessa de amostra gratis interestadual" },
        { codigo: "7102", grupo: "Exportacao", descricao: "Venda para exportacao" },
        { codigo: "7101", grupo: "Exportacao", descricao: "Venda de producao propria para exportacao" }
    ];

    const situacoesTributarias = {
        csosn: [
            { codigo: "101", descricao: "Tributada pelo Simples Nacional com permissao de credito" },
            { codigo: "102", descricao: "Tributada pelo Simples Nacional sem permissao de credito" },
            { codigo: "103", descricao: "Isencao do ICMS no Simples Nacional" },
            { codigo: "201", descricao: "Tributada pelo Simples Nacional com ST e credito" },
            { codigo: "202", descricao: "Tributada pelo Simples Nacional sem credito e com ST" },
            { codigo: "203", descricao: "Isencao do ICMS com ST" },
            { codigo: "300", descricao: "Imune" },
            { codigo: "400", descricao: "Nao tributada" },
            { codigo: "500", descricao: "ICMS cobrado anteriormente por ST" },
            { codigo: "900", descricao: "Outros" }
        ],
        cstIcms: [
            { codigo: "00", descricao: "Tributada integralmente" },
            { codigo: "10", descricao: "Tributada com cobranca de ST" },
            { codigo: "20", descricao: "Com reducao da base de calculo" },
            { codigo: "30", descricao: "Isenta ou nao tributada com ST" },
            { codigo: "40", descricao: "Isenta" },
            { codigo: "41", descricao: "Nao tributada" },
            { codigo: "50", descricao: "Suspensao" },
            { codigo: "51", descricao: "Diferimento" },
            { codigo: "60", descricao: "ICMS cobrado anteriormente por ST" },
            { codigo: "70", descricao: "Reducao da base e ST" },
            { codigo: "90", descricao: "Outros" }
        ],
        cstPis: [
            { codigo: "01", descricao: "Operacao tributavel (aliquota normal)" },
            { codigo: "02", descricao: "Operacao tributavel (aliquota diferenciada)" },
            { codigo: "03", descricao: "Quantidade tributada" },
            { codigo: "04", descricao: "Monofasica" },
            { codigo: "05", descricao: "Substituicao Tributaria" },
            { codigo: "06", descricao: "Aliquota zero" },
            { codigo: "07", descricao: "Isenta" },
            { codigo: "08", descricao: "Sem incidencia" },
            { codigo: "09", descricao: "Suspensao" },
            { codigo: "49", descricao: "Outras operacoes de saida" },
            { codigo: "50", descricao: "Credito vinculado exclusivamente a receita tributada" },
            { codigo: "51", descricao: "Credito vinculado exclusivamente a receita nao tributada" },
            { codigo: "52", descricao: "Credito vinculado exclusivamente a exportacao" },
            { codigo: "53", descricao: "Credito vinculado a receitas mistas" },
            { codigo: "54", descricao: "Credito vinculado a receitas tributadas e exportacao" },
            { codigo: "55", descricao: "Credito vinculado a receitas nao tributadas e exportacao" },
            { codigo: "56", descricao: "Credito vinculado a receitas mistas e exportacao" },
            { codigo: "60", descricao: "Credito presumido" },
            { codigo: "61", descricao: "Credito de estoque de abertura" },
            { codigo: "62", descricao: "Credito de aquisicao vinculada a receita tributada" },
            { codigo: "63", descricao: "Credito de aquisicao vinculada a receita nao tributada" },
            { codigo: "64", descricao: "Credito de aquisicao vinculada a exportacao" },
            { codigo: "65", descricao: "Credito de aquisicao vinculada a receitas mistas" },
            { codigo: "66", descricao: "Credito presumido vinculado a exportacao" },
            { codigo: "67", descricao: "Outros creditos" },
            { codigo: "70", descricao: "Operacao sem direito a credito" },
            { codigo: "71", descricao: "Operacao de aquisicao com isencao" },
            { codigo: "72", descricao: "Operacao de aquisicao com suspensao" },
            { codigo: "73", descricao: "Operacao de aquisicao a aliquota zero" },
            { codigo: "74", descricao: "Operacao de aquisicao sem incidencia" },
            { codigo: "75", descricao: "Aquisicao por ST" },
            { codigo: "98", descricao: "Outras entradas" },
            { codigo: "99", descricao: "Outras saidas" }
        ],
        cstCofins: [],
        cstIpi: [
            { codigo: "00", descricao: "Entrada com recuperacao de credito" },
            { codigo: "01", descricao: "Entrada tributada com aliquota zero" },
            { codigo: "02", descricao: "Entrada isenta" },
            { codigo: "03", descricao: "Entrada nao tributada" },
            { codigo: "04", descricao: "Entrada imune" },
            { codigo: "05", descricao: "Entrada com suspensao" },
            { codigo: "49", descricao: "Outras entradas" },
            { codigo: "50", descricao: "Saida tributada" },
            { codigo: "51", descricao: "Saida tributada com aliquota zero" },
            { codigo: "52", descricao: "Saida isenta" },
            { codigo: "53", descricao: "Saida nao tributada" },
            { codigo: "54", descricao: "Saida imune" },
            { codigo: "55", descricao: "Saida com suspensao" },
            { codigo: "99", descricao: "Outras saidas" }
        ],
        cstIssqn: [
            { codigo: "N", descricao: "Normal" },
            { codigo: "R", descricao: "Retido" },
            { codigo: "I", descricao: "Isento" },
            { codigo: "E", descricao: "Exportacao" },
            { codigo: "S", descricao: "Imune" },
            { codigo: "O", descricao: "Outros" }
        ],
        origemMercadoria: origensMercadoria
    };
    situacoesTributarias.cstCofins = situacoesTributarias.cstPis.map(function(item) {
        return { ...item };
    });

    const padraoRegras = {
        versao: "2026.06",
        regrasOperacionais: [
            { operacao: "Venda", destino: "Mesmo Estado", regime: "MEI", cfop: "5102", cstCsosn: "102" },
            { operacao: "Venda", destino: "Outro Estado", regime: "MEI", cfop: "6102", cstCsosn: "102" },
            { operacao: "Devolução", destino: "Mesmo Estado", regime: "MEI", cfop: "1202", cstCsosn: "900" },
            { operacao: "Devolução", destino: "Outro Estado", regime: "MEI", cfop: "2202", cstCsosn: "900" },
            { operacao: "Venda", destino: "Mesmo Estado", regime: "Simples", cfop: "5102", cstCsosn: "102" },
            { operacao: "Venda", destino: "Outro Estado", regime: "Simples", cfop: "6102", cstCsosn: "102" },
            { operacao: "Devolução", destino: "Mesmo Estado", regime: "Simples", cfop: "1202", cstCsosn: "900" },
            { operacao: "Devolução", destino: "Outro Estado", regime: "Simples", cfop: "2202", cstCsosn: "900" },
            { operacao: "Venda", destino: "Mesmo Estado", regime: "Presumido", cfop: "5102", cstCsosn: "00" },
            { operacao: "Venda", destino: "Outro Estado", regime: "Presumido", cfop: "6102", cstCsosn: "00" },
            { operacao: "Devolução", destino: "Mesmo Estado", regime: "Presumido", cfop: "1202", cstCsosn: "90" },
            { operacao: "Devolução", destino: "Outro Estado", regime: "Presumido", cfop: "2202", cstCsosn: "90" },
            { operacao: "Venda", destino: "Mesmo Estado", regime: "Real", cfop: "5102", cstCsosn: "00" },
            { operacao: "Venda", destino: "Outro Estado", regime: "Real", cfop: "6102", cstCsosn: "00" },
            { operacao: "Devolução", destino: "Mesmo Estado", regime: "Real", cfop: "1202", cstCsosn: "90" },
            { operacao: "Devolução", destino: "Outro Estado", regime: "Real", cfop: "2202", cstCsosn: "90" }
        ],
        regraAtiva: "simplesTributado",
        cfopNfceVendaBalcaoEstadual: "5102",
        cfopNfceVendaBalcaoInterestadual: "6102",
        cfopProducaoPropriaEstadual: "5101",
        cfopProducaoPropriaInterestadual: "6101",
        cfopDevolucaoClienteEstadual: "1202",
        cfopDevolucaoClienteInterestadual: "2202",
        cfopConsumidorFinal: "5102",
        nfeConsumidorFinalIndicadorIe: "9",
        nfeConsumidorFinalPresenca: "1",
        nfeConsumidorFinalFinalidade: "1",
        nfeRevendaIndicadorIe: "1",
        nfeRevendaFinalidade: "1",
        nfeDevolucaoFinalidade: "4",
        nfceModelo: "65",
        nfceTipoEmissao: "normal",
        nfceConsumidorFinal: "sim",
        nfcePresenca: "presencial",
        categoriasSt: "autopeças;bebidas;cervejas;refrigerantes;cigarros;cosméticos;tintas;pneus;medicamentos;materiais de construção",
        categoriasMonofasicas: "combustíveis;lubrificantes;bebidas frias;medicamentos;perfumaria",
        ncmsMonofasicos: "",
        regrasPadrao: {
            simplesTributado: {
                nome: "Produto tributado normalmente",
                crt: "1",
                csosn: "102",
                cstIcms: "",
                cstPis: "49",
                cstCofins: "49",
                aliquotaIcms: "18",
                aliquotaPis: "0",
                aliquotaCofins: "0",
                aliquotaIpi: "0",
                icmsSt: false,
                monofasico: false
            },
            substituicaoTributaria: {
                nome: "Substituição tributária",
                crt: "1",
                csosn: "500",
                cstIcms: "",
                cstPis: "49",
                cstCofins: "49",
                aliquotaIcms: "0",
                aliquotaPis: "0",
                aliquotaCofins: "0",
                aliquotaIpi: "0",
                icmsSt: true,
                monofasico: false
            },
            monofasico: {
                nome: "Produto monofásico",
                crt: "1",
                csosn: "102",
                cstIcms: "",
                cstPis: "04",
                cstCofins: "04",
                aliquotaIcms: "18",
                aliquotaPis: "0",
                aliquotaCofins: "0",
                aliquotaIpi: "0",
                icmsSt: false,
                monofasico: true
            },
            regimeNormal: {
                nome: "Regime normal",
                crt: "3",
                csosn: "",
                cstIcms: "00",
                cstPis: "01",
                cstCofins: "01",
                aliquotaIcms: "18",
                aliquotaPis: "1.65",
                aliquotaCofins: "7.6",
                aliquotaIpi: "0",
                icmsSt: false,
                monofasico: false
            }
        }
    };

    situacoesTributarias.csosn = [
        { codigo: "101", descricao: "Tributada com permissao de credito" },
        { codigo: "102", descricao: "Tributada sem permissao de credito" },
        { codigo: "103", descricao: "Isencao do ICMS para faixa de receita bruta" },
        { codigo: "201", descricao: "Tributada com permissao de credito e ST" },
        { codigo: "202", descricao: "Tributada sem permissao de credito e ST" },
        { codigo: "203", descricao: "Isencao para faixa de receita bruta e ST" },
        { codigo: "300", descricao: "Imune" },
        { codigo: "400", descricao: "Nao tributada" },
        { codigo: "500", descricao: "ICMS cobrado anteriormente por ST" },
        { codigo: "900", descricao: "Outros" }
    ];
    situacoesTributarias.cstIcms = [
        { codigo: "00", descricao: "Tributada integralmente" },
        { codigo: "10", descricao: "Tributada e com cobranca de ST" },
        { codigo: "20", descricao: "Com reducao da base de calculo" },
        { codigo: "30", descricao: "Isenta ou nao tributada com ST" },
        { codigo: "40", descricao: "Isenta" },
        { codigo: "41", descricao: "Nao tributada" },
        { codigo: "50", descricao: "Suspensao" },
        { codigo: "51", descricao: "Diferimento" },
        { codigo: "60", descricao: "ICMS cobrado anteriormente por ST" },
        { codigo: "70", descricao: "Reducao da BC e ST" },
        { codigo: "90", descricao: "Outras" }
    ];
    situacoesTributarias.cstPis = [
        { codigo: "01", descricao: "Operacao tributavel com aliquota basica" },
        { codigo: "02", descricao: "Operacao tributavel com aliquota diferenciada" },
        { codigo: "03", descricao: "Operacao tributavel por unidade" },
        { codigo: "04", descricao: "Monofasica - revenda" },
        { codigo: "05", descricao: "Substituicao tributaria" },
        { codigo: "06", descricao: "Aliquota zero" },
        { codigo: "07", descricao: "Isenta" },
        { codigo: "08", descricao: "Sem incidencia" },
        { codigo: "09", descricao: "Suspensa" },
        { codigo: "49", descricao: "Outras operacoes de saida" },
        { codigo: "50", descricao: "Direito a credito vinculada exclusivamente a receita tributada" },
        { codigo: "51", descricao: "Direito a credito vinculada exclusivamente a receita nao tributada" },
        { codigo: "52", descricao: "Direito a credito vinculada exclusivamente a exportacao" },
        { codigo: "53", descricao: "Direito a credito vinculada a receitas tributadas e nao tributadas" },
        { codigo: "54", descricao: "Direito a credito vinculada a exportacao e nao tributadas" },
        { codigo: "55", descricao: "Direito a credito vinculada a receitas tributadas, exportacao e nao tributadas" },
        { codigo: "56", descricao: "Credito presumido" },
        { codigo: "60", descricao: "Credito presumido" },
        { codigo: "61", descricao: "Credito presumido" },
        { codigo: "62", descricao: "Credito presumido" },
        { codigo: "63", descricao: "Credito presumido" },
        { codigo: "64", descricao: "Credito presumido" },
        { codigo: "65", descricao: "Credito presumido" },
        { codigo: "66", descricao: "Credito presumido" },
        { codigo: "67", descricao: "Credito presumido" },
        { codigo: "70", descricao: "Operacao de aquisicao sem direito a credito" },
        { codigo: "71", descricao: "Operacao de aquisicao com isencao" },
        { codigo: "72", descricao: "Operacao de aquisicao com suspensao" },
        { codigo: "73", descricao: "Operacao de aquisicao a aliquota zero" },
        { codigo: "74", descricao: "Operacao de aquisicao sem incidencia" },
        { codigo: "75", descricao: "Operacao de aquisicao por substituicao tributaria" },
        { codigo: "98", descricao: "Outras operacoes de entrada" },
        { codigo: "99", descricao: "Outras operacoes" }
    ];
    situacoesTributarias.cstCofins = situacoesTributarias.cstPis.map(function(item) {
        return { ...item };
    });
    situacoesTributarias.cstIpi = [
        { codigo: "00", descricao: "Entrada com recuperacao de credito" },
        { codigo: "01", descricao: "Entrada tributada com aliquota zero" },
        { codigo: "02", descricao: "Entrada isenta" },
        { codigo: "03", descricao: "Entrada nao tributada" },
        { codigo: "04", descricao: "Entrada imune" },
        { codigo: "05", descricao: "Entrada com suspensao" },
        { codigo: "49", descricao: "Outras entradas" },
        { codigo: "50", descricao: "Saida tributada" },
        { codigo: "51", descricao: "Saida tributada com aliquota zero" },
        { codigo: "52", descricao: "Saida isenta" },
        { codigo: "53", descricao: "Saida nao tributada" },
        { codigo: "54", descricao: "Saida imune" },
        { codigo: "55", descricao: "Saida com suspensao" },
        { codigo: "99", descricao: "Outras saidas" }
    ];
    situacoesTributarias.origemMercadoria = [
        { codigo: "0", descricao: "Nacional" },
        { codigo: "1", descricao: "Estrangeira - Importacao direta" },
        { codigo: "2", descricao: "Estrangeira - Adquirida no mercado interno" },
        { codigo: "3", descricao: "Nacional com conteudo de importacao superior a 40%" },
        { codigo: "4", descricao: "Nacional produzida conforme processos produtivos basicos" },
        { codigo: "5", descricao: "Nacional com conteudo de importacao inferior ou igual a 40%" },
        { codigo: "6", descricao: "Estrangeira - Importacao direta sem similar nacional" },
        { codigo: "7", descricao: "Estrangeira - Mercado interno sem similar nacional" },
        { codigo: "8", descricao: "Nacional com conteudo de importacao superior a 70%" }
    ];
    origensMercadoria.splice(0, origensMercadoria.length, ...situacoesTributarias.origemMercadoria);

    window.RegrasFiscaisSistema = {
        cfops: cfopsFiscais,
        situacoesTributarias,
        origensMercadoria,
        padrao: padraoRegras,
        obter: obterRegras,
        salvar: salvarRegras,
        restaurar: restaurarRegras,
        sugerirProduto: sugerirProduto,
        sugerirTributacaoVenda: sugerirTributacaoVenda,
        sugerirVendaXml: sugerirTributacaoVenda,
        aplicarAoProduto: aplicarAoProduto,
        fiscalDoItem: fiscalDoItem,
        listarRegras: listarRegras
    };

    function obterRegras(){
        const configuracoes = obterConfiguracoes();
        return mesclarRegras(padraoRegras, configuracoes.regrasFiscais || {});
    }

    function salvarRegras(dados){
        const regras = mesclarRegras(padraoRegras, dados || {});
        const configuracoes = {
            ...obterConfiguracoes(),
            regrasFiscais: regras,
            atualizadoEm: new Date().toISOString()
        };
        salvarConfiguracoes(configuracoes);
        window.dispatchEvent(new CustomEvent("regrasFiscaisAtualizadas", { detail: regras }));
        return regras;
    }

    function restaurarRegras(){
        return salvarRegras(padraoRegras);
    }

    function listarRegras(){
        return (obterRegras().regrasOperacionais || []).map(function(regra, indice) {
            return { id: `regra_${indice + 1}`, ...regra };
        });
    }

    function sugerirProduto(produto, contexto = {}){
        return sugerirTributacaoVenda(produto, contexto);

        const regras = obterRegras();
        const config = obterConfiguracoes();
        const regime = contexto.regime || config.fiscalRegimeTributario || "simplesNacional";
        const crt = obterCrt(regime, config);
        const possuiCest = Boolean(String(produto?.cest || "").trim());
        const monofasico = produtoEhMonofasico(produto, regras);
        const st = possuiCest || produtoEhSt(produto, regras);
        const regraBase = selecionarRegraBase(crt, st, monofasico, regras);
        const interestadual = contexto.interestadual === true;
        const regraOperacional = localizarRegraOperacional(regras, {
            operacao: contexto.devolucao ? "Devolução" : "Venda",
            destino: interestadual ? "Outro Estado" : "Mesmo Estado",
            regime: nomeRegimeOperacional(regime, crt)
        });
        const cfopOperacional = regraOperacional?.cfop || "";
        const cstCsosnOperacional = regraOperacional?.cstCsosn || "";
        const nfce = contexto.modelo === "nfce";
        const consumidorFinal = contexto.consumidorFinal !== false;

        return {
            origem: produto?.origemMercadoria || produto?.origem || "0",
            crt,
            csosn: crt === "1" || crt === "2" || crt === "4" ? (cstCsosnOperacional || regraBase.csosn) : "",
            cstIcms: crt === "3" || crt === "2" ? (cstCsosnOperacional || regraBase.cstIcms) : (produto?.cstIcms || ""),
            cstPis: monofasico ? "04" : regraBase.cstPis,
            cstCofins: monofasico ? "04" : regraBase.cstCofins,
            cstIpi: produto?.cstIpi || config.fiscalCstIpiPadrao || "99",
            cfopVendaEstadual: produto?.cfopVendaEstadual || produto?.cfop || regraPorContexto(regras, "Venda", "Mesmo Estado", regime, crt)?.cfop || regras.cfopNfceVendaBalcaoEstadual,
            cfopVendaInterestadual: produto?.cfopVendaInterestadual || regraPorContexto(regras, "Venda", "Outro Estado", regime, crt)?.cfop || regras.cfopNfceVendaBalcaoInterestadual,
            cfopConsumidorFinal: produto?.cfopConsumidorFinal || regras.cfopConsumidorFinal,
            cfopDevolucao: produto?.cfopDevolucao || regraPorContexto(regras, "Devolução", interestadual ? "Outro Estado" : "Mesmo Estado", regime, crt)?.cfop || regras.cfopDevolucaoClienteEstadual,
            cfop: produto?.cfop || cfopOperacional || (nfce ? regras.cfopNfceVendaBalcaoEstadual : (interestadual ? regras.cfopNfceVendaBalcaoInterestadual : (consumidorFinal ? regras.cfopConsumidorFinal : regras.cfopNfceVendaBalcaoEstadual))),
            aliquotaIcms: regraBase.aliquotaIcms,
            aliquotaPis: regraBase.aliquotaPis,
            aliquotaCofins: regraBase.aliquotaCofins,
            aliquotaIpi: regraBase.aliquotaIpi,
            icmsSt: st,
            monofasico,
            indicadorIe: consumidorFinal ? regras.nfeConsumidorFinalIndicadorIe : regras.nfeRevendaIndicadorIe,
            presenca: nfce ? regras.nfcePresenca : regras.nfeConsumidorFinalPresenca,
            finalidade: contexto.devolucao ? regras.nfeDevolucaoFinalidade : regras.nfeConsumidorFinalFinalidade,
            modelo: nfce ? regras.nfceModelo : "55",
            tipoOperacao: "saida",
            pendenciaContador: !regraBase.csosn && !regraBase.cstIcms
        };
    }

    function sugerirTributacaoVenda(produto, contexto = {}){
        const config = obterConfiguracoes();
        const regras = obterRegras();
        const regime = contexto.regime || config.fiscalRegimeTributario || "simplesNacional";
        const crt = obterCrt(regime, config);
        const simples = ["1", "4"].includes(crt) || ["mei", "simplesNacional", "meiEmissaoFiscal"].includes(regime);
        const tipoProduto = normalizarTipoProdutoFiscal(produto?.tipoProduto || produto?.origemProduto || contexto.tipoProduto || "REVENDA");
        const cfopVendaEstadual = tipoProduto === "FABRICACAO_PROPRIA" ? "5101" : "5102";
        const cfopVendaInterestadual = tipoProduto === "FABRICACAO_PROPRIA" ? "6101" : "6102";
        const devolucao = contexto.devolucao === true || normalizar(contexto.tipoOperacao || "").includes("devolucao");
        const cfopDevolucao = produto?.cfopDevolucao || (contexto.interestadual ? "2202" : "1202");
        const cstXml = String(produto?.cstIcms || produto?.csosn || produto?.cst || "").trim();
        const possuiCest = Boolean(String(produto?.cest || "").trim());
        const valorIcmsSt = numero(produto?.valorIcmsSt ?? produto?.icmsStValor ?? produto?.icmsSt ?? produto?.vICMSST ?? produto?.vST);
        const possuiST = possuiCest || valorIcmsSt > 0 || ["10", "30", "60", "201", "202", "203", "500"].includes(cstXml);
        let classificacaoFiscal = "";
        let csosn = "";
        let cstIcms = "";
        let conferenciaObrigatoria = false;

        if(simples){
            if(["40", "41", "400"].includes(cstXml)){
                classificacaoFiscal = "Isento, imune ou nao tributado";
                csosn = "400";
            }else if(cstXml === "300"){
                classificacaoFiscal = "Isento, imune ou nao tributado";
                csosn = "300";
            }else if(possuiST){
                classificacaoFiscal = "Produto com Substituicao Tributaria";
                csosn = "500";
            }else if(produto?.ncm || produto?.descricao || produto?.codigoXml || produto?.codigo){
                classificacaoFiscal = "Produto tributado normalmente";
                csosn = "102";
            }else{
                classificacaoFiscal = "Conferencia obrigatoria";
                csosn = "900";
                conferenciaObrigatoria = true;
            }
        }else{
            if(["40", "41", "50"].includes(cstXml)){
                classificacaoFiscal = cstXml === "40" ? "Isenta" : (cstXml === "41" ? "Nao tributada" : "Suspensao");
                cstIcms = cstXml;
            }else if(possuiST){
                classificacaoFiscal = "Produto com Substituicao Tributaria";
                cstIcms = "60";
            }else if(produto?.ncm || produto?.descricao || produto?.codigoXml || produto?.codigo){
                classificacaoFiscal = "Produto tributado normalmente";
                cstIcms = "00";
            }else{
                classificacaoFiscal = "Conferencia obrigatoria";
                cstIcms = "90";
                conferenciaObrigatoria = true;
            }
        }

        return {
            origem: produto?.origemMercadoria || produto?.origem || config.fiscalOrigemMercadoriaPadrao || "0",
            crt,
            regime,
            tipoOperacao: "saida",
            finalidadeVenda: "consumidor_final",
            classificacaoFiscal,
            conferenciaObrigatoria,
            csosn,
            cstIcms,
            cst: csosn || cstIcms,
            cstPis: produto?.cstPis || config.fiscalCstPisPadrao || (simples ? "49" : "01"),
            cstCofins: produto?.cstCofins || config.fiscalCstCofinsPadrao || (simples ? "49" : "01"),
            cstIpi: produto?.cstIpi || config.fiscalCstIpiPadrao || "99",
            cfopVendaEstadual,
            cfopVendaInterestadual,
            cfopConsumidorFinal: cfopVendaEstadual,
            cfopDevolucao,
            cfop: devolucao ? cfopDevolucao : (contexto.interestadual ? cfopVendaInterestadual : cfopVendaEstadual),
            cfopNfce: cfopVendaEstadual,
            aliquotaIcms: produto?.aliquotaIcms ?? config.fiscalAliquotaIcmsPadrao ?? "0",
            aliquotaPis: produto?.aliquotaPis ?? config.fiscalAliquotaPisPadrao ?? "0",
            aliquotaCofins: produto?.aliquotaCofins ?? config.fiscalAliquotaCofinsPadrao ?? "0",
            aliquotaIpi: produto?.aliquotaIpi ?? "0",
            icmsSt: possuiST,
            valorIcmsSt,
            monofasico: Boolean(produto?.monofasico),
            indicadorIe: regras.nfeConsumidorFinalIndicadorIe || "9",
            presenca: contexto.modelo === "nfce" ? (regras.nfcePresenca || "presencial") : (regras.nfeConsumidorFinalPresenca || "1"),
            finalidade: devolucao ? (regras.nfeDevolucaoFinalidade || "4") : (regras.nfeConsumidorFinalFinalidade || "1"),
            modelo: contexto.modelo === "nfce" ? "65" : "55",
            pendenciaContador: conferenciaObrigatoria
        };
    }

    function aplicarAoProduto(produto, contexto = {}){
        const sugestao = sugerirProduto(produto, contexto);
        return {
            ...produto,
            origemMercadoria: produto?.origemMercadoria || sugestao.origem,
            cfop: produto?.cfop || sugestao.cfop,
            cfopVendaEstadual: produto?.cfopVendaEstadual || sugestao.cfopVendaEstadual,
            cfopVendaInterestadual: produto?.cfopVendaInterestadual || sugestao.cfopVendaInterestadual,
            cfopConsumidorFinal: produto?.cfopConsumidorFinal || sugestao.cfopConsumidorFinal,
            cfopDevolucao: produto?.cfopDevolucao || sugestao.cfopDevolucao,
            cst: produto?.cst || sugestao.csosn || sugestao.cstIcms,
            csosn: produto?.csosn || sugestao.csosn,
            cstIcms: produto?.cstIcms || sugestao.cstIcms,
            cstPis: produto?.cstPis || sugestao.cstPis,
            cstCofins: produto?.cstCofins || sugestao.cstCofins,
            cstIpi: produto?.cstIpi || sugestao.cstIpi,
            aliquotaIcms: produto?.aliquotaIcms || sugestao.aliquotaIcms,
            aliquotaPis: produto?.aliquotaPis || sugestao.aliquotaPis,
            aliquotaCofins: produto?.aliquotaCofins || sugestao.aliquotaCofins,
            aliquotaIpi: produto?.aliquotaIpi || sugestao.aliquotaIpi,
            icms: produto?.icms || sugestao.aliquotaIcms,
            icmsSt: produto?.icmsSt ?? sugestao.icmsSt,
            monofasico: produto?.monofasico ?? sugestao.monofasico
        };
    }

    function fiscalDoItem(produto, contexto = {}){
        const sugestao = sugerirProduto(produto, contexto);
        return {
            origem: produto?.origemMercadoria || sugestao.origem,
            ncm: produto?.ncm || "",
            cest: produto?.cest || "",
            cfop: produto?.cfop || sugestao.cfop,
            cfopVendaEstadual: produto?.cfopVendaEstadual || sugestao.cfopVendaEstadual,
            cfopVendaInterestadual: produto?.cfopVendaInterestadual || sugestao.cfopVendaInterestadual,
            csosn: produto?.csosn || sugestao.csosn,
            cstIcms: produto?.cstIcms || sugestao.cstIcms,
            cst: produto?.cst || produto?.csosn || produto?.cstIcms || sugestao.csosn || sugestao.cstIcms,
            cstPis: produto?.cstPis || sugestao.cstPis,
            cstCofins: produto?.cstCofins || sugestao.cstCofins,
            cstIpi: produto?.cstIpi || sugestao.cstIpi,
            aliquotaIcms: numero(produto?.aliquotaIcms || produto?.icms || sugestao.aliquotaIcms),
            aliquotaPis: numero(produto?.aliquotaPis || sugestao.aliquotaPis),
            aliquotaCofins: numero(produto?.aliquotaCofins || sugestao.aliquotaCofins),
            aliquotaIpi: numero(produto?.aliquotaIpi || sugestao.aliquotaIpi),
            icmsSt: Boolean(produto?.icmsSt ?? sugestao.icmsSt),
            monofasico: Boolean(produto?.monofasico ?? sugestao.monofasico)
        };
    }

    function selecionarRegraBase(crt, st, monofasico, regras){
        if(monofasico) return regras.regrasPadrao.monofasico;
        if(st) return regras.regrasPadrao.substituicaoTributaria;
        if(crt === "3") return regras.regrasPadrao.regimeNormal;
        return regras.regrasPadrao.simplesTributado;
    }

    function regraPorContexto(regras, operacao, destino, regime, crt){
        return localizarRegraOperacional(regras, {
            operacao,
            destino,
            regime: nomeRegimeOperacional(regime, crt)
        });
    }

    function nomeRegimeOperacional(regime, crt){
        if(regime === "mei" || regime === "meiEmissaoFiscal" || crt === "4") return "MEI";
        if(regime === "presumido") return "Presumido";
        if(regime === "real") return "Real";
        return "Simples";
    }

    function localizarRegraOperacional(regras, contexto){
        const lista = Array.isArray(regras.regrasOperacionais) ? regras.regrasOperacionais : [];
        const operacao = normalizar(contexto.operacao);
        const destino = normalizar(contexto.destino);
        const regime = normalizar(contexto.regime);

        return lista.find(function(regra) {
            return normalizar(regra.operacao) === operacao &&
                normalizar(regra.destino) === destino &&
                normalizar(regra.regime) === regime;
        }) || null;
    }

    function obterCrt(regime, config){
        if(config.fiscalCodigoRegimeTributario) return String(config.fiscalCodigoRegimeTributario);
        if(["presumido", "real"].includes(regime)) return "3";
        if(regime === "simplesExcessoSubLimite") return "2";
        if(regime === "mei" || regime === "meiEmissaoFiscal") return "4";
        return "1";
    }

    function produtoEhSt(produto, regras){
        const texto = normalizar([produto?.categoria, produto?.descricao, produto?.marca, produto?.fornecedor].join(" "));
        return listaTexto(regras.categoriasSt).some(function(termo) {
            return termo && texto.includes(normalizar(termo));
        });
    }

    function produtoEhMonofasico(produto, regras){
        const texto = normalizar([produto?.categoria, produto?.descricao, produto?.marca, produto?.fornecedor].join(" "));
        const ncm = somenteNumeros(produto?.ncm || "");
        const porCategoria = listaTexto(regras.categoriasMonofasicas).some(function(termo) {
            return termo && texto.includes(normalizar(termo));
        });
        const porNcm = listaTexto(regras.ncmsMonofasicos).some(function(termo) {
            const chave = somenteNumeros(termo);
            return chave && ncm.startsWith(chave);
        });
        return porCategoria || porNcm;
    }

    function mesclarRegras(padrao, atual){
        return {
            ...padrao,
            ...atual,
            regrasPadrao: {
                ...padrao.regrasPadrao,
                ...(atual.regrasPadrao || {})
            }
        };
    }

    function obterConfiguracoes(){
        if(window.ConfiguracoesSistema?.obter) return window.ConfiguracoesSistema.obter();
        return lerJson(chaveConfiguracoes, {});
    }

    function salvarConfiguracoes(configuracoes){
        if(window.ConfiguracoesSistema?.salvar){
            window.ConfiguracoesSistema.salvar(configuracoes);
            return;
        }

        const base = lerJson(chaveBase, {});
        base.configuracoes = configuracoes;
        localStorage.setItem(chaveBase, JSON.stringify(base));
        localStorage.setItem(chaveConfiguracoes, JSON.stringify(configuracoes));
    }

    function listaTexto(texto){
        return String(texto || "")
            .split(/[;\n,]+/)
            .map(function(item) { return item.trim(); })
            .filter(Boolean);
    }

    function normalizar(texto){
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function somenteNumeros(texto){
        return String(texto || "").replace(/\D/g, "");
    }

    function normalizarTipoProdutoFiscal(valor){
        const texto = normalizar(valor);
        if(["fabricacao_propria", "fabricacaopropria", "fabricacao", "industrializado", "industria", "producao"].includes(texto)) return "FABRICACAO_PROPRIA";
        return "REVENDA";
    }

    function numero(valor){
        const texto = String(valor ?? "").trim();
        const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
        const convertido = Number(normalizado);
        return Number.isFinite(convertido) ? convertido : 0;
    }

    function lerJson(chave, fallback){
        try{
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? fallback;
        }catch{
            return fallback;
        }
    }
})();
