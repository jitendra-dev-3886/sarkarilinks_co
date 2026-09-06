import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { suggestFields } from './advertisement-fields.mjs';

const directory = resolve(import.meta.dirname, '../.cache/extraction-tests');
mkdirSync(directory, { recursive: true });
const lines = ['Synthetic Recruitment Board', 'Recruitment Advertisement 2026', 'Total vacancies: 120 posts', 'Qualification: Graduate', 'Application fee: INR 100', 'Last date: 30/09/2026', 'Apply online at the official website.'];
const pdfText = lines.map((line, index) => `${index ? '0 -30 Td ' : ''}(${line}) Tj`).join('\n');
const stream = `BT /F1 16 Tf 60 750 Td\n${pdfText}\nET`;
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
let pdf = '%PDF-1.4\n', offsets = [0];
objects.forEach((body, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(resolve(directory, 'recruitment.pdf'), pdf);
function writePdfFixture(name, entries) {
  let output = '%PDF-1.4\n';
  const locations = [];
  entries.forEach((body, index) => { locations.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const position = Buffer.byteLength(output);
  output += `xref\n0 ${entries.length + 1}\n0000000000 65535 f \n${locations.map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size ${entries.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`;
  writeFileSync(resolve(directory, name), output);
}
const literalStream = stream.replace('Recruitment Advertisement 2026', 'Recruitment syllabus: /JavaScript and <script are plain text');
for (const pageCount of [23, 51]) {
  const pageIds = [3, ...Array.from({ length: pageCount - 1 }, (_, index) => index + 6)];
  const entries = [...objects];
  entries[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  entries.push(...Array.from({ length: pageCount - 1 }, () => objects[2]));
  const name = `notice-${pageCount}-pages.pdf`;
  writePdfFixture(name, entries);
  const check = spawnSync(process.execPath, [resolve(import.meta.dirname, 'extract-advertisement.mjs'), resolve(directory, name)], { encoding: 'utf8', timeout: 240000, windowsHide: true });
  assert.equal(check.status, pageCount <= 50 ? 0 : 2, check.stdout + check.stderr);
  const result = JSON.parse(check.stdout);
  if (pageCount <= 50) assert.equal(result.metadata.pages, pageCount);
  else assert.equal(result.error.code, 'page_limit');
  console.log(`${name}: page limit validation passed`);
}
writePdfFixture('literal-markers.pdf', [...objects.slice(0, 4), `<< /Length ${Buffer.byteLength(literalStream)} >>\nstream\n${literalStream}\nendstream`]);
writePdfFixture('active-script.pdf', ['<< /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (app.alert\\(1\\)) >> >>', ...objects.slice(1)]);
writePdfFixture('page-script.pdf', [objects[0], objects[1], objects[2].replace('/Type /Page ', '/Type /Page /AA << /O << /S /JavaScript /JS (app.alert\\(1\\)) >> >> '), ...objects.slice(3)]);
writePdfFixture('empty-attachments.pdf', [objects[0].replace('/Pages 2 0 R', '/Pages 2 0 R /Names << /EmbeddedFiles << /Names [] >> >>'), ...objects.slice(1)]);
for (const filename of ['literal-markers.pdf', 'empty-attachments.pdf', 'active-script.pdf', 'page-script.pdf']) {
  const check = spawnSync(process.execPath, [resolve(import.meta.dirname, 'extract-advertisement.mjs'), resolve(directory, filename)], { encoding: 'utf8', timeout: 240000, windowsHide: true });
  if (filename.includes('script.pdf')) {
    assert.equal(check.status, 2, check.stdout + check.stderr);
    assert.equal(JSON.parse(check.stdout).error.code, 'pdf_scripts');
  } else {
    assert.equal(check.status, 0, check.stdout + check.stderr);
    assert.match(JSON.parse(check.stdout).text, /120/);
  }
  console.log(`${filename}: parsed PDF validation passed`);
}
const canvas = createCanvas(1400, 650), context = canvas.getContext('2d');
context.fillStyle = '#ffffff'; context.fillRect(0, 0, 1400, 650); context.fillStyle = '#000000'; context.font = '32px Arial';
lines.forEach((line, index) => context.fillText(line, 55, 70 + index * 75));
writeFileSync(resolve(directory, 'recruitment.png'), canvas.toBuffer('image/png'));
const jpeg = canvas.toBuffer('image/jpeg');
const imageStream = 'q 560 0 0 260 20 500 cm /Im0 Do Q';
const scanObjects = [Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'), Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'), Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'), Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1400 /Height 650 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]), Buffer.from(`<< /Length ${imageStream.length} >>\nstream\n${imageStream}\nendstream`)];
let scan = Buffer.from('%PDF-1.4\n'), scanOffsets = [];
scanObjects.forEach((body, index) => { scanOffsets.push(scan.length); scan = Buffer.concat([scan, Buffer.from(`${index + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')]); });
const scanXref = scan.length;
scan = Buffer.concat([scan, Buffer.from(`xref\n0 6\n0000000000 65535 f \n${scanOffsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${scanXref}\n%%EOF\n`)]);
writeFileSync(resolve(directory, 'scanned-recruitment.pdf'), scan);
for (const filename of ['recruitment.pdf', 'recruitment.png', 'scanned-recruitment.pdf']) {
  const child = spawnSync(process.execPath, [resolve(import.meta.dirname, 'extract-advertisement.mjs'), resolve(directory, filename)], { encoding: 'utf8', timeout: 240000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.suggestions.type, 'jobs');
  assert.match(result.text, /120/);
  assert.equal(result.suggestions.closing_date, '2026-09-30');
  assert.equal(result.metadata.ocr_pages, filename === 'recruitment.pdf' ? 0 : 1);
  console.log(`${filename}: extraction, categorization and closing date passed`);
}
assert.equal(suggestFields('Admit Card\nRecruitment examination instructions').type, null);
assert.equal(suggestFields('Notice with no category information').type, null);
assert.equal(suggestFields('Recruitment\nLast date: 31/02/2026').closing_date, null);
assert.equal(suggestFields('भर्ती विज्ञापन\nयोग्यता: स्नातक').type, 'jobs');
console.log('Ambiguity, invalid dates and Hindi classification passed');
const hindiCanvas = createCanvas(1500, 350), hindiContext = hindiCanvas.getContext('2d');
hindiContext.fillStyle = '#fff'; hindiContext.fillRect(0, 0, 1500, 350); hindiContext.fillStyle = '#000'; hindiContext.font = '48px "Nirmala UI", "Noto Sans Devanagari"';
['भर्ती विज्ञापन 2026', 'कुल रिक्त पद: 120', 'अंतिम तिथि: 30/09/2026'].forEach((line, index) => hindiContext.fillText(line, 60, 75 + index * 100));
writeFileSync(resolve(directory, 'hindi.png'), hindiCanvas.toBuffer('image/png'));
const hindiRun = spawnSync(process.execPath, [resolve(import.meta.dirname, 'extract-advertisement.mjs'), resolve(directory, 'hindi.png')], { encoding: 'utf8', timeout: 240000, windowsHide: true });
assert.equal(hindiRun.status, 0, hindiRun.stderr);
const hindiResult = JSON.parse(hindiRun.stdout);
assert.match(hindiResult.text, /भर्ती/);
assert.equal(hindiResult.suggestions.type, 'jobs');
assert.equal(hindiResult.suggestions.locale, 'hi');
console.log('Hindi image OCR and category passed');
