import path from 'path';
import fs from 'fs';
import type { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { config } from './config';

/**
 * Sirve Swagger UI en `/api/docs` y el contrato en `/api/openapi.json` y `/api/openapi.yaml`.
 */
export function setupSwagger(app: Application): void {
  const yamlPath = path.join(__dirname, '..', 'openapi.yaml');
  const raw = fs.readFileSync(yamlPath, 'utf8');
  const openApiSpec = yaml.parse(raw) as Record<string, unknown>;

  const publicUrl = (config.apiUrl || `http://localhost:${config.port}`).replace(/\/$/, '');
  if (openApiSpec.servers && Array.isArray(openApiSpec.servers)) {
    openApiSpec.servers = [
      { url: publicUrl, description: 'Este despliegue (API_URL)' },
      ...(openApiSpec.servers as object[]),
    ];
  }

  const sendJson = (_req: Request, res: Response) => {
    res.json(openApiSpec);
  };
  const sendYaml = (_req: Request, res: Response) => {
    res.type('text/yaml; charset=utf-8').send(raw);
  };

  app.get('/api/openapi.json', sendJson);
  app.get('/api/openapi.yaml', sendYaml);

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Kora Nova API — Swagger',
    })
  );
}
