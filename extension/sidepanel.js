let mediaRecorder;
let audioChunks = [];
let stream;

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