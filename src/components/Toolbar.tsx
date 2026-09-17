import { useReactFlow } from '@xyflow/react';
import {
  Download,
  FileJson,
  FilePlus2,
  Image as ImageIcon,
  Frame,
  LayoutTemplate,
  Redo2,
  Settings2,
  Sparkles,
  Undo2,
  Upload,
  Waves,
} from 'lucide-react';
import { useRef, useState } from 'react';
import clsx from 'clsx';

import { TEMPLATES } from '@/domain/templates';
import { exportToPng } from '@/lib/export-image';
import { downloadDocument, parseDocument } from '@/lib/persistence';
import { useDesigner, type EdgeShape } from '@/store/designer';
import Dropdown from './ui/Dropdown';
import { SelectField, Toggle } from './ui/fields';

const EDGE_SHAPES: { value: EdgeShape; label: string }[] = [
  { value: 'smoothstep', label: 'Ortogonal' },
  { value: 'bezier', label: 'Curva' },
  { value: 'straight', label: 'Reta' },
];

export default function Toolbar() {
  const name = useDesigner((s) => s.name);
  const setName = useDesigner((s) => s.setName);
  const settings = useDesigner((s) => s.settings);
  const updateSettings = useDesigner((s) => s.updateSettings);
  const undo = useDesigner((s) => s.undo);
  const redo = useDesigner((s) => s.redo);
  const canUndo = useDesigner((s) => s.past.length > 0);
  const canRedo = useDesigner((s) => s.future.length > 0);
  const loadDocument = useDesigner((s) => s.loadDocument);
  const resetDocument = useDesigner((s) => s.resetDocument);
  const toDocument = useDesigner((s) => s.toDocument);
  const fitContexts = useDesigner((s) => s.fitContexts);
  const nodes = useDesigner((s) => s.nodes);

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { fitView } = useReactFlow();

  const applyTemplate = (build: () => ReturnType<typeof toDocument>) => {
    loadDocument(build());
    window.setTimeout(() => void fitView({ padding: 0.2, duration: 500 }), 60);
  };

  const onImport = async (file: File) => {
    const doc = parseDocument(await file.text());
    if (!doc) {
      window.alert('Arquivo invalido: esperado um JSON exportado por esta ferramenta.');
      return;
    }
    loadDocument(doc);
    window.setTimeout(() => void fitView({ padding: 0.2, duration: 500 }), 60);
  };

  const onExportPng = async () => {
    setBusy(true);
    try {
      await exportToPng(nodes, name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="panel relative z-50 flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 px-3">
      <div className="flex items-center gap-2 pr-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-slate-950">
          <Waves size={15} strokeWidth={2.5} />
        </span>
        <span className="hidden text-[13px] font-semibold tracking-tight text-slate-200 sm:block">
          System Design Studio
        </span>
      </div>

      <div className="mx-1 h-6 w-px bg-slate-800" />

      <input
        className="min-w-0 max-w-[260px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[13px] font-medium text-slate-200 outline-none transition hover:border-slate-700 focus:border-sky-500/70 focus:bg-slate-950/60"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nome da arquitetura"
      />

      <div className="flex items-center gap-1">
        <button type="button" className="toolbar-button !px-2" title="Desfazer (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 size={14} />
        </button>
        <button type="button" className="toolbar-button !px-2" title="Refazer (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 size={14} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          className={clsx('toolbar-button', settings.animate && '!border-sky-500/60 !bg-sky-500/10 !text-sky-300')}
          onClick={() => updateSettings({ animate: !settings.animate })}
          title="Liga ou desliga as particulas em todas as conexoes"
        >
          <Sparkles size={13} />
          <span className="hidden md:inline">Animar</span>
        </button>

        <button
          type="button"
          className="toolbar-button !px-2"
          onClick={() => fitContexts()}
          title="Ajusta cada contexto para caber os componentes de dentro"
        >
          <Frame size={14} />
        </button>

        <Dropdown
          width={250}
          align="right"
          trigger={(open) => (
            <span className={clsx('toolbar-button', open && '!border-slate-600 !bg-slate-800')}>
              <LayoutTemplate size={13} />
              <span className="hidden md:inline">Exemplos</span>
            </span>
          )}
        >
          {(close) => (
            <div className="space-y-1">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-800"
                  onClick={() => {
                    applyTemplate(template.build);
                    close();
                  }}
                >
                  <span className="block text-[12.5px] font-medium text-slate-200">{template.name}</span>
                  <span className="block text-[10.5px] leading-snug text-slate-500">{template.description}</span>
                </button>
              ))}
              <div className="my-1 h-px bg-slate-800" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-slate-300 transition hover:bg-slate-800"
                onClick={() => {
                  if (window.confirm('Limpar o canvas e comecar do zero?')) resetDocument();
                  close();
                }}
              >
                <FilePlus2 size={13} /> Comecar do zero
              </button>
            </div>
          )}
        </Dropdown>

        <Dropdown
          width={270}
          align="right"
          trigger={(open) => (
            <span className={clsx('toolbar-button !px-2', open && '!border-slate-600 !bg-slate-800')} title="Preferencias de visualizacao">
              <Settings2 size={14} />
            </span>
          )}
        >
          {() => (
            <div className="space-y-2 p-1">
              <Toggle
                label="Rotulos nas conexoes"
                checked={settings.showLabels}
                onChange={(value) => updateSettings({ showLabels: value })}
              />
              <Toggle
                label="Destacar o fluxo em reproducao"
                help="Escurece o que nao participa"
                checked={settings.dimOutsideFlow}
                onChange={(value) => updateSettings({ dimOutsideFlow: value })}
              />
              <Toggle label="Grade de fundo" checked={settings.showGrid} onChange={(value) => updateSettings({ showGrid: value })} />
              <Toggle label="Alinhar a grade" checked={settings.snapToGrid} onChange={(value) => updateSettings({ snapToGrid: value })} />
              <Toggle label="Minimapa" checked={settings.showMinimap} onChange={(value) => updateSettings({ showMinimap: value })} />

              <SelectField
                label="Formato das conexoes"
                value={settings.edgeShape}
                allowEmpty={false}
                options={EDGE_SHAPES.map((s) => s.value)}
                onChange={(value) => updateSettings({ edgeShape: value as EdgeShape })}
              />

              <label className="block">
                <span className="field-label">Velocidade da animacao · {settings.speed.toFixed(1)}x</span>
                <input
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.1}
                  value={settings.speed}
                  onChange={(event) => updateSettings({ speed: Number(event.target.value) })}
                  className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-400"
                />
              </label>
            </div>
          )}
        </Dropdown>

        <Dropdown
          width={230}
          align="right"
          trigger={(open) => (
            <span className={clsx('toolbar-button', open && '!border-slate-600 !bg-slate-800')}>
              <Download size={13} />
              <span className="hidden md:inline">Exportar</span>
            </span>
          )}
        >
          {(close) => (
            <div className="space-y-0.5">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-slate-300 transition hover:bg-slate-800"
                onClick={() => {
                  downloadDocument(toDocument());
                  close();
                }}
              >
                <FileJson size={13} /> Baixar JSON
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  close();
                  await onExportPng();
                }}
              >
                <ImageIcon size={13} /> {busy ? 'Gerando PNG...' : 'Baixar PNG'}
              </button>
              <div className="my-1 h-px bg-slate-800" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-slate-300 transition hover:bg-slate-800"
                onClick={() => {
                  fileRef.current?.click();
                  close();
                }}
              >
                <Upload size={13} /> Importar JSON
              </button>
            </div>
          )}
        </Dropdown>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImport(file);
          event.target.value = '';
        }}
      />
    </header>
  );
}
