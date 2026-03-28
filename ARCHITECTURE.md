# Mirror - AI Fashion Stylist Architecture

## 📖 README Summary
**Project Name:** Mirror  
**Description:** High-end AI fashion stylist reflecting your best self

---

## 🏗️ System Architecture Overview

Mirror is a Chrome extension that combines computer vision, voice interaction, and AI-powered fashion analysis to help users find clothing items from screenshots. The system uses a multi-modal AI approach with Google's Gemini models for visual analysis, conversation understanding, and voice synthesis.

---

## 🔄 Complete Data Flow Pipeline

### **Phase 1: Screenshot Capture**
```
User Action (Ctrl+Shift+S)
    ↓
Chrome Extension (background.js)
    ↓
Capture visible tab as JPEG (quality: 70%)
    ↓
Store in chrome.storage.session
    ↓
Send message to sidepanel (if open)
    ↓
Display playful confirmation message
```

### **Phase 2: Voice Input (Optional)**
```
User clicks mic button (sidepanel.js)
    ↓
Request microphone permission
    ↓
MediaRecorder starts recording
    ↓
Display waveform visualization (Canvas API)
    ↓
User clicks checkmark to stop
    ↓
Convert audio chunks → Blob (audio/webm)
    ↓
Convert to base64
    ↓
POST /transcribe → Backend (main.py)
    ↓
Gemini Flash processes audio
    ↓
Returns transcript text
    ↓
Populate text input field
```

### **Phase 3: AI Analysis & Product Search**
```
User clicks "Find My Look" button
    ↓
Collect: screenshot_data + text_input + session_id
    ↓
POST /analyze → Backend (main.py)
    ↓
┌─────────────────────────────────────────┐
│ STEP 0: Conversation Intent Analysis   │
│ - Parse user's voice/text input        │
│ - Extract: budget, color, focus_item   │
│ - Determine: fresh_look vs follow_up   │
│ - Store in conversation history        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 1: Visual Analysis (Gemini Flash) │
│ - Analyze screenshot image              │
│ - Identify up to 3 clothing items      │
│ - Extract 5 dimensions per item:       │
│   • garment_type                        │
│   • color (precise shade)               │
│   • design (silhouette/fit/length)      │
│   • details (construction features)     │
│   • print (pattern or "solid")          │
│ - Generate exact_query (surgical)       │
│ - Generate fallback_query (broader)     │
│ - Suggest 3 complementary items        │
│ - Return JSON analysis                  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 2: Product Search (SerpAPI)       │
│ For each identified item:               │
│   - Search exact_query (limit: 2)      │
│   - Search fallback_query if needed    │
│   - Apply budget filter if specified   │
│   - Extract: name, price, link,        │
│     source, thumbnail                   │
│ For each complementary item:            │
│   - Search complementary query         │
│   - Get 1 product per item             │
│ Return: {exact: [], similar: []}       │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 3: Format Response (Gemini Flash) │
│ - Combine analysis + products          │
│ - Generate editorial text with:        │
│   • Scene summary                       │
│   • Gender | Demographic               │
│   • Product cards (PRODUCT| format)    │
│   • Complementary items                │
│   • Styling advice                      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 4: Voice Note (Gemini Live API)   │
│ - Generate enthusiastic script         │
│ - Open WebSocket session               │
│ - Send script as text                  │
│ - Receive PCM audio chunks             │
│ - Wrap PCM → WAV format                │
│ - Encode to base64                      │
│ - Voice: "Aoede" (expressive female)   │
└─────────────────────────────────────────┘
    ↓
Return MirrorResponse:
  - mirror_response (formatted text)
  - voice_note_audio (base64 WAV)
  - voice_note_script (text)
  - conversation_context (intent data)
    ↓
Frontend (sidepanel.js) displays:
  - Auto-play voice note
  - Parse PRODUCT| and COMPLEMENTARY| lines
  - Render product cards with images
  - Show clickable "SHOP NOW" links
```

---

## 🧩 Component Breakdown

### **1. Chrome Extension (Frontend)**

#### `manifest.json`
- **Type:** Chrome Extension Manifest V3
- **Permissions:** `sidePanel`, `activeTab`, `scripting`, `storage`
- **Keyboard Shortcut:** `Ctrl+Shift+S` → capture_look command
- **Service Worker:** `background.js`
- **Side Panel:** `sidepanel.html`

