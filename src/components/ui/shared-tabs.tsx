import { cn } from '@/lib/utils';

export interface SharedTabOption<T extends string> {
  label: string;
  value: T;
}

interface SharedTabsProps<T extends string> {
  tabs: SharedTabOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SharedTabs<T extends string>({
  tabs,
  activeValue,
  onChange,
  className,
}: SharedTabsProps<T>) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-border bg-background sticky top-0 z-50',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeValue;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className="relative flex-1 cursor-pointer select-none px-0 py-[11px] text-[13px] font-semibold transition-colors"
            style={{
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
            }}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-[-1px] left-[15%] right-[15%] h-[2px] rounded-t-[2px] bg-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
