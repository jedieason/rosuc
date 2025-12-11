document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const editor = document.getElementById('editor');
    const formatBtns = document.querySelectorAll('.format-btn');

    // Chat Elements
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatInputArea = document.querySelector('.chat-input-area');

    // Sidebar Mode Elements
    const modeChatBtn = document.getElementById('mode-chat');
    const modeEditorBtn = document.getElementById('mode-editor');

    // File Explorer Elements
    const fileList = document.getElementById('file-list');
    const newFileBtn = document.getElementById('new-file-btn');

    // Sidebar Resize/Collapse Elements
    const sidebarLeft = document.getElementById('sidebar-left');
    const sidebarRight = document.getElementById('sidebar-right');
    const leftResizer = document.getElementById('left-resizer');
    const rightResizer = document.getElementById('right-resizer');
    const toggleLeftSidebarBtn = document.getElementById('toggle-left-sidebar');
    const toggleRightSidebarBtn = document.getElementById('toggle-right-sidebar');

    // File Modal Elements
    const fileModal = document.getElementById('file-modal');
    const fileModalTitle = document.getElementById('file-modal-title');
    const fileNameInput = document.getElementById('file-name-input');
    const cancelFileBtn = document.getElementById('cancel-file-btn');
    const confirmFileBtn = document.getElementById('confirm-file-btn');

    // Settings Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiKeyInput = document.getElementById('api-key-input');

    // Inline Edit Elements
    const inlineEditModal = document.getElementById('inline-edit-modal');
    const inlineInput = document.getElementById('inline-input');
    const inlineInputWrapper = document.querySelector('.inline-input-wrapper');

    // New Toolbar Elements
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const printBtn = document.getElementById('print-btn');
    const searchBtn = document.getElementById('search-btn');
    const insertImageBtn = document.getElementById('insert-image-btn');
    const imageUpload = document.getElementById('image-upload');
    const fontSelect = document.getElementById('font-family-select');

    // Search Elements
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');
    const searchCloseBtn = document.getElementById('search-close-btn');



    // State
    let apiKeys = [];
    try {
        const stored = localStorage.getItem('gemini_api_keys');
        if (stored) {
            apiKeys = JSON.parse(stored);
        } else {
            // Migration
            const oldKey = localStorage.getItem('gemini_api_key');
            if (oldKey) apiKeys = [oldKey];
        }
    } catch (e) {
        apiKeys = [];
    }

    let currentModel = 'gemini-2.5-flash-lite';
    let currentSelectionRange = null;
    let sidebarMode = 'chat'; // 'chat' or 'editor'
    let fileModalMode = 'create'; // 'create' or 'rename'
    let fileToRenameId = null;
    let activeHighlightSpan = null;

    // Track Selection
    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            // Only update if the selection is within the editor
            if (editor.contains(range.commonAncestorContainer)) {
                currentSelectionRange = range;
            }
        }
    });

    // File System State
    let files = [
        { id: 'file-1', name: 'Draft 1', content: '<h1>Untitled Draft</h1><p>Start writing here...</p>' }
    ];
    let activeFileId = 'file-1';

    // --- Helpers: API Key Masking ---
    const maskKey = (k) => {
        if (!k || k.length <= 6) return '*'.repeat(Math.max(k.length, 6));
        const head = k.slice(0, 3);
        const tail = k.slice(-3);
        const body = '•'.repeat(Math.max(k.length - 6, 6));
        return `${head}${body}${tail}`;
    };
    const maskKeysForDisplay = (keys) => keys.map(maskKey).join('\n');

    // --- Initialization ---
    if (apiKeys.length > 0) {
        apiKeyInput.value = maskKeysForDisplay(apiKeys);
    }
    renderFileList();

    // --- Sidebar Resize + Collapse Logic ---
    const SIDEBAR_MIN = 180;
    const SIDEBAR_MAX = 520;
    const SIDEBAR_COLLAPSED = 52;

    const getNum = (k, fallback) => {
        const v = parseInt(localStorage.getItem(k) || '', 10);
        return Number.isFinite(v) ? v : fallback;
    };

    const setSidebarWidth = (side, width) => {
        const clamped = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width));
        if (side === 'left' && sidebarLeft) {
            sidebarLeft.style.width = `${clamped}px`;
            localStorage.setItem('sidebar_left_width', String(clamped));
        }
        if (side === 'right' && sidebarRight) {
            sidebarRight.style.width = `${clamped}px`;
            localStorage.setItem('sidebar_right_width', String(clamped));
        }
    };

    const setCollapsed = (side, collapsed) => {
        if (side === 'left' && sidebarLeft) {
            sidebarLeft.classList.toggle('collapsed', collapsed);
            localStorage.setItem('sidebar_left_collapsed', collapsed ? '1' : '0');
            if (collapsed) {
                sidebarLeft.style.width = `${SIDEBAR_COLLAPSED}px`;
            } else {
                setSidebarWidth('left', getNum('sidebar_left_width', 260));
            }
        }
        if (side === 'right' && sidebarRight) {
            sidebarRight.classList.toggle('collapsed', collapsed);
            localStorage.setItem('sidebar_right_collapsed', collapsed ? '1' : '0');
            if (collapsed) {
                sidebarRight.style.width = `${SIDEBAR_COLLAPSED}px`;
            } else {
                setSidebarWidth('right', getNum('sidebar_right_width', 320));
            }
        }
        lucide.createIcons();
    };

    // Restore widths + collapsed state
    if (sidebarLeft) {
        const w = getNum('sidebar_left_width', 260);
        sidebarLeft.style.width = `${w}px`;
        const collapsed = localStorage.getItem('sidebar_left_collapsed') === '1';
        if (collapsed) setCollapsed('left', true);
    }
    if (sidebarRight) {
        const w = getNum('sidebar_right_width', 320);
        sidebarRight.style.width = `${w}px`;
        const collapsed = localStorage.getItem('sidebar_right_collapsed') === '1';
        if (collapsed) setCollapsed('right', true);
    }

    // Collapse toggles
    if (toggleLeftSidebarBtn) {
        toggleLeftSidebarBtn.addEventListener('click', () => {
            const next = !sidebarLeft.classList.contains('collapsed');
            // store last expanded width
            if (!next) localStorage.setItem('sidebar_left_width', String(sidebarLeft.getBoundingClientRect().width));
            setCollapsed('left', next);
        });
    }
    if (toggleRightSidebarBtn) {
        toggleRightSidebarBtn.addEventListener('click', () => {
            const next = !sidebarRight.classList.contains('collapsed');
            if (!next) localStorage.setItem('sidebar_right_width', String(sidebarRight.getBoundingClientRect().width));
            setCollapsed('right', next);
        });
    }

    const attachResizer = (handle, side) => {
        if (!handle) return;
        let startX = 0;
        let startWidth = 0;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const w = side === 'left' ? startWidth + dx : startWidth - dx;
            setSidebarWidth(side, w);
        };
        const onUp = () => {
            document.body.classList.remove('resizing');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        handle.addEventListener('mousedown', (e) => {
            // If collapsed, expand first
            if (side === 'left' && sidebarLeft?.classList.contains('collapsed')) setCollapsed('left', false);
            if (side === 'right' && sidebarRight?.classList.contains('collapsed')) setCollapsed('right', false);

            startX = e.clientX;
            startWidth = (side === 'left' ? sidebarLeft : sidebarRight).getBoundingClientRect().width;
            document.body.classList.add('resizing');
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    };

    attachResizer(leftResizer, 'left');
    attachResizer(rightResizer, 'right');

    // --- Mode Toggle Logic ---
    function setSidebarMode(mode) {
        sidebarMode = mode;
        if (mode === 'chat') {
            modeChatBtn.classList.add('active');
            modeEditorBtn.classList.remove('active');
            chatInput.placeholder = "Ask a question...";
            chatInputArea.classList.remove('editor-mode');
            sendChatBtn.innerHTML = '<i data-lucide="send"></i>';
        } else {
            modeEditorBtn.classList.add('active');
            modeChatBtn.classList.remove('active');
            chatInput.placeholder = "Type instructions...";
            chatInputArea.classList.add('editor-mode');
            sendChatBtn.innerHTML = '<i data-lucide="zap"></i>';
        }
        lucide.createIcons();
        document.querySelectorAll('svg').forEach(svg => svg.removeAttribute('xmlns'));
    }

    modeChatBtn.addEventListener('click', () => setSidebarMode('chat'));
    modeEditorBtn.addEventListener('click', () => setSidebarMode('editor'));

    // --- File Management ---
    function renderFileList() {
        fileList.innerHTML = '';
        files.forEach(file => {
            const el = document.createElement('div');
            el.className = `file-item ${file.id === activeFileId ? 'active' : ''}`;
            el.innerHTML = `<i data-lucide="file-text"></i> ${file.name}`;

            // Click to switch
            el.addEventListener('click', () => switchFile(file.id));

            // Double click to rename
            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                openRenameModal(file.id);
            });

            fileList.appendChild(el);
        });
        lucide.createIcons();
        document.querySelectorAll('svg').forEach(svg => svg.removeAttribute('xmlns'));
    }

    function switchFile(id) {
        const currentFile = files.find(f => f.id === activeFileId);
        if (currentFile) {
            currentFile.content = editor.innerHTML;
        }

        activeFileId = id;
        const newFile = files.find(f => f.id === activeFileId);
        editor.innerHTML = newFile.content;

        renderFileList();
    }

    // File Modal Logic
    function openNewFileModal() {
        fileModalMode = 'create';
        fileModalTitle.innerText = "New File";
        fileNameInput.value = "New Draft";
        confirmFileBtn.innerText = "Create";
        fileModal.classList.remove('hidden');
        fileNameInput.focus();
    }

    function openRenameModal(id) {
        fileModalMode = 'rename';
        fileToRenameId = id;
        const file = files.find(f => f.id === id);
        fileModalTitle.innerText = "Rename File";
        fileNameInput.value = file.name;
        confirmFileBtn.innerText = "Rename";
        fileModal.classList.remove('hidden');
        fileNameInput.focus();
    }

    function closeFileModal() {
        fileModal.classList.add('hidden');
    }

    newFileBtn.addEventListener('click', openNewFileModal);
    cancelFileBtn.addEventListener('click', closeFileModal);

    confirmFileBtn.addEventListener('click', () => {
        const name = fileNameInput.value.trim();
        if (!name) return;

        if (fileModalMode === 'create') {
            const newId = 'file-' + Date.now();
            files.push({ id: newId, name: name, content: '<h1>' + name + '</h1><p>Start writing...</p>' });
            switchFile(newId);
        } else {
            const file = files.find(f => f.id === fileToRenameId);
            if (file) {
                file.name = name;
                renderFileList();
            }
        }
        closeFileModal();
    });

    // Auto-save & Title Sync
    editor.addEventListener('input', () => {
        const currentFile = files.find(f => f.id === activeFileId);
        if (currentFile) {
            currentFile.content = editor.innerHTML;

            // Sync Title if H1 is changed
            const h1 = editor.querySelector('h1');
            if (h1 && h1.innerText.trim() !== currentFile.name) {
                // Optional: Only sync if it looks like a title? 
                // For now, let's just update the file name if the H1 changes.
                // We need to be careful not to be too aggressive, but this is what "editable tab title" usually implies in this context.
                const newName = h1.innerText.trim();
                if (newName.length > 0 && newName.length < 50) {
                    currentFile.name = newName;
                    // Debounce re-render to avoid flickering focus
                    // For simplicity, we won't re-render the whole list on every keystroke, 
                    // but we should update the specific DOM element if we want it live.
                    // Let's just update the list when we save or switch.
                    // Actually, let's update the specific item text.
                    const fileItem = document.querySelector(`.file-item.active`);
                    if (fileItem) {
                        fileItem.innerHTML = `<i data-lucide="file-text"></i> ${newName}`;
                        lucide.createIcons();
                        document.querySelectorAll('svg').forEach(svg => svg.removeAttribute('xmlns'));
                    }
                }
            }
        }
    });

    // --- Toolbar Actions ---
    undoBtn.addEventListener('click', () => {
        document.execCommand('undo');
        editor.focus();
    });

    redoBtn.addEventListener('click', () => {
        document.execCommand('redo');
        editor.focus();
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });

    // --- Search Logic ---
    searchBtn.addEventListener('click', () => {
        if (searchBar.classList.contains('hidden')) {
            searchBar.classList.remove('hidden');
            searchInput.focus();
            searchInput.select();
        } else {
            searchBar.classList.add('hidden');
        }
    });

    searchCloseBtn.addEventListener('click', () => {
        searchBar.classList.add('hidden');
        editor.focus();
    });

    function performSearch(direction = true) {
        const query = searchInput.value;
        if (!query) return;
        // window.find(aString, aCaseSensitive, aBackwards, aWrapAround, aWholeWord, aSearchInFrames, aShowDialog)
        // aBackwards: false for next, true for prev
        const found = window.find(query, false, !direction, true, false, false, false);
        if (!found) {
            // Optional: Visual feedback for not found
        }
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(!e.shiftKey); // Shift+Enter for prev
        } else if (e.key === 'Escape') {
            searchBar.classList.add('hidden');
            editor.focus();
        }
    });

    searchNextBtn.addEventListener('click', () => performSearch(true));
    searchPrevBtn.addEventListener('click', () => performSearch(false));

    insertImageBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgHtml = `<img src="${e.target.result}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;">`;
                document.execCommand('insertHTML', false, imgHtml);
            };
            reader.readAsDataURL(file);
        }
        imageUpload.value = ''; // Reset
    });

    formatBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent focus loss
        });
        btn.addEventListener('click', () => {
            if (currentSelectionRange) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(currentSelectionRange);
            }
            const command = btn.dataset.command;
            const value = btn.dataset.value || null;
            document.execCommand(command, false, value);
            editor.focus();
        });
    });

    // --- Settings Logic ---
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        apiKeyInput.value = maskKeysForDisplay(apiKeys);
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        const text = apiKeyInput.value.trim();
        const lines = text.split('\n').map(k => k.trim()).filter(k => k.length > 0);

        // If a line looks masked (contains • or *), fall back to existing key in same slot
        apiKeys = lines.map((line, idx) => {
            const looksMasked = /[•\\*]/.test(line);
            if (looksMasked && apiKeys[idx]) return apiKeys[idx];
            return line;
        }).filter(k => k.length > 0);

        localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
        // Clear old key to avoid confusion
        localStorage.removeItem('gemini_api_key');

        settingsModal.classList.add('hidden');
        addChatMessage('ai', `Saved ${apiKeys.length} API Key(s)! I am ready to help.`);
    });

    // --- Custom Select Logic ---
    function setupCustomSelect(triggerId, optionsId, valueId, onSelect) {
        const trigger = document.getElementById(triggerId);
        const options = document.getElementById(optionsId);
        const valueDisplay = document.getElementById(valueId);
        const optionItems = options.querySelectorAll('.select-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close others
            document.querySelectorAll('.select-options').forEach(el => {
                if (el !== options) el.classList.add('hidden');
            });
            options.classList.toggle('hidden');
        });

        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.dataset.value;
                const label = item.innerText;

                // Update UI
                valueDisplay.innerText = label;
                optionItems.forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
                options.classList.add('hidden');

                // Callback
                onSelect(value);
            });
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !options.contains(e.target)) {
                options.classList.add('hidden');
            }
        });
    }

    // Initialize Custom Selects
    setupCustomSelect('model-trigger', 'model-options', 'model-value', (val) => {
        currentModel = val;
    });

    setupCustomSelect('font-trigger', 'font-options', 'font-value', (val) => {
        if (currentSelectionRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(currentSelectionRange);
        }
        document.execCommand('fontName', false, val);
        editor.focus();
    });

    // --- Chat Logic ---
    function parseMarkdown(text) {
        // Basic Markdown Parser
        let html = text
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Newlines to br
            .replace(/\n/g, '<br>');
        return html;
    }

    function addChatMessage(role, text, isHtml = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (isHtml) {
            contentDiv.innerHTML = text;
        } else {
            contentDiv.innerText = text;
        }

        msgDiv.appendChild(contentDiv);
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return msgDiv; // Return element for removal if needed
    }

    function getGlobalContext() {
        return files.map(f => `File: ${f.name}\n---\n${f.content}\n---`).join('\n\n');
    }

    async function handleChatSubmit() {
        const text = chatInput.value.trim();
        if (!text) return;

        if (apiKeys.length === 0) {
            addChatMessage('ai', 'Please set your Gemini API Keys in settings first.');
            return;
        }

        chatInput.value = '';

        if (sidebarMode === 'chat') {
            // --- CHAT MODE ---
            addChatMessage('user', text);
            chatInput.disabled = true;
            const originalPlaceholder = chatInput.placeholder;
            chatInput.placeholder = "Thinking...";
            sendChatBtn.disabled = true;

            // Thinking Bubble
            const thinkingMsg = addChatMessage('ai', 'Thinking...');
            thinkingMsg.classList.add('thinking-bubble');

            const globalContext = getGlobalContext();
            const prompt = `You are a helpful writing assistant with access to the user's entire project.
            
Project Context:
${globalContext}

User Question: ${text}

IMPORTANT:
If the user is asking to edit text, remind them they can switch to "Editor" mode or use Cmd+K.
Answer their question conversationally. Use Markdown for formatting.`;

            try {
                const response = await callGeminiAPI(prompt, (msg) => {
                    // Log failover to chat
                    addChatMessage('ai', `⚠️ ${msg}`);
                });
                chatHistory.removeChild(thinkingMsg); // Remove thinking
                addChatMessage('ai', parseMarkdown(response), true);
            } catch (error) {
                chatHistory.removeChild(thinkingMsg);
                addChatMessage('ai', `Error: ${error.message}`);
            } finally {
                chatInput.disabled = false;
                chatInput.placeholder = originalPlaceholder;
                sendChatBtn.disabled = false;
                chatInput.focus();
            }

        } else {
            // --- EDITOR MODE ---
            addChatMessage('user', `[Editor] ${text}`);
            chatInput.disabled = true;
            const originalPlaceholder = chatInput.placeholder;
            chatInput.placeholder = "Processing...";
            sendChatBtn.disabled = true;

            try {
                await handleAgenticEdit(text);
            } catch (error) {
                addChatMessage('ai', `Workflow Error: ${error.message}`);
            } finally {
                chatInput.disabled = false;
                chatInput.placeholder = originalPlaceholder;
                sendChatBtn.disabled = false;
                chatInput.focus();
            }
        }
    }

    // --- Agentic Workflow ---
    async function handleAgenticEdit(instruction) {
        // 1. Create a progress container in the chat
        const progressMsg = addChatMessage('ai', 'Starting agentic workflow...');
        const progressContent = progressMsg.querySelector('.message-content');

        function updateProgress(step, status) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'workflow-step';
            stepDiv.innerHTML = `<strong>${step}:</strong> ${status}`;
            stepDiv.style.fontSize = '0.85em';
            stepDiv.style.marginTop = '4px';
            stepDiv.style.opacity = '0.8';
            progressContent.appendChild(stepDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        const logger = (msg) => updateProgress('System', msg);

        try {
            // STEP 1: Analyze
            updateProgress('Step 1', 'Analyzing request...');
            const analysis = await analyzeRequest(instruction, logger);
            updateProgress('Step 1', `Targeting: "${analysis.keywords}"`);

            console.log("--- Agentic Workflow Debug ---");
            console.log(`Step 1: Analyzed Instruction\nUser Input: "${instruction}"\nExtracted Keywords: "${analysis.keywords}"\nScope: "${analysis.scope}"\nGlobal: "${analysis.isGlobal}"`);

            // STEP 2: Search
            updateProgress('Step 2', 'Scanning document...');
            
            let contexts = [];
            
            if (analysis.isGlobal) {
                // GLOBAL MODE: Process entire document
                updateProgress('Step 2', 'Global mode: processing entire document.');
                console.log("Step 2: Global Mode\nProcessing entire document with highlight mode.");
                
                contexts = [{
                    elements: Array.from(editor.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li, span')),
                    fullHtml: editor.innerHTML,
                    snippet: 'Entire Document',
                    isGlobal: true
                }];
            } else {
                // Normal mode: find specific context
                const context = findRelevantContext(analysis.keywords, analysis.scope, analysis.isGlobal);

            if (!context) {
                updateProgress('Step 2', 'No specific paragraph found. Using full document.');
                    console.log("Step 2: Context Search\nResult: No specific paragraph matched. Fallback to full document.");
                    contexts = [{
                        elements: [],
                        fullHtml: editor.innerHTML,
                        snippet: editor.innerText || '',
                        isInline: analysis.scope === 'inline'
                    }];
                } else if (context.multiple) {
                    updateProgress('Step 2', `Found ${context.contexts.length} target sections (global).`);
                    contexts = context.contexts;
            } else {
                const displaySnippet = context.snippet.length > 40 ? context.snippet.substring(0, 40) + '...' : context.snippet;
                updateProgress('Step 2', `Targeting paragraph: "${displaySnippet}"`);
                    console.log(`Step 2: Context Search\nResult: Match Found!\nTarget Snippet: "${context.snippet}"`);
                    contexts = [context];
                }
            }

            // STEP 3: Request Edits (Rewrite Strategy)
            updateProgress('Step 3', 'Requesting edits from Gemini...');
            const currentFile = files.find(f => f.id === activeFileId);
            
            let appliedCount = 0;

            for (const ctx of contexts) {
                const targetHtml = ctx.fullHtml;
                const targets = ctx.elements || [];
                
                console.log("Step 3: Requesting Edits");
                
                // We use a specific prompt for Rewriting/Editing known context
                const newContent = await generateRewrite(instruction, targetHtml, currentFile.name, ctx.isInline ? 'inline' : analysis.scope, logger);

                // STEP 4: Apply
                if (newContent && newContent !== targetHtml) {
                    appliedCount += 1;
                    updateProgress('Step 4', `Applying changes...`);

                    // Check if it's GLOBAL MODE
                    if (ctx && ctx.isGlobal) {
                        // GLOBAL HIGHLIGHT MODE: word-level diff with red/green highlighting
                        const oldHtml = editor.innerHTML;
                        
                        const oldDiv = document.createElement('div');
                        oldDiv.innerHTML = oldHtml;
                        const newDiv = document.createElement('div');
                        newDiv.innerHTML = newContent;
                        
                        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        // Tokenizer for global diff: keep whitespace, isolate citations like [1], split punctuation.
                        const tokenizeForDiff = (text) => {
                            // Order matters: whitespace first, then [digits] citations, then latin/num words,
                            // then CJK chars, then any single non-space char.
                            const re = /(\\s+|\\[\\d+\\]|[a-zA-Z0-9]+|[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]|[^\\s])/gu;
                            return text.match(re) || [];
                        };
                        const diffWords = (a, b) => {
                            const aT = tokenizeForDiff(a);
                            const bT = tokenizeForDiff(b);
                            const m = aT.length, n = bT.length;
                            const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
                            for (let i = m - 1; i >= 0; i--) {
                                for (let j = n - 1; j >= 0; j--) {
                                    dp[i][j] = aT[i] === bT[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
                                }
                            }
                            const ops = [];
                            let i = 0, j = 0;
                            while (i < m && j < n) {
                                if (aT[i] === bT[j]) {
                                    ops.push({ type: 'same', text: aT[i] });
                                    i++; j++;
                                } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                                    ops.push({ type: 'del', text: aT[i++] });
                                } else {
                                    ops.push({ type: 'add', text: bT[j++] });
                                }
                            }
                            while (i < m) ops.push({ type: 'del', text: aT[i++] });
                            while (j < n) ops.push({ type: 'add', text: bT[j++] });
                            // Render each mismatch as: [DEL] immediately followed by [ADD]
                            const isWhitespace = (t) => /^\s+$/.test(t);

                            let html = '';
                            let hasChange = false;
                            let k = 0;

                            while (k < ops.length) {
                                const op = ops[k];

                                if (op.type === 'same') {
                                    html += esc(op.text);
                                    k++;
                                    continue;
                                }

                                let delText = '';
                                let addText = '';

                                while (k < ops.length && ops[k].type === 'del') {
                                    delText += ops[k].text;
                                    k++;
                                }
                                while (k < ops.length && ops[k].type === 'add') {
                                    addText += ops[k].text;
                                    k++;
                                }

                                // Avoid highlighting whitespace-only diffs
                                if (isWhitespace(delText) && isWhitespace(addText)) {
                                    html += esc(delText + addText);
                                    continue;
                                }

                                if (delText) {
                                    if (isWhitespace(delText)) {
                                        html += esc(delText);
                                    } else {
                                        html += `<span class="global-del" style="background:#fee2e2;color:#b91c1c;text-decoration:line-through;">${esc(delText)}</span>`;
                                        hasChange = true;
                                    }
                                }

                                if (addText) {
                                    if (isWhitespace(addText)) {
                                        html += esc(addText);
                                    } else {
                                        html += `<span class="global-add" style="background:#dcfce7;color:#047857;">${esc(addText)}</span>`;
                                        hasChange = true;
                                    }
                                }
                            }

                            return { html, hasChange };
                        };
                        
                        const oldElements = Array.from(oldDiv.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li'));
                        const newElements = Array.from(newDiv.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li'));
                        let changedCount = 0;
                        
                        const pairCount = Math.min(oldElements.length, newElements.length);
                        for (let i = 0; i < pairCount; i++) {
                            const oldEl = oldElements[i];
                            const newEl = newElements[i];
                            const { html, hasChange } = diffWords(oldEl.innerText, newEl.innerText);
                            if (hasChange) {
                                newEl.innerHTML = html;
                                newEl.classList.add('global-highlight-change');
                                changedCount++;
                            }
                        }
                        // Extra new elements = additions
                        for (let i = pairCount; i < newElements.length; i++) {
                            const ne = newElements[i];
                            ne.innerHTML = `<span class=\"global-add\" style=\"background:#dcfce7;color:#047857;\">${esc(ne.innerText)}</span>`;
                            ne.classList.add('global-highlight-change');
                            changedCount++;
                        }
                        // Extra old elements = deletions, append to newDiv for visibility
                        for (let i = pairCount; i < oldElements.length; i++) {
                            const oe = oldElements[i];
                            const delBlock = document.createElement(oe.tagName || 'div');
                            delBlock.innerHTML = `<span class=\"global-del\" style=\"background:#fee2e2;color:#b91c1c;text-decoration:line-through;\">${esc(oe.innerText)}</span>`;
                            delBlock.classList.add('global-highlight-change');
                            newDiv.appendChild(delBlock);
                            changedCount++;
                        }
                        
                        editor.innerHTML = newDiv.innerHTML;
                        
                        // Chat UI for Global Changes
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'chat-actions-container';
                        actionsDiv.style.cssText = `margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; font-family:monospace; font-size:0.85em;`;
                        
                        const headerBar = document.createElement('div');
                        headerBar.style.cssText = `padding:8px 12px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; color:#64748b;`;
                        headerBar.innerHTML = `<div>Global Edit: ${changedCount} changes</div>`;
                        actionsDiv.appendChild(headerBar);
                        
                        const contentArea = document.createElement('div');
                        contentArea.style.cssText = `padding:12px; display:flex; gap:8px; background:white;`;
                        
                        const createBtn = (text, icon, action, colorClass = '') => {
                            const btn = document.createElement('button');
                            btn.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px;margin-right:6px;"></i>${text}`;
                            let bg = 'white';
                            let color = '#475569';
                            let border = '#e2e8f0';
                            
                            if (colorClass === 'primary') { bg = '#ecfdf5'; color = '#047857'; border = '#a7f3d0'; }
                            if (colorClass === 'danger') { bg = '#fef2f2'; color = '#b91c1c'; border = '#fecaca'; }
                            
                            btn.style.cssText = `flex: 1; display:inline-flex; align-items:center; justify-content:center; padding:8px 12px; border-radius:6px; border:1px solid ${border}; background:${bg}; color:${color}; font-size:0.9em; cursor:pointer; transition:all 0.2s;`;
                            
                            btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(0.95)');
                            btn.addEventListener('mouseleave', () => btn.style.filter = 'none');
                            btn.addEventListener('click', action);
                            return btn;
                        };

                        const btnContainer = document.createElement('div');
                        btnContainer.style.display = 'flex';
                        btnContainer.style.gap = '8px';
                        btnContainer.style.width = '100%';

                        const undoBtn = createBtn('Undo All', 'undo-2', () => {
                            editor.innerHTML = oldHtml;
                            actionsDiv.remove();
                            addChatMessage('ai', 'All changes undone.');
                        }, 'danger');
                        
                        const keepBtn = createBtn('Keep All', 'check', () => {
                            // Accept: remove deletions, keep additions as plain text
                            editor.querySelectorAll('.global-del').forEach(el => el.remove());
                            editor.querySelectorAll('.global-add').forEach(el => {
                                el.replaceWith(document.createTextNode(el.textContent));
                            });
                            // Clean any remaining markers
                            editor.querySelectorAll('.global-highlight-change').forEach(el => {
                                el.classList.remove('global-highlight-change');
                            });
                            actionsDiv.remove();
                            addChatMessage('ai', 'All changes accepted.');
                        }, 'primary');
                        
                        undoBtn.style.display = 'none';
                        keepBtn.style.display = 'none';

                        const showBtn = createBtn('Show', 'eye', () => {
                            // Scroll to first change
                            const firstChange = editor.querySelector('.global-del, .global-add');
                            if (firstChange) {
                                firstChange.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                firstChange.style.boxShadow = '0 0 0 4px rgba(100, 116, 139, 0.25)';
                                setTimeout(() => firstChange.style.boxShadow = 'none', 2000);
                            }
                            
                            showBtn.style.display = 'none';
                            undoBtn.style.display = 'inline-flex';
                            keepBtn.style.display = 'inline-flex';
                        });

                        btnContainer.appendChild(showBtn);
                        btnContainer.appendChild(undoBtn);
                        btnContainer.appendChild(keepBtn);
                        
                        contentArea.appendChild(btnContainer);
                        actionsDiv.appendChild(contentArea);
                        
                        const successMsg = addChatMessage('ai', `Applied ${changedCount} changes globally.`);
                        successMsg.appendChild(actionsDiv);
                        lucide.createIcons();
                        
                    } else if (targets.length > 0) {
                        // Check if it's an INLINE edit
                        if (ctx && ctx.isInline) {
                        // INLINE EDIT: Replace directly, but use diff markers in the editor
                        const firstEl = targets[0];
                        const oldHtml = firstEl.innerHTML; // Use innerHTML to preserve span structure if any
                        const oldOuterHtml = firstEl.outerHTML; // Backup for Undo
                        
                        // We rely on the rewrite being the *content* of the element.
                        // But generateRewrite returns the whole element (outerHTML) usually?
                        // Let's check generateRewrite prompt. It says "OUTPUT ONLY THE NEW HTML CONTENT".
                        // If input was "<div>...</div>", output is usually "<div>...</div>".
                        
                        // If we replace outerHTML, we might lose event listeners or attributes if AI strips them.
                        // But finding difference inside innerHTML is safer for "Inline" visual.
                        
                        // Let's assume newContent is the new outerHTML.
                        // Visual Diff Strategy:
                        // Instead of replacing, we create a visual diff node.
                        // But we want to keep the document structure valid.
                        // If we replace <h1>Title</h1> with <span><del>Title</del><ins>New Title</ins></span>, it breaks block structure.
                        
                        // Better Strategy:
                        // Just replace the element with newContent, but apply a class to it? No that doesn't show deleted text.
                        
                        // Hybrid Strategy:
                        // Replace the element with newContent.
                        // Store the old element reference or HTML.
                        // IN THE CHAT: Show buttons Undo / Keep.
                        // IN THE EDITOR: 
                        // To show "What changed" inline is hard without a granular diff lib.
                        // Let's try to wrap the change.
                        
                        // Let's use the simplest approach requested:
                        // "Directly mark in file where deleted and replaced"
                        // This implies: <del>Old</del> <ins>New</ins>
                        
                        // We will construct a wrapper that contains both.
                        // CAUTION: If valid HTML structure allows. We can't put <div> inside <p> usually.
                        // But browsers are lenient.
                        
                        // Let's verify if newContent is a full tag or just text.
                        // AI usually returns full tag.
                        
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newContent;
                        const newInner = tempDiv.firstChild ? tempDiv.firstChild.innerHTML : newContent;
                        
                        // Visual Diff HTML
                        const diffHtml = `<span class="inline-diff-container" style="border:1px solid #e2e8f0; border-radius:4px; padding:2px; display:inline-block;"><span class="diff-del" style="background:#ffebee;color:#b91c1c;text-decoration:line-through;margin-right:4px;">${oldHtml}</span><span class="diff-add" style="background:#ecfdf5;color:#047857;">${newInner}</span></span>`;
                        
                        firstEl.innerHTML = diffHtml;
                        
                        // --- Chat UI for Inline ---
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'chat-actions-container';
                        actionsDiv.style.cssText = `margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; font-family:monospace; font-size:0.85em;`;
                        
                        const headerBar = document.createElement('div');
                        headerBar.style.cssText = `padding:8px 12px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; color:#64748b;`;
                        headerBar.innerHTML = `<div>Inline Edit</div>`;
                        actionsDiv.appendChild(headerBar);
                        
                        const contentArea = document.createElement('div');
                        contentArea.style.cssText = `padding:12px; display:flex; gap:8px; justify-content:flex-end; background:white;`;
                        
                        // Buttons
                        const createBtn = (text, icon, action, colorClass = '') => {
                            const btn = document.createElement('button');
                            btn.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px;margin-right:6px;"></i>${text}`;
                            let bg = 'white';
                            let color = '#475569';
                            let border = '#e2e8f0';
                            
                            if (colorClass === 'primary') { bg = '#ecfdf5'; color = '#047857'; border = '#a7f3d0'; }
                            if (colorClass === 'danger') { bg = '#fef2f2'; color = '#b91c1c'; border = '#fecaca'; }
                            
                            btn.style.cssText = `display:inline-flex; align-items:center; padding:6px 12px; border-radius:6px; border:1px solid ${border}; background:${bg}; color:${color}; font-size:0.9em; cursor:pointer; transition:all 0.2s;`;
                            
                            btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(0.95)');
                            btn.addEventListener('mouseleave', () => btn.style.filter = 'none');
                            btn.addEventListener('click', action);
                            return btn;
                        };
                        
                        // Action Container
                        const btnContainer = document.createElement('div');
                        btnContainer.style.display = 'flex';
                        btnContainer.style.gap = '8px';

                        // Logic: Initially Show "Show". After click, reveal Undo/Keep.
                        
                        const undoBtn = createBtn('Undo', 'undo-2', () => {
                            firstEl.innerHTML = oldHtml; 
                            actionsDiv.remove();
                            addChatMessage('ai', 'Inline edit undone.');
                        }, 'danger');
                        
                        const keepBtn = createBtn('Keep', 'check', () => {
                            firstEl.innerHTML = newInner;
                            actionsDiv.remove();
                            addChatMessage('ai', 'Inline edit accepted.');
                        }, 'primary');
                        
                        // Hidden initially
                        undoBtn.style.display = 'none';
                        keepBtn.style.display = 'none';

                        const showBtn = createBtn('Show', 'eye', () => {
                            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Highlight
                            const diffSpan = firstEl.querySelector('.inline-diff-container');
                            if(diffSpan) {
                                diffSpan.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.2)';
                                setTimeout(() => diffSpan.style.boxShadow = 'none', 2000);
                            }
                            
                            // Reveal Actions
                            showBtn.style.display = 'none'; // Hide self? Or change to "Hide"? 
                            // User asked: "Show 了之後按鈕變成 Keep 跟 Undo"
                            undoBtn.style.display = 'inline-flex';
                            keepBtn.style.display = 'inline-flex';
                        });

                        btnContainer.appendChild(showBtn);
                        btnContainer.appendChild(undoBtn);
                        btnContainer.appendChild(keepBtn);
                        
                        contentArea.appendChild(btnContainer);
                        actionsDiv.appendChild(contentArea);
                        
                        const successMsg = addChatMessage('ai', 'Changes applied.');
                        successMsg.appendChild(actionsDiv);
                        lucide.createIcons();
                        
                    } else {
                        // BLOCK EDIT: Use Wrapper with Accept/Reject
                        
                        // 1. Insert a marker before the first element
                        const marker = document.createElement('span');
                        marker.id = 'edit-marker-' + Date.now();
                        const firstEl = targets[0];
                        const parent = firstEl.parentNode;
                        
                        if (parent) {
                            parent.insertBefore(marker, firstEl);
                            
                            // 2. Remove old elements
                            targets.forEach(el => {
                                if (el.parentNode === parent) parent.removeChild(el);
                            });

                            // ... (Rest of Block Logic) ...
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = newContent;
                            
                            const fragment = document.createDocumentFragment();
                            const newNodes = Array.from(tempDiv.childNodes);
                            
                            // Create a wrapper for the whole block to allow "Accept/Reject"
                            const wrapperDiv = document.createElement('div');
                            wrapperDiv.className = 'diff-block-wrapper highlight-pulse';
                            // Clean style for the wrapper
                            wrapperDiv.style.cssText = `
                                border: 2px solid #e2e8f0;
                                border-radius: 8px;
                                margin: 16px 0;
                                position: relative;
                                background-color: #f8fafc;
                                transition: all 0.2s ease;
                            `;
                            
                            // Add Actions Header (Minimalist)
                            const actionsHeader = document.createElement('div');
                            actionsHeader.className = 'diff-actions-header';
                            actionsHeader.style.cssText = `
                                display: flex;
                                gap: 4px;
                                position: absolute;
                                top: -12px;
                                right: 12px;
                                background: white;
                                padding: 2px;
                                border: 1px solid #e2e8f0;
                                border-radius: 20px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                            `;
                            
                            // Use SVG Icons for Check/X instead of Emoji
                            actionsHeader.innerHTML = `
                                <button class="diff-btn accept" title="Accept" style="width:24px;height:24px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#10b981;transition:background 0.2s;"><i data-lucide="check" style="width:14px;height:14px;"></i></button>
                                <button class="diff-btn reject" title="Reject" style="width:24px;height:24px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#ef4444;transition:background 0.2s;"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
                            `;
                            wrapperDiv.appendChild(actionsHeader);
                            
                            // Content Container
                            const contentContainer = document.createElement('div');
                            contentContainer.className = 'diff-content-new';
                            contentContainer.style.padding = '16px';
                            newNodes.forEach(node => contentContainer.appendChild(node));
                            wrapperDiv.appendChild(contentContainer);

                            // Hidden Original Container (for Diff View via Chat)
                            const originalContainer = document.createElement('div');
                            originalContainer.className = 'diff-content-original hidden';
                            originalContainer.style.cssText = `
                                display: none;
                                border-top: 1px dashed #cbd5e1;
                                background-color: #fff1f2;
                                padding: 16px;
                                color: #991b1b;
                                font-size: 0.9em;
                            `;
                            originalContainer.innerHTML = `<div style="margin-bottom:8px;font-size:0.8em;text-transform:uppercase;color:#ef4444;font-weight:bold;">Original</div>${targetHtml}`;
                            wrapperDiv.appendChild(originalContainer);
                            
                            // Store original HTML for Reject
                            wrapperDiv.dataset.originalHtml = targetHtml;
                            
                            parent.insertBefore(wrapperDiv, marker);
                            parent.removeChild(marker);
                            
                            // Attach listeners
                            attachBlockDiffListeners(wrapperDiv);
                            
                        // --- Chat UI Update (Light Style) ---
                // Success Message with Actions
                const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'chat-actions-container';
                        actionsDiv.style.cssText = `
                            margin-top: 12px;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            overflow: hidden;
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                            font-size: 0.85em;
                        `;
                        
                        // Header Bar
                        const headerBar = document.createElement('div');
                        headerBar.style.cssText = `
                            padding: 8px 12px;
                            background: #f1f5f9;
                            border-bottom: 1px solid #e2e8f0;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            color: #64748b;
                        `;
                        
                        // File Info
                        const fileInfo = document.createElement('div');
                        fileInfo.innerHTML = `<i data-lucide="file-text" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> ${currentFile.name}`;
                        
                        // Edit Stats (Fake stats for demo, or real if we calculate diff)
                        const editStats = document.createElement('div');
                        editStats.style.cssText = `font-size: 0.9em; color: #94a3b8;`;
                        editStats.innerText = context.isInline ? 'Inline Edit' : 'Block Rewrite';
                        
                        headerBar.appendChild(fileInfo);
                        headerBar.appendChild(editStats);
                        actionsDiv.appendChild(headerBar);
                        
                        // Content Area (Buttons)
                        const contentArea = document.createElement('div');
                        contentArea.style.cssText = `
                            padding: 12px;
                            display: flex;
                            gap: 8px;
                            justify-content: flex-end;
                            background: white;
                        `;
                        
                        // Buttons
                        const createBtn = (text, icon, action, colorClass = '') => {
                            const btn = document.createElement('button');
                            btn.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px;margin-right:6px;"></i>${text}`;
                            let bg = 'white';
                            let color = '#475569';
                            let border = '#e2e8f0';
                            
                            if (colorClass === 'primary') { bg = '#ecfdf5'; color = '#047857'; border = '#a7f3d0'; }
                            if (colorClass === 'danger') { bg = '#fef2f2'; color = '#b91c1c'; border = '#fecaca'; }
                            
                            // Flex 1 to fill width
                            btn.style.cssText = `flex: 1; display:inline-flex; align-items:center; justify-content:center; padding:8px 12px; border-radius:6px; border:1px solid ${border}; background:${bg}; color:${color}; font-size:0.9em; cursor:pointer; transition:all 0.2s;`;
                            
                            btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(0.95)');
                            btn.addEventListener('mouseleave', () => btn.style.filter = 'none');
                            btn.addEventListener('click', action);
                            return btn;
                        };

                        const btnContainer = document.createElement('div');
                        btnContainer.style.display = 'flex';
                        btnContainer.style.gap = '8px';
                        btnContainer.style.width = '100%'; // Full width container

                        // Undo (Reject)
                        const undoBtn = createBtn('Undo', 'undo-2', () => {
                            // Trigger Reject on the wrapper
                            const rejectBtn = wrapperDiv.querySelector('.reject');
                            if(rejectBtn) rejectBtn.click();
                            actionsDiv.remove(); 
                            addChatMessage('ai', 'Changes undone.');
                        }, 'danger');
                        
                        // Keep (Accept)
                        const keepBtn = createBtn('Keep', 'check', () => {
                            const acceptBtn = wrapperDiv.querySelector('.accept');
                            if(acceptBtn) acceptBtn.click();
                            actionsDiv.remove();
                            addChatMessage('ai', 'Changes accepted.');
                        }, 'primary');

                        // Initially hidden
                        undoBtn.style.display = 'none';
                        keepBtn.style.display = 'none';

                        // Show (Show Changes)
                        const showBtn = createBtn('Show', 'eye', () => {
                            wrapperDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            wrapperDiv.classList.add('highlight-pulse');
                            setTimeout(() => wrapperDiv.classList.remove('highlight-pulse'), 2000);
                            
                            const original = wrapperDiv.querySelector('.diff-content-original');
                            if (original) {
                                // Always show original when clicking Show
                                original.style.display = 'block';
                                
                                // Reveal Actions, Hide Show button
                                showBtn.style.display = 'none';
                                undoBtn.style.display = 'inline-flex';
                                keepBtn.style.display = 'inline-flex';
                            }
                        });
                        
                        btnContainer.appendChild(showBtn);
                        btnContainer.appendChild(undoBtn);
                        btnContainer.appendChild(keepBtn);
                        
                        contentArea.appendChild(btnContainer);
                        
                        actionsDiv.appendChild(contentArea);
                        
                        const successMsg = addChatMessage('ai', 'Changes applied.');
                        successMsg.appendChild(actionsDiv);
                        lucide.createIcons();
                        } // end block edit
                    } // end if (targets.length > 0)
            } else {
                    // Full document diff + actions (same UX as other edits)
                    const oldHtml = editor.innerHTML;

                    // Reuse the GLOBAL diff rendering (red deletions + green additions, only where changed)
                    const oldDiv = document.createElement('div');
                    oldDiv.innerHTML = oldHtml;
                    const newDiv = document.createElement('div');
                    newDiv.innerHTML = newContent;

                    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const tokenizeForDiff = (text) => {
                        const re = /(\s+|\[\d+\]|[a-zA-Z0-9]+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[^\s])/gu;
                        return text.match(re) || [];
                    };
                    const diffWords = (a, b) => {
                        const aT = tokenizeForDiff(a);
                        const bT = tokenizeForDiff(b);
                        const m = aT.length, n = bT.length;
                        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
                        for (let i = m - 1; i >= 0; i--) {
                            for (let j = n - 1; j >= 0; j--) {
                                dp[i][j] = aT[i] === bT[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
                            }
                        }
                        const ops = [];
                        let i = 0, j = 0;
                        while (i < m && j < n) {
                            if (aT[i] === bT[j]) {
                                ops.push({ type: 'same', text: aT[i] });
                                i++; j++;
                            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                                ops.push({ type: 'del', text: aT[i++] });
                            } else {
                                ops.push({ type: 'add', text: bT[j++] });
                            }
                        }
                        while (i < m) ops.push({ type: 'del', text: aT[i++] });
                        while (j < n) ops.push({ type: 'add', text: bT[j++] });
                        const isWhitespace = (t) => /^\s+$/.test(t);
                        let html = '';
                        let hasChange = false;
                        let k = 0;
                        while (k < ops.length) {
                            const op = ops[k];
                            if (op.type === 'same') {
                                html += esc(op.text);
                                k++;
                                continue;
                            }
                            let delText = '';
                            let addText = '';
                            while (k < ops.length && ops[k].type === 'del') { delText += ops[k].text; k++; }
                            while (k < ops.length && ops[k].type === 'add') { addText += ops[k].text; k++; }
                            if (isWhitespace(delText) && isWhitespace(addText)) {
                                html += esc(delText + addText);
                                continue;
                            }
                            if (delText && !isWhitespace(delText)) {
                                html += `<span class="global-del" style="background:#fee2e2;color:#b91c1c;text-decoration:line-through;">${esc(delText)}</span>`;
                                hasChange = true;
                            } else if (delText) {
                                html += esc(delText);
                            }
                            if (addText && !isWhitespace(addText)) {
                                html += `<span class="global-add" style="background:#dcfce7;color:#047857;">${esc(addText)}</span>`;
                                hasChange = true;
                            } else if (addText) {
                                html += esc(addText);
                            }
                        }
                        return { html, hasChange };
                    };

                    const oldElements = Array.from(oldDiv.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li'));
                    const newElements = Array.from(newDiv.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li'));
                    let changedCount = 0;
                    const pairCount = Math.min(oldElements.length, newElements.length);
                    for (let i = 0; i < pairCount; i++) {
                        const { html, hasChange } = diffWords(oldElements[i].innerText, newElements[i].innerText);
                        if (hasChange) {
                            newElements[i].innerHTML = html;
                            changedCount++;
                        }
                    }
                    for (let i = pairCount; i < newElements.length; i++) {
                        newElements[i].innerHTML = `<span class="global-add" style="background:#dcfce7;color:#047857;">${esc(newElements[i].innerText)}</span>`;
                        changedCount++;
                    }
                    for (let i = pairCount; i < oldElements.length; i++) {
                        const oe = oldElements[i];
                        const delBlock = document.createElement(oe.tagName || 'div');
                        delBlock.innerHTML = `<span class="global-del" style="background:#fee2e2;color:#b91c1c;text-decoration:line-through;">${esc(oe.innerText)}</span>`;
                        newDiv.appendChild(delBlock);
                        changedCount++;
                    }

                    editor.innerHTML = newDiv.innerHTML;

                    // Chat UI (Show -> Undo/Keep)
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'chat-actions-container';
                    actionsDiv.style.cssText = `margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; font-family:monospace; font-size:0.85em;`;

                    const headerBar = document.createElement('div');
                    headerBar.style.cssText = `padding:8px 12px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; color:#64748b;`;
                    headerBar.innerHTML = `<div>Document Edit: ${changedCount} changes</div>`;
                    actionsDiv.appendChild(headerBar);

                    const contentArea = document.createElement('div');
                    contentArea.style.cssText = `padding:12px; display:flex; gap:8px; background:white;`;

                    const createBtn = (text, icon, action, colorClass = '') => {
                        const btn = document.createElement('button');
                        btn.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px;margin-right:6px;"></i>${text}`;
                        let bg = 'white';
                        let color = '#475569';
                        let border = '#e2e8f0';
                        if (colorClass === 'primary') { bg = '#ecfdf5'; color = '#047857'; border = '#a7f3d0'; }
                        if (colorClass === 'danger') { bg = '#fef2f2'; color = '#b91c1c'; border = '#fecaca'; }
                        btn.style.cssText = `flex: 1; display:inline-flex; align-items:center; justify-content:center; padding:8px 12px; border-radius:6px; border:1px solid ${border}; background:${bg}; color:${color}; font-size:0.9em; cursor:pointer; transition:all 0.2s;`;
                        btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(0.95)');
                        btn.addEventListener('mouseleave', () => btn.style.filter = 'none');
                        btn.addEventListener('click', action);
                        return btn;
                    };

                    const btnContainer = document.createElement('div');
                    btnContainer.style.display = 'flex';
                    btnContainer.style.gap = '8px';
                    btnContainer.style.width = '100%';

                    const undoBtn = createBtn('Undo', 'undo-2', () => {
                        editor.innerHTML = oldHtml;
                        actionsDiv.remove();
                        addChatMessage('ai', 'Changes undone.');
                    }, 'danger');

                    const keepBtn = createBtn('Keep', 'check', () => {
                        editor.querySelectorAll('.global-del').forEach(el => el.remove());
                        editor.querySelectorAll('.global-add').forEach(el => el.replaceWith(document.createTextNode(el.textContent)));
                        actionsDiv.remove();
                        addChatMessage('ai', 'Changes accepted.');
                    }, 'primary');

                    undoBtn.style.display = 'none';
                    keepBtn.style.display = 'none';

                    const showBtn = createBtn('Show', 'eye', () => {
                        const firstChange = editor.querySelector('.global-del, .global-add');
                        if (firstChange) {
                            firstChange.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            firstChange.style.boxShadow = '0 0 0 4px rgba(100, 116, 139, 0.25)';
                            setTimeout(() => firstChange.style.boxShadow = 'none', 2000);
                        }
                        showBtn.style.display = 'none';
                        undoBtn.style.display = 'inline-flex';
                        keepBtn.style.display = 'inline-flex';
                    });

                    btnContainer.appendChild(showBtn);
                    btnContainer.appendChild(undoBtn);
                    btnContainer.appendChild(keepBtn);

                    contentArea.appendChild(btnContainer);
                    actionsDiv.appendChild(contentArea);

                    const successMsg = addChatMessage('ai', `Changes applied.`);
                    successMsg.appendChild(actionsDiv);
                    lucide.createIcons();
                }
            } // end if (newContent && newContent !== targetHtml)
        } // end for contexts

            if (appliedCount === 0) {
                updateProgress('Step 4', 'No changes generated.');
                addChatMessage('ai', 'No edits were necessary.');
            }

        } catch (e) {
            updateProgress('Error', e.message);
            console.error(e);
            throw e;
        }
    }

    function attachBlockDiffListeners(wrapper) {
        const acceptBtn = wrapper.querySelector('.accept');
        const rejectBtn = wrapper.querySelector('.reject');

        // Note: Show Diff button is now in Chat, not in wrapper header.
        // We handle hover effects for clean UI
        
        if (acceptBtn) {
            acceptBtn.addEventListener('mouseenter', () => acceptBtn.style.backgroundColor = '#ecfdf5');
            acceptBtn.addEventListener('mouseleave', () => acceptBtn.style.backgroundColor = 'transparent');
            
            acceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Unwrap
                const header = wrapper.querySelector('.diff-actions-header');
                if(header) header.remove();
                
                const original = wrapper.querySelector('.diff-content-original');
                if(original) original.remove();

                const contentNew = wrapper.querySelector('.diff-content-new');
                if (contentNew) {
                    // Reset padding from container
                    contentNew.style.padding = '';
                    while (contentNew.firstChild) {
                        wrapper.parentNode.insertBefore(contentNew.firstChild, wrapper);
                    }
                }
                wrapper.remove();
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('mouseenter', () => rejectBtn.style.backgroundColor = '#fef2f2');
            rejectBtn.addEventListener('mouseleave', () => rejectBtn.style.backgroundColor = 'transparent');
            
            rejectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const originalHtml = wrapper.dataset.originalHtml;
                wrapper.outerHTML = originalHtml;
            });
        }
    }

    async function generateRewrite(instruction, originalText, fileName, scope, onLog) {
        let guidelines = "";
        if (scope === 'inline') {
            guidelines = `- CRITICAL: You are in INLINE mode. ONLY change the specific word/phrase requested. PRESERVE all other surrounding text, tags, and formatting exactly.`;
        } else {
            guidelines = `
- **Target Focus**: Identify the specific section the user wants to change based on the Instruction.
- **Preservation**: For any parts of the text NOT targeted by the instruction (e.g., surrounding context, other paragraphs), KEEP THEM EXACTLY AS IS. Do not translate or rewrite context just because you are editing the target.
- **Translation**: If translating, only translate the targeted section.
- **Structure**: Maintain the original HTML structure (divs, spans, classes) unless the instruction specifically asks to change structure.`;
        }

        const prompt = `
You are a Smart Editing Engine.
Instruction: "${instruction}"
Context File: "${fileName}"

Original Text (Context + Target):
${originalText}

TASK:
Rewrite the "Original Text" above based on the Instruction.
${guidelines}
- OUTPUT ONLY THE NEW HTML CONTENT. NO MARKDOWN. NO JSON. NO PREAMBLE.

`;
        console.log("Gemini Prompt (Rewrite):\n" + prompt);
        const response = await callGeminiAPI(prompt, onLog);
        console.log("Gemini Response (Rewrite):\n" + response);
        
        // Clean up markdown code blocks if Gemini adds them
        let clean = response.trim();
        if (clean.startsWith('```html')) clean = clean.substring(7);
        if (clean.startsWith('```')) clean = clean.substring(3);
        if (clean.endsWith('```')) clean = clean.slice(0, -3);
        
        return clean.trim();
    }


    function scrollToFirstDiff() {
        const firstDiff = editor.querySelector('.diff-wrapper');
        if (firstDiff) {
            firstDiff.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstDiff.classList.add('highlight-pulse');
            setTimeout(() => firstDiff.classList.remove('highlight-pulse'), 2000);
        }
    }

    function acceptAllDiffs(actionsDiv) {
        const wrappers = editor.querySelectorAll('.diff-wrapper');
        wrappers.forEach(wrapper => acceptDiff(wrapper));
        addChatMessage('ai', 'All changes accepted.');
        if (actionsDiv) actionsDiv.remove();
    }

    function rejectAllDiffs(actionsDiv) {
        const wrappers = editor.querySelectorAll('.diff-wrapper');
        wrappers.forEach(wrapper => rejectDiff(wrapper));
        addChatMessage('ai', 'All changes rejected.');
        if (actionsDiv) actionsDiv.remove();
    }

    async function analyzeRequest(instruction, onLog) {
        const prompt = `
        You are a Search Query Extractor & Intent Classifier.
        User Instruction: "${instruction}"
        
        Task 1: Extract keywords to locate the target text.
        Task 2: Classify the edit scope.
        Task 3: Detect if this is a global operation.
        
        Scope Definitions:
        - "inline": Replacing specific words, numbers, fixing typos, small translations.
        - "block": Rewriting sentences, paragraphs, lists, tables.
        
        Global Detection:
        - "isGlobal": true if user says "all", "every", "whole document", "全部", "所有", "整篇".
        
        OUTPUT FORMAT (JSON):
        {
            "keywords": "string",
            "scope": "inline" or "block",
            "isGlobal": boolean
        }
        `;
        const response = await callGeminiAPI(prompt, onLog);
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            return { keywords: instruction, scope: 'block', isGlobal: false }; // Fallback
        }
    }

    function findRelevantContext(keywords, scope = 'block', isGlobal = false) {

        // TF-IDF / Cosine Similarity Implementation
        // Expanded selector to catch more text containers and specific block elements
        const elements = Array.from(editor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div, span, article, section, td, th'));
        
        if (elements.length === 0) return null;

        // Filter out elements that are just containers for other block elements we already selected
        // We only want 'leaf' nodes or nodes that have significant direct text
        const contentElements = elements.filter(el => {
            // If it has block children, it might be a container. 
            // A simple heuristic: if it has direct text nodes with content, keep it.
            const hasDirectText = Array.from(el.childNodes).some(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
            );
            // If it's a block element like div/section, we only want it if it has direct text.
            // For p, h1-h6, li, they are usually content holders.
            const isContentBlock = ['P','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','PRE','TD','TH'].includes(el.tagName);
            
            return isContentBlock || hasDirectText;
        });

        if (contentElements.length === 0) return null;

        // Improved Tokenizer for Multilingual (CJK support)
        const tokenize = (text) => {
            const str = text.toLowerCase();
            const tokens = [];
            
            // 1. Extract Latin/Number words
            const words = str.match(/[a-z0-9]+/g) || [];
            tokens.push(...words);
            
            // 2. Extract CJK characters (as individual tokens)
            // This treats each Chinese/Japanese/Korean character as a separate token, 
            // which works better for cosine similarity in short snippets than full sentence tokens.
            const cjk = str.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
            tokens.push(...cjk);
            
            return tokens;
        };

        const queryTokens = tokenize(keywords);
        if (queryTokens.length === 0) return null;

        // Calculate Term Frequencies (TF) for query
        const queryVec = {};
        queryTokens.forEach(t => queryVec[t] = (queryVec[t] || 0) + 1);

        let bestMatch = null;
        let maxScore = 0;
        const allMatches = [];

        contentElements.forEach(el => {
            const text = el.innerText.trim();
            if (!text) return; // Skip empty elements

            const docTokens = tokenize(text);
            if (docTokens.length === 0) return;

            // Calculate TF for document
            const docVec = {};
            docTokens.forEach(t => docVec[t] = (docVec[t] || 0) + 1);

            // Calculate Cosine Similarity
            let dotProduct = 0;
            let queryMag = 0;
            let docMag = 0;

            const uniqueTerms = new Set([...Object.keys(queryVec), ...Object.keys(docVec)]);

            uniqueTerms.forEach(term => {
                const qVal = queryVec[term] || 0;
                const dVal = docVec[term] || 0;
                dotProduct += qVal * dVal;
                queryMag += qVal * qVal;
                docMag += dVal * dVal;
            });

            queryMag = Math.sqrt(queryMag);
            docMag = Math.sqrt(docMag);

            let similarity = 0;
            if (queryMag > 0 && docMag > 0) {
                similarity = dotProduct / (queryMag * docMag);
            }

            // Bonus for contiguous phrase match
            // If the exact keyword string appears in the text, give a huge boost
            if (text.toLowerCase().includes(keywords.toLowerCase())) {
                similarity += 1.0;
            } else {
                // Partial phrase matching boost for CJK often helps
                // If more than 50% of the query characters are found in sequence
                if (keywords.length > 4) {
                    const halfQuery = keywords.substring(0, Math.ceil(keywords.length / 2));
                    if (text.toLowerCase().includes(halfQuery.toLowerCase())) {
                         similarity += 0.5;
                    }
                }
            }

            // console.log(`Text: "${text.substring(0, 15)}..." Score: ${similarity.toFixed(3)}`);

            if (similarity > maxScore) {
                maxScore = similarity;
                bestMatch = el;
            }
            if (isGlobal && similarity > 0.05) {
                allMatches.push(el);
            }
        });

        if (isGlobal && allMatches.length > 0) {
            const contexts = allMatches.map(el => buildContext(el, scope));
            return { multiple: true, contexts };
        }

        // Lowered threshold to 0.05 to allow for looser matches in short CJK queries
        if (bestMatch && maxScore > 0.05) {
            return buildContext(bestMatch, scope);
        }

        return null;

        // Helper to build context (single)
        function buildContext(bestMatchEl, scopeMode) {
            // IF INLINE SCOPE: Do NOT expand. Return just the single element.
            if (scopeMode === 'inline') {
            return {
                    elements: [bestMatchEl],
                    element: bestMatchEl,
                    fullHtml: bestMatchEl.outerHTML,
                    snippet: bestMatchEl.innerText,
                    isInline: true
                };
            }

            // Context Expansion: Smart Block Detection
            
            let contextElements = [bestMatchEl];
            
            // Helper to check if an element acts as a header
            const isHeader = (el) => {
                const tag = el.tagName;
                if (['H1','H2','H3','H4','H5','H6'].includes(tag)) return true;
                
                // Heuristic: Short bold text or just short text followed by content might be a header
                const text = el.innerText.trim();
                
                // Refined Header Detection:
                // 1. Very short text (< 20 chars)
                // 2. Must NOT look like a list item (e.g. "1. xxx" or "• xxx") - hard to detect generally
                // 3. If it's a DIV, it's ambiguous. 
                
                if (text.length > 0 && text.length < 20) {
                     return true;
                }
                return false;
            };

            // Strategy:
            // 1. If bestMatch is a Header, we want to grab everything until the NEXT Header.
            // 2. If bestMatch is Content, we want to grab surrounding content + preceding header.

            const matchIsHeader = isHeader(bestMatchEl);
            let current = bestMatchEl;
            
            // BACKWARD EXPANSION
            // ... (keep existing) ...
            if (!matchIsHeader) {
                // Look back for a header or up to 3 siblings
                for (let i = 0; i < 5; i++) {
                    if (current.previousElementSibling) {
                        current = current.previousElementSibling;
                        contextElements.unshift(current);
                        if (isHeader(current)) {
                            // Found the header for this section, stop looking back
                            break;
                        }
                    } else {
                        break;
                    }
                }
            } else {
                // If match is header, maybe look back just 1 to see if there is a br or unrelated divider, 
                // but generally we start from the header.
            }

            // FORWARD EXPANSION
            // If header, capture until next header.
            // If content, capture neighbors.
            
            current = contextElements[contextElements.length - 1]; // Start from end of current selection
            
            // Safety limit
            // We reduced max siblings to avoid grabbing too much unrelated content if header detection fails slightly
            const MAX_SIBLINGS = matchIsHeader ? 60 : 15; 
            
            for (let i = 0; i < MAX_SIBLINGS; i++) {
                if (current.nextElementSibling) {
                    const next = current.nextElementSibling;
                    const nextIsHeader = isHeader(next);
                    
                    // Logic to detect "Section Break" vs "List Item"
                    
                    // Stop if we hit a Strong Header (H1-H6)
                    if (['H1','H2','H3','H4','H5','H6'].includes(next.tagName) && i > 0) break;

                    // For "Weak Headers" (Short DIVs):
                    // If we have collected enough items (e.g. > 10), and we see a potential header,
                    // we need to decide if it's a list item or a new section.
                    
                    // Heuristic: If the CURRENT item was also a "Weak Header" (short text), 
                    // and the NEXT item is also a "Weak Header", it is likely a LIST. Keep going.
                    const currentIsWeakHeader = current.innerText.trim().length < 30;
                    
                    if (nextIsHeader) {
                        // If we have a sequence of short items, keep going.
                        // Only stop if we break the pattern? 
                        // Actually, "Section Headers" are usually followed by "Long Content" or "Another List".
                        
                        // Let's use a simple buffer: allow up to 20 items in a list.
                        if (i > 20) {
                            break;
                        }
                    } 
                    
                    // If we see a "Long Paragraph" (> 100 chars), it's definitely content. Keep it.
                    // If we see a "Medium Paragraph" after a list, it might be the start of new section's text?
                    // No, usually Text follows Header.
                    
                    current = next;
                    contextElements.push(current);
                } else {
                    break;
                }
            }
            
            // Combine HTML and Text
            const fullHtml = contextElements.map(el => el.outerHTML).join('\n');
            const snippet = contextElements.map(el => el.innerText).join('\n');
            
            return {
                elements: contextElements, // Array of specific elements to replace
                element: bestMatchEl.parentElement, // Parent scope (kept for fallback)
                fullHtml: fullHtml,
                snippet: snippet,
                isInline: false
            };
        }

        return null;
    }

    // --- IME Composition Handling ---
    let isComposing = false;

    chatInput.addEventListener('compositionstart', () => {
        isComposing = true;
    });

    chatInput.addEventListener('compositionend', () => {
        isComposing = false;
    });

    sendChatBtn.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            handleChatSubmit();
        }
    });

    newChatBtn.addEventListener('click', () => {
        chatHistory.innerHTML = '';
        addChatMessage('ai', 'Hello! Please add your Gemini API Key in settings. Use Cmd+K to edit text.');
    });

    // --- Shared AI Edit Logic ---
    async function generateJsonDiffs(instruction, originalText, fileName, onLog) {
        const prompt = `
You are a Smart Editing Engine. 
Your task is to generate a JSON array of edits to transform the "Original Text" according to the "Instruction".

Instruction: "${instruction}"
Original Text: "${originalText}"
Context File: "${fileName}"

OUTPUT FORMAT:
[
  {"original": "exact substring from Original Text", "replacement": "new text"}
]

GUIDELINES:
1. **Whole Paragraph Replacement**: If the instruction is to "translate", "rewrite", or "summarize" a whole section, set "original" to the ENTIRE text of that specific paragraph (including HTML tags if needed) and "replacement" to the new version. Do NOT just replace individual words if the sentence structure needs to change.
2. **Precision**: The "original" field must match a substring in "Original Text" EXACTLY (case-sensitive, whitespace-sensitive).
3. **Safety**: Return '[]' if the instruction is unclear or no changes are needed.
4. **Format**: Output valid JSON only. No markdown formatting (no \`\`\`). No preamble.

CRITICAL:
- If translating, replace the whole sentence or paragraph, not just nouns.
- Example: If text is "<div>Hello world</div>" and instruction is "Translate to Spanish", output: [{"original": "<div>Hello world</div>", "replacement": "<div>Hola Mundo</div>"}] (or just the inner text if that's what matches).

BEGIN JSON OUTPUT:
`;
        
        console.log("Gemini Prompt:\n" + prompt);

        const response = await callGeminiAPI(prompt, onLog);
        
        console.log("Gemini Response:\n" + response);

        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const changes = JSON.parse(jsonStr);
                return Array.isArray(changes) ? changes : [changes];
            } else {
                throw new Error("No JSON array found");
            }
        } catch (e) {
            console.error("Failed to parse JSON", response);
            throw new Error("Could not generate valid diffs.");
        }
    }

    // --- Inline Edit Logic (Cmd+K) ---

    const closeInlineBtn = document.getElementById('close-inline-btn');

    function closeInlineModal() {
        inlineEditModal.classList.add('hidden');
        inlineInput.value = '';
        inlineInputWrapper.classList.remove('loading');

        // Remove highlight if exists
        if (activeHighlightSpan) {
            const parent = activeHighlightSpan.parentNode;
            if (parent) {
                while (activeHighlightSpan.firstChild) {
                    parent.insertBefore(activeHighlightSpan.firstChild, activeHighlightSpan);
                }
                parent.removeChild(activeHighlightSpan);
                parent.normalize(); // Merge text nodes
            }
            activeHighlightSpan = null;
        }
    }

    closeInlineBtn.addEventListener('click', closeInlineModal);

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                currentSelectionRange = selection.getRangeAt(0);

                // Apply Highlight
                try {
                    const span = document.createElement('span');
                    span.className = 'active-edit-highlight';
                    currentSelectionRange.surroundContents(span);
                    activeHighlightSpan = span;
                    // Adjust range to be inside the span for future edits
                    currentSelectionRange.selectNodeContents(span);
                    selection.removeAllRanges();
                    selection.addRange(currentSelectionRange);
                } catch (e) {
                    console.warn("Could not apply highlight:", e);
                }

                inlineEditModal.classList.remove('hidden');
                inlineInput.focus();
            } else {
                alert("Please select some text to edit.");
            }
        }

        if (e.key === 'Escape') {
            closeInlineModal();
            settingsModal.classList.add('hidden');
            fileModal.classList.add('hidden');
        }
    });

    inlineInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const instruction = inlineInput.value.trim();
            if (!instruction) return;

            if (apiKeys.length === 0) {
                alert('Please set API Keys first');
                return;
            }

            inlineInput.disabled = true;
            inlineInputWrapper.classList.add('loading');
            const originalPlaceholder = inlineInput.placeholder;
            inlineInput.placeholder = "Generating changes...";

            // Don't clear value yet so user sees what they typed while loading

            const container = document.createElement('div');
            container.appendChild(currentSelectionRange.cloneContents());
            const selectedText = container.innerText;
            const currentFile = files.find(f => f.id === activeFileId);

            try {
                // Use Rewrite strategy for Inline Modal too
                const newContent = await generateRewrite(instruction, selectedText, currentFile.name, 'inline', (msg) => {
                    console.log("Inline Edit Log:", msg);
                });
                
                // Apply directly to the selection
                if (currentSelectionRange) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(currentSelectionRange);
                    document.execCommand('insertHTML', false, newContent);
                }
                
                closeInlineModal();
            } catch (error) {
                alert('Failed: ' + error.message);
                inlineInput.disabled = false;
                inlineInputWrapper.classList.remove('loading');
                inlineInput.placeholder = originalPlaceholder;
                inlineInput.focus();
            }
        }
    });

    function applyJsonDiffs(changes, scope) {
        let targetHtml = "";
        let targetElement = editor;

        if (scope instanceof Range) {
            targetHtml = scope.toString();
        } else if (scope instanceof HTMLElement) {
            targetElement = scope;
            targetHtml = scope.innerHTML;
        } else {
            targetHtml = editor.innerHTML;
        }

        let newHtml = targetHtml;
        const wrapperIds = [];

        changes.forEach(change => {
            // Clean up newlines to prevent layout breaks
            const cleanOriginal = change.original.replace(/(\r\n|\n|\r)/gm, "");
            const cleanReplacement = change.replacement.replace(/(\r\n|\n|\r)/gm, "");

            const id = 'diff-' + Math.random().toString(36).substr(2, 9);
            wrapperIds.push(id);

            // Use a span with no spacing
            const diffHtml = `<span id="${id}" class="diff-wrapper"><span class="diff-del">${cleanOriginal}</span><span class="diff-add">${cleanReplacement}</span><span class="diff-controls"><button class="diff-btn accept" title="Accept"><i data-lucide="check"></i></button><button class="diff-btn reject" title="Reject"><i data-lucide="x"></i></button></span></span>`;

            const escapedOriginal = change.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            newHtml = newHtml.replace(new RegExp(escapedOriginal, 'g'), diffHtml);
        });

        if (scope instanceof Range) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(scope);
            document.execCommand('insertHTML', false, newHtml);
        } else if (scope instanceof HTMLElement) {
            scope.innerHTML = newHtml;
        } else {
            editor.innerHTML = newHtml;
        }

        lucide.createIcons();
        document.querySelectorAll('svg').forEach(svg => svg.removeAttribute('xmlns'));

        wrapperIds.forEach(id => {
            attachDiffListeners(id);
        });
    }

    function attachDiffListeners(wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        const acceptBtn = wrapper.querySelector('.accept');
        const rejectBtn = wrapper.querySelector('.reject');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                acceptDiff(wrapper);
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                rejectDiff(wrapper);
            });
        }
    }

    function acceptDiff(wrapper) {
        if (!wrapper.parentNode) return; // Already handled
        const replacement = wrapper.querySelector('.diff-add').innerText;
        const textNode = document.createTextNode(replacement);
        wrapper.parentNode.replaceChild(textNode, wrapper);
    }

    function rejectDiff(wrapper) {
        if (!wrapper.parentNode) return; // Already handled
        const original = wrapper.querySelector('.diff-del').innerText;
        const textNode = document.createTextNode(original);
        wrapper.parentNode.replaceChild(textNode, wrapper);
    }

    // --- Gemini API Helper with Failover ---
    async function callGeminiAPI(prompt, onLog) {
        let lastError = null;

        for (let i = 0; i < apiKeys.length; i++) {
            const key = apiKeys[i];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${key}`;

            const payload = {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || 'API request failed');
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;

            } catch (error) {
                lastError = error;
                const isLastKey = i === apiKeys.length - 1;

                if (onLog) {
                    onLog(`API Key ${i + 1} failed: ${error.message}. ${isLastKey ? 'No more keys.' : 'Switching to next key...'}`);
                }

                if (isLastKey) {
                    throw error;
                }
                // Continue to next key
            }
        }
        throw lastError || new Error("No API keys available");
    }
});
