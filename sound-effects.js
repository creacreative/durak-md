(function exposeDurakSound(root) {
  const KEY = "durak_sound_muted_v1";
  let ctx = null;
  let muted = (root.localStorage && root.localStorage.getItem(KEY) === "1") || false;

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    return ctx;
  }
  // Browserele suspendă audio-ul până la prima interacțiune a utilizatorului;
  // orice click din joc reia contextul, ca sunetele să pornească sigur.
  function resumeOnGesture() {
    const c = ensureContext();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  }
  if (typeof document !== "undefined") {
    ["pointerdown", "keydown"].forEach(evt => document.addEventListener(evt, resumeOnGesture, { once: true, passive: true }));
  }

  function tone(freq, { start = 0, duration = 0.15, type = "sine", gain = 0.18, glideTo = null, delay = 0 } = {}) {
    const c = ensureContext();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator(), amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, duration / 4));
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
  function noiseThud({ delay = 0, duration = 0.09, gain = 0.14, cutoff = 900 } = {}) {
    const c = ensureContext();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource(); src.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = cutoff;
    const amp = c.createGain(); amp.gain.setValueAtTime(gain, t0); amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(amp).connect(c.destination);
    src.start(t0);
  }

  // Pas de mers, la sosirea unui jucător la masă (opening / arrival).
  function footstep() { noiseThud({ duration: 0.07, gain: 0.1, cutoff: 500 }); }
  // Scaunul tras + așezare: un mic bufnet plus un tor discret.
  function sitDown() { noiseThud({ duration: 0.1, gain: 0.13, cutoff: 700 }); tone(180, { delay: 0.05, duration: 0.1, type: "triangle", gain: 0.08 }); }
  // Carte pusă/aruncată pe masă: snap scurt + un tic înalt.
  function cardPlace() { noiseThud({ duration: 0.05, gain: 0.16, cutoff: 2200 }); tone(1300, { delay: 0.01, duration: 0.045, type: "square", gain: 0.05 }); }
  // Carte trasă din pachet la deal.
  function cardDeal() { noiseThud({ duration: 0.04, gain: 0.09, cutoff: 3000 }); }
  // Ding plăcut când devine rândul jucătorului.
  function yourTurn() { tone(880, { duration: 0.12, type: "sine", gain: 0.15 }); tone(1320, { delay: 0.1, duration: 0.16, type: "sine", gain: 0.12 }); }
  // Victorie: arpegiu ascendent vesel.
  function victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { delay: i * 0.09, duration: 0.22, type: "triangle", gain: 0.14 })); }
  // Durak (ultimul loc): ton descendent comic, tuba-style.
  function durak() { tone(220, { duration: 0.5, type: "sawtooth", gain: 0.12, glideTo: 90 }); }

  function setMuted(value) {
    muted = !!value;
    if (root.localStorage) root.localStorage.setItem(KEY, muted ? "1" : "0");
    if (typeof document !== "undefined") document.dispatchEvent(new CustomEvent("durak-sound-changed", { detail: { muted } }));
  }
  function toggleMuted() { setMuted(!muted); return muted; }

  function wireToggleButton() {
    const btn = document.getElementById("soundToggle");
    if (!btn) return;
    const paint = () => { btn.textContent = muted ? "🔇" : "🔊"; btn.classList.toggle("muted", muted); };
    paint();
    btn.addEventListener("click", () => { toggleMuted(); paint(); resumeOnGesture(); });
    document.addEventListener("durak-sound-changed", paint);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireToggleButton);
    else wireToggleButton();
  }

  const api = { footstep, sitDown, cardPlace, cardDeal, yourTurn, victory, durak, setMuted, toggleMuted, get isMuted() { return muted; } };
  root.DurakSound = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
