import React, { useMemo, useState } from 'react';
import {
  Crown,
  History,
  Info,
  Pencil,
  Plus,
  Search,
  Hand,
  Trash2,
  UserRound,
} from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import SegmentedControl from '../ui/SegmentedControl';
import TvImage from './TvImage';

function formatPreparationTime(ms) {
  if (!ms) return 'Zojuist';
  return new Date(ms).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatModifier(value) {
  const safeValue = Number(value ?? 0) || 0;
  return safeValue >= 0 ? `+${safeValue}` : String(safeValue);
}

function getStatusMeta(preparation, party) {
  const assignedPlayer = party.find((member) => member.id === preparation.assignedToUid);
  const preparedPlayer = party.find((member) => member.id === preparation.preparedForUid);
  const assignedName = assignedPlayer?.name || 'speler';
  const preparedName = preparedPlayer?.name || 'speler';

  if (preparation.assignmentStatus === 'pending') {
    return {
      label: `Wacht op ${assignedName}`,
      className: 'tv-prep-status--pending',
    };
  }

  if (preparation.assignmentStatus === 'accepted') {
    return {
      label: 'In gebruik',
      className: 'tv-prep-status--active',
    };
  }

  if (preparation.assignmentStatus === 'rejected') {
    return {
      label: 'Afgeslagen',
      className: 'tv-tone-enemy-chip',
    };
  }

  if (preparation.preparedForUid) {
    return {
      label: `Voor ${preparedName}`,
      className: 'tv-prep-status--linked',
    };
  }

  return {
    label: 'Klaar',
    className: 'tv-prep-status--ready',
  };
}

function getPreparationStatPills(preparation) {
  return [
    { label: 'HP', value: `${Number(preparation.hp ?? 0)}/${Number(preparation.maxHp ?? preparation.hp ?? 0)}` },
    { label: 'AC', value: String(Number(preparation.ac ?? 10)) },
    { label: 'Init', value: formatModifier(preparation.initMod) },
    ...(preparation.customStats || []).slice(0, 2).map((stat) => ({
      label: stat.name,
      value: stat.value,
    })),
  ];
}

function matchesStatusFilter(preparation, filter) {
  if (filter === 'all') return true;
  if (filter === 'ready') return preparation.assignmentStatus === 'unassigned';
  if (filter === 'pending') return preparation.assignmentStatus === 'pending';
  if (filter === 'active') return preparation.assignmentStatus === 'accepted';
  return true;
}

function PreparationCard({
  preparation,
  party,
  activePlayers,
  onEditPreparation,
  onAssignPreparation,
  onDeletePreparation,
}) {
  const statusMeta = getStatusMeta(preparation, party);
  const statPills = getPreparationStatPills(preparation);

  const handleDelete = () => {
    if (!window.confirm(`Verwijder voorbereiding "${preparation.name}"?`)) return;
    onDeletePreparation?.(preparation);
  };

  return (
    <article className="tv-prep-card tv-view-card">
      <div className="tv-prep-card__media tv-image-frame">
        <TvImage
          src={resolveDisplayAvatar(preparation.imageUrl, preparation.id)}
          alt={preparation.name || 'Voorbereid personage'}
        />
      </div>

      <div className="tv-prep-card__main">
        <div className="tv-prep-card__head">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold tracking-[0.04em] tv-text">
                {preparation.name || 'Naamloos personage'}
              </h3>
              <span className={`tv-prep-status ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
            {preparation.subtitle ? (
              <p className="mt-0.5 truncate text-xs italic tv-muted">{preparation.subtitle}</p>
            ) : null}
          </div>
          <time className="tv-prep-card__time" dateTime={preparation.updatedAtMs ? new Date(preparation.updatedAtMs).toISOString() : undefined}>
            {formatPreparationTime(preparation.updatedAtMs)}
          </time>
        </div>

        <div className="tv-prep-card__stats">
          {statPills.map((pill) => (
            <span key={`${preparation.id}-${pill.label}`} className="tv-prep-stat-pill">
              <span className="tv-prep-stat-pill__label">{pill.label}</span>
              <span className="tv-prep-stat-pill__value">{pill.value}</span>
            </span>
          ))}
        </div>

        <p className="tv-prep-card__bio">
          {preparation.bio || 'Nog geen achtergrond of notities toegevoegd.'}
        </p>
      </div>

      <div className="tv-prep-card__actions" role="group" aria-label="Profielacties">
        <button
          type="button"
          onClick={() => onEditPreparation?.(preparation)}
          className="tv-prep-card__action"
          title="Bewerken"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Bewerken</span>
        </button>
        <button
          type="button"
          onClick={() => onAssignPreparation?.(preparation)}
          disabled={activePlayers.length === 0}
          className="tv-prep-card__action tv-prep-card__action--primary"
          title="Toewijzen aan speler"
        >
          <Hand className="h-3.5 w-3.5" />
          <span>Toewijzen</span>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="tv-prep-card__action tv-prep-card__action--danger"
          title="Verwijderen"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Verwijder</span>
        </button>
      </div>
    </article>
  );
}

export default function PreparationsView({
  templates,
  backups,
  party,
  onCreatePreparation,
  onCreateFromPlayer,
  onEditPreparation,
  onDeletePreparation,
  onAssignPreparation,
  onRestoreBackup,
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInfo, setShowInfo] = useState(false);

  const activePlayers = party.filter((member) => !member.isNpc);
  const readyCount = templates.filter((entry) => entry.assignmentStatus === 'unassigned').length;
  const pendingCount = templates.filter((entry) => entry.assignmentStatus === 'pending').length;
  const acceptedCount = templates.filter((entry) => entry.assignmentStatus === 'accepted').length;

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((entry) => {
      if (!matchesStatusFilter(entry, statusFilter)) return false;
      if (!needle) return true;
      const statHaystack = (entry.customStats || []).map((stat) => `${stat.name} ${stat.value}`).join(' ');
      const haystack = `${entry.name || ''} ${entry.subtitle || ''} ${entry.bio || ''} ${statHaystack}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [templates, query, statusFilter]);

  const statusFilterOptions = useMemo(() => [
    { value: 'all', label: `Alles (${templates.length})` },
    { value: 'ready', label: `Klaar (${readyCount})` },
    { value: 'pending', label: `Open (${pendingCount})` },
    { value: 'active', label: `Actief (${acceptedCount})` },
  ], [templates.length, readyCount, pendingCount, acceptedCount]);

  const handleRestore = (backup) => {
    if (!window.confirm(`Herstel ${backup.playerName || 'deze speler'} naar de vorige profielstaat?`)) return;
    onRestoreBackup?.(backup);
  };

  const visibleLabel = filteredTemplates.length === 1
    ? '1 in beeld'
    : `${filteredTemplates.length} in beeld`;

  return (
    <div className="tv-view-shell tv-prep-view relative z-10 flex h-full flex-col">
      <div className="tv-view-shell-header tv-prep-view__header flex shrink-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
        <h2 className="flex items-center gap-2 font-fantasy text-xs font-medium uppercase tracking-[0.18em] tv-text md:text-sm">
          <Crown className="tv-view-title-icon" aria-hidden />
          Voorbereidingen
        </h2>

        <div className="tv-toolbar w-full sm:w-auto">
          <div className="tv-toolbar__stat">
            <span className="tv-toolbar__stat-label">Profielen</span>
            <span className="tv-toolbar__stat-value">{templates.length}</span>
          </div>
          <button
            type="button"
            onClick={onCreatePreparation}
            title="Nieuw profiel"
            aria-label="Nieuw profiel"
            className="tv-toolbar__btn tv-toolbar__btn--square tv-button-primary"
          >
            <Plus className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      <div className="tv-view-shell-body tv-prep-view__body relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="tv-prep-layout">
          <section className="tv-prep-main">
            <div className="tv-prep-main__toolbar">
              <div className="tv-prep-main__head">
                <h3 className="tv-panel-title text-base">Bibliotheek</h3>
                <span className="tv-prep-panel__badge">{visibleLabel}</span>
              </div>

              <div className="tv-prep-main__controls">
                <label className="relative min-w-0 flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" aria-hidden />
                  <input
                    type="search"
                    placeholder="Zoek op naam, stats of notities…"
                    className="tv-input-surface tv-chat-compose-input h-10 w-full pl-9 pr-3 text-sm outline-none transition-colors"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>

                <SegmentedControl
                  block
                  value={statusFilter}
                  options={statusFilterOptions}
                  onChange={setStatusFilter}
                  aria-label="Filter op status"
                  className="tv-prep-segmented"
                />
              </div>
            </div>

            <div className="tv-prep-main__body no-scrollbar">
              {filteredTemplates.length === 0 ? (
                <div className="tv-prep-empty">
                  <div className="tv-prep-empty__glow" aria-hidden />
                  <div className="tv-prep-empty__icon">
                    <Crown className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="tv-prep-empty__title">
                    {templates.length === 0
                      ? 'Nog geen voorbereide personages'
                      : 'Geen profielen gevonden'}
                  </h3>
                  <p className="tv-prep-empty__copy">
                    {templates.length === 0
                      ? 'Zet een nieuw profiel klaar of start met het huidige profiel van een speler in de sessie.'
                      : 'Pas je zoekterm of filter aan, of maak een nieuw profiel aan.'}
                  </p>
                  {templates.length === 0 ? (
                    <div className="tv-prep-empty__actions">
                      <button
                        type="button"
                        onClick={onCreatePreparation}
                        className="tv-toolbar__btn tv-button-primary gap-2 px-4"
                      >
                        <Plus className="h-4 w-4" />
                        Profiel opzetten
                      </button>
                      {activePlayers.length > 0 ? (
                        <button
                          type="button"
                          onClick={onCreateFromPlayer}
                          className="tv-toolbar__btn tv-panel-inset tv-text tv-hover-surface hover:text-[var(--tv-accent)]"
                        >
                          <UserRound className="h-4 w-4" />
                          Van speler starten
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="tv-prep-list">
                  {filteredTemplates.map((preparation) => (
                    <PreparationCard
                      key={preparation.id}
                      preparation={preparation}
                      party={party}
                      activePlayers={activePlayers}
                      onEditPreparation={onEditPreparation}
                      onAssignPreparation={onAssignPreparation}
                      onDeletePreparation={onDeletePreparation}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="tv-prep-sidebar">
            <div className="tv-prep-sidebar__glow" aria-hidden />

            <div className="tv-prep-sidebar__chrome">
              <div className="tv-prep-sidebar__section-head">
                <h3 className="tv-prep-sidebar__title">Overzicht</h3>
                <button
                  type="button"
                  onClick={() => setShowInfo((value) => !value)}
                  className={`tv-prep-sidebar__info-btn ${showInfo ? 'is-active' : ''}`}
                  title={showInfo ? 'Verberg uitleg' : 'Toon uitleg'}
                  aria-pressed={showInfo}
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <div className="tv-prep-stat-grid">
                {[
                  { label: 'Klaar', value: readyCount, tone: 'ready' },
                  { label: 'Open', value: pendingCount, tone: 'open' },
                  { label: 'In gebruik', value: acceptedCount, tone: 'active' },
                  { label: 'Herstel', value: backups.length, tone: 'restore' },
                ].map((item) => (
                  <div key={item.label} className={`tv-prep-stat tv-prep-stat--${item.tone}`}>
                    <span className="tv-prep-stat__label">{item.label}</span>
                    <span className="tv-prep-stat__value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {showInfo ? (
              <div className="tv-prep-sidebar__block">
                <div className="tv-prep-info">
                  <div className="tv-prep-info__pills">
                    {['Inventaris blijft', 'Wallet blijft', 'Notities blijven'].map((pill) => (
                      <span key={pill} className="tv-prep-info__pill">{pill}</span>
                    ))}
                  </div>
                  <ol className="tv-prep-info__steps">
                    {[
                      { title: 'Nieuw', body: 'Maak een voorbereiding of bewaar een bestaand spelersprofiel.' },
                      { title: 'Werk af', body: 'Controleer avatar, stats, verborgen eigenschappen en lore.' },
                      { title: 'Toewijzen', body: 'Bied het personage aan een speler aan — zij accepteren of wijzen af.' },
                    ].map((step, index) => (
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
              </div>
            ) : null}

            <div className="tv-prep-sidebar__block tv-prep-sidebar__block--flush">
              <div className="tv-prep-sidebar__section-head">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="tv-prep-sidebar__section-icon" aria-hidden>
                    <History className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="tv-prep-sidebar__title">Herstelpunten</h3>
                </div>
                <span className="tv-prep-sidebar__count">{backups.length}</span>
              </div>

              {backups.length === 0 ? (
                <div className="tv-prep-backups-empty">
                  <div className="tv-prep-backups-empty__icon" aria-hidden>
                    <History className="h-4 w-4" />
                  </div>
                  <p className="tv-prep-backups-empty__copy">
                    Na een acceptatie verschijnt hier automatisch een terugzetpunt voor de speler.
                  </p>
                </div>
              ) : (
                <div className="tv-prep-backup-list">
                  {backups.map((backup) => (
                    <article key={backup.id} className="tv-prep-backup">
                      <div className="tv-prep-backup__head">
                        <div className="min-w-0">
                          <p className="tv-prep-backup__name">{backup.playerName || 'Onbekende speler'}</p>
                          <p className="tv-prep-backup__via">
                            via {backup.templateName || 'Naamloze voorbereiding'}
                          </p>
                        </div>
                        <time className="tv-prep-backup__time">
                          {formatPreparationTime(backup.createdAtMs)}
                        </time>
                      </div>
                      {backup.restoredAtMs ? (
                        <p className="tv-prep-backup__restored">
                          Hersteld {formatPreparationTime(backup.restoredAtMs)}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRestore(backup)}
                        className="tv-prep-backup__restore"
                      >
                        Zet terug
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
