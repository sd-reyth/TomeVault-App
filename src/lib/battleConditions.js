// Battle Conditions System
// Vereenvoudigde D&D 2024 conditions voor TomeVault

export const CONDITIONS = [
  { id: 'blinded', label: 'Blinded', icon: 'eye', color: 'amber', description: 'Kan niet zien' },
  { id: 'charmed', label: 'Charmed', icon: 'heart', color: 'pink', description: 'Beperkt in acties' },
  { id: 'deafened', label: 'Deafened', icon: 'volume-x', color: 'slate', description: 'Kan niet horen' },
  { id: 'frightened', label: 'Frightened', icon: 'alert-circle', color: 'orange', description: 'Bang en nadelig' },
  { id: 'grappled', label: 'Grappled', icon: 'hand', color: 'cyan', description: 'Vast in gevecht' },
  { id: 'incapacitated', label: 'Incapacitated', icon: 'circle-off', color: 'red', description: 'Kan niet handelen' },
  { id: 'invisible', label: 'Invisible', icon: 'ghost', color: 'purple', description: 'Onzichtbaar' },
  { id: 'paralyzed', label: 'Paralyzed', icon: 'snowflake', color: 'blue', description: 'Verlamd' },
  { id: 'petrified', label: 'Petrified', icon: 'mountain', color: 'gray', description: 'Versteend' },
  { id: 'poisoned', label: 'Poisoned', icon: 'skull', color: 'emerald', description: 'Vergiftigd' },
  { id: 'prone', label: 'Prone', icon: 'arrow-down', color: 'rose', description: 'Op de grond' },
  { id: 'restrained', label: 'Restrained', icon: 'link', color: 'indigo', description: 'Gebonden' },
  { id: 'stunned', label: 'Stunned', icon: 'zap', color: 'yellow', description: 'Verdwaasd' },
  { id: 'unconscious', label: 'Unconscious', icon: 'bed', color: 'slate', description: 'Bewusteloos' },
];

export const CONDITION_COLORS = {
  amber: 'ring-amber-500/50 border-amber-600/50 bg-amber-950/20',
  pink: 'ring-pink-500/50 border-pink-600/50 bg-pink-950/20',
  slate: 'ring-slate-500/50 border-slate-600/50 bg-slate-950/20',
  orange: 'ring-orange-500/50 border-orange-600/50 bg-orange-950/20',
  cyan: 'ring-cyan-500/50 border-cyan-600/50 bg-cyan-950/20',
  red: 'ring-rose-500/50 border-rose-600/50 bg-rose-950/20',
  purple: 'ring-purple-500/50 border-purple-600/50 bg-purple-950/20',
  blue: 'ring-blue-500/50 border-blue-600/50 bg-blue-950/20',
  gray: 'ring-gray-500/50 border-gray-600/50 bg-gray-950/20',
  emerald: 'ring-emerald-500/50 border-emerald-600/50 bg-emerald-950/20',
  rose: 'ring-rose-500/50 border-rose-600/50 bg-rose-950/20',
  indigo: 'ring-indigo-500/50 border-indigo-600/50 bg-indigo-950/20',
  yellow: 'ring-yellow-500/50 border-yellow-600/50 bg-yellow-950/20',
};

export const CONDITION_BADGE_COLORS = {
  amber: 'bg-amber-950/50 text-amber-400 border-amber-700/50',
  pink: 'bg-pink-950/50 text-pink-400 border-pink-700/50',
  slate: 'bg-slate-950/50 text-slate-400 border-slate-700/50',
  orange: 'bg-orange-950/50 text-orange-400 border-orange-700/50',
  cyan: 'bg-cyan-950/50 text-cyan-400 border-cyan-700/50',
  red: 'bg-rose-950/50 text-rose-400 border-rose-700/50',
  purple: 'bg-purple-950/50 text-purple-400 border-purple-700/50',
  blue: 'bg-blue-950/50 text-blue-400 border-blue-700/50',
  gray: 'bg-gray-950/50 text-gray-400 border-gray-700/50',
  emerald: 'bg-emerald-950/50 text-emerald-400 border-emerald-700/50',
  rose: 'bg-rose-950/50 text-rose-400 border-rose-700/50',
  indigo: 'bg-indigo-950/50 text-indigo-400 border-indigo-700/50',
  yellow: 'bg-yellow-950/50 text-yellow-400 border-yellow-700/50',
};

/** Hex tones for token-based condition chips in combat rail */
export const CONDITION_TONE_HEX = {
  amber: '#f59e0b',
  pink: '#ec4899',
  slate: '#94a3b8',
  orange: '#f97316',
  cyan: '#22d3ee',
  red: '#f43f5e',
  purple: '#a855f7',
  blue: '#3b82f6',
  gray: '#9ca3af',
  emerald: '#10b981',
  rose: '#fb7185',
  indigo: '#818cf8',
  yellow: '#eab308',
};

export function getCondition(conditionId) {
  return CONDITIONS.find(c => c.id === conditionId);
}

export function getConditionColor(conditionId) {
  const condition = getCondition(conditionId);
  return condition?.color || 'slate';
}

export function isIncapacitated(member) {
  if (!member?.conditions) return false;
  return member.conditions.some(c => c.id === 'incapacitated' && c.active === true);
}

export function hasConditions(member) {
  if (!member?.conditions) return false;
  return member.conditions.some(c => c.active === true);
}

export function getActiveConditions(member) {
  if (!member?.conditions) return [];
  return member.conditions.filter(c => c.active === true);
}

export function toggleCondition(member, conditionId) {
  if (!member) return member;
  
  const conditions = member.conditions || [];
  const condition = conditions.find(c => c.id === conditionId);
  
  if (condition) {
    return {
      ...member,
      conditions: conditions.map(c => 
        c.id === conditionId 
          ? { ...c, active: !c.active }
          : c
      )
    };
  }
  
  return {
    ...member,
    conditions: [...conditions, { id: conditionId, active: true }]
  };
}

// Alert Feat (2024) Properties
export const ALERT_FEAT = {
  hasAlertFeat: false, // boolean - speler heeft alert feat
  canInitiativeSwap: false, // boolean - heeft nog een swap beschikbaar deze beurt
};

export function applyAlertFeatBonus(initMod, proficiencyBonus) {
  if (!proficiencyBonus) return initMod;
  return (initMod || 0) + proficiencyBonus;
}
