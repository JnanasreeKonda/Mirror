import os
import asyncio
import base64
import json
import io
import struct
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types

# ─────────────────────────────────────────────
# 1. SETUP
# ─────────────────────────────────────────────

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None

if load_dotenv:
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
SERP_API_KEY   = os.environ.get("SERP_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Create a .env file (ignored by git) or export GEMINI_API_KEY in your shell."
    )

# ── Model constants (change here to update everywhere) ──────────────────────
# All standard text/vision/audio analysis calls
FLASH_MODEL = "gemini-3.1-flash-lite-preview"
# Live API — native audio output (text-in, speech-out via WebSocket)
# Uses the stable native-audio model on the Gemini AI Studio key path.
# Switch to "gemini-live-2.5-flash-native-audio" if moving to Vertex AI.
LIVE_MODEL  = "gemini-2.5-flash-native-audio-preview-12-2025"
# ────────────────────────────────────────────────────────────────────────────

client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(title="Mirror Backend")

# Session storage for conversation history
conversation_history = {}
# Format: {"session_id": {"messages": [], "last_analysis": {}, "last_products": {}}}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# 2. CONVERSATION INTENT PROMPT
#    Runs FIRST on the audio to extract what the
#    user actually wants before we do image analysis.
#    Handles budget, color prefs, follow-up questions, etc.
# ─────────────────────────────────────────────

TRANSCRIBE_PROMPT = """
Transcribe the audio exactly as spoken. Return ONLY the verbatim transcript text.
Do not add any interpretation, summary, or analysis.
Just return the exact words the user said.
"""

CONVERSATION_PROMPT = """
You are Mirror — a warm, witty fashion-director best friend.

The user has sent you a voice message. Listen carefully and extract:
1. Are they asking about a specific item (e.g. "just find me the jacket")?
2. Do they mention a budget? (e.g. "under $100", "keep it under 50")
3. Do they mention a color preference? (e.g. "but in green", "do you have this in red")
4. Do they mention a style preference? (e.g. "more casual", "something edgier")
5. Are they asking a follow-up question rather than a fresh request? (e.g. "what about shoes to match?")
6. Any other useful context?

Return ONLY valid JSON. No markdown, no explanation:

{
  "user_intent": "fresh_look | follow_up | specific_item | question",
  "focus_item": "null or specific garment they want (e.g. 'jacket', 'shoes')",
  "budget": null,
  "color_preference": null,
  "style_preference": null,
  "follow_up_question": null,
  "raw_transcript_summary": "One sentence summary of what they said"
}

If there is no audio or it's silent, return:
{"user_intent": "fresh_look", "focus_item": null, "budget": null, "color_preference": null, "style_preference": null, "follow_up_question": null, "raw_transcript_summary": "No audio provided"}
"""

# ─────────────────────────────────────────────
# 3. STEP 1 PROMPT — Deep Visual Analysis → JSON
#    Now accepts conversation context to focus analysis
# ─────────────────────────────────────────────

