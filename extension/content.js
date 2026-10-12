// Watches the chat box on ChatGPT / Claude, warns, and offers one-click redaction.
let banner = null, timer = null, current = null;

function getEditable(el) {
  return el && el.closest ? el.closest('textarea, [contenteditable="true"]') : null;
}
function getText(el) {
  return el.tagName === "TEXTAREA" ? el.value : el.innerText;
}

function setText(el, text) {
  el.focus();
  if (el.tagName === "TEXTAREA") {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // execCommand keeps ProseMirror-based editors (ChatGPT, Claude) in sync
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
  }
}

function showBanner(el, dets) {
  if (!banner) {
    banner = document.createElement("div");
    banner.style.cssText =
      "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
      "background:#f8d7da;color:#842029;border:2px solid #dc3545;border-radius:10px;" +
      "padding:12px 18px;font:600 15px system-ui;box-shadow:0 4px 14px rgba(220,53,69,.35);" +
      "display:flex;gap:12px;align-items:center";
    document.body.appendChild(banner);
  }
  const types = [...new Set(dets.map((d) => d.type))].join(", ");
  banner.textContent = `🚨 Sensitive data detected (${types})`;
  const btn = document.createElement("button");
  btn.textContent = "Redact";
  btn.style.cssText = "background:#dc3545;color:#fff;border:0;border-radius:6px;padding:6px 14px;font-weight:600;cursor:pointer";
  btn.onclick = () => {
    setText(el, redactText(getText(el), detectTier1(getText(el))));
    hideBanner();
  };
  banner.appendChild(btn);
}

function hideBanner() {
  if (banner) { banner.remove(); banner = null; }
}

let lastText = "";

function findEditor() {
  return (
    getEditable(document.activeElement) ||
    document.querySelector('div.ProseMirror[contenteditable="true"], #prompt-textarea, textarea')
  );
}

function check() {
  try {
    const el = findEditor();
    if (!el) return;
    const text = getText(el);
    if (text === lastText) return;
    lastText = text;
    const dets = detectTier1(text);
    console.log("[RedactLens] checked:", JSON.stringify(text.slice(0, 40)), "detections:", dets.length);
    dets.length ? showBanner(el, dets) : hideBanner();
  } catch (err) {
    console.error("[RedactLens] error:", err);
  }
}

setInterval(check, 500);
document.addEventListener("input", check, true);
document.addEventListener("paste", () => setTimeout(check, 100), true);
console.log("[RedactLens] content script loaded");