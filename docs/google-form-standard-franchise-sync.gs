/**
 * Bound Google Apps Script for the legacy standard-franchise response sheet.
 *
 * One-time setup:
 * 1. Open the response spreadsheet > Extensions > Apps Script.
 * 2. Paste this file.
 * 3. Run configureGoogleFormSync and enter the one-time connection code.
 *
 * configureGoogleFormSync installs submit/edit/hourly triggers and backfills all
 * existing rows. New responses and later sheet edits are reconciled automatically.
 */

const STANDARD_FRANCHISE_SYNC_ENDPOINT =
  "https://kai-tood.vercel.app/api/integrations/google-form/franchise-leads";
const STANDARD_FRANCHISE_SPREADSHEET_ID =
  "1ehHZ6mt_p7dHDkDRyztmvn8SfsCNQehDPrPIevOd_QE";
const REQUIRED_FORM_HEADERS = [
  "ชื่อ-นามสกุล",
  "เบอร์โทรศัพท์ / LINE ID",
  "จังหวัด / อำเภอ ที่ต้องการเปิดร้าน",
];
const INTERNAL_SYNC_ID_HEADER = "ระบบ Sync ID";

function configureGoogleFormSync() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    "เชื่อมต่อ Google Form กับระบบแฟรนไชส์",
    "วางรหัสเชื่อมต่อแบบใช้ครั้งเดียว แล้วกดตกลง",
    ui.ButtonSet.OK_CANCEL,
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) {
    return { processed: 0, cancelled: true };
  }

  const secret = prompt.getResponseText().trim();
  if (!secret || String(secret).length < 24) {
    throw new Error("กรุณาใส่รหัสเชื่อมต่อที่มีความยาวอย่างน้อย 24 ตัวอักษร");
  }

  PropertiesService.getScriptProperties().setProperty(
    "GOOGLE_FORM_SYNC_SECRET",
    String(secret),
  );

  ScriptApp.getProjectTriggers()
    .filter((trigger) => [
      "syncStandardFranchiseFormSubmit",
      "syncStandardFranchiseSheetEdit",
      "reconcileStandardFranchiseResponses",
    ].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  const spreadsheet = SpreadsheetApp.openById(STANDARD_FRANCHISE_SPREADSHEET_ID);
  ScriptApp.newTrigger("syncStandardFranchiseFormSubmit")
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
  ScriptApp.newTrigger("syncStandardFranchiseSheetEdit")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();
  ScriptApp.newTrigger("reconcileStandardFranchiseResponses")
    .timeBased()
    .everyHours(1)
    .create();

  return backfillStandardFranchiseResponses();
}

function syncStandardFranchiseFormSubmit(event) {
  if (!event || !event.range) throw new Error("ไม่พบข้อมูลแถวที่เพิ่งส่ง");
  const sheet = event.range.getSheet();
  const rowNumber = event.range.getRow();
  const syncColumn = ensureStandardFranchiseSyncColumn(sheet);
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rawValues = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  ensureRowSyncId(sheet, rowNumber, rawValues, syncColumn);
  sendStandardFranchiseRows([
    buildStandardFranchisePayload(sheet, rowNumber, headers, rawValues),
  ]);
}

function syncStandardFranchiseSheetEdit(event) {
  if (!event || !event.range || event.range.getRow() < 2) return;
  const sheet = event.range.getSheet();
  if (!isStandardFranchiseResponseSheet(sheet)) return;

  const firstRow = Math.max(2, event.range.getRow());
  const lastRow = Math.min(
    sheet.getLastRow(),
    event.range.getLastRow(),
  );
  if (lastRow < firstRow) return;

  const syncColumn = ensureStandardFranchiseSyncColumn(sheet);
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rows = sheet
    .getRange(firstRow, 1, lastRow - firstRow + 1, lastColumn)
    .getValues();
  rows.forEach((row, offset) => ensureRowSyncId(
    sheet,
    firstRow + offset,
    row,
    syncColumn,
  ));
  sendStandardFranchiseRows(rows.map((row, offset) =>
    buildStandardFranchisePayload(sheet, firstRow + offset, headers, row)
  ));
}

