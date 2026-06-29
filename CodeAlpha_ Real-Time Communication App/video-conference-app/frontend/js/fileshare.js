/* ==========================================================================
   Confera — Meeting file sharing module
   Uploads use XMLHttpRequest (not fetch) specifically because XHR exposes
   upload progress events, which fetch's streaming API does not give us in
   a broadly-supported way yet. Downloads are fetched as a blob with the
   Authorization header attached, then turned into a temporary object URL —
   a plain <a href="downloadUrl"> wouldn't carry the JWT the backend requires.
   ========================================================================== */

class FileShareModule {
  constructor({ meetingCode, container, dropZone, fileInput, badgeEl }) {
    this.meetingCode = meetingCode;
    this.container = container;
    this.dropZone = dropZone;
    this.fileInput = fileInput;
    this.badgeEl = badgeEl;

    this._bindDropZone();
  }

  async loadFiles() {
    try {
      const files = await api.get(`/meetings/${this.meetingCode}/files`);
      this.container.innerHTML = "";
      if (!files.length) {
        this.container.innerHTML = `<div class="empty-state"><h4>No files yet</h4><p>Shared files will appear here.</p></div>`;
      } else {
        files.forEach((f) => this._renderFileRow(f));
      }
      this._updateBadge(files.length);
    } catch (err) {
      toast.error("Could not load shared files: " + err.message);
    }
  }

  _bindDropZone() {
    if (!this.dropZone || !this.fileInput) return;

    this.dropZone.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", () => {
      Array.from(this.fileInput.files).forEach((file) => this.uploadFile(file));
      this.fileInput.value = "";
    });

    ["dragover", "dragenter"].forEach((evt) =>
      this.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        this.dropZone.classList.add("dragover");
      })
    );
    ["dragleave", "dragend"].forEach((evt) =>
      this.dropZone.addEventListener(evt, () => this.dropZone.classList.remove("dragover"))
    );
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("dragover");
      Array.from(e.dataTransfer.files).forEach((file) => this.uploadFile(file));
    });
  }

  uploadFile(file) {
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(`"${file.name}" exceeds the 50MB limit.`);
      return;
    }

    const row = this._renderUploadingRow(file);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${window.CONFERA_CONFIG.API_BASE_URL}/meetings/${this.meetingCode}/files`);
    xhr.setRequestHeader("Authorization", `Bearer ${Auth.getToken()}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        row.querySelector(".upload-progress-bar").style.width = pct + "%";
      }
    });

    xhr.onload = () => {
      row.remove();
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success(`"${file.name}" uploaded`);
        
        /*const uploadedFile = JSON.parse(xhr.responseText);*/
        const response = JSON.parse(xhr.responseText);

        if (response.data) {
          this._renderFileRow(response.data);
          this._updateBadge(this.container.children.length);
        }

      } else {
        toast.error(`Failed to upload "${file.name}"`);
      }
    };


    xhr.onerror = () => {
      row.remove();
      toast.error(`Failed to upload "${file.name}" — check your connection`);
    };
    console.log("Sending upload...");
    xhr.send(formData);
  }

  _renderUploadingRow(file) {
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      ${this._fileIconSvg()}
      <div class="file-info">
        <div class="file-name">${escapeHtmlFile(file.name)}</div>
        <div class="file-meta">Uploading…</div>
        <div class="upload-progress"><div class="upload-progress-bar"></div></div>
      </div>`;
    this.container.prepend(row);
    return row;
  }

  _renderFileRow(file) {
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      ${this._fileIconSvg()}
      <div class="file-info">
        <div class="file-name" title="${escapeHtmlFile(file.originalFileName)}">${escapeHtmlFile(file.originalFileName)}</div>
        <div class="file-meta">${formatBytes(file.sizeBytes)} • ${escapeHtmlFile(file.uploadedByName)}</div>
      </div>
      <button class="file-download" title="Download" data-id="${file.id}" data-name="${escapeHtmlFile(file.originalFileName)}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"/></svg>
      </button>`;

    row.querySelector(".file-download").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      this._downloadFile(btn.dataset.id, btn.dataset.name);
    });

    this.container.appendChild(row);
  }

  async _downloadFile(fileId, fileName) {
    try {
      const response = await fetch(`${window.CONFERA_CONFIG.API_BASE_URL}/meetings/${this.meetingCode}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Could not download file: " + err.message);
    }
  }

  _updateBadge(count) {
    if (!this.badgeEl) return;
    this.badgeEl.style.display = count > 0 ? "flex" : "none";
    this.badgeEl.textContent = count > 9 ? "9+" : count;
  }

  _fileIconSvg() {
    return `<div class="file-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div>`;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeHtmlFile(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
