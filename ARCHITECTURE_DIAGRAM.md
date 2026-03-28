# Mirror - Visual Architecture Diagram

## System Architecture Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                    USER LAYER                                  ║
║                                                                                ║
║  👤 User Actions:                                                             ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              ║
║  │  Ctrl+Shift+S   │  │  🎤 Record      │  │  ⌨️  Type Text  │              ║
║  │  (Screenshot)   │  │  Voice Input    │  │  Query          │              ║
║  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              ║
║           │                    │                     │                        ║
╚═══════════╪════════════════════╪═════════════════════╪════════════════════════╝
            │                    │                     │
            ▼                    ▼                     ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          CHROME EXTENSION LAYER                                ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │                         background.js (45 lines)                      │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │  chrome.commands.onCommand.addListener("capture_look")         │  │    ║
║  │  │    ↓                                                            │  │    ║
║  │  │  chrome.tabs.captureVisibleTab()                               │  │    ║
║  │  │    ↓                                                            │  │    ║
║  │  │  chrome.storage.session.set({ lastScreenshot: dataUrl })       │  │    ║
║  │  │    ↓                                                            │  │    ║
║  │  │  chrome.runtime.sendMessage({ type: "SCREENSHOT_CAPTURED" })   │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │                      sidepanel.html (768 lines)                       │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │  UI Components:                                                 │  │    ║
║  │  │  • Brand Header: "Mirror"                                       │  │    ║
║  │  │  • Status Message Display (playful confirmations)               │  │    ║
║  │  │  • Text Input Field (Cormorant Garamond italic)                │  │    ║
║  │  │  • Microphone Button (with waveform canvas)                    │  │    ║
║  │  │  • Recording Bar (with checkmark button)                       │  │    ║
║  │  │  • "Find My Look" Submit Button                                │  │    ║
║  │  │  • Output Panel (product cards display)                        │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  Styling: Tan/Brown luxury aesthetic, animations               │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
║                                    ▼                                          ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │                       sidepanel.js (505 lines)                        │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │  Event Handlers:                                                │  │    ║
║  │  │  • chrome.runtime.onMessage → Display screenshot confirmation  │  │    ║
║  │  │  • micBtn.click → Start MediaRecorder + waveform               │  │    ║
║  │  │  • tickBtn.click → Stop recording                              │  │    ║
║  │  │  • sendBtn.click → Submit analysis request                     │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  Functions:                                                     │  │    ║
║  │  │  • startWaveform() → Canvas visualization                      │  │    ║
║  │  │  • transcribeToTextField() → POST /transcribe                  │  │    ║
║  │  │  • displayResults() → Render product cards                     │  │    ║
║  │  │  • formatMirrorResponse() → Parse PRODUCT| lines               │  │    ║
║  │  │  • createProductCard() → Generate HTML cards                   │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  State:                                                         │  │    ║
║  │  │  • capturedImage (base64)                                      │  │    ║
║  │  │  • sessionId (localStorage)                                    │  │    ║
║  │  │  • mediaRecorder, audioChunks                                  │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
╚════════════════════════════════════╪══════════════════════════════════════════╝
                                     │
                                     │ HTTP POST (JSON)
                                     ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                            FASTAPI BACKEND LAYER                               ║
