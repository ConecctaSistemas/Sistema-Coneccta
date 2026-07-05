/* conversaodados.js */
/* Extraido de manutencao.js (painel "Conversão de Dados") para virar pagina propria. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    conectarConversaoDados();
    renderizarLogConversao();
    document.getElementById("conversaoArquivo")?.focus({ preventScroll: true });
});

const conversaoEstado = {
        arquivo: null,
        colunas: [],
        linhas: [],
        mapeamento: {},
        avaliadas: [],
        ultimoRelatorio: []
    };

const nomesEntidadesConversao = {
        produtos: "Produtos",
        clientes: "Clientes",
        fornecedores: "Fornecedores",
        estoque: "Estoque",
        tabelasPreco: "Tabela de precos",
        formasPagamento: "Formas de pagamento",
        contasReceber: "Contas a receber",
        contasPagar: "Contas a pagar",
        vendasHistoricas: "Vendas historicas",
        usuarios: "Usuarios",
        regrasFiscais: "Regras fiscais"
    };

const nomesImportacaoConversao = {
        produtos: "Produtos importados",
        clientes: "Clientes importados",
        fornecedores: "Fornecedores importados",
        estoque: "Estoque importado",
        tabelasPreco: "Tabela de precos importada",
        formasPagamento: "Formas de pagamento importadas",
        contasReceber: "Contas a receber importadas",
        contasPagar: "Contas a pagar importadas",
        vendasHistoricas: "Vendas historicas importadas",
        usuarios: "Usuarios importados",
        regrasFiscais: "Regras fiscais importadas"
    };

const nomesErroImportacaoConversao = {
        produtos: "produtos",
        clientes: "clientes",
        fornecedores: "fornecedores",
        estoque: "itens de estoque",
        tabelasPreco: "precos",
        formasPagamento: "formas de pagamento",
        contasReceber: "contas a receber",
        contasPagar: "contas a pagar",
        vendasHistoricas: "vendas historicas",
        usuarios: "usuarios",
        regrasFiscais: "regras fiscais"
    };

const camposConversao = {
        produtos: ["codigo_interno","descricao","codigo_barras","unidade","preco_custo","preco_venda","estoque_atual","ncm","cest","cfop","origem","cst_icms","csosn","cst_pis","cst_cofins","aliquota_icms","aliquota_pis","aliquota_cofins","ativo"],
        clientes: ["nome","cpf_cnpj","telefone","email","endereco","bairro","cidade","uf","cep","limite_credito","ativo"],
        fornecedores: ["razao_social","nome_fantasia","cnpj","telefone","email","endereco","cidade","uf","cep","ativo"],
        estoque: ["codigo_produto","descricao_produto","quantidade","custo_unitario","local_estoque"],
        tabelasPreco: ["codigo_produto","nome_tabela","preco","ativa"],
        formasPagamento: ["descricao","tipo","ativo"],
        contasReceber: ["cliente","documento","vencimento","valor","saldo","status"],
        contasPagar: ["fornecedor","documento","vencimento","valor","saldo","status"],
        vendasHistoricas: ["codigo_venda","data","cliente","produto","quantidade","valor_unitario","total","pagamento"],
        usuarios: ["nome","login","email","perfil","ativo"],
        regrasFiscais: ["ncm","cest","cfop","origem","cst_icms","csosn","cst_pis","cst_cofins","aliquota_icms","aliquota_pis","aliquota_cofins"]
    };

const sinonimosConversao = {
        codigo_interno: ["codigo","cod","id produto","id_produto","sku","referencia","cod interno","codigo interno"],
        descricao: ["produto","descricao","descrição","nome item","nome produto","item","mercadoria"],
        codigo_barras: ["ean","codigo de barras","código de barras","barras","cod barras","gtin"],
        unidade: ["unidade","un","und","u.m.","um"],
        preco_venda: ["preco","preço","valor venda","venda","preco venda","preço venda","valor"],
        preco_custo: ["custo","preco custo","preço custo","valor custo"],
        estoque_atual: ["qtd","estoque","saldo","quantidade","estoque atual"],
        ncm: ["ncm"],
        cest: ["cest"],
        cfop: ["cfop"],
        origem: ["origem","origem mercadoria"],
        cst_icms: ["cst","cst icms","cst_icms"],
        csosn: ["csosn"],
        cst_pis: ["pis","cst pis","cst_pis"],
        cst_cofins: ["cofins","cst cofins","cst_cofins"],
        aliquota_icms: ["icms","aliquota icms","alíquota icms"],
        aliquota_pis: ["aliquota pis","alíquota pis"],
        aliquota_cofins: ["aliquota cofins","alíquota cofins"],
        ativo: ["ativo","situacao","situação","status"],
        nome: ["nome","cliente","nome cliente","razao social","razão social"],
        cpf_cnpj: ["cpf","cnpj","cpf cnpj","cpf/cnpj","documento"],
        telefone: ["telefone","fone","celular","whatsapp"],
        email: ["email","e-mail"],
        endereco: ["endereco","endereço","logradouro","rua"],
        bairro: ["bairro"],
        cidade: ["cidade","municipio","município"],
        uf: ["uf","estado"],
        cep: ["cep"],
        limite_credito: ["limite","limite credito","limite crédito"],
        razao_social: ["razao social","razão social","fornecedor"],
        nome_fantasia: ["fantasia","nome fantasia"],
        codigo_produto: ["codigo produto","cod produto","produto codigo","produto código"],
        descricao_produto: ["descricao produto","descrição produto","produto"],
        quantidade: ["quantidade","qtd","saldo","estoque"],
        custo_unitario: ["custo unitario","custo unitário","preco custo"],
        local_estoque: ["local","deposito","depósito","almoxarifado"]
    };

function notificarConversao(texto, tipo = "info"){
        const mensagem = document.getElementById("conversaoMensagem");
        if(mensagem){
            mensagem.textContent = texto;
            mensagem.className = `conversao-mensagem visivel ${tipo}`;
        }
        if(window.notificar){
            window.notificar(texto, tipo);
        }
    }

function limparMensagemConversao(){
        const mensagem = document.getElementById("conversaoMensagem");
        if(mensagem){
            mensagem.textContent = "";
            mensagem.className = "conversao-mensagem";
        }
    }

function conectarConversaoDados(){
        document.getElementById("btnConversaoLer")?.addEventListener("click", lerArquivoConversao);
        document.getElementById("btnConversaoLimpar")?.addEventListener("click", limparConversaoDados);
        document.getElementById("btnConversaoImportar")?.addEventListener("click", importarConversaoDados);
        document.getElementById("btnConversaoRelatorio")?.addEventListener("click", baixarRelatorioConversao);
        document.getElementById("btnConversaoRollback")?.addEventListener("click", rollbackConversaoDados);
        document.getElementById("btnConversaoModelo")?.addEventListener("click", baixarModeloConversao);
        document.getElementById("btnConversaoExportar")?.addEventListener("click", baixarDadosConversaoSelecionado);
        document.getElementById("btnConversaoExportarTudo")?.addEventListener("click", baixarDadosConversaoTudo);
        document.getElementById("conversaoEntidade")?.addEventListener("change", function(){
            if(conversaoEstado.linhas.length) prepararMapeamentoConversao();
        });
    }

async function lerArquivoConversao(){
        const arquivo = document.getElementById("conversaoArquivo")?.files?.[0];
        if(!arquivo){
            notificarConversao("Selecione o arquivo exportado do sistema antigo.", "aviso");
            return;
        }
        limparMensagemConversao();
        conversaoEstado.arquivo = arquivo;

        try{
            const ext = arquivo.name.split(".").pop().toLowerCase();
            const texto = ext === "xlsx" ? "" : await arquivo.text();
            let linhas = [];
            if(ext === "json") linhas = parseJsonConversao(texto);
            else if(ext === "xml") linhas = parseXmlConversao(texto);
            else if(ext === "sql") linhas = parseSqlConversao(texto);
            else if(ext === "xlsx") linhas = await parseXlsxConversao(arquivo);
            else linhas = parseCsvConversao(texto);

            conversaoEstado.linhas = linhas;
            conversaoEstado.colunas = obterColunasConversao(linhas);
            prepararMapeamentoConversao();
            mostrarStatus("statusConversaoDados", `${linhas.length} registro(s) lido(s)`);
            const comErro = conversaoEstado.avaliadas.filter(function(linha){ return linha.status === "erro"; }).length;
            if(comErro){
                notificarConversao(`${comErro} registro(s) com erro. Corrija o mapeamento ou o arquivo antes de importar.`, "erro");
            }else{
                notificarConversao(`${linhas.length} registro(s) lido(s) e pronto(s) para importacao.`, "sucesso");
            }
        }catch(erro){
            console.error(erro);
            notificarConversao(erro.message || "Nao foi possivel ler o arquivo.", "erro");
        }
    }

function parseJsonConversao(texto){
        const dados = JSON.parse(texto);
        if(Array.isArray(dados)) return dados;
        const primeiraLista = Object.values(dados).find(Array.isArray);
        return primeiraLista || [dados];
    }

function parseXmlConversao(texto){
        const doc = new DOMParser().parseFromString(texto, "application/xml");
        const erro = doc.querySelector("parsererror");
        if(erro) throw new Error("XML invalido.");
        const candidatos = Array.from(doc.documentElement.children);
        const linhas = candidatos.length ? candidatos : Array.from(doc.querySelectorAll("*")).filter(function(no){ return no.children.length; });
        return linhas.map(function(no){
            const obj = {};
            Array.from(no.children).forEach(function(filho){ obj[filho.nodeName] = filho.textContent; });
            return obj;
        }).filter(function(obj){ return Object.keys(obj).length; });
    }

function parseSqlConversao(texto){
        const linhas = [];
        const regex = /insert\s+into\s+[`"\[]?[\w.-]+[`"\]]?\s*\(([^)]+)\)\s*values\s*([\s\S]*?);/gi;
        let match;
        while((match = regex.exec(texto))){
            const colunas = match[1].split(",").map(function(c){ return c.replace(/[`"[\]]/g, "").trim(); });
            const valores = match[2].match(/\(([^()]*)\)/g) || [];
            valores.forEach(function(grupo){
                const partes = separarCsv(grupo.slice(1, -1));
                const obj = {};
                colunas.forEach(function(coluna, i){ obj[coluna] = String(partes[i] || "").replace(/^'|'$/g, ""); });
                linhas.push(obj);
            });
        }
        return linhas;
    }

async function parseXlsxConversao(arquivo){
        if(!window.XLSX){
            throw new Error("Importacao XLSX preparada para integracao com back-end ou biblioteca XLSX no front-end.");
        }
        const buffer = await arquivo.arrayBuffer();
        const wb = window.XLSX.read(buffer, { type:"array" });
        return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:"" });
    }

function parseCsvConversao(texto){
        const linhasTexto = texto.split(/\r?\n/).filter(function(l){ return l.trim(); });
        if(!linhasTexto.length) return [];
        const separador = detectarSeparadorConversao(linhasTexto[0]);
        const colunas = separarCsv(linhasTexto[0], separador).map(function(c){ return limparTextoConversao(c); });
        return linhasTexto.slice(1).map(function(linha){
            const valores = separarCsv(linha, separador);
            const obj = {};
            colunas.forEach(function(coluna, i){ obj[coluna] = valores[i] ?? ""; });
            return obj;
        });
    }

function detectarSeparadorConversao(linha){
        return [";","\t",",","|"].sort(function(a,b){
            return linha.split(b).length - linha.split(a).length;
        })[0];
    }

function separarCsv(linha, separador = ","){
        const saida = [];
        let atual = "", aspas = false;
        for(let i = 0; i < linha.length; i++){
            const c = linha[i];
            if(c === '"'){ aspas = !aspas; continue; }
            if(c === separador && !aspas){ saida.push(atual.trim()); atual = ""; continue; }
            atual += c;
        }
        saida.push(atual.trim());
        return saida;
    }

function obterColunasConversao(linhas){
        const set = new Set();
        linhas.forEach(function(linha){ Object.keys(linha || {}).forEach(function(c){ set.add(c); }); });
        return [...set];
    }

function prepararMapeamentoConversao(){
        const entidade = document.getElementById("conversaoEntidade")?.value || "produtos";
        const campos = camposConversao[entidade] || [];
        conversaoEstado.mapeamento = {};
        conversaoEstado.colunas.forEach(function(coluna){
            conversaoEstado.mapeamento[coluna] = sugerirCampoConversao(coluna, campos);
        });
        renderizarMapeamentoConversao(campos);
        avaliarConversao();
    }

function sugerirCampoConversao(coluna, campos){
        const nome = normalizarConversao(coluna);
        for(const campo of campos){
            const sinonimos = [campo, ...(sinonimosConversao[campo] || [])];
            if(sinonimos.some(function(s){ return normalizarConversao(s) === nome || nome.includes(normalizarConversao(s)); })) return campo;
        }
        return "";
    }

function renderizarMapeamentoConversao(campos){
        const destino = document.getElementById("conversaoMapeamento");
        if(!destino) return;
        if(!conversaoEstado.colunas.length){
            destino.innerHTML = '<div class="conversao-vazio">Nenhuma coluna encontrada.</div>';
            return;
        }
        destino.innerHTML = conversaoEstado.colunas.map(function(coluna){
            return `<label class="conversao-mapa-linha">
                <span>${escaparHtml(coluna)}</span>
                <select data-conversao-coluna="${escaparHtml(coluna)}">
                    <option value="">Ignorar coluna</option>
                    ${campos.map(function(campo){
                        return `<option value="${campo}"${conversaoEstado.mapeamento[coluna] === campo ? " selected" : ""}>${campo}</option>`;
                    }).join("")}
                </select>
            </label>`;
        }).join("");
        destino.querySelectorAll("[data-conversao-coluna]").forEach(function(select){
            select.addEventListener("change", function(){
                conversaoEstado.mapeamento[select.dataset.conversaoColuna] = select.value;
                avaliarConversao();
            });
        });
    }

function avaliarConversao(){
        const entidade = document.getElementById("conversaoEntidade")?.value || "produtos";
        conversaoEstado.avaliadas = conversaoEstado.linhas.map(function(original, indice){
            const convertido = converterLinhaConversao(original, entidade);
            const validacao = validarLinhaConversao(convertido, entidade);
            return { indice: indice + 1, original, convertido, status: validacao.status, motivos: validacao.motivos };
        });
        renderizarPreviewConversao();
    }

function converterLinhaConversao(original, entidade){
        const convertido = {};
        Object.entries(conversaoEstado.mapeamento).forEach(function([coluna, campo]){
            if(!campo) return;
            convertido[campo] = normalizarValorConversao(campo, original[coluna], entidade);
        });
        return convertido;
    }

function normalizarValorConversao(campo, valor){
        let texto = limparTextoConversao(valor);
        if(["cpf_cnpj","cnpj","telefone","cep","codigo_barras","codigo_interno","codigo_produto"].includes(campo)) return somenteNumeros(texto);
        if(["ncm"].includes(campo)) return somenteNumeros(texto).padStart(8, "0").slice(-8);
        if(["cest"].includes(campo)) return somenteNumeros(texto).padStart(7, "0").slice(-7);
        if(campo === "uf") return texto.toUpperCase().slice(0, 2);
        if(campo.includes("preco") || campo.includes("valor") || campo.includes("custo") || campo.includes("saldo") || campo.includes("limite") || campo.includes("aliquota") || campo === "quantidade" || campo === "estoque_atual") return numero(texto);
        if(campo.includes("data") || campo === "vencimento") return normalizarDataConversao(texto);
        if(campo === "ativo") return normalizarBooleano(texto, true);
        return texto;
    }

function validarLinhaConversao(dados, entidade){
        const motivos = [];
        const alertas = [];
        const base = obterBaseLocal();
        if(entidade === "produtos"){
            if(!dados.descricao) motivos.push("Produto sem descricao");
            if(numero(dados.preco_venda) <= 0) alertas.push("Preco zerado");
            if(numero(dados.estoque_atual) < 0) motivos.push("Estoque negativo");
            if(dados.codigo_barras && (base.mercadorias || []).some(function(p){ return somenteNumeros(p.ean) === dados.codigo_barras; })) alertas.push("Codigo de barras duplicado");
            if(dados.ncm && !/^\d{8}$/.test(dados.ncm)) motivos.push("NCM invalido");
            if(dados.cest && !/^\d{7}$/.test(dados.cest)) motivos.push("CEST invalido");
            if(dados.codigo_interno && (base.mercadorias || []).some(function(p){ return String(p.codigo) === String(dados.codigo_interno); })) alertas.push("Produto ja cadastrado");
        }
        if(entidade === "clientes"){
            if(!dados.nome) motivos.push("Cliente sem nome");
            if(dados.cpf_cnpj && !validarCpfCnpjConversao(dados.cpf_cnpj)) motivos.push("CPF/CNPJ invalido");
            if(dados.cpf_cnpj && (base.clientes || []).some(function(c){ return somenteNumeros(c.cpf || c.cnpj || c.cpfCnpj) === dados.cpf_cnpj; })) alertas.push("Cliente ja cadastrado");
        }
        if(entidade === "fornecedores"){
            if(!dados.razao_social && !dados.nome_fantasia) motivos.push("Fornecedor sem nome");
            if(dados.cnpj && !validarCpfCnpjConversao(dados.cnpj)) motivos.push("CNPJ invalido");
            if(dados.cnpj && (base.fornecedores || []).some(function(f){ return somenteNumeros(f.cnpj) === dados.cnpj; })) alertas.push("Fornecedor ja cadastrado");
        }
        if(entidade === "estoque"){
            if(!dados.codigo_produto && !dados.descricao_produto) motivos.push("Produto nao identificado");
            if(numero(dados.quantidade) < 0) motivos.push("Estoque negativo");
        }
        return { status: motivos.length ? "erro" : (alertas.length ? "alerta" : "valido"), motivos: [...motivos, ...alertas] };
    }

function renderizarPreviewConversao(){
        const resumo = { lidos: conversaoEstado.avaliadas.length, valido:0, alerta:0, erro:0 };
        conversaoEstado.avaliadas.forEach(function(l){ resumo[l.status] += 1; });
        const resumoEl = document.getElementById("conversaoResumo");
        if(resumoEl){
            resumoEl.innerHTML = `<span>Lidos: ${resumo.lidos}</span><span>Validos: ${resumo.valido}</span><span>Alertas: ${resumo.alerta}</span><span>Erros: ${resumo.erro}</span>`;
        }
        const destino = document.getElementById("conversaoPreview");
        if(!destino) return;
        if(!conversaoEstado.avaliadas.length){
            destino.innerHTML = '<div class="conversao-vazio">Nenhum registro para exibir.</div>';
            return;
        }
        const linhas = conversaoEstado.avaliadas.slice(0, 80);
        destino.innerHTML = `<table><thead><tr><th>#</th><th>Original</th><th>Convertido</th><th>Status</th><th>Motivo</th></tr></thead><tbody>
            ${linhas.map(function(linha){
                return `<tr class="conversao-status-${linha.status}">
                    <td>${linha.indice}</td>
                    <td><code>${escaparHtml(JSON.stringify(linha.original))}</code></td>
                    <td><code>${escaparHtml(JSON.stringify(linha.convertido))}</code></td>
                    <td><strong>${linha.status}</strong></td>
                    <td>${escaparHtml(linha.motivos.join("; "))}</td>
                </tr>`;
            }).join("")}
        </tbody></table>`;
        document.getElementById("btnConversaoImportar").disabled = resumo.valido + resumo.alerta === 0;
        document.getElementById("btnConversaoRelatorio").disabled = false;
        conversaoEstado.ultimoRelatorio = conversaoEstado.avaliadas;
    }

function importarConversaoDados(){
        const entidade = document.getElementById("conversaoEntidade")?.value || "produtos";
        if(!conversaoEstado.avaliadas.length){
            notificarConversao("Leia um arquivo antes de importar.", "aviso");
            return;
        }
        let politica = document.getElementById("conversaoDuplicados")?.value || "perguntar";
        if(politica === "perguntar"){
            const temDuplicado = conversaoEstado.avaliadas.some(function(linha){
                return linha.status !== "erro" && linha.motivos.some(function(motivo){ return /duplicado|cadastrado/i.test(motivo); });
            });
            if(temDuplicado){
                notificarConversao("Existem registros duplicados. Selecione Ignorar, Atualizar ou Cadastrar como novo antes de importar.", "aviso");
                return;
            }
            politica = "ignorar";
        }
        const base = obterBaseLocal();
        const antes = JSON.parse(JSON.stringify(base));
        let importados = 0, erros = 0, duplicados = 0, ignorados = 0;
        conversaoEstado.avaliadas.forEach(function(linha){
            if(linha.status === "erro"){ erros++; return; }
            const resultado = inserirLinhaConvertida(base, entidade, linha.convertido, politica);
            importados += resultado.importado ? 1 : 0;
            duplicados += resultado.duplicado ? 1 : 0;
            ignorados += resultado.ignorado ? 1 : 0;
        });
        const log = {
            id: gerarIdLocal("imp"),
            arquivo: conversaoEstado.arquivo?.name || "",
            data: new Date().toISOString(),
            usuario: window.AuthSistema?.usuarioAtual?.()?.nome || window.AuthSistema?.usuarioAtual?.()?.login || "Usuario",
            entidade,
            lidos: conversaoEstado.avaliadas.length,
            importados,
            erros,
            duplicados,
            ignorados
        };
        base.logsImportacao = Array.isArray(base.logsImportacao) ? base.logsImportacao : [];
        base.logsImportacao.unshift(log);
        base.rollbackImportacao = { log, baseAntes: antes };
        salvarBaseLocal(base);
        mostrarStatus("statusConversaoDados", `${importados} importado(s), ${erros} erro(s)`);
        renderizarLogConversao();
        limparConversaoAposImportacao();
        if(importados > 0 && erros === 0){
            notificarConversao(`${nomesImportacaoConversao[entidade] || "Registros importados"}: ${importados}.`, "sucesso");
        }else if(importados > 0){
            notificarConversao(`${nomesImportacaoConversao[entidade] || "Registros importados"}: ${importados}. ${erros} registro(s) com erro nao foram importados.`, "aviso");
        }else{
            notificarConversao(`Nenhum ${nomesErroImportacaoConversao[entidade] || "registro"} foi importado. Verifique os erros na pre-visualizacao.`, "erro");
        }
    }

function limparConversaoAposImportacao(){
        conversaoEstado.arquivo = null;
        conversaoEstado.colunas = [];
        conversaoEstado.linhas = [];
        conversaoEstado.mapeamento = {};
        conversaoEstado.avaliadas = [];
        conversaoEstado.ultimoRelatorio = [];
        const arq = document.getElementById("conversaoArquivo");
        if(arq) arq.value = "";
        const mapeamento = document.getElementById("conversaoMapeamento");
        if(mapeamento) mapeamento.innerHTML = '<div class="conversao-vazio">Selecione e leia um arquivo para mapear as colunas.</div>';
        const preview = document.getElementById("conversaoPreview");
        if(preview) preview.innerHTML = '<div class="conversao-vazio">Importacao finalizada. Selecione outro arquivo para uma nova importacao.</div>';
        const resumo = document.getElementById("conversaoResumo");
        if(resumo) resumo.innerHTML = '<span>Lidos: 0</span><span>Validos: 0</span><span>Alertas: 0</span><span>Erros: 0</span>';
        const importar = document.getElementById("btnConversaoImportar");
        if(importar) importar.disabled = true;
        const relatorio = document.getElementById("btnConversaoRelatorio");
        if(relatorio) relatorio.disabled = true;
    }

function inserirLinhaConvertida(base, entidade, dados, politica){
        const novoId = gerarIdLocal("conv");
        if(entidade === "produtos"){
            base.mercadorias = Array.isArray(base.mercadorias) ? base.mercadorias : [];
            const existente = base.mercadorias.find(function(p){ return String(p.codigo) === String(dados.codigo_interno) || (dados.codigo_barras && somenteNumeros(p.ean) === dados.codigo_barras); });
            if(existente && politica === "ignorar") return { duplicado:true, ignorado:true };
            const produto = mapearProdutoImportado(dados, existente && politica === "atualizar" ? existente : { id: novoId });
            if(existente && politica === "atualizar") Object.assign(existente, produto);
            else base.mercadorias.push(produto);
            return { importado:true, duplicado:Boolean(existente) };
        }
        if(entidade === "clientes"){
            base.clientes = Array.isArray(base.clientes) ? base.clientes : [];
            const existente = base.clientes.find(function(c){ return dados.cpf_cnpj && somenteNumeros(c.cpf || c.cnpj || c.cpfCnpj) === dados.cpf_cnpj; });
            if(existente && politica === "ignorar") return { duplicado:true, ignorado:true };
            const cliente = mapearClienteImportado(dados, existente && politica === "atualizar" ? existente : { id: novoId });
            if(existente && politica === "atualizar") Object.assign(existente, cliente);
            else base.clientes.push(cliente);
            return { importado:true, duplicado:Boolean(existente) };
        }
        if(entidade === "fornecedores"){
            base.fornecedores = Array.isArray(base.fornecedores) ? base.fornecedores : [];
            const existente = base.fornecedores.find(function(f){ return dados.cnpj && somenteNumeros(f.cnpj) === dados.cnpj; });
            if(existente && politica === "ignorar") return { duplicado:true, ignorado:true };
            const fornecedor = { ...(existente || { id: novoId }), razaoSocial: dados.razao_social || dados.nome_fantasia, nomeFantasia: dados.nome_fantasia || "", cnpj: dados.cnpj || "", telefone: dados.telefone || "", email: dados.email || "", endereco: dados.endereco || "", cidade: dados.cidade || "", estado: dados.uf || "", cep: dados.cep || "", ativo: dados.ativo !== false };
            if(existente && politica === "atualizar") Object.assign(existente, fornecedor);
            else base.fornecedores.push(fornecedor);
            return { importado:true, duplicado:Boolean(existente) };
        }
        base[entidade] = Array.isArray(base[entidade]) ? base[entidade] : [];
        base[entidade].push({ id: novoId, ...dados, importadoEm: new Date().toISOString() });
        return { importado:true };
    }

function mapearProdutoImportado(dados, atual){
        return {
            ...atual,
            codigo: dados.codigo_interno || atual.codigo || gerarIdLocal("prod"),
            descricao: dados.descricao,
            ean: dados.codigo_barras || "",
            unidade: dados.unidade || "UN",
            precoCusto: numero(dados.preco_custo),
            precoVenda: numero(dados.preco_venda),
            estoque: numero(dados.estoque_atual),
            ncm: dados.ncm || "",
            cest: dados.cest || "",
            cfop: dados.cfop || "",
            origemMercadoria: dados.origem || "0",
            cstIcms: dados.cst_icms || "",
            csosn: dados.csosn || "",
            cstPis: dados.cst_pis || "",
            cstCofins: dados.cst_cofins || "",
            aliquotaIcms: numero(dados.aliquota_icms),
            aliquotaPis: numero(dados.aliquota_pis),
            aliquotaCofins: numero(dados.aliquota_cofins),
            ativo: dados.ativo !== false,
            atualizadoEm: new Date().toISOString()
        };
    }

function mapearClienteImportado(dados, atual){
        return { ...atual, nome: dados.nome, cpf: dados.cpf_cnpj?.length <= 11 ? dados.cpf_cnpj : "", cnpj: dados.cpf_cnpj?.length > 11 ? dados.cpf_cnpj : "", telefone: dados.telefone || "", email: dados.email || "", endereco: dados.endereco || "", bairro: dados.bairro || "", cidade: dados.cidade || "", estado: dados.uf || "", cep: dados.cep || "", limiteCredito: numero(dados.limite_credito), ativo: dados.ativo !== false };
    }

function rollbackConversaoDados(){
        const base = obterBaseLocal();
        if(!base.rollbackImportacao?.baseAntes){
            notificarConversao("Nenhuma importacao disponivel para desfazer.", "aviso");
            return;
        }
        if(!confirm("Desfazer a ultima importacao e restaurar os dados anteriores?")) return;
        salvarBaseLocal(base.rollbackImportacao.baseAntes);
        mostrarStatus("statusConversaoDados", "Ultima importacao desfeita");
        notificarConversao("Ultima importacao desfeita.", "sucesso");
        renderizarLogConversao();
    }

function renderizarLogConversao(){
        const destino = document.getElementById("conversaoLog");
        if(!destino) return;
        const logs = obterBaseLocal().logsImportacao || [];
        if(!logs.length){ destino.innerHTML = '<div class="conversao-vazio">Nenhuma importacao registrada.</div>'; return; }
        destino.innerHTML = logs.slice(0, 10).map(function(log){
            return `<div class="conversao-log-item">
                <strong>${escaparHtml(log.entidade)} - ${escaparHtml(log.arquivo)}</strong>
                <span>${new Date(log.data).toLocaleString("pt-BR")} - ${escaparHtml(log.usuario)} - Lidos ${log.lidos} - Importados ${log.importados} - Erros ${log.erros} - Duplicados ${log.duplicados || 0} - Ignorados ${log.ignorados || 0}</span>
            </div>`;
        }).join("");
    }

function baixarRelatorioConversao(){
        const linhas = [["linha","status","motivos","original","convertido"], ...conversaoEstado.ultimoRelatorio.map(function(l){
            return [l.indice, l.status, l.motivos.join("; "), JSON.stringify(l.original), JSON.stringify(l.convertido)];
        })];
        baixarArquivo("relatorio_importacao.xls", linhas.map(function(linha){
            return linha.map(function(v){ return `"${String(v ?? "").replaceAll('"','""')}"`; }).join("\t");
        }).join("\n"), "application/vnd.ms-excel;charset=utf-8");
    }

function baixarModeloConversao(){
        const entidade = document.getElementById("conversaoExportarEntidade")?.value || document.getElementById("conversaoEntidade")?.value || "produtos";
        const campos = camposConversao[entidade] || [];
        baixarPlanilhaTabuladaConversao(`modelo_${entidade}.xls`, [campos]);
        mostrarStatus("statusConversaoDados", `Modelo de ${nomesEntidadesConversao[entidade] || entidade} gerado`);
    }

function baixarDadosConversaoSelecionado(){
        const entidade = document.getElementById("conversaoExportarEntidade")?.value || "produtos";
        const formato = document.getElementById("conversaoExportarFormato")?.value || "xls";
        const linhas = montarLinhasExportacaoConversao(entidade);
        const nome = `dados_${entidade}.${formato}`;
        if(formato === "csv"){
            baixarArquivo(nome, linhas.map(function(linha){ return linha.map(valorCsvConversao).join(";"); }).join("\n"), "text/csv;charset=utf-8");
        }else{
            baixarPlanilhaTabuladaConversao(nome, linhas);
        }
        mostrarStatus("statusConversaoDados", `${linhas.length - 1} registro(s) exportado(s)`);
    }

function baixarDadosConversaoTudo(){
        const entidades = Object.keys(camposConversao);
        const abas = entidades.map(function(entidade){
            return {
                nome: nomesEntidadesConversao[entidade] || entidade,
                linhas: montarLinhasExportacaoConversao(entidade)
            };
        });
        baixarArquivo("dados_sistema_completo.xls", montarExcelHtmlConversao(abas), "application/vnd.ms-excel;charset=utf-8");
        mostrarStatus("statusConversaoDados", "Dados do sistema exportados");
    }

function montarLinhasExportacaoConversao(entidade){
        const campos = camposConversao[entidade] || [];
        const registros = obterRegistrosExportacaoConversao(entidade);
        return [campos, ...registros.map(function(registro){
            const convertido = converterRegistroExportacaoConversao(entidade, registro);
            return campos.map(function(campo){ return convertido[campo] ?? ""; });
        })];
    }

function obterRegistrosExportacaoConversao(entidade){
        const base = obterBaseLocal();
        if(entidade === "produtos") return base.mercadorias || [];
        if(entidade === "clientes") return base.clientes || [];
        if(entidade === "fornecedores") return base.fornecedores || [];
        if(entidade === "estoque") return base.mercadorias || [];
        if(entidade === "tabelasPreco") return base.tabelasPreco || base.tabelasPrecos || [];
        if(entidade === "formasPagamento") return base.formasPagamento || base.formasPagamentos || [];
        if(entidade === "contasReceber") return base.contasReceber || [];
        if(entidade === "contasPagar") return base.contasPagar || [];
        if(entidade === "vendasHistoricas") return base.vendas || base.vendasHistoricas || [];
        if(entidade === "usuarios") return base.usuarios || [];
        if(entidade === "regrasFiscais") return base.regrasFiscais || [];
        return base[entidade] || [];
    }

function converterRegistroExportacaoConversao(entidade, registro){
        if(entidade === "produtos"){
            return {
                codigo_interno: registro.codigo || registro.id || "",
                descricao: registro.descricao || "",
                codigo_barras: somenteNumeros(registro.ean || registro.codigoBarras || ""),
                unidade: registro.unidade || "UN",
                preco_custo: numero(registro.precoCusto),
                preco_venda: numero(registro.precoVenda),
                estoque_atual: numero(registro.estoque),
                ncm: somenteNumeros(registro.ncm || ""),
                cest: somenteNumeros(registro.cest || ""),
                cfop: registro.cfop || "",
                origem: registro.origemMercadoria || registro.origem || "",
                cst_icms: registro.cstIcms || "",
                csosn: registro.csosn || "",
                cst_pis: registro.cstPis || "",
                cst_cofins: registro.cstCofins || "",
                aliquota_icms: numero(registro.aliquotaIcms),
                aliquota_pis: numero(registro.aliquotaPis),
                aliquota_cofins: numero(registro.aliquotaCofins),
                ativo: registro.ativo !== false ? "sim" : "nao"
            };
        }
        if(entidade === "clientes"){
            return {
                nome: registro.nome || "",
                cpf_cnpj: somenteNumeros(registro.cpf || registro.cnpj || registro.cpfCnpj || ""),
                telefone: somenteNumeros(registro.telefone || registro.celular || ""),
                email: registro.email || "",
                endereco: registro.endereco || "",
                bairro: registro.bairro || "",
                cidade: registro.cidade || "",
                uf: registro.estado || registro.uf || "",
                cep: somenteNumeros(registro.cep || ""),
                limite_credito: numero(registro.limiteCredito),
                ativo: registro.ativo !== false ? "sim" : "nao"
            };
        }
        if(entidade === "fornecedores"){
            return {
                razao_social: registro.razaoSocial || registro.razao_social || registro.nome || "",
                nome_fantasia: registro.nomeFantasia || registro.nome_fantasia || "",
                cnpj: somenteNumeros(registro.cnpj || ""),
                telefone: somenteNumeros(registro.telefone || ""),
                email: registro.email || "",
                endereco: registro.endereco || "",
                cidade: registro.cidade || "",
                uf: registro.estado || registro.uf || "",
                cep: somenteNumeros(registro.cep || ""),
                ativo: registro.ativo !== false ? "sim" : "nao"
            };
        }
        if(entidade === "estoque"){
            return {
                codigo_produto: registro.codigo || registro.codigoProduto || registro.id || "",
                descricao_produto: registro.descricao || registro.descricaoProduto || "",
                quantidade: numero(registro.estoque ?? registro.quantidade),
                custo_unitario: numero(registro.precoCusto ?? registro.custoUnitario),
                local_estoque: registro.localEstoque || registro.local || ""
            };
        }
        const saida = {};
        (camposConversao[entidade] || []).forEach(function(campo){
            const camel = campo.replace(/_([a-z])/g, function(_, letra){ return letra.toUpperCase(); });
            saida[campo] = registro[campo] ?? registro[camel] ?? "";
        });
        return saida;
    }

function baixarPlanilhaTabuladaConversao(nome, linhas){
        baixarArquivo(nome, linhas.map(function(linha){
            return linha.map(function(valor){ return String(valor ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " "); }).join("\t");
        }).join("\n"), "application/vnd.ms-excel;charset=utf-8");
    }

function montarExcelHtmlConversao(abas){
        return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${abas.map(function(aba){
            return `<Worksheet ss:Name="${escaparHtml(nomeAbaExcelConversao(aba.nome))}"><Table>${aba.linhas.map(function(linha){
                return `<Row>${linha.map(function(valor){ return `<Cell><Data ss:Type="String">${escaparHtml(valor)}</Data></Cell>`; }).join("")}</Row>`;
            }).join("")}</Table></Worksheet>`;
        }).join("")}
</Workbook>`;
    }

function nomeAbaExcelConversao(nome){
        return String(nome || "Dados").replace(/[\\/?*:[\]]/g, " ").slice(0, 31).trim() || "Dados";
    }

function valorCsvConversao(valor){
        return `"${String(valor ?? "").replaceAll('"', '""')}"`;
    }

function limparConversaoDados(){
        conversaoEstado.arquivo = null;
        conversaoEstado.colunas = [];
        conversaoEstado.linhas = [];
        conversaoEstado.mapeamento = {};
        conversaoEstado.avaliadas = [];
        const arq = document.getElementById("conversaoArquivo");
        if(arq) arq.value = "";
        document.getElementById("conversaoMapeamento").innerHTML = '<div class="conversao-vazio">Selecione e leia um arquivo para mapear as colunas.</div>';
        document.getElementById("conversaoPreview").innerHTML = '<div class="conversao-vazio">A previa sera exibida apos a leitura do arquivo.</div>';
        document.getElementById("conversaoResumo").innerHTML = '<span>Lidos: 0</span><span>Validos: 0</span><span>Alertas: 0</span><span>Erros: 0</span>';
        document.getElementById("btnConversaoImportar").disabled = true;
        document.getElementById("btnConversaoRelatorio").disabled = true;
        mostrarStatus("statusConversaoDados", "Aguardando arquivo");
        limparMensagemConversao();
    }

function normalizarDataConversao(valor){
        const texto = String(valor || "").trim();
        if(/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
        const m = texto.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
        if(!m) return "";
        const ano = m[3].length === 2 ? "20" + m[3] : m[3];
        return `${ano}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
    }

function limparTextoConversao(valor){
        return String(valor ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
    }

function normalizarConversao(valor){
        return limparTextoConversao(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").trim();
    }

function validarCpfCnpjConversao(valor){
        const n = somenteNumeros(valor);
        return n.length === 11 || n.length === 14;
    }

function gerarIdLocal(prefixo){
        return `${prefixo || "id"}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
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

function escaparHtml(valor){
        return String(valor ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    }

function obterBaseLocal(){
        const base = lerJson("base_Sistema", {});
        base.mercadorias = Array.isArray(base.mercadorias) ? base.mercadorias : lerJson("mercadorias", []);
        base.notasEntrada = Array.isArray(base.notasEntrada) ? base.notasEntrada : [];
        return base;
    }

function salvarBaseLocal(base){
        localStorage.setItem("base_Sistema", JSON.stringify(base));
        if(window.SistemaCore?.dados?._onBaseSalva){
            window.SistemaCore.dados._onBaseSalva(base);
        }
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

})();
