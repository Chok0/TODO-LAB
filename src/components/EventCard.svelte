<script lang="ts">
  /**
   * Incident de corruption : carte épinglée, jamais une modale bloquante
   * (DEC-09). Elle ne bloque que les nouveaux cycles illégaux.
   */
  import { getRecipe } from '../game-logic/data/recipes.data';
  import { formatDuration } from '../game-logic/time';
  import { dispatch, game, nowStore } from '../stores/game';
  import { FR } from '../i18n/fr';
  import Icon from './Icon.svelte';

  $: state = $game;
  $: event = state.corruption.pendingEvent;
  $: contract = state.corruption.activeContract;
</script>

{#if event}
  <div class="event" class:offer={event.kind === 'offer'}>
    <div class="head">
      <Icon name={event.kind === 'offer' ? 'reputation' : 'alert'} size={14} />
      <span class="title">{event.title}</span>
      {#if event.kind === 'sanction'}
        <span class="tiny grav">{FR.event.gravity[event.gravity]}</span>
      {/if}
    </div>

    <p class="body">{event.body}</p>
    <p class="from tiny dim">— {FR.pnj[event.pnj]}</p>

    <div class="options">
      {#each event.options as option (option.pay)}
        {@const short = option.pay === 'kess' && state.resources.kess < option.cost}
        <button
          class="btn tiny"
          class:primary={option.pay === 'refuse'}
          type="button"
          disabled={short}
          on:click={() => dispatch({ type: 'ResolveEvent', mode: option.pay })}
        >
          {option.label}
          {#if short}
            <span class="dim">· {Math.ceil(option.cost - state.resources.kess)} {FR.event.cannotAfford}</span>
          {/if}
        </button>
      {/each}
    </div>

    {#if event.kind === 'sanction'}
      <p class="tiny dim hint">
        {FR.event.contract(
          event.options.find((o) => o.pay === 'service')?.cost ?? 0,
          getRecipe(event.contractRecipe).label,
          event.contractHours,
        )}
      </p>
    {/if}
  </div>
{/if}

{#if contract}
  <div class="contract">
    <Icon name="crate" size={13} tone="var(--corrupt-gold)" />
    <span class="tiny">
      {FR.event.contractActive} · {getRecipe(contract.recipe).label}
      <span class="mono">{contract.total - contract.remaining}/{contract.total}</span>
    </span>
    <span class="tiny dim">{FR.event.deadline} {formatDuration(contract.deadline - $nowStore)}</span>
  </div>
{/if}

<style>
  .event {
    margin: 6px 8px;
    padding: 8px;
    border: 1px solid var(--corrupt);
    border-left-width: 3px;
    border-radius: var(--radius-sm);
    background: color-mix(in oklab, var(--corrupt) 12%, var(--bg-1));
  }

  .event.offer {
    border-color: var(--corrupt-gold);
    background: color-mix(in oklab, var(--corrupt-gold) 12%, var(--bg-1));
  }

  .head {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 4px;
  }

  .title {
    flex: 1;
    font-weight: 600;
    font-size: 12px;
  }

  .grav {
    color: var(--warn);
  }

  .body {
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--text-0);
  }

  .from {
    margin-top: 3px;
    font-style: italic;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 7px;
  }

  .hint {
    margin-top: 5px;
  }

  .contract {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0 8px 6px;
    padding: 4px 7px;
    border: 1px dashed var(--corrupt-gold);
    border-radius: var(--radius-sm);
  }

  .contract .tiny:first-of-type {
    flex: 1;
  }

  .btn.tiny {
    font-size: 11px;
    padding: 3px 7px;
    text-align: left;
  }
</style>
