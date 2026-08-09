<script lang="ts">
  /**
   * La colonne de droite : la partie productivité.
   * Volontairement sobre — c'est l'outil de travail ; le jeu vit dans le
   * bandeau atelier.
   */
  import { groupTodos } from '../../game-logic/todos/views';
  import { isSubsidyAvailable } from '../../game-logic/selectors';
  import { dispatch, game, nowStore, plotsReady, unread } from '../../stores/game';
  import { FR } from '../../i18n/fr';

  import TitleBar from '../TitleBar.svelte';
  import ResourceBar from '../ResourceBar.svelte';
  import Panel from '../Panel.svelte';
  import Icon from '../Icon.svelte';
  import Toasts from '../Toasts.svelte';
  import QuickAdd from './QuickAdd.svelte';
  import TodoCard from './TodoCard.svelte';
  import HabitsPanel from './HabitsPanel.svelte';
  import type { Todo } from '../../data/schema';

  export let onEdit: (todo: Todo) => void;
  export let onSettings: () => void;
  export let onQuiet: () => void;
  /** Dans une fenêtre séparée, le bandeau a ses propres badges. */
  export let showAtelierHint = false;

  let quickAdd: QuickAdd;
  let habitsCollapsed = true;

  $: state = $game;
  $: groups = groupTodos(state, $nowStore);
  $: collapsed = state.settings.collapsedPanels;

  function togglePanel(id: string) {
    dispatch({ type: 'TogglePanel', panel: id });
  }

  function revealGroup(kind: 'oneshot' | 'recurring' | 'habit') {
    if (kind === 'habit') {
      habitsCollapsed = false;
      return;
    }
    dispatch({ type: 'UpdateSettings', patch: { collapsedPanels: { ...collapsed, today: false, week: false } } });
  }

  export function focusQuickAdd() {
    quickAdd?.focus();
  }
</script>

<div class="column">
  <TitleBar on:settings={onSettings} on:quiet={onQuiet} />
  <ResourceBar />
  <QuickAdd bind:this={quickAdd} onAdded={revealGroup} />

  <div class="scroll">
    <Panel
      title={FR.panels.today}
      collapsed={collapsed.today === true}
      badge={groups.today.length}
      accent="var(--lab)"
      on:toggle={() => togglePanel('today')}
    >
      {#if groups.today.length === 0}
        <p class="empty">{FR.todo.noneToday}</p>
      {:else}
        {#each groups.today as todo (todo.id)}
          <TodoCard {todo} {onEdit} />
        {/each}
      {/if}
    </Panel>

    <Panel
      title={FR.panels.week}
      collapsed={collapsed.week === true}
      badge={groups.week.length}
      on:toggle={() => togglePanel('week')}
    >
      {#if groups.week.length === 0}
        <p class="empty">{FR.todo.noneWeek}</p>
      {:else}
        {#each groups.week as todo (todo.id)}
          <TodoCard {todo} {onEdit} />
        {/each}
      {/if}
    </Panel>

    <Panel
      title={FR.panels.later}
      collapsed={collapsed.later !== false}
      badge={groups.later.length}
      on:toggle={() => togglePanel('later')}
    >
      {#if groups.later.length === 0}
        <p class="empty">{FR.todo.noneLater}</p>
      {:else}
        {#each groups.later as todo (todo.id)}
          <TodoCard {todo} {onEdit} />
        {/each}
      {/if}
    </Panel>

    <HabitsPanel
      habits={groups.habits}
      collapsed={habitsCollapsed}
      onToggle={() => (habitsCollapsed = !habitsCollapsed)}
      {onEdit}
    />

    {#if isSubsidyAvailable(state)}
      <button class="subsidy" type="button" on:click={() => dispatch({ type: 'AcceptSubsidy' })}>
        <Icon name="reputation" size={13} tone="var(--legal)" />
        <span class="tiny">La Coopérative propose son dispositif de soutien — accepter</span>
      </button>
    {/if}

    {#if showAtelierHint}
      <div class="atelier-link">
        <span class="tiny dim">L'atelier tourne en bas de l'écran</span>
        <span class="badges">
          {#if $plotsReady}<span class="pip ok" title="Parcelles prêtes">{$plotsReady}</span>{/if}
          {#if $unread}<span class="pip warn" title="Courrier non lu">{$unread}</span>{/if}
          {#if state.corruption.pendingEvent}<span class="pip danger" title="Incident à régler">!</span>{/if}
        </span>
      </div>
    {/if}
  </div>

  <Toasts />
</div>

<style>
  .column {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: color-mix(in srgb, var(--bg-0) calc(var(--window-opacity) * 100%), transparent);
    border-left: 1px solid var(--line);
    backdrop-filter: blur(6px);
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .subsidy {
    display: flex;
    align-items: center;
    gap: 6px;
    width: calc(100% - 16px);
    margin: 6px 8px;
    padding: 5px 8px;
    text-align: left;
    border: 1px dashed var(--legal);
    border-radius: var(--radius-sm);
    background: color-mix(in oklab, var(--legal) 12%, var(--bg-1));
  }

  .atelier-link {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 10px 10px 8px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
  }

  .atelier-link .tiny {
    flex: 1;
  }

  .badges {
    display: flex;
    gap: 3px;
  }

  .pip {
    min-width: 15px;
    padding: 0 4px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 15px;
    text-align: center;
    background: var(--line);
    color: var(--text-0);
  }

  .pip.ok {
    background: var(--ok);
    color: var(--bg-0);
  }

  .pip.warn {
    background: var(--warn);
    color: var(--bg-0);
  }

  .pip.danger {
    background: var(--danger);
  }
</style>
