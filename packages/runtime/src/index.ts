import {
  resolvePlaybackState,
  type MediaClockSnapshot,
  type PlaybackModel,
  type PlaybackState,
} from "../../sync-engine/src/index";

export type RuntimeStateListener = (state: PlaybackState) => void;

export interface RuntimeController {
  readonly sample: (snapshot: MediaClockSnapshot) => PlaybackState;
  readonly getState: () => PlaybackState | null;
  readonly subscribe: (listener: RuntimeStateListener) => () => void;
  readonly dispose: () => void;
}

export function createRuntimeController(
  model: PlaybackModel,
): RuntimeController {
  let currentState: PlaybackState | null = null;
  let disposed = false;
  const listeners = new Set<RuntimeStateListener>();

  const sample = (snapshot: MediaClockSnapshot): PlaybackState => {
    const nextState = resolvePlaybackState(model, snapshot);
    if (disposed) {
      return nextState;
    }

    currentState = nextState;
    for (const listener of [...listeners]) {
      try {
        listener(currentState);
      } catch {
        // A listener cannot stop state resolution or other subscribers.
      }
    }
    return currentState;
  };

  const getState = (): PlaybackState | null => currentState;

  const subscribe = (listener: RuntimeStateListener): (() => void) => {
    if (disposed) {
      return (): void => {};
    }

    listeners.add(listener);
    return (): void => {
      listeners.delete(listener);
    };
  };

  const dispose = (): void => {
    disposed = true;
    listeners.clear();
  };

  return {
    sample,
    getState,
    subscribe,
    dispose,
  };
}
