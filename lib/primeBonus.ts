import { isActiveInMonth, monthOf } from './season';
import type { Species } from './species/types';

// Prime-bonus rule (T-074 core · GDD §6). A catch earns the "prime bonus" when it happens inside
// the species' active window — you found it in the right season, not scraping it out of season.
// Pure so the catch flow computes it identically in the prototype (T-034) and production (T-074).

/** True when catching `species` on `date` falls within its active-season window. */
export function isPrimeCatch(species: Species, date: Date): boolean {
  return isActiveInMonth(species, monthOf(date));
}
