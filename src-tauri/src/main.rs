// Pas de console Windows en release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    labo_kessler_lib::run()
}
