/**
 * Feat Analyzer Script
 *
 * Analyzes all PF2e feats and categorizes them by doctrine mood:
 * - IDEALIST: Hopeful, protective, inspiring, righteous
 * - PRACTICAL: Efficient, prepared, tactical, resourceful
 * - RUTHLESS: Aggressive, cruel, dominating, fearsome
 *
 * Usage: npx ts-node scripts/analyze-feats.ts
 * Output: docs/leader-feats-analyzed.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface FeatData {
  _id: string;
  name: string;
  system: {
    level?: { value: number };
    description?: { value: string };
    traits?: { value: string[] };
    category?: string;
    prerequisites?: { value: Array<{ value: string }> };
  };
  type: string;
}

interface FeatAnalysis {
  _id: string;
  name: string;
  level: number;
  category: string;
  traits: string[];
  source: string;
  scores: {
    idealist: number;
    practical: number;
    ruthless: number;
  };
  bestMatch: 'idealist' | 'practical' | 'ruthless' | 'none';
  description: string;
  summary: string;
  fullDescription: string;
}

type DoctrineType = 'idealist' | 'practical' | 'ruthless';

// ============================================================================
// Keyword Definitions
// ============================================================================

const DOCTRINE_KEYWORDS: Record<DoctrineType, { positive: string[]; negative: string[] }> = {
  idealist: {
    positive: [
      'heal', 'healing', 'protect', 'protection', 'ally', 'allies',
      'shield', 'save', 'saving', 'faith', 'faithful', 'holy',
      'sacred', 'divine', 'courage', 'courageous', 'mercy',
      'inspire', 'inspiring', 'inspiration', 'righteous', 'righteousness',
      'guardian', 'bless', 'blessing', 'sanctify', 'celestial',
      'aura of courage', 'aura of faith', 'aura of life', 'aura of righteousness',
      'lay on hands', 'champion', 'paladin', 'redemption', 'liberator',
      'communal', 'ward', 'restoration', 'restorative', 'sanctified'
    ],
    negative: [
      'fear', 'frighten', 'frightened', 'intimidate', 'intimidation',
      'cruel', 'cruelty', 'unholy', 'death', 'blood', 'pain', 'despair'
    ]
  },
  practical: {
    positive: [
      'craft', 'crafting', 'prepare', 'prepared', 'preparation',
      'plan', 'planning', 'train', 'training', 'skill', 'skilled',
      'proficiency', 'proficient', 'efficiency', 'efficient',
      'tactic', 'tactical', 'tactics', 'maneuver', 'adapt', 'adaptive',
      'terrain', 'track', 'tracking', 'tracker', 'snare', 'snares',
      'analyze', 'analysis', 'research', 'calculate', 'calculation',
      'professional', 'expert', 'expertise', 'knowledge', 'repair',
      'survival', 'survivalist', 'ranger', 'investigator', 'alchemist',
      'commander', 'strategic', 'strategy', 'assurance', 'reliable',
      'methodical', 'precise', 'precision', 'camouflage', 'stealth'
    ],
    negative: []
  },
  ruthless: {
    positive: [
      'fear', 'frighten', 'frightened', 'frightening', 'frightful',
      'intimidate', 'intimidation', 'intimidating', 'demoralize', 'demoralizing',
      'death', 'deadly', 'unholy', 'dark', 'darkness', 'blood', 'bloody', 'bleeding',
      'pain', 'painful', 'cruel', 'cruelty', 'scare', 'scared', 'scary',
      'despair', 'doom', 'doomed', 'terror', 'terrify', 'terrifying', 'terrified',
      'dominate', 'domination', 'coerce', 'coercion', 'ruthless',
      'savage', 'savagery', 'merciless', 'brutal', 'brutality',
      'rage', 'raging', 'vengeance', 'vengeful', 'frenzy', 'frenzied',
      'barbarian', 'tyrant', 'desecrator', 'antipaladin',
      'ferocity', 'ferocious', 'vicious', 'menace', 'menacing',
      'howl', 'scream', 'shriek', 'wrath', 'fury', 'furious'
    ],
    negative: []
  }
};

const DOCTRINE_TRAITS: Record<DoctrineType, string[]> = {
  idealist: ['champion', 'cleric', 'holy'],
  practical: ['ranger', 'investigator', 'alchemist', 'commander'],
  ruthless: ['barbarian', 'unholy']
};

const DOCTRINE_PREREQ_SKILLS: Record<DoctrineType, string[]> = {
  idealist: ['diplomacy', 'medicine', 'religion'],
  practical: ['crafting', 'survival', 'nature', 'athletics', 'stealth', 'society', 'arcana'],
  ruthless: ['intimidation', 'deception']
};

const DOCTRINE_SOURCE_PATHS: Record<DoctrineType, string[]> = {
  idealist: ['class/champion', 'class/cleric', 'archetype/marshal'],
  practical: ['class/ranger', 'class/investigator', 'class/alchemist', 'archetype/commander'],
  ruthless: ['class/barbarian', 'ancestry/orc', 'ancestry/hobgoblin', 'ancestry/skeleton', 'ancestry/dhampir']
};

// ============================================================================
// Utility Functions
// ============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateDescription(desc: string, maxLength: number = 60): string {
  if (desc.length <= maxLength) return desc;
  return desc.substring(0, maxLength - 3) + '...';
}

/**
 * Generate an intelligent summary from feat description HTML.
 * Prioritizes mechanical content over flavor text.
 * Max 120 characters.
 */
