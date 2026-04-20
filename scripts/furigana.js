const Kuroshiro = require("kuroshiro");
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const { JSDOM } = require("jsdom");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

// Jisho.org Cache
const CACHE_FILE = path.join(__dirname, "../.vocab-cache.json");
let vocabCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try { vocabCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")); } catch (e) {}
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(vocabCache, null, 2), "utf-8");
}

// Fetch dictionary data
async function getVocabData(word) {
    if (vocabCache[word]) return vocabCache[word];

    console.log(`[Furigana] Fetching dictionary data for: ${word}`);
    try {
        const res = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; dotfloor-bot/1.0; +https://github.com/dotfloor/dotfloor.github.io)' }
        });
        const json = await res.json();
        
        let result = null;
        if (json.data && json.data.length > 0) {
            const entry = json.data[0];
            const jp = entry.japanese[0];
            const meanings = entry.senses.map(s => s.english_definitions.join("; "));
            
            result = {
                word: jp.word || word,
                reading: jp.reading || "",
                jlpt: entry.jlpt || [],
                is_common: entry.is_common || false,
                meanings: meanings
            };
        }
        
        // Cache even if null to prevent repeatedly fetching missing words
        vocabCache[word] = result;
        saveCache();
        
        // Jisho rate limit friendly delay
        await new Promise(r => setTimeout(r, 200));
        return result;
    } catch (e) {
        console.error(`[Furigana] Error fetching ${word}:`, e);
        return null;
    }
}

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
        
        // Master dictionary to power the Vocab Dashboard
        const masterVocab = {};

        for (const file of files) {
            const filePath = path.resolve(file);
            let html = fs.readFileSync(filePath, "utf-8");
            
            // Fast fail if it doesn't contain a post
            if (!html.includes('class="post-article"')) continue;

            const dom = new JSDOM(html);
            const document = dom.window.document;
            const articles = document.querySelectorAll('.post-article');
            const vocabLists = document.querySelectorAll('.vocab-list');
            
            if (articles.length === 0 && vocabLists.length === 0) continue;
            
            let changed = false;

            // 1. Extract vocab items and placeholder them
            const vocabQueries = [];
            for (let i = 0; i < vocabLists.length; i++) {
                const items = Array.from(vocabLists[i].querySelectorAll("li")).map(li => li.textContent.trim());
                vocabQueries.push(items);
                vocabLists[i].innerHTML = ""; // Clear to prevent Kuroshiro from parsing it
            }

            // 2. Process Main Article Furigana
            for (const article of articles) {
                const contentHTML = article.innerHTML;
                const converted = await kuroshiro.convert(contentHTML, { mode: "furigana", to: "hiragana" });
                
                if (converted !== contentHTML) {
                    article.innerHTML = converted;
                    changed = true;
                }
            }

            // 3. Process Dictionary Vocabularies
            const newVocabLists = document.querySelectorAll('.vocab-list');
            for (let i = 0; i < newVocabLists.length; i++) {
                const items = vocabQueries[i];
                if (!items || items.length === 0) continue;

                let newHtml = "";
                for (const word of items) {
                    const data = await getVocabData(word);
                    if (!data) {
                        newHtml += `<div class="dict-card"><div class="dict-header"><div class="dict-word">${word}</div></div><div class="dict-meanings">No dictionary entry found.</div></div>`;
                        continue;
                    }

                    const jlptSpan = data.jlpt.length > 0 ? `<span class="dict-tag jlpt">${data.jlpt[0].toUpperCase().replace('-', ' ')}</span>` : '';
                    const commonSpan = data.is_common ? `<span class="dict-tag common">Common</span>` : '';
                    
                    const meaningsHtml = data.meanings.map((m, idx) => `<div class="dict-meaning-line"><strong>${idx+1}.</strong> ${m}</div>`).join("");
                    
                    let wordHtml = data.reading ? `<ruby>${data.word}<rt>${data.reading}</rt></ruby>` : data.word;
                    if (data.reading) {
                        const romaji = await kuroshiro.convert(data.reading, { mode: "spaced", to: "romaji" });
                        wordHtml += `<span class="dict-romaji">${romaji}</span>`;
                    }

                    newHtml += `
                    <div class="dict-card">
                        <div class="dict-header">
                            <div class="dict-word">${wordHtml}</div>
                            <div class="dict-tags">${jlptSpan}${commonSpan}</div>
                        </div>
                        <div class="dict-meanings">${meaningsHtml}</div>
                    </div>`;
                }

                newVocabLists[i].innerHTML = newHtml + '<div class="jisho-attribution">辞書データ提供：<a href="https://jisho.org" target="_blank">Jisho.org</a></div>';
                changed = true;
            }

            // Dashboard Extractor: Map words to this particular post
            if (vocabQueries.length > 0) {
                const titleEl = document.querySelector('#post-title');
                const postTitle = titleEl ? titleEl.textContent.trim() : "Untitled Post";
                // URL relative to site root
                let postUrl = '/' + path.relative('_site', file).replace(/\\/g, '/');

                for (const query of vocabQueries) {
                    for (const word of query) {
                        const data = vocabCache[word];
                        if (!data) continue;
                        
                        if (!masterVocab[word]) {
                            let romajiStr = "";
                            if (data.reading) {
                                romajiStr = await kuroshiro.convert(data.reading, { mode: "spaced", to: "romaji" });
                            }
                            masterVocab[word] = { jisho: data, posts: [], romaji: romajiStr };
                        }
                        if (!masterVocab[word].posts.find(p => p.url === postUrl)) {
                            masterVocab[word].posts.push({ title: postTitle, url: postUrl });
                        }
                    }
                }
            }
            
            if (changed) {
                fs.writeFileSync(filePath, dom.serialize(), "utf-8");
                processed++;
            }
        }
        
        // Generate Vocab Dashboard JSON
        if (!fs.existsSync("_site/assets")) {
            fs.mkdirSync("_site/assets", { recursive: true });
        }
        fs.writeFileSync("_site/assets/vocab-data.json", JSON.stringify(masterVocab), "utf-8");
        console.log(`[Furigana] Wrote global vocab data to /assets/vocab-data.json`);
        
        console.log(`[Furigana] Successfully applied furigana to ${processed} files.`);
    } catch (e) {
        console.error("[Furigana] Error updating files:", e);
        process.exit(1);
    }
})();
