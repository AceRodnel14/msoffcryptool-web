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

function clearDownloadLink() {
  const existing = document.getElementById("download-link");
  if (existing) existing.remove();
}

function showDownloadLink(downloadUrl, filename) {
  clearDownloadLink();
  const a = document.createElement("a");
  a.id = "download-link";
  a.href = downloadUrl;
  a.download = filename;
  a.textContent = "Download " + filename;
  a.className = "download-btn";
  statusEl.after(a);
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

  const fd = new FormData();
  fd.append("mode", state.mode);
  fd.append("password", passwordInput.value);
  fd.append("file", fileInput.files[0]);

  submitBtn.disabled = true;
  statusEl.textContent = "Processing...";
  clearDownloadLink();

  try {
    const res = await fetch("/api/process", { method: "POST", body: fd });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* non-JSON body, handled below */
    }

    if (!res.ok) {
      statusEl.textContent = "";
      showModal((data && data.detail) || "Something went wrong.");
      return;
    }

    statusEl.textContent =
      state.mode === "decrypt" ? "Decrypted successfully." : "Encrypted successfully.";
    showDownloadLink(data.download_url, data.filename);
  } catch (err) {
    statusEl.textContent = "";
    showModal("Network error: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

setMode("decrypt");
