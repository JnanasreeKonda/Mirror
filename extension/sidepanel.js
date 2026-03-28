let mediaRecorder;
let audioChunks = [];
let capturedImage = null;

// --- 1. STATUS HANDLER ---
function updateStatus(text) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = text.toUpperCase();
}

// --- 2. SCREENSHOT LISTENER ---
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SCREENSHOT_CAPTURED") {
        capturedImage = message.data;
        document.getElementById('preview').src = capturedImage;
        document.getElementById('preview').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
        updateStatus("Context captured");
    }
});

// --- 3. VOICE RECORDING ---
const micBtn = document.getElementById('micBtn');
const micLabel = document.getElementById('micLabel');
const micSub = document.getElementById('micSub');
const userInput = document.getElementById('user-input');
const chapterLabel = document.getElementById('chapterLabel');

micBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopVoiceCapture();
    } else {
        await startVoiceCapture();
    }
});

async function startVoiceCapture() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            sendToTranscribe(audioBlob);
        };

        mediaRecorder.start();
        micLabel.innerText = "Listening...";
        micSub.innerText = "Speak your style desire";
        chapterLabel.innerText = "Voice Inscription";
        updateStatus("Recording");
    } catch (err) {
        updateStatus("Mic Error");
    }
}

function stopVoiceCapture() {
    mediaRecorder.stop();
    micLabel.innerText = "Touch the orb to speak";
    micSub.innerText = "Voice becomes intention";
    chapterLabel.innerText = "Inscribe your desire";
    updateStatus("Transcribing");
}

// --- 4. BACKEND INTEGRATION ---
async function sendToTranscribe(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        try {
            const response = await fetch('http://localhost:8000/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio })
            });
            const data = await response.json();
            userInput.value = data.text;
            userInput.focus();
            updateStatus("Review and press Enter");
        } catch (e) {
            updateStatus("STT Failed");
        }
    };
}

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const finalQuery = userInput.value;
        // FINAL SEND LOGIC
        console.log("Sending to Stylist:", finalQuery);
        updateStatus("Finding your look...");
    }
});