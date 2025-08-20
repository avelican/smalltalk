import { createSignal, createEffect, onMount } from 'solid-js'
import './App.css'

type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string; };
type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export default function App() {
  // todo support other providers
  const API_URL_OPENAI = 'https://api.openai.com/v1/chat/completions';
  const LS_MODEL = "IA_MODEL";
  const LS_DEFAULT_MODEL = 'gpt-5';
  const LS_EFFORT = "IA_EFFORT";
  const LS_DEFAULT_EFFORT = 'low';
  const LS_SYSTEM = "IA_SYS_MSG";
  const LS_API_KEY = "IA_API_KEY";
  const LS_MESSAGES = "IA_MESSAGES";

  // Flag to enable/disable manual textNode rendering
  const USE_TEXT_NODE = false;

  // LocalStorage helpers
  function lsGet(k: string, d: string = ""): string {
    return window.localStorage.getItem(k) ?? d;
  }
  function lsSet(k: string, v: string): void {
    window.localStorage.setItem(k, v);
  }
  function lsGetJSON<T>(k: string, fallback: T): T {
    const raw = window.localStorage.getItem(k);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  // State signals
  const [apiKey, setApiKey] = createSignal<string>(lsGet(LS_API_KEY, '') );
  const [system, setSystem] = createSignal<string>(lsGet(LS_SYSTEM, ''));
  const [model, setModel] = createSignal<string>(lsGet(LS_MODEL, LS_DEFAULT_MODEL) || LS_DEFAULT_MODEL);
  const [reasoningEffort, setReasoningEffort] = createSignal<ReasoningEffort>(
    (lsGet(LS_EFFORT, LS_DEFAULT_EFFORT) as ReasoningEffort)
  );
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = createSignal<string>('');
  const [outputText, setOutputText] = createSignal<string>('');
  

  // refs
  let outputEl: HTMLDivElement | undefined;
  let outputTextNode: Text | undefined;
  let userMsgEl: HTMLTextAreaElement | undefined;

  // Initialize messages on mount
  onMount(() => {
    if (USE_TEXT_NODE) {
      initTextNode();
    }

    // Load persisted messages if present, else start with system message (if any)
    const storedMsgs = lsGetJSON<ChatMessage[]>(LS_MESSAGES, []);
    if (storedMsgs.length > 0) {
      setMessages(storedMsgs);
      rebuildOutputFromMessages(storedMsgs);
    } else {
      resetMessages();
      rebuildOutputFromMessages(messages());
    }

    userMsgEl?.focus();
  });

    // Persist messages to localStorage whenever they change
  createEffect(() => {
    try {
      lsSet(LS_MESSAGES, JSON.stringify(messages()));
    } catch {}
  });

    function clearOutput() {
    if (USE_TEXT_NODE && outputTextNode) {
      outputTextNode.nodeValue = '';
    } else {
      setOutputText('');
    }
  }

  function rebuildOutputFromMessages(msgs: ChatMessage[]) {
    clearOutput();
    for (const m of msgs) {
      if (m.role === 'user') {
        printMessage('User', m.content);
      } else if (m.role === 'assistant') {
        printMessage('Assistant', m.content);
      }
      // Note: system messages are not printed to the log by design
    }
  }

  function initTextNode() {
    if (outputEl) {
      if(!outputTextNode){
        outputTextNode = document.createTextNode("");
        outputEl.appendChild(outputTextNode);
      }
    } else {
      alert("there's no outputEl"); // this should never run? // TODO // why do we check for it I mean
    }
  }

  // Initialize messages based on system message
  function resetMessages() {
    const sys = system();
    if (sys) {
      setMessages([{ role: "system", content: sys }]);
    } else {
      setMessages([]);
    }
  }

  function chatStarted() {
    const msgs = messages();
    if (msgs.length === 0) return false;
    if (msgs.length > 1) return true;
    // Precisely one message
    if (msgs[0].role === "system") return false;
    else return true;
  }

  // Select handlers
  function onModelChange(e: Event & { currentTarget: HTMLSelectElement }) {
    const v = e.currentTarget.value;
    setModel(v);
    lsSet(LS_MODEL, v);
  }
  function onReasoningChange(e: Event & { currentTarget: HTMLSelectElement }) {
    const v = e.currentTarget.value as ReasoningEffort;
    setReasoningEffort(v);
    lsSet(LS_EFFORT, v);
  }

  // Button handlers
  function handleSetSystem() {
    const newSystem = prompt('', system());
    if (newSystem === null) return;
    setSystem(newSystem);
    lsSet(LS_SYSTEM, newSystem);
    if (!chatStarted()) {
      resetMessages();
      rebuildOutputFromMessages(messages());
    }
  }
  function handleSetApiKey() {
    const input = prompt('Enter your OpenAI API key:', apiKey() || '');
    if (input !== null) {
      const trimmed = input.trim();
      setApiKey(trimmed);
      lsSet(LS_API_KEY, trimmed);
    }
  }

  function handleNewChat() {
    const sys = system();
    const newMsgs: ChatMessage[] = sys ? [{ role: 'system', content: sys }] : [];
    setMessages(newMsgs);
    lsSet(LS_MESSAGES, JSON.stringify(newMsgs));
    clearOutput();
    // Optional: focus back to input
    userMsgEl?.focus();
  }

  // I/O Helpers // TODO: clean up?
  function printMessage(src: string, msg: string) {
    messageHeader(src);
    print(msg);
    messageDivider();
  }
  function messageHeader(src: string) {
    // printRaw(`\n== ${src} ==\n\n`);
    // printRaw(`\n[ ${src} ]\n\n`);
    printRaw(`\n${src}\n\n`);
    
  }
  function messageDivider() {
    // printRaw('\n───────────────────────────────\n');
    // printRaw('\n─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n');
    printRaw('\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n')
    
    // printRaw('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  function print(txt: string) {
    appendToOutput(txt + "\n");
  }
  function printToken(token: string) {
    appendToOutput(token);
  }
  function printRaw(txt: string) {
    appendToOutput(txt);
  }
  function appendToOutput(txt: string) {
    if (USE_TEXT_NODE && outputTextNode) {
      outputTextNode.appendData(txt);
    } else {
      setOutputText(prev => prev + txt);
    }
    // scrollToBottom(); // GPT keeps adding this lmao
  }

  function scrollToBottom() {
    if (!outputEl) return;
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  // La Creatura
  async function streamChat(prompt: string) {
    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    printMessage("User", prompt);
    scrollToBottom();

    try {
      if (!apiKey()) {
        print("Error: Missing API key. Click 'Key' to set it.");
        // messageDivider();
        return;
      }

      const payload = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": "Bearer " + apiKey(),
        },
        body: JSON.stringify({
          model: model(),
          messages: messages(),
          stream: true,
          ...( !/search/i.test(model()) ? { reasoning_effort: reasoningEffort() } : {} ),
        })
      };
      
      const response = await fetch(API_URL_OPENAI, payload);

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => "");
        print(`Error: ${response.status} ${response.statusText}\n${errText}`);
        // messageDivider();
        return;
      }

      messageHeader('Assistant');
      scrollToBottom();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let responseText = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const lineJson = line.slice(6).trim();
              if (lineJson === '[DONE]') {
                continue; // I was told to continue instead of break, why?
              }
              const respObj = JSON.parse(lineJson);
              const token: string = respObj?.choices?.[0]?.delta?.content || "";
              if (token) {
                responseText += token;
                printToken(token);
              }
            } catch (err) {
              console.error(err);
              continue; // Ignore malformed chunks
            }
          }
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
    } catch (err) {
      print(`Error: ${String(err)}`);
    } finally {
      print('');
      // messageDivider();
    }
  }

  async function onSubmit(e?: Event) {
    e?.preventDefault();
    const msg = userMessage().trim();
    if (!msg) return;
    setUserMessage('');
    await streamChat(msg);
    // return false; // note: unneeded? confused
  }

  function onTextareaKeyDown(e: KeyboardEvent) { // todo rename and handle other hotkeys?
    // if (e.ctrlKey && e.code === 'Enter') { // todo i think this is useless?
    //   e.preventDefault();
    //   onSubmit();
    //   return;
    // }
    // if (e.shiftKey && e.code === 'Enter') {
    //   return;
    // }
    if (!e.shiftKey && e.code === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }
  }

  return (
    <>
      <div id="top_thing">
        <select 
          id="model_select" 
          value={model()} 
          onChange={onModelChange}
        >
          <option value="gpt-5">gpt-5</option>
          <option value="gpt-5-mini">gpt-5-mini</option>
          <option value="gpt-5-nano">gpt-5-nano</option>
          <option disabled>──────────</option>
          <option value="o4-mini">o4-mini</option>
          <option value="o3">o3</option>
          <option disabled>──────────</option>
          <option value="gpt-4o-search-preview">gpt-4o-search-preview</option>
          <option disabled>──────────</option>
          <option value="gpt-4o">gpt-4o</option>
          <option disabled>──────────</option>
          <option value="gpt-4.5-preview">gpt-4.5-preview</option>
          <option disabled>──────────</option>
          <option value="gpt-4.1">gpt-4.1</option>
          <option value="gpt-4.1-mini">gpt-4.1-mini</option>
          <option value="gpt-4.1-nano">gpt-4.1-nano</option>
        </select>

        <select id="reasoning_select" value={reasoningEffort()} onchange={onReasoningChange}>
          <option value="minimal">minimal</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>

        <button id="system_btn" onClick={handleSetSystem}>Sys</button>
        <button id="api_key_btn" onClick={handleSetApiKey}>Key</button>
        <button id="new_chat_btn" onClick={handleNewChat}>New</button>

      </div>

      <div 
        id="output_log" 
        ref={outputEl}
      >
        {USE_TEXT_NODE ? null : outputText()}
      </div>

      {/* <div id="spacer"></div> */}

      <div id="bottom_slab">
        <div id="bottom_slab_contents">
          <form class="flexy" onSubmit={(e) => onSubmit(e)}>
            <textarea 
              id="user_msg" 
              placeholder="Chat here"
              value={userMessage()}
              oninput={(e) => setUserMessage((e.target as HTMLTextAreaElement).value)}
              onKeyDown={onTextareaKeyDown}
              ref={userMsgEl}
            />
            <input type="submit" id="submitBtn" value="Send" />
          </form>
        </div>
      </div>
    </>
  )
}