<script lang="ts">
  /** Les compteurs de l'atelier : ce qui rentre, ce qui sort, et pour qui. */
  import Icon from '../Icon.svelte';
  import { currentBand } from '../../game-logic/selectors';
  import { game } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import type { ResourceId } from '../../data/schema';

  const PA: { id: ResourceId; short: string }[] = [
    { id: 'pa_med', short: 'méd' },
    { id: 'pa_ind', short: 'ind' },
    { id: 'pa_rec', short: 'réc' },
    { id: 'pa_tox', short: 'tox' },
  ];

  $: state = $game;
  $: band = currentBand(state);
  $: bandColor = band === 'coop' ? 'var(--legal)' : band === 'zone' ? 'var(--corrupt)' : 'var(--broker)';

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
</script>

<section class="station">
  <h2 class="label">Compteurs</h2>

  <div class="readouts">
  <div class="dials">
    <div class="dial energy">
      <Icon name="energy" size={15} />
      <span class="value mono">{fmt(state.resources.energy)}</span>
      <span class="unit tiny">EN</span>
    </div>
    <div class="dial kess">
      <Icon name="kess" size={15} />
      <span class="value mono">{fmt(state.resources.kess)}</span>
      <span class="unit tiny">₭</span>
    </div>
  </div>

  <div class="stock">
    {#each PA as pa}
      <span class="vial" class:empty={state.resources[pa.id] === 0} title={FR.resources[pa.id]}>
        <i class="glass"><b style={`height:${Math.min(100, state.resources[pa.id] * 8)}%`}></b></i>
        <span class="tiny mono">{state.resources[pa.id]}</span>
        <span class="tiny dim">{pa.short}</span>
      </span>
    {/each}
  </div>

  </div>

  <div class="faction" title={FR.bands[band]}>
    <span class="dot" style={`background:${bandColor}`}></span>
    <span class="tiny">{FR.bandShort[band]}</span>
    {#if state.corruption.taxRate > 0}
      <span class="tax tiny mono" title="Taxe permanente sur toutes les ventes">
        −{Math.round(state.corruption.taxRate * 100)} %
      </span>
    {/if}
  </div>
</section>

<style>
  .station {
    position: relative;
    display: grid;
    grid-template-rows: var(--scene-h) auto;
    flex: 0 0 auto;
    width: 190px;
    padding: 0 16px 8px;
    border-left: 1px solid color-mix(in oklab, var(--line) 60%, transparent);
  }

  .readouts {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 9px;
    padding-bottom: 10px;
  }

  .label {
    position: absolute;
    top: 8px;
    left: 16px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .dials {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .dial {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .dial :global(svg) {
    align-self: center;
  }

  .value {
    font-size: 20px;
    line-height: 1.1;
  }

  .unit {
    color: var(--text-dim);
  }

  .energy {
    color: var(--energy);
  }

  .kess {
    color: var(--kess);
  }

  /* les principes actifs, en fioles */
  .stock {
    display: flex;
    gap: 9px;
  }

  .vial {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  .glass {
    position: relative;
    display: block;
    width: 11px;
    height: 24px;
    border: 1px solid var(--lab-steel);
    border-top: none;
    border-radius: 0 0 5px 5px;
    background: color-mix(in oklab, var(--bg-0) 60%, transparent);
    overflow: hidden;
  }

  .glass b {
    position: absolute;
    inset: auto 0 0 0;
    display: block;
    background: var(--glass);
    opacity: 0.75;
    transition: height 300ms ease;
  }

  .vial.empty .glass b {
    opacity: 0.15;
  }

  .faction {
    align-self: start;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 7px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .tax {
    margin-left: auto;
    color: var(--corrupt);
  }
</style>