ANALYSIS_PROMPT_TEMPLATE = """
You are Mirror — a world-class fashion director with 20 years across Vogue and Net-a-Porter.

{conversation_context}

Analyze the image and identify up to 3 key clothing/accessory items.
{focus_instruction}
For each item, extract PRECISE details across ALL 5 dimensions below.

Return ONLY valid JSON. No markdown, no explanation, no code fences. Raw JSON only.

{{
  "scene_summary": "One editorial sentence describing the overall look",
  "gender": "Womenswear | Menswear | Unisex",
  "demographic": "Gen Z (16-24) | Millennial (25-35) | Adult (35-50) | Mature (50+)",
  "items": [
    {{
      "garment_type": "e.g. wrap midi dress",
      "color": "precise shade — not 'blue' but 'cobalt' or 'powder blue' or 'slate'",
      "design": "silhouette + fit + length — e.g. oversized boxy crop, relaxed wide-leg, fitted A-line",
      "details": "defining construction details — e.g. puff sleeve, raw hem, notch lapel, tortoiseshell buttons",
      "print": "precise pattern — e.g. ditsy liberty floral micro-scale allover, wide breton stripe, OR 'solid' if none",
      "exact_query": "hyper-specific Google Shopping query — include ALL: color + print + silhouette + garment type + key detail + gender. Example: 'dusty rose ditsy floral wrap midi dress puff sleeve women'",
      "fallback_query": "broader query — drop print and details, keep only color + garment type + gender. Example: 'dusty rose midi dress women'",
      "complementary_items": [
        {{
          "item_type": "e.g. ankle boots, crossbody bag, statement earrings",
          "search_query": "specific search query for this complementary item with color/style that pairs well. Example: 'tan leather ankle boots women' or 'gold hoop earrings'"
        }}
      ]
    }}
  ],
  "budget_mentioned": null
}}

RULES:
- exact_query must be surgical and specific — every visible detail included
- fallback_query keeps only the 2-3 most dominant traits — still useful, not generic
- Always end BOTH queries with gender: 'women' / 'men' / 'unisex'
- If the user mentioned a color preference like 'in green', ADJUST the queries to search for that color instead
- If the user's voice mentions a budget like 'under $50', set budget_mentioned to that number (integer only)
- Identify gender from: garment cut, styling, body shape if visible, context clues
- Identify demographic from: silhouette choices, styling, color palette, trend signals
- complementary_items should include 3 items that would pair well with this garment (shoes, bags, accessories, or other clothing)
- Each complementary item needs a specific search query that will find products that coordinate with the main item's color/style

If the image is unclear or has no clothing:
{{"error": "I need a cleaner frame — pause the video on a sharp shot and try again!"}}
"""

# ─────────────────────────────────────────────
# 4. FORMAT PROMPT — Final Styled Response
# ─────────────────────────────────────────────

FORMAT_PROMPT_TEMPLATE = """
You are Mirror — a world-class fashion director.

Here is the visual analysis of the outfit:
{analysis}

Here are the real products found (exact matches first, then similar alternatives):
{products}

User context: {user_context}

Write the final Mirror response using EXACTLY this format — no deviations:

---

[scene_summary from analysis]
[gender] | [demographic]

### [Garment Type — color + key detail]

[For each product, use this EXACT format with pipe separators:]
PRODUCT|[Product name]|[price]|[source]|[direct URL]|[thumbnail URL]|[one sharp phrase]

[repeat for each main product - up to 5]

**Complete The Look:**

[For each complementary item:]
COMPLEMENTARY|[item type]|[Product name]|[price]|[source]|[direct URL]|[thumbnail URL]|[one sharp phrase]

[repeat for each complementary item - up to 3]

---

[One sharp, specific sentence on how to complete or elevate this look]

---

STRICT RULES:
- Use PRODUCT| prefix for main items and COMPLEMENTARY| prefix for complementary items
- Each product line must have ALL fields separated by | (pipe character)
- ONLY use URLs from the results provided — never invent or guess URLs
- URLs must be complete and properly formatted
- If a product has no link or thumbnail, use empty string but keep the pipe separator
- Do not add any text outside this format
- Tone: confident, editorial, precise
"""

# ─────────────────────────────────────────────
# 5. VOICE NOTE SCRIPT PROMPT
#    Generates the enthusiastic spoken response script
# ─────────────────────────────────────────────

VOICE_SCRIPT_PROMPT = """
You are Mirror — a fashion-obsessed best friend who is GENUINELY excited about helping people find their look.

Based on this outfit analysis:
{analysis}

And the user's context:
{user_context}

Write a SHORT, enthusiastic, natural voice note script (max 4 sentences) that:
1. Opens with a genuine reaction to the look (like "Oh my god, YES!", "Okay bestie, we are EATING today!", "You go girl!")
2. Calls out the standout piece by name with a specific compliment
3. Teases that you found great shopping links for them
4. Ends by asking ONE natural follow-up question — like if they want it in another color, need shoes to match, or want to adjust the budget

RULES:
- Sound like a real excited friend texting a voice note, NOT a robot or a press release
- Use natural filler phrases: "like", "honestly", "okay so", "literally", "I am obsessed"
- NO emojis in the script — this is speech
- Keep it under 60 words total
- End on a question that invites them to continue the conversation

Return ONLY the script text, nothing else.
"""

