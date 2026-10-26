import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const htmlPath = path.resolve(__dirname, '../docs/report_template.html');
  const pdfDocsPath = path.resolve(__dirname, '../docs/APIFORGE_PROJECT_REPORT_STAGES_0_TO_5.pdf');
  const pdfRootPath = path.resolve(__dirname, '../APIFORGE_PROJECT_REPORT.pdf');

  console.log('Loading HTML template from:', htmlPath);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  console.log('Generating PDF to:', pdfDocsPath);
  await page.pdf({
    path: pdfDocsPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm',
    },
  });

  // Also copy to root for quick access
  fs.copyFileSync(pdfDocsPath, pdfRootPath);
  console.log('Copied PDF to root:', pdfRootPath);

  await browser.close();
  console.log('PDF generation completed successfully!');
}

main().catch((err) => {
  console.error('PDF Generation Failed:', err);
  process.exit(1);
});