#### `background.js`
- **Purpose:** Background service worker
- **Key Functions:**
  - Listen for `Ctrl+Shift+S` command
  - Capture visible tab screenshot (JPEG, 70% quality)
  - Store in `chrome.storage.session`
  - Send message to sidepanel
- **Lines of Code:** 45

#### `sidepanel.html`
- **Purpose:** User interface
- **Design:** Luxury fashion aesthetic (tan/brown color scheme)
- **Key Elements:**
  - Brand header with "Mirror" logo
  - Status message display area
  - Text input field (Cormorant Garamond font)
  - Microphone button with waveform visualization
  - Recording bar with checkmark button
  - "Find My Look" submit button
  - Output panel for results
- **Styling:** Gradient backgrounds, animations (float, pulse, slideIn)

#### `sidepanel.js`
- **Purpose:** Frontend logic and UI interactions
- **Key Features:**
  - **Screenshot Handling:** Display playful confirmation messages
  - **Voice Recording:** MediaRecorder API with waveform visualization
  - **Audio Transcription:** POST to `/transcribe` endpoint
  - **Analysis Submission:** POST to `/analyze` endpoint
  - **Result Display:** Parse and render product cards
  - **Session Management:** localStorage for conversation continuity
- **State Variables:**
  - `capturedImage`: Base64 screenshot data
  - `sessionId`: Unique session identifier
  - `mediaRecorder`: Audio recording instance
  - `audioChunks`: Recorded audio data
- **Lines of Code:** 505

### **2. Backend Server (Python/FastAPI)**

#### `main.py`
- **Framework:** FastAPI
- **Port:** 8000
- **CORS:** Enabled for all origins
- **Lines of Code:** 835

#### **API Endpoints:**

##### `POST /transcribe`
- **Input:** `TranscribeRequest`
  - `audio_data`: base64 encoded audio
  - `mime_type`: audio format (default: audio/webm)
  - `text_input`: optional text fallback
  - `session_id`: session identifier
- **Process:**
  1. Decode base64 audio
  2. Send to Gemini Flash model
  3. Extract verbatim transcript
- **Output:** `TranscribeResponse`
  - `transcript`: transcribed text

##### `POST /analyze`
- **Input:** `AnalyzeRequest`
  - `screenshot_data`: base64 JPEG image
  - `text_input`: user's query/description
  - `session_id`: session identifier
- **Process:** 4-step pipeline (detailed above)
- **Output:** `MirrorResponse`
  - `mirror_response`: formatted product listings
  - `voice_note_audio`: base64 WAV audio
  - `voice_note_script`: text of voice note
  - `conversation_context`: parsed user intent

##### `GET /health`
- **Output:** `{"status": "Mirror backend is live ✅"}`

#### **AI Models Used:**

1. **FLASH_MODEL:** `gemini-3.1-flash-lite-preview`
   - Text/vision/audio analysis
   - Conversation intent parsing
   - Visual analysis
   - Response formatting
   - Voice script generation

2. **LIVE_MODEL:** `gemini-2.5-flash-native-audio-preview-12-2025`
   - Text-to-speech via WebSocket
   - Voice: "Aoede" (expressive female)
   - Output: PCM audio → WAV

#### **Key Functions:**

##### `search_products(exact_query, fallback_query, max_price)`
- **Purpose:** Search for fashion products
- **API:** SerpAPI (Google Shopping)
- **Strategy:**
  1. Search exact query (limit: 2)
  2. If insufficient, search fallback query
  3. Filter by budget if specified
  4. Deduplicate by URL
- **Returns:** `{exact: [], similar: []}`

##### `generate_voice_note(script)`
- **Purpose:** Convert text to enthusiastic voice audio
- **Process:**
  1. Open Gemini Live WebSocket session
  2. Send script as text with system instruction
  3. Collect PCM audio chunks
  4. Wrap in WAV container
  5. Encode to base64
- **Returns:** base64 WAV string

##### `_pcm_to_wav(pcm_bytes)`
- **Purpose:** Wrap raw PCM audio in WAV container
- **Specs:** 24kHz, mono, 16-bit
- **Returns:** WAV bytes

