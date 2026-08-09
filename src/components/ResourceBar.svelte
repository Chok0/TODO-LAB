<script lang="ts">
  /** Bandeau de ressources : Énergie, Kess, et les principes actifs en stock. */
  import { game } from '../stores/game';
  import { FR } from '../i18n/fr';
  import Icon from './Icon.svelte';
  import type { ResourceId } from '../data/schema';

  $: state = $game;
  const PA: ResourceId[] = ['pa_med', 'pa_ind', 'pa_rec', 'pa_tox'];
  const HARVEST: ResourceId[] = ['harvest_med', 'harvest_ind', 'harvest_rec', 'harvest_tox'];

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
</script>

<div class="bar">
  <span class="res energy" title={FR.resources.energy}>
    <Icon name="energy" size={12} />
    <span class="mono">{fmt(state.resources.energy)}</span>
  </span>
  <span class="res kess" title={FR.resources.kess}>
    <Icon name="kess" size={12} />
    <span class="mono">{fmt(state.resources.kess)}</span>
  </span>

  {#if state.corruption.taxRate > 0}
    <span class="res tax" title="Taxe de corruption, permanente">
      <Icon name="key" size={12} />
      <span class="mono">{Math.round(state.corruption.taxRate * 100)} %</span>
    </span>
  {/if}

  <span class="spacer"></span>

  {#each HARVEST as id}
    {#if state.resources[id] > 0}
      <span class="res small" title={FR.resources[id]}>
        <Icon name="harvest" size={11} />
        <span class="mono tiny">{state.resources[id]}</span>
      </span>
    {/if}
  {/each}
  {#each PA as id}
    {#if state.resources[id] > 0}
      <span class="res small" title={FR.resources[id]}>
        <Icon name="flask" size={11} />
        <span class="mono tiny">{state.resources[id]}</span>
      </span>
    {/if}
  {/each}
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: var(--bg-0);
    border-bottom: 1px solid var(--line);
    overflow: hidden;
  }

  .res {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    white-space: nowrap;
  }

  .res.energy {
    color: var(--energy);
  }

  .res.kess {
    color: var(--kess);
  }

  .res.tax {
    color: var(--corrupt);
  }

  .res.small {
    color: var(--text-dim);
    gap: 2px;
  }

  .spacer {
    flex: 1;
  }
</style>
