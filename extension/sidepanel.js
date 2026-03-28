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

// Session management for conversation history
let sessionId = localStorage.getItem('mirror_session_id');
if (!sessionId) {
  sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('mirror_session_id', sessionId);
}

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

// 1. Capture Image Listener - Show persistent preview popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SCREENSHOT_CAPTURED") {
    capturedImage = message.data;
    
    // Show persistent screenshot preview
    const screenshotPreview = document.getElementById("screenshotPreview");
    const screenshotThumb = document.getElementById("screenshotThumb");
    if (screenshotPreview && screenshotThumb) {
      screenshotThumb.src = message.data;
      screenshotPreview.style.display = "block";
    }
    
    // Show temporary success message
    const mirrorStatus = document.getElementById("mirrorStatus");
    const statusMessage = document.getElementById("statusMessage");
    if (mirrorStatus && statusMessage) {
      const messages = [
        "Got it, babe! Your vibe is captured ✨",
        "Ooh, I see you! Reference saved 👀",
        "Yaaas! Image locked and loaded 💫",
        "Perfect! Now let's find your look 🔥"
      ];
      
      statusMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
      mirrorStatus.style.display = "block";
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        mirrorStatus.style.display = "none";
      }, 3000);
    }
  }
});

// Close button for screenshot preview
const closeScreenshotBtn = document.getElementById("closeScreenshotBtn");
if (closeScreenshotBtn) {
  closeScreenshotBtn.addEventListener("click", () => {
    const screenshotPreview = document.getElementById("screenshotPreview");
    if (screenshotPreview) {
      screenshotPreview.style.display = "none";
    }
  });
}

