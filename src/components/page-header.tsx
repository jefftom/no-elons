import { BackButton } from "./back-button";

/** Sticky, translucent header for the centre column. */
export function PageHeader({
  title,
  subtitle,
  back = false,
  children,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="flex min-h-[53px] items-center gap-4 px-4">
        {back ? <BackButton /> : null}
        <div className="min-w-0 flex-1 py-2">
          <h1 className="page-title truncate">{title}</h1>
          {subtitle ? <p className="truncate text-[13px] text-muted">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
