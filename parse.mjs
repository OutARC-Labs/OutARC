import fs from 'fs'; import pdf from 'pdf-parse'; async function run() { const data = await pdf(fs.readFileSync('ProjectDetails/OutARC-PersonB-Day1.pdf')); console.log(data.text); } run();
