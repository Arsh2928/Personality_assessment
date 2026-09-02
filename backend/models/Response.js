const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  participantName: { type: String, required: true },
  participantEmail: { type: String, required: true },
  participantPhone: { type: String },

  // Raw answers to the 25 statements, 1-7 scale.
  // answers[0] = statement 1's score, answers[24] = statement 25's score.
  answers: {
    type: [Number],
    required: true,
    validate: {
      validator: (arr) => arr.length === 25 && arr.every((n) => n >= 1 && n <= 7),
      message: 'answers must contain exactly 25 values, each between 1 and 7',
    },
  },

  scores: {
    extraversion: Number,
    agreeableness: Number,
    adjustment: Number,
    conscientiousness: Number,
    openness: Number,
  },

  paymentAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  paymentReference: { type: String }, // UPI txn id entered by user
  paymentProofFile: { type: String },  // Cloudinary secure_url of uploaded screenshot/PDF
  paymentProofPublicId: { type: String }, // Cloudinary public_id (used to delete the asset)

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Response', responseSchema);
