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
  import Cultures from './Cultures.svelte';
  import Etabli from './Etabli.svelte';
  import Mur from './Mur.svelte';
  import Compteurs from './Compteurs.svelte';
  import EventCard from '../EventCard.svelte';
  import ResearchPanel from '../lab/ResearchPanel.svelte';
  import ProductionPanel from '../lab/ProductionPanel.svelte';
  import LogPanel from '../log/LogPanel.svelte';
  import Toasts from '../Toasts.svelte';
  import { game } from '../../stores/game';
  import { FR } from '../../i18n/fr';

  /** Sert au décor à caler le panneau à outils derrière l'établi. */
  let benchEl: HTMLElement | undefined;
  let benchLeft = 0;
  let benchWidth = 0;

  type Sheet = 'rd' | 'production' | 'log' | null;
  let sheet: Sheet = null;

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

<div class="band">
  <Backdrop {benchLeft} {benchWidth} />

  <div class="stations">
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

  {#if sheet}
    <Popover
      title={sheet === 'rd' ? FR.panels.rd : sheet === 'production' ? FR.panels.production : FR.panels.log}
      on:close={() => (sheet = null)}
    >
      {#if sheet === 'rd'}
        <ResearchPanel />
      {:else if sheet === 'production'}
        <ProductionPanel />
      {:else}
        <LogPanel />
      {/if}
    </Popover>
  {/if}

  <Toasts />
</div>

<style>
  .band {
    /* Géométrie commune à toutes les stations : une seule ligne de sol.
       Tout ce qui est « posé » l'est sur le bas de .scene ; l'établi est un
       meuble de --bench-h de haut, les machines reposent sur son plateau. */
    --scene-h: 148px;
    --bench-h: 34px;

    position: relative;
    width: 100%;
    height: 100%;
    min-height: 200px;
    overflow: hidden;
    border-top: 1px solid var(--line);
    background: var(--wall);
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
