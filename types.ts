
export interface EventConfig {
  name: string;
  date: string;
  logo: string | null; // Base64 ou URL da logo
}

export interface ProcessedVideo {
  id: string;
  url: string;
  timestamp: string;
  event: string;
  logo: string | null;
  caption?: string;
}

export enum AppState {
  SETUP = 'SETUP',
  READY = 'READY',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT'
}
