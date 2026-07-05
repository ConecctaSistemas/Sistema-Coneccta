(function(){

    /* ───────────────────────── Auxiliares de data ───────────────────────── */

    function diasEntre(dataA, dataB){
        const ms = new Date(dataB).setHours(0,0,0,0) - new Date(dataA).setHours(0,0,0,0);
        return Math.round(ms / 86400000);
    }

    function somarIntervalo(historico, inicio, fim){
        let total = 0;
        for(let i = inicio; i < fim && i < historico.length; i++) total += historico[i];
        return total;
    }

    function dataMaisDias(dias){
        const data = new Date();
        data.setDate(data.getDate() + dias);
        return data.toISOString().slice(0, 10);
    }

    /* ───────────────────────── Dados reais do sistema ───────────────────────── */

    const PRAZO_ENTREGA_PADRAO = 5;

    function construirMapaHistoricoVendas(base){
        const mapa = new Map();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        (base.vendas || []).forEach(function(venda){
            if(!venda.data || !Array.isArray(venda.itens)) return;
            const dataVenda = new Date(venda.data);
            if(Number.isNaN(dataVenda.getTime())) return;
            dataVenda.setHours(0, 0, 0, 0);
            const offset = Math.round((hoje - dataVenda) / 86400000);
            if(offset < 0 || offset >= 90) return;

            venda.itens.forEach(function(item){
                if(!item || !item.id) return;
                if(!mapa.has(item.id)) mapa.set(item.id, new Array(90).fill(0));
                mapa.get(item.id)[offset] += numero(item.qtd);
            });
        });

        return mapa;
    }

    function localizarFornecedorReal(nomeFornecedor, fornecedoresBase){
        if(!nomeFornecedor) return null;
        const alvo = normalizar(nomeFornecedor);
        return fornecedoresBase.find(function(f){
            return normalizar(f.razaoSocial || f.nome || "") === alvo || normalizar(f.nomeFantasia || f.fantasia || "") === alvo;
        }) || null;
    }

    function carregarProdutosReais(){
        const base = obterBase();
        const mercadorias = Array.isArray(base.mercadorias) ? base.mercadorias : [];
        const fornecedoresBase = Array.isArray(base.fornecedores) ? base.fornecedores : [];
        const mapaHistorico = construirMapaHistoricoVendas(base);

        return mercadorias
            .filter(function(m){ return m.ativo !== false; })
            .map(function(m){
                const historico = mapaHistorico.get(m.id) || new Array(90).fill(0);
                const fornecedorNome = m.fornecedor || "";
                const fornecedorInfo = localizarFornecedorReal(fornecedorNome, fornecedoresBase);
                const estoqueMinimo = numero(m.estoqueMinimo);
                const estoqueMaximoCadastrado = numero(m.estoqueMaximo);
                const estoque = numero(m.estoque);

                return {
                    id: m.id,
                    codigo: m.codigo || "-",
                    descricao: m.descricao || m.descricaoReduzida || "Produto sem descrição",
                    departamento: m.grupo || m.categoria || "Sem departamento",
                    categoria: m.categoria || "Sem categoria",
                    marca: m.marca || "-",
                    unidade: m.unidade || "UN",
                    fornecedor: fornecedorNome,
                    prazoEntregaDias: fornecedorInfo?.prazoEntregaDias || PRAZO_ENTREGA_PADRAO,
                    prazoEntregaEstimado: !fornecedorInfo?.prazoEntregaDias,
                    precoCusto: numero(m.precoCusto),
                    precoVenda: numero(m.precoVenda),
                    estoque: estoque,
                    estoqueMinimo: estoqueMinimo,
                    estoqueMaximo: estoqueMaximoCadastrado > 0 ? estoqueMaximoCadastrado : Math.max(estoqueMinimo * 3, estoque, 10),
                    estoqueMaximoEstimado: estoqueMaximoCadastrado <= 0,
                    validade: m.validade || null,
                    historico: historico
                };
            });
    }

    let PRODUTOS = [];

    /* ───────────────────────── Estado da tela ───────────────────────── */

    const estado = {
        diasPeriodo: 30,
        dataInicioPersonalizado: null,
        dataFimPersonalizado: null,
        coberturaDesejada: 30,
        fornecedor: "",
        categoria: "",
        marca: "",
        departamento: "",
        somenteEstoqueBaixo: false,
        somenteRuptura: false,
        somenteSemVenda: false,
        somenteAltaSaida: false,
        busca: "",
        estoqueAte: null,
        ordenarPor: "codigo",
        ordenarDirecao: "asc",
        paginaAtual: 1,
        itensPorPagina: 25
    };

    const overridesQuantidade = new Map();
    const ignorados = new Set();
    const incluidosManual = new Set();
    const itensCesta = new Map();

    let listaCalculadaAtual = [];

    /* ───────────────────────── Cálculos ───────────────────────── */

    function totalVendidoNoPeriodo(produto){
        if(estado.diasPeriodo === "personalizado"){
            const inicio = estado.dataInicioPersonalizado;
            const fim = estado.dataFimPersonalizado;
            if(!inicio || !fim) return { total:0, dias:0 };
            const hoje = new Date().toISOString().slice(0,10);
            const offsetInicio = Math.max(0, diasEntre(fim, hoje));
            const offsetFim = Math.max(offsetInicio, diasEntre(inicio, hoje)) + 1;
            return { total: somarIntervalo(produto.historico, offsetInicio, offsetFim), dias: Math.max(1, offsetFim - offsetInicio) };
        }
        const dias = numero(estado.diasPeriodo) || 30;
        return { total: somarIntervalo(produto.historico, 0, dias), dias: dias };
    }

    function calcularSituacao(p){
        if(p.semHistorico) return { chave:"semHistorico", label:"Sem histórico suficiente" };
        if(p.parado) return { chave:"parado", label:"Produto parado" };
        if(p.proximoVencimento) return { chave:"vencimento", label:"Próximo do vencimento" };
        if(p.estoque <= 0 || (p.vendaDiaria > 0 && p.diasCobertura <= (p.prazoEntregaDias || 0))) return { chave:"urgente", label:"Comprar urgente" };
        if(p.quantidadeSugerida > 0) return { chave:"comprar", label:"Comprar" };
        if(p.estoque > p.estoqueMaximo) return { chave:"excesso", label:"Excesso de estoque" };
        return { chave:"saudavel", label:"Estoque saudável" };
    }

    function calcularProduto(produtoBase){
        const p = Object.assign({}, produtoBase);
        const vendas90 = somarIntervalo(p.historico, 0, 90);
        const diasComVenda = p.historico.filter(function(v){ return v > 0; }).length;

        p.parado = vendas90 === 0;
        p.semHistorico = !p.parado && diasComVenda <= 4;

        const periodo = totalVendidoNoPeriodo(p);
        p.vendaDiaria = periodo.dias > 0 ? periodo.total / periodo.dias : 0;
        p.vendaMensal = p.vendaDiaria * 30;
        p.diasCobertura = p.vendaDiaria > 0 ? p.estoque / p.vendaDiaria : (p.estoque > 0 ? Infinity : 0);

        p.diasParaVencer = p.validade ? diasEntre(new Date().toISOString().slice(0,10), p.validade) : null;
        p.proximoVencimento = p.diasParaVencer !== null && p.diasParaVencer <= 45 && p.diasParaVencer >= 0;

        const sugestaoBase = Math.max(0, Math.round(p.vendaDiaria * estado.coberturaDesejada - p.estoque));
        p.quantidadeSugerida = (p.parado || p.semHistorico) ? 0 : sugestaoBase;

        p.valorEstimadoBase = p.quantidadeSugerida * p.precoCusto;
        p.situacao = calcularSituacao(p);

        return p;
    }

    function quantidadeEfetiva(p){
        if(ignorados.has(p.id)) return 0;
        if(overridesQuantidade.has(p.id)) return overridesQuantidade.get(p.id);
        return p.quantidadeSugerida;
    }

    function valorEstimadoEfetivo(p){
        return quantidadeEfetiva(p) * p.precoCusto;
    }

    /* ───────────────────────── Filtros ───────────────────────── */

    function produtoPassaFiltros(p){
        if(estado.fornecedor && p.fornecedor !== estado.fornecedor) return false;
        if(estado.categoria && p.categoria !== estado.categoria) return false;
        if(estado.marca && p.marca !== estado.marca) return false;
        if(estado.departamento && p.departamento !== estado.departamento) return false;
        if(estado.busca){
            const alvo = normalizar(p.codigo + " " + p.descricao + " " + p.categoria + " " + p.marca + " " + p.fornecedor);
            if(!alvo.includes(normalizar(estado.busca))) return false;
        }
        if(estado.somenteEstoqueBaixo && !(p.estoque <= p.estoqueMinimo)) return false;
        if(estado.somenteRuptura && !(p.diasCobertura <= 7 && p.estoque > 0)) return false;
        if(estado.somenteSemVenda && !p.parado) return false;
        if(estado.somenteAltaSaida && !(p.vendaMensal >= 150)) return false;
        if(estado.estoqueAte !== null && !(p.estoque <= estado.estoqueAte)) return false;
        return true;
    }

    function obterListaFiltrada(){
        return PRODUTOS.map(calcularProduto).filter(produtoPassaFiltros);
    }

    function ordenarLista(lista){
        const campo = estado.ordenarPor;
        const direcao = estado.ordenarDirecao === "desc" ? -1 : 1;

        return lista.slice().sort(function(a, b){
            let va = campo === "situacao" ? a.situacao.label : a[campo];
            let vb = campo === "situacao" ? b.situacao.label : b[campo];

            if(typeof va === "string" || typeof vb === "string"){
                return String(va || "").localeCompare(String(vb || ""), "pt-BR") * direcao;
            }
            return ((va || 0) - (vb || 0)) * direcao;
        });
    }

    /* ───────────────────────── Alertas inteligentes ───────────────────────── */

    function gerarAlertas(lista){
        const alertas = [];

        lista.forEach(function(p){
            if(p.estoque > 0 && p.vendaDiaria > 0 && p.diasCobertura < 7){
                alertas.push({ tipo:"perigo", icone:"fa-triangle-exclamation", texto: p.descricao + " pode acabar em menos de " + Math.max(1, Math.round(p.diasCobertura)) + " dia(s)", produtoId:p.id });
            }
            if(p.vendaMensal >= 150 && p.estoque <= p.estoqueMinimo){
                alertas.push({ tipo:"aviso", icone:"fa-fire", texto: p.descricao + " tem venda alta e estoque baixo", produtoId:p.id });
            }
            if(p.parado){
                alertas.push({ tipo:"neutro", icone:"fa-box-archive", texto: p.descricao + " está parado há mais de 90 dias", produtoId:p.id });
            }
            if(p.estoque > p.estoqueMaximo){
                alertas.push({ tipo:"info", icone:"fa-warehouse", texto: p.descricao + " está com estoque acima do máximo", produtoId:p.id });
            }
            if(p.proximoVencimento){
                alertas.push({ tipo:"perigo", icone:"fa-hourglass-end", texto: p.descricao + " vence em " + p.diasParaVencer + " dia(s)", produtoId:p.id });
            }
            if(!p.fornecedor){
                alertas.push({ tipo:"aviso", icone:"fa-truck", texto: p.descricao + " está sem fornecedor vinculado", produtoId:p.id });
            }
            if(!p.precoCusto){
                alertas.push({ tipo:"aviso", icone:"fa-tag", texto: p.descricao + " está sem custo cadastrado", produtoId:p.id });
            }
        });

        return alertas;
    }

    /* ───────────────────────── Formatação auxiliar ───────────────────────── */

    function formatarDiasCobertura(valor){
        if(valor === Infinity) return "—";
        return formatarQuantidade(valor).replace(",00", "");
    }

    function situacaoClasse(chave){
        return {
            urgente:"situacao-urgente",
            comprar:"situacao-comprar",
            saudavel:"situacao-saudavel",
            excesso:"situacao-excesso",
            parado:"situacao-parado",
            semHistorico:"situacao-semhistorico",
            vencimento:"situacao-vencimento"
        }[chave] || "situacao-saudavel";
    }

    /* ───────────────────────── Renderização: filtros (selects dinâmicos) ───────────────────────── */

    function preencherSelect(id, valores, comTodos){
        const select = document.getElementById(id);
        if(!select) return;
        const atual = select.value;
        const opcoes = [comTodos || "Todos"].concat(valores);
        select.innerHTML = opcoes.map(function(valor, indice){
            const v = indice === 0 ? "" : valor;
            return '<option value="' + escapar(v) + '">' + escapar(valor) + "</option>";
        }).join("");
        if([...select.options].some(function(o){ return o.value === atual; })) select.value = atual;
    }

    function inicializarFiltrosDinamicos(){
        const fornecedoresUnicos = [...new Set(PRODUTOS.map(function(p){ return p.fornecedor; }).filter(Boolean))].sort();
        const categoriasUnicas = [...new Set(PRODUTOS.map(function(p){ return p.categoria; }))].sort();
        const marcasUnicas = [...new Set(PRODUTOS.map(function(p){ return p.marca; }))].sort();
        const departamentosUnicos = [...new Set(PRODUTOS.map(function(p){ return p.departamento; }))].sort();

        preencherSelect("filtroFornecedor", fornecedoresUnicos, "Todos os fornecedores");
        preencherSelect("filtroCategoria", categoriasUnicas, "Todas as categorias");
        preencherSelect("filtroMarca", marcasUnicas, "Todas as marcas");
        preencherSelect("filtroDepartamento", departamentosUnicos, "Todos os departamentos");
    }

    /* ───────────────────────── Renderização: cards resumo ───────────────────────── */

    function atualizarResumo(lista){
        const comSugestao = lista.filter(function(p){ return quantidadeEfetiva(p) > 0 && !ignorados.has(p.id); });
        const valorEstimado = comSugestao.reduce(function(total, p){ return total + valorEstimadoEfetivo(p); }, 0);
        const emRisco = lista.filter(function(p){ return p.situacao.chave === "urgente"; }).length;
        const parados = lista.filter(function(p){ return p.parado; }).length;
        const estoqueTotal = lista.reduce(function(total, p){ return total + p.estoque; }, 0);
        const giroMedio = lista.length ? lista.reduce(function(total, p){ return total + p.vendaMensal; }, 0) / lista.length : 0;

        definirTexto("kpiAnalisados", String(lista.length));
        definirTexto("kpiComSugestao", String(comSugestao.length));
        definirTexto("kpiValorEstimado", formatarMoedaRS(valorEstimado));
        definirTexto("kpiRisco", String(emRisco));
        definirTexto("kpiParados", String(parados));
        definirTexto("kpiEstoqueTotal", formatarQuantidade(estoqueTotal).replace(",00", ""));
        definirTexto("kpiGiroMedio", formatarQuantidade(giroMedio).replace(",00", "") + " un/mês");
    }

    /* ───────────────────────── Renderização: alertas ───────────────────────── */

    function atualizarAlertas(lista){
        const destino = document.getElementById("listaAlertasCompras");
        if(!destino) return;
        const alertas = gerarAlertas(lista).slice(0, 30);
        definirTexto("contadorAlertasCompras", String(alertas.length));

        if(alertas.length === 0){
            destino.innerHTML = '<div class="alerta-vazio">Nenhum alerta no momento. Tudo sob controle.</div>';
            return;
        }

        destino.innerHTML = alertas.map(function(alerta){
            return '<button type="button" class="alerta-item alerta-' + alerta.tipo + '" data-alerta-produto="' + escapar(alerta.produtoId) + '">' +
                '<i class="fa-solid ' + alerta.icone + '"></i>' +
                '<span>' + escapar(alerta.texto) + "</span>" +
            "</button>";
        }).join("");
    }

    /* ───────────────────────── Renderização: tabela ───────────────────────── */

    function linhaTabela(p){
        const ignorado = ignorados.has(p.id);
        const qtd = quantidadeEfetiva(p);
        const valor = valorEstimadoEfetivo(p);

        return '<tr class="' + (ignorado ? "linha-ignorada" : "") + '" data-linha-produto="' + escapar(p.id) + '">' +
            "<td>" + escapar(p.codigo) + "</td>" +
            "<td><strong>" + escapar(p.descricao) + "</strong><small>" + escapar(p.marca) + " · " + escapar(p.unidade) + "</small></td>" +
            '<td><span class="tag setor">' + escapar(p.categoria) + "</span></td>" +
            "<td>" + escapar(p.fornecedor || "Sem fornecedor") + "</td>" +
            "<td>" + formatarQuantidade(p.estoque).replace(",00", "") + "</td>" +
            "<td>" + formatarQuantidade(p.estoqueMinimo).replace(",00", "") + "</td>" +
            "<td>" + formatarQuantidade(p.estoqueMaximo).replace(",00", "") + (p.estoqueMaximoEstimado ? '<small title="Estoque máximo não cadastrado no produto; valor estimado para a análise">estimado</small>' : "") + "</td>" +
            "<td>" + p.vendaDiaria.toLocaleString("pt-BR", {minimumFractionDigits:1, maximumFractionDigits:1}) + "</td>" +
            "<td>" + formatarQuantidade(p.vendaMensal).replace(",00", "") + "</td>" +
            "<td>" + formatarDiasCobertura(p.diasCobertura) + "</td>" +
            "<td>" + (p.prazoEntregaDias != null ? p.prazoEntregaDias + " dia(s)" : "—") + (p.prazoEntregaEstimado ? '<small title="Prazo padrão estimado; o fornecedor ainda não possui prazo de entrega cadastrado">estimado</small>' : "") + "</td>" +
            '<td><input type="number" min="0" step="1" class="input-qtd-sugerida" data-qtd-produto="' + escapar(p.id) + '" value="' + qtd + '"></td>' +
            "<td>" + (p.precoCusto ? formatarMoedaRS(p.precoCusto) : '<span class="text-danger">Sem custo</span>') + "</td>" +
            "<td><strong>" + formatarMoedaRS(valor) + "</strong></td>" +
            '<td><span class="tag-situacao ' + situacaoClasse(p.situacao.chave) + '">' + escapar(p.situacao.label) + "</span></td>" +
            '<td class="celula-acoes">' +
                '<button type="button" class="btn-acao-linha" title="Ver histórico de vendas" data-acao-historico="' + escapar(p.id) + '"><i class="fa-solid fa-clock-rotate-left"></i></button>' +
                '<button type="button" class="btn-acao-linha" title="Ver fornecedores" data-acao-fornecedores="' + escapar(p.id) + '"><i class="fa-solid fa-truck"></i></button>' +
                '<button type="button" class="btn-acao-linha" title="Adicionar ao pedido de compra" data-acao-adicionar="' + escapar(p.id) + '"><i class="fa-solid fa-cart-plus"></i></button>' +
                '<button type="button" class="btn-acao-linha ' + (ignorado ? "ativo" : "") + '" title="' + (ignorado ? "Reativar produto" : "Ignorar produto") + '" data-acao-ignorar="' + escapar(p.id) + '"><i class="fa-solid ' + (ignorado ? "fa-rotate-left" : "fa-ban") + '"></i></button>' +
            "</td>" +
        "</tr>";
    }

    function atualizarPaginacao(totalItens, totalPaginas){
        const nav = document.getElementById("paginacaoSugestao");
        if(!nav) return;

        if(totalItens === 0){
            nav.classList.add("oculto");
            return;
        }
        nav.classList.remove("oculto");

        definirTexto("infoPaginacao", "Página " + estado.paginaAtual + " de " + totalPaginas + " · " + totalItens + " produto(s)");
        document.getElementById("btnPaginaAnterior")?.toggleAttribute("disabled", estado.paginaAtual <= 1);
        document.getElementById("btnPaginaProxima")?.toggleAttribute("disabled", estado.paginaAtual >= totalPaginas);

        const slider = document.getElementById("sliderPaginacao");
        if(slider){
            slider.max = String(totalPaginas);
            slider.value = String(estado.paginaAtual);
        }
    }

    function atualizarTabela(lista){
        const corpo = document.getElementById("corpoTabelaSugestao");
        if(!corpo) return;

        if(lista.length === 0){
            corpo.innerHTML = '<tr><td class="vazio" colspan="16">Nenhum produto encontrado para os filtros selecionados.</td></tr>';
            definirTexto("contadorTabelaSugestao", "0 produto(s)");
            atualizarPaginacao(0, 0);
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(lista.length / estado.itensPorPagina));
        estado.paginaAtual = Math.min(Math.max(1, estado.paginaAtual), totalPaginas);
        const inicio = (estado.paginaAtual - 1) * estado.itensPorPagina;
        const pagina = lista.slice(inicio, inicio + estado.itensPorPagina);

        corpo.innerHTML = pagina.map(linhaTabela).join("");
        definirTexto("contadorTabelaSugestao", lista.length + " produto(s)");
        atualizarPaginacao(lista.length, totalPaginas);
    }

    /* ───────────────────────── Atualização geral ───────────────────────── */

    function atualizarAnalise(){
        listaCalculadaAtual = ordenarLista(obterListaFiltrada());
        atualizarResumo(listaCalculadaAtual);
        atualizarAlertas(listaCalculadaAtual);
        atualizarTabela(listaCalculadaAtual);
    }

    function localizarProdutoCalculado(id){
        return listaCalculadaAtual.find(function(p){ return p.id === id; }) || null;
    }

    /* ───────────────────────── Ações de linha ───────────────────────── */

    function alternarIgnorado(id){
        if(ignorados.has(id)) ignorados.delete(id); else ignorados.add(id);
        atualizarAnalise();
    }

    function adicionarAoPedidoManual(id){
        const produto = localizarProdutoCalculado(id);
        if(!produto) return;
        incluidosManual.add(id);
        ignorados.delete(id);
        if(quantidadeEfetiva(produto) <= 0){
            const sugestao = Math.max(1, produto.estoqueMinimo - produto.estoque);
            overridesQuantidade.set(id, sugestao);
        }

        const produtoAtualizado = localizarProdutoCalculado(id) || produto;
        itensCesta.set(id, { id: id, quantidade: quantidadeEfetiva(produtoAtualizado) || 1 });
        atualizarContadorCesta();

        atualizarAnalise();
        notificar(produto.descricao + " adicionado à cesta de compras.", "sucesso");
    }

    function conectarEventosTabela(){
        const corpo = document.getElementById("corpoTabelaSugestao");
        if(!corpo) return;

        corpo.addEventListener("click", function(evento){
            const alvo = evento.target.closest("[data-acao-historico], [data-acao-fornecedores], [data-acao-adicionar], [data-acao-ignorar]");
            if(!alvo) return;

            if(alvo.dataset.acaoHistorico) abrirModalHistorico(alvo.dataset.acaoHistorico);
            if(alvo.dataset.acaoFornecedores) abrirModalFornecedores(alvo.dataset.acaoFornecedores);
            if(alvo.dataset.acaoAdicionar) adicionarAoPedidoManual(alvo.dataset.acaoAdicionar);
            if(alvo.dataset.acaoIgnorar) alternarIgnorado(alvo.dataset.acaoIgnorar);
        });

        corpo.addEventListener("input", function(evento){
            const input = evento.target.closest("[data-qtd-produto]");
            if(!input) return;
            const id = input.dataset.qtdProduto;
            const valor = Math.max(0, Math.round(numero(input.value)));
            overridesQuantidade.set(id, valor);

            const linha = input.closest("tr");
            const produto = localizarProdutoCalculado(id);
            if(!produto || !linha) return;
            const celulaValor = linha.querySelector("td:nth-child(14) strong");
            if(celulaValor) celulaValor.textContent = formatarMoedaRS(valorEstimadoEfetivo(produto));
            atualizarResumo(listaCalculadaAtual);
        });
    }

    /* ───────────────────────── Modal: histórico de vendas ───────────────────────── */

    function desenharGraficoHistorico(canvas, historico){
        if(!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext("2d");
        const largura = canvas.width, altura = canvas.height;
        ctx.clearRect(0, 0, largura, altura);

        const dados = historico.slice(0, 30).slice().reverse();
        const maximo = Math.max(1, ...dados);
        const largBarra = largura / dados.length;

        ctx.fillStyle = "#0b66dd";
        dados.forEach(function(valor, indice){
            const alturaBarra = (valor / maximo) * (altura - 14);
            const x = indice * largBarra + 2;
            const y = altura - alturaBarra - 12;
            ctx.fillRect(x, y, Math.max(1, largBarra - 3), alturaBarra);
        });

        ctx.fillStyle = "#8299b0";
        ctx.font = "10px Segoe UI";
        ctx.fillText("Últimos 30 dias", 4, altura - 2);
    }

    function abrirModalHistorico(id){
        const produto = localizarProdutoCalculado(id);
        if(!produto) return;

        definirTexto("histTituloProduto", produto.descricao);
        definirTexto("histCodigoProduto", "Código " + produto.codigo + " · " + produto.categoria);
        definirTexto("histEstoqueAtual", formatarQuantidade(produto.estoque).replace(",00", ""));
        definirTexto("histV7", String(somarIntervalo(produto.historico, 0, 7)));
        definirTexto("histV15", String(somarIntervalo(produto.historico, 0, 15)));
        definirTexto("histV30", String(somarIntervalo(produto.historico, 0, 30)));
        definirTexto("histV60", String(somarIntervalo(produto.historico, 0, 60)));
        definirTexto("histV90", String(somarIntervalo(produto.historico, 0, 90)));
        definirTexto("histUltimaCompra", "Sem registro de compra no sistema");
        definirTexto("histUltimoFornecedor", produto.fornecedor || "Sem fornecedor vinculado");
        definirTexto("histCustoAtual", produto.precoCusto ? formatarMoedaRS(produto.precoCusto) : "Não cadastrado");
        definirTexto("histPrecoVenda", formatarMoedaRS(produto.precoVenda));

        const margem = produto.precoCusto > 0 ? ((produto.precoVenda - produto.precoCusto) / produto.precoVenda) * 100 : null;
        definirTexto("histMargem", margem !== null ? margem.toLocaleString("pt-BR", {maximumFractionDigits:1}) + "%" : "—");

        const previsao = produto.vendaDiaria > 0 && produto.diasCobertura !== Infinity
            ? dataMaisDias(Math.round(produto.diasCobertura))
            : null;
        definirTexto("histPrevisaoRuptura", previsao ? formatarData(previsao) : "Sem previsão de ruptura");

        desenharGraficoHistorico(document.getElementById("histGraficoCanvas"), produto.historico);

        document.getElementById("modalHistoricoCompras")?.classList.remove("recolhido");
    }

    function fecharModalHistorico(){
        document.getElementById("modalHistoricoCompras")?.classList.add("recolhido");
    }

    /* ───────────────────────── Modal: fornecedores do produto ───────────────────────── */

    function abrirModalFornecedores(id){
        const produto = localizarProdutoCalculado(id);
        if(!produto) return;

        const base = obterBase();
        const fornecedoresBase = (Array.isArray(base.fornecedores) ? base.fornecedores : []).filter(function(f){ return f.ativo !== false; });
        const atual = localizarFornecedorReal(produto.fornecedor, fornecedoresBase);

        definirTexto("fornTituloProduto", produto.descricao);

        const destino = document.getElementById("listaFornecedoresProduto");
        if(destino){
            destino.innerHTML = fornecedoresBase.map(function(f){
                const nome = f.razaoSocial || f.nome || "Fornecedor sem nome";
                const ativo = atual && f.id === atual.id;
                return '<div class="fornecedor-item' + (ativo ? " ativo" : "") + '">' +
                    "<div>" +
                        "<strong>" + escapar(nome) + (ativo ? ' <span class="tag ativo">Fornecedor atual</span>' : "") + "</strong>" +
                        "<span>" + escapar(f.telefone || "Telefone não cadastrado") + "</span>" +
                    "</div>" +
                    '<span class="fornecedor-prazo">Prazo padrão: ' + PRAZO_ENTREGA_PADRAO + " dia(s)</span>" +
                "</div>";
            }).join("") || '<div class="alerta-vazio">Nenhum fornecedor cadastrado no sistema. Cadastre em Cadastros &gt; Fornecedores.</div>';
        }

        document.getElementById("modalFornecedoresProduto")?.classList.remove("recolhido");
    }

    function fecharModalFornecedores(){
        document.getElementById("modalFornecedoresProduto")?.classList.add("recolhido");
    }

    /* ───────────────────────── Cesta de compras ───────────────────────── */

    function atualizarContadorCesta(){
        definirTexto("contadorCesta", String(itensCesta.size));
        document.getElementById("btnAbrirCesta")?.classList.toggle("com-itens", itensCesta.size > 0);
    }

    function removerDaCesta(id){
        itensCesta.delete(id);
        atualizarContadorCesta();
        renderizarCesta();
    }

    function limparCesta(){
        itensCesta.clear();
        atualizarContadorCesta();
        renderizarCesta();
    }

    function renderizarCesta(){
        const destino = document.getElementById("blocosCestaFornecedor");
        if(!destino) return;

        const base = obterBase();
        const fornecedoresBase = Array.isArray(base.fornecedores) ? base.fornecedores : [];
        const listaAtualCompleta = PRODUTOS.map(calcularProduto);

        const itens = [...itensCesta.values()].map(function(registro){
            const produto = listaAtualCompleta.find(function(p){ return p.id === registro.id; });
            return produto ? Object.assign({}, produto, { quantidade: registro.quantidade }) : null;
        }).filter(Boolean);

        definirTexto("contadorCestaModal", itens.length + " produto(s)");

        if(itens.length === 0){
            destino.innerHTML = '<div class="alerta-vazio">Sua cesta está vazia. Use o botão do carrinho na tabela para adicionar produtos.</div>';
            definirTexto("cestaTotalGeral", formatarMoedaRS(0));
            return;
        }

        const grupos = agruparPorFornecedor(itens);
        let totalGeral = 0;

        destino.innerHTML = [...grupos.entries()].map(function([fornecedorNome, lista]){
            const fornecedorInfo = localizarFornecedorReal(fornecedorNome, fornecedoresBase);
            const contato = fornecedorInfo?.telefone || fornecedorInfo?.email || "Contato não cadastrado";
            const subtotal = lista.reduce(function(t, i){ return t + (i.quantidade * i.precoCusto); }, 0);
            totalGeral += subtotal;

            const linhas = lista.map(function(item){
                return '<tr data-cesta-item="' + escapar(item.id) + '">' +
                    "<td>" + escapar(item.codigo) + "</td>" +
                    "<td>" + escapar(item.descricao) + "</td>" +
                    '<td><input type="number" min="1" step="1" class="input-qtd-pedido" data-cesta-qtd="' + escapar(item.id) + '" value="' + item.quantidade + '"></td>' +
                    "<td>" + formatarMoedaRS(item.precoCusto) + "</td>" +
                    '<td class="cesta-subtotal-item">' + formatarMoedaRS(item.quantidade * item.precoCusto) + "</td>" +
                    '<td><button type="button" class="btn-acao-linha" title="Remover da cesta" data-cesta-remover="' + escapar(item.id) + '"><i class="fa-solid fa-trash"></i></button></td>' +
                "</tr>";
            }).join("");

            return '<div class="bloco-fornecedor-pedido" data-cesta-fornecedor="' + escapar(fornecedorNome) + '">' +
                '<div class="bloco-fornecedor-topo">' +
                    "<h3><i class=\"fa-solid fa-truck-field\"></i> " + escapar(fornecedorNome) + "</h3>" +
                    '<span class="cesta-contato">' + escapar(contato) + "</span>" +
                    '<span class="bloco-fornecedor-subtotal">Subtotal: <strong>' + formatarMoedaRS(subtotal) + "</strong></span>" +
                "</div>" +
                '<table class="tabela-pedido-fornecedor">' +
                    "<thead><tr><th>Código</th><th>Produto</th><th>Quantidade</th><th>Custo unit.</th><th>Subtotal</th><th></th></tr></thead>" +
                    "<tbody>" + linhas + "</tbody>" +
                "</table>" +
            "</div>";
        }).join("");

        definirTexto("cestaTotalGeral", formatarMoedaRS(totalGeral));
    }

    function recalcularTotaisCesta(){
        let totalGeral = 0;
        const listaAtualCompleta = PRODUTOS.map(calcularProduto);
        document.querySelectorAll("#blocosCestaFornecedor .bloco-fornecedor-pedido").forEach(function(bloco){
            let subtotal = 0;
            bloco.querySelectorAll("tr[data-cesta-item]").forEach(function(linha){
                const id = linha.dataset.cestaItem;
                const produto = listaAtualCompleta.find(function(p){ return p.id === id; });
                const input = linha.querySelector("[data-cesta-qtd]");
                const qtd = Math.max(1, Math.round(numero(input.value)));
                if(itensCesta.has(id)) itensCesta.get(id).quantidade = qtd;
                const custo = produto ? produto.precoCusto : 0;
                const valorLinha = qtd * custo;
                linha.querySelector(".cesta-subtotal-item").textContent = formatarMoedaRS(valorLinha);
                subtotal += valorLinha;
            });
            bloco.querySelector(".bloco-fornecedor-subtotal strong").textContent = formatarMoedaRS(subtotal);
            totalGeral += subtotal;
        });
        definirTexto("cestaTotalGeral", formatarMoedaRS(totalGeral));
    }

    function abrirCesta(){
        renderizarCesta();
        document.getElementById("modalCestaCompras")?.classList.remove("recolhido");
    }

    function fecharCesta(){
        document.getElementById("modalCestaCompras")?.classList.add("recolhido");
    }

    function imprimirCesta(){
        document.body.classList.add("imprimindo-cesta");
        window.print();
    }

    window.addEventListener("afterprint", function(){
        document.body.classList.remove("imprimindo-cesta");
    });

    /* ───────────────────────── Pedido de compra ───────────────────────── */

    function itensElegiveisPedido(){
        return listaCalculadaAtual
            .filter(function(p){ return !ignorados.has(p.id) && quantidadeEfetiva(p) > 0; })
            .map(function(p){ return Object.assign({}, p, { quantidade: quantidadeEfetiva(p) }); });
    }

    function agruparPorFornecedor(itens){
        const grupos = new Map();
        itens.forEach(function(item){
            const chave = item.fornecedor || "Sem fornecedor definido";
            if(!grupos.has(chave)) grupos.set(chave, []);
            grupos.get(chave).push(item);
        });
        return grupos;
    }

    function abrirModalPedido(){
        const itens = itensElegiveisPedido();
        if(itens.length === 0){
            notificar("Nenhum produto com quantidade sugerida para gerar pedido.", "aviso");
            return;
        }

        const grupos = agruparPorFornecedor(itens);
        const destino = document.getElementById("blocosPedidoFornecedor");
        let totalGeral = 0;

        const blocos = [...grupos.entries()].map(function([fornecedor, lista]){
            const subtotal = lista.reduce(function(t, i){ return t + (i.quantidade * i.precoCusto); }, 0);
            totalGeral += subtotal;

            const linhas = lista.map(function(item){
                return "<tr data-pedido-item=\"" + escapar(item.id) + "\">" +
                    "<td>" + escapar(item.codigo) + "</td>" +
                    "<td>" + escapar(item.descricao) + "</td>" +
                    '<td><input type="number" min="1" step="1" class="input-qtd-pedido" data-pedido-qtd="' + escapar(item.id) + '" value="' + item.quantidade + '"></td>' +
                    "<td>" + formatarMoedaRS(item.precoCusto) + "</td>" +
                    '<td class="pedido-subtotal-item">' + formatarMoedaRS(item.quantidade * item.precoCusto) + "</td>" +
                "</tr>";
            }).join("");

            return '<div class="bloco-fornecedor-pedido" data-fornecedor-bloco="' + escapar(fornecedor) + '">' +
                '<div class="bloco-fornecedor-topo">' +
                    "<h3><i class=\"fa-solid fa-truck-field\"></i> " + escapar(fornecedor) + "</h3>" +
                    '<span class="bloco-fornecedor-subtotal">Subtotal: <strong>' + formatarMoedaRS(subtotal) + "</strong></span>" +
                "</div>" +
                '<table class="tabela-pedido-fornecedor">' +
                    "<thead><tr><th>Código</th><th>Produto</th><th>Quantidade</th><th>Custo unit.</th><th>Subtotal</th></tr></thead>" +
                    "<tbody>" + linhas + "</tbody>" +
                "</table>" +
            "</div>";
        }).join("");

        if(destino) destino.innerHTML = blocos;
        definirTexto("pedidoTotalGeral", formatarMoedaRS(totalGeral));
        definirTexto("pedidoQtdFornecedores", grupos.size + " fornecedor(es)");

        document.getElementById("modalPedidoCompra")?.classList.remove("recolhido");
    }

    function recalcularTotaisPedido(){
        let totalGeral = 0;
        document.querySelectorAll(".bloco-fornecedor-pedido").forEach(function(bloco){
            let subtotal = 0;
            bloco.querySelectorAll("tr[data-pedido-item]").forEach(function(linha){
                const id = linha.dataset.pedidoItem;
                const item = itensElegiveisPedido().find(function(i){ return i.id === id; });
                const input = linha.querySelector("[data-pedido-qtd]");
                const qtd = Math.max(1, Math.round(numero(input.value)));
                const custo = item ? item.precoCusto : 0;
                const valorLinha = qtd * custo;
                linha.querySelector(".pedido-subtotal-item").textContent = formatarMoedaRS(valorLinha);
                subtotal += valorLinha;
                overridesQuantidade.set(id, qtd);
            });
            bloco.querySelector(".bloco-fornecedor-subtotal strong").textContent = formatarMoedaRS(subtotal);
            totalGeral += subtotal;
        });
        definirTexto("pedidoTotalGeral", formatarMoedaRS(totalGeral));
    }

    function fecharModalPedido(){
        document.getElementById("modalPedidoCompra")?.classList.add("recolhido");
    }

    function confirmarPedidoCompra(){
        const itens = itensElegiveisPedido();
        const grupos = agruparPorFornecedor(itens);
        const base = obterBase();
        if(!Array.isArray(base.pedidosCompra)) base.pedidosCompra = [];

        grupos.forEach(function(lista, fornecedor){
            const valorTotal = lista.reduce(function(t, i){ return t + (i.quantidade * i.precoCusto); }, 0);
            base.pedidosCompra.push({
                id: gerarId("PC"),
                fornecedor: fornecedor,
                itens: lista.map(function(i){
                    return { produtoId:i.id, codigo:i.codigo, descricao:i.descricao, quantidade:i.quantidade, custoUnitario:i.precoCusto };
                }),
                valorTotal: valorTotal,
                status: "Em aberto",
                criadoEm: new Date().toISOString()
            });
        });

        salvarBase(base);
        fecharModalPedido();
        notificar("Pedido(s) de compra gerado(s) com status Em aberto para " + grupos.size + " fornecedor(es).", "sucesso");
        atualizarAnalise();
    }

    /* ───────────────────────── Exportar / imprimir ───────────────────────── */

    function exportarExcel(){
        const cabecalho = ["Código","Produto","Categoria","Fornecedor","Estoque atual","Estoque mínimo","Estoque máximo","Venda média diária","Venda média mensal","Dias de cobertura","Prazo de entrega","Quantidade sugerida","Custo unitário","Valor estimado","Situação"];
        const linhas = listaCalculadaAtual.map(function(p){
            return [
                p.codigo, p.descricao, p.categoria, p.fornecedor || "Sem fornecedor",
                p.estoque, p.estoqueMinimo, p.estoqueMaximo,
                p.vendaDiaria.toFixed(2), p.vendaMensal.toFixed(0),
                p.diasCobertura === Infinity ? "" : p.diasCobertura.toFixed(0),
                p.prazoEntregaDias != null ? p.prazoEntregaDias : "",
                quantidadeEfetiva(p), p.precoCusto.toFixed(2), valorEstimadoEfetivo(p).toFixed(2), p.situacao.label
            ].map(function(campo){ return '"' + String(campo).replaceAll('"', '""') + '"'; }).join(";");
        });

        const conteudo = "﻿" + [cabecalho.join(";")].concat(linhas).join("\r\n");
        const blob = new Blob([conteudo], { type:"text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sugestao-compras-" + new Date().toISOString().slice(0,10) + ".csv";
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function imprimirRelatorio(){
        window.print();
    }

    /* ───────────────────────── Filtros: eventos ───────────────────────── */

    function lerFiltrosDoFormulario(){
        estado.diasPeriodo = document.getElementById("filtroPeriodo")?.value || "30";
        estado.dataInicioPersonalizado = document.getElementById("filtroDataInicio")?.value || null;
        estado.dataFimPersonalizado = document.getElementById("filtroDataFim")?.value || null;
        estado.coberturaDesejada = numero(document.getElementById("filtroCobertura")?.value) || 30;
        estado.fornecedor = document.getElementById("filtroFornecedor")?.value || "";
        estado.categoria = document.getElementById("filtroCategoria")?.value || "";
        estado.marca = document.getElementById("filtroMarca")?.value || "";
        estado.departamento = document.getElementById("filtroDepartamento")?.value || "";
        estado.somenteEstoqueBaixo = document.getElementById("filtroEstoqueBaixo")?.checked || false;
        estado.somenteRuptura = document.getElementById("filtroRuptura")?.checked || false;
        estado.somenteSemVenda = document.getElementById("filtroSemVenda")?.checked || false;
        estado.somenteAltaSaida = document.getElementById("filtroAltaSaida")?.checked || false;
        estado.busca = document.getElementById("buscaSugestaoCompras")?.value || "";
        estado.estoqueAte = document.getElementById("filtroEstoqueAte")?.value !== ""
            ? numero(document.getElementById("filtroEstoqueAte")?.value)
            : null;
        estado.ordenarPor = document.getElementById("filtroOrdenarPor")?.value || "codigo";
        estado.ordenarDirecao = document.getElementById("filtroOrdenarDirecao")?.value || "asc";
    }

    function alternarPeriodoPersonalizado(){
        const personalizado = document.getElementById("filtroPeriodo")?.value === "personalizado";
        document.getElementById("grupoPeriodoPersonalizado")?.classList.toggle("oculto", !personalizado);
    }

    function limparFiltros(){
        document.getElementById("formFiltrosSugestao")?.reset();
        document.getElementById("buscaSugestaoCompras").value = "";
        document.getElementById("filtroCobertura").value = "30";
        document.getElementById("filtroEstoqueAte").value = "";
        alternarPeriodoPersonalizado();
        lerFiltrosDoFormulario();
        estado.paginaAtual = 1;
        atualizarAnalise();
    }

    function conectarFiltros(){
        const formulario = document.getElementById("formFiltrosSugestao");
        if(!formulario) return;

        formulario.addEventListener("change", function(){
            alternarPeriodoPersonalizado();
            lerFiltrosDoFormulario();
            estado.paginaAtual = 1;
            atualizarAnalise();
        });

        document.getElementById("buscaSugestaoCompras")?.addEventListener("input", function(){
            lerFiltrosDoFormulario();
            estado.paginaAtual = 1;
            atualizarAnalise();
        });

        document.getElementById("btnAtualizarAnalise")?.addEventListener("click", function(){
            lerFiltrosDoFormulario();
            estado.paginaAtual = 1;
            atualizarAnalise();
            notificar("Análise atualizada.", "sucesso");
        });

        document.getElementById("btnLimparFiltros")?.addEventListener("click", limparFiltros);
    }

    function conectarPaginacao(){
        document.getElementById("btnPaginaAnterior")?.addEventListener("click", function(){
            estado.paginaAtual -= 1;
            atualizarTabela(listaCalculadaAtual);
        });

        document.getElementById("btnPaginaProxima")?.addEventListener("click", function(){
            estado.paginaAtual += 1;
            atualizarTabela(listaCalculadaAtual);
        });

        document.getElementById("sliderPaginacao")?.addEventListener("input", function(evento){
            estado.paginaAtual = Number(evento.target.value) || 1;
            atualizarTabela(listaCalculadaAtual);
        });

        document.getElementById("filtroItensPorPagina")?.addEventListener("change", function(evento){
            estado.itensPorPagina = Number(evento.target.value) || 25;
            estado.paginaAtual = 1;
            atualizarTabela(listaCalculadaAtual);
        });
    }

    /* ───────────────────────── Conexão geral de botões/modais ───────────────────────── */

    function conectarBotoesPrincipais(){
        document.getElementById("btnGerarPedidoCompra")?.addEventListener("click", abrirModalPedido);
        document.getElementById("btnExportarExcel")?.addEventListener("click", exportarExcel);
        document.getElementById("btnImprimirSugestao")?.addEventListener("click", imprimirRelatorio);

        document.getElementById("btnFecharModalHistorico")?.addEventListener("click", fecharModalHistorico);
        document.getElementById("modalHistoricoCompras")?.addEventListener("click", function(evento){
            if(evento.target?.id === "modalHistoricoCompras") fecharModalHistorico();
        });

        document.getElementById("btnFecharModalFornecedores")?.addEventListener("click", fecharModalFornecedores);
        document.getElementById("modalFornecedoresProduto")?.addEventListener("click", function(evento){
            if(evento.target?.id === "modalFornecedoresProduto") fecharModalFornecedores();
        });

        document.getElementById("btnFecharModalPedido")?.addEventListener("click", fecharModalPedido);
        document.getElementById("btnCancelarPedido")?.addEventListener("click", fecharModalPedido);
        document.getElementById("btnConfirmarPedido")?.addEventListener("click", confirmarPedidoCompra);
        document.getElementById("modalPedidoCompra")?.addEventListener("click", function(evento){
            if(evento.target?.id === "modalPedidoCompra") fecharModalPedido();
        });
        document.getElementById("blocosPedidoFornecedor")?.addEventListener("input", function(evento){
            if(evento.target.closest("[data-pedido-qtd]")) recalcularTotaisPedido();
        });

        document.getElementById("btnAbrirCesta")?.addEventListener("click", abrirCesta);
        document.getElementById("btnFecharModalCesta")?.addEventListener("click", fecharCesta);
        document.getElementById("modalCestaCompras")?.addEventListener("click", function(evento){
            if(evento.target?.id === "modalCestaCompras") fecharCesta();
        });
        document.getElementById("btnLimparCesta")?.addEventListener("click", limparCesta);
        document.getElementById("btnImprimirCesta")?.addEventListener("click", imprimirCesta);
        document.getElementById("blocosCestaFornecedor")?.addEventListener("input", function(evento){
            if(evento.target.closest("[data-cesta-qtd]")) recalcularTotaisCesta();
        });
        document.getElementById("blocosCestaFornecedor")?.addEventListener("click", function(evento){
            const botao = evento.target.closest("[data-cesta-remover]");
            if(botao) removerDaCesta(botao.dataset.cestaRemover);
        });

        document.getElementById("listaAlertasCompras")?.addEventListener("click", function(evento){
            const item = evento.target.closest("[data-alerta-produto]");
            if(!item) return;
            const linha = document.querySelector('[data-linha-produto="' + CSS.escape(item.dataset.alertaProduto) + '"]');
            if(linha){
                linha.scrollIntoView({ behavior:"smooth", block:"center" });
                linha.classList.add("linha-destacada");
                setTimeout(function(){ linha.classList.remove("linha-destacada"); }, 1600);
            }
        });
    }

    /* ───────────────────────── Inicialização ───────────────────────── */

    document.addEventListener("DOMContentLoaded", function(){
        PRODUTOS = carregarProdutosReais();
        inicializarFiltrosDinamicos();
        conectarFiltros();
        conectarPaginacao();
        conectarBotoesPrincipais();
        conectarEventosTabela();
        alternarPeriodoPersonalizado();
        atualizarContadorCesta();

        if(PRODUTOS.length === 0){
            const corpo = document.getElementById("corpoTabelaSugestao");
            if(corpo) corpo.innerHTML = '<tr><td class="vazio" colspan="16">Nenhuma mercadoria ativa cadastrada. Cadastre produtos em Cadastros &gt; Mercadorias para ver a análise aqui.</td></tr>';
            return;
        }

        atualizarAnalise();
    });

})();
