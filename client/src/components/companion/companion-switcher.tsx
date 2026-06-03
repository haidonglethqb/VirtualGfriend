'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { cn, getRelationshipLabel } from '@/lib/utils';
import type { ActiveCharacter } from '@/store/character-store';

interface CompanionSwitcherProps {
  companions: ActiveCharacter[];
  selectedCharacterId: string | null;
  onSelect: (characterId: string) => void;
  className?: string;
}

function getStatusLabel(item: ActiveCharacter) {
  return item.isEnded ? 'Đã chia tay' : getRelationshipLabel(item.relationshipStage);
}

export function CompanionSwitcher({
  companions,
  selectedCharacterId,
  onSelect,
  className,
}: CompanionSwitcherProps) {
  if (companions.length === 0) {
    return null;
  }

  const selectedIndex = Math.max(0, companions.findIndex((item) => item.id === selectedCharacterId));
  const selected = companions[selectedIndex] ?? companions[0];
  const canRotate = companions.length > 1;

  const handlePrevious = () => {
    if (!canRotate) return;
    const previous = selectedIndex === 0 ? companions.length - 1 : selectedIndex - 1;
    onSelect(companions[previous].id);
  };

  const handleNext = () => {
    if (!canRotate) return;
    const next = selectedIndex === companions.length - 1 ? 0 : selectedIndex + 1;
    onSelect(companions[next].id);
  };

  return (
    <div className={cn('rounded-xl border border-[#392830] bg-[#271b21] p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canRotate}
          className="h-8 w-8 rounded-full border border-[#4a3640] text-[#ba9cab] hover:text-white hover:border-love/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Previous companion"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="min-w-0 flex-1 flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-[#181114] border border-[#4a3640] flex items-center justify-center">
            {selected.avatarUrl ? (
              <Image src={selected.avatarUrl} alt={selected.name} width={40} height={40} className="h-full w-full object-cover" sizes="40px" />
            ) : (
              <span className="text-sm font-bold text-love">{selected.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
            <p className="text-xs text-[#ba9cab] truncate">
              {getStatusLabel(selected)} · {selected.affection}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canRotate}
          className="h-8 w-8 rounded-full border border-[#4a3640] text-[#ba9cab] hover:text-white hover:border-love/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Next companion"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {companions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors',
              item.id === selected.id
                ? 'border-love/50 bg-love/15 text-love'
                : 'border-[#4a3640] bg-[#181114] text-[#ba9cab] hover:text-white hover:border-love/30'
            )}
          >
            <span className="max-w-[110px] truncate">{item.name}</span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3 h-3 fill-current" />
              {item.affection}
            </span>
            {item.isEnded && (
              <span className="rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[10px] text-slate-300">
                Ex
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
