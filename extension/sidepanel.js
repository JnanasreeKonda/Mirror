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

/** Cloud Run (update if your service URL changes). Override in chrome.storage.local: { mirrorBackendUrl: "https://..." } */
const DEFAULT_BACKEND = "https://mirror-api-971482759292.us-central1.run.app";

function normalizeBackendUrl(url) {
  const u = (url || DEFAULT_BACKEND).trim();
  return u.replace(/\/$/, "");
}

function getBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ mirrorBackendUrl: DEFAULT_BACKEND }, (items) => {
      resolve(normalizeBackendUrl(items.mirrorBackendUrl));
    });
  });
}

let mediaRecorder = null;
let audioChunks = [];
let capturedImage = null;
let lastRecordedAudioBase64 = "";
let lastRecordedAudioMimeType = "";
let audioContext = null;
let analyserNode = null;
let waveformAnimationFrameId = null;
let activeMicStream = null;

// DOM Elements
const micBtn = document.getElementById("micBtn");
const tickBtn = document.getElementById("tickBtn");
const recordingBar = document.getElementById("recording-bar");
const userInput = document.getElementById("user-input");
const statusEl = document.getElementById("status");
const waveformCanvas = document.getElementById("waveformCanvas");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** Plain-text fallback: escape + linkify URLs + newlines */
function formatMirrorText(text) {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      const esc = escapeHtml(line);
      return esc.replace(
        /(https?:\/\/[^\s<>"]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      );
    })
    .join("<br>");
}

function mirrorInlineBold(escapedLine) {
  return escapedLine.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function mirrorLinkify(escapedLine) {
  return escapedLine.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="mirror-inline-link">$1</a>'
  );
}

/** Fragment: escaped HTML, then **bold**, then auto-link bare URLs. */
function mirrorFormatFragment(fragment) {
  if (!fragment) return "";
  return mirrorLinkify(mirrorInlineBold(escapeHtml(fragment)));
}

/**
 * Inline formatting including Markdown links [label](url) (Gemini sometimes uses these).
 */
function mirrorFormatInline(s) {
  if (!s) return "";
  const linkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  const chunks = [];
  let last = 0;
  let m;
  while ((m = linkRe.exec(s)) !== null) {
    chunks.push(mirrorFormatFragment(s.slice(last, m.index)));
    const href = m[2];
    const label = (m[1] && m[1].trim()) || "Shop link";
    chunks.push(
      `<a class="mirror-shop-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    );
    last = linkRe.lastIndex;
  }
  chunks.push(mirrorFormatFragment(s.slice(last)));
  return chunks.join("");
}

/**
 * Renders Mirror/Gemini stylist output: ###, **bold**, > quotes, ---, bullets, links.
 * Self-contained so it works even when CDN/vendor scripts fail in the extension.
 */
function renderMirrorResponse(raw) {
  if (!raw) return "";
  const lines = raw.split("\n");
  const parts = [];
  for (const line of lines) {
    const t = line.trimEnd();
    if (t === "") {
      parts.push("<br>");
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(t)) {
      parts.push("<hr>");
      continue;
    }
    const heading = t.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const n = heading[1].length;
      parts.push(`<h${n}>${mirrorFormatInline(heading[2])}</h${n}>`);
      continue;
    }
    if (t.startsWith("> ")) {
      parts.push(`<blockquote>${mirrorFormatInline(t.slice(2))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*•]\s+/.test(t)) {
      const rest = t.replace(/^\s*[-*•]\s+/, "");
      parts.push(`<div class="mirror-li">• ${mirrorFormatInline(rest)}</div>`);
      continue;
    }
    const bareUrl = t.match(/^https?:\/\/\S+$/);
    if (bareUrl) {
      const u = bareUrl[0];
      let label = "Shop";
      try {
        const h = new URL(u).hostname.replace(/^www\./, "");
        if (h) label = h.split(".")[0];
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } catch (_) {}
      parts.push(
        `<div class="mirror-url-row"><a class="mirror-shop-btn" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">Open on ${escapeHtml(label)} →</a></div>`
      );
      continue;
    }
    if (
      /^(✅|🔀|🛍️|🪞|💡)\s/u.test(t) ||
      /^(Exact Matches|Similar Picks|Shop The Look|Mirror Sees|Stylist Note)/i.test(t)
    ) {
      parts.push(`<div class="mirror-subhead">${mirrorFormatInline(t)}</div>`);
      continue;
    }
    if (/^[A-Za-z][^:]{0,60}:\s*$/.test(t)) {
      parts.push(`<div class="mirror-subhead mirror-subhead-muted">${mirrorFormatInline(t)}</div>`);
      continue;
    }
    parts.push(`<div class="mirror-para">${mirrorFormatInline(t)}</div>`);
  }
  return parts.join("");
}

function showAnalyzeResult(data) {
  const panel = document.getElementById("outputPanel");
  if (!panel) return;

  panel.classList.add("visible");
  panel.innerHTML = "";

  const scroll = document.createElement("div");
  scroll.className = "output-scroll";

  if (data.voice_note_audio) {
    const wrap = document.createElement("div");
    wrap.className = "output-voice";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = `data:audio/wav;base64,${data.voice_note_audio}`;
    wrap.appendChild(audio);
    scroll.appendChild(wrap);
  }

  const body = document.createElement("div");
  body.className = "mirror-response-body";
  body.innerHTML = renderMirrorResponse(data.mirror_response || "");
  scroll.appendChild(body);

  panel.appendChild(scroll);
}

function startWaveform(stream) {
  if (!waveformCanvas) return;

  const ctx = waveformCanvas.getContext("2d");
  if (!ctx) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyserNode);

  const bufferLength = analyserNode.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    waveformAnimationFrameId = requestAnimationFrame(draw);

    analyserNode.getByteTimeDomainData(dataArray);

    const width = waveformCanvas.width;
    const height = waveformCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const barWidth = 2;
    const gap = 2;
    const bars = Math.max(1, Math.floor(width / (barWidth + gap)));
    const samplesPerBar = Math.max(1, Math.floor(bufferLength / bars));

    ctx.fillStyle = "#c9a84c";

    for (let b = 0; b < bars; b++) {
      const start = b * samplesPerBar;
      const end = Math.min(bufferLength, start + samplesPerBar);

      let sumSq = 0;
      for (let i = start; i < end; i++) {
        const v = (dataArray[i] - 128) / 128;
        sumSq += v * v;
      }

      const rms = Math.sqrt(sumSq / Math.max(1, end - start));
      const barHeight = Math.max(1, Math.min(height, rms * height * 1.6));
      const x = b * (barWidth + gap);

      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    }
  };

  draw();
}

