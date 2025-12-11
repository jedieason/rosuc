# Rosuc: AI 驅動的交互式編輯器技術與背景介紹

Rosuc 是一個由 BDA Group 20 開發的 AI 驅動網頁編輯器，旨在解決傳統 AI 輔助編輯器中常見的「盲目覆蓋」與「缺乏上下文」問題。本專案採用原生網頁技術（Vanilla JS）構建，並結合 Google Gemini 模型，實現了一套非破壞性（Non-Destructive）、具備上下文感知能力的智能編輯系統。

本文檔將詳細介紹 Rosuc 背後的核心技術、演算法與相關背景知識。

## 1. 核心技術棧 (Technology Stack)

Rosuc 堅持使用輕量級、標準化的技術棧，以確保最大的兼容性與可移植性。

### 1.1 前端基礎 (Frontend Core)
*   **Vanilla JavaScript (ES6+):** 不依賴 React、Vue 等大型框架，直接操作 DOM，確保極致的加載速度與運行效能。
*   **HTML5 contenteditable API:** 編輯器的核心基於瀏覽器原生的 `contenteditable` 屬性，這使得任何 HTML 元素都可以變成富文本編輯區域。
*   **document.execCommand API:** 用於執行基本的富文本格式化操作（如粗體、斜體、列表等），保證了與瀏覽器原生行為的一致性及 Undo/Redo 棧的維護。

### 1.2 視覺與交互 (UI/UX)
*   **Glassmorphism (玻璃擬態):** 採用現代化的 UI 設計風格，利用背景模糊 (`backdrop-filter: blur`) 與半透明層次，營造出深度感與質感。
*   **CSS Variables & Animations:** 使用 CSS 變數進行全局主題管理，並利用 CSS 動畫 (`cubic-bezier`) 實現流暢的過渡效果。
*   **Lucide Icons:** 引入輕量級的 SVG 圖標庫，提供清晰、統一的視覺語號。

### 1.3 AI 模型整合 (AI Integration)
*   **Google Gemini API:** 專案核心智力來源。支援多種模型切換（如 Gemini 2.5 Flash Lite, Gemini 3.0 Pro），並實作了 **Failover (故障轉移) 機制**，允許配置多個 API Key，當某個 Key 超出配額或失敗時自動切換。
*   **RESTful API 通訊:** 通過標準 fetch API 與 Gemini 後端進行非同步通訊。

### 1.4 數據存儲 (Data Storage)
*   **localStorage:** 所有文件內容與用戶設置（如 API Key、偏好模型）均存儲於瀏覽器的 `localStorage` 中，實現無後端的純前端應用架構。

---

## 2. 核心演算法與機制 (Key Algorithms & Mechanisms)

Rosuc 的智能不僅僅在於調用 LLM，更在於其獨特的「Agentic Workflow」（代理工作流）與上下文檢索算法。

### 2.1 4-Step Agentic Workflow (四階段代理工作流)
Rosuc 將用戶的指令轉化為編輯操作的過程分為四個嚴謹的步驟：
1.  **意圖分析 (Analyze Intent):** 判斷用戶是想修改「單詞」、「段落」還是「全文」，並提取關鍵詞。
2.  **上下文檢索 (Context Retrieval):** 在文檔中找到需要修改的具體位置。
3.  **生成重寫 (Generate Rewrite):** 讓 AI 生成修改後的 HTML 代碼。
4.  **應用與可視化 (Apply & Visualize):** 將修改應用到 DOM 中，並以 Diff 形式呈現給用戶確認。

### 2.2 TF-IDF 與餘弦相似度 (TF-IDF & Cosine Similarity)
為了讓 AI 準確找到用戶想修改的段落，Rosuc 實作了一個輕量級的搜尋引擎：

*   **分詞策略 (Tokenization):**
    *   針對英文與數字，使用正則表達式按詞邊界分割。
    *   **CJK (中日韓) 優化:** 針對中文等無需空格分隔的語言，採用單字切分策略，解決了傳統分詞將整句視為一個 Token 的問題。
*   **TF-IDF (Term Frequency-Inverse Document Frequency):** 計算關鍵詞在特定段落中的重要性，避免常見詞（Stop words）干擾搜索結果。
*   **餘弦相似度 (Cosine Similarity):** 計算用戶查詢向量與文檔段落向量之間的夾角，數值越接近 1 代表越相關。
*   **加權機制:** 對於完全匹配的子字串給予額外加分，確保精確度。

### 2.3 動態 DOM 擴展 (Dynamic DOM Expansion)
LLM 往往需要上下文才能做出正確的修改（例如翻譯時需要知道前文）。Rosuc 採用啟發式算法動態擴展上下文：
*   向前回溯兄弟節點，直到遇到標題（Header）。
*   向後延伸，包含相關的列表項或直到下一個主要章節。
*   這確保了發送給 AI 的不僅僅是目標句子，而是完整的語義塊。

### 2.4 手術式編輯 Prompt (Surgical Editing Prompt)
為了防止 AI 產生幻覺或隨意更改原有結構，Rosuc 使用了精心設計的 Prompt：
*   要求 AI **只輸出** 修改後的 HTML 片段，不包含 Markdown 標記。
*   明確指示 AI 保留非目標區域的上下文內容。
*   針對不同 Scope（行內、區塊）使用不同的指令約束。

---

## 3. 非破壞性編輯與 Diff 系統 (Non-Destructive Editing & Diff System)

這是 Rosuc 與傳統編輯器最大的區別。它不直接覆蓋用戶的文字，而是提供「預覽」與「選擇權」。

### 3.1 視覺化差異 (Visual Diff)
*   **行內模式 (Inline Mode):** 使用 `<del>` (紅色刪除線) 與 `<ins>` (綠色新增) 標記，直觀展示文字變化。
*   **區塊模式 (Block Mode):** 當修改涉及整個段落結構時，會創建一個包含「原版」與「新版」的容器，並提供 UI 讓用戶一鍵切換查看。
*   **全局模式 (Global Mode):** 用於全文校對。系統會高亮顯示所有被修改的段落，並提供批量接受/拒絕的功能。

### 3.2 狀態機 UI (State Machine UI)
編輯器內部維護著嚴格的狀態流轉：
`初始狀態` -> `顯示 Diff (Show)` -> `用戶決策 (Keep/Undo)` -> `最終應用 (Restore/Remove Markers)`。
這確保了即使在複雜的連續編輯中，文檔結構也不會損壞。

---

## 4. 總結

Rosuc 是一個展示了如何將現代 LLM 能力與傳統 Web 技術深度結合的範例。它不僅解決了 AI 編輯中的「信任問題」，還通過自研的 TF-IDF 搜索與 DOM 操作算法，證明了純前端架構在處理複雜文檔編輯任務時的可行性與高效性。
