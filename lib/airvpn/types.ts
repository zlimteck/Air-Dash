export type AirVpnHealth = "ok" | "warning" | "error";

export interface AirVpnServer {
  public_name: string;
  country_name: string;
  country_code: string;
  location: string;
  continent: string;
  bw: number;
  bw_max: number;
  users: number;
  currentload: number;
  health: AirVpnHealth;
  warning?: string;
}

export interface AirVpnAggregate {
  public_name: string;
  server_best: string;
  bw: number;
  bw_max: number;
  users: number;
  servers: number;
  currentload: number;
  health: AirVpnHealth;
  warning?: string;
}

export interface AirVpnStatusResponse {
  result: string;
  servers: AirVpnServer[];
  countries: AirVpnAggregate[];
  continents: AirVpnAggregate[];
  planets: AirVpnAggregate[];
}

export interface AirVpnVpnSession {
  vpn_ip?: string;
  exit_ip?: string;
  entry_ip?: string;
  device_name?: string;
  server_name?: string;
  server_country?: string;
  server_country_code?: string;
  server_continent?: string;
  server_location?: string;
  server_bw?: number;
  bytes_read?: number;
  bytes_write?: number;
  connected_since_unix?: number;
  connected_since_date?: string;
  speed_read?: number;
  speed_write?: number;
}

export interface AirVpnDevice {
  id: string;
  name: string;
  description?: string;
  status?: string;
  wireguard_ipv4?: string;
  vpn_last_from_unix?: number;
}

export interface AirVpnDevicesResponse {
  result: string;
  devices: AirVpnDevice[];
}

export interface AirVpnUserInfo {
  result: string;
  user: {
    login: string;
    register_date?: string;
    register_unix?: number;
    premium?: boolean;
    expiration_unix?: number;
    expiration_date?: string;
    expiration_days?: number;
    last_attempt_unix?: number;
    credits?: number;
    connected?: boolean;
  };
  sessions?: AirVpnVpnSession[];
  connection?: AirVpnVpnSession;
}
