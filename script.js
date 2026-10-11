const PARTY_DATE = new Date("2026-11-19T19:00:00-03:00");
const CONFIG = {
  whatsappNumber: "5513982056608",
  appsScriptUrl:
    "https://script.google.com/macros/s/AKfycbzXYo44mowQqAhw6DCliavxXbMsa_E-H52g6ujNlAAkmcYqA3BJzTJZZFzpbMMYnCgL1Q/exec",
};

const gate = document.querySelector("#gate");
const stage = document.querySelector("#stage");
const openGate = document.querySelector("#openGate");
const form = document.querySelector("#rsvpForm");
const attendanceInputs = [...document.querySelectorAll('input[name="attendance"]')];
const partyFields = document.querySelector("#partyFields");
const companionCount = document.querySelector("#companionCount");
const companions = document.querySelector("#companions");
const guestType = document.querySelector("#guestType");
const guestAgeGroup = document.querySelector("#guestAgeGroup");
const musicToggle = document.querySelector("#musicToggle");
const musicPlayer = document.querySelector("#musicPlayer");
const backgroundMusic = document.querySelector("#backgroundMusic");
const closeMusic = document.querySelector("#closeMusic");
const toast = document.querySelector("#toast");

document.body.classList.add("is-locked");

function updateCountdown() {
  const distance = Math.max(0, PARTY_DATE.getTime() - Date.now());
  const values = {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };

  Object.entries(values).forEach(([id, value]) => {
    const node = document.querySelector(`#${id}`);
    if (node) node.textContent = String(value).padStart(2, "0");
  });
}

function renderCompanions(count, saved = []) {
  companions.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const row = document.createElement("div");
    row.className = "companion-row";
    row.innerHTML = `
      <div class="form-group">
        <label for="companionName${index}">Nome do acompanhante ${index + 1}</label>
        <input
          id="companionName${index}"
          name="companionName${index}"
          type="text"
          placeholder="Nome"
          value="${escapeHtml(saved[index]?.name || "")}"
          required
        />
      </div>
      <div class="form-group">
        <label for="companionType${index}">É adulto ou criança?</label>
        <select
          id="companionType${index}"
          name="companionType${index}"
          class="person-type"
        >
          <option value="adulto" ${saved[index]?.type !== "crianca" ? "selected" : ""}>Adulto</option>
          <option value="crianca" ${saved[index]?.type === "crianca" ? "selected" : ""}>Criança</option>
        </select>
      </div>
      <div class="form-group companion-age" ${saved[index]?.type === "crianca" ? "" : "hidden"}>
        <label for="companionAge${index}">Idade da criança</label>
        <input
          id="companionAge${index}"
          name="companionAge${index}"
          type="number"
          min="0"
          max="17"
          placeholder="Idade"
          value="${escapeHtml(saved[index]?.age || "")}"
          ${saved[index]?.type === "crianca" ? "required" : "disabled"}
        />
      </div>
      <span class="companion-number" aria-hidden="true">${index + 1}</span>
    `;
    companions.appendChild(row);
  }
}

function updateAgeField(select, group) {
  const isChild = select.value === "crianca";
  const input = group.querySelector('input[type="number"]');
  group.hidden = !isChild;
  input.disabled = !isChild || selectedAttendance() !== "sim";
  input.required = isChild;
  if (!isChild) input.value = "";
}

function updateAllAgeFields() {
  updateAgeField(guestType, guestAgeGroup);
  document.querySelectorAll(".person-type").forEach((select) => {
    updateAgeField(select, select.closest(".companion-row").querySelector(".companion-age"));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedAttendance() {
  return document.querySelector('input[name="attendance"]:checked').value;
}

function updateAttendance() {
  const attending = selectedAttendance() === "sim";
  partyFields.hidden = !attending;
  partyFields.querySelectorAll("input, select").forEach((field) => {
    field.disabled = !attending;
  });
  updateAllAgeFields();
}

function collectCompanions() {
  const count = Number(companionCount.value);
  return Array.from({ length: count }, (_, index) => ({
    name: document.querySelector(`#companionName${index}`)?.value.trim() || "",
    type: document.querySelector(`#companionType${index}`)?.value || "adulto",
    age: document.querySelector(`#companionAge${index}`)?.value || "",
  }));
}

function saveDraft() {
  const draft = {
    attendance: selectedAttendance(),
    guestName: form.guestName.value,
    guestType: form.guestType.value,
    guestAge: form.guestAge.value,
    companionCount: companionCount.value,
    companions: collectCompanions(),
  };
  localStorage.setItem("joao-rafael-rsvp", JSON.stringify(draft));
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem("joao-rafael-rsvp"));
    if (!draft) return;

    const attendance = document.querySelector(
      `input[name="attendance"][value="${draft.attendance}"]`,
    );
    if (attendance) attendance.checked = true;
    form.guestName.value = draft.guestName || "";
    form.guestType.value = draft.guestType || "adulto";
    form.guestAge.value = draft.guestAge || "";
    companionCount.value = draft.companionCount || "0";
    renderCompanions(Number(companionCount.value), draft.companions);
    updateAttendance();
    updateAllAgeFields();
  } catch {
    localStorage.removeItem("joao-rafael-rsvp");
  }
}

function collectSubmission() {
  return {
    attendance: selectedAttendance(),
    guest: {
      name: form.guestName.value.trim(),
      type: form.guestType.value,
      age: form.guestType.value === "crianca" ? form.guestAge.value : "",
    },
    companions: selectedAttendance() === "sim" ? collectCompanions() : [],
  };
}

function personDescription(person) {
  if (person.type === "crianca") {
    return `${person.name} — criança, ${person.age} ${Number(person.age) === 1 ? "ano" : "anos"}`;
  }
  return `${person.name} — adulto`;
}

function buildConfirmation(submission) {
  if (submission.attendance === "nao") {
    return `Olá! Aqui é ${submission.guest.name}. Infelizmente não poderei comparecer ao aniversário do João Rafael no dia 19/11. Desejo uma festa incrível!`;
  }

  const partyText = submission.companions.length
    ? `\n\nAcompanhantes:\n${submission.companions
        .map((person) => `• ${personDescription(person)}`)
        .join("\n")}`
    : "\n\nSem acompanhantes.";

  return `Olá! Confirmo minha presença no aniversário do João Rafael!\n\nConvidado(a): ${personDescription(submission.guest)}${partyText}\n\nNos vemos no dia 19/11, às 19h, no Buffet Magic Time!`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3800);
}

