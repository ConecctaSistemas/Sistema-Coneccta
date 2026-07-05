/* fiscal.js */
/* Extraido de manutencao.js (painel "Configurações Fiscais") para virar pagina propria. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    carregarConfiguracoesFiscaisNoFormulario();
    atualizarCamposTributariosPadrao();
    verificarAlertaCertificado();
    conectarFormularioFiscal();
    conectarSalvarFiscalCompleto();
    conectarAbasFiscais();
    document.getElementById("fiscalCertificadoUpload")?.focus({ preventScroll: true });
});

const regrasFiscaisPorRegime = {
        mei: {
            fiscalCodigoRegimeTributario: "4",
            fiscalCodigoRegimeTributarioNfe: "4",
            fiscalPerfilFiscalPadrao: "MEI",
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
            fiscalModeloPadrao: "nfce",
            fiscalInformacoesComplementares: "Documento emitido por Microempreendedor Individual - MEI."
        },
        simplesNacional: {
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
            fiscalModeloPadrao: "nfce",
            fiscalInformacoesComplementares: "Documento emitido por empresa optante pelo Simples Nacional."
        },
        presumido: {
            fiscalCodigoRegimeTributario: "3",
            fiscalCodigoRegimeTributarioNfe: "3",
            fiscalPerfilFiscalPadrao: "Lucro Presumido",
            fiscalCsosnPadrao: "",
            fiscalCstIcmsPadrao: "00",
            fiscalCstPisPadrao: "01",
            fiscalCstCofinsPadrao: "01",
            fiscalCstIpiPadrao: "99",
            fiscalOrigemMercadoriaPadrao: "0",
            fiscalCfopVendaEstadual: "5102",
            fiscalCfopVendaInterestadual: "6102",
            fiscalAliquotaIcmsPadrao: "18",
            fiscalAliquotaPisPadrao: "0.65",
            fiscalAliquotaCofinsPadrao: "3",
            fiscalCstIbsCbs: "000",
            fiscalClassificacaoIbsCbs: "01",
            fiscalDestacarIcms: "sim",
            fiscalDestacarPisCofins: "sim",
            fiscalPermitirCreditoIcms: "sim",
            fiscalModeloPadrao: "ambos",
            fiscalInformacoesComplementares: "Tributação conforme regime de Lucro Presumido."
        },
        real: {
            fiscalCodigoRegimeTributario: "3",
            fiscalCodigoRegimeTributarioNfe: "3",
            fiscalPerfilFiscalPadrao: "Lucro Real",
            fiscalCsosnPadrao: "",
            fiscalCstIcmsPadrao: "00",
            fiscalCstPisPadrao: "01",
            fiscalCstCofinsPadrao: "01",
            fiscalCstIpiPadrao: "99",
            fiscalOrigemMercadoriaPadrao: "0",
            fiscalCfopVendaEstadual: "5102",
            fiscalCfopVendaInterestadual: "6102",
            fiscalAliquotaIcmsPadrao: "18",
            fiscalAliquotaPisPadrao: "1.65",
            fiscalAliquotaCofinsPadrao: "7.6",
            fiscalCstIbsCbs: "000",
            fiscalClassificacaoIbsCbs: "01",
            fiscalDestacarIcms: "sim",
            fiscalDestacarPisCofins: "sim",
            fiscalPermitirCreditoIcms: "sim",
            fiscalModeloPadrao: "ambos",
            fiscalInformacoesComplementares: "Tributação conforme regime de Lucro Real."
        },
        simplesExcessoSubLimite: {
            fiscalCodigoRegimeTributario: "2",
            fiscalCodigoRegimeTributarioNfe: "2",
            fiscalPerfilFiscalPadrao: "Simples Excesso Sublimite",
            fiscalCsosnPadrao: "",
            fiscalCstIcmsPadrao: "00",
            fiscalCstPisPadrao: "49",
            fiscalCstCofinsPadrao: "49",
            fiscalCstIpiPadrao: "99",
            fiscalOrigemMercadoriaPadrao: "0",
            fiscalCfopVendaEstadual: "5102",
            fiscalCfopVendaInterestadual: "6102",
            fiscalAliquotaIcmsPadrao: "18",
            fiscalAliquotaPisPadrao: "0",
            fiscalAliquotaCofinsPadrao: "0",
            fiscalCstIbsCbs: "000",
            fiscalClassificacaoIbsCbs: "01",
            fiscalDestacarIcms: "sim",
            fiscalDestacarPisCofins: "nao",
            fiscalPermitirCreditoIcms: "sim",
            fiscalModeloPadrao: "ambos",
            fiscalInformacoesComplementares: "Simples Nacional com excesso de sublimite: ICMS tratado conforme regime normal."
        },
        meiEmissaoFiscal: {
            fiscalCodigoRegimeTributario: "4",
            fiscalCodigoRegimeTributarioNfe: "4",
            fiscalPerfilFiscalPadrao: "MEI - Emissão Fiscal",
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
            fiscalModeloPadrao: "nfe",
            fiscalInformacoesComplementares: "MEI habilitado para emissão fiscal. Operação sem destaque de ICMS, PIS e COFINS."
        }
    };

function carregarConfiguracoesFiscaisNoFormulario(){
        const formulario = document.getElementById("formConfiguracoesFiscais");
        const configuracoes = window.ConfiguracoesSistema?.obter();

        if(!formulario || !configuracoes) return;

        Object.keys(coletarPadraoFiscal()).forEach(function(campo) {
            const elemento = formulario.elements[campo];
            if(elemento){
                if(elemento.type === "checkbox"){
                    elemento.checked = Boolean(configuracoes[campo]);
                }else{
                    elemento.value = configuracoes[campo] ?? "";
                }
            }
        });

        atualizarResumoCertificado(configuracoes);
        atualizarResumoRegraFiscal(configuracoes);
        atualizarCampoDiaEnvioXml();
        mostrarStatus("statusConfiguracoesFiscais", configuracoes.atualizadoEm ? "Configurações fiscais carregadas." : "Configurações fiscais padrão.");
    }

function conectarFormularioFiscal(){
        const formulario = document.getElementById("formConfiguracoesFiscais");

        document.getElementById("fiscalCertificadoUpload")?.addEventListener("change", processarUploadCertificado);
        document.getElementById("btnRemoverCertificado")?.addEventListener("click", removerCertificadoAtual);
        document.getElementById("fiscalCertificadoSenha")?.addEventListener("input", function() {
            this.setCustomValidity("");
        });
        document.getElementById("fiscalEnvioXmlAutomatico")?.addEventListener("change", atualizarCampoDiaEnvioXml);
        document.getElementById("fiscalRegimeTributario")?.addEventListener("change", function() {
            aplicarRegraFiscalPorRegime(this.value, formulario, true);
            atualizarCamposTributariosPadrao();
        });

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            if(!validarCertificadoAntesDeSalvar(formulario)) return;

            const dados = {
                ...regrasFiscaisPorRegime[formulario.elements.fiscalRegimeTributario?.value],
                ...coletarDadosFormulario(formulario)
            };
            [
                "fiscalSomarIcmsDesoneradoTotalNfe",
                "fiscalZerarBasesCalculoAliquotas",
                "fiscalSomarIbsCbsNoIcms",
                "fiscalIncluirIcmsBasePisCofins"
            ].forEach(function(campo) {
                dados[campo] = Boolean(formulario.elements[campo]?.checked);
            });
            dados.fiscalCertificadoCnpj = "";
            dados.fiscalResponsavelTecnico = "";
            if(dados.fiscalEnvioXmlAutomatico !== "sim"){
                dados.fiscalDiaEnvioXmlAutomatico = "";
            }
            window.ConfiguracoesSistema.salvar(dados);
            mostrarStatus("statusConfiguracoesFiscais", "Configurações fiscais salvas.");
            atualizarResumoCertificado(dados);
            verificarAlertaCertificado(dados);
        });

        document.getElementById("btnRestaurarFiscais")?.addEventListener("click", function() {
            const padraoFiscal = {
                ...coletarPadraoFiscal(),
                ...regrasFiscaisPorRegime.simplesNacional
            };
            window.ConfiguracoesSistema.salvar(padraoFiscal);
            carregarConfiguracoesFiscaisNoFormulario();
            mostrarStatus("statusConfiguracoesFiscais", "Padrão fiscal restaurado.");
        });
    }

function conectarFormularioRegrasFiscais(){
        const formulario = document.getElementById("formRegrasFiscais");
        if(!formulario) return;

        formulario.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const regras = coletarRegrasFiscaisFormulario(formulario);
            window.RegrasFiscaisSistema?.salvar(regras);
            carregarRegrasFiscaisNoFormulario();
            mostrarStatus("statusConfiguracoesFiscais", "Automação fiscal salva.");
        });

        document.getElementById("btnAdicionarRegraFiscal")?.addEventListener("click", function() {
            adicionarLinhaRegraFiscal();
        });
    }

function conectarSalvarFiscalCompleto(){
        document.getElementById("btnSalvarFiscalCompleto")?.addEventListener("click", function() {
            const formularioFiscal = document.getElementById("formConfiguracoesFiscais");
            if(!validarCertificadoAntesDeSalvar(formularioFiscal)) return;

            const configuracoes = salvarConfiguracoesFiscaisFormulario(formularioFiscal);
            atualizarResumoCertificado(configuracoes);
            verificarAlertaCertificado(configuracoes);
            mostrarStatus("statusConfiguracoesFiscais", "Configurações fiscais salvas.");
            setTimeout(function() {
                window.location.href = "telas/configuracoes/manutenção.html";
            }, 450);
        });
    }

function conectarAbasFiscais(){
        prepararConteudosAbasFiscais();

        document.querySelectorAll("[data-fiscal-aba-botao]").forEach(function(botao) {
            botao.addEventListener("click", function() {
                abrirAbaFiscal(botao.dataset.fiscalAbaBotao);
            });
        });

        abrirAbaFiscal("tributacao");
    }

function prepararConteudosAbasFiscais(){
        const formularioFiscal = document.getElementById("formConfiguracoesFiscais");

        formularioFiscal?.querySelectorAll(":scope > .secao-form, :scope > details.secao-form").forEach(function(secao) {
            secao.classList.add("fiscal-aba-conteudo");

            if(secao.dataset.fiscalAba) return;

            const texto = normalizarTextoFiscal(secao.querySelector("h3, summary")?.textContent || "");

            if(secao.querySelector("#fiscalCertificadoUpload") || texto.includes("certificado")){
                secao.dataset.fiscalAba = "certificado";
            }else if(secao.querySelector("#fiscalRegimeTributario") || texto.includes("parametros")){
                secao.dataset.fiscalAba = "tributacao";
            }else if(secao.querySelector("#fiscalCalculoIbpt") || texto.includes("calculos")){
                secao.dataset.fiscalAba = "avancado";
            }else if(secao.querySelector("#fiscalSerieNfe, #fiscalEmailContabilidade") || texto.includes("nf-e") || texto.includes("nfc-e") || texto.includes("contabilidade")){
                secao.dataset.fiscalAba = "notas";
            }else{
                secao.dataset.fiscalAba = "avancado";
            }
        });

        const regras = document.getElementById("formRegrasFiscais");
        if(regras){
            regras.classList.add("fiscal-aba-conteudo");
            regras.dataset.fiscalAba = "tributacao";
        }
    }

function abrirAbaFiscal(aba){
        document.querySelectorAll("[data-fiscal-aba-botao]").forEach(function(botao) {
            botao.classList.toggle("ativa", botao.dataset.fiscalAbaBotao === aba);
        });

        document.querySelectorAll(".fiscal-aba-conteudo").forEach(function(secao) {
            const ativa = secao.dataset.fiscalAba === aba;
            secao.hidden = !ativa;
            secao.classList.toggle("ativa", ativa);

            if(ativa && secao.tagName === "DETAILS"){
                secao.open = true;
            }
        });
    }

function normalizarTextoFiscal(valor){
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

function salvarConfiguracoesFiscaisFormulario(formulario){
        if(!formulario) return {};
        if(!validarCertificadoAntesDeSalvar(formulario)) return {};

        const dados = {
            ...regrasFiscaisPorRegime[formulario.elements.fiscalRegimeTributario?.value],
            ...coletarDadosFormulario(formulario)
        };
        [
            "fiscalSomarIcmsDesoneradoTotalNfe",
            "fiscalZerarBasesCalculoAliquotas",
            "fiscalSomarIbsCbsNoIcms",
            "fiscalIncluirIcmsBasePisCofins"
        ].forEach(function(campo) {
            dados[campo] = Boolean(formulario.elements[campo]?.checked);
        });

        if(dados.fiscalEnvioXmlAutomatico !== "sim"){
            dados.fiscalDiaEnvioXmlAutomatico = "";
        }

        dados.fiscalCertificadoCnpj = "";
        dados.fiscalResponsavelTecnico = "";
        window.ConfiguracoesSistema.salvar(dados);
        return dados;
    }

function salvarRegrasFiscaisFormulario(){
        const formulario = document.getElementById("formRegrasFiscais");
        if(!formulario) return null;

        const regras = coletarRegrasFiscaisFormulario(formulario);
        window.RegrasFiscaisSistema?.salvar(regras);
        return regras;
    }

function atualizarCampoDiaEnvioXml(){
        const envioAutomatico = document.getElementById("fiscalEnvioXmlAutomatico")?.value === "sim";
        const campo = document.getElementById("campoDiaEnvioXmlAutomatico");
        const input = document.getElementById("fiscalDiaEnvioXmlAutomatico");

        if(!campo || !input) return;

        campo.hidden = !envioAutomatico;
        input.disabled = !envioAutomatico;

        if(!envioAutomatico){
            input.value = "";
        }
    }

function carregarRegrasFiscaisNoFormulario(){
        const formulario = document.getElementById("formRegrasFiscais");
        const regras = window.RegrasFiscaisSistema?.obter();
        if(!formulario || !regras) return;

        renderizarLinhasRegrasFiscais(regras.regrasOperacionais || []);
        atualizarResumoRegrasFiscais(regras);
        return;

        definirCampo(formulario, "regraAtiva", regras.regraAtiva);
        definirCampo(formulario, "cfopNfceVendaBalcaoEstadual", regras.cfopNfceVendaBalcaoEstadual);
        definirCampo(formulario, "cfopNfceVendaBalcaoInterestadual", regras.cfopNfceVendaBalcaoInterestadual);
        definirCampo(formulario, "cfopProducaoPropriaEstadual", regras.cfopProducaoPropriaEstadual);
        definirCampo(formulario, "cfopProducaoPropriaInterestadual", regras.cfopProducaoPropriaInterestadual);
        definirCampo(formulario, "cfopDevolucaoClienteEstadual", regras.cfopDevolucaoClienteEstadual);
        definirCampo(formulario, "cfopDevolucaoClienteInterestadual", regras.cfopDevolucaoClienteInterestadual);
        definirCampo(formulario, "cfopConsumidorFinal", regras.cfopConsumidorFinal);
        definirCampo(formulario, "nfeConsumidorFinalIndicadorIe", regras.nfeConsumidorFinalIndicadorIe);
        definirCampo(formulario, "nfeConsumidorFinalPresenca", regras.nfeConsumidorFinalPresenca);
        definirCampo(formulario, "nfeRevendaIndicadorIe", regras.nfeRevendaIndicadorIe);
        definirCampo(formulario, "nfeDevolucaoFinalidade", regras.nfeDevolucaoFinalidade);
        definirCampo(formulario, "nfceModelo", regras.nfceModelo);
        definirCampo(formulario, "nfceTipoEmissao", regras.nfceTipoEmissao);
        definirCampo(formulario, "nfceConsumidorFinal", regras.nfceConsumidorFinal);
        definirCampo(formulario, "nfcePresenca", regras.nfcePresenca);
        definirCampo(formulario, "categoriasSt", regras.categoriasSt);
        definirCampo(formulario, "categoriasMonofasicas", regras.categoriasMonofasicas);
        definirCampo(formulario, "ncmsMonofasicos", regras.ncmsMonofasicos);

        const simples = regras.regrasPadrao?.simplesTributado || {};
        const st = regras.regrasPadrao?.substituicaoTributaria || {};
        const monofasico = regras.regrasPadrao?.monofasico || {};
        definirCampo(formulario, "simplesCsosn", simples.csosn);
        definirCampo(formulario, "stCsosn", st.csosn);
        definirCampo(formulario, "cstPisPadrao", simples.cstPis);
        definirCampo(formulario, "cstCofinsPadrao", simples.cstCofins);
        definirCampo(formulario, "cstPisMonofasico", monofasico.cstPis);
        definirCampo(formulario, "cstCofinsMonofasico", monofasico.cstCofins);
        definirCampo(formulario, "aliquotaIcms", simples.aliquotaIcms);
        definirCampo(formulario, "aliquotaPis", simples.aliquotaPis);
        definirCampo(formulario, "aliquotaCofins", simples.aliquotaCofins);
        definirCampo(formulario, "aliquotaIpi", simples.aliquotaIpi);
        atualizarResumoRegrasFiscais(regras);
    }

function coletarRegrasFiscaisFormulario(formulario){
        const atual = window.RegrasFiscaisSistema?.obter() || {};
        const regimesVisiveis = regimesVisiveisRegrasFiscais();
        const regrasVisiveis = coletarLinhasRegrasFiscais();
        const regrasPreservadas = Array.isArray(atual.regrasOperacionais)
            ? atual.regrasOperacionais.filter(function(regra) {
                return !regimesVisiveis.includes(regra.regime);
            })
            : [];
        return {
            ...atual,
            regrasOperacionais: regrasPreservadas.concat(regrasVisiveis)
        };

        const simples = { ...(atual.regrasPadrao?.simplesTributado || {}) };
        const st = { ...(atual.regrasPadrao?.substituicaoTributaria || {}) };
        const monofasico = { ...(atual.regrasPadrao?.monofasico || {}) };
        const regimeNormal = { ...(atual.regrasPadrao?.regimeNormal || {}) };

        simples.csosn = valorFormulario(formulario, "simplesCsosn");
        simples.cstPis = valorFormulario(formulario, "cstPisPadrao");
        simples.cstCofins = valorFormulario(formulario, "cstCofinsPadrao");
        simples.aliquotaIcms = valorFormulario(formulario, "aliquotaIcms");
        simples.aliquotaPis = valorFormulario(formulario, "aliquotaPis");
        simples.aliquotaCofins = valorFormulario(formulario, "aliquotaCofins");
        simples.aliquotaIpi = valorFormulario(formulario, "aliquotaIpi");
        st.csosn = valorFormulario(formulario, "stCsosn");
        st.cstPis = simples.cstPis;
        st.cstCofins = simples.cstCofins;
        st.aliquotaIcms = "0";
        monofasico.cstPis = valorFormulario(formulario, "cstPisMonofasico");
        monofasico.cstCofins = valorFormulario(formulario, "cstCofinsMonofasico");
        monofasico.aliquotaIcms = simples.aliquotaIcms;
        regimeNormal.aliquotaIcms = simples.aliquotaIcms;

        return {
            ...atual,
            regraAtiva: valorFormulario(formulario, "regraAtiva"),
            cfopNfceVendaBalcaoEstadual: valorFormulario(formulario, "cfopNfceVendaBalcaoEstadual"),
            cfopNfceVendaBalcaoInterestadual: valorFormulario(formulario, "cfopNfceVendaBalcaoInterestadual"),
            cfopProducaoPropriaEstadual: valorFormulario(formulario, "cfopProducaoPropriaEstadual"),
            cfopProducaoPropriaInterestadual: valorFormulario(formulario, "cfopProducaoPropriaInterestadual"),
            cfopDevolucaoClienteEstadual: valorFormulario(formulario, "cfopDevolucaoClienteEstadual"),
            cfopDevolucaoClienteInterestadual: valorFormulario(formulario, "cfopDevolucaoClienteInterestadual"),
            cfopConsumidorFinal: valorFormulario(formulario, "cfopConsumidorFinal"),
            nfeConsumidorFinalIndicadorIe: valorFormulario(formulario, "nfeConsumidorFinalIndicadorIe"),
            nfeConsumidorFinalPresenca: valorFormulario(formulario, "nfeConsumidorFinalPresenca"),
            nfeRevendaIndicadorIe: valorFormulario(formulario, "nfeRevendaIndicadorIe"),
            nfeDevolucaoFinalidade: valorFormulario(formulario, "nfeDevolucaoFinalidade"),
            nfceModelo: valorFormulario(formulario, "nfceModelo"),
            nfceTipoEmissao: valorFormulario(formulario, "nfceTipoEmissao"),
            nfceConsumidorFinal: valorFormulario(formulario, "nfceConsumidorFinal"),
            nfcePresenca: valorFormulario(formulario, "nfcePresenca"),
            categoriasSt: valorFormulario(formulario, "categoriasSt"),
            categoriasMonofasicas: valorFormulario(formulario, "categoriasMonofasicas"),
            ncmsMonofasicos: valorFormulario(formulario, "ncmsMonofasicos"),
            regrasPadrao: {
                simplesTributado: simples,
                substituicaoTributaria: st,
                monofasico,
                regimeNormal
            }
        };
    }

function atualizarResumoRegrasFiscais(regras){
        const resumo = document.getElementById("regrasFiscaisResumo");
        if(!resumo) return;

        const regimesVisiveis = regimesVisiveisRegrasFiscais();
        const quantidade = Array.isArray(regras.regrasOperacionais)
            ? regras.regrasOperacionais.filter(function(regra) {
                return regimesVisiveis.includes(regra.regime);
            }).length
            : 0;
        resumo.innerHTML = [
            `<strong>${quantidade} regra(s) para ${escaparHtml(regimesVisiveis.join(", "))}</strong>`,
            "<span>Na emissão, operação + destino definem automaticamente CFOP e CST/CSOSN do regime atual.</span>"
        ].join("");
        mostrarStatus("statusConfiguracoesFiscais", "Configurações fiscais carregadas.");
        return;
        resumo.innerHTML = `
            <strong>${quantidade} regra(s) fiscal(is) cadastrada(s)</strong>
            <span>Na emissão, operação + destino + regime definem automaticamente CFOP e CST/CSOSN.</span>
        `;
        mostrarStatus("statusConfiguracoesFiscais", "Configurações fiscais carregadas.");
        return;

        const regra = regras.regrasPadrao?.[regras.regraAtiva] || regras.regrasPadrao?.simplesTributado || {};
        resumo.innerHTML = `
            <strong>${regra.nome || "Regra fiscal padrão"}</strong>
            <span>CSOSN ${regra.csosn || "-"} | PIS ${regra.cstPis || "-"} | COFINS ${regra.cstCofins || "-"} | CFOP NFC-e ${regras.cfopNfceVendaBalcaoEstadual || "5102"}.</span>
        `;
        mostrarStatus("statusConfiguracoesFiscais", "Configurações fiscais carregadas.");
    }

function renderizarLinhasRegrasFiscais(regras){
        const destino = document.getElementById("listaRegrasFiscais");
        if(!destino) return;

        const regimesVisiveis = regimesVisiveisRegrasFiscais();
        const todasLinhas = Array.isArray(regras) && regras.length ? regras : regrasFiscaisBasicas();
        const linhasFiltradas = todasLinhas.filter(function(regra) {
            return regimesVisiveis.includes(regra.regime);
        });
        const linhas = linhasFiltradas.length ? linhasFiltradas : regrasFiscaisBasicasPorRegime(regimesVisiveis);
        destino.innerHTML = "";
        linhas.forEach(function(regra) {
            adicionarLinhaRegraFiscal(regra);
        });
    }

function adicionarLinhaRegraFiscal(regra = {}){
        const destino = document.getElementById("listaRegrasFiscais");
        if(!destino) return;

        const regimePadrao = regimesVisiveisRegrasFiscais()[0] || "Simples";
        regra.regime = regra.regime || regimePadrao;

        const linha = document.createElement("tr");
        linha.className = "linha-regra-fiscal";
        linha.innerHTML = `
            <td>
                <select data-regra-campo="operacao">
                    ${opcaoRegra("Entrada", regra.operacao)}
                    ${opcaoRegra("Venda", regra.operacao)}
                    ${opcaoRegra("Devolução", regra.operacao)}
                    ${opcaoRegra("Devolução de Compra", regra.operacao)}
                    ${opcaoRegra("Devolução de Venda", regra.operacao)}
                    ${opcaoRegra("Transferência", regra.operacao)}
                    ${opcaoRegra("Remessa", regra.operacao)}
                    ${opcaoRegra("Bonificação", regra.operacao)}
                    ${opcaoRegra("Exportação", regra.operacao)}
                </select>
            </td>
            <td>
                <select data-regra-campo="destino">
                    ${opcaoRegra("Mesmo Estado", regra.destino)}
                    ${opcaoRegra("Outro Estado", regra.destino)}
                </select>
            </td>
            <td>
                <select data-regra-campo="regime">
                    ${opcoesRegimeFiscal(regra.regime)}
                </select>
            </td>
            <td><select data-regra-campo="cfop">${opcoesCfopFiscal(regra.cfop)}</select></td>
            <td><select data-regra-campo="cstCsosn">${opcoesCstCsosn(regra.cstCsosn || regra.csosn || regra.cst, regra.regime)}</select></td>
            <td><button type="button" class="btn-remover-regra-fiscal" aria-label="Remover regra">�</button></td>
        `;
        linha.querySelector('[data-regra-campo="regime"]')?.addEventListener("change", function() {
            atualizarSituacaoTributariaLinha(linha);
        });
        linha.querySelector(".btn-remover-regra-fiscal")?.addEventListener("click", function() {
            if(destino.querySelectorAll("tr").length > 1){
                linha.remove();
            }
        });
        destino.appendChild(linha);
    }

function coletarLinhasRegrasFiscais(){
        return Array.from(document.querySelectorAll("#listaRegrasFiscais tr")).map(function(linha) {
            return {
                operacao: valorLinhaRegra(linha, "operacao"),
                destino: valorLinhaRegra(linha, "destino"),
                regime: valorLinhaRegra(linha, "regime"),
                cfop: valorLinhaRegra(linha, "cfop"),
                cstCsosn: valorLinhaRegra(linha, "cstCsosn")
            };
        }).filter(function(regra) {
            return regra.operacao && regra.destino && regra.regime && regra.cfop && regra.cstCsosn;
        });
    }

function regimesVisiveisRegrasFiscais(){
        const regimeConfigurado = document.getElementById("fiscalRegimeTributario")?.value || "simplesNacional";
        const mapa = {
            mei: ["MEI"],
            meiEmissaoFiscal: ["MEI"],
            simplesNacional: ["Simples"],
            simplesExcessoSubLimite: ["Presumido"],
            presumido: ["Presumido"],
            real: ["Real"]
        };

        return mapa[regimeConfigurado] || ["Simples"];
    }

function atualizarSituacaoTributariaLinha(linha){
        const select = linha.querySelector('[data-regra-campo="cstCsosn"]');
        const regime = valorLinhaRegra(linha, "regime");

        if(select){
            select.innerHTML = opcoesCstCsosn("", regime);
        }
    }

function valorLinhaRegra(linha, campo){
        return String(linha.querySelector(`[data-regra-campo="${campo}"]`)?.value || "").trim();
    }

function opcaoRegra(valor, atual){
        return `<option value="${escaparHtml(valor)}"${valor === atual ? " selected" : ""}>${escaparHtml(valor)}</option>`;
    }

function opcoesRegimeFiscal(atual){
        const regimes = regimesVisiveisRegrasFiscais();
        const selecionado = regimes.includes(atual) ? atual : regimes[0];

        return regimes.map(function(regime) {
            return opcaoRegra(regime, selecionado);
        }).join("");
    }

function opcoesCfopFiscal(atual){
        const cfops = window.RegrasFiscaisSistema?.cfops || [];
        const atualNormalizado = String(atual || "");
        const opcoes = cfops.map(function(cfop) {
            const texto = `${cfop.codigo} - ${cfop.descricao}`;
            return `<option value="${escaparHtml(cfop.codigo)}"${cfop.codigo === atualNormalizado ? " selected" : ""}>${escaparHtml(texto)}</option>`;
        });

        if(atualNormalizado && !cfops.some(function(cfop) { return cfop.codigo === atualNormalizado; })){
            opcoes.unshift(`<option value="${escaparHtml(atualNormalizado)}" selected>${escaparHtml(atualNormalizado)} - CFOP cadastrado</option>`);
        }

        return opcoes.join("");
    }

function opcoesCstCsosn(atual, regime){
        const catalogo = window.RegrasFiscaisSistema?.situacoesTributarias || {};
        const regimeSimples = ["MEI", "Simples"].includes(regime);
        const grupos = regimeSimples
            ? [{ nome: "CSOSN - Simples Nacional", itens: catalogo.csosn || [] }]
            : [{ nome: "CST ICMS - Regime Normal", itens: catalogo.cstIcms || [] }];
        const atualNormalizado = String(atual || "");
        const opcoes = [];
        let encontrado = false;

        grupos.forEach(function(grupo) {
            opcoes.push(`<optgroup label="${escaparHtml(grupo.nome)}">`);
            grupo.itens.forEach(function(item) {
                const selecionado = item.codigo === atualNormalizado;
                if(selecionado) encontrado = true;
                opcoes.push(`<option value="${escaparHtml(item.codigo)}"${selecionado ? " selected" : ""}>${escaparHtml(item.codigo + " - " + item.descricao)}</option>`);
            });
            opcoes.push("</optgroup>");
        });

        return opcoes.join("");
    }

function regrasFiscaisBasicas(){
        return [
            { operacao: "Venda", destino: "Mesmo Estado", regime: "Simples", cfop: "5102", cstCsosn: "102" },
            { operacao: "Venda", destino: "Outro Estado", regime: "Simples", cfop: "6102", cstCsosn: "102" },
            { operacao: "Devolução", destino: "Mesmo Estado", regime: "Simples", cfop: "1202", cstCsosn: "900" },
            { operacao: "Devolução", destino: "Outro Estado", regime: "Simples", cfop: "2202", cstCsosn: "900" }
        ];
    }

function regrasFiscaisBasicasPorRegime(regimes){
        const modelos = {
            MEI: [
                { operacao: "Venda", destino: "Mesmo Estado", regime: "MEI", cfop: "5102", cstCsosn: "102" },
                { operacao: "Venda", destino: "Outro Estado", regime: "MEI", cfop: "6102", cstCsosn: "102" },
                { operacao: "Devolução", destino: "Mesmo Estado", regime: "MEI", cfop: "1202", cstCsosn: "900" },
                { operacao: "Devolução", destino: "Outro Estado", regime: "MEI", cfop: "2202", cstCsosn: "900" }
            ],
            Simples: [
                { operacao: "Venda", destino: "Mesmo Estado", regime: "Simples", cfop: "5102", cstCsosn: "102" },
                { operacao: "Venda", destino: "Outro Estado", regime: "Simples", cfop: "6102", cstCsosn: "102" },
                { operacao: "Devolução", destino: "Mesmo Estado", regime: "Simples", cfop: "1202", cstCsosn: "900" },
                { operacao: "Devolução", destino: "Outro Estado", regime: "Simples", cfop: "2202", cstCsosn: "900" }
            ],
            Presumido: [
                { operacao: "Venda", destino: "Mesmo Estado", regime: "Presumido", cfop: "5102", cstCsosn: "00" },
                { operacao: "Venda", destino: "Outro Estado", regime: "Presumido", cfop: "6102", cstCsosn: "00" },
                { operacao: "Devolução", destino: "Mesmo Estado", regime: "Presumido", cfop: "1202", cstCsosn: "90" },
                { operacao: "Devolução", destino: "Outro Estado", regime: "Presumido", cfop: "2202", cstCsosn: "90" }
            ],
            Real: [
                { operacao: "Venda", destino: "Mesmo Estado", regime: "Real", cfop: "5102", cstCsosn: "00" },
                { operacao: "Venda", destino: "Outro Estado", regime: "Real", cfop: "6102", cstCsosn: "00" },
                { operacao: "Devolução", destino: "Mesmo Estado", regime: "Real", cfop: "1202", cstCsosn: "90" },
                { operacao: "Devolução", destino: "Outro Estado", regime: "Real", cfop: "2202", cstCsosn: "90" }
            ]
        };

        return regimes.flatMap(function(regime) {
            return modelos[regime] || [];
        });
    }

function definirCampo(formulario, nome, valor){
        if(formulario.elements[nome]){
            formulario.elements[nome].value = valor ?? "";
        }
    }

function valorFormulario(formulario, nome){
        return String(formulario.elements[nome]?.value || "").trim();
    }

async function processarUploadCertificado(evento){
        const arquivo = evento.target.files?.[0];
        const formulario = document.getElementById("formConfiguracoesFiscais");

        if(!arquivo || !formulario) return;

        const buffer = await arquivo.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const validade = extrairValidadeCertificado(bytes);

        formulario.elements.fiscalCertificadoArquivo.value = arquivo.name;
        formulario.elements.fiscalCertificadoTamanho.value = String(arquivo.size);
        formulario.elements.fiscalCertificadoUploadEm.value = new Date().toISOString();
        formulario.elements.fiscalCertificadoConteudo.value = bytesParaBase64(bytes);
        formulario.elements.fiscalCertificadoSenha.value = "";
        atualizarNomeCertificadoUpload(arquivo.name);

        if(validade){
            formulario.elements.fiscalCertificadoValidade.value = validade;
            mostrarStatus("statusConfiguracoesFiscais", "Certificado carregado. Informe a senha para salvar.");
        }else{
            formulario.elements.fiscalCertificadoValidade.value = "";
            mostrarStatus("statusConfiguracoesFiscais", "Certificado carregado. Informe a senha para salvar.");
        }

        const dados = coletarDadosFormulario(formulario);
        dados.fiscalCertificadoCnpj = "";
        dados.fiscalResponsavelTecnico = "";
        atualizarResumoCertificado(dados);
        verificarAlertaCertificado(dados);
        formulario.elements.fiscalCertificadoSenha.focus();
    }

function removerCertificadoAtual(){
        const formulario = document.getElementById("formConfiguracoesFiscais");
        if(!formulario) return;

        [
            "fiscalCertificadoArquivo",
            "fiscalCertificadoConteudo",
            "fiscalCertificadoTamanho",
            "fiscalCertificadoUploadEm",
            "fiscalCertificadoValidade",
            "fiscalCertificadoSenha"
        ].forEach(function(campo) {
            if(formulario.elements[campo]){
                formulario.elements[campo].value = "";
            }
        });

        const upload = document.getElementById("fiscalCertificadoUpload");
        if(upload){
            upload.value = "";
        }

        const dados = coletarDadosFormulario(formulario);
        dados.fiscalCertificadoCnpj = "";
        dados.fiscalResponsavelTecnico = "";
        window.ConfiguracoesSistema?.salvar(dados);
        atualizarResumoCertificado(dados);
        verificarAlertaCertificado(dados);
        mostrarStatus("statusConfiguracoesFiscais", "Certificado removido.");
    }

function validarCertificadoAntesDeSalvar(formulario){
        if(!formulario) return true;

        const arquivo = valorFormulario(formulario, "fiscalCertificadoArquivo");
        const conteudo = valorFormulario(formulario, "fiscalCertificadoConteudo");
        const senha = formulario.elements.fiscalCertificadoSenha;
        const possuiCertificado = Boolean(arquivo || conteudo);

        if(!senha) return true;

        if(possuiCertificado && !senha.value.trim()){
            senha.setCustomValidity("Informe a senha do certificado A1 antes de salvar.");
            abrirAbaFiscal("certificado");
            mostrarStatus("statusConfiguracoesFiscais", "Informe a senha do certificado para salvar.");
            senha.reportValidity();
            senha.focus();
            return false;
        }

        senha.setCustomValidity("");
        return true;
    }

function bytesParaBase64(bytes){
        let binario = "";
        const tamanhoBloco = 0x8000;

        for(let indice = 0; indice < bytes.length; indice += tamanhoBloco){
            binario += String.fromCharCode(...bytes.subarray(indice, indice + tamanhoBloco));
        }

        return btoa(binario);
    }

function extrairValidadeCertificado(bytes){
        const datas = [];

        for(let indice = 0; indice < bytes.length - 16; indice += 1){
            const tag = bytes[indice];
            const tamanho = bytes[indice + 1];

            if(tag === 0x17 && (tamanho === 13 || tamanho === 15)){
                const data = parseDataAsn1(bytes, indice + 2, tamanho, "utc");
                if(data) datas.push(data);
            }

            if(tag === 0x18 && tamanho >= 15 && tamanho <= 17){
                const data = parseDataAsn1(bytes, indice + 2, tamanho, "generalized");
                if(data) datas.push(data);
            }
        }

        const hoje = new Date();
        const limite = new Date();
        limite.setFullYear(limite.getFullYear() + 10);

        const futuras = datas
            .filter(function(data) {
                return data > hoje && data < limite;
            })
            .sort(function(a, b) {
                return b - a;
            });

        return futuras[0] ? futuras[0].toISOString().slice(0, 10) : "";
    }

function parseDataAsn1(bytes, inicio, tamanho, tipo){
        const texto = Array.from(bytes.subarray(inicio, inicio + tamanho))
            .map(function(byte) {
                return String.fromCharCode(byte);
            })
            .join("");

        const limpo = texto.replace(/\0/g, "");

        if(tipo === "utc"){
            const match = limpo.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z?$/);
            if(!match) return null;
            const anoCurto = Number(match[1]);
            const ano = anoCurto >= 50 ? 1900 + anoCurto : 2000 + anoCurto;
            return criarDataUtc(ano, match[2], match[3], match[4], match[5], match[6]);
        }

        const match = limpo.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z?$/);
        if(!match) return null;
        return criarDataUtc(Number(match[1]), match[2], match[3], match[4], match[5], match[6]);
    }

function criarDataUtc(ano, mes, dia, hora, minuto, segundo){
        const data = new Date(Date.UTC(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(hora),
            Number(minuto),
            Number(segundo)
        ));

        return Number.isNaN(data.getTime()) ? null : data;
    }

function atualizarResumoCertificado(configuracoes){
        const resumo = document.getElementById("certificadoResumo");

        if(!resumo) return;

        const nome = configuracoes?.fiscalCertificadoArquivo || "";
        atualizarNomeCertificadoUpload(nome);
        const validade = configuracoes?.fiscalCertificadoValidade
            ? new Date(`${configuracoes.fiscalCertificadoValidade}T00:00:00`).toLocaleDateString("pt-BR")
            : "validade não identificada";
        const upload = configuracoes?.fiscalCertificadoUploadEm
            ? new Date(configuracoes.fiscalCertificadoUploadEm).toLocaleString("pt-BR")
            : "sem upload registrado";

        if(!nome){
            resumo.innerHTML = `
                <strong>Nenhum certificado carregado</strong>
                <span>Faça upload do arquivo A1. A validade será identificada pelo sistema.</span>
            `;
            return;
        }

        const validadeIdentificada = Boolean(configuracoes?.fiscalCertificadoValidade);
        resumo.innerHTML = `
            <div class="certificado-resumo-carregado">
                <strong>${escaparHtml(nome)}</strong>
                <span>Validade: ${validade}. Upload: ${upload}.</span>
                <em class="certificado-status ${validadeIdentificada ? "" : "pendente"}">${validadeIdentificada ? "Certificado ativo" : "Validar certificado"}</em>
            </div>
        `;
    }

function atualizarNomeCertificadoUpload(nome){
        const destino = document.getElementById("certificadoUploadNome");
        const container = document.querySelector(".certificado-upload");
        const botaoRemover = document.getElementById("btnRemoverCertificado");
        const acaoSelecionar = document.getElementById("certificadoSelecionarAcao");
        const senha = document.getElementById("fiscalCertificadoSenha");
        const possuiCertificado = Boolean(nome);

        if(destino){
            destino.textContent = nome || "Nenhum certificado selecionado";
        }
        if(container){
            container.classList.toggle("com-certificado", possuiCertificado);
        }
        if(botaoRemover){
            botaoRemover.hidden = !possuiCertificado;
        }
        if(acaoSelecionar){
            acaoSelecionar.hidden = possuiCertificado;
        }
        if(senha){
            senha.required = possuiCertificado;
            if(!possuiCertificado){
                senha.setCustomValidity("");
            }
        }
    }

function verificarAlertaCertificado(configuracoesInformadas){
        const configuracoes = configuracoesInformadas || window.ConfiguracoesSistema?.obter();
        const validade = configuracoes?.fiscalCertificadoValidade;
        const alertaExistente = document.getElementById("alertaCertificadoDigital");

        if(alertaExistente){
            alertaExistente.remove();
        }

        if(!validade) return;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(`${validade}T00:00:00`);
        const dias = Math.ceil((vencimento - hoje) / 86400000);

        if(dias > 15) return;

        const alerta = document.createElement("div");
        alerta.id = "alertaCertificadoDigital";
        alerta.className = dias < 0 ? "alerta-certificado vencido" : "alerta-certificado";
        alerta.innerHTML = `
            <strong>${dias < 0 ? "Certificado digital vencido" : "Certificado próximo do vencimento"}</strong>
            <span>${dias < 0 ? `Venceu há ${Math.abs(dias)} dia(s).` : `Vence em ${dias} dia(s).`} Atualize o certificado A1 para evitar falha na emissão fiscal.</span>
        `;

        document.querySelector(".topo")?.insertAdjacentElement("afterend", alerta);
    }

function aplicarRegraFiscalPorRegime(regime, formulario, salvar){
        const regras = regrasFiscaisPorRegime[regime];

        if(!formulario || !regras) return;

        Object.entries(regras).forEach(function([campo, valor]) {
            const elemento = formulario.elements[campo];
            if(elemento){
                elemento.value = valor;
            }
        });

        const dados = coletarDadosFormulario(formulario);
        atualizarResumoRegraFiscal(dados);
        mostrarStatus("statusConfiguracoesFiscais", "Regras fiscais padrão aplicadas ao regime.");

        if(salvar){
            window.ConfiguracoesSistema.salvar(dados);
        }
    }

function atualizarCamposTributariosPadrao(){
        const catalogo = window.RegrasFiscaisSistema?.situacoesTributarias || {};
        const formulario = document.getElementById("formConfiguracoesFiscais");
        const regime = document.getElementById("fiscalRegimeTributario")?.value || "simplesNacional";
        const usaCsosn = ["mei", "simplesNacional", "meiEmissaoFiscal"].includes(regime);

        if(!formulario) return;

        const csosn = garantirSelectFiscal("fiscalCsosnPadrao");
        const cstIcms = garantirSelectFiscal("fiscalCstIcmsPadrao");
        const cstPis = garantirSelectFiscal("fiscalCstPisPadrao");
        const cstCofins = garantirSelectFiscal("fiscalCstCofinsPadrao");
        const cstIpi = garantirSelectFiscal("fiscalCstIpiPadrao");
        const origem = garantirSelectFiscal("fiscalOrigemMercadoriaPadrao");

        preencherSelectFiscal(csosn, catalogo.csosn || [], csosn?.value || regrasFiscaisPorRegime[regime]?.fiscalCsosnPadrao || "102");
        preencherSelectFiscal(cstIcms, catalogo.cstIcms || [], cstIcms?.value || regrasFiscaisPorRegime[regime]?.fiscalCstIcmsPadrao || "00");
        preencherSelectFiscal(cstPis, catalogo.cstPis || [], cstPis?.value || regrasFiscaisPorRegime[regime]?.fiscalCstPisPadrao || "49");
        preencherSelectFiscal(cstCofins, catalogo.cstCofins || catalogo.cstPis || [], cstCofins?.value || regrasFiscaisPorRegime[regime]?.fiscalCstCofinsPadrao || "49");
        preencherSelectFiscal(cstIpi, catalogo.cstIpi || [], cstIpi?.value || regrasFiscaisPorRegime[regime]?.fiscalCstIpiPadrao || "99");
        preencherSelectFiscal(origem, catalogo.origemMercadoria || window.RegrasFiscaisSistema?.origensMercadoria || [], origem?.value || regrasFiscaisPorRegime[regime]?.fiscalOrigemMercadoriaPadrao || "0");

        renomearLabelFiscal("fiscalCsosnPadrao", "CST padrão");
        renomearLabelFiscal("fiscalCstIcmsPadrao", "CST padrão");
        alternarCampoFiscal("fiscalCsosnPadrao", usaCsosn);
        alternarCampoFiscal("fiscalCstIcmsPadrao", !usaCsosn);

        if(usaCsosn && cstIcms) cstIcms.value = "";
        if(!usaCsosn && csosn) csosn.value = "";
    }

function garantirSelectFiscal(id){
        const atual = document.getElementById(id);
        if(!atual) return null;
        if(atual.tagName === "SELECT") return atual;

        const select = document.createElement("select");
        select.id = atual.id;
        select.name = atual.name || atual.id;
        select.className = atual.className;
        select.value = atual.value || "";
        atual.replaceWith(select);
        return select;
    }

function preencherSelectFiscal(select, itens, atual){
        if(!select) return;

        const valorAtual = String(atual || select.value || "");
        select.innerHTML = itens.map(function(item) {
            const codigo = String(item.codigo || "");
            const texto = `${codigo} - ${item.descricao || ""}`;
            return `<option value="${escaparHtml(codigo)}"${codigo === valorAtual ? " selected" : ""}>${escaparHtml(texto)}</option>`;
        }).join("");

        if(valorAtual && !itens.some(function(item) { return String(item.codigo || "") === valorAtual; })){
            select.insertAdjacentHTML("afterbegin", `<option value="${escaparHtml(valorAtual)}" selected>${escaparHtml(valorAtual)}</option>`);
        }
    }

function alternarCampoFiscal(id, visivel){
        const campo = document.getElementById(id);
        const label = campo?.closest("label");
        if(label) label.hidden = !visivel;
        if(campo) campo.disabled = !visivel;
    }

function renomearLabelFiscal(id, texto){
        const campo = document.getElementById(id);
        const label = campo?.closest("label");
        if(!label) return;
        const noTexto = Array.from(label.childNodes).find(function(no) {
            return no.nodeType === Node.TEXT_NODE && no.textContent.trim();
        });
        if(noTexto) noTexto.textContent = `\n                        ${texto}\n                        `;
    }

function atualizarResumoRegraFiscal(configuracoes){
        const resumo = document.getElementById("fiscalRegraResumo");

        if(!resumo) return;

        const regime = configuracoes?.fiscalRegimeTributario || "simplesNacional";
        const regras = {
            ...regrasFiscaisPorRegime[regime],
            ...configuracoes
        };

        resumo.innerHTML = `
            <strong>${regras.fiscalPerfilFiscalPadrao || "Perfil fiscal automático"}</strong>
            <span>CRT ${regras.fiscalCodigoRegimeTributario || "-"} aplicado internamente. CFOP e CST/CSOSN serão sugeridos automaticamente pela tributação de venda.</span>
        `;
    }

function coletarPadraoFiscal(){
        const padrao = window.ConfiguracoesSistema?.padrao || {};

        return Object.keys(padrao)
            .filter(function(chave) {
                return chave.startsWith("fiscal");
            })
            .reduce(function(retorno, chave) {
                retorno[chave] = padrao[chave];
                return retorno;
            }, {});
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

function coletarDadosFormulario(formulario){
        const dados = {};
        new FormData(formulario).forEach(function(valor, chave) {
            dados[chave] = String(valor).trim();
        });

        Array.from(formulario.elements).forEach(function(elemento) {
            if(!elemento.name || elemento.disabled) return;

            if(elemento.type === "checkbox"){
                dados[elemento.name] = Boolean(elemento.checked);
                return;
            }

            if(elemento.type === "radio" && elemento.checked){
                dados[elemento.name] = String(elemento.value).trim();
            }
        });

        return dados;
    }

function escaparHtml(valor){
        return String(valor ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    }

})();
