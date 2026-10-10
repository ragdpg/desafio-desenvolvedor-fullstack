const SHEET_NAME = "Confirmações";
const NOTIFICATION_EMAIL = "ragdpg@gmail.com";

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(event.postData.contents);
    validateSubmission(data);

    const sheet = getConfirmationSheet();
    const confirmationId = Utilities.getUuid();
    const createdAt = new Date();
    const status = data.attendance === "sim" ? "Confirmado" : "Não comparece";
    const people = data.attendance === "sim"
      ? [Object.assign({ role: "Convidado principal" }, data.guest)]
          .concat(data.companions.map(person => Object.assign({ role: "Acompanhante" }, person)))
      : [Object.assign({ role: "Convidado principal" }, data.guest)];

    people.forEach(person => {
      sheet.appendRow([
        createdAt,
        confirmationId,
        status,
        safeCell(data.guest.name),
        safeCell(person.name),
        person.type === "crianca" ? "Criança" : "Adulto",
        person.type === "crianca" ? Number(person.age) : "",
        person.role,
      ]);
    });

    sendNotification(data, status, people);
    return jsonResponse({ ok: true, confirmationId: confirmationId });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function getConfirmationSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Data e hora",
      "Código da confirmação",
      "Status",
      "Responsável pela resposta",
      "Nome do convidado",
      "Categoria",
      "Idade",
      "Participação",
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:H1")
      .setFontWeight("bold")
      .setBackground("#092f58")
      .setFontColor("#ffffff");
    sheet.autoResizeColumns(1, 8);
  }

  return sheet;
}

function validateSubmission(data) {
  if (!data || !["sim", "nao"].includes(data.attendance)) {
    throw new Error("Resposta de presença inválida.");
  }
  if (!data.guest || !String(data.guest.name || "").trim()) {
    throw new Error("Nome do convidado não informado.");
  }

  const people = [data.guest].concat(data.companions || []);
  people.forEach(person => {
    if (!String(person.name || "").trim()) {
      throw new Error("Há um convidado sem nome.");
    }
    if (!["adulto", "crianca"].includes(person.type)) {
      throw new Error("Categoria de convidado inválida.");
    }
    if (person.type === "crianca") {
      const age = Number(person.age);
      if (!Number.isInteger(age) || age < 0 || age > 17) {
        throw new Error("Idade de criança inválida.");
      }
    }
  });
}

function sendNotification(data, status, people) {
  const lines = [
    "Nova resposta para o aniversário de João Rafael",
    "",
    "Status: " + status,
    "Enviado por: " + data.guest.name,
    "",
    "Lista desta confirmação:",
  ];

  people.forEach(person => {
    const category = person.type === "crianca"
      ? "criança, " + person.age + (Number(person.age) === 1 ? " ano" : " anos")
      : "adulto";
    lines.push("• " + person.name + " — " + category + " — " + person.role);
  });

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: "Nova confirmação — " + data.guest.name,
    body: lines.join("\n"),
    name: "Convite do João Rafael",
  });
}

function safeCell(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
