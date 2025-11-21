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
    let apiKey = localStorage.getItem('gemini_api_key') || '';
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

    // --- Initialization ---
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }
    renderFileList();

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
        apiKeyInput.value = apiKey;
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('gemini_api_key', apiKey);
        settingsModal.classList.add('hidden');
        addChatMessage('ai', 'API Key saved! I am ready to help.');
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

        if (!apiKey) {
            addChatMessage('ai', 'Please set your Gemini API Key in settings first.');
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
                const response = await callGeminiAPI(prompt);
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
            chatInput.placeholder = "Applying edits...";
            sendChatBtn.disabled = true;

            const thinkingMsg = addChatMessage('ai', 'Scanning document...');

            const targetText = editor.innerText;
            const currentFile = files.find(f => f.id === activeFileId);

            try {
                const changes = await generateJsonDiffs(text, targetText, currentFile.name);
                applyJsonDiffs(changes, null);
                chatHistory.removeChild(thinkingMsg);
                addChatMessage('ai', `Applied ${changes.length} edits.`);
            } catch (error) {
                chatHistory.removeChild(thinkingMsg);
                addChatMessage('ai', `Editor Error: ${error.message}`);
            } finally {
                chatInput.disabled = false;
                chatInput.placeholder = originalPlaceholder;
                sendChatBtn.disabled = false;
                chatInput.focus();
            }
        }
    }

    sendChatBtn.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
        }
    });

    newChatBtn.addEventListener('click', () => {
        chatHistory.innerHTML = '';
        addChatMessage('ai', 'Hello! Please add your Gemini API Key in settings. Use Cmd+K to edit text.');
    });

    // --- Shared AI Edit Logic ---
    async function generateJsonDiffs(instruction, originalText, fileName) {
        const prompt = `
You are a JSON Data Extraction Engine. You are NOT a chatbot.
Your task is to compare the "Original Text" with the "Instruction" and output a JSON array of changes.

Instruction: "${instruction}"
Original Text: "${originalText}"
Context File: "${fileName}"

OUTPUT FORMAT:
[
  {"original": "exact substring to replace", "replacement": "new text"}
]

CRITICAL RULES:
1. Output MUST start with '[' and end with ']'.
2. Do NOT write "Here is the JSON" or "I have updated the text".
3. Do NOT use markdown code blocks.
4. If no changes are needed, output [].
5. The "original" text must match the input EXACTLY (case-sensitive).
6. Do NOT include newlines in the "original" or "replacement" fields unless strictly necessary. Keep them as single-line strings if possible to avoid breaking HTML layout.

BEGIN JSON OUTPUT:
`;
        const response = await callGeminiAPI(prompt);

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

            if (!apiKey) {
                alert('Please set API Key first');
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
                const changes = await generateJsonDiffs(instruction, selectedText, currentFile.name);
                applyJsonDiffs(changes, currentSelectionRange);
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

    function applyJsonDiffs(changes, range) {
        let targetHtml = "";
        if (range) {
            targetHtml = range.toString();
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

        if (range) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('insertHTML', false, newHtml);
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
        const replacement = wrapper.querySelector('.diff-add').innerText;
        const textNode = document.createTextNode(replacement);
        wrapper.parentNode.replaceChild(textNode, wrapper);
    }

    function rejectDiff(wrapper) {
        const original = wrapper.querySelector('.diff-del').innerText;
        const textNode = document.createTextNode(original);
        wrapper.parentNode.replaceChild(textNode, wrapper);
    }

    // --- Gemini API Helper ---
    async function callGeminiAPI(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

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
    }
});
