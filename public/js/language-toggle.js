(() => {
    const storageKey = "tinkergrass-language";
    const supportedLanguages = ["en", "zh-Hant"];
    const localizedNavigation = {
        "/": { en: "Home", "zh-Hant": "首頁" },
        "/about/": { en: "About", "zh-Hant": "關於" },
        "/contact/": { en: "Contact", "zh-Hant": "聯絡我們" },
    };
    const localizedDescriptions = {
        "/": {
            en: "A robotics-centered industrial ecosystem.",
            "zh-Hant": "以機器人自動化為核心的工業生態系統。",
        },
        "/about/": {
            en: "Tinkergrass and its robotics-centered industrial ecosystem.",
            "zh-Hant": "元野有限公司與機器人工業生態系統。",
        },
        "/contact/": {
            en: "Contact Tinkergrass.",
            "zh-Hant": "聯絡元野有限公司。",
        },
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

        document.querySelectorAll(".td-navbar a[href], .td-sidebar-nav a[href]").forEach((link) => {
            const labels = localizedNavigation[link.pathname];
            if (labels && !link.hash) link.textContent = labels[selected];
        });

        const pageTitle = document.querySelector(".td-content > h1");
        if (pageTitle && location.pathname.startsWith("/about")) {
            pageTitle.textContent = selected === "en" ? "About Tinkergrass" : "關於元野有限公司";
        } else if (pageTitle && location.pathname.startsWith("/contact")) {
            pageTitle.textContent = selected === "en" ? "Contact" : "聯絡我們";
        }

        const description = document.querySelector('meta[name="description"]');
        const pageDescriptions = localizedDescriptions[location.pathname];
        if (pageDescriptions) {
            if (description) description.content = pageDescriptions[selected];
            const visibleDescription = document.querySelector(".td-content > .lead");
            if (visibleDescription) visibleDescription.textContent = pageDescriptions[selected];
        }

        document.title = location.pathname.startsWith("/contact")
            ? (selected === "en" ? "Contact | Tinkergrass" : "聯絡我們 | 元野有限公司")
            : (selected === "en" ? "Tinkergrass" : "元野有限公司");
        localStorage.setItem(storageKey, selected);
    }

    function initializeLanguageToggle() {
        const toggle = document.querySelector("[data-language-toggle]");
        const navbar = document.querySelector(".td-navbar");
        if (toggle && navbar && !navbar.contains(toggle)) {
            navbar.append(toggle);
        }

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
