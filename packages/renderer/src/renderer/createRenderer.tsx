import React from 'react';
import { createRoot } from 'react-dom/client';
import { DefaultComponents } from '../ui/registry';
import { defaultTheme, darkTheme, ThemeContext } from '../ui/theme';
import type { ComponentsRegistry, Renderer, RendererOptions, Theme, FormConfig } from './types';
import { FormView } from '../ui/FormView';

type CreateArgs = {
  components?: ComponentsRegistry;
  theme?: Theme;
  i18n?: { dir?: (locale: string) => 'ltr' | 'rtl' };
  hooks?: { onRender?: (form: FormConfig) => void };
};

export function createRenderer({ components, theme, i18n, hooks }: CreateArgs = {}): Renderer {
  const registry: ComponentsRegistry = { ...DefaultComponents, ...(components || {}) };
  const baseTheme = { ...defaultTheme, ...(theme || {}) };
  return {
    renderForm(container, form, options) {
      const isDark = document.documentElement.classList.contains('dark');
      const selectedTheme = isDark ? darkTheme : defaultTheme;
      const mergedTheme: Theme = { ...selectedTheme, ...baseTheme, ...(options?.themeOverride || {}) } as Theme;
      const comps = { ...registry, ...(options?.componentsOverrides || {}) };
      const locale = options?.locale || 'en';
      const dir = i18n?.dir?.(locale) || (locale === 'ar' ? 'rtl' : 'ltr');
      container.setAttribute('dir', dir);
      const root = createRoot(container);
      root.render(
        <ThemeContext.Provider value={mergedTheme}>
          <FormView form={form} components={comps} locale={locale} flags={options?.flags || {}} />
        </ThemeContext.Provider>
      );
      hooks?.onRender?.(form);
    },
  };
}



