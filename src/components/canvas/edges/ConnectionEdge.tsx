import {
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { memo, useMemo } from 'react';
import clsx from 'clsx';

import { iconFor } from '@/domain/icons';
import { getProtocolSpec, PROTOCOL_STYLES } from '@/domain/protocols';
import type { AppEdge } from '@/domain/types';
import { useDesigner } from '@/store/designer';
import { useEdgeSpotlight, useEdgeStepNumber } from '@/store/selectors';

/** Ids dos marcadores declarados em <EdgeMarkers />. */
const markerId = (style: string, active: boolean) => `url(#arrow-${style}${active ? '-active' : ''})`;

function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<AppEdge>) {
  const shape = useDesigner((s) => s.settings.edgeShape);
  const animate = useDesigner((s) => s.settings.animate);
  const speedFactor = useDesigner((s) => s.settings.speed);
  const showLabels = useDesigner((s) => s.settings.showLabels);
  const activeCaption = useDesigner((s) => {
    const flow = s.flows.find((f) => f.id === s.playback.flowId);
    const step = flow?.steps[s.playback.index];
    return step && step.edgeId === id ? step.caption : undefined;
  });

  const spotlight = useEdgeSpotlight(id);
  const stepNumber = useEdgeStepNumber(id);

  const protocol = getProtocolSpec(data?.protocol ?? 'rest');
  const styleSpec = PROTOCOL_STYLES[protocol.style];
  const Icon = iconFor(protocol.icon);

  const [path, labelX, labelY] = useMemo(() => {
    const params = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
    if (shape === 'straight') return getStraightPath({ sourceX, sourceY, targetX, targetY });
    if (shape === 'bezier') return getBezierPath(params);
    return getSmoothStepPath({ ...params, borderRadius: 16 });
  }, [shape, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  const isActive = spotlight === 'active';
  const isFaded = spotlight === 'outside';
  const color = styleSpec.color;

  const width = isActive ? 3.2 : selected ? 2.6 : spotlight === 'member' ? 2.2 : 1.7;
  const opacity = isFaded ? 0.14 : spotlight === 'member' ? 0.7 : 1;

  const particlesEnabled = !data?.muted && !isFaded && (isActive || animate);
  const particleCount = isActive ? 3 : 2;
  const duration = Math.max(0.35, styleSpec.speed / Math.max(0.25, speedFactor));

  return (
    <>
      <path d={path} fill="none" stroke="transparent" strokeWidth={20} className="react-flow__edge-interaction" />

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={styleSpec.dash}
        style={{ opacity, color, filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined }}
        markerEnd={markerId(protocol.style, isActive)}
        markerStart={data?.bidirectional ? markerId(protocol.style, isActive) : undefined}
      />

      {particlesEnabled ? (
        <g style={{ opacity }}>
          {Array.from({ length: particleCount }).map((_, index) => (
            <g key={index}>
              {isActive ? <circle r={9} fill={color} opacity={0.22} /> : null}
              <circle r={isActive ? 4 : 2.8} fill={isActive ? '#f8fafc' : color} />
              <animateMotion
                dur={`${duration}s`}
                repeatCount="indefinite"
                path={path}
                begin={`-${(index * duration) / particleCount}s`}
                keyPoints={data?.bidirectional && index % 2 === 1 ? '1;0' : undefined}
                keyTimes={data?.bidirectional && index % 2 === 1 ? '0;1' : undefined}
                calcMode={data?.bidirectional && index % 2 === 1 ? 'linear' : undefined}
              />
            </g>
          ))}
        </g>
      ) : null}

      {showLabels || selected || isActive ? (
        <EdgeLabelRenderer>
          <div
            className={clsx(
              'nodrag nopan pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1',
              isFaded && 'opacity-15',
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <div
              className={clsx(
                'flex max-w-[230px] items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10px] font-medium shadow-lg backdrop-blur transition',
                isActive ? 'scale-105' : '',
              )}
              style={{
                borderColor: isActive ? color : `${color}55`,
                background: isActive ? `${color}26` : 'rgba(9,14,25,0.92)',
                color: isActive ? '#f1f5f9' : '#cbd5e1',
                boxShadow: isActive ? `0 0 16px -2px ${color}` : undefined,
              }}
            >
              {stepNumber !== null ? (
                <span
                  className="flex h-[15px] w-[15px] items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: color, color: '#0b1120' }}
                >
                  {stepNumber}
                </span>
              ) : (
                <Icon size={11} style={{ color }} />
              )}
              <span className="font-mono tracking-tight" style={{ color: isActive ? '#fff' : color }}>
                {protocol.short}
              </span>
              {data?.label ? <span className="truncate text-slate-300">{data.label}</span> : null}
            </div>

            {isActive && activeCaption ? (
              <div className="animate-fade-rise max-w-[260px] rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1 text-center text-[10.5px] leading-snug text-slate-300 shadow-xl">
                {activeCaption}
              </div>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export default memo(ConnectionEdge);