# ─────────────────────────────────────────────
# 6. SEARCH — Exact first, fallback if needed
# ─────────────────────────────────────────────

def search_products(exact_query: str, fallback_query: str, max_price: float = 0) -> dict:
    try:
        if isinstance(max_price, str):
            max_price = max_price.strip().replace("$", "").replace(",", "")
        max_price = float(max_price) if max_price else 0
    except Exception:
        max_price = 0

    def serp_search(query: str, limit: int) -> list:
        if not SERP_API_KEY or SERP_API_KEY == "YOUR_SERPAPI_KEY_HERE":
            q = query.replace(" ", "+")
            return [
                {"name": f"ASOS: {query}",      "price": "varies", "link": f"https://www.asos.com/search/?q={q}",       "source": "ASOS"},
                {"name": f"Amazon: {query}",    "price": "varies", "link": f"https://www.amazon.com/s?k={q}",           "source": "Amazon"},
                {"name": f"Nordstrom: {query}", "price": "varies", "link": f"https://www.nordstrom.com/sr?keyword={q}", "source": "Nordstrom"},
                {"name": f"Zara: {query}",      "price": "varies", "link": f"https://www.zara.com/us/en/search?searchTerm={q}", "source": "Zara"},
                {"name": f"H&M: {query}",       "price": "varies", "link": f"https://www2.hm.com/en_us/search-results.html?q={q}", "source": "H&M"},
            ][:limit]

        try:
            resp = requests.get(
                "https://serpapi.com/search",
                params={
                    "engine":  "google_shopping",
                    "q":       query,
                    "api_key": SERP_API_KEY,
                    "num":     10,
                    "gl":      "us",
                    "hl":      "en",
                },
                timeout=10
            )
            data = resp.json()
        except Exception as e:
            print(f"SerpAPI error for '{query}': {e}")
            return []

        results = []
        seen_links = set()
        for item in data.get("shopping_results", []):
            price_str = item.get("price", "$0").replace("$", "").replace(",", "")
            try:
                price = float(price_str)
            except:
                price = 0

            if max_price and max_price > 0 and price > max_price:
                continue

            # Get the actual product link - try multiple fields in priority order
            # 1. product_link - direct retailer URL
            # 2. link - may be Google redirect but sometimes direct
            link = item.get("product_link") or item.get("link", "")
            
            # Get product thumbnail image
            thumbnail = item.get("thumbnail", "")
            
            # Debug: print what we're getting
            if link:
                print(f"    Product: {item.get('title', 'N/A')[:50]}")
                print(f"    Source: {item.get('source', 'N/A')}")
                print(f"    Link: {link[:80]}...")
                print(f"    Thumbnail: {thumbnail[:60] if thumbnail else 'None'}..." if thumbnail else "    Thumbnail: None")
            
            if not link or link in seen_links:
                continue

            seen_links.add(link)
            
            # Clean up the link - ensure it's a proper URL
            if link and not link.startswith("http"):
                link = "https://" + link
            
            results.append({
                "name":   item.get("title", ""),
                "price":  item.get("price", "N/A"),
                "link":   link,
                "source": item.get("source", ""),
                "thumbnail": thumbnail,
            })

            if len(results) >= limit:
                break

        return results

    # Get 2 main products (exact + similar combined)
    exact_results = serp_search(exact_query, limit=2)
    print(f"  Exact  '{exact_query}' → {len(exact_results)} results")

    similar_results = []
    remaining = 2 - len(exact_results)

    if remaining > 0:
        all_fallback = serp_search(fallback_query, limit=remaining + 5)
        exact_links = {r["link"] for r in exact_results}
        for item in all_fallback:
            if item["link"] not in exact_links:
                similar_results.append(item)
            if len(similar_results) >= remaining:
                break
        print(f"  Similar '{fallback_query}' → {len(similar_results)} additional results")

    return {
        "exact":   exact_results,
        "similar": similar_results
    }

