/** One county outline (T-090): outer rings of [lng, lat] points, keyed by its GADM id. */
export interface CountyShape {
  id: string;
  name: string;
  polygons: [number, number][][];
}
