//! Coque desktop (docs/09 §7) : deux fenêtres-widgets, tray, persistance.
//! Rust ne porte aucune règle de jeu.
//!
//! Disposition voulue : la colonne todo ancrée au bord droit sur toute la
//! hauteur utile, et le bandeau atelier posé juste au-dessus de la barre des
//! tâches, sur la largeur restante. Les deux se calent sur la *zone de travail*
//! de l'écran — c'est-à-dire l'écran moins les barres système — de sorte que
//! rien ne passe sous la barre des tâches, quelle que soit sa position.

mod persist;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

const TODO_LABEL: &str = "todo";
const ATELIER_LABEL: &str = "atelier";

const TODO_WIDTH: f64 = 380.0;
const ATELIER_HEIGHT: f64 = 240.0;
/// En dessous, on renonce au bandeau plutôt que de produire un moignon.
const MIN_ATELIER_WIDTH: f64 = 520.0;

/// Cale les deux fenêtres sur la zone de travail de l'écran.
fn dock_windows(app: &tauri::AppHandle) {
    let Some(todo) = app.get_webview_window(TODO_LABEL) else {
        return;
    };
    let Ok(Some(monitor)) = todo.current_monitor() else {
        return;
    };

    // tout en unités logiques : mélanger physique et logique doublerait les
    // fenêtres sur un écran HiDPI
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let origin = tauri::PhysicalPosition::new(area.position.x, area.position.y).to_logical::<f64>(scale);
    let size = tauri::PhysicalSize::new(area.size.width, area.size.height).to_logical::<f64>(scale);
    if size.width <= 0.0 || size.height <= 0.0 {
        return;
    }

    let todo_width = TODO_WIDTH.min(size.width);
    let _ = todo.set_size(tauri::LogicalSize::new(todo_width, size.height));
    let _ = todo.set_position(tauri::LogicalPosition::new(
        origin.x + size.width - todo_width,
        origin.y,
    ));

    if let Some(atelier) = app.get_webview_window(ATELIER_LABEL) {
        let width = size.width - todo_width;
        let height = ATELIER_HEIGHT.min(size.height);
        if width < MIN_ATELIER_WIDTH {
            let _ = atelier.hide();
        } else {
            let _ = atelier.set_size(tauri::LogicalSize::new(width, height));
            let _ = atelier.set_position(tauri::LogicalPosition::new(
                origin.x,
                origin.y + size.height - height,
            ));
        }
    }
}

#[tauri::command]
fn set_always_on_top(app: tauri::AppHandle, flag: bool) -> Result<(), String> {
    for label in [TODO_LABEL, ATELIER_LABEL] {
        if let Some(window) = app.get_webview_window(label) {
            window.set_always_on_top(flag).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn reset_window_position(app: tauri::AppHandle) -> Result<(), String> {
    dock_windows(&app);
    Ok(())
}

#[tauri::command]
fn notify(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

/// Les deux fenêtres apparaissent et disparaissent ensemble : c'est un seul jeu.
fn toggle_visibility(app: &tauri::AppHandle) {
    let visible = app
        .get_webview_window(TODO_LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);

    for label in [TODO_LABEL, ATELIER_LABEL] {
        if let Some(window) = app.get_webview_window(label) {
            if visible {
                let _ = window.hide();
            } else {
                let _ = window.show();
            }
        }
    }
    if !visible {
        if let Some(window) = app.get_webview_window(TODO_LABEL) {
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // deux instances corrompraient la sauvegarde : la seconde réveille la première
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            for label in [TODO_LABEL, ATELIER_LABEL] {
                if let Some(window) = app.get_webview_window(label) {
                    let _ = window.show();
                }
            }
            if let Some(window) = app.get_webview_window(TODO_LABEL) {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            persist::load_save,
            persist::write_save,
            persist::read_backup,
            set_always_on_top,
            reset_window_position,
            notify,
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "toggle", "Afficher / masquer", true, None::<&str>)?;
            let dock = MenuItem::with_id(app, "dock", "Recaler les fenêtres", true, None::<&str>)?;
            let quiet = MenuItem::with_id(app, "quiet", "Mode discret", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &dock, &quiet, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Labo Kessler")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => toggle_visibility(app),
                    "dock" => dock_windows(app),
                    "quiet" => {
                        if let Some(window) = app.get_webview_window(TODO_LABEL) {
                            let _ = window.show();
                            let _ = window.emit("tray://quiet-mode", ());
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            dock_windows(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            // fermer une fenêtre masque tout : l'app continue de vivre dans le tray
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let app = window.app_handle();
                for label in [TODO_LABEL, ATELIER_LABEL] {
                    if let Some(w) = app.get_webview_window(label) {
                        let _ = w.hide();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Labo Kessler");
}
