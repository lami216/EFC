import { readFile, writeFile } from 'node:fs/promises';

async function update(path, transform) {
  const before = await readFile(path, 'utf8');
  const after = transform(before);
  if (after !== before) {
    await writeFile(path, after, 'utf8');
    console.log(`Hardened ${path}`);
  } else {
    console.log(`No hardening changes needed for ${path}`);
  }
}

await update('demo-app.js', source => {
  let next = source;

  const start = next.indexOf('const seedSpecialties = [');
  const end = next.indexOf('const LS_STUDENTS=', start);
  if (start !== -1 && end !== -1) {
    next = `${next.slice(0, start)}const seedSpecialties = [];\n\nconst seedStudents=[];\n\n${next.slice(end)}`;
  }

  next = next.replace(
    /const DEMO_TODAY = '[^']+';/,
    "const DEMO_TODAY = (()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})();"
  );
  next = next.replaceAll('efc-demo-v2-students', 'efc-students-v1');
  next = next.replaceAll('efc-demo-v2-specialties', 'efc-specialties-v1');
  next = next.replace("const id='demo-'+Date.now();", "const id='student-'+Date.now();");
  next = next.replaceAll("location.hash.replace('#','')||'register'", "location.hash.replace('#','')||(specialties.length?'register':'specialties')");

  return next;
});

await update('demo-fix-v8.js', source =>
  source.replaceAll('efc-demo-v8-payment-methods', 'efc-payment-methods-v1')
);

await update('demo-period-merge.js', source => {
  let next = source.replace("const defaultFrom='2026-08-01';", "const defaultFrom=deviceTodayV3().slice(0,7)+'-01';");
  next = next.replaceAll("location.hash.replace('#','')||'register'", "location.hash.replace('#','')||(specialties.length?'register':'specialties')");
  return next;
});

console.log('Production source hardening completed.');
