import React from 'react';
import { Crown, Check, X } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { formatCustomStatValue, formatSignedModifier } from '../lib/statModifiers';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';
import Button from '../ui/Button';
import { useT } from '../i18n/useT';

function formatModifier(value) {
  return formatSignedModifier(value);
}

export default function PreparationOfferModal({ isOpen, preparation, onAccept, onReject, busy = false }) {
  const { t } = useT('preparations');

  if (!isOpen || !preparation) return null;

  const statPills = [
    { label: 'HP', value: `${Number(preparation.hp ?? 0)}/${Number(preparation.maxHp ?? preparation.hp ?? 0)}` },
    { label: 'AC', value: String(Number(preparation.ac ?? 10)) },
    { label: 'Init', value: formatModifier(preparation.initMod) },
  ].concat((preparation.customStats || []).slice(0, 4).map((stat) => ({
    label: stat.name,
    value: formatCustomStatValue(stat),
  })));

  const characterName = preparation.name || t('offer.unnamedCharacter');

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={busy ? () => {} : onReject}
      title={t('offer.title')}
      subtitle={characterName}
      icon={Crown}
      iconClassName="tv-accent h-5 w-5 shrink-0"
      maxWidthClassName="max-w-xl"
      panelClassName="tv-offer-modal"
      bodyClassName="!p-0"
      footer={(
        <div className="tv-offer-modal__footer">
          <Button type="button" variant="ghost" block onClick={onReject} disabled={busy} icon={X}>
            {t('offer.reject')}
          </Button>
          <Button
            type="button"
            variant="primary"
            block
            icon={Check}
            onClick={onAccept}
            loading={busy}
            disabled={busy}
          >
            {t('offer.accept')}
          </Button>
        </div>
      )}
    >
      <div className="tv-offer-modal__body">
        <div className="tv-offer-modal__hero">
          <div className="tv-offer-modal__portrait tv-image-frame">
            <TvImage
              src={resolveDisplayAvatar(preparation.imageUrl, preparation.id)}
              alt={characterName}
            />
          </div>

          <div className="tv-offer-modal__intro">
            {preparation.subtitle ? (
              <p className="tv-offer-modal__class">{preparation.subtitle}</p>
            ) : null}
            <p className="tv-offer-modal__lead">
              {t('offer.lead')}
            </p>
            <p className="tv-offer-modal__hint">
              {t('offer.hint')}
            </p>
          </div>
        </div>

        <div className="tv-offer-modal__stats" aria-label={t('offer.statsAria')}>
          {statPills.map((pill) => (
            <span key={`${preparation.id}-${pill.label}`} className="tv-prep-stat-pill">
              <span className="tv-prep-stat-pill__label">{pill.label}</span>
              <span className="tv-prep-stat-pill__value">{pill.value}</span>
            </span>
          ))}
        </div>

        <div className="tv-offer-modal__bio tv-panel-inset">
          <p className="tv-offer-modal__bio-label">{t('offer.background')}</p>
          <div className="tv-offer-modal__bio-copy font-story text-sm leading-7 tv-text">
            {preparation.bio || <span className="italic tv-muted">{t('offer.noBio')}</span>}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
