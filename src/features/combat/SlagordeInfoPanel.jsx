import React, { useState } from 'react';
import { Info } from 'lucide-react';
import Text from '../../ui/Text';
import { useT } from '../../i18n/useT';

const SLAGORDE_INFO_PILL_KEYS = ['initiative', 'turns', 'npcs'];
const SLAGORDE_INFO_STEP_KEYS = ['idle', 'active', 'paused'];

export function SlagordeInfoContent() {
  const { t } = useT('combat');

  return (
    <div className="tv-combat-info-panel tv-panel-inset">
      <Text variant="label" tone="accent" className="mb-2.5 block tracking-[0.18em]">
        {t('info.title')}
      </Text>
      <div className="tv-prep-info__pills">
        {SLAGORDE_INFO_PILL_KEYS.map((pillKey) => (
          <span key={pillKey} className="tv-prep-info__pill">{t(`info.pills.${pillKey}`)}</span>
        ))}
      </div>
      <ol className="tv-prep-info__steps">
        {SLAGORDE_INFO_STEP_KEYS.map((stepKey, index) => (
          <li key={stepKey} className="tv-prep-info__step">
            <span className="tv-prep-info__step-num">{index + 1}</span>
            <div className="min-w-0">
              <div className="tv-prep-info__step-title">{t(`info.steps.${stepKey}.title`)}</div>
              <p className="tv-prep-info__step-body">{t(`info.steps.${stepKey}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SlagordeInfoButton({ open, onToggle }) {
  const { t } = useT('combat');
  const label = open ? t('info.hideHelp') : t('info.showHelp');

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
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
