import React from 'react';
import { cn } from '@/utils/cn';
import { TheoryParadigm } from '@/types';
import { THEORY_LIST } from '@/constants/theories';

interface TheorySelectorProps {
  selected: TheoryParadigm | null;
  onSelect: (t: TheoryParadigm) => void;
}

export const TheorySelector: React.FC<TheorySelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">第一步：选择扎根理论范式</span>
        {!selected && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse">
            必须选择后才能开始编码
          </span>
        )}
        {selected && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            ✓ 已选择
          </span>
        )}
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {THEORY_LIST.map((theory) => {
          const isSelected = selected === theory.id;
          return (
            <button
              key={theory.id}
              onClick={() => onSelect(theory.id as TheoryParadigm)}
              className={cn(
                'relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                isSelected
                  ? `border-current ${theory.bgColor} ${theory.color} shadow-sm`
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white hover:shadow-sm'
              )}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.15" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className={cn('text-xs font-bold mb-1', isSelected ? 'opacity-100' : 'text-gray-800')}>
                {theory.name}
              </div>
              <div className="text-[10px] text-gray-500 mb-2 leading-relaxed">{theory.author}</div>
              <div className={cn(
                'text-[11px] leading-relaxed',
                isSelected ? 'opacity-90' : 'text-gray-600'
              )}>
                {theory.shortDesc}
              </div>

              {/* Coding level preview */}
              <div className="mt-3 flex flex-col gap-1 w-full">
                {[theory.codingLevels.level1, theory.codingLevels.level2, theory.codingLevels.level3].map(
                  (level, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded text-center',
                        isSelected
                          ? 'bg-white/50 font-medium'
                          : 'bg-white text-gray-500'
                      )}
                    >
                      {['L1 · ', 'L2 · ', 'L3 · '][i]}
                      {level}
                    </div>
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
