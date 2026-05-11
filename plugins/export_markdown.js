(function() {
    const btnId = 'bs-ext-export-md';
    if (document.getElementById(btnId)) return;

    // Use the policy from your injector if global, or a local shim
    const policy = window.bsPolicy || { createHTML: (s) => s };

    async function deepScrapeAndDownload() {
        const scroller = document.querySelector('ms-autoscroll-container');
        if (!scroller) {
            alert("Scroll container not found.");
            return;
        }

        const exportBtn = document.getElementById(btnId);
        const originalContent = exportBtn.textContent;
        exportBtn.textContent = "⌛ Loading...";
        exportBtn.style.opacity = "0.5";

        const capturedTurns = new Map(); // Use Map to prevent duplicates during scroll
        const originalScrollTop = scroller.scrollTop;
        
        // 1. Jump to top to start the sequence
        scroller.scrollTop = 0;
        await new Promise(r => setTimeout(r, 400));

        let lastScrollHeight = 0;
        let sameHeightCount = 0;

        // 2. Step-scroll down to trigger virtualization rendering
        while (sameHeightCount < 3) {
            const turns = document.querySelectorAll('ms-chat-turn');
            
            turns.forEach(turn => {
                const id = turn.id;
                // Only scrape if we haven't fully captured this turn yet
                // Check if .turn-content actually has children (meaning it's loaded)
                const contentArea = turn.querySelector('.turn-content');
                if (id && contentArea && contentArea.children.length > 0 && !capturedTurns.has(id)) {
                    capturedTurns.set(id, processTurn(turn));
                }
            });

            scroller.scrollTop += 600; // Scroll in chunks
            await new Promise(r => setTimeout(r, 150)); // Wait for Angular to render

            if (scroller.scrollTop === lastScrollHeight) {
                sameHeightCount++;
            } else {
                lastScrollHeight = scroller.scrollTop;
                sameHeightCount = 0;
            }
            
            // UI feedback
            exportBtn.textContent = `⌛ ${capturedTurns.size} msgs...`;
        }

        // 3. Compile Markdown
        let md = "# Google AI Studio Export\n\n";
        Array.from(capturedTurns.values()).forEach(content => {
            md += content + "\n---\n\n";
        });

        // 4. Download
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deep-export-${new Date().getTime()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 5. Cleanup
        scroller.scrollTop = originalScrollTop;
        exportBtn.textContent = originalContent;
        exportBtn.style.opacity = "1";
    }

    function processTurn(turn) {
        const container = turn.querySelector('.chat-turn-container');
        const isUser = container?.classList.contains('user');
        const roleLabel = isUser ? "### USER" : "### MODEL";
        let turnMd = `${roleLabel}\n\n`;

        const contentArea = turn.querySelector('.turn-content');
        
        // Extract Thoughts
        contentArea.querySelectorAll('ms-thought-chunk').forEach(thought => {
            const text = thought.innerText.replace(/Thoughts/g, '').trim();
            if (text) turnMd += `> **Thinking:**\n> ${text.replace(/\n/g, '\n> ')}\n\n`;
        });

        // Extract Text and Code
        // We iterate specifically to keep the order of text -> code -> text
        contentArea.querySelectorAll('ms-text-chunk, ms-code-block').forEach(chunk => {
            if (chunk.tagName.toLowerCase() === 'ms-code-block') {
                const lang = chunk.getAttribute('data-test-language') || '';
                const code = chunk.querySelector('code')?.innerText || '';
                turnMd += `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
            } else {
                turnMd += chunk.innerText.trim() + "\n\n";
            }
        });

        // Final cleanup of UI icon text
        return turnMd.replace(/edit|more_vert|expand_less|expand_more|thumb_up|thumb_down/g, '').trim();
    }

    const interval = setInterval(() => {
        const toolbar = document.querySelector('.toolbar-right');
        if (toolbar && !document.getElementById(btnId)) {
            clearInterval(interval);
            const btn = document.createElement('button');
            btn.id = btnId;
            btn.title = "Deep Export (Scrolls to load all data)";
            btn.style.cssText = "background:none; border:1px solid #444; color:white; cursor:pointer; margin-right:8px; border-radius:4px; display:flex; padding:6px; align-items:center; font-size:12px; font-family:Inter,sans-serif;";
            
            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined';
            icon.textContent = 'database'; // Different icon to indicate "Deep" scrape
            icon.style.fontSize = "18px";
            icon.style.marginRight = "4px";
            
            const label = document.createElement('span');
            label.textContent = "Export";

            btn.appendChild(icon);
            btn.appendChild(label);
            btn.onclick = (e) => {
                e.preventDefault();
                deepScrapeAndDownload();
            };
            
            toolbar.prepend(btn);
        }
    }, 1000);
})();