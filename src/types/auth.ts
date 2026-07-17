import { Filters } from "./session";

export interface UserSession {
  Id: string;
  Name: string;
  DisplayName?: string;
  AccessToken?: string;
  DeviceId: string;
  isAdmin?: boolean;
  wasMadeAdmin?: boolean;
  isGuest?: boolean;
  provider?: string;
  sessionVersion?: number;
  providerConfig?: {
    serverUrl?: string;
    machineId?: string;
    tmdbToken?: string;
  };
}

export interface SessionData {
  user: UserSession;
  sessionCode?: string;
  isLoggedIn: boolean;
  soloFilters?: Filters;
  tempDeviceId?: string;
  tempPinId?: number;
  providerConfig?: {
    serverUrl?: string;
    machineId?: string;
    tmdbToken?: string;
  };
}
