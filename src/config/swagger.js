import swaggerJSDoc from "swagger-jsdoc";

const PORT = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "HealthSync Backend API",
      version: "1.0.0",
      description: "Swagger docs for testing HealthSync backend endpoints.",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    tags: [
      { name: "Auth" },
      { name: "Symptoms" },
      { name: "Dashboard" },
      { name: "Reports" },
      { name: "Medications" },
      { name: "Daily Monitoring" },
      { name: "Chat" },
      { name: "Diet" },
      { name: "Alerts" },
      { name: "AI" },
    ],
    paths: {
      "/": {
        get: {
          tags: ["Auth"],
          summary: "Health check",
          responses: {
            200: { description: "Backend is running" },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string" },
                    phone: { type: "string" },
                    age: { type: "number" },
                    gender: { type: "string" },
                    height: { type: "number" },
                    weight: { type: "number" },
                    diseaseTags: {
                      type: "array",
                      items: { type: "string" },
                    },
                    dietType: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Created" },
            400: { description: "Bad request" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Logged in" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/update-profile-image": {
        put: {
          tags: ["Auth"],
          summary: "Update profile image",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    image: {
                      type: "string",
                      format: "binary",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
          },
        },
      },
      "/api/symptoms": {
        get: {
          tags: ["Symptoms"],
          summary: "Get symptoms by user",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
        post: {
          tags: ["Symptoms"],
          summary: "Create symptom entry",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Created" } },
        },
      },
      "/api/symptoms/{id}": {
        get: {
          tags: ["Symptoms"],
          summary: "Get symptom by id",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/dashboard": {
        get: {
          tags: ["Dashboard"],
          summary: "Get dashboard data",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/dashboard/symptoms": {
        get: {
          tags: ["Dashboard"],
          summary: "Get symptom stats for dashboard",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/dashboard/alerts": {
        get: {
          tags: ["Dashboard"],
          summary: "Get alert stats for dashboard",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/report": {
        get: {
          tags: ["Reports"],
          summary: "Get report data",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/report/pdf/download": {
        get: {
          tags: ["Reports"],
          summary: "Download PDF report",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/report/pdf/view": {
        get: {
          tags: ["Reports"],
          summary: "View PDF report",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/report/pdf/email": {
        post: {
          tags: ["Reports"],
          summary: "Send report via email",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Email sent" } },
        },
      },
      "/api/medications": {
        get: {
          tags: ["Medications"],
          summary: "Get medications",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
        post: {
          tags: ["Medications"],
          summary: "Create medication",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Created" } },
        },
      },
      "/api/medications/{id}": {
        delete: {
          tags: ["Medications"],
          summary: "Delete medication",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Deleted" } },
        },
      },
      "/api/medications/{id}/adherence": {
        put: {
          tags: ["Medications"],
          summary: "Update medication adherence",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Updated" } },
        },
      },
      "/api/daily-monitoring/create": {
        post: {
          tags: ["Daily Monitoring"],
          summary: "Create daily monitoring record",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Created" } },
        },
      },
      "/api/daily-monitoring/history": {
        get: {
          tags: ["Daily Monitoring"],
          summary: "Get monitoring history",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/daily-monitoring/today": {
        get: {
          tags: ["Daily Monitoring"],
          summary: "Get today monitoring",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/daily-monitoring/insights": {
        get: {
          tags: ["Daily Monitoring"],
          summary: "Get monitoring insights",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/chat/send": {
        post: {
          tags: ["Chat"],
          summary: "Send chat message",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/chat/history": {
        get: {
          tags: ["Chat"],
          summary: "Get chat history",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/diet/generate": {
        post: {
          tags: ["Diet"],
          summary: "Generate diet plan",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/diet": {
        get: {
          tags: ["Diet"],
          summary: "Get diet plan",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/diet/{id}": {
        put: {
          tags: ["Diet"],
          summary: "Update diet plan",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Updated" } },
        },
      },
      "/api/diet/recipe": {
        get: {
          tags: ["Diet"],
          summary: "Get recipe",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/diet/ai": {
        post: {
          tags: ["Diet"],
          summary: "Generate AI recipes from diet module",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/diet/ai-generate": {
        post: {
          tags: ["Diet"],
          summary: "Generate AI diet from diet module",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/alerts": {
        get: {
          tags: ["Alerts"],
          summary: "Get alerts",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
        post: {
          tags: ["Alerts"],
          summary: "Create alert",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Created" } },
        },
      },
      "/api/alerts/{id}/status": {
        put: {
          tags: ["Alerts"],
          summary: "Update alert status",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Updated" } },
        },
      },
      "/ai/generate": {
        post: {
          tags: ["AI"],
          summary: "Generate AI recipes",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/ai/diet-generate": {
        post: {
          tags: ["AI"],
          summary: "Generate AI diet",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;