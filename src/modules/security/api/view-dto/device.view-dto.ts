import { Session } from '../../../authorisation/domain/session.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { FlattenMaps } from 'mongoose';

// вспомогательная утилита, заменяющая простой Date на Date|string, чтобы нельзя было применить
// методы например toISOString там где теоретически может прилететь простой string
// и поймать undefined. т.е. это защита от дурака такая
export type ToLean<T> = {
    [K in keyof FlattenMaps<T>]: FlattenMaps<T>[K] extends Date
        ? Date | string
        : FlattenMaps<T>[K];
};

export class DeviceViewDto {
    ip: string;
    title: string; //user-agent

    lastActiveDate: string; //token's issueddAt field
    deviceId: string;

    constructor(session: ToLean<Session>) {
        this.ip = session.deviceIp;
        this.title = session.deviceName;

        // кастим к Date (работает и для Date, и для ISO-строк), т.к. после .lean(), поле issuedAt из базы Mongoose/MongoDB может прийти как string, а не как объект Date
        const issuedAtDate = new Date(session.issuedAt);
        if (isNaN(issuedAtDate.getTime())) {
            throw new InternalServerErrorException(
                `Corrupted session date for device ${session.deviceUUID}`,
            );
        }

        this.lastActiveDate = issuedAtDate.toISOString();
        // this.lastActiveDate = session.issuedAt.toISOString();
        this.deviceId = session.deviceUUID;
    }

    static mapToView(session: ToLean<Session>): DeviceViewDto {
        return new DeviceViewDto(session);
    }
}


export class SQLDeviceViewDto {
    ip: string;
    title: string;
    lastActiveDate: string;
    deviceId: string;

    constructor(sessionRow: {
        device_ip: string;
        device_name: string;
        issued_at: Date | string;
        device_uuid: string;
    }) {
        this.ip = sessionRow.device_ip;
        this.title = sessionRow.device_name;

        const issuedAtDate = new Date(sessionRow.issued_at);
        if (isNaN(issuedAtDate.getTime())) {
            throw new InternalServerErrorException(
                `Corrupted session date for device ${sessionRow.device_uuid}`,
            );
        }

        this.lastActiveDate = issuedAtDate.toISOString();
        this.deviceId = sessionRow.device_uuid;
    }

    static mapToView(sessionRow: {
        device_ip: string;
        device_name: string;
        issued_at: Date | string;
        device_uuid: string;
    }): SQLDeviceViewDto {
        return new SQLDeviceViewDto(sessionRow);
    }
}