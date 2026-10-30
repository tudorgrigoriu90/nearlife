import { useCallback, useEffect, useState } from 'react';
import { catchSpotView, habitatsFor, type CatchSpot, type CatchSpotSource, type CatchSpotView } from '../lib/catchSpots';
import type { CatchSpotStore } from '../lib/catchSpotStore';
import type { LatLng } from '../lib/proximity';
import type { SpeciesCategory } from '../lib/species/types';

// Loads the county's catch spots (cache first, then the server) and the species' habitats, takes
// one position fix, and works out what the catch screen shows (T-068). `checkAgain` takes a fresh
// fix after the user has walked there. The fix stays on the device.

export interface UseCatchSpotInput {
  species: { id: string; category: SpeciesCategory };
  regionId: string;
  source: CatchSpotSource;
  store: CatchSpotStore;
  getFix: () => Promise<LatLng | null>;
}

export function useCatchSpot({ species, regionId, source, store, getFix }: UseCatchSpotInput): {
  view: CatchSpotView | null;
  checkAgain: () => void;
  /** For the map (T-067): the spots that suit the species, the last fix, and picking one. */
  suitable: CatchSpot[];
  fix: LatLng | null;
  pick: (spotId: string) => void;
} {
  const [spots, setSpots] = useState<CatchSpot[] | null>(null);
  const [habitats, setHabitats] = useState(() => habitatsFor(species));
  const [fix, setFix] = useState<LatLng | null | undefined>(undefined);
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void store.load(regionId).then((cached) => {
      if (live && cached) setSpots((current) => current ?? cached);
    });
    source
      .forRegion(regionId)
      .then((fresh) => {
        if (!live) return;
        setSpots(fresh);
        void store.save(regionId, fresh);
      })
      // Offline: the cached spots stand, or the screen says it is still finding them.
      .catch(() => {
        void store.load(regionId).then((cached) => {
          if (live) setSpots((current) => current ?? cached ?? []);
        });
      });
    source
      .habitatsOf(species.id)
      .then((own) => {
        if (live && own) setHabitats(own);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [regionId, source, store, species.id]);

  const checkAgain = useCallback(() => {
    getFix()
      .then(setFix)
      .catch(() => setFix(null));
  }, [getFix]);

  useEffect(checkAgain, [checkAgain]);

  const view = spots === null || fix === undefined ? null : catchSpotView(fix, spots, habitats, undefined, chosenId);
  const suitable = (spots ?? []).filter((s) => habitats.includes(s.habitat));
  return { view, checkAgain, suitable, fix: fix ?? null, pick: setChosenId };
}
