// Coordinates for every AirVPN server location (the API provides no
// lat/lng). Keys match the `location` field of the status API and the
// `server_location` field of userinfo sessions.
const LOCATION_COORDINATES: Record<string, [lat: number, lng: number]> = {
  Alblasserdam: [51.865, 4.66],
  Amsterdam: [52.37, 4.9],
  "Atlanta, Georgia": [33.75, -84.39],
  Auckland: [-36.85, 174.76],
  Barcelona: [41.39, 2.17],
  Belgrade: [44.79, 20.45],
  Berlin: [52.52, 13.4],
  Brussels: [50.85, 4.35],
  Bucharest: [44.43, 26.1],
  "Chicago, Illinois": [41.88, -87.63],
  "Dallas, Texas": [32.78, -96.8],
  "Denver, Colorado": [39.74, -104.99],
  Dublin: [53.35, -6.26],
  Frankfurt: [50.11, 8.68],
  "Fremont, California": [37.55, -121.99],
  London: [51.51, -0.13],
  "Los Angeles": [34.05, -118.24],
  Madrid: [40.42, -3.7],
  Manchester: [53.48, -2.24],
  Miami: [25.76, -80.19],
  Montreal: [45.5, -73.57],
  "New York City": [40.71, -74.01],
  Oslo: [59.91, 10.75],
  "Phoenix, Arizona": [33.45, -112.07],
  Prague: [50.08, 14.44],
  "Raleigh, North Carolina": [35.78, -78.64],
  Riga: [56.95, 24.11],
  "San Jose, California": [37.34, -121.89],
  "Sao Paulo": [-23.55, -46.63],
  Singapore: [1.35, 103.82],
  Sofia: [42.7, 23.32],
  Stockholm: [59.33, 18.07],
  Taipei: [25.03, 121.57],
  Tallinn: [59.44, 24.75],
  Tokyo: [35.68, 139.69],
  "Toronto, Ontario": [43.65, -79.38],
  Uppsala: [59.86, 17.64],
  Vancouver: [49.28, -123.12],
  Vienna: [48.21, 16.37],
  Zurich: [47.37, 8.54],
};

export function coordinatesForLocation(location: string | undefined): [number, number] | null {
  if (!location) return null;
  return LOCATION_COORDINATES[location] ?? null;
}
