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

    // 2. Persistent Chart.js Injection
    const loadChartJS = () => {
        if (window.Chart) return;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.className = 'bs-lib';
        document.head.appendChild(script);
    };
    loadChartJS();

    // 3. Global Styles
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
    `;
    document.head.appendChild(style);

    // 4. Advanced Math Evaluator
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

    // 5. Chart Builder
    function createChart(canvas, config) {
        if (!window.Chart) {
            setTimeout(() => createChart(canvas, config), 200);
            return;
        }

        const { func, min, max, showX, showY, showFormula } = config;
        const dataPoints = [];
        const labels = [];
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
                datasets: [{
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

    // 6. The Core Engine (Framework-Aware)
    const runGraphEngine = () => {
        // Find every message block from Gemini
        const messageNodes = document.querySelectorAll('ms-cmark-node, .model-prompt-container');
        
        messageNodes.forEach(node => {
            // We search innerText because it's immune to <span> splitting
            const rawText = node.innerText;
            const tokenRegex = /⦗graph:\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^⦘]+)⦘/g;

            if (tokenRegex.test(rawText)) {
                // If the node hasn't changed since we last touched it, skip
                if (node.dataset.bsProcessedText === rawText) return;
                
                console.log("MathGraph: Found token in message. Rendering...");

                // To insert INLINE, we must rebuild the HTML while keeping Gemini's formatting
                let html = node.innerHTML;
                
                // We use a cleaner regex that works on innerHTML but handles potential nested tags inside the token
                const htmlRegex = /⦗graph:.*?⦘/g;
                
                const finalHtml = html.replace(htmlRegex, (match) => {
                    // Extract clean text from the potentially HTML-polluted match
                    const tmp = document.createElement('div');
                    tmp.innerHTML = match;
                    const cleanToken = tmp.innerText;
                    
                    // Parse the parameters from the clean string
                    const params = cleanToken.match(/⦗graph:\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^⦘]+)⦘/);
                    if (!params) return match; // Failed to parse

                    const [_, func, min, max, sx, sy, sf] = params;
                    const gid = 'graph-' + Math.random().toString(36).substr(2, 5);

                    // Create the HTML structure for the graph
                    return `<div class="bs-graph-container" id="${gid}" 
                                 data-func="${func.trim()}" 
                                 data-min="${min}" 
                                 data-max="${max}" 
                                 data-sx="${sx.trim()}" 
                                 data-sy="${sy.trim()}" 
                                 data-sf="${sf.trim()}">
                                <canvas class="bs-canvas-el"></canvas>
                            </div>`;
                });

                // Update the DOM
                node.innerHTML = finalHtml;
                node.dataset.bsProcessedText = node.innerText; // Store clean text to prevent loops

                // Initialize charts
                node.querySelectorAll('.bs-graph-container').forEach(wrapper => {
                    if (wrapper.dataset.initialized) return;
                    wrapper.dataset.initialized = "true";
                    
                    const canvas = wrapper.querySelector('canvas');
                    createChart(canvas, {
                        func: wrapper.dataset.func,
                        min: parseFloat(wrapper.dataset.min),
                        max: parseFloat(wrapper.dataset.max),
                        showX: wrapper.dataset.sx.toLowerCase() === 'true',
                        showY: wrapper.dataset.sy.toLowerCase() === 'true',
                        showFormula: wrapper.dataset.sf.toLowerCase() === 'true'
                    });
                });
            }
        });
    };

    // 7. Initialize with DOM Protection
    const init = () => {
        const observer = new MutationObserver(runGraphEngine);
        observer.observe(document.documentElement, { 
            childList: true, 
            subtree: true,
            characterData: true
        });
        runGraphEngine();
        console.log("BetterStudio: Logic Engine Initialized.");
    };

    // Ensure the page is ready
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

})();