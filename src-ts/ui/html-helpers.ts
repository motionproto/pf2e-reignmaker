// HTML Helper functions for UI components

export function html(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((result, str, i) => {
    const value = values[i] !== undefined ? values[i] : '';
    return result + str + value;
  }, '');
}

export function div(className?: string, content?: string): string {
  return `<div${className ? ` class="${className}"` : ''}>${content || ''}</div>`;
}

export function span(className?: string, content?: string): string {
  return `<span${className ? ` class="${className}"` : ''}>${content || ''}</span>`;
}

export function button(className?: string, onclick?: string, content?: string): string {
  return `<button${className ? ` class="${className}"` : ''}${onclick ? ` onclick="${onclick}"` : ''}>${content || ''}</button>`;
}

export function i(className?: string): string {
  return `<i class="${className || ''}"></i>`;
}

export function img(src: string, alt?: string, className?: string): string {
  return `<img src="${src}"${alt ? ` alt="${alt}"` : ''}${className ? ` class="${className}"` : ''}>`;
}

export function ul(className?: string, content?: string): string {
  return `<ul${className ? ` class="${className}"` : ''}>${content || ''}</ul>`;
}

export function li(className?: string, content?: string): string {
  return `<li${className ? ` class="${className}"` : ''}>${content || ''}</li>`;
}

export function h1(content?: string, className?: string): string {
  return `<h1${className ? ` class="${className}"` : ''}>${content || ''}</h1>`;
}

export function h2(content?: string, className?: string): string {
  return `<h2${className ? ` class="${className}"` : ''}>${content || ''}</h2>`;
}

export function h3(content?: string, className?: string): string {
  return `<h3${className ? ` class="${className}"` : ''}>${content || ''}</h3>`;
}

export function p(content?: string, className?: string): string {
  return `<p${className ? ` class="${className}"` : ''}>${content || ''}</p>`;
}
