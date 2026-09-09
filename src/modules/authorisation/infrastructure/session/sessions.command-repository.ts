import {
    Session,
    SessionDocument,
    SessionModelType,
} from '../../domain/session.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SQLUserSession } from '../../domain/sql-session.entity';

export type SessionParameters = {
    userId: string;
    deviceId: string;
    expiresAt: Date;
    issuedAt: Date;
};

type SoftDeleteSessionsParams = {
    userId: string;
    sessionId: string;
};

@Injectable()
export class SessionsCommandRepository {
    constructor(
        @InjectModel(Session.name) private SessionModel: SessionModelType,
        @InjectDataSource() protected dataSource: DataSource,
    ) {}

    async save(session: SessionDocument): Promise<void> {
        await session.save();
    }

    async SQLsave(session: SQLUserSession): Promise<void> {
        const query = `
            INSERT INTO public."user_sessions" ("id",
                                                "user_id",
                                                "device_uuid",
                                                "device_name",
                                                "device_ip",
                                                "issued_at",
                                                "expires_at",
                                                "created_at",
                                                "deleted_at")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT ("id") DO
            UPDATE SET
                "issued_at" = EXCLUDED."issued_at",
                "expires_at" = EXCLUDED."expires_at",
                "deleted_at" = EXCLUDED."deleted_at";
        `;

        const parameters = [
            session.id,
            session.userId,
            session.deviceId,
            session.deviceName,
            session.deviceIp,
            session.issuedAt,
            session.expiresAt,
            session.createdAt,
            session.deletedAt,
        ];

        await this.dataSource.query(query, parameters);
    }

    async toTestCreateDb() {
        // // return this.dataSource.query(`CREATE DATABASE "Sprint17"
        // // WITH
        // // OWNER = neondb_owner
        // // ENCODING = 'UTF8'
        // // LOCALE_PROVIDER = 'builtin'
        // // CONNECTION LIMIT = -1
        // // IS_TEMPLATE = False;`);
        //
        // return this.dataSource.query(`CREATE TABLE IF NOT EXISTS "users" (
        //     "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        //     "login" VARCHAR(255) NOT NULL UNIQUE,
        //     "password_hash" VARCHAR(255) NOT NULL,
        //     "email" VARCHAR(255) NOT NULL UNIQUE,
        //     "first_name" VARCHAR(255) NOT NULL,
        //     "last_name" VARCHAR(255) NULL,
        //     "is_email_confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
        //     "email_confirmation_code" VARCHAR(255) NULL,
        //     "email_confirmation_expiration_date" TIMESTAMPTZ NULL,
        //     "recovery_code" VARCHAR(255) NULL,
        //     "recovery_code_expiration_date" TIMESTAMPTZ NULL,
        //     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        //     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        //     "deleted_at" TIMESTAMPTZ NULL
        // );
        //
        // -- Частичный уникальный индекс для recovery_code (чтобы NULL не считался дубликатом)
        // CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_recovery_code_unique"
        // ON "users" ("recovery_code")
        // WHERE "recovery_code" IS NOT NULL;
        //
        //
        // -- 2. Таблица сессий девайсов
        // CREATE TABLE IF NOT EXISTS "user_sessions" (
        //     "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        //     "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        //     "device_uuid" UUID NOT NULL,
        //     "device_name" VARCHAR(255) NOT NULL,
        //     "device_ip" VARCHAR(45) NOT NULL,
        //     "issued_at" TIMESTAMPTZ NOT NULL,
        //     "expires_at" TIMESTAMPTZ NOT NULL,
        //     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        //     "deleted_at" TIMESTAMPTZ NULL
        // );
        //
        // -- Индекс для быстрого поиска всех сессий конкретного юзера
        // CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_id" ON "user_sessions" ("user_id");`);
    }

    async toTestQuery() {
        return this.dataSource.query(`SELECT *
                                      FROM public."Profiles"`);
    }

