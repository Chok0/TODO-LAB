<script lang="ts">
  /**
   * Panneau Habitudes — replié à CHAQUE démarrage, jamais mémorisé (docs/03 §1.3).
   * Rien de son contenu ne s'affiche passivement.
   */
  import type { HabitTodo, Todo } from '../../data/schema';
  import { counterPenalty } from '../../game-logic/todos/habits';
  import { dispatch } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';
  import Panel from '../Panel.svelte';

  export let habits: HabitTodo[];
  export let collapsed: boolean;
  export let onToggle: () => void;
  export let onEdit: (todo: Todo) => void;

  let confirming: string | null = null;

  function relapse(habit: HabitTodo) {
    if (confirming !== habit.id) {
      confirming = habit.id;
      setTimeout(() => (confirming = null), 4000);
      return;
    }
    confirming = null;
    dispatch({ type: 'BreakAbstinence', id: habit.id });
  }
</script>

<Panel title={FR.panels.habits} {collapsed} on:toggle={onToggle} accent="var(--broker)" badge={null}>
  {#if habits.length === 0}
    <p class="empty">{FR.todo.noHabits}</p>
  {:else}
    {#each habits as habit (habit.id)}
      <div class="habit">
        <button class="name" type="button" on:click={() => onEdit(habit)}>
          <Icon name={habit.habitKind === 'abstinence' ? 'abstinence' : 'counter'} size={12} />
          <span>{habit.title}</span>
        </button>

        {#if habit.habitKind === 'abstinence'}
          <span class="streak mono tiny" class:failed={habit.failedToday}>
            <Icon name="streak" size={11} />
            {habit.streak}
          </span>
          <button
            class="relapse tiny"
            type="button"
            disabled={habit.failedToday}
            on:click={() => relapse(habit)}
          >
            {habit.failedToday ? 'noté' : confirming === habit.id ? FR.todo.confirmRelapse : FR.todo.relapse}
          </button>
        {:else}
          <span class="count mono">{habit.todayCount}</span>
          <span
            class="pen tiny"
            class:warn={habit.thresholds && habit.todayCount > habit.thresholds.s1}
          >
            −{counterPenalty(habit.todayCount, habit.thresholds?.s1 ?? 0, habit.thresholds?.s2 ?? 0)}
          </span>
          <button class="plus" type="button" on:click={() => dispatch({ type: 'IncrementHabit', id: habit.id })}>
            <Icon name="plus" size={13} />
          </button>
        {/if}
      </div>
    {/each}
    <p class="tiny dim note">{FR.todo.habitsHidden}</p>
  {/if}
</Panel>

<style>
  .habit {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 2px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 50%, transparent);
  }

  .habit:last-of-type {
    border-bottom: none;
  }

  .name {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    text-align: left;
    font-size: 12px;
  }

  .name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .streak {
    display: flex;
    align-items: center;
    gap: 2px;
    color: var(--warn);
  }

  .streak.failed {
    color: var(--text-dim);
  }

  .relapse {
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    color: var(--text-dim);
  }

  .relapse:hover:not(:disabled) {
    border-color: var(--danger);
    color: var(--text-0);
  }

  .count {
    min-width: 18px;
    text-align: right;
    font-size: 13px;
  }

  .pen {
    min-width: 22px;
    color: var(--text-dim);
  }

  .pen.warn {
    color: var(--danger);
  }

  .plus {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--bg-2);
  }

  .plus:hover {
    border-color: var(--broker);
  }

  .note {
    margin-top: 6px;
    font-style: italic;
  }
</style>
