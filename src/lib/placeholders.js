const PLACEHOLDER_SERIES_DEFS = [
  { prefix: 'Prompt', prompt: 1, images: 4, tags: ['npc', 'social', 'urban', 'mystery'] },
  { prefix: 'Prompt', prompt: 2, images: 1, tags: ['letter', 'clue', 'mystery', 'urban'] },
  { prefix: 'Prompt', prompt: 3, images: 1, tags: ['map', 'travel', 'nature', 'quest'] },
  { prefix: 'Prompt', prompt: 4, images: 1, tags: ['quest', 'magic', 'danger', 'clue'] },
  { prefix: 'itemsPrompt', prompt: 1, images: 2, tags: ['loot', 'combat', 'danger'] },
  { prefix: 'itemsPrompt', prompt: 2, images: 2, tags: ['loot', 'magic', 'clue'] },
  { prefix: 'itemsPrompt', prompt: 3, images: 2, tags: ['loot', 'religion', 'quest'] },
  { prefix: 'itemsPrompt', prompt: 4, images: 3, tags: ['loot', 'map', 'letter', 'clue'] },
];

const SEMANTIC_KEYWORDS = {
  npc: ['npc', 'persoon', 'karakter', 'kapitein', 'garde', 'koopman', 'edelman', 'koning', 'koningin', 'priester', 'wijze', 'person', 'character', 'guard', 'merchant', 'noble', 'king', 'queen', 'priest', 'sage'],
  loot: ['loot', 'schat', 'goud', 'munt', 'artefact', 'relikwie', 'item', 'uitrusting', 'kist', 'beloning', 'treasure', 'gold', 'coin', 'artifact', 'relic', 'gear', 'chest', 'reward'],
  clue: ['aanwijzing', 'hint', 'bewijs', 'symbool', 'code', 'geheim', 'mysterie', 'clue', 'hint', 'evidence', 'symbol', 'cipher', 'mystery'],
  letter: ['brief', 'notitie', 'dagboek', 'bericht', 'document', 'rol', 'verslag', 'letter', 'note', 'journal', 'diary', 'dispatch', 'message', 'scroll', 'report', 'writ'],
  quest: ['missie', 'opdracht', 'contract', 'doel', 'taak', 'premie', 'quest', 'mission', 'objective', 'task', 'goal', 'bounty'],
  map: ['kaart', 'route', 'pad', 'atlas', 'locatie', 'regio', 'weg', 'grot', 'ruine', 'map', 'route', 'path', 'chart', 'location', 'region', 'road', 'cave', 'ruins'],
  magic: ['magie', 'arcaan', 'rune', 'spreuk', 'betoverd', 'mystiek', 'toverij', 'ritueel', 'magic', 'arcane', 'rune', 'spell', 'enchanted', 'mystic', 'sorcery', 'ritual'],
  combat: ['zwaard', 'mes', 'dolk', 'boog', 'schild', 'slag', 'gevecht', 'oorlog', 'aanval', 'wapenuitrusting', 'sword', 'blade', 'dagger', 'bow', 'shield', 'battle', 'fight', 'weapon', 'armor'],
  travel: ['reis', 'expeditie', 'weg', 'pad', 'tocht', 'travel', 'journey', 'road', 'trail', 'expedition', 'scout'],
  urban: ['stad', 'dorp', 'straat', 'markt', 'kasteel', 'poort', 'haven', 'city', 'town', 'street', 'market', 'castle', 'gate', 'harbor'],
  nature: ['bos', 'moeras', 'rivier', 'berg', 'wild', 'woud', 'kust', 'forest', 'swamp', 'river', 'mountain', 'wild', 'grove', 'coast'],
  danger: ['vijand', 'vijandig', 'bedreiging', 'gevaar', 'vloek', 'val', 'bloed', 'donker', 'enemy', 'hostile', 'threat', 'danger', 'curse', 'trap', 'blood', 'dark'],
  religion: ['tempel', 'heiligdom', 'heilig', 'kerk', 'klerikus', 'zegen', 'eed', 'temple', 'shrine', 'divine', 'holy', 'church', 'cleric', 'blessing', 'oath'],
};

const PLACEHOLDER_CATALOG = (() => {
  const entries = [];
  PLACEHOLDER_SERIES_DEFS.forEach((series) => {
    for (let img = 1; img <= series.images; img += 1) {
      for (let v = 1; v <= 9; v += 1) {
        entries.push({
          url: `/placeholders/${series.prefix}${series.prompt}image${img}_${v}.png`,
          tags: series.tags,
        });
      }
    }
  });
  return entries;
})();

export const PROFILE_PLACEHOLDERS = [
  ...Array.from({ length: 15 }, (_, i) => `/placeholders/emptyProfilePictures/emptyProfilePH1_${i + 1}.png`),
  ...Array.from({ length: 14 }, (_, i) => `/placeholders/emptyProfilePictures/emptyProfilePH2_${i + 1}.png`),
];

export function resolveDisplayAvatar(url, id) {
  if (url && !url.startsWith('blob:')) return url;
  const hash = String(id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PROFILE_PLACEHOLDERS[hash % PROFILE_PLACEHOLDERS.length];
}

export function suggestHandoutImages(title, content, type, count = 6) {
  const text = `${title || ''} ${content || ''} ${type || ''}`.toLowerCase();
  const typeTagMap = { loot: ['loot'], clue: ['clue', 'mystery'], map: ['map'], npc: ['npc', 'social'] };
  const typeTags = typeTagMap[type] || [];

  const scored = PLACEHOLDER_CATALOG.map((entry) => {
    let score = 0;
    typeTags.forEach((tag) => {
      if (entry.tags.includes(tag)) score += 3;
    });
    entry.tags.forEach((tag) => {
      (SEMANTIC_KEYWORDS[tag] || []).forEach((kw) => {
        if (text.includes(kw)) score += 1;
      });
    });
    return { ...entry, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, count).map((e) => e.url);
}
