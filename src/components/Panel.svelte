<script lang="ts">
  /**
   * Panneau repliable réutilisable — fondation de tout le layout (docs/11 §3).
   * Le contenu replié est démonté du DOM ; l'état logique vit dans les stores.
   */
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';

  export let title: string;
  export let collapsed = true;
  /** Nombre ou pastille affichés même replié — canal d'info du mode discret. */
  export let badge: number | string | null = null;
  export let badgeTone: 'neutral' | 'warn' | 'danger' = 'neutral';
  export let accent: string | null = null;
  export let dense = false;

  const emit = createEventDispatcher<{ toggle: void }>();
</script>

<section class="panel" class:collapsed class:dense style={accent ? `--accent:${accent}` : ''}>
  <button
    class="header"
    type="button"
    aria-expanded={!collapsed}
    on:click={() => emit('toggle')}
  >
    <span class="chevron" class:open={!collapsed}><Icon name="chevron" size={14} /></span>
    <span class="title">{title}</span>
    <slot name="header" />
    {#if badge !== null && badge !== '' && badge !== 0}
      <span class="badge" class:warn={badgeTone === 'warn'} class:danger={badgeTone === 'danger'}>{badge}</span>
    {/if}
  </button>

  {#if !collapsed}
    <div class="body">
      <slot />
    </div>
  {/if}
</section>

<style>
  .panel {
    --accent: var(--line);
    border-top: 1px solid var(--line);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 7px 10px;
    text-align: left;
    color: var(--text-0);
  }

  .header:hover {
    background: color-mix(in oklab, var(--accent) 10%, transparent);
  }

  .chevron {
    display: flex;
    color: var(--text-dim);
    transform: rotate(-90deg);
    transition: transform 150ms ease;
  }

  .chevron.open {
    transform: rotate(0deg);
  }

  .title {
    flex: 1;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.02em;
  }

  .badge {
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: color-mix(in oklab, var(--accent) 35%, var(--bg-2));
    color: var(--text-0);
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: center;
    line-height: 16px;
  }

  .badge.warn {
    background: color-mix(in oklab, var(--warn) 45%, var(--bg-2));
    color: var(--bg-0);
  }

  .badge.danger {
    background: var(--danger);
  }

  .body {
    padding: 2px 10px 10px;
    animation: unfold 150ms ease-out;
  }

  .dense .body {
    padding: 0 6px 6px;
  }

  @keyframes unfold {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
