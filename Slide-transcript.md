# Rosuc: AI-Powered Interactive Editor - Detailed Presentation Transcript

This transcript is designed for a professional technical presentation. It includes the spoken script for each slide, incorporating technical deep-dives into algorithms and problem-solving strategies.

---

## **Slide 1: Title Slide**
**(Speaker):** "Good morning everyone, we are BDA Group 20. Today, we are excited to introduce you to **Rosuc**, an AI-powered interactive editor.

Our subtitle, 'Non-Destructive, Context-Aware Document Editing,' really captures the essence of what we've built. And our tagline might sound a bit ambitious—'Better than Cursor, by design'—but as we go through the presentation, I hope to show you exactly why we believe our approach to *document* editing solves problems that even the best code editors overlook."

---

## **Slide 2: Problem Statement**
**(Speaker):** "Let's start with the problem. We've all used AI tools to write or edit text. But most existing solutions—whether it's pasting into ChatGPT or using tools like Notion AI—suffer from three critical flaws:

1.  **Blind Replacements:** The AI often just overwrites your text. You don't know what changed unless you compare it line by line.
2.  **Context Blindness:** Chatbots don't know where your cursor is or what the surrounding paragraphs say.
3.  **No Rollback:** Once the text is changed, it's often a destructive action.

Our goal with Rosuc was to build an editor where the AI is a **collaborative assistant**, not a black box that takes over your keyboard."

---

## **Slide 3: Key Capabilities Overview**
**(Speaker):** "Rosuc is built on two core interaction paradigms:

First, **Contextual Dialogue**. This is your standard chat interface, where you can ask questions about the document.

But the game-changer is our second paradigm: **Non-Destructive Editing**. Instead of silently changing your text, Rosuc generates changes and presents them in a side-by-side comparison. You, the human, are the gatekeeper. You decide what stays and what goes."

---

## **Slide 4: High-Level Architecture Diagram**
**(Speaker):** "Here is a high-level view of our architecture.

We have a three-panel layout: File Explorer on the left, a Rich Text Editor in the center, and the AI Sidebar on the right.

The real magic happens in the **4-Step Agentic Workflow** you see in the middle. It's a pipeline that runs entirely in the browser:
1.  **Analyze Intent:** What does the user want?
2.  **Context Find:** Where is the relevant text?
3.  **Rewrite:** Generate the new content using Gemini.
4.  **Apply & Visualize:** Show the difference to the user."

---

## **Slide 5: UI/UX Design Philosophy**
**(Speaker):** "We didn't just want it to work; we wanted it to feel modern. We used a **Glassmorphism** aesthetic with backdrop blurs and smooth transitions.

The center panel is a print-friendly, 800-pixel wide editor. And we've prioritized keyboard users with `Cmd+K` for inline editing, ensuring the workflow is fast and fluid."

---

## **Slide 6: Core Feature — Dual Sidebar Modes**
**(Speaker):** "To keep interactions clear, we split the sidebar into two distinct modes:

*   **Chat Mode:** For asking questions like 'Summarize this document.'
*   **Editor Mode:** For issuing commands like 'Make paragraph 2 more formal.'

We distinguish these visually with different icons and input placeholders, so the user always knows if they are *talking* to the AI or *directing* it."

---

## **Slide 7: The 4-Step Agentic Workflow**
**(Speaker):** "Let's dive into the technical core: the 4-Step Agentic Workflow.

This isn't just a simple API call.
First, we **Analyze** the user's instruction to extract keywords.
Second, we use a custom TF-IDF engine to **Search** the document for context.
Third, we send a surgical prompt to Gemini to **Rewrite** only the necessary parts.
Finally, we **Apply** the changes using DOM manipulation and show a visual diff.

Let's break down each step."

---

