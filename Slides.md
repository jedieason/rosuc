I'll read through all the code files and documentation to understand the project thoroughly before creating the presentation outline.

[3 tools called]

Let me also check if there's a CSS file to understand the visual design better:

[1 tool called]

Now I have a comprehensive understanding of the Rosuc project. Let me create a detailed presentation outline.

---

# **Rosuc: AI-Powered Interactive Editor**
## Presentation Outline

---

## **Slide 1: Title Slide**
- **Title:** Rosuc — AI-Powered Interactive Editor
- **Subtitle:** "Non-Destructive, Context-Aware Document Editing"
- **Team:** BDA Group 20
- **Tagline:** "Better than Cursor — by design."

---

## **Slide 2: Problem Statement**
- Traditional editors lack intelligent assistance
- Existing AI editors suffer from:
  - **Blind replacements** — AI overwrites content without user verification
  - **Context blindness** — AI doesn't understand document structure
  - **No rollback** — Changes are permanent and risky
- **Our Goal:** Build an editor where AI is a collaborative assistant, not a black box

---

## **Slide 3: Key Capabilities Overview**

### Two Core Interaction Paradigms:

| Paradigm | Description |
|----------|-------------|
| **Contextual Dialogue** | Chat interface for Q&A about the document; maintains conversation history |
| **Non-Destructive Editing** | AI generates changes shown in side-by-side comparison; user accepts/rejects instantly |

---

## **Slide 4: High-Level Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                        Rosuc Application                        │
├────────────────┬────────────────────────┬───────────────────────┤
│   File Explorer│      Rich Text Editor  │    AI Sidebar         │
│   (Left Panel) │      (contenteditable) │  (Chat / Editor Mode) │
├────────────────┴────────────────────────┴───────────────────────┤
│                    4-Step Agentic Workflow                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Analyze  │→ │ Context Find │→ │ Rewrite   │→ │ Apply +    │  │
│  │ Intent   │  │ (TF-IDF)     │  │ (Gemini)  │  │ Visualize  │  │
│  └──────────┘  └──────────────┘  └───────────┘  └────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                Gemini API (with Failover Support)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## **Slide 5: UI/UX Design Philosophy**
- **Glassmorphism** aesthetic with backdrop blur
- **Three-panel layout:**
  - Left: File Explorer (multi-document support)
  - Center: WYSIWYG Editor (800px max-width, print-friendly)
  - Right: AI Sidebar (Mode toggle: Chat vs. Editor)
- **Modern touches:** Lucide icons, Inter font, smooth animations (`cubic-bezier` transitions)
- **Keyboard-first:** `Cmd+K` for inline editing, `Esc` to cancel

---

## **Slide 6: Core Feature — Dual Sidebar Modes**

| Mode | Purpose | Input Placeholder | Icon |
|------|---------|-------------------|------|
| **Chat Mode** | Q&A about document content | "Ask a question..." | Send |
| **Editor Mode** | Issue editing commands | "Type instructions..." | Zap ⚡ |

- Seamless toggle with visual feedback (blue tint for Editor mode)
- Same input area, different behavior

---

## **Slide 7: The 4-Step Agentic Workflow**

```
User Instruction
       │
       ▼
┌─────────────────┐
│  Step 1: Analyze│  LLM extracts: keywords, scope, isGlobal
│    (Intent)     │  Fallback: Regex for "all/every/全部"
└────────┬────────┘
         ▼
┌─────────────────┐
│  Step 2: Search │  TF-IDF + Cosine Similarity
│   (Context)     │  CJK-aware tokenization
└────────┬────────┘
         ▼
┌─────────────────┐
│  Step 3: Rewrite│  Gemini 1.5/2.5 Flash
│   (Generate)    │  "Surgical Editing" prompt
└────────┬────────┘
         ▼
┌─────────────────┐
│  Step 4: Apply  │  DOM manipulation + Visual Diff
│  (Visualize)    │  [Show] → [Undo] / [Keep]
└─────────────────┘
```

---

