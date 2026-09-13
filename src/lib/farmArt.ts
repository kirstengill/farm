/**
 * Realistic agricultural photography for investment programs.
 * Curated for fast loading, crisp resolution, and category matching.
 */

export const FARM_IMAGES = {
  cattle: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80',
  cattleAlt: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=1200&q=80',
  feeds: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
  feedsAlt: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
  broilers: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80',
  broilersAlt: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80',
  generalFarm: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
}

// Backward-compatible export
export const FARM_ART = {
  cattle: FARM_IMAGES.cattle,
  feeds: FARM_IMAGES.feeds,
  broilers: FARM_IMAGES.broilers,
  pig: FARM_IMAGES.cattle,
  goat: FARM_IMAGES.feeds,
  pasture: FARM_IMAGES.generalFarm,
}

/** Pick high-definition realistic photography matching an investment program or category. */
export function farmArtFor(nameOrCategory: string = ''): string {
  const s = nameOrCategory.toLowerCase()
  if (s.includes('cattle') || s.includes('cow') || s.includes('beef') || s.includes('dairy') || s.includes('livestock') || s.includes('pig')) {
    return FARM_IMAGES.cattle
  }
  if (s.includes('feed') || s.includes('grain') || s.includes('pellet') || s.includes('silage') || s.includes('alfalfa') || s.includes('goat') || s.includes('crop')) {
    return FARM_IMAGES.feeds
  }
  if (s.includes('broiler') || s.includes('poultry') || s.includes('chicken') || s.includes('hen')) {
    return FARM_IMAGES.broilers
  }
  return FARM_IMAGES.generalFarm
}

