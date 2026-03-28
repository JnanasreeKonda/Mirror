## **1\. Project Definition & Problem Statement**

* **Problem:** High-intent shopping moments in video (YouTube Shorts/Reels) are high-friction. Users have to pause, screenshot, and manually search, often losing the "vibe" of the content.  
* **Solution:** A "Context-Aware" shopping assistant. By combining **Real-time Voice** \+ **Visual Content (Frames)** \+ **Gemini’s Multimodal Reasoning**, we turn any video into a conversational storefront.  
* **The "Hook":** It’s not a search engine; it’s an **AI Personal Stylist** that "sees" what you see.

---

## **2\. Technical Architecture & Tech Stack**

To move fast, we will use a **Client-Server** model.

* **Frontend (Chrome Extension):** Manifest V3, React (for the Side Panel UI), and Web Speech API (for voice capture).  
* **Backend (Orchestrator):** Python (FastAPI) hosted on Google Cloud Run.  
* **AI Engine:** **Gemini 2.0 Flash** (via Multimodal Live API). It supports video frames and audio natively.  
* **Tools/Functions:** Custom Python functions to search Google Shopping or a mock product database.

---

## **3\. Step-by-Step Build Guide**

## **Step 1: The Chrome Extension "Sight"**

The extension needs to "grab" the video frame when you hit the shortcut.

* **Keyboard Shortcut:** Define this in manifest.json under "commands".  
* **Frame Capture:** Use chrome.tabs.captureVisibleTab to get a base64 image of the current screen.  
* **Side Panel:** Use the chrome.sidePanel API. It’s better than an overlay because it doesn't break the video player’s layout.

## **Step 2: The Gemini Live Integration**

This is the heart of the project. You will use the **Multimodal Live API (WebSockets)**.

* **The Stream:** Your extension opens a WebSocket to your FastAPI backend.  
* **Input:** You send a continuous stream of:  
  1. **Audio:** The user's voice (styling ideas, price requests).  
  2. **Visual:** The screenshot captured by the shortcut.  
* **Instruction:** Give Gemini a System Instruction: *"You are an expert fashion stylist. Look at the provided image and listen to the user. Identify the clothing and provide styling advice or shopping links."*

## **Step 3: Function Calling (The "Shopping" Tool)**

Gemini can't "click" a buy button, but it can call a function you write.

* **The Function:** get\_product\_links(description, color, max\_price)  
* **The Logic:** When Gemini "sees" a red top and hears "find this under $50," it triggers this function. Your backend then queries a Mock CSV or a Real-Time API (like Serper.dev for Google Shopping) and returns links.

## **Step 4: Google Cloud Deployment**

* **Storage:** If you want to save "Wishlists," use **Firestore**.  
* **Compute:** Deploy your FastAPI backend to **Cloud Run**. It handles the WebSockets efficiently and scales to zero when not in use (saving your credits).

---

## **4\. 36-Hour Hackathon Milestones**

| Time | Goal | Focus |
| :---- | :---- | :---- |
| **0-4h** | **The Shell** | manifest.json setup \+ Side Panel UI \+ Keyboard Shortcut. |
| **4-12h** | **The Backend** | FastAPI server setup \+ Gemini API WebSocket connection. |
| **12-20h** | **The "Vision"** | Pass the screenshot from the extension $\\rightarrow$ Backend $\\rightarrow$ Gemini. |
| **20-28h** | **The "Action"** | Implement Function Calling for product search and link generation. |
| **28-36h** | **The Polish** | UI styling (use NYU colors for a personal touch\!) and demo recording. |

---

## **5\. Critical Technical Snippet (Manifest.json)**

You’ll need these permissions to make the "hover and grab" work:

JSON  
{  
  "manifest\_version": 3,  
  "name": "Gemini Live Stylist",  
  "permissions": \["sidePanel", "activeTab", "scripting", "commands"\],  
  "commands": {  
    "analyze\_style": {  
      "suggested\_key": { "default": "Ctrl+Shift+S" },  
      "description": "Capture frame and start Gemini session"  
    }  
  },  
  "side\_panel": { "default\_path": "sidepanel.html" }  
}

## **1\. The Sequential Path (Critical Chain)**

These tasks **must** be done in order because each step provides the data for the next. If the "Sight" doesn't work, the "Brain" has nothing to look at.

1. **The "Sight" (Capture Logic):** You must first write the Chrome Extension code to capture the tab (`chrome.tabs.captureVisibleTab`) and the audio stream.  
   * *Output:* A Base64 image string and a MediaRecorder Blob.  
