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

export type PurchaseAuthConfig = {
  require_authentication: boolean;
  auth_api_base_url: string;
  listings_api_base_url?: string;
  device_id: string;
  app_signature: string;
  version_number: string;
  purchase_api_url: string;
  adv_id_field: string;
  item_id_field: string;
  category_id_field: string;
  district_id_field: string;
  payment_method: string;
  user_lang: string;
  additional_webhooks?: Array<{
    url: string;
    method: string;
    headers?: Record<string, string>;
  }>;
};

export type SubmitAction = {
  type: string;
  enabled: boolean;
  url?: string;
  purchase_auth_config?: PurchaseAuthConfig;
};

export type SubmitPipeline = {
  actions: SubmitAction[];
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



