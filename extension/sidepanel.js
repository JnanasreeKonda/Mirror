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
      const response = await fetch(`${BACKEND}/transcribe`, {
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
    const response = await fetch(`${BACKEND}/analyze`, {
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
    setStatus("DONE");
  } catch (err) {
    console.error("Analyze error:", err);
    setStatus("ERROR");
  }
});