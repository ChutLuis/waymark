/**
 * Metro static `require`s for each destination's art, keyed by `CountryKey`.
 * Kept separate from the pure `destinations.ts` so that module stays unit
 * testable without an asset pipeline.
 *
 * Scenes are 800x500 Lottie JSON; stills are the generated WebP exports (see
 * `tools/scenes/build.mjs`). Never show another country's art: unknown
 * destinations fall back to the neutral stamp / no scene.
 */
import type { ImageSourcePropType } from 'react-native';
import type { AnimationObject } from 'lottie-react-native';
import type { CountryKey } from './destinations';

export interface DestinationArt {
  /** Live Lottie scene (animated, one per screen). */
  scene: AnimationObject;
  /** Full-canvas still (postcards, placeholders). */
  sceneStill: ImageSourcePropType;
  /** Stamp crop still. */
  sceneStampStill: ImageSourcePropType;
  /** Stop stamp Lottie (marker-driven). */
  stopStamp: AnimationObject;
  /** Confirmed (frame 18) stop-stamp still, for decorative stamps. */
  stampStill: ImageSourcePropType;
}

export const DESTINATION_ART: Record<CountryKey, DestinationArt> = {
  japan: {
    scene: require('../../../assets/lottie/scenes/01-japan-kyoto.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/01-japan-kyoto.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/01-japan-kyoto-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/01-japan.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/01-japan-confirmed.webp'),
  },
  guatemala: {
    scene: require('../../../assets/lottie/scenes/02-guatemala-tikal.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/02-guatemala-tikal.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/02-guatemala-tikal-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/02-guatemala.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/02-guatemala-confirmed.webp'),
  },
  mexico: {
    scene: require('../../../assets/lottie/scenes/03-mexico-oaxaca.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/03-mexico-oaxaca.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/03-mexico-oaxaca-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/03-mexico.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/03-mexico-confirmed.webp'),
  },
  peru: {
    scene: require('../../../assets/lottie/scenes/04-peru-machu-picchu.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/04-peru-machu-picchu.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/04-peru-machu-picchu-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/04-peru.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/04-peru-confirmed.webp'),
  },
  italy: {
    scene: require('../../../assets/lottie/scenes/05-italy-positano.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/05-italy-positano.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/05-italy-positano-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/05-italy.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/05-italy-confirmed.webp'),
  },
  france: {
    scene: require('../../../assets/lottie/scenes/06-france-paris.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/06-france-paris.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/06-france-paris-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/06-france.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/06-france-confirmed.webp'),
  },
  greece: {
    scene: require('../../../assets/lottie/scenes/07-greece-oia.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/07-greece-oia.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/07-greece-oia-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/07-greece.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/07-greece-confirmed.webp'),
  },
  portugal: {
    scene: require('../../../assets/lottie/scenes/08-portugal-lisbon.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/08-portugal-lisbon.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/08-portugal-lisbon-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/08-portugal.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/08-portugal-confirmed.webp'),
  },
  morocco: {
    scene: require('../../../assets/lottie/scenes/09-morocco-marrakech.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/09-morocco-marrakech.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/09-morocco-marrakech-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/09-morocco.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/09-morocco-confirmed.webp'),
  },
  thailand: {
    scene: require('../../../assets/lottie/scenes/10-thailand-chiang-mai.json') as unknown as AnimationObject,
    sceneStill: require('../../../assets/lottie/stills/scenes/10-thailand-chiang-mai.webp'),
    sceneStampStill: require('../../../assets/lottie/stills/scenes/10-thailand-chiang-mai-stamp.webp'),
    stopStamp: require('../../../assets/lottie/stamps/10-thailand.json') as unknown as AnimationObject,
    stampStill: require('../../../assets/lottie/stills/stamps/10-thailand-confirmed.webp'),
  },
};

/** Neutral stamp for unknown destinations (generated in the build step). */
export const NEUTRAL_STOP_STAMP = require('../../../assets/lottie/stamps/00-airmail.json') as unknown as AnimationObject;

/** Confirmed still of the neutral stamp, for decorative stamps. */
export const NEUTRAL_STAMP_STILL = require('../../../assets/lottie/stills/stamps/00-airmail-confirmed.webp');