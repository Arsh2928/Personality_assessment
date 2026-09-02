const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { generateFullReport, getDimensionLabels } = require('../utils/reportContent');

/**
 * Build a nodemailer transporter from .env SMTP settings.
 * Falls back gracefully if credentials are placeholders.
 */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Generate the full OCEAN PDF report in-memory and return as a Buffer.
 * Mirrors the logic in routes/assessment.js GET /:id/report-pdf
 */
async function buildPdfBuffer(response) {
  return new Promise((resolve, reject) => {
    const report = generateFullReport(response.scores);
    const labels = getDimensionLabels(response.scores);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Cover ──
    doc.rect(0, 0, doc.page.width, 140).fill('#0f1f3d');
    doc
      .fillColor('#38bdf8').font('Helvetica-Bold').fontSize(22)
      .text('OCEAN Personality Report', 50, 45, { align: 'center' });
    doc
      .fillColor('#e2e8f0').font('Helvetica').fontSize(12)
      .text(`Prepared for: ${response.participantName}`, 50, 78, { align: 'center' });
    doc
      .fillColor('#94a3b8').fontSize(10)
      .text(
        `Date: ${new Date(response.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        50, 98, { align: 'center' }
      );
    doc
      .fillColor('#64748b').fontSize(9)
      .text('Industrial Psychology Consultants · Confidential', 50, 118, { align: 'center' });

    doc.y = 160;

    // ── Scores Summary ──
    doc.fillColor('#0f1f3d').font('Helvetica-Bold').fontSize(14).text('Your OCEAN Scores').moveDown(0.4);

    const dims = [
      ['Surgency / Extraversion', response.scores.extraversion],
      ['Agreeableness', response.scores.agreeableness],
      ['Adjustment', response.scores.adjustment],
      ['Conscientiousness', response.scores.conscientiousness],
      ['Openness to Experience', response.scores.openness],
    ];

    dims.forEach(([name, score]) => {
      const barWidth = Math.round((score / 35) * 350);
      const label = labels[name.toLowerCase().split(' ')[0]] || {};
      const bandColor = score >= 26 ? '#0ea5e9' : score >= 15 ? '#6366f1' : '#94a3b8';
      doc.fillColor('#1e293b').font('Helvetica').fontSize(10)
        .text(`${name} — ${score}/35  (${label.band || ''})`);
      doc.rect(50, doc.y + 2, barWidth, 8).fill(bandColor);
      doc.moveDown(1.2);
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    // ── Report Sections ──
    report.forEach((section) => {
      if (doc.y > doc.page.height - 150) doc.addPage();

      doc.fillColor('#0f1f3d').font('Helvetica-Bold').fontSize(13).text(section.title).moveDown(0.3);

      if (section.typeName)
        doc.fillColor('#0ea5e9').font('Helvetica-Bold').fontSize(11).text(section.typeName).moveDown(0.2);
      if (section.style)
        doc.fillColor('#6366f1').font('Helvetica-Bold').fontSize(11).text(section.style).moveDown(0.2);
      if (section.content)
        doc.fillColor('#334155').font('Helvetica').fontSize(10)
          .text(section.content.replace(/\*\*/g, ''), { lineGap: 4 }).moveDown(0.4);

      if (section.items) {
        section.items.forEach((item) => {
          const text = typeof item === 'string' ? item : `${item.driver}: ${item.detail}`;
          doc.fillColor('#475569').font('Helvetica').fontSize(10)
            .text(`• ${text}`, { indent: 10, lineGap: 3 });
        });
        doc.moveDown(0.4);
      }
      if (section.tendencies) {
        doc.fillColor('#0f1f3d').font('Helvetica-Bold').fontSize(10).text('Stress Tendencies:').moveDown(0.2);
        section.tendencies.forEach((t) =>
          doc.fillColor('#475569').font('Helvetica').fontSize(10).text(`• ${t}`, { indent: 10, lineGap: 3 })
        );
        doc.moveDown(0.3);
        doc.fillColor('#0f1f3d').font('Helvetica-Bold').fontSize(10).text('Coping Strategies:').moveDown(0.2);
        section.coping.forEach((c) =>
          doc.fillColor('#475569').font('Helvetica').fontSize(10).text(`• ${c}`, { indent: 10, lineGap: 3 })
        );
        doc.moveDown(0.4);
      }
      if (section.tips) {
        doc.fillColor('#0f1f3d').font('Helvetica-Bold').fontSize(10).text('Tips:').moveDown(0.2);
        section.tips.forEach((t) =>
          doc.fillColor('#475569').font('Helvetica').fontSize(10).text(`• ${t}`, { indent: 10, lineGap: 3 })
        );
        doc.moveDown(0.4);
      }

      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#f1f5f9').stroke();
      doc.moveDown(0.6);
    });

    // ── Footer ──
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
      .text(
        'This report is for personal and professional development purposes only. © Industrial Psychology Consultants',
        50, doc.page.height - 50, { align: 'center' }
      );

    doc.end();
  });
}

/**
 * Send the OCEAN report PDF to the participant via email.
 * @param {object} response - Mongoose Response document
 * @returns {Promise<{messageId: string}>}
 */
async function sendReportEmail(response) {
  const transporter = createTransport();

  // Verify SMTP connectivity before building the PDF
  await transporter.verify();

  const pdfBuffer = await buildPdfBuffer(response);

  const safeName = response.participantName.replace(/\s+/g, '_');
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const info = await transporter.sendMail({
    from,
    to: response.participantEmail,
    subject: `Your OCEAN Personality Report — ${response.participantName}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #0f1f3d 0%, #1e3a5f 100%); padding: 36px 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <p style="color: #38bdf8; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">Industrial Psychology Consultants</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 6px;">Your OCEAN Personality Report</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Prepared exclusively for <strong style="color: #e2e8f0;">${response.participantName}</strong></p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 15px; line-height: 1.7; color: #334155;">Dear <strong>${response.participantName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.7; color: #475569;">
            Thank you for completing the OCEAN Personality Assessment. Your personalised report is attached to this email as a PDF.
          </p>
          <p style="font-size: 14px; line-height: 1.7; color: #475569;">
            The report covers your scores and interpretations across all five OCEAN dimensions:
          </p>
          <ul style="font-size: 13px; color: #475569; line-height: 2; padding-left: 20px;">
            <li>Surgency / Extraversion — <strong>${response.scores.extraversion}/35</strong></li>
            <li>Agreeableness — <strong>${response.scores.agreeableness}/35</strong></li>
            <li>Adjustment — <strong>${response.scores.adjustment}/35</strong></li>
            <li>Conscientiousness — <strong>${response.scores.conscientiousness}/35</strong></li>
            <li>Openness to Experience — <strong>${response.scores.openness}/35</strong></li>
          </ul>
          <p style="font-size: 13px; color: #64748b; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            This report is confidential and intended solely for <strong>${response.participantName}</strong>. 
            If you did not take this assessment, please ignore this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">© Industrial Psychology Consultants · Confidential Assessment Report</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `OCEAN_Report_${safeName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { messageId: info.messageId };
}

module.exports = { sendReportEmail };