## **Slide 8: Step 1 — Intent Analysis (Deep Dive)**
**(Speaker):** "Step 1 is Intent Analysis. We pass the user's instruction to the LLM, but we don't ask it to write anything yet. We ask it to return a JSON object containing:
*   **Keywords:** What specific terms are we looking for?
*   **Scope:** Is this an 'inline' fix (like a typo) or a 'block' rewrite?
*   **isGlobal:** Does this apply to the whole document?

This step acts as a router, deciding how the rest of the pipeline behaves."

---

## **Slide 9: Step 2 — Context Retrieval (TF-IDF Engine)**
**(Speaker):** "Step 2 is Context Retrieval. Since we can't send a 100-page document to the LLM for every small edit, we implemented a client-side search engine.

We calculate the **TF-IDF (Term Frequency-Inverse Document Frequency)** scores for every paragraph in the editor. We then compute the **Cosine Similarity** between the user's keywords and the document's content. This allows us to mathematically pinpoint exactly which paragraph the user is talking about."

---

## **Slide 10: Challenge #1 — Search Scope & Selector Mechanics**
**(Speaker):** "Now, building this wasn't easy. Challenge #1 was the Search Scope.

Initially, our code only looked for standard tags like `<p>` or `<h1>`. But if a user pasted content into a generic `<div>`, the AI was blind to it. It simply couldn't 'see' the text.

We fixed this by rewriting our DOM traversal logic. Instead of a simple query selector, we now recursively check for **Direct Text Nodes**. This ensures that no matter how messy the HTML structure is—nested divs, spans, or blockquotes—Rosuc can index and find the text."

---

## **Slide 11: Challenge #2 — Tokenization & Scoring (The "Chinese" Problem)**
**(Speaker):** "Challenge #2 was arguably our biggest technical hurdle: **The Chinese Tokenization Problem**.

Standard search algorithms split text by spaces. This works for English, but Chinese has no spaces.
**The Failure:** Our initial regex treated an entire Chinese sentence as a *single word*. So if you searched for a specific term inside that sentence, the mathematical similarity was effectively zero.

**The Solution:** We built a hybrid tokenizer. It detects CJK characters using Unicode ranges and switches to a **character-level splitting strategy**. We also lowered our similarity threshold from 0.1 to 0.05 and added a scoring boost for exact substring matches. This instantly fixed search relevance for multilingual documents."

---

## **Slide 12: Challenge #3 — Context Blindness**
**(Speaker):** "Challenge #3 was Context Blindness. If you ask the AI to 'translate this,' and we only send 'this,' the AI fails because it lacks context.

We solved this with **Dynamic DOM Expansion**. We implemented a 'sliding window' algorithm that looks backward to find the nearest Header (to understand the topic) and looks forward to identify list patterns. We send this expanded context to the LLM, ensuring it understands the full picture before making edits."

---

## **Slide 13: Step 3 — Generative Rewrite**
**(Speaker):** "Step 3 is the Rewrite. We use Gemini 2.5 Flash Lite for speed.

Our prompt engineering strategy is what we call **'Surgical Editing'**. We explicitly instruct the model: 'Output ONLY the new HTML content. Do NOT use Markdown. Preserve the surrounding context.' This strict constraint ensures the output can be directly injected back into the DOM."

---

## **Slide 14: Challenge #4 — Edit Stability**
**(Speaker):** "Challenge #4: Edit Stability.
We initially tried a JSON search-and-replace approach.
**The Failure:** LLMs hallucinate. If the AI returned the 'original text' with even one missing comma or extra space, the Javascript string replacement would fail.

**The Solution:** We moved to a **Whole-Block Rewrite Strategy**. Instead of matching strings, we identify the target DOM node ID and replace its entire `outerHTML`. This bypasses the need for perfect string matching and raised our success rate from 60% to over 95%."

---

## **Slide 15: Step 4 — DOM Application & Visualization**
**(Speaker):** "Step 4 is Visualization. We have three modes:
*   **Inline:** For small typos, we use standard `<del>` and `<ins>` tags.
*   **Block:** For paragraph rewrites, we wrap the content in a custom container.
*   **Global:** For document-wide changes, we use yellow highlighting."

