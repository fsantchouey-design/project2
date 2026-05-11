const mongoose = require('mongoose');
const ProApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Step 1 — Représentant
  firstName:  String,
  lastName:   String,
  jobTitle:   String,
  email:      String,
  phone:      String,

  // Step 2 — Entreprise
  companyName: String,
  nEQ:         String,
  address:     String,
  city:        String,
  postalCode:  String,
  country:     String,
  website:     String,

  // Step 3 — Licences & légal
  rbqLicenseNumber:         String,
  rbqCategories:            String,
  tpsNumber:                String,
  tvqNumber:                String,
  attestationRevenuQuebec:  String,   // file path

  // Step 4 — Assurances & CNESST
  rcInsuranceCert:   String,  // file path
  coverageAmount:    String,
  cnesstFileNumber:  String,
  cnesstAttestation: String,  // file path
  liabilityInsurance: String,

  // Step 5 — Profil professionnel
  serviceTypes:   [String],
  serviceAreas:   String,
  yearsExperience: String,

  // Legacy fields (kept for backward compatibility)
  categories:      [String],
  description:     String,
  businessNumber:  String,
  socialInstagram: String,
  socialFacebook:  String,
  logo:            String,
  photos:          [String],

  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNotes:    String,
  approvalToken: String,
}, { timestamps: true });
module.exports = mongoose.model('ProApplication', ProApplicationSchema);
