import React from 'react';

function PlaceholderView({ title, icon: Icon, description }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 border-2 border-dashed border-stone-800 rounded-xl p-6 md:p-10 bg-stone-900/20 backdrop-blur-sm">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner">
        <Icon className="w-8 h-8 md:w-10 md:h-10 text-amber-700/50" />
      </div>
      <h2 className="text-xl md:text-3xl font-bold text-stone-400 mb-2 md:mb-3 font-fantasy tracking-widest uppercase">{title}</h2>
      <p className="max-w-xs md:max-w-md font-story italic text-stone-500 text-sm md:text-lg">
        {description}
      </p>
      <p className="max-w-xs md:max-w-md text-[10px] md:text-xs font-sans text-stone-600 mt-4 md:mt-6 uppercase tracking-widest">
        — Visuele schil gereed voor magie —
      </p>
    </div>
  );
}

export default PlaceholderView;
