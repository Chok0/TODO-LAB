<script lang="ts">
  /** Formulaire complet — chemin secondaire, jamais le chemin par défaut. */
  import { createEventDispatcher } from 'svelte';
  import type { TodoDraft } from '../../game-logic/actions';
  import type { Frequency, RecurrenceMode } from '../../data/schema';
  import { FR } from '../../i18n/fr';

  export let draft: TodoDraft;
  export let existingId: string | null = null;

  const emit = createEventDispatcher<{ close: void; save: TodoDraft; delete: string }>();

  let title = draft.title;
  let category = draft.category;
  let difficulty = draft.difficulty;
  let kind = draft.kind;
  let freqKind: 'daily' | 'weekly' | 'monthly' | 'everyNDays' =
    typeof draft.frequency === 'object' ? 'everyNDays' : (draft.frequency ?? 'daily');
  let everyN = typeof draft.frequency === 'object' ? draft.frequency.everyNDays : 3;
  let mode: RecurrenceMode = draft.mode ?? 'fixed';
  let target = draft.target ?? 1;
  let fixedDays = [...(draft.fixedDays ?? [])];
  let habitKind = draft.habitKind ?? 'abstinence';
  let s1 = draft.thresholds?.s1 ?? 1;
  let s2 = draft.thresholds?.s2 ?? 3;
  let hasLoss = draft.loss !== null && draft.loss !== undefined;
  let lossAmount = draft.loss?.amount ?? 5;

  function toggleDay(day: number) {
    fixedDays = fixedDays.includes(day) ? fixedDays.filter((d) => d !== day) : [...fixedDays, day].sort();
  }

  function save() {
    const frequency: Frequency = freqKind === 'everyNDays' ? { everyNDays: Math.max(1, everyN) } : freqKind;
    emit('save', {
      title: title.trim() || 'Sans titre',
      category,
      difficulty,
      kind,
      dueAt: kind === 'oneshot' ? (draft.dueAt ?? null) : null,
      frequency,
      mode,
      target: Math.max(1, target),
      fixedDays,
      habitKind,
      thresholds: habitKind === 'counter' ? { s1: Math.max(0, s1), s2: Math.max(s1, s2) } : null,
      gain: null,
      loss: hasLoss ? { resource: 'energy', amount: Math.max(1, lossAmount) } : null,
    });
  }
</script>

<div class="overlay" role="presentation" on:click|self={() => emit('close')}>
  <div class="sheet" role="dialog" aria-label="Détails de la tâche">
    <input class="title" bind:value={title} placeholder="Intitulé" />

    <div class="grid">
      <label>Catégorie
        <select bind:value={category}>
          <option value="perso">perso</option>
          <option value="pro">pro</option>
        </select>
      </label>

      <label>Difficulté
        <select bind:value={difficulty}>
          {#each FR.todo.difficulty as label, i}
            <option value={i + 1}>{label}</option>
          {/each}
        </select>
      </label>

      <label>Type
        <select bind:value={kind}>
          <option value="oneshot">ponctuelle</option>
          <option value="recurring">récurrente</option>
          <option value="habit">habitude</option>
        </select>
      </label>
    </div>

    {#if kind === 'recurring'}
      <div class="grid">
        <label>Fréquence
          <select bind:value={freqKind}>
            <option value="daily">quotidienne</option>
            <option value="weekly">hebdomadaire</option>
            <option value="monthly">mensuelle</option>
            <option value="everyNDays">tous les N jours</option>
          </select>
        </label>

        {#if freqKind === 'everyNDays'}
          <label>N jours <input type="number" min="1" bind:value={everyN} /></label>
        {:else}
          <label>Mode
            <select bind:value={mode}>
              <option value="fixed">jours fixes</option>
              <option value="flexible">souple</option>
              <option value="multiDaily">plusieurs fois par jour</option>
            </select>
          </label>
        {/if}

        {#if mode !== 'fixed'}
          <label>Occurrences <input type="number" min="1" bind:value={target} /></label>
        {/if}
      </div>

      {#if mode === 'fixed' && freqKind === 'weekly'}
        <div class="days">
          {#each FR.todo.weekdays as label, i}
            <button
              type="button"
              class="day"
              class:on={fixedDays.includes(i + 1)}
              on:click={() => toggleDay(i + 1)}>{label}</button
            >
          {/each}
        </div>
      {/if}

      {#if mode === 'fixed' && freqKind === 'monthly'}
        <label class="inline">Jour du mois <input type="number" min="1" max="31" bind:value={fixedDays[0]} /></label>
      {/if}
    {/if}

    {#if kind === 'habit'}
      <div class="grid">
        <label>Sous-type
          <select bind:value={habitKind}>
            <option value="abstinence">abstinence (binaire)</option>
            <option value="counter">compteur</option>
          </select>
        </label>
      </div>
      {#if habitKind === 'counter'}
        <p class="tiny dim">{FR.todo.thresholds} — vos seuils, aucun barème imposé.</p>
        <div class="grid">
          <label>Neutre jusqu'à <input type="number" min="0" bind:value={s1} /></label>
          <label>Léger jusqu'à <input type="number" min={s1} bind:value={s2} /></label>
        </div>
      {/if}
    {/if}

    <label class="check">
      <input type="checkbox" bind:checked={hasLoss} />
      {FR.todo.loss}
      {#if hasLoss}<input class="small" type="number" min="1" bind:value={lossAmount} /> EN{/if}
    </label>

    <div class="actions">
      {#if existingId}
        <button class="btn danger" type="button" on:click={() => emit('delete', existingId)}
          >{FR.quickAdd.delete}</button
        >
      {/if}
      <span class="spacer"></span>
      <button class="btn" type="button" on:click={() => emit('close')}>{FR.quickAdd.cancel}</button>
      <button class="btn primary" type="button" on:click={save}>{FR.quickAdd.save}</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40;
    padding: 12px;
  }

  .sheet {
    width: 100%;
    max-width: 340px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11px;
    color: var(--text-dim);
  }

  label.inline,
  label.check {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .small {
    width: 58px;
  }

  .days {
    display: flex;
    gap: 3px;
  }

  .day {
    flex: 1;
    padding: 4px 0;
    font-size: 11px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--bg-2);
  }

  .day.on {
    background: color-mix(in oklab, var(--lab) 30%, var(--bg-2));
    border-color: var(--lab);
    color: var(--text-0);
  }

  .actions {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 2px;
  }

  .spacer {
    flex: 1;
  }
</style>
