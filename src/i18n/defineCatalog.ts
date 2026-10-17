import type { LocaleCatalog } from './types'

/** Keeps metric ids as literal keys of the catalog object. */
export function defineCatalog<const C extends LocaleCatalog>(catalog: C): C {
  return catalog
}
