document.addEventListener("DOMContentLoaded", () => {
    let installPrompt = null;
    const installButton = document.getElementById("installButton");
    const installMessage = document.getElementById("installMessage");

    document.getElementById("scannerButton")?.addEventListener("click", () => {
        window.location.href = "./scanner.html";
    });

    document.getElementById("searchButton")?.addEventListener("click", () => {
        window.location.href = "./catalogo.html#buscar";
    });

    const isInstalled = window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true;
    if (isInstalled && installButton) installButton.hidden = true;

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        installPrompt = event;
    });

    installButton?.addEventListener("click", async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            installMessage.hidden = false;
            installMessage.textContent = outcome === "accepted"
                ? "Instalação iniciada. Siga a confirmação do navegador."
                : "A instalação foi cancelada. Você pode tentar novamente quando quiser.";
            installPrompt = null;
            return;
        }

        const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
            || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
        installMessage.hidden = false;
        installMessage.textContent = isIOS
            ? "No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”."
            : "No menu do navegador, escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.";
    });

    window.addEventListener("appinstalled", () => {
        installPrompt = null;
        if (installButton) installButton.hidden = true;
        if (installMessage) {
            installMessage.hidden = false;
            installMessage.textContent = "MeuScaner instalado com sucesso.";
        }
    });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").catch((error) => {
            console.error("Erro no Service Worker:", error);
        });
    }
});
