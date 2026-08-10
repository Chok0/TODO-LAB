<script lang="ts">
  /** L'établi : les machines posées sur le bois, reliées par la tubulure. */
  import { createEventDispatcher } from 'svelte';
  import Machine from '../../assets/svg/machines/Machine.svelte';
  import Icon from '../Icon.svelte';
  import { getRecipe } from '../../game-logic/data/recipes.data';
  import { canStartCycle } from '../../game-logic/lab';
  import { effectiveSalePrice } from '../../game-logic/selectors';
  import { BALANCE } from '../../game-logic/balance';
  import { formatDuration } from '../../game-logic/time';
  import { dispatch, game, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import type { MachineInstance } from '../../data/schema';

  const emit = createEventDispatcher<{ open: 'rd' | 'production' }>();

  $: state = $game;
  $: machines = state.lab.machines;
  $: pollution = state.lab.pollution;

  function status(m: MachineInstance): 'idle' | 'running' | 'blocked' {
    if (m.run) return 'running';
    return canStartCycle(state, m) ? 'idle' : 'blocked';
  }

  function progress(m: MachineInstance): number {
    if (!m.run) return 0;
    return Math.min(1, Math.max(0, ($nowStore - m.run.startedAt) / (m.run.endsAt - m.run.startedAt)));
  }
</script>

<section class="station">
  <h2 class="label">Établi</h2>

  {#if machines.length === 0}
    <div class="empty-bench">
      <p class="tiny dim">L'établi de votre oncle est là. Il ne demande qu'un plan.</p>
      <button class="pill go" type="button" on:click={() => emit('open', 'rd')}>
        <Icon name="flask" size={12} /> Ouvrir la recherche
      </button>
    </div>
  {:else}
    <!-- le meuble : son plateau porte les machines -->
    <div class="bench" aria-hidden="true">
      <div class="top"></div>
      <div class="apron"></div>
      <div class="leg left"></div>
      <div class="leg right"></div>
    </div>

    <div class="machines">
      {#each machines as machine (machine.templateId)}
        {@const st = status(machine)}
        {@const recipe = machine.assignedRecipe ? getRecipe(machine.assignedRecipe) : null}
        <div class="slot">
          <button
            class="unit"
            type="button"
            title={`${machine.displayName} — réglages`}
            on:click={() => emit('open', 'production')}
          >
            <Machine
              template={machine.templateId}
              mk={machine.mk}
              state={st}
              branch={recipe?.branch ?? 'legal'}
              size={86}
              standing
            />
          </button>

          <div class="readout">
            <span class="name">{machine.displayName}{#if machine.mk > 1}<em> Mk{machine.mk}</em>{/if}</span>
            {#if recipe}
              <span class="tiny dim recipe">
                {recipe.label}
                {#if recipe.salePrice > 0}<b class="kess">{effectiveSalePrice(state, recipe).toFixed(0)} ₭</b>{/if}
              </span>
            {/if}

            {#if machine.run}
              <div class="gauge"><i style={`width:${progress(machine) * 100}%`}></i></div>
              <span class="tiny mono dim">{formatDuration(machine.run.endsAt - $nowStore)}</span>
            {:else}
              <button
                class="pill"
                class:go={st === 'idle'}
                type="button"
                disabled={st === 'blocked'}
                on:click={() => dispatch({ type: 'StartCycle', machine: machine.templateId })}
              >
                {st === 'blocked' ? FR.lab.blocked : FR.lab.start}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="bench-foot">
      <button class="chip" type="button" on:click={() => emit('open', 'rd')}>
        <Icon name="flask" size={11} /> Recherche
      </button>
      <button class="chip" type="button" on:click={() => emit('open', 'production')}>
        <Icon name="gear" size={11} /> Réglages
      </button>
      {#if pollution > 0}
        <button
          class="chip warn"
          type="button"
          disabled={state.resources.kess < BALANCE.pollution.cleanCost}
          title={FR.lab.pollution}
          on:click={() => dispatch({ type: 'CleanLab' })}
        >
          <Icon name="pollution" size={11} />
          {Math.round(pollution * 100)} % · {FR.lab.clean}
        </button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .station {
    position: relative;
    flex: 1;
    min-width: 0;
    padding: 0 16px 8px;
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

  .machines {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: stretch;
    gap: 14px;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }

  /* rangée 1 = la scène, rangée 2 = la légende sous la ligne de sol */
  .slot {
    display: grid;
    grid-template-rows: var(--scene-h) auto;
    justify-items: center;
    flex: 0 0 auto;
  }

  .unit {
    display: block;
    align-self: end;
    /* posée sur le plateau, pas sur le sol */
    margin-bottom: var(--bench-h);
    border-radius: var(--radius-sm);
    transition: transform 140ms ease;
  }

  .unit:hover {
    transform: translateY(-2px);
  }

  .readout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: 7px;
    min-width: 118px;
    text-align: center;
  }

  .name {
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  .name em {
    font-style: normal;
    color: var(--corrupt-gold);
  }

  .recipe {
    display: flex;
    gap: 5px;
    white-space: nowrap;
  }

  .kess {
    color: var(--kess);
    font-weight: 400;
  }

  .gauge {
    width: 100%;
    height: 5px;
    border-radius: 3px;
    background: color-mix(in oklab, var(--bg-0) 70%, transparent);
    overflow: hidden;
    box-shadow: inset 0 0 0 1px var(--line);
  }

  .gauge i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--lab), color-mix(in oklab, var(--lab) 55%, var(--ok)));
    transition: width 900ms linear;
  }

  /* --- le meuble, calé sur la ligne de sol --- */
  .bench {
    position: absolute;
    left: 6px;
    right: 6px;
    top: calc(var(--scene-h) - var(--bench-h));
    height: var(--bench-h);
    z-index: 1;
  }

  .top {
    height: 9px;
    border-radius: 2px;
    background: linear-gradient(180deg, var(--bench-top), var(--bench));
    box-shadow: 0 1px 0 color-mix(in oklab, var(--bench-top) 70%, #fff) inset, 0 3px 6px rgb(0 0 0 / 0.35);
  }

  .apron {
    height: 7px;
    margin: 0 10px;
    background: var(--bench-dark);
    border-radius: 0 0 2px 2px;
  }

  .leg {
    position: absolute;
    top: 16px;
    width: 8px;
    height: calc(var(--bench-h) - 16px);
    background: var(--bench-dark);
  }

  .leg.left {
    left: 22px;
  }

  .leg.right {
    right: 22px;
  }

  /* posées sur le mur, à droite du titre de la station : le bas de la scène
     appartient à la légende des machines, qui ne doit jamais être recouverte */
  .bench-foot {
    position: absolute;
    left: 84px;
    top: 5px;
    z-index: 3;
    display: flex;
    gap: 5px;
  }

  .pill,
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 10.5px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: color-mix(in oklab, var(--bg-1) 80%, transparent);
    color: var(--text-dim);
    white-space: nowrap;
  }

  .pill:hover:not(:disabled),
  .chip:hover:not(:disabled) {
    border-color: var(--lab);
    color: var(--text-0);
  }

  .pill.go {
    border-color: var(--lab);
    color: var(--text-0);
    background: color-mix(in oklab, var(--lab) 20%, var(--bg-1));
  }

  .chip.warn {
    border-color: var(--warn);
    color: var(--warn);
  }

  .empty-bench {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 7px;
    height: var(--scene-h);
    padding-bottom: 14px;
  }
</style>
