import type { ReactNode } from 'react';

export type LocaleString = Record<string, string>; // expect en, ar

export type Field = {
  id?: number;
  attribute_key: string;
  type: string;
  name: string;
  label: LocaleString;
  props?: any;
  status?: string;
  version?: number;
};

export type ThankYou = {
  show: boolean;
  title: LocaleString;
  message: LocaleString;
  duration_ms?: number;
  close_behavior?: string;
};

export type SubmitPipeline = {
  actions: { type: string; enabled: boolean; url?: string }[];
  ordering: string[];
  idempotency?: { enabled: boolean; key: string };
  timeout_ms?: number;
  on_error: 'continue' | 'stop';
};

export type FormConfig = {
  formId: string;
  version: number;
  title: LocaleString;
  fields: Field[];
  attributes: string[];
  thankYou?: ThankYou;
  submit?: SubmitPipeline;
  supported_locales: string[];
  default_locale: string;
};

export type Theme = {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  radii: Record<string, string>;
  typography: Record<string, string>;
};

export type ComponentsRegistry = Record<string, (props: any) => ReactNode>;

export type RendererOptions = {
  flags?: Record<string, boolean>;
  locale?: 'en' | 'ar';
  componentsOverrides?: Partial<ComponentsRegistry>;
  themeOverride?: Partial<Theme>;
};

export type Renderer = {
  renderForm: (container: HTMLElement, form: FormConfig, options?: RendererOptions) => void;
};



