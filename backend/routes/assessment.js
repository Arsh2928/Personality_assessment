const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const path = require('path');
const PDFDocument = require('pdfkit');
const Response = require('../models/Response');
const { computeScores } = require('../utils/scoring');
const { generateFullReport, getDimensionLabels } = require('../utils/reportContent');

// ─── Cloudinary storage for payment proof screenshots ────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'payment-proofs',
    public_id: `payment-${req.params.id}-${Date.now()}`,
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
  }),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only images (jpg/png) and PDFs are allowed'), ok);
  },
});

// ─── GET /api/assessment/config (public) ─────────────────────────────────────
// Returns payment config so the frontend can render the correct UPI QR code.
router.get('/config', (req, res) => {
  res.json({
    upiId: process.env.UPI_ID || '',
    paymentAmount: Number(process.env.PAYMENT_AMOUNT) || 99,
  });
});

// ─── POST /api/assessment/submit ─────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  try {
    const {
      participantName,
      participantEmail,
      participantPhone,
      answers,
      paymentAmount,
      paymentReference,
    } = req.body;

    if (!participantName || !participantEmail) {
      return res.status(400).json({ error: 'participantName and participantEmail are required' });
    }
    if (!Array.isArray(answers) || answers.length !== 25) {
      return res.status(400).json({ error: 'answers must be an array of 25 values (1-7)' });
    }
    if (answers.some((n) => typeof n !== 'number' || n < 1 || n > 7)) {
      return res.status(400).json({ error: 'Each answer must be a number between 1 and 7' });
    }

    const scores = computeScores(answers);

    const response = await Response.create({
      participantName,
      participantEmail,
      participantPhone,
      answers,
      scores,
      paymentAmount: paymentAmount || 0,
      paymentStatus: paymentAmount > 0 ? 'paid' : 'unpaid',
      paymentReference,
    });

    res.status(201).json({ id: response._id, scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save assessment response' });
  }
});

// ─── GET /api/assessment/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ error: 'Response not found' });
    res.json({
      id: response._id,
      participantName: response.participantName,
      scores: response.scores,
      paymentStatus: response.paymentStatus,
      createdAt: response.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch response' });
  }
});

// ─── POST /api/assessment/:id/payment-proof ───────────────────────────────────
router.post('/:id/payment-proof', (req, res) => {
  // Run multer first so Cloudinary upload errors are catchable
  upload.single('screenshot')(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('[payment-proof] Multer/Cloudinary upload error:', multerErr);
      return res.status(400).json({ error: multerErr.message || 'File upload failed' });
    }
    try {
      const response = await Response.findById(req.params.id);
      if (!response) return res.status(404).json({ error: 'Response not found' });

      response.paymentAmount    = Number(process.env.PAYMENT_AMOUNT) || 99;
      response.paymentStatus    = 'paid';
      response.paymentReference = req.body.upiRef || null;
      if (req.file) {
        // multer-storage-cloudinary v4: path = secure_url, filename = public_id
        response.paymentProofFile      = req.file.path;
        response.paymentProofPublicId  = req.file.filename;
      }

      await response.save();

      const report = generateFullReport(response.scores);
      const labels = getDimensionLabels(response.scores);

      res.json({ success: true, paymentStatus: 'paid', report, labels });
    } catch (err) {
      console.error('[payment-proof] DB/report error:', err);
      res.status(500).json({ error: 'Failed to process payment proof' });
    }
  });
});

// ─── GET /api/assessment/:id/report-pdf ──────────────────────────────────────
router.get('/:id/report-pdf', async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ error: 'Response not found' });
    if (response.paymentStatus !== 'paid') {
      return res.status(403).json({ error: 'Full report requires completed payment' });
    }

    const report = generateFullReport(response.scores);
    const labels = getDimensionLabels(response.scores);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=OCEAN_Report_${response.participantName.replace(/\s+/g, '_')}.pdf`
    );
    doc.pipe(res);

    // ── Cover ──
    doc
      .rect(0, 0, doc.page.width, 140)
      .fill('#0f1f3d');
    doc
      .fillColor('#38bdf8')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('OCEAN Personality Report', 50, 45, { align: 'center' });
    doc
      .fillColor('#e2e8f0')
      .font('Helvetica')
      .fontSize(12)
      .text(`Prepared for: ${response.participantName}`, 50, 78, { align: 'center' });
    doc
      .fillColor('#94a3b8')
      .fontSize(10)
      .text(`Date: ${new Date(response.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 98, { align: 'center' });
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .text('Industrial Psychology Consultants · Confidential', 50, 118, { align: 'center' });

    doc.y = 160;

    // ── Scores Summary ──
    doc
      .fillColor('#0f1f3d')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Your OCEAN Scores', { underline: false })
      .moveDown(0.4);

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
      doc
        .fillColor('#1e293b')
        .font('Helvetica')
        .fontSize(10)
        .text(`${name} — ${score}/35  (${label.band || ''})`, { continued: false });
      doc
        .rect(50, doc.y + 2, barWidth, 8)
        .fill(bandColor);
      doc.moveDown(1.2);
    });

    doc.moveDown(0.5);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#e2e8f0')
      .stroke();
    doc.moveDown(0.5);

    // ── Report Sections ──
    report.forEach((section) => {
      // Page break if near bottom
      if (doc.y > doc.page.height - 150) doc.addPage();

      doc
        .fillColor('#0f1f3d')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(section.title)
        .moveDown(0.3);

      if (section.typeName) {
        doc.fillColor('#0ea5e9').font('Helvetica-Bold').fontSize(11).text(section.typeName).moveDown(0.2);
      }
      if (section.style) {
        doc.fillColor('#6366f1').font('Helvetica-Bold').fontSize(11).text(section.style).moveDown(0.2);
      }
      if (section.content) {
        doc
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(10)
          .text(section.content.replace(/\*\*/g, ''), { lineGap: 4 })
          .moveDown(0.4);
      }
      if (section.items) {
        section.items.forEach((item) => {
          const text = typeof item === 'string' ? item : `${item.driver}: ${item.detail}`;
          doc
            .fillColor('#475569')
            .font('Helvetica')
            .fontSize(10)
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

      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor('#f1f5f9')
        .stroke();
      doc.moveDown(0.6);
    });

    // ── Footer ──
    doc
      .fillColor('#94a3b8')
      .font('Helvetica')
      .fontSize(8)
      .text(
        'This report is for personal and professional development purposes only. © Industrial Psychology Consultants',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

module.exports = router;
