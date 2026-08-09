<script lang="ts">
  /** Correspondance / Registre / Carnet (docs/07 §4). */
  import { abstinenceSeries, habitSeries } from '../../game-logic/todos/views';
  import { dispatch, game, nowStore } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import Icon from '../Icon.svelte';
  import type { HabitTodo } from '../../data/schema';

  type Tab = 'letters' | 'registry' | 'notebook';
  let tab: Tab = 'letters';
  let openLetter: string | null = null;
  let windowDays: 7 | 30 = 7;
  let repayAmount = 100;

  $: state = $game;
  $: habits = state.todos.filter((t): t is HabitTodo => t.kind === 'habit' && !t.archived);

  function timeLabel(at: number): string {
    const d = new Date(at);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
</script>

<div class="tabs">
  {#each ['letters', 'registry', 'notebook'] as const as t}
    <button class="tab" class:on={tab === t} type="button" on:click={() => (tab = t)}>
      {FR.log.tabs[t]}
      {#if t === 'letters' && state.narrative.letters.some((l) => !l.read)}
        <span class="dot"></span>
      {/if}
    </button>
  {/each}
</div>

{#if tab === 'letters'}
  {#if state.corruption.openingDebt > 0}
    <div class="debt">
      <Icon name="debt" size={13} tone="var(--corrupt-gold)" />
      <span class="tiny">{FR.log.debt} · <span class="mono">{state.corruption.openingDebt} ₭</span></span>
      <input class="amount mono" type="number" min="1" bind:value={repayAmount} />
      <button
        class="btn tiny"
        type="button"
        disabled={state.resources.kess < 1}
        on:click={() => dispatch({ type: 'RepayDebt', amount: repayAmount })}>{FR.log.repay}</button
      >
    </div>
  {/if}

  {#if state.narrative.letters.length === 0}
    <p class="empty">{FR.log.noLetters}</p>
  {:else}
    {#if state.narrative.letters.some((l) => !l.read)}
      <button class="btn tiny mark" type="button" on:click={() => dispatch({ type: 'MarkAllLettersRead' })}>
        {FR.log.markAllRead}
      </button>
    {/if}
    <div class="letters">
      {#each state.narrative.letters.slice(0, 40) as letter (letter.id)}
        <article class="letter" class:unread={!letter.read}>
          <button
            class="letter-head"
            type="button"
            on:click={() => {
              openLetter = openLetter === letter.id ? null : letter.id;
              if (!letter.read) dispatch({ type: 'MarkLetterRead', id: letter.id });
            }}
          >
            {#if !letter.read}<span class="dot"></span>{/if}
            <span class="subject">{letter.title}</span>
            <span class="tiny dim">{letter.day}</span>
          </button>
          {#if openLetter === letter.id}
            <div class="paper">
              <p class="from">{FR.pnj[letter.pnj]}</p>
              <p class="text">{letter.body}</p>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
{:else if tab === 'registry'}
  {#if state.narrative.registry.length === 0}
    <p class="empty">{FR.log.noRegistry}</p>
  {:else}
    <ul class="registry">
      {#each state.narrative.registry.slice(0, 60) as line, i (line.at + '-' + i)}
        <li class={line.tone}>
          <span class="tiny mono dim">{timeLabel(line.at)}</span>
          <span class="tiny">{line.text}</span>
        </li>
      {/each}
    </ul>
  {/if}
{:else}
  <div class="row window">
    {#each [7, 30] as const as d}
      <button class="chip" class:on={windowDays === d} type="button" on:click={() => (windowDays = d)}>
        {d === 7 ? FR.log.last7 : FR.log.last30}
      </button>
    {/each}
  </div>

  {#if habits.length === 0}
    <p class="empty">{FR.log.noNotebook}</p>
  {:else}
    {#each habits as habit (habit.id)}
      {@const series =
        habit.habitKind === 'counter'
          ? habitSeries(habit, windowDays, $nowStore)
          : abstinenceSeries(habit, windowDays, $nowStore)}
      {@const max = Math.max(1, ...series.map((p) => p.count))}
      <div class="trend">
        <div class="row head">
          <Icon name={habit.habitKind === 'abstinence' ? 'abstinence' : 'counter'} size={11} />
          <span class="tiny">{habit.title}</span>
          {#if habit.habitKind === 'abstinence'}
            <span class="tiny mono dim">{habit.streak} j</span>
          {/if}
        </div>
        <div class="spark" role="img" aria-label={`tendance sur ${windowDays} jours`}>
          {#each series as point (point.day)}
            <i
              class:zero={point.count === 0}
              style={`height:${Math.max(2, (point.count / max) * 22)}px`}
              title={`${point.day} : ${point.count}`}
            ></i>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
{/if}

<style>
  .tabs {
    display: flex;
    gap: 3px;
    margin-bottom: 6px;
  }

  .tab {
    flex: 1;
    padding: 3px 0;
    font-size: 11px;
    border-bottom: 2px solid transparent;
    color: var(--text-dim);
    position: relative;
  }

  .tab.on {
    color: var(--text-0);
    border-bottom-color: var(--lab);
  }

  .dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--warn);
    margin-left: 3px;
    vertical-align: middle;
  }

  .letters {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 300px;
    overflow-y: auto;
  }

  .letter-head {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding: 4px 3px;
    text-align: left;
    border-radius: var(--radius-sm);
  }

  .letter-head:hover {
    background: var(--bg-2);
  }

  .subject {
    flex: 1;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .letter.unread .subject {
    font-weight: 600;
  }

  /* la correspondance a sa typographie propre (docs/12 §4) */
  .paper {
    padding: 8px 9px;
    margin: 2px 0 6px;
    background: color-mix(in oklab, var(--text-0) 6%, var(--bg-2));
    border-left: 2px solid var(--line);
    border-radius: var(--radius-sm);
    font-family: var(--font-letter);
  }

  .paper .from {
    font-size: 11px;
    color: var(--text-dim);
    margin-bottom: 5px;
  }

  .paper .text {
    font-size: 12px;
    line-height: 1.55;
    white-space: pre-wrap;
    user-select: text;
  }

  .registry {
    list-style: none;
    max-height: 300px;
    overflow-y: auto;
  }

  .registry li {
    display: flex;
    gap: 6px;
    padding: 2px 0;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 35%, transparent);
  }

  .registry li.good span:last-child {
    color: var(--ok);
  }

  .registry li.bad span:last-child {
    color: var(--danger);
  }

  .trend {
    margin-bottom: 8px;
  }

  .spark {
    display: flex;
    align-items: flex-end;
    gap: 1px;
    height: 24px;
    margin-top: 3px;
  }

  .spark i {
    flex: 1;
    background: var(--broker);
    border-radius: 1px;
    min-width: 2px;
  }

  .spark i.zero {
    background: var(--line);
  }

  .window {
    margin-bottom: 6px;
    gap: 4px;
  }

  .chip {
    padding: 1px 8px;
    font-size: 11px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--bg-2);
    color: var(--text-dim);
  }

  .chip.on {
    color: var(--text-0);
    border-color: var(--broker);
  }

  .debt {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 6px;
    margin-bottom: 6px;
    border: 1px dashed var(--corrupt-gold);
    border-radius: var(--radius-sm);
  }

  .debt .tiny:first-of-type {
    flex: 1;
  }

  .amount {
    width: 62px;
    padding: 2px 4px;
    font-size: 11px;
  }

  .mark {
    margin-bottom: 5px;
    font-size: 11px;
    padding: 2px 7px;
  }

  .btn.tiny {
    font-size: 11px;
    padding: 2px 7px;
  }
</style>
