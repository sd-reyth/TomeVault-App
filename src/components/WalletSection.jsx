import React, { useState } from 'react';

function WalletSection({ title, wallet, isGm, editable = false, onAdjust }) {
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
      label: 'PLATINUM',
      imageSrc: '/assets/coin-platinum.svg',
      glowColor: 'bg-sky-300/20',
    },
    {
      key: 'gold',
      label: 'GOLD',
      imageSrc: '/assets/coin-gold.svg',
      glowColor: 'bg-amber-400/20',
    },
    {
      key: 'silver',
      label: 'SILVER',
      imageSrc: '/assets/coin-silver.svg',
      glowColor: 'bg-slate-200/18',
    },
    {
      key: 'bronze',
      label: 'COPPER',
      imageSrc: '/assets/coin-copper.svg',
      glowColor: 'bg-orange-400/20',
    },
  ];

  const normalizeWallet = (nextWallet) => {
    const safe = coinOrder.reduce((acc, key) => {
      acc[key] = Math.max(0, Number(nextWallet?.[key] || 0));
      return acc;
    }, {});

    const totalBronze =
      safe.platinum * unitFactor.platinum +
      safe.gold * unitFactor.gold +
      safe.silver * unitFactor.silver +
      safe.bronze;

    let remainder = Math.max(0, Math.floor(totalBronze));

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
    if (!isNaN(value)) {
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
    <div className="relative isolate px-2 py-8 md:px-4 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/40 via-emerald-950/12 to-transparent blur-2xl"
      />
      {title && (
        <h2 className="relative z-10 mb-6 text-center text-3xl font-fantasy text-stone-100/95 md:text-5xl">
          {title}
        </h2>
      )}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-start justify-center gap-6 sm:gap-10 md:gap-14">
        {coins.map((coin, index) => (
          <div key={coin.key} className="group relative flex min-w-[74px] flex-col items-center">
            <div
              className={`pointer-events-none absolute -top-5 h-24 w-24 ${coin.glowColor} rounded-full blur-3xl sm:h-28 sm:w-28 md:h-32 md:w-32`}
              aria-hidden="true"
            />
            <img
              src={coin.imageSrc}
              alt={coin.label}
              className="relative z-10 h-14 w-14 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:-translate-y-1 sm:h-16 sm:w-16 md:h-20 md:w-20"
              style={{ animation: `walletFloat 4.6s ease-in-out ${index * 0.24}s infinite` }}
            />

            <div className="mt-5 flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => handleAdjust(coin.key, -1)}
                className="cursor-pointer text-2xl leading-none text-white/30 transition-colors hover:text-[var(--theme-accent)] sm:text-3xl"
                aria-label={`${coin.label} verminderen`}
              >
                ⟨
              </button>

              {editingCoin === coin.key ? (
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={() => handleInputSubmit(coin.key)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(coin.key)}
                  className="w-16 bg-transparent text-center font-fantasy text-3xl font-bold text-white drop-shadow-md focus:outline-none sm:w-20 sm:text-4xl md:text-5xl"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => beginEditCoin(coin.key)}
                  className="min-w-[2.4ch] cursor-text text-center font-fantasy text-3xl font-bold text-white drop-shadow-md sm:text-4xl md:text-5xl"
                  aria-label={`${coin.label} aanpassen`}
                >
                  {wallet?.[coin.key] ?? 0}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAdjust(coin.key, 1)}
                className="cursor-pointer text-2xl leading-none text-white/30 transition-colors hover:text-[var(--theme-accent)] sm:text-3xl"
                aria-label={`${coin.label} verhogen`}
              >
                ⟩
              </button>
            </div>

            <div className="mt-2 text-[9px] uppercase tracking-[0.3em] text-white/40 sm:text-[10px]">
              {coin.label}
            </div>
          </div>
        ))}
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
