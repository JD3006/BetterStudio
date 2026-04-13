// PERFORMANCE OPTIMIZATIONS
let debounceTimer;
window.addEventListener('keydown', handleKey, true);
window.addEventListener('keyup', handleKey, true);
window.addEventListener('keypress', handleKey, true);
window.addEventListener('input', handleInput, true);

function isChatInput(target) {
    return target && (target.getAttribute('formcontrolname') === 'promptText' || target.getAttribute('aria-label') === 'Enter a prompt');
}

function handleKey(e) {
    if (!isChatInput(e.target)) return;
    if (e.key === 'Enter' && !e.shiftKey) { flushInputToGoogle(e.target); return; }
    if (e.isTrusted) { e.stopImmediatePropagation(); e.stopPropagation(); }
}

function handleInput(e) {
    if (!isChatInput(e.target)) return;
    if (e.isTrusted) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { flushInputToGoogle(e.target); }, 400); 
    }
}

function flushInputToGoogle(textarea) {
    const syntheticEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(syntheticEvent);
}

const fastMode = () => {
    document.querySelectorAll('.hover-card, .tooltip, mat-tooltip-component').forEach(el => el.remove());
    const chatArea = document.querySelector('ms-chat-view');
    if (chatArea && !chatArea.dataset.perfApplied) {
        chatArea.style.transform = 'translateZ(0)';
        chatArea.dataset.perfApplied = "true";
    }
};
setInterval(fastMode, 2000);

// END PERFORMANCE OPTIMIZATIONS


// THEMES AND PLUGINS UI INJECT

const themeTag = document.createElement('style');
themeTag.id = 'bs-dynamic-theme';
document.documentElement.appendChild(themeTag);

function injectPluginScript(id) {
    if (document.getElementById(`bs-plug-${id}`)) return;
    const s = document.createElement('script');
    s.id = `bs-plug-${id}`;
    s.src = chrome.runtime.getURL(`plugins/${id}.js`);
    document.documentElement.appendChild(s);
}

async function triggerVignette(callback) {
    const v = document.createElement('div');
    v.id = 'bs-vignette-transition';
    document.body.appendChild(v);
    await new Promise(r => setTimeout(r, 20));
    v.classList.add('active');
    await new Promise(r => setTimeout(r, 600)); // Smooth growth
    if (callback) await callback();
    v.classList.remove('active');
    setTimeout(() => v.remove(), 700); // Smoother fade out
}

async function applyTheme(id, silent = false) {
    const run = async () => {
        if (id === 'default' || !id) {
            themeTag.textContent = '';
        } else {
            const resp = await fetch(chrome.runtime.getURL(`themes/${id}.css`));
            themeTag.textContent = await resp.text();
        }
        chrome.storage.local.set({ activeTheme: id });
    };
    if (silent) run();
    else triggerVignette(run);
}

