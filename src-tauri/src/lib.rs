//! Coque desktop (docs/09 §7) : fenêtre-widget, tray, persistance, notifications.
//! Rust ne porte aucune règle de jeu.

mod persist;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

/// Largeur par défaut du widget, alignée sur `tauri.conf.json`.
const DEFAULT_WIDTH: f64 = 380.0;

/// Ancre la fenêtre au bord droit de l'écran, pleine hauteur.
///
/// Tout se calcule en unités logiques : mélanger pixels physiques et logiques
/// doublerait la fenêtre sur un écran HiDPI. La largeur courante n'est utilisée
/// que si elle est plausible — au tout premier appel la fenêtre n'est pas encore
/// réalisée et `outer_size()` peut répondre 0, ce qui ferait échouer GTK.
fn dock_right(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };
    let scale = monitor.scale_factor();
    let screen = monitor.size().to_logical::<f64>(scale);
    if screen.width <= 0.0 || screen.height <= 0.0 {
        return;
    }

    let current = window
        .outer_size()
        .map(|s| s.to_logical::<f64>(scale).width)
        .unwrap_or(0.0);
    let width = if current >= 100.0 { current } else { DEFAULT_WIDTH }.min(screen.width);

    let _ = window.set_size(tauri::LogicalSize::new(width, screen.height));
    let _ = window.set_position(tauri::LogicalPosition::new(screen.width - width, 0.0));
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, flag: bool) -> Result<(), String> {
    window.set_always_on_top(flag).map_err(|e| e.to_string())
}

#[tauri::command]
fn reset_window_position(window: tauri::WebviewWindow) -> Result<(), String> {
    dock_right(&window);
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

fn toggle_visibility(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // deux instances corrompraient la sauvegarde : la seconde réveille la première
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
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
            let quiet = MenuItem::with_id(app, "quiet", "Mode discret", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quiet, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Labo Kessler")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => toggle_visibility(app),
                    "quiet" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.emit("tray://quiet-mode", ());
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                dock_right(&window);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // fermer la fenêtre la masque : l'app continue de vivre dans le tray
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Labo Kessler");
}
