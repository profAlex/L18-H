// import bcrypt from "bcrypt";
import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CryptoService {
    async generateHash(password: string): Promise<string | null> {
        try {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            return hash;
        } catch (error) {
            console.error('Error while generating hash:', error);
            return null;
        }
    }

    async checkPassword(
        password: string,
        hash: string,
    ): Promise<boolean | null> {
        try {
            const result = await bcrypt.compare(password, hash);
            return result;
        } catch (error) {
            console.error('Error while checking password:', error);
            return null;
        }
    }
}
