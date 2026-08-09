<script lang="ts">
  /** Saisie rapide : le chemin par défaut d'ajout d'une todo (docs/11 §4). */
  import { parseInput, PLACEHOLDER_EXAMPLES, type ParsedInput } from '../../game-logic/todos/parser';
  import { dispatch, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';
  import TodoEditor from './TodoEditor.svelte';

  export let onAdded: (kind: 'oneshot' | 'recurring' | 'habit') => void = () => {};

  let text = '';
  let editing: ParsedInput | null = null;
  let input: HTMLInputElement;

  // exemple tournant, sans horloge propre : dérivé du tick global
  $: placeholderIndex = Math.floor($nowStore / 6000) % PLACEHOLDER_EXAMPLES.length;
  $: parsed = text.trim() ? parseInput(text, $nowStore) : null;

  function submit() {
    if (!parsed) return;
    const { chips, ...draft } = parsed;
    void chips;
    dispatch({ type: 'AddTodo', draft });
    onAdded(draft.kind);
    text = '';
  }

  function openDetails() {
    editing = parsed ?? parseInput(text || 'Nouvelle tâche', $nowStore);
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') submit();
    if (event.key === 'Escape') text = '';
  }

  export function focus() {
    input?.focus();
  }
</script>

<div class="quick-add">
  <div class="field">
    <Icon name="plus" size={14} />
    <input
      bind:this={input}
      bind:value={text}
      on:keydown={onKey}
      placeholder={FR.quickAdd.placeholder}
      aria-label={FR.quickAdd.placeholder}
      spellcheck="false"
    />
    {#if text}
      <button class="mini" type="button" on:click={submit} title={FR.quickAdd.add}>
        <Icon name="check" size={14} />
      </button>
    {/if}
  </div>

  {#if parsed}
    <div class="chips">
      {#each parsed.chips as chip (chip.field + chip.label)}
        <button
          class="chip"
          class:soft={chip.confidence < 0.6}
          type="button"
          on:click={openDetails}
          title="Corriger"
        >
          {chip.label}
        </button>
      {/each}
      <button class="chip ghost" type="button" on:click={openDetails}>{FR.quickAdd.details}</button>
    </div>
  {:else}
    <p class="hint tiny dim">« {PLACEHOLDER_EXAMPLES[placeholderIndex]} »</p>
  {/if}
</div>

{#if editing}
  <TodoEditor
    draft={editing}
    on:close={() => (editing = null)}
    on:save={(e) => {
      dispatch({ type: 'AddTodo', draft: e.detail });
      onAdded(e.detail.kind);
      editing = null;
      text = '';
    }}
  />
{/if}

<style>
  .quick-add {
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--line);
  }

  .field {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    background: var(--bg-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--text-dim);
  }

  .field:focus-within {
    border-color: color-mix(in oklab, var(--lab) 55%, var(--line));
  }

  input {
    flex: 1;
    background: none;
    border: none;
    padding: 7px 0;
    color: var(--text-0);
  }

  input:focus {
    outline: none;
  }

  .mini {
    display: flex;
    color: var(--ok);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .chip {
    padding: 1px 7px;
    font-size: 11px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg-2);
    color: var(--text-0);
  }

  .chip:hover {
    border-color: var(--lab);
  }

  /* confiance basse → style « suggestion » (docs/03 §4.3) */
  .chip.soft {
    border-style: dashed;
    color: var(--text-dim);
  }

  .chip.ghost {
    border-color: transparent;
    color: var(--text-dim);
  }

  .hint {
    margin-top: 5px;
    font-style: italic;
  }
</style>
