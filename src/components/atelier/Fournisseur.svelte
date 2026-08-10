<script lang="ts">
  /**
   * L'étal du Fournisseur : une pile de caisses posée contre le mur, à gauche
   * de la scène. C'est la seule source d'intrants tant que la friche n'est pas
   * remise en culture — et l'appoint quand les parcelles ne suivent pas.
   *
   * La pile maigrit à mesure que le quota du jour se consomme ; le détail des
   * prix s'ouvre dans un panneau, comme la recherche ou le courrier.
   */
  import { createEventDispatcher } from 'svelte';
  import { PLANTS } from '../../game-logic/data/plants.data';
  import { isPlantUnlocked, isSupplyOpen, supplyQuota, supplyRemaining } from '../../game-logic/selectors';
  import { game } from '../../stores/game';
  import { FR } from '../../i18n/fr';

  const emit = createEventDispatcher<{ open: 'supply' }>();

  $: state = $game;
  $: available = PLANTS.filter((p) => isPlantUnlocked(state, p.id));
  $: open = isSupplyOpen(state);
  $: remaining = supplyRemaining(state);
  $: quota = supplyQuota(state);
  /** Nombre de caisses dessinées : l'étal se vide à mesure qu'on achète. */
  $: crates = Math.max(1, Math.round((remaining / Math.max(1, quota)) * 3));
</script>

<section class="station">
  <h2 class="label">{FR.supply.title}</h2>

  <div class="stall">
    <button
      class="stack"
      type="button"
      title={FR.supply.hint}
      disabled={!open || available.length === 0}
      on:click={() => emit('open', 'supply')}
    >
      {#each Array(crates) as _, i (i)}
        <span class="crate" style={`--i:${i}`}>
          <i></i><i></i>
        </span>
      {/each}
      {#if !open}
        <span class="sold tiny">fermé</span>
      {:else if remaining === 0}
        <span class="sold tiny">épuisé</span>
      {/if}
    </button>

    <div class="action">
      {#if open}
        <span class="quota tiny mono dim" title={FR.supply.hint}>{FR.supply.quota(remaining, quota)}</span>
      {:else}
        <span class="quota tiny dim" title={FR.supply.closedHint}>{FR.supply.closed}</span>
      {/if}
    </div>
  </div>
</section>

<style>
  .station {
    position: relative;
    flex: 0 0 auto;
    padding: 0 14px 8px;
  }

  .label {
    position: absolute;
    top: 8px;
    left: 14px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  /* rangée 1 = la scène, rangée 2 = la légende — même ligne de sol que tout le reste */
  .stall {
    display: grid;
    grid-template-rows: var(--scene-h) auto;
    justify-items: center;
    width: 104px;
    height: 100%;
  }

  .stack {
    position: relative;
    align-self: end;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 2px;
    padding-bottom: 0;
  }

  /* une caisse : planches horizontales et cerclage */
  .crate {
    position: relative;
    display: block;
    width: calc(56px - var(--i) * 9px);
    height: 17px;
    border: 1px solid var(--crate-line);
    border-radius: 2px;
    background: linear-gradient(180deg, var(--crate-top), var(--crate));
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.3);
  }

  .crate i {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: color-mix(in oklab, var(--crate-line) 70%, transparent);
  }

  .crate i:first-child {
    left: 33%;
  }

  .crate i:last-child {
    left: 66%;
  }

  .stack:hover:not(:disabled) .crate {
    border-color: var(--supply);
  }

  .sold {
    position: absolute;
    top: -13px;
    left: 50%;
    transform: translateX(-50%) rotate(-6deg);
    color: var(--text-dim);
    white-space: nowrap;
  }

  .action {
    align-self: start;
    margin-top: 7px;
    min-height: 18px;
    display: grid;
    place-items: center;
  }

  .quota {
    white-space: nowrap;
  }

</style>
