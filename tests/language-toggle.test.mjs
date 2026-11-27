import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const LANGUAGE_TOGGLE_JS = fs.readFileSync(
  path.join(ROOT, "static/js/language-toggle.js"),
  "utf8",
);
const PROJECT_SCSS = fs.readFileSync(
  path.join(ROOT, "assets/scss/_styles_project.scss"),
  "utf8",
);

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: markdown };

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[kv[1]] = value;
  }
  return { frontmatter, body: match[2] };
}

function extractLangSpans(html, lang) {
  const regex = new RegExp(`<span\\s+lang="${lang}"[^>]*>([\\s\\S]*?)<\\/span>`, "g");
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1].replace(/<[^>]+>/g, "").trim());
  }
  return matches;
}

class FakeElement {
  constructor(tag, attrs = {}, textContent = "") {
    this.tagName = tag.toUpperCase();
    this.attributes = { ...attrs };
    this.dataset = {};
    this.style = {};
    this.listeners = new Map();
    this._textContent = textContent;

    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("data-")) {
        const camel = k
          .slice(5)
          .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[camel] = v;
      }
    }
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get content() {
    return this.attributes.content ?? "";
  }

  set content(value) {
    this.attributes.content = String(value);
  }

  get dateTime() {
    return this.attributes.datetime ?? "";
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  dispatchEvent(type) {
    for (const fn of this.listeners.get(type) ?? []) {
      fn({ type, target: this });
    }
  }

  click() {
    this.dispatchEvent("click");
  }
}

class FakeIframeElement extends FakeElement {
  constructor(attrs = {}, frameDoc = null) {
    super("iframe", attrs);
    this.contentDocument = frameDoc;
  }

  getBoundingClientRect() {
    return { height: 800 };
  }
}

function createHarness({ pathname, initialStorage = {}, elements = {}, iframes = [] }) {
  const storage = new Map(Object.entries(initialStorage));
  const documentListeners = new Map();
  const windowListeners = new Map();

  const selectors = {
    "[data-language-toggle]": elements.toggleButtons ?? [],
    "[data-page-frame]": iframes,
    ".site-page-switch": elements.pageSwitches ?? [],
    ".td-content > h1": elements.h1 ?? null,
    '.td-breadcrumbs [aria-current="page"]': elements.breadcrumbCurrent ?? null,
    '.td-breadcrumbs a[href="/blog/"]': elements.breadcrumbBlogLinks ?? [],
    ".td-byline time[datetime]": elements.articleDate ?? null,
    'meta[name="description"]': elements.metaDescription ?? null,
    ".td-content > .lead": elements.lead ?? null,
  };

  const document = {
    readyState: "complete",
    title: elements.initialTitle ?? "Tinkergrass",
    documentElement: new FakeElement("html", { lang: "en" }),
    querySelector(selector) {
      const target = selectors[selector];
      return Array.isArray(target) ? target[0] ?? null : target ?? null;
    },
    querySelectorAll(selector) {
      const target = selectors[selector];
      if (!target) return [];
      return Array.isArray(target) ? target : [target];
    },
    addEventListener(type, fn) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(fn);
    },
  };

  const windowObj = {
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
  };

  const context = {
    document,
    window: windowObj,
    HTMLIFrameElement: FakeIframeElement,
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
    },
    location: { pathname },
    requestAnimationFrame: (cb) => cb(),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    Intl,
    Number,
  };

  vm.runInNewContext(LANGUAGE_TOGGLE_JS, context);

  return {
    document,
    storage,
    toggleButton: selectors["[data-language-toggle]"][0],
  };
}

