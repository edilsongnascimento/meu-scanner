const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "itf", "code_128"];
const ZXING_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
const TESSERACT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("scannerVideo");
    const scannerStatus = document.getElementById("scannerStatus");
    const startScannerButton = document.getElementById("startScannerButton");
    const stopScannerButton = document.getElementById("stopScannerButton");
    const barcodeForm = document.getElementById("barcodeForm");
    const barcodeInput = document.getElementById("barcodeInput");
    const labelImage = document.getElementById("labelImage");
    const labelPreview = document.getElementById("labelPreview");
    const ocrStatus = document.getElementById("ocrStatus");
    const recognizedText = document.getElementById("recognizedText");
    const suggestedName = document.getElementById("suggestedName");
    const suggestedQuantity = document.getElementById("suggestedQuantity");
    const searchLabelButton = document.getElementById("searchLabelButton");
    let activeStream = null;
    let scanFrame = 0;
    let scanning = false;
    let zxingReader = null;
    let tesseractWorker = null;
    let previewUrl = "";
    const scriptLoads = new Map();

    function setStatus(element, message, isError = false) {
        element.textContent = message;
        element.classList.toggle("status-error", isError);
    }

    function searchCatalog(query) {
        const search = new URLSearchParams({ q: query.trim() });
        window.location.href = `./catalogo.html?${search.toString()}#buscar`;
    }

    function stopScanner() {
        scanning = false;
        cancelAnimationFrame(scanFrame);
        if (zxingReader) {
            zxingReader.reset();
            zxingReader = null;
        }
        if (activeStream) {
            activeStream.getTracks().forEach((track) => track.stop());
            activeStream = null;
        }
        video.pause();
        video.srcObject = null;
        video.hidden = true;
        startScannerButton.hidden = false;
        stopScannerButton.hidden = true;
    }

    function handleBarcode(code) {
        if (!/^\d{8,14}$/.test(code)) {
            setStatus(scannerStatus, "O código lido não parece ser um EAN/UPC válido. Tente novamente.", true);
            return;
        }
        stopScanner();
        barcodeInput.value = code;
        setStatus(scannerStatus, `Código ${code} lido. Abrindo a pesquisa...`);
        searchCatalog(code);
    }

    function loadScript(src, globalName) {
        if (window[globalName]) return Promise.resolve(window[globalName]);
        if (scriptLoads.has(src)) return scriptLoads.get(src);

        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = () => {
                if (window[globalName]) {
                    resolve(window[globalName]);
                    return;
                }
                scriptLoads.delete(src);
                reject(new Error("O recurso de leitura foi carregado, mas não ficou disponível."));
            };
            script.onerror = () => {
                scriptLoads.delete(src);
                script.remove();
                reject(new Error("Não foi possível carregar o recurso de leitura. Confira sua conexão."));
            };
            document.head.append(script);
        });
        scriptLoads.set(src, loadPromise);
        return loadPromise;
    }

    async function startZXingScanner() {
        const ZXing = await loadScript(ZXING_SCRIPT_URL, "ZXing");
        if (!scanning) return;

        zxingReader = new ZXing.BrowserMultiFormatReader();
        video.hidden = false;
        startScannerButton.hidden = true;
        stopScannerButton.hidden = false;
        setStatus(scannerStatus, "Aponte a câmera para o código de barras.");
        await zxingReader.decodeFromVideoDevice(
            undefined,
            video,
            (result, error) => {
                if (result) handleBarcode(result.getText());
                if (error && error.name !== "NotFoundException" && error.name !== "ChecksumException" && error.name !== "FormatException") {
                    console.error("Erro durante a leitura do código:", error);
                }
            }
        );
    }

    async function startNativeScanner() {
        activeStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } }
        });
        video.srcObject = activeStream;
        video.hidden = false;
        await video.play();

        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        const formats = BARCODE_FORMATS.filter((format) => supportedFormats.includes(format));
        if (!formats.length) {
            stopScanner();
            scanning = true;
            await startZXingScanner();
            return;
        }

        const detector = new BarcodeDetector({ formats });
        startScannerButton.hidden = true;
        stopScannerButton.hidden = false;
        setStatus(scannerStatus, "Aponte a câmera para o código de barras.");

        const detectFrame = async () => {
            if (!scanning) return;
            if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                scanFrame = requestAnimationFrame(detectFrame);
                return;
            }
            try {
                const barcodes = await detector.detect(video);
                if (!scanning) return;
                if (barcodes.length) {
                    handleBarcode(barcodes[0].rawValue);
                    return;
                }
            } catch (error) {
                console.error("Falha ao detectar o código de barras:", error);
                stopScanner();
                setStatus(scannerStatus, "Não foi possível ler a imagem da câmera. Tente novamente ou digite o código.", true);
                return;
            }
            if (scanning) scanFrame = requestAnimationFrame(detectFrame);
        };
        scanFrame = requestAnimationFrame(detectFrame);
    }

    startScannerButton.addEventListener("click", async () => {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setStatus(scannerStatus, "A câmera exige HTTPS e um navegador compatível. Digite o código ou abra o app pelo endereço HTTPS.", true);
            return;
        }

        startScannerButton.disabled = true;
        scanning = true;
        setStatus(scannerStatus, "Solicitando acesso à câmera...");
        try {
            if ("BarcodeDetector" in window) {
                await startNativeScanner();
            } else {
                await startZXingScanner();
            }
        } catch (error) {
            console.error("Não foi possível iniciar o leitor:", error);
            stopScanner();
            const permissionDenied = error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
            setStatus(
                scannerStatus,
                permissionDenied
                    ? "A permissão da câmera foi negada. Autorize o acesso nas configurações do navegador ou digite o código."
                    : error.message || "Não foi possível abrir a câmera. Digite o código para continuar.",
                true
            );
        } finally {
            startScannerButton.disabled = false;
        }
    });

    stopScannerButton.addEventListener("click", () => {
        stopScanner();
        setStatus(scannerStatus, "Câmera fechada.");
    });

    barcodeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (barcodeForm.reportValidity()) searchCatalog(barcodeInput.value);
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && scanning) {
            stopScanner();
            setStatus(scannerStatus, "Câmera fechada ao sair desta tela.");
        }
    });

    function suggestLabelFields(text) {
        const lines = text.split(/\r?\n/)
            .map((line) => line.replace(/\s+/g, " ").trim())
            .filter((line) => line.length >= 3 && line.length <= 120);
        const quantityPattern = /\b\d+(?:[.,]\d+)?\s?(?:kg|g|mg|µg|mcg|l|ml|cl)\b/i;
        const quantity = lines.map((line) => line.match(quantityPattern)?.[0]).find(Boolean) || "";
        const excludedTerms = /\b(?:ingredientes|informação nutricional|informacao nutricional|valor energético|valor energetico|porção|porcao|proteínas|proteinas|carboidratos|gorduras|sódio|sodio|açúcares|acucares|conservar|validade|fabricado|lote|alérgicos|alergicos)\b/i;
        const name = lines.find((line) =>
            !quantityPattern.test(line)
            && !excludedTerms.test(line)
            && /[a-záàâãéèêíïóôõöúçñ]{3}/i.test(line)
            && !/^\d+[\d\s.,/-]*$/.test(line)
        ) || "";

        suggestedName.value = name;
        suggestedQuantity.value = quantity;
    }

    labelImage.addEventListener("change", async () => {
        const file = labelImage.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setStatus(ocrStatus, "Escolha um arquivo de imagem válido.", true);
            labelImage.value = "";
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
            setStatus(ocrStatus, "A imagem deve ter no máximo 12 MB.", true);
            labelImage.value = "";
            return;
        }

        labelImage.disabled = true;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        labelPreview.src = previewUrl;
        labelPreview.hidden = false;
        recognizedText.textContent = "";
        setStatus(ocrStatus, "Carregando o reconhecimento de texto...");
        searchLabelButton.disabled = true;

        try {
            const Tesseract = await loadScript(TESSERACT_SCRIPT_URL, "Tesseract");
            if (!tesseractWorker) {
                tesseractWorker = await Tesseract.createWorker("por", 1, {
                    logger: (progress) => {
                        if (progress.status === "recognizing text") {
                            const percent = Math.round((progress.progress || 0) * 100);
                            setStatus(ocrStatus, `Lendo o rótulo: ${percent}%`);
                        }
                    }
                });
            }

            const { data } = await tesseractWorker.recognize(file);
            const text = String(data.text || "").trim();
            recognizedText.textContent = text || "Nenhum texto foi reconhecido. Tente outra foto com boa iluminação.";
            suggestLabelFields(text);
            setStatus(
                ocrStatus,
                text
                    ? "Confira as sugestões, corrija se necessário e toque em pesquisar."
                    : "Nenhum texto reconhecido. Você ainda pode preencher os campos manualmente.",
                !text
            );
        } catch (error) {
            console.error("Falha no reconhecimento do rótulo:", error);
            setStatus(ocrStatus, error.message || "Não foi possível ler o rótulo. Tente novamente ou preencha os campos.", true);
        } finally {
            searchLabelButton.disabled = false;
            labelImage.disabled = false;
            labelImage.value = "";
        }
    });

    searchLabelButton.addEventListener("click", () => {
        const query = [suggestedName.value.trim(), suggestedQuantity.value.trim()]
            .filter(Boolean)
            .join(" ");
        if (!query) {
            setStatus(ocrStatus, "Revise ou digite o nome ou peso antes de pesquisar.", true);
            suggestedName.focus();
            return;
        }
        searchCatalog(query);
    });
});
