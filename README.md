# Mirror - AI Fashion Stylist 👗✨

**Your Personal AI Fashion Assistant That Sees, Listens, and Shops**

Mirror is an intelligent Chrome extension that combines computer vision, voice interaction, and AI-powered fashion analysis to help you find and shop clothing items from any screenshot. Simply capture what you see, describe what you want, and let Mirror find the perfect products for you.

---

## 🎯 What We're Building

Mirror transforms the way people shop online by bridging the gap between inspiration and purchase. Whether you're browsing social media, watching videos, or looking at fashion blogs, Mirror helps you instantly find and buy the clothes you love.

### **The Problem We Solve**
- You see a great outfit online but don't know where to buy it
- You want to describe what you're looking for but can't find the right search terms
- You need outfit recommendations and complementary pieces
- You want a personalized shopping experience with voice interaction

### **Our Solution**
Mirror uses cutting-edge AI to:
1. **Analyze screenshots** with surgical precision (5-dimensional garment analysis)
2. **Understand your voice** and conversational context
3. **Search products** across major retailers with smart filtering
4. **Suggest complete outfits** with complementary items
5. **Respond with personality** via AI-generated voice notes

---

## ✨ Key Features

### 🖼️ **Screenshot Capture**
- One-click screenshot capture with `Ctrl+Shift+S`
- Automatic image analysis using Google Gemini AI
- Identifies up to 3 clothing items per screenshot

### 🎤 **Voice Interaction**
- Record voice queries with real-time waveform visualization
- Natural language understanding (budget, color preferences, style)
- Conversational follow-ups ("Do you have it in green?")
- AI-generated voice responses with personality

### 🔍 **Intelligent Product Search**
- 5-dimensional garment analysis:
  - Precise color identification (e.g., "cobalt" not "blue")
  - Design details (silhouette, fit, length)
  - Construction features (puff sleeve, raw hem, etc.)
  - Pattern recognition (gingham, floral, solid)
  - Garment type classification
- Dual-query strategy (exact + fallback)
- Budget-aware filtering
- Real product links from major retailers

### 👔 **Complete Outfit Suggestions**
- 3 complementary items per look
- Coordinated colors and styles
- Shoes, bags, and accessories recommendations

### 💬 **Conversational Memory**
- Session-based conversation history
- Context-aware follow-up questions
- Remembers your preferences within a session

### 🎨 **Beautiful UI**
- Luxury tan/brown aesthetic
- Smooth animations and transitions
- Hover effects and interactive elements
- Mobile-responsive design

---

## 🏆 Leveraged Technologies

### **AI & Machine Learning**
- **Google Gemini 3.1 Flash Lite** - Multi-modal analysis (vision + audio + text)
- **Google Gemini 2.5 Flash Native Audio** - Text-to-speech with natural voice
- **Computer Vision** - Advanced garment recognition and classification
- **Natural Language Processing** - Intent parsing and conversation understanding

### **Backend**
- **FastAPI** - High-performance async web framework
- **Python 3.x** - Core backend language
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation and serialization

### **Frontend**
- **Chrome Extension Manifest V3** - Modern extension architecture
- **Vanilla JavaScript** - Lightweight, no framework overhead
- **Web Audio API** - Real-time waveform visualization
- **Canvas API** - Audio visualization
- **HTML5/CSS3** - Modern web standards

### **External APIs**
- **SerpAPI** - Google Shopping product search
- **Chrome APIs** - Screenshot capture, storage, messaging

### **Development Tools**
- **Git** - Version control
- **dotenv** - Environment variable management

---

## 📊 Highlights & Achievements

### **Technical Innovation**
✅ **Multi-Modal AI Pipeline** - Seamlessly combines vision, voice, and text  
✅ **Real-Time Voice Processing** - Live transcription and synthesis  
✅ **Surgical Search Precision** - 5-dimensional garment analysis  
✅ **Conversational Context** - Maintains session history for follow-ups  
✅ **Sub-20 Second Pipeline** - Fast end-to-end processing  

### **User Experience**
✅ **One-Click Capture** - Keyboard shortcut for instant screenshots  
✅ **Natural Voice Interaction** - Speak naturally, no commands needed  
✅ **Personality-Driven** - AI responds like an enthusiastic best friend  
✅ **Visual Feedback** - Waveform visualization, animations, status messages  
✅ **Complete Outfits** - Not just one item, but coordinated looks  

### **Performance Metrics**
- **Screenshot Capture:** ~100ms
- **Voice Transcription:** ~2-3 seconds
- **Visual Analysis:** ~3-5 seconds
- **Product Search:** ~2-4 seconds per item
- **Voice Generation:** ~3-5 seconds
- **Total Pipeline:** ~10-20 seconds

---

