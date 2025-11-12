
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { contactSalesWorkflow } from './workflows/contact-sales-workflow';
import { workflowRoute } from '@mastra/ai-sdk';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, contactSalesWorkflow },
  agents: { weatherAgent },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
  server: {
    cors: {
      origin: "*",
      allowMethods: ["*"],
      allowHeaders: ["*"],
    },
    apiRoutes: [
      workflowRoute({
        path: "/workflow/:workflowId",
      })
    ]
  }
});