# ─────────────────────────────────────────────
# 7. VOICE NOTE — Generate enthusiastic audio reply
#    Uses Gemini Live API (LIVE_MODEL — see model constants in setup)
#    which is audio-to-audio and available with your key.
#
#    Flow:
#      1. Open a Live session (async WebSocket)
#      2. Send the voice script as text
#      3. Signal end of turn so the model responds
#      4. Collect raw PCM chunks until turn_complete
#      5. Wrap PCM → WAV → base64 for the frontend
#
#    The frontend plays it with:
#      const audio = new Audio(`data:audio/wav;base64,${voice_note_audio}`);
#      audio.play();
# ─────────────────────────────────────────────

MIRROR_VOICE_SYSTEM = """
You are Mirror — an enthusiastic, warm fashion best friend recording a quick voice note.
You speak in short, punchy, natural sentences. You're genuinely hyped.
Use filler words like "okay so", "literally", "I am obsessed", "like".
Never sound robotic or formal. Sound like a real excited friend.
Keep your response under 60 words.
End with one natural follow-up question — like asking if they want a different color,
need shoes to match, or want to adjust the budget.
"""

def _pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000, channels: int = 1, bit_depth: int = 16) -> bytes:
    """Wraps raw PCM bytes in a WAV container so browsers can play it directly."""
    byte_rate    = sample_rate * channels * bit_depth // 8
    block_align  = channels * bit_depth // 8
    data_size    = len(pcm_bytes)
    wav_buf = io.BytesIO()
    # RIFF header
    wav_buf.write(b"RIFF")
    wav_buf.write(struct.pack("<I", 36 + data_size))   # chunk size
    wav_buf.write(b"WAVE")
    # fmt  sub-chunk
    wav_buf.write(b"fmt ")
    wav_buf.write(struct.pack("<I", 16))               # sub-chunk size (PCM)
    wav_buf.write(struct.pack("<H", 1))                # audio format (PCM = 1)
    wav_buf.write(struct.pack("<H", channels))
    wav_buf.write(struct.pack("<I", sample_rate))
    wav_buf.write(struct.pack("<I", byte_rate))
    wav_buf.write(struct.pack("<H", block_align))
    wav_buf.write(struct.pack("<H", bit_depth))
    # data sub-chunk
    wav_buf.write(b"data")
    wav_buf.write(struct.pack("<I", data_size))
    wav_buf.write(pcm_bytes)
    return wav_buf.getvalue()


async def _generate_voice_note_async(script: str) -> str | None:
    """
    Opens a Live API session, sends the script as text,
    collects PCM audio chunks, and returns base64 WAV.
    """
    config = {
        "response_modalities": ["AUDIO"],
        "system_instruction": MIRROR_VOICE_SYSTEM,
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": "Aoede"   # Bright, expressive female voice
                }
            }
        },
    }

    pcm_chunks = []

    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
            # send_client_content is the correct method for text turns into the Live API.
            # It signals a complete user turn (end_of_turn=True) so the model knows
            # to start generating its audio response immediately.
            await session.send_client_content(
                turns=types.Content(
                    role="user",
                    parts=[types.Part(text=script)]
                ),
                turn_complete=True,
            )

            # Collect audio response until the model signals turn_complete
            async for response in session.receive():
                # Grab any audio parts
                if response.server_content and response.server_content.model_turn:
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            pcm_chunks.append(part.inline_data.data)

                # Stop when the model is done speaking
                if response.server_content and response.server_content.turn_complete:
                    break

    except Exception as e:
        print(f"  Live API session error (non-fatal): {e}")
        return None

    if not pcm_chunks:
        print("  Live API returned no audio chunks.")
        return None

    raw_pcm = b"".join(pcm_chunks)
    wav_bytes = _pcm_to_wav(raw_pcm)
    print(f"  Voice note ready: {len(raw_pcm):,} PCM bytes → {len(wav_bytes):,} WAV bytes")
    return base64.b64encode(wav_bytes).decode("utf-8")


