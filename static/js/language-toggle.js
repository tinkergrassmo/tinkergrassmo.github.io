(() => {
    const storageKey = "tinkergrass-language";
    const supportedLanguages = ["en", "zh-Hant"];
    const localizedDescriptions = {
        "/": {
            en: "AI and robotics consulting, custom solutions, and system optimization.",
            "zh-Hant": "提供 AI 與機器人顧問、客製化解決方案及系統效能優化服務。",
        },
    };
    const localizedPageTitles = {
        "/": {
            en: "Tinkergrass Ltd. Co.",
            "zh-Hant": "元野有限公司",
        },
    };
    const frameObservers = new WeakMap();

    function syncPageFrames(language) {
        document.querySelectorAll("[data-page-frame]").forEach((frame) => {
            if (!(frame instanceof HTMLIFrameElement)) return;
            const frameDocument = frame.contentDocument;
            const frameRoot = frameDocument?.documentElement;
            if (!frameRoot) return;

            frameRoot.lang = language;
            frame.style.height = `${Math.max(
                frameRoot.scrollHeight,
                frameDocument.body?.scrollHeight ?? 0,
            )}px`;
        });
    }

    function applyLanguage(language) {
        const selected = supportedLanguages.includes(language) ? language : "en";
        document.documentElement.lang = selected;
        syncPageFrames(selected);

        document.querySelectorAll("[data-language-toggle]").forEach((button) => {
            button.textContent = selected === "en" ? "中文" : "English";
            button.setAttribute(
                "aria-label",
                selected === "en" ? "Switch to Chinese" : "Switch to English",
            );
        });

        const pageTitle = document.querySelector(".td-content > h1");
        if (pageTitle && location.pathname === "/") {
            pageTitle.textContent = selected === "en" ? "Core Capabilities & Services" : "核心技術與服務";
        }

        const description = document.querySelector('meta[name="description"]');
        const pageDescriptions = localizedDescriptions[location.pathname];
        if (pageDescriptions) {
            if (description) description.content = pageDescriptions[selected];
            const visibleDescription = document.querySelector(".td-content > .lead");
            if (visibleDescription) visibleDescription.textContent = pageDescriptions[selected];
        }

        document.title = localizedPageTitles[location.pathname]?.[selected] ?? localizedPageTitles["/"][selected];
        localStorage.setItem(storageKey, selected);
    }

    function initializeLanguageToggle() {
        document.querySelectorAll("[data-page-frame]").forEach((frame) => {
            if (!(frame instanceof HTMLIFrameElement)) return;

            const updateFrame = () => {
                syncPageFrames(document.documentElement.lang);
                const frameDocument = frame.contentDocument;
                const frameRoot = frameDocument?.documentElement;
                if (!frameDocument || !frameRoot) return;
                frameObservers.get(frame)?.disconnect();
                const observer = new ResizeObserver(() => {
                    syncPageFrames(document.documentElement.lang);
                });
                observer.observe(frameRoot);
                if (frameDocument.body) observer.observe(frameDocument.body);
                frameObservers.set(frame, observer);
                frameDocument.querySelectorAll("img").forEach((image) => {
                    image.addEventListener("load", () => syncPageFrames(document.documentElement.lang), { once: true });
                });
                frameDocument.fonts?.ready.then(() => syncPageFrames(document.documentElement.lang));
            };

            frame.addEventListener("load", updateFrame);
            updateFrame();
        });

        applyLanguage(localStorage.getItem(storageKey) || "en");

        document.querySelectorAll("[data-language-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                applyLanguage(document.documentElement.lang === "en" ? "zh-Hant" : "en");
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeLanguageToggle, { once: true });
    } else {
        initializeLanguageToggle();
    }
})();
