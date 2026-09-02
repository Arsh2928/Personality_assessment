const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Schema ───────────────────────────────────────────────────────────────────
const adminSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  },
  { timestamps: true }
);

// Mask passwordHash when serialising to JSON
adminSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.passwordHash; return ret; },
});

const Admin = mongoose.model('Admin', adminSchema);

// ─── One-time seeder (idempotent) ─────────────────────────────────────────────
/**
 * Seeds the superadmin from .env if no Admin documents exist yet.
 * Safe to call on every server start — skips if the email already exists.
 */
async function seedSuperAdmin() {
  try {
    const email    = (process.env.ADMIN_EMAIL    || '').toLowerCase().trim();
    const password =  process.env.ADMIN_PASSWORD || '';
    const name     =  process.env.ADMIN_NAME     || 'Super Admin';

    if (!email || !password) {
      console.warn('[Admin] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping seed.');
      return;
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      // Already in DB — nothing to do
      return;
    }

    // Support plain-text or existing bcrypt hashes in .env
    const hash = password.startsWith('$2')
      ? password
      : await bcrypt.hash(password, 12);

    await Admin.create({ name, email, passwordHash: hash, role: 'superadmin' });
    console.log(`[Admin] Superadmin seeded: ${email}`);
  } catch (err) {
    console.error('[Admin] Seed error:', err.message);
  }
}

module.exports = { Admin, seedSuperAdmin };
