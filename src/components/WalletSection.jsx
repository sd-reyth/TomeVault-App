import React, { useMemo, useState } from 'react';
import { COIN_ORDER, UNIT_FACTOR, formatWalletTotal, normalizeWalletShape, walletTotalBronze } from '../lib/walletUtils';

function WalletSection({
  title,
  wallet,
  editable = false,
  onAdjust,
}) {
  const [editingCoin, setEditingCoin] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const coins = [
    { key: 'platinum', label: 'Pt', fullLabel: 'Platinum', iconColor: '#bae6fd' },
    { key: 'gold', label: 'Au', fullLabel: 'Goud', iconColor: '#fcd34d' },
    { key: 'silver', label: 'Ag', fullLabel: 'Zilver', iconColor: '#e2e8f0' },
    { key: 'bronze', label: 'Cu', fullLabel: 'Koper', iconColor: '#fdba74' },
  ];

  const safeWallet = useMemo(() => normalizeWalletShape(wallet), [wallet]);

  const totalBronze = walletTotalBronze(safeWallet);
  const totalLabel = formatWalletTotal(safeWallet);

  const normalizeWallet = (nextWallet) => {
    const safe = normalizeWalletShape(nextWallet);

    const nextTotalBronze = walletTotalBronze(safe);
    let remainder = Math.max(0, Math.floor(nextTotalBronze));

    const normalized = {
      platinum: Math.floor(remainder / UNIT_FACTOR.platinum),
      gold: 0,
      silver: 0,
      bronze: 0,
    };

    remainder %= UNIT_FACTOR.platinum;
    normalized.gold = Math.floor(remainder / UNIT_FACTOR.gold);
    remainder %= UNIT_FACTOR.gold;
    normalized.silver = Math.floor(remainder / UNIT_FACTOR.silver);
    remainder %= UNIT_FACTOR.silver;
    normalized.bronze = remainder;

    return normalized;
  };

  const applyWalletDiff = (targetWallet) => {
    if (!onAdjust) return;
    COIN_ORDER.forEach((key) => {
      const currentValue = Number(wallet?.[key] || 0);
      const nextValue = Number(targetWallet?.[key] || 0);
      const diff = nextValue - currentValue;
      if (diff !== 0) onAdjust(key, diff);
    });
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
    <div className="tv-wallet-strip-wrap tv-wallet-strip-wrap--subtle">
      {title ? (
        <div className="tv-wallet-strip-wrap__label">
          <span>{title}</span>
          {totalBronze > 0 ? (
            <span className="tv-wallet-strip-wrap__total">{totalLabel}</span>
          ) : null}
        </div>
      ) : null}

      <div className="tv-wallet-strip tv-wallet-strip--subtle">
        {coins.map((coin) => (
          <div key={coin.key} className="tv-wallet-strip__coin">
            <div className="tv-wallet-strip__coin-head">
              <span
                className="tv-wallet-strip__badge"
                style={{ color: coin.iconColor }}
                aria-hidden="true"
              >
                {coin.label}
              </span>
              <span className="tv-wallet-strip__name">{coin.fullLabel}</span>
            </div>

            <div className="tv-wallet-strip__value-row">
              {editable ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAdjust(coin.key, -1)}
                    className="tv-wallet-stepper-btn tv-wallet-strip__stepper"
                    aria-label={`${coin.fullLabel} verminderen`}
                  >
                    −
                  </button>

                  {editingCoin === coin.key ? (
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onBlur={() => handleInputSubmit(coin.key)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(coin.key)}
                      className="hide-arrows tv-wallet-strip__input"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEditCoin(coin.key)}
                      className="tv-wallet-strip__amount"
                      aria-label={`${coin.fullLabel} aanpassen`}
                    >
                      {safeWallet[coin.key]}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAdjust(coin.key, 1)}
                    className="tv-wallet-stepper-btn tv-wallet-strip__stepper"
                    aria-label={`${coin.fullLabel} verhogen`}
                  >
                    +
                  </button>
                </>
              ) : (
                <span className="tv-wallet-strip__amount tv-wallet-strip__amount--readonly">
                  {safeWallet[coin.key]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WalletSection;
