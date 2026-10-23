/**
 * The typed look into a test instance: the chosen tests assert the token
 * wiring by reading props and styles off the rendered tree, and the typed
 * access keeps the tests as type-safe as the components (no `any` and no
 * suppressions). The shape is structural, so it takes the instances of the
 * testing library directly.
 */
export type PropBag = { [name: string]: unknown };

export interface TestInstance {
  props: PropBag;
}

export const inspect = (instance: TestInstance): PropBag => instance.props;

/**
 * React Native's style semantics: a `style` prop is one style object or a
 * list of them merged left to right, so the assertions read the merged
 * result exactly as the platform renders it.
 */
export const styleOf = (instance: TestInstance): PropBag => {
  const raw = instance.props['style'];
  const entries: unknown[] = Array.isArray(raw) ? raw : [raw];
  const merged: PropBag = {};
  for (const entry of entries) {
    if (entry !== null && entry !== undefined && typeof entry === 'object') {
      Object.assign(merged, entry as PropBag);
    }
  }
  return merged;
};
