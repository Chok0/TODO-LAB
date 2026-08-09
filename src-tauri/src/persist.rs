//! Persistance atomique et copies de secours (docs/09 §5).
//!
//! Rust ne connaît ni les todos ni l'économie : il stocke des octets.
//! Toute la logique de jeu vit côté TypeScript (DEC-03).

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

pub const BACKUP_COUNT: u8 = 3;

fn save_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("dossier de données introuvable : {e}"))?
        .join("save");
    fs::create_dir_all(&dir).map_err(|e| format!("création du dossier impossible : {e}"))?;
    Ok(dir)
}

fn save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(save_dir(app)?.join("state.json"))
}

fn backup_path(app: &tauri::AppHandle, n: u8) -> Result<PathBuf, String> {
    Ok(save_dir(app)?.join(format!("state.backup.{n}.json")))
}

/// Écriture atomique : fichier temporaire → fsync → rename.
/// Un plantage en cours d'écriture ne peut pas laisser un fichier tronqué.
fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let tmp = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&tmp).map_err(|e| format!("création du fichier temporaire : {e}"))?;
        file.write_all(contents.as_bytes())
            .map_err(|e| format!("écriture : {e}"))?;
        file.sync_all().map_err(|e| format!("synchronisation : {e}"))?;
    }
    fs::rename(&tmp, path).map_err(|e| format!("remplacement du fichier : {e}"))?;
    Ok(())
}

/// Rotation des copies : backup.2 → backup.3, backup.1 → backup.2, save → backup.1.
fn rotate_backups(app: &tauri::AppHandle) -> Result<(), String> {
    for n in (1..BACKUP_COUNT).rev() {
        let from = backup_path(app, n)?;
        let to = backup_path(app, n + 1)?;
        if from.exists() {
            let _ = fs::rename(&from, &to);
        }
    }
    let current = save_path(app)?;
    if current.exists() {
        let _ = fs::copy(&current, backup_path(app, 1)?);
    }
    Ok(())
}

#[tauri::command]
pub fn load_save(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = save_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path).map(Some).map_err(|e| format!("lecture : {e}"))
}

#[tauri::command]
pub fn read_backup(app: tauri::AppHandle, n: u8) -> Result<Option<String>, String> {
    let path = backup_path(&app, n)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path).map(Some).map_err(|e| format!("lecture : {e}"))
}

/// La rotation n'a lieu qu'une fois par session, pas à chaque sauvegarde.
#[tauri::command]
pub fn write_save(app: tauri::AppHandle, json: String, rotate: Option<bool>) -> Result<(), String> {
    if rotate.unwrap_or(false) {
        rotate_backups(&app)?;
    }
    write_atomic(&save_path(&app)?, &json)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn write_atomic_replaces_content_without_leaving_temp() {
        let dir = env::temp_dir().join("labo-kessler-test");
        fs::create_dir_all(&dir).unwrap();
        let target = dir.join("state.json");

        write_atomic(&target, "{\"a\":1}").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "{\"a\":1}");

        write_atomic(&target, "{\"a\":2}").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "{\"a\":2}");
        assert!(!target.with_extension("json.tmp").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn write_atomic_creates_parent_file() {
        let dir = env::temp_dir().join("labo-kessler-test-2");
        fs::create_dir_all(&dir).unwrap();
        let target = dir.join("fresh.json");
        assert!(!target.exists());
        write_atomic(&target, "{}").unwrap();
        assert!(target.exists());
        fs::remove_dir_all(&dir).ok();
    }
}
