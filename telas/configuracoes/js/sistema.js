/* sistema.js */
/* Extraido de manutencao.js (painel "Configurações do Sistema") para virar pagina propria. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    conectarArquivoBalanca();
    conectarConfigBalancaPdv();
    conectarTabsConfiguracoes();
    conectarFormularioConfiguracoes();
    carregarConfiguracoesNoFormulario();
    conectarFormularioConfiguracoesCaixa();
    conectarFormularioIntegracoes();
    conectarFormularioFinanceiro();
    carregarConfiguracoesPedidosVendaNoFormulario();
    conectarFormularioPedidosVenda();
    carregarConfiguracoesControleRemotoNoFormulario();
    conectarFormularioControleRemoto();
    conectarAcaoUnicaAbaSistema();
    document.getElementById("configCorSistema")?.focus({ preventScroll: true });
});

function conectarAcaoUnicaAbaSistema(){
        document.getElementById("btnSalvarAbaSistema")?.addEventListener("click", salvarTudoAbaSistema);
        document.getElementById("btnRestaurarAbaSistema")?.addEventListener("click", restaurarTudoAbaSistemaPadrao);
    }

function salvarTudoAbaSistema(){
        const formSistema = document.getElementById("formConfiguracoesSistema");
        const formPedidosVenda = document.getElementById("formPedidosVendaConfig");
        const formControleRemoto = document.getElementById("formControleRemotoConfig");

        const dadosSistema = formSistema ? coletarConfiguracoesFormulario(formSistema) : {};

        const dadosPedidosVenda = formPedidosVenda ? coletarDadosFormulario(formPedidosVenda) : {};
        dadosPedidosVenda.pedidosVendaValidadeOrcamentoDias = Number(dadosPedidosVenda.pedidosVendaValidadeOrcamentoDias) || 7;
        dadosPedidosVenda.pedidosVendaProximoNumero = Number(dadosPedidosVenda.pedidosVendaProximoNumero) || 1;

        const dadosControleRemoto = formControleRemoto ? coletarDadosFormulario(formControleRemoto) : {};

        // Uma unica leitura+gravacao da base (em vez de 3 sequenciais) evita travar ao salvar.
        window.ConfiguracoesSistema.salvar({ ...dadosSistema, ...dadosPedidosVenda, ...dadosControleRemoto });

        mostrarStatus("statusConfiguracoes", "Configurações salvas e aplicadas.");
        setTimeout(function() {
            window.location.href = "telas/configuracoes/manutenção.html";
        }, 450);
    }

function restaurarTudoAbaSistemaPadrao(){
        const padrao = window.ConfiguracoesSistema.padrao;

        // Uma unica leitura+gravacao da base (em vez de 3 sequenciais) evita travar ao restaurar.
        window.ConfiguracoesSistema.salvar({
            ...padrao,
            pedidosVendaHabilitado: padrao.pedidosVendaHabilitado,
            pedidosVendaImpressaoAutomatica: padrao.pedidosVendaImpressaoAutomatica,
            pedidosVendaPermitirEditarAposCaixa: padrao.pedidosVendaPermitirEditarAposCaixa,
            pedidosVendaPermitirCancelarImportado: padrao.pedidosVendaPermitirCancelarImportado,
            pedidosVendaReservaEstoqueModo: padrao.pedidosVendaReservaEstoqueModo,
            pedidosVendaValidadeOrcamentoDias: padrao.pedidosVendaValidadeOrcamentoDias,
            pedidosVendaPrefixo: padrao.pedidosVendaPrefixo,
            controleRemotoHabilitado: padrao.controleRemotoHabilitado
        });

        carregarConfiguracoesNoFormulario();
        carregarConfiguracoesPedidosVendaNoFormulario();
        carregarConfiguracoesControleRemotoNoFormulario();
        mostrarStatus("statusConfiguracoes", "Padrão restaurado.");
    }

function conectarArquivoBalanca(){
        ["balancaModelo", "balancaTipoArquivo", "balancaFiltroItens", "balancaValidadeDias"].forEach(function(id) {
            document.getElementById(id)?.addEventListener("change", atualizarResumoBalanca);
        });

        document.getElementById("btnBaixarArquivoBalanca")?.addEventListener("click", baixarArquivoBalanca);
    }

function baixarArquivoBalanca(){
        const base = obterBaseLocal();
        const modelo = document.getElementById("balancaModelo")?.value || "urano";
        const tipo = document.getElementById("balancaTipoArquivo")?.value || "txt";
        const validadeDias = Number.parseInt(document.getElementById("balancaValidadeDias")?.value || "0", 10) || 0;
        const itens = filtrarItensBalanca(base.mercadorias || []);

        if(itens.length === 0){
            alert("Não há mercadorias para gerar o arquivo da balança.");
            return;
        }

        const conteudo = gerarConteudoBalanca(modelo, tipo, itens, validadeDias);
        const nomeArquivo = `balanca_${modelo}_${dataArquivo()}.${tipo}`;
        baixarArquivo(nomeArquivo, conteudo, tipo === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8");
        definirTexto("statusBalanca", `${itens.length} item(ns) baixado(s)`);
    }

function filtrarItensBalanca(mercadorias){
        const filtro = document.getElementById("balancaFiltroItens")?.value || "ativos";

        return mercadorias.filter(function(item) {
            if(filtro === "ativos" && item.ativo === false) return false;
            if(filtro === "preco" && numero(item.precoVenda) <= 0 && numero(item.precoPromocional) <= 0) return false;
            if(filtro === "balanca" && !item.balanca?.ativo) return false;
            return true;
        });
    }

function gerarConteudoBalanca(modelo, tipo, itens, validadeDias){
        const linhas = itens.map(function(item) {
            const bal = item.balanca || {};
            const codigo = bal.plu
                ? String(bal.plu).padStart(6, "0").slice(-6)
                : somenteNumeros(item.codigo || item.ean || item.referencia || "").padStart(6, "0").slice(-6);
            const maxDesc = modelo === "urano-urf32" ? 32 : 24;
            const descricao = limparTextoBalanca(item.descricao || "ITEM").slice(0, maxDesc);
            const preco = Math.round(precoItem(item) * 100);
            const departamento = limparTextoBalanca(bal.departamento || item.categoria || "GERAL").slice(0, 20);
            const validadeItem = bal.validade > 0 ? bal.validade : (validadeDias > 0 ? validadeDias : 0);
            const validade = validadeItem > 0 ? String(validadeItem).padStart(3, "0") : "000";
            const tara = bal.tara > 0 ? String(bal.tara).padStart(5, "0") : "00000";

            if(tipo === "csv"){
                return [codigo, descricao, precoItem(item).toFixed(2), validade, departamento, tara, modelo].join(";");
            }

            if(modelo === "toledo"){
                return `${codigo}${descricao.padEnd(24, " ")}${String(preco).padStart(7, "0")}${validade}${tara}`;
            }

            if(modelo === "filizola"){
                return `${codigo}|${descricao}|${String(preco).padStart(8, "0")}|${validade}|${departamento}|${tara}`;
            }

            if(modelo === "urano-urf32"){
                return `${codigo};${descricao.padEnd(32, " ")};${String(preco).padStart(8, "0")};${validade};${tara}`;
            }

            return `${codigo};${descricao};${String(preco).padStart(8, "0")};${validade};${tara}`;
        });

        return tipo === "csv"
            ? `codigo;descricao;preco;validade_dias;departamento;tara_g;modelo\r\n${linhas.join("\r\n")}`
            : linhas.join("\r\n");
    }

function conectarConfigBalancaPdv(){
        const form = document.getElementById("formConfigBalanca");
        if(!form) return;
        form.addEventListener("submit", function(e){
            e.preventDefault();
            const cfg = window.ConfiguracoesSistema?.obter() || {};
            cfg.balancaPdv = {
                ativo:       form.elements.balancaPdvAtivo?.checked === true,
                prefixo:     (form.elements.balancaPdvPrefixo?.value || "2").trim().slice(0, 1) || "2",
                tipoCodigo:  form.elements.balancaPdvTipo?.value || "peso",
                tamanhoPlu:  parseInt(form.elements.balancaPdvTamPlu?.value, 10) || 5,
                tamanhoValor:parseInt(form.elements.balancaPdvTamVal?.value, 10) || 5
            };
            window.ConfiguracoesSistema.salvar(cfg);
            mostrarStatus("statusConfigBalanca", "Configuração salva com sucesso.");
            _atualizarPreviewBalancaPdv(form);
        });
        form.elements.balancaPdvPrefixo?.addEventListener("input", function(){ _atualizarPreviewBalancaPdv(form); });
        form.elements.balancaPdvTamPlu?.addEventListener("input", function(){ _atualizarPreviewBalancaPdv(form); });
        form.elements.balancaPdvTamVal?.addEventListener("input", function(){ _atualizarPreviewBalancaPdv(form); });
        form.elements.balancaPdvTipo?.addEventListener("change", function(){ _atualizarPreviewBalancaPdv(form); });
    }

function carregarConfigBalancaPdv(){
        const form = document.getElementById("formConfigBalanca");
        if(!form) return;
        const cfg = window.ConfiguracoesSistema?.obter() || {};
        const b = cfg.balancaPdv || {};
        if(form.elements.balancaPdvAtivo)   form.elements.balancaPdvAtivo.checked   = b.ativo === true;
        if(form.elements.balancaPdvPrefixo) form.elements.balancaPdvPrefixo.value   = b.prefixo || "2";
        if(form.elements.balancaPdvTipo)    form.elements.balancaPdvTipo.value       = b.tipoCodigo || "peso";
        if(form.elements.balancaPdvTamPlu)  form.elements.balancaPdvTamPlu.value     = b.tamanhoPlu || 5;
        if(form.elements.balancaPdvTamVal)  form.elements.balancaPdvTamVal.value     = b.tamanhoValor || 5;
        _atualizarPreviewBalancaPdv(form);
    }

function _atualizarPreviewBalancaPdv(form){
        const el = document.getElementById("previewCodigoBalanca");
        if(!el) return;
        const pref  = (form.elements.balancaPdvPrefixo?.value || "2").slice(0, 1);
        const nPlu  = parseInt(form.elements.balancaPdvTamPlu?.value, 10) || 5;
        const nVal  = parseInt(form.elements.balancaPdvTamVal?.value, 10) || 5;
        const tipo  = form.elements.balancaPdvTipo?.value || "peso";
        const total = 1 + nPlu + nVal + 1;
        const exPlu = "0".repeat(nPlu - 1) + "1";
        const exVal = tipo === "preco" ? "01250".slice(0, nVal).padStart(nVal, "0") : "01500".slice(0, nVal).padStart(nVal, "0");
        const label = tipo === "preco" ? `R$ ${(parseInt(exVal, 10)/100).toFixed(2)}` : `${(parseInt(exVal, 10)/1000).toFixed(3)} kg`;
        el.innerHTML = `<code>${pref}<span class="prev-plu">${exPlu}</span><span class="prev-val">${exVal}</span>C</code>
            <small>${total} dígitos &nbsp;·&nbsp; <span class="prev-plu">PLU: ${parseInt(exPlu, 10)}</span> &nbsp;·&nbsp; <span class="prev-val">${tipo === "preco" ? "Preço" : "Peso"}: ${label}</span> &nbsp;·&nbsp; C = check digit</small>`;
    }

function atualizarResumoBalanca(){
        const base = obterBaseLocal();
        const itens = filtrarItensBalanca(base.mercadorias || []);
        const modelo = document.getElementById("balancaModelo")?.selectedOptions?.[0]?.textContent || "Balança";
        const tipo = (document.getElementById("balancaTipoArquivo")?.value || "txt").toUpperCase();

        definirTexto("statusBalanca", `${itens.length} item(ns)`);
        const resumo = document.getElementById("balancaResumo");
        if(resumo){
            resumo.innerHTML = `
                <strong>${modelo} - ${tipo}</strong>
                <span>${itens.length} item(ns) serão enviados com código, descrição, preço e validade.</span>
            `;
        }
    }

function conectarTabsConfiguracoes(){
        const nav = document.querySelector(".config-tab-nav");
        if(!nav) return;

        nav.addEventListener("click", function(evento) {
            const botao = evento.target.closest(".config-tab");
            if(!botao) return;

            const aba = botao.dataset.tab;

            nav.querySelectorAll(".config-tab").forEach(function(b) {
                b.classList.toggle("ativo", b.dataset.tab === aba);
            });

            const painel = nav.closest(".painel");
            if(painel){
                painel.querySelectorAll(".config-tab-painel").forEach(function(p) {
                    p.classList.toggle("ativo", p.dataset.tab === aba);
                });
            }

            if(aba === "caixa") carregarConfiguracoesCaixaNoFormulario();
            if(aba === "integracoes") carregarIntegracoesNoFormulario();
            if(aba === "financeiro") carregarFinanceiroNoFormulario();
        });
    }

function conectarFormularioConfiguracoes(){
        const formulario = document.getElementById("formConfiguracoesSistema");

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const configuracoes = coletarConfiguracoesFormulario(formulario);
            window.ConfiguracoesSistema.salvar(configuracoes);
            mostrarStatus("statusConfiguracoes", "Configurações salvas e aplicadas.");
        });

        iniciarModalPix();
    }

function conectarFormularioConfiguracoesCaixa(){
        const formulario = document.getElementById("formConfiguracoesCaixa");

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const configuracoes = coletarConfiguracoesFormulario(formulario);
            window.ConfiguracoesSistema.salvar(configuracoes);
            mostrarStatus("statusConfiguracoesCaixa", "Configurações do caixa salvas.");
        });

        document.getElementById("btnRestaurarConfiguracoesCaixa")?.addEventListener("click", function() {
            window.ConfiguracoesSistema.salvar(window.ConfiguracoesSistema.padrao);
            carregarConfiguracoesCaixaNoFormulario();
            mostrarStatus("statusConfiguracoesCaixa", "Padrão restaurado.");
        });
    }

function conectarFormularioIntegracoes(){
        const formulario = document.getElementById("formIntegracoes");

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const configuracoes = coletarDadosFormulario(formulario);
            window.ConfiguracoesSistema.salvar(configuracoes);
            mostrarStatus("statusIntegracoes", "Configurações de integrações salvas.");
        });
    }

function carregarIntegracoesNoFormulario(){
        const formulario = document.getElementById("formIntegracoes");
        const configuracoes = window.ConfiguracoesSistema?.obter();
        if(!formulario || !configuracoes) return;

        [
            "fiscalPixProvedor",
            "fiscalPixChave",
            "fiscalBoletoApiProvedor",
            "fiscalBoletoApiUrl",
            "fiscalBoletoApiToken",
            "fiscalPosProvedor",
            "fiscalTefSitefAtivo",
            "fiscalTefSitefServidor"
        ].forEach(function(campo) {
            const elemento = formulario.elements[campo];
            if(!elemento) return;
            if(elemento.type === "checkbox"){
                elemento.checked = Boolean(configuracoes[campo]);
            } else {
                elemento.value = configuracoes[campo] ?? "";
            }
        });

        mostrarStatus("statusIntegracoes", configuracoes.atualizadoEm ? "Configurações de integrações carregadas." : "Configurações de integrações padrão.");
    }

function carregarConfiguracoesNoFormulario(){
        const formulario = document.getElementById("formConfiguracoesSistema");
        const configuracoes = window.ConfiguracoesSistema?.obter();

        if(!formulario || !configuracoes) return;

        ["mostrarDashboard", "backupAutomatico"].forEach(function(campo) {
            if(formulario.elements[campo]){
                formulario.elements[campo].checked = Boolean(configuracoes[campo]);
            }
        });

        atualizarLicencaWidget(configuracoes);
        mostrarStatus("statusConfiguracoes", configuracoes.atualizadoEm ? "Configurações carregadas." : "Configurações padrão.");
    }

function carregarConfiguracoesCaixaNoFormulario(){
        const formulario = document.getElementById("formConfiguracoesCaixa");
        const configuracoes = window.ConfiguracoesSistema?.obter();

        if(!formulario || !configuracoes) return;

        [
            ["pdvCorTextos", "#0f172a"],
            ["pdvCorBotoes", "#1A436B"],
            ["pdvCorVenda", "#00bcd4"],
            ["pdvCorPrevenda", "#00bcd4"],
            ["pdvTemaVenda", "claro"],
            ["pdvTemaPrevenda", "claro"],
            ["pdvSenhaHorarioReinicio", ""],
            ["pdvValorMaximoItem", 10000],
            ["pdvQtdMaximaVenda", 0],
            ["pdvTabelaPreco", "padrao"],
            ["pdvPriorizarDesconto", "percentual"],
            ["pdvDescontoMaximo", 5],
            ["pdvQtdUltimasCompras", 5],
            ["pdvFormaPagamentoPadrao", "dinheiro"],
            ["pdvRecebimentoPadrao", "por-cliente"],
            ["pdvMaximoCaixa", 0],
            ["pdvTipoConferencia", "completa"],
            ["pdvTempoSessao", 60],
            ["pdvValorMaximoSemCpf", 0],
            ["pdvValorMaximoSemDest", 10000],
            ["pdvConversaoPeso", "real-para-moeda"],
            ["pdvConversaoDolar", "real-para-moeda"],
            ["pdvCotacaoPeso", 0],
            ["pdvCotacaoDolar", 0],
            ["pdvDddPadrao", ""],
            ["pdvNomePersonalizado", "Não fiscal"],
            ["pdvDiasValidade", 1],
            ["pdvCashbackValorMinimo", 0],
            ["pdvCashbackPercentual", 0],
            ["pdvCashbackDiasExpiracao", 0],
            ["pdvMensagens", ""]
        ].forEach(function(par){
            const el = formulario.elements[par[0]];
            if(el) el.value = configuracoes[par[0]] ?? par[1];
        });

        [
            "controleEstoque",
            "bloquearVendaSemEstoque",
            "alertaEstoqueMinimo",
            "controleValidade",
            "solicitarQuantidadePdv",
            "permitirDescontoPdv",
            "precoLivrePdv",
            "permitirGuardarVendas",
            "permitirOrcamentoPdv",
            "exigirClienteVendaPrazo",
            "emitirNfce",
            "usarVendedor",
            "pdvSenhaNaoGerar",
            "pdvMostrarBotoesAtalho",
            "pdvItemDetalhado",
            "pdvConsultarPorReferencia",
            "pdvPesquisarComEnter",
            "pdvExibirDetalhesSingleResult",
            "pdvNaoJuntarItens",
            "pdvNaoJuntarItensBalanca",
            "pdvNaoManterConfigEmbalagem",
            "pdvDesativarQtdPorPreco",
            "pdvTrocaTabelaAtacado",
            "pdvNaoSalvarPrecoVendaLivre",
            "pdvConsiderarDescontoPromocoes",
            "pdvNaoAbrirPesquisaAuto",
            "pdvNaoSolicitarNaAbertura",
            "pdvNaoObrigarVendedor",
            "pdvNaoSolicitarNaAberturaPrevenda",
            "pdvControlarFechamento",
            "pdvFechamentoComPrevendas",
            "pdvSangriaSaldoDinheiro",
            "pdvIgnorarSaldoSangria",
            "pdvMostrarQtdCancelamentos",
            "pdvIgnorarPrevendasSemPagamento",
            "pdvNaoDeslogar",
            "pdvNaoSolicitarCpf",
            "pdvPermitirLiberacaoRemota",
            "pdvNfeHabilitarPrevendas",
            "pdvGerarPromissoria",
            "pdvTefPosPixAtivado",
            "pdvMotivoCancelamentoDesativado",
            "pdvPagamentoParcialAtivado",
            "pdvCashbackTodosClientes",
            "pdvCashbackNaoGerarPrevendas",
            "pdvTicketRetiradaVenda",
            "pdvTicketRetiradaPrevenda",
            "pdvSolicitarMesa",
            "pdvIncluirTaxaFrete"
        ].forEach(function(campo) {
            if(formulario.elements[campo]){
                formulario.elements[campo].checked = Boolean(configuracoes[campo]);
            }
        });

        const larguraAtual = configuracoes.impressoraLargura || "80mm";
        formulario.querySelectorAll("input[name='impressoraLargura']").forEach(function(radio){
            radio.checked = radio.value === larguraAtual;
        });

        mostrarStatus("statusConfiguracoesCaixa", configuracoes.atualizadoEm ? "Configurações do caixa carregadas." : "Configurações padrão do caixa.");
    }

function normalizarMensagensConfiguracaoPdv(valor){
        const mensagens = String(valor || "")
            .split(/\r?\n/)
            .map(function(mensagem) {
                return mensagem.trim();
            })
            .filter(Boolean);

        return mensagens.length
            ? mensagens.join("\n")
            : "Seja Bem-Vindo(a)!!";
    }

function calcularStatusLicenca(vencimento){
        if(!vencimento) return "pendente";

        const hoje = new Date();
        const dataVencimento = new Date(`${vencimento}T23:59:59`);
        const diasRestantes = Math.ceil((dataVencimento - hoje) / 86400000);

        if(diasRestantes < 0) return "vencida";
        if(diasRestantes <= 7) return "proxima-vencimento";
        return "ativa";
    }

async function validarLicencaNoPainel(dados){
        if(!dados.licencaPainelUrl){
            return { ok: false };
        }

        try{
            const resposta = await fetch(dados.licencaPainelUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    clienteId: dados.licencaClienteId,
                    chaveAcesso: dados.licencaChave
                })
            });

            if(!resposta.ok){
                return { ok: false };
            }

            const retorno = await resposta.json();
            return {
                ok: true,
                status: retorno.status || retorno.licencaStatus,
                vencimento: retorno.vencimento || retorno.licencaVencimentoEstimado
            };
        }catch{
            return { ok: false };
        }
    }

function atualizarLicencaWidget(configuracoes){
        const widget = document.getElementById("licencaWidget");
        const icone = document.getElementById("licencaWidgetIcone");
        const label = document.getElementById("licencaStatusLabel");
        const diasEl = document.getElementById("licencaDiasRestantes");

        if(!widget || !label || !diasEl) return;

        const vencimento = configuracoes.licencaVencimentoEstimado;
        let dias = null;

        if(vencimento){
            dias = Math.ceil((new Date(vencimento + "T23:59:59") - new Date()) / 86400000);
        }

        if(dias === null){
            widget.dataset.status = "pendente";
            label.textContent = "Licença não configurada";
            diasEl.textContent = "Entre em contato com o suporte Coneccta.";
            if(icone) icone.className = "licenca-widget-icone";
            if(icone) icone.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        } else if(dias <= 0){
            widget.dataset.status = "vencida";
            label.textContent = "Licença vencida";
            diasEl.textContent = "Renove agora para continuar usando o sistema.";
            if(icone) { icone.className = "licenca-widget-icone vencida"; icone.innerHTML = '<i class="fa-solid fa-shield-xmark"></i>'; }
        } else if(dias <= 10){
            widget.dataset.status = "expirando";
            label.textContent = `Sua licença expira em ${dias} dia${dias === 1 ? "" : "s"}`;
            diasEl.textContent = "Antecipe o pagamento para evitar interrupção.";
            if(icone) { icone.className = "licenca-widget-icone expirando"; icone.innerHTML = '<i class="fa-solid fa-shield-exclamation"></i>'; }
        } else {
            widget.dataset.status = "ativa";
            label.textContent = `Sua licença expira em ${dias} dias`;
            diasEl.textContent = `Vencimento: ${new Date(vencimento + "T00:00:00").toLocaleDateString("pt-BR")}.`;
            if(icone) { icone.className = "licenca-widget-icone"; icone.innerHTML = '<i class="fa-solid fa-shield-check"></i>'; }
        }
    }

function iniciarModalPix(){
        const btnAbrir = document.getElementById("btnAnteciparPagamento");
        const modal = document.getElementById("modalPix");
        const btnFechar = document.getElementById("btnFecharModalPix");
        const btnCopiar = document.getElementById("btnCopiarPixChave");
        const inputChave = document.getElementById("pixChaveInput");
        const elCopiado = document.getElementById("pixCopiado");

        if(!btnAbrir || !modal) return;

        const PIX = {
            chave: "coneccta.solucoesti@gmail.com",
            nome: "CONECCTA SISTEMAS",
            cidade: "SAO PAULO",
            valor: 250.00
        };

        btnAbrir.addEventListener("click", function(){
            modal.setAttribute("aria-hidden", "false");

            const payload = gerarPixPayload(PIX.chave, PIX.nome, PIX.cidade, PIX.valor);
            if(inputChave) inputChave.value = payload;

            const qrDiv = document.getElementById("pixQrCodeDiv");
            if(qrDiv){
                qrDiv.innerHTML = "";
                renderizarQrCode(qrDiv, payload);
            }
        });

        btnFechar?.addEventListener("click", fecharModal);

        modal.addEventListener("click", function(e){
            if(e.target === modal) fecharModal();
        });

        btnCopiar?.addEventListener("click", function(){
            if(!inputChave?.value) return;
            navigator.clipboard.writeText(inputChave.value).then(function(){
                if(elCopiado){
                    elCopiado.classList.add("visivel");
                    setTimeout(function(){ elCopiado.classList.remove("visivel"); }, 2000);
                }
            }).catch(function(){
                inputChave.select();
                document.execCommand("copy");
            });
        });

        function fecharModal(){
            modal.setAttribute("aria-hidden", "true");
        }
    }

function renderizarQrCode(container, texto){
        if(typeof QRCode !== "undefined"){
            new QRCode(container, {
                text: texto,
                width: 200,
                height: 200,
                correctLevel: QRCode.CorrectLevel.M
            });
            return;
        }

        // Fallback: link externo para geração
        const img = document.createElement("img");
        img.alt = "QR Code PIX";
        img.style.cssText = "width:200px;height:200px;border-radius:8px";
        img.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(texto);
        container.appendChild(img);
    }

function gerarPixPayload(chave, nome, cidade, valor){
        function campo(id, conteudo){
            return id + String(conteudo.length).padStart(2, "0") + conteudo;
        }

        const pixMerchant = campo("00", "BR.GOV.BCB.PIX") + campo("01", chave);
        const merchantAccount = campo("26", pixMerchant);
        const valorStr = valor.toFixed(2);
        const txid = campo("05", "***");
        const additionalData = campo("62", txid);

        const base = [
            campo("00", "01"),
            campo("01", "12"),
            merchantAccount,
            campo("52", "0000"),
            campo("53", "986"),
            campo("54", valorStr),
            campo("58", "BR"),
            campo("59", nome.substring(0, 25)),
            campo("60", cidade.substring(0, 15)),
            additionalData,
            "6304"
        ].join("");

        return base + calcCRC16PIX(base);
    }

function calcCRC16PIX(str){
        let crc = 0xFFFF;
        for(let i = 0; i < str.length; i++){
            crc ^= str.charCodeAt(i) << 8;
            for(let j = 0; j < 8; j++){
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    }

function precoItem(item){
        return numero(item.precoPromocional) > 0 ? numero(item.precoPromocional) : numero(item.precoVenda);
    }

function limparTextoBalanca(valor){
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s.-]/g, "")
            .trim()
            .toUpperCase();
    }

function carregarFinanceiroNoFormulario(){
        const cfg = window.ConfiguracoesSistema?.obter();
        if(!cfg) return;
        const f = document.getElementById("formFinanceiro");
        if(!f) return;
        if(f.elements.financeiroMultaAtraso)    f.elements.financeiroMultaAtraso.value    = cfg.financeiroMultaAtraso    ?? 2;
        if(f.elements.financeiroJurosMensais)   f.elements.financeiroJurosMensais.value   = cfg.financeiroJurosMensais   ?? 1;
        if(f.elements.financeiroDiasCarencia)   f.elements.financeiroDiasCarencia.value   = cfg.financeiroDiasCarencia   ?? 0;
        if(f.elements.financeiroMaxParcelasCreditoLoja)    f.elements.financeiroMaxParcelasCreditoLoja.value    = cfg.financeiroMaxParcelasCreditoLoja    ?? 12;
        if(f.elements.financeiroDiasEntreParcelasCreditoLoja) f.elements.financeiroDiasEntreParcelasCreditoLoja.value = cfg.financeiroDiasEntreParcelasCreditoLoja ?? 30;
    }

function conectarFormularioFinanceiro(){
        const f = document.getElementById("formFinanceiro");
        if(!f) return;
        f.addEventListener("submit", function(e){
            e.preventDefault();
            const cfg = window.ConfiguracoesSistema?.obter() || {};
            cfg.financeiroMultaAtraso    = parseFloat(f.elements.financeiroMultaAtraso?.value)    || 0;
            cfg.financeiroJurosMensais   = parseFloat(f.elements.financeiroJurosMensais?.value)   || 0;
            cfg.financeiroDiasCarencia   = parseInt(f.elements.financeiroDiasCarencia?.value, 10) || 0;
            cfg.financeiroMaxParcelasCreditoLoja    = parseInt(f.elements.financeiroMaxParcelasCreditoLoja?.value, 10)    || 12;
            cfg.financeiroDiasEntreParcelasCreditoLoja = parseInt(f.elements.financeiroDiasEntreParcelasCreditoLoja?.value, 10) || 30;
            window.ConfiguracoesSistema.salvar(cfg);
            mostrarStatus("statusConfiguracoes", "Configurações financeiras salvas.");
        });
    }

function carregarConfiguracoesPedidosVendaNoFormulario(){
        const formulario = document.getElementById("formPedidosVendaConfig");
        const configuracoes = window.ConfiguracoesSistema?.obter();
        if(!formulario || !configuracoes) return;

        [
            "pedidosVendaHabilitado",
            "pedidosVendaImpressaoAutomatica",
            "pedidosVendaPermitirEditarAposCaixa",
            "pedidosVendaPermitirCancelarImportado",
            "pedidosVendaReservaEstoqueModo",
            "pedidosVendaValidadeOrcamentoDias",
            "pedidosVendaPrefixo",
            "pedidosVendaProximoNumero"
        ].forEach(function(campo) {
            const elemento = formulario.elements[campo];
            if(!elemento) return;
            if(elemento.type === "checkbox"){
                elemento.checked = Boolean(configuracoes[campo]);
            } else {
                elemento.value = configuracoes[campo] ?? "";
            }
        });
    }

function conectarFormularioPedidosVenda(){
        const formulario = document.getElementById("formPedidosVendaConfig");

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const dados = coletarDadosFormulario(formulario);
            dados.pedidosVendaValidadeOrcamentoDias = Number(dados.pedidosVendaValidadeOrcamentoDias) || 7;
            dados.pedidosVendaProximoNumero = Number(dados.pedidosVendaProximoNumero) || 1;
            window.ConfiguracoesSistema.salvar(dados);
        });
    }

function carregarConfiguracoesControleRemotoNoFormulario(){
        const formulario = document.getElementById("formControleRemotoConfig");
        const configuracoes = window.ConfiguracoesSistema?.obter();
        if(!formulario || !configuracoes) return;

        const elemento = formulario.elements["controleRemotoHabilitado"];
        if(elemento) elemento.checked = configuracoes.controleRemotoHabilitado !== false;
    }

function conectarFormularioControleRemoto(){
        const formulario = document.getElementById("formControleRemotoConfig");

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const dados = coletarDadosFormulario(formulario);
            window.ConfiguracoesSistema.salvar(dados);
        });
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

function coletarConfiguracoesFormulario(formulario){
        const dados = coletarDadosFormulario(formulario);

        [
            "controleEstoque",
            "bloquearVendaSemEstoque",
            "alertaEstoqueMinimo",
            "controleValidade",
            "solicitarQuantidadePdv",
            "permitirDescontoPdv",
            "precoLivrePdv",
            "permitirGuardarVendas",
            "permitirOrcamentoPdv",
            "exigirClienteVendaPrazo",
            "emitirNfce",
            "mostrarDashboard",
            "backupAutomatico",
            "usarVendedor",
            "pdvSenhaNaoGerar",
            "pdvMostrarBotoesAtalho",
            "pdvItemDetalhado",
            "pdvConsultarPorReferencia",
            "pdvPesquisarComEnter",
            "pdvExibirDetalhesSingleResult",
            "pdvNaoJuntarItens",
            "pdvNaoJuntarItensBalanca",
            "pdvNaoSolicitarQuantidade",
            "pdvNaoManterConfigEmbalagem",
            "pdvDesativarQtdPorPreco",
            "pdvTrocaTabelaAtacado",
            "pdvNaoSalvarPrecoVendaLivre",
            "pdvConsiderarDescontoPromocoes",
            "pdvNaoAbrirPesquisaAuto",
            "pdvNaoSolicitarNaAbertura",
            "pdvNaoObrigarVendedor",
            "pdvNaoSolicitarNaAberturaPrevenda",
            "pdvControlarFechamento",
            "pdvFechamentoComPrevendas",
            "pdvSangriaSaldoDinheiro",
            "pdvIgnorarSaldoSangria",
            "pdvMostrarQtdCancelamentos",
            "pdvIgnorarPrevendasSemPagamento",
            "pdvNaoDeslogar",
            "pdvNaoSolicitarCpf",
            "pdvPermitirLiberacaoRemota",
            "pdvNfeHabilitarPrevendas",
            "pdvGerarPromissoria",
            "pdvTefPosPixAtivado",
            "pdvMotivoCancelamentoDesativado",
            "pdvPagamentoParcialAtivado",
            "pdvCashbackTodosClientes",
            "pdvCashbackNaoGerarPrevendas",
            "pdvTicketRetiradaVenda",
            "pdvTicketRetiradaPrevenda",
            "pdvSolicitarMesa",
            "pdvIncluirTaxaFrete"
        ].forEach(function(campo) {
            if(formulario.elements[campo]){
                dados[campo] = Boolean(formulario.elements[campo].checked);
            }
        });

        const camposNumericos = [
            "pdvValorMaximoItem",
            "pdvQtdMaximaVenda",
            "pdvDescontoMaximo",
            "pdvQtdUltimasCompras",
            "pdvMaximoCaixa",
            "pdvTempoSessao",
            "pdvValorMaximoSemCpf",
            "pdvValorMaximoSemDest",
            "pdvCotacaoPeso",
            "pdvCotacaoDolar",
            "pdvDiasValidade",
            "pdvCashbackValorMinimo",
            "pdvCashbackPercentual",
            "pdvCashbackDiasExpiracao"
        ];

        camposNumericos.forEach(function(campo) {
            if(dados[campo] !== undefined){
                dados[campo] = parseFloat(dados[campo]) || 0;
            }
        });

        dados.alertaValidadeDias = Number.parseInt(dados.alertaValidadeDias, 10) || window.ConfiguracoesSistema.padrao.alertaValidadeDias;
        dados.pdvMensagens = normalizarMensagensConfiguracaoPdv(dados.pdvMensagens);

        if(dados.licencaVencimentoEstimado){
            dados.licencaStatus = calcularStatusLicenca(dados.licencaVencimentoEstimado);
        }

        return dados;
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

function numero(valor){
        const texto = String(valor || "").trim();
        const normalizado = texto.includes(",")
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto;
        const numeroConvertido = Number(normalizado);
        return Number.isFinite(numeroConvertido) ? numeroConvertido : 0;
    }

function somenteNumeros(valor){
        return String(valor || "").replace(/\D/g, "");
    }

function dataArquivo(){
        return new Date().toISOString().slice(0, 10);
    }

})();
