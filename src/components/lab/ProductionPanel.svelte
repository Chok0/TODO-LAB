<script lang="ts">
  /** Cartes machines : cycle, recette, moyens, pollution (docs/11 §5). */
  import Machine from '../../assets/svg/machines/Machine.svelte';
  import { getRecipe } from '../../game-logic/data/recipes.data';
  import { canStartCycle } from '../../game-logic/lab';
  import { effectiveSalePrice, machineUpgradeCost, recipesForMachine } from '../../game-logic/selectors';
  import { formatDuration } from '../../game-logic/time';
  import { BALANCE } from '../../game-logic/balance';
  import { dispatch, game, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';
  import type { MachineInstance, RecipeId } from '../../data/schema';

  $: state = $game;
  $: pollutionPct = Math.round(state.lab.pollution * 100);

  function statusOf(machine: MachineInstance): 'idle' | 'running' | 'blocked' {
    if (machine.run) return 'running';
    return canStartCycle(state, machine) ? 'idle' : 'blocked';
  }

  function progress(machine: MachineInstance): number {
    if (!machine.run) return 0;
    const total = machine.run.endsAt - machine.run.startedAt;
    return Math.min(1, Math.max(0, ($nowStore - machine.run.startedAt) / total));
  }

  function branchOf(machine: MachineInstance): 'legal' | 'illegal' {
    return machine.assignedRecipe ? getRecipe(machine.assignedRecipe).branch : 'legal';
  }
</script>

{#if state.lab.machines.length === 0}
  <p class="empty">{FR.lab.noMachine}</p>
{:else}
  {#if state.lab.pollution > 0}
    <div class="pollution">
      <Icon name="pollution" size={13} tone="var(--warn)" />
      <span class="tiny">{FR.lab.pollution}</span>
      <span class="gauge"><i style={`width:${(state.lab.pollution / BALANCE.pollution.max) * 100}%`}></i></span>
      <span class="tiny mono">{pollutionPct} %</span>
      <button
        class="btn tiny"
        type="button"
        disabled={state.resources.energy < BALANCE.pollution.cleanCostEnergy}
        on:click={() => dispatch({ type: 'CleanLab' })}
      >
        {FR.lab.clean} · {BALANCE.pollution.cleanCostEnergy} EN
      </button>
    </div>
  {/if}

  {#each state.lab.machines as machine (machine.templateId)}
    {@const status = statusOf(machine)}
    {@const recipes = recipesForMachine(state, machine.templateId)}
    {@const recipe = machine.assignedRecipe ? getRecipe(machine.assignedRecipe) : null}
    <div class="machine-card">
      <Machine template={machine.templateId} mk={machine.mk} state={status} branch={branchOf(machine)} size={54} />

      <div class="info">
        <div class="row head">
          <span class="name">{machine.displayName}</span>
          <span class="mk tiny mono">Mk{machine.mk}</span>
        </div>

        {#if recipes.length}
          <select
            class="recipe"
            value={machine.assignedRecipe ?? ''}
            on:change={(e) =>
              dispatch({
                type: 'AssignRecipe',
                machine: machine.templateId,
                recipe: (e.currentTarget.value || null) as RecipeId | null,
              })}
          >
            {#each recipes as r (r.id)}
              <option value={r.id}>{r.label}</option>
            {/each}
          </select>
        {:else}
          <p class="tiny dim">{FR.lab.noRecipe}</p>
        {/if}

        {#if recipe}
          <p class="tiny dim recipe-info">
            {recipe.inputs.map((i) => `${i.amount} ${FR.resources[i.resource].replace('Principe actif ', 'PA ')}`).join(' + ')}
            {#if recipe.salePrice > 0}
              → <span class="kess">{effectiveSalePrice(state, recipe).toFixed(1)} ₭</span>
            {:else if recipe.output}
              → {recipe.output.amount} {FR.resources[recipe.output.resource].replace('Principe actif ', 'PA ')}
            {/if}
          </p>
        {/if}

        {#if machine.run}
          <div class="bar"><i style={`width:${progress(machine) * 100}%`}></i></div>
          <span class="tiny dim">{formatDuration(machine.run.endsAt - $nowStore)}</span>
        {:else}
          <div class="row actions">
            <button
              class="btn tiny"
              type="button"
              disabled={!canStartCycle(state, machine)}
              on:click={() => dispatch({ type: 'StartCycle', machine: machine.templateId })}
            >
              {status === 'blocked' ? FR.lab.blocked : FR.lab.start}
            </button>
          </div>
        {/if}

        <div class="row means">
          {#each ['clean', 'dirty'] as const as m}
            <button
              class="chip"
              class:on={machine.means === m}
              type="button"
              title={FR.lab.meansHint[m]}
              on:click={() => dispatch({ type: 'SetMeans', machine: machine.templateId, means: m })}
            >
              <Icon name={m} size={11} />
              {FR.lab.means[m]}
            </button>
          {/each}

          {#if machine.mk === 1 && state.lab.researched.includes('catalysis')}
            <button
              class="chip up"
              type="button"
              disabled={state.resources.kess < machineUpgradeCost(machine.templateId)}
              on:click={() => dispatch({ type: 'UpgradeMachine', machine: machine.templateId })}
            >
              Mk2 · {machineUpgradeCost(machine.templateId)} ₭
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
{/if}

<style>
  .machine-card {
    display: flex;
    gap: 8px;
    padding: 7px 4px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 55%, transparent);
  }

  .machine-card:last-child {
    border-bottom: none;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .head {
    justify-content: space-between;
    gap: 4px;
  }

  .name {
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mk {
    color: var(--corrupt-gold);
  }

  .recipe {
    width: 100%;
    padding: 3px 5px;
    font-size: 11.5px;
  }

  .recipe-info {
    line-height: 1.3;
  }

  .kess {
    color: var(--kess);
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
    background: var(--lab);
    transition: width 900ms linear;
  }

  .actions {
    gap: 5px;
  }

  .means {
    gap: 4px;
    flex-wrap: wrap;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    font-size: 10.5px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--bg-2);
    color: var(--text-dim);
  }

  .chip.on {
    border-color: var(--lab);
    color: var(--text-0);
    background: color-mix(in oklab, var(--lab) 22%, var(--bg-2));
  }

  .chip.up {
    border-color: var(--corrupt-gold);
    color: var(--corrupt-gold);
  }

  .pollution {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 3px;
    border-bottom: 1px solid var(--line);
  }

  .gauge {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--bg-2);
    overflow: hidden;
  }

  .gauge i {
    display: block;
    height: 100%;
    background: var(--warn);
  }

  .btn.tiny {
    font-size: 11px;
    padding: 2px 7px;
  }
</style>
