import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NgxsmkTelInputComponent } from 'ngxsmk-tel-input';
import { catchError, forkJoin, map, of } from 'rxjs';

import { environment } from '@env/environment';
import { RifasApi } from '../../core/api/rifas-api';
import { getAllRaffles } from '../../core/api/raffle-pagination';
import { Category, PrizeNumber, Winner } from '../../core/models/models';
import { formatWhen } from '../../core/utils/format';
import { MoneyFormatPipe } from '../../shared/pipes/money-format.pipe';
import { TurnstileWidgetComponent } from '../../shared/turnstile-widget.component';
import { PurchaseFlow } from './purchase-flow';
import { RaffleCardVm, toRaffleCard } from './raffle-card.vm';

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4'%3E%3Crect width='4' height='4' fill='%23141417'/%3E%3Cpath d='M1 1.4h2v1.2H1z' fill='none' stroke='%23c8260c' stroke-width='.1'/%3E%3C/svg%3E";

interface CategoryFilter {
  id: 'todos' | number;
  label: string;
}

interface ImagePreview {
  src: string;
  alt: string;
  title: string;
}

interface DescriptionModal {
  title: string;
  body: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MoneyFormatPipe, FormsModule, NgxsmkTelInputComponent, TurnstileWidgetComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css', './modal.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly api = inject(RifasApi);
  private readonly sanitizer = inject(DomSanitizer);

  /** Cards switch to a countdown during the last 24 hours before the draw. */
  static readonly DRAW_COUNTDOWN_MAX_MS = 24 * 60 * 60 * 1000;
  private static readonly DESC_PREVIEW_MAX = 50;
  private static readonly DESC_TWO_PARA_MAX = 500;

  readonly year = new Date().getFullYear();
  readonly instagramUrl = environment.instagramUrl;
  readonly supportWhatsAppUrl = `https://wa.me/${environment.supportWhatsAppE164}`;

  // accordions
  howToPlayOpen = false;

  // catalog
  categoryFilters: CategoryFilter[] = [{ id: 'todos', label: 'TODOS' }];
  selectedCatalogCategory: 'todos' | number = 'todos';
  raffles: RaffleCardVm[] = [];
  raffleCardPrizes: Record<string, PrizeNumber[]> = {};
  catalogLoading = true;
  rafflesLoading = false;
  rafflesError: string | null = null;
  readonly skeletonChipSlots = [0, 1, 2, 3, 4, 5, 6];
  readonly skeletonCardSlots = [0, 1, 2, 3, 4, 5];
  readonly skeletonWinnerSlots = [0, 1, 2, 3, 4];

  // winners
  recentWinners: Winner[] = [];
  winnersLoading = false;
  winnersError = false;
  private winnersFetchScheduled = false;

  // overlays
  imagePreview: ImagePreview | null = null;
  descriptionModal: DescriptionModal | null = null;
  whatsappHelpModalOpen = false;

  @ViewChild('modalSheet') private modalSheet?: ElementRef<HTMLElement>;
  @ViewChild('receiptInput') private receiptInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('turnstile') private turnstile?: TurnstileWidgetComponent;
  @ViewChild('purchaseForm') private purchaseFormRef?: NgForm;

  /** The "JUGAR" checkout: state and rules live in PurchaseFlow, the template binds to it. */
  protected readonly purchase = new PurchaseFlow({
    api: this.api,
    sanitizer: this.sanitizer,
    isDrawFinished: raffle => this.isDrawFinished(raffle),
    sheet: () => this.modalSheet?.nativeElement,
    receiptInput: () => this.receiptInputRef?.nativeElement,
    resetTurnstile: () => this.turnstile?.reset(),
    onVisibilityChange: open => {
      document.body.style.overflow = open ? 'hidden' : '';
    },
  });

  get modalOpen(): boolean {
    return this.purchase.open;
  }

