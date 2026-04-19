const Kuroshiro = require("kuroshiro");
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const { JSDOM } = require("jsdom");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

(async () => {
    try {
        console.log("[Furigana] Initializing Kuroshiro with Kuromoji Analyzer...");
        let KuroshiroClass = Kuroshiro;
        if (typeof KuroshiroClass !== 'function' && KuroshiroClass.default) {
            KuroshiroClass = KuroshiroClass.default;
        }
        const kuroshiro = new KuroshiroClass();
        await kuroshiro.init(new KuromojiAnalyzer());
        console.log("[Furigana] Kuroshiro ready. Scanning for HTML files...");

        // Find all HTML files in the _site directory
        const files = glob.sync("_site/**/*.html");
        let processed = 0;

        for (const file of files) {
            const filePath = path.resolve(file);
            let html = fs.readFileSync(filePath, "utf-8");
            
            // Fast fail if it doesn't contain a post
            if (!html.includes('class="post-article"')) continue;

            const dom = new JSDOM(html);
            const document = dom.window.document;
            const articles = document.querySelectorAll('.post-article');
            
            if (articles.length === 0) continue;
            
            let changed = false;
            for (const article of articles) {
                // Ignore if it somehow already has ruby tags (though Jekyll overwrites _site usually)
                if (article.innerHTML.includes('<ruby>')) continue;

                const contentHTML = article.innerHTML;
                
                // Convert text nodes while ignoring HTML
                const converted = await kuroshiro.convert(contentHTML, { mode: "furigana", to: "hiragana" });
                
                if (converted !== contentHTML) {
                    article.innerHTML = converted;
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(filePath, dom.serialize(), "utf-8");
                processed++;
            }
        }
        console.log(`[Furigana] Successfully applied furigana to ${processed} files.`);
    } catch (e) {
        console.error("[Furigana] Error updating files:", e);
        process.exit(1);
    }
})();
