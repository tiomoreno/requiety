// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { TemplateEngine } from './template-engine';
import { Variable } from '@shared/types';
import nunjucks from 'nunjucks';
import { LoggerService } from '../services/logger.service';

vi.mock('nunjucks', async () => {
  return {
    default: {
      configure: vi.fn(),
      renderString: vi.fn((tmpl, ctx) => {
        if (tmpl === 'THROW_ERROR') {
          throw new Error('Test Error');
        }
        let res = tmpl;
        if (ctx) {
          for (const key in ctx) {
            res = res.replace(new RegExp(`{{${key}}}`, 'g'), ctx[key]);
          }
        }
        return res;
      }),
    },
  };
});

describe('TemplateEngine', () => {
  const variables: Variable[] = [
    {
      _id: '1',
      type: 'Variable',
      created: 0,
      modified: 0,
      environmentId: 'env_1',
      key: 'baseUrl',
      value: 'https://api.example.com',
      isSecret: false,
    },
    {
      _id: '2',
      type: 'Variable',
      created: 0,
      modified: 0,
      environmentId: 'env_1',
      key: 'token',
      value: 'secret-token',
      isSecret: true,
    },
    {
      _id: '3',
      type: 'Variable',
      created: 0,
      modified: 0,
      environmentId: 'env_1',
      key: 'userId',
      value: '123',
      isSecret: false,
    },
  ];

  describe('render', () => {
    it('should replace variables in string', () => {
      const template = '{{baseUrl}}/users/{{userId}}';
      const context = { baseUrl: 'https://api.example.com', userId: '123' };
      const result = TemplateEngine.render(template, context);
      expect(result).toBe('https://api.example.com/users/123');
    });

    it('should return original string if no variables match', () => {
      const template = 'plain text';
      const result = TemplateEngine.render(template, {});
      expect(result).toBe('plain text');
    });

    it('should return empty string if template is null/undefined', () => {
      expect(TemplateEngine.render(null as any, {})).toBe('');
    });

    it('should catch error and return original template', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const loggerSpy = vi.spyOn(LoggerService, 'warn').mockImplementation(() => {});
      const res = TemplateEngine.render('THROW_ERROR', {});
      expect(res).toBe('THROW_ERROR');
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('renderRequest', () => {
    it('should render URL', () => {
      const request: any = {
        url: '{{baseUrl}}/api/v1',
        headers: [],
        body: { type: 'none' },
      };

      const rendered = TemplateEngine.renderRequest(request, variables);
      expect(rendered.url).toBe('https://api.example.com/api/v1');
    });

    it('should render headers', () => {
      const request: any = {
        url: 'http://foo.com',
        headers: [
          { name: 'Authorization', value: 'Bearer {{token}}' },
          { name: 'X-User', value: '{{userId}}' },
        ],
        body: { type: 'none' },
      };

      const rendered = TemplateEngine.renderRequest(request, variables);
      expect(rendered.headers[0].value).toBe('Bearer secret-token');
      expect(rendered.headers[1].value).toBe('123');
    });

    it('should render JSON body text', () => {
      const request: any = {
        url: 'http://foo.com',
        headers: [],
        body: {
          type: 'json',
          text: '{ "id": {{userId}} }',
        },
      };

      const rendered = TemplateEngine.renderRequest(request, variables);
      expect(rendered.body.text).toBe('{ "id": 123 }');
    });

    it('should render other body types', () => {
      const reqRaw = { body: { type: 'raw', text: '{{userId}}' } };
      const resRaw = TemplateEngine.renderRequest(reqRaw, variables);
      expect(resRaw.body.text).toBe('123');

      const reqText = { body: { type: 'text', text: '{{userId}}' } };
      const resText = TemplateEngine.renderRequest(reqText, variables);
      expect(resText.body.text).toBe('123');
    });

    it('should render GraphQL query and variables', () => {
      const request: any = {
        url: 'http://foo.com',
        headers: [],
        body: {
          type: 'graphql',
          graphql: {
            query: 'query { user(id: "{{userId}}") { name } }',
            variables: '{ "token": "{{token}}" }',
          },
        },
      };

      const rendered = TemplateEngine.renderRequest(request, variables);
      expect(rendered.body.graphql.query).toBe('query { user(id: "123") { name } }');
      expect(rendered.body.graphql.variables).toBe('{ "token": "secret-token" }');
    });

    it('should render auth', () => {
      const reqBearer = { authentication: { type: 'bearer', token: '{{token}}' } };
      const resBearer = TemplateEngine.renderRequest(reqBearer, variables);
      expect(resBearer.authentication.token).toBe('secret-token');

      const reqBasic = {
        authentication: { type: 'basic', username: '{{userId}}', password: '{{token}}' },
      };
      const resBasic = TemplateEngine.renderRequest(reqBasic, variables);
      expect(resBasic.authentication.username).toBe('123');
      expect(resBasic.authentication.password).toBe('secret-token');
    });

    it('should render form-urlencoded params', () => {
      const request: any = {
        url: 'http://foo.com',
        headers: [],
        body: {
          type: 'form-urlencoded',
          params: [
            { name: 'user_id', value: '{{userId}}', enabled: true },
            { name: 'api_key', value: '{{token}}', enabled: true },
          ],
        },
      };

      const rendered = TemplateEngine.renderRequest(request, variables);
      expect(rendered.body.params[0].value).toBe('123');
      expect(rendered.body.params[1].value).toBe('secret-token');
    });

    it('should render form-data params', () => {
      const request: any = {
        url: 'http://foo.com',
        headers: [],
        body: {
          type: 'form-data',
          params: [
            { name: '{{baseUrl}}', value: '{{userId}}', enabled: true },
            { name: 'secret', value: '{{token}}', enabled: false },
          ],
        },
      };

      const rendered = TemplateEngine.renderRequest(request, variables);
      expect(rendered.body.params[0].name).toBe('https://api.example.com');
      expect(rendered.body.params[0].value).toBe('123');
      expect(rendered.body.params[1].value).toBe('secret-token');
    });
  });
});
