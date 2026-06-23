import React, { useState } from 'react';
import { Crown, Info, Plus, Search, ShieldCheck, Pencil, Hand, Trash } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';

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
  const assignedName = assignedPlayer?.name || 'speler';

  if (preparation.assignmentStatus === 'pending') {
    return {
      label: `Wacht op ${assignedName}`,
      className: 'border-amber-900/50 bg-amber-950/40 text-amber-300',
    };
  }

  if (preparation.assignmentStatus === 'accepted') {
    return {
      label: 'In gebruik',
      className: 'border-amber-900/50 bg-amber-950/30 text-amber-300',
    };
  }

  if (preparation.assignmentStatus === 'rejected') {
    return {
      label: 'Afgeslagen',
      className: 'border-rose-900/40 bg-rose-950/20 text-rose-300',
    };
  }

  return {
    label: 'Klaar',
    className: 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface tv-text-sub',
  };
}

function getPreparationStatPills(preparation) {
  const pills = [
    `HP ${Number(preparation.hp ?? 0)}/${Number(preparation.maxHp ?? preparation.hp ?? 0)}`,
    `AC ${Number(preparation.ac ?? 10)}`,
    `Init ${formatModifier(preparation.initMod)}`,
  ];

  return pills.concat(
    (preparation.customStats || []).slice(0, 2).map((stat) => `${stat.name} ${stat.value}`)
  );
}

