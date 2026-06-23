import React, { useMemo, useState } from 'react';

function WalletSection({
  title,
  wallet,
  isGm,
  editable = false,
  onAdjust,
  description,
  onPrimaryAction,
  primaryActionLabel = 'Nieuw item',
  hideSummaryCard = false,
}) {
  const [editingCoin, setEditingCoin] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const coinOrder = ['platinum', 'gold', 'silver', 'bronze'];
  const unitFactor = {
    platinum: 1000000,
    gold: 10000,
    silver: 100,
    bronze: 1,
  };

  const coins = [
    {
      key: 'platinum',
      label: 'Platinum',
      icon: 'Pt',
      iconColor: '#bae6fd',
      glowColor: 'bg-sky-300/18',
    },
    {
      key: 'gold',
      label: 'Gold',
      icon: 'Au',
      iconColor: '#fcd34d',
      glowColor: 'bg-amber-400/18',
    },
    {
      key: 'silver',
      label: 'Silver',
      icon: 'Ag',
      iconColor: '#e2e8f0',
      glowColor: 'bg-slate-200/16',
    },
    {
      key: 'bronze',
      label: 'Copper',
      icon: 'Cu',
      iconColor: '#fdba74',
      glowColor: 'bg-orange-400/18',
    },
  ];

  const safeWallet = useMemo(
    () =>
      coinOrder.reduce((acc, key) => {
        acc[key] = Math.max(0, Number(wallet?.[key] || 0));
        return acc;
      }, {}),
    [wallet]
  );

  const totalBronze =
    safeWallet.platinum * unitFactor.platinum +
    safeWallet.gold * unitFactor.gold +
    safeWallet.silver * unitFactor.silver +
    safeWallet.bronze;

  const totalGoldEquivalent = totalBronze / unitFactor.gold;
  const isEmptyWallet = totalBronze === 0;

  const formatGoldEquivalent = (value) => {
    if (value === 0) return '0';
    return Number(value.toFixed(2)).toLocaleString('nl-NL', {
      minimumFractionDigits: value < 1 ? 2 : 0,
      maximumFractionDigits: 2,
    });
  };

  const normalizeWallet = (nextWallet) => {
    const safe = coinOrder.reduce((acc, key) => {
      acc[key] = Math.max(0, Number(nextWallet?.[key] || 0));
      return acc;
    }, {});

    const nextTotalBronze =
      safe.platinum * unitFactor.platinum +
      safe.gold * unitFactor.gold +
      safe.silver * unitFactor.silver +
      safe.bronze;

    let remainder = Math.max(0, Math.floor(nextTotalBronze));

    const normalized = {
      platinum: Math.floor(remainder / unitFactor.platinum),
      gold: 0,
      silver: 0,
      bronze: 0,
    };

    remainder %= unitFactor.platinum;
    normalized.gold = Math.floor(remainder / unitFactor.gold);
    remainder %= unitFactor.gold;
    normalized.silver = Math.floor(remainder / unitFactor.silver);
    remainder %= unitFactor.silver;
    normalized.bronze = remainder;

    return normalized;
  };

  const applyWalletDiff = (targetWallet) => {
    if (!onAdjust) return;
    coinOrder.forEach((key) => {
      const currentValue = Number(wallet?.[key] || 0);
      const nextValue = Number(targetWallet?.[key] || 0);
      const diff = nextValue - currentValue;
      if (diff !== 0) onAdjust(key, diff);
    });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputSubmit = (coinKey) => {
    if (!editable || !onAdjust) {
      setEditingCoin(null);
      setInputValue('');
      return;
    }

    const value = parseInt(inputValue, 10);
    if (!Number.isNaN(value)) {
      const draftWallet = {
        ...wallet,
        [coinKey]: Math.max(0, value),
      };
      const normalized = normalizeWallet(draftWallet);
      applyWalletDiff(normalized);
    }

    setEditingCoin(null);
    setInputValue('');
  };

  const handleAdjust = (coinKey, delta) => {
    if (!editable || !onAdjust) return;

    const draftWallet = {
      ...wallet,
      [coinKey]: Math.max(0, Number(wallet?.[coinKey] || 0) + delta),
    };
    const normalized = normalizeWallet(draftWallet);
    applyWalletDiff(normalized);
  };

  const beginEditCoin = (coinKey) => {
    if (!editable) return;
    setEditingCoin(coinKey);
    setInputValue(String(wallet?.[coinKey] ?? 0));
  };

  return (
    <div className="relative isolate px-2 py-4 md:px-4 md:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/50 via-fuchsia-950/16 to-transparent blur-2xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {(title || description) && (
          <div className="mb-6 text-center md:mb-8">
            {title && (
              <h2 className="text-3xl font-fantasy font-semibold tv-text/95 md:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mx-auto mt-2 max-w-2xl text-sm tv-text/80 md:text-base">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-4 md:gap-4">
          {coins.map((coin, index) => (
            <div
              key={coin.key}
              className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-zinc-950/45 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--tv-accent)]/45 hover:shadow-[0_16px_34px_rgba(0,0,0,0.42)]"
            >
              <div
                className={`pointer-events-none absolute -top-5 left-1/2 h-24 w-24 -translate-x-1/2 ${coin.glowColor} rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-90`}
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-col items-center">
                <div
                  aria-label={coin.label}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-zinc-950/90 text-xl font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105"
                  style={{ animation: `walletFloat 4.6s ease-in-out ${index * 0.24}s infinite`, color: coin.iconColor }}
                >
                  <span className="leading-none" aria-hidden="true">{coin.icon}</span>
                </div>

                <div className="mb-1 text-[11px] uppercase tracking-[0.2em] tv-text-sub/90">
                  {coin.label}
                </div>

                <div className="mb-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjust(coin.key, -1)}
                    className="h-8 w-8 rounded-md border border-white/12 bg-black/30 text-sm leading-none text-white/40 transition-colors hover:border-white/30 hover:text-[var(--tv-accent)] md:h-7 md:w-7"
                    aria-label={`${coin.label} verminderen`}
                  >
                    -
                  </button>

                  {editingCoin === coin.key ? (
                    <input
                      type="number"
                      value={inputValue}
                      onChange={handleInputChange}
                      onBlur={() => handleInputSubmit(coin.key)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(coin.key)}
                      className="hide-arrows w-14 bg-transparent text-center font-fantasy text-2xl font-bold text-white drop-shadow-md focus:outline-none md:text-3xl"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEditCoin(coin.key)}
                      className="min-w-[2.4ch] cursor-text text-center font-fantasy text-2xl font-bold text-white drop-shadow-md md:text-3xl"
                      aria-label={`${coin.label} aanpassen`}
                    >
                      {safeWallet[coin.key]}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAdjust(coin.key, 1)}
                    className="h-8 w-8 rounded-md border border-white/12 bg-black/30 text-sm leading-none text-white/40 transition-colors hover:border-white/30 hover:text-[var(--tv-accent)] md:h-7 md:w-7"
                    aria-label={`${coin.label} verhogen`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!hideSummaryCard ? (
        <div className="rounded-2xl border border-white/12 bg-black/35 p-4 shadow-[0_14px_32px_rgba(0,0,0,0.26)] backdrop-blur-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] tv-text-sub">Totale waarde</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums tv-text md:text-3xl">
                {formatGoldEquivalent(totalGoldEquivalent)} goud
              </div>
              <p className="mt-1 text-xs tv-text-sub/80">Automatisch bijgewerkt bij mutaties.</p>
            </div>

            {onPrimaryAction && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-400/35 bg-[linear-gradient(120deg,rgba(146,64,14,0.92),rgba(217,119,6,0.86))] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-amber-50 transition-all duration-200 hover:brightness-110 active:scale-[0.985]"
              >
                + {primaryActionLabel}
              </button>
            )}
          </div>

          {isEmptyWallet && (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 tv-panel-inset px-4 py-3 text-sm tv-text/90">
              {isGm
                ? 'De kas is nog leeg. Voeg een buit-item toe of zet de eerste munten klaar voor het gezelschap.'
                : 'Deze buidel is nog leeg. Voeg een item toe of ontvang buit van de groep.'}
            </div>
          )}
        </div>
        ) : null}
      </div>

      <style>
        {`@keyframes walletFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }`}
      </style>
    </div>
  );
}

export default WalletSection;
