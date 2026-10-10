const PARTY_DATE = new Date("2026-11-19T19:00:00-03:00");
const CONFIG = {
  whatsappNumber: "5513981828269",
  appsScriptUrl: "",
};

const form = document.querySelector("#rsvpForm");
const attendanceInputs = [...document.querySelectorAll('input[name="attendance"]')];
const partyFields = document.querySelector("#partyFields");
const companionCount = document.querySelector("#companionCount");
const companions = document.querySelector("#companions");
const guestType = document.querySelector("#guestType");
const guestAgeGroup = document.querySelector("#guestAgeGroup");
const musicToggle = document.querySelector("#musicToggle");
const toast = document.querySelector("#toast");
let audioContext;
let musicTimer;

const MELODY = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 698.46, 880.0, 698.46,
  659.25, 783.99, 987.77, 783.99,
  587.33, 659.25, 523.25, null,
];

function updateCountdown() {
  const distance = Math.max(0, PARTY_DATE.getTime() - Date.now());
  const values = {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };

  Object.entries(values).forEach(([id, value]) => {
    document.querySelector(`#${id}`).textContent = String(value).padStart(2, "0");
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
    return `Olá! Aqui é ${submission.guest.name}. Infelizmente não poderei comparecer ao aniversário do João Rafael no dia 19/11. Desejo uma festa incrível! 💛`;
  }

  const partyText = submission.companions.length
    ? `\n\nAcompanhantes:\n${submission.companions
        .map((person) => `• ${personDescription(person)}`)
        .join("\n")}`
    : "\n\nSem acompanhantes.";

  return `Olá! Confirmo minha presença no aniversário do João Rafael! 🚀\n\nConvidado(a): ${personDescription(submission.guest)}${partyText}\n\nNos vemos no dia 19/11, às 19h, no Buffet Magic Time!`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3800);
}

function playToyNote(frequency, start, duration) {
  if (!frequency || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.09, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function scheduleMelody() {
  const start = audioContext.currentTime + 0.06;
  MELODY.forEach((frequency, index) => {
    playToyNote(frequency, start + index * 0.34, 0.28);
  });
}

async function startMusic() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    showToast("Seu navegador não oferece suporte à música.");
    return;
  }

  audioContext = new AudioContext();
  await audioContext.resume();
  scheduleMelody();
  musicTimer = window.setInterval(scheduleMelody, MELODY.length * 340);
  musicToggle.setAttribute("aria-pressed", "true");
  musicToggle.querySelector(".music-label").textContent = "Pausar música";
  showToast("Melodia da aventura ligada ♪");
}

async function stopMusic() {
  window.clearInterval(musicTimer);
  if (audioContext) await audioContext.close();
  audioContext = undefined;
  musicToggle.setAttribute("aria-pressed", "false");
  musicToggle.querySelector(".music-label").textContent = "Ouvir música";
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
    showToast("Mensagem copiada! Envie-a para (13) 98182-8269.");
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
    "LOCATION:Buffet Magic Time\\, Av. Costa e Silva\\, Boqueirão\\, Praia Grande - SP",
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
    stopMusic();
  } else {
    startMusic();
  }
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal-on-scroll").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
  observer.observe(element);
});

restoreDraft();
updateAttendance();
updateCountdown();
window.setInterval(updateCountdown, 1_000);
