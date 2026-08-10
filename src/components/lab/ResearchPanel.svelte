<script lang="ts">
  /** Arbre de R&D compact : verrouillé / disponible / acquis (docs/11 §5). */
  import { TECH_TREE } from '../../game-logic/data/tech-tree.data';
  import { isTechAvailable, isTechResearched, machineBuildCost, machineOf, researchCost } from '../../game-logic/selectors';
  import { dispatch, game } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';

  $: state = $game;
</script>

<div class="tree">
  {#each TECH_TREE as node (node.id)}
    {@const done = isTechResearched(state, node.id)}
    {@const available = isTechAvailable(state, node.id)}
    {@const cost = researchCost(state, node.id)}
    {@const affordable = state.resources.kess >= cost}
    <div class="node" class:done class:available class:locked={!done && !available}>
      <div class="line">
        <span class="icon">
          {#if done}<Icon name="check" size={13} tone="var(--ok)" />
          {:else if available}<Icon name="kess" size={13} tone="var(--kess)" />
          {:else}<Icon name="lock" size={13} />{/if}
        </span>
        <span class="label">{node.label}</span>
        {#if !done}
          <button
            class="btn tiny"
            type="button"
            disabled={!available || !affordable}
            on:click={() => dispatch({ type: 'Research', tech: node.id })}
          >
            {cost} ₭
            {#if available && !affordable}
              <span class="dim">· {Math.ceil(cost - state.resources.kess)} {FR.event.cannotAfford}</span>
            {/if}
          </button>
        {/if}
      </div>
      <p class="effect tiny dim">{node.effect}</p>

      {#if done && node.unlocksMachine && !machineOf(state, node.unlocksMachine)}
        <button
          class="btn tiny build"
          type="button"
          disabled={state.resources.kess < machineBuildCost(node.unlocksMachine)}
          on:click={() => dispatch({ type: 'BuildMachine', machine: node.unlocksMachine! })}
        >
          {FR.lab.build} · {machineBuildCost(node.unlocksMachine)} ₭
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .tree {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .node {
    padding-left: 4px;
    border-left: 2px solid var(--line);
  }

  .node.available {
    border-left-color: var(--lab);
  }

  .node.done {
    border-left-color: var(--ok);
  }

  .node.locked {
    opacity: 0.5;
  }

  .line {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon {
    display: flex;
  }

  .label {
    flex: 1;
    font-size: 12px;
  }

  .effect {
    margin: 1px 0 0 19px;
    line-height: 1.35;
  }

  .build {
    margin: 4px 0 0 19px;
  }

  .btn.tiny {
    font-size: 11px;
    padding: 2px 7px;
    white-space: nowrap;
  }
</style>