function generateSummary(rawHtml: string, maxLength: number = 120): string {
  // Step 1: Clean the text - preserve meaningful content from @UUID references
  let text = rawHtml
    .replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '$1')  // @UUID[...]{Name} -> Name
    .replace(/@UUID\[[^\]]+\]/g, '')               // Remove bare @UUID references
    .replace(/@Damage\[([^\]]+)\]/g, (_, m) => {   // @Damage[1d6[fire]] -> 1d6 fire
      const match = m.match(/(\d+d\d+)/);
      return match ? match[1] + ' damage' : 'damage';
    })
    .replace(/@Check\[[^\]]+\]/g, 'check')         // @Check[...] -> check
    .replace(/<strong>Frequency<\/strong>[^<]*/gi, '') // Remove frequency headers
    .replace(/<hr\s*\/?>/gi, ' ')                  // HR to space
    .replace(/<[^>]+>/g, ' ')                      // Strip remaining HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')                          // Normalize whitespace
    .trim();

  // Step 2: Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 5);

  if (sentences.length === 0) {
    return text.length > maxLength
      ? text.substring(0, maxLength - 3).replace(/\s+\S*$/, '') + '...'
      : text;
  }

  // Step 3: Score sentences by mechanical content
  const mechanicalPatterns = [
    /\byou (gain|can|get|have|become|are|deal|take|roll|make|attempt)\b/i,
    /\bmake a\b/i,
    /\broll a\b/i,
    /\battempt a\b/i,
    /\b[+-]\d+\b/,           // +2, -1, etc.
    /\bbonus\b/i,
    /\bpenalty\b/i,
    /\bonce per\b/i,
    /\binstead\b/i,
    /\bd\d+\b/i,             // dice notation d4, d6, d8, etc.
    /\bdamage\b/i,
    /\bstrike\b/i,
    /\bsave\b/i,
    /\bcheck\b/i,
    /\baction\b/i,
    /\breaction\b/i,
  ];

  const scoredSentences = sentences.map(s => ({
    text: s.trim(),
    score: mechanicalPatterns.filter(p => p.test(s)).length,
    index: sentences.indexOf(s)
  }));

  // Step 4: Sort by score (highest first), then by original order for ties
  const sorted = scoredSentences.sort((a, b) =>
    b.score - a.score || a.index - b.index
  );

  // Step 5: Build summary from best sentences up to maxLength
  let summary = '';

  for (const s of sorted) {
    if (s.score === 0 && summary) continue;  // Skip pure flavor if we have mechanical content

    const candidate = summary ? summary + ' ' + s.text : s.text;

    if (candidate.length <= maxLength) {
      summary = candidate;
    } else if (!summary) {
      // First sentence too long - truncate at word boundary
      summary = s.text.substring(0, maxLength - 3).replace(/\s+\S*$/, '') + '...';
      break;
    } else {
      break;
    }
  }

  // Fallback: if no summary built, use first sentence truncated
  if (!summary && sentences.length > 0) {
    const first = sentences[0];
    summary = first.length <= maxLength
      ? first
      : first.substring(0, maxLength - 3).replace(/\s+\S*$/, '') + '...';
  }

  return summary || 'No description available.';
}

