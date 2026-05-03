export const MOCK_HANDOUTS = [
  { id: '1', title: 'Oude Kaart van Phandalin', type: 'map', content: 'Een verweerde kaart met mysterieuze rode kruizen. Het perkament voelt broos aan.', secret: 'Het rode kruis in het bos leidt naar de verborgen schuilplaats van de Redbrands.', isRevealed: true, claimable: false, claimedBy: null },
  { id: '2', title: 'Gouden Kelk van Lathander', type: 'loot', content: 'Een prachtig versierde gouden kelk, ingelegd met dieprode robijnen. Hij voelt onnatuurlijk warm aan.', secret: 'De kelk is vervloekt. Wie eruit drinkt spreekt enkel nog de brute waarheid.', isRevealed: true, claimable: true, claimedBy: null },
  { id: '3', title: 'Brief van de Glasstaff', type: 'clue', content: 'Gekrabbeld in haastig handschrift... Iets over een levering aanstaande nacht bij de uilenbron.', secret: 'De levering bevat illegale, magische wapens voor de naderende goblin-horde.', isRevealed: false, claimable: false, claimedBy: null },
];

export const MOCK_PARTY = [
  { id: 'p1', name: 'Elara', subtitle: 'Elf Ranger', hp: 24, maxHp: 24, ac: 15, init: null, initMod: 3, isNpc: false, avatar: null, bio: 'Elara groeide op in de eindeloze wouden van de noordelijke grens. Ze vertrouwt dieren meer dan mensen.', customStats: [{ id: 1, name: 'DEX', value: 16 }, { id: 2, name: 'WIS', value: 14 }] },
  { id: 'p2', name: 'Thorin', subtitle: 'Dwarf Fighter', hp: 35, maxHp: 35, ac: 18, init: null, initMod: -1, isNpc: false, avatar: null, bio: 'Een verbannen dwerg op zoek naar eerherstel en goud.', customStats: [] },
  { id: 'n1', name: 'Goblin Aanvoerder', subtitle: 'Vijand', hp: 15, maxHp: 15, ac: 13, init: null, initMod: 2, isNpc: true, avatar: null, bio: 'Een opvallend slimme goblin met een met bloed besmeurd zwaard.', customStats: [] },
];

export const MOCK_CHAT = [
  { id: 'c1', author: 'GM', text: 'Jullie betreden een donkere herberg. De geur van verschaald bier en verbrand hout hangt in de lucht. Een eenzame bard stemt zijn luit in de hoek.', time: '19:00' },
  { id: 'c2', author: 'Elara', text: 'Ik houd mijn hand bij mijn boog en kijk of er verdachte figuren in de schaduwen zitten.', time: '19:01' },
];

export const MOCK_INVENTORY = [
  { id: 'i1', ownerId: 'p1', name: 'Healing Potion', desc: 'Herstelt 2d4+2 Hit Points. De vloeistof licht rood op.', amount: 2 },
  { id: 'i2', ownerId: 'p1', name: 'Elven Touw (50ft)', desc: 'Extreem sterk en licht touw, geweven van zeldzame bladeren.', amount: 1 },
  { id: 'i3', ownerId: 'p2', name: 'Slijpsteen', desc: 'Voor het onderhoud van wapens.', amount: 1 },
  { id: 'i4', ownerId: 'p2', name: 'Glowstone', desc: 'Een kleine steen die een warm, constant licht uitstraalt in het donker.', amount: 3 },
];

export const MOCK_WALLETS = {
  p1: { platinum: 0, gold: 15, silver: 5, bronze: 50 },
  p2: { platinum: 1, gold: 0, silver: 20, bronze: 0 },
  party: { platinum: 5, gold: 120, silver: 0, bronze: 0 },
};

export const MOCK_NOTES = [
  { id: 'n1', authorId: 'p1', title: 'Onderzoek in de herberg', content: 'De waard keek erg nerveus toen we naar de rode kruizen vroegen. Misschien vannacht even op onderzoek uit gaan als de rest slaapt.', lastEdited: '10 min geleden' },
  { id: 'n2', authorId: 'gm', title: 'Sessie 4 - Voorbereiding', content: 'Als de spelers naar het bos gaan, triggert de goblin hinderlaag. Vergeet niet de passive perception van Elara te checken voor de valstrik.', lastEdited: 'Gisteren' },
];

export const STAT_SUGGESTIONS = [
  { abbr: 'AGI', name: 'Agility' },
  { abbr: 'APP', name: 'Appearance' },
  { abbr: 'BLD', name: 'Blood' },
  { abbr: 'BOD', name: 'Body' },
  { abbr: 'CHA', name: 'Charisma' },
  { abbr: 'CON', name: 'Constitution' },
  { abbr: 'COOL', name: 'Cool' },
  { abbr: 'DEX', name: 'Dexterity' },
  { abbr: 'EAC', name: 'Energy Armor Class' },
  { abbr: 'EDG', name: 'Edge' },
  { abbr: 'EDU', name: 'Education' },
  { abbr: 'EMP', name: 'Empathy' },
  { abbr: 'ENRG', name: 'Energy' },
  { abbr: 'ESS', name: 'Essence' },
  { abbr: 'FATE', name: 'Fate' },
  { abbr: 'FP', name: 'Fatigue Points' },
  { abbr: 'HERO', name: 'Hero Points' },
  { abbr: 'HT', name: 'Health' },
  { abbr: 'HUM', name: 'Humanity' },
  { abbr: 'INI', name: 'Initiative' },
  { abbr: 'INT', name: 'Intelligence' },
  { abbr: 'IQ', name: 'Intelligence Quotient' },
  { abbr: 'KAC', name: 'Kinetic Armor Class' },
  { abbr: 'KARMA', name: 'Karma' },
  { abbr: 'LOG', name: 'Logic' },
  { abbr: 'LUCK', name: 'Luck' },
  { abbr: 'LUK', name: 'Luck' },
  { abbr: 'MAG', name: 'Magic' },
  { abbr: 'MAN', name: 'Manipulation' },
  { abbr: 'MANA', name: 'Mana' },
  { abbr: 'MOV', name: 'Move' },
  { abbr: 'PAC', name: 'Pace' },
  { abbr: 'PAR', name: 'Parry' },
  { abbr: 'PB', name: 'Power Base' },
  { abbr: 'PER', name: 'Perception' },
  { abbr: 'PERC', name: 'Perception' },
  { abbr: 'POW', name: 'Power' },
  { abbr: 'REA', name: 'Reaction' },
  { abbr: 'REF', name: 'Reflexes' },
  { abbr: 'REP', name: 'Reputation' },
  { abbr: 'RES', name: 'Resonance' },
  { abbr: 'RP', name: 'Resolve Points' },
  { abbr: 'SAN', name: 'Sanity' },
  { abbr: 'SIZ', name: 'Size' },
  { abbr: 'SMA', name: 'Smarts' },
  { abbr: 'SP', name: 'Stamina Points' },
  { abbr: 'SPD', name: 'Speed' },
  { abbr: 'SPI', name: 'Spirit' },
  { abbr: 'STA', name: 'Stamina' },
  { abbr: 'STR', name: 'Strength' },
  { abbr: 'TECH', name: 'Technology' },
  { abbr: 'TGH', name: 'Toughness' },
  { abbr: 'VIG', name: 'Vigor' },
  { abbr: 'WIL', name: 'Willpower' },
  { abbr: 'WILL', name: 'Will' },
  { abbr: 'WIS', name: 'Wisdom' },
  { abbr: 'WIT', name: 'Wits' },
];