---

## **Slide 16: Visual Diff System (Inline Mode)**
**(Speaker):** "Here you can see our Inline Diff. It's intuitive: red strikethrough for deletions, green background for additions. This is standard, but crucial for trust."

---

## **Slide 17: Visual Diff System (Block Mode)**
**(Speaker):** "Block Mode is where we innovate. We created a UI wrapper that holds both the **New Content** (visible by default) and the **Original Content** (hidden). The user can toggle between them instantly. This allows for a 'try before you buy' experience that feels very safe."

---

## **Slide 18: Visual Diff System (Global Mode)**
**(Speaker):** "For Global Mode, we wrote a client-side diffing algorithm that compares the document structure element by element. It highlights modified blocks in yellow and adds an orange border, allowing users to scan through changes quickly before committing."

---

## **Slide 19: UI Interaction State Machine**
**(Speaker):** "To manage all this, we implemented a strict State Machine in the UI. You go from 'Show' to 'Review' to 'Keep or Undo'. This linear flow prevents users from breaking the document structure while an edit is pending."

---

## **Slide 20: Challenge #5 — User Trust & Verification**
**(Speaker):** "Challenge #5 was User Trust. Users are terrified of AI breaking their documents.
We solved this with **Multi-Layer Verification**:
1.  Chat buttons to undo.
2.  In-editor Check/Cross controls.
3.  A global undo stack.
We provide visual feedback at every step so the user never feels like they've lost control."

---

## **Slide 21: Cmd+K Inline Edit Feature**
**(Speaker):** "We also implemented the popular `Cmd+K` feature.
Technically, we use `document.execCommand('insertHTML')`. I know it's considered an old API, but it is still the only reliable way to handle text selection across multiple HTML tags while maintaining the browser's native Undo history."

---

## **Slide 22: API Integration & Resilience**
**(Speaker):** "For API resilience, we built a **Failover Mechanism**. You can input multiple API keys. If one hits a rate limit (Error 429), the system automatically catches the error and switches to the next key in the list. This ensures our demo—and your work—never gets interrupted."

---

## **Slide 23: Technology Stack Summary**
**(Speaker):** "Our stack is intentionally simple:
*   **Frontend:** Vanilla JavaScript. No React, no Vue.
*   **Editor:** `contenteditable`.
*   **AI:** Google Gemini API.
*   **Storage:** LocalStorage.
This keeps the app incredibly lightweight and fast."

---

## **Slide 24: Development Challenges Summary**
**(Speaker):** "To recap our journey:
We fought strict selectors, solved the Chinese tokenization problem, fixed context blindness, stabilized edit application with block rewrites, and built a trust-based UI. Each challenge pushed us to understand the DOM and LLMs deeper."

---

## **Slide 25: Key Differentiators vs. Cursor**
**(Speaker):** "So, why 'Better than Cursor'?
Cursor is great for code. But for **prose**, its diff system is just 'Tab to accept'.
Rosuc offers a rich, visual diff with explicit accept/reject controls. We handle multilingual tokenization natively. We are designed for writers, not just coders."

---

## **Slide 26: Future Roadmap**
**(Speaker):** "Looking ahead, we plan to add Streaming Responses for real-time feedback, collaborative editing via WebSockets, and export options to PDF and Markdown."

---

## **Slide 27: Live Demo Outline**
**(Speaker):** "In our demo today, we will show you:
1.  Creating a document.
2.  Chatting with it to understand context.
3.  Using Editor Mode to translate paragraphs.
4.  Using `Cmd+K` to polish sentences.
5.  And finally, a Global Edit to fix grammar."

---

## **Slide 28: Conclusion**
**(Speaker):** "In conclusion, Rosuc delivers AI-assisted editing with ultimate user control. We believe that **AI should augment human creativity, not replace human judgment.**"

---

## **Slide 29: Q&A**
**(Speaker):** "Thank you. We are happy to take any questions, especially regarding our technical implementation."
