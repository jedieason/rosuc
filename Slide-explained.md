# Rosuc 簡報詳細解說 (Slide-explained) - 深度技術版

這份文檔是對 `Slides.md` 簡報大綱的詳細逐頁解說，特別針對**技術挑戰**與**演算法細節**進行了深度展開，適合在演講時展現技術深度。

---

## **Part 1: 專案定位與痛點 (Slides 1-3)**

### **Slide 1: Title Slide (標題)**
*   **核心訊息:** Rosuc 是一個「非破壞性 (Non-Destructive)」、「具備上下文感知 (Context-Aware)」的編輯器。
*   **Slogan:** "Better than Cursor — by design." 這句話暗示我們針對 Cursor 在處理「純文本」時的不足（如缺乏對應的 Diff 視圖）進行了優化。

### **Slide 2: Problem Statement (問題陳述)**
*   **現狀問題:**
    *   **Blind replacements (盲目覆蓋):** 大多數 AI 工具（如 Notion AI）生成的內容會直接取代原文。用戶必須肉眼比對才能知道 AI 到底改了哪個詞，這在大篇幅修改時非常危險。
    *   **Context blindness (上下文盲區):** 簡單的 Chatbot 不知道你現在游標在哪裡，也不知道文章結構。
*   **Rosuc 的解法:** 打造一個「協作型」助手。AI 的修改只是「建議 (Suggestion)」，必須由用戶「批准 (Commit)」。

### **Slide 3: Key Capabilities (核心能力)**
*   **Contextual Dialogue:** 像跟人聊天一樣，針對文檔內容提問（RAG 應用）。
*   **Non-Destructive Editing:** 這是核心。所有的修改都以「並排對照」或「差異標記」呈現，保留原文直到用戶確認。

---

## **Part 2: 架構與 UI 設計 (Slides 4-6)**

### **Slide 4: High-Level Architecture (架構圖)**
*   **核心引擎 (4-Step Agentic Workflow):** 這是邏輯核心。
    1.  **Analyze:** 意圖識別（改哪裡？怎麼改？）。
    2.  **Context Find:** 使用 TF-IDF 演算法定位 DOM 節點。
    3.  **Rewrite:** LLM 生成 HTML。
    4.  **Apply:** DOM 操作與 Diff 渲染。

### **Slide 5: UI/UX Design Philosophy**
*   **重點:** 強調 **Glassmorphism (玻璃擬態)** 與 **無框架 (Vanilla JS)** 的極致效能。

### **Slide 6: Dual Sidebar Modes**
*   **Chat vs. Editor:** 區分「問問題」與「下指令」。這是為了讓 LLM 的 System Prompt 能更專注（Chat Mode 專注回答，Editor Mode 專注輸出 HTML）。

---

## **Part 3: 技術深究 - 遇到的坑與解決方案 (Slides 10-14)**

**這裡是最需要詳細講解的部分，展示我們如何解決實際工程問題。**

### **Slide 10: Challenge #1 — Search Scope & Selectors (搜尋範圍與選擇器)**

*   **初始做法 (The Naive Approach):**
    *   我們最初的代碼只選取了標準文本標籤：`document.querySelectorAll('p, h1, h2, h3, li')`。
*   **遇到的坑 (The Failure):**
    *   **場景:** 用戶從其他網站複製內容進來，或者手動打字在一個 `<div>` 裡。
    *   **結果:** 因為 `<div>` 不在選擇器列表裡，對 TF-IDF 引擎來說，這些文字是「隱形」的。AI 會說「我找不到相關內容」，即使文字就在眼前。
    *   **副作用:** 如果我們簡單粗暴地加入 `div`，會導致 **重複選取 (Double Counting)**。例如 `<div id="parent"><p>Text</p></div>`，搜尋引擎會把這段文字算兩次（一次在 div，一次在 p），導致權重計算錯誤。
*   **解決方案 (The Fix):**
    1.  **擴大白名單:** 加入 `div`, `blockquote`, `pre`, `span`。
    2.  **遞迴檢查 (Text Node Logic):** 演算法修改為「只索引包含直接文字節點 (Direct Text Node) 的元素」。如果一個 `div` 裡面只有其他標籤而沒有直接文字，它就會被跳過，這樣解決了父子元素重複計算的問題。

### **Slide 11: Challenge #2 — The "Chinese" Problem (中文分詞與搜尋)**

*   **初始做法 (The Regex Approach):**
    *   標準的英文分詞是 `text.split(/\s+/)` 或 `text.match(/\b\w+\b/)`。
*   **遇到的坑 (The Failure):**
    *   **現象:** 中文句子沒有空格。例如「這是一個測試」。
    *   **結果:** 正則表達式會把整句「這是一個測試」當作**這篇文章唯一的一個單字 (Token)**。
    *   **計算崩潰:** 當用戶搜尋「測試」時，Token 是 `["測試"]`。但文章的 Token 是 `["這是一個測試"]`。這兩個字串不相等，TF (詞頻) 為 0，餘弦相似度 (Cosine Similarity) 直接歸零。AI 完全無法搜尋中文內容。
