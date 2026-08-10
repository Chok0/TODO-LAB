<script lang="ts" context="module">
  /**
   * Grille 24×24, stroke 2, bouts arrondis, style outline (docs/12 §5).
   * Les remplissages sont réservés aux accents d'état.
   */
  export type IconName =
    // set UI (12)
    | 'check' | 'plus' | 'chevron' | 'pin' | 'gear' | 'lock'
    | 'cart' | 'kess' | 'clean' | 'dirty' | 'envelope' | 'alert'
    // set récurrence (5)
    | 'oneshot' | 'fixed' | 'flexible' | 'abstinence' | 'counter'
    // set ressources (8)
    | 'harvest' | 'flask' | 'crate' | 'reputation' | 'key' | 'debt' | 'pollution' | 'streak';

  const PATHS: Record<IconName, string> = {
    check: 'M4 12.5 L9.5 18 L20 6.5',
    plus: 'M12 5v14 M5 12h14',
    chevron: 'M7 10l5 5 5-5',
    pin: 'M12 3v5 M8.5 8h7l1 5h-9z M12 13v8',
    gear: 'M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.2 5.2l2.1 2.1 M16.7 16.7l2.1 2.1 M18.8 5.2l-2.1 2.1 M7.3 16.7l-2.1 2.1',
    lock: 'M5.5 11h13v9.5h-13z M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
    cart: 'M3 4.5h2.6l2.2 10.5h9.4l2.3-7.8H6.4 M9.5 19.5v.01 M16.5 19.5v.01',
    kess: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M9 10.5h6 M9 13.5h6 M12 8v8',
    clean: 'M12 3.5c0 0 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 6-10.5 6-10.5z',
    dirty: 'M5 15.5c2-2 4 0 6-2s4 0 6.5-2 M5 19.5c2-2 4 0 6-2s4 0 6.5-2 M8 10c1-2 2.5-1.5 3.5-3.5',
    envelope: 'M3 6h18v12H3z M3 7l9 6.5L21 7',
    alert: 'M12 3.5 21.5 20.5H2.5z M12 10v4.5 M12 17.5v.01',
    oneshot: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    fixed: 'M4 6h16v15H4z M4 10.5h16 M8.5 3v4 M15.5 3v4',
    flexible: 'M3 14c3-6 6 6 9 0s6-6 9 0',
    abstinence: 'M12 3l7.5 3v5.5c0 5.5-3.2 8.5-7.5 10.5-4.3-2-7.5-5-7.5-10.5V6z',
    counter: 'M6 20.5V11 M12 20.5V4.5 M18 20.5V14.5',
    harvest: 'M12 21V9.5 M12 12.5c-3.2 0-5.5-2.3-5.5-5.5 3.2 0 5.5 2.3 5.5 5.5z M12 12.5c3.2 0 5.5-2.3 5.5-5.5-3.2 0-5.5 2.3-5.5 5.5z',
    flask: 'M9.5 3h5 M10.5 3v6.5L5.8 18a2 2 0 0 0 1.7 3h9a2 2 0 0 0 1.7-3L13.5 9.5V3 M8 15h8',
    crate: 'M3.5 6.5h17v14h-17z M3.5 11h17 M9.5 11v9.5',
    reputation: 'M3 12.5l4-3.5 4 3.5 4-3.5 4 3.5 M7.5 15.5l4.5 3.5 4.5-3.5',
    key: 'M8 12.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M10.6 13.9 20 4.5l1.8 1.8-1.8 1.8 1.8 1.8-2.8 2.8-1.8-1.8',
    debt: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 4.5v5l-2.5 2.5L12 14.5v5',
    pollution: 'M7.5 18.5a4 4 0 0 1 .3-8 5.2 5.2 0 0 1 9.9 1.3 3.4 3.4 0 0 1-.7 6.7z',
    streak: 'M12 21.5c4 0 6.5-2.8 6.5-6.2 0-4.3-4.2-5.2-4.2-9.3-3.1 2-4.3 4.2-4.3 6.3-1-.9-1.2-2-1.2-3.2-2.1 2-3.3 4.3-3.3 6.2 0 3.4 2.5 6.2 6.5 6.2z',
  };
</script>

<script lang="ts">
  export let name: IconName;
  export let size = 16;
  /** Couleur explicite ; par défaut l'icône hérite de la couleur du texte. */
  export let tone: string | null = null;
  export let title: string | null = null;
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={tone ?? 'currentColor'}
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
>
  {#if title}<title>{title}</title>{/if}
  <path d={PATHS[name]} />
</svg>

<style>
  .icon {
    flex: 0 0 auto;
    display: block;
  }
</style>