2. **The "Pipe" (WebSocket Bridge):** You must set up the FastAPI server to receive that data and forward it to the Gemini Multimodal Live API.  
   * *Output:* A stable connection where Gemini says "I see the video\!"  
3. **The "Logic" (Function Calling):** Once Gemini sees the image, you must write the Python function that Gemini triggers to search for products.  
   * *Output:* Gemini responding with actual links instead of just descriptions.

---

## **2\. The Parallel Path (Can be done simultaneously)**

If you are working with a partner—or if you want to switch tasks when you get "stuck" on a bug—these tasks can be developed independently:

## **Team Member A (or Focus A): Frontend & UI**

* **Side Panel Design:** Building the React/HTML interface for the side panel. This can be "mocked" with fake data while the backend is being built.  
* **Keyboard Shortcuts:** Setting up the `manifest.json` commands.  
* **Styling:** Making it look like a high-end fashion app (NYU purple or "Vogue" aesthetic).

## **Team Member B (or Focus B): Backend & Data**

* **Product Database/Scraper:** Building the "Mock Catalog" (CSV/JSON) or setting up a SerpApi/Google Shopping search tool. This doesn't require the extension to be finished.  
* **Prompt Engineering:** Refining the "System Instruction" for Gemini (e.g., "You are a Gen-Z stylist, be witty but accurate").  
* **Deployment:** Setting up the Google Cloud Run environment and API keys.

---

## **3\. Dependency Map & Workflow**

## **The "Integration" Milestone**

The biggest bottleneck is the **Gemini API Handshake**. Once you can send one image and get one text response back, the rest of the project is just "adding features."

That makes your pipeline much leaner and faster. If **Mirror** is acting as a "Pass-Through," your primary goal is to ensure the **Multimodal Context** (Image \+ Audio) gets to Gemini, and Gemini’s **Markdown** (with the clickable links) is rendered beautifully in your side panel.

Since you are splitting this among three people, here is your **"Direct-to-Gemini"** 36-hour execution plan.

---

## **Mirror: The 3-Person "Direct-to-Gemini" Pipeline**

#### **Person 1: The "Visual & Audio Streamer" (Frontend)**

* **Goal:** Capture the media and handle the "Chat Box" UI.  
* **Tasks:**  
  * **Side Panel UI:** Build a scrollable chat area in sidepanel.html that can render **Markdown** (so the links Gemini gives are clickable).  
  * **Media Packaging:** Convert the audioBlob into a Base64 string so it can be sent alongside the screenshotBase64 in a single JSON fetch call.  
  * **The "Post" Call:** Write the fetch logic to send data to the backend and wait for the text response.  
* **Input:** User Shortcut (Ctrl+Shift+S) \+ 5s Voice Recording.  
* **Output:** {"image": "...", "audio": "..."} sent to the Backend.

#### **Person 2: The "Prompt & AI Architect" (Backend)**

* **Goal:** The "Brain" that forces Gemini to be a Stylist.  
* **Tasks:**  
  * **FastAPI Orchestration:** Set up the endpoint to receive the JSON from Person 1\.  
  * **The Multimodal Prompt:** Write the logic that combines the image and audio into a single model.generate\_content call.  
  * **System Instructions:** Hardcode the "Mirror" persona: *"You are Mirror. Do not chat. Identify the clothing in the image. If the user asks for links, provide direct, clickable Markdown links to stores like Amazon, Zara, or H\&M. Be concise."*  
