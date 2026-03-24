use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::collections::{HashMap, HashSet};
use std::fs::{create_dir_all, read_to_string, rename, write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_sql::{Migration, MigrationKind};
use time::{macros::format_description, OffsetDateTime};

const DB_NAME: &str = "dextop.db";
const PROJECT_ADDED_EVENT: &str = "projects:added";
const PROJECT_DELETED_EVENT: &str = "projects:deleted";
const TASKS_UPDATED_EVENT: &str = "tasks:updated";
const DEX_DIR_NAME: &str = ".dex";
const DEX_TASKS_FILE_NAME: &str = "tasks.jsonl";
type ProjectRow = (i64, String, String, Option<String>, String, String);

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct DexTaskRecord {
    id: String,
    #[serde(default, alias = "parent_id")]
    parent_id: Option<String>,
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    priority: Option<i64>,
    #[serde(default)]
    completed: bool,
    #[serde(default, alias = "started_at")]
    started_at: Option<String>,
    #[serde(default, alias = "completed_at")]
    completed_at: Option<String>,
    #[serde(default, alias = "created_at")]
    created_at: Option<String>,
    #[serde(default, alias = "updated_at")]
    updated_at: Option<String>,
    #[serde(default)]
    blocked_by: Vec<String>,
    #[serde(default)]
    blocks: Vec<String>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct DexTaskFileRecord {
    id: String,
    #[serde(default, rename = "parent_id", alias = "parentId")]
    parent_id: Option<String>,
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    priority: Option<i64>,
    #[serde(default)]
    completed: bool,
    #[serde(default)]
    result: Option<String>,
    #[serde(default)]
    metadata: Option<serde_json::Value>,
    #[serde(default, rename = "started_at", alias = "startedAt")]
    started_at: Option<String>,
    #[serde(default, rename = "completed_at", alias = "completedAt")]
    completed_at: Option<String>,
    #[serde(default, rename = "created_at", alias = "createdAt")]
    created_at: Option<String>,
    #[serde(default, rename = "updated_at", alias = "updatedAt")]
    updated_at: Option<String>,
    #[serde(default, rename = "blockedBy", alias = "blocked_by")]
    blocked_by: Vec<String>,
    #[serde(default)]
    blocks: Vec<String>,
    #[serde(default)]
    children: Vec<String>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TasksUpdatedEvent {
    project_path: String,
    tasks: Vec<DexTaskRecord>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectTaskInput {
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    priority: Option<i64>,
    #[serde(default)]
    parent_id: Option<String>,
    #[serde(default)]
    blocked_by: Vec<String>,
}

struct ActiveTaskWatcher {
    _watcher: RecommendedWatcher,
}

#[derive(Default)]
struct TaskWatcherState {
    active: Mutex<HashMap<String, ActiveTaskWatcher>>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRecord {
    id: i64,
    folder_name: String,
    folder_path: String,
    last_opened_at: Option<String>,
    created_at: String,
    updated_at: String,
}

impl From<ProjectRow> for ProjectRecord {
    fn from(
        (id, folder_name, folder_path, last_opened_at, created_at, updated_at): ProjectRow,
    ) -> Self {
        Self {
            id,
            folder_name,
            folder_path,
            last_opened_at,
            created_at,
            updated_at,
        }
    }
}

impl From<DexTaskFileRecord> for DexTaskRecord {
    fn from(task: DexTaskFileRecord) -> Self {
        Self {
            id: task.id,
            parent_id: task.parent_id,
            name: task.name,
            description: task.description,
            priority: task.priority,
            completed: task.completed,
            started_at: task.started_at,
            completed_at: task.completed_at,
            created_at: task.created_at,
            updated_at: task.updated_at,
            blocked_by: task.blocked_by,
            blocks: task.blocks,
        }
    }
}

fn project_window_label(project_id: i64) -> String {
    format!("project-{project_id}")
}

fn project_window_route(project_id: i64) -> String {
    format!("/projects/{project_id}")
}

#[derive(Clone, serde::Serialize)]
struct ProjectAddedEvent {
    project: ProjectRecord,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectDeletedEvent {
    project_id: i64,
}

fn tasks_file_for_project(project_path: &str) -> PathBuf {
    Path::new(project_path)
        .join(DEX_DIR_NAME)
        .join(DEX_TASKS_FILE_NAME)
}

fn load_project_tasks_from_file(tasks_file: &Path) -> Result<Vec<DexTaskRecord>, String> {
    if !tasks_file.exists() {
        return Ok(Vec::new());
    }

    let content = read_to_string(tasks_file).map_err(|e| {
        format!(
            "failed to read dex tasks file {}: {e}",
            tasks_file.display()
        )
    })?;

    let mut tasks = Vec::new();
    for (line_index, line) in content.lines().enumerate() {
        let trimmed_line = line.trim();
        if trimmed_line.is_empty() {
            continue;
        }

        match serde_json::from_str::<DexTaskRecord>(trimmed_line) {
            Ok(task) => tasks.push(task),
            Err(error) => {
                eprintln!(
                    "Skipping malformed task entry at {}:{} ({error})",
                    tasks_file.display(),
                    line_index + 1
                );
            }
        }
    }

    Ok(tasks)
}

fn load_project_task_records_for_write(
    tasks_file: &Path,
) -> Result<Vec<DexTaskFileRecord>, String> {
    if !tasks_file.exists() {
        return Ok(Vec::new());
    }

    let content = read_to_string(tasks_file).map_err(|e| {
        format!(
            "failed to read dex tasks file {}: {e}",
            tasks_file.display()
        )
    })?;

    let mut tasks = Vec::new();
    for (line_index, line) in content.lines().enumerate() {
        let trimmed_line = line.trim();
        if trimmed_line.is_empty() {
            continue;
        }

        let task = serde_json::from_str::<DexTaskFileRecord>(trimmed_line).map_err(|error| {
            format!(
                "failed to parse dex tasks file {}:{} ({error})",
                tasks_file.display(),
                line_index + 1
            )
        })?;
        tasks.push(task);
    }

    Ok(tasks)
}

fn emit_tasks_updated(
    app: &tauri::AppHandle,
    project_path: &str,
    tasks: Vec<DexTaskRecord>,
) -> Result<(), String> {
    app.emit(
        TASKS_UPDATED_EVENT,
        TasksUpdatedEvent {
            project_path: project_path.to_string(),
            tasks,
        },
    )
    .map_err(|e| format!("failed to emit task update event: {e}"))
}

fn should_handle_task_event(event: &notify::Event, tasks_file: &Path) -> bool {
    if matches!(event.kind, EventKind::Access(_)) {
        return false;
    }

    if event.paths.is_empty() {
        return true;
    }

    event.paths.iter().any(|path| {
        path == tasks_file
            || path
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name == DEX_TASKS_FILE_NAME)
    })
}

fn create_project_tasks_watcher(
    app: &tauri::AppHandle,
    project_path: String,
    tasks_file: PathBuf,
) -> Result<RecommendedWatcher, String> {
    let dex_directory = tasks_file
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| Path::new(&project_path).to_path_buf());
    let (watch_target, watch_mode) = if dex_directory.exists() {
        (dex_directory.clone(), RecursiveMode::NonRecursive)
    } else {
        (
            Path::new(&project_path).to_path_buf(),
            RecursiveMode::Recursive,
        )
    };

    let app_handle = app.clone();
    let project_path_for_event = project_path.clone();
    let tasks_file_for_callback = tasks_file.clone();

    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        let event = match result {
            Ok(event) => event,
            Err(error) => {
                eprintln!("Task watcher received an error: {error}");
                return;
            }
        };

        if !should_handle_task_event(&event, &tasks_file_for_callback) {
            return;
        }

        match load_project_tasks_from_file(&tasks_file_for_callback) {
            Ok(tasks) => {
                if let Err(error) = emit_tasks_updated(&app_handle, &project_path_for_event, tasks)
                {
                    eprintln!("Failed to emit updated tasks: {error}");
                }
            }
            Err(error) => {
                eprintln!("Failed to refresh watched tasks file: {error}");
            }
        }
    })
    .map_err(|e| format!("failed to initialize task watcher: {e}"))?;

    watcher.watch(&watch_target, watch_mode).map_err(|e| {
        format!(
            "failed to watch project task path {}: {e}",
            watch_target.display()
        )
    })?;

    Ok(watcher)
}

fn trim_optional_value(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn normalize_blocked_by(task_ids: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();

    for task_id in task_ids {
        let trimmed = task_id.trim();
        if trimmed.is_empty() {
            continue;
        }

        let normalized_task_id = trimmed.to_string();
        if seen.insert(normalized_task_id.clone()) {
            normalized.push(normalized_task_id);
        }
    }

    normalized
}

type ValidatedCreateTaskInput = (
    String,
    Option<String>,
    Option<i64>,
    Option<String>,
    Vec<String>,
);

fn validate_create_task_input(
    input: CreateProjectTaskInput,
) -> Result<ValidatedCreateTaskInput, String> {
    let trimmed_name = input.name.trim().to_string();
    if trimmed_name.is_empty() {
        return Err("task name cannot be empty".to_string());
    }

    if let Some(priority) = input.priority {
        if priority < 0 {
            return Err("priority must be zero or greater".to_string());
        }
    }

    Ok((
        trimmed_name,
        trim_optional_value(input.description),
        input.priority,
        trim_optional_value(input.parent_id),
        normalize_blocked_by(input.blocked_by),
    ))
}

fn generate_task_id(existing_tasks: &[DexTaskFileRecord]) -> String {
    const ID_LENGTH: usize = 8;
    const BASE36_ALPHABET: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";

    let existing_ids = existing_tasks
        .iter()
        .map(|task| task.id.as_str())
        .collect::<HashSet<_>>();

    let mut seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);

    loop {
        let mut value = seed;
        let mut encoded = Vec::with_capacity(ID_LENGTH);
        while encoded.len() < ID_LENGTH {
            encoded.push(BASE36_ALPHABET[(value % 36) as usize] as char);
            value /= 36;
        }
        encoded.reverse();
        let candidate = encoded.into_iter().collect::<String>();

        if !existing_ids.contains(candidate.as_str()) {
            return candidate;
        }

        seed += 1;
    }
}

fn current_task_timestamp() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&format_description!(
            "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3]Z"
        ))
        .map_err(|e| format!("failed to format task timestamp: {e}"))
}

