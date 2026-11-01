import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const SEARCH_API_URL = "https://search.openfoodfacts.org/search";
    const PRODUCT_API_URL = "https://world.openfoodfacts.org/api/v2/product";
    const PAGE_SIZE = 24;
    const COMPARISON_LIMIT = 3;
    const COMPARISON_STORAGE_KEY = "meuscaner-comparacao";
    const SEARCH_FIELDS = [
        "code",
        "product_name",
        "brands",
        "quantity"
    ].join(",");
    const PRODUCT_FIELDS = [
        "code",
        "product_name",
        "brands",
        "quantity",
        "categories",
        "ingredients_text",
        "allergens_tags",
        "nutrition_grades",
        "nutriments",
        "image_front_small_url"
    ].join(",");

    const searchForm = document.getElementById("productSearchForm");
    const productSearch = document.getElementById("productSearch");
    const searchSubmitButton = document.getElementById("searchSubmitButton");
    const productCount = document.getElementById("productCount");
    const productList = document.getElementById("productList");
    const catalogMessage = document.getElementById("catalogMessage");
    const loadMoreButton = document.getElementById("loadMoreButton");
    const comparisonCount = document.getElementById("comparisonCount");
    const comparisonTableContainer = document.getElementById("comparisonTableContainer");
    const favoritesStatus = document.getElementById("favoritesStatus");
    const favoritesList = document.getElementById("favoritesList");

    let currentUser = null;
    let currentQuery = "";
    let currentPage = 0;
    let totalPages = 0;
    let searchResults = [];
    let comparisonProducts = new Map();
    let pendingComparison = new Set();
    let favorites = [];
    let activeSearchController = null;
    let searchRequestId = 0;

    function safeProductImage(value) {
        if (!value) return "";

        try {
            const imageUrl = new URL(value);
            const isOpenFoodFactsHost =
                imageUrl.hostname === "openfoodfacts.org"
                || imageUrl.hostname.endsWith(".openfoodfacts.org");

            return imageUrl.protocol === "https:" && isOpenFoodFactsHost
                ? imageUrl.href
                : "";
        } catch (error) {
            console.error("URL de imagem inválida recebida da API:", error);
            return "";
        }
    }

    function normalizeProduct(data) {
        const code = String(data.code || "").trim();

        if (!code) return null;

        return {
            code,
            product_name: String(data.product_name || "Produto sem nome"),
            brands: Array.isArray(data.brands)
                ? data.brands.join(", ")
                : String(data.brands || ""),
            quantity: String(data.quantity || ""),
            categories: String(data.categories || ""),
            ingredients_text: String(data.ingredients_text || ""),
            allergens_tags: Array.isArray(data.allergens_tags) ? data.allergens_tags : [],
            nutrition_grades: String(data.nutrition_grades || ""),
            nutriments: data.nutriments && typeof data.nutriments === "object"
                ? data.nutriments
                : {},
            imageUrl: safeProductImage(
                data.image_front_small_url || data.image_url || data.imageUrl
            )
        };
    }

    function productSnapshot(product) {
        return {
            code: product.code,
            product_name: product.product_name,
            brands: product.brands,
            quantity: product.quantity,
            categories: product.categories,
            ingredients_text: product.ingredients_text,
            allergens_tags: product.allergens_tags,
            nutrition_grades: product.nutrition_grades,
            nutriments: product.nutriments,
            image_front_small_url: product.imageUrl
        };
    }

    function setCatalogMessage(message, isError = false) {
        catalogMessage.textContent = message;
        catalogMessage.classList.toggle("status-error", isError);
    }

    function restoreComparison() {
        try {
            const saved = JSON.parse(
                sessionStorage.getItem(COMPARISON_STORAGE_KEY) || "[]"
            );

            if (!Array.isArray(saved)) {
                throw new Error("Formato da comparação temporária inválido.");
            }

            saved.slice(0, COMPARISON_LIMIT).forEach((item) => {
                const product = normalizeProduct(item);
                if (product) comparisonProducts.set(product.code, product);
            });
        } catch (error) {
            console.error("Não foi possível restaurar a comparação:", error);
            sessionStorage.removeItem(COMPARISON_STORAGE_KEY);
        }
    }

    function persistComparison() {
        try {
            sessionStorage.setItem(
                COMPARISON_STORAGE_KEY,
                JSON.stringify(Array.from(comparisonProducts.values()).map(productSnapshot))
            );
        } catch (error) {
            console.error("Não foi possível preservar a comparação nesta sessão:", error);
            setCatalogMessage(
                "A comparação não pôde ser preservada ao sair desta página.",
                true
            );
        }
    }

    function makeButton(text, className, action, disabled = false) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener("click", action);
        return button;
    }

    function makeProductCard(product, { isFavorite = false } = {}) {
        const card = document.createElement("article");
        card.className = "product-item";

        const imageContainer = document.createElement("div");
        imageContainer.className = "product-image";

        if (product.imageUrl) {
            const image = document.createElement("img");
            image.src = product.imageUrl;
            image.alt = `Imagem de ${product.product_name}`;
            image.loading = "lazy";
            image.onerror = () => {
                image.remove();
                imageContainer.textContent = "📦";
            };
            imageContainer.appendChild(image);
        } else {
            imageContainer.textContent = "📦";
        }

        const info = document.createElement("div");
        info.className = "product-info";

        const name = document.createElement("h3");
        name.textContent = product.product_name;
        info.appendChild(name);

        const details = [
            product.brands,
            product.quantity,
            product.categories
        ].filter(Boolean);

        details.forEach((detail) => {
            const line = document.createElement("p");
            line.textContent = detail;
            info.appendChild(line);
        });

        const actions = document.createElement("div");
        actions.className = "product-card-actions";

        if (isFavorite) {
            actions.appendChild(makeButton(
                "Remover dos favoritos",
                "secondary-button",
                () => removerFavorito(product.favoriteId)
            ));
        } else {
            const isSelected = comparisonProducts.has(product.code);
            const isLoading = pendingComparison.has(product.code);
            const atLimit = comparisonProducts.size + pendingComparison.size >= COMPARISON_LIMIT
                && !isSelected
                && !isLoading;

            actions.appendChild(makeButton(
                isLoading
                    ? "Carregando dados..."
                    : isSelected
                        ? "Remover da comparação"
                        : "Adicionar à comparação",
                isSelected || isLoading ? "secondary-button" : "compare-button",
                () => alternarComparacao(product),
                atLimit || isLoading
            ));
        }

        const source = document.createElement("a");
        source.className = "product-source-link";
        source.href = `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Ver no Open Food Facts";
        actions.appendChild(source);

        card.append(imageContainer, info, actions);
        return card;
    }

    function renderSearchResults() {
        productList.replaceChildren();

        if (searchResults.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "loading-message";
            emptyMessage.textContent = "Nenhum produto encontrado.";
            productList.appendChild(emptyMessage);
            return;
        }

        searchResults.forEach((product) => {
            productList.appendChild(makeProductCard(product));
        });
    }

    async function alternarComparacao(product) {
        if (comparisonProducts.has(product.code)) {
            comparisonProducts.delete(product.code);
            persistComparison();
            renderSearchResults();
            renderComparison();
            setCatalogMessage("");
            return;
        }

        if (pendingComparison.has(product.code)) return;

        if (comparisonProducts.size + pendingComparison.size >= COMPARISON_LIMIT) {
            setCatalogMessage(`A comparação permite até ${COMPARISON_LIMIT} produtos.`, true);
            return;
        }

        pendingComparison.add(product.code);
        renderSearchResults();
        setCatalogMessage("Carregando os dados nutricionais do produto...");

        try {
            const detailedProduct = await carregarDetalhesProduto(product);
            comparisonProducts.set(detailedProduct.code, detailedProduct);
            persistComparison();
            setCatalogMessage("");
        } catch (error) {
            console.error("Erro ao carregar detalhes do produto:", error);
            setCatalogMessage(
                error.message || "Não foi possível carregar os dados para comparação.",
                true
            );
        } finally {
            pendingComparison.delete(product.code);
            renderSearchResults();
            renderComparison();
        }
    }

    async function carregarDetalhesProduto(product) {
        const requestUrl = new URL(
            `${PRODUCT_API_URL}/${encodeURIComponent(product.code)}.json`
        );
        requestUrl.searchParams.set("fields", PRODUCT_FIELDS);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        let response;

        try {
            response = await fetch(requestUrl, {
                headers: { Accept: "application/json" },
                signal: controller.signal
            });
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error("A consulta dos detalhes demorou demais. Tente novamente.");
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            throw new Error(`Open Food Facts respondeu com HTTP ${response.status}.`);
        }

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(
                `Open Food Facts enviou uma resposta inválida (HTTP ${response.status}). Tente novamente em alguns instantes.`
            );
        }

        if (result.status !== 1 || !result.product) {
            throw new Error("Os detalhes nutricionais deste produto não estão disponíveis.");
        }

        return normalizeProduct({
            ...product,
            ...result.product,
            code: product.code,
            product_name: result.product.product_name || product.product_name,
            brands: result.product.brands || product.brands,
            quantity: result.product.quantity || product.quantity
        });
    }

    function formatNutrient(nutriments, keys, unit) {
        for (const key of keys) {
            const rawValue = nutriments?.[key];
            if (rawValue === null || rawValue === undefined || rawValue === "") continue;

            const value = Number(rawValue);
            if (Number.isFinite(value)) {
                return `${new Intl.NumberFormat("pt-BR", {
                    maximumFractionDigits: 2
                }).format(value)} ${unit}`;
            }
        }

        return "—";
    }

    function renderComparison() {
        const products = Array.from(comparisonProducts.values());
        comparisonCount.textContent = products.length
            ? `${products.length} de ${COMPARISON_LIMIT} produtos selecionados.`
            : "Nenhum produto selecionado.";
        comparisonTableContainer.replaceChildren();

        if (products.length === 0) return;

        const table = document.createElement("table");
        table.className = "comparison-table";
        const head = document.createElement("thead");
        const headerRow = document.createElement("tr");
        const metricHeader = document.createElement("th");
        metricHeader.scope = "col";
        metricHeader.textContent = "Informação";
        headerRow.appendChild(metricHeader);

        products.forEach((product) => {
            const header = document.createElement("th");
            header.scope = "col";

            const name = document.createElement("strong");
            name.textContent = product.product_name;

            const brand = document.createElement("span");
            brand.textContent = product.brands || "Marca não informada";

            const quantity = document.createElement("span");
            quantity.textContent = product.quantity || "Quantidade não informada";

            const controls = document.createElement("div");
            controls.className = "comparison-product-actions";

            if (products.length >= 2) {
                const isFavorite = favorites.some(
                    (favorite) => favorite.product.code === product.code
                );
                controls.appendChild(makeButton(
                    isFavorite ? "Já favoritado" : "Favoritar",
                    "favorite-button",
                    () => favoritarProduto(product),
                    isFavorite
                ));
            }

            controls.appendChild(makeButton(
                "Remover",
                "remove-compare-button",
                () => alternarComparacao(product)
            ));

            header.append(name, brand, quantity, controls);
            headerRow.appendChild(header);
        });

        head.appendChild(headerRow);
        table.appendChild(head);

        const metrics = [
            { label: "Energia", keys: ["energy-kcal_100g"], unit: "kcal" },
            { label: "Energia (alternativa)", keys: ["energy_100g"], unit: "kJ" },
            { label: "Gorduras", keys: ["fat_100g"], unit: "g" },
            { label: "Gorduras saturadas", keys: ["saturated-fat_100g"], unit: "g" },
            { label: "Carboidratos", keys: ["carbohydrates_100g"], unit: "g" },
            { label: "Açúcares", keys: ["sugars_100g"], unit: "g" },
            { label: "Fibras", keys: ["fiber_100g"], unit: "g" },
            { label: "Proteínas", keys: ["proteins_100g"], unit: "g" },
            { label: "Sal", keys: ["salt_100g"], unit: "g" }
        ];
        const body = document.createElement("tbody");

        metrics.forEach((metric) => {
            const row = document.createElement("tr");
            const label = document.createElement("th");
            label.scope = "row";
            label.textContent = metric.label;
            row.appendChild(label);

            products.forEach((product) => {
                const value = document.createElement("td");
                value.textContent = formatNutrient(
                    product.nutriments,
                    metric.keys,
                    metric.unit
                );
                row.appendChild(value);
            });

            body.appendChild(row);
        });

        table.appendChild(body);
        comparisonTableContainer.appendChild(table);

        if (products.length < 2) {
            const note = document.createElement("p");
            note.className = "comparison-note";
            note.textContent = "Adicione pelo menos mais um produto para comparar e liberar a opção de favoritar.";
            comparisonTableContainer.appendChild(note);
        }
    }

    function showLoginPrompt() {
        catalogMessage.replaceChildren(
            document.createTextNode("Entre na sua conta para guardar este produto. ")
        );

        const link = document.createElement("a");
        link.href = `./conta.html?next=${encodeURIComponent("catalogo.html#comparar")}`;
        link.textContent = "Entrar ou criar conta";
        catalogMessage.appendChild(link);
    }

    async function favoritarProduto(product) {
        if (comparisonProducts.size < 2) {
            setCatalogMessage("Compare pelo menos 2 produtos antes de favoritar.", true);
            return;
        }

        if (!currentUser) {
            persistComparison();
            showLoginPrompt();
            return;
        }

        if (favorites.some((favorite) => favorite.product.code === product.code)) return;

        setCatalogMessage("Salvando favorito...");

        try {
            const { error } = await supabase
                .from("favoritos_openfoodfacts")
                .insert({
                    usuario_id: currentUser.id,
                    codigo_produto: product.code,
                    dados_produto: productSnapshot(product)
                });

            if (error) throw error;

            await carregarFavoritos();
            setCatalogMessage("Produto salvo nos seus favoritos.");
        } catch (error) {
            console.error("Erro ao salvar favorito:", error);
            setCatalogMessage(
                error.message || "Não foi possível salvar. Verifique a configuração do banco.",
                true
            );
        }
    }

    async function removerFavorito(id) {
        try {
            const { error } = await supabase
                .from("favoritos_openfoodfacts")
                .delete()
                .eq("id", id);

            if (error) throw error;

            favorites = favorites.filter((favorite) => favorite.id !== id);
            renderFavorites();
            renderComparison();
        } catch (error) {
            console.error("Erro ao remover favorito:", error);
            favoritesStatus.textContent =
                error.message || "Não foi possível remover este favorito.";
            favoritesStatus.classList.add("status-error");
        }
    }

    function renderFavorites() {
        favoritesList.replaceChildren();

        if (favorites.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "loading-message";
            emptyMessage.textContent = "Você ainda não tem produtos favoritados.";
            favoritesList.appendChild(emptyMessage);
            return;
        }

        favorites.forEach((favorite) => {
            const product = {
                ...normalizeProduct(favorite.dados_produto),
                code: favorite.codigo_produto,
                favoriteId: favorite.id
            };
            if (product.code) {
                favoritesList.appendChild(makeProductCard(product, { isFavorite: true }));
            }
        });
    }

    async function carregarFavoritos() {
        if (!currentUser) {
            favorites = [];
            favoritesStatus.textContent = "Entre na sua conta para ver seus favoritos.";
            favoritesStatus.classList.remove("status-error");
            favoritesList.replaceChildren();
            return;
        }

        favoritesStatus.textContent = "Carregando seus favoritos...";
        favoritesStatus.classList.remove("status-error");

        try {
            const { data, error } = await supabase
                .from("favoritos_openfoodfacts")
                .select("id, codigo_produto, dados_produto, criado_em")
                .order("criado_em", { ascending: false });

            if (error) throw error;

            favorites = (data || []).map((item) => ({
                id: item.id,
                codigo_produto: item.codigo_produto,
                dados_produto: item.dados_produto
            }));
            favoritesStatus.textContent = `${favorites.length} produto(s) salvo(s) na sua conta.`;
            renderFavorites();
            renderComparison();
        } catch (error) {
            console.error("Erro ao carregar favoritos:", error);
            favoritesStatus.textContent =
                error.message || "Não foi possível carregar os favoritos.";
            favoritesStatus.classList.add("status-error");
        }
    }

    async function pesquisar(termo, { append = false } = {}) {
        const query = termo.trim();

        if (!query) {
            setCatalogMessage("Digite o nome ou o código de barras de um produto.", true);
            return;
        }

        if (activeSearchController) activeSearchController.abort();
        const searchController = new AbortController();
        activeSearchController = searchController;
        const requestId = ++searchRequestId;
        let searchTimedOut = false;
        const timeoutId = setTimeout(() => {
            searchTimedOut = true;
            searchController.abort();
        }, 20000);
        const isBarcode = /^\d{8,14}$/.test(query);
        const requestedPage = append ? currentPage + 1 : 1;

        if (!append) {
            searchResults = [];
            currentPage = 0;
            totalPages = 0;
            productList.replaceChildren();
            productCount.textContent = "Pesquisando...";
        }

        searchSubmitButton.disabled = true;
        loadMoreButton.disabled = true;
        loadMoreButton.textContent = append ? "Carregando..." : "Carregar mais produtos";
        setCatalogMessage("");

        try {
            let requestUrl;

            if (isBarcode) {
                requestUrl = new URL(`${PRODUCT_API_URL}/${encodeURIComponent(query)}.json`);
                requestUrl.searchParams.set("fields", PRODUCT_FIELDS);
            } else {
                requestUrl = new URL(SEARCH_API_URL);
                requestUrl.searchParams.set("q", query);
                requestUrl.searchParams.set("langs", "pt,en");
                requestUrl.searchParams.set("fields", SEARCH_FIELDS);
                requestUrl.searchParams.set("page_size", String(PAGE_SIZE));
                requestUrl.searchParams.set("page", String(requestedPage));
            }

            const response = await fetch(requestUrl, {
                signal: searchController.signal,
                headers: { Accept: "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Open Food Facts respondeu com HTTP ${response.status}.`);
            }

            const responseText = await response.text();
            let result;

            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(
                    `Open Food Facts enviou uma resposta inválida (HTTP ${response.status}). Tente novamente em alguns instantes.`
                );
            }
            if (requestId !== searchRequestId) return;
            if (!result || typeof result !== "object") {
                throw new Error("Open Food Facts retornou uma resposta inesperada.");
            }

            if (!isBarcode && !Array.isArray(result.hits)) {
                throw new Error(
                    result.detail || "Open Food Facts não retornou uma lista de produtos válida."
                );
            }

            const apiProducts = isBarcode
                ? (result.status === 1 && result.product ? [result.product] : [])
                : (Array.isArray(result.hits) ? result.hits : []);
            const normalizedProducts = apiProducts
                .map(normalizeProduct)
                .filter(Boolean);

            if (append) {
                const existingCodes = new Set(searchResults.map((product) => product.code));
                searchResults.push(
                    ...normalizedProducts.filter((product) => !existingCodes.has(product.code))
                );
            } else {
                searchResults = normalizedProducts;
            }

            currentQuery = query;
            currentPage = requestedPage;
            totalPages = isBarcode ? 1 : Number(result.page_count || 0);

            productCount.textContent = isBarcode
                ? `${searchResults.length} produto(s) encontrado(s) pelo código.`
                : `${searchResults.length} produto(s) carregado(s) de ${Number(result.count || 0).toLocaleString("pt-BR")} resultado(s).`;

            renderSearchResults();
            loadMoreButton.hidden = isBarcode
                || totalPages === 0
                || currentPage >= totalPages;
        } catch (error) {
            if (error.name === "AbortError") {
                if (requestId === searchRequestId && searchTimedOut) {
                    productCount.textContent = "A busca demorou demais.";
                    setCatalogMessage("Tente novamente em alguns instantes.", true);
                }
                return;
            }

            console.error("Erro ao pesquisar no Open Food Facts:", error);
            productCount.textContent = "Não foi possível pesquisar.";
            setCatalogMessage(
                error instanceof TypeError
                    ? "Não foi possível acessar o Open Food Facts. Confira sua conexão ou tente novamente mais tarde."
                    : error.message || "Confira sua conexão e tente novamente.",
                true
            );

            if (!append) productList.replaceChildren();
        } finally {
            clearTimeout(timeoutId);
            if (requestId === searchRequestId) {
                searchSubmitButton.disabled = false;
                loadMoreButton.disabled = false;
                loadMoreButton.textContent = "Carregar mais produtos";
            }
        }
    }

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        currentQuery = productSearch.value.trim();
        pesquisar(currentQuery);
    });

    loadMoreButton.addEventListener("click", () => {
        if (currentQuery) pesquisar(currentQuery, { append: true });
    });

    restoreComparison();
    renderComparison();

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        currentUser = data.session?.user || null;
        await carregarFavoritos();
    } catch (error) {
        console.error("Erro ao verificar a conta para os favoritos:", error);
        favoritesStatus.textContent =
            error.message || "Não foi possível verificar sua conta.";
        favoritesStatus.classList.add("status-error");
    }

    if (window.location.hash === "#buscar") {
        productSearch.focus();
    } else if (window.location.hash === "#comparar") {
        document.getElementById("comparisonSection").scrollIntoView();
    } else if (window.location.hash === "#favoritos") {
        document.getElementById("favoritesSection").scrollIntoView();
    }
});
