import { UUIDGeneratorUtil } from '../../../core/uuid-generation/uuid.service';
import { UpdateSessionDto } from './dto/update-session.domain.dto';

export interface CreateUserSessionDomainDto {
    userId: string;
    deviceId: string;
    deviceName: string;
    deviceIp: string;
    issuedAt: Date;
    expiresAt: Date;
}

export class SQLUserSession {
    public id: string;
    public userId: string;
    public deviceId: string;
    public deviceName: string;
    public deviceIp: string;
    public issuedAt: Date;
    public expiresAt: Date;
    public createdAt: Date;
    public deletedAt: Date | null;

    private constructor() {}

    /**
     * Фабричный метод для создания нового экземпляра сессии при логине
     */
    static createInstance(dto: CreateUserSessionDomainDto): SQLUserSession {
        const session = new SQLUserSession();

        session.id = UUIDGeneratorUtil.generateUUID();
        session.userId = dto.userId;
        session.deviceId = dto.deviceId;
        session.deviceName = dto.deviceName;
        session.deviceIp = dto.deviceIp;
        session.issuedAt = dto.issuedAt;
        session.expiresAt = dto.expiresAt;
        session.createdAt = new Date();
        session.deletedAt = null;

        return session;
    }

    /**
     * Маппинг из сырых данных PostgreSQL (SQL query) в объект домена
     */
    static reconstruct(rawDataFromDb: any): SQLUserSession {
        const session = new SQLUserSession();

        session.id = rawDataFromDb.id;
        session.userId = rawDataFromDb.user_id;
        session.deviceId = rawDataFromDb.device_uuid;
        session.deviceName = rawDataFromDb.device_name;
        session.deviceIp = rawDataFromDb.device_ip;
        session.issuedAt = new Date(rawDataFromDb.issued_at);
        session.expiresAt = new Date(rawDataFromDb.expires_at);
        session.createdAt = new Date(rawDataFromDb.created_at);
        session.deletedAt = rawDataFromDb.deleted_at
            ? new Date(rawDataFromDb.deleted_at)
            : null;

        return session;
    }

    /**
     * Софт-удаление сессии (при разлогине или отзыве устройства)
     */
    makeDeleted(): void {
        if (this.deletedAt !== null) return;
        this.deletedAt = new Date();
    }

    /**
     * Обновление дат сессии при ротации Refresh token'а
     */
    updateSession(sessionPayload: UpdateSessionDto) {
        if (
            sessionPayload.issuedAt != null &&
            sessionPayload.issuedAt.getTime() > this.issuedAt.getTime()
        ) {
            this.issuedAt = sessionPayload.issuedAt;
        }
        if (
            sessionPayload.expiresAt != null &&
            sessionPayload.expiresAt.getTime() > this.expiresAt.getTime()
        ) {
            this.expiresAt = sessionPayload.expiresAt;
        }
    }

    /**
     * Проверка: просрочена ли сессия
     */
    isExpired(now: Date = new Date()): boolean {
        return this.expiresAt.getTime() <= now.getTime();
    }

    /**
     * Проверка: активна ли сессия
     */
    isActive(now: Date = new Date()): boolean {
        return this.deletedAt === null && !this.isExpired(now);
    }
}