(() => {
    const storageKey = "tinkergrass-language";
    const supportedLanguages = ["en", "zh-Hant"];
    const localizedDescriptions = {
        "/": {
            en: "AI and robotics consulting, custom solutions, and system optimization.",
            "zh-Hant": "提供 AI 與機器人顧問、客製化解決方案及系統效能優化服務。",
        },
        "/blog/": {
            en: "Notes, experiments, and updates from Tinkergrass.",
            "zh-Hant": "元野的技術筆記、實驗與最新消息。",
        },
        "/blog/micro-fulfillment-video/": {
            en: "Our first official demo: a robotic arm sorting and packing travel toiletries on its own.",
            "zh-Hant": "我們的首個官方實機展示：機械臂獨立完成旅行洗漱用品的分類與打包。",
        },
    };
    const localizedPageTitles = {
        "/": {
            en: "元野有限公司 Tinkergrass",
            "zh-Hant": "元野有限公司 Tinkergrass",
        },
        "/blog/": {
            en: "Blog",
            "zh-Hant": "網誌",
        },
        "/blog/micro-fulfillment-video/": {
            en: "Milestone One: Autonomous Toiletry Organization",
            "zh-Hant": "機械臂自主整理旅行用品",
        },
    };
    const frameObservers = new WeakMap();

    function scalePageFramesForPrint() {
        document.querySelectorAll("[data-page-frame]").forEach((frame) => {
            if (!(frame instanceof HTMLIFrameElement)) return;
            const frameDocument = frame.contentDocument;
            const frameBody = frameDocument?.body;
            if (!frameDocument || !frameBody) return;

            frameBody.style.transform = "";
            frameBody.style.transformOrigin = "";
            const contentHeight = frameBody.scrollHeight;
            const availableHeight = frame.getBoundingClientRect().height;
            if (contentHeight <= 0 || availableHeight <= 0) return;

            const scale = Math.min(1, availableHeight / contentHeight);
            frameBody.style.transform = `scale(${scale})`;
            frameBody.style.transformOrigin = "top center";
        });
    }

    function restorePageFramesAfterPrint() {
        document.querySelectorAll("[data-page-frame]").forEach((frame) => {
            if (!(frame instanceof HTMLIFrameElement)) return;
            const frameBody = frame.contentDocument?.body;
            if (!frameBody) return;
            frameBody.style.transform = "";
            frameBody.style.transformOrigin = "";
        });
    }

    window.addEventListener("beforeprint", scalePageFramesForPrint);
    window.addEventListener("afterprint", restorePageFramesAfterPrint);

    function syncPageFrames(language) {
        document.querySelectorAll("[data-page-frame]").forEach((frame) => {
            if (!(frame instanceof HTMLIFrameElement)) return;
            const frameDocument = frame.contentDocument;
            const frameRoot = frameDocument?.documentElement;
            if (!frameRoot) return;

            frameRoot.lang = language;
            frame.style.height = `${frameDocument.body?.scrollHeight ?? frameRoot.scrollHeight}px`;
        });
    }

    function applyLanguage(language) {
        const selected = supportedLanguages.includes(language) ? language : "en";
        document.documentElement.lang = selected;
        syncPageFrames(selected);
        requestAnimationFrame(() => syncPageFrames(selected));

        document.querySelectorAll("[data-language-toggle]").forEach((button) => {
            button.textContent = selected === "en" ? "中文" : "English";
            button.setAttribute(
                "aria-label",
                selected === "en" ? "Switch to Chinese" : "Switch to English",
            );
        });

        document.querySelectorAll(".site-page-switch").forEach((link) => {
            const label = link.dataset[`label${selected === "en" ? "En" : "Zh"}`];
            if (label) {
                link.setAttribute("aria-label", label);
                link.setAttribute("title", label);
            }
        });

        const pageTitle = document.querySelector(".td-content > h1");
        const localizedTitle = localizedPageTitles[location.pathname]?.[selected];
        if (pageTitle && localizedTitle) {
            pageTitle.textContent = localizedTitle;
            const breadcrumbTitle = document.querySelector('.td-breadcrumbs [aria-current="page"]');
            if (breadcrumbTitle) breadcrumbTitle.textContent = localizedTitle;
        }
        document.querySelectorAll('.td-breadcrumbs a[href="/blog/"]').forEach((link) => {
            link.textContent = selected === "en" ? "Blog" : "網誌";
        });

        const articleDate = document.querySelector(".td-byline time[datetime]");
        if (articleDate) {
            const date = new Date(`${articleDate.dateTime.slice(0, 10)}T00:00:00`);
            if (!Number.isNaN(date.getTime())) {
                articleDate.textContent = new Intl.DateTimeFormat(selected === "en" ? "en-US" : "zh-Hant", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }).format(date);
            }
        }

        const description = document.querySelector('meta[name="description"]');
        const pageDescriptions = localizedDescriptions[location.pathname];
        if (pageDescriptions) {
            if (description) description.content = pageDescriptions[selected];
            const visibleDescription = document.querySelector(".td-content > .lead");
            if (visibleDescription) visibleDescription.textContent = pageDescriptions[selected];
        }

        if (localizedTitle) document.title = `${localizedTitle} | Tinkergrass`;
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
