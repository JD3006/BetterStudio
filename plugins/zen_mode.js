(function() {
    const style = document.createElement('style');
    style.id = 'bs-ext-zen-css';
    style.textContent = `
        ms-right-side-panel { display: none !important; }
        .chat-view-container { max-width: 800px !important; margin: 0 auto !important; }
        footer { max-width: 800px !important; margin: 0 auto !important; left: 0 !important; right: 0 !important; }
        .prompt-box-container { border-radius: 20px !important; }
    `;
    document.documentElement.appendChild(style);
    console.log("BetterStudio: Zen Mode Loaded");
})();