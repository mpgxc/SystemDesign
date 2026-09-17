import type { ContextTone } from './types';

export interface ToneSpec {
  id: ContextTone;
  label: string;
  accent: string;
  soft: string;
}

export const TONE_SPECS: ToneSpec[] = [
  { id: 'violet', label: 'Violeta', accent: '#a78bfa', soft: 'rgba(167,139,250,0.07)' },
  { id: 'sky', label: 'Azul', accent: '#38bdf8', soft: 'rgba(56,189,248,0.07)' },
  { id: 'emerald', label: 'Verde', accent: '#34d399', soft: 'rgba(52,211,153,0.07)' },
  { id: 'amber', label: 'Ambar', accent: '#fbbf24', soft: 'rgba(251,191,36,0.07)' },
  { id: 'rose', label: 'Rosa', accent: '#fb7185', soft: 'rgba(251,113,133,0.07)' },
  { id: 'slate', label: 'Neutro', accent: '#94a3b8', soft: 'rgba(148,163,184,0.07)' },
];

export const TONE_BY_ID = new Map(TONE_SPECS.map((t) => [t.id, t]));

export function toneOf(tone: ContextTone | undefined): ToneSpec {
  return TONE_BY_ID.get(tone ?? 'violet') ?? TONE_SPECS[0];
}
