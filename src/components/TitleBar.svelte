<script lang="ts">
  /** Barre de titre fine : drag, épingle, mode discret, réglages (docs/11 §2). */
  import { createEventDispatcher } from 'svelte';
  import { getBand } from '../game-logic/selectors';
  import { dispatch, game } from '../stores/game';
  import { isTauri } from '../data/save';
  import { FR } from '../i18n/fr';
  import Icon from './Icon.svelte';

  const emit = createEventDispatcher<{ settings: void; quiet: void }>();

  $: state = $game;
  $: band = getBand(state.alignment.score);
  /** Tendance récente, jamais la valeur brute (docs/06 §4). */
  $: trend = state.alignment.score > 1 ? '↑' : state.alignment.score < -1 ? '↓' : '·';
  $: bandColor = band === 'coop' ? 'var(--legal)' : band === 'zone' ? 'var(--corrupt)' : 'var(--broker)';

  async function togglePin() {
    const next = !state.settings.alwaysOnTop;
    dispatch({ type: 'UpdateSettings', patch: { alwaysOnTop: next } });
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_always_on_top', { flag: next }).catch(() => {});
    }
  }
</script>

<header class="bar" data-tauri-drag-region>
  <span class="brand" data-tauri-drag-region>{FR.app.title}</span>

  <button class="glyph" type="button" title={FR.bands[band]} aria-label={FR.bands[band]}>
    <span class="band" style={`background:${bandColor}`}></span>
    <span class="tiny dim">{FR.bandShort[band]} {trend}</span>
  </button>

  <button
    class="icon-btn"
    class:on={state.settings.alwaysOnTop}
    type="button"
    title={FR.app.pin}
    on:click={togglePin}><Icon name="pin" size={13} /></button
  >
  <button class="icon-btn" type="button" title={FR.app.quiet} on:click={() => emit('quiet')}>
    <Icon name="chevron" size={13} />
  </button>
  <button class="icon-btn" type="button" title={FR.app.settings} on:click={() => emit('settings')}>
    <Icon name="gear" size={13} />
  </button>
</header>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 7px;
    background: var(--bg-0);
    border-bottom: 1px solid var(--line);
    cursor: grab;
  }

  .brand {
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .glyph {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 5px;
    border-radius: 9px;
  }

  .glyph:hover {
    background: var(--bg-2);
  }

  .band {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .icon-btn {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    color: var(--text-dim);
  }

  .icon-btn:hover {
    background: var(--bg-2);
    color: var(--text-0);
  }

  .icon-btn.on {
    color: var(--lab);
  }
</style>
