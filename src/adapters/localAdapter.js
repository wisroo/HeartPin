async function json(res) {
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function op(body) {
  const r = await json(await fetch("/api/ops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
  return r.state;
}

export const localAdapter = {
  async fetchState(since) {
    const q = since != null ? `?since=${since}` : "";
    return json(await fetch(`/api/state${q}`));
  },

  uploadPhotos(files, owner, onProgress) {
    const fd = new FormData();
    const lm = [];
    [...files].forEach((f) => {
      fd.append("photos", f, f.name);
      lm.push(f.lastModified || null);
    });
    fd.append("owner", owner);
    fd.append("lastModified", JSON.stringify(lm));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/photos");
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
        else reject(new Error(`업로드 실패 (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("업로드 실패 — 서버에 연결할 수 없어요"));
      xhr.send(fd);
    });
  },

  placePhotos(rows) {
    return op({ op: "placePhotos", rows });
  },

  addTrip(trip) {
    return op({ op: "addTrip", trip });
  },

  editTrip(tripId, text) {
    return op({ op: "editTrip", tripId, field: "title", text });
  },

  editSpot(spotId, field, text) {
    return op({ op: "editSpot", spotId, field, text });
  },

  inboxKeep(id) {
    return op({ op: "inboxKeep", id });
  },

  inboxDiscard(ids) {
    return op({ op: "inboxDiscard", ids });
  },

  inboxPurge(ids) {
    return op({ op: "inboxPurge", ids });
  }
};
