import type { Source } from '../types/data';
import sourceData from '../../data/canonical/sources.json';
import socialSourceData from '../../data/canonical/social-sources.json';
import chileSourceData from '../../data/canonical/chile-sources.json';
import chileDocumentarySourceData from '../../data/canonical/chile-documentary-sources.json';

// Registros generados por los importadores; “importada” no equivale a validación externa.
export const sources = [...sourceData, ...socialSourceData, ...chileSourceData, ...chileDocumentarySourceData] as Source[];

export function getSource(sourceId: string): Source | undefined {
  return sources.find((source) => source.id === sourceId);
}
