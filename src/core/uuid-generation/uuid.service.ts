import { randomUUID } from 'crypto';

export class UUIDGeneratorUtil {
    static generateUUID(): string {
        return randomUUID();
    }
}