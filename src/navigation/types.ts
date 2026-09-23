import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SessionTemplate } from '../types';

export type HistoryStackParamList = {
  HistoryList: undefined;
  SessionDetail: { sessionId: number };
  SessionSummary: { sessionId: number };
};

export type RootTabParamList = {
  Log: { template?: SessionTemplate } | undefined;
  History: NavigatorScreenParams<HistoryStackParamList> | undefined;
  Progress: undefined;
  Stats: undefined;
  Backup: undefined;
};
