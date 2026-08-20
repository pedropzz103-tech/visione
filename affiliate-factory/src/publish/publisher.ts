import type {PublishReceipt, PublishRequest} from '../contracts/index.js';

export interface Publisher {
  publish(request: PublishRequest): Promise<PublishReceipt>;
}
