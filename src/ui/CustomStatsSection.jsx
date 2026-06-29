import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { STAT_SUGGESTIONS } from '../data/mockData';
import CustomStatChips from './CustomStatChips';
import CustomStatSheet from './CustomStatSheet';

export default function CustomStatsSection({
  stats = [],
  canEdit = false,
  onAdd,
  onUpdate,
  onRemove,
  suggestions = STAT_SUGGESTIONS,
  sectionLabel = 'Eigenschappen',
  emptyHint = 'Nog geen extra eigenschappen.',
  resetKey = null,
}) {
  const [editing, setEditing] = useState(false);
  const hasStats = stats.length > 0;

  useEffect(() => {
    setEditing(false);
  }, [resetKey]);

  if (!canEdit && !hasStats) return null;

  const startEditing = () => {
    if (!hasStats) onAdd?.();
    setEditing(true);
  };

  return (
    <section className="tv-custom-stats-section">
      <div className="tv-custom-stats-section__header">
        {sectionLabel ? (
          <p className="tv-profile-section-label tv-custom-stats-section__title">{sectionLabel}</p>
        ) : (
          <span className="tv-custom-stats-section__title" aria-hidden />
        )}
        {canEdit ? (
          editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="tv-custom-stats-section__action tv-custom-stats-section__action--done"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Gereed
            </button>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="tv-custom-stats-section__action"
            >
              {hasStats ? (
                <>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Bewerk
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Toevoegen
                </>
              )}
            </button>
          )
        ) : null}
      </div>

      {editing && canEdit ? (
        <CustomStatChips
          stats={stats}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onRemove={onRemove}
          suggestions={suggestions}
        />
      ) : hasStats ? (
        <CustomStatSheet stats={stats} />
      ) : canEdit ? (
        <p className="tv-custom-stats-section__empty">{emptyHint}</p>
      ) : null}
    </section>
  );
}
