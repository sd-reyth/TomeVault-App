import React, { useState } from 'react';
import { Info } from 'lucide-react';
import Text from '../../ui/Text';

const SLAGORDE_INFO_PILLS = ['Initiative', 'Beurten', "NPC's"];

const SLAGORDE_INFO_STEPS = [
  {
    title: 'Ruststand',
    body: 'Iedereen kan initiative invullen voordat de GM het gevecht start.',
  },
  {
    title: 'Gevecht actief',
    body: 'Initiative staat vast, beurt en ronde lopen door tot pauze of stop.',
  },
  {
    title: 'Pauzeren',
    body: 'Voeg NPC\'s toe of verwijder ze zonder de huidige ronde te verliezen.',
  },
];

export function SlagordeInfoContent() {
  return (
    <div className="tv-combat-info-panel tv-panel-inset">
      <Text variant="label" tone="accent" className="mb-2.5 block tracking-[0.18em]">
        Slagorde info
      </Text>
      <div className="tv-prep-info__pills">
        {SLAGORDE_INFO_PILLS.map((pill) => (
          <span key={pill} className="tv-prep-info__pill">{pill}</span>
        ))}
      </div>
      <ol className="tv-prep-info__steps">
        {SLAGORDE_INFO_STEPS.map((step, index) => (
          <li key={step.title} className="tv-prep-info__step">
            <span className="tv-prep-info__step-num">{index + 1}</span>
            <div className="min-w-0">
              <div className="tv-prep-info__step-title">{step.title}</div>
              <p className="tv-prep-info__step-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SlagordeInfoButton({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? 'Verberg uitleg' : 'Toon uitleg'}
      aria-label={open ? 'Verberg uitleg' : 'Toon uitleg'}
      aria-expanded={open}
      className={`tv-toolbar-icon-btn shrink-0 transition-all duration-200 ease-out active:scale-[0.985] ${
        open
          ? 'border-[color-mix(in_srgb,var(--tv-accent),transparent_30%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] text-[var(--tv-accent)]'
          : 'tv-panel-inset tv-muted tv-hover-surface hover:text-[var(--tv-accent)]'
      }`}
    >
      <Info className="h-4 w-4" />
    </button>
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
