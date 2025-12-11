# Development Process & Implemented Technologies

## 1. Development Process & Challenges

### Phase 1: Context Retrieval (Search)
- **Initial Approach:** Simple keyword matching.
- **Challenge:** Failed to capture semantic meaning or handle typos.
- **Evolution:** Implemented **TF-IDF (Term Frequency-Inverse Document Frequency)** with **Cosine Similarity**.
- **CJK Tokenization Issue:** Standard space-based tokenization failed for Chinese/Japanese.
- **Solution:** Hybrid Tokenizer.
    - Latin/Numbers: Split by word boundaries.
    - CJK: Split by individual characters (`[\p{Script=Han}...]`).
    - **Scoring Boost:** Added specific weight bonuses for contiguous phrase matches to prioritize exact substring hits over scattered keywords.

### Phase 2: Context Expansion (The "Smart Block")
- **Challenge:** LLM often received only the target sentence, lacking context (e.g., "Translate this" without knowing what "this" refers to).
- **Solution:** **Dynamic DOM Expansion Logic**.
    - **Header Detection:** Identify "owning" headers (H1-H6 or short text nodes < 20 chars).
    - **Backward Expansion:** Look back up to 5 siblings to find the context header.
    - **Forward Expansion:** Capture siblings until the next strong header.
    - **List Pattern Recognition:** Heuristic to detect if siblings are part of a list (prevent cutting off long lists after 15 items).

### Phase 3: Edit Stability & Application
- **Initial Approach:** JSON Search & Replace (`original` -> `replacement`).
- **Failure Mode:** Fragile. If LLM hallucinated a single character in `original` or if HTML whitespace differed, the replace failed.
- **Solution:** **Whole-Block Rewrite Strategy**.
    - Instead of string replacement, we swap the entire DOM node (`outerHTML`).
    - **Prompt Engineering:** "Surgical Editing". Explicit instructions to PRESERVE surrounding context and only modify the target.

### Phase 4: UI/UX & Visualization
- **Challenge:** User couldn't see what changed or verify edits safely.
- **Solution A (Inline):** Visual Diff.
    - Render deleted text with `text-decoration: line-through` (Red).
    - Render new text with Green highlight.
    - **Interaction:** Chat UI buttons **[Show]** (Scrolls to location) -> **[Undo] / [Keep]**.
- **Solution B (Block):** Wrapper UI.
    - Wrap changed blocks in a `.diff-block-wrapper`.
    - Hidden `.diff-content-original` stored for rejection.
- **Solution C (Global):** Highlighter Mode.
    - For "Replace All" commands, we compare the entire DOM structure.
    - Client-side Diffing: Iterate through block elements, compare `innerText`.
    - Apply "Highlighter" style (Yellow background, Orange border) to changed elements.

---

## 2. Currently Implemented Technologies

### Core Architecture: Agentic Workflow
The system operates on a 4-step Agentic Workflow triggered by natural language instructions.

#### Step 1: Intent Analysis (`analyzeRequest`)
- **LLM Classifier:** Analyzes user prompt to extract:
    - `keywords`: For search.
    - `scope`: `'inline'` vs `'block'`.
    - `isGlobal`: Boolean flag for "Replace All" / "Whole Document" commands.
- **Fallback Logic:** Regex-based detection for "all/every/全部" if LLM JSON parsing fails.

#### Step 2: Context Retrieval (`findRelevantContext`)
- **Engine:** Custom JavaScript implementation of Vector Space Model (TF-IDF).
- **Global Mode:** If `isGlobal` is true, bypasses search and selects the entire document body.
- **Block Mode:** Returns an expanded context object containing:
    - `elements`: Array of DOM nodes to be replaced.
    - `fullHtml`: Combined outerHTML of the expansion.
    - `snippet`: Plain text representation.

#### Step 3: Generative Rewrite (`generateRewrite`)
- **Model:** Gemini 1.5 Flash.
- **Prompt Strategy:**
    - **Role:** "Smart Editing Engine".
    - **Constraints:** Output **ONLY** valid HTML. No Markdown formatting.
    - **Preservation Protocol:** Explicit instruction to keep non-target context verbatim.
    - **Input:** Receives `(Context + Target)`.

#### Step 4: DOM Application & Visualization

| Mode | Strategy | Visual Feedback | Action Logic |
| :--- | :--- | :--- | :--- |
| **Inline** | Direct `innerHTML` injection of Diff HTML. | `<del>` (Old) + `<ins>` (New) inside a wrapper. | **Undo:** Restore original HTML.<br>**Keep:** Remove `<del>` tags. |
| **Block** | Node Replacement (`parentNode.replaceChild`). | `.diff-block-wrapper` container with `highlight-pulse` animation. | **Undo:** Restore `data-originalHtml`.<br>**Keep:** Unwrap and keep new content. |
| **Global** | Full Document processing + Client-side Diff. | Iterative comparison of block elements. Changes marked with `.global-highlight-change` (Yellow Marker). | **Undo All:** Revert `editor.innerHTML`.<br>**Keep All:** Remove highlight classes. |

### UI Interaction State Machine
To ensure user verification, the Chat UI follows a strict state flow:
1.  **Initial:** Shows **[Show]** button.
2.  **Action:** User clicks **[Show]**.
    - Viewport smooth-scrolls to the target element.
    - Element flashes/pulses.
    - (If Block) Hidden original text is revealed for comparison.
3.  **Decision:** Button transforms into **[Undo]** (Danger/Red) and **[Keep]** (Primary/Green).

### Cmd+K (Toolbar) Integration
- **Unified Engine:** Refactored to use the same `generateRewrite` logic as the Chat Agent to ensure consistency.
- **Method:** Uses `document.execCommand('insertHTML')` for robust handling of range selections across tag boundaries.