## **Slide 8: Step 1 — Intent Analysis (Deep Dive)**

**Function:** `analyzeRequest(instruction)`

**LLM Output Schema:**
```json
{
  "keywords": "string",
  "scope": "inline" | "block",
  "isGlobal": boolean
}
```

**Scope Definitions:**
- `inline`: Word/phrase replacement, typos, small translations
- `block`: Sentence/paragraph rewrites, structural changes

**Global Detection Triggers:**
- English: "all", "every", "whole document"
- Chinese: "全部", "所有", "整篇"

**Fallback:** Regex-based detection if JSON parsing fails

---

## **Slide 9: Step 2 — Context Retrieval (TF-IDF Engine)**

**Function:** `findRelevantContext(keywords, scope, isGlobal)`

### Algorithm:
1. **Tokenization** (Hybrid approach)
   - Latin/Numbers: Word boundary split (`[a-z0-9]+`)
   - CJK Characters: Individual character split (`[\p{Script=Han}...]`)

2. **TF-IDF Scoring**
   - Calculate term frequency vectors for query and each DOM element
   - Compute Cosine Similarity

3. **Scoring Boosts**
   - +1.0 for exact substring match
   - +0.5 for partial phrase match (>50% query found)

4. **Threshold:** Score > 0.05 considered a match

---

## **Slide 10: Challenge #1 — Search Scope & Selector Mechanics**

### Problem 1: Strict Selectors
- **Initial Code:** `editor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre')`
- **Issue:** The DOM search ignored content inside `div`, `span`, or direct text nodes.
- **Impact:** User content wrapped in generic containers was "invisible" to the AI.
- **Fix:** Expanded selector list + logic to check for direct text node children.

### Problem 2: AI Keyword Dependency
- **Workflow:** `analyzeRequest` → Keywords → Search
- **Issue:** If Gemini returned generic keywords (e.g., "text", "paragraph"), the TF-IDF search found 0 relevant matches.
- **Risk:** High dependency on the quality of the "Intent Analysis" step.

---

## **Slide 11: Challenge #2 — Tokenization & Scoring (The "Chinese" Problem)**

### Problem: Bad Tokenization Regex
- **Original Code:**
  ```javascript
  const tokenize = (text) => {
      return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => w.length > 1);
  };
  ```
- **Failure Mode:** Treated entire Chinese sentences as a **single token**.
  - Example: "這是一段測試文字" → `["這是一段測試文字"]`
- **Result:** Cosine Similarity ≈ 0 because the query token never matched the document token exactly.

### Problem: Threshold Sensitivity
- **Original Logic:** `if (bestMatch && maxScore > 0.1)`
- **Why 0.1 was too high:**
  - **Short Queries:** Short keyword matches (especially single CJK characters) often produce low cosine similarity scores (e.g., 0.08) despite being exact matches.
  - **Result:** Valid matches were ignored (False Negatives), leading to "No relevant context found" errors.
- **Why lowering it matters:**
  - **New Threshold:** Adjusted to `0.05` to capture partial matches.
  - **Trade-off:** Lower threshold increased noise, requiring the **Scoring Boost** logic (+1.0 for exact substrings) to filter relevant results.

### Problem: Scoring Imbalance
- **Missing IDF:** Initial system only calculated TF (Term Frequency). Common words (e.g., "the", "is") had equal weight to unique keywords.

---

## **Slide 12: Challenge #3 — Context Blindness**

### Problem:
- LLM received only the target sentence
- "Translate this" without knowing what "this" refers to
- Missing surrounding context led to poor rewrites

### Solution: Dynamic DOM Expansion Logic

**Header Detection:**
- Formal headers: `H1`-`H6`
- Heuristic headers: Text nodes < 20 characters

**Expansion Strategy:**
```
◀── Backward: Up to 5 siblings until header found
Target Element
──▶ Forward: Until next strong header (H1-H6)
    └── List Pattern Recognition: Allow up to 20 items
```

---

## **Slide 13: Step 3 — Generative Rewrite**