fn write_project_task_records(
    tasks_file: &Path,
    tasks: &[DexTaskFileRecord],
) -> Result<(), String> {
    let serialized_tasks = tasks
        .iter()
        .map(|task| serde_json::to_string(task).map_err(|e| format!("failed to encode task: {e}")))
        .collect::<Result<Vec<_>, _>>()?;
    let file_contents = if serialized_tasks.is_empty() {
        String::new()
    } else {
        format!("{}\n", serialized_tasks.join("\n"))
    };

    let parent_directory = tasks_file
        .parent()
        .ok_or_else(|| "failed to resolve dex task directory".to_string())?;
    create_dir_all(parent_directory).map_err(|e| {
        format!(
            "failed to create dex task directory {}: {e}",
            parent_directory.display()
        )
    })?;

    let temporary_path = parent_directory.join(format!(
        ".{}.tmp-{}-{}",
        DEX_TASKS_FILE_NAME,
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0)
    ));
    write(&temporary_path, file_contents).map_err(|e| {
        format!(
            "failed to write temporary dex task file {}: {e}",
            temporary_path.display()
        )
    })?;
    rename(&temporary_path, tasks_file).map_err(|e| {
        format!(
            "failed to replace dex task file {}: {e}",
            tasks_file.display()
        )
    })
}

fn create_task_record(
    existing_tasks: &mut Vec<DexTaskFileRecord>,
    input: CreateProjectTaskInput,
) -> Result<(), String> {
    let (name, description, priority, parent_id, blocked_by) = validate_create_task_input(input)?;

    if let Some(parent_task_id) = parent_id.as_ref() {
        if !existing_tasks.iter().any(|task| task.id == *parent_task_id) {
            return Err(format!("parent task \"{parent_task_id}\" was not found"));
        }
    }

    let missing_blockers = blocked_by
        .iter()
        .filter(|task_id| !existing_tasks.iter().any(|task| task.id == **task_id))
        .cloned()
        .collect::<Vec<_>>();
    if !missing_blockers.is_empty() {
        return Err(format!(
            "blocked-by task(s) not found: {}",
            missing_blockers.join(", ")
        ));
    }

    let new_task_id = generate_task_id(existing_tasks);
    let timestamp = current_task_timestamp()?;

    if let Some(parent_task_id) = parent_id.as_ref() {
        if let Some(parent_task) = existing_tasks
            .iter_mut()
            .find(|task| task.id == *parent_task_id)
        {
            if !parent_task
                .children
                .iter()
                .any(|child_id| child_id == &new_task_id)
            {
                parent_task.children.push(new_task_id.clone());
                parent_task.updated_at = Some(timestamp.clone());
            }
        }
    }

    for blocker_id in &blocked_by {
        if let Some(blocker_task) = existing_tasks
            .iter_mut()
            .find(|task| task.id == *blocker_id)
        {
            if !blocker_task
                .blocks
                .iter()
                .any(|blocked_task_id| blocked_task_id == &new_task_id)
            {
                blocker_task.blocks.push(new_task_id.clone());
                blocker_task.updated_at = Some(timestamp.clone());
            }
        }
    }

    existing_tasks.push(DexTaskFileRecord {
        id: new_task_id,
        parent_id,
        name,
        description,
        priority,
        completed: false,
        result: None,
        metadata: None,
        started_at: None,
        completed_at: None,
        created_at: Some(timestamp.clone()),
        updated_at: Some(timestamp),
        blocked_by,
        blocks: Vec::new(),
        children: Vec::new(),
    });

    Ok(())
}

async fn connect_db(app: &tauri::AppHandle) -> Result<Pool<Sqlite>, String> {
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("failed to resolve app config directory: {e}"))?;

    create_dir_all(&app_config_dir)
        .map_err(|e| format!("failed to create app config directory: {e}"))?;

    let connect_options = SqliteConnectOptions::new()
        .filename(app_config_dir.join(DB_NAME))
        .create_if_missing(true);

    SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(connect_options)
        .await
        .map_err(|e| format!("failed to connect to sqlite database: {e}"))
}

async fn upsert_project(
    app: &tauri::AppHandle,
    folder_path: String,
) -> Result<ProjectRecord, String> {
    let trimmed_path = folder_path.trim();
    if trimmed_path.is_empty() {
        return Err("folder path cannot be empty".to_string());
    }

    let normalized_path = trimmed_path.to_string();
    let folder_name = Path::new(&normalized_path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| normalized_path.clone());

    let pool = connect_db(app).await?;
    sqlx::query(
        r#"
INSERT INTO projects (
  folder_name,
  folder_path,
  last_opened_at,
  created_at,
  updated_at
)
VALUES (?1, ?2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(folder_path) DO UPDATE SET
  folder_name = excluded.folder_name,
  last_opened_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP;
"#,
    )
    .bind(&folder_name)
    .bind(&normalized_path)
    .execute(&pool)
    .await
    .map_err(|e| format!("failed to insert project: {e}"))?;

    let project_record = sqlx::query_as::<_, ProjectRow>(
        r#"
SELECT
  id,
  folder_name,
  folder_path,
  last_opened_at,
  created_at,
  updated_at
FROM projects
WHERE folder_path = ?1
LIMIT 1;
"#,
    )
    .bind(&normalized_path)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("failed to load inserted project: {e}"))?;
    pool.close().await;

    Ok(ProjectRecord::from(project_record))
}

#[tauri::command]
async fn list_projects(app: tauri::AppHandle) -> Result<Vec<ProjectRecord>, String> {
    let pool = connect_db(&app).await?;
    let records = sqlx::query_as::<_, ProjectRow>(
        r#"
SELECT
  id,
  folder_name,
  folder_path,
  last_opened_at,
  created_at,
  updated_at
FROM projects
ORDER BY COALESCE(last_opened_at, updated_at, created_at) DESC, id DESC;
"#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("failed to query projects: {e}"))?;
    pool.close().await;

    Ok(records.into_iter().map(ProjectRecord::from).collect())
}

#[tauri::command]
async fn pick_and_add_project(app: tauri::AppHandle) -> Result<Option<ProjectRecord>, String> {
    let selected_path = app
        .dialog()
        .file()
        .set_title("Open Project")
        .blocking_pick_folder()
        .map(|file_path| file_path.into_path())
        .transpose()
        .map_err(|e| format!("failed to resolve selected folder path: {e}"))?
        .map(|path| path.to_string_lossy().to_string());

    let Some(folder_path) = selected_path else {
        return Ok(None);
    };

    let project_record = upsert_project(&app, folder_path).await?;
    app.emit(
        PROJECT_ADDED_EVENT,
        ProjectAddedEvent {
            project: project_record.clone(),
        },
    )
    .map_err(|e| format!("failed to emit project added event: {e}"))?;

    Ok(Some(project_record))
}

#[tauri::command]
async fn delete_project(app: tauri::AppHandle, project_id: i64) -> Result<bool, String> {
    let pool = connect_db(&app).await?;

    let project_name = sqlx::query_scalar::<_, String>(
        r#"
SELECT folder_name
FROM projects
WHERE id = ?1
LIMIT 1;
"#,
    )
    .bind(project_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("failed to load project before delete: {e}"))?;

    let Some(project_name) = project_name else {
        pool.close().await;
        return Ok(false);
    };

    let should_delete = app
        .dialog()
        .message(format!(
            "Remove \"{project_name}\" from dextop?\n\nThis does not delete files on disk."
        ))
        .title("Delete Project")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Delete".to_string(),
            "Cancel".to_string(),
        ))
        .blocking_show();

    if !should_delete {
        pool.close().await;
        return Ok(false);
    }

    let result = sqlx::query(
        r#"
DELETE FROM projects
WHERE id = ?1;
"#,
    )
    .bind(project_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("failed to delete project: {e}"))?;
    pool.close().await;

    let deleted = result.rows_affected() > 0;
    if deleted {
        app.emit(PROJECT_DELETED_EVENT, ProjectDeletedEvent { project_id })
            .map_err(|e| format!("failed to emit project deleted event: {e}"))?;
    }

    Ok(deleted)
}

#[tauri::command]
async fn open_project_window(app: tauri::AppHandle, project_id: i64) -> Result<(), String> {
    let pool = connect_db(&app).await?;
    let project_record = sqlx::query_as::<_, ProjectRow>(
        r#"
SELECT
  id,
  folder_name,
  folder_path,
  last_opened_at,
  created_at,
  updated_at
FROM projects
WHERE id = ?1
LIMIT 1;
"#,
    )
    .bind(project_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("failed to load project before opening window: {e}"))?;
    pool.close().await;

    let Some(project_record) = project_record.map(ProjectRecord::from) else {
        return Err("project not found".to_string());
    };

    let window_label = project_window_label(project_record.id);
    if let Some(window) = app.get_webview_window(&window_label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let title = format!("dextop - {}", project_record.folder_name);
    let route = project_window_route(project_record.id);

    let window = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(route.into()))
        .title(&title)
        .build()
        .map_err(|e| format!("failed to build project window: {e}"))?;

    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

#[tauri::command]
async fn clear_projects(app: tauri::AppHandle) -> Result<u64, String> {
    let pool = connect_db(&app).await?;
    let project_ids = sqlx::query_scalar::<_, i64>(
        r#"
SELECT id
FROM projects
ORDER BY id ASC;
"#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("failed to load projects before clear: {e}"))?;

    if project_ids.is_empty() {
        pool.close().await;
        return Ok(0);
    }

    let should_delete = app
        .dialog()
        .message(format!(
            "Remove all {count} stored project(s) from dextop?\n\nThis does not delete files on disk.",
            count = project_ids.len()
        ))
        .title("Remove All Projects")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Remove All".to_string(),
            "Cancel".to_string(),
        ))
        .blocking_show();

    if !should_delete {
        pool.close().await;
        return Ok(0);
    }

    let result = sqlx::query(
        r#"
DELETE FROM projects;
"#,
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("failed to clear projects: {e}"))?;
    pool.close().await;

    for project_id in project_ids {
        app.emit(PROJECT_DELETED_EVENT, ProjectDeletedEvent { project_id })
            .map_err(|e| format!("failed to emit project deleted event: {e}"))?;
    }

    Ok(result.rows_affected())
}

