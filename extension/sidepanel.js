//let mediaRecorder;
//let audioChunks = [];
//let capturedImage = null;
//
//// --- 1. STATUS HANDLER ---
//function updateStatus(text) {
//    const statusEl = document.getElementById('status');
//    if (statusEl) statusEl.innerText = text.toUpperCase();
//}
//
//// --- 2. SCREENSHOT LISTENER ---
//chrome.runtime.onMessage.addListener((message) => {
//    if (message.type === "SCREENSHOT_CAPTURED") {
//        capturedImage = message.data;
//        document.getElementById('preview').src = capturedImage;
//        document.getElementById('preview').style.display = 'block';
//        document.getElementById('emptyState').style.display = 'none';
//        updateStatus("Context captured");
//    }
//});
//
//// --- 3. VOICE RECORDING ---
//const micBtn = document.getElementById('micBtn');
//const micLabel = document.getElementById('micLabel');
//const micSub = document.getElementById('micSub');
//const userInput = document.getElementById('user-input');
//const chapterLabel = document.getElementById('chapterLabel');
//
//micBtn.addEventListener('click', async () => {
//    if (mediaRecorder && mediaRecorder.state === "recording") {
//        stopVoiceCapture();
//    } else {
//        await startVoiceCapture();
//    }
//});
//
//async function startVoiceCapture() {
//    try {
//        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//        mediaRecorder = new MediaRecorder(stream);
//        audioChunks = [];
//
//        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
//        mediaRecorder.onstop = async () => {
//            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
//            sendToTranscribe(audioBlob);
//        };
//
//        mediaRecorder.start();
//        micLabel.innerText = "Listening...";
//        micSub.innerText = "Speak your style desire";
//        chapterLabel.innerText = "Voice Inscription";
//        updateStatus("Recording");
//    } catch (err) {
//        updateStatus("Mic Error");
//    }
//}
//
//function stopVoiceCapture() {
//    mediaRecorder.stop();
//    micLabel.innerText = "Touch the orb to speak";
//    micSub.innerText = "Voice becomes intention";
//    chapterLabel.innerText = "Inscribe your desire";
//    updateStatus("Transcribing");
//}
//
//// --- 4. BACKEND INTEGRATION ---
//async function sendToTranscribe(blob) {
//    const reader = new FileReader();
//    reader.readAsDataURL(blob);
//    reader.onloadend = async () => {
//        const base64Audio = reader.result.split(',')[1];
//        try {
//            const response = await fetch('http://localhost:8000/transcribe', {
//                method: 'POST',
//                headers: { 'Content-Type': 'application/json' },
//                body: JSON.stringify({ audio: base64Audio })
//            });
//            const data = await response.json();
//            userInput.value = data.text;
//            userInput.focus();
//            updateStatus("Review and press Enter");
//        } catch (e) {
//            updateStatus("STT Failed");
//        }
//    };
//}
//
//userInput.addEventListener('keypress', (e) => {
//    if (e.key === 'Enter') {
//        const finalQuery = userInput.value;
//        // FINAL SEND LOGIC
//        consolmain.pye.log("Sending to Stylist:", finalQuery);
//        updateStatus("Finding your look...");
//    }
//});


// ─────────────────────────────────────────────
// Mirror — sidepanel.js (fully integrated)
// ─────────────────────────────────────────────



// ─────────────────────────────────────────────
// Mirror — sidepanel.js (fully integrated)
// ─────────────────────────────────────────────

const BACKEND = "http://localhost:8000";

let mediaRecorder   = null;
let audioChunks     = [];
let capturedImage   = null;
let audioBlob       = null;   // holds the last recorded voice note
let audioMimeType   = "audio/webm";
let isRecording     = false;

// ── DOM refs ──────────────────────────────────
const micBtn        = document.getElementById("micBtn");
const micSub        = document.getElementById("micSub");
const userInput     = document.getElementById("user-input");
const chapterLabel  = document.getElementById("chapterLabel");
const statusEl      = document.getElementById("status");
const preview       = document.getElementById("preview");
const emptyState    = document.getElementById("emptyState");
const sendBtn       = document.getElementById("sendBtn");
const outputPanel   = document.getElementById("outputPanel");

