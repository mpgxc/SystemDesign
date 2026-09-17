import { PROTOCOL_STYLES } from '@/domain/protocols';

/**
 * Marcadores de seta por natureza de comunicacao. Ficam num SVG proprio e sao
 * referenciados por url(#id) pelas arestas — assim cada protocolo mantem a
 * propria cor sem depender dos marcadores padrao do React Flow.
 */
export default function EdgeMarkers() {
  return (
    <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
      <defs>
        {Object.values(PROTOCOL_STYLES).flatMap((style) =>
          [false, true].map((active) => (
            <marker
              key={`${style.id}-${active}`}
              id={`arrow-${style.id}${active ? '-active' : ''}`}
              viewBox="0 0 12 12"
              markerWidth={active ? 8 : 7}
              markerHeight={active ? 8 : 7}
              refX="9"
              refY="6"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path d="M 1 1 L 10 6 L 1 11 z" fill={active ? '#f8fafc' : style.color} />
            </marker>
          )),
        )}
      </defs>
    </svg>
  );
}
