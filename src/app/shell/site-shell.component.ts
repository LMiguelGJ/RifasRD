import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { ThemeService } from '../core/services/theme.service';

/** Anchors on the home page that the header navigation scrolls to. */
export type ShellAnchor = 'rifas' | 'como-jugar' | 'ganadores';

@Component({
  selector: 'app-site-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './site-shell.component.html',
  styleUrl: './site-shell.component.css',
})
export class SiteShellComponent implements OnInit, OnDestroy {
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private navSub?: Subscription;

  protected readonly drawerOpen = signal(false);

  ngOnInit(): void {
    this.theme.init();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.closeDrawer());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    document.body.style.overflow = '';
  }

  protected toggleDrawer(): void {
    this.setDrawer(!this.drawerOpen());
  }

  protected closeDrawer(): void {
    this.setDrawer(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.drawerOpen()) this.closeDrawer();
  }

  /** Scrolls to a home section, navigating to the home page first when needed. */
  protected async goTo(anchor: ShellAnchor): Promise<void> {
    this.closeDrawer();
    const path = this.router.url.split(/[?#]/)[0];
    if (path !== '/') {
      await this.router.navigateByUrl('/');
    }
    setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  private setDrawer(open: boolean): void {
    this.drawerOpen.set(open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
}