async function openBSModal(mode) {
    if (document.getElementById('bs-modal-overlay')) return;

    const [tResp, pResp, storage] = await Promise.all([
        fetch(chrome.runtime.getURL('themes.json')),
        fetch(chrome.runtime.getURL('extensions.json')),
        chrome.storage.local.get(['activeTheme', 'activePlugins'])
    ]);
    
    const themes = await tResp.json();
    const plugins = await pResp.json();
    
    // TRACK INITIAL STATE
    const initialActiveTheme = storage.activeTheme || 'default';
    const initialActivePlugins = JSON.stringify([...(storage.activePlugins || [])].sort());
    
    let currentActivePlugins = storage.activePlugins || [];
    let currentActiveTheme = storage.activeTheme || 'default';
    
    const data = mode === 'themes' ? themes : plugins;

    const overlay = document.createElement('div');
    overlay.id = 'bs-modal-overlay';
    overlay.innerHTML = `
        <div id="bs-modal">
            <div class="bs-modal-left">
                <div class="bs-modal-title">${mode === 'themes' ? 'Themes' : 'Plugins'}</div>
                <div class="bs-search-wrap">
                    <span class="material-symbols-outlined">search</span>
                    <input type="text" id="bs-search" placeholder="Search ${mode}...">
                </div>
                <div class="bs-list" id="bs-modal-list"></div>
            </div>
            <div class="bs-modal-right">
                <div id="bs-details-box" style="display:none">
                    <div id="bs-preview-pane"></div>
                    <div class="bs-text-content">
                        <h1 id="bs-det-name"></h1>
                        <div id="bs-det-author"></div>
                        <p id="bs-det-desc"></p>
                    </div>
                    <div class="bs-modal-actions">
                        <button id="bs-close-btn">Close</button>
                        <button id="bs-action-btn"></button>
                    </div>
                </div>
                <div id="bs-empty">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    <h2>Customize Your Studio</h2>
                    <p>Select a ${mode === 'themes' ? 'theme' : 'plugin'} from the list to see more info.</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const renderList = (filter = "") => {
        const listContainer = document.getElementById('bs-modal-list');
        let items = mode === 'themes' ? [{id:'default', name:'Default Studio', author:'Google', version:'1.0'}] : [];
        items = [...items, ...data].filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));

        listContainer.innerHTML = items.map(item => {
            const isActive = mode === 'themes' ? currentActiveTheme === item.id : currentActivePlugins.includes(item.id);
            return `<div class="bs-list-item ${isActive?'is-active':''} ${item.id === currentId?'selected':''}" data-id="${item.id}">
                <div class="bs-item-meta">
                    <div class="bs-name">${item.name}</div>
                    <div class="bs-ver">v${item.version || '1.0'}</div>
                </div>
                ${isActive ? '<span class="material-symbols-outlined bs-tick">check_circle</span>' : ''}
            </div>`;
        }).join('');

        listContainer.querySelectorAll('.bs-list-item').forEach(el => el.onclick = () => updatePreview(el.dataset.id));
    };

    let currentId = null;
    const updatePreview = (id) => {
        currentId = id;
        const item = (mode === 'themes' && id === 'default') 
            ? { name: "Default Studio", author: "Google", version: "1.0", desc: "The original AI Studio look.", colors: ["#202124", "#3c4043", "#ffffff"] }
            : data.find(x => x.id === id);
        
        if (!item) return;

        document.getElementById('bs-details-box').style.display = 'flex';
        document.getElementById('bs-empty').style.display = 'none';
        document.getElementById('bs-det-name').innerText = item.name;
        document.getElementById('bs-det-author').innerHTML = `Created by <span>${item.author}</span> • Version ${item.version || '1.0'}`;
        document.getElementById('bs-det-desc').innerText = item.desc;
        
        const previewArea = document.getElementById('bs-preview-pane');
        const actionBtn = document.getElementById('bs-action-btn');

        if (mode === 'themes') {
            previewArea.innerHTML = `<div class="bs-color-preview">${item.colors.map(c => `<div style="background:${c}"></div>`).join('')}</div>`;
            actionBtn.innerText = "Apply Theme";
            actionBtn.className = "";
        } else {
            previewArea.innerHTML = '';
            const isActive = currentActivePlugins.includes(id);
            actionBtn.innerText = isActive ? "Disable Plugin" : "Enable Plugin";
            actionBtn.className = isActive ? "danger" : "success";
        }

        renderList(document.getElementById('bs-search').value);
    };

    const handleDismiss = () => {
        // Only trigger transition/reload if state actually changed
        const finalPluginState = JSON.stringify([...currentActivePlugins].sort());
        const changed = (mode === 'themes' && currentActiveTheme !== initialActiveTheme) || 
                        (mode === 'plugins' && finalPluginState !== initialActivePlugins);

        const closeUI = () => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 300); };

        if (!changed) {
            closeUI();
        } else {
            triggerVignette(async () => {
                closeUI();
                if (mode === 'plugins') location.reload();
            });
        }
    };

    document.getElementById('bs-search').oninput = (e) => renderList(e.target.value);
    document.getElementById('bs-close-btn').onclick = handleDismiss;
    
    document.getElementById('bs-action-btn').onclick = async () => {
        if (mode === 'themes') {
            currentActiveTheme = currentId;
            // Close window during vignette blackout
            triggerVignette(async () => {
                overlay.remove();
                await applyTheme(currentId, true);
            });
        } else {
            const isActive = currentActivePlugins.includes(currentId);
            if (!isActive) currentActivePlugins.push(currentId);
            else currentActivePlugins = currentActivePlugins.filter(x => x !== currentId);
            chrome.storage.local.set({ activePlugins: currentActivePlugins });
            updatePreview(currentId);
        }
    };
    
    overlay.onclick = (e) => { if(e.target === overlay) handleDismiss(); };
    renderList();
}

function injectUI() {
    const searchBtn = document.querySelector('.command-palette-button');
    if (!searchBtn || document.getElementById('bs-theme-btn')) return;
    const ngId = Array.from(searchBtn.attributes).find(a => a.name.startsWith('_ngcontent'))?.name || "";
    const createBtn = (id, icon, label, fn) => {
        const btn = document.createElement('button');
        btn.id = id;
        Array.from(searchBtn.attributes).forEach(attr => btn.setAttribute(attr.name, attr.value));
        btn.innerHTML = `<span ${ngId} class="material-symbols-outlined notranslate ms-button-icon-symbol">${icon}</span><span ${ngId} class="label">${label}</span>`;
        btn.onclick = (e) => { e.preventDefault(); fn(); };
        btn.style.marginBottom = "4px";
        return btn;
    };
    searchBtn.parentNode.insertBefore(createBtn('bs-theme-btn', 'palette', 'Themes', () => openBSModal('themes')), searchBtn);
    searchBtn.parentNode.insertBefore(createBtn('bs-plug-btn', 'extension', 'Plugins', () => openBSModal('plugins')), document.getElementById('bs-theme-btn'));
}

chrome.storage.local.get(['activeTheme', 'activePlugins'], (res) => {
    if (res.activeTheme) applyTheme(res.activeTheme, true);
    if (res.activePlugins) res.activePlugins.forEach(id => injectPluginScript(id));
});

const observer = new MutationObserver(injectUI);
observer.observe(document.documentElement, { childList: true, subtree: true });