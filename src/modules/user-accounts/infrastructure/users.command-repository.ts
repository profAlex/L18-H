import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModelType } from '../domain/user.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { DataSource } from 'typeorm';
import { SQLUser } from '../domain/sql-user.entitry';


interface UserDbRow {
    id: string;
    login: string;
    email: string;
    created_at: Date;
}


@Injectable()
export class UsersCommandRepository {
    //инжектирование модели через DI
    constructor(
        @InjectModel(User.name) private UserModel: UserModelType,
        private readonly dataSource: DataSource,
    ) {}

    async findById(id: string): Promise<UserDocument | null> {
        return this.UserModel.findOne({
            _id: id,
            deletedAt: null,
        });
    }

    async save(user: UserDocument) {
        // console.log("<----------------TEST HERE 5");

        await user.save();
        // console.log("<----------------TEST HERE 6");
    }

    //

    /* language=PostgreSQL */
    async SQLsave(user: SQLUser): Promise<void> {
        const query = `
            INSERT INTO users (id,
                               login,
                               email,
                               password_hash,
                               is_email_confirmed,
                               email_confirmation_code,
                               email_confirmation_expiration_date,
                               first_name,
                               last_name,
                               created_at,
                               updated_at,
                               deleted_at,
                               recovery_code,
                               recovery_code_expiration_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            ON CONFLICT (id) DO
            UPDATE SET
                is_email_confirmed = EXCLUDED.is_email_confirmed,
                email_confirmation_code = EXCLUDED.email_confirmation_code,
                email_confirmation_expiration_date = EXCLUDED.email_confirmation_expiration_date,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
        `;

        const queryParams = [
            user.id,
            user.login,
            user.email,
            user.passwordHash,
            user.isEmailConfirmed,
            user.emailConfirmationInfo.confirmationCode,
            user.emailConfirmationInfo.expirationDate,
            user.name.firstName,
            user.name.lastName,
            user.createdAt,
            user.updatedAt,
            user.deletedAt,
            user.recoveryCode,
            user.recoveryCodeExpirationDate,
        ];

        // console.log("query formed successfully");

        await this.dataSource.query(query, queryParams);
    }

    async findOrNotFoundFail(id: string): Promise<UserDocument> {
        const user = await this.UserModel.findOne({ _id: id, deletedAt: null });

        if (!user) {
            // throw new NotFoundException('user not found');
            throw new DomainException({
                code: DomainExceptionCode.UserNotFound,
                message: 'User not found',
            });
        }

        return user;
    }

    async SQLfindOrNotFoundFail(id: string): Promise<SQLUser> {
        const [userRow] = await this.dataSource.query<UserDbRow[]>(
            `
                SELECT *
                FROM users
                WHERE id = $1
                  AND deleted_at IS NULL
            `,
            [id],
        );

        if (!userRow) {
            throw new DomainException({
                code: DomainExceptionCode.UserNotFound,
                message: 'User not found',
            });
        }

        // Воссоздаем доменный объект из строки БД
        return SQLUser.reconstruct(userRow);
    }


    async SQLfindConfirmedUserByEmail(email: string): Promise<SQLUser | null> {
        const query = `
            SELECT 
                "id",
                "login",
                "email",
                "password_hash",
                "created_at",
                "is_email_confirmed",
                "email_confirmation_code",
                "email_confirmation_expiration_date",
                "recovery_code",
                "recovery_code_expiration_date"
            FROM public."users"
            WHERE "email" = $1 AND "is_email_confirmed" = true;
        `;

        const [userRow] = await this.dataSource.query(query, [email]);

        if (!userRow) {
            return null;
        }

        return SQLUser.reconstruct(userRow);
    }


    async SQLfindUserByRecoveryCode(recoveryCode: string): Promise<SQLUser | null> {
        const query = `
            SELECT 
                "id",
                "login",
                "email",
                "password_hash",
                "created_at",
                "is_email_confirmed",
                "email_confirmation_code",
                "email_confirmation_expiration_date",
                "recovery_code",
                "recovery_code_expiration_date",
                "deleted_at"
            FROM public."users"
            WHERE "recovery_code" = $1
              AND "recovery_code_expiration_date" >= NOW()
              AND "deleted_at" IS NULL;
        `;

        const [userRow] = await this.dataSource.query(query, [recoveryCode]);

        if (!userRow) {
            return null;
        }

        return SQLUser.reconstruct(userRow);
    }


    async SQLfindUserByConfirmationCode(
        confirmationCode: string,
    ): Promise<SQLUser | null> {
        const query = `
            SELECT
                "id",
                "login",
                "email",
                "password_hash",
                "first_name",
                "last_name",
                "created_at",
                "updated_at",
                "is_email_confirmed",
                "email_confirmation_code",
                "email_confirmation_expiration_date",
                "recovery_code",
                "recovery_code_expiration_date",
                "deleted_at"
            FROM public."users"
            WHERE "email_confirmation_code" = $1
              AND "email_confirmation_expiration_date" >= NOW()
              AND "deleted_at" IS NULL;
        `;

        const [userRow] = await this.dataSource.query(query, [confirmationCode]);

        if (!userRow) {
            return null;
        }

        return SQLUser.reconstruct(userRow);
    }


    async SQLcheckIfUserExists(
        login: string,
        email: string,
    ): Promise<'login' | 'email' | null> {
        const checkLoginQuery = `
            SELECT EXISTS (
                SELECT 1 
                FROM public."users" 
                WHERE "login" = $1 AND "deleted_at" IS NULL
            ) as "exists";
        `;
        const [loginResult] = await this.dataSource.query<{ exists: boolean }[]>(
            checkLoginQuery,
            [login],
        );

        if (loginResult?.exists) {
            return 'login';
        }

        const checkEmailQuery = `
            SELECT EXISTS (
                SELECT 1 
                FROM public."users" 
                WHERE "email" = $1 AND "deleted_at" IS NULL
            ) as "exists";
        `;
        const [emailResult] = await this.dataSource.query<{ exists: boolean }[]>(
            checkEmailQuery,
            [email],
        );

        if (emailResult?.exists) {
            return 'email';
        }

        return null;
    }


    async SQLfindNotConfirmedByEmail(sentEmail: string): Promise<SQLUser | null> {
        const query = `
            SELECT *
            FROM public.users
            WHERE email = $1
              AND is_email_confirmed = false
              AND deleted_at IS NULL
                LIMIT 1;
        `;

        const [rawDataFromDb] = await this.dataSource.query(query, [sentEmail]);

        if (!rawDataFromDb) {
            return null;
        }

        return SQLUser.reconstruct(rawDataFromDb);
    }
}
