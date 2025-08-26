use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use syn::{parse_file, Item, ItemFn};
use tree_sitter::{Language, Parser, Node};
use notify::{Watcher, RecursiveMode, DebouncedEvent};
use std::sync::mpsc::channel;
use std::time::Duration;
use regex::Regex;
use sha2::{Sha256, Digest};
use std::io::Write;
use chrono::{DateTime, Utc};

// 코드 진화 이벤트 구조체
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EvolutionEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub event_type: EvolutionType,
    pub severity: Severity,
    pub title: String,
    pub description: String,
    pub changes: Option<CodeChange>,
    pub metrics: Option<CodeMetrics>,
    pub impact: ImpactAnalysis,
    pub status: EvolutionStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum EvolutionType {
    Mutation,       // 코드 변형
    Optimization,   // 최적화
    Adaptation,     // 환경 적응
    Learning,       // 학습 기반 개선
    Refactor,       // 리팩토링
    Security,       // 보안 패치
    Feature,        // 기능 추가
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodeChange {
    pub before: String,
    pub after: String,
    pub language: String,
    pub filename: String,
    pub line_start: usize,
    pub line_end: usize,
    pub diff: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodeMetrics {
    pub complexity: f64,        // 순환 복잡도
    pub performance: f64,       // 성능 점수
    pub maintainability: f64,   // 유지보수성
    pub security: f64,          // 보안 점수
    pub test_coverage: f64,     // 테스트 커버리지
    pub lines_of_code: usize,
    pub technical_debt: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImpactAnalysis {
    pub affected_files: Vec<String>,
    pub affected_functions: Vec<String>,
    pub dependencies: Vec<String>,
    pub estimated_risk: RiskLevel,
    pub rollback_available: bool,
    pub backup_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum EvolutionStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    RolledBack,
}

// AST 분석기
pub struct AstAnalyzer {
    parsers: HashMap<String, Parser>,
}

impl AstAnalyzer {
    pub fn new() -> Self {
        let mut analyzers = HashMap::new();

        // 각 언어별 파서 초기화
        // Python parser
        let mut python_parser = Parser::new();
        python_parser.set_language(tree_sitter_python::language()).unwrap();
        analyzers.insert("python".to_string(), python_parser);

        // JavaScript parser
        let mut js_parser = Parser::new();
        js_parser.set_language(tree_sitter_javascript::language()).unwrap();
        analyzers.insert("javascript".to_string(), js_parser);

        // TypeScript parser
        let mut ts_parser = Parser::new();
        ts_parser.set_language(tree_sitter_typescript::language_typescript()).unwrap();
        analyzers.insert("typescript".to_string(), ts_parser);

        Self {
            parsers: analyzers,
        }
    }

    pub fn analyze(&mut self, code: &str, language: &str) -> Result<CodeMetrics, String> {
        let parser = self.parsers.get_mut(language)
            .ok_or_else(|| format!("Language {} not supported", language))?;

        let tree = parser.parse(code, None)
            .ok_or_else(|| "Failed to parse code".to_string())?;

        let root_node = tree.root_node();
        let metrics = self.calculate_metrics(&root_node, code);

        Ok(metrics)
    }

    fn calculate_metrics(&self, node: &Node, source: &str) -> CodeMetrics {
        let mut metrics = CodeMetrics {
            complexity: 1.0,
            performance: 85.0,
            maintainability: 75.0,
            security: 90.0,
            test_coverage: 0.0,
            lines_of_code: source.lines().count(),
            technical_debt: 0.0,
        };

        // 순환 복잡도 계산
        metrics.complexity = self.calculate_cyclomatic_complexity(node, source);

        // 유지보수성 지수 계산
        metrics.maintainability = self.calculate_maintainability_index(
            metrics.lines_of_code,
            metrics.complexity
        );

        // 기술 부채 추정
        metrics.technical_debt = self.estimate_technical_debt(&metrics);

        metrics
    }

    fn calculate_cyclomatic_complexity(&self, node: &Node, source: &str) -> f64 {
        let mut complexity = 1.0;
        let mut cursor = node.walk();

        // 제어 흐름 구문 탐색
        let control_flow_keywords = vec![
            "if_statement",
            "while_statement",
            "for_statement",
            "try_statement",
            "catch_clause",
            "conditional_expression",
            "logical_and",
            "logical_or",
        ];

        for child in node.children(&mut cursor) {
            let kind = child.kind();
            if control_flow_keywords.contains(&kind) {
                complexity += 1.0;
            }

            // 재귀적으로 하위 노드 탐색
            complexity += self.calculate_cyclomatic_complexity(&child, source) - 1.0;
        }

        complexity
    }

    fn calculate_maintainability_index(&self, loc: usize, complexity: f64) -> f64 {
        // 유지보수성 지수 = 171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC)
        // 단순화된 버전 사용
        let volume = loc as f64 * complexity.ln();
        let mi = 171.0 - 5.2 * volume.ln() - 0.23 * complexity - 16.2 * (loc as f64).ln();

        // 0-100 범위로 정규화
        (mi.max(0.0).min(100.0))
    }

    fn estimate_technical_debt(&self, metrics: &CodeMetrics) -> f64 {
        let mut debt = 0.0;

        // 복잡도가 높으면 부채 증가
        if metrics.complexity > 10.0 {
            debt += (metrics.complexity - 10.0) * 2.0;
        }

        // 유지보수성이 낮으면 부채 증가
        if metrics.maintainability < 50.0 {
            debt += (50.0 - metrics.maintainability) * 0.5;
        }

        // 테스트 커버리지가 낮으면 부채 증가
        if metrics.test_coverage < 80.0 {
            debt += (80.0 - metrics.test_coverage) * 0.3;
        }

        debt
    }
}

// 코드 진화 엔진
pub struct EvolutionEngine {
    analyzer: AstAnalyzer,
    history: Vec<EvolutionEvent>,
    watchers: HashMap<String, notify::RecommendedWatcher>,
    backup_dir: PathBuf,
}

impl EvolutionEngine {
    pub fn new() -> Self {
        let backup_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".gumgang")
            .join("backups");

        fs::create_dir_all(&backup_dir).unwrap_or_default();

        Self {
            analyzer: AstAnalyzer::new(),
            history: Vec::new(),
            watchers: HashMap::new(),
            backup_dir,
        }
    }

    // 파일 변경 감시
    pub fn watch_file(&mut self, path: &str) -> Result<(), String> {
        let (tx, rx) = channel();

        let mut watcher = notify::watcher(tx, Duration::from_secs(2))
            .map_err(|e| format!("Failed to create watcher: {}", e))?;

        watcher.watch(path, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        self.watchers.insert(path.to_string(), watcher);

        // 변경 이벤트 처리 (별도 스레드에서 실행)
        std::thread::spawn(move || {
            loop {
                match rx.recv() {
                    Ok(event) => {
                        println!("File change detected: {:?}", event);
                        // 변경 이벤트 처리 로직
                    }
                    Err(e) => {
                        eprintln!("Watch error: {:?}", e);
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    // 코드 최적화 제안
    pub fn suggest_optimization(&mut self, code: &str, language: &str) -> Result<Vec<OptimizationSuggestion>, String> {
        let metrics = self.analyzer.analyze(code, language)?;
        let mut suggestions = Vec::new();

        // 복잡도가 높은 경우
        if metrics.complexity > 10.0 {
            suggestions.push(OptimizationSuggestion {
                title: "함수 분리 권장".to_string(),
                description: "순환 복잡도가 높습니다. 함수를 더 작은 단위로 분리하세요.".to_string(),
                priority: Priority::High,
                estimated_improvement: 20.0,
            });
        }

        // 중복 코드 감지
        if let Some(duplicates) = self.detect_duplicates(code) {
            suggestions.push(OptimizationSuggestion {
                title: "중복 코드 제거".to_string(),
                description: format!("{}개의 중복 패턴이 발견되었습니다.", duplicates),
                priority: Priority::Medium,
                estimated_improvement: 15.0,
            });
        }

        // 성능 개선 가능 패턴
        if self.has_performance_issues(code, language) {
            suggestions.push(OptimizationSuggestion {
                title: "성능 최적화 가능".to_string(),
                description: "루프 최적화 또는 메모이제이션을 고려하세요.".to_string(),
                priority: Priority::Medium,
                estimated_improvement: 25.0,
            });
        }

        Ok(suggestions)
    }

    // 중복 코드 감지
    fn detect_duplicates(&self, code: &str) -> Option<usize> {
        let lines: Vec<&str> = code.lines().collect();
        let mut duplicates = 0;
        let min_duplicate_lines = 3;

        for i in 0..lines.len() {
            for j in i + min_duplicate_lines..lines.len() {
                let mut match_count = 0;
                while i + match_count < lines.len()
                    && j + match_count < lines.len()
                    && lines[i + match_count].trim() == lines[j + match_count].trim()
                    && !lines[i + match_count].trim().is_empty() {
                    match_count += 1;
                }

                if match_count >= min_duplicate_lines {
                    duplicates += 1;
                }
            }
        }

        if duplicates > 0 {
            Some(duplicates)
        } else {
            None
        }
    }

    // 성능 문제 패턴 감지
    fn has_performance_issues(&self, code: &str, language: &str) -> bool {
        let performance_patterns = match language {
            "python" => vec![
                r"for .+ in range\(len\(",  // index 대신 enumerate 사용 권장
                r"\.append\(.+\) for",        // list comprehension 권장
                r"time\.sleep\(",             // 불필요한 sleep
            ],
            "javascript" | "typescript" => vec![
                r"document\.querySelector.*inside loop",
                r"forEach.*async",
                r"new Array\(\d+\)\.fill",
            ],
            _ => vec![],
        };

        for pattern in performance_patterns {
            if let Ok(re) = Regex::new(pattern) {
                if re.is_match(code) {
                    return true;
                }
            }
        }

        false
    }

    // 코드 자동 개선
    pub fn auto_improve(&mut self, code: &str, language: &str) -> Result<String, String> {
        let mut improved_code = code.to_string();

        // 언어별 개선 규칙 적용
        match language {
            "python" => {
                improved_code = self.improve_python_code(&improved_code);
            }
            "javascript" | "typescript" => {
                improved_code = self.improve_javascript_code(&improved_code);
            }
            "rust" => {
                improved_code = self.improve_rust_code(&improved_code);
            }
            _ => {}
        }

        // 백업 생성
        self.create_backup(code, language)?;

        // 진화 이벤트 기록
        let event = EvolutionEvent {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event_type: EvolutionType::Optimization,
            severity: Severity::Low,
            title: "자동 코드 개선".to_string(),
            description: "AI가 코드를 자동으로 최적화했습니다.".to_string(),
            changes: Some(CodeChange {
                before: code.to_string(),
                after: improved_code.clone(),
                language: language.to_string(),
                filename: "unknown".to_string(),
                line_start: 0,
                line_end: code.lines().count(),
                diff: self.generate_diff(code, &improved_code),
            }),
            metrics: Some(self.analyzer.analyze(&improved_code, language)?),
            impact: ImpactAnalysis {
                affected_files: vec![],
                affected_functions: vec![],
                dependencies: vec![],
                estimated_risk: RiskLevel::Low,
                rollback_available: true,
                backup_path: Some(self.backup_dir.to_string_lossy().to_string()),
            },
            status: EvolutionStatus::Completed,
        };

        self.history.push(event);

        Ok(improved_code)
    }

    fn improve_python_code(&self, code: &str) -> String {
        let mut improved = code.to_string();

        // range(len()) 패턴을 enumerate로 변경
        let range_len_re = Regex::new(r"for (\w+) in range\(len\((\w+)\)\):").unwrap();
        improved = range_len_re.replace_all(&improved, "for $1, _ in enumerate($2):").to_string();

        // list append in loop를 list comprehension으로 변경
        // 간단한 경우만 처리
        let append_re = Regex::new(r"(\w+) = \[\]\s*\n\s*for (\w+) in (\w+):\s*\n\s*\1\.append\(([^)]+)\)").unwrap();
        improved = append_re.replace_all(&improved, "$1 = [$4 for $2 in $3]").to_string();

        // f-string으로 변환
        let format_re = Regex::new(r"\"([^\"]*)\"\s*\.\s*format\(([^)]+)\)").unwrap();
        improved = format_re.replace_all(&improved, "f\"$1\"").to_string();

        improved
    }

    fn improve_javascript_code(&self, code: &str) -> String {
        let mut improved = code.to_string();

        // var를 let/const로 변경
        let var_re = Regex::new(r"\bvar\s+").unwrap();
        improved = var_re.replace_all(&improved, "let ").to_string();

        // == 를 === 로 변경
        let eq_re = Regex::new(r"([^=!])={2}([^=])").unwrap();
        improved = eq_re.replace_all(&improved, "$1===$2").to_string();

        // != 를 !== 로 변경
        let ne_re = Regex::new(r"!{1}=([^=])").unwrap();
        improved = ne_re.replace_all(&improved, "!==$1").to_string();

        improved
    }

    fn improve_rust_code(&self, code: &str) -> String {
        let mut improved = code.to_string();

        // unwrap()를 ? 연산자로 변경 (함수 내부에서만)
        let unwrap_re = Regex::new(r"\.unwrap\(\)").unwrap();
        improved = unwrap_re.replace_all(&improved, "?").to_string();

        // clone 최소화 제안 (주석으로)
        if improved.contains(".clone()") {
            improved = format!("// TODO: Consider reducing clone() usage for better performance\n{}", improved);
        }

        improved
    }

    fn generate_diff(&self, before: &str, after: &str) -> String {
        use diff::Result::*;

        let mut diff_output = String::new();
        let before_lines: Vec<&str> = before.lines().collect();
        let after_lines: Vec<&str> = after.lines().collect();

        for (idx, diff) in diff::lines(before, after).iter().enumerate() {
            match diff {
                Left(l) => diff_output.push_str(&format!("- {}\n", l)),
                Right(r) => diff_output.push_str(&format!("+ {}\n", r)),
                Both(l, _) => diff_output.push_str(&format!("  {}\n", l)),
            }
        }

        diff_output
    }

    fn create_backup(&self, code: &str, language: &str) -> Result<String, String> {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let filename = format!("backup_{}_{}.{}", timestamp,
                              self.generate_hash(code),
                              self.get_extension(language));

        let backup_path = self.backup_dir.join(&filename);

        fs::write(&backup_path, code)
            .map_err(|e| format!("Failed to create backup: {}", e))?;

        Ok(backup_path.to_string_lossy().to_string())
    }

    fn generate_hash(&self, content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let result = hasher.finalize();
        format!("{:x}", result).chars().take(8).collect()
    }

    fn get_extension(&self, language: &str) -> &str {
        match language {
            "python" => "py",
            "javascript" => "js",
            "typescript" => "ts",
            "rust" => "rs",
            "go" => "go",
            "java" => "java",
            _ => "txt",
        }
    }
}

// 최적화 제안 구조체
#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizationSuggestion {
    pub title: String,
    pub description: String,
    pub priority: Priority,
    pub estimated_improvement: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Priority {
    Low,
    Medium,
    High,
}

// Tauri 명령어
#[tauri::command]
pub async fn analyze_code(code: String, language: String) -> Result<CodeMetrics, String> {
    let mut analyzer = AstAnalyzer::new();
    analyzer.analyze(&code, &language)
}

#[tauri::command]
pub async fn suggest_improvements(code: String, language: String) -> Result<Vec<OptimizationSuggestion>, String> {
    let mut engine = EvolutionEngine::new();
    engine.suggest_optimization(&code, &language)
}

#[tauri::command]
pub async fn auto_improve_code(code: String, language: String) -> Result<String, String> {
    let mut engine = EvolutionEngine::new();
    engine.auto_improve(&code, &language)
}

#[tauri::command]
pub async fn watch_file_changes(path: String) -> Result<(), String> {
    let mut engine = EvolutionEngine::new();
    engine.watch_file(&path)
}

#[tauri::command]
pub async fn get_evolution_history() -> Result<Vec<EvolutionEvent>, String> {
    // 실제 구현에서는 데이터베이스나 파일에서 로드
    Ok(vec![])
}

// 자기 수정 기능
#[tauri::command]
pub async fn self_modify(target_file: String, modifications: String) -> Result<bool, String> {
    // 안전 검사
    if !is_safe_to_modify(&target_file) {
        return Err("Unsafe modification attempt blocked".to_string());
    }

    // 백업 생성
    let backup = create_file_backup(&target_file)?;

    // 수정 적용
    match apply_modifications(&target_file, &modifications) {
        Ok(_) => {
            // 테스트 실행
            if run_tests(&target_file) {
                Ok(true)
            } else {
                // 테스트 실패 시 롤백
                restore_from_backup(&target_file, &backup)?;
                Err("Tests failed, rolled back changes".to_string())
            }
        }
        Err(e) => {
            restore_from_backup(&target_file, &backup)?;
            Err(format!("Modification failed: {}", e))
        }
    }
}

fn is_safe_to_modify(path: &str) -> bool {
    // 시스템 파일이나 중요 설정 파일은 수정 금지
    !path.contains("/etc/") &&
    !path.contains("/System/") &&
    !path.contains("/Windows/") &&
    !path.contains(".env") &&
    !path.contains("credentials")
}

fn create_file_backup(path: &str) -> Result<String, String> {
    let backup_path = format!("{}.backup", path);
    fs::copy(path, &backup_path)
        .map_err(|e| format!("Backup failed: {}", e))?;
    Ok(backup_path)
}

fn apply_modifications(path: &str, modifications: &str) -> Result<(), String> {
    fs::write(path, modifications)
        .map_err(|e| format!("Write failed: {}", e))
}

fn run_tests(path: &str) -> bool {
    // 테스트 실행 로직
    // 실제 구현에서는 언어별 테스트 러너 실행
    true
}

fn restore_from_backup(path: &str, backup: &str) -> Result<(), String> {
    fs::copy(backup, path)
        .map_err(|e| format!("Restore failed: {}", e))?;
    fs::remove_file(backup).ok();
    Ok(())
}
