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

    // State
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let currentSelectionRange = null;
    let sidebarMode = 'chat'; // 'chat' or 'editor'

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
            el.addEventListener('click', () => switchFile(file.id));
            fileList.appendChild(el);
        });
        lucide.createIcons();
    }

    function switchFile(id) {
        // Save current
        const currentFile = files.find(f => f.id === activeFileId);
        if (currentFile) {
            currentFile.content = editor.innerHTML;
        }

        // Load new
        activeFileId = id;
        const newFile = files.find(f => f.id === activeFileId);
        editor.innerHTML = newFile.content;

        renderFileList();
    }

    newFileBtn.addEventListener('click', () => {
        const name = prompt("File Name:", "New Draft");
        if (name) {
            const newId = 'file-' + Date.now();
            files.push({ id: newId, name: name, content: '<h1>' + name + '</h1><p>Start writing...</p>' });
            switchFile(newId);
        }
    });

    // Auto-save current file content to state on input
    editor.addEventListener('input', () => {
        const currentFile = files.find(f => f.id === activeFileId);
        if (currentFile) {
            currentFile.content = editor.innerHTML;
        }
    });

    // --- Rich Text Formatting ---
    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
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

    // --- Chat Logic ---
    function addChatMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerText = text;

        msgDiv.appendChild(contentDiv);
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
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

            const globalContext = getGlobalContext();
            const prompt = `You are a helpful writing assistant with access to the user's entire project.
            
Project Context:
${globalContext}

User Question: ${text}

IMPORTANT:
If the user is asking to edit text, remind them they can switch to "Editor" mode or use Cmd+K.
Answer their question conversationally.`;

            try {
                const response = await callGeminiAPI(prompt);
                addChatMessage('ai', response);
            } catch (error) {
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

            // Target: Entire Document (innerText to be safe for prompt, but we apply to HTML)
            // Note: This is a simplification. Ideally we'd use the HTML, but the JSON prompt works best with text.
            // We will send innerText and hope the replace works on the HTML.
            const targetText = editor.innerText;
            const currentFile = files.find(f => f.id === activeFileId);

            try {
                const changes = await generateJsonDiffs(text, targetText, currentFile.name);
                applyJsonDiffs(changes, null); // null range means apply to whole doc (sort of)
                addChatMessage('ai', `Applied ${changes.length} edits.`);
            } catch (error) {
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

BEGIN JSON OUTPUT:
`;
        const response = await callGeminiAPI(prompt);

        // Parse JSON with Regex Extraction
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
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                currentSelectionRange = selection.getRangeAt(0);
                inlineEditModal.classList.remove('hidden');
                inlineInput.focus();
            } else {
                alert("Please select some text to edit.");
            }
        }

        if (e.key === 'Escape') {
            inlineEditModal.classList.add('hidden');
            settingsModal.classList.add('hidden');
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
            inlineInput.value = "";

            const container = document.createElement('div');
            container.appendChild(currentSelectionRange.cloneContents());
            const selectedText = container.innerText;
            const currentFile = files.find(f => f.id === activeFileId);

            try {
                const changes = await generateJsonDiffs(instruction, selectedText, currentFile.name);
                inlineEditModal.classList.add('hidden');
                applyJsonDiffs(changes, currentSelectionRange);
            } catch (error) {
                alert('Failed: ' + error.message);
            } finally {
                inlineInput.disabled = false;
                inlineInputWrapper.classList.remove('loading');
                inlineInput.placeholder = originalPlaceholder;
                inlineInput.focus();
            }
        }
    });

    function applyJsonDiffs(changes, range) {
        // If range is null, we are in Editor Mode (Global Replace)
        // If range is set, we are in Inline Mode (Scoped Replace)

        let targetHtml = "";
        if (range) {
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            targetHtml = container.innerHTML; // Use innerHTML to preserve structure if possible? 
            // Actually, for text replacements, we usually work on text. 
            // But let's stick to the previous working logic:
            // The previous logic used `container.innerText` for the prompt, but `newHtml.replace` on the string.
            // Wait, `range.cloneContents()` returns a fragment. `container.innerText` gets text.
            // If we want to replace back into the document, we need to be careful.

            // SIMPLIFICATION: For this prototype, we will treat the target as a string.
            // If it's global, we take editor.innerHTML.
            // If it's local, we take the range's text.

            // Re-reading previous logic:
            // `const container = document.createElement('div'); container.appendChild(currentSelectionRange.cloneContents()); const selectedText = container.innerText;`
            // `let newHtml = originalFullText;` (which was passed as selectedText)
            // `document.execCommand('insertHTML', false, newHtml);`

            // So previously, we were replacing the SELECTION with new HTML.
            targetHtml = range.toString(); // Text only
        } else {
            targetHtml = editor.innerHTML;
        }

        let newHtml = targetHtml;
        const wrapperIds = [];

        changes.forEach(change => {
            const id = 'diff-' + Math.random().toString(36).substr(2, 9);
            wrapperIds.push(id);

            const diffHtml = `
<span id="${id}" class="diff-wrapper">
<span class="diff-del">${change.original}</span>
<span class="diff-add">${change.replacement}</span>
<span class="diff-controls">
<button class="diff-btn accept" title="Accept"><i data-lucide="check"></i></button>
<button class="diff-btn reject" title="Reject"><i data-lucide="x"></i></button>
</span>
</span>`;

            const escapedOriginal = change.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Global replace to fix all occurrences
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

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
