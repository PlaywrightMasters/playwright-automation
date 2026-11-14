import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ProductCard } from '../components/ProductCard';
import type { ProductSort } from '../api/ProductsApi';

/** Catalogue landing page: product grid, search, sort and filters. */
export class HomePage extends BasePage {
  readonly productCards: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchReset: Locator;
  readonly searchCaption: Locator;
  readonly resultCount: Locator;
  readonly noResults: Locator;
  readonly sortSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.productCards = page.getByTestId(/^product-[0-9A-Z]{26}$/i);
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.searchCaption = page.getByTestId('search-caption');
    this.resultCount = page.getByTestId('search-result-count');
    this.noResults = page.getByTestId('no-results');
    this.sortSelect = page.getByTestId('sort');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.productNames.first().waitFor();
  }

  card(name: string): ProductCard {
    return new ProductCard(
      this.productCards.filter({
        has: this.page.getByTestId('product-name').getByText(name, { exact: true }),
      }),
    );
  }

  cardAt(index: number): ProductCard {
    return new ProductCard(this.productCards.nth(index));
  }

  /*
   * The app swaps a marker element (`*_started` → `*_completed`) around each
   * grid reload. Waiting on it is more reliable than on the network: the
   * catalogue calls use the HTTP QUERY method, which Playwright doesn't
   * report response events for.
   * The marker stays in the DOM afterwards, so it only proves the *first*
   * search/sort/filter after a page load finished; for chained actions,
   * assert the expected grid with a retrying `expect`.
   */

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchSubmit.click();
    await this.page.getByTestId('search_completed').waitFor();
  }

  async sortBy(sort: ProductSort): Promise<void> {
    await this.sortSelect.selectOption(sort);
    await this.page.getByTestId('sorting_completed').waitFor();
  }

  /** Ticks a category or sub-category checkbox in the filter sidebar. */
  async filterByCategory(name: string): Promise<void> {
    await this.page.getByRole('checkbox', { name, exact: true }).check();
    await this.page.getByTestId('filter_completed').waitFor();
  }

  async visibleNames(): Promise<string[]> {
    return (await this.productNames.allInnerTexts()).map((name) => name.trim());
  }
}
