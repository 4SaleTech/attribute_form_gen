import { createRenderer } from './createRenderer';
import type { FormConfig, RendererOptions } from './types';

export function renderForm(container: HTMLElement, formConfig: FormConfig, options?: RendererOptions) {
  return createRenderer({}).renderForm(container, formConfig, options);
}



