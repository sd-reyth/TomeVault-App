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
import { formatCustomStatValue, formatSignedModifier } from '../lib/statModifiers';
import { getIntlLocale } from '../lib/localeFormat';
import { useT } from '../i18n/useT';
import { confirmDialog } from '../i18n/dialogs.js';
import SegmentedControl from '../ui/SegmentedControl';
import TvImage from './TvImage';

function formatPreparationTime(ms, t) {
  if (!ms) return t('time.justNow');
  return new Date(ms).toLocaleString(getIntlLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatModifier(value) {
  return formatSignedModifier(value);
}

function getStatusMeta(preparation, party, t) {
  const playerFallback = t('picker.playerFallback');
  const assignedPlayer = party.find((member) => member.id === preparation.assignedToUid);
  const preparedPlayer = party.find((member) => member.id === preparation.preparedForUid);
  const assignedName = assignedPlayer?.name || playerFallback;
  const preparedName = preparedPlayer?.name || playerFallback;

  if (preparation.assignmentStatus === 'pending') {
    return {
      label: t('status.waitingFor', { name: assignedName }),
      className: 'tv-prep-status--pending',
    };
  }

  if (preparation.assignmentStatus === 'accepted') {
    return {
      label: t('status.inUse'),
      className: 'tv-prep-status--active',
    };
  }

  if (preparation.assignmentStatus === 'rejected') {
    return {
      label: t('status.rejected'),
      className: 'tv-tone-enemy-chip',
    };
  }

  if (preparation.preparedForUid) {
    return {
      label: t('status.forPlayer', { name: preparedName }),
      className: 'tv-prep-status--linked',
    };
  }

  return {
    label: t('status.done'),
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
      value: formatCustomStatValue(stat),
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
  onReturnToPool,
}) {
  const { t } = useT('preparations');
  const statusMeta = getStatusMeta(preparation, party, t);
  const statPills = getPreparationStatPills(preparation);

  const handleDelete = () => {
    if (!confirmDialog('preparations:card.deleteConfirm', { name: preparation.name })) return;
    onDeletePreparation?.(preparation);
  };

  return (
    <article className="tv-prep-card tv-view-card">
      <div className="tv-prep-card__media tv-image-frame">
        <TvImage
          src={resolveDisplayAvatar(preparation.imageUrl, preparation.id)}
          alt={preparation.name || t('card.preparedCharacter')}
        />
      </div>

      <div className="tv-prep-card__main">
        <div className="tv-prep-card__head">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold tracking-[0.04em] tv-text">
                {preparation.name || t('card.unnamedCharacter')}
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
            {formatPreparationTime(preparation.updatedAtMs, t)}
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
          {preparation.bio || t('card.noBio')}
        </p>
      </div>

      <div className="tv-prep-card__actions" role="group" aria-label={t('card.actionsAria')}>
        <button
          type="button"
          onClick={() => onEditPreparation?.(preparation)}
          className="tv-prep-card__action"
          title={t('card.editTitle')}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>{t('card.edit')}</span>
        </button>
        <button
          type="button"
          onClick={() => onAssignPreparation?.(preparation)}
          disabled={activePlayers.length === 0}
          className="tv-prep-card__action tv-prep-card__action--primary"
          title={t('card.assignTitle')}
        >
          <Hand className="h-3.5 w-3.5" />
          <span>{t('card.assign')}</span>
        </button>
        {preparation.assignmentStatus === 'rejected' ? (
          <button
            type="button"
            onClick={() => onReturnToPool?.(preparation)}
            className="tv-prep-card__action"
            title={t('card.libraryTitle')}
          >
            <History className="h-3.5 w-3.5" />
            <span>{t('card.library')}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDelete}
          className="tv-prep-card__action tv-prep-card__action--danger"
          title={t('card.deleteTitle')}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{t('card.delete')}</span>
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
  onReturnToPool,
}) {
  const { t } = useT('preparations');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInfo, setShowInfo] = useState(false);
  const [mobileOverviewOpen, setMobileOverviewOpen] = useState(false);
  const [mobileBackupsOpen, setMobileBackupsOpen] = useState(false);

  const activePlayers = party.filter((member) => !member.isNpc);
  const readyCount = templates.filter((entry) => entry.assignmentStatus === 'unassigned').length;
  const pendingCount = templates.filter((entry) => entry.assignmentStatus === 'pending').length;
  const acceptedCount = templates.filter((entry) => entry.assignmentStatus === 'accepted').length;

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((entry) => {
      if (!matchesStatusFilter(entry, statusFilter)) return false;
      if (!needle) return true;
      const statHaystack = (entry.customStats || []).map((stat) => `${stat.name} ${stat.value} ${stat.showModifier ? formatCustomStatValue(stat) : ''}`).join(' ');
      const haystack = `${entry.name || ''} ${entry.subtitle || ''} ${entry.bio || ''} ${statHaystack}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [templates, query, statusFilter]);

  const statusFilterOptions = useMemo(() => [
    { value: 'all', label: t('status.all'), count: templates.length },
    { value: 'ready', label: t('status.ready'), count: readyCount },
    { value: 'pending', label: t('status.pending'), count: pendingCount },
    { value: 'active', label: t('status.active'), count: acceptedCount },
  ], [t, templates.length, readyCount, pendingCount, acceptedCount]);

  const handleRestore = (backup) => {
    const name = backup.playerName || t('backup.thisPlayer');
    if (!confirmDialog('preparations:backup.restoreConfirm', { name })) return;
    onRestoreBackup?.(backup);
  };

  const visibleLabel = filteredTemplates.length === 1
    ? t('view.visibleOne')
    : t('view.visibleMany', { count: filteredTemplates.length });

  const infoPills = [
    t('info.inventoryStays'),
    t('info.walletStays'),
    t('info.notesStay'),
  ];

  const infoSteps = [
    { title: t('info.stepNewTitle'), body: t('info.stepNewBody') },
    { title: t('info.stepWorkTitle'), body: t('info.stepWorkBody') },
    { title: t('info.stepAssignTitle'), body: t('info.stepAssignBody') },
  ];

  const statGridItems = [
    { label: t('status.ready'), value: readyCount, tone: 'ready' },
    { label: t('status.pending'), value: pendingCount, tone: 'open' },
    { label: t('status.inUse'), value: acceptedCount, tone: 'active' },
    { label: t('status.restore'), value: backups.length, tone: 'restore' },
  ];

  return (
    <div className="tv-view-shell tv-prep-view relative z-10 flex h-full flex-col">
      <div className="tv-view-shell-header tv-prep-view__header flex shrink-0 flex-row items-center justify-between gap-2 p-3 md:p-4">
        <h2 className="flex min-w-0 items-center gap-2 font-fantasy text-xs font-medium uppercase tracking-[0.18em] tv-text md:text-sm">
          <Crown className="tv-view-title-icon" aria-hidden />
          {t('view.title')}
        </h2>

        <div className="tv-toolbar shrink-0">
          <div className="tv-prep-toolbar-stat tv-toolbar__stat">
            <span className="tv-toolbar__stat-label">{t('view.profiles')}</span>
            <span className="tv-toolbar__stat-value">{templates.length}</span>
          </div>
          <span className="tv-prep-header-count" aria-label={t('view.profilesAria', { count: templates.length })}>
            {templates.length}
          </span>
          <button
            type="button"
            onClick={onCreatePreparation}
            title={t('view.newProfile')}
            aria-label={t('view.newProfileAria')}
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
              <div className="tv-prep-main__head max-md:hidden">
                <h3 className="tv-panel-title text-base">{t('view.library')}</h3>
                <span className="tv-prep-panel__badge">{visibleLabel}</span>
              </div>

              <div className="tv-prep-main__controls">
                <label className="relative min-w-0 flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" aria-hidden />
                  <input
                    type="search"
                    placeholder={t('view.searchPlaceholder')}
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
                  aria-label={t('view.filterAria')}
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
                      ? t('empty.noCharacters')
                      : t('empty.noResults')}
                  </h3>
                  <p className="tv-prep-empty__copy">
                    {templates.length === 0
                      ? t('empty.noCharactersHint')
                      : t('empty.noResultsHint')}
                  </p>
                  {templates.length === 0 ? (
                    <div className="tv-prep-empty__actions">
                      <button
                        type="button"
                        onClick={onCreatePreparation}
                        className="tv-toolbar__btn tv-button-primary gap-2 px-4"
                      >
                        <Plus className="h-4 w-4" />
                        {t('empty.setupProfile')}
                      </button>
                      {activePlayers.length > 0 ? (
                        <button
                          type="button"
                          onClick={onCreateFromPlayer}
                          className="tv-toolbar__btn tv-panel-inset tv-text tv-hover-surface hover:text-[var(--tv-accent)]"
                        >
                          <UserRound className="h-4 w-4" />
                          {t('empty.fromPlayer')}
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
                      onReturnToPool={onReturnToPool}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="tv-prep-sidebar">
            <div className="tv-prep-sidebar__glow" aria-hidden />

            <section className="tv-prep-mobile-fold">
              <button
                type="button"
                onClick={() => setMobileOverviewOpen((open) => !open)}
                className="tv-prep-mobile-fold__trigger"
                aria-expanded={mobileOverviewOpen}
              >
                <span>{t('view.overview')}</span>
                <span className="tv-prep-mobile-fold__meta">{t('view.profilesCount', { count: templates.length })}</span>
              </button>
              <div className={`tv-prep-mobile-fold__body ${mobileOverviewOpen ? 'is-open' : ''}`}>
                <div className="tv-prep-sidebar__chrome">
                  <div className="tv-prep-sidebar__section-head">
                    <h3 className="tv-prep-sidebar__title">{t('view.overview')}</h3>
                    <button
                      type="button"
                      onClick={() => setShowInfo((value) => !value)}
                      className={`tv-prep-sidebar__info-btn ${showInfo ? 'is-active' : ''}`}
                      title={showInfo ? t('view.hideInfo') : t('view.showInfo')}
                      aria-pressed={showInfo}
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>

                  <div className="tv-prep-stat-grid">
                    {statGridItems.map((item) => (
                      <div key={item.tone} className={`tv-prep-stat tv-prep-stat--${item.tone}`}>
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
                        {infoPills.map((pill) => (
                          <span key={pill} className="tv-prep-info__pill">{pill}</span>
                        ))}
                      </div>
                      <ol className="tv-prep-info__steps">
                        {infoSteps.map((step, index) => (
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
              </div>
            </section>

            <section className="tv-prep-mobile-fold">
              <button
                type="button"
                onClick={() => setMobileBackupsOpen((open) => !open)}
                className="tv-prep-mobile-fold__trigger"
                aria-expanded={mobileBackupsOpen}
              >
                <span className="inline-flex items-center gap-2">
                  <History className="h-3.5 w-3.5" aria-hidden />
                  {t('view.restorePoints')}
                </span>
                <span className="tv-prep-mobile-fold__meta">{backups.length}</span>
              </button>
              <div className={`tv-prep-mobile-fold__body ${mobileBackupsOpen ? 'is-open' : ''}`}>
                <div className="tv-prep-sidebar__block tv-prep-sidebar__block--flush">
                  <div className="tv-prep-sidebar__section-head">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="tv-prep-sidebar__section-icon" aria-hidden>
                        <History className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="tv-prep-sidebar__title">{t('view.restoreSection')}</h3>
                    </div>
                    <span className="tv-prep-sidebar__count">{backups.length}</span>
                  </div>

                  {backups.length === 0 ? (
                    <div className="tv-prep-backups-empty">
                      <div className="tv-prep-backups-empty__icon" aria-hidden>
                        <History className="h-4 w-4" />
                      </div>
                      <p className="tv-prep-backups-empty__copy">
                        {t('backup.emptyHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="tv-prep-backup-list">
                      {backups.map((backup) => (
                        <article key={backup.id} className="tv-prep-backup">
                          <div className="tv-prep-backup__head">
                            <div className="min-w-0">
                              <p className="tv-prep-backup__name">{backup.playerName || t('backup.unknownPlayer')}</p>
                              <p className="tv-prep-backup__via">
                                {t('backup.via', { name: backup.templateName || t('backup.unnamedPrep') })}
                              </p>
                            </div>
                            <time className="tv-prep-backup__time">
                              {formatPreparationTime(backup.createdAtMs, t)}
                            </time>
                          </div>
                          {backup.restoredAtMs ? (
                            <p className="tv-prep-backup__restored">
                              {t('backup.restored', { time: formatPreparationTime(backup.restoredAtMs, t) })}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRestore(backup)}
                            className="tv-prep-backup__restore"
                          >
                            {t('backup.restoreButton')}
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