function getAllJsonFiles(dir: string, excludeDirs: string[] = []): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Check if this directory should be excluded
        const shouldExclude = excludeDirs.some(excludeDir =>
          fullPath.includes(excludeDir)
        );
        if (!shouldExclude) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== '_folders.json') {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function getRelativePath(fullPath: string, baseDir: string): string {
  return fullPath.replace(baseDir + '/', '').replace('.json', '');
}

// ============================================================================
// Scoring Functions
// ============================================================================

function countKeywordMatches(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let count = 0;

  for (const keyword of keywords) {
    // Use word boundary matching for more accuracy
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

function scoreFeat(feat: FeatData, source: string): Record<DoctrineType, number> {
  const scores: Record<DoctrineType, number> = {
    idealist: 0,
    practical: 0,
    ruthless: 0
  };

  const name = feat.name || '';
  const description = stripHtml(feat.system?.description?.value || '');
  const traits = feat.system?.traits?.value || [];
  const prerequisites = feat.system?.prerequisites?.value || [];
  const prereqText = prerequisites.map(p => p.value).join(' ').toLowerCase();

  for (const doctrine of ['idealist', 'practical', 'ruthless'] as DoctrineType[]) {
    const { positive, negative } = DOCTRINE_KEYWORDS[doctrine];

    // Score from name (+3 per match)
    scores[doctrine] += countKeywordMatches(name, positive) * 3;

    // Score from description (+1 per match, capped at 10)
    const descMatches = countKeywordMatches(description, positive);
    scores[doctrine] += Math.min(descMatches, 10);

    // Score from traits (+5 per match)
    for (const trait of traits) {
      if (DOCTRINE_TRAITS[doctrine].includes(trait.toLowerCase())) {
        scores[doctrine] += 5;
      }
    }

    // Score from prerequisites (+2 per skill match)
    for (const skill of DOCTRINE_PREREQ_SKILLS[doctrine]) {
      if (prereqText.includes(skill)) {
        scores[doctrine] += 2;
      }
    }

    // Score from source path (+3 per match)
    for (const pathPart of DOCTRINE_SOURCE_PATHS[doctrine]) {
      if (source.includes(pathPart)) {
        scores[doctrine] += 3;
      }
    }

    // Apply negative modifiers (-3 per match)
    scores[doctrine] -= countKeywordMatches(name, negative) * 3;
    scores[doctrine] -= countKeywordMatches(description, negative);

    // Ensure score doesn't go below 0
    scores[doctrine] = Math.max(0, scores[doctrine]);
  }

  return scores;
}

function getBestMatch(scores: Record<DoctrineType, number>, threshold: number = 5): DoctrineType | 'none' {
  const entries = Object.entries(scores) as [DoctrineType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  if (sorted[0][1] >= threshold) {
    return sorted[0][0];
  }

  return 'none';
}

// ============================================================================
// Main Analysis
// ============================================================================

function analyzeFeat(filePath: string, baseDir: string): FeatAnalysis | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const feat: FeatData = JSON.parse(content);

    // Skip non-feat items
    if (feat.type !== 'feat') {
      return null;
    }

    const source = getRelativePath(filePath, baseDir);
    const scores = scoreFeat(feat, source);
    const bestMatch = getBestMatch(scores);

    const rawHtml = feat.system?.description?.value || '';
    const fullDesc = stripHtml(rawHtml);
    const summary = generateSummary(rawHtml);

    return {
      _id: feat._id,
      name: feat.name,
      level: feat.system?.level?.value ?? 0,
      category: feat.system?.category || 'unknown',
      traits: feat.system?.traits?.value || [],
      source,
      scores,
      bestMatch,
      description: truncateDescription(fullDesc),
      summary,
      fullDescription: fullDesc
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return null;
  }
}

function generateMarkdown(results: FeatAnalysis[]): string {
  const idealist = results.filter(f => f.bestMatch === 'idealist').sort((a, b) => b.scores.idealist - a.scores.idealist || a.level - b.level);
  const practical = results.filter(f => f.bestMatch === 'practical').sort((a, b) => b.scores.practical - a.scores.practical || a.level - b.level);
  const ruthless = results.filter(f => f.bestMatch === 'ruthless').sort((a, b) => b.scores.ruthless - a.scores.ruthless || a.level - b.level);
  const uncategorized = results.filter(f => f.bestMatch === 'none');

  let md = `# Leader Feats by Doctrine (Analyzed)

*Generated: ${new Date().toISOString().split('T')[0]}*
*Total feats analyzed: ${results.length}*

---

## IDEALIST (${idealist.length} feats)

*Hopeful, protective, inspiring, righteous, selfless, healing, courageous*

| Lvl | Feat | Score | Source | Description |
|-----|------|-------|--------|-------------|
`;

  for (const feat of idealist.slice(0, 100)) {
    md += `| ${feat.level} | ${feat.name} | ${feat.scores.idealist} | ${feat.source} | ${feat.description} |\n`;
  }

  md += `
---

## PRACTICAL (${practical.length} feats)

*Efficient, prepared, tactical, resourceful, calculating, methodical*

| Lvl | Feat | Score | Source | Description |
|-----|------|-------|--------|-------------|
`;

  for (const feat of practical.slice(0, 100)) {
    md += `| ${feat.level} | ${feat.name} | ${feat.scores.practical} | ${feat.source} | ${feat.description} |\n`;
  }

  md += `
---

## RUTHLESS (${ruthless.length} feats)

*Aggressive, cruel, dominating, fearsome, merciless, brutal, intimidating*

| Lvl | Feat | Score | Source | Description |
|-----|------|-------|--------|-------------|
`;

  for (const feat of ruthless.slice(0, 100)) {
    md += `| ${feat.level} | ${feat.name} | ${feat.scores.ruthless} | ${feat.source} | ${feat.description} |\n`;
  }

  md += `
---

## UNCATEGORIZED (${uncategorized.length} feats)

*Feats with no strong doctrine match (all scores < 5)*

These feats don't strongly align with any doctrine and may be universal or neutral.
`;

  return md;
}

// ============================================================================
// HTML Generator
// ============================================================================

function generateHtml(results: FeatAnalysis[]): string {
  // Sort results by level for each doctrine
  const idealist = results.filter(f => f.bestMatch === 'idealist').sort((a, b) => a.level - b.level || b.scores.idealist - a.scores.idealist);
  const practical = results.filter(f => f.bestMatch === 'practical').sort((a, b) => a.level - b.level || b.scores.practical - a.scores.practical);
  const ruthless = results.filter(f => f.bestMatch === 'ruthless').sort((a, b) => a.level - b.level || b.scores.ruthless - a.scores.ruthless);

  const data = {
    generated: new Date().toISOString().split('T')[0],
    totalAnalyzed: results.length,
    idealist,
    practical,
    ruthless
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leader Feats by Doctrine</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #1a1a2e;
      color: #eee;
    }
    h1 { color: #fff; margin-bottom: 5px; }
    .subtitle { color: #888; margin-bottom: 20px; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tab.idealist { background: #2d4a3e; color: #7dd3a8; }
    .tab.idealist.active { background: #3d6a5e; }
    .tab.practical { background: #3d3a2d; color: #d3c87d; }
    .tab.practical.active { background: #5d5a4d; }
    .tab.ruthless { background: #4a2d2d; color: #d37d7d; }
    .tab.ruthless.active { background: #6a3d3d; }
    .controls {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      align-items: center;
      flex-wrap: wrap;
    }
    .controls label { color: #aaa; }
    .controls input, .controls select {
      background: #2a2a3e;
      border: 1px solid #444;
      color: #eee;
      padding: 6px 10px;
      border-radius: 4px;
    }
    .controls input[type="text"] { width: 200px; }
    .stats {
      color: #888;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      text-align: left;
      padding: 12px 8px;
      border-bottom: 2px solid #444;
      position: sticky;
      top: 0;
      background: #1a1a2e;
      cursor: pointer;
    }
    th:hover { background: #2a2a3e; }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #333;
      vertical-align: top;
    }
    tr:hover { background: #252540; }
    tr.removed { opacity: 0.3; }
    tr.removed td { text-decoration: line-through; }
    tr.interesting { background: #2d3a4a; }
    tr.interesting:hover { background: #3d4a5a; }
    .col-actions { width: 80px; text-align: center; }
    .col-lvl { width: 50px; text-align: center; }
    .col-score { width: 60px; text-align: center; }
    .col-interesting { width: 40px; text-align: center; }
    .col-name { width: 200px; font-weight: 600; }
    .col-desc { }
    .btn-remove {
      background: #4a2d2d;
      border: none;
      color: #d37d7d;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    .btn-remove:hover { background: #6a3d3d; }
    .btn-restore {
      background: #2d4a3e;
      border: none;
      color: #7dd3a8;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-restore:hover { background: #3d6a5e; }
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    .description-summary {
      line-height: 1.5;
      max-width: 800px;
      cursor: pointer;
      color: #ccc;
    }
    .description-summary:hover {
      color: #fff;
    }
    .description-summary::after {
      content: ' ▸';
      color: #666;
      font-size: 12px;
    }
    .description-full {
      display: none;
      line-height: 1.6;
      max-width: 800px;
      padding: 10px;
      margin-top: 8px;
      background: #252535;
      border-radius: 4px;
      border-left: 3px solid #444;
    }
    .description-full.expanded {
      display: block;
    }
    .description-summary.expanded::after {
      content: ' ▾';
    }
    .traits {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .trait {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      background: #333;
      color: #aaa;
    }
    .export-btn {
      background: #3d4a5a;
      border: none;
      color: #7da8d3;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .export-btn:hover { background: #4d5a6a; }
    .col-reassign { width: 100px; text-align: center; }
    .reassign-icons {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    .reassign-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      opacity: 0.3;
      transition: opacity 0.2s, transform 0.2s;
      padding: 4px;
    }
    .reassign-btn:hover {
      opacity: 0.7;
      transform: scale(1.2);
    }
    .reassign-btn.active {
      opacity: 1;
    }
    .reassign-btn.idealist { color: #f0c040; }
    .reassign-btn.practical { color: #60a0d0; }
    .reassign-btn.ruthless { color: #d06060; }
    .reassigned-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 8px;
      background: #444;
      color: #aaa;
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
  <h1>Leader Feats by Doctrine</h1>
  <p class="subtitle">Generated: ${data.generated} | Total feats analyzed: ${data.totalAnalyzed}</p>

  <div class="tabs">
    <button class="tab idealist active" onclick="showDoctrine('idealist')">
      IDEALIST (${data.idealist.length})
    </button>
    <button class="tab practical" onclick="showDoctrine('practical')">
      PRACTICAL (${data.practical.length})
    </button>
    <button class="tab ruthless" onclick="showDoctrine('ruthless')">
      RUTHLESS (${data.ruthless.length})
    </button>
  </div>

  <div class="controls">
    <label>
      Search: <input type="text" id="search" placeholder="Filter by name..." oninput="renderTable()">
    </label>
    <label>
      Level: <select id="levelFilter" onchange="renderTable()">
        <option value="">All</option>
        ${Array.from({length: 21}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
      </select>
    </label>
    <label>
      <input type="checkbox" id="hideRemoved" checked onchange="renderTable()"> Hide removed
    </label>
    <label>
      <input type="checkbox" id="showOnlyInteresting" onchange="renderTable()"> Show only interesting
    </label>
    <button class="export-btn" onclick="exportInteresting()">Export Interesting</button>
    <span class="stats" id="stats"></span>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-actions">Actions</th>
        <th class="col-interesting">★</th>
        <th class="col-lvl" onclick="sortBy('level')">Lvl</th>
        <th class="col-name" onclick="sortBy('name')">Feat</th>
        <th class="col-desc">Description</th>
        <th class="col-score" onclick="sortBy('score')">Score</th>
        <th class="col-reassign">Assign</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>

  <script>
    const DATA = ${JSON.stringify(data)};

    // State management
    let currentDoctrine = 'idealist';
    let sortField = 'level';
    let sortAsc = true;

    // Load saved state from localStorage
    const savedState = JSON.parse(localStorage.getItem('featAnalyzerState') || '{}');
    const removedFeats = new Set(savedState.removed || []);
    const interestingFeats = new Set(savedState.interesting || []);
    const reassignedFeats = new Map(Object.entries(savedState.reassigned || {}));

    function saveState() {
      localStorage.setItem('featAnalyzerState', JSON.stringify({
        reassigned: Object.fromEntries(reassignedFeats),
        removed: Array.from(removedFeats),
        interesting: Array.from(interestingFeats)
      }));
    }

    function showDoctrine(doctrine) {
      currentDoctrine = doctrine;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab.' + doctrine).classList.add('active');
      renderTable();
    }

    function sortBy(field) {
      if (sortField === field) {
        sortAsc = !sortAsc;
      } else {
        sortField = field;
        sortAsc = true;
      }
      renderTable();
    }

    function toggleRemoved(id) {
      if (removedFeats.has(id)) {
        removedFeats.delete(id);
      } else {
        removedFeats.add(id);
      }
      saveState();
      renderTable();
    }

    function toggleInteresting(id) {
      if (interestingFeats.has(id)) {
        interestingFeats.delete(id);
      } else {
        interestingFeats.add(id);
      }
      saveState();
      renderTable();
    }

    function toggleDescription(id) {
      const summary = document.getElementById('sum-' + id);
      const full = document.getElementById('full-' + id);
      if (summary && full) {
        summary.classList.toggle('expanded');
        full.classList.toggle('expanded');
      }
    }

    function reassignFeat(id, newDoctrine, originalDoctrine) {
      if (newDoctrine === originalDoctrine) {
        // Clicking the original doctrine clears the reassignment
        reassignedFeats.delete(id);
      } else {
        reassignedFeats.set(id, newDoctrine);
      }
      saveState();
      renderTable();
    }

    function getEffectiveDoctrine(feat) {
      return reassignedFeats.get(feat._id) || feat.bestMatch;
    }

    function renderTable() {
      const search = document.getElementById('search').value.toLowerCase();
      const levelFilter = document.getElementById('levelFilter').value;
      const hideRemoved = document.getElementById('hideRemoved').checked;
      const showOnlyInteresting = document.getElementById('showOnlyInteresting').checked;

      // Collect feats for current doctrine:
      // - Original feats that haven't been reassigned away
      // - Feats from other doctrines that have been reassigned here
      let feats = [];

      // Add original feats not reassigned away
      DATA[currentDoctrine].forEach(f => {
        if (getEffectiveDoctrine(f) === currentDoctrine) {
          feats.push({...f, originalDoctrine: currentDoctrine, wasReassigned: false});
        }
      });

      // Add feats reassigned TO this doctrine from other doctrines
      ['idealist', 'practical', 'ruthless'].forEach(doctrine => {
        if (doctrine !== currentDoctrine) {
          DATA[doctrine].forEach(f => {
            if (getEffectiveDoctrine(f) === currentDoctrine) {
              feats.push({...f, originalDoctrine: doctrine, wasReassigned: true});
            }
          });
        }
      });

      // Filter
      feats = feats.filter(f => {
        if (search && !f.name.toLowerCase().includes(search)) return false;
        if (levelFilter && f.level !== parseInt(levelFilter)) return false;
        if (hideRemoved && removedFeats.has(f._id)) return false;
        if (showOnlyInteresting && !interestingFeats.has(f._id)) return false;
        return true;
      });

      // Sort
      feats.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'level') cmp = a.level - b.level;
        else if (sortField === 'score') cmp = b.scores[currentDoctrine] - a.scores[currentDoctrine];
        else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
        return sortAsc ? cmp : -cmp;
      });

      // Update stats
      const interestingCount = feats.filter(f => interestingFeats.has(f._id)).length;
      document.getElementById('stats').textContent =
        \`Showing \${feats.length} feats | \${interestingCount} marked interesting\`;

      // Render
      const tbody = document.getElementById('tbody');
      tbody.innerHTML = feats.map(f => {
        const isRemoved = removedFeats.has(f._id);
        const isInteresting = interestingFeats.has(f._id);
        const rowClass = isRemoved ? 'removed' : (isInteresting ? 'interesting' : '');

        return \`
          <tr class="\${rowClass}">
            <td class="col-actions">
              \${isRemoved
                ? \`<button class="btn-restore" onclick="toggleRemoved('\${f._id}')">+</button>\`
                : \`<button class="btn-remove" onclick="toggleRemoved('\${f._id}')">−</button>\`
              }
            </td>
            <td class="col-interesting">
              <input type="checkbox"
                \${isInteresting ? 'checked' : ''}
                onchange="toggleInteresting('\${f._id}')">
            </td>
            <td class="col-lvl">\${f.level}</td>
            <td class="col-name">\${f.name}</td>
            <td class="col-desc">
              <div class="description-summary" onclick="toggleDescription('\${f._id}')" id="sum-\${f._id}">\${f.summary}</div>
              <div class="description-full" id="full-\${f._id}">\${f.fullDescription}</div>
              <div class="traits">
                \${f.traits.map(t => \`<span class="trait">\${t}</span>\`).join('')}
              </div>
            </td>
            <td class="col-score">
              \${f.scores[currentDoctrine]}
              \${f.wasReassigned ? \`<span class="reassigned-badge">from \${f.originalDoctrine}</span>\` : ''}
            </td>
            <td class="col-reassign">
              <div class="reassign-icons">
                <button class="reassign-btn idealist \${getEffectiveDoctrine(f) === 'idealist' ? 'active' : ''}"
                  onclick="reassignFeat('\${f._id}', 'idealist', '\${f.originalDoctrine}')"
                  title="Assign to Idealist">
                  <i class="fas fa-heart"></i>
                </button>
                <button class="reassign-btn practical \${getEffectiveDoctrine(f) === 'practical' ? 'active' : ''}"
                  onclick="reassignFeat('\${f._id}', 'practical', '\${f.originalDoctrine}')"
                  title="Assign to Practical">
                  <i class="fas fa-scale-balanced"></i>
                </button>
                <button class="reassign-btn ruthless \${getEffectiveDoctrine(f) === 'ruthless' ? 'active' : ''}"
                  onclick="reassignFeat('\${f._id}', 'ruthless', '\${f.originalDoctrine}')"
                  title="Assign to Ruthless">
                  <i class="fas fa-skull"></i>
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function exportInteresting() {
      const interesting = [];
      ['idealist', 'practical', 'ruthless'].forEach(doctrine => {
        DATA[doctrine].forEach(f => {
          if (interestingFeats.has(f._id)) {
            interesting.push({
              doctrine,
              level: f.level,
              name: f.name,
              _id: f._id,
              description: f.fullDescription
            });
          }
        });
      });

      const blob = new Blob([JSON.stringify(interesting, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'interesting-feats.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Initial render
    renderTable();
  </script>
</body>
</html>`;
}

// ============================================================================
// Entry Point
// ============================================================================

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const featsDir = path.join(projectRoot, '_pf2e', 'packs', 'feats');
  const outputMd = path.join(projectRoot, 'docs', 'leader-feats-analyzed.md');
  const outputHtml = path.join(projectRoot, 'docs', 'leader-feats-viewer.html');

  console.log('🔍 Feat Analyzer Starting...');
  console.log(`   Source: ${featsDir}`);

  // Get all JSON files, excluding mythic
  const excludeDirs = ['mythic'];
  const files = getAllJsonFiles(featsDir, excludeDirs);
  console.log(`   Found ${files.length} feat files`);

  // Analyze each feat
  const results: FeatAnalysis[] = [];
  let processed = 0;

  for (const file of files) {
    const analysis = analyzeFeat(file, featsDir);
    if (analysis) {
      results.push(analysis);
    }
    processed++;

    if (processed % 500 === 0) {
      console.log(`   Processed ${processed}/${files.length} files...`);
    }
  }

  console.log(`\n📊 Analysis Complete:`);
  console.log(`   Total feats: ${results.length}`);
  console.log(`   Idealist: ${results.filter(f => f.bestMatch === 'idealist').length}`);
  console.log(`   Practical: ${results.filter(f => f.bestMatch === 'practical').length}`);
  console.log(`   Ruthless: ${results.filter(f => f.bestMatch === 'ruthless').length}`);
  console.log(`   Uncategorized: ${results.filter(f => f.bestMatch === 'none').length}`);

  // Ensure docs directory exists
  const docsDir = path.dirname(outputMd);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Generate and write markdown
  const markdown = generateMarkdown(results);
  fs.writeFileSync(outputMd, markdown);
  console.log(`\n✅ Markdown written to: ${outputMd}`);

  // Generate and write HTML viewer
  const html = generateHtml(results);
  fs.writeFileSync(outputHtml, html);
  console.log(`✅ HTML viewer written to: ${outputHtml}`);
}

main();
