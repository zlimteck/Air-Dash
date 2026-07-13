const STYLES = {
  error: "border-[var(--color-danger)]/30 bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
  success:
    "border-[var(--color-success)]/30 bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  info: "border-[var(--color-accent-border)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]",
} as const;

export function Alert({
  tone,
  children,
}: {
  tone: keyof typeof STYLES;
  children: React.ReactNode;
}) {
  return (
    <div role="alert" className={`rounded-[var(--radius-md)] border p-3 text-sm ${STYLES[tone]}`}>
      {children}
    </div>
  );
}
