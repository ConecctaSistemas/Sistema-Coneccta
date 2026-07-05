(function(){
    "use strict";

    if(window.NotificationManager && window.notify) return;

    const CONFIG = {
        position: "top-right",
        maxVisible: 5,
        defaultDuration: 4500,
        pauseOnHover: true
    };

    const TYPES = {
        success: { label: "Sucesso", icon: "fa-circle-check", color: "#15803d", bg: "#ecfdf3", border: "#86efac", duration: 3800, role: "status", anim: "notify-pop" },
        error: { label: "Erro", icon: "fa-circle-xmark", color: "#b42318", bg: "#fff1f2", border: "#fda4af", duration: 7000, role: "alert", anim: "notify-shake" },
        warning: { label: "Atenção", icon: "fa-triangle-exclamation", color: "#b45309", bg: "#fffbeb", border: "#fcd34d", duration: 5600, role: "alert", anim: "notify-pulse" },
        info: { label: "Informação", icon: "fa-circle-info", color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd", duration: 4500, role: "status", anim: "notify-slide" },
        loading: { label: "Carregando", icon: "fa-spinner", color: "#0f766e", bg: "#f0fdfa", border: "#5eead4", duration: 0, role: "status", anim: "notify-pulse", spin: true },
        offline: { label: "Offline", icon: "fa-wifi", color: "#991b1b", bg: "#fef2f2", border: "#fca5a5", duration: 0, role: "alert", anim: "notify-shake" },
        online: { label: "Online", icon: "fa-signal", color: "#047857", bg: "#ecfdf5", border: "#6ee7b7", duration: 3200, role: "status", anim: "notify-pop" },
        permissionDenied: { label: "Permissão negada", icon: "fa-lock", color: "#7c2d12", bg: "#fff7ed", border: "#fdba74", duration: 6500, role: "alert", anim: "notify-shake" },
        sessionExpired: { label: "Sessão expirada", icon: "fa-clock", color: "#7f1d1d", bg: "#fef2f2", border: "#fca5a5", duration: 0, role: "alert", anim: "notify-shake" },
        sync: { label: "Sincronização", icon: "fa-arrows-rotate", color: "#075985", bg: "#f0f9ff", border: "#7dd3fc", duration: 4200, role: "status", anim: "notify-pulse", spin: true },
        updateAvailable: { label: "Atualização disponível", icon: "fa-cloud-arrow-down", color: "#5b21b6", bg: "#f5f3ff", border: "#c4b5fd", duration: 0, role: "status", anim: "notify-pop" },
        backupDone: { label: "Backup concluído", icon: "fa-database", color: "#047857", bg: "#ecfdf5", border: "#6ee7b7", duration: 4200, role: "status", anim: "notify-pop" },
        nfceAuthorized: { label: "NFC-e autorizada", icon: "fa-receipt", color: "#047857", bg: "#ecfdf5", border: "#6ee7b7", duration: 5200, role: "status", anim: "notify-pop" },
        nfceRejected: { label: "NFC-e rejeitada", icon: "fa-file-circle-xmark", color: "#b42318", bg: "#fff1f2", border: "#fda4af", duration: 8000, role: "alert", anim: "notify-shake" },
        productSaved: { label: "Produto salvo", icon: "fa-box", color: "#15803d", bg: "#ecfdf3", border: "#86efac", duration: 3600, role: "status", anim: "notify-pop" },
        clientSaved: { label: "Cliente salvo", icon: "fa-user-check", color: "#15803d", bg: "#ecfdf3", border: "#86efac", duration: 3600, role: "status", anim: "notify-pop" },
        deleteDone: { label: "Exclusão realizada", icon: "fa-trash-can", color: "#15803d", bg: "#ecfdf3", border: "#86efac", duration: 3600, role: "status", anim: "notify-pop" },
        deleteCanceled: { label: "Exclusão cancelada", icon: "fa-ban", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", duration: 3000, role: "status", anim: "notify-slide" },
        stockLow: { label: "Estoque insuficiente", icon: "fa-box-open", color: "#b45309", bg: "#fffbeb", border: "#fcd34d", duration: 6500, role: "alert", anim: "notify-pulse" },
        operationDone: { label: "Operação concluída", icon: "fa-circle-check", color: "#15803d", bg: "#ecfdf3", border: "#86efac", duration: 3600, role: "status", anim: "notify-pop" },
        operationCanceled: { label: "Operação cancelada", icon: "fa-circle-minus", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", duration: 3200, role: "status", anim: "notify-slide" },
        critical: { label: "Aviso crítico", icon: "fa-radiation", color: "#9f1239", bg: "#fff1f2", border: "#fb7185", duration: 0, role: "alert", anim: "notify-shake" },
        fatal: { label: "Erro fatal", icon: "fa-skull-crossbones", color: "#fff", bg: "#111827", border: "#111827", duration: 0, role: "alert", anim: "notify-shake" }
    };

    const ALIASES = {
        sucesso: "success",
        erro: "error",
        aviso: "warning",
        atencao: "warning",
        atenção: "warning",
        informacao: "info",
        informação: "info",
        danger: "error",
        warn: "warning"
    };

    const state = {
        container: null,
        dialog: null,
        overlay: null,
        loading: null,
        counter: 0
    };

    function injectStyle(){
        if(document.getElementById("notification-manager-style")) return;
        const css = `
:root{--notify-z:2147483600}
.notify-stack{position:fixed;z-index:var(--notify-z);display:flex;flex-direction:column;gap:10px;width:min(430px,calc(100vw - 24px));pointer-events:none}
.notify-stack.top-right{top:18px;right:18px}.notify-stack.top-left{top:18px;left:18px}.notify-stack.bottom-right{right:18px;bottom:18px}.notify-stack.bottom-left{left:18px;bottom:18px}
.notify-toast{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:flex-start;min-height:72px;padding:14px 14px 17px;border:1px solid var(--notify-border);border-left:5px solid var(--notify-color);border-radius:12px;background:var(--notify-bg);color:#0f172a;box-shadow:0 18px 44px rgba(15,23,42,.16);font-family:"Segoe UI",system-ui,sans-serif;pointer-events:auto;overflow:hidden;animation:notifyIn .18s ease both}
.notify-toast.notify-out{animation:notifyOut .18s ease forwards}.notify-toast.notify-shake{animation:notifyIn .18s ease both,notifyShake .34s ease .18s}.notify-toast.notify-pop{animation:notifyPop .22s ease both}.notify-toast.notify-pulse .notify-icon{animation:notifyPulse 1.2s ease infinite}
.notify-icon{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(255,255,255,.7);color:var(--notify-color);font-size:16px;flex:0 0 auto}.notify-icon.spin i{animation:notifySpin .8s linear infinite}
.notify-content{display:grid;gap:3px;min-width:0}.notify-title{color:var(--notify-color);font-size:13px;font-weight:900;line-height:1.2}.notify-message{font-size:13.5px;line-height:1.38;color:#26364a;word-break:break-word}.notify-close{width:32px;height:32px;border:0;border-radius:8px;background:rgba(255,255,255,.65);color:#334155;cursor:pointer;font-size:15px}.notify-close:hover{background:#fff}.notify-progress{position:absolute;left:0;right:auto;bottom:0;height:3px;width:100%;background:var(--notify-color);transform-origin:left center;animation:notifyProgress var(--notify-duration) linear forwards}.notify-paused .notify-progress{animation-play-state:paused}
.notify-dialog-layer,.notify-loading-layer{position:fixed;inset:0;z-index:calc(var(--notify-z) + 1);display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.54);font-family:"Segoe UI",system-ui,sans-serif}.notify-dialog-layer.open,.notify-loading-layer.open{display:flex}
.notify-dialog{width:min(460px,100%);border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.32);overflow:hidden;animation:notifyPop .18s ease both}.notify-dialog.critical{border-top:5px solid #b42318}.notify-dialog-head{display:flex;gap:12px;align-items:flex-start;padding:20px 20px 12px}.notify-dialog-head .notify-icon{background:#f8fafc}.notify-dialog-title{margin:0;color:#0b2f6b;font-size:20px;font-weight:900;line-height:1.2}.notify-dialog-message{padding:0 20px 18px;color:#475569;font-size:14px;line-height:1.5;white-space:pre-line}.notify-dialog-input{margin:0 20px 18px;width:calc(100% - 40px);min-height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font:14px "Segoe UI",system-ui,sans-serif}.notify-dialog-actions{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px 20px;border-top:1px solid #e2e8f0}.notify-btn{min-height:42px;border-radius:10px;border:1px solid #c7d7ea;padding:0 16px;font:800 14px "Segoe UI",system-ui,sans-serif;cursor:pointer}.notify-btn.secondary{background:#fff;color:#0f2f56}.notify-btn.primary{background:#2563eb;border-color:#1d5fd6;color:#fff}.notify-btn.danger{background:#b42318;border-color:#b42318;color:#fff}.notify-btn:hover{filter:brightness(.97)}
.notify-loading-box{width:min(360px,100%);display:grid;gap:12px;justify-items:center;border-radius:16px;background:#fff;padding:28px;box-shadow:0 24px 70px rgba(15,23,42,.32);text-align:center;color:#0f172a}.notify-loader{width:42px;height:42px;border-radius:50%;border:4px solid #dbeafe;border-top-color:#2563eb;animation:notifySpin .75s linear infinite}.notify-loading-title{font-weight:900;color:#0b2f6b}.notify-loading-message{font-size:13px;color:#64748b}
@keyframes notifyIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}@keyframes notifyOut{to{opacity:0;transform:translateX(18px)}}@keyframes notifyPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}@keyframes notifyShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@keyframes notifyPulse{50%{transform:scale(1.08)}}@keyframes notifySpin{to{transform:rotate(360deg)}}@keyframes notifyProgress{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@media(max-width:640px){.notify-stack{top:12px!important;left:12px!important;right:12px!important;bottom:auto!important;width:auto}.notify-toast{grid-template-columns:auto minmax(0,1fr) auto;padding:13px 12px 16px}.notify-dialog-layer,.notify-loading-layer{align-items:flex-end;padding:10px}.notify-dialog{width:100%;border-radius:14px}.notify-dialog-actions{display:grid;grid-template-columns:1fr}.notify-btn{width:100%}}
@media(prefers-reduced-motion:reduce){.notify-toast,.notify-dialog,.notify-icon,.notify-progress,.notify-loader{animation:none!important}}
`;
        const style = document.createElement("style");
        style.id = "notification-manager-style";
        style.textContent = css;
        document.head.appendChild(style);
    }

    function ensureReady(){
        injectStyle();
        if(!state.container){
            state.container = document.createElement("div");
            state.container.className = "notify-stack " + CONFIG.position;
            state.container.setAttribute("aria-live", "polite");
            state.container.setAttribute("aria-relevant", "additions removals");
            document.body.appendChild(state.container);
        }
    }

    function normalizeType(type){
        return ALIASES[type] || type || "info";
    }

    function typeConfig(type){
        return TYPES[normalizeType(type)] || TYPES.info;
    }

    function iconHtml(cfg){
        return `<span class="notify-icon ${cfg.spin ? "spin" : ""}" aria-hidden="true"><i class="fa-solid ${cfg.icon}"></i></span>`;
    }

    function toast(type, message, options){
        if(!document.body){
            document.addEventListener("DOMContentLoaded", function(){ toast(type, message, options); }, { once: true });
            return null;
        }
        ensureReady();
        const normalized = normalizeType(type);
        const cfg = typeConfig(normalized);
        const opts = Object.assign({}, options || {});
        const duration = opts.duration === undefined ? cfg.duration : opts.duration;
        const id = "notify-" + (++state.counter);
        const item = document.createElement("div");
        item.id = id;
        item.className = "notify-toast " + (cfg.anim || "notify-slide");
        item.style.setProperty("--notify-color", cfg.color);
        item.style.setProperty("--notify-bg", cfg.bg);
        item.style.setProperty("--notify-border", cfg.border);
        item.style.setProperty("--notify-duration", Math.max(1, duration) + "ms");
        item.setAttribute("role", opts.role || cfg.role || "status");
        item.innerHTML = `
            ${iconHtml(cfg)}
            <div class="notify-content">
                <strong class="notify-title">${escapeHtml(opts.title || cfg.label)}</strong>
                <div class="notify-message">${escapeHtml(message || opts.message || cfg.label)}</div>
            </div>
            <button type="button" class="notify-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
            ${duration > 0 ? '<span class="notify-progress" aria-hidden="true"></span>' : ""}
        `;
        state.container.appendChild(item);
        limitStack();

        let timer = null;
        const close = function(){
            if(!item.isConnected) return;
            item.classList.add("notify-out");
            item.addEventListener("animationend", function(){ item.remove(); }, { once: true });
            window.setTimeout(function(){ item.remove(); }, 260);
        };
        item.querySelector(".notify-close").addEventListener("click", close);
        if(duration > 0){
            timer = window.setTimeout(close, duration);
            if(CONFIG.pauseOnHover){
                item.addEventListener("mouseenter", function(){
                    item.classList.add("notify-paused");
                    if(timer) window.clearTimeout(timer);
                });
                item.addEventListener("mouseleave", function(){
                    item.classList.remove("notify-paused");
                    timer = window.setTimeout(close, 1200);
                });
            }
        }
        return { id, close, element: item };
    }

    function limitStack(){
        const items = Array.from(state.container.querySelectorAll(".notify-toast"));
        while(items.length > CONFIG.maxVisible){
            const item = items.shift();
            if(item) item.remove();
        }
    }

    function ensureDialogLayer(){
        injectStyle();
        if(state.dialog) return state.dialog;
        const layer = document.createElement("div");
        layer.className = "notify-dialog-layer";
        layer.setAttribute("aria-hidden", "true");
        document.body.appendChild(layer);
        state.dialog = layer;
        return layer;
    }

    function dialog(kind, options){
        return new Promise(function(resolve){
            if(!document.body){
                document.addEventListener("DOMContentLoaded", function(){ dialog(kind, options).then(resolve); }, { once: true });
                return;
            }
            const opts = typeof options === "string" ? { message: options } : Object.assign({}, options || {});
            const type = normalizeType(opts.type || (kind === "confirm" ? "warning" : kind));
            const cfg = typeConfig(type);
            const layer = ensureDialogLayer();
            const input = kind === "prompt";
            const danger = opts.danger || type === "error" || type === "critical" || type === "fatal";
            layer.innerHTML = `
                <section class="notify-dialog ${danger ? "critical" : ""}" role="dialog" aria-modal="true" aria-labelledby="notify-dialog-title">
                    <div class="notify-dialog-head">
                        ${iconHtml(cfg)}
                        <div>
                            <h2 class="notify-dialog-title" id="notify-dialog-title">${escapeHtml(opts.title || cfg.label)}</h2>
                        </div>
                    </div>
                    <div class="notify-dialog-message">${escapeHtml(opts.message || "")}</div>
                    ${input ? `<input class="notify-dialog-input" type="text" value="${escapeAttr(opts.value || "")}" placeholder="${escapeAttr(opts.placeholder || "")}" aria-label="${escapeAttr(opts.inputLabel || opts.title || "Resposta")}">` : ""}
                    <div class="notify-dialog-actions">
                        ${kind === "alert" || kind === "critical" || kind === "fatal" ? "" : `<button type="button" class="notify-btn secondary" data-notify-cancel>${escapeHtml(opts.cancelText || "Cancelar")}</button>`}
                        <button type="button" class="notify-btn ${danger ? "danger" : "primary"}" data-notify-confirm>${escapeHtml(opts.confirmText || (kind === "confirm" ? "Confirmar" : "OK"))}</button>
                    </div>
                </section>
            `;
            layer.classList.add("open");
            layer.setAttribute("aria-hidden", "false");
            document.body.classList.add("notify-dialog-open");

            const confirmBtn = layer.querySelector("[data-notify-confirm]");
            const cancelBtn = layer.querySelector("[data-notify-cancel]");
            const inputEl = layer.querySelector(".notify-dialog-input");
            const cleanup = function(value){
                layer.classList.remove("open");
                layer.setAttribute("aria-hidden", "true");
                document.body.classList.remove("notify-dialog-open");
                layer.innerHTML = "";
                document.removeEventListener("keydown", onKey);
                resolve(value);
            };
            const onKey = function(event){
                if(event.key === "Escape") cleanup(kind === "confirm" ? false : null);
                if(event.key === "Enter" && inputEl && document.activeElement === inputEl) cleanup(inputEl.value);
            };
            confirmBtn.addEventListener("click", function(){
                cleanup(input ? inputEl.value : true);
            });
            cancelBtn?.addEventListener("click", function(){ cleanup(input ? null : false); });
            layer.addEventListener("click", function(event){ if(event.target === layer) cleanup(kind === "confirm" ? false : null); }, { once: true });
            document.addEventListener("keydown", onKey);
            window.setTimeout(function(){ (inputEl || confirmBtn).focus(); }, 30);
        });
    }

    function ensureLoadingLayer(){
        injectStyle();
        if(state.loading) return state.loading;
        const layer = document.createElement("div");
        layer.className = "notify-loading-layer";
        layer.setAttribute("aria-hidden", "true");
        document.body.appendChild(layer);
        state.loading = layer;
        return layer;
    }

    function block(message, options){
        const opts = Object.assign({}, options || {});
        const layer = ensureLoadingLayer();
        layer.innerHTML = `
            <div class="notify-loading-box" role="status" aria-live="polite">
                <span class="notify-loader" aria-hidden="true"></span>
                <div class="notify-loading-title">${escapeHtml(opts.title || "Processando")}</div>
                <div class="notify-loading-message">${escapeHtml(message || "Aguarde...")}</div>
            </div>
        `;
        layer.classList.add("open");
        layer.setAttribute("aria-hidden", "false");
        document.body.classList.add("notify-blocked");
    }

    function unblock(){
        if(!state.loading) return;
        state.loading.classList.remove("open");
        state.loading.setAttribute("aria-hidden", "true");
        state.loading.innerHTML = "";
        document.body.classList.remove("notify-blocked");
    }

    function escapeHtml(value){
        return String(value ?? "").replace(/[&<>"']/g, function(char){
            return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[char];
        });
    }

    function escapeAttr(value){
        return escapeHtml(value).replace(/`/g, "&#096;");
    }

    function fromLegacyType(tipo){
        return normalizeType(tipo || "info");
    }

    const api = {
        config: CONFIG,
        types: TYPES,
        show: toast,
        toast,
        closeAll: function(){
            state.container?.querySelectorAll(".notify-toast").forEach(function(item){ item.remove(); });
        },
        success: function(message, options){ return toast("success", message, options); },
        error: function(message, options){ return toast("error", message, options); },
        warning: function(message, options){ return toast("warning", message, options); },
        info: function(message, options){ return toast("info", message, options); },
        loading: function(message, options){ return toast("loading", message || "Carregando...", options); },
        offline: function(message){ return toast("offline", message || "Você está offline."); },
        online: function(message){ return toast("online", message || "Conexão restabelecida."); },
        permissionDenied: function(message){ return toast("permissionDenied", message || "Permissão negada."); },
        sessionExpired: function(message){ return toast("sessionExpired", message || "Sua sessão expirou."); },
        sync: function(message){ return toast("sync", message || "Sincronizando dados..."); },
        updateAvailable: function(message){ return toast("updateAvailable", message || "Atualização disponível."); },
        backupDone: function(message){ return toast("backupDone", message || "Backup concluído."); },
        nfceAuthorized: function(message){ return toast("nfceAuthorized", message || "NFC-e autorizada."); },
        nfceRejected: function(message){ return toast("nfceRejected", message || "NFC-e rejeitada."); },
        productSaved: function(message){ return toast("productSaved", message || "Produto salvo com sucesso."); },
        clientSaved: function(message){ return toast("clientSaved", message || "Cliente salvo com sucesso."); },
        deleteDone: function(message){ return toast("deleteDone", message || "Exclusão realizada."); },
        deleteCanceled: function(message){ return toast("deleteCanceled", message || "Exclusão cancelada."); },
        stockLow: function(message){ return toast("stockLow", message || "Estoque insuficiente."); },
        operationDone: function(message){ return toast("operationDone", message || "Operação concluída."); },
        operationCanceled: function(message){ return toast("operationCanceled", message || "Operação cancelada."); },
        alert: function(options){ return dialog("alert", options); },
        confirm: function(options){ return dialog("confirm", options); },
        prompt: function(options){ return dialog("prompt", options); },
        critical: function(options){ return dialog("critical", Object.assign({ type: "critical", confirmText: "Entendi" }, typeof options === "string" ? { message: options } : options)); },
        fatal: function(options){ return dialog("fatal", Object.assign({ type: "fatal", confirmText: "Recarregar" }, typeof options === "string" ? { message: options } : options)).then(function(){ location.reload(); }); },
        block,
        unblock,
        loadingGlobal: block,
        hideLoading: unblock,
        disableNativeDialogs: function(){
            window.alert = function(message){ api.alert({ title: "Aviso", message: String(message || ""), type: "info" }); };
            window.confirm = function(message){
                api.confirm({ title: "Confirmação", message: String(message || "") });
                console.warn("confirm() nativo foi bloqueado. Use await notify.confirm(...).");
                return false;
            };
        }
    };

    window.NotificationManager = api;
    window.notify = api;
    window.notificar = function(texto, tipo){
        if(typeof window.registrarAvisoSistema === "function"){
            window.registrarAvisoSistema(texto, tipo);
        }
        return api.show(fromLegacyType(tipo), texto);
    };
    window.alert = function(message){
        api.alert({ title: "Aviso", message: String(message || ""), type: "info" });
    };

    window.addEventListener("offline", function(){ api.offline(); });
    window.addEventListener("online", function(){ api.online(); });
})();
