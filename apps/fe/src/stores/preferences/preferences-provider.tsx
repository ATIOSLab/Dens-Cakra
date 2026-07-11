"use client";

import { createContext, use, useEffect, useState } from "react";

import { type StoreApi, useStore } from "zustand";

import {
  PREFERENCE_DEFAULTS,
  PREFERENCE_KEYS,
  PREFERENCE_REGISTRY,
  type PreferenceKey,
  type PreferenceValueMap,
  parsePreference,
} from "@/lib/preferences/preferences-config";
import { applyThemeMode, subscribeToSystemTheme } from "@/lib/preferences/theme-utils";

import { createPreferencesStore, type PreferencesState } from "./preferences-store";

const PreferencesStoreContext = createContext<StoreApi<PreferencesState> | null>(null);

function readDomPreference<K extends PreferenceKey>(key: K): PreferenceValueMap[K] {
  const definition = PREFERENCE_REGISTRY[key];
  const rawValue = document.documentElement.getAttribute(definition.attribute);

  return parsePreference(key, rawValue);
}

function readDomPreferences(): PreferenceValueMap {
  const values = { ...PREFERENCE_DEFAULTS };

  function assignPreference<K extends PreferenceKey>(key: K) {
    values[key] = readDomPreference(key);
  }

  for (const key of PREFERENCE_KEYS) assignPreference(key);
  return values;
}

function readCookie(name: string) {
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function readLocal(name: string) {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

function applyStoredPreferences() {
  const values = { ...PREFERENCE_DEFAULTS };

  function applyPreference<K extends PreferenceKey>(key: K) {
    const definition = PREFERENCE_REGISTRY[key];
    const persistence = definition.persistence as string;
    const persistedValue =
      persistence === "localStorage" ? readLocal(key) : readCookie(key);
    const value = parsePreference(key, persistedValue);

    values[key] = value;
    document.documentElement.setAttribute(definition.attribute, value);
  }

  for (const key of PREFERENCE_KEYS) applyPreference(key);

  const resolvedThemeMode = applyThemeMode(values.theme_mode);
  return { values, resolvedThemeMode };
}

export function PreferencesStoreProvider({
  children,
  initialValues,
}: {
  children: React.ReactNode;
  initialValues: PreferenceValueMap;
}) {
  const [store] = useState<StoreApi<PreferencesState>>(() => createPreferencesStore(initialValues));

  useEffect(() => {
    const syncedPreferences = applyStoredPreferences();
    store.setState({
      values: syncedPreferences.values,
      resolvedThemeMode: syncedPreferences.resolvedThemeMode,
      isSynced: true,
    });
  }, [store]);

  useEffect(() => {
    let unsubscribeMedia: (() => void) | undefined;

    const subscribeForMode = (mode: PreferenceValueMap["theme_mode"]) => {
      unsubscribeMedia?.();
      unsubscribeMedia = undefined;

      if (mode === "system") {
        unsubscribeMedia = subscribeToSystemTheme(() => {
          store.setState({ resolvedThemeMode: applyThemeMode("system") });
        });
      }
    };

    subscribeForMode(store.getState().values.theme_mode);

    const unsubscribeStore = store.subscribe((state, previousState) => {
      if (state.values.theme_mode !== previousState.values.theme_mode) {
        subscribeForMode(state.values.theme_mode);
      }
    });

    return () => {
      unsubscribeMedia?.();
      unsubscribeStore();
    };
  }, [store]);

  return <PreferencesStoreContext.Provider value={store}>{children}</PreferencesStoreContext.Provider>;
}

export function usePreferencesStore<T>(selector: (state: PreferencesState) => T): T {
  const store = use(PreferencesStoreContext);
  if (!store) throw new Error("Missing PreferencesStoreProvider");
  return useStore(store, selector);
}
