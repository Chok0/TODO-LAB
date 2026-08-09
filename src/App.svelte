<script lang="ts">
  /**
   * Routeur de vue. Le jeu occupe deux fenêtres système (docs/11 §2) :
   *   • `todo`    — colonne ancrée à droite, la partie productivité ;
   *   • `atelier` — bandeau posé au-dessus de la barre des tâches, le jeu.
   * Hors Tauri il n'y a qu'une fenêtre : les deux vues cohabitent, ce qui
   * donne un aperçu fidèle de la disposition finale.
   */
  import { onMount } from 'svelte';
  import { dispatch, fatalError, game, initialize, ready, startFresh, undo } from './stores/game';
  import { currentZone } from './stores/sync';
  import { FR } from './i18n/fr';

  import TodoZone from './components/todo/TodoZone.svelte';
  import AtelierZone from './components/atelier/AtelierZone.svelte';
  import TodoEditor from './components/todo/TodoEditor.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import Icon from './components/Icon.svelte';
  import Toasts from './components/Toasts.svelte';

  import type { Todo } from './data/schema';
  import type { TodoDraft } from './game-logic/actions';

  const zone = currentZone();

  let showSettings = false;
  let editing: { todo: Todo; draft: TodoDraft } | null = null;
  let todoZone: TodoZone;

  $: state = $game;
  $: quiet = state.settings.quietMode;

  $: if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--window-opacity', String(state.settings.opacity));
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
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key === 'n') {
      event.preventDefault();
      setQuiet(false);
      todoZone?.focusQuickAdd();
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
  <div class="recovery">
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
  <div class="loading"><span class="tiny dim">…</span></div>
{:else if zone === 'atelier'}
  <AtelierZone />
{:else if quiet && zone !== 'single'}
  <!-- mode discret : barre fine d'icônes + badges (docs/11 §2) -->
  <div class="rail">
    <button class="rail-btn" type="button" title="Déplier" on:click={() => setQuiet(false)}>
      <Icon name="chevron" size={14} />
    </button>
  </div>
{:else if zone === 'single'}
  <!-- aperçu : les deux fenêtres réunies dans une seule page -->
  <div class="preview">
    <div class="preview-top">
      <div class="preview-column"><TodoZone bind:this={todoZone} onEdit={openEditor} onSettings={() => (showSettings = true)} onQuiet={() => setQuiet(true)} /></div>
    </div>
    <div class="preview-band"><AtelierZone /></div>
  </div>
{:else}
  <div class="single-column">
    <TodoZone
      bind:this={todoZone}
      onEdit={openEditor}
      onSettings={() => (showSettings = true)}
      onQuiet={() => setQuiet(true)}
      showAtelierHint
    />
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

{#if zone === 'atelier'}
  <Toasts />
{/if}

<style>
  .single-column {
    width: 380px;
    height: 100vh;
  }

  /* --- aperçu navigateur : la disposition du bureau, dans une page --- */
  .preview {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
  }

  .preview-top {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    min-height: 0;
  }

  .preview-column {
    width: 380px;
    height: 100%;
  }

  .preview-band {
    flex: 0 0 240px;
    min-height: 240px;
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
  }

  .rail-btn {
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

  .loading,
  .recovery {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 380px;
    height: 100vh;
    padding: 20px;
    text-align: center;
    background: var(--bg-0);
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
