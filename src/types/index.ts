export type Role = 'admin' | 'coordinator';

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
  email: string | null;
}

export interface Game {
  id: string;
  name: string;
  color: string;
  timer_seconds: number | null;
  is_active: boolean;
}

export interface Anbiyam {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  anbiyam: string;
}

export interface PlayerStat extends Player {
  total_wins: number;
  distinct_games: number;
}

export interface Win {
  id: string;
  client_uuid: string;
  player_id: string;
  game_id: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
  status: 'active' | 'voided';
  void_reason: string | null;
}

export interface PrizeClaim {
  id: string;
  player_id: string;
  prize_type: 'general' | 'grand';
  claimed_at: string;
}

export interface EventSettings {
  id: number;
  general_threshold: number;
  grand_threshold: number;
  near_grand_threshold: number;
  entry_closed: boolean;
  claims_closed: boolean;
}

export interface TimerState {
  game_id: string;
  state: 'idle' | 'running' | 'paused' | 'finished';
  duration_seconds: number;
  started_at: string | null;
  remaining_seconds: number | null;
}