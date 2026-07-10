import React, { useState } from 'react';
import { Check, AlertCircle, Zap } from 'lucide-react';
import ModalFrame from './ModalFrame';
import Button from './Button';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { isIncapacitated } from '../lib/battleConditions';
import { useT } from '../i18n/useT';

function InitiativeSwapModal({
  isOpen,
  onClose,
  member,
  party,
  initiativeOrder,
  onSwapInitiative,
}) {
  const { t } = useT('combat');
  const [selectedPartner, setSelectedPartner] = useState(null);

  if (!isOpen || !member) return null;

  const isInitiativeInOrder = initiativeOrder?.includes(member.id);
  
  const eligiblePartners = (party || []).filter(p => {
    if (p.id === member.id) return false;
    if (!initiativeOrder?.includes(p.id)) return false;
    if (isIncapacitated(p) || isIncapacitated(member)) return false;
    return true;
  });

  const handleSwap = () => {
    if (selectedPartner && onSwapInitiative) {
      onSwapInitiative(member.id, selectedPartner.id);
      setSelectedPartner(null);
      onClose();
    }
  };

  const incapacitatedMessage = isIncapacitated(member) || isIncapacitated(selectedPartner)
    ? t('initiativeSwap.incapacitated')
    : null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={t('initiativeSwap.title')}
      subtitle={t('initiativeSwap.subtitle')}
      icon={Zap}
      maxWidthClassName="max-w-md"
      bodyClassName="gap-0 px-0 py-0 sm:px-0 sm:py-0"
    >
        <div className="px-5 py-4">
          {incapacitatedMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg tv-tone-enemy-surface p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 tv-tone-enemy-text shrink-0" />
              <p className="text-xs">{incapacitatedMessage}</p>
            </div>
          )}

          {!isInitiativeInOrder && (
            <div className="mb-4 flex items-start gap-2 rounded-lg tv-tone-secret-surface p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 tv-tone-secret-label shrink-0" />
              <p className="text-xs">{t('initiativeSwap.notInList')}</p>
            </div>
          )}

          {eligiblePartners.length === 0 ? (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-4 text-center">
              <p className="text-sm tv-text-sub">{t('initiativeSwap.noPartners')}</p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs font-bold uppercase tracking-widest tv-muted">
                {t('initiativeSwap.choosePartner')}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                {eligiblePartners.map((partner) => {
                  const isSelected = selectedPartner?.id === partner.id;
                  const partnerIncapacitated = isIncapacitated(partner);
                  const yourIncapacitated = isIncapacitated(member);

                  return (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => !partnerIncapacitated && !yourIncapacitated && setSelectedPartner(partner)}
                      disabled={partnerIncapacitated || yourIncapacitated}
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 transition-all text-left ${
                        isSelected
                          ? 'tv-item-selected'
                          : (partnerIncapacitated || yourIncapacitated)
                            ? 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset opacity-50 cursor-not-allowed'
                            : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset hover:tv-border-emphasis tv-hover-surface'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset">
                        <img
                          src={resolveDisplayAvatar(partner.avatar, partner.id)}
                          alt={partner.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-fantasy text-sm font-bold tv-text">{partner.name}</div>
                        <div className="text-xs tv-muted">
                          {t('initiativeSwap.initiativeScore', { score: partner.init ?? '-' })}
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 tv-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSwap}
            disabled={!selectedPartner || incapacitatedMessage}
          >
            <Zap className="h-3.5 w-3.5" /> {t('initiativeSwap.swap')}
          </Button>
        </div>
    </ModalFrame>
  );
}

export default InitiativeSwapModal;
