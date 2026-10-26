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
        "/": { en: "Tinkergrass", "zh-Hant": "元野有限公司" },
    };

    function applyLanguage(language) {
        const selected = supportedLanguages.includes(language) ? language : "en";
        document.documentElement.lang = selected;

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
