/**
 * The plain-English names of the things the earnings are made of.
 *
 * The server sends the kind of every line ("delivered", "failed_access"); the
 * courier reads the name, not the code.
 */

const KIND_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  left_at: 'Left it safe',
  failed_access: 'No access',
  failed_dog: 'Dog on the property',
  failed_other: 'Could not deliver',
  skipped: 'Skipped',
};

export function earningsKindLabel(kind: string): string {
  const known = KIND_LABELS[kind.trim().toLowerCase()];
  if (known !== undefined) {
    return known;
  }
  const trimmed = kind.trim();
  if (trimmed === '') {
    return 'Delivery';
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
