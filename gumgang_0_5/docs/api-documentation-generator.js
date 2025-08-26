/**
 * 금강 2.0 - API 문서 자동 생성 시스템
 * Swagger/OpenAPI 3.0 기반 문서화
 */

const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const yaml = require('js-yaml');

/**
 * API 문서 생성기 클래스
 */
class APIDocumentationGenerator {
  constructor(config = {}) {
    this.config = {
      title: config.title || '금강 2.0 API Documentation',
      version: config.version || '2.0.0',
      description: config.description || '금강 2.0 실시간 협업 플랫폼 API',
      baseUrl: config.baseUrl || 'http://localhost:8001',
      sourcePaths: config.sourcePaths || ['./backend/app/api/**/*.py'],
      outputPath: config.outputPath || './docs/api',
      format: config.format || 'both', // 'json', 'yaml', 'both'
      theme: config.theme || 'default',
      ...config
    };

    this.openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: this.config.title,
        version: this.config.version,
        description: this.config.description,
        contact: {
          name: '금강 개발팀',
          email: 'dev@gumgang.com',
          url: 'https://gumgang.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: this.config.baseUrl,
          description: 'Development server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      },
      tags: []
    };

    this.endpoints = [];
    this.schemas = {};
  }

  /**
   * API 문서 생성 실행
   */
  async generate() {
    console.log('🚀 금강 2.0 API 문서 생성 시작...');

    try {
      // 1. 소스 파일 스캔
      await this.scanSourceFiles();

      // 2. 엔드포인트 추출
      await this.extractEndpoints();

      // 3. 스키마 생성
      await this.generateSchemas();

      // 4. OpenAPI 스펙 구성
      await this.buildOpenAPISpec();

      // 5. 문서 파일 생성
      await this.writeDocumentation();

      // 6. HTML 문서 생성
      await this.generateHTMLDocumentation();

      // 7. Postman 컬렉션 생성
      await this.generatePostmanCollection();

      console.log('✅ API 문서 생성 완료!');
      return this.openApiSpec;
    } catch (error) {
      console.error('❌ API 문서 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 소스 파일 스캔
   */
  async scanSourceFiles() {
    const files = [];

    for (const pattern of this.config.sourcePaths) {
      const matchedFiles = await new Promise((resolve, reject) => {
        glob(pattern, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      files.push(...matchedFiles);
    }

    console.log(`📁 ${files.length}개 소스 파일 발견`);
    this.sourceFiles = files;
  }

  /**
   * 엔드포인트 추출
   */
  async extractEndpoints() {
    for (const file of this.sourceFiles) {
      const content = await fs.readFile(file, 'utf-8');

      if (file.endsWith('.py')) {
        await this.extractPythonEndpoints(content, file);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        await this.extractJavaScriptEndpoints(content, file);
      }
    }

    console.log(`🔍 ${this.endpoints.length}개 엔드포인트 추출`);
  }

  /**
   * Python 엔드포인트 추출 (FastAPI)
   */
  async extractPythonEndpoints(content, filePath) {
    const endpoints = [];

    // FastAPI 라우터 패턴 매칭
    const routerPattern = /@(app|router)\.(get|post|put|delete|patch|options|head)\s*\(\s*["']([^"']+)["']/gm;
    const matches = content.matchAll(routerPattern);

    for (const match of matches) {
      const method = match[2].toUpperCase();
      const path = match[3];

      // 함수 정보 추출
      const functionPattern = new RegExp(
        `@.*${method.toLowerCase()}.*["']${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'].*\\n(?:@.*\\n)*async def (\\w+)\\([^)]*\\).*?(?:"""([^"]*)"""|\'\'\'([^']*)\'\'\')?`,
        'ms'
      );

      const funcMatch = content.match(functionPattern);

      if (funcMatch) {
        const endpoint = {
          method,
          path,
          operationId: funcMatch[1],
          summary: this.extractSummaryFromDocstring(funcMatch[2] || funcMatch[3] || ''),
          description: funcMatch[2] || funcMatch[3] || '',
          file: filePath,
          parameters: this.extractParametersFromPython(content, funcMatch[1]),
          responses: this.extractResponsesFromPython(content, funcMatch[1]),
          tags: this.extractTagsFromPath(path)
        };

        this.endpoints.push(endpoint);
      }
    }
  }

  /**
   * JavaScript/TypeScript 엔드포인트 추출
   */
  async extractJavaScriptEndpoints(content, filePath) {
    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'decorators-legacy']
      });

      const endpoints = [];

      traverse(ast, {
        CallExpression(path) {
          // Express 라우터 패턴
          if (path.node.callee.type === 'MemberExpression') {
            const object = path.node.callee.object;
            const property = path.node.callee.property;

            if (
              (object.name === 'app' || object.name === 'router') &&
              ['get', 'post', 'put', 'delete', 'patch'].includes(property.name)
            ) {
              const method = property.name.toUpperCase();
              const routePath = path.node.arguments[0]?.value;

              if (routePath) {
                endpoints.push({
                  method,
                  path: routePath,
                  file: filePath,
                  tags: this.extractTagsFromPath(routePath)
                });
              }
            }
          }
        }
      });

      this.endpoints.push(...endpoints);
    } catch (error) {
      console.warn(`⚠️ 파일 파싱 실패: ${filePath}`, error.message);
    }
  }

  /**
   * 파라미터 추출 (Python)
   */
  extractParametersFromPython(content, functionName) {
    const parameters = [];

    // 함수 시그니처에서 파라미터 추출
    const funcPattern = new RegExp(
      `async def ${functionName}\\(([^)]*)\\)`,
      'm'
    );

    const match = content.match(funcPattern);
    if (match) {
      const params = match[1].split(',').map(p => p.trim());

      for (const param of params) {
        if (param && !param.includes('request') && !param.includes('response')) {
          const [name, type] = param.split(':').map(p => p.trim());

          if (name) {
            parameters.push({
              name: name.replace('*', ''),
              in: 'query',
              required: !param.includes('='),
              schema: {
                type: this.pythonTypeToOpenAPI(type)
              }
            });
          }
        }
      }
    }

    return parameters;
  }

  /**
   * 응답 추출 (Python)
   */
  extractResponsesFromPython(content, functionName) {
    const responses = {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      }
    };

    // 반환 타입 힌트 확인
    const returnPattern = new RegExp(
      `async def ${functionName}\\([^)]*\\)\\s*->\\s*([^:]+):`,
      'm'
    );

    const match = content.match(returnPattern);
    if (match) {
      const returnType = match[1].trim();
      responses['200'].content['application/json'].schema = {
        $ref: `#/components/schemas/${returnType}`
      };
    }

    return responses;
  }

  /**
   * 스키마 생성
   */
  async generateSchemas() {
    // 기본 스키마들
    this.schemas = {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: '에러 메시지'
          },
          code: {
            type: 'integer',
            description: '에러 코드'
          },
          details: {
            type: 'object',
            description: '추가 상세 정보'
          }
        },
        required: ['error']
      },

      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '사용자 ID'
          },
          username: {
            type: 'string',
            description: '사용자명'
          },
          email: {
            type: 'string',
            format: 'email',
            description: '이메일 주소'
          },
          avatar: {
            type: 'string',
            format: 'uri',
            description: '프로필 이미지 URL'
          },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'guest'],
            description: '사용자 역할'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '생성 일시'
          }
        },
        required: ['id', 'username', 'email']
      },

      Project: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '프로젝트 ID'
          },
          name: {
            type: 'string',
            description: '프로젝트명'
          },
          description: {
            type: 'string',
            description: '프로젝트 설명'
          },
          owner: {
            $ref: '#/components/schemas/User'
          },
          members: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User'
            }
          },
          status: {
            type: 'string',
            enum: ['active', 'archived', 'deleted'],
            description: '프로젝트 상태'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'name', 'owner']
      },

      WebSocketMessage: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: '메시지 타입'
          },
          payload: {
            type: 'object',
            description: '메시지 페이로드'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          sender: {
            type: 'string',
            description: '발신자 ID'
          }
        },
        required: ['type', 'payload']
      },

      AIResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '응답 ID'
          },
          model: {
            type: 'string',
            description: '사용된 AI 모델'
          },
          content: {
            type: 'string',
            description: '응답 내용'
          },
          tokens: {
            type: 'object',
            properties: {
              prompt: {
                type: 'integer'
              },
              completion: {
                type: 'integer'
              },
              total: {
                type: 'integer'
              }
            }
          },
          metadata: {
            type: 'object',
            description: '추가 메타데이터'
          }
        },
        required: ['id', 'model', 'content']
      }
    };

    console.log(`📝 ${Object.keys(this.schemas).length}개 스키마 생성`);
  }

  /**
   * OpenAPI 스펙 구성
   */
  async buildOpenAPISpec() {
    // 태그 생성
    const tags = new Set();

    for (const endpoint of this.endpoints) {
      // 경로 객체 생성
      if (!this.openApiSpec.paths[endpoint.path]) {
        this.openApiSpec.paths[endpoint.path] = {};
      }

      // 메서드 정보 추가
      this.openApiSpec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        operationId: endpoint.operationId || `${endpoint.method.toLowerCase()}${endpoint.path.replace(/\//g, '_')}`,
        summary: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters || [],
        responses: endpoint.responses || {
          '200': {
            description: 'Successful response'
          }
        },
        security: [{ bearerAuth: [] }]
      };

      // 태그 수집
      endpoint.tags?.forEach(tag => tags.add(tag));
    }

    // 태그 정보 추가
    this.openApiSpec.tags = Array.from(tags).map(tag => ({
      name: tag,
      description: `${tag} 관련 API`
    }));

    // 스키마 추가
    this.openApiSpec.components.schemas = this.schemas;

    console.log(`📋 OpenAPI 스펙 구성 완료: ${Object.keys(this.openApiSpec.paths).length}개 경로`);
  }

  /**
   * 문서 파일 작성
   */
  async writeDocumentation() {
    const outputDir = this.config.outputPath;
    await fs.mkdir(outputDir, { recursive: true });

    // JSON 형식
    if (this.config.format === 'json' || this.config.format === 'both') {
      const jsonPath = path.join(outputDir, 'openapi.json');
      await fs.writeFile(
        jsonPath,
        JSON.stringify(this.openApiSpec, null, 2),
        'utf-8'
      );
      console.log(`📄 JSON 문서 생성: ${jsonPath}`);
    }

    // YAML 형식
    if (this.config.format === 'yaml' || this.config.format === 'both') {
      const yamlPath = path.join(outputDir, 'openapi.yaml');
      await fs.writeFile(
        yamlPath,
        yaml.dump(this.openApiSpec),
        'utf-8'
      );
      console.log(`📄 YAML 문서 생성: ${yamlPath}`);
    }
  }

  /**
   * HTML 문서 생성
   */
  async generateHTMLDocumentation() {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .header p {
            margin: 0.5rem 0 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .version-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
        #swagger-ui {
            margin-bottom: 2rem;
        }
        .download-section {
            text-align: center;
            padding: 2rem;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }
        .download-btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            margin: 0 0.5rem;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 0.25rem;
            transition: background 0.2s;
        }
        .download-btn:hover {
            background: #0056b3;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.2);
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.config.title}</h1>
        <p>${this.config.description}</p>
        <div class="version-badge">Version ${this.config.version}</div>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${Object.keys(this.openApiSpec.paths).length}</div>
                <div class="stat-label">Endpoints</div>
            </div>
            <div class="stat">
                <div class="stat-value">${this.endpoints.length}</div>
                <div class="stat-label">Operations</div>
            </div>
            <div class="stat">
                <div class="stat-value">${Object.keys(this.schemas).length}</div>
                <div class="stat-label">Schemas</div>
            </div>
        </div>
    </div>

    <div id="swagger-ui"></div>

    <div class="download-section">
        <h3>API 문서 다운로드</h3>
        <a href="./openapi.json" class="download-btn" download>📄 JSON</a>
        <a href="./openapi.yaml" class="download-btn" download>📄 YAML</a>
        <a href="./postman-collection.json" class="download-btn" download>📮 Postman Collection</a>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                url: "./openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "BaseLayout",
                docExpansion: "list",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
                displayRequestDuration: true,
                persistAuthorization: true
            });
        }
    </script>
