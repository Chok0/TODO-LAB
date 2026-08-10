<script lang="ts">
  /** Les planches de culture, alignées au sol sous la fenêtre. */
  import Plant from '../../assets/svg/plants/Plant.svelte';
  import Icon from '../Icon.svelte';
  import { PLANTS } from '../../game-logic/data/plants.data';
  import { computeYield, growthDuration } from '../../game-logic/farming';
  import { isFarmUnlocked, isPlantUnlocked, nextPlotCost, seedCost } from '../../game-logic/selectors';
  import { formatDuration } from '../../game-logic/time';
  import { dispatch, game, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import type { PlantId, Plot } from '../../data/schema';

  $: state = $game;
  $: unlocked = PLANTS.filter((p) => isPlantUnlocked(state, p.id));
  $: plotPrice = nextPlotCost(state);
  $: unlockedFarm = isFarmUnlocked(state);

  let menu: string | null = null;
  let picked: PlantId | null = null;

  function stageOf(plot: Plot): 0 | 1 | 2 | 3 {
    if (plot.state.kind === 'ready') return 3;
    if (plot.state.kind !== 'growing') return 0;
    const done = ($nowStore - plot.state.startedAt) / (plot.state.endsAt - plot.state.startedAt);
    return done < 0.34 ? 0 : done < 0.67 ? 1 : 2;
  }

  function progress(plot: Plot): number {
    if (plot.state.kind !== 'growing') return 0;
    return Math.min(1, ($nowStore - plot.state.startedAt) / (plot.state.endsAt - plot.state.startedAt));
  }

  function sow(plotId: string, plant: PlantId, method: 'agro' | 'intensive') {
    dispatch({ type: 'Plant', plotId, plant, method });
    menu = null;
    picked = null;
  }
</script>

<section class="station">
  <h2 class="label">Cultures</h2>

  {#if !unlockedFarm}
    <!-- la friche existe, elle est simplement en jachère : on la montre -->
    <div class="fallowland">
      <div class="weeds" aria-hidden="true">
        {#each Array(3) as _, i (i)}<span class="tuft" style={`--i:${i}`}></span>{/each}
      </div>
      <div class="soil dead"></div>
      <p class="tiny dim note" title={FR.farm.lockedHint}>{FR.farm.locked}</p>
    </div>
  {:else}
  <div class="beds">
    {#each state.farm.plots as plot (plot.id)}
      {@const ready = plot.state.kind === 'ready'}
      <div class="bed" class:ready>
        <div class="grow">
        <div class="canopy">
          <Plant
            plant={plot.state.kind === 'growing' || plot.state.kind === 'ready' ? plot.state.plant : 'medicinal'}
            stage={stageOf(plot)}
            bare={plot.state.kind !== 'growing' && plot.state.kind !== 'ready'}
            size={62}
          />
          {#if plot.envDebt > 0.1}
            <span class="debt" title={FR.farm.debt}>{Math.round(plot.envDebt * 100)}%</span>
          {/if}
        </div>

        <div class="soil">
          {#if plot.state.kind === 'growing'}
            <div class="growth" style={`--p:${progress(plot) * 100}%`}></div>
          {/if}
        </div>
        </div>

        <div class="action">
          {#if plot.state.kind === 'ready'}
            <button class="pill go" type="button" on:click={() => dispatch({ type: 'Harvest', plotId: plot.id })}>
              {FR.farm.harvest} · {plot.state.yield}
            </button>
          {:else if plot.state.kind === 'growing'}
            <span class="tiny mono dim">{formatDuration(plot.state.endsAt - $nowStore)}</span>
          {:else if plot.state.kind === 'fallow'}
            <button class="pill" type="button" on:click={() => dispatch({ type: 'SetFallow', plotId: plot.id, on: false })}>
              {FR.farm.unfallow}
            </button>
          {:else}
            <button class="pill" type="button" disabled={unlocked.length === 0} on:click={() => (menu = plot.id)}>
              {FR.farm.plant}
            </button>
          {/if}
        </div>

        {#if menu === plot.id}
          <div class="menu" role="dialog" aria-label={FR.farm.plant}>
            {#if !picked}
              {#each unlocked as p (p.id)}
                <button class="opt" type="button" on:click={() => (picked = p.id)}>
                  {p.label}
                  {#if (state.farm.seedStock[p.id] ?? 0) > 0}<span class="dim">· {state.farm.seedStock[p.id]}</span>{/if}
                </button>
              {/each}
            {:else}
              {@const chosen = picked}
              {#each ['agro', 'intensive'] as const as method}
                {@const cost = seedCost(state, chosen, method)}
                <button
                  class="opt"
                  type="button"
                  disabled={cost > state.resources.kess}
                  title={FR.farm.methodHint[method]}
                  on:click={() => sow(plot.id, chosen, method)}
                >
                  <Icon name={method === 'agro' ? 'clean' : 'dirty'} size={11} />
                  {FR.farm.methods[method]}
                  <span class="dim">{cost} ₭ · {computeYield(chosen, method, plot.envDebt)}⨯ · {formatDuration(growthDuration(chosen, method))}</span>
                </button>
              {/each}
            {/if}
            <button class="opt close" type="button" on:click={() => { menu = null; picked = null; }}>
              {FR.quickAdd.cancel}
            </button>
          </div>
        {/if}
      </div>
    {/each}

    {#if plotPrice !== null}
      <button
        class="bed new"
        type="button"
        disabled={state.resources.kess < plotPrice}
        on:click={() => dispatch({ type: 'BuyPlot' })}
        title={FR.farm.buyPlot}
      >
        <Icon name="plus" size={16} />
        <span class="tiny mono">{plotPrice} ₭</span>
      </button>
    {/if}
  </div>
  {/if}
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

  /* --- friche non débloquée : trois touffes sur une terre morte --- */
  .fallowland {
    display: grid;
    grid-template-rows: var(--scene-h) auto;
    justify-items: center;
    width: 172px;
    height: 100%;
  }

  .weeds {
    align-self: end;
    display: flex;
    align-items: flex-end;
    gap: 20px;
    height: 100%;
    padding-bottom: 13px;
  }

  .tuft {
    display: block;
    width: 2px;
    height: calc(11px + var(--i) * 5px);
    background: color-mix(in oklab, var(--farm) 40%, var(--wall));
    transform: rotate(calc(-8deg + var(--i) * 8deg));
    transform-origin: bottom center;
  }

  .soil.dead {
    position: absolute;
    bottom: auto;
    top: calc(var(--scene-h) - 13px);
    left: 14px;
    width: 172px;
    height: 13px;
    border-radius: 0 0 3px 3px;
    background: linear-gradient(180deg, color-mix(in oklab, var(--farm-soil) 60%, var(--wall)), var(--wall-far));
    box-shadow: none;
  }

  .note {
    align-self: start;
    margin-top: 7px;
    max-width: 172px;
    text-align: center;
    line-height: 1.3;
  }

  .beds {
    display: flex;
    align-items: stretch;
    gap: 8px;
    height: 100%;
  }

  /* rangée 1 = la scène (tout est posé sur son bas), rangée 2 = les commandes */
  .bed {
    position: relative;
    display: grid;
    grid-template-rows: var(--scene-h) auto;
    justify-items: center;
    width: 78px;
  }

  .grow {
    display: flex;
    flex-direction: column;
    align-self: end;
    align-items: center;
    width: 100%;
  }

  .canopy {
    position: relative;
    height: 62px;
  }

  /* la planche : bac de terre vu de face */
  .soil {
    position: relative;
    width: 100%;
    height: 13px;
    border-radius: 0 0 3px 3px;
    background: linear-gradient(180deg, var(--farm-soil), color-mix(in oklab, var(--farm-soil) 55%, #000));
    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--farm-soil) 60%, #fff);
    overflow: hidden;
  }

  .growth {
    position: absolute;
    inset: auto 0 0 0;
    height: 2px;
    background: var(--farm);
    width: var(--p);
    transition: width 900ms linear;
  }

  .bed.ready .soil {
    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--farm-soil) 60%, #fff), 0 0 0 1px var(--ok);
  }

  .action {
    align-self: start;
    margin-top: 7px;
    min-height: 18px;
    display: grid;
    place-items: center;
  }

  .pill {
    padding: 2px 8px;
    font-size: 10.5px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: color-mix(in oklab, var(--bg-1) 80%, transparent);
    color: var(--text-dim);
  }

  .pill:hover:not(:disabled) {
    border-color: var(--farm);
    color: var(--text-0);
  }

  .pill.go {
    border-color: var(--ok);
    color: var(--text-0);
    background: color-mix(in oklab, var(--ok) 22%, var(--bg-1));
  }

  .bed.new {
    display: flex;
    flex-direction: column;
    align-self: end;
    justify-content: center;
    align-items: center;
    gap: 3px;
    height: 44px;
    width: 58px;
    margin-bottom: 30px;
    border: 1px dashed var(--line);
    border-radius: var(--radius-sm);
    color: var(--text-dim);
  }

  .bed.new:hover:not(:disabled) {
    border-color: var(--farm);
    color: var(--text-0);
  }

  .debt {
    position: absolute;
    top: 0;
    right: -2px;
    padding: 0 4px;
    font-family: var(--font-mono);
    font-size: 9px;
    border-radius: 7px;
    background: var(--warn);
    color: var(--bg-0);
  }

  .menu {
    position: absolute;
    bottom: calc(100% - var(--scene-h) + 26px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 190px;
    padding: 5px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .opt {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 7px;
    font-size: 11.5px;
    text-align: left;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  .opt:hover:not(:disabled) {
    background: var(--bg-2);
  }

  .opt.close {
    color: var(--text-dim);
    justify-content: center;
  }
</style>
