/* relatorio-visualizador.js */
/* Componente compartilhado pelas paginas de relatorio (telas/relatorios/relatorio-*.html):
   janela estilo documento com os resultados, minimizar para uma barra de tarefas,
   fechar e imprimir (impressao real do conteudo, nao captura de tela). */

(function(){

    let contador = 0;
    const instancias = {};

    function abrir(dados){
        const id = "rv" + (++contador);
        const empresa = window.EmpresaSistema?.obter?.() || {};
        const nomeEmpresa = empresa.nomeFantasia || empresa.razaoSocial || "Coneccta Sistemas";
        const geradoEm = new Date().toLocaleString("pt-BR");

        const overlay = document.createElement("div");
        overlay.className = "rv-overlay";
        overlay.id = id;
        overlay.style.zIndex = String(9000 + contador);

        overlay.innerHTML = `
            <div class="rv-janela">
                <div class="rv-barra">
                    <strong class="rv-barra-titulo">${escaparRv(dados.titulo)}</strong>
                    <div class="rv-barra-acoes">
                        <button type="button" class="rv-btn-acao" data-rv-minimizar title="Minimizar">
                            <i class="fa-solid fa-window-minimize"></i> Minimizar
                        </button>
                        <button type="button" class="rv-btn-acao" data-rv-imprimir title="Imprimir">
                            <i class="fa-solid fa-print"></i> Imprimir
                        </button>
                        <button type="button" class="rv-btn-acao rv-btn-fechar" data-rv-fechar title="Fechar">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div class="rv-corpo">
                    <div class="rv-doc">
                        <div class="rv-doc-cabecalho">
                            <div class="rv-doc-empresa">
                                <strong>${escaparRv(nomeEmpresa)}</strong>
                                ${empresa.cnpj ? `<span>CNPJ: ${escaparRv(empresa.cnpj)}</span>` : ""}
                            </div>
                            <div class="rv-doc-meta">
                                <span>Gerado em ${escaparRv(geradoEm)}</span>
                            </div>
                        </div>
                        <h1 class="rv-doc-titulo">${escaparRv(dados.titulo)}</h1>
                        ${dados.periodoTexto ? `<p class="rv-doc-periodo">${escaparRv(dados.periodoTexto)}</p>` : ""}
                        ${renderizarResumoRv(dados.resumo)}
                        ${renderizarSecoesRv(dados.secoes) || renderizarTabelaRv(dados.colunas, dados.linhas)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector("[data-rv-minimizar]").addEventListener("click", function(){ minimizar(id, dados.titulo); });
        overlay.querySelector("[data-rv-fechar]").addEventListener("click", function(){ fechar(id); });
        overlay.querySelector("[data-rv-imprimir]").addEventListener("click", function(){ imprimir(id); });

        instancias[id] = { overlay, titulo: dados.titulo };

        return id;
    }

    function minimizar(id, titulo){
        const instancia = instancias[id];
        if(!instancia) return;

        instancia.overlay.classList.add("rv-minimizado");
        adicionarChip(id, titulo);
    }

    function adicionarChip(id, titulo){
        let taskbar = document.getElementById("rvTaskbar");

        if(!taskbar){
            taskbar = document.createElement("div");
            taskbar.id = "rvTaskbar";
            taskbar.className = "rv-taskbar";
            document.body.appendChild(taskbar);
        }

        if(document.getElementById("chip-" + id)) return;

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "rv-chip";
        chip.id = "chip-" + id;
        chip.innerHTML = `
            <i class="fa-solid fa-file-lines"></i>
            <span>${escaparRv(titulo)}</span>
            <span class="rv-chip-fechar" data-rv-chip-fechar><i class="fa-solid fa-xmark"></i></span>
        `;

        chip.addEventListener("click", function(evento){
            if(evento.target.closest("[data-rv-chip-fechar]")){
                evento.stopPropagation();
                fechar(id);
                return;
            }
            restaurar(id);
        });

        taskbar.appendChild(chip);
    }

    function restaurar(id){
        const instancia = instancias[id];
        if(!instancia) return;

        instancia.overlay.classList.remove("rv-minimizado");
        removerChip(id);
    }

    function removerChip(id){
        document.getElementById("chip-" + id)?.remove();

        const taskbar = document.getElementById("rvTaskbar");
        if(taskbar && !taskbar.children.length) taskbar.remove();
    }

    function fechar(id){
        instancias[id]?.overlay.remove();
        delete instancias[id];
        removerChip(id);
    }

    function imprimir(id){
        const instancia = instancias[id];
        if(!instancia) return;

        document.querySelectorAll(".rv-imprimindo").forEach(function(el){ el.classList.remove("rv-imprimindo"); });
        instancia.overlay.classList.remove("rv-minimizado");
        instancia.overlay.classList.add("rv-imprimindo");

        window.print();

        setTimeout(function(){
            instancia.overlay.classList.remove("rv-imprimindo");
        }, 500);
    }

    function renderizarResumoRv(resumo){
        if(!Array.isArray(resumo) || resumo.length === 0) return "";

        const cards = resumo.map(function(item){
            return `<div class="rv-resumo-card"><span>${escaparRv(item.rotulo)}</span><strong>${escaparRv(item.valor)}</strong></div>`;
        }).join("");

        return `<div class="rv-doc-resumo">${cards}</div>`;
    }

    // Uma "secao" e um bloco opcional com seu proprio titulo + tabela (usado no relatorio Financeiro,
    // que pode ter contas a pagar / contas a receber / movimentos de caixa juntos ou separados).
    function renderizarSecoesRv(secoes){
        if(!Array.isArray(secoes) || secoes.length === 0) return "";

        return secoes.map(function(secao){
            return `
                <div class="rv-doc-secao">
                    <h2 class="rv-doc-secao-titulo">${escaparRv(secao.titulo)}</h2>
                    ${renderizarTabelaRv(secao.colunas, secao.linhas)}
                </div>
            `;
        }).join("");
    }

    function renderizarTabelaRv(colunas, linhas){
        if(!Array.isArray(colunas)) return "";

        const cabecalho = colunas.map(function(c){ return `<th>${escaparRv(c)}</th>`; }).join("");
        const corpo = (linhas || []).length
            ? linhas.map(function(linha){
                return `<tr>${linha.map(function(v){ return `<td>${escaparRv(v)}</td>`; }).join("")}</tr>`;
            }).join("")
            : `<tr><td class="rv-vazio" colspan="${colunas.length || 1}">Nenhum registro encontrado no período selecionado.</td></tr>`;

        return `
            <table class="rv-tabela">
                <thead><tr>${cabecalho}</tr></thead>
                <tbody>${corpo}</tbody>
            </table>
        `;
    }

    function escaparRv(valor){
        return String(valor ?? "").replace(/[&<>"']/g, function(c){
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    window.RelatorioVisualizador = { abrir };

})();
