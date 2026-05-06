import React, { useState } from 'react';
import { Crown, Info, Plus, Search, ShieldCheck } from 'lucide-react';
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
      className: 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300',
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
    className: 'border-stone-800 bg-stone-950/70 text-stone-400',
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
    <section className="flex h-full flex-col gap-4 md:gap-5">
      <header className="border-b border-stone-800/50 pb-4 md:pb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl min-w-0">
            <h1 className="text-2xl font-bold tracking-wider text-stone-100 font-fantasy md:text-3xl">Voorbereidingen</h1>
            <p className="mt-1 text-xs text-stone-400 font-story italic md:mt-2 md:text-sm">
              Volledige karakterprofielen die je bewaart, verfijnt en later soepel aan een speler koppelt.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-800 bg-stone-950/80 px-3 py-2.5 shadow-inner xl:min-w-[300px]">
              <Search className="h-4 w-4 shrink-0 text-stone-500" />
              <input
                type="search"
                placeholder="Zoek een voorbereiding"
                className="w-full bg-transparent text-sm text-stone-200 outline-none placeholder:text-stone-600"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={onCreatePreparation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 px-5 py-3 text-sm font-fantasy tracking-[0.16em] text-stone-100 shadow-[0_14px_32px_rgba(217,119,6,0.22)] transition-colors hover:from-amber-600 hover:to-amber-500 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Nieuw
            </button>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:gap-5">
        <div className="min-h-[360px] rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4 shadow-inner md:p-5">
          <div className="flex flex-col gap-3 border-b border-stone-800/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-fantasy text-lg uppercase tracking-[0.14em] text-stone-100">Bibliotheek</h2>
              <p className="mt-1 text-sm leading-6 text-stone-500">Profielen die klaarstaan om te verfijnen, bewaren of uit te delen.</p>
            </div>
            <span className="rounded-full border border-stone-800 bg-stone-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
              {filteredTemplates.length} in beeld
            </span>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-800 bg-stone-950/40 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-900/40 bg-amber-950/30 text-amber-400 shadow-inner">
                <Crown className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-fantasy text-xl tracking-[0.12em] text-stone-100">
                {templates.length === 0 ? 'Nog geen voorbereide personages' : 'Geen treffers voor deze zoekopdracht'}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-7 text-stone-500">
                {templates.length === 0
                  ? 'Open Nieuw om een volledig profiel klaar te zetten of bewaar een bestaand spelersprofiel rechtstreeks vanuit het karaktervenster.'
                  : 'Pas je zoekterm aan of open een bestaand profiel om het verder te verfijnen.'}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onCreatePreparation}
                  className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-fantasy tracking-[0.16em] text-stone-950 shadow-[0_14px_32px_rgba(217,119,6,0.22)] transition-colors hover:bg-amber-500"
                >
                  <Plus className="h-4 w-4" />
                  Nieuw
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredTemplates.map((preparation) => {
                const statusMeta = getStatusMeta(preparation, party);
                const statPills = getPreparationStatPills(preparation);
                return (
                  <article
                    key={preparation.id}
                    className="grid gap-4 rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:grid-cols-[72px_minmax(0,1fr)]"
                  >
                    <div className="flex justify-center md:justify-start">
                      <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-inner">
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
                            <h3 className="font-fantasy text-xl tracking-[0.08em] text-stone-100">{preparation.name || 'Naamloos personage'}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                          {preparation.subtitle ? (
                            <p className="mt-1 text-sm italic text-stone-400">{preparation.subtitle}</p>
                          ) : null}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-stone-600">
                          Bijgewerkt {formatPreparationTime(preparation.updatedAtMs)}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {statPills.map((pill) => (
                          <span
                            key={`${preparation.id}-${pill}`}
                            className="rounded-full border border-stone-800 bg-stone-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-400">
                        {preparation.bio || 'Nog geen achtergrond of notities toegevoegd.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onEditPreparation?.(preparation)}
                          className="flex-1 rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2 text-xs font-fantasy tracking-[0.14em] text-stone-200 transition-colors hover:border-amber-700/50 hover:text-amber-300 sm:flex-none"
                        >
                          Bewerken
                        </button>
                        <button
                          type="button"
                          onClick={() => onAssignPreparation?.(preparation)}
                          disabled={activePlayers.length === 0}
                          className="flex-1 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs font-fantasy tracking-[0.14em] text-amber-200 transition-colors hover:bg-amber-900/40 disabled:cursor-not-allowed disabled:border-stone-800 disabled:bg-stone-900/40 disabled:text-stone-600 sm:flex-none"
                        >
                          Toewijzen aan speler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(preparation)}
                          className="flex-1 rounded-lg border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs font-fantasy tracking-[0.14em] text-rose-200 transition-colors hover:bg-rose-900/30 sm:flex-none"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4 shadow-inner md:p-5 xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-3 text-stone-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="font-fantasy text-lg uppercase tracking-[0.14em]">Overzicht</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowInfo((value) => !value)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${showInfo ? 'border-amber-800/50 bg-amber-950/30 text-amber-300' : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:text-amber-300'}`}
              title={showInfo ? 'Verberg extra uitleg' : 'Toon extra uitleg'}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-flow-col auto-cols-[minmax(132px,1fr)] gap-2 overflow-x-auto pb-1 no-scrollbar sm:grid-cols-4 sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible sm:pb-0 xl:grid-cols-2">
            {[
              { label: 'Klaar', value: readyCount },
              { label: 'Open', value: pendingTemplates.length },
              { label: 'In gebruik', value: acceptedCount },
              { label: 'Herstelpunten', value: backups.length },
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{item.label}</div>
                <div className="mt-2 font-fantasy text-2xl text-stone-100">{item.value}</div>
              </article>
            ))}
          </div>

          {showInfo ? (
            <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <div className="flex flex-wrap gap-2">
                {['Inventaris blijft', 'Wallet blijft', 'Notities blijven'].map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-stone-800 bg-stone-900/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400"
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
                  <article key={step.title} className="rounded-lg border border-stone-800/80 bg-stone-950/50 p-3">
                    <div className="text-xs font-fantasy uppercase tracking-[0.14em] text-stone-200">{step.title}</div>
                    <p className="mt-2 text-sm leading-6 text-stone-500">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-stone-800/80 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-fantasy text-sm uppercase tracking-[0.14em] text-stone-200">Herstelpunten</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-stone-800 bg-stone-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-500">
                  {backups.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowBackups((value) => !value)}
                  className="rounded-md border border-stone-700 bg-stone-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-300 transition-colors hover:border-amber-700/50 hover:text-amber-300 xl:hidden"
                >
                  {showBackups ? 'Verberg' : 'Toon'}
                </button>
              </div>
            </div>

            {(showBackups || backups.length === 0) ? (
              backups.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-stone-500">Na een acceptatie verschijnt hier automatisch een terugzetpunt.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {backups.map((backup) => (
                    <article key={backup.id} className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                        Opgeslagen {formatPreparationTime(backup.createdAtMs)}
                      </p>
                      <div className="mt-2 text-sm font-medium text-stone-200">{backup.playerName || 'Onbekende speler'}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-600">via {backup.templateName || 'Naamloze voorbereiding'}</div>
                      {backup.restoredAtMs ? (
                        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-emerald-400">
                          Hersteld {formatPreparationTime(backup.restoredAtMs)}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRestore(backup)}
                        className="mt-3 w-full rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2 text-xs font-fantasy tracking-[0.14em] text-stone-200 transition-colors hover:border-amber-700/50 hover:text-amber-300"
                      >
                        Zet terug
                      </button>
                    </article>
                  ))}
                </div>
              )
            ) : (
              <p className="mt-4 text-sm leading-7 text-stone-500 xl:hidden">Herstelpunten verborgen voor een compact mobiel overzicht.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}