
export interface EventConfig {
  name: string;
  date: string;
}

export interface ProcessedVideo {
  id: string;
  url: string;
  timestamp: string;
  event: string;
  caption?: string;
}

export enum AppState {
  SETUP = 'SETUP',
  READY = 'READY',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT'
}