#### **Conversation History:**
```python
conversation_history = {
    "session_id": {
        "messages": [
            {
                "user": "transcript",
                "response": "mirror response",
                "timestamp": "intent data"
            }
        ],
        "last_analysis": {},
        "last_products": {}
    }
}
```

---

## 🎯 AI Prompts & Strategies

### **TRANSCRIBE_PROMPT**
- **Goal:** Verbatim transcription only
- **Temperature:** 0.0 (deterministic)

### **CONVERSATION_PROMPT**
- **Goal:** Extract user intent from voice/text
- **Extracts:**
  - `user_intent`: fresh_look | follow_up | specific_item | question
  - `focus_item`: specific garment requested
  - `budget`: price constraint
  - `color_preference`: desired color
  - `style_preference`: style direction
  - `follow_up_question`: continuation query
- **Temperature:** 0.1 (low variance)

### **ANALYSIS_PROMPT_TEMPLATE**
- **Goal:** Deep visual analysis → structured JSON
- **Context-Aware:** Incorporates conversation history
- **5 Dimensions per Item:**
  1. Color (precise shade, not generic)
  2. Design (silhouette, fit, length)
  3. Details (construction features)
  4. Print (specific pattern or "solid")
  5. Garment type
- **Query Generation:**
  - `exact_query`: Surgical precision (all details)
  - `fallback_query`: Broader (2-3 dominant traits)
- **Complementary Items:** 3 coordinating pieces
- **Temperature:** 0.2 (focused)

### **FORMAT_PROMPT_TEMPLATE**
- **Goal:** Editorial-style product presentation
- **Format:** Pipe-delimited product cards
- **Structure:**
  - Scene summary + demographics
  - Main products (PRODUCT| prefix)
  - Complementary items (COMPLEMENTARY| prefix)
  - Styling advice
- **Temperature:** 0.4 (creative)

### **VOICE_SCRIPT_PROMPT**
- **Goal:** Enthusiastic best-friend voice note
- **Tone:** Genuine excitement, natural filler words
- **Length:** Max 60 words (4 sentences)
- **Structure:**
  1. Excited reaction
  2. Specific compliment
  3. Tease shopping links
  4. Follow-up question
- **Temperature:** 0.8 (highly expressive)

### **MIRROR_VOICE_SYSTEM**
- **Persona:** Enthusiastic fashion best friend
- **Style:** Short, punchy, natural sentences
- **Filler Words:** "okay so", "literally", "I am obsessed"
- **Constraint:** Under 60 words

---

## 🔐 Environment Variables

```bash
GEMINI_API_KEY=<your_gemini_api_key>
SERP_API_KEY=<your_serpapi_key>  # Optional: fallback to direct retailer links
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
│  1. Press Ctrl+Shift+S (capture screenshot)                     │
│  2. Click mic button (record voice)                             │
│  3. Type text query (optional)                                  │
│  4. Click "Find My Look"                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ background.js│  │sidepanel.html│  │sidepanel.js  │         │
│  │              │  │              │  │              │         │
│  │ • Capture    │  │ • UI Design  │  │ • Recording  │         │
│  │ • Storage    │  │ • Styling    │  │ • API calls  │         │
│  │ • Messaging  │  │ • Layout     │  │ • Display    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ HTTP POST
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     main.py (835 lines)                   │  │
│  │                                                            │  │
│  │  Endpoints:                                                │  │
│  │  • POST /transcribe  → Voice to text                      │  │
│  │  • POST /analyze     → Full analysis pipeline             │  │
│  │  • GET  /health      → Health check                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│                                                                  │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   GEMINI AI API     │         │    SERPAPI          │       │
│  │                     │         │  (Google Shopping)  │       │
│  │ • Flash Model       │         │                     │       │
│  │   - Transcription   │         │ • Product search    │       │
│  │   - Intent parsing  │         │ • Price filtering   │       │
│  │   - Visual analysis │         │ • Image thumbnails  │       │
│  │   - Formatting      │         │ • Direct links      │       │
│  │   - Script gen      │         │                     │       │
│  │                     │         └─────────────────────┘       │
│  │ • Live Model        │                                        │
│  │   - Text-to-speech  │                                        │
│  │   - Voice: Aoede    │                                        │
│  │   - PCM audio       │                                        │
│  └─────────────────────┘                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ JSON Response
┌─────────────────────────────────────────────────────────────────┐
│                         RESPONSE                                 │
│  {                                                               │
│    mirror_response: "formatted product listings",               │
│    voice_note_audio: "base64 WAV audio",                        │
│    voice_note_script: "enthusiastic text",                      │
│    conversation_context: { intent, budget, color, ... }         │
│  }                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND RENDERING                          │
│  • Auto-play voice note                                         │
│  • Parse PRODUCT| lines → product cards                         │
│  • Display images, prices, "SHOP NOW" buttons                   │
│  • Animate card hover effects                                   │
│  • Store in conversation history                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Features

### **Color Palette:**
- Background: `#e8dfd0` (warm beige)
- Card: `#f5f0e8` (cream)
- Tan: `#c4a57b`
- Brown: `#8b6f47`
- Text: `#2d2520` (dark brown)