def generate_voice_note(script: str) -> str | None:
    """
    Sync wrapper so FastAPI's regular (non-async) endpoint
    can call the async Live API session cleanly.
    """
    try:
        return asyncio.run(_generate_voice_note_async(script))
    except RuntimeError:
        # asyncio.run() can't be called inside a running event loop (e.g. during tests).
        # Fall back to creating a new loop explicitly.
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_generate_voice_note_async(script))
        finally:
            loop.close()

# ─────────────────────────────────────────────
# 8. REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    screenshot_data: str
    text_input: str = ""
    session_id: str = "default"

class MirrorResponse(BaseModel):
    mirror_response: str           # editorial formatted text (unchanged)
    voice_note_audio: str | None   # base64 WAV audio — Mirror's enthusiastic reply
    voice_note_script: str | None  # plain text of what Mirror says (for debugging/captions)
    conversation_context: dict     # what Mirror understood from the user's audio
    products_data: dict | None = None  # structured product data with verified URLs


class TranscribeRequest(BaseModel):
    audio_data: str = ""
    text_input: str = ""
    mime_type: str = "audio/webm"
    session_id: str = "default"


class TranscribeResponse(BaseModel):
    transcript: str

# ─────────────────────────────────────────────
# 9. CORE ENDPOINT
# ─────────────────────────────────────────────

