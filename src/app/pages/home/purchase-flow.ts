import { NgForm, NgModel } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { toDataURL } from 'qrcode';
import { finalize, switchMap } from 'rxjs';

import { RifasApi } from '../../core/api/rifas-api';
import { BankAccount, CreateOrderRequest, CreatedOrder, TicketCombo } from '../../core/models/models';
import { apiErrorMessage, isCaptchaError, requiresLegacyCaptcha } from '../../core/utils/api-error';
import { parseAmount } from '../../core/utils/format';
import { RaffleCardVm } from './raffle-card.vm';

/** Everything the purchase flow needs from the page that hosts it. */
export interface PurchaseHost {
  api: RifasApi;
  sanitizer: DomSanitizer;
  isDrawFinished(raffle: RaffleCardVm): boolean;
  /** The scrollable modal sheet, used to focus the first incomplete field. */
  sheet(): HTMLElement | undefined;
  receiptInput(): HTMLInputElement | undefined;
  resetTurnstile(): void;
  /** Called whenever the modal opens or closes so the page can lock body scroll. */
  onVisibilityChange(open: boolean): void;
}

export type PurchaseMode = 'combo' | 'custom';
export type AntiBotMode = 'turnstile' | 'captcha';
type CopyKind = 'link' | 'qr';

const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
const RECEIPT_TOO_BIG = 'El comprobante no puede superar 10 MB.';
const FEEDBACK_MS = 2200;

/** Plain TypeScript state machine behind the "JUGAR" modal. The template binds to it. */
export class PurchaseFlow {
  readonly personFullNamePattern = "^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\\s'\\.-]{1,119}$";
  readonly emailPatternOptional = '^$|^[^\\s@+]+@[^\\s@]+\\.[^\\s@]+$';

  open = false;
  activeRaffle: RaffleCardVm | null = null;

  // package / quantity
  publicCombos: TicketCombo[] = [];
  purchaseRaffleLoading = false;
  purchaseRaffleLoadError: string | null = null;
  purchaseSelectionMode: PurchaseMode = 'combo';
  selectedComboId: number | null = null;
  ticketQty = 2;

  // customer
  nombreApellidos = '';
  phoneE164: string | null = null;
  phoneIsValid = false;
  email = '';
  acceptTerms = false;

  // payment
  bankAccounts: BankAccount[] = [];
  bankAccountsLoading = false;
  selectedBankAccountId: number | null = null;
  paymentCopyDone = false;

  // receipt
  receiptFile: File | null = null;
  receiptName = '';
  receiptPreviewImgSafe: SafeUrl | null = null;
  receiptPreviewPdfSafe: SafeResourceUrl | null = null;
  private receiptPreviewObjectUrl: string | null = null;

  // anti-bot
  antiBotMode: AntiBotMode = 'turnstile';
  turnstileToken: string | null = null;
  captchaLoading = false;
  captchaError: string | null = null;
  captchaId: string | null = null;
  captchaSvgSafe: SafeHtml | null = null;
  captchaAnswer = '';

  // submit / result
  purchaseSubmitting = false;
  purchaseError: string | null = null;
  purchaseFlowSuccess = false;
  purchaseSuccessOrder: CreatedOrder | null = null;
  ticketsCopyDone = false;
  publicViewQrDataUrl: string | null = null;
  publicViewShareResolving = false;
  publicViewLinkCopyDone = false;
  publicViewCopyChoiceOpen = false;
  publicViewCopyDoneKind: CopyKind | null = null;

