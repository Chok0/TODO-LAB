<script lang="ts">
  /** Le mur : le courrier épinglé et la dette qu'on n'oublie pas. */
  import { createEventDispatcher } from 'svelte';
  import Icon from '../Icon.svelte';
  import { dispatch, game, unread } from '../../stores/game';
  import { FR } from '../../i18n/fr';

  const emit = createEventDispatcher<{ open: 'log' }>();

  $: state = $game;
  $: letters = state.narrative.letters.slice(0, 3);
  $: debt = state.corruption.openingDebt;
</script>

<section class="station">
  <h2 class="label">Courrier</h2>

  <div class="board">
    {#if letters.length === 0}
      <p class="tiny dim">Rien au mur.</p>
    {:else}
      {#each letters as letter, i (letter.id)}
        <button
          class="note"
          class:unread={!letter.read}
          style={`--tilt:${(i % 2 ? 1 : -1) * (1 + i * 0.6)}deg`}
          type="button"
          on:click={() => emit('open', 'log')}
          title={letter.title}
        >
          <span class="pin"></span>
          <span class="from tiny">{FR.pnj[letter.pnj]}</span>
          <span class="subject">{letter.title}</span>
        </button>
      {/each}
    {/if}
  </div>

  <div class="foot">
    <button class="chip" type="button" on:click={() => emit('open', 'log')}>
      <Icon name="envelope" size={11} />
      {FR.panels.log}
      {#if $unread}<span class="pip">{$unread}</span>{/if}
    </button>

    {#if debt > 0}
      <button
        class="chip debt"
        type="button"
        disabled={state.resources.kess < 1}
        title={FR.log.debt}
        on:click={() => dispatch({ type: 'RepayDebt', amount: Math.min(100, state.resources.kess) })}
      >
        <Icon name="debt" size={11} />
        <span class="mono">{debt} ₭</span>
      </button>
    {/if}
  </div>
</section>

<style>
  .station {
    position: relative;
    display: grid;
    grid-template-rows: var(--scene-h) auto;
    flex: 0 0 auto;
    width: 236px;
    padding: 0 14px 8px;
  }

  .label {
    position: absolute;
    top: 8px;
    left: 14px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .board {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 5px;
    padding-top: 26px;
    overflow: hidden;
  }

  /* fiches punaisées, légèrement de travers */
  .note {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    padding: 4px 8px 5px 16px;
    text-align: left;
    background: color-mix(in oklab, var(--text-0) 8%, var(--bg-1));
    border-radius: 2px;
    box-shadow: 1px 2px 4px rgb(0 0 0 / 0.4);
    transform: rotate(var(--tilt));
    transition: transform 140ms ease;
  }

  .note:hover {
    transform: rotate(0deg) translateY(-1px);
  }

  .pin {
    position: absolute;
    left: 6px;
    top: 7px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--corrupt);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
  }

  .note.unread .pin {
    background: var(--warn);
  }

  .from {
    color: var(--text-dim);
    font-family: var(--font-letter);
  }

  .subject {
    font-family: var(--font-letter);
    font-size: 11.5px;
    color: var(--text-0);
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note.unread .subject {
    font-weight: 600;
  }

  .foot {
    align-self: start;
    display: flex;
    gap: 5px;
    margin-top: 7px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 10.5px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: color-mix(in oklab, var(--bg-1) 80%, transparent);
    color: var(--text-dim);
  }

  .chip:hover:not(:disabled) {
    border-color: var(--broker);
    color: var(--text-0);
  }

  .chip.debt {
    border-color: color-mix(in oklab, var(--corrupt-gold) 60%, var(--line));
    color: var(--corrupt-gold);
  }

  .pip {
    min-width: 14px;
    padding: 0 3px;
    border-radius: 7px;
    background: var(--warn);
    color: var(--bg-0);
    font-family: var(--font-mono);
    font-size: 9px;
    text-align: center;
  }
</style>
