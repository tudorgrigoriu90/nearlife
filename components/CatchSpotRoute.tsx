import CatchSpotScreen from './CatchSpotScreen';
import SpotMap from './SpotMap';
import { useCatchSpot } from './useCatchSpot';
import type { CatchSpotSource } from '../lib/catchSpots';
import type { CatchSpotStore } from '../lib/catchSpotStore';
import type { Locale } from '../lib/i18n';
import type { LatLng } from '../lib/proximity';
import type { Species } from '../lib/species/types';

// Glue between the catch-spot hook and screen (T-068), so App only decides when it is shown.
export default function CatchSpotRoute({
  species,
  speciesName,
  regionId,
  source,
  store,
  getFix,
  locale,
  onCatch,
  onBack,
}: {
  species: Species;
  speciesName: string;
  regionId: string;
  source: CatchSpotSource;
  store: CatchSpotStore;
  getFix: () => Promise<LatLng | null>;
  locale: Locale;
  onCatch: () => void;
  onBack: () => void;
}) {
  const { view, checkAgain, suitable, fix, pick } = useCatchSpot({ species, regionId, source, store, getFix });
  return (
    <CatchSpotScreen
      locale={locale}
      speciesName={speciesName}
      view={view}
      onCatch={onCatch}
      onCheckAgain={checkAgain}
      onBack={onBack}
      map={<SpotMap user={fix} spots={suitable} targetId={view?.spot?.id ?? null} onPick={pick} />}
    />
  );
}