**Function:** `generateRewrite(instruction, originalText, fileName, scope)`

**Model:** Gemini 2.5 Flash Lite (configurable)

**Prompt Strategy ("Surgical Editing"):**
```
You are a Smart Editing Engine.
Instruction: "${instruction}"
Context File: "${fileName}"

Original Text (Context + Target):
${originalText}

TASK:
- Target Focus: Identify specific section to change
- Preservation: Keep non-target context EXACTLY as-is
- OUTPUT ONLY THE NEW HTML CONTENT. NO MARKDOWN.
```

**Scope-Specific Guidelines:**
- `inline`: "ONLY change the specific word/phrase"
- `block`: "Maintain original HTML structure"

---

## **Slide 14: Challenge #4 — Edit Stability**

### Problem: JSON Search & Replace Approach
```json
{"original": "Hello world", "replacement": "Hello World"}
```
**Failure Modes:**
- LLM hallucinated characters in `original`
- HTML whitespace differences
- Partial matches breaking document structure

### Solution: Whole-Block Rewrite Strategy

Instead of string replacement:
1. Identify target DOM node(s)
2. Request complete rewrite of the block
3. Swap entire `outerHTML`
4. Explicit prompt: "PRESERVE surrounding context"

**Result:** 95%+ successful edit application rate

---

## **Slide 15: Step 4 — DOM Application & Visualization**

### Three Edit Modes:

| Mode | Strategy | Visual Feedback |
|------|----------|-----------------|
| **Inline** | `innerHTML` injection | `<del>Old</del>` + `<ins>New</ins>` |
| **Block** | `parentNode.replaceChild()` | `.diff-block-wrapper` with pulse animation |
| **Global** | Full document replace + diff | Yellow highlight (`.global-highlight-change`) |

---

## **Slide 16: Visual Diff System (Inline Mode)**

```html
<span class="inline-diff-container">
  <span class="diff-del" style="background:#ffebee; text-decoration:line-through;">
    Original Text
  </span>
  <span class="diff-add" style="background:#ecfdf5; color:#047857;">
    New Text
  </span>
</span>
```

**Color Scheme:**
- Deleted: Red background (`#ffebee`), strikethrough
- Added: Green background (`#ecfdf5`)

---

## **Slide 17: Visual Diff System (Block Mode)**

```
┌─────────────────────────────────────────┐
│  [✓] [✗]                    ← Actions   │
├─────────────────────────────────────────┤
│                                         │
│  New Content (Visible)                  │
│                                         │
├─────────────────────────────────────────┤
│  Original (Hidden until "Show")         │
│  Red background, dashed border          │
└─────────────────────────────────────────┘
```

**Stored Data:** `wrapperDiv.dataset.originalHtml` for rejection

---

## **Slide 18: Visual Diff System (Global Mode)**

**Client-Side Diffing Algorithm:**
1. Parse old and new HTML into temporary `<div>` elements
2. Query all block elements (`p, h1-h6, li, div`)
3. Compare `innerText.trim()` element-by-element
4. Apply highlight styles to changed elements:
   ```css
   background-color: #fef3c7;  /* Yellow */
   border-left: 3px solid #f59e0b;  /* Orange */
   ```

**Bulk Actions:** "Undo All" / "Keep All" buttons

---

## **Slide 19: UI Interaction State Machine**

```
[Initial State]
      │
      ▼
  ┌───────┐
  │ Show  │ ──Click──▶ Scroll to element
  └───────┘            Flash animation
      │                Reveal original (if block)
      ▼
  ┌───────┬───────┐
  │ Undo  │ Keep  │
  │ (Red) │(Green)│
  └───────┴───────┘
      │       │
      ▼       ▼
  Restore   Remove
  Original  Diff Markers
```

---

## **Slide 20: Challenge #5 — User Trust & Verification**

### Problem:
- Users couldn't see what changed
- No safe way to verify edits before committing
- Fear of AI "breaking" their document

### Solution: Multi-Layer Verification

