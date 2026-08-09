<script lang="ts">
  /** Parcelles : plantation en deux taps, récolte, jachère (docs/11 §5). */
  import Plant from '../../assets/svg/plants/Plant.svelte';
  import { PLANTS, getPlant } from '../../game-logic/data/plants.data';
  import { computeYield, growthDuration } from '../../game-logic/farming';
  import { isPlantUnlocked, nextPlotCost, seedCost } from '../../game-logic/selectors';
  import { formatDuration } from '../../game-logic/time';
  import { dispatch, game, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';
  import type { PlantId, Plot } from '../../data/schema';

  $: state = $game;
  $: unlocked = PLANTS.filter((p) => isPlantUnlocked(state, p.id));
  $: plotPrice = nextPlotCost(state);

  let choosing: string | null = null;
  let chosenPlant: PlantId | null = null;

  function stageOf(plot: Plot): 0 | 1 | 2 | 3 {
    if (plot.state.kind === 'ready') return 3;
    if (plot.state.kind !== 'growing') return 0;
    const total = plot.state.endsAt - plot.state.startedAt;
    const done = ($nowStore - plot.state.startedAt) / total;
    return done < 0.34 ? 0 : done < 0.67 ? 1 : 2;
  }

  function sow(plotId: string, plant: PlantId, method: 'agro' | 'intensive') {
    dispatch({ type: 'Plant', plotId, plant, method });
    choosing = null;
    chosenPlant = null;
  }
</script>

{#each state.farm.plots as plot (plot.id)}
  <div class="plot">
    <Plant
      plant={plot.state.kind === 'growing' || plot.state.kind === 'ready' ? plot.state.plant : 'medicinal'}
      stage={stageOf(plot)}
      bare={plot.state.kind !== 'growing' && plot.state.kind !== 'ready'}
      size={40}
    />

    <div class="info">
      {#if plot.state.kind === 'growing'}
        <span class="label">{getPlant(plot.state.plant).label}</span>
        <div class="bar">
          <i style={`width:${Math.min(100, (($nowStore - plot.state.startedAt) / (plot.state.endsAt - plot.state.startedAt)) * 100)}%`}></i>
        </div>
        <span class="tiny dim">{formatDuration(plot.state.endsAt - $nowStore)}</span>
      {:else if plot.state.kind === 'ready'}
        <span class="label">{getPlant(plot.state.plant).label}</span>
        <span class="tiny dim">{FR.farm.yield} {plot.state.yield}</span>
        <button class="btn tiny primary" type="button" on:click={() => dispatch({ type: 'Harvest', plotId: plot.id })}>
          {FR.farm.harvest}
        </button>
      {:else if plot.state.kind === 'fallow'}
        <span class="label dim">{FR.farm.fallowState}</span>
        <button class="btn tiny" type="button" on:click={() => dispatch({ type: 'SetFallow', plotId: plot.id, on: false })}>
          {FR.farm.unfallow}
        </button>
      {:else if choosing === plot.id}
        {#if !chosenPlant}
          <div class="picker">
            {#each unlocked as p (p.id)}
              <button class="btn tiny" type="button" on:click={() => (chosenPlant = p.id)}>
                {p.label}
                {#if (state.farm.seedStock[p.id] ?? 0) > 0}
                  <span class="dim">· {state.farm.seedStock[p.id]} {FR.farm.seedStock}</span>
                {/if}
              </button>
            {/each}
            <button class="btn tiny" type="button" on:click={() => (choosing = null)}>{FR.quickAdd.cancel}</button>
          </div>
        {:else}
          {@const picked = chosenPlant}
          <div class="picker">
            {#each ['agro', 'intensive'] as const as method}
              {@const cost = seedCost(state, picked, method)}
              <button
                class="btn tiny"
                type="button"
                title={FR.farm.methodHint[method]}
                disabled={cost > state.resources.kess}
                on:click={() => sow(plot.id, picked, method)}
              >
                <Icon name={method === 'agro' ? 'clean' : 'dirty'} size={11} />
                {FR.farm.methods[method]} · {cost} ₭ ·
                {computeYield(picked, method, plot.envDebt)}⨯ ·
                {formatDuration(growthDuration(picked, method))}
              </button>
            {/each}
            <button class="btn tiny" type="button" on:click={() => (chosenPlant = null)}>‹</button>
          </div>
        {/if}
      {:else}
        <span class="label dim">{FR.farm.empty}</span>
        <div class="row">
          <button class="btn tiny" type="button" disabled={unlocked.length === 0} on:click={() => (choosing = plot.id)}>
            {FR.farm.plant}
          </button>
          <button class="btn tiny" type="button" on:click={() => dispatch({ type: 'SetFallow', plotId: plot.id, on: true })}>
            {FR.farm.fallow}
          </button>
        </div>
      {/if}

      {#if plot.envDebt > 0.1}
        <span class="debt tiny" title={FR.farm.debt}>
          <Icon name="debt" size={11} /> {Math.round(plot.envDebt * 100)} %
        </span>
      {/if}
    </div>
  </div>
{/each}

{#if plotPrice !== null}
  <button
    class="btn tiny wide"
    type="button"
    disabled={state.resources.kess < plotPrice}
    on:click={() => dispatch({ type: 'BuyPlot' })}
  >
    {FR.farm.buyPlot} · {plotPrice} ₭
  </button>
{:else}
  <p class="tiny dim">{FR.farm.maxPlots}</p>
{/if}

<style>
  .plot {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 6px 3px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 55%, transparent);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 12px;
  }

  .bar {
    height: 4px;
    border-radius: 2px;
    background: var(--bg-2);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--farm);
    transition: width 900ms linear;
  }

  .picker {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-start;
  }

  .debt {
    display: flex;
    align-items: center;
    gap: 3px;
    color: var(--warn);
  }

  .btn.tiny {
    font-size: 11px;
    padding: 2px 7px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .wide {
    width: 100%;
    justify-content: center;
    margin-top: 6px;
  }
</style>