  private countdownTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loadCategories();
    // Zone.js re-renders on every tick, which keeps the countdowns live.
    this.countdownTimer = setInterval(() => undefined, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== undefined) clearInterval(this.countdownTimer);
    this.purchase.destroy();
    document.body.style.overflow = '';
  }

  // ---- draw timing ----------------------------------------------------------

  private drawRemainingMs(r: RaffleCardVm): number | null {
    if (!r.drawAtIso) return null;
    const t = new Date(r.drawAtIso).getTime();
    return Number.isNaN(t) ? null : Math.max(0, t - Date.now());
  }

  isDrawFinished(r: RaffleCardVm): boolean {
    if (!r.drawAtIso || r.timelineKind !== 'sorteo') return false;
    const left = this.drawRemainingMs(r);
    return left !== null && left <= 0;
  }

  showDrawCountdown(r: RaffleCardVm): boolean {
    if (r.soldOut || this.isDrawFinished(r)) return false;
    const left = this.drawRemainingMs(r);
    return left != null && left > 0 && left <= HomeComponent.DRAW_COUNTDOWN_MAX_MS;
  }

  cannotPlayRaffle(r: RaffleCardVm): boolean {
    return r.soldOut || this.isDrawFinished(r);
  }

  countdownBannerTitle(r: RaffleCardVm): string {
    return r.timelineKind === 'cierre' ? 'CIERRE DE VENTAS EN' : 'EL SORTEO COMIENZA EN';
  }

  countdownHint(r: RaffleCardVm): string {
    return r.timelineKind === 'cierre'
      ? 'Últimas 24 horas antes del cierre · No te quedes fuera'
      : 'Últimas 24 horas · No te quedes fuera';
  }

  countdownParts(r: RaffleCardVm): { h: string; m: string; s: string } {
    const total = Math.floor((this.drawRemainingMs(r) ?? 0) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { h: pad(Math.floor(total / 3600)), m: pad(Math.floor((total % 3600) / 60)), s: pad(total % 60) };
  }

  // ---- catalog --------------------------------------------------------------

  get filteredRaffles(): RaffleCardVm[] {
    return this.raffles;
  }

  get showFilterSkeleton(): boolean {
    return this.catalogLoading;
  }

  get showRaffleSkeleton(): boolean {
    return !this.rafflesError && (this.catalogLoading || this.rafflesLoading);
  }

  get emptyCategoryLabel(): string {
    if (this.selectedCatalogCategory === 'todos') return 'el catálogo en este momento';
    return this.categoryFilters.find(f => f.id === this.selectedCatalogCategory)?.label ?? 'esta categoría';
  }

  private loadCategories(): void {
    this.catalogLoading = true;
    this.api.getCategories().subscribe({
      next: (list: Category[]) => {
        const sorted = [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        this.categoryFilters = [
          { id: 'todos', label: 'TODOS' },
          ...sorted.map(c => ({ id: c.id, label: c.name.toLocaleUpperCase('es-DO') })),
        ];
        this.catalogLoading = false;
        this.loadRaffles();
      },
      error: () => {
        this.catalogLoading = false;
        this.loadRaffles();
      },
    });
  }

  private loadRaffles(): void {
    this.rafflesLoading = true;
    this.rafflesError = null;
    this.raffleCardPrizes = {};
    const categoryId = this.selectedCatalogCategory === 'todos' ? undefined : this.selectedCatalogCategory;
    getAllRaffles(this.api, { categoryId, perPage: 50 }).subscribe({
      next: raffles => {
        const cards = raffles.map(r => toRaffleCard(r));
        this.raffles = cards;
        this.loadPrizeBoards(cards);
        this.rafflesLoading = false;
        this.scheduleRecentWinners();
      },
      error: () => {
        this.raffles = [];
        this.rafflesError = 'No se pudieron cargar las rifas.';
        this.rafflesLoading = false;
        this.scheduleRecentWinners();
      },
    });
  }

  private loadPrizeBoards(cards: RaffleCardVm[]): void {
    if (cards.length === 0) return;
    forkJoin(
      cards.map(c =>
        this.api.getPrizeNumbers(Number(c.id)).pipe(
          map(numbers => ({ id: c.id, numbers })),
          catchError(() => of({ id: c.id, numbers: [] as PrizeNumber[] })),
        ),
      ),
    ).subscribe(rows => {
      const boards: Record<string, PrizeNumber[]> = {};
      for (const row of rows) if (row.numbers.length > 0) boards[row.id] = row.numbers;
      this.raffleCardPrizes = boards;
    });
  }

  selectCatalogCategory(id: 'todos' | number): void {
    this.selectedCatalogCategory = id;
    this.loadRaffles();
  }

  raffleCardPrizeNumbers(r: RaffleCardVm): PrizeNumber[] {
    return this.raffleCardPrizes[r.id] ?? [];
  }

  raffleCardHasPrizes(r: RaffleCardVm): boolean {
    return this.raffleCardPrizeNumbers(r).length > 0;
  }

  premiadoPrizeLabel(p: PrizeNumber): string {
    const label = String(p.prize_label ?? '').trim();
    if (label !== '') return label;
    const amount = Number(p.prize_amount);
    return Number.isFinite(amount) && amount > 0 ? `RD$ ${amount.toLocaleString('es-DO')}` : 'Premio';
  }

  premiadosUniformPrize(list: PrizeNumber[]): boolean {
    if (list.length === 0) return false;
    const first = this.premiadoPrizeLabel(list[0]);
    return list.every(p => this.premiadoPrizeLabel(p) === first);
  }

  premiadosPrizeBannerAmount(list: PrizeNumber[]): string {
    if (list.length === 0) return '';
    return this.premiadosUniformPrize(list) ? this.premiadoPrizeLabel(list[0]) : '¡GANAS PREMIO!';
  }

  // ---- descriptions ---------------------------------------------------------

  private normalizeDescription(text: string | null | undefined): string {
    return (text ?? '').replace(/\r\n/g, '\n').trim();
  }

  descParagraphs(text: string): string[] {
    return text
      ? text
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
      : [];
  }

  /** Card preview: first two paragraphs when short enough, otherwise a ~50 grapheme excerpt. */
  cardDescription(r: RaffleCardVm): { paragraphs: string[]; truncated: boolean } | null {
    const full = this.normalizeDescription(r.description);
    if (!full) return null;
    const { preview, truncated } = HomeComponent.previewDescription(full);
    return { paragraphs: this.descParagraphs(preview), truncated };
  }

  private static graphemes(text: string): string[] {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(text), s => s.segment);
    }
    return [...text];
  }

  private static previewDescription(text: string): { preview: string; truncated: boolean } {
    const max = HomeComponent.DESC_PREVIEW_MAX;
    const paras = text.split(/\n\n+/).filter(p => p.length > 0);
    const firstTwo = paras.slice(0, Math.min(2, paras.length)).join('\n\n');
    const twoFit = HomeComponent.graphemes(firstTwo).length <= HomeComponent.DESC_TWO_PARA_MAX;
    if (firstTwo.length > 0 && firstTwo.length < text.length && twoFit) {
      return { preview: firstTwo, truncated: true };
    }
    const g = HomeComponent.graphemes(text);
    if (g.length <= max) return { preview: text, truncated: false };
    let cut = g.slice(0, max).join('');
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > Math.floor(max * 0.35)) cut = cut.slice(0, lastSpace).trimEnd();
    return { preview: `${cut}…`, truncated: true };
  }

  openDescriptionModal(r: RaffleCardVm): void {
    const body = this.normalizeDescription(r.description);
    if (!body) return;
    this.descriptionModal = { title: r.title, body };
    document.body.style.overflow = 'hidden';
  }

  closeDescriptionModal(): void {
    this.descriptionModal = null;
    this.releaseScrollIfIdle();
  }

  // ---- winners --------------------------------------------------------------

  private scheduleRecentWinners(): void {
    if (this.winnersFetchScheduled) return;
    this.winnersFetchScheduled = true;
    setTimeout(() => this.loadRecentWinners(), 200);
  }

  private loadRecentWinners(): void {
    this.winnersLoading = true;
    this.winnersError = false;
    const newestFirst = (list: Winner[]) =>
      [...list].sort((a, b) => new Date(b.drawn_at).getTime() - new Date(a.drawn_at).getTime());
    this.api
      .getRecentWinners(50, { kind: 'main' })
      .pipe(
        catchError(() =>
          this.api.getRecentWinners(50).pipe(map(list => list.filter(w => w.winner_type !== 'prize_number'))),
        ),
      )
      .subscribe({
        next: list => {
          this.recentWinners = newestFirst(list);
          this.winnersLoading = false;
        },
        error: () => {
          this.recentWinners = [];
          this.winnersError = true;
          this.winnersLoading = false;
        },
      });
  }

  private looksLikeCashPrize(text: string | null | undefined): boolean {
    const t = String(text ?? '').trim();
    return !!t && (/^RD\$?\s*[\d,.]+/i.test(t) || /^\$\s*[\d,.]+/i.test(t) || /^[\d,.]+\s*(pesos?|rd\$?)$/i.test(t));
  }

  winnerDisplayName(w: Winner): string {
    const name = (w.display_name || w.participant?.name || '').trim();
    return name.length > 0 ? name : 'Ganador';
  }

  winnerPrizeLabel(w: Winner): string {
    const label = (w.prize_label || '').trim();
    if (label.length > 0) return label;
    const title = (w.display_raffle_title || w.raffle?.title || '').trim();
    return title.length > 0 ? title : '—';
  }

  /** Main winners show the prize; cash prizes fall back to the raffle title. */
  winnerCardHighlight(w: Winner): string {
    const prize = (w.prize_label || '').trim();
    const raffle = (w.display_raffle_title || w.custom_raffle_title || w.raffle?.title || '').trim();
    const isPlainPrize = prize && !this.looksLikeCashPrize(prize) && !/^[\d,.]+$/.test(prize);
    return isPlainPrize ? prize : raffle || prize || '—';
  }

  winnerPortraitUrl(w: Winner): string | null {
    const url = w.portrait_image?.url?.trim();
    return url ? url : null;
  }

  winnerInitials(w: Winner): string {
    const parts = this.winnerDisplayName(w)
      .split(/\s+/)
      .filter(p => p.length > 0)
      .slice(0, 2);
    return parts.length === 0 ? '?' : parts.map(p => p[0].toUpperCase()).join('');
  }

  winnerDrawnLabel(value: string): string {
    return formatWhen(value);
  }

  // ---- accordions & navigation ---------------------------------------------

  toggleHowToPlay(): void {
    this.howToPlayOpen = !this.howToPlayOpen;
  }

  // ---- image preview --------------------------------------------------------

  openImagePreview(r: RaffleCardVm): void {
    if (!r.image) return;
    this.imagePreview = { src: r.image, alt: r.title, title: r.title };
    document.body.style.overflow = 'hidden';
  }

  openWinnerPortraitPreview(w: Winner): void {
    const src = this.winnerPortraitUrl(w);
    if (!src) return;
    this.imagePreview = {
      src,
      alt: `Foto de ${this.winnerDisplayName(w)}`,
      title: `${this.winnerDisplayName(w)} — ${this.winnerPrizeLabel(w)}`,
    };
    document.body.style.overflow = 'hidden';
  }

  closeImagePreview(): void {
    this.imagePreview = null;
    this.releaseScrollIfIdle();
  }

  /** Swaps a broken photo for an inline placeholder (once, to avoid error loops). */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = IMAGE_PLACEHOLDER;
  }

  // ---- WhatsApp help --------------------------------------------------------

  openWhatsAppHelpModal(): void {
    this.whatsappHelpModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeWhatsAppHelpModal(): void {
    this.whatsappHelpModalOpen = false;
    this.releaseScrollIfIdle();
  }

  confirmWhatsAppSupport(): void {
    const link = document.createElement('a');
    link.href = this.supportWhatsAppUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.closeWhatsAppHelpModal();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (this.descriptionModal) this.closeDescriptionModal();
    else if (this.whatsappHelpModalOpen) this.closeWhatsAppHelpModal();
    else if (this.imagePreview) this.closeImagePreview();
  }

  // ---- purchase -------------------------------------------------------------

  openPurchase(raffle: RaffleCardVm): void {
    if (this.cannotPlayRaffle(raffle)) return;
    this.imagePreview = null;
    this.descriptionModal = null;
    this.purchase.openFor(raffle);
    setTimeout(() => {
      this.purchaseFormRef?.resetForm({
        purchaseNombreApellidos: '',
        purchaseEmail: '',
        purchasePhoneE164: null,
        purchaseTerms: false,
      });
    }, 0);
  }

  /** Enter inside a field submits the purchase instead of the browser default. */
  protected onPurchaseFormEnter(event: Event, form: NgForm): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'file') return;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return;
    event.preventDefault();
    this.purchase.submit(form);
  }

  private releaseScrollIfIdle(): void {
    if (!this.modalOpen && !this.whatsappHelpModalOpen && !this.descriptionModal && !this.imagePreview) {
      document.body.style.overflow = '';
    }
  }
}
