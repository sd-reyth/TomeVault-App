import React, { useState } from 'react';
import { Check, AlertCircle, Zap } from 'lucide-react';
import ModalFrame from './ModalFrame';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { isIncapacitated } from '../lib/battleConditions';

function InitiativeSwapModal({
  isOpen,
  onClose,
  member,
  party,
  initiativeOrder,
  onSwapInitiative,
}) {
  const [selectedPartner, setSelectedPartner] = useState(null);

  if (!isOpen || !member) return null;

  const isInitiativeInOrder = initiativeOrder?.includes(member.id);
  
  // Get eligible swap partners (in same combat, not incapacitated)
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
    ? 'Alert Feat Swap is niet mogelijk als jij of je bondgenoot de status "Incapacitated" hebt.'
    : null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Initiative Swap"
      subtitle="Wissel jouw initiativescore met een bondgenoot"
      icon={Zap}
      maxWidthClassName="max-w-md"
      bodyClassName="gap-0 px-0 py-0 sm:px-0 sm:py-0"
    >
        <div className="px-5 py-4">
          {incapacitatedMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-800/40 bg-rose-950/20 p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-300">{incapacitatedMessage}</p>
            </div>
          )}

          {!isInitiativeInOrder && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300">Je bent niet in de initiatielijst.</p>
            </div>
          )}

          {eligiblePartners.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-sm text-stone-400">Geen beschikbare bondgenoten om mee te wisselen.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">
                Kies een bondgenoot:
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
                            ? 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
                            : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/7'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                        <img
                          src={resolveDisplayAvatar(partner.avatar, partner.id)}
                          alt={partner.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-fantasy text-sm font-bold text-stone-100">{partner.name}</div>
                        <div className="text-xs text-stone-500">Initiative: {partner.init ?? '-'}</div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 tv-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-white/5 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            Annuleer
          </button>
          <button
            type="button"
            onClick={handleSwap}
            disabled={!selectedPartner || incapacitatedMessage}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-fantasy tracking-[0.12em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 tv-button-primary"
          >
            <Zap className="h-3.5 w-3.5" /> Wissel
          </button>
        </div>
    </ModalFrame>
  );
}

export default InitiativeSwapModal;
