import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const asset=fs.readdirSync('assets').filter(name=>name.endsWith('.js')).find(name=>fs.readFileSync(`assets/${name}`,'utf8').includes('window.EFC_PERSON_PDF_FILE_NAME_V68='));
assert(asset,'the shared person PDF filename helper is a packaged source asset');
const source=fs.readFileSync(`assets/${asset}`,'utf8'),digitsSource=fs.readFileSync('assets/production-foundation-v13.js','utf8').match(/^const westernDigits=.*$/m)?.[0];
assert(digitsSource,'use the same Arabic/Persian digit conversion as the receipt runtime');
const context={window:{},westernDigitsV3:vm.runInNewContext(`${digitsSource}\nwesternDigits`)};
vm.runInNewContext(source.slice(source.indexOf('function filePart('),source.indexOf('async function savePdf(')),context,{filename:asset});
const filename=context.window.EFC_PERSON_PDF_FILE_NAME_V68;assert.equal(typeof filename,'function');
const data={studentName:'محمد',branchName:'فرع عرفات',registrationNumber:'٠٠٤٢',receiptNumber:'٠٠١٢'};
const before=JSON.stringify(data);
assert.equal(filename(data),'روسي-محمد-فرع عرفات-تسجيل 0042-وصل 0012.pdf');
assert.equal(JSON.stringify(data),before,'formatting does not mutate document models');
assert.notEqual(filename(data),filename({...data,branchName:'فرع بوحديدة'}),'same-name/same-register students in different branches retain distinct filenames');
assert.notEqual(filename(data),filename({...data,registrationNumber:'0043'}));
assert.notEqual(filename(data),filename({...data,receiptNumber:'0013'}));
for(const documentType of ['روسي','كشف حساب','شهادة','استلام شهادة']){
  const name=filename({...data,documentType});assert(name.startsWith(documentType+'-'));assert(name.includes('محمد-فرع عرفات-تسجيل 0042'));
}
const missing=filename({});assert(missing.includes('الطالب')&&missing.includes('غير محدد')&&missing.includes('غير مسجل'));
assert(!missing.includes('0000'),'missing historical certificate registration numbers are not invented');
assert.equal(filename({...data,registrationNumber:'۰۰۴۲',receiptNumber:'۰۰۱۲'}),filename(data),'Persian and Arabic digits normalize consistently');
const forbidden=/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
const safe=name=>{assert(name.endsWith('.pdf'));assert(!forbidden.test(name),`Windows/control/direction characters cannot survive: ${JSON.stringify(name)}`);assert(!/[ .]$/.test(name.slice(0,-4)));assert(!/(?:^|-)[ .]+(?:-|\.pdf$)/.test(name));assert(!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name),'truncation preserves valid UTF-16');assert(name.length<=240,'filename stays below the planned Windows component budget');};
for(const value of ['محمد / أحمد: المختار','  اسم\r\nجديد\t<نص> ? * | \\ "  ','\u202eمحمد\u202c\u2066اسم\u2069\u200f\u061c','اسم...   ','...','CON','NUL','COM1']){
  safe(filename({documentType:value,studentName:value,branchName:value,registrationNumber:'٠٠٤٢',receiptNumber:'١٢'}));
}
const long=filename({documentType:'د'.repeat(17)+'😀'+'طويل',studentName:'ش'.repeat(79)+'😀'+'طويل',branchName:'ف'.repeat(49)+'😀'+'طويل',registrationNumber:'١'.repeat(31)+'😀'+'طويل',receiptNumber:'٢'.repeat(19)+'😀'+'طويل'});
safe(long);assert(long.includes('تسجيل ')&&long.includes('وصل '),'long names do not consume the registration/receipt portions');
for(let n=0;n<80;n++)safe(filename({documentType:n%2?'روسي':'شهادة',studentName:'طالب '+String.fromCodePoint(0x1f600+n)+'<>:/\\|?*\n\u202e'.repeat(n%5),branchName:'فرع '+('ب'.repeat(n)),registrationNumber:String(n),receiptNumber:String(n+1)}));
console.log('PDF filenames v68 passed: Arabic identity/branch/register, document types, optional legacy fields, digit conversion, Windows/control/bidi safety, Unicode truncation and immutable models.');