  private paymentCopyTimer?: ReturnType<typeof setTimeout>;
  private ticketsCopyTimer?: ReturnType<typeof setTimeout>;
  private publicViewCopyTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly host: PurchaseHost) {}

  // ---- derived state --------------------------------------------------------

  get hasPublicCombos(): boolean {
    return this.publicCombos.length > 0;
  }

  get showComboPicker(): boolean {
    return this.hasPublicCombos && this.purchaseSelectionMode === 'combo';
  }

  get showCustomTicketStepper(): boolean {
    return this.purchaseRaffleLoading ? false : !this.hasPublicCombos || this.purchaseSelectionMode === 'custom';
  }

  get selectedCombo(): TicketCombo | null {
    return this.selectedComboId == null ? null : (this.publicCombos.find(c => c.id === this.selectedComboId) ?? null);
  }

  get selectedBank(): BankAccount | null {
    return this.selectedBankAccountId == null
      ? null
      : (this.bankAccounts.find(b => b.id === this.selectedBankAccountId) ?? null);
  }

  get checkoutTicketQuantity(): number {
    return this.purchaseSelectionMode === 'combo' && this.selectedCombo ? this.selectedCombo.quantity : this.ticketQty;
  }

  get totalPay(): number {
    const raffle = this.activeRaffle;
    if (!raffle || this.cannotPlay(raffle)) return 0;
    if (this.purchaseSelectionMode === 'combo' && this.selectedCombo) {
      const price = parseAmount(this.selectedCombo.package_price);
      if (price != null && price >= 0) return price;
    }
    return raffle.unitPrice * this.ticketQty;
  }

  get canConfirm(): boolean {
    if (this.activeRaffle && this.host.isDrawFinished(this.activeRaffle)) return false;
    const phone = this.phoneForApi();
    const receiptOk = this.receiptFile != null && this.receiptFile.size <= RECEIPT_MAX_BYTES;
    const banksReady = !this.bankAccountsLoading && this.bankAccounts.length > 0;
    const bankMissing = banksReady && this.selectedBankAccountId == null;
    const turnstileOk = this.turnstileToken != null && this.turnstileToken.trim().length > 0;
    const captchaOk = !!this.captchaId?.trim() && this.captchaAnswer.trim().length > 0;
    const antiBotOk = this.antiBotMode === 'captcha' ? captchaOk : turnstileOk;
    const quantityOk = this.showComboPicker ? this.validSelectedCombo() != null : this.isTicketQtyAllowed(this.ticketQty);
    return (
      !this.purchaseRaffleLoading &&
      quantityOk &&
      PurchaseFlow.isValidFullName(this.nombreApellidos) &&
      this.phoneIsValid &&
      phone.length >= 11 &&
      !PurchaseFlow.isAllZeros(phone) &&
      PurchaseFlow.isValidEmail(this.email) &&
      banksReady &&
      !bankMissing &&
      this.acceptTerms &&
      receiptOk &&
      antiBotOk
    );
  }

  get successTickets(): { number: string }[] {
    return this.purchaseSuccessOrder?.tickets ?? [];
  }

  get successTicketCount(): number {
    if (this.successTickets.length > 0) return this.successTickets.length;
    const combo = this.purchaseSuccessOrder?.raffle_ticket_combo?.quantity;
    return combo != null && combo > 0 ? combo : this.checkoutTicketQuantity;
  }

  get successAmountNumber(): number {
    const order = this.purchaseSuccessOrder;
    if (!order) return this.totalPay;
    const raw = String(order.total_amount ?? '').trim();
    return raw ? (parseAmount(raw) ?? this.totalPay) : this.totalPay;
  }

  get successPublicViewToken(): string | null {
    return (this.purchaseSuccessOrder?.public_view_token ?? '').trim() || null;
  }

  get successPublicViewUrl(): string | null {
    return PurchaseFlow.resolvePublicViewUrl(this.purchaseSuccessOrder, this.nombreApellidos);
  }

  get showPublicViewSharePanel(): boolean {
    if (!this.purchaseFlowSuccess || !this.purchaseSuccessOrder) return false;
    return (
      this.successTickets.length > 0 ||
      !!this.successPublicViewUrl ||
      !!this.successPublicViewToken ||
      this.publicViewShareResolving
    );
  }

  get canNativeSharePublicView(): boolean {
    const url = this.successPublicViewUrl;
    if (!url || typeof navigator.share !== 'function') return false;
    return navigator.canShare?.({ title: 'Mis boletos — Rifas Luxury RD', text: 'Consulta tus números:', url }) !== false;
  }

  cannotPlay(raffle: RaffleCardVm): boolean {
    return raffle.soldOut || this.host.isDrawFinished(raffle);
  }

  phoneForApi(): string {
    return (this.phoneE164 || '').toString().replace(/\D/g, '');
  }

  purchaseTicketLimits(): { min: number; max: number } | null {
    const raffle = this.activeRaffle;
    if (!raffle) return null;
    const min = Number(raffle.minTickets);
    const max = Number(raffle.maxTicketsPerUser);
    return !Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min ? null : { min, max };
  }

  isTicketQtyAllowed(qty: number): boolean {
    const limits = this.purchaseTicketLimits();
    return limits != null && typeof qty === 'number' && Number.isInteger(qty) && qty >= limits.min && qty <= limits.max;
  }

  validSelectedCombo(): TicketCombo | null {
    const combo = this.selectedCombo;
    return !combo || !this.isTicketQtyAllowed(Number(combo.quantity)) ? null : combo;
  }

  comboAccentClass(combo: TicketCombo): string {
    const a = (combo.accent ?? '').toLowerCase().trim();
    if (a === 'blue' || a === 'azul') return 'blue';
    if (a === 'red' || a === 'rojo') return 'red';
    if (a === 'green' || a === 'verde') return 'green';
    return 'gold';
  }

  // ---- open / close ---------------------------------------------------------

  openFor(raffle: RaffleCardVm): void {
    if (raffle.soldOut || this.host.isDrawFinished(raffle)) return;
    this.activeRaffle = raffle;
    this.ticketQty = raffle.minTickets;
    this.nombreApellidos = '';
    this.phoneE164 = null;
    this.phoneIsValid = false;
    this.email = '';
    this.selectedBankAccountId = null;
    this.acceptTerms = false;
    this.receiptName = '';
    this.receiptFile = null;
    this.clearReceiptPreview();
    this.purchaseError = null;
    this.purchaseFlowSuccess = false;
    this.purchaseSuccessOrder = null;
    this.purchaseSubmitting = false;
    this.resetAntiBot();
    this.clearTicketsCopyFeedback();
    this.clearPublicViewShare();
    this.clearPaymentCopyFeedback();
    this.loadBankAccounts();
    if (this.antiBotMode === 'captcha') this.loadCaptcha();
    this.open = true;
    const id = Number(raffle.id);
    if (Number.isFinite(id) && id > 0) this.loadRaffleDetail(id);
    else this.resetCombos();
    this.host.onVisibilityChange(true);
    setTimeout(() => {
      const sheet = this.host.sheet();
      if (sheet) sheet.scrollTop = 0;
      const input = this.host.receiptInput();
      if (input) input.value = '';
    }, 0);
  }

  close(): void {
    this.open = false;
    this.activeRaffle = null;
    this.resetCombos();
    this.purchaseError = null;
    this.purchaseFlowSuccess = false;
    this.purchaseSuccessOrder = null;
    this.purchaseSubmitting = false;
    this.receiptFile = null;
    this.receiptName = '';
    this.clearReceiptPreview();
    this.bankAccounts = [];
    this.selectedBankAccountId = null;
    this.resetAntiBot();
    this.clearTicketsCopyFeedback();
    this.clearPublicViewShare();
    this.clearPaymentCopyFeedback();
    this.host.onVisibilityChange(false);
  }

  private resetCombos(): void {
    this.publicCombos = [];
    this.purchaseRaffleLoading = false;
    this.purchaseRaffleLoadError = null;
    this.purchaseSelectionMode = 'custom';
    this.selectedComboId = null;
  }

  private loadRaffleDetail(id: number): void {
    this.purchaseRaffleLoading = true;
    this.purchaseRaffleLoadError = null;
    this.publicCombos = [];
    this.selectedComboId = null;
    this.purchaseSelectionMode = 'combo';
    this.host.api.getRaffle(id).subscribe({
      next: raffle => {
        const active = this.activeRaffle;
        if (active && String(active.id) === String(id)) {
          const min = Math.max(1, Number(raffle.min_tickets_per_user));
          const max = Math.max(min, Number(raffle.max_tickets_per_user));
          if (Number.isInteger(min) && Number.isInteger(max)) {
            this.activeRaffle = { ...active, minTickets: min, maxTicketsPerUser: max };
            this.ticketQty = Math.max(min, Math.min(max, this.ticketQty));
          }
        }
        this.publicCombos = [...(raffle.ticket_combos ?? [])]
          .filter(c => c.show_on_public !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        if (this.publicCombos.length > 0) {
          this.purchaseSelectionMode = 'combo';
          this.selectedComboId = this.publicCombos[0].id;
        } else {
          this.purchaseSelectionMode = 'custom';
          this.selectedComboId = null;
        }
        this.purchaseRaffleLoading = false;
      },
      error: () => {
        this.publicCombos = [];
        this.purchaseSelectionMode = 'custom';
        this.selectedComboId = null;
        this.purchaseRaffleLoading = false;
        this.purchaseRaffleLoadError = 'No se pudieron cargar los paquetes. Puedes elegir la cantidad manualmente.';
      },
    });
  }

  // ---- packages & quantity --------------------------------------------------

  selectCombo(id: number): void {
    this.selectedComboId = id;
    this.setMode('combo');
    this.purchaseError = null;
  }

  setMode(mode: PurchaseMode): void {
    if (mode === 'combo' && !this.hasPublicCombos) return;
    this.purchaseSelectionMode = mode;
    if (mode === 'combo' && this.selectedComboId == null && this.publicCombos.length > 0) {
      this.selectedComboId = this.publicCombos[0].id;
    }
    if (mode === 'custom' && this.activeRaffle) {
      const { minTickets, maxTicketsPerUser } = this.activeRaffle;
      this.ticketQty = Math.max(minTickets, Math.min(maxTicketsPerUser, this.ticketQty));
    }
  }

  clampTicketQty(n: number): number {
    const limits = this.purchaseTicketLimits();
    if (!limits) return 1;
    const value = Number.isFinite(n) ? Math.trunc(n) : limits.min;
    return Math.max(limits.min, Math.min(limits.max, value));
  }

  incTickets(): void {
    this.ticketQty = this.clampTicketQty(this.clampTicketQty(this.ticketQty) + 1);
    if (this.hasPublicCombos) this.purchaseSelectionMode = 'custom';
  }

  decTickets(): void {
    this.ticketQty = this.clampTicketQty(this.clampTicketQty(this.ticketQty) - 1);
    if (this.hasPublicCombos) this.purchaseSelectionMode = 'custom';
  }

  // ---- customer fields ------------------------------------------------------

  onPhoneInputChange(event: { e164?: string | null } | null | undefined): void {
    if (event && typeof event.e164 === 'string') {
      this.phoneE164 = event.e164;
      this.phoneIsValid = isValidPhoneNumber(event.e164);
    } else if (!event?.e164) {
      this.phoneE164 = null;
      this.phoneIsValid = false;
    }
  }

  onPhoneValidityChange(valid: boolean): void {
    this.phoneIsValid = !!valid;
  }

  onNombreApellidosChange(value: string): void {
    const clean = PurchaseFlow.sanitizePersonName(value);
    this.nombreApellidos = clean
      .split(' ')
      .map(w => PurchaseFlow.capitalizeFirst(w))
      .join(' ');
  }

  purchaseFieldShowError(control: NgModel | null | undefined, submitted: boolean, value: string): boolean {
    if (!control?.invalid) return false;
    if (submitted) return true;
    return !!control.touched && (!!control.dirty || (value ?? '').trim().length > 0);
  }

  purchasePhoneShowError(control: NgModel | null | undefined, submitted: boolean): boolean {
    if (this.phoneIsValid) return false;
    if (submitted) return true;
    const hasValue = this.phoneE164 != null && String(this.phoneE164).trim().length > 0;
    return !!control?.touched && (!!control.dirty || hasValue);
  }

  // ---- banks ----------------------------------------------------------------

  private loadBankAccounts(): void {
    this.bankAccountsLoading = true;
    this.bankAccounts = [];
    this.host.api.getBankAccounts().subscribe({
      next: list => {
        this.bankAccounts = [...list].filter(b => b.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        this.bankAccountsLoading = false;
      },
      error: () => {
        this.bankAccounts = [];
        this.bankAccountsLoading = false;
      },
    });
  }

  selectBankAccount(bank: BankAccount): void {
    this.selectedBankAccountId = bank.id;
  }

  copyBankAccount(accountNumber: string): void {
    const text = accountNumber.replace(/\s/g, '');
    if (!text || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(
      () => {
        this.paymentCopyDone = true;
        if (this.paymentCopyTimer !== undefined) clearTimeout(this.paymentCopyTimer);
        this.paymentCopyTimer = setTimeout(() => {
          this.paymentCopyDone = false;
          this.paymentCopyTimer = undefined;
        }, FEEDBACK_MS);
      },
      () => undefined,
    );
  }

  private clearPaymentCopyFeedback(): void {
    this.paymentCopyDone = false;
    if (this.paymentCopyTimer !== undefined) {
      clearTimeout(this.paymentCopyTimer);
      this.paymentCopyTimer = undefined;
    }
  }

  // ---- receipt --------------------------------------------------------------

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.receiptFile = null;
      this.receiptName = '';
      this.clearReceiptPreview();
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      this.receiptFile = null;
      this.receiptName = '';
      this.clearReceiptPreview();
      input.value = '';
      this.purchaseError = RECEIPT_TOO_BIG;
      return;
    }
    this.receiptFile = file;
    this.receiptName = file.name;
    this.setReceiptPreview(file);
    if (this.purchaseError === RECEIPT_TOO_BIG) this.purchaseError = null;
  }

  clearReceiptPreview(): void {
    this.receiptPreviewImgSafe = null;
    this.receiptPreviewPdfSafe = null;
    if (this.receiptPreviewObjectUrl) {
      URL.revokeObjectURL(this.receiptPreviewObjectUrl);
      this.receiptPreviewObjectUrl = null;
    }
  }

  private setReceiptPreview(file: File): void {
    this.clearReceiptPreview();
    const url = URL.createObjectURL(file);
    this.receiptPreviewObjectUrl = url;
    const type = file.type.toLowerCase();
    if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') {
      this.receiptPreviewImgSafe = this.host.sanitizer.bypassSecurityTrustUrl(url);
    } else if (type === 'application/pdf') {
      this.receiptPreviewPdfSafe = this.host.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  // ---- anti-bot -------------------------------------------------------------

  resetAntiBot(): void {
    this.turnstileToken = null;
    this.host.resetTurnstile();
    this.captchaLoading = false;
    this.captchaError = null;
    this.captchaId = null;
    this.captchaSvgSafe = null;
    this.captchaAnswer = '';
  }

  onTurnstileResolved(token: string): void {
    this.turnstileToken = token && token.trim().length > 0 ? token : null;
  }

  onTurnstileExpired(): void {
    this.turnstileToken = null;
  }

  onTurnstileError(): void {
    this.turnstileToken = null;
    this.purchaseError = 'No se pudo cargar la verificación. Recarga la página e inténtalo de nuevo.';
  }

  loadCaptcha(): void {
    this.captchaLoading = true;
    this.captchaError = null;
    this.captchaId = null;
    this.captchaSvgSafe = null;
    this.captchaAnswer = '';
    this.host.api.getCaptcha().subscribe({
      next: captcha => {
        this.captchaId = captcha.captcha_id;
        this.captchaSvgSafe = this.host.sanitizer.bypassSecurityTrustHtml(captcha.captcha_svg);
        this.captchaLoading = false;
      },
      error: () => {
        this.captchaLoading = false;
        this.captchaError = 'No se pudo cargar el captcha. Intenta recargarlo.';
      },
    });
  }

  // ---- submit ---------------------------------------------------------------

  submit(form: NgForm): void {
    if (this.purchaseSubmitting) return;
    form.onSubmit(new Event('submit'));
    if (!this.canConfirm) {
      Object.values(form.controls).forEach(c => {
        c.markAsTouched();
        c.markAsDirty();
      });
      if (this.antiBotMode === 'captcha') {
        if (!this.captchaId || !this.captchaSvgSafe) this.purchaseError = 'Debes cargar el captcha antes de enviar la solicitud.';
        else if (this.captchaAnswer.trim().length === 0) this.purchaseError = 'Debes escribir el número del captcha para continuar.';
      } else if (!this.turnstileToken) {
        this.purchaseError = 'Completa la verificación de seguridad para continuar.';
      }
      if (this.purchaseError == null && form.valid && !this.canConfirm) {
        this.purchaseError =
          'Faltan datos o hay algo por corregir: nombre, teléfono válido, comprobante de pago, banco (si aplica) y aceptar términos. Si escribiste cédula o correo, revísalos.';
      }
      setTimeout(() => this.focusFirstIncompleteField(), 0);
      return;
    }
    this.purchaseError = null;
    this.confirm();
  }

  private confirm(): void {
    const raffle = this.activeRaffle;
    if (raffle && this.host.isDrawFinished(raffle)) {
      this.purchaseError = 'Este sorteo ya finalizó. No se pueden comprar más boletos.';
      return;
    }
    if (!this.canConfirm || !raffle || !this.receiptFile) return;
    const useCombo = this.purchaseSelectionMode === 'combo' && this.selectedComboId != null;
    const combo = useCombo ? this.validSelectedCombo() : null;
    const quantityInvalid = useCombo ? combo == null : !this.isTicketQtyAllowed(this.ticketQty);
    if (quantityInvalid) {
      const limits = this.purchaseTicketLimits();
      this.ticketQty = this.clampTicketQty(this.ticketQty);
      this.purchaseError = limits ? `La cantidad debe estar entre ${limits.min} y ${limits.max} boletos.` : 'Cantidad de boletos no válida.';
      return;
    }
    const raffleId = Number(raffle.id);
    if (!Number.isFinite(raffleId) || raffleId < 1) {
      this.purchaseError = 'Rifa no válida.';
      return;
    }
    this.purchaseSubmitting = true;
    this.purchaseError = null;
    const phone = this.phoneForApi();
    const name = this.nombreApellidos.trim();
    const emailTrim = this.email.trim().toLowerCase();
    const email = emailTrim.length > 0 ? emailTrim : null;
    const voucher = this.receiptFile;

    this.host.api
      .createParticipant({ name, cedula: '', phone, email })
      .pipe(
        switchMap(participant => {
          const base: CreateOrderRequest = {
            customer_name: name,
            cedula: '',
            phone,
            email: email ?? undefined,
            participant_id: participant.id,
            bank_account_id: this.selectedBankAccountId ?? undefined,
            ...(this.antiBotMode === 'captcha'
              ? { captcha_id: this.captchaId ?? undefined, captcha_answer: this.captchaAnswer.trim() }
              : { turnstile_token: this.turnstileToken ?? undefined }),
            website: '',
          };
          const request: CreateOrderRequest = combo
            ? { ...base, ticket_combo_id: combo.id }
            : { ...base, quantity: this.ticketQty };
          return this.host.api.createOrder(raffleId, request, voucher);
        }),
        finalize(() => (this.purchaseSubmitting = false)),
      )
      .subscribe({
        next: order => {
          this.purchaseSuccessOrder = order;
          this.purchaseFlowSuccess = true;
          this.setupPublicViewShare(order);
        },
        error: err => {
          if (this.antiBotMode === 'turnstile' && requiresLegacyCaptcha(err)) {
            this.antiBotMode = 'captcha';
            this.purchaseError = 'Por el momento, el sistema requiere captcha. Completa el captcha para continuar.';
            this.loadCaptcha();
          } else if (isCaptchaError(err)) {
            this.purchaseError = 'La verificación es incorrecta o expiró. Complétala de nuevo e inténtalo otra vez.';
            if (this.antiBotMode === 'turnstile') {
              this.host.resetTurnstile();
              this.turnstileToken = null;
            } else {
              this.loadCaptcha();
            }
          } else {
            this.purchaseError = apiErrorMessage(err);
          }
        },
      });
  }

  private focusFirstIncompleteField(): void {
    const sheet = this.host.sheet();
    if (!sheet) return;
    const reveal = (el: Element | null | undefined) => {
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const focus = (el: Element | null | undefined) => {
      if (el instanceof HTMLElement) {
        reveal(el);
        el.focus({ preventScroll: true });
      }
    };
    if (!PurchaseFlow.isValidFullName(this.nombreApellidos)) return focus(sheet.querySelector('input[name="purchaseNombreApellidos"]'));
    const phone = this.phoneForApi();
    if (!this.phoneIsValid || phone.length < 11 || PurchaseFlow.isAllZeros(phone)) return focus(sheet.querySelector('.phone-sel .ngxsmk-tel-input__control'));
    if (this.email.trim().length > 0 && !PurchaseFlow.isValidEmail(this.email)) return focus(sheet.querySelector('input[name="purchaseEmail"]'));
    if (this.bankAccounts.length > 0 && this.selectedBankAccountId == null) return focus(sheet.querySelector('.bank-account-card'));
    if (!(this.receiptFile != null && this.receiptFile.size <= RECEIPT_MAX_BYTES)) {
      const input = this.host.receiptInput();
      return reveal(input?.closest('.field') ?? input?.closest('label.upload-zone') ?? input);
    }
    if (this.antiBotMode === 'captcha') {
      if (!this.captchaId || !this.captchaSvgSafe) return reveal(sheet.querySelector('.captcha-box'));
      if (this.captchaAnswer.trim().length === 0) return focus(sheet.querySelector('input[name="purchaseCaptchaAnswer"]'));
    } else if (!this.turnstileToken) {
      return reveal(sheet.querySelector('.turnstile-wrap'));
    }
    if (!this.acceptTerms) focus(sheet.querySelector('input[name="purchaseTerms"]'));
  }

  // ---- success: personal link, QR, copy -------------------------------------

  private setupPublicViewShare(order: CreatedOrder): void {
    this.clearPublicViewShare();
    const url = PurchaseFlow.resolvePublicViewUrl(order, this.nombreApellidos);
    if (url) this.generateQr(url);
  }

  private generateQr(url: string): void {
    toDataURL(url, { width: 200, margin: 2, color: { dark: '#04057a', light: '#ffffff' } })
      .then(dataUrl => (this.publicViewQrDataUrl = dataUrl))
      .catch(() => undefined);
  }

  togglePublicViewCopyChoice(): void {
    if (!this.successPublicViewUrl && !this.publicViewQrDataUrl) return;
    this.publicViewCopyChoiceOpen = !this.publicViewCopyChoiceOpen;
  }

  closePublicViewCopyChoice(): void {
    this.publicViewCopyChoiceOpen = false;
  }

  copyPublicViewUrlText(): void {
    const text = this.successPublicViewUrl ?? this.successPublicViewToken;
    if (!text || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(
      () => {
        this.closePublicViewCopyChoice();
        this.markPublicViewCopyDone('link');
      },
      () => undefined,
    );
  }

  copyPublicViewQrImage(): void {
    const dataUrl = this.publicViewQrDataUrl;
    if (!dataUrl) return;
    this.writeImageToClipboard(dataUrl).then(
      () => {
        this.closePublicViewCopyChoice();
        this.markPublicViewCopyDone('qr');
      },
      () => this.copyPublicViewUrlText(),
    );
  }

  private async writeImageToClipboard(dataUrl: string): Promise<void> {
    const ClipboardItemCtor = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (!ClipboardItemCtor || !navigator.clipboard?.write) throw new Error('clipboard-image-unsupported');
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type || 'image/png']: blob })]);
  }

  private markPublicViewCopyDone(kind: CopyKind): void {
    this.publicViewCopyDoneKind = kind;
    this.publicViewLinkCopyDone = true;
    if (this.publicViewCopyTimer !== undefined) clearTimeout(this.publicViewCopyTimer);
    this.publicViewCopyTimer = setTimeout(() => {
      this.publicViewLinkCopyDone = false;
      this.publicViewCopyDoneKind = null;
      this.publicViewCopyTimer = undefined;
    }, FEEDBACK_MS);
  }

  sharePublicViewLink(): void {
    const url = this.successPublicViewUrl;
    if (!url) return;
    const data = { title: 'Mis boletos — Rifas Luxury RD', text: 'Consulta tus números de boletos aquí:', url };
    if (typeof navigator.share === 'function') {
      navigator.share(data).catch(() => this.copyPublicViewUrlText());
      return;
    }
    this.copyPublicViewUrlText();
  }

  copyTicketNumbers(): void {
    const numbers = this.successTickets.map(t => t.number).filter(Boolean);
    const text = numbers.join('\n');
    if (!text || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(
      () => {
        this.ticketsCopyDone = true;
        if (this.ticketsCopyTimer !== undefined) clearTimeout(this.ticketsCopyTimer);
        this.ticketsCopyTimer = setTimeout(() => {
          this.ticketsCopyDone = false;
          this.ticketsCopyTimer = undefined;
        }, FEEDBACK_MS);
      },
      () => undefined,
    );
  }

  private clearTicketsCopyFeedback(): void {
    this.ticketsCopyDone = false;
    if (this.ticketsCopyTimer !== undefined) {
      clearTimeout(this.ticketsCopyTimer);
      this.ticketsCopyTimer = undefined;
    }
  }

  private clearPublicViewShare(): void {
    this.publicViewQrDataUrl = null;
    this.publicViewShareResolving = false;
    this.publicViewCopyChoiceOpen = false;
    this.publicViewCopyDoneKind = null;
    this.publicViewLinkCopyDone = false;
    if (this.publicViewCopyTimer !== undefined) {
      clearTimeout(this.publicViewCopyTimer);
      this.publicViewCopyTimer = undefined;
    }
  }

  /** Releases timers and object URLs. Call from the host's ngOnDestroy. */
  destroy(): void {
    this.clearReceiptPreview();
    this.clearTicketsCopyFeedback();
    this.clearPaymentCopyFeedback();
    this.clearPublicViewShare();
  }

  // ---- bank card styling ----------------------------------------------------

  bankAccentColor(bank: BankAccount, index: number): string {
    const color = bank.color?.trim();
    if (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
      if (color.length === 4) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
      return color;
    }
    const palette = ['#34d399', '#3b82f6', '#e9d5ff', '#a78bfa', '#ef4444', '#f59e0b', '#14b8a6', '#8b5cf6'];
    return palette[index % palette.length];
  }

  // ---- static helpers -------------------------------------------------------

  static isAllZeros(digits: string): boolean {
    const t = (digits || '').trim();
    return t.length > 0 && /^0+$/.test(t);
  }

  static isValidEmail(value: string): boolean {
    const t = value.trim();
    if (t.length === 0) return true;
    return t.length < 5 || t.includes('+') ? false : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  }

  static sanitizePersonName(value: string): string {
    return (value || '')
      .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  static capitalizeFirst(word: string): string {
    return word.length === 0 ? '' : word[0].toLocaleUpperCase('es-DO') + word.slice(1);
  }

  static isValidFullName(value: string): boolean {
    const t = (value || '').trim();
    return t.length < 2 ? false : /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]*$/.test(t);
  }

  private static slugify(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** `/<customer_slug>/<token>` on this site, or the absolute URL the server provided. */
  static resolvePublicViewUrl(order: CreatedOrder | null, fallbackName = ''): string | null {
    if (!order) return null;
    const direct = (order.public_view_url ?? '').trim();
    if (direct) return direct;
    const token = (order.public_view_token ?? '').trim();
    if (!token) return null;
    let slug = (order.customer_slug ?? '').trim();
    if (!slug) slug = PurchaseFlow.slugify(order.customer_name || fallbackName);
    return slug ? `${location.origin}/${slug}/${token}` : null;
  }
}
