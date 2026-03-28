let mediaRecorder;
let audioChunks = [];
let stream;

/** Render Gemini Markdown (links open in a new tab). Call from your WebSocket/fetch handler. */
function renderMirrorMarkdown(markdown) {
    const el = document.getElementById('mirror-response');
    if (!markdown || typeof marked === 'undefined') {
        el.textContent = markdown || '';
        return;
    }
    el.innerHTML = marked.parse(markdown, { breaks: true });
    el.querySelectorAll('a').forEach((a) => {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    });
    hideMirrorError();
}

function showMirrorError(message) {
    const err = document.getElementById('mirror-error');
    err.textContent = message;
    err.style.display = 'block';
    document.getElementById('retryBtn').classList.add('visible');
}

function hideMirrorError() {
    document.getElementById('mirror-error').style.display = 'none';
    document.getElementById('retryBtn').classList.remove('visible');
}

document.getElementById('retryBtn').addEventListener('click', () => {
    hideMirrorError();
    document.getElementById('mirror-response').innerHTML = '';
    document.getElementById('status').innerText = stream ? 'Ready for Ctrl+Shift+S' : 'Click button to enable mic';
});

// 1. PRIME THE MIC: This solves the "Permission Dismissed" error
document.getElementById('startMirrorBtn').addEventListener('click', async () => {
    try {
        console.log("🎤 Requesting mic access via button click...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Mic Access Granted!");

        document.getElementById('startMirrorBtn').innerText = "MIRROR ACTIVE";
        document.getElementById('startMirrorBtn').style.background = "#28a745";
        document.getElementById('status').innerText = "Ready for Ctrl+Shift+S";
    } catch (err) {
        console.error("❌ Mic Access Denied:", err);
        alert("Please click the Lock icon in the URL bar and Allow the Microphone.");
    }
});

// 2. LISTEN FOR SHORTCUT
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SCREENSHOT_CAPTURED") {
        const img = document.getElementById('preview');
        img.src = message.data;
        img.style.display = 'block';

        if (stream) {
            startRecording();
        } else {
            document.getElementById('status').innerText = "Error: Activate Mic first!";
        }
    }
});

async function startRecording() {
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log("✅ Audio Captured. Size:", audioBlob.size, "bytes");

        document.getElementById('micDot').classList.remove('recording');
        document.getElementById('status').innerText = "Look captured. Processing...";
    };

    mediaRecorder.start();
    document.getElementById('micDot').classList.add('recording');
    document.getElementById('status').innerText = "Listening...";

    // Auto-stop after 5 seconds
    setTimeout(() => {
        if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    }, 5000);
}