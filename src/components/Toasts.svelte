<script lang="ts">
  import { toasts, undo, undoLabel } from '../stores/game';
  import { FR } from '../i18n/fr';
</script>

<div class="stack" aria-live="polite">
  {#if $undoLabel}
    <div class="toast undo">
      <span class="tiny">{$undoLabel}</span>
      <button class="link tiny" type="button" on:click={undo}>{FR.todo.undo}</button>
    </div>
  {/if}
  {#each $toasts as toast (toast.id)}
    <div class="toast {toast.tone}">{toast.text}</div>
  {/each}
</div>

<style>
  .stack {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    pointer-events: none;
    z-index: 30;
  }

  .toast {
    align-self: flex-start;
    max-width: 100%;
    padding: 3px 9px;
    font-size: 11.5px;
    border-radius: 12px;
    background: var(--bg-2);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    animation: rise 250ms ease-out;
  }

  .toast.good {
    color: var(--ok);
    border-color: color-mix(in oklab, var(--ok) 45%, var(--line));
  }

  .toast.bad {
    color: var(--danger);
    border-color: color-mix(in oklab, var(--danger) 45%, var(--line));
  }

  .toast.undo {
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
    align-self: stretch;
  }

  .link {
    color: var(--lab);
    text-decoration: underline;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
