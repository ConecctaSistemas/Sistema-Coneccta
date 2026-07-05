(function(){
    const chaveBase = "base_Sistema";
    const chaveConfiguracoes = "configuracoesSistema";

    const configuracoesPadrao = {
        corSistema: "#1A436B",
        pdvCorTextos: "#0f172a",
        pdvCorBotoes: "#1A436B",
        tema: "claro",
        pdvTemaVenda: "claro",
        pdvCorVenda: "#00bcd4",
        pdvTemaPrevenda: "claro",
        pdvCorPrevenda: "#00bcd4",
        controleEstoque: true,
        bloquearVendaSemEstoque: false,
        alertaEstoqueMinimo: true,
        controleValidade: false,
        alertaValidadeDias: 30,
        solicitarQuantidadePdv: true,
        permitirDescontoPdv: true,
        precoLivrePdv: false,
        permitirGuardarVendas: true,
        permitirOrcamentoPdv: false,
        impressoraLargura: "80mm",
        pdvMensagens: "Seja Bem-Vindo(a)!!",
        exigirClienteVendaPrazo: true,
        financeiroMultaAtraso: 2,
        financeiroJurosMensais: 1,
        financeiroDiasCarencia: 0,
        emitirNfce: true,
        mostrarDashboard: true,
        backupAutomatico: false,
        usarVendedor: false,
        pdvSenhaNaoGerar: false,
        pdvSenhaHorarioReinicio: "",
        pdvMostrarBotoesAtalho: true,
        pdvItemDetalhado: true,
        pdvConsultarPorReferencia: true,
        pdvPesquisarComEnter: true,
        pdvExibirDetalhesSingleResult: true,
        pdvValorMaximoItem: 10000,
        pdvQtdMaximaVenda: 0,
        pdvNaoJuntarItens: false,
        pdvNaoJuntarItensBalanca: false,
        pdvNaoSolicitarQuantidade: false,
        pdvNaoManterConfigEmbalagem: false,
        pdvDesativarQtdPorPreco: false,
        pdvTabelaPreco: "padrao",
        pdvTrocaTabelaAtacado: true,
        pdvNaoSalvarPrecoVendaLivre: false,
        pdvPriorizarDesconto: "percentual",
        pdvDescontoMaximo: 5,
        pdvConsiderarDescontoPromocoes: false,
        pdvNaoAbrirPesquisaAuto: false,
        pdvQtdUltimasCompras: 5,
        pdvNaoSolicitarNaAbertura: false,
        pdvNaoObrigarVendedor: false,
        pdvNaoSolicitarNaAberturaPrevenda: false,
        pdvFormaPagamentoPadrao: "dinheiro",
        pdvRecebimentoPadrao: "por-cliente",
        pdvControlarFechamento: true,
        pdvFechamentoComPrevendas: true,
        pdvSangriaSaldoDinheiro: false,
        pdvIgnorarSaldoSangria: true,
        pdvMostrarQtdCancelamentos: false,
        pdvIgnorarPrevendasSemPagamento: true,
        pdvMaximoCaixa: 0,
        pdvTipoConferencia: "completa",
        pdvConversaoPeso: "real-para-moeda",
        pdvConversaoDolar: "real-para-moeda",
        pdvCotacaoPeso: 0,
        pdvCotacaoDolar: 0,
        pdvDddPadrao: "",
        pdvSolicitarMesa: false,
        pdvIncluirTaxaFrete: false,
        pdvNaoDeslogar: false,
        pdvTempoSessao: 60,
        pdvValorMaximoSemCpf: 0,
        pdvValorMaximoSemDest: 10000,
        pdvNaoSolicitarCpf: false,
        pdvPermitirLiberacaoRemota: true,
        pdvNfeHabilitarPrevendas: true,
        pdvNomePersonalizado: "Não fiscal",
        pdvDiasValidade: 1,
        pdvGerarPromissoria: true,
        pdvTefPosPixAtivado: true,
        pdvMotivoCancelamentoDesativado: false,
        pdvPagamentoParcialAtivado: true,
        pdvCashbackValorMinimo: 0,
        pdvCashbackPercentual: 0,
        pdvCashbackDiasExpiracao: 0,
        pdvCashbackTodosClientes: true,
        pdvCashbackNaoGerarPrevendas: false,
        pdvTicketRetiradaVenda: false,
        pdvTicketRetiradaPrevenda: false,
        licencaClienteId: "",
        licencaChave: "",
        licencaVencimentoEstimado: "",
        licencaStatus: "pendente",
        licencaUltimaValidacao: "",
        licencaPainelUrl: "https://painel.coneccta.com.br/licencas",
        fiscalCertificadoArquivo: "",
        fiscalCertificadoConteudo: "",
        fiscalCertificadoTamanho: "",
        fiscalCertificadoUploadEm: "",
        fiscalCertificadoSenha: "",
        fiscalCertificadoValidade: "",
        fiscalCertificadoCnpj: "",
        fiscalResponsavelTecnico: "",
        fiscalUf: "",
        fiscalAmbiente: "homologacao",
        fiscalRegimeTributario: "simplesNacional",
        fiscalCodigoRegimeTributario: "1",
        fiscalCodigoRegimeTributarioNfe: "1",
        fiscalPerfilFiscalPadrao: "Simples Nacional",
        fiscalCsosnPadrao: "102",
        fiscalCstIcmsPadrao: "",
        fiscalCstPisPadrao: "49",
        fiscalCstCofinsPadrao: "49",
        fiscalCstIpiPadrao: "99",
        fiscalOrigemMercadoriaPadrao: "0",
        fiscalCfopVendaEstadual: "5102",
        fiscalCfopVendaInterestadual: "6102",
        fiscalAliquotaIcmsPadrao: "0",
        fiscalAliquotaPisPadrao: "0",
        fiscalAliquotaCofinsPadrao: "0",
        fiscalCstIbsCbs: "000",
        fiscalClassificacaoIbsCbs: "01",
        fiscalDestacarIcms: "nao",
        fiscalDestacarPisCofins: "nao",
        fiscalPermitirCreditoIcms: "nao",
        fiscalInscricaoEstadual: "",
        fiscalCodigoMunicipio: "",
        fiscalCnae: "",
        fiscalPastaXml: "",
        fiscalSerieNfe: "1",
        fiscalProximoNfe: "1",
        fiscalSerieNfce: "1",
        fiscalProximoNfce: "1",
        fiscalIdCsc: "",
        fiscalCsc: "",
        fiscalModeloPadrao: "nfce",
        fiscalInformacoesComplementares: "",
        fiscalCalculoIbpt: "automatico",
        fiscalSomarIcmsDesoneradoTotalNfe: false,
        fiscalZerarBasesCalculoAliquotas: false,
        fiscalSomarIbsCbsNoIcms: false,
        fiscalIncluirIcmsBasePisCofins: false,
        fiscalEmailContabilidade: "",
        fiscalEnvioXmlAutomatico: "nao",
        fiscalDiaEnvioXmlAutomatico: "",
        fiscalWebserviceUrl: "",
        fiscalPixProvedor: "",
        fiscalPixChave: "",
        fiscalBoletoApiProvedor: "",
        fiscalBoletoApiUrl: "",
        fiscalBoletoApiToken: "",
        fiscalPosProvedor: "",
        fiscalTefSitefAtivo: "nao",
        fiscalTefSitefServidor: "",
        pedidosVendaHabilitado: true,
        pedidosVendaValidadeOrcamentoDias: 7,
        pedidosVendaReservaEstoqueModo: "nao_reserva",
        pedidosVendaImpressaoAutomatica: false,
        pedidosVendaPrefixo: "PED",
        pedidosVendaProximoNumero: 1,
        pedidosVendaPermitirEditarAposCaixa: false,
        pedidosVendaPermitirCancelarImportado: false,
        controleRemotoHabilitado: true
    };

    window.ConfiguracoesSistema = {
        obter: obterConfiguracoes,
        salvar: salvarConfiguracoes,
        sincronizarApi: sincronizarConfiguracoesApi,
        padrao: configuracoesPadrao,
        aplicarTema: aplicarTema
    };

    document.addEventListener("DOMContentLoaded", aplicarTema);
    window.addEventListener("storage", aplicarTema);
    window.addEventListener("configuracoesSistemaAtualizadas", aplicarTema);

    function obterConfiguracoes(){
        const base = lerJson(chaveBase, {});
        const configuracoesBase = base && typeof base.configuracoes === "object" ? base.configuracoes : {};
        const configuracoesAvulsas = lerJson(chaveConfiguracoes, {});

        const configuracoes = {
            ...configuracoesPadrao,
            ...configuracoesBase,
            ...configuracoesAvulsas
        };

        configuracoes.corSistema = normalizarCorSistema(configuracoes.corSistema);

        return configuracoes;
    }

    function salvarConfiguracoes(dados){
        const configuracoes = {
            ...configuracoesPadrao,
            ...obterConfiguracoes(),
            ...dados,
            atualizadoEm: new Date().toISOString()
        };
        const base = lerJson(chaveBase, {});
        base.configuracoes = configuracoes;

        localStorage.setItem(chaveBase, JSON.stringify(base));
        localStorage.setItem(chaveConfiguracoes, JSON.stringify(configuracoes));
        window.dispatchEvent(new CustomEvent("configuracoesSistemaAtualizadas", { detail: configuracoes }));
        sincronizarConfiguracoesApi(configuracoes, base);

        return configuracoes;
    }

    function sincronizarConfiguracoesApi(configuracoesInformadas, baseInformada){
        const core = window.SistemaCore;
        const configuracoes = configuracoesInformadas || obterConfiguracoes();
        const base = baseInformada || lerJson(chaveBase, {});

        if(!core?.dados?._modoApi || !core?.http?._baseUrl){
            return Promise.resolve(null);
        }

        base.configuracoes = configuracoes;

        return Promise.all([
            core.http.put("/configuracoes", configuracoes),
            core.http.put("/base", base)
        ]).catch(function(erro) {
            console.warn("[ConfiguracoesSistema] Falha ao sincronizar configuracoes com a API:", erro.message || erro);
            return null;
        });
    }

    function aplicarTema(){
        const configuracoes = obterConfiguracoes();
        const cor = configuracoes.corSistema || configuracoesPadrao.corSistema;
        const raiz = document.documentElement;

        raiz.style.setProperty("--cor-sistema", cor);
        raiz.style.setProperty("--cor-sistema-escura", escurecerCor(cor, 22));
        raiz.style.setProperty("--cor-sistema-clara", clarearCor(cor, 88));
        raiz.dataset.temaSistema = configuracoes.tema || "claro";
        injetarEstiloGlobal();
    }

    function injetarEstiloGlobal(){
        if(document.getElementById("temaSistemaGlobal")) return;

        const estilo = document.createElement("style");
        estilo.id = "temaSistemaGlobal";
        estilo.textContent = `
            .menu-superior-sistema,
            .btn-primary,
            .btn-secondary,
            .btn-finalizar,
            .btn-confirmar-venda,
            .btn-primario,
            .atalho-pdv,
            .atalho,
            .setor-tab.ativo,
            .aba-cadastro.ativa {
                border-color: var(--cor-sistema) !important;
            }

            .card:hover,
            .opcao-caixa-card:hover,
            .opcao-finalizacao.ativo {
                border-color: var(--cor-sistema) !important;
            }

            .grid-form input:focus,
            .grid-form select:focus,
            .grid-form textarea:focus,
            input:focus,
            select:focus,
            textarea:focus {
                border-color: var(--cor-sistema) !important;
                box-shadow: 0 0 0 3px color-mix(in srgb, var(--cor-sistema) 16%, transparent) !important;
            }

            :root[data-tema-sistema="escuro"] body {
                background:#1A436B !important;
                color: #e5e7eb !important;
            }

            :root[data-tema-sistema="escuro"] .card,
            :root[data-tema-sistema="escuro"] .painel,
            :root[data-tema-sistema="escuro"] .empresa-resumo,
            :root[data-tema-sistema="escuro"] .metric-card,
            :root[data-tema-sistema="escuro"] .secao-form,
            :root[data-tema-sistema="escuro"] .switch-card,
            :root[data-tema-sistema="escuro"] .left-panel,
            :root[data-tema-sistema="escuro"] .right-panel {
                background: #172033 !important;
                color: #e5e7eb !important;
                border-color: #334155 !important;
            }

            :root[data-tema-sistema="escuro"] h1,
            :root[data-tema-sistema="escuro"] h2,
            :root[data-tema-sistema="escuro"] h3,
            :root[data-tema-sistema="escuro"] strong,
            :root[data-tema-sistema="escuro"] label {
                color: #f8fafc !important;
            }

            :root[data-tema-sistema="escuro"] p,
            :root[data-tema-sistema="escuro"] span,
            :root[data-tema-sistema="escuro"] small,
            :root[data-tema-sistema="escuro"] td {
                color: #cbd5e1 !important;
            }

            :root[data-tema-sistema="escuro"] input,
            :root[data-tema-sistema="escuro"] select,
            :root[data-tema-sistema="escuro"] textarea {
                background: #0f172a !important;
                color: #f8fafc !important;
                border-color: #475569 !important;
            }
        `;
        document.head.appendChild(estilo);
    }

    function lerJson(chave, fallback){
        try{
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? fallback;
        }catch{
            return fallback;
        }
    }

    function normalizarCorSistema(cor){
        const valor = String(cor || "").trim().toLowerCase();
        const antigas = ["#12467d", "#123a78", "#2563eb", "#082a78", "#082041", "#0b66dd"];

        if(!valor || antigas.includes(valor)) return configuracoesPadrao.corSistema;

        return cor;
    }

    function escurecerCor(cor, percentual){
        return misturarCor(cor, "#000000", percentual);
    }

    function clarearCor(cor, percentual){
        return misturarCor(cor, "#ffffff", percentual);
    }

    function misturarCor(cor, mistura, percentual){
        const base = normalizarHex(cor);
        const alvo = normalizarHex(mistura);
        const fator = Math.max(0, Math.min(100, percentual)) / 100;
        const resultado = [0, 2, 4].map(function(posicao) {
            const origem = parseInt(base.slice(posicao, posicao + 2), 16);
            const destino = parseInt(alvo.slice(posicao, posicao + 2), 16);
            return Math.round(origem + (destino - origem) * fator).toString(16).padStart(2, "0");
        }).join("");

        return `#${resultado}`;
    }

    function normalizarHex(cor){
        const texto = String(cor || "").replace("#", "").trim();

        if(/^[0-9a-fA-F]{3}$/.test(texto)){
            return texto.split("").map(function(caractere) {
                return caractere + caractere;
            }).join("");
        }

        if(/^[0-9a-fA-F]{6}$/.test(texto)){
            return texto;
        }

        return configuracoesPadrao.corSistema.replace("#", "");
    }
})();
