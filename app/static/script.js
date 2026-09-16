const state = { mode: "decrypt" };

const toggleBtns = document.querySelectorAll(".toggle-btn");
const form = document.getElementById("crypt-form");
const fileDrop = document.getElementById("file-drop");
const fileInput = document.getElementById("file-input");
const fileLabel = document.getElementById("file-label");
const extHint = document.getElementById("ext-hint");
const passwordInput = document.getElementById("password");
const toggleEye = document.getElementById("toggle-eye");
const generatorBox = document.getElementById("generator-box");
const pwLength = document.getElementById("pw-length");
const pwLengthVal = document.getElementById("pw-length-val");
const pwSymbols = document.getElementById("pw-symbols");
const generateBtn = document.getElementById("generate-btn");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const modal = document.getElementById("modal");
const modalMessage = document.getElementById("modal-message");
const modalOk = document.getElementById("modal-ok");

const SUPPORTED = {
  decrypt: window.SUPPORTED_DECRYPT_EXT || [],
  encrypt: window.SUPPORTED_ENCRYPT_EXT || [],
};

function showModal(message) {
  modalMessage.textContent = message;
  modal.classList.remove("hidden");
}

modalOk.addEventListener("click", () => modal.classList.add("hidden"));

function setMode(mode) {
  state.mode = mode;
  toggleBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  submitBtn.textContent = mode === "decrypt" ? "Decrypt file" : "Encrypt file";
  generatorBox.classList.toggle("hidden", mode !== "encrypt");
  extHint.textContent = "Supported: " + SUPPORTED[mode].join(", ");
  statusEl.textContent = "";
}

toggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

function setFile(file) {
  fileLabel.textContent = file ? file.name : "Choose a file or drag it here";
}

fileInput.addEventListener("change", () => {
  setFile(fileInput.files[0]);
});

["dragover", "dragenter"].forEach((evt) => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.remove("dragover");
  });
});

fileDrop.addEventListener("drop", (e) => {
  const dropped = e.dataTransfer.files[0];
  if (dropped) {
    fileInput.files = e.dataTransfer.files;
    setFile(dropped);
  }
});

toggleEye.addEventListener("click", () => {
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
});

pwLength.addEventListener("input", () => {
  pwLengthVal.textContent = pwLength.value;
});

generateBtn.addEventListener("click", async () => {
  const params = new URLSearchParams({ length: pwLength.value, symbols: pwSymbols.checked });
  try {
    const res = await fetch(`/api/generate-password?${params}`);
    const data = await res.json();
    passwordInput.value = data.password;
    passwordInput.type = "text";
  } catch (err) {
    showModal("Couldn't generate a password: " + err.message);
  }
});

function parseFilename(disposition, fallback) {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!fileInput.files.length) {
    showModal("Please choose a file first.");
    return;
  }
  if (!passwordInput.value) {
    showModal("Please enter or generate a password.");
    return;
  }

  const originalFile = fileInput.files[0];
  const fd = new FormData();
  fd.append("mode", state.mode);
  fd.append("password", passwordInput.value);
  fd.append("file", originalFile);

  submitBtn.disabled = true;
  statusEl.textContent = "Processing...";

  try {
    const res = await fetch("/api/process", { method: "POST", body: fd });

    if (!res.ok) {
      let message = "Something went wrong.";
      try {
        const err = await res.json();
        message = err.detail || message;
      } catch (_) {
        /* non-JSON error body, keep default message */
      }
      statusEl.textContent = "";
      showModal(message);
      return;
    }

    const blob = await res.blob();
    const filename = parseFilename(
      res.headers.get("Content-Disposition"),
      `output_${originalFile.name}`
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    statusEl.textContent =
      state.mode === "decrypt"
        ? "Decrypted successfully — download started."
        : "Encrypted successfully — download started.";
  } catch (err) {
    statusEl.textContent = "";
    showModal("Network error: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

setMode("decrypt");