* **Input:** JSON from Person 1\.  
* **Output:** Raw Markdown string from Gemini (e.g., \[Red Dress \- $45\](https://zara.com/...)).

#### **Person 3: The "Data & Deployment" Engineer (Infrastructure)**

* **Goal:** Ensuring the app is live and the links are "Smart."  
* **Tasks:**  
  * **Local Tunnel / Cloud Run:** Use **ngrok** to give your local FastAPI server a public HTTPS URL so the Chrome Extension can talk to it.  
  * **Markdown Rendering:** Help Person 1 implement a library like marked.js in the side panel so Gemini's \[text\](url) output actually turns into a blue clickable link.  
  * **Error Handling:** Build a "Retry" button or an "API Key Monitor" so the team knows if the Gemini quota is hit during the demo.  
* **Input:** Raw text from Person 2\.  
* **Output:** A polished, rendered link in the UI.

---

## **Detailed Data Flow & Handoff Points**

| Step | Person Responsible | Action | Data Format |
| :---- | :---- | :---- | :---- |
| **1** | **Person 1** | Captures Frame \+ Voice | image/jpeg \+ audio/webm |
| **2** | **Person 1** | Converts to Base64 & Sends | JSON POST |
| **3** | **Person 2** | Calls Gemini API | Multimodal Prompt |
| **4** | **Person 2** | Receives Gemini Markdown | String |
| **5** | **Person 3** | Renders in Side Panel | HTML Link |

## **Immediate Code "Contract" for the Team**

To make sure you don't break each other's code, agree on this **JSON Format** right now:

**The Request (Frontend to Backend):**

JSON

{

  "image\_data": "data:image/jpeg;base64,...",

  "audio\_data": "base64\_string\_of\_voice\_recording",

  "mime\_type": "audio/webm"

}

**The Response (Backend to Frontend):**

JSON

{

  "mirror\_response": "I found that dress\! \[Buy it here at Zara for $39\](https://zara.com/sample)"

}

## **Next Steps:**

* **Person 1:** Look up `marked.min.js`—it’s the fastest way to turn Gemini's text into clickable links in a browser.  
* **Person 2:** Get the Gemini API Key and test a simple Python script that sends an image and an audio file together.  
* **Person 3:** Get **ngrok** running so Person 1 can start pointing the extension to your laptop.

This is the complete, 36-hour end-to-end pipeline for **Mirror**. It is designed for a three-person team to work in parallel, with each person owning a critical part of the data flow.

---

## **🏁 The End-to-End Pipeline**

## **1\. Input (Frontend: Person 1\)**

* **Trigger:** User hits Ctrl+Shift+S.  
* **Process:** \* Capture active tab frame (Base64 JPEG).  
  * Record 5 seconds of user microphone audio (WAV/WebM Blob).  
  * **Transformation:** Convert the audioBlob to a Base64 string so it can be sent in a JSON POST request.

**Output:** \`\`\`json  
{ "image": "data:image/jpeg;base64,...", "audio": "base64\_string" }

* 

---

## **2\. Logic & AI (Backend: Person 2\)**

* **Trigger:** FastAPI receives the JSON payload.  
* **Process:**  
  * **Multimodal Assembly:** Use the Gemini Python SDK to create a prompt containing the image bytes and audio bytes.  
  * **System Instruction:** Tell Gemini: *"You are Mirror. Identify the clothes in the image. Do not chat. Only provide 3 clickable Markdown links to similar products on Amazon/Zara/H\&M."*  
  * **Inference:** Call model.generate\_content(\[instruction, image\_part, audio\_part\]).

**Output:** A raw Markdown string:  
Markdown  
I found that red dress\! \[Buy it at Zara \- $45\](https://zara.com/...)

* 

---

## **3\. Rendering (Integration: Person 3\)**

* **Trigger:** Extension receives the Markdown string from the backend.  
* **Process:**  
  * **Markdown Parsing:** Use a library like marked.js inside the side panel to convert the string into HTML.  
  * **UI Display:** Inject the HTML into the side panel's chat window.  
  * **Security:** Ensure links open in a new tab (target="\_blank") since extensions can't navigate the main tab directly without extra logic.  
* **Output:** A beautiful, clickable link in the **Mirror** sidebar.

---

## **🛠️ The Tech Stack & Handoffs**

| Component | Responsibility | Tool to Use |
| :---- | :---- | :---- |
| **Frontend** | Person 1 | Manifest V3, chrome.sidePanel, MediaRecorder |
| **Backend** | Person 2 | **FastAPI**, google-genai Python SDK, **Gemini 2.5 Flash** |
| **Parsing** | Person 3 | marked.min.js (for Markdown rendering), **ngrok** (for local tunneling) |

## **The "Direct Link" Strategy**

Since Gemini 2.5 is natively multimodal, it can "see" the dress and "hear" you say "find this for under $50" at the same time. It will then use its internal training to generate the most likely product URLs. This saves you from having to build a separate product scraper or database\!

---

## **🚀 Execution Order for the 3-Person Team**

1. **Hour 0-6:** \* **P1:** Get the screenshot \+ 5s recording loop working.  
   * **P2:** Get a Python script that sends a local image+audio to Gemini and prints the response.  
   * **P3:** Set up the "Mirror" side panel UI with a scrollable text area.  
2. **Hour 6-12 (The Handshake):** \* Connect P1's fetch to P2's FastAPI.  
   * Use P3's marked.js to render P2's text output.  
3. **Hour 12-36:** \* Refine prompts (P2).  
   * Polish the CSS (P1/P3).  
   * Deploy to a cloud platform like Render or Railway (P2/P3).

