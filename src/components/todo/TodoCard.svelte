<script lang="ts">
  /** Carte todo : fond teinté par catégorie, bordure/icône par type (docs/11 §4). */
  import type { Todo } from '../../data/schema';
  import { recurrenceIcon, recurrenceLabel, remainingToday } from '../../game-logic/todos/views';
  import { basePayout } from '../../game-logic/todos/todos';
  import { relativeDayLabel } from '../../game-logic/time';
  import { dispatch, game, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';

  export let todo: Todo;
  export let onEdit: (todo: Todo) => void;

  $: remaining = remainingToday(todo, $nowStore);
  $: overdue = todo.kind === 'oneshot' && todo.dueAt !== null && todo.dueAt < $nowStore;

  function complete() {
    dispatch({ type: 'CompleteTodo', id: todo.id });
  }
</script>

<article class="card {todo.category}" class:overdue>
  <button
    class="tick"
    type="button"
    on:click={complete}
    disabled={remaining <= 0}
    aria-label={FR.todo.done}
    title={FR.todo.done}
  >
    <span class="box"><Icon name="check" size={12} /></span>
  </button>

  <button class="body" type="button" on:click={() => onEdit(todo)}>
    <span class="title">{todo.title}</span>
    <span class="meta tiny dim">
      <Icon name={recurrenceIcon(todo)} size={11} />
      {recurrenceLabel(todo)}
      {#if todo.kind === 'oneshot' && todo.dueAt}
        · {relativeDayLabel(todo.dueAt, $nowStore)}
      {/if}
      {#if todo.kind === 'recurring' && remaining > 1}
        · {FR.todo.remaining(remaining)}
      {/if}
    </span>
  </button>

  <span class="right">
    <span class="payout tiny mono">+{basePayout($game, todo)} ₭</span>
    <span class="dots" aria-label={`difficulté ${todo.difficulty}`}>
      {#each Array(todo.difficulty) as _, i (i)}<i></i>{/each}
    </span>
  </span>
</article>

<style>
  .card {
    --tint: var(--perso);
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 7px;
    margin-bottom: 4px;
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--tint);
    background: color-mix(in oklab, var(--tint) 11%, var(--bg-1));
  }

  .card.pro {
    --tint: var(--pro);
  }

  .card.overdue {
    border-left-color: var(--warn);
  }

  .tick {
    display: flex;
    flex: 0 0 auto;
  }

  .box {
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border: 1.5px solid var(--line);
    border-radius: var(--radius-sm);
    color: transparent;
    background: var(--bg-0);
    transition: color 120ms ease, border-color 120ms ease;
  }

  .tick:hover:not(:disabled) .box {
    border-color: var(--ok);
    color: color-mix(in oklab, var(--ok) 60%, transparent);
  }

  .tick:disabled .box {
    border-style: dashed;
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    text-align: left;
  }

  .title {
    font-size: 12.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }

  .payout {
    color: var(--kess);
  }

  .dots {
    display: flex;
    gap: 2px;
  }

  .dots i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-dim);
  }
</style>
