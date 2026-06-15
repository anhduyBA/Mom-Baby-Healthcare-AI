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
      { name: "Recipes" },
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
      "/api/symptoms/analyze": {
        post: {
          tags: ["Symptoms"],
          summary: "Analyze symptom using AI (Gemini Vision)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["textDescription"],
                  properties: {
                    textDescription: { type: "string", description: "Text description of symptoms", minLength: 10, maxLength: 1000 },
                    image: { type: "string", format: "binary", description: "Optional image of the symptoms (max 10MB)" }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Symptom analyzed successfully" },
            400: { description: "Bad request/Validation Error" },
            429: { description: "Rate limit exceeded" }
          }
        }
      },
      "/api/symptoms/history": {
        get: {
          tags: ["Symptoms"],
          summary: "Get AI symptom analysis history",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 10 } }],
          responses: { 200: { description: "OK" } }
        }
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
      "/api/recipes/generate": {
        post: {
          tags: ["Recipes"],
          summary: "Generate AI recipes based on current lifestyle profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    dietType: { type: "string", description: "Dietary style choice" },
                    allergies: { type: "string", description: "Allergies info", maxLength: 200 },
                    maxCookTime: { type: "number", description: "Max prep time in minutes (10-120)", minimum: 10, maximum: 120 },
                    availableIngredients: { type: "string", description: "Pantry ingredients available" }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Recipes generated successfully" },
            400: { description: "Validation error / Missing lifestyle history" },
            429: { description: "Regeneration cooldown active" }
          }
        }
      },
      "/api/recipes/my": {
        get: {
          tags: ["Recipes"],
          summary: "Get user's generated recipes (cached/saved)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "profileId", in: "query", schema: { type: "string" } },
            { name: "difficulty", in: "query", schema: { type: "string", enum: ["Dễ", "Trung bình", "Khó"] } },
            { name: "isSaved", in: "query", schema: { type: "string", enum: ["true", "false"] } }
          ],
          responses: { 200: { description: "OK" } }
        }
      },
      "/api/recipes/{recipeId}": {
        get: {
          tags: ["Recipes"],
          summary: "Get recipe details by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "recipeId", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "OK" },
            404: { description: "Recipe not found" }
          }
        }
      },
      "/api/recipes/{recipeId}/save": {
        patch: {
          tags: ["Recipes"],
          summary: "Toggle recipe bookmark/saved state",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "recipeId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" } }
        }
      },
      "/api/recipes/profiles/current": {
        get: {
          tags: ["Recipes"],
          summary: "Get current student lifestyle nutrition profile details",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            404: { description: "Lifestyle data not recorded yet" }
          }
        }
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;