// ─────────────────────────────────────────────
// 1. STATUS
// ─────────────────────────────────────────────
function updateStatus(text) {
  if (statusEl) statusEl.innerText = text.toUpperCase();
}

// ─────────────────────────────────────────────
// 2. SCREENSHOT LISTENER
// ─────────────────────────────────────────────
function applyScreenshot(dataUrl) {
  capturedImage = dataUrl;
  preview.src = dataUrl;
  preview.style.display = "block";
  emptyState.style.display = "none";
  updateStatus("Context captured — speak or type your desire");
}

// Live message (panel was already open when shortcut was pressed)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SCREENSHOT_CAPTURED") {
    applyScreenshot(message.data);
  }
});

// Fallback: panel just opened — grab screenshot saved by background.js
chrome.storage.session.get("lastScreenshot", (result) => {
  if (result.lastScreenshot) {
    applyScreenshot(result.lastScreenshot);
    chrome.storage.session.remove("lastScreenshot");
  }
});

// ─────────────────────────────────────────────
// 3. VOICE RECORDING
// ─────────────────────────────────────────────
micBtn.addEventListener("click", async () => {
  if (isRecording) {
    stopVoiceCapture();
  } else {
    await startVoiceCapture();
  }
});

async function startVoiceCapture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick best supported MIME type
    const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"];
    audioMimeType   = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "audio/webm";

    mediaRecorder = new MediaRecorder(stream, { mimeType: audioMimeType });
    audioChunks   = [];
    audioBlob     = null;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: audioMimeType });
      // Stop all tracks so mic indicator goes away
      stream.getTracks().forEach((t) => t.stop());
      updateStatus("Voice captured — press Enter or click Send");
    };

    mediaRecorder.start(250); // collect data every 250ms
    isRecording = true;

    micBtn.style.borderColor  = "#ff4444";
    micBtn.style.background   = "radial-gradient(circle, rgba(255,68,68,0.25), transparent)";
    micSub.innerText          = "Tap again to stop";
    chapterLabel.innerText    = "Listening…";
    updateStatus("Recording");
  } catch (err) {
    console.error("Mic error:", err);
    updateStatus("Mic access denied");
  }
}

function stopVoiceCapture() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  isRecording = false;

  micBtn.style.borderColor  = "var(--gold)";
  micBtn.style.background   = "radial-gradient(circle, rgba(201,168,76,0.2), transparent)";
  micSub.innerText          = "Voice becomes intention";
  chapterLabel.innerText    = "Inscribe your desire";
}

// ─────────────────────────────────────────────
// 4. SUBMIT — text Enter key or Send button
// ─────────────────────────────────────────────
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitToMirror();
  }
});

if (sendBtn) {
  sendBtn.addEventListener("click", () => submitToMirror());
}