async function stopWaveform() {
  if (waveformAnimationFrameId) {
    cancelAnimationFrame(waveformAnimationFrameId);
    waveformAnimationFrameId = null;
  }

  if (audioContext) {
    try {
      await audioContext.close();
    } catch (e) {
      // ignore
    }
    audioContext = null;
  }

  analyserNode = null;

  if (waveformCanvas) {
    const ctx = waveformCanvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  }
}

// 1. Capture Image Listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SCREENSHOT_CAPTURED") {
    capturedImage = message.data;
    document.getElementById("preview").src = message.data;
    document.getElementById("preview").style.display = "block";
    document.getElementById("emptyState").style.display = "none";
  }
});

// 2. Recording Logic
micBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    activeMicStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const audioMimeType = mediaRecorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunks, { type: audioMimeType });
      await stopWaveform();
      await transcribeToTextField(audioBlob);
      if (activeMicStream) {
        activeMicStream.getTracks().forEach(track => track.stop());
      }
      activeMicStream = null;
    };

    mediaRecorder.start();
    recordingBar.style.display = "flex";
    micBtn.style.opacity = "0.3";
    startWaveform(stream);
    setStatus("RECORDING");
  } catch (err) {
    console.error("Mic permission error:", err);
    setStatus("MIC ERROR");
  }
});

// 3. Tick Button (The "Checkmark" from your screenshot)
tickBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordingBar.style.display = "none";
    micBtn.style.opacity = "1";
    setStatus("PROCESSING VOICE");
  }
});

// 4. Send Audio to Gemini just for Transcription
async function transcribeToTextField(blob) {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const base64Audio = reader.result.split(",")[1];
    const mimeType = (blob && blob.type) ? blob.type : "audio/webm";
    lastRecordedAudioBase64 = base64Audio;
    lastRecordedAudioMimeType = mimeType;

    try {
      userInput.placeholder = "Transcribing style desire...";
      const backend = await getBackendUrl();
      const response = await fetch(`${backend}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_data: base64Audio,
          mime_type: mimeType
        }),
      });
      const data = await response.json();
      // Populate the text field with the transcript
      userInput.value = data.conversation_context?.raw_transcript_summary || "";
      userInput.placeholder = "Seek the extraordinary...";
      setStatus("READY");
    } catch (err) {
      console.error("Transcription error:", err);
      setStatus("TRANSCRIBE ERROR");
    }
  };
}

// 5. Final Submit Logic (When clicking "Find My Look")
document.getElementById("sendBtn").addEventListener("click", async () => {
  if (!capturedImage) {
    setStatus("CAPTURE SCREENSHOT FIRST");
    return;
  }

  const text = (userInput.value || "").trim();

  const payload = {
    image_data: capturedImage,
    text_input: text,
    audio_data: "",
    mime_type: "",
  };

  if (!text && lastRecordedAudioBase64) {
    payload.audio_data = lastRecordedAudioBase64;
    payload.mime_type = lastRecordedAudioMimeType || "audio/webm";
  }

  try {
    setStatus("ANALYZING");
    const backend = await getBackendUrl();
    const response = await fetch(`${backend}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("Analyze response:", data);
    showAnalyzeResult(data);
    setStatus("DONE");
  } catch (err) {
    console.error("Analyze error:", err);
    const msg = err && err.message ? err.message : String(err);
    setStatus(msg.length > 90 ? `ERROR: ${msg.slice(0, 87)}…` : `ERROR: ${msg}`);
  }
});