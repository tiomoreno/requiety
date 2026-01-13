import nunjucks from 'nunjucks';
import { Variable } from '../../shared/types';

// Configure nunjucks
nunjucks.configure({ autoescape: false });

export class TemplateEngine {
  /**
   * Render a string template with variables
   */
  static render(template: string, variables: Record<string, string>): string {
    if (!template) return '';
    try {
      return nunjucks.renderString(template, variables);
    } catch (error) {
      console.warn('Template render error:', error);
      return template;
    }
  }

  /**
   * render a Request object (URL, Headers, Body)
   */
  static renderRequest(request: any, variables: Variable[]): any {
    // Convert variables array to object map
    const context: Record<string, string> = {};
    variables.forEach((v) => {
      context[v.key] = v.value;
    });

    const rendered = { ...request };

    // 1. Render URL
    if (rendered.url) {
      rendered.url = this.render(rendered.url, context);
    }

    // 2. Render Headers
    if (rendered.headers) {
      rendered.headers = rendered.headers.map((h: any) => ({
        ...h,
        value: this.render(h.value, context),
        name: this.render(h.name, context), // Also render keys? Rare but possible.
      }));
    }

    // 3. Render Body
    if (rendered.body) {
         if (rendered.body.type === 'json' || rendered.body.type === 'raw' || rendered.body.type === 'text') {
             if (rendered.body.text) {
                 rendered.body.text = this.render(rendered.body.text, context);
             }
         }
         // TODO: Handle form-data logic if/when implemented
    }

    // 4. Render Auth
    if (rendered.authentication) {
        if (rendered.authentication.type === 'bearer' && rendered.authentication.token) {
            rendered.authentication.token = this.render(rendered.authentication.token, context);
        }
        if (rendered.authentication.type === 'basic') {
             if (rendered.authentication.username) rendered.authentication.username = this.render(rendered.authentication.username, context);
             if (rendered.authentication.password) rendered.authentication.password = this.render(rendered.authentication.password, context);
        }
    }

    return rendered;
  }
}
