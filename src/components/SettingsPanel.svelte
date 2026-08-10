<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dispatch, exportSave, game, importSave } from '../stores/game';
  import { downloadSave, isTauri, readFileAsText } from '../data/save';
  import { FR } from '../i18n/fr';
  import type { WindowLayer } from '../data/schema';

  const emit = createEventDispatcher<{ close: void }>();
  $: state = $game;
  let fileInput: HTMLInputElement;
  let importError = '';

  async function onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      importSave(await readFileAsText(file));
      importError = '';
      emit('close');
    } catch (err) {
      importError = String(err);
    }
  }

  function setOpacity(value: number) {
    dispatch({ type: 'UpdateSettings', patch: { opacity: value } });
  }

  async function resetPosition() {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('reset_window_position').catch(() => {});
  }

  async function setLayer(layer: WindowLayer) {
    dispatch({ type: 'UpdateSettings', patch: { layer } });
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_window_layer', { layer }).catch(() => {});
  }

  const LAYERS: WindowLayer[] = ['desktop', 'normal', 'top'];
</script>

<div class="overlay" role="presentation" on:click|self={() => emit('close')}>
  <div class="sheet" role="dialog" aria-label={FR.app.settings}>
    <h2>{FR.app.settings}</h2>

    <label class="row">
      <span>{FR.settings.opacity}</span>
      <input
        type="range"
        min="0.6"
        max="1"
        step="0.02"
        value={state.settings.opacity}
        on:input={(e) => setOpacity(Number(e.currentTarget.value))}
      />
      <span class="mono tiny">{Math.round(state.settings.opacity * 100)} %</span>
    </label>

    <div class="field">
      <span class="tiny dim">{FR.settings.layer}</span>
      <div class="segmented">
        {#each LAYERS as layer}
          <button
            class="seg"
            class:on={state.settings.layer === layer}
            type="button"
            title={FR.settings.layerHint[layer]}
            on:click={() => setLayer(layer)}
          >
            {FR.settings.layers[layer]}
          </button>
        {/each}
      </div>
      <p class="tiny dim hint">{FR.settings.layerHint[state.settings.layer]}</p>
    </div>

    <label class="row check">
      <input
        type="checkbox"
        checked={state.settings.reducedMotion}
        on:change={(e) => dispatch({ type: 'UpdateSettings', patch: { reducedMotion: e.currentTarget.checked } })}
      />
      <span>{FR.settings.reducedMotion}</span>
    </label>

    <div class="row">
      <button class="btn" type="button" on:click={() => downloadSave(JSON.parse(exportSave()))}>
        {FR.settings.exportSave}
      </button>
      <button class="btn" type="button" on:click={() => fileInput.click()}>{FR.settings.importSave}</button>
      <input class="hidden" type="file" accept="application/json" bind:this={fileInput} on:change={onFile} />
    </div>

    {#if isTauri()}
      <div class="row">
        <button class="btn" type="button" on:click={resetPosition}>{FR.settings.resetPosition}</button>
      </div>
    {/if}

    {#if importError}
      <p class="tiny err">{importError}</p>
    {/if}

    <p class="tiny dim about">{FR.settings.about}</p>
    <p class="tiny dim">
      Jours joués : {state.stats.daysPlayed} · tâches complétées : {state.stats.todosCompleted} · cycles :
      {state.stats.cyclesCompleted}
    </p>

    <div class="row end">
      <button class="btn primary" type="button" on:click={() => emit('close')}>Fermer</button>
    </div>
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .segmented {
    display: flex;
    gap: 3px;
  }

  .seg {
    flex: 1;
    padding: 3px 6px;
    font-size: 11px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--text-dim);
  }

  .seg:hover {
    background: var(--bg-2);
    color: var(--text-0);
  }

  .seg.on {
    border-color: var(--lab);
    background: color-mix(in oklab, var(--lab) 20%, var(--bg-1));
    color: var(--text-0);
  }

  .hint {
    line-height: 1.35;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 45;
    padding: 12px;
  }

  .sheet {
    width: 100%;
    max-width: 320px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  h2 {
    font-size: 13px;
    font-weight: 600;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
  }

  .row.check {
    cursor: pointer;
  }

  .row.end {
    justify-content: flex-end;
  }

  input[type='range'] {
    flex: 1;
    padding: 0;
    background: none;
    border: none;
  }

  .hidden {
    display: none;
  }

  .about {
    line-height: 1.4;
  }

  .err {
    color: var(--danger);
  }
</style>
