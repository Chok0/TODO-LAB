<script lang="ts">
  /**
   * Machines en SVG généré (docs/12 §6). Trois calques :
   *   1. châssis commun en acier ;
   *   2. module actif propre au template ;
   *   3. accents Mk — la montée en niveau AJOUTE des calques, ne redessine pas.
   *
   * Un quatrième calque de détail (boulons, manomètre, tubulures) n'apparaît
   * qu'au-delà de `DETAIL_FROM` : à 24 px il encrasserait le dessin, à 90 px
   * son absence le rendrait vide.
   */
  import type { MachineTemplateId } from '../../../data/schema';

  export let template: MachineTemplateId;
  export let mk: 1 | 2 = 1;
  export let state: 'idle' | 'running' | 'blocked' = 'idle';
  export let branch: 'legal' | 'illegal' = 'legal';
  export let size = 56;
  /** Sur l'établi, la machine est posée : pas de pieds dessinés. */
  export let standing = false;

  const DETAIL_FROM = 72;

  $: accent = branch === 'illegal' ? 'var(--corrupt-gold)' : 'var(--lab)';
  $: lamp = state === 'running' ? 'var(--ok)' : state === 'blocked' ? 'var(--warn)' : 'var(--lab-steel)';
  $: detailed = size >= DETAIL_FROM;
</script>

<svg
  class="machine {state}"
  width={size}
  height={standing ? Math.round((size * 54) / 64) : size}
  viewBox={standing ? '0 0 64 54' : '0 0 64 64'}
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- socle : uniquement hors établi -->
  {#if !standing}
    <g stroke="var(--lab-steel)" stroke-width="2">
      <path d="M6 52h52" />
      <path d="M11 52v-5h42v5" />
      <path d="M8 47h6v5H8z" fill="var(--bg-2)" />
    </g>
  {:else}
    <path d="M12 52h40" stroke="var(--lab-steel)" stroke-width="2.5" />
  {/if}

  {#if template === 'extractor'}
    <g stroke={accent} stroke-width="2">
      <path d="M20 14h24l-6 10H26z" />
      <rect x="22" y="24" width="20" height="23" rx="3" fill="var(--bg-1)" />
      <path d="M27 33h10" />
    </g>
    <g class="spin" style="transform-origin:47px 31px">
      <circle cx="47" cy="31" r="5" stroke="var(--lab-steel)" stroke-width="2" />
      <path d="M47 26v-3M47 36v3M42 31h-3M52 31h3" stroke="var(--lab-steel)" stroke-width="2" />
    </g>
    {#if detailed}
      <g stroke="var(--lab-steel)" stroke-width="1.2" opacity="0.75">
        <path d="M24 28h16M24 43h16" />
        <circle cx="26" cy="20" r="0.9" fill="var(--lab-steel)" />
        <circle cx="38" cy="20" r="0.9" fill="var(--lab-steel)" />
      </g>
      <!-- niveau de cuve : se remplit pendant le cycle -->
      <rect class="fill" x="25" y="27" width="14" height="17" rx="1.5" fill={accent} opacity="0.16" />
    {/if}
  {:else if template === 'still'}
    <g stroke={accent} stroke-width="2">
      <rect x="24" y="10" width="16" height="37" rx="4" fill="var(--bg-1)" />
      <path d="M24 20h16M24 29h16M24 38h16" />
    </g>
    <path class="coil" d="M40 16c6 0 6 5 0 5s-6 5 0 5 6 5 0 5" stroke="var(--lab-steel)" stroke-width="2" />
    <path d="M14 47V26h8" stroke="var(--lab-steel)" stroke-width="2" />
    {#if detailed}
      <g stroke="var(--lab-steel)" stroke-width="1.2" opacity="0.75">
        <circle cx="14" cy="22" r="3.4" />
        <path d="M14 22l2-1.8" />
      </g>
      <rect class="fill" x="26" y="12" width="12" height="33" rx="3" fill={accent} opacity="0.14" />
    {/if}
  {:else}
    <g stroke={accent} stroke-width="2">
      <path d="M32 12a15 15 0 0 1 0 30 15 15 0 0 1 0-30z" fill="var(--bg-1)" />
      <path d="M23 32c4-4 5 4 9 0s5 4 9 0" class="bubbles" />
    </g>
    <g stroke="var(--lab-steel)" stroke-width="2">
      <path d="M17 22v18M47 22v18" />
      <path d="M17 42h6M41 42h6" />
    </g>
    {#if detailed}
      <g stroke="var(--lab-steel)" stroke-width="1.2" opacity="0.75">
        <circle cx="47" cy="18" r="3.4" />
        <path d="M47 18l1.8-2" />
        <path d="M17 18h4" />
      </g>
      <circle class="fill" cx="32" cy="27" r="13" fill={accent} opacity="0.13" />
    {/if}
  {/if}

  {#if mk >= 2}
    <g stroke="var(--corrupt-gold)" stroke-width="1.8" opacity="0.9">
      <path d="M52 47V34h-6" />
      <path d="M12 34h6" />
      <circle cx="52" cy="31" r="2.2" />
    </g>
  {/if}

  <circle class="lamp" cx="53" cy="52" r="3" fill={lamp} />
  {#if state === 'running'}
    <circle class="halo" cx="53" cy="52" r="3" fill="none" stroke="var(--ok)" stroke-width="1.5" />
  {/if}
</svg>

<style>
  .machine {
    display: block;
    overflow: visible;
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

  .fill {
    transform-origin: center bottom;
  }

  .machine.running .fill {
    animation: breathe 2.6s ease-in-out infinite;
  }

  .machine.running .bubbles {
    animation: bob 2.2s ease-in-out infinite;
  }

  .machine.running .halo {
    animation: halo 2s ease-out infinite;
  }

  .machine.blocked .lamp {
    animation: blink 1.6s steps(1, end) infinite;
  }

  .machine.idle {
    opacity: 0.85;
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

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.1;
    }
    50% {
      opacity: 0.3;
    }
  }

  @keyframes halo {
    0% {
      opacity: 0.8;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(2.4);
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

  :global(body.hidden-window) .machine * {
    animation-play-state: paused !important;
  }
</style>
