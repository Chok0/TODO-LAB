<script lang="ts">
  /** Panneau de détail, ouvert au-dessus du bandeau. */
  import { createEventDispatcher } from 'svelte';
  import Icon from '../Icon.svelte';

  export let title: string;
  const emit = createEventDispatcher<{ close: void }>();
</script>

<div class="scrim" role="presentation" on:click|self={() => emit('close')}>
  <section class="sheet" role="dialog" aria-label={title}>
    <header>
      <span class="title">{title}</span>
      <button class="close" type="button" aria-label="Fermer" on:click={() => emit('close')}>
        <Icon name="plus" size={14} />
      </button>
    </header>
    <div class="body"><slot /></div>
  </section>
</div>

<style>
  .scrim {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 20;
    padding: 10px;
  }

  .sheet {
    width: min(560px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    animation: rise 160ms ease-out;
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-bottom: 1px solid var(--line);
  }

  .title {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
  }

  .close {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    transform: rotate(45deg);
  }

  .close:hover {
    background: var(--bg-2);
    color: var(--text-0);
  }

  .body {
    padding: 9px 11px 12px;
    overflow-y: auto;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
