const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Generador de FUA API',
        version: '1.0.0',
        description: 'API para gestión de RuleSets, reglas de grafo y evaluación de datos FUA.',
    },
    servers: [{ url: '/ws' }],
    components: {
        securitySchemes: {
            fuagentoken: {
                type: 'apiKey',
                in: 'header',
                name: 'fuagentoken',
            },
        },
        schemas: {
            RuleSetCreate: {
                type: 'object',
                required: ['name', 'documentType'],
                properties: {
                    name:           { type: 'string', example: 'Validación FUA 2024' },
                    documentType:   { type: 'string', example: 'FUA' },
                    description:    { type: 'string', example: 'Reglas de validación del formulario FUA' },
                    evaluationMode: { type: 'string', enum: ['ALL', 'FIRST_MATCH'], default: 'ALL' },
                },
            },
            RuleSetResponse: {
                type: 'object',
                properties: {
                    id:             { type: 'integer' },
                    uuid:           { type: 'string', format: 'uuid' },
                    name:           { type: 'string' },
                    documentType:   { type: 'string' },
                    description:    { type: 'string' },
                    evaluationMode: { type: 'string', enum: ['ALL', 'FIRST_MATCH'] },
                    active:         { type: 'boolean' },
                },
            },
            GraphNode: {
                type: 'object',
                required: ['nodeId', 'nodeType', 'config'],
                properties: {
                    nodeId:   { type: 'string', example: 'node-1' },
                    nodeType: { type: 'string', enum: ['CONDITION', 'GATE', 'PARAMETER'] },
                    config:   { type: 'object', additionalProperties: true },
                    label:    { type: 'string' },
                    isDefault: { type: 'boolean', default: false },
                },
            },
            GraphEdge: {
                type: 'object',
                required: ['sourceNodeId', 'targetNodeId'],
                properties: {
                    sourceNodeId: { type: 'string' },
                    targetNodeId: { type: 'string' },
                    edgeOrder:    { type: 'integer', default: 1 },
                    label:        { type: 'string' },
                },
            },
            RuleCreate: {
                type: 'object',
                required: ['ruleNumber', 'name', 'ruleType', 'graph'],
                properties: {
                    ruleNumber:  { type: 'string', example: '1' },
                    name:        { type: 'string', example: 'Validar edad del paciente' },
                    description: { type: 'string' },
                    ruleType:    { type: 'string', enum: ['VALIDATION', 'CONSISTENCY', 'FORMAT', 'BUSINESS'] },
                    enabled:     { type: 'boolean', default: true },
                    priority:    { type: 'integer', default: 1 },
                    graph: {
                        type: 'object',
                        properties: {
                            nodes: { type: 'array', items: { $ref: '#/components/schemas/GraphNode' } },
                            edges: { type: 'array', items: { $ref: '#/components/schemas/GraphEdge' } },
                        },
                    },
                },
            },
            EvalData: {
                type: 'object',
                required: ['data'],
                properties: {
                    data: {
                        type: 'object',
                        additionalProperties: true,
                        example: { edad: 25, diagnóstico: 'Z00.0' },
                    },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    error:   { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'object', nullable: true },
                },
            },
        },
    },
    security: [{ fuagentoken: [] }],
    paths: {
        // ── RuleSet ──────────────────────────────────────────────
        '/RuleSet/': {
            get: {
                tags: ['RuleSet'],
                summary: 'Listar todos los RuleSets',
                responses: {
                    200: { description: 'Lista de RuleSets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RuleSetResponse' } } } } },
                },
            },
            post: {
                tags: ['RuleSet'],
                summary: 'Crear un RuleSet',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RuleSetCreate' } } } },
                responses: {
                    201: { description: 'RuleSet creado', content: { 'application/json': { schema: { type: 'object', properties: { uuid: { type: 'string' }, id: { type: 'integer' } } } } } },
                    400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/RuleSet/{id}': {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID numérico o UUID del RuleSet' }],
            get: {
                tags: ['RuleSet'],
                summary: 'Obtener un RuleSet por ID o UUID',
                responses: {
                    200: { description: 'RuleSet encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/RuleSetResponse' } } } },
                    404: { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
            put: {
                tags: ['RuleSet'],
                summary: 'Actualizar un RuleSet',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RuleSetCreate' } } } },
                responses: {
                    200: { description: 'Actualizado', content: { 'application/json': { schema: { type: 'object', properties: { uuid: { type: 'string' }, updated: { type: 'boolean' } } } } } },
                },
            },
            delete: {
                tags: ['RuleSet'],
                summary: 'Eliminar (soft delete) un RuleSet',
                responses: {
                    200: { description: 'Eliminado', content: { 'application/json': { schema: { type: 'object', properties: { uuid: { type: 'string' }, deleted: { type: 'boolean' } } } } } },
                },
            },
        },

        // ── GraphRule ─────────────────────────────────────────────
        '/GraphRule/ruleset/{ruleSetId}/rules': {
            parameters: [{ name: 'ruleSetId', in: 'path', required: true, schema: { type: 'string' } }],
            get: {
                tags: ['GraphRule'],
                summary: 'Listar reglas de un RuleSet',
                responses: { 200: { description: 'Lista de reglas' } },
            },
        },
        '/GraphRule/ruleset/{ruleSetId}/rule': {
            parameters: [{ name: 'ruleSetId', in: 'path', required: true, schema: { type: 'string' } }],
            post: {
                tags: ['GraphRule'],
                summary: 'Crear una regla con grafo inicial',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RuleCreate' } } } },
                responses: {
                    201: { description: 'Regla creada' },
                    400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/GraphRule/rule/{ruleId}': {
            parameters: [{ name: 'ruleId', in: 'path', required: true, schema: { type: 'string' } }],
            get: {
                tags: ['GraphRule'],
                summary: 'Obtener una regla completa con su grafo',
                responses: { 200: { description: 'Regla con nodos y aristas' } },
            },
            put: {
                tags: ['GraphRule'],
                summary: 'Actualizar metadata de una regla',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RuleCreate' } } } },
                responses: { 200: { description: 'Actualizado' } },
            },
            delete: {
                tags: ['GraphRule'],
                summary: 'Eliminar (soft delete) una regla',
                responses: { 200: { description: 'Eliminado' } },
            },
        },
        '/GraphRule/rule/{ruleId}/graph': {
            parameters: [{ name: 'ruleId', in: 'path', required: true, schema: { type: 'string' } }],
            put: {
                tags: ['GraphRule'],
                summary: 'Reemplazar el grafo completo de una regla',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['graph'],
                                properties: {
                                    graph: {
                                        type: 'object',
                                        properties: {
                                            nodes: { type: 'array', items: { $ref: '#/components/schemas/GraphNode' } },
                                            edges: { type: 'array', items: { $ref: '#/components/schemas/GraphEdge' } },
                                        },
                                    },
                                    replacedBy: { type: 'string', example: 'ui-user' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Grafo reemplazado' } },
            },
        },
        '/GraphRule/rule/{ruleId}/validate': {
            parameters: [{ name: 'ruleId', in: 'path', required: true, schema: { type: 'string' } }],
            get: {
                tags: ['GraphRule'],
                summary: 'Validar la estructura del grafo de una regla',
                responses: {
                    200: {
                        description: 'Resultado de validación estructural',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        isValid:   { type: 'boolean' },
                                        errors:    { type: 'array', items: { type: 'object', properties: { message: { type: 'string' } } } },
                                        warnings:  { type: 'array', items: { type: 'object', properties: { message: { type: 'string' } } } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/GraphRule/ruleset/{ruleSetId}/import': {
            parameters: [{ name: 'ruleSetId', in: 'path', required: true, schema: { type: 'string' } }],
            post: {
                tags: ['GraphRule'],
                summary: 'Importar reglas desde JSON',
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { rules: { type: 'array', items: { $ref: '#/components/schemas/RuleCreate' } } } } } } },
                responses: { 200: { description: 'Resultado de importación', content: { 'application/json': { schema: { type: 'object', properties: { total: { type: 'integer' }, successful: { type: 'integer' }, failed: { type: 'integer' } } } } } } },
            },
        },
        '/GraphRule/ruleset/{ruleSetId}/export': {
            parameters: [{ name: 'ruleSetId', in: 'path', required: true, schema: { type: 'string' } }],
            get: {
                tags: ['GraphRule'],
                summary: 'Exportar todas las reglas de un RuleSet a JSON',
                responses: { 200: { description: 'JSON exportable del RuleSet' } },
            },
        },
        '/GraphRule/rule/{ruleId}/export': {
            parameters: [{ name: 'ruleId', in: 'path', required: true, schema: { type: 'string' } }],
            get: {
                tags: ['GraphRule'],
                summary: 'Exportar una regla individual a JSON',
                responses: { 200: { description: 'JSON exportable de la regla' } },
            },
        },

        // ── Evaluate ──────────────────────────────────────────────
        '/Evaluate/rule/{ruleId}': {
            parameters: [{ name: 'ruleId', in: 'path', required: true, schema: { type: 'string' }, description: 'UUID de la regla' }],
            post: {
                tags: ['Evaluate'],
                summary: 'Evaluar datos contra una regla individual',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EvalData' } } } },
                responses: {
                    200: {
                        description: 'Resultado de evaluación',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        isValid:              { type: 'boolean' },
                                        ruleNumber:           { type: 'string' },
                                        ruleName:             { type: 'string' },
                                        executionTimeMs:      { type: 'number' },
                                        errors:               { type: 'array', items: { type: 'object', properties: { nodeId: { type: 'string' }, message: { type: 'string' } } } },
                                        activatedParameters:  { type: 'array', items: { type: 'object' } },
                                    },
                                },
                            },
                        },
                    },
                    404: { description: 'Regla no encontrada' },
                },
            },
        },
        '/Evaluate/ruleset/{ruleSetId}': {
            parameters: [{ name: 'ruleSetId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID o UUID del RuleSet' }],
            post: {
                tags: ['Evaluate'],
                summary: 'Evaluar datos contra todas las reglas de un RuleSet',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EvalData' } } } },
                responses: {
                    200: {
                        description: 'Resultado agregado de evaluación',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        isValid:        { type: 'boolean' },
                                        totalRules:     { type: 'integer' },
                                        passedRules:    { type: 'integer' },
                                        failedRules:    { type: 'integer' },
                                        skippedRules:   { type: 'integer' },
                                        executionTimeMs:{ type: 'number' },
                                        ruleResults:    { type: 'array', items: { type: 'object' } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

export default swaggerSpec;
