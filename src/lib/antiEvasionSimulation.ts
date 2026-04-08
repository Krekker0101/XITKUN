export type AntiEvasionSimulationScenarioKey =
  | 'taskbarHidden'
  | 'captureExclusion'
  | 'focusSpoof';

export type AntiEvasionSimulationSignalAction =
  | 'enabled'
  | 'disabled'
  | 'probe'
  | 'reset';

export interface AntiEvasionSimulationSignal {
  id: string;
  action: AntiEvasionSimulationSignalAction;
  scenario?: AntiEvasionSimulationScenarioKey;
  title: string;
  description: string;
  createdAt: number;
}

export interface AntiEvasionSimulationState {
  taskbarHidden: boolean;
  captureExclusion: boolean;
  focusSpoof: boolean;
  events: AntiEvasionSimulationSignal[];
  updatedAt: number;
}

export interface AntiEvasionSimulationScenarioDefinition {
  key: AntiEvasionSimulationScenarioKey;
  title: string;
  description: string;
}

export const ANTI_EVASION_SIMULATION_CHANGE_EVENT =
  'natively:anti-evasion-simulation:change';
export const ANTI_EVASION_SIMULATION_SIGNAL_EVENT =
  'natively:anti-evasion-simulation:signal';

const STORAGE_KEY = 'natively_anti_evasion_simulation';
const MAX_EVENTS = 20;

export const ANTI_EVASION_SIMULATION_SCENARIOS: AntiEvasionSimulationScenarioDefinition[] = [
  {
    key: 'taskbarHidden',
    title: 'Taskbar invisibility attempt',
    description:
      'Simulates a request to hide an active app from the taskbar while it remains usable.',
  },
  {
    key: 'captureExclusion',
    title: 'Capture exclusion attempt',
    description:
      'Simulates a request to keep the app present on screen while excluding it from screen capture.',
  },
  {
    key: 'focusSpoof',
    title: 'Browser focus spoof attempt',
    description:
      'Simulates a request to keep another app or browser tab marked as focused while this app is used.',
  },
];

const DEFAULT_STATE: AntiEvasionSimulationState = {
  taskbarHidden: false,
  captureExclusion: false,
  focusSpoof: false,
  events: [],
  updatedAt: 0,
};

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const cloneDefaultState = (): AntiEvasionSimulationState => ({
  ...DEFAULT_STATE,
  events: [],
});

