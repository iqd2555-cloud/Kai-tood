/**
 * Bound Google Apps Script for the legacy standard-franchise response sheet.
 *
 * One-time setup:
 * 1. Open the response spreadsheet > Extensions > Apps Script.
 * 2. Paste this file.
 * 3. Run configureGoogleFormSync and enter the one-time connection code.
 *
 * configureGoogleFormSync installs an on-form-submit trigger and backfills all
 * existing rows. New responses are then sent immediately to the owner website.
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
    .filter((trigger) => trigger.getHandlerFunction() === "syncStandardFranchiseFormSubmit")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  const spreadsheet = SpreadsheetApp.openById(STANDARD_FRANCHISE_SPREADSHEET_ID);
  ScriptApp.newTrigger("syncStandardFranchiseFormSubmit")
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  return backfillStandardFranchiseResponses();
}

function syncStandardFranchiseFormSubmit(event) {
  if (!event || !event.range) throw new Error("ไม่พบข้อมูลแถวที่เพิ่งส่ง");
  const sheet = event.range.getSheet();
  const rowNumber = event.range.getRow();
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rawValues = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  sendStandardFranchiseRows([
    buildStandardFranchisePayload(sheet, rowNumber, headers, rawValues),
  ]);
}

function backfillStandardFranchiseResponses() {
  const spreadsheet = SpreadsheetApp.openById(STANDARD_FRANCHISE_SPREADSHEET_ID);
  const sheet = findStandardFranchiseResponseSheet(spreadsheet);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return { processed: 0 };

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
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
  const matchingSheet = spreadsheet.getSheets().find((sheet) => {
    if (sheet.getLastColumn() === 0) return false;
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0];
    return REQUIRED_FORM_HEADERS.every((required) => headers.includes(required));
  });
  if (!matchingSheet) {
    throw new Error("ไม่พบชีตคำตอบที่มีหัวคอลัมน์ของใบสมัครแฟรนไชส์ชุดมาตรฐาน");
  }
  return matchingSheet;
}

function buildStandardFranchisePayload(sheet, rowNumber, headers, rawValues) {
  const namedValues = {};
  headers.forEach((header, index) => {
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
    externalId: [
      STANDARD_FRANCHISE_SPREADSHEET_ID,
      sheet.getSheetId(),
      rowNumber,
    ].join(":"),
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
    headers: { "x-google-form-sync-secret": secret },
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