## 🚀 Getting Started

### **Prerequisites**

1. **Python 3.8+**
   ```bash
   python --version  # Should be 3.8 or higher
   ```

2. **Google Chrome Browser**
   - Download from [chrome.google.com](https://www.google.com/chrome/)

3. **API Keys** (Required)
   - **Gemini API Key** (Required) - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **SerpAPI Key** (Optional) - Get from [serpapi.com](https://serpapi.com/) for real product search

---

## 📦 Installation

### **Step 1: Clone the Repository**

```bash
git clone <repository-url>
cd Mirror-main/version2/Mirror
```

### **Step 2: Install Python Dependencies**

```bash
cd extension
pip install fastapi uvicorn google-generativeai requests python-dotenv pydantic
```

Or if you have a `requirements.txt`:
```bash
pip install -r requirements.txt
```

### **Step 3: Set Up Environment Variables**

Create a `.env` file in the `extension` directory:

```bash
cd extension
touch .env
```

Add your API keys to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SERP_API_KEY=your_serpapi_key_here
```

**Important Notes:**
- `GEMINI_API_KEY` is **required** - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `SERP_API_KEY` is **optional** - Without it, Mirror will provide direct retailer search links instead of specific products
- Never commit `.env` to version control (it's already in `.gitignore`)

### **Step 4: Start the Backend Server**

```bash
cd extension
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Keep this terminal running!** The backend must be active for Mirror to work.

### **Step 5: Install Chrome Extension**

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `Mirror/extension` folder
6. The Mirror extension should now appear in your extensions list

### **Step 6: Pin the Extension (Optional)**

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Mirror" in the list
3. Click the pin icon to keep it visible

---

## 🎮 How to Use Mirror

### **Basic Workflow**

1. **Capture a Screenshot**
   - Navigate to any webpage with fashion content
   - Press `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)
   - You'll see a confirmation: *"Got it, babe! Your vibe is captured ✨"*

2. **Open the Side Panel**
   - Click the Mirror extension icon in your toolbar
   - The side panel will open on the right

3. **Describe What You Want (3 Options)**

   **Option A: Voice Input**
   - Click the microphone button 🎤
   - Speak naturally: *"I need that red gingham top"*
   - Click the checkmark ✓ when done
   - Mirror will transcribe and populate the text field

   **Option B: Type Your Query**
   - Type in the text field: *"Find me this jacket in green under $100"*

   **Option C: Just Submit**
   - Leave the text field empty to analyze the screenshot without additional context

4. **Click "Find My Look ↩"**
   - Mirror will analyze the image
   - Search for products
   - Generate a voice response
   - Display product cards with "SHOP NOW" buttons

5. **Listen & Shop**
   - Mirror's voice note will auto-play with enthusiastic recommendations
   - Browse product cards with images, prices, and sources
   - Click "SHOP NOW ↗" to visit the retailer
   - Scroll to see complementary items (shoes, bags, accessories)

### **Advanced Features**

**Conversational Follow-Ups:**
```
First query: "I love this jacket"
Follow-up: "Do you have it in green?"
Follow-up: "What about under $50?"
Follow-up: "Show me shoes to match"
```

**Budget Constraints:**
```
"Find this dress under $100"
"Keep it under 50 dollars"
```

**Color Preferences:**
```
"Same style but in navy blue"
"I want this in black"
```

**Specific Items:**
```
"Just find me the shoes"
"I only need the jacket"
```

---

## 🛠️ Project Structure

```
Mirror/
├── extension/
│   ├── main.py              # FastAPI backend (835 lines)
│   ├── background.js        # Screenshot capture (45 lines)
│   ├── sidepanel.html       # UI structure (768 lines)
│   ├── sidepanel.js         # Frontend logic (505 lines)
│   ├── manifest.json        # Extension config (41 lines)
│   └── .env                 # API keys (create this)
├── ARCHITECTURE.md          # Technical documentation
├── ARCHITECTURE_DIAGRAM.md  # Visual diagrams
└── README.md               # This file
```

**Total Code:** 2,194 lines across 5 files

---

## 🔧 Configuration

### **Changing AI Models**

Edit `main.py` lines 36-41:

```python
# All standard text/vision/audio analysis calls
FLASH_MODEL = "gemini-3.1-flash-lite-preview"

# Live API — native audio output
LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
```

### **Adjusting Voice Personality**

Edit the `MIRROR_VOICE_SYSTEM` prompt in `main.py` (lines 365-373):

```python
MIRROR_VOICE_SYSTEM = """
You are Mirror — an enthusiastic, warm fashion best friend...
"""
```

### **Changing Keyboard Shortcut**

Edit `manifest.json` line 36:

```json
"suggested_key": { "default": "Ctrl+Shift+S" }
```

---

## 🐛 Troubleshooting

### **Backend won't start**
```bash
# Check Python version
python --version  # Should be 3.8+

# Install dependencies
pip install fastapi uvicorn google-generativeai requests python-dotenv

# Check if port 8000 is in use
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows
```

### **Extension not loading**
- Make sure you selected the `extension` folder, not the parent `Mirror` folder
- Check Chrome console for errors: Right-click extension → Inspect
- Verify `manifest.json` is valid JSON

### **"GEMINI_API_KEY is not set" error**
- Create `.env` file in the `extension` directory
- Add: `GEMINI_API_KEY=your_key_here`
- Restart the backend server

### **No products showing up**
- If you don't have `SERP_API_KEY`, you'll see direct retailer links instead
- Check backend console for search errors
- Verify internet connection

### **Voice not working**
- Grant microphone permissions when prompted
- Check browser microphone settings
- Try a different browser if issues persist

### **Screenshot not capturing**
- Make sure you're on a regular webpage (not chrome:// pages)
- Try pressing the keyboard shortcut again
- Check extension permissions in `chrome://extensions/`

---

## 📚 API Documentation

### **Backend Endpoints**

#### `POST /transcribe`
Transcribe audio to text.

**Request:**
```json
{
  "audio_data": "base64_encoded_audio",
  "mime_type": "audio/webm",
  "session_id": "session_123"
}
```

**Response:**
```json
{
  "transcript": "I need that red gingham top"
}
```

#### `POST /analyze`
Complete analysis pipeline.

**Request:**
```json
{
  "screenshot_data": "data:image/jpeg;base64,...",
  "text_input": "I need that red gingham top",
  "session_id": "session_123"
}
```

**Response:**
```json
{
  "mirror_response": "PRODUCT|name|price|source|url|thumbnail|desc...",
  "voice_note_audio": "base64_wav_audio",
  "voice_note_script": "Oh my god, yes, that top is...",
  "conversation_context": {
    "user_intent": "fresh_look",
    "budget": null,
    "color_preference": null
  }
}
```

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "Mirror backend is live ✅"
}
```

---

## 🧪 Testing

### **Test the Backend**

```bash
# Start the server
python main.py

# In another terminal, test health endpoint
curl http://localhost:8000/health
```

### **Test the Extension**

1. Load the extension in Chrome
2. Navigate to any fashion website (e.g., Pinterest, Instagram)
3. Press `Ctrl+Shift+S` to capture
4. Open the side panel
5. Try voice input or text input
6. Click "Find My Look"

---

## 🎨 Customization

### **Change Color Scheme**

Edit CSS variables in `sidepanel.html` (lines 545-557):

```css
:root {
    --background: #e8dfd0;
    --card:       #f5f0e8;
    --tan:        #c4a57b;
    --brown:      #8b6f47;
    --text-dark:  #2d2520;
}
```

### **Modify Prompts**

All AI prompts are in `main.py`:
- `TRANSCRIBE_PROMPT` (line 66)
- `CONVERSATION_PROMPT` (line 72)
- `ANALYSIS_PROMPT_TEMPLATE` (line 104)
- `FORMAT_PROMPT_TEMPLATE` (line 158)
- `VOICE_SCRIPT_PROMPT` (line 211)

---

## 📈 Performance Optimization

### **Speed Up Analysis**
- Use `gemini-flash` models (already configured)
- Reduce image quality in `background.js` (currently 70%)
- Limit product search results

### **Reduce API Costs**
- Lower temperature values for deterministic responses
- Cache common queries
- Implement rate limiting

---

## 🔒 Security & Privacy

- **API Keys:** Never commit `.env` to version control
- **User Data:** No data is stored permanently on servers
- **Session Data:** Stored in-memory, cleared on server restart
- **Screenshots:** Processed in real-time, not saved
- **Audio:** Transcribed and discarded, not stored

---

## 🤝 Team Members

This project was built by:

- **Bhanuja Karumuru**
- **Jnanasree Konda**
- **Sudharshan Rao Allu**

---

## 📄 License

[Add your license here]

---

## 🙏 Acknowledgments

- **Google Gemini AI** - For powerful multi-modal AI capabilities
- **SerpAPI** - For product search functionality
- **Chrome Extensions Team** - For excellent documentation

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check `ARCHITECTURE.md` for technical details
- Review `ARCHITECTURE_DIAGRAM.md` for system diagrams

---

## 🚀 Future Enhancements

- [ ] Mobile app version
- [ ] Save favorite looks
- [ ] Price tracking and alerts
- [ ] Social sharing features
- [ ] Multi-language support
- [ ] Integration with more retailers
- [ ] AR try-on features
- [ ] Style profile customization

---

**Built with ❤️ using AI, Voice, and Vision**