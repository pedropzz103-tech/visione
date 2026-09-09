export interface ProductHunter {
  discover(): Promise<never>;
}

export class ProductHunterDisabledError extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = 'ProductHunterDisabledError';
  }
}

export class DisabledShopeeProductHunter implements ProductHunter {
  public async discover(): Promise<never> {
    throw new ProductHunterDisabledError(
      'SHOPEE_AUTOMATED_DISCOVERY_NOT_AUTHORIZED'
    );
  }
}
