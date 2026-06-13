export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
  color: string;         // '#RRGGBB'
  tilesOwned: number;
  totalClaimed: number;
}

export interface TileState {
  tileKey:    string;
  rowIdx:     number;
  colIdx:     number;
  centerLat:  number;
  centerLng:  number;
  ownerId:    string | null;
  ownerColor: string | null;
  ownerName:  string | null;
  claimedAt:  string | null;
  claimCount: number;
}

// ── WebSocket Events ────────────────────────────────────────

export interface TileUpdateEvent {
  tileKey:    string;
  ownerId:    string;
  ownerColor: string;
  ownerName:  string;
  claimedAt:  string;
  isSteal:    boolean;
  oldOwnerId: string | null;
  oldOwnerName: string | null;
}

export interface LeaderboardEntry {
  userId:     string;
  name:       string;
  avatarUrl:  string;
  color:      string;
  tilesOwned: number;
  rank:       number;
}

export interface ActivityEvent {
  type:     'claim' | 'steal' | 'draw_claim';
  actor:    string;   // User name
  actorColor: string;
  victim:   string | null;
  tileKey:  string;
  timestamp: string;
}

// ── Socket.io Typed Events ──────────────────────────────────

export interface ServerToClientEvents {
  'tile:updated':         (data: TileUpdateEvent) => void;
  'tiles:batch-updated':  (data: TileUpdateEvent[]) => void;
  'tiles:initial-state':  (data: TileState[]) => void;
  'tile:stolen-alert':    (data: { tileKey: string; stolenBy: string; stolenByColor: string }) => void;
  'users:online-count':   (count: number) => void;
  'users:joined':         (user: Pick<User, 'id' | 'name' | 'color' | 'avatarUrl'>) => void;
  'users:left':           (userId: string) => void;
  'leaderboard:update':   (data: LeaderboardEntry[]) => void;
  'activity:event':       (event: ActivityEvent) => void;
  'user:color-updated':   (data: { userId: string; color: string }) => void;
}

export interface ClientToServerEvents {
  'tile:claim':   (tileKey: string, callback: (res: AckResponse) => void) => void;
  'tiles:draw':   (polygon: GeoJSONPolygon, callback: (res: DrawAckResponse) => void) => void;
  'user:ping':    () => void;
}

export interface AckResponse {
  success?: boolean;
  error?: string;
  result?: TileUpdateEvent;
}

export interface DrawAckResponse extends AckResponse {
  totalClaimed?: number;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}
