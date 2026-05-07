// AWS region → approximate city centroid [lng, lat] (D3 / GeoJSON convention).
// Locations are city centres of the announced AWS region, not actual data-centre
// coordinates (AWS does not publish those). GLOBAL and special non-geographic
// regions are intentionally excluded — they appear in the sidebar list, but
// don't get a globe pin.
export const REGION_COORDS: Record<string, [number, number]> = {
  // North America
  "us-east-1":      [-77.46, 38.95],   // N. Virginia (Ashburn)
  "us-east-2":      [-83.00, 39.96],   // Ohio (Columbus)
  "us-west-1":      [-121.96, 37.35],  // N. California (San Jose)
  "us-west-2":      [-119.70, 45.84],  // Oregon (Boardman)
  "us-gov-east-1":  [-77.46, 38.95],   // GovCloud East — co-located w/ Virginia
  "us-gov-west-1":  [-119.70, 45.84],  // GovCloud West — co-located w/ Oregon
  "us-south-1":     [-95.36, 29.76],   // Houston (announced)
  "ca-central-1":   [-73.57, 45.50],   // Montreal
  "ca-west-1":      [-114.07, 51.04],  // Calgary
  "mx-central-1":   [-100.39, 20.59],  // Querétaro (Mexico Central)

  // South America
  "sa-east-1":      [-46.63, -23.55],  // São Paulo
  "sa-west-1":      [-70.65, -33.46],  // Santiago (Chile, announced)

  // Europe
  "eu-west-1":      [-6.27, 53.35],    // Dublin
  "eu-west-2":      [-0.13, 51.51],    // London
  "eu-west-3":      [2.35, 48.86],     // Paris
  "eu-central-1":   [8.68, 50.11],     // Frankfurt
  "eu-central-2":   [8.55, 47.37],     // Zurich
  "eu-north-1":     [18.07, 59.33],    // Stockholm
  "eu-south-1":     [9.19, 45.46],     // Milan
  "eu-south-2":     [-0.88, 41.66],    // Zaragoza (Spain — Aragón)
  "eusc-de-east-1": [12.55, 52.41],    // Brandenburg (European Sovereign Cloud)

  // Middle East / Africa
  "me-central-1":   [54.37, 24.47],    // Abu Dhabi
  "me-south-1":     [50.55, 26.07],    // Bahrain
  "il-central-1":   [34.78, 32.08],    // Tel Aviv
  "af-south-1":     [18.42, -33.92],   // Cape Town

  // Asia / Pacific
  "ap-east-1":      [114.17, 22.32],   // Hong Kong
  "ap-east-2":      [121.56, 25.04],   // Taipei (Taiwan)
  "ap-south-1":     [72.88, 19.08],    // Mumbai
  "ap-south-2":     [78.49, 17.39],    // Hyderabad
  "ap-northeast-1": [139.76, 35.68],   // Tokyo
  "ap-northeast-2": [126.98, 37.57],   // Seoul
  "ap-northeast-3": [135.50, 34.69],   // Osaka
  "ap-southeast-1": [103.82, 1.35],    // Singapore
  "ap-southeast-2": [151.21, -33.87],  // Sydney
  "ap-southeast-3": [106.85, -6.21],   // Jakarta
  "ap-southeast-4": [144.96, -37.81],  // Melbourne
  "ap-southeast-5": [101.69, 3.14],    // Kuala Lumpur (Malaysia)
  "ap-southeast-6": [174.76, -36.85],  // Auckland (New Zealand)
  "ap-southeast-7": [100.50, 13.76],   // Bangkok (Thailand)

  // China (separate AWS partition — included for completeness)
  "cn-north-1":     [116.40, 39.90],   // Beijing
  "cn-northwest-1": [106.27, 38.47],   // Ningxia
};

// Group keys for sidebar coloring + filtering
export const REGION_GROUP: Record<string, "Commercial" | "GovCloud" | "China" | "Sovereign" | "Global"> = {
  "us-gov-east-1":  "GovCloud",
  "us-gov-west-1":  "GovCloud",
  "cn-north-1":     "China",
  "cn-northwest-1": "China",
  "eusc-de-east-1": "Sovereign",
  GLOBAL:           "Global",
};

export function getGroup(region: string): "Commercial" | "GovCloud" | "China" | "Sovereign" | "Global" {
  return REGION_GROUP[region] ?? "Commercial";
}