test("CSS hides inactive language spans when html[lang] switches", () => {
  assert.match(
    PROJECT_SCSS,
    /html\[lang="en"\]\s+\[lang="zh-Hant"\][\s\S]*?html\[lang="zh-Hant"\]\s+\[lang="en"\]\s*\{[\s\S]*?display:\s*none\s*!important;/,
    "Expected _styles_project.scss to hide inactive [lang] elements on language switch",
  );
});

test("Home page (/) switches language, iframe lang, metadata, and quick links", () => {
  const toggleBtn = new FakeElement("button", { "data-language-toggle": "" }, "中文");
  const newsletterSwitch = new FakeElement("a", {
    href: "https://forms.gle/irPBHQtL6DU9aSbw7",
    "data-label-en": "Subscribe to newsletter",
    "data-label-zh": "訂閱電子報",
  });
  const pageSwitch = new FakeElement("a", {
    href: "/blog/",
    "data-label-en": "Blog",
    "data-label-zh": "網誌",
  });
  const metaDescription = new FakeElement("meta", {
    name: "description",
    content: "AI and robotics consulting, custom solutions, and system optimization.",
  });

  const frame1Doc = {
    documentElement: new FakeElement("html", { lang: "en" }),
    body: { scrollHeight: 600, style: {} },
    querySelectorAll: () => [],
  };
  const frame2Doc = {
    documentElement: new FakeElement("html", { lang: "en" }),
    body: { scrollHeight: 500, style: {} },
    querySelectorAll: () => [],
  };
  const frames = [
    new FakeIframeElement({ "data-page-frame": "" }, frame1Doc),
    new FakeIframeElement({ "data-page-frame": "" }, frame2Doc),
  ];

  const { document, storage, toggleButton } = createHarness({
    pathname: "/",
    elements: {
      toggleButtons: [toggleBtn],
      pageSwitches: [newsletterSwitch, pageSwitch],
      metaDescription,
    },
    iframes: frames,
  });

  // Starts in Traditional Chinese by default
  assert.equal(document.documentElement.lang, "zh-Hant");
  assert.equal(toggleButton.textContent, "English");
  assert.equal(frame1Doc.documentElement.lang, "zh-Hant");
  assert.equal(frame2Doc.documentElement.lang, "zh-Hant");
  assert.equal(newsletterSwitch.getAttribute("aria-label"), "訂閱電子報");
  assert.equal(pageSwitch.getAttribute("aria-label"), "網誌");
  assert.match(metaDescription.content, /[\u4e00-\u9fff]/);

  // Switch to English
  toggleButton.click();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(storage.get("tinkergrass-language"), "en");
  assert.equal(toggleButton.textContent, "中文");
  assert.equal(frame1Doc.documentElement.lang, "en");
  assert.equal(frame2Doc.documentElement.lang, "en");
  assert.equal(newsletterSwitch.getAttribute("aria-label"), "Subscribe to newsletter");
  assert.equal(pageSwitch.getAttribute("aria-label"), "Blog");
  assert.doesNotMatch(metaDescription.content, /[\u4e00-\u9fff]/);

  // Switch back to Traditional Chinese
  toggleButton.click();
  assert.equal(document.documentElement.lang, "zh-Hant");
  assert.equal(storage.get("tinkergrass-language"), "zh-Hant");
  assert.equal(toggleButton.textContent, "English");
  assert.equal(frame1Doc.documentElement.lang, "zh-Hant");
  assert.equal(frame2Doc.documentElement.lang, "zh-Hant");
  assert.equal(pageSwitch.getAttribute("aria-label"), "網誌");
  assert.match(metaDescription.content, /[\u4e00-\u9fff]/);
});

test("Blog index (/blog/) switches heading, description, title, and home link", () => {
  const toggleBtn = new FakeElement("button", { "data-language-toggle": "" }, "中文");
  const pageSwitch = new FakeElement("a", {
    href: "/",
    "data-label-en": "Tinkergrass home",
    "data-label-zh": "元野首頁",
  });
  const h1 = new FakeElement("h1", {}, "Blog");
  const lead = new FakeElement("div", { class: "lead" }, "Notes, experiments, and updates from Tinkergrass.");
  const metaDescription = new FakeElement("meta", {
    name: "description",
    content: "Notes, experiments, and updates from Tinkergrass.",
  });

  const { document, toggleButton } = createHarness({
    pathname: "/blog/",
    elements: {
      toggleButtons: [toggleBtn],
      pageSwitches: [pageSwitch],
      h1,
      lead,
      metaDescription,
    },
  });

  assert.equal(document.documentElement.lang, "zh-Hant");
  assert.equal(h1.textContent, "網誌");
  assert.equal(document.title, "網誌 | Tinkergrass");
  assert.match(lead.textContent, /[\u4e00-\u9fff]/);
  assert.match(metaDescription.content, /[\u4e00-\u9fff]/);
  assert.equal(pageSwitch.getAttribute("aria-label"), "元野首頁");

  toggleButton.click();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(h1.textContent, "Blog");
  assert.equal(document.title, "Blog | Tinkergrass");
  assert.doesNotMatch(lead.textContent, /[\u4e00-\u9fff]/);
  assert.equal(pageSwitch.getAttribute("aria-label"), "Tinkergrass home");

  toggleButton.click();
  assert.equal(document.documentElement.lang, "zh-Hant");
  assert.equal(h1.textContent, "網誌");
  assert.equal(document.title, "網誌 | Tinkergrass");
});

test("Every blog post has paired bilingual content and switches all fields cleanly", () => {
  const blogDir = path.join(ROOT, "content/blog");
  const entries = fs
    .readdirSync(blogDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  assert.ok(entries.length > 0, "Expected at least one blog post directory");

  for (const dir of entries) {
    const postPath = path.join(blogDir, dir.name, "index.md");
    if (!fs.existsSync(postPath)) continue;

    const raw = fs.readFileSync(postPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    if (frontmatter.draft === "true") continue;

    // Verify paired bilingual spans in post body
    const enSpans = extractLangSpans(body, "en");
    const zhSpans = extractLangSpans(body, "zh-Hant");
    assert.ok(enSpans.length > 0, `${dir.name}: missing <span lang="en"> blocks`);
    assert.equal(
      enSpans.length,
      zhSpans.length,
      `${dir.name}: mismatch between <span lang="en"> (${enSpans.length}) and <span lang="zh-Hant"> (${zhSpans.length})`,
    );
    for (let i = 0; i < enSpans.length; i++) {
      assert.ok(enSpans[i].length > 0, `${dir.name}: empty English span #${i + 1}`);
      assert.ok(zhSpans[i].length > 0, `${dir.name}: empty Chinese span #${i + 1}`);
      assert.match(zhSpans[i], /[\u4e00-\u9fff]/, `${dir.name}: Chinese span #${i + 1} has no CJK characters`);
    }

    // Verify frontmatter has both English and Chinese titles & summaries
    assert.ok(frontmatter.title_en, `${dir.name}: missing title_en`);
    assert.ok(frontmatter.title_zh, `${dir.name}: missing title_zh`);
    assert.ok(frontmatter.summary_en, `${dir.name}: missing summary_en`);
    assert.ok(frontmatter.summary_zh, `${dir.name}: missing summary_zh`);

    // Test language-toggle.js across trailing-slash, no-slash, and index.html URLs
    const urlVariants = [
      `/blog/${dir.name}/`,
      `/blog/${dir.name}`,
      `/blog/${dir.name}/index.html`,
    ];

    for (const pathname of urlVariants) {
      const toggleBtn = new FakeElement("button", { "data-language-toggle": "" }, "中文");
      const h1 = new FakeElement("h1", {}, frontmatter.title);
      const breadcrumbCurrent = new FakeElement("li", { "aria-current": "page" }, frontmatter.title);
      const breadcrumbBlog = new FakeElement("a", { href: "/blog/" }, "Blog");
      const lead = new FakeElement("div", { class: "lead" }, frontmatter.description);
      const metaDescription = new FakeElement("meta", {
        name: "description",
        content: frontmatter.description,
      });
      const articleDate = new FakeElement("time", { datetime: frontmatter.date || "2026-11-26" }, "");

      const { document, toggleButton } = createHarness({
        pathname,
        elements: {
          toggleButtons: [toggleBtn],
          h1,
          breadcrumbCurrent,
          breadcrumbBlogLinks: [breadcrumbBlog],
          lead,
          metaDescription,
          articleDate,
        },
      });

      // Starts in Traditional Chinese by default
      assert.equal(document.documentElement.lang, "zh-Hant");
      assert.match(h1.textContent, /[\u4e00-\u9fff]/, `${pathname}: h1 did not default to Chinese`);
      assert.match(breadcrumbCurrent.textContent, /[\u4e00-\u9fff]/, `${pathname}: breadcrumb did not default to Chinese`);
      assert.equal(breadcrumbBlog.textContent, "網誌");
      assert.match(lead.textContent, /[\u4e00-\u9fff]/, `${pathname}: lead description did not default to Chinese`);
      assert.match(metaDescription.content, /[\u4e00-\u9fff]/, `${pathname}: meta description did not default to Chinese`);
      assert.match(document.title, /[\u4e00-\u9fff]/, `${pathname}: document.title did not default to Chinese`);

      // Switch to en
      toggleButton.click();
      assert.equal(document.documentElement.lang, "en");
      assert.doesNotMatch(h1.textContent, /[\u4e00-\u9fff]/, `${pathname}: h1 did not switch to English`);
      assert.equal(breadcrumbBlog.textContent, "Blog");
      assert.doesNotMatch(lead.textContent, /[\u4e00-\u9fff]/, `${pathname}: lead did not switch to English`);
      assert.doesNotMatch(metaDescription.content, /[\u4e00-\u9fff]/, `${pathname}: meta description did not switch to English`);
      assert.doesNotMatch(document.title, /[\u4e00-\u9fff]/, `${pathname}: document.title did not switch to English`);

      // Switch back to zh-Hant
      toggleButton.click();
      assert.equal(document.documentElement.lang, "zh-Hant");
      assert.match(h1.textContent, /[\u4e00-\u9fff]/, `${pathname}: h1 did not switch back to Chinese`);
      assert.equal(breadcrumbBlog.textContent, "網誌");
    }
  }
});

test("Static iframe pages contain both English and Traditional Chinese content", () => {
  for (const file of ["static/about_us.html", "static/core_capabilities_and_services.html"]) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(html, /lang="en"/, `${file}: missing lang="en" elements`);
    assert.match(html, /lang="zh-Hant"/, `${file}: missing lang="zh-Hant" elements`);
  }
});

test("Newsletter quick links and blog callout include bilingual labels and safe external link attributes", () => {
  const newsletterUrl = "https://forms.gle/irPBHQtL6DU9aSbw7";
  const filesWithNewsletterLink = [
    "content/_index.md",
    "layouts/partials/hooks/body-end.html",
    "layouts/partials/newsletter-callout.html",
  ];

  for (const file of filesWithNewsletterLink) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.ok(html.includes(newsletterUrl), `${file}: missing newsletter URL`);
    assert.match(html, /target="_blank"/, `${file}: missing target="_blank"`);
    assert.match(html, /rel="noopener noreferrer"/, `${file}: missing rel="noopener noreferrer"`);

    const enSpans = extractLangSpans(html, "en");
    const zhSpans = extractLangSpans(html, "zh-Hant");
    assert.ok(enSpans.length > 0, `${file}: missing English spans`);
    assert.equal(enSpans.length, zhSpans.length, `${file}: mismatched en/zh-Hant span counts`);
  }

  const blogListTemplate = fs.readFileSync(path.join(ROOT, "layouts/blog/list.html"), "utf8");
  assert.match(
    blogListTemplate,
    /partial\s+"newsletter-callout\.html"/,
    "layouts/blog/list.html should render newsletter-callout.html partial",
  );

  assert.match(
    PROJECT_SCSS,
    /\.td-rss-button[\s\S]*?display:\s*none\s*!important;/,
    "Expected _styles_project.scss to hide .td-rss-button",
  );

  const hugoConfig = fs.readFileSync(path.join(ROOT, "hugo.toml"), "utf8");
  assert.match(hugoConfig, /disableKinds\s*=\s*\["RSS"\]/, "Expected hugo.toml to disable RSS output");

  const blogDir = path.join(ROOT, "content/blog");
  for (const dir of fs.readdirSync(blogDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const postPath = path.join(blogDir, dir.name, "index.md");
    if (!fs.existsSync(postPath)) continue;
    const raw = fs.readFileSync(postPath, "utf8");
    assert.doesNotMatch(raw, /newsletter-callout/, `${dir.name}: blog post should not embed newsletter-callout`);
  }
});
