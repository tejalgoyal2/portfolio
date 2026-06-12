// Evidence-board metadata for the Case Files. projects.js stays untouched;
// this is the derived layer the board reads: which files connect to which
// (the red string), and the headline numbers each file is filed under.

export const CONNECTIONS = {
  Dime: ['WalletRIP'],
  WalletRIP: ['Dime'],
  'IAM Threat Mapper': ['ThreatScope', 'Claubi'],
  ThreatScope: ['IAM Threat Mapper', 'Claubi'],
  Claubi: ['IAM Threat Mapper', 'ThreatScope'],
  OccluSense: ['Phishing Classifier', 'SmartHire', 'AI Smart Glasses'],
  'Phishing Classifier': ['OccluSense', 'SmartHire'],
  SmartHire: ['OccluSense', 'Phishing Classifier'],
  'AI Smart Glasses': ['OccluSense'],
};

export const METRICS = {
  Dime: [
    { n: '7', label: 'API routes' },
    { n: '0', label: 'client-side DB writes' },
  ],
  'IAM Threat Mapper': [
    { n: '32', label: 'nodes' },
    { n: '17', label: 'ATT&CK techniques' },
    { n: '5', label: 'breaches mapped' },
  ],
  Claubi: [
    { n: 'deny-first', label: 'permission model' },
    { n: 'append-only', label: 'audit log' },
  ],
  ThreatScope: [{ n: '500+', label: 'techniques indexed' }],
  WalletRIP: [
    { n: '5', label: 'Gemini integrations' },
    { n: '4', label: 'vulns found' },
  ],
  SmartHire: [{ n: '2,000', label: 'résumés tested' }],
  Sudoku: [{ n: '1', label: 'solution, guaranteed' }],
  type: [
    { n: '6', label: 'visual styles' },
    { n: '0', label: 'animation libraries' },
  ],
  'Phishing Classifier': [
    { n: '98.2%', label: 'accuracy' },
    { n: '82,486', label: 'emails' },
  ],
  'AI Smart Glasses': [
    { n: '10', label: 'object classes' },
    { n: '5', label: 'person team' },
  ],
  OccluSense: [
    { n: '0.85', label: 'precision' },
    { n: '4,500', label: 'boxes' },
  ],
};