export default function PreparationsView({
  templates,
  backups,
  party,
  onCreatePreparation,
  onEditPreparation,
  onDeletePreparation,
  onAssignPreparation,
  onRestoreBackup,
}) {
  const [query, setQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const activePlayers = party.filter((member) => !member.isNpc);
  const pendingTemplates = templates.filter((entry) => entry.assignmentStatus === 'pending');
  const readyCount = templates.filter((entry) => entry.assignmentStatus === 'unassigned').length;
  const acceptedCount = templates.filter((entry) => entry.assignmentStatus === 'accepted').length;

  const filteredTemplates = templates.filter((entry) => {
    const statHaystack = (entry.customStats || []).map((stat) => `${stat.name} ${stat.value}`).join(' ');
    const haystack = `${entry.name || ''} ${entry.subtitle || ''} ${entry.bio || ''} ${statHaystack}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const handleDelete = (preparation) => {
    if (!window.confirm(`Verwijder voorbereiding "${preparation.name}"?`)) return;
    onDeletePreparation?.(preparation);
  };

  const handleRestore = (backup) => {
    if (!window.confirm(`Herstel ${backup.playerName || 'deze speler'} naar de vorige profielstaat?`)) return;
    onRestoreBackup?.(backup);
  };

  return (
    <section className="tv-view-shell relative z-10 h-full">
      <header className="tv-view-shell-header flex shrink-0 flex-col gap-4 p-3 xl:flex-row xl:items-center xl:justify-between md:p-4">
          <div className="max-w-2xl min-w-0">
            <h1 className="font-fantasy text-2xl font-bold tracking-[0.1em] tv-heading-shimmer md:text-3xl">Voorbereidingen</h1>
            <p className="tv-panel-copy mt-1 text-xs md:mt-2 md:text-sm">
              Volledige karakterprofielen die je bewaart, verfijnt en later soepel aan een speler koppelt.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
            <label className="tv-input-surface flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 shadow-inner xl:min-w-[300px]">
              <Search className="h-4 w-4 shrink-0 tv-muted" />
              <input
                type="search"
                placeholder="Zoek een voorbereiding"
                className="w-full bg-transparent text-sm outline-none"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={onCreatePreparation}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm uppercase tracking-[0.16em] active:scale-[0.985] sm:w-auto tv-button-primary"
            >
              <Plus className="h-4 w-4" />
              Nieuw
            </button>
          </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar md:p-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_296px] xl:gap-4">
        <div className="tv-panel-shell min-h-0 p-4 md:p-5">
          <div className="flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="tv-panel-title">Bibliotheek</h2>
              <p className="tv-panel-copy mt-1 text-sm leading-6">Profielen die klaarstaan om te verfijnen, bewaren of uit te delen.</p>
            </div>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub">
              {filteredTemplates.length} in beeld
            </span>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="tv-panel-block flex min-h-[260px] flex-col items-center justify-center border-dashed px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--tv-accent),transparent_60%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_86%)] tv-accent shadow-inner">
                <Crown className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-fantasy text-xl tracking-[0.12em] tv-text">
                {templates.length === 0 ? 'Nog geen voorbereide personages' : 'Geen treffers voor deze zoekopdracht'}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-7 tv-muted">
                {templates.length === 0
                  ? 'Open Nieuw om een volledig profiel klaar te zetten of bewaar een bestaand spelersprofiel rechtstreeks vanuit het karaktervenster.'
                  : 'Pas je zoekterm aan of open een bestaand profiel om het verder te verfijnen.'}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row" />
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredTemplates.map((preparation) => {
                const statusMeta = getStatusMeta(preparation, party);
                const statPills = getPreparationStatPills(preparation);
                return (
                  <article
                    key={preparation.id}
                    className="grid gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-4 shadow-[0_18px_46px_rgba(0,0,0,0.24)] transition-all duration-200 ease-out tv-hover-surface hover:border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] md:grid-cols-[72px_minmax(0,1fr)]"
                  >
                    <div className="flex justify-center md:justify-start">
                      <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface shadow-inner">
                        <img
                          src={resolveDisplayAvatar(preparation.imageUrl, preparation.id)}
                          alt={preparation.name || 'Voorbereid personage'}
                          className="h-full w-full scale-[1.15] object-cover"
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold tracking-[0.08em] tv-text">{preparation.name || 'Naamloos personage'}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                          {preparation.subtitle ? (
                            <p className="mt-1 text-sm italic tv-text-sub">{preparation.subtitle}</p>
                          ) : null}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.18em] tv-muted">
                          Bijgewerkt {formatPreparationTime(preparation.updatedAtMs)}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {statPills.map((pill) => (
                          <span
                            key={`${preparation.id}-${pill}`}
                            className="rounded-full border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] tv-text"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-7 tv-text-sub">
                        {preparation.bio || 'Nog geen achtergrond of notities toegevoegd.'}
                      </p>

                      <div className="prep-card-actions mt-4" role="group" aria-label="Profielacties">
                        <button
                          type="button"
                          onClick={() => onEditPreparation?.(preparation)}
                          title="Bewerken"
                          aria-label="Bewerken"
                          className="prep-card-action prep-card-action-edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAssignPreparation?.(preparation)}
                          disabled={activePlayers.length === 0}
                          title="Toewijzen aan speler"
                          aria-label="Toewijzen aan speler"
                          className="prep-card-action prep-card-action-assign"
                        >
                          <Hand className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(preparation)}
                          title="Verwijderen"
                          aria-label="Verwijderen"
                          className="prep-card-action prep-card-action-delete"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="tv-panel-shell p-4 md:p-5 xl:sticky xl:top-3">
          <div className="flex items-center justify-between gap-3 tv-text">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 tv-accent" />
              <h2 className="font-fantasy text-lg uppercase tracking-[0.14em]">Overzicht</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowInfo((value) => !value)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 ease-out ${showInfo ? 'border-[var(--tv-accent)]/30 bg-[color-mix(in_srgb,var(--tv-accent),transparent_86%)] tv-accent' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text-sub tv-hover-surface hover:text-[var(--tv-accent)]'}`}
              title={showInfo ? 'Verberg extra uitleg' : 'Toon extra uitleg'}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {[
              { label: 'Klaar', value: readyCount },
              { label: 'Open', value: pendingTemplates.length },
              { label: 'In gebruik', value: acceptedCount },
              { label: 'Herstelpunten', value: backups.length },
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] tv-muted">{item.label}</div>
                <div className="mt-2 font-fantasy text-2xl tv-text">{item.value}</div>
              </article>
            ))}
          </div>

          {showInfo ? (
            <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface p-4">
              <div className="flex flex-wrap gap-2">
                {['Inventaris blijft', 'Wallet blijft', 'Notities blijven'].map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] tv-text-sub"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { title: '1. Nieuw', body: 'Maak een voorbereiding aan of bewaar een bestaand spelersprofiel.' },
                  { title: '2. Werk het af', body: 'Controleer avatar, stats, verborgen eigenschappen en lore.' },
                  { title: '3. Toewijzen aan speler', body: 'Selecteer daarna direct de speler aan wie je dit personage wilt aanbieden.' },
                ].map((step) => (
                  <article key={step.title} className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/80 tv-panel-inset p-3">
                    <div className="text-xs font-fantasy uppercase tracking-[0.14em] tv-text">{step.title}</div>
                    <p className="mt-2 text-sm leading-6 tv-muted">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/80 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-fantasy text-sm uppercase tracking-[0.14em] tv-text">Herstelpunten</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] tv-muted">
                  {backups.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowBackups((value) => !value)}
                  className="rounded-md border border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] tv-chip-surface px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] tv-text transition-colors hover:border-amber-700/50 hover:text-amber-300 xl:hidden"
                >
                  {showBackups ? 'Verberg' : 'Toon'}
                </button>
              </div>
            </div>

            {(showBackups || backups.length === 0) ? (
              backups.length === 0 ? (
                <p className="mt-4 text-sm leading-7 tv-muted">Na een acceptatie verschijnt hier automatisch een terugzetpunt.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {backups.map((backup) => (
                    <article key={backup.id} className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] tv-muted">
                        Opgeslagen {formatPreparationTime(backup.createdAtMs)}
                      </p>
                      <div className="mt-2 text-sm font-medium tv-text">{backup.playerName || 'Onbekende speler'}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] tv-muted">via {backup.templateName || 'Naamloze voorbereiding'}</div>
                      {backup.restoredAtMs ? (
                        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-amber-400">
                          Hersteld {formatPreparationTime(backup.restoredAtMs)}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRestore(backup)}
                        className="mt-3 w-full rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface px-3 py-2 text-xs tracking-[0.14em] tv-text transition-all duration-200 ease-out hover:tv-input-surface hover:border-amber-500/30 hover:text-amber-300"
                      >
                        Zet terug
                      </button>
                    </article>
                  ))}
                </div>
              )
            ) : (
              <p className="mt-4 text-sm leading-7 tv-muted xl:hidden">Herstelpunten verborgen voor een compact mobiel overzicht.</p>
            )}
          </div>
        </aside>
        </div>
      </div>
    </section>
  );
}