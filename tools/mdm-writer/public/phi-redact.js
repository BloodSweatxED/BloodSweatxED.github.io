// HIPAA Safe Harbor (45 CFR 164.514(b)) — ED note PHI redactor.
// Covers the 9 identifiers relevant to clinical ED documentation.
// Returns { scrubbed, redactions }. Original strings stay client-side only:
// nothing in `redactions` is ever sent to the server.

const MEDICAL_BIGRAM_WHITELIST = new Set([
  'Chief Complaint', 'Past Medical', 'Family History', 'Social History',
  'Review Systems', 'Physical Exam', 'Vital Signs', 'Chest Pain', 'Abdominal Pain',
  'Shortness Breath', 'Right Lower', 'Left Lower', 'Right Upper', 'Left Upper',
  'Emergency Department', 'Discharge Instructions', 'Return Precautions',
  'Mental Status', 'Heart Rate', 'Blood Pressure', 'Body Mass',
]);

// A bigram is only treated as a person's name when NEITHER word is a known
// non-name word. Two capitalized words in a row is a weak name signal in
// clinical prose, where TitleCase conditions, anatomy, and relationship terms
// are everywhere, so this list has to be broad. It is a heuristic, not a
// guarantee: the review panel in the UI is the actual safety net, and the user
// should de-identify before pasting regardless.
const CLINICAL_WORDS = new Set([
  // Relationships. These appear constantly in family and social history and can
  // never be a patient name, so they are the highest-value exclusions.
  'Father','Mother','Mom','Dad','Parent','Parents','Brother','Sister','Sibling',
  'Siblings','Son','Daughter','Child','Children','Wife','Husband','Spouse',
  'Partner','Aunt','Uncle','Cousin','Nephew','Niece','Grandmother','Grandfather',
  'Grandma','Grandpa','Grandparent','Grandson','Granddaughter','Family','Relative',
  'Guardian','Caregiver','Caretaker','Widow','Widower','Boyfriend','Girlfriend',
  'Twin','Maternal','Paternal',
  // Exam, note structure, workflow.
  'Chest','Pain','Abdominal','Abdomen','Right','Left','Upper','Lower','Bilateral',
  'Blood','Pressure','Heart','Rate','Respiratory','Pulse','Temp','Temperature',
  'Emergency','Department','Discharge','Return','Precautions','Admit','Admission',
  'Mental','Status','Physical','Exam','Vital','Signs','Chief','Complaint',
  'Past','Medical','Social','History','Review','Systems','Body','Mass',
  'Shortness','Breath','Acute','Chronic','Severe','Mild','Moderate','Normal',
  'Center','Centre','Clinic','Surgery','Surgical','Care','Unit','Floor','Room',
  'Home','Air','Follow','Health','Primary','Urgent','Specialty','Referral',
  'Imaging','Labs','Radiology','Pathology','Consult','Consultation','Plan',
  'Impression','Assessment','Disposition','Treatment','Response','Findings',
  'Differential','Diagnosis','Course','Note','Report','Results','Reads',
  // Anatomy.
  'Head','Neck','Back','Flank','Pelvic','Pelvis','Rectal','Groin','Extremity',
  'Extremities','Arm','Leg','Hand','Foot','Knee','Hip','Shoulder','Elbow','Wrist',
  'Ankle','Spine','Skull','Brain','Neuro','Neurologic','Cardiac','Chest','Lung',
  'Lungs','Liver','Kidney','Kidneys','Spleen','Bladder','Bowel','Stomach','Colon',
  'Rectum','Throat','Ear','Eye','Nose','Mouth','Skin','Bone','Muscle','Joint',
  'Nerve','Artery','Vein','Aorta','Renal','Hepatic','Pulmonary','Vascular',
  'Anterior','Posterior','Medial','Lateral','Proximal','Distal','Superior',
  'Inferior','Central','Peripheral',
  // Conditions and findings.
  'Diabetes','Diabetic','Hypertension','Hypertensive','Asthma','Cancer','Stroke',
  'Seizure','Seizures','Depression','Anxiety','Dementia','Obesity','Anemia',
  'Migraine','Arthritis','Gout','Glaucoma','Cataract','Pneumonia','Bronchitis',
  'Cirrhosis','Hepatitis','Pancreatitis','Appendicitis','Cellulitis','Sepsis',
  'Septic','Shock','Trauma','Fracture','Laceration','Infection','Wound','Ulcer',
  'Abscess','Edema','Effusion','Embolism','Thrombosis','Hemorrhage','Ischemia',
  'Infarct','Infarction','Tachycardia','Bradycardia','Hypoglycemia',
  'Hyperglycemia','Hypotension','Hypoxia','Fever','Chills','Cough','Nausea',
  'Vomiting','Diarrhea','Constipation','Dizziness','Vertigo','Syncope','Fatigue',
  'Weakness','Numbness','Tingling','Swelling','Bleeding','Bruising','Rash',
  'Nec','Fasc','Necrotizing','Fasciitis','Failure','Disease','Disorder',
  'Syndrome','Attack','Arrest',
  // Time words, days, months.
  'Yesterday','Today','Tomorrow','Morning','Afternoon','Evening','Night','Week',
  'Weeks','Month','Months','Year','Years','Day','Days','Hour','Hours','Minute',
  'Minutes','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
  'January','February','March','April','May','June','July','August','September',
  'October','November','December',
  // Common clause words that start sentences and get capitalized.
  'No','Not','Denies','Reports','States','Presents','Continue','Started','Stopped',
  'Given','Provided','Stable','Improved','Worsening','Pending','Negative',
  'Positive','Intact','Clear','Tender','Nontender','Distended','Alert','Oriented',
  'Cooperative','Calm','Agitated','Anxious','Depressed','Patient','Denied',
  'Notes','Also','Now','Then','Since','Prior','Recent','New','Old','Both',
  // Common words that get capitalized at the start of a sentence or clause.
  'Seen','Last','First','Next','Here','There','When','After','Before','During',
  'While','Per','Was','Were','Has','Had','Have','Will','Would','Should','Could',
  'Can','May','Same','Other','Each','Some','Any','All','Very','Well','Good',
  'This','That','These','Those','With','Without','From','Into','Over','Under',
  'She','Her','His','They','Their','Him','Them','Which','What','About','Above',
]);

