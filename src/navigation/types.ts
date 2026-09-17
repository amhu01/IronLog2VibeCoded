import type { SessionTemplate } from '../types';

export type HistoryStackParamList = {
  HistoryList: undefined;
  SessionDetail: { sessionId: number };
};

export type RootTabParamList = {
  Log: { template?: SessionTemplate } | undefined;
  History: undefined;
  Progress: undefined;
  Stats: undefined;
  Backup: undefined;
};
