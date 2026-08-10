<script lang="ts">
  /**
   * Le bandeau atelier : une scène en élévation, pas une liste.
   * De gauche à droite — les cultures au sol, l'établi et ses machines,
   * le mur à courrier, et les compteurs.
   *
   * Les interactions courtes (semer, récolter, lancer un cycle) se font dans
   * la scène ; ce qui demande un formulaire (recette, arbre de recherche,
   * lecture du courrier) s'ouvre dans un panneau au-dessus du bandeau.
   */
  import Backdrop from './Backdrop.svelte';
  import Popover from './Popover.svelte';
  import Fournisseur from './Fournisseur.svelte';
  import Cultures from './Cultures.svelte';
  import Etabli from './Etabli.svelte';
  import Mur from './Mur.svelte';
  import Compteurs from './Compteurs.svelte';
  import EventCard from '../EventCard.svelte';
  import ResearchPanel from '../lab/ResearchPanel.svelte';
  import ProductionPanel from '../lab/ProductionPanel.svelte';
  import LogPanel from '../log/LogPanel.svelte';
  import SupplyPanel from '../supply/SupplyPanel.svelte';
  import Toasts from '../Toasts.svelte';
  import { game } from '../../stores/game';
  import { isTauri } from '../../data/save';
  import { FR } from '../../i18n/fr';

  /** Sert au décor à caler le panneau à outils derrière l'établi. */
  let benchEl: HTMLElement | undefined;
  let benchLeft = 0;
  let benchWidth = 0;

  type Sheet = 'rd' | 'production' | 'log' | 'supply' | null;
  let sheet: Sheet = null;

  const SHEET_TITLES: Record<NonNullable<Sheet>, string> = {
    rd: FR.panels.rd,
    production: FR.panels.production,
    log: FR.panels.log,
    supply: FR.supply.title,
  };

  /**
   * Le bandeau fait 240 px : un formulaire n'y tient pas. Plutôt que de le
   * comprimer, la fenêtre système s'ouvre vers le haut le temps du panneau,
   * puis retrouve la hauteur de la scène. Hors Tauri la page suffit.
   */
  async function setExpanded(expanded: boolean) {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_atelier_expanded', { expanded }).catch(() => {});
  }

  $: void setExpanded(sheet !== null);

  $: state = $game;
  $: pendingEvent = state.corruption.pendingEvent;

  function measure() {
    if (!benchEl) return;
    benchLeft = benchEl.offsetLeft;
    benchWidth = benchEl.offsetWidth;
  }

  $: if (benchEl) measure();
</script>

<svelte:window on:resize={measure} />

<div class="band" class:expanded={sheet !== null}>
  {#if sheet}
    <!-- la place libérée par le déploiement de la fenêtre, pas un calque -->
    <div class="sheet-slot">
      <Popover title={SHEET_TITLES[sheet]} on:close={() => (sheet = null)}>
        {#if sheet === 'rd'}
          <ResearchPanel />
        {:else if sheet === 'production'}
          <ProductionPanel />
        {:else if sheet === 'supply'}
          <SupplyPanel />
        {:else}
          <LogPanel />
        {/if}
      </Popover>
    </div>
  {/if}

  <div class="scene">
  <Backdrop {benchLeft} {benchWidth} />

  <div class="stations">
    <Fournisseur on:open={(e) => (sheet = e.detail)} />
    <Cultures />
    <div class="bench-wrap" bind:this={benchEl}>
      <Etabli on:open={(e) => (sheet = e.detail)} />
    </div>
    <Mur on:open={(e) => (sheet = e.detail)} />
    <Compteurs />
  </div>

  {#if pendingEvent}
    <div class="event-slot"><EventCard /></div>
  {/if}
  </div>

  <Toasts />
</div>

<style>
  .band {
    /* Géométrie commune à toutes les stations : une seule ligne de sol.
       Tout ce qui est « posé » l'est sur le bas de .scene ; l'établi est un
       meuble de --bench-h de haut, les machines reposent sur son plateau. */
    --scene-h: 150px;
    --bench-h: 34px;
    /* hauteur de la scène seule : c'est la hauteur du bandeau au repos */
    --band-h: 239px;

    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: var(--band-h);
    overflow: hidden;
    border-top: 1px solid var(--line);
    background: var(--wall);
  }

  /* le panneau prend toute la hauteur gagnée, la scène garde la sienne */
  .sheet-slot {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
  }

  .sheet-slot > :global(*) {
    flex: 1;
    min-height: 0;
  }

  .scene {
    position: relative;
    flex: 0 0 var(--band-h);
    height: var(--band-h);
    overflow: hidden;
  }

  /* dans le bandeau, les notifications passent en haut : le bas est occupé */
  .band :global(.stack) {
    top: 6px;
    bottom: auto;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: max-content;
    max-width: 60%;
    align-items: center;
  }

  .band :global(.stack .toast) {
    align-self: center;
  }

  .stations {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 0;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .bench-wrap {
    display: flex;
    flex: 1 1 auto;
    min-width: 300px;
  }

  /* l'incident se pose par-dessus la scène, à droite, sans rien bloquer */
  .event-slot {
    position: absolute;
    right: 8px;
    top: 8px;
    bottom: 8px;
    width: 300px;
    overflow-y: auto;
    z-index: 8;
  }
</style>