@app.post("/analyze", response_model=MirrorResponse)
async def analyze_look(request: AnalyzeRequest):
    
    # Initialize session if needed
    session_id = request.session_id
    if session_id not in conversation_history:
        conversation_history[session_id] = {
            "messages": [],
            "last_analysis": {},
            "last_products": {}
        }

    # ── Decode image ──────────────────────────────────────────────────────────────────────
    try:
        _, image_b64 = request.screenshot_data.split(",", 1)
        image_bytes  = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid screenshot_data format.")

    # ── Decode audio (optional) ───────────────────────────────────────────
    audio_bytes = b""
    if hasattr(request, 'audio_data') and request.audio_data:
        try:
            audio_bytes = base64.b64decode(request.audio_data)
        except Exception:
            pass

    # ══════════════════════════════════════════
    # STEP 0: Understand the conversation intent
    #         Listen to what the user actually wants
    #         before doing image analysis
    # ══════════════════════════════════════════
    conversation = {
        "user_intent": "fresh_look",
        "focus_item": None,
        "budget": None,
        "color_preference": None,
        "style_preference": None,
        "follow_up_question": None,
        "raw_transcript_summary": "No audio provided"
    }

    if request.text_input:
        try:
            conv_response = client.models.generate_content(
                model=FLASH_MODEL,
                config=types.GenerateContentConfig(temperature=0.1),
                contents=[CONVERSATION_PROMPT, request.text_input],
            )
            raw_conv = conv_response.text.strip()
            if raw_conv.startswith("```"):
                raw_conv = raw_conv.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            conversation = json.loads(raw_conv)
            conversation["raw_transcript_summary"] = request.text_input
            print(f"\nConversation context (text): {json.dumps(conversation, indent=2)}\n")
        except Exception as e:
            print(f"Conversation parsing failed for text_input (non-fatal): {e}")

    elif audio_bytes:
        try:
            audio_part = types.Part.from_bytes(
                data=audio_bytes,
                mime_type=getattr(request, 'mime_type', None) or "audio/webm"
            )
            conv_response = client.models.generate_content(
                model=FLASH_MODEL,
                config=types.GenerateContentConfig(temperature=0.1),
                contents=[CONVERSATION_PROMPT, audio_part],
            )
            raw_conv = conv_response.text.strip()
            if raw_conv.startswith("```"):
                raw_conv = raw_conv.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            conversation = json.loads(raw_conv)
            print(f"\nConversation context: {json.dumps(conversation, indent=2)}\n")
        except Exception as e:
            print(f"Conversation parsing failed (non-fatal): {e}")

    # ══════════════════════════════════════════
    # STEP 1: Gemini → deep visual analysis JSON
    #         Now informed by conversation context
    # ══════════════════════════════════════════

    # Build dynamic context instructions based on what the user said
    # Include previous conversation history for follow-ups
    conversation_context = ""
    focus_instruction = ""
    
    # Add previous messages to context
    session = conversation_history[session_id]
    if session["messages"]:
        conversation_context += "Previous conversation:\n"
        for msg in session["messages"][-3:]:
            conversation_context += f"- User: {msg.get('user', '')}\n"
            if msg.get('response'):
                conversation_context += f"- Mirror: {msg.get('response', '')[:100]}...\n"
        conversation_context += "\n"
    
    # Add current message
    if conversation.get("raw_transcript_summary") and conversation["raw_transcript_summary"] != "No audio provided":
        conversation_context += f"Current request: \"{conversation['raw_transcript_summary']}\"\n"
        
        # Store in history
        session["messages"].append({
            "user": conversation["raw_transcript_summary"],
            "timestamp": json.dumps({"intent": conversation.get("user_intent")})
        })

    if conversation.get("color_preference"):
        conversation_context += f"IMPORTANT: The user wants to see this in {conversation['color_preference']} — adjust search queries for that color.\n"

    if conversation.get("budget"):
        conversation_context += f"Budget constraint: under ${conversation['budget']}.\n"

    if conversation.get("focus_item"):
        focus_instruction = f"FOCUS ONLY on the {conversation['focus_item']} — the user specifically asked about this item."

    analysis_prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        conversation_context=conversation_context,
        focus_instruction=focus_instruction,
    )

    image_part     = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
    step1_contents = [analysis_prompt, image_part]
    if audio_bytes:
        step1_contents.append(
            types.Part.from_bytes(
                data=audio_bytes,
                mime_type=request.mime_type or "audio/webm"
            )
        )

    try:
        step1_response = client.models.generate_content(
            model=FLASH_MODEL,
            config=types.GenerateContentConfig(temperature=0.2),
            contents=step1_contents,
        )
        raw = step1_response.text.strip()
        print(f"\nStep 1 output:\n{raw}\n")

        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        analysis = json.loads(raw)

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}\nRaw was: {raw}")
        raise HTTPException(status_code=500, detail="Gemini returned invalid JSON in step 1.")
    except Exception as e:
        print(f"Step 1 error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini step 1 failed: {str(e)}")

    if "error" in analysis:
        return MirrorResponse(
            mirror_response=analysis["error"],
            voice_note_audio=None,
            voice_note_script=None,
            conversation_context=conversation
        )

    # ══════════════════════════════════════════
    # STEP 2: Product search - 5 main + 3 complementary per item
    # ══════════════════════════════════════════
    budget = conversation.get("budget") or analysis.get("budget_mentioned") or 0
    items  = analysis.get("items", [])

    all_products = {}
    for item in items:
        garment        = item.get("garment_type", "item")
        exact_query    = item.get("exact_query", "")
        fallback_query = item.get("fallback_query", "")
        complementary  = item.get("complementary_items", [])

        if not exact_query:
            continue

        print(f"\nSearching for: {garment}")
        # Get 5 main products
        main_results = search_products(
            exact_query=exact_query,
            fallback_query=fallback_query,
            max_price=budget
        )
        
        # Get 3 complementary items
        complementary_results = []
        for comp_item in complementary[:3]:  # Limit to 3
            comp_query = comp_item.get("search_query", "")
            comp_type = comp_item.get("item_type", "accessory")
            if comp_query:
                print(f"  + Complementary: {comp_type}")
                comp_products = search_products(
                    exact_query=comp_query,
                    fallback_query=comp_query,
                    max_price=budget
                )
                # Take only 1 product per complementary item
                all_comp = comp_products.get("exact", []) + comp_products.get("similar", [])
                if all_comp:
                    complementary_results.append({
                        "type": comp_type,
                        "product": all_comp[0]
                    })
        
        all_products[garment] = {
            "main": main_results,
            "complementary": complementary_results
        }

    # ══════════════════════════════════════════
    # STEP 3: Gemini formats the editorial response
    # ══════════════════════════════════════════
    user_context_str = json.dumps(conversation, indent=2)

    print("\n=== PRODUCTS DATA ===")
    print(json.dumps(all_products, indent=2)[:500])  # First 500 chars

    format_prompt = FORMAT_PROMPT_TEMPLATE.format(
        analysis=json.dumps(analysis, indent=2),
        products=json.dumps(all_products, indent=2),
        user_context=user_context_str,
    )

    try:
        step3_response = client.models.generate_content(
            model=FLASH_MODEL,
            config=types.GenerateContentConfig(temperature=0.4),
            contents=[format_prompt],
        )
        mirror_text = step3_response.text
        
        print("\n=== FORMATTED RESPONSE ===")
        print(mirror_text[:800])  # First 800 chars
        print("\n")
        
        # Store analysis and products in session
        session["last_analysis"] = analysis
        session["last_products"] = all_products
        
        # Update last message with response
        if session["messages"]:
            session["messages"][-1]["response"] = mirror_text[:200]

    except Exception as e:
        print(f"Step 3 error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini step 3 failed: {str(e)}")

    # ══════════════════════════════════════════
    # STEP 4: Generate enthusiastic voice note
    #         Mirror reacts, hypes the look,
    #         and asks a conversational follow-up
    # ══════════════════════════════════════════
    voice_script = None
    voice_audio  = None

    try:
        voice_prompt = VOICE_SCRIPT_PROMPT.format(
            analysis=json.dumps(analysis, indent=2),
            user_context=user_context_str,
        )
        script_response = client.models.generate_content(
            model=FLASH_MODEL,
            config=types.GenerateContentConfig(temperature=0.8),  # Higher temp = more natural/expressive
            contents=[voice_prompt],
        )
        voice_script = script_response.text.strip()
        print(f"\nVoice script:\n{voice_script}\n")

        # Convert script → audio via Gemini Live API (LIVE_MODEL)
        voice_audio = await _generate_voice_note_async(voice_script)

    except Exception as e:
        print(f"Voice note generation failed (non-fatal): {e}")

    return MirrorResponse(
        mirror_response=mirror_text,
        voice_note_audio=voice_audio,       # base64 WAV — play directly in UI with <audio> tag
        voice_note_script=voice_script,     # text transcript for captions / fallback
        conversation_context=conversation,  # what Mirror understood from user's voice
        products_data=all_products,         # structured product data with verified URLs
    )


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(request: TranscribeRequest):
    transcript = ""

    if request.text_input:
        return TranscribeResponse(transcript=request.text_input)

    audio_bytes = b""
    if request.audio_data:
        try:
            audio_bytes = base64.b64decode(request.audio_data)
        except Exception:
            audio_bytes = b""

    if audio_bytes:
        try:
            audio_part = types.Part.from_bytes(
                data=audio_bytes,
                mime_type=request.mime_type or "audio/webm"
            )
            transcribe_response = client.models.generate_content(
                model=FLASH_MODEL,
                config=types.GenerateContentConfig(temperature=0.0),
                contents=[TRANSCRIBE_PROMPT, audio_part],
            )
            transcript = transcribe_response.text.strip()
        except Exception as e:
            print(f"Transcription failed (non-fatal): {e}")
            transcript = "[Transcription failed]"

    return TranscribeResponse(transcript=transcript)


# ─────────────────────────────────────────────
# 10. HEALTH CHECK
# ─────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "Mirror backend is live ✅"}


# ─────────────────────────────────────────────
# 11. LOCAL DEV RUNNER
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)