#[tauri::command]
fn watch_project_tasks(
    app: tauri::AppHandle,
    watcher_state: tauri::State<'_, TaskWatcherState>,
    project_path: String,
) -> Result<Vec<DexTaskRecord>, String> {
    let normalized_project_path = project_path.trim();
    if normalized_project_path.is_empty() {
        return Err("project path cannot be empty".to_string());
    }

    let tasks_file = tasks_file_for_project(normalized_project_path);
    let tasks = load_project_tasks_from_file(&tasks_file)?;

    let mut active_watchers = watcher_state
        .active
        .lock()
        .map_err(|_| "failed to lock task watcher state".to_string())?;

    if !active_watchers.contains_key(normalized_project_path) {
        let watcher =
            create_project_tasks_watcher(&app, normalized_project_path.to_string(), tasks_file)?;
        active_watchers.insert(
            normalized_project_path.to_string(),
            ActiveTaskWatcher { _watcher: watcher },
        );
    }

    emit_tasks_updated(&app, normalized_project_path, tasks.clone())?;
    Ok(tasks)
}

#[tauri::command]
fn create_project_task(
    app: tauri::AppHandle,
    project_path: String,
    input: CreateProjectTaskInput,
) -> Result<(), String> {
    let normalized_project_path = project_path.trim();
    if normalized_project_path.is_empty() {
        return Err("project path cannot be empty".to_string());
    }

    let project_dir = Path::new(normalized_project_path);
    if !project_dir.exists() {
        return Err("project path does not exist".to_string());
    }
    if !project_dir.is_dir() {
        return Err("project path must point to a directory".to_string());
    }

    let tasks_file = tasks_file_for_project(normalized_project_path);
    let mut task_records = load_project_task_records_for_write(&tasks_file)?;
    create_task_record(&mut task_records, input)?;
    write_project_task_records(&tasks_file, &task_records)?;

    let tasks = task_records
        .into_iter()
        .map(DexTaskRecord::from)
        .collect::<Vec<_>>();
    emit_tasks_updated(&app, normalized_project_path, tasks)?;

    Ok(())
}

#[tauri::command]
fn unwatch_project_tasks(
    watcher_state: tauri::State<'_, TaskWatcherState>,
    project_path: String,
) -> Result<(), String> {
    let normalized_project_path = project_path.trim();
    if normalized_project_path.is_empty() {
        return Err("project path cannot be empty".to_string());
    }

    let mut active_watchers = watcher_state
        .active
        .lock()
        .map_err(|_| "failed to lock task watcher state".to_string())?;
    active_watchers.remove(normalized_project_path);
    Ok(())
}

#[tauri::command]
fn clear_project_tasks_watch(
    watcher_state: tauri::State<'_, TaskWatcherState>,
) -> Result<(), String> {
    let mut active_watchers = watcher_state
        .active
        .lock()
        .map_err(|_| "failed to lock task watcher state".to_string())?;
    active_watchers.clear();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_projects_table",
        sql: r#"
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_name TEXT NOT NULL,
  folder_path TEXT NOT NULL UNIQUE,
  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"#,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(TaskWatcherState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:dextop.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_projects,
            pick_and_add_project,
            delete_project,
            open_project_window,
            clear_projects,
            watch_project_tasks,
            create_project_task,
            unwatch_project_tasks,
            clear_project_tasks_watch
        ])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i, &open_i])?;

            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