// Keyboard shortcut: Cmd+Shift+S to start new conversation
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    
    const outputPanel = document.getElementById("outputPanel");
    const userInput = document.getElementById("user-input");
    
    if (outputPanel && outputPanel.style.display !== "none") {
      // Minimize existing chat by adding a collapsed state
      const existingContent = outputPanel.innerHTML;
      
      // Create a minimized version with a toggle button
      const minimizedSection = document.createElement("div");
      minimizedSection.style.cssText = "margin:10px 20px; padding:12px; background:rgba(196,165,123,0.1); border:1px solid rgba(139,111,71,0.2); border-radius:8px; cursor:pointer; transition:all 0.3s ease;";
      minimizedSection.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:0.7rem; color:#6b5435; font-weight:600;">Previous Conversation</span>
          <span style="font-size:0.8rem; color:#8b6f47;">▼</span>
        </div>
        <div class="collapsed-content" style="display:none; margin-top:10px; max-height:300px; overflow-y:auto;">${existingContent}</div>
      `;
      
      // Toggle collapsed content on click
      minimizedSection.addEventListener("click", function() {
        const content = this.querySelector(".collapsed-content");
        const arrow = this.querySelector("span:last-child");
        if (content.style.display === "none") {
          content.style.display = "block";
          arrow.textContent = "▲";
        } else {
          content.style.display = "none";
          arrow.textContent = "▼";
        }
      });
      
      // Clear output panel and add minimized section
      outputPanel.innerHTML = "";
      outputPanel.style.display = "flex";
      outputPanel.appendChild(minimizedSection);
    }
    
    // Clear input and focus
    if (userInput) {
      userInput.value = "";
      userInput.focus();
    }
    
    // Show status message
    const mirrorStatus = document.getElementById("mirrorStatus");
    const statusMessage = document.getElementById("statusMessage");
    if (mirrorStatus && statusMessage) {
      statusMessage.textContent = "New conversation started ✨";
      mirrorStatus.style.display = "block";
      setTimeout(() => {
        mirrorStatus.style.display = "none";
      }, 2000);
    }
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
    setStatus("I'M ALL EARS 👂");
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
    setStatus("DECODING YOUR STYLE VIBES...");
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
          audio_data: lastRecordedAudioBase64,
          mime_type: lastRecordedAudioMimeType,
          text_input: "",
          session_id: sessionId,
        }),
      });
      const data = await response.json();
      // Populate the text field with the transcript
      userInput.value = data.transcript || "";
      userInput.placeholder = "Tell me what caught your eye, darling...";
      setStatus("READY TO SLAY 💅");
    } catch (err) {
      console.error("Transcription error:", err);
      setStatus("OOP, DIDN'T CATCH THAT 😅");
    }
  };
}

// 5. Final Submit Logic (When clicking "Find My Look")
const sendBtn = document.getElementById("sendBtn");
sendBtn.addEventListener("click", async () => {
  if (!capturedImage) {
    setStatus("SNAP A PIC FIRST, BESTIE! 📸");
    return;
  }

  const text = (userInput.value || "").trim();

  const payload = {
    screenshot_data: capturedImage,
    text_input: text,
    session_id: sessionId,
  };

  try {
    // Add glow effect to button
    sendBtn.style.background = "var(--gold)";
    sendBtn.style.color = "var(--onyx)";
    sendBtn.style.boxShadow = "0 0 20px rgba(201,168,76,0.6)";
    
    setStatus("HUNTING DOWN YOUR PERFECT LOOK 🔍✨");
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
    displayResults(data);
    setStatus("DONE");
  } catch (err) {
    console.error("Analyze error:", err);
    setStatus("UH OH, SOMETHING WENT WRONG 😬");
  }
});

// 6. Display Results with Voice Audio and Products
function displayResults(data) {
  const outputPanel = document.getElementById("outputPanel");
  if (!outputPanel) return;

  outputPanel.style.display = "flex";
  outputPanel.innerHTML = "";

  const scrollDiv = document.createElement("div");
  scrollDiv.style.cssText = "overflow-y:auto; padding:14px; flex:1; font-size:0.72rem; line-height:1.7;";

  // Voice Note Audio
  if (data.voice_note_audio) {
    const voiceSection = document.createElement("div");
    voiceSection.style.cssText = "margin-bottom:20px; padding:18px; background:rgba(139,90,142,0.06); border-radius:14px; border:1px solid rgba(139,90,142,0.15); box-shadow:0 4px 12px rgba(139,90,142,0.08);";
    
    if (data.voice_note_script) {
      const script = document.createElement("div");
      script.textContent = data.voice_note_script;
      script.style.cssText = "font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.1rem; color:#2d1b2e; margin-bottom:12px; line-height:1.6;";
      voiceSection.appendChild(script);
    }

    const audioWrapper = document.createElement("div");
    audioWrapper.style.cssText = "display:flex; align-items:center; gap:8px;";
    
    const playIcon = document.createElement("span");
    playIcon.textContent = "🎧";
    playIcon.style.cssText = "font-size:1.5rem;";
    audioWrapper.appendChild(playIcon);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.autoplay = true;
    audio.style.cssText = "flex:1; height:30px; filter:sepia(0.5) hue-rotate(-10deg) saturate(1.2);";
    audio.src = `data:audio/wav;base64,${data.voice_note_audio}`;
    audioWrapper.appendChild(audio);

    voiceSection.appendChild(audioWrapper);
    scrollDiv.appendChild(voiceSection);
  }

  // Mirror Response (formatted text with products)
  if (data.mirror_response) {
    const mirrorDiv = document.createElement("div");
    mirrorDiv.style.cssText = "color:#2d1b2e; white-space:pre-wrap; font-size:1.05rem; line-height:1.7;";
    
    // Parse and format the mirror response
    const formatted = formatMirrorResponse(data.mirror_response);
    mirrorDiv.innerHTML = formatted;
    scrollDiv.appendChild(mirrorDiv);
  }

  outputPanel.appendChild(scrollDiv);
}

function formatMirrorResponse(text) {
  const lines = text.split('\n');
  let html = '';
  
  for (let line of lines) {
    // Parse PRODUCT lines
    if (line.startsWith('PRODUCT|')) {
      const parts = line.substring(8).split('|');
      if (parts.length >= 6) {
        const [name, price, source, url, thumbnail, description] = parts;
        html += createProductCard(name, price, source, url, thumbnail, description, false);
        continue;
      }
    }
    
    // Parse COMPLEMENTARY lines
    if (line.startsWith('COMPLEMENTARY|')) {
      const parts = line.substring(14).split('|');
      if (parts.length >= 7) {
        const [itemType, name, price, source, url, thumbnail, description] = parts;
        html += createProductCard(`${itemType}: ${name}`, price, source, url, thumbnail, description, true);
        continue;
      }
    }
    
    // Format headers
    if (line.startsWith('### ')) {
      html += `<h3 style="font-family:Cormorant Garamond,serif; font-size:1.4rem; color:#8b5a8e; margin:20px 0 14px; letter-spacing:1.5px; font-weight:700;">${line.substring(4)}</h3>`;
      continue;
    }
    
    // Format "Complete The Look"
    if (line.includes('**Complete The Look:**')) {
      html += '<div style="font-size:1.3rem; letter-spacing:1px; color:#2d1b2e; margin:28px 0 20px; font-weight:700; line-height:1.5; font-family:Cormorant Garamond,serif; background:linear-gradient(135deg, rgba(139,90,142,0.12), rgba(166,124,159,0.08)); padding:14px 20px; border-radius:12px; border-left:5px solid #8b5a8e; box-shadow:0 4px 12px rgba(139,90,142,0.15);">Here are more recommendations to complete this look</div>';
      continue;
    }
    
    // Format horizontal rules
    if (line.trim() === '---') {
      html += '<hr style="border:none; border-top:1px solid rgba(139,90,142,0.15); margin:20px 0;">';
      continue;
    }
    
    // Regular text - change color to brown
    if (line.trim()) {
      html += `<span style="color:#5a4a5c; font-size:1rem;">${line}</span><br>`;
    }
  }
  
  return html;
}

function createProductCard(name, price, source, url, thumbnail, description, isComplementary) {
  const borderColor = isComplementary ? 'rgba(139,90,142,0.3)' : 'rgba(166,124,159,0.25)';
  const glowColor = isComplementary ? 'rgba(139,90,142,0.25)' : 'rgba(166,124,159,0.2);'
  
  const imageHtml = thumbnail && thumbnail.trim() 
    ? `<div style="width:225px; height:285px; flex-shrink:0; background:#ffffff; border-radius:16px; overflow:hidden; display:flex; align-items:center; justify-content:center; transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow:0 8px 24px rgba(139,90,142,0.15); border:1px solid rgba(139,90,142,0.1);"><img src="${thumbnail}" style="width:100%; height:100%; object-fit:cover; transition:all 0.4s ease;" onmouseover="this.style.transform='scale(1.08)'; this.parentElement.style.boxShadow='0 12px 32px rgba(139,90,142,0.25)'" onmouseout="this.style.transform='scale(1)'; this.parentElement.style.boxShadow='0 8px 24px rgba(139,90,142,0.15)'" onerror="this.parentElement.innerHTML='<div style=\\"font-size:3.5rem; color:rgba(139,90,142,0.3);\\">\uD83D\uDECD\uFE0F</div>'"></div>`
    : `<div style="width:225px; height:285px; flex-shrink:0; background:#ffffff; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:3.5rem; color:rgba(139,90,142,0.3); box-shadow:0 8px 24px rgba(139,90,142,0.15); border:1px solid rgba(139,90,142,0.1);">\uD83D\uDECD\uFE0F</div>`;
  
  return `<div class="product-card" style="display:flex; flex-direction:row; gap:20px; align-items:flex-start; margin:0 0 48px 0; transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); animation:slideIn 0.6s ease both;" onmouseover="this.style.transform='translateX(8px)'" onmouseout="this.style.transform='translateX(0)'">${imageHtml}<div style="flex:1; display:flex; flex-direction:column; justify-content:flex-start; min-width:0; padding:10px 0;"><div style="font-size:1.1rem; font-weight:700; color:#2d1b2e; line-height:1.4; margin-bottom:10px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; animation:fadeIn 0.5s ease 0.1s both;">${name}</div><div style="font-size:1.4rem; color:#8b5a8e; font-weight:800; margin-bottom:8px; animation:fadeIn 0.5s ease 0.2s both;">${price}</div><div style="font-size:0.9rem; color:#5a4a5c; font-weight:600; margin-bottom:14px; opacity:0.85; animation:fadeIn 0.5s ease 0.3s both;">${source}</div><a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-size:0.7rem; letter-spacing:2.5px; text-transform:uppercase; color:white; text-decoration:none; padding:12px 24px; border-radius:10px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); background:linear-gradient(135deg, #8b5a8e 0%, #a67c9f 100%); text-align:center; font-weight:700; box-shadow:0 6px 18px ${glowColor}; border:1px solid ${borderColor}; animation:fadeIn 0.5s ease 0.4s both; align-self:flex-start; margin-bottom:32px;" onmouseover="this.style.transform='translateY(-4px) scale(1.03)'; this.style.boxShadow='0 10px 28px rgba(139,90,142,0.4)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 6px 18px ${glowColor}'">SHOP NOW \u2197</a></div></div>`;
}