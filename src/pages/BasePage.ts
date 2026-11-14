import type { Page } from '@playwright/test';
import { NavBar } from '../components/NavBar';

/**
 * Page objects own locators and user actions. Assertions stay in the specs, so
 * a page object can be reused by any test without hiding what it verifies.
 */
export abstract class BasePage {
  readonly nav: NavBar;

  protected constructor(readonly page: Page) {
    this.nav = new NavBar(page);
  }
}