async function openMusicPlayer() {
  try {
    backgroundMusic.volume = 0.32;
    await backgroundMusic.play();
    musicPlayer.hidden = false;
    musicToggle.setAttribute("aria-pressed", "true");
    musicToggle.querySelector(".music-label").textContent = "Pausar";
    showToast("Trilha da aventura ligada");
  } catch {
    showToast("Toque novamente para iniciar a música.");
  }
}

function closeMusicPlayer() {
  backgroundMusic.pause();
  musicPlayer.hidden = true;
  musicToggle.setAttribute("aria-pressed", "false");
  musicToggle.querySelector(".music-label").textContent = "Música";
}

async function sendToGuestList(submission) {
  if (!CONFIG.appsScriptUrl) return false;

  try {
    await fetch(CONFIG.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(submission),
    });
    localStorage.removeItem("joao-rafael-rsvp");
    showToast("Presença registrada na lista. Obrigado!");
    return true;
  } catch {
    return false;
  }
}

async function sendConfirmation(submission) {
  const saved = await sendToGuestList(submission);
  if (saved) return;

  const message = buildConfirmation(submission);
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  if (popup) {
    showToast("Envie a mensagem no WhatsApp para concluir.");
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Confirmação — Aniversário do João Rafael",
        text: message,
      });
      showToast("Confirmação compartilhada com sucesso!");
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(message);
    showToast("Mensagem copiada! Envie-a para (13) 98205-6608.");
  } catch {
    showToast("Não foi possível abrir o WhatsApp. Tente novamente.");
  }
}

function downloadCalendarEvent() {
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Convite João Rafael//PT-BR",
    "BEGIN:VEVENT",
    "UID:joao-rafael-20261119@convite",
    "DTSTAMP:20261010T000000Z",
    "DTSTART:20261119T220000Z",
    "DTEND:20261120T020000Z",
    "SUMMARY:Aniversário do João Rafael",
    "DESCRIPTION:Uma aventura com tema Toy Story!",
    "LOCATION:Buffet Magic Time\\, Av. Presidente Costa e Silva\\, 1248\\, Boqueirão\\, Praia Grande - SP",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "aniversario-joao-rafael.ics";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Evento adicionado ao seu download.");
}

function revealStage() {
  stage.hidden = false;
  requestAnimationFrame(() => stage.classList.add("is-visible"));
  gate.classList.add("is-open");
  gate.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-locked");
  window.setTimeout(() => {
    gate.hidden = true;
  }, 750);
  sessionStorage.setItem("joao-invite-opened", "1");
}

function setupStoryRail() {
  const panels = [...document.querySelectorAll(".story-panel")];
  if (!panels.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { root: document.querySelector(".story-rail"), threshold: 0.55 },
  );

  panels.forEach((panel) => observer.observe(panel));
  panels[0]?.classList.add("is-active");
}

companionCount.addEventListener("change", () => {
  const current = collectCompanions();
  renderCompanions(Number(companionCount.value), current);
  updateAllAgeFields();
  saveDraft();
});

guestType.addEventListener("change", () => {
  updateAgeField(guestType, guestAgeGroup);
  saveDraft();
});

companions.addEventListener("change", (event) => {
  if (!event.target.matches(".person-type")) return;
  updateAgeField(
    event.target,
    event.target.closest(".companion-row").querySelector(".companion-age"),
  );
  saveDraft();
});

attendanceInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateAttendance();
    saveDraft();
  });
});

form.addEventListener("input", saveDraft);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  saveDraft();
  try {
    await sendConfirmation(collectSubmission());
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#calendarButton").addEventListener("click", downloadCalendarEvent);
musicToggle.addEventListener("click", () => {
  if (musicToggle.getAttribute("aria-pressed") === "true") {
    closeMusicPlayer();
  } else {
    openMusicPlayer();
  }
});
closeMusic.addEventListener("click", closeMusicPlayer);
openGate.addEventListener("click", revealStage);

if (sessionStorage.getItem("joao-invite-opened") === "1") {
  gate.hidden = true;
  gate.classList.add("is-open");
  stage.hidden = false;
  stage.classList.add("is-visible");
  document.body.classList.remove("is-locked");
}

setupStoryRail();
restoreDraft();
updateAttendance();
updateCountdown();
window.setInterval(updateCountdown, 1_000);