1. **Chat UI Buttons:** [Show] → [Undo] / [Keep]
2. **In-Editor Controls:** Accept (✓) / Reject (✗) on wrappers
3. **Global Undo:** Full `editor.innerHTML` backup
4. **Visual Feedback:** Pulse animations, color-coded diffs

---

## **Slide 21: Cmd+K Inline Edit Feature**

**Trigger:** `Cmd+K` (Mac) / `Ctrl+K` (Windows) with text selected

**Flow:**
1. Selection highlighted with blue background
2. Modal appears: "Edit selection... (e.g., 'Make it shorter')"
3. User types instruction, presses Enter
4. AI rewrites, applies via `document.execCommand('insertHTML')`

**Why `execCommand`?**
- Handles range selections across tag boundaries
- Maintains undo/redo stack
- Browser-native reliability

---

## **Slide 22: API Integration & Resilience**

**Gemini API with Failover:**

```javascript
async function callGeminiAPI(prompt, onLog) {
    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const response = await fetch(url, { ... });
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            onLog(`API Key ${i + 1} failed. Switching...`);
            // Continue to next key
        }
    }
    throw lastError;
}
```

**Features:**
- Multiple API keys (one per line in settings)
- Automatic failover on 429/quota errors
- Model selection: Flash Lite → Flash → Pro

---

## **Slide 23: Technology Stack Summary**

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla JavaScript (no framework) |
| **Editor** | `contenteditable` + `execCommand` API |
| **Styling** | CSS Variables, Glassmorphism, CSS Animations |
| **Icons** | Lucide (SVG icon library) |
| **Fonts** | Inter (UI), JetBrains Mono (code), Times New Roman (editor) |
| **AI Backend** | Google Gemini API (REST) |
| **Storage** | `localStorage` (API keys, files) |

---

## **Slide 24: Development Challenges Summary**

| Phase | Challenge | Solution |
|-------|-----------|----------|
| 1 | Strict Selectors & Keyword AI | Expanded Selectors & Fallbacks |
| 2 | CJK Tokenization & No IDF | Hybrid Tokenizer + Heuristic Scoring |
| 3 | LLM Context Blindness | Dynamic DOM Expansion |
| 4 | JSON Search/Replace Fragility | Whole-Block Rewrite Strategy |
| 5 | User Verification | Visual Diff + State Machine UI |

---

## **Slide 25: Key Differentiators vs. Cursor**

| Feature | Cursor | Rosuc |
|---------|--------|-------|
| Edit Preview | Tab to accept | Side-by-side diff with Undo |
| Multilingual | English-focused | CJK-native tokenization |
| Context Expansion | File-level | Smart block detection |
| Verification | Trust AI | Visual confirmation required |
| Deployment | Desktop app | Browser-based (portable) |

---

## **Slide 26: Future Roadmap**
- **Streaming responses** for real-time feedback
- **Collaborative editing** (WebSocket sync)
- **Plugin system** for custom AI providers
- **Export options** (PDF, Markdown, DOCX)
- **Version history** with diff timeline

---

## **Slide 27: Live Demo Outline**
1. Create a new document
2. Write sample content (English + Chinese)
3. **Chat Mode:** Ask "What is this document about?"
4. **Editor Mode:** "Translate the second paragraph to English"
5. Click [Show] → Review diff → [Keep]
6. **Cmd+K:** Select text → "Make it more formal"
7. **Global Edit:** "Fix all grammar errors"

---

## **Slide 28: Conclusion**
- **Rosuc** delivers AI-assisted editing with **user control**
- Non-destructive workflow ensures **safe experimentation**
- Multilingual support makes it **globally accessible**
- Clean, modern UI provides **professional experience**

**"AI should augment human creativity, not replace human judgment."**

---

## **Slide 29: Q&A**
- Questions?
- Technical deep-dives available on request

---

This outline covers all aspects of the Rosuc project with appropriate technical depth while maintaining presentation flow. Each slide is focused on a single concept to avoid information overload.