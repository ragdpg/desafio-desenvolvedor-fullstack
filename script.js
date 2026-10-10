const PARTY_DATE = new Date("2026-11-19T19:00:00-03:00");

const form = document.querySelector("#rsvpForm");
const attendanceInputs = [...document.querySelectorAll('input[name="attendance"]')];
const partyFields = document.querySelector("#partyFields");
const companionCount = document.querySelector("#companionCount");
const companions = document.querySelector("#companions");
const toast = document.querySelector("#toast");

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
        <label for="companionAge${index}">Idade</label>
        <input
          id="companionAge${index}"
          name="companionAge${index}"
          type="number"
          min="0"
          max="120"
          placeholder="Idade"
          value="${escapeHtml(saved[index]?.age || "")}"
          required
        />
      </div>
      <span class="companion-number" aria-hidden="true">${index + 1}</span>
    `;
    companions.appendChild(row);
  }
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
}

function collectCompanions() {
  const count = Number(companionCount.value);
  return Array.from({ length: count }, (_, index) => ({
    name: document.querySelector(`#companionName${index}`)?.value.trim() || "",
    age: document.querySelector(`#companionAge${index}`)?.value || "",
  }));
}

function saveDraft() {
  const draft = {
    attendance: selectedAttendance(),
    guestName: form.guestName.value,
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
    form.guestAge.value = draft.guestAge || "";
    companionCount.value = draft.companionCount || "0";
    renderCompanions(Number(companionCount.value), draft.companions);
    updateAttendance();
  } catch {
    localStorage.removeItem("joao-rafael-rsvp");
  }
}

function buildConfirmation() {
  const name = form.guestName.value.trim();
  if (selectedAttendance() === "nao") {
    return `Olá! Aqui é ${name}. Infelizmente não poderei comparecer ao aniversário do João Rafael no dia 19/11. Desejo uma festa incrível! 💛`;
  }

  const guestAge = form.guestAge.value;
  const party = collectCompanions();
  const partyText = party.length
    ? `\n\nMeus acompanhantes:\n${party
        .map((person) => `• ${person.name}, ${person.age} ${Number(person.age) === 1 ? "ano" : "anos"}`)
        .join("\n")}`
    : "\n\nIrei sem acompanhantes.";

  return `Olá! Confirmo minha presença no aniversário do João Rafael! 🚀\n\nConvidado(a): ${name}, ${guestAge} ${Number(guestAge) === 1 ? "ano" : "anos"}${partyText}\n\nNos vemos no dia 19/11, às 19h, no Buffet Magic Time!`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3800);
}

async function shareConfirmation(message) {
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

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  if (popup) {
    showToast("Escolha o responsável no WhatsApp para concluir.");
  } else {
    await navigator.clipboard.writeText(message);
    showToast("Mensagem copiada! Envie-a ao responsável pela festa.");
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
  saveDraft();
  await shareConfirmation(buildConfirmation());
});

document.querySelector("#calendarButton").addEventListener("click", downloadCalendarEvent);

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
