/**
 * Instant loading UI for every page under /projects/[projectId]/.
 *
 * Next.js renders this _immediately_ when the user clicks a link, before
 * the next page's chunk has finished compiling/streaming. That makes
 * navigation feel snappy even on slow networks: the user sees a familiar
 * skeleton instead of a blank white screen + frozen sidebar.
 *
 * The shape mimics the typical "header + KPI cards + main panel" layout
 * shared by the analysis / sources / topics / insights pages, so the
 * transition isn't jarring.
 */
export default function ProjectPageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-md bg-muted" />
          <div className="h-4 w-96 rounded-md bg-muted/60" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-48 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-muted/40 border border-border/40"
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="h-72 lg:col-span-2 rounded-xl bg-muted/40 border border-border/40" />
        <div className="h-72 rounded-xl bg-muted/40 border border-border/40" />
      </div>

      <div className="h-96 rounded-xl bg-muted/40 border border-border/40" />
    </div>
  );
}
