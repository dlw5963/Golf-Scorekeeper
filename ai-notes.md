# AI Notes – Golf Scorekeeping Mobile Web App
**Course:** IST 402 – Emerging Technologies  
**Student:** De’Von Williams  
**Repository:** https://github.com/dlw5963/Golf-Scorekeeper  
**Deployed Site:** https://dlw5963.github.io/Golf-Scorekeeper/  

---

## 1  Overview of AI Involvement
This project demonstrates responsible use of multiple AI-assisted development tools to rapidly build, refine, and verify a mobile-first golf-scorekeeping Progressive Web App.  
AI was used as an assistant — never as an unchecked code generator — and every suggestion was reviewed and tested before inclusion.

| Tool | Role |
|------|------|
| **ChatGPT (GPT-5)** | Main coding partner — structure, logic, debugging, enhancements |
| **GitHub Copilot** | Inline completions & syntax refinements inside VS Code |
| **Google Stitch** | Visual UI layout prototyping based on the *Beezer Golf* design style |

---

## 2  Design and Prototyping – Google Stitch
**Prompt used:**  
> “Design a mobile-first golf scorekeeping app UI that matches the Beezer Golf app aesthetic with dark mode and minimal spacing.”

**Outputs from Stitch:**  
- Mobile-first card-based layout blueprint  
- Header/footer spacing & grid alignment  
- Color and typography recommendations  
- Screen structure for *Setup → Scorecard → Summary*  

I manually implemented the design using HTML + CSS generated with ChatGPT and tuned paddings and breakpoints for iPhone 15 and Pixel 7 sizes.

---

## 3  Implementation – ChatGPT (GPT-5)
ChatGPT produced and refined the functional code base across several sessions.

**Key prompts and deliverables**
1. “Create a mobile-friendly golf scorekeeping web app for 1–4 players (9 or 18 holes).”
2. “Add Undo, Redo, and Clear Last that can be used repeatedly.”
3. “Implement confetti celebration and Draw logic for tied winners.”
4. “Add light/dark mode and wake-lock toggle.”
5. “Persist scores in localStorage so data survives refresh.”
6. “Auto-resize player-name inputs based on typed text and viewport width.”
7. “Unify visual style across Setup, Scorecard, and Summary pages.”

**Accepted as-is**
- Base HTML structure  
- Undo/Redo/Clear Last logic  
- LocalStorage persistence  
- Theme toggle & wake-lock control  

**Modified after review**
- Confetti timing and button sequence  
- Draw logic (for multiple winners)  
- Safe-area padding for mobile  
- Accessibility labels & font sizing  

---

## 4  Refinement – GitHub Copilot
- Suggested concise variable and function names.  
- Completed repetitive loops for hole creation.  
- Cleaned small syntax errors during JS testing.  

Each suggestion was reviewed manually.

---

## 5  Testing and Verification

| Check | Method | Result |
|--------|---------|--------|
| **Responsive Layout** | Chrome DevTools + iPhone Safari | ✅ Scales cleanly |
| **Numeric Keypad** | iOS Safari input mode | ✅ Opens correctly |
| **Undo / Redo / Clear Last** | Manual multi-step test | ✅ Stable |
| **Wake Lock** | Chrome and Safari | ✅ Active on supported browsers |
| **LocalStorage Persistence** | Page refresh | ✅ Data retained |
| **Draw Detection** | Equal score simulation | ✅ Displays “Draw:” with names |
| **Confetti / Buttons** | Manual inspection | ✅ Functional |
| **Offline Mode** | Service worker cache | ✅ Loads offline |
| **Lighthouse Audit** | Chrome DevTools | ✅ 95 + mobile score |

---

## 6  Reflections on AI Use
- **Productivity:** AI cut development time by ≈ 70 %.  
- **Learning:** Reading AI-generated snippets improved understanding of event-driven JavaScript and responsive CSS.  
- **Ethics:** Every AI output was reviewed; attribution is provided here.  
- **Oversight:** Final logic and testing were entirely human-verified.  

---

## 7  Future Enhancements
- Course presets and score export (CSV)  
- IndexedDB history for multiple rounds  
- Share API integration  
- Broader accessibility support  

---

**Submitted by De’Von Williams**  
November 2025