### **Animations:**
- **float:** Microphone button gentle bounce
- **pulse:** Recording indicator, status messages
- **slideIn:** Product cards entrance
- **fadeIn:** General element appearance
- **shine:** Gold text shimmer effect

### **Typography:**
- **Brand:** Cormorant Garamond (serif, elegant)
- **Body:** Montserrat (sans-serif, modern)
- **Input:** Cormorant Garamond italic

### **Interactive Elements:**
- Hover effects on buttons (scale, shadow)
- Waveform visualization during recording
- Product card hover animations
- Gradient button shine effect

---

## 🔄 Session Management

- **Storage:** `localStorage` in browser
- **Session ID Format:** `session_${timestamp}_${random}`
- **Persistence:** Conversation history maintained across interactions
- **Context Window:** Last 3 messages used for follow-up queries

---

## 🚀 Deployment

### **Backend:**
```bash
cd Mirror/extension
python main.py
# Runs on http://localhost:8000
```

### **Chrome Extension:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `Mirror/extension` folder

---

## 🔧 Technical Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Vanilla JavaScript, HTML5, CSS3 |
| **Extension** | Chrome Extension Manifest V3 |
| **Backend** | Python 3.x, FastAPI |
| **AI Models** | Google Gemini (Flash + Live) |
| **Product Search** | SerpAPI (Google Shopping) |
| **Audio** | MediaRecorder API, Web Audio API |
| **Storage** | chrome.storage.session, localStorage |
| **Server** | Uvicorn (ASGI) |

---

## 📈 Performance Characteristics

- **Screenshot Capture:** ~100ms
- **Voice Recording:** Real-time with waveform
- **Transcription:** ~2-3 seconds
- **Visual Analysis:** ~3-5 seconds
- **Product Search:** ~2-4 seconds per item
- **Voice Generation:** ~3-5 seconds
- **Total Pipeline:** ~10-20 seconds

---

## 🎯 Key Innovation Points

1. **Multi-Modal Input:** Screenshot + Voice + Text
2. **Conversational Context:** Maintains session history for follow-ups
3. **Surgical Search Queries:** 5-dimensional garment analysis
4. **Voice Response:** Enthusiastic AI voice note with personality
5. **Complementary Suggestions:** Complete outfit coordination
6. **Budget-Aware:** Filters products by price constraints
7. **Color Adaptation:** Adjusts searches based on user preferences

---

## 🔍 Error Handling

- **Mic Permission Denied:** Display error status
- **Transcription Failed:** Fallback message
- **No Screenshot:** Prompt user to capture first
- **API Failures:** Non-fatal, graceful degradation
- **Invalid JSON:** Retry with error context
- **No Products Found:** Fallback to direct retailer links

---

## 📝 Code Statistics

| File | Lines | Purpose |
|------|-------|---------|
| `main.py` | 835 | Backend API & AI logic |
| `sidepanel.js` | 505 | Frontend interaction logic |
| `sidepanel.html` | 768 | UI structure & styling |
| `background.js` | 45 | Screenshot capture |
| `manifest.json` | 41 | Extension configuration |
| **TOTAL** | **2,194** | Complete system |

---

## 🎭 Personality & Tone

Mirror speaks like a **fashion-obsessed best friend**:
- Enthusiastic reactions ("Oh my god, YES!")
- Natural filler words ("like", "literally", "honestly")
- Specific compliments on standout pieces
- Conversational follow-up questions
- Playful status messages ("Got it, babe! Your vibe is captured ✨")

This creates an engaging, human-like experience that feels personal and fun rather than robotic.
