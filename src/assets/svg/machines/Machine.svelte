<script lang="ts">
  /**
   * Machines en SVG généré (docs/12 §6). Trois calques :
   *   1. châssis commun en acier — l'établi et l'étau de l'atelier du facteur
   *      d'instruments sont restés au mur (docs/07 §1) ;
   *   2. module actif propre au template ;
   *   3. accents Mk — la montée en niveau AJOUTE des calques, ne redessine pas.
   */
  import type { MachineTemplateId } from '../../../data/schema';

  export let template: MachineTemplateId;
  export let mk: 1 | 2 = 1;
  export let state: 'idle' | 'running' | 'blocked' = 'idle';
  export let branch: 'legal' | 'illegal' = 'legal';
  export let size = 56;

  $: accent = branch === 'illegal' ? 'var(--corrupt-gold)' : 'var(--lab)';
  $: lamp = state === 'running' ? 'var(--ok)' : state === 'blocked' ? 'var(--warn)' : 'var(--lab-steel)';
</script>

<svg
  class="machine {state}"
  width={size}
  height={size}
  viewBox="0 0 64 64"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- calque 1 — châssis commun : établi + étau hérités de l'atelier -->
  <g stroke="var(--lab-steel)" stroke-width="2">
    <path d="M6 52h52" />
    <path d="M11 52v-5h42v5" />
    <path d="M8 47h6v5H8z" fill="var(--bg-2)" />
  </g>

  {#if template === 'extractor'}
    <!-- module : trémie + cuve de raffinage -->
    <g stroke={accent} stroke-width="2">
      <path d="M20 14h24l-6 10H26z" />
      <rect x="22" y="24" width="20" height="23" rx="3" fill="var(--bg-1)" />
      <path d="M27 33h10" />
    </g>
    <g class="spin" style="transform-origin:47px 31px">
      <circle cx="47" cy="31" r="5" stroke="var(--lab-steel)" stroke-width="2" />
      <path d="M47 26v-3M47 36v3M42 31h-3M52 31h3" stroke="var(--lab-steel)" stroke-width="2" />
    </g>
  {:else if template === 'still'}
    <!-- module : colonne de distillation + serpentin -->
    <g stroke={accent} stroke-width="2">
      <rect x="24" y="10" width="16" height="37" rx="4" fill="var(--bg-1)" />
      <path d="M24 20h16M24 29h16M24 38h16" />
    </g>
    <path
      class="coil"
      d="M40 16c6 0 6 5 0 5s-6 5 0 5 6 5 0 5"
      stroke="var(--lab-steel)"
      stroke-width="2"
    />
    <path d="M14 47V26h8" stroke="var(--lab-steel)" stroke-width="2" />
  {:else}
    <!-- module : cuve de synthèse + tubulures -->
    <g stroke={accent} stroke-width="2">
      <path d="M32 12a15 15 0 0 1 0 30 15 15 0 0 1 0-30z" fill="var(--bg-1)" />
      <path d="M23 32c4-4 5 4 9 0s5 4 9 0" class="bubbles" />
    </g>
    <g stroke="var(--lab-steel)" stroke-width="2">
      <path d="M17 22v18M47 22v18" />
      <path d="M17 42h6M41 42h6" />
    </g>
  {/if}

  <!-- calque 3 — accents Mk2 : tuyauterie cuivre ajoutée, rien de redessiné -->
  {#if mk >= 2}
    <g stroke="var(--corrupt-gold)" stroke-width="1.8" opacity="0.9">
      <path d="M52 47V34h-6" />
      <path d="M12 34h6" />
      <circle cx="52" cy="31" r="2.2" />
    </g>
  {/if}

  <!-- voyant d'état -->
  <circle class="lamp" cx="53" cy="52" r="3" fill={lamp} />
</svg>

<style>
  .machine {
    display: block;
  }

  .spin {
    animation: spin 3.4s linear infinite;
    animation-play-state: paused;
  }

  .machine.running .spin {
    animation-play-state: running;
  }

  .coil,
  .bubbles {
    opacity: 0.55;
  }

  .machine.running .bubbles {
    animation: bob 2.2s ease-in-out infinite;
  }

  .machine.blocked .lamp {
    animation: blink 1.6s steps(1, end) infinite;
  }

  .machine.idle {
    opacity: 0.82;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }
  }

  @keyframes blink {
    0%,
    60% {
      opacity: 1;
    }
    61%,
    100% {
      opacity: 0.25;
    }
  }

  /* les animations s'arrêtent quand la fenêtre n'est pas visible (docs/09 §8) */
  :global(body.hidden-window) .machine * {
    animation-play-state: paused !important;
  }
</style>
