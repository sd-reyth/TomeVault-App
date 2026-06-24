import React from 'react';
import { AlertCircle } from 'lucide-react';
import Icon from '../../ui/Icon';
import Text from '../../ui/Text';
import { CONDITION_TONE_HEX, getCondition } from '../../lib/battleConditions';
import { CONDITION_ICON_MAP } from './conditionIconMap';

export default function ConditionChips({ conditions, isGm, onEdit, className = '' }) {
  if (!conditions.length) return null;

  const visible = conditions.slice(0, 4);
  const overflow = conditions.length - visible.length;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className || 'mt-1.5'}`}>
      {visible.map((condition, index) => {
        const meta = getCondition(condition.id);
        const ConditionListIcon = CONDITION_ICON_MAP[meta?.icon] || AlertCircle;
        const tone = CONDITION_TONE_HEX[meta?.color] || CONDITION_TONE_HEX.slate;

        return (
          <button
            key={condition.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isGm) onEdit?.();
            }}
            className={`tv-condition-chip ${isGm ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
            style={{
              '--tv-condition-tone': tone,
              animationDelay: `${index * 0.14}s`,
            }}
            title={meta?.description ? `${meta.label} — ${meta.description}` : meta?.label}
            aria-label={meta?.label || condition.id}
          >
            <Icon as={ConditionListIcon} size="xs" />
          </button>
        );
      })}
      {overflow > 0 ? (
        <span
          className="tv-condition-chip tv-condition-chip--more"
          style={{ '--tv-condition-tone': 'var(--tv-accent)' }}
          title={conditions.map((c) => getCondition(c.id)?.label).filter(Boolean).join(', ')}
        >
          <Text variant="meta" as="span">+{overflow}</Text>
        </span>
      ) : null}
    </div>
  );
}