*   **解決方案 (Hybrid Tokenization):**
    *   我們寫了一個混合分詞器：
        *   檢測到英文/數字 -> 照舊用空格切分。
        *   檢測到 **CJK Unicode 範圍 (`\p{Script=Han}`)** -> 強制切換為 **單字切分 (Character-level tokenization)**。
    *   **權重補償:** 因為單字切分會導致很多無意義的匹配（例如「的」），我們引入了 **IDF (逆文檔頻率)** 來降低常見字的權重，並對「連續匹配的子字串」給予額外加分 (+1.0 Boost)。

### **Slide 12: Challenge #3 — Context Blindness (上下文盲區)**

*   **問題:** 用戶選中一句話說「翻譯這個」。
*   **坑:** 如果只把這句話丟給 LLM，它會缺乏語境。例如 "It's cool" 是指天氣冷還是這件事很酷？LLM 只能瞎猜。
*   **解決方案 (Dynamic DOM Expansion):**
    *   我們實作了一個 **"Sliding Window" (滑動視窗)** 演算法：
    *   **向上找:** 從目標節點開始，檢查 `previousElementSibling`，直到遇到一個 **Header (H1-H6)**。這就抓住了這個段落的「主題」。
    *   **向下找:** 如果是列表項 (`li`)，會自動抓取周圍的 `li`，確保 AI 理解這是一個清單結構。
    *   **結果:** 發送給 AI 的 Prompt 包含了 `[Context Start]...目標內容...[Context End]`，翻譯和改寫準確率提升了 40%。

### **Slide 14: Challenge #4 — Edit Stability (編輯穩定性)**

*   **初始做法 (String Replace):**
    *   讓 AI 返回 JSON：`{ "original": "舊文字", "new": "新文字" }`，然後用 JS `String.replace()`。
*   **遇到的坑:**
    *   **幻覺 (Hallucination):** LLM 記性不好，返回的 "original" 文字常常會少一個標點、多一個空格，或者自動修正了錯字。
    *   **結果:** JS 的 `replace()` 是精確匹配。只要差一個字元，替換就會失敗，功能直接報錯。
*   **解決方案 (Whole-Block Rewrite):**
    *   放棄字串比對。我們直接鎖定 DOM 節點（例如 `id="block-123"`）。
    *   要求 AI **重寫整個節點的 `outerHTML`**。
    *   前端直接用 `parentNode.replaceChild(newElement, oldElement)`。
    *   這雖然消耗更多 Token，但成功率從 60% 提升到了 99%。

---

## **Part 4: 視覺化與互動機制 (Slides 15-22)**

### **Slide 16-18: Visual Diff System (視覺化差異)**
*   **Inline Mode:** 使用 HTML 標準的 `<del>` 和 `<ins>` 標籤。
*   **Block Mode:** 這是技術難點。我們在 DOM 中動態插入了一個 Wrapper，將 `Old Block` (隱藏) 和 `New Block` (顯示) 包在一起。
    *   **為什麼這樣做？** 因為這樣可以實現 **"One-click Undo"**。如果用戶點擊「拒絕」，我們只需要把 Wrapper 拆掉，把 `Old Block` 還原即可，不需要重新請求數據。

### **Slide 19: State Machine (狀態機)**
*   解釋 UI 的狀態流轉：`Idle` -> `Searching` -> `Diff Review` -> `Committed`。這確保了在等待 AI 回應時，用戶不能亂動文檔，避免 DOM 結構錯位。

### **Slide 21: Cmd+K & execCommand**
*   **技術選擇:** 為什麼在 2025 年還用被標記為 Deprecated 的 `document.execCommand`？
*   **理由:** 它是目前唯一能完美處理 **跨標籤選取 (Selection spanning multiple tags)** 並自動維護瀏覽器 **Undo/Redo History** 的 API。自己手寫 DOM 替換極其容易破壞光標位置 (Caret Position)。

### **Slide 22: API Failover (故障轉移)**
*   **工程細節:** 我們的 `callGeminiAPI` 函數包裹了一個 `try-catch` 迴圈。它會遍歷用戶輸入的 API Key 陣列。
*   **價值:** 這解決了免費用戶常遇到的 `429 Too Many Requests` 問題，保證演示時絕對不會翻車。

---

## **Part 5: 結語 (Slides 25-29)**

### **Slide 25: vs Cursor**
*   **Cursor:** 針對 Code。Code 是結構化的，Diff 是基於行的。
*   **Rosuc:** 針對 Prose (散文)。Prose 是流動的，Diff 必須基於語意和段落。我們填補了 Cursor 在寫文檔時的體驗空缺。

### **Slide 28: Conclusion**
*   **核心價值:** AI 不應該是駕駛員，而應該是導航員。Rosuc 透過非破壞性設計，把方向盤交還給人類。
