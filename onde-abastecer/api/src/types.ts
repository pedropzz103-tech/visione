export type * from '../../shared/types';
import type { CountryCode, Station, StationQuery } from '../../shared/types';
export interface CountryAdapter {
  code: CountryCode;
  status: 'live' | 'unverified' | 'planned' | 'approval_required' | 'licensing_review';
  sourceName: string;
  sourceUrl: string;
  termsUrl?: string;
  licence?: string;
  lastVerifiedAt?: string;
  listStations(query: StationQuery): Promise<Station[]>;
}
