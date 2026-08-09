<script lang="ts">
  import { onMount } from 'svelte';
  import { groupTodos } from './game-logic/todos/views';
  import { isIllegalBranchVisible, isSubsidyAvailable } from './game-logic/selectors';
  import {
    dispatch,
    fatalError,
    game,
    initialize,
    nowStore,
    plotsReady,
    ready,
    startFresh,
    undo,
    unread,
  } from './stores/game';
  import { FR } from './i18n/fr';

  import TitleBar from './components/TitleBar.svelte';
  import ResourceBar from './components/ResourceBar.svelte';
  import Panel from './components/Panel.svelte';
  import Icon from './components/Icon.svelte';
  import Toasts from './components/Toasts.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import EventCard from './components/EventCard.svelte';
  import QuickAdd from './components/todo/QuickAdd.svelte';
  import TodoCard from './components/todo/TodoCard.svelte';
  import TodoEditor from './components/todo/TodoEditor.svelte';
  import HabitsPanel from './components/todo/HabitsPanel.svelte';
  import ResearchPanel from './components/lab/ResearchPanel.svelte';
  import ProductionPanel from './components/lab/ProductionPanel.svelte';
  import FarmPanel from './components/farm/FarmPanel.svelte';
  import LogPanel from './components/log/LogPanel.svelte';

  import type { Todo } from './data/schema';
  import type { TodoDraft } from './game-logic/actions';

  const DOCK = ['rd', 'production', 'farm', 'log'] as const;

  let showSettings = false;
  let editing: { todo: Todo; draft: TodoDraft } | null = null;
  let quickAdd: QuickAdd;

  $: state = $game;
  $: groups = groupTodos(state, $nowStore);
  $: quiet = state.settings.quietMode;
  $: collapsed = state.settings.collapsedPanels;
  $: pendingEvent = state.corruption.pendingEvent;
  /** Le panneau Habitudes est replié à chaque démarrage, jamais mémorisé. */
  let habitsCollapsed = true;

  // l'opacité de la fenêtre est pilotée par les réglages
  $: if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--window-opacity', String(state.settings.opacity));
  }

  function togglePanel(id: string) {
    dispatch({ type: 'TogglePanel', panel: id });
  }

  /** Le dock est un accordéon : un seul module déplié à la fois (docs/11 §5). */
  function toggleDock(id: (typeof DOCK)[number]) {
    const wasOpen = collapsed[id] === false;
    const patch: Record<string, boolean> = { ...collapsed };
    for (const d of DOCK) patch[d] = true;
    patch[id] = wasOpen;
    dispatch({ type: 'UpdateSettings', patch: { collapsedPanels: patch } });
  }

  /** Une todo qui vient d'être créée doit être visible immédiatement. */
  function revealGroup(kind: 'oneshot' | 'recurring' | 'habit') {
    if (kind === 'habit') {
      habitsCollapsed = false;
      return;
    }
    dispatch({ type: 'UpdateSettings', patch: { collapsedPanels: { ...collapsed, today: false, week: false } } });
  }

  function setQuiet(value: boolean) {
    dispatch({ type: 'UpdateSettings', patch: { quietMode: value } });
  }

  function openEditor(todo: Todo) {
    editing = {
      todo,
      draft: {
        title: todo.title,
        category: todo.category,
        difficulty: todo.difficulty,
        kind: todo.kind,
        dueAt: todo.kind === 'oneshot' ? todo.dueAt : null,
        frequency: todo.kind === 'recurring' ? todo.frequency : 'daily',
        mode: todo.kind === 'recurring' ? todo.mode : 'fixed',
        target: todo.kind === 'recurring' ? todo.target : 1,
        fixedDays: todo.kind === 'recurring' ? todo.fixedDays : [],
        habitKind: todo.kind === 'habit' ? todo.habitKind : 'abstinence',
        thresholds: todo.kind === 'habit' ? todo.thresholds : null,
        gain: todo.gain,
        loss: todo.loss,
      },
    };
  }

  function onKeydown(event: KeyboardEvent) {
    const meta = event.ctrlKey || event.metaKey;
    if (!meta) return;
    if (event.key === 'n') {
      event.preventDefault();
      setQuiet(false);
      quickAdd?.focus();
    }
    if (event.key === 'd') {
      event.preventDefault();
      setQuiet(!quiet);
    }
    if (event.key === 'z') {
      event.preventDefault();
      undo();
    }
  }

  onMount(() => {
    void initialize();
    const onVisibility = () => document.body.classList.toggle('hidden-window', document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  });
</script>

<svelte:window on:keydown={onKeydown} />

{#if $fatalError}
  <!-- seul écran bloquant autorisé de l'application (docs/11 §10) -->
  <div class="widget recovery">
    <h1>{FR.errors.saveCorrupt}</h1>
    <p class="tiny">{FR.errors.saveCorruptBody}</p>
    <pre class="tiny">{$fatalError.message}</pre>
    <div class="row">
      {#if $fatalError.raw}
        <button
          class="btn"
          type="button"
          on:click={() => {
            const blob = new Blob([$fatalError?.raw ?? ''], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'sauvegarde-corrompue.json';
            a.click();
          }}>{FR.errors.exportBroken}</button
        >
      {/if}
      <button class="btn danger" type="button" on:click={startFresh}>{FR.errors.startFresh}</button>
    </div>
  </div>
{:else if !$ready}
  <div class="widget loading"><span class="tiny dim">…</span></div>
{:else if quiet}
  <!-- mode discret : barre fine d'icônes + badges (docs/11 §2) -->
  <div class="rail">
    <button class="rail-btn" type="button" title="Déplier" on:click={() => setQuiet(false)}>
      <Icon name="chevron" size={14} />
    </button>
    <button class="rail-btn" type="button" title={FR.panels.today} on:click={() => setQuiet(false)}>
      <Icon name="check" size={14} />
      {#if groups.today.length}<span class="pip">{groups.today.length}</span>{/if}
    </button>
    <button class="rail-btn" type="button" title={FR.panels.farm} on:click={() => setQuiet(false)}>
      <Icon name="harvest" size={14} />
      {#if $plotsReady}<span class="pip ok">{$plotsReady}</span>{/if}
    </button>
    <button class="rail-btn" type="button" title={FR.panels.log} on:click={() => setQuiet(false)}>
      <Icon name="envelope" size={14} />
      {#if $unread}<span class="pip warn">{$unread}</span>{/if}
    </button>
    {#if pendingEvent}
      <button class="rail-btn alert" type="button" title={pendingEvent.title} on:click={() => setQuiet(false)}>
        <Icon name="alert" size={14} />
      </button>
    {/if}
  </div>
{:else}
  <div class="widget">
    <TitleBar on:settings={() => (showSettings = true)} on:quiet={() => setQuiet(true)} />
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
            <TodoCard {todo} onEdit={openEditor} />
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
            <TodoCard {todo} onEdit={openEditor} />
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
            <TodoCard {todo} onEdit={openEditor} />
          {/each}
        {/if}
      </Panel>

      <HabitsPanel
        habits={groups.habits}
        collapsed={habitsCollapsed}
        onToggle={() => (habitsCollapsed = !habitsCollapsed)}
        onEdit={openEditor}
      />

      <!-- ================= dock modules ================= -->
      <div class="dock-mark">
        <span class="tiny dim">Atelier</span>
      </div>

      <EventCard />

      {#if isSubsidyAvailable(state)}
        <button class="subsidy" type="button" on:click={() => dispatch({ type: 'AcceptSubsidy' })}>
          <Icon name="reputation" size={13} tone="var(--legal)" />
          <span class="tiny">La Coopérative propose son dispositif de soutien — accepter</span>
        </button>
      {/if}

      <Panel
        title={FR.panels.rd}
        collapsed={collapsed.rd !== false}
        accent="var(--lab)"
        on:toggle={() => toggleDock('rd')}
      >
        <ResearchPanel />
      </Panel>

      {#if state.lab.machines.length > 0}
      <Panel
        title={FR.panels.production}
        collapsed={collapsed.production !== false}
        accent="var(--lab)"
        badge={state.lab.machines.filter((m) => m.run).length || null}
        on:toggle={() => toggleDock('production')}
      >
        <ProductionPanel />
      </Panel>
      {/if}

      <Panel
        title={FR.panels.farm}
        collapsed={collapsed.farm !== false}
        accent="var(--farm)"
        badge={$plotsReady || null}
        badgeTone="warn"
        on:toggle={() => toggleDock('farm')}
      >
        <FarmPanel />
      </Panel>

      <Panel
        title={FR.panels.log}
        collapsed={collapsed.log !== false}
        accent={isIllegalBranchVisible(state) ? 'var(--corrupt-gold)' : 'var(--broker)'}
        badge={$unread || null}
        badgeTone="warn"
        on:toggle={() => toggleDock('log')}
      >
        <LogPanel />
      </Panel>
    </div>

    <Toasts />
  </div>
{/if}

{#if editing}
  <TodoEditor
    draft={editing.draft}
    existingId={editing.todo.id}
    on:close={() => (editing = null)}
    on:save={(e) => {
      dispatch({ type: 'UpdateTodo', id: editing!.todo.id, draft: e.detail });
      editing = null;
    }}
    on:delete={(e) => {
      dispatch({ type: 'DeleteTodo', id: e.detail });
      editing = null;
    }}
  />
{/if}

{#if showSettings}
  <SettingsPanel on:close={() => (showSettings = false)} />
{/if}

<style>
  .widget {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 380px;
    height: 100vh;
    background: color-mix(in srgb, var(--bg-0) calc(var(--window-opacity) * 100%), transparent);
    border-left: 1px solid var(--line);
    backdrop-filter: blur(6px);
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .dock-mark {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 10px 3px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .dock-mark::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line);
  }

  .subsidy {
    display: flex;
    align-items: center;
    gap: 6px;
    width: calc(100% - 16px);
    margin: 4px 8px;
    padding: 5px 8px;
    text-align: left;
    border: 1px dashed var(--legal);
    border-radius: var(--radius-sm);
    background: color-mix(in oklab, var(--legal) 12%, var(--bg-1));
  }

  .rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 48px;
    height: 100vh;
    padding: 6px 0;
    background: color-mix(in srgb, var(--bg-0) calc(var(--window-opacity) * 100%), transparent);
    border-left: 1px solid var(--line);
    backdrop-filter: blur(6px);
  }

  .rail-btn {
    position: relative;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius);
    color: var(--text-dim);
  }

  .rail-btn:hover {
    background: var(--bg-2);
    color: var(--text-0);
  }

  .rail-btn.alert {
    color: var(--danger);
  }

  .pip {
    position: absolute;
    top: 2px;
    right: 1px;
    min-width: 14px;
    padding: 0 3px;
    border-radius: 7px;
    background: var(--line);
    color: var(--text-0);
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 14px;
  }

  .pip.ok {
    background: var(--ok);
    color: var(--bg-0);
  }

  .pip.warn {
    background: var(--warn);
    color: var(--bg-0);
  }

  .loading,
  .recovery {
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 20px;
  }

  .recovery {
    text-align: center;
  }

  .recovery h1 {
    font-size: 14px;
  }

  .recovery pre {
    max-width: 100%;
    overflow-x: auto;
    color: var(--text-dim);
    text-align: left;
  }

  .row {
    display: flex;
    gap: 6px;
    justify-content: center;
  }
</style>
