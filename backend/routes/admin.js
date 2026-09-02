const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const Response = require('../models/Response');
const { Admin } = require('../models/Admin');
const { verifyJWT, requireSuperAdmin } = require('../middleware/auth');
const cloudinary = require('../utils/cloudinary');

// ─── POST /api/admin/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: admin.role, name: admin.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /api/admin/responses ─────────────────────────────────────────────────
router.get('/responses', verifyJWT, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      Response.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-answers'), // Omit raw answers from listing for performance
      Response.countDocuments(),
    ]);

    res.json({ responses, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', verifyJWT, async (req, res) => {
  try {
    const [total, paidCount, revenueResult] = await Promise.all([
      Response.countDocuments(),
      Response.countDocuments({ paymentStatus: 'paid' }),
      Response.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$paymentAmount' } } },
      ]),
    ]);

    res.json({
      totalParticipants: total,
      paidParticipants: paidCount,
      totalRevenue: revenueResult[0]?.total || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/admin/export ────────────────────────────────────────────────────
router.get('/export', verifyJWT, async (req, res) => {
  try {
    const responses = await Response.find().sort({ createdAt: 1 });

    // ── Shared constants ─────────────────────────────────────────────────────
    const NAVY      = 'FF0F1F3D';
    const NAVY_MID  = 'FF1E3A5F';
    const WHITE     = 'FFFFFFFF';
    const SLATE_ALT = 'FFF0F4FF';

    const DIM_COLORS = {
      extraversion:      'FF0EA5E9',
      agreeableness:     'FF10B981',
      adjustment:        'FF6366F1',
      conscientiousness: 'FFF59E0B',
      openness:          'FFEC4899',
    };
    const DIM_LABELS = {
      extraversion:      'Surgency / Extraversion',
      agreeableness:     'Agreeableness',
      adjustment:        'Adjustment',
      conscientiousness: 'Conscientiousness',
      openness:          'Openness to Experience',
    };
    // Answer-scale colours 1-7 (fully-opaque ARGB)
    const SCALE = ['FFEF4444','FFF97316','FFFACC15','FFA3E635','FF34D399','FF22D3EE','FF818CF8'];
    // Use dark text on lighter scale colours (3,4,5,6)
    const DARK_TEXT = [false, false, true, true, true, true, false];

    // Which dimension owns each question number (1-25)
    const Q_DIM = {
      1:'extraversion', 6:'extraversion', 11:'extraversion', 16:'extraversion', 21:'extraversion',
      2:'agreeableness', 7:'agreeableness', 12:'agreeableness', 17:'agreeableness', 22:'agreeableness',
      3:'adjustment',   8:'adjustment',   13:'adjustment',   18:'adjustment',   23:'adjustment',
      4:'conscientiousness', 9:'conscientiousness', 14:'conscientiousness', 19:'conscientiousness', 24:'conscientiousness',
      5:'openness',    10:'openness',    15:'openness',    20:'openness',    25:'openness',
    };
    const QUESTIONS = [
      'I step forward and take charge in leaderless situations.',
      'I am concerned about getting along well with others.',
      "I have good self-control; I don't get emotional and get angry and yell.",
      "I'm dependable; when I say I will do something, it's done well and on time.",
      'I try to do things differently to improve my performance.',
      'I enjoy competing and winning; losing bothers me.',
      'I enjoy having lots of friends and going to parties.',
      'I perform well under pressure.',
      'I work hard to be successful.',
      'I go to new places and enjoy traveling.',
      'I am outgoing and willing to confront people when in conflict.',
      "I try to see things from other people's points of view.",
      'I am an optimistic person who sees the positive side of situations (the cup is half full).',
      'I am a well-organized person.',
      "When I go to a new restaurant, I order foods I haven't tried.",
      'I want to climb the corporate ladder to as high a level of management as I can.',
      'I want other people to like me and to be viewed as very friendly.',
      "I give people lots of praise and encouragement; I don't put people down and criticize.",
      'I conform by following the rules of an organization.',
      'I volunteer to be the first to learn or do new tasks at work.',
      'I try to influence other people to get my way.',
      'I enjoy working with others more than working alone.',
      'I view myself as being relaxed and secure, rather than nervous and insecure.',
      'I am considered credible because I do a good job and come through for people.',
      'When people suggest doing things differently, I support them and help bring about change.',
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OCEAN Assessment';
    workbook.created = new Date();

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 1 — Raw Responses
    // ──────────────────────────────────────────────────────────────────────────
    const sheet1 = workbook.addWorksheet('Responses');
    sheet1.columns = [
      { header: 'Date',               key: 'date',              width: 22 },
      { header: 'Name',               key: 'name',              width: 20 },
      { header: 'Email',              key: 'email',             width: 28 },
      { header: 'Phone',              key: 'phone',             width: 16 },
      ...Array.from({ length: 25 }, (_, i) => ({ header: `Q${i+1}`, key: `q${i+1}`, width: 6 })),
      { header: 'Extraversion',       key: 'extraversion',      width: 14 },
      { header: 'Agreeableness',      key: 'agreeableness',     width: 15 },
      { header: 'Adjustment',         key: 'adjustment',        width: 13 },
      { header: 'Conscientiousness',  key: 'conscientiousness', width: 18 },
      { header: 'Openness',           key: 'openness',          width: 13 },
      { header: 'Payment Amount (\u20b9)', key: 'paymentAmount',    width: 18 },
      { header: 'Payment Status',     key: 'paymentStatus',     width: 15 },
    ];
    responses.forEach((r) => {
      const row = {
        date: r.createdAt.toLocaleString('en-IN'),
        name: r.participantName, email: r.participantEmail,
        phone: r.participantPhone || '',
        ...r.scores,
        paymentAmount: r.paymentAmount, paymentStatus: r.paymentStatus,
      };
      r.answers.forEach((a, i) => { row[`q${i+1}`] = a; });
      sheet1.addRow(row);
    });
    const hdr1 = sheet1.getRow(1);
    hdr1.font = { bold: true, color: { argb: WHITE } };
    hdr1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    hdr1.alignment = { vertical: 'middle' };
    for (let i = 2; i <= sheet1.rowCount; i++) {
      if (i % 2 === 0)
        sheet1.getRow(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_ALT } };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 2 — Q Distribution (heatmap)
    // ──────────────────────────────────────────────────────────────────────────
    const sheet2 = workbook.addWorksheet('Q Distribution');
    sheet2.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }];
    sheet2.getColumn(1).width = 5;   // Q#
    sheet2.getColumn(2).width = 68;  // Question
    sheet2.getColumn(3).width = 24;  // Dimension
    for (let c = 4; c <= 10; c++) sheet2.getColumn(c).width = 11; // 1-7 counts
    sheet2.getColumn(11).width = 9;  // Total
    sheet2.getColumn(12).width = 9;  // Avg
    sheet2.getColumn(13).width = 9;  // Mode

    // Title row
    sheet2.mergeCells('A1:M1');
    const t2 = sheet2.getCell('A1');
    t2.value = 'OCEAN Assessment — Answer Distribution per Question';
    t2.font = { bold: true, size: 14, color: { argb: WHITE } };
    t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    t2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet2.getRow(1).height = 32;

    // Sub-title row
    sheet2.mergeCells('A2:M2');
    const s2 = sheet2.getCell('A2');
    s2.value = `${responses.length} respondents  |  Answer scale: 1 = Strongly Disagree, 7 = Strongly Agree  |  Bold border = Mode (most common answer)`;
    s2.font = { italic: true, size: 9, color: { argb: 'FF94A3B8' } };
    s2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162844' } };
    s2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet2.getRow(2).height = 18;

    // Column header row
    const HDR_LABELS = ['Q#', 'Question Text', 'Dimension', '1', '2', '3', '4', '5', '6', '7', 'Total', 'Avg', 'Mode'];
    const hdrRow2 = sheet2.getRow(3);
    hdrRow2.values = HDR_LABELS;
    hdrRow2.height = 22;
    HDR_LABELS.forEach((_, ci) => {
      const cell = hdrRow2.getCell(ci + 1);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (ci >= 3 && ci <= 9) {
        // Scale header: coloured background
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SCALE[ci - 3] } };
        cell.font = { bold: true, size: 12, color: { argb: DARK_TEXT[ci - 3] ? 'FF1E293B' : WHITE } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MID } };
        cell.font = { bold: true, color: { argb: WHITE } };
      }
    });

    // Compute per-question stats
    const qStats = Array.from({ length: 25 }, (_, qi) => {
      const dist = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 };
      let sum = 0, count = 0;
      responses.forEach((r) => {
        const v = r.answers?.[qi];
        if (typeof v === 'number' && v >= 1 && v <= 7) { dist[v]++; sum += v; count++; }
      });
      const mean = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      const mode = count > 0 ? parseInt(Object.entries(dist).reduce((a,b) => b[1] > a[1] ? b : a)[0]) : 0;
      return { qi: qi + 1, dist, mean, mode, count };
    });

    // Data rows
    qStats.forEach(({ qi, dist, mean, mode, count }) => {
      const dimKey   = Q_DIM[qi];
      const dimColor = DIM_COLORS[dimKey] || 'FF94A3B8';
      const row = sheet2.addRow([
        `Q${qi}`, QUESTIONS[qi - 1], DIM_LABELS[dimKey] || '',
        ...[1,2,3,4,5,6,7].map(v => dist[v] || 0),
        count, mean, mode || '',
      ]);
      row.height = 17;

      // Q# badge
      const qCell = row.getCell(1);
      qCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dimColor } };
      qCell.font = { bold: true, color: { argb: WHITE }, size: 9 };
      qCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Question text
      row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
      row.getCell(2).font = { size: 9 };

      // Dimension
      const dimCell = row.getCell(3);
      dimCell.font = { bold: true, size: 9, color: { argb: dimColor } };
      dimCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Scale cells 1-7
      [1,2,3,4,5,6,7].forEach((v, vi) => {
        const cell  = row.getCell(4 + vi);
        const cnt   = dist[v] || 0;
        const isMode = v === mode && cnt > 0;
        cell.value = cnt;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SCALE[vi] } };
        cell.font  = {
          bold:  isMode,
          size:  cnt > 0 ? 11 : 9,
          color: { argb: DARK_TEXT[vi] ? 'FF1E293B' : WHITE },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isMode) {
          cell.border = {
            top:    { style: 'medium', color: { argb: NAVY } },
            bottom: { style: 'medium', color: { argb: NAVY } },
            left:   { style: 'medium', color: { argb: NAVY } },
            right:  { style: 'medium', color: { argb: NAVY } },
          };
        }
      });

      // Total
      row.getCell(11).font = { bold: true, size: 10 };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      // Avg
      const avgCell = row.getCell(12);
      avgCell.value = mean;
      avgCell.numFmt = '0.00';
      avgCell.font = { bold: true, color: { argb: dimColor } };
      avgCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Mode
      const modeCell = row.getCell(13);
      if (mode > 0) {
        modeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SCALE[mode - 1] } };
        modeCell.font = { bold: true, color: { argb: DARK_TEXT[mode - 1] ? 'FF1E293B' : WHITE } };
      }
      modeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SHEET 3 — OCEAN Dimension Stats
    // ──────────────────────────────────────────────────────────────────────────
    const sheet3 = workbook.addWorksheet('OCEAN Stats');
    sheet3.getColumn(1).width = 28; sheet3.getColumn(2).width = 12;
    sheet3.getColumn(3).width = 12; sheet3.getColumn(4).width = 10;
    sheet3.getColumn(5).width = 10; sheet3.getColumn(6).width = 16;
    sheet3.getColumn(7).width = 16; sheet3.getColumn(8).width = 14;

    sheet3.mergeCells('A1:H1');
    const t3 = sheet3.getCell('A1');
    t3.value = 'OCEAN Dimension Aggregate Statistics';
    t3.font = { bold: true, size: 14, color: { argb: WHITE } };
    t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    t3.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet3.getRow(1).height = 32;

    sheet3.mergeCells('A2:H2');
    const s3 = sheet3.getCell('A2');
    s3.value = `${responses.length} respondents  |  Score range per dimension: 5–35  |  High ≥ 26 | Mid 15-25 | Low ≤ 14`;
    s3.font = { italic: true, size: 9, color: { argb: 'FF94A3B8' } };
    s3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162844' } };
    s3.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet3.getRow(2).height = 18;

    const HDR3 = ['Dimension', 'Color', 'Avg Score', 'Min', 'Max', 'High (≥26)', 'Mid (15-25)', 'Low (≤14)'];
    const hdrRow3 = sheet3.getRow(3);
    hdrRow3.values = HDR3;
    hdrRow3.height = 22;
    HDR3.forEach((_, ci) => {
      const cell = hdrRow3.getCell(ci + 1);
      cell.font = { bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MID } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    Object.entries(DIM_LABELS).forEach(([key, label]) => {
      const dimColor = DIM_COLORS[key];
      const scores = responses.map(r => r.scores?.[key]).filter(s => typeof s === 'number');
      if (!scores.length) return;
      const avg  = Math.round((scores.reduce((a,b) => a + b, 0) / scores.length) * 100) / 100;
      const minS = Math.min(...scores);
      const maxS = Math.max(...scores);
      const hi  = scores.filter(s => s >= 26).length;
      const mid = scores.filter(s => s >= 15 && s < 26).length;
      const lo  = scores.filter(s => s < 15).length;

      const row = sheet3.addRow([label, '', avg, minS, maxS, hi, mid, lo]);
      row.height = 24;

      row.getCell(1).font = { bold: true, color: { argb: dimColor } };
      row.getCell(1).alignment = { vertical: 'middle' };

      // Color swatch
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dimColor } };

      // Avg — green/amber/red based on level
      const avgCell3 = row.getCell(3);
      avgCell3.value = avg; avgCell3.numFmt = '0.00';
      avgCell3.font = { bold: true };
      avgCell3.fill = { type: 'pattern', pattern: 'solid',
        fgColor: { argb: avg >= 26 ? 'FF34D399' : avg >= 15 ? 'FFFBBF24' : 'FFEF4444' } };
      avgCell3.alignment = { horizontal: 'center', vertical: 'middle' };

      [4,5].forEach(c => { row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; });

      // High/Mid/Low cells with colour fills
      const bandFills = ['FFD1FAE5', 'FFFFF8E1', 'FFFEE2E2']; // light green/amber/red
      const bandFonts = ['FF065F46', 'FF78350F', 'FF991B1B'];
      [6,7,8].forEach((c, i) => {
        const cell = row.getCell(c);
        cell.font = { bold: true, color: { argb: bandFonts[i] } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandFills[i] } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // ── Respond ───────────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=OCEAN_Analytics_${new Date().toISOString().slice(0,10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});


// ─── GET /api/admin/responses/:id ─────────────────────────────────────────────
router.get('/responses/:id', verifyJWT, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ error: 'Response not found' });

    const { generateFullReport, getDimensionLabels } = require('../utils/reportContent');
    const report = generateFullReport(response.scores);
    const labels = getDimensionLabels(response.scores);

    res.json({
      id: response._id,
      participantName: response.participantName,
      participantEmail: response.participantEmail,
      participantPhone: response.participantPhone,
      scores: response.scores,
      answers: response.answers,
      paymentStatus: response.paymentStatus,
      paymentAmount: response.paymentAmount,
      paymentReference: response.paymentReference,
      paymentProofFile: response.paymentProofFile || null,       // Cloudinary URL
      paymentProofPublicId: response.paymentProofPublicId || null,
      createdAt: response.createdAt,
      report,
      labels,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch response detail' });
  }
});

// ─── POST /api/admin/responses/:id/send-email ─────────────────────────────────
router.post('/responses/:id/send-email', verifyJWT, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ error: 'Response not found' });
    if (response.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Can only send reports for paid assessments' });
    }

    const { sendReportEmail } = require('../services/emailService');
    const result = await sendReportEmail(response);

    res.json({ success: true, messageId: result.messageId, sentTo: response.participantEmail });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
// Returns per-question aggregate data (mean + distribution 1-7) across all
// responses that have answers stored.
router.get('/analytics', verifyJWT, async (req, res) => {
  try {
    const responses = await Response.find({ answers: { $exists: true, $not: { $size: 0 } } })
      .select('answers scores')
      .lean();

    if (responses.length === 0) {
      return res.json({ questions: [], totalResponses: 0 });
    }

    const NUM_Q = 25;
    const questions = Array.from({ length: NUM_Q }, (_, qi) => {
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      let sum = 0, count = 0;
      responses.forEach((r) => {
        const val = r.answers?.[qi];
        if (typeof val === 'number' && val >= 1 && val <= 7) { dist[val]++; sum += val; count++; }
      });
      const mean = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      const mode = Object.entries(dist).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      return { questionIndex: qi + 1, distribution: dist, mean, mode: parseInt(mode), count };
    });

    res.json({ questions, totalResponses: responses.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// ─── DELETE /api/admin/responses/:id ───────────────────────────────────────────────────────────────
router.delete('/responses/:id', verifyJWT, async (req, res) => {
  try {
    const response = await Response.findByIdAndDelete(req.params.id);
    if (!response) return res.status(404).json({ error: 'Response not found' });

    // Delete the associated payment proof from Cloudinary if it exists
    if (response.paymentProofPublicId) {
      try {
        await cloudinary.uploader.destroy(response.paymentProofPublicId, {
          resource_type: response.paymentProofPublicId.endsWith('.pdf') ? 'raw' : 'image',
        });
      } catch (cloudErr) {
        console.warn('Could not delete Cloudinary asset:', cloudErr.message);
      }
    }

    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// ─── GET /api/admin/admins  (superadmin only) ────────────────────────────────
router.get('/admins', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: 1 }).select('-passwordHash');
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// ─── POST /api/admin/admins  (superadmin only) ───────────────────────────────
router.post('/admins', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    const allowedRoles = ['admin', 'superadmin'];
    const assignedRole = allowedRoles.includes(role) ? role : 'admin';

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ error: 'An admin with that email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
    });

    res.status(201).json(admin); // passwordHash stripped by toJSON transform
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// ─── DELETE /api/admin/admins/:id  (superadmin only) ────────────────────────
router.delete('/admins/:id', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (req.admin.id === id || req.admin.id?.toString() === id)
      return res.status(400).json({ error: 'You cannot delete your own account' });

    const target = await Admin.findById(id);
    if (!target) return res.status(404).json({ error: 'Admin not found' });

    // Ensure at least one superadmin remains
    if (target.role === 'superadmin') {
      const superCount = await Admin.countDocuments({ role: 'superadmin' });
      if (superCount <= 1)
        return res.status(400).json({ error: 'Cannot delete the last superadmin' });
    }

    await Admin.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// ─── PATCH /api/admin/admins/:id/password  (superadmin only) ─────────────────
router.patch('/admins/:id/password', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 12);
    await Admin.findByIdAndUpdate(req.params.id, { passwordHash: hash });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
