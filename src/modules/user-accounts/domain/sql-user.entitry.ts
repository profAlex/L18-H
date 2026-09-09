import { CreateUserDomainDto } from './dto/create-user.domain.dto';
import { UUIDGeneratorUtil } from '../../../core/uuid-generation/uuid.service';
import { UpdateUserDto } from '../dto/create-user.dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

export interface UserName {
    firstName: string;
    lastName: string;
}

export interface EmailConfirmationInfo {
    confirmationCode: string | null;
    expirationDate: Date | null;
}

export class SQLUser {
    public id: string;
    public login: string;
    public passwordHash: string;
    public email: string;
    public isEmailConfirmed: boolean;
    public emailConfirmationInfo: EmailConfirmationInfo;
    public name: UserName;
    public createdAt: Date;
    public updatedAt: Date;
    public deletedAt: Date | null;
    public recoveryCode: string | null;
    public recoveryCodeExpirationDate: Date | null;

    private constructor() {}

    static createInstance(dto: CreateUserDomainDto): SQLUser {
        const user = new SQLUser();

        user.id = UUIDGeneratorUtil.generateUUID();
        user.login = dto.login;
        user.email = dto.email;
        user.passwordHash = dto.passwordHash;
        user.isEmailConfirmed = false;

        user.emailConfirmationInfo = {
            confirmationCode: dto.confirmationCode,
            expirationDate: new Date(
                new Date().setMinutes(new Date().getMinutes() + 30),
            ), //TODO: 30 вынести в environment переменную
        };

        user.name = {
            firstName: 'firstname_xxx',
            lastName: 'lastname_yyy',
        };

        user.createdAt = new Date();
        user.updatedAt = new Date();
        user.deletedAt = null;
        user.recoveryCode = null;
        user.recoveryCodeExpirationDate = null;

        return user;
    }

    static reconstruct(rawDataFromDb: any): SQLUser {
        const user = new SQLUser();

        user.id = rawDataFromDb.id;
        user.login = rawDataFromDb.login;
        user.email = rawDataFromDb.email;
        user.passwordHash = rawDataFromDb.password_hash;
        user.isEmailConfirmed = rawDataFromDb.is_email_confirmed;

        user.emailConfirmationInfo = {
            confirmationCode: rawDataFromDb.email_confirmation_code,
            expirationDate: rawDataFromDb.email_confirmation_expiration_date
                ? new Date(rawDataFromDb.email_confirmation_expiration_date)
                : null,
        };

        user.name = {
            firstName: rawDataFromDb.first_name,
            lastName: rawDataFromDb.last_name,
        };

        user.createdAt = new Date(rawDataFromDb.created_at);
        user.updatedAt = new Date(rawDataFromDb.updated_at);
        user.deletedAt = rawDataFromDb.deleted_at
            ? new Date(rawDataFromDb.deleted_at)
            : null;
        user.recoveryCode = rawDataFromDb.recovery_code;
        user.recoveryCodeExpirationDate =
            rawDataFromDb.recovery_code_expiration_date
                ? new Date(rawDataFromDb.recovery_code_expiration_date)
                : null;

        return user;
    }

    makeDeleted() {
        if (this.deletedAt !== null) return;
        this.deletedAt = new Date();
        this.updatedAt = new Date();
    }

    update(dto: UpdateUserDto) {
        if (dto.email && dto.email !== this.email) {
            this.isEmailConfirmed = false;
            this.email = dto.email;
            this.updatedAt = new Date();
        }
    }


    generateConfirmationCode(newConfirmationCode: string): void {
        if (!this.isEmailConfirmed) {
            this.emailConfirmationInfo.confirmationCode = newConfirmationCode;
            this.emailConfirmationInfo.expirationDate = new Date(Date.now() + 30 * 60 * 1000);
            this.updatedAt = new Date();
        }
    }

    confirmEmail() {
        if (this.isEmailConfirmed === true) {
            throw new DomainException({
                code: DomainExceptionCode.BadRequest,
                message: 'Email is already confirmed!',
            });
        }

        this.isEmailConfirmed = true;
        this.emailConfirmationInfo.confirmationCode = null;
        this.emailConfirmationInfo.expirationDate = null;
        this.updatedAt = new Date();
    }

    generateRecoveryCode(recoveryCode: string) {
        if (this.isEmailConfirmed === true) {
            this.recoveryCode = recoveryCode;
            this.recoveryCodeExpirationDate = new Date(new Date().setMinutes(new Date().getMinutes() + 30));
            this.updatedAt = new Date();
        }
    }

    updatePasswordHash(newPasswordHash: string) {
        this.passwordHash = newPasswordHash;
        this.recoveryCodeExpirationDate = null;
        this.recoveryCode = null;
        this.updatedAt = new Date();
    }

}
