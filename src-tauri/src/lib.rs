use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::fs::{create_dir_all, read_to_string};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_sql::{Migration, MigrationKind};

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

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TasksUpdatedEvent {
    project_path: String,
    tasks: Vec<DexTaskRecord>,
}

struct ActiveTaskWatcher {
    project_path: String,
    _watcher: RecommendedWatcher,
}

#[derive(Default)]
struct TaskWatcherState {
    active: Mutex<Option<ActiveTaskWatcher>>,
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
            "Remove \"{project_name}\" from Dex UI?\n\nThis does not delete files on disk."
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
            "Remove all {count} stored project(s) from Dex UI?\n\nThis does not delete files on disk.",
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

    let mut active_watcher = watcher_state
        .active
        .lock()
        .map_err(|_| "failed to lock task watcher state".to_string())?;

    let restart_watcher = match active_watcher.as_ref() {
        Some(watcher) => watcher.project_path != normalized_project_path,
        None => true,
    };
    if restart_watcher {
        *active_watcher = None;
        let watcher =
            create_project_tasks_watcher(&app, normalized_project_path.to_string(), tasks_file)?;
        *active_watcher = Some(ActiveTaskWatcher {
            project_path: normalized_project_path.to_string(),
            _watcher: watcher,
        });
    }

    emit_tasks_updated(&app, normalized_project_path, tasks.clone())?;
    Ok(tasks)
}

#[tauri::command]
fn clear_project_tasks_watch(
    watcher_state: tauri::State<'_, TaskWatcherState>,
) -> Result<(), String> {
    let mut active_watcher = watcher_state
        .active
        .lock()
        .map_err(|_| "failed to lock task watcher state".to_string())?;
    *active_watcher = None;
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
            clear_projects,
            watch_project_tasks,
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
