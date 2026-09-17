import { ReactFlowProvider } from '@xyflow/react';
import { PanelRightClose, PanelRightOpen, Route, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

import Canvas from './components/canvas/Canvas';
import FlowsPanel from './components/panels/FlowsPanel';
import Inspector from './components/panels/Inspector';
import Palette from './components/panels/Palette';
import Toolbar from './components/Toolbar';
import { TEMPLATES } from './domain/templates';
import { restoreDocument, useDesigner } from './store/designer';

type SideTab = 'inspector' | 'flows';

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
}

function Workspace() {
  const [tab, setTab] = useState<SideTab>('inspector');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadDocument = useDesigner((s) => s.loadDocument);
  const playback = useDesigner((s) => s.playback);
  const stepForward = useDesigner((s) => s.stepForward);
  const flowCount = useDesigner((s) => s.flows.length);
  const selectedEdgeIds = useDesigner((s) => s.selectedEdgeIds);

  // Retoma o trabalho anterior; na primeira visita abre um exemplo navegavel.
  useEffect(() => {
    const saved = restoreDocument();
    loadDocument(saved ?? TEMPLATES[0].build());
    useDesigner.setState({ past: [], future: [] });
  }, [loadDocument]);

  // Relogio da reproducao de fluxos.
  useEffect(() => {
    if (!playback.playing) return;
    const timer = window.setInterval(stepForward, playback.stepDuration);
    return () => window.clearInterval(timer);
  }, [playback.playing, playback.stepDuration, stepForward]);

  // Abre o painel de fluxos assim que o usuario seleciona conexoes para capturar.
  useEffect(() => {
    if (selectedEdgeIds.length > 1 && flowCount > 0) setTab('flows');
  }, [selectedEdgeIds.length, flowCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const store = useDesigner.getState();
      const meta = event.ctrlKey || event.metaKey;

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        store.duplicateSelection();
        return;
      }
      if (meta && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        store.groupSelection();
        return;
      }
      if (meta && event.key.toLowerCase() === 'c') {
        store.copySelection();
        return;
      }
      if (meta && event.key.toLowerCase() === 'v') {
        store.paste();
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (store.playback.playing) store.pausePlayback();
        else store.playFlow();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        <Palette />

        <main className="relative min-w-0 flex-1">
          <Canvas />

          {!sidebarOpen ? (
            <button
              type="button"
              className="toolbar-button absolute right-3 top-3 z-10"
              onClick={() => setSidebarOpen(true)}
              title="Abrir painel"
            >
              <PanelRightOpen size={14} />
            </button>
          ) : null}
        </main>

        {sidebarOpen ? (
          <aside className="panel flex h-full w-[322px] shrink-0 flex-col border-l border-slate-800">
            <div className="flex items-center gap-1 border-b border-slate-800 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setTab('inspector')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition',
                  tab === 'inspector' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <SlidersHorizontal size={13} /> Propriedades
              </button>
              <button
                type="button"
                onClick={() => setTab('flows')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition',
                  tab === 'flows' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Route size={13} /> Fluxos
                {flowCount ? (
                  <span className="rounded bg-slate-700 px-1 font-mono text-[9px] text-slate-300">{flowCount}</span>
                ) : null}
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSidebarOpen(false)}
                title="Fechar painel"
              >
                <PanelRightClose size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === 'inspector' ? <Inspector /> : <FlowsPanel />}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Workspace />
    </ReactFlowProvider>
  );
}
