(function() {
    // 1. Trusted Types & Security Bypass
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        if (!window.trustedTypes.defaultPolicy) {
            window.trustedTypes.createPolicy('default', {
                createHTML: (s) => s,
                createScriptURL: (s) => s,
                createScript: (s) => s,
            });
        }
    }

    // --- TOOL REGISTRY CONFIGURATION ---
    // To add a new tool, just add an object to this array.
    const TOOLS = [
        {
            id: 'graphing-engine',
            name: 'Graphing Engine',
            stateKey: 'bsGraphEngineEnabled', // Global variable used for toggle
            systemPrompt: `Graphing Engine Enabled: You can now embed interactive graphs directly in your response.\nSyntax: ⦗graph: function, min_x, max_x, show_axis_x, show_axis_y, show_formula⦘\nParameters:\nfunction: Standard JS math (e.g., sin(x), x^2, sqrt(x))\nmin_x: Starting number.\nmax_x: Ending number.\nshow_axis_x: true or false.\nshow_axis_y: true or false.\nshow_formula: true or false (shows the legend at the top).\nExample Usage:\n"Here is the sine wave: ⦗graph: sin(x), -6.28, 6.28, true, true, true⦘. As you can see..."\n\n`,
            tokenRegex: /⦗graph:\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^⦘]+)⦘/g,
            render: (container, match) => {
                const [fullMatch, func, min, max, sx, sy, sf] = match;
                container.innerHTML = '<canvas class="bs-canvas-el"></canvas>';
                const canvas = container.querySelector('canvas');
                createChart(canvas, {
                    func: func.trim(),
                    min: parseFloat(min),
                    max: parseFloat(max),
                    showX: sx.trim().toLowerCase() === 'true',
                    showY: sy.trim().toLowerCase() === 'true',
                    showFormula: sf.trim().toLowerCase() === 'true'
                });
            }
        },
        {
    id: 'flashcard-engine',
    name: 'Flashcard System',
    stateKey: 'bsFlashcardEnabled',
    systemPrompt: `Flashcard Engine Enabled: You can create interactive study sets.\nSyntax: ⦗flashcards: [["Question 1", "Answer 1"], ["Question 2", "Answer 2"]]⦘\nRules: Provide an array of [Front, Back] string pairs. User can navigate with arrows. Marking a card with ✓ removes it from the next round. Marking with ✕ keeps it in the rotation until mastered. Example: ⦗flashcards:[["What is the mathematical constant defined as the ratio of a circle's circumference to its diameter?", "Pi (π)"]]⦘ \n\n`,
    tokenRegex: /⦗flashcards:\s*(\[[\s\S]*?\])\s*⦘/g,
    render: (container, match) => {
        let allCards = [];
        try {
            allCards = JSON.parse(match[1]);
        } catch (e) {
            container.innerText = "Error parsing flashcards.";
            return;
        }

        let masteredIds = new Set();
        let currentRoundIndices = allCards.map((_, i) => i);
        let currentIndex = 0;
        let roundResults = {}; // Stores temporary ✓ or ✕ for the current round

        const updateUI = () => {
            // Check if entire session is complete
            if (masteredIds.size === allCards.length) {
                container.innerHTML = `
                    <div class="bs-fc-complete">
                        <div class="bs-fc-icon">✨</div>
                        <h3>Set Mastered!</h3>
                        <p style="color: #888; margin-bottom: 20px;">You've learned all ${allCards.length} cards.</p>
                        <button class="bs-fc-btn m3-tonal" id="fc-restart-all">Restart Full Set</button>
                    </div>`;
                container.querySelector('#fc-restart-all').onclick = () => {
                    masteredIds.clear();
                    currentRoundIndices = allCards.map((_, i) => i);
                    currentIndex = 0;
                    roundResults = {};
                    updateUI();
                };
                return;
            }

            // Handle Round Completion Logic
            const isEndOfRound = currentIndex >= currentRoundIndices.length;
            if (isEndOfRound) {
                const toRetry = currentRoundIndices.filter(idx => roundResults[idx] !== 'tick');
                container.innerHTML = `
                    <div class="bs-fc-complete">
                        <h3>Round Complete</h3>
                        <p style="color: #888; margin-bottom: 20px;">Remaining to learn: ${toRetry.length}</p>
                        <button class="bs-fc-btn m3-tonal" id="fc-next-round">Start Next Round</button>
                    </div>`;
                container.querySelector('#fc-next-round').onclick = () => {
                    currentRoundIndices = toRetry;
                    currentIndex = 0;
                    roundResults = {};
                    updateUI();
                };
                return;
            }

            const originalIdx = currentRoundIndices[currentIndex];
            const currentCard = allCards[originalIdx];
            const status = roundResults[originalIdx]; // 'tick' or 'cross'

            container.innerHTML = `
                <div class="bs-fc-header">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span>Card ${currentIndex + 1} of ${currentRoundIndices.length} <span style="opacity: 0.5; margin-left: 8px;">(${allCards.length - masteredIds.size} remaining in set)</span></span>
                            <button id="fc-reset-btn" style="background:none; border:none; color:#4285f4; cursor:pointer; font-size:11px; font-weight:bold; text-transform:uppercase;">Reset Set</button>
                        </div>
                        <div class="bs-fc-progress"><div class="bs-fc-bar" style="width: ${((currentIndex + 1) / currentRoundIndices.length) * 100}%"></div></div>
                    </div>
                </div>
                <div class="bs-fc-scene">
                    <div class="bs-fc-card">
                        <div class="bs-fc-face bs-fc-front">${currentCard[0]}</div>
                        <div class="bs-fc-face bs-fc-back">${currentCard[1]}</div>
                    </div>
                </div>
                <div class="bs-fc-controls">
                    <button class="bs-fc-btn m3-outlined nav-arrow" id="fc-prev" ${currentIndex === 0 ? 'disabled' : ''}>←</button>
                    
                    <div class="bs-fc-actions">
                        <button class="bs-fc-btn ${status === 'cross' ? 'm3-error' : 'm3-outlined'}" id="fc-cross" style="width: 50px;">✕</button>
                        <button class="bs-fc-btn ${status === 'tick' ? 'm3-success' : 'm3-outlined'}" id="fc-tick" style="width: 50px;">✓</button>
                    </div>

                    <button class="bs-fc-btn m3-outlined nav-arrow" id="fc-next">→</button>
                </div>
            `;

            // Interaction Listeners
            const cardEl = container.querySelector('.bs-fc-card');
            cardEl.onclick = () => cardEl.classList.toggle('is-flipped');

            container.querySelector('#fc-reset-btn').onclick = () => {
                masteredIds.clear();
                currentRoundIndices = allCards.map((_, i) => i);
                currentIndex = 0;
                roundResults = {};
                updateUI();
            };

            container.querySelector('#fc-tick').onclick = (e) => {
                e.stopPropagation();
                roundResults[originalIdx] = 'tick';
                masteredIds.add(originalIdx);
                setTimeout(() => { currentIndex++; updateUI(); }, 150);
            };

            container.querySelector('#fc-cross').onclick = (e) => {
                e.stopPropagation();
                roundResults[originalIdx] = 'cross';
                masteredIds.delete(originalIdx);
                setTimeout(() => { currentIndex++; updateUI(); }, 150);
            };

            container.querySelector('#fc-prev').onclick = () => {
                if (currentIndex > 0) { currentIndex--; updateUI(); }
            };

            container.querySelector('#fc-next').onclick = () => {
                currentIndex++; updateUI();
            };
        };

        updateUI();
    }
}
    ];

    // Global State Initialization
    TOOLS.forEach(tool => {
        if (typeof window[tool.stateKey] === 'undefined') {
            window[tool.stateKey] = false;
        }
    });

    // 2. Invisible Prompt Injection via XHR Interceptor
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        // Collect all prompts from enabled tools
        const activePrompts = TOOLS
            .filter(tool => window[tool.stateKey])
            .map(tool => tool.systemPrompt)
            .join("\n");

        if (activePrompts && this._url && this._url.includes('GenerateContent')) {
            try {
                if (typeof body === 'string' && body.startsWith('[')) {
                    let parsed = JSON.parse(body);
                    if (Array.isArray(parsed)) {
                        while (parsed.length <= 5) { parsed.push(null); }

                        if (parsed[5] === null) {
                            parsed[5] = [[[null, activePrompts]], "user"];
                        } else if (Array.isArray(parsed[5]) && Array.isArray(parsed[5][0]) && Array.isArray(parsed[5][0][0])) {
                            let existing = parsed[5][0][0][1] || "";
                            if (typeof existing === 'string') {
                                // Check if any part of the active prompts is already there to avoid double injection
                                if (!existing.includes("Graphing Engine Enabled")) {
                                    parsed[5][0][0][1] = activePrompts + existing;
                                }
                            }
                        }
                        body = JSON.stringify(parsed);
                    }
                }
            } catch(e) {
                console.error('BetterStudio: Failed to inject prompt into XHR', e);
            }
        }
        return originalSend.call(this, body);
    };
    // 3. UI Builder (Native Integration)
    const buildUI = () => {
        const toolsGroup = document.evaluate(
            "//p[text()='Tools']/ancestor::div[contains(@class, 'field-group')]", 
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        
        if (!toolsGroup) return;

        TOOLS.forEach((tool, index) => {
            const containerId = `bs-tool-container-${tool.id}`;
            if (document.getElementById(containerId)) return;

            const existingTool = toolsGroup.querySelector('.settings-tool');
            if (!existingTool) return;

            const container = document.createElement('div');
            container.id = containerId;
            
            
            // Only apply the separation line and margin to the first custom tool
            if (index === 0) {
                container.style.cssText = "border-top: 1px solid var(--color-v3-outline-var); padding-top: 12px; margin-top: 12px;";
            }
            container.style.marginBottom = "14px"; 
            const clonedTool = existingTool.cloneNode(true);
            const titleEl = clonedTool.querySelector('.item-description-title');
            if (titleEl) titleEl.innerText = tool.name;
            

            
            clonedTool.querySelectorAll('button[ms-button]:not([role="switch"])').forEach(b => b.remove());
            clonedTool.querySelectorAll('.search-source').forEach(s => s.remove());

            const toggleBtn = clonedTool.querySelector('button[role="switch"]');
            if (toggleBtn) {
                const updateToggleState = () => {
                    const isEnabled = window[tool.stateKey];
                    toggleBtn.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
                    if (isEnabled) {
                        toggleBtn.classList.add('mdc-switch--selected', 'mdc-switch--checked');
                        toggleBtn.classList.remove('mdc-switch--unselected', 'mdc-switch--disabled');
                    } else {
                        toggleBtn.classList.remove('mdc-switch--selected', 'mdc-switch--checked');
                        toggleBtn.classList.add('mdc-switch--unselected');
                    }
                };
                
                updateToggleState();

                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window[tool.stateKey] = !window[tool.stateKey];
                    updateToggleState();
                });
            }

            container.appendChild(clonedTool);
            toolsGroup.appendChild(container);
        });
    };
    // 4. Persistent Chart.js Injection
    const loadChartJS = () => {
        if (window.Chart) return;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.className = 'bs-lib';
        document.head.appendChild(script);
    };
    loadChartJS();

    // 5. Global Styles
    const style = document.createElement('style');
    style.textContent = `
        .bs-graph-container {
            display: block !important;
            background: #050505 !important;
            border: 1px solid #333 !important;
            border-radius: 12px !important;
            margin: 15px 0 !important;
            padding: 15px !important;
            width: 100% !important;
            max-width: 600px !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
        }
        canvas.bs-canvas-el {
            width: 100% !important;
            height: 320px !important;
            display: block !important;
        }
            /* Flashcard Specific Styling */
.bs-fc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; color: #aaa; font-size: 12px; }
.bs-fc-progress { flex: 1; height: 4px; background: #333; margin-left: 12px; border-radius: 2px; overflow: hidden; }
.bs-fc-bar { height: 100%; background: #4285f4; transition: width 0.3s ease; }

.bs-fc-scene { width: 100%; height: 200px; perspective: 1000px; cursor: pointer; }
.bs-fc-card { width: 100%; height: 100%; position: relative; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
.bs-fc-card.is-flipped { transform: rotateY(180deg); }

.bs-fc-face {
    position: absolute; width: 100%; height: 100%; backface-visibility: hidden;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    text-align: center; border-radius: 16px; font-size: 18px; line-height: 1.4;
    background: var(--color-v3-surface-container-low, #1e1e1e);
    border: 1px solid var(--color-v3-outline-var, #333);
    color: #fff;
}
.bs-fc-back { transform: rotateY(180deg); background: #1a1c1e; color: #c4c7c5; }

.bs-fc-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; gap: 12px; }
.bs-fc-actions { display: flex; gap: 12px; }

/* M3 Button Variants */
.bs-fc-btn {
    border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer;
    font-weight: 500; font-family: 'Inter', sans-serif; transition: all 0.2s;
}
.m3-tonal { background: #3b4858; color: #d6e3f7; }
.m3-outlined { background: transparent; border: 1px solid #8e918f; color: #c4c7c5; }
.m3-success { background: #2d352d; color: #b4eeb4; border: 1px solid #455445; }
.m3-error { background: #372121; color: #f2b8b5; border: 1px solid #603f3f; }
.bs-fc-btn:hover { filter: brightness(1.2); }

.bs-fc-complete { text-align: center; padding: 40px 0; }
.bs-fc-icon { font-size: 48px; margin-bottom: 12px; }
    `;
    document.head.appendChild(style);

    // 6. Advanced Math Evaluator (Specific to Graphing Tool)
    function evaluateMath(func, x) {
        try {
            const safeFunc = func.toLowerCase()
                .replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos')
                .replace(/tan/g, 'Math.tan').replace(/sqrt/g, 'Math.sqrt')
                .replace(/abs/g, 'Math.abs').replace(/pi/g, 'Math.PI')
                .replace(/log/g, 'Math.log').replace(/exp/g, 'Math.exp')
                .replace(/\^/g, '**');
            return new Function('x', `"use strict"; return (${safeFunc})`)(x);
        } catch (e) { return NaN; }
    }

    // 7. Chart Builder (Specific to Graphing Tool)
    function createChart(canvas, config) {
        if (!window.Chart) {
            setTimeout(() => createChart(canvas, config), 200);
            return;
        }
        const { func, min, max, showX, showY, showFormula } = config;
        const dataPoints = [];
        const labels =[];
        const steps = 150;
        for (let i = 0; i <= steps; i++) {
            const x = min + (i * (max - min) / steps);
            labels.push(x.toFixed(2));
            dataPoints.push(evaluateMath(func, x));
        }
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets:[{
                    label: showFormula ? `f(x) = ${func}` : '',
                    data: dataPoints,
                    borderColor: '#4285f4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                scales: {
                    x: { display: showX, grid: { color: '#222' }, ticks: { color: '#888', maxTicksLimit: 10 } },
                    y: { display: showY, grid: { color: '#222' }, ticks: { color: '#888' } }
                },
                plugins: { 
                    legend: { 
                        display: showFormula,
                        labels: { color: '#fff', font: { family: 'Inter', size: 14 } }
                    },
                    tooltip: { enabled: true, mode: 'index', intersect: false }
                }
            }
        });
    }

    // 8. The Core Engine (Modularized)
    const runToolEngine = () => {
        buildUI();
        const messageNodes = document.querySelectorAll('ms-cmark-node, .model-prompt-container');

        messageNodes.forEach(node => {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
            let textNode;
            const tasks = [];

            while (textNode = walker.nextNode()) {
                if (textNode.parentElement && textNode.parentElement.classList.contains('bs-hidden-token')) continue;
                
                // Check all registered tools
                TOOLS.forEach(tool => {
                    let match;
                    tool.tokenRegex.lastIndex = 0; 
                    if ((match = tool.tokenRegex.exec(textNode.nodeValue)) !== null) {
                        tasks.push({ node: textNode, match, tool });
                    }
                });
            }

            tasks.forEach(({ node: tNode, match, tool }) => {
                const fullMatch = match[0];
                const parent = tNode.parentNode;
                if (!parent) return;

                const tokenNode = tNode.splitText(match.index);
                const afterNode = tokenNode.splitText(fullMatch.length);

                const hideSpan = document.createElement('span');
                hideSpan.className = 'bs-hidden-token';
                hideSpan.style.display = 'none';
                
                parent.replaceChild(hideSpan, tokenNode);
                hideSpan.appendChild(tokenNode);

                const wrapper = document.createElement('div');
                wrapper.className = 'bs-graph-container'; // Keep class for styling consistency
                wrapper.dataset.initialized = "true";
                
                hideSpan.after(wrapper);
                
                // Call the specific tool's render function
                tool.render(wrapper, match);
            });
        });
    };

    // 9. Initialize
    const init = () => {
        const observer = new MutationObserver(runToolEngine);
        observer.observe(document.documentElement, { 
            childList: true, 
            subtree: true,
            characterData: true
        });
        runToolEngine();
        console.log("BetterStudio: Modular Engine Initialized.");
    };

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();