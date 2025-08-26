import { parse as parseTypeScript } from "@typescript-eslint/parser";
import { parse as parseJavaScript } from "acorn";
import { ancestor as walkAncestor } from "acorn-walk";
import * as path from "path";
import { CodeNode, CodeEdge } from "./Code3DVisualizationEngine";

// Types for code analysis
export interface AnalysisResult {
  nodes: CodeNode[];
  edges: CodeEdge[];
  metrics: ProjectMetrics;
  timestamp: number;
}

export interface ProjectMetrics {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalLines: number;
  avgComplexity: number;
  maxComplexity: number;
  dependencies: number;
  codeSmells: CodeSmell[];
}

export interface CodeSmell {
  type:
    | "long-method"
    | "large-class"
    | "duplicate-code"
    | "circular-dependency"
    | "god-object";
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  message: string;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
}

export interface ASTNode {
  type: string;
  name?: string;
  start?: number;
  end?: number;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  body?: any;
  declarations?: any[];
  id?: any;
  params?: any[];
  superClass?: any;
  source?: any;
  specifiers?: any[];
  callee?: any;
  arguments?: any[];
  [key: string]: any;
}

// Language-specific parsers
interface LanguageParser {
  parse(content: string): ASTNode;
  walk(ast: ASTNode, visitor: (node: ASTNode, parent?: ASTNode) => void): void;
}

class TypeScriptParser implements LanguageParser {
  parse(content: string): ASTNode {
    return parseTypeScript(content, {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
        globalReturn: false,
      },
    });
  }

  walk(ast: ASTNode, visitor: (node: ASTNode, parent?: ASTNode) => void): void {
    const traverse = (node: ASTNode, parent?: ASTNode) => {
      if (!node || typeof node !== "object") return;

      visitor(node, parent);

      for (const key in node) {
        if (key === "parent") continue;
        const value = node[key];

        if (Array.isArray(value)) {
          value.forEach((child) => {
            if (typeof child === "object") traverse(child, node);
          });
        } else if (typeof value === "object" && value !== null) {
          traverse(value, node);
        }
      }
    };

    traverse(ast);
  }
}

class JavaScriptParser implements LanguageParser {
  parse(content: string): ASTNode {
    return parseJavaScript(content, {
      ecmaVersion: 2022,
      sourceType: "module",
      allowHashBang: true,
      allowReturnOutsideFunction: true,
    }) as ASTNode;
  }

  walk(ast: ASTNode, visitor: (node: ASTNode, parent?: ASTNode) => void): void {
    // @ts-expect-error: acorn-walk type mismatch with visitor function signature
    walkAncestor(ast as any, (node: any, ancestors: any[]) => {
      visitor(node as ASTNode, ancestors[ancestors.length - 2] as ASTNode);
    });
  }
}

// Main Code Structure Analyzer
export class CodeStructureAnalyzer {
  private parsers: Map<string, LanguageParser>;
  private cache: Map<string, AnalysisResult>;
  private cacheTimeout: number = 60000; // 1 minute
  private nodeIdCounter: number = 0;
  private edgeIdCounter: number = 0;

  constructor() {
    this.parsers = new Map();
    this.cache = new Map();

    // Register parsers
    const tsParser = new TypeScriptParser();
    const jsParser = new JavaScriptParser();

    this.parsers.set("typescript", tsParser);
    this.parsers.set("javascript", jsParser);
    this.parsers.set("tsx", tsParser);
    this.parsers.set("jsx", jsParser);
  }

  // Analyze a single file
  public async analyzeFile(file: FileContent): Promise<AnalysisResult> {
    const cacheKey = `${file.path}:${file.content.length}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }

    const parser = this.getParser(file.language);
    if (!parser) {
      throw new Error(`Unsupported language: ${file.language}`);
    }

    try {
      const ast = parser.parse(file.content);
      const result = this.extractStructure(ast, file, parser);

      // Cache the result
      this.cache.set(cacheKey, result);

      // Clean old cache entries
      this.cleanCache();

      return result;
    } catch (error) {
      console.error(`Failed to analyze file ${file.path}:`, error);
      return {
        nodes: [],
        edges: [],
        metrics: this.createEmptyMetrics(),
        timestamp: Date.now(),
      };
    }
  }

  // Analyze multiple files and create project structure
  public async analyzeProject(files: FileContent[]): Promise<AnalysisResult> {
    const allNodes: CodeNode[] = [];
    const allEdges: CodeEdge[] = [];
    const fileNodeMap = new Map<string, string>(); // file path -> file node id
    const functionNodeMap = new Map<string, string>(); // function full name -> node id
    const classNodeMap = new Map<string, string>(); // class full name -> node id

    // First pass: analyze all files and collect nodes
    for (const file of files) {
      const result = await this.analyzeFile(file);

      // Create file node
      const fileNode: CodeNode = {
        id: this.generateNodeId(),
        type: "file",
        name: path.basename(file.path),
        path: file.path,
        size: file.content.length / 1000, // KB
        children: [],
        metadata: {
          language: file.language,
          lines: file.content.split("\n").length,
        },
      };

      fileNodeMap.set(file.path, fileNode.id);
      allNodes.push(fileNode);

      // Add child nodes
      result.nodes.forEach((node) => {
        node.id = this.generateNodeId();
        fileNode.children?.push(node);
        allNodes.push(node);

        // Map functions and classes for dependency resolution
        if (node.type === "function") {
          functionNodeMap.set(`${file.path}:${node.name}`, node.id);
        } else if (node.type === "class") {
          classNodeMap.set(`${file.path}:${node.name}`, node.id);
        }
      });

      // Collect edges
      allEdges.push(...result.edges);
    }

    // Second pass: resolve cross-file dependencies
    const crossFileEdges = this.resolveCrossFileDependencies(
      allNodes,
      allEdges,
      fileNodeMap,
      functionNodeMap,
      classNodeMap,
    );

    allEdges.push(...crossFileEdges);

    // Calculate project metrics
    const metrics = this.calculateProjectMetrics(allNodes, allEdges);

    // Apply layout algorithm
    this.applyForceDirectedLayout(allNodes, allEdges);

    return {
      nodes: allNodes,
      edges: allEdges,
      metrics,
      timestamp: Date.now(),
    };
  }

  // Extract structure from AST
  private extractStructure(
    ast: ASTNode,
    file: FileContent,
    parser: LanguageParser,
  ): AnalysisResult {
    const nodes: CodeNode[] = [];
    const edges: CodeEdge[] = [];
    const imports: Map<string, string> = new Map();
    const exports: Set<string> = new Set();
    const callGraph: Map<string, Set<string>> = new Map();

    let currentFunction: string | null = null;
    let complexity = 0;

    parser.walk(ast, (node, _parent) => {
      switch (node.type) {
        case "ImportDeclaration":
          this.handleImport(node, imports, nodes, edges);
          break;

        case "ExportNamedDeclaration":
        case "ExportDefaultDeclaration":
          this.handleExport(node, exports, nodes);
          break;

        case "FunctionDeclaration":
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          const funcNode = this.handleFunction(node, file.path);
          if (funcNode) {
            nodes.push(funcNode);
            currentFunction = funcNode.name;
            complexity += this.calculateCyclomaticComplexity(node);
          }
          break;

        case "ClassDeclaration":
        case "ClassExpression":
          const classNode = this.handleClass(node, file.path);
          if (classNode) {
            nodes.push(classNode);
            // Track class name if needed

            // Handle inheritance
            if (node.superClass) {
              edges.push({
                id: this.generateEdgeId(),
                source: classNode.id,
                target: node.superClass.name,
                type: "inheritance",
              });
            }
          }
          break;

        case "VariableDeclaration":
          this.handleVariable(node, nodes);
          break;

        case "CallExpression":
          this.handleCall(node, currentFunction, callGraph);
          break;

        case "IfStatement":
        case "ConditionalExpression":
        case "SwitchCase":
        case "WhileStatement":
        case "DoWhileStatement":
        case "ForStatement":
        case "ForInStatement":
        case "ForOfStatement":
          complexity++;
          break;
      }
    });

    // Create edges from call graph
    callGraph.forEach((targets, source) => {
      targets.forEach((target) => {
        edges.push({
          id: this.generateEdgeId(),
          source,
          target,
          type: "call",
          weight: 1,
        });
      });
    });

    // Calculate metrics
    const metrics: ProjectMetrics = {
      totalFiles: 1,
      totalFunctions: nodes.filter((n) => n.type === "function").length,
      totalClasses: nodes.filter((n) => n.type === "class").length,
      totalLines: file.content.split("\n").length,
      avgComplexity:
        complexity /
        Math.max(1, nodes.filter((n) => n.type === "function").length),
      maxComplexity: complexity,
      dependencies: imports.size,
      codeSmells: this.detectCodeSmells(nodes, edges, file),
    };

    return { nodes, edges, metrics, timestamp: Date.now() };
  }

  // Handle import statements
  private handleImport(
    node: ASTNode,
    imports: Map<string, string>,
    nodes: CodeNode[],
    _edges: CodeEdge[],
  ): void {
    const source = node.source?.value;
    if (!source) return;

    const importNode: CodeNode = {
      id: this.generateNodeId(),
      type: "import",
      name: source,
      metadata: {
        specifiers: node.specifiers?.map(
          (s: any) => s.local?.name || s.imported?.name,
        ),
      },
    };

    nodes.push(importNode);

    node.specifiers?.forEach((spec: any) => {
      if (spec.local?.name) {
        imports.set(spec.local.name, source);
      }
    });
  }

  // Handle export statements
  private handleExport(
    node: ASTNode,
    exports: Set<string>,
    nodes: CodeNode[],
  ): void {
    if (node.declaration) {
      const name = node.declaration.id?.name || "default";
      exports.add(name);

      const exportNode: CodeNode = {
        id: this.generateNodeId(),
        type: "export",
        name,
        metadata: {
          default: node.type === "ExportDefaultDeclaration",
        },
      };

      nodes.push(exportNode);
    }
  }

  // Handle function declarations
  private handleFunction(node: ASTNode, _filePath: string): CodeNode | null {
    const name = node.id?.name || "anonymous";
    const params = node.params?.length || 0;
    const loc = node.loc;
    const lines = loc ? loc.end.line - loc.start.line + 1 : 0;

    return {
      id: this.generateNodeId(),
      type: "function",
      name,
      complexity: this.calculateCyclomaticComplexity(node),
      metadata: {
        params,
        lines,
        async: node.async || false,
        generator: node.generator || false,
        arrow: node.type === "ArrowFunctionExpression",
      },
    };
  }

  // Handle class declarations
  private handleClass(node: ASTNode, _filePath: string): CodeNode | null {
    const name = node.id?.name || "anonymous";
    const loc = node.loc;
    const lines = loc ? loc.end.line - loc.start.line + 1 : 0;

    // Count methods and properties
    let methods = 0;
    let properties = 0;

    if (node.body?.body) {
      node.body.body.forEach((member: any) => {
        if (member.type === "MethodDefinition") {
          methods++;
        } else if (member.type === "PropertyDefinition") {
          properties++;
        }
      });
    }

    return {
      id: this.generateNodeId(),
      type: "class",
      name,
      complexity: methods + properties,
      metadata: {
        methods,
        properties,
        lines,
        extends: node.superClass?.name,
      },
    };
  }

  // Handle variable declarations
  private handleVariable(node: ASTNode, nodes: CodeNode[]): void {
    node.declarations?.forEach((decl: any) => {
      if (decl.id?.name) {
        nodes.push({
          id: this.generateNodeId(),
          type: "variable",
          name: decl.id.name,
          metadata: {
            kind: node.kind, // const, let, var
            initialized: decl.init !== null,
          },
        });
      }
    });
  }

  // Handle function calls
  private handleCall(
    node: ASTNode,
    currentFunction: string | null,
    callGraph: Map<string, Set<string>>,
  ): void {
    if (!currentFunction) return;

    const callee = this.getCalleeName(node.callee);
    if (!callee) return;

    if (!callGraph.has(currentFunction)) {
      callGraph.set(currentFunction, new Set());
    }

    callGraph.get(currentFunction)!.add(callee);
  }

  // Get callee name from call expression
  private getCalleeName(callee: any): string | null {
    if (!callee) return null;

    switch (callee.type) {
      case "Identifier":
        return callee.name;
      case "MemberExpression":
        const object = this.getCalleeName(callee.object);
        const property = callee.property?.name;
        return object && property ? `${object}.${property}` : null;
      default:
        return null;
    }
  }

  // Calculate cyclomatic complexity
  private calculateCyclomaticComplexity(node: ASTNode): number {
    let complexity = 1;

    const traverse = (n: ASTNode) => {
      if (!n || typeof n !== "object") return;

      switch (n.type) {
        case "IfStatement":
        case "ConditionalExpression":
        case "SwitchCase":
        case "WhileStatement":
        case "DoWhileStatement":
        case "ForStatement":
        case "ForInStatement":
        case "ForOfStatement":
          complexity++;
          break;
        case "LogicalExpression":
          if (n.operator === "&&" || n.operator === "||") {
            complexity++;
          }
          break;
      }

      for (const key in n) {
        if (key === "parent") continue;
        const value = n[key];

        if (Array.isArray(value)) {
          value.forEach((child) => traverse(child));
        } else if (typeof value === "object" && value !== null) {
          traverse(value);
        }
      }
    };

    traverse(node);
    return complexity;
  }

  // Detect code smells
  private detectCodeSmells(
    nodes: CodeNode[],
    edges: CodeEdge[],
    file: FileContent,
  ): CodeSmell[] {
    const smells: CodeSmell[] = [];

    // Check for long methods
    nodes
      .filter((n) => n.type === "function")
      .forEach((func) => {
        const lines = func.metadata?.lines || 0;
        if (lines > 50) {
          smells.push({
            type: "long-method",
            severity: lines > 100 ? "high" : "medium",
            location: `${file.path}:${func.name}`,
            message: `Function ${func.name} has ${lines} lines (threshold: 50)`,
          });
        }

        // Check for high complexity
        const complexity = func.complexity || 0;
        if (complexity > 10) {
          smells.push({
            type: "long-method",
            severity: complexity > 20 ? "critical" : "high",
            location: `${file.path}:${func.name}`,
            message: `Function ${func.name} has complexity ${complexity} (threshold: 10)`,
          });
        }
      });

    // Check for large classes
    nodes
      .filter((n) => n.type === "class")
      .forEach((cls) => {
        const methods = cls.metadata?.methods || 0;
        if (methods > 20) {
          smells.push({
            type: "large-class",
            severity: methods > 40 ? "high" : "medium",
            location: `${file.path}:${cls.name}`,
            message: `Class ${cls.name} has ${methods} methods (threshold: 20)`,
          });
        }
      });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) return true;
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    nodes.forEach((node) => {
      if (!visited.has(node.id) && hasCycle(node.id)) {
        smells.push({
          type: "circular-dependency",
          severity: "critical",
          location: file.path,
          message: `Circular dependency detected involving ${node.name}`,
        });
      }
    });

    return smells;
  }

  // Resolve cross-file dependencies
  private resolveCrossFileDependencies(
    nodes: CodeNode[],
    _edges: CodeEdge[],
    fileNodeMap: Map<string, string>,
    _functionNodeMap: Map<string, string>,
    _classNodeMap: Map<string, string>,
  ): CodeEdge[] {
    const crossFileEdges: CodeEdge[] = [];

    // Analyze import nodes
    nodes
      .filter((n) => n.type === "import")
      .forEach((importNode) => {
        const source = importNode.name;
        if (!source) return;

        // Try to resolve the import path
        const resolvedPath = this.resolveImportPath(source);
        const targetFileId = fileNodeMap.get(resolvedPath);

        if (targetFileId) {
          crossFileEdges.push({
            id: this.generateEdgeId(),
            source: importNode.id,
            target: targetFileId,
            type: "import",
            weight: 1,
            metadata: {
              module: source,
            },
          });
        }
      });

    return crossFileEdges;
  }

  // Resolve import path to actual file path
  private resolveImportPath(importPath: string): string {
    // Simple resolution - in real implementation would use module resolution algorithm
    if (importPath.startsWith(".")) {
      return path.resolve(importPath);
    }
    return importPath;
  }

  // Apply force-directed layout to nodes
  private applyForceDirectedLayout(nodes: CodeNode[], edges: CodeEdge[]): void {
    const nodeMap = new Map<string, CodeNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // Initialize positions randomly
    nodes.forEach((node) => {
      if (!node.position) {
        node.position = {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          z: (Math.random() - 0.5) * 100,
        } as any;
      }
    });

    // Apply force-directed algorithm
    const iterations = 50;
    const k = 10; // Optimal distance
    const c = 0.1; // Speed

    for (let iter = 0; iter < iterations; iter++) {
      // Calculate repulsive forces
      nodes.forEach((node1) => {
        const force = { x: 0, y: 0, z: 0 };

        nodes.forEach((node2) => {
          if (node1.id === node2.id) return;

          const dx = (node1.position as any).x - (node2.position as any).x;
          const dy = (node1.position as any).y - (node2.position as any).y;
          const dz = (node1.position as any).z - (node2.position as any).z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;

          const repulsiveForce = (k * k) / dist;
          force.x += (dx / dist) * repulsiveForce;
          force.y += (dy / dist) * repulsiveForce;
          force.z += (dz / dist) * repulsiveForce;
        });

        // Apply attractive forces from edges
        edges.forEach((edge) => {
          let otherNode: CodeNode | undefined;

          if (edge.source === node1.id) {
            otherNode = nodeMap.get(edge.target);
          } else if (edge.target === node1.id) {
            otherNode = nodeMap.get(edge.source);
          }

          if (otherNode) {
            const dx =
              (otherNode.position as any).x - (node1.position as any).x;
            const dy =
              (otherNode.position as any).y - (node1.position as any).y;
            const dz =
              (otherNode.position as any).z - (node1.position as any).z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;

            const attractiveForce = (dist * dist) / k;
            force.x += (dx / dist) * attractiveForce * 0.01;
            force.y += (dy / dist) * attractiveForce * 0.01;
            force.z += (dz / dist) * attractiveForce * 0.01;
          }
        });

        // Update position
        (node1.position as any).x += force.x * c;
        (node1.position as any).y += force.y * c;
        (node1.position as any).z += force.z * c;
      });
    }

    // Group nodes by type for better visualization
    const typeGroups = new Map<string, CodeNode[]>();
    nodes.forEach((node) => {
      if (!typeGroups.has(node.type)) {
        typeGroups.set(node.type, []);
      }
      typeGroups.get(node.type)!.push(node);
    });

    // Adjust positions to create layers
    let layerOffset = 0;
    typeGroups.forEach((groupNodes, _type) => {
      groupNodes.forEach((node) => {
        (node.position as any).y += layerOffset;
      });
      layerOffset += 20;
    });
  }

  // Calculate project metrics
  private calculateProjectMetrics(
    nodes: CodeNode[],
    edges: CodeEdge[],
  ): ProjectMetrics {
    const functions = nodes.filter((n) => n.type === "function");
    const classes = nodes.filter((n) => n.type === "class");
    const files = nodes.filter((n) => n.type === "file");

    const totalComplexity = functions.reduce(
      (sum, f) => sum + (f.complexity || 0),
      0,
    );
    const maxComplexity = Math.max(
      ...functions.map((f) => f.complexity || 0),
      0,
    );

    return {
      totalFiles: files.length,
      totalFunctions: functions.length,
      totalClasses: classes.length,
      totalLines: files.reduce((sum, f) => sum + (f.metadata?.lines || 0), 0),
      avgComplexity:
        functions.length > 0 ? totalComplexity / functions.length : 0,
      maxComplexity,
      dependencies: edges.filter((e) => e.type === "import").length,
      codeSmells: [], // Aggregated from individual file analyses
    };
  }

  // Helper methods
  private getParser(language: string): LanguageParser | null {
    return this.parsers.get(language.toLowerCase()) || null;
  }

  private generateNodeId(): string {
    return `node_${++this.nodeIdCounter}`;
  }

  private generateEdgeId(): string {
    return `edge_${++this.edgeIdCounter}`;
  }

  private createEmptyMetrics(): ProjectMetrics {
    return {
      totalFiles: 0,
      totalFunctions: 0,
      totalClasses: 0,
      totalLines: 0,
      avgComplexity: 0,
      maxComplexity: 0,
      dependencies: 0,
      codeSmells: [],
    };
  }

  private cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Public API
  public clearCache(): void {
    this.cache.clear();
  }

  public getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }
}

// Export singleton instance
let analyzerInstance: CodeStructureAnalyzer | null = null;

export function getCodeStructureAnalyzer(): CodeStructureAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new CodeStructureAnalyzer();
  }
  return analyzerInstance;
}

export default CodeStructureAnalyzer;