function reconcileStandardFranchiseResponses() {
  return backfillStandardFranchiseResponses();
}

function backfillStandardFranchiseResponses() {
  const spreadsheet = SpreadsheetApp.openById(STANDARD_FRANCHISE_SPREADSHEET_ID);
  const sheet = findStandardFranchiseResponseSheet(spreadsheet);
  const syncColumn = ensureStandardFranchiseSyncColumn(sheet);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return { processed: 0 };

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  let syncIdsChanged = false;
  rows.forEach((row) => {
    if (!String(row[syncColumn - 1] || "").trim()) {
      row[syncColumn - 1] = Utilities.getUuid();
      syncIdsChanged = true;
    }
  });
  if (syncIdsChanged) {
    sheet
      .getRange(2, syncColumn, rows.length, 1)
      .setValues(rows.map((row) => [row[syncColumn - 1]]));
  }
  let processed = 0;

  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows
      .slice(offset, offset + 100)
      .map((row, index) => buildStandardFranchisePayload(
        sheet,
        offset + index + 2,
        headers,
        row,
      ));
    sendStandardFranchiseRows(batch);
    processed += batch.length;
  }

  return { processed: processed };
}

function findStandardFranchiseResponseSheet(spreadsheet) {
  const matchingSheet = spreadsheet.getSheets().find(isStandardFranchiseResponseSheet);
  if (!matchingSheet) {
    throw new Error("ไม่พบชีตคำตอบที่มีหัวคอลัมน์ของใบสมัครแฟรนไชส์ชุดมาตรฐาน");
  }
  return matchingSheet;
}

function isStandardFranchiseResponseSheet(sheet) {
  if (sheet.getLastColumn() === 0) return false;
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  return REQUIRED_FORM_HEADERS.every((required) => headers.includes(required));
}

function ensureStandardFranchiseSyncColumn(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const existingIndex = headers.indexOf(INTERNAL_SYNC_ID_HEADER);
  if (existingIndex >= 0) return existingIndex + 1;

  const syncColumn = lastColumn + 1;
  sheet.getRange(1, syncColumn).setValue(INTERNAL_SYNC_ID_HEADER);
  sheet.hideColumns(syncColumn);
  return syncColumn;
}

function ensureRowSyncId(sheet, rowNumber, rawValues, syncColumn) {
  const existing = String(rawValues[syncColumn - 1] || "").trim();
  if (existing) return existing;
  const syncId = Utilities.getUuid();
  rawValues[syncColumn - 1] = syncId;
  sheet.getRange(rowNumber, syncColumn).setValue(syncId);
  return syncId;
}

function buildStandardFranchisePayload(sheet, rowNumber, headers, rawValues) {
  const namedValues = {};
  headers.forEach((header, index) => {
    if (header === INTERNAL_SYNC_ID_HEADER) return;
    const value = rawValues[index];
    namedValues[header] = [
      value instanceof Date ? value.toISOString() : String(value == null ? "" : value),
    ];
  });

  const firstValue = rawValues[0];
  const submittedAt = firstValue instanceof Date
    ? firstValue.toISOString()
    : String(firstValue == null ? "" : firstValue);

  return {
    externalId: String(rawValues[headers.indexOf(INTERNAL_SYNC_ID_HEADER)] || [
      STANDARD_FRANCHISE_SPREADSHEET_ID,
      sheet.getSheetId(),
      rowNumber,
    ].join(":")),
    spreadsheetId: STANDARD_FRANCHISE_SPREADSHEET_ID,
    sheetName: sheet.getName(),
    rowNumber: rowNumber,
    submittedAt: submittedAt,
    namedValues: namedValues,
  };
}

function sendStandardFranchiseRows(rows) {
  const secret = PropertiesService
    .getScriptProperties()
    .getProperty("GOOGLE_FORM_SYNC_SECRET");
  if (!secret) throw new Error("ยังไม่ได้ตั้งค่ารหัสเชื่อมต่อ");

  const response = UrlFetchApp.fetch(STANDARD_FRANCHISE_SYNC_ENDPOINT, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(
      "ส่งข้อมูลไม่สำเร็จ (" + status + "): " + response.getContentText(),
    );
  }
  return JSON.parse(response.getContentText());
}
