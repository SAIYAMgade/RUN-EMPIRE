export const DELHI_NCR = {
  north: 28.88,
  south: 28.40,
  west:  76.84,
  east:  77.35,
} as const;

export const GRID_SIZE = 50; // 50×50 = 2500 tiles
export const MAP_CENTER = { lat: 28.64, lng: 77.095 }; // Central Delhi
export const MAP_DEFAULT_ZOOM = 11;

// Delhi NCR famous areas (for pins and tooltips)
export const FAMOUS_AREAS = [
  { name: 'Connaught Place',    lat: 28.6315, lng: 77.2167 },
  { name: 'India Gate',         lat: 28.6129, lng: 77.2295 },
  { name: 'Cyber City Gurugram',lat: 28.4978, lng: 77.0904 },
  { name: 'Noida Sector 62',    lat: 28.6274, lng: 77.3648 },
  { name: 'Hauz Khas',          lat: 28.5501, lng: 77.2017 },
  { name: 'Lajpat Nagar',       lat: 28.5701, lng: 77.2441 },
  { name: 'Old Delhi / Chandni Chowk', lat: 28.6561, lng: 77.2310 },
  { name: 'Dwarka',             lat: 28.5921, lng: 77.0460 },
];
