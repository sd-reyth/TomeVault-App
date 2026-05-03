import { Map as MapIcon, Crown, Scroll, User } from 'lucide-react';

export function getHandoutIcon(type) {
  switch(type) {
    case 'map': return MapIcon;
    case 'loot': return Crown;
    case 'clue': return Scroll;
    case 'npc': return User;
    default: return Scroll;
  }
}
