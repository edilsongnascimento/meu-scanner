document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchButton")?.addEventListener("click", () => {
        window.location.href = "./catalogo.html#buscar";
    });

    document.getElementById("compareButton")?.addEventListener("click", () => {
        window.location.href = "./catalogo.html#comparar";
    });

    document.getElementById("favoritesButton")?.addEventListener("click", () => {
        window.location.href = "./catalogo.html#favoritos";
    });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").catch((error) => {
            console.error("Erro no Service Worker:", error);
        });
    }
});