║                          main.py (835 lines, Port 8000)                        ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  POST /transcribe                                                     │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │  Input: { audio_data, mime_type, session_id }                  │  │    ║
║  │  │    ↓                                                            │  │    ║
║  │  │  Decode base64 audio                                           │  │    ║
║  │  │    ↓                                                            │  │    ║
║  │  │  Gemini Flash: TRANSCRIBE_PROMPT + audio                       │  │    ║
║  │  │    ↓                                                            │  │    ║
║  │  │  Output: { transcript: "verbatim text" }                       │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  POST /analyze (Main Pipeline)                                       │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │  Input: { screenshot_data, text_input, session_id }            │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  │    ║
║  │  │  ┃ STEP 0: Conversation Intent Analysis                  ┃  │  │    ║
║  │  │  ┃ ─────────────────────────────────────────────────────  ┃  │  │    ║
║  │  │  ┃ Model: Gemini Flash (temp: 0.1)                       ┃  │  │    ║
║  │  │  ┃ Prompt: CONVERSATION_PROMPT                           ┃  │  │    ║
║  │  │  ┃ Input: text_input or audio                            ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Extracts:                                             ┃  │  │    ║
║  │  │  ┃   • user_intent (fresh_look/follow_up/specific_item)  ┃  │  │    ║
║  │  │  ┃   • focus_item (e.g., "jacket")                       ┃  │  │    ║
║  │  │  ┃   • budget (e.g., 100)                                ┃  │  │    ║
║  │  │  ┃   • color_preference (e.g., "green")                  ┃  │  │    ║
║  │  │  ┃   • style_preference (e.g., "casual")                 ┃  │  │    ║
║  │  │  ┃   • follow_up_question                                ┃  │  │    ║
║  │  │  ┃   • raw_transcript_summary                            ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Stores in conversation_history[session_id]            ┃  │  │    ║
║  │  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │  │    ║
║  │  │                          ↓                                      │  │    ║
║  │  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  │    ║
║  │  │  ┃ STEP 1: Visual Analysis                               ┃  │  │    ║
║  │  │  ┃ ─────────────────────────────────────────────────────  ┃  │  │    ║
║  │  │  ┃ Model: Gemini Flash (temp: 0.2)                       ┃  │  │    ║
║  │  │  ┃ Prompt: ANALYSIS_PROMPT_TEMPLATE                      ┃  │  │    ║
║  │  │  ┃ Input: screenshot image + conversation context        ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Analyzes up to 3 clothing items:                      ┃  │  │    ║
║  │  │  ┃   For each item, extract 5 dimensions:                ┃  │  │    ║
║  │  │  ┃   1. garment_type (e.g., "wrap midi dress")           ┃  │  │    ║
║  │  │  ┃   2. color (precise: "cobalt" not "blue")             ┃  │  │    ║
║  │  │  ┃   3. design (silhouette/fit/length)                   ┃  │  │    ║
║  │  │  ┃   4. details (construction features)                  ┃  │  │    ║
║  │  │  ┃   5. print (pattern or "solid")                       ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Generates search queries:                             ┃  │  │    ║
║  │  │  ┃   • exact_query (surgical, all details)               ┃  │  │    ║
║  │  │  ┃   • fallback_query (broader, 2-3 traits)              ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Suggests 3 complementary_items:                       ┃  │  │    ║
║  │  │  ┃   • item_type (e.g., "ankle boots")                   ┃  │  │    ║
║  │  │  ┃   • search_query (coordinating style/color)           ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Output: JSON with scene_summary, gender,              ┃  │  │    ║
║  │  │  ┃         demographic, items[]                          ┃  │  │    ║
║  │  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │  │    ║
║  │  │                          ↓                                      │  │    ║
║  │  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  │    ║
║  │  │  ┃ STEP 2: Product Search                                ┃  │  │    ║
║  │  │  ┃ ─────────────────────────────────────────────────────  ┃  │  │    ║
║  │  │  ┃ API: SerpAPI (Google Shopping)                        ┃  │  │    ║
║  │  │  ┃ Function: search_products()                           ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ For each main item:                                   ┃  │  │    ║
║  │  │  ┃   1. Search exact_query (limit: 2 products)           ┃  │  │    ║
║  │  │  ┃   2. If needed, search fallback_query                 ┃  │  │    ║
║  │  │  ┃   3. Apply budget filter (max_price)                  ┃  │  │    ║
║  │  │  ┃   4. Deduplicate by URL                               ┃  │  │    ║
║  │  │  ┃   5. Extract: name, price, link, source, thumbnail    ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ For each complementary item (3 total):                ┃  │  │    ║
║  │  │  ┃   1. Search complementary query                       ┃  │  │    ║
║  │  │  ┃   2. Take 1 product per item                          ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Fallback (no SERP_API_KEY):                           ┃  │  │    ║
║  │  │  ┃   Direct links to ASOS, Amazon, Nordstrom, Zara, H&M  ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Output: { garment: { main: {exact[], similar[]},     ┃  │  │    ║
║  │  │  ┃                      complementary: [{type, product}] ┃  │  │    ║
║  │  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │  │    ║
║  │  │                          ↓                                      │  │    ║
║  │  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  │    ║
║  │  │  ┃ STEP 3: Format Editorial Response                     ┃  │  │    ║
║  │  │  ┃ ─────────────────────────────────────────────────────  ┃  │  │    ║
║  │  │  ┃ Model: Gemini Flash (temp: 0.4)                       ┃  │  │    ║
║  │  │  ┃ Prompt: FORMAT_PROMPT_TEMPLATE                        ┃  │  │    ║
║  │  │  ┃ Input: analysis JSON + products JSON                  ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Generates formatted text:                             ┃  │  │    ║
║  │  │  ┃   • Scene summary                                     ┃  │  │    ║
║  │  │  ┃   • Gender | Demographic                              ┃  │  │    ║
║  │  │  ┃   • ### Garment headers                               ┃  │  │    ║
║  │  │  ┃   • PRODUCT|name|price|source|url|thumb|desc          ┃  │  │    ║
║  │  │  ┃   • COMPLEMENTARY|type|name|price|source|url|thumb    ┃  │  │    ║
║  │  │  ┃   • Styling advice                                    ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Output: Pipe-delimited product listings               ┃  │  │    ║
║  │  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │  │    ║
║  │  │                          ↓                                      │  │    ║
║  │  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  │    ║
║  │  │  ┃ STEP 4: Generate Voice Note                           ┃  │  │    ║
║  │  │  ┃ ─────────────────────────────────────────────────────  ┃  │  │    ║
║  │  │  ┃ Script Generation:                                    ┃  │  │    ║
║  │  │  ┃   Model: Gemini Flash (temp: 0.8)                     ┃  │  │    ║
║  │  │  ┃   Prompt: VOICE_SCRIPT_PROMPT                         ┃  │  │    ║
║  │  │  ┃   Output: Enthusiastic 60-word script                 ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Audio Synthesis:                                      ┃  │  │    ║
║  │  │  ┃   Model: Gemini Live (native audio)                   ┃  │  │    ║
║  │  │  ┃   Voice: "Aoede" (expressive female)                  ┃  │  │    ║
║  │  │  ┃   System: MIRROR_VOICE_SYSTEM                         ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃   Process:                                            ┃  │  │    ║
║  │  │  ┃   1. Open WebSocket session                           ┃  │  │    ║
║  │  │  ┃   2. Send script as text (turn_complete=True)         ┃  │  │    ║
║  │  │  ┃   3. Collect PCM audio chunks                         ┃  │  │    ║
║  │  │  ┃   4. Wait for turn_complete signal                    ┃  │  │    ║
║  │  │  ┃   5. Wrap PCM → WAV (24kHz, mono, 16-bit)             ┃  │  │    ║
║  │  │  ┃   6. Encode to base64                                 ┃  │  │    ║
║  │  │  ┃                                                        ┃  │  │    ║
║  │  │  ┃ Output: base64 WAV audio string                       ┃  │  │    ║
║  │  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │  │    ║
║  │  │                          ↓                                      │  │    ║
║  │  │  Final Response:                                                │  │    ║
║  │  │  {                                                              │  │    ║
║  │  │    mirror_response: "formatted text with PRODUCT| lines",      │  │    ║
║  │  │    voice_note_audio: "base64 WAV",                             │  │    ║
║  │  │    voice_note_script: "enthusiastic text",                     │  │    ║
║  │  │    conversation_context: { intent, budget, color, ... }        │  │    ║
║  │  │  }                                                              │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  GET /health                                                          │    ║
║  │  Returns: { "status": "Mirror backend is live ✅" }                  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                          ║
╚════════════════════════════════════╪══════════════════════════════════════════╝
                                     │
                                     │ Calls External APIs
                                     ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           EXTERNAL SERVICES LAYER                              ║
║                                                                                ║
║  ┌────────────────────────────────────┐  ┌────────────────────────────────┐  ║
║  │      GOOGLE GEMINI AI API          │  │         SERPAPI                │  ║
║  │                                    │  │    (Google Shopping)           │  ║
║  │  ┌──────────────────────────────┐ │  │                                │  ║
║  │  │ Flash Model (3.1-flash-lite) │ │  │  ┌──────────────────────────┐  │  ║
║  │  │ ──────────────────────────── │ │  │  │ Product Search Engine    │  │  ║
║  │  │ • Transcription (temp: 0.0)  │ │  │  │ ──────────────────────── │  │  ║
║  │  │ • Intent parsing (temp: 0.1) │ │  │  │ • Query: exact + fallback│  │  ║
║  │  │ • Visual analysis (temp: 0.2)│ │  │  │ • Filters: price, source │  │  ║
║  │  │ • Formatting (temp: 0.4)     │ │  │  │ • Returns: name, price,  │  │  ║
║  │  │ • Script gen (temp: 0.8)     │ │  │  │   link, thumbnail        │  │  ║
║  │  └──────────────────────────────┘ │  │  │ • Deduplication by URL   │  │  ║
║  │                                    │  │  └──────────────────────────┘  │  ║
║  │  ┌──────────────────────────────┐ │  │                                │  ║
║  │  │ Live Model (2.5-flash-audio) │ │  │  Fallback (no API key):        │  ║
║  │  │ ──────────────────────────── │ │  │  • ASOS search links           │  ║
║  │  │ • Text-to-speech via WebSocket│ │  │  • Amazon search links         │  ║
║  │  │ • Voice: "Aoede"             │ │  │  • Nordstrom search links      │  ║
║  │  │ • Output: PCM audio chunks   │ │  │  • Zara search links           │  ║
║  │  │ • Format: 24kHz, mono, 16bit │ │  │  • H&M search links            │  ║
║  │  └──────────────────────────────┘ │  │                                │  ║
║  └────────────────────────────────────┘  └────────────────────────────────┘  ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                                     │
                                     │ JSON Response
                                     ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          FRONTEND RENDERING LAYER                              ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  sidepanel.js: displayResults(data)                                   │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │  1. Auto-play voice note:                                      │  │    ║
║  │  │     <audio src="data:audio/wav;base64,${voice_note_audio}"     │  │    ║
║  │  │            autoplay controls>                                  │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  2. Parse mirror_response:                                     │  │    ║
║  │  │     • Split by newlines                                        │  │    ║
║  │  │     • Detect PRODUCT| lines → createProductCard()              │  │    ║
║  │  │     • Detect COMPLEMENTARY| lines → createProductCard()        │  │    ║
║  │  │     • Format headers (###)                                     │  │    ║
║  │  │     • Format horizontal rules (---)                            │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  3. Render product cards:                                      │  │    ║
║  │  │     ┌──────────────────────────────────────────────────────┐  │  │    ║
║  │  │     │  Product Card (HTML)                                 │  │  │    ║
║  │  │     │  ┌────────────┐  ┌──────────────────────────────┐   │  │  │    ║
║  │  │     │  │ Thumbnail  │  │ Product Name (bold)          │   │  │  │    ║
║  │  │     │  │ 130x170px  │  │ Price (gold, large)          │   │  │  │    ║
║  │  │     │  │            │  │ Source (small, tan)          │   │  │  │    ║
║  │  │     │  │ Image or   │  │ [SHOP NOW ↗] button          │   │  │  │    ║
║  │  │     │  │ 🛍️ emoji   │  │ (gradient, clickable)        │   │  │  │    ║
║  │  │     │  └────────────┘  └──────────────────────────────┘   │  │  │    ║
║  │  │     │                                                      │  │  │    ║
║  │  │     │  Hover effects: translateY(-4px), shadow glow       │  │  │    ║
║  │  │     │  Animation: slideIn 0.5s ease                       │  │  │    ║
║  │  │     └──────────────────────────────────────────────────────┘  │  │    ║
║  │  │                                                                 │  │    ║
║  │  │  4. Display in outputPanel (scrollable)                        │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## Data Flow Sequence Diagram

```
User          Extension       Backend         Gemini AI       SerpAPI
 │                │               │                │              │
 │ Ctrl+Shift+S   │               │                │              │
 │───────────────>│               │                │              │
 │                │ Capture       │                │              │
 │                │ Screenshot    │                │              │
 │                │ (JPEG 70%)    │                │              │
 │<───────────────│               │                │              │
 │ "Got it babe!" │               │                │              │
 │                │               │                │              │
 │ Click Mic 🎤   │               │                │              │
 │───────────────>│               │                │              │
 │                │ Start         │                │              │
 │                │ Recording     │                │              │
 │<───────────────│               │                │              │
 │ Waveform ~~~   │               │                │              │
 │                │               │                │              │
 │ Click ✓        │               │                │              │
 │───────────────>│               │                │              │
 │                │ Stop          │                │              │
 │                │ Recording     │                │              │
 │                │               │                │              │
 │                │ POST          │                │              │
 │                │ /transcribe   │                │              │
 │                │──────────────>│                │              │
 │                │               │ Transcribe     │              │
 │                │               │ Audio          │              │
 │                │               │───────────────>│              │
 │                │               │<───────────────│              │
 │                │               │ "transcript"   │              │
 │                │<──────────────│                │              │
 │<───────────────│ Populate      │                │              │
 │ Text field     │ Input         │                │              │
 │                │               │                │              │
 │ Type text      │               │                │              │
 │ (optional)     │               │                │              │
 │───────────────>│               │                │              │
 │                │               │                │              │
 │ Click "Find    │               │                │              │
 │ My Look" ↩     │               │                │              │
 │───────────────>│               │                │              │
 │                │ POST /analyze │                │              │
 │                │ {screenshot,  │                │              │
 │                │  text,        │                │              │
 │                │  session_id}  │                │              │
 │                │──────────────>│                │              │
 │                │               │                │              │
 │                │               │ STEP 0:        │              │
 │                │               │ Parse Intent   │              │
 │                │               │───────────────>│              │
 │                │               │<───────────────│              │
 │                │               │ {intent,budget,│              │
 │                │               │  color,focus}  │              │
 │                │               │                │              │
 │                │               │ STEP 1:        │              │
 │                │               │ Analyze Image  │              │
 │                │               │───────────────>│              │
 │                │               │<───────────────│              │
 │                │               │ {items[],      │              │
 │                │               │  queries[]}    │              │
 │                │               │                │              │
 │                │               │ STEP 2:        │              │
 │                │               │ Search Products│              │
 │                │               │────────────────┼─────────────>│
 │                │               │                │ Google       │
 │                │               │                │ Shopping     │
 │                │               │<───────────────┼──────────────│
 │                │               │ {products[]}   │              │
 │                │               │                │              │
 │                │               │ STEP 3:        │              │
 │                │               │ Format Response│              │
 │                │               │───────────────>│              │
 │                │               │<───────────────│              │
 │                │               │ "PRODUCT|..."  │              │
 │                │               │                │              │
 │                │               │ STEP 4:        │              │
 │                │               │ Generate Voice │              │
 │                │               │───────────────>│              │
 │                │               │ (WebSocket)    │              │
 │                │               │<───────────────│              │
 │                │               │ PCM audio      │              │
 │                │               │ chunks         │              │
 │                │               │                │              │
 │                │               │ Wrap PCM→WAV   │              │
 │                │               │ Encode base64  │              │
 │                │               │                │              │
 │                │<──────────────│                │              │
 │                │ {mirror_resp, │                │              │
 │                │  voice_audio, │                │              │
 │                │  voice_script,│                │              │
 │                │  context}     │                │              │
 │<───────────────│               │                │              │
 │ Display:       │               │                │              │
 │ • Play audio 🎧│               │                │              │
 │ • Show products│               │                │              │
 │ • Render cards │               │                │              │
 │                │               │                │              │
```

## Session & State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION PERSISTENCE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (localStorage):                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  mirror_session_id: "session_1234567890_abc123"        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Backend (in-memory dict):                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  conversation_history = {                              │    │
│  │    "session_1234567890_abc123": {                      │    │
│  │      "messages": [                                     │    │
│  │        {                                               │    │
│  │          "user": "I love this jacket",                 │    │
│  │          "response": "Ooh that leather bomber...",     │    │
│  │          "timestamp": "{\"intent\": \"fresh_look\"}"   │    │
│  │        },                                              │    │
│  │        {                                               │    │
│  │          "user": "Do you have it in green?",           │    │
│  │          "response": "Absolutely! Here's...",          │    │
│  │          "timestamp": "{\"intent\": \"follow_up\"}"    │    │
│  │        }                                               │    │
│  │      ],                                                │    │
│  │      "last_analysis": { /* JSON from Step 1 */ },      │    │
│  │      "last_products": { /* JSON from Step 2 */ }       │    │
│  │    }                                                   │    │
│  │  }                                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Context Window: Last 3 messages used for follow-up queries     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Presentation Layer:                                            │
│  • HTML5 + CSS3 (Gradient backgrounds, animations)              │
│  • Vanilla JavaScript (ES6+)                                    │
│  • Canvas API (Waveform visualization)                          │
│  • Web Audio API (MediaRecorder)                                │
│                                                                  │
│  Extension Layer:                                               │
│  • Chrome Extension Manifest V3                                 │
│  • chrome.tabs API (Screenshot capture)                         │
│  • chrome.storage.session API (Data persistence)                │
│  • chrome.runtime API (Messaging)                               │
│                                                                  │
│  Backend Layer:                                                 │
│  • Python 3.x                                                   │
│  • FastAPI (Async web framework)                                │
│  • Uvicorn (ASGI server)                                        │
│  • Pydantic (Data validation)                                   │
│                                                                  │
│  AI/ML Layer:                                                   │
│  • Google Gemini 3.1 Flash Lite (Multi-modal analysis)          │
│  • Google Gemini 2.5 Flash Native Audio (Text-to-speech)        │
│  • WebSocket (Live API connection)                              │
│                                                                  │
│  Data Layer:                                                    │
│  • SerpAPI (Product search)                                     │
│  • Google Shopping (Product database)                           │
│  • Base64 encoding (Image/audio transfer)                       │
│  • JSON (Data interchange)                                      │
│                                                                  │
│  Fonts:                                                         │
│  • Cormorant Garamond (Serif, elegant)                          │
│  • Montserrat (Sans-serif, modern)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