</body>
</html>`;

    const htmlPath = path.join(this.config.outputPath, 'index.html');
    await fs.writeFile(htmlPath, html, 'utf-8');
    console.log(`🌐 HTML 문서 생성: ${htmlPath}`);
  }

  /**
   * Postman Collection 생성
   */
  async generatePostmanCollection() {
    const collection = {
      info: {
        name: this.config.title,
        description: this.config.description,
        version: this.config.version,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [],
      auth: {
        type: "bearer",
        bearer: [
          {
            key: "token",
            value: "{{access_token}}",
            type: "string"
          }
        ]
      },
      variable: [
        {
          key: "baseUrl",
          value: this.config.baseUrl,
          type: "string"
        },
        {
          key: "access_token",
          value: "",
          type: "string"
        }
      ]
    };

    // 태그별로 폴더 생성
    const folders = {};

    for (const endpoint of this.endpoints) {
      const tag = endpoint.tags?.[0] || 'default';

      if (!folders[tag]) {
        folders[tag] = {
          name: tag,
          item: []
        };
      }

      // Postman 요청 생성
      const request = {
        name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
        request: {
          method: endpoint.method,
          header: [
            {
              key: "Content-Type",
              value: "application/json"
            }
          ],
          url: {
            raw: `{{baseUrl}}${endpoint.path}`,
            host: ["{{baseUrl}}"],
            path: endpoint.path.split('/').filter(p => p)
          }
        },
        response: []
      };

      // 파라미터 추가
      if (endpoint.parameters?.length > 0) {
        request.request.url.query = endpoint.parameters
          .filter(p => p.in === 'query')
          .map(p => ({
            key: p.name,
            value: "",
            description: p.description
          }));
      }

      folders[tag].item.push(request);
    }

    collection.item = Object.values(folders);

    const postmanPath = path.join(this.config.outputPath, 'postman-collection.json');
    await fs.writeFile(
      postmanPath,
      JSON.stringify(collection, null, 2),
      'utf-8'
    );
    console.log(`📮 Postman Collection 생성: ${postmanPath}`);
  }

  /**
   * 유틸리티 함수들
   */

  extractSummaryFromDocstring(docstring) {
    if (!docstring) return '';
    const lines = docstring.split('\n');
    return lines[0]?.trim() || '';
  }

  extractTagsFromPath(path) {
    const segments = path.split('/').filter(s => s && !s.startsWith(':'));
    return segments.length > 0 ? [segments[0]] : ['default'];
  }

  pythonTypeToOpenAPI(pythonType) {
    if (!pythonType) return 'string';

    const typeMap = {
      'str': 'string',
      'int': 'integer',
      'float': 'number',
      'bool': 'boolean',
      'list': 'array',
      'dict': 'object',
      'datetime': 'string',
      'date': 'string',
      'uuid': 'string'
    };

    const cleanType = pythonType.toLowerCase().replace(/[^a-z]/g, '');
    return typeMap[cleanType] || 'string';
  }
}

/**
 * CLI 실행
 */
if (require.main === module) {
  const generator = new APIDocumentationGenerator({
    title: '금강 2.0 API',
    version: '2.0.0',
    description: '차세대 실시간 협업 플랫폼 API',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:8001',
    sourcePaths: [
      './backend/app/api/**/*.py',
      './backend/app/routers/**/*.py'
    ],
    outputPath: './docs/api',
    format: 'both'
  });

  generator.generate()
    .then(() => {
      console.log('🎉 API 문서 생성 완료!');
      console.log(`📂 문서 위치: ${generator.config.outputPath}`);
    })
    .catch(error => {
      console.error('❌ 문서 생성 실패:', error);
      process.exit(1);
    });
}

module.exports = APIDocumentationGenerator;
