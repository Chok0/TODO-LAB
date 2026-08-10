<script lang="ts">
  /**
   * Panneau de détail. Il ne se superpose pas à la scène : il occupe la place
   * que la fenêtre vient de libérer en se déployant vers le haut, de sorte que
   * l'atelier reste visible pendant qu'on règle une machine ou qu'on lit son
   * courrier.
   */
  import { createEventDispatcher } from 'svelte';
  import Icon from '../Icon.svelte';

  export let title: string;
  const emit = createEventDispatcher<{ close: void }>();
</script>

<section class="sheet" aria-label={title}>
  <header>
    <span class="title">{title}</span>
    <button class="close" type="button" aria-label="Fermer" on:click={() => emit('close')}>
      <Icon name="plus" size={14} />
    </button>
  </header>
  <div class="body"><slot /></div>
</section>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--bg-1);
    border-bottom: 1px solid var(--line);
    animation: rise 160ms ease-out;
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
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
    flex: 1;
    min-height: 0;
    padding: 10px 12px 14px;
    overflow-y: auto;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
