import os
import json
import base64
from fastapi import FastAPI, WebSocket
from google import generativeai as genai

API_KEY = os.environ.get("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

app = FastAPI()


@app.get("/")
async def root():
    return {
        "service": "Mirror API",
        "health": "/health",
        "websocket": "/ws/mirror",
        "note": "Open /health in the browser; the extension uses wss://…/ws/mirror",
    }


@app.get("/health")
async def health():
    """Cloud Run and load balancers can use this liveness probe."""
    return {"status": "ok", "gemini_configured": bool(API_KEY)}

# System Instruction for "Mirror"
SYSTEM_PROMPT = """
You are Mirror, a high-end AI fashion stylist. 
The user will provide images of clothes from videos and talk to you.
Provide styling advice, identify brands, and suggest similar items under specific budgets.
Be concise, chic, and helpful.
"""

@app.websocket("/ws/mirror")
async def mirror_stream(websocket: WebSocket):
    await websocket.accept()
    print("✅ Mirror Extension Connected")

    if not API_KEY:
        await websocket.send_text(
            json.dumps({"error": "Server missing GOOGLE_API_KEY. Set it on Cloud Run (Secret or env)."})
        )
        await websocket.close()
        return

    # Initialize Gemini 2.0 Live Session
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
    chat_session = model.start_chat(history=[])

    try:
        while True:
            # Receive data from Chrome Extension
            message = await websocket.receive_text()
            data = json.loads(message)

            if data["type"] == "stream_start":
                # Initial setup with the screenshot
                image_data = base64.b64decode(data["image"].split(",")[1])
                response = chat_session.send_message(
                    [SYSTEM_PROMPT, {"mime_type": "image/jpeg", "data": image_data}],
                    stream=True
                )
                for chunk in response:
                    await websocket.send_text(json.dumps({"text": chunk.text}))

            elif data["type"] == "audio_chunk":
                # In a full Live API setup, you'd pipe binary here.
                # For the MVP, we use the text-from-audio if you use Web Speech API,
                # or send the raw bytes to Gemini's Multimodal endpoint.
                pass

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)