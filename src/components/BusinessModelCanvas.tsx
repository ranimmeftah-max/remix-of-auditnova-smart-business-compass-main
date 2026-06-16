import { useTranslation } from "react-i18next";
import { BMC_BLOCKS, type BmcBlocks } from "@/lib/bmc";
import { cn } from "@/lib/utils";

export function BusinessModelCanvas({ blocks }: { blocks: BmcBlocks }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border-2 border-foreground/80 overflow-hidden bg-background">
      <div className="grid grid-cols-5 grid-rows-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,auto)] gap-0">
        {BMC_BLOCKS.map((block) => (
          <div
            key={block.id}
            className={cn(
              "border border-foreground/80 p-3 flex flex-col min-h-[120px] bg-card",
              block.gridClass,
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{block.code}</p>
                <p className="text-xs font-bold leading-tight">{t(block.titleKey)}</p>
              </div>
              <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400 text-foreground text-xs font-bold flex items-center justify-center">
                {block.order}
              </span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed flex-1">
              {blocks[block.id]?.trim() || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
