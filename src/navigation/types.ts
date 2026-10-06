import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SessionTemplate } from '../types';

/** Screens that open a single session; both the History and Progress stacks host them. */
export type SessionStackParamList = {
  SessionDetail: { sessionId: number };
  SessionSummary: { sessionId: number };
};

export type HistoryStackParamList = SessionStackParamList & {
  HistoryList: undefined;
};

export type ProgressStackParamList = SessionStackParamList & {
  ProgressMain: undefined;
};

export type RootTabParamList = {
  Log: { template?: SessionTemplate } | undefined;
  History: NavigatorScreenParams<HistoryStackParamList> | undefined;
  Progress: NavigatorScreenParams<ProgressStackParamList> | undefined;
  Stats: undefined;
  Backup: undefined;
};