const createId = (): string =>
  `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getScenarioDefinition = (
  key: AntiEvasionSimulationScenarioKey
): AntiEvasionSimulationScenarioDefinition =>
  ANTI_EVASION_SIMULATION_SCENARIOS.find((item) => item.key === key) ??
  ANTI_EVASION_SIMULATION_SCENARIOS[0];

const isScenarioKey = (
  value: unknown
): value is AntiEvasionSimulationScenarioKey =>
  value === 'taskbarHidden' ||
  value === 'captureExclusion' ||
  value === 'focusSpoof';

const isSignalAction = (
  value: unknown
): value is AntiEvasionSimulationSignalAction =>
  value === 'enabled' ||
  value === 'disabled' ||
  value === 'probe' ||
  value === 'reset';

const normalizeSignals = (value: unknown): AntiEvasionSimulationSignal[] => {
  if (!Array.isArray(value)) return [];

  const signals: AntiEvasionSimulationSignal[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const signal = item as Partial<AntiEvasionSimulationSignal>;
    if (
      typeof signal.id !== 'string' ||
      !isSignalAction(signal.action) ||
      typeof signal.title !== 'string' ||
      typeof signal.description !== 'string' ||
      typeof signal.createdAt !== 'number'
    ) {
      continue;
    }

    const normalizedSignal: AntiEvasionSimulationSignal = {
      id: signal.id,
      action: signal.action,
      title: signal.title,
      description: signal.description,
      createdAt: signal.createdAt,
    };

    if (isScenarioKey(signal.scenario)) {
      normalizedSignal.scenario = signal.scenario;
    }

    signals.push(normalizedSignal);

    if (signals.length >= MAX_EVENTS) {
      break;
    }
  }

  return signals;
};

const normalizeState = (value: unknown): AntiEvasionSimulationState => {
  if (!value || typeof value !== 'object') return cloneDefaultState();

  const raw = value as Partial<AntiEvasionSimulationState>;
  return {
    taskbarHidden: Boolean(raw.taskbarHidden),
    captureExclusion: Boolean(raw.captureExclusion),
    focusSpoof: Boolean(raw.focusSpoof),
    events: normalizeSignals(raw.events),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  };
};

const persistState = (state: AntiEvasionSimulationState): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent<AntiEvasionSimulationState>(
      ANTI_EVASION_SIMULATION_CHANGE_EVENT,
      { detail: state }
    )
  );
};

const emitSignal = (signal: AntiEvasionSimulationSignal): void => {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent<AntiEvasionSimulationSignal>(
      ANTI_EVASION_SIMULATION_SIGNAL_EVENT,
      { detail: signal }
    )
  );
};

const buildScenarioSignal = (
  scenario: AntiEvasionSimulationScenarioKey,
  action: Exclude<AntiEvasionSimulationSignalAction, 'reset'>
): AntiEvasionSimulationSignal => {
  const definition = getScenarioDefinition(scenario);
  const actionLabel =
    action === 'enabled'
      ? 'enabled'
      : action === 'disabled'
        ? 'disabled'
        : 'probe emitted';

  return {
    id: createId(),
    action,
    scenario,
    title: `${definition.title} ${actionLabel}`,
    description: definition.description,
    createdAt: Date.now(),
  };
};

export const getAntiEvasionSimulationState = (): AntiEvasionSimulationState => {
  if (!isBrowser()) return cloneDefaultState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return cloneDefaultState();
  }
};

export const setAntiEvasionSimulationScenario = (
  scenario: AntiEvasionSimulationScenarioKey,
  enabled: boolean
): AntiEvasionSimulationState => {
  const next = getAntiEvasionSimulationState();
  next[scenario] = enabled;

  const signal = buildScenarioSignal(
    scenario,
    enabled ? 'enabled' : 'disabled'
  );

  next.updatedAt = signal.createdAt;
  next.events = [signal, ...next.events].slice(0, MAX_EVENTS);

  persistState(next);
  emitSignal(signal);

  return next;
};

export const emitAntiEvasionSimulationProbe = (
  scenario: AntiEvasionSimulationScenarioKey
): AntiEvasionSimulationState => {
  const next = getAntiEvasionSimulationState();
  const signal = buildScenarioSignal(scenario, 'probe');

  next.updatedAt = signal.createdAt;
  next.events = [signal, ...next.events].slice(0, MAX_EVENTS);

  persistState(next);
  emitSignal(signal);

  return next;
};

export const resetAntiEvasionSimulation = (): AntiEvasionSimulationState => {
  const signal: AntiEvasionSimulationSignal = {
    id: createId(),
    action: 'reset',
    title: 'Simulation state reset',
    description:
      'All anti-evasion simulator flags were cleared and the event log was restarted.',
    createdAt: Date.now(),
  };

  const next: AntiEvasionSimulationState = {
    ...cloneDefaultState(),
    updatedAt: signal.createdAt,
    events: [signal],
  };

  persistState(next);
  emitSignal(signal);

  return next;
};

export const subscribeAntiEvasionSimulation = (
  callback: (state: AntiEvasionSimulationState) => void
): (() => void) => {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<AntiEvasionSimulationState>;
    callback(customEvent.detail ?? getAntiEvasionSimulationState());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback(getAntiEvasionSimulationState());
    }
  };

  window.addEventListener(
    ANTI_EVASION_SIMULATION_CHANGE_EVENT,
    handleChange as EventListener
  );
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(
      ANTI_EVASION_SIMULATION_CHANGE_EVENT,
      handleChange as EventListener
    );
    window.removeEventListener('storage', handleStorage);
  };
};
