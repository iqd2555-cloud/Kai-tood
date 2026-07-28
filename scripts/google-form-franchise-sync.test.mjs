import assert from "node:assert/strict";
import { syncGoogleFormStandardLead } from "../lib/google-form-franchise-sync.ts";

function createMemorySupabase(seed = {}) {
  const tables = {
    franchise_leads: structuredClone(seed.franchise_leads ?? []),
    google_form_franchise_imports: structuredClone(seed.google_form_franchise_imports ?? []),
  };
  let nextId = 1;

  class Query {
    constructor(table) {
      this.table = table;
      this.operation = "select";
      this.filters = [];
      this.payload = null;
      this.limitCount = null;
    }

    select() {
      return this;
    }

    insert(payload) {
      this.operation = "insert";
      this.payload = payload;
      return this;
    }

    update(payload) {
      this.operation = "update";
      this.payload = payload;
      return this;
    }

    eq(column, value) {
      this.filters.push([column, value]);
      return this;
    }

    order() {
      return this;
    }

    limit(count) {
      this.limitCount = count;
      return this;
    }

    matchingRows() {
      const rows = tables[this.table].filter((row) =>
        this.filters.every(([column, value]) => row[column] === value)
      );
      return this.limitCount ? rows.slice(0, this.limitCount) : rows;
    }

    execute() {
      if (this.operation === "insert") {
        const row = { id: `id-${nextId++}`, ...structuredClone(this.payload) };
        if (this.table === "franchise_leads") {
          row.phone_normalized = String(row.phone ?? "").replace(/\D/g, "");
          row.email_normalized = String(row.email ?? "").trim().toLowerCase();
        }
        tables[this.table].push(row);
        return { data: row, error: null };
      }
      if (this.operation === "update") {
        const rows = this.matchingRows();
        rows.forEach((row) => Object.assign(row, structuredClone(this.payload)));
        return { data: rows, error: null };
      }
      return { data: this.matchingRows(), error: null };
    }

    maybeSingle() {
      const result = this.execute();
      return Promise.resolve({ data: result.data[0] ?? null, error: result.error });
    }

    single() {
      const result = this.execute();
      return Promise.resolve({ data: Array.isArray(result.data) ? result.data[0] : result.data, error: result.error });
    }

    then(resolve, reject) {
      return Promise.resolve(this.execute()).then(resolve, reject);
    }
  }

  return {
    tables,
    client: {
      from(table) {
        return new Query(table);
      },
    },
  };
}

function row(overrides = {}) {
  return {
    externalId: "stable-row-1",
    spreadsheetId: "sheet-1",
    sheetName: "คำตอบ",
    rowNumber: 2,
    submittedAt: "2026-07-27T03:30:00.000Z",
    namedValues: {
      "ชื่อ-นามสกุล": "สมชาย ใจดี",
      "เบอร์โทรศัพท์ / LINE ID": "081-234-5678 / somchai.line",
      "Email Address": "somchai@example.com",
      "จังหวัด / อำเภอ ที่ต้องการเปิดร้าน": "นครสวรรค์ / เมืองนครสวรรค์",
      "งบลงทุนที่เตรียมไว้": "40,001–60,000 บาท",
    },
    ...overrides,
  };
}

const memory = createMemorySupabase();
const created = await syncGoogleFormStandardLead(memory.client, row());
assert.equal(created.outcome, "created");
assert.equal(memory.tables.franchise_leads.length, 1);
assert.equal(memory.tables.google_form_franchise_imports.length, 1);

const duplicate = await syncGoogleFormStandardLead(memory.client, row());
assert.equal(duplicate.outcome, "duplicate");
assert.equal(memory.tables.franchise_leads.length, 1);

const changedRow = row({
  namedValues: {
    ...row().namedValues,
    "งบลงทุนที่เตรียมไว้": "มากกว่า 60,000 บาท",
  },
});
const updated = await syncGoogleFormStandardLead(memory.client, changedRow);
assert.equal(updated.outcome, "updated");
assert.equal(memory.tables.franchise_leads.length, 1);
assert.equal(memory.tables.franchise_leads[0].budget_range, "มากกว่า 60,000 บาท");

const samePhoneNewRow = await syncGoogleFormStandardLead(memory.client, row({
  externalId: "stable-row-2",
  rowNumber: 3,
}));
assert.equal(samePhoneNewRow.outcome, "merged");
assert.equal(memory.tables.franchise_leads.length, 1);

const website = createMemorySupabase({
  franchise_leads: [{
    id: "website-1",
    source: "website",
    full_name: "ข้อมูลจากเว็บไซต์",
    phone: "0899999999",
    phone_normalized: "0899999999",
    email: null,
    email_normalized: "",
    line_id: null,
    source_submitted_at: null,
    source_payload: null,
    budget_range: "งบจากเว็บไซต์",
    created_at: "2026-07-01T00:00:00.000Z",
  }],
});
const mergedWebsite = await syncGoogleFormStandardLead(website.client, row({
  externalId: "stable-row-website",
  namedValues: {
    ...row().namedValues,
    "ชื่อ-นามสกุล": "ข้อมูลจาก Google Form",
    "เบอร์โทรศัพท์ / LINE ID": "089-999-9999 / new.line",
    "Email Address": "new@example.com",
    "งบลงทุนที่เตรียมไว้": "งบจาก Google Form",
  },
}));
assert.equal(mergedWebsite.outcome, "merged");
assert.equal(website.tables.franchise_leads.length, 1);
assert.equal(website.tables.franchise_leads[0].full_name, "ข้อมูลจากเว็บไซต์");
assert.equal(website.tables.franchise_leads[0].budget_range, "งบจากเว็บไซต์");
assert.equal(website.tables.franchise_leads[0].email, "new@example.com");
assert.equal(website.tables.franchise_leads[0].line_id, "new.line");

console.log("Google Form sync idempotency and update tests passed");