// A capitalized title before a capitalized word is a strong name signal.
// The word AFTER the title is the identifier and must be redacted.
const TITLE_PREFIXES = new Set([
  'Dr', 'Doctor', 'Mr', 'Mrs', 'Ms', 'Miss', 'Nurse', 'Patient', 'Pt',
  'Attending', 'Resident', 'Intern', 'Tech', 'Medic', 'Officer',
]);

const PATTERNS = [
  { type: 'SSN',    re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'PHONE',  re: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: 'EMAIL',  re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: 'URL',    re: /\bhttps?:\/\/\S+/g },
  { type: 'DOB',    re: /\b(?:DOB|D\.O\.B\.?|born)[\s:]*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi },
  { type: 'DATE',   re: /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g },
  { type: 'DATE',   re: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi },
  { type: 'DATE',   re: /\b\d{4}-\d{2}-\d{2}\b/g },
  // Month + year with no day, e.g. "July 2022" or "7/2022". Safe Harbor allows
  // year alone, but month+year is more specific than year, so it goes.
  { type: 'DATE',   re: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}\b/gi },
  { type: 'DATE',   re: /\b(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}\b/g },
  { type: 'MRN',    re: /\b(?:MRN|MR#|Med\s*Rec(?:ord)?#?|Patient\s*ID|Acct#?)[\s:#]*([A-Z0-9-]{5,15})\b/gi },
  { type: 'AGE>89', re: /\b(9[0-9]|1[0-9]{2})\s*(?:yo|y\/o|year[-\s]?old|years?\s*old)\b/gi },
  { type: 'ADDR',   re: /\b\d{1,6}\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Pl|Place|Way|Pkwy|Parkway)\.?\b/g },
  { type: 'ZIP',    re: /\b\d{5}(?:-\d{4})?\b/g },
];

const TITLED_NAME = /\b(Dr|Doctor|Mr|Mrs|Ms|Miss|Nurse|Patient|Pt|Attending|Resident|Intern|Tech|Medic|Officer)\.?\s+([A-Z][a-z]{1,15})\b/g;
const NAME_BIGRAM = /\b([A-Z][a-z]{1,15})\s+([A-Z][a-z]{1,15})\b/g;

function isClinical(word) {
  return CLINICAL_WORDS.has(word);
}

/**
 * @param {string} input
 * @param {Set<string>|string[]} [keep] Phrases the user has marked as clinical,
 *   so a term the name heuristic got wrong stays put on the next pass.
 */
export function redactPHI(input, keep = []) {
  if (!input) return { scrubbed: '', redactions: [] };
  const allowlist = keep instanceof Set ? keep : new Set(keep);
  let text = input;
  const redactions = [];

  for (const { type, re } of PATTERNS) {
    text = text.replace(re, (match) => {
      if (allowlist.has(match)) return match;
      redactions.push({ type, original: match });
      return `[${type}]`;
    });
  }

  // Titles first. "Patient Smith" and "Dr Reynolds" are names, and the title
  // itself is not the identifier — only the word after it is.
  text = text.replace(TITLED_NAME, (match, title, name) => {
    if (allowlist.has(match) || isClinical(name)) return match;
    redactions.push({ type: 'NAME', original: match });
    return `${title} [NAME]`;
  });

  // Then bare two-word names, skipping anything that reads as clinical.
  text = text.replace(NAME_BIGRAM, (match, a, b) => {
    if (allowlist.has(match)) return match;
    if (MEDICAL_BIGRAM_WHITELIST.has(`${a} ${b}`)) return match;
    if (isClinical(a) || isClinical(b)) return match;
    if (TITLE_PREFIXES.has(a) || TITLE_PREFIXES.has(b)) return match;
    redactions.push({ type: 'NAME', original: match });
    return '[NAME]';
  });

  return { scrubbed: text, redactions };
}

export function summarizeRedactions(redactions) {
  const counts = {};
  for (const r of redactions) counts[r.type] = (counts[r.type] || 0) + 1;
  return Object.entries(counts).map(([type, n]) => ({ type, count: n }));
}
