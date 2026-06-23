import React from 'react';

function PlaceholderView({ title, icon: Icon, description }) {
  return (
    <div className="tv-empty-state h-full min-h-[12rem] rounded-xl border-2 border-dashed p-6 md:p-10">
      <div className="tv-chip-surface mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner md:mb-6 md:h-20 md:w-20">
        <Icon className="tv-accent h-8 w-8 opacity-60 md:h-10 md:w-10" />
      </div>
      <h2 className="tv-title-section mb-2 text-xl md:mb-3 md:text-2xl">{title}</h2>
      {description ? (
        <p className="max-w-md font-story text-sm italic tv-text-sub md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default PlaceholderView;