    async findSessionBySessionId(
        sessionId: string,
    ): Promise<SessionDocument | null> {
        return this.SessionModel.findOne({
            _id: sessionId,
            deletedAt: null,
        }).exec();
        // Без .exec() Mongoose возвращает так называемый Query (объект-обещание), который ведет себя как Promise,
        // но им не является. Вызов .exec() превращает его в полноценный нативный JavaScript Promise.
        // Это дает более чистые и понятные стек-трейсы ошибок (stack traces), если база данных начнет сбоить,
        // и исключает странные баги с типизацией в некоторых версиях TypeScript.
    }

    async SQLfindSessionBySessionId(
        sessionId: string,
    ): Promise<SQLUserSession | null> {
        const query = `
            SELECT "id",
                   "user_id",
                   "device_uuid",
                   "device_name",
                   "device_ip",
                   "issued_at",
                   "expires_at",
                   "created_at",
                   "deleted_at"
            FROM public."user_sessions"
            WHERE "id" = $1
              AND "deleted_at" IS NULL;
        `;

        const [sessionRow] = await this.dataSource.query(query, [sessionId]);

        if (!sessionRow) {
            return null;
        }

        return SQLUserSession.reconstruct(sessionRow);
    }

    async findSessionByDeviceId(
        deviceUUID: string,
    ): Promise<SessionDocument | null> {
        return this.SessionModel.findOne({
            deviceUUID: deviceUUID, // проверьте имя поля в схеме (deviceUUID или deviceId)
            deletedAt: null,
        }).exec();
    }


    async SQLfindSessionByDeviceId(
        deviceId: string,
    ): Promise<SQLUserSession | null> {
        const query = `
            SELECT "id",
                   "user_id",
                   "device_uuid",
                   "device_name",
                   "device_ip",
                   "issued_at",
                   "expires_at",
                   "created_at",
                   "deleted_at"
            FROM public."user_sessions"
            WHERE "device_uuid" = $1
              AND "deleted_at" IS NULL;
        `;

        const [sessionRow] = await this.dataSource.query(query, [deviceId]);

        if (!sessionRow) {
            return null;
        }

        return SQLUserSession.reconstruct(sessionRow);
    }

    // async removeAllButOneSession(
    //     sessionId: string,
    //     userId: string,
    // ): Promise<SessionDocument[] | null> {
    //     const result = await this.SessionModel.find({
    //         userId: userId,
    //         _id: { $ne: sessionId },
    //     }).exec();
    //
    //     // перенести это в соответствующий юзкейс
    //     // sessions.forEach((session: SessionDocument) => {session.makeDeleted()});
    //     // await Promise.all(sessions.map((session) => session.save()));
    //
    //     return result.length ? result : null;
    // }

    // это более ресурсосберегающий вариант removeAllButOneSession выше, операция без вызова отдельного .makeDeleted и .save(), т.н. атомарная
    async softDeleteAllButOneSession({
        sessionId,
        userId,
    }: SoftDeleteSessionsParams): Promise<boolean> {
        const result = await this.SessionModel.updateMany(
            {
                userId: userId,
                _id: { $ne: new Types.ObjectId(sessionId) },
                deletedAt: null, // помечаем только те, что еще не были удалены
            },
            {
                $set: { deletedAt: new Date() },
            },
        ).exec();

        return result.modifiedCount > 0;
    }

    async SQLsoftDeleteAllButOneSession({
        sessionId,
        userId,
    }: SoftDeleteSessionsParams): Promise<boolean> {
        const query = `
            UPDATE public."user_sessions"
            SET "deleted_at" = NOW()
            WHERE "user_id" = $1
              AND "id" <> $2
              AND "deleted_at" IS NULL RETURNING "id";
        `;

        const updatedRows = await this.dataSource.query<{ id: string }[]>(
            query,
            [userId, sessionId],
        );

        return updatedRows.length > 0;
    }
}
