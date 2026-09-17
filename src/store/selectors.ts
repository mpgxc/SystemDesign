import { useDesigner, type DesignerState } from './designer';

export type Spotlight = 'none' | 'active' | 'member' | 'outside';

function flowContext(state: DesignerState) {
  const flow = state.flows.find((f) => f.id === state.playback.flowId);
  if (!flow || !flow.steps.length || !state.settings.dimOutsideFlow) return null;
  return { flow, activeEdgeId: flow.steps[state.playback.index]?.edgeId ?? null };
}

/** Papel do no no fluxo em reproducao — dirige o realce e o escurecimento. */
export function useNodeSpotlight(nodeId: string): Spotlight {
  return useDesigner((state) => {
    const ctx = flowContext(state);
    if (!ctx) return 'none';

    const edgeById = new Map(state.edges.map((e) => [e.id, e]));
    const active = ctx.activeEdgeId ? edgeById.get(ctx.activeEdgeId) : undefined;
    if (active && (active.source === nodeId || active.target === nodeId)) return 'active';

    const member = ctx.flow.steps.some((step) => {
      const edge = edgeById.get(step.edgeId);
      return edge ? edge.source === nodeId || edge.target === nodeId : false;
    });
    return member ? 'member' : 'outside';
  });
}

export function useEdgeSpotlight(edgeId: string): Spotlight {
  return useDesigner((state) => {
    const ctx = flowContext(state);
    if (!ctx) return 'none';
    if (ctx.activeEdgeId === edgeId) return 'active';
    return ctx.flow.steps.some((s) => s.edgeId === edgeId) ? 'member' : 'outside';
  });
}

/** Numero do passo (1-based) do primeiro uso da aresta no fluxo ativo. */
export function useEdgeStepNumber(edgeId: string): number | null {
  return useDesigner((state) => {
    const flow = state.flows.find((f) => f.id === state.playback.flowId);
    if (!flow) return null;
    const index = flow.steps.findIndex((s) => s.edgeId === edgeId);
    return index < 0 ? null : index + 1;
  });
}
