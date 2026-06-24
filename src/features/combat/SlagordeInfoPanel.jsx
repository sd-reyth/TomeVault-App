import React, { useState } from 'react';
import { Info } from 'lucide-react';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';

const SLAGORDE_INFO_LINES = [
  'Ruststand laat iedereen initiative voorbereiden voordat de GM start.',
  'Gevecht actief vergrendelt initiative-invoer en houdt beurt en ronde bij.',
  'Pauzeren geeft ruimte om NPC\'s toe te voegen of te verwijderen zonder de ronde kwijt te raken.',
];

export function SlagordeInfoContent() {
  return (
    <div className="tv-combat-info-panel">
      <Text variant="label" tone="muted" className="mb-2 block">Slagorde info</Text>
      <div className="space-y-2">
        {SLAGORDE_INFO_LINES.map((line) => (
          <Text key={line} variant="meta" as="p" className="leading-5">{line}</Text>
        ))}
      </div>
    </div>
  );
}

export function SlagordeInfoButton({ open, onToggle }) {
  return (
    <IconButton
      icon={Info}
      label={open ? 'Verberg uitleg' : 'Toon uitleg'}
      variant="default"
      size="sm"
      className="shrink-0"
      aria-expanded={open}
      onClick={onToggle}
    />
  );
}

export function useSlagordeInfo() {
  const [open, setOpen] = useState(false);
  return {
    open,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
  };
}
