import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'АСУ ТП - Система управления устройствами API',
      version: '1.0.0',
      description: 'API для управления устройствами, сигналами и проектами в системе АСУ ТП',
      contact: {
        name: 'Команда разработки',
        email: 'support@asuopt.ru'
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Аутентификация пользователей'
      },
      {
        name: 'Devices',
        description: 'Управление устройствами'
      },
      {
        name: 'Signals',
        description: 'Управление сигналами'
      },
      {
        name: 'Projects',
        description: 'Управление проектами'
      }
    ],
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.asuopt.ru',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Device: {
          type: 'object',
          required: ['systemCode', 'equipmentCode', 'lineNumber', 'cabinetName', 'deviceDesignation', 'deviceType', 'description', 'projectId'],
          properties: {
            id: {
              type: 'integer',
              description: 'Уникальный идентификатор устройства'
            },
            systemCode: {
              type: 'string',
              description: 'Код системы'
            },
            equipmentCode: {
              type: 'string',
              description: 'Код оборудования'
            },
            lineNumber: {
              type: 'string',
              description: 'Номер линии'
            },
            cabinetName: {
              type: 'string',
              description: 'Название шкафа'
            },
            deviceDesignation: {
              type: 'string',
              description: 'Обозначение устройства'
            },
            deviceType: {
              type: 'string',
              description: 'Тип устройства'
            },
            description: {
              type: 'string',
              description: 'Описание устройства'
            },
            projectId: {
              type: 'integer',
              description: 'ID проекта'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата обновления'
            }
          }
        },
        DeviceReference: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Уникальный идентификатор'
            },
            posDesignation: {
              type: 'string',
              description: 'Позиционное обозначение'
            },
            deviceType: {
              type: 'string',
              description: 'Тип устройства'
            },
            description: {
              type: 'string',
              description: 'Описание'
            },
            systemCode: {
              type: 'string',
              description: 'Код системы'
            },
            plcType: {
              type: 'string',
              description: 'Тип ПЛК'
            },
            exVersion: {
              type: 'string',
              description: 'Ex-версия'
            },
            projectId: {
              type: 'integer',
              description: 'ID проекта'
            }
          }
        },
        Signal: {
          type: 'object',
          required: ['name', 'type', 'description'],
          properties: {
            id: {
              type: 'integer',
              description: 'Уникальный идентификатор сигнала'
            },
            name: {
              type: 'string',
              description: 'Название сигнала'
            },
            type: {
              type: 'string',
              enum: ['AI', 'AO', 'DI', 'DO'],
              description: 'Тип сигнала'
            },
            description: {
              type: 'string',
              description: 'Описание сигнала'
            },
            totalCount: {
              type: 'integer',
              description: 'Общее количество'
            },
            category: {
              type: 'string',
              description: 'Категория сигнала'
            },
            connectionType: {
              type: 'string',
              description: 'Тип подключения'
            },
            voltage: {
              type: 'string',
              description: 'Напряжение'
            }
          }
        },
        Project: {
          type: 'object',
          required: ['name', 'code'],
          properties: {
            id: {
              type: 'integer',
              description: 'Уникальный идентификатор проекта'
            },
            name: {
              type: 'string',
              description: 'Название проекта'
            },
            description: {
              type: 'string',
              description: 'Описание проекта'
            },
            code: {
              type: 'string',
              description: 'Код проекта (уникальный)'
            },
            status: {
              type: 'string',
              enum: ['active', 'archived', 'template'],
              description: 'Статус проекта'
            },
            deviceCount: {
              type: 'integer',
              description: 'Количество устройств в проекте'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата обновления'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Уникальный идентификатор пользователя'
            },
            username: {
              type: 'string',
              description: 'Имя пользователя'
            },
            email: {
              type: 'string',
              description: 'Email адрес'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'Роль пользователя'
            },
            isActive: {
              type: 'boolean',
              description: 'Статус активации пользователя'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата обновления'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Имя пользователя'
            },
            password: {
              type: 'string',
              description: 'Пароль'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Имя пользователя'
            },
            email: {
              type: 'string',
              description: 'Email адрес'
            },
            password: {
              type: 'string',
              description: 'Пароль'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT токен'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Сообщение об ошибке'
            },
            error: {
              type: 'string',
              description: 'Детали ошибки'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Пути к файлам с аннотациями
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };