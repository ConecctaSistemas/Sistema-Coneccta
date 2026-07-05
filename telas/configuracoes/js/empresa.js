/* empresa.js */
/* Extraido de manutencao.js (painel "Cadastro da Empresa") para virar pagina propria. */

(function(){

document.addEventListener("DOMContentLoaded", function() {
    carregarEmpresaNoFormulario();
    conectarFormularioEmpresa();
    document.getElementById("empresaCnpj")?.focus({ preventScroll: true });
});

function carregarEmpresaNoFormulario(){
        const formulario = document.getElementById("formEmpresa");
        const configuracoes = window.ConfiguracoesSistema?.obter?.() || {};
        const empresaSalva = window.EmpresaSistema?.obter() || {};
        const empresa = {
            ...empresaSalva,
            inscricaoEstadual: empresaSalva.inscricaoEstadual || configuracoes.fiscalInscricaoEstadual || "",
            cnae: empresaSalva.cnae || configuracoes.fiscalCnae || ""
        };

        if(!formulario || !empresa) return;

        Object.keys(empresa).forEach(function(campo) {
            const elemento = formulario.elements[campo];
            if(elemento){
                elemento.value = empresa[campo] ?? "";
            }
        });

        mostrarStatus("statusEmpresa", empresa.atualizadoEm ? "Cadastro carregado." : "Cadastro inicial.");
    }

function conectarFormularioEmpresa(){
        const formulario = document.getElementById("formEmpresa");

        formulario?.addEventListener("submit", function(evento) {
            evento.preventDefault();
            const empresa = coletarDadosFormulario(formulario);
            window.EmpresaSistema.salvar(empresa);
            sincronizarEmpresaComFiscal(empresa);
            mostrarStatus("statusEmpresa", "Cadastro salvo e aplicado no sistema.");
            setTimeout(function() {
                window.location.href = "telas/configuracoes/manutenção.html";
            }, 450);
        });

        document.getElementById("btnLimparEmpresa")?.addEventListener("click", function() {
            formulario.reset();
            mostrarStatus("statusEmpresa", "Formulário limpo. Salve para aplicar as alterações.");
        });
    }

function sincronizarEmpresaComFiscal(empresa){
        if(!window.ConfiguracoesSistema?.salvar) return;

        const configuracoes = window.ConfiguracoesSistema.obter();
        window.ConfiguracoesSistema.salvar({
            ...configuracoes,
            fiscalInscricaoEstadual: empresa.inscricaoEstadual || "",
            fiscalCnae: empresa.cnae || ""
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

})();