async function submitToMirror() {
  if (!capturedImage) {
    updateStatus("No screenshot yet — press Ctrl+Shift+S first");
    return;
  }

  const textQuery = userInput.value.trim();

  // Resolve audio to base64 if we have a blob
  let audio_data = "";
  let mime_type  = audioMimeType;

  if (audioBlob) {
    audio_data = await blobToBase64(audioBlob);
    mime_type  = audioBlob.type || audioMimeType;
    // Strip the data:... prefix — backend wants raw base64
    if (audio_data.includes(",")) {
      audio_data = audio_data.split(",")[1];
    }
  } else if (textQuery === "") {
    updateStatus("Type or speak your style desire first");
    return;
  }

  // Show loading state
  showLoading();
  updateStatus("Finding your look…");

  try {
    const body = {
      image_data: capturedImage,          // already data:image/jpeg;base64,...
      audio_data: audio_data,             // raw base64 or ""
      mime_type:  mime_type,
    };

    // If user typed text but no audio, inject text into the analysis as a note
    // (backend uses audio primarily; text input goes as a user_text field if supported,
    //  otherwise we just pass it — the image + voice note is the primary signal)
    if (textQuery && !audio_data) {
      body.user_text = textQuery;         // passed through for context
    }

    const response = await fetch(`${BACKEND}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    renderOutput(data);

    // Reset after successful send
    audioBlob = null;
    userInput.value = "";
    updateStatus("Done — try another look!");

  } catch (err) {
    console.error("Mirror API error:", err);
    showError(err.message);
    updateStatus("Error — see output panel");
  }
}

// ─────────────────────────────────────────────
// 5. RENDER OUTPUT
// ─────────────────────────────────────────────
function showLoading() {
  outputPanel.style.display = "flex";
  outputPanel.innerHTML = `
    <div class="loading-wrap">
      <div class="spinner"></div>
      <div class="loading-text gold-text-shine">Mirror is styling your look…</div>
    </div>`;
}

function showError(msg) {
  outputPanel.style.display = "flex";
  outputPanel.innerHTML = `
    <div class="error-wrap">
      <div style="font-size:1.4rem; margin-bottom:8px;">⚠️</div>
      <div style="font-size:0.7rem; letter-spacing:2px; color:#ff6b6b;">${escHtml(msg)}</div>
    </div>`;
}

function renderOutput(data) {
  const { mirror_response, voice_note_audio, voice_note_script, conversation_context } = data;

  // Convert markdown-ish response to styled HTML
  const formattedHtml = mirrorTextToHtml(mirror_response);

  // Build voice note player if audio available
  const voiceSection = voice_note_audio
    ? `<div class="voice-note-section">
        <div class="voice-note-label gold-text-shine">🎙️ Mirror Says</div>
        ${voice_note_script ? `<div class="voice-script">"${escHtml(voice_note_script)}"</div>` : ""}
        <audio class="mirror-audio" controls>
          <source src="data:audio/wav;base64,${voice_note_audio}" type="audio/wav">
        </audio>
       </div>`
    : "";

  // Intent pill
  const intent = conversation_context?.user_intent || "";
  const intentPill = intent
    ? `<span class="intent-pill">${escHtml(intent.replace(/_/g, " "))}</span>`
    : "";

  outputPanel.style.display = "flex";
  outputPanel.innerHTML = `
    <div class="output-scroll">
      ${intentPill}
      ${voiceSection}
      <div class="mirror-text">${formattedHtml}</div>
    </div>`;

  // Auto-play voice note
  if (voice_note_audio) {
    const audioEl = outputPanel.querySelector("audio");
    if (audioEl) audioEl.play().catch(() => {});
  }
}

// ─────────────────────────────────────────────
// 6. TEXT → HTML FORMATTER
//    Converts Mirror's editorial markdown output
// ─────────────────────────────────────────────
function mirrorTextToHtml(text) {
  if (!text) return "";

  return text
    // Section separators
    .replace(/^---+$/gm, '<hr class="section-rule">')
    // H3 garment headers
    .replace(/^### (.+)$/gm, '<h3 class="garment-header">$1</h3>')
    // Bold product name + price line: **Name** — $XX
    .replace(/^\*\*(.+?)\*\*\s*—\s*(.+)$/gm,
      '<div class="product-row"><span class="product-name">$1</span><span class="product-price">$2</span></div>')
    // Blockquote-style notes (> Why it...)
    .replace(/^>\s*(.+)$/gm, '<p class="product-note">$1</p>')
    // Emoji section headers (🪞 Mirror Sees: / 🛍️ Shop The Look: / 💡 Stylist Note:)
    .replace(/^(🪞|🛍️|💡)\s*(.+):$/gm, '<div class="section-head"><span class="section-icon">$1</span><span class="section-title">$2</span></div>')
    // ✅ / 🔀 sub-headers
    .replace(/^(✅|🔀)\s*(.+):?$/gm, '<div class="match-type"><span>$1</span> <span>$2</span></div>')
    // Plain URLs → clickable links
    .replace(/^(https?:\/\/[^\s]+)$/gm, '<a class="product-link" href="$1" target="_blank" rel="noopener">🛒 Shop Now</a>')
    // Remaining lines → paragraphs
    .replace(/^(?!<)(.+)$/gm, '<p class="mirror-para">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="mirror-para"><\/p>/g, "");
}

// ─────────────────────────────────────────────
// 7. UTILITIES
// ─────────────────────────────────────────────
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}