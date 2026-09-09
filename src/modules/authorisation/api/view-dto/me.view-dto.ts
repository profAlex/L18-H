import { FlattenMaps, Types } from 'mongoose';
import { User, UserDocument } from '../../../user-accounts/domain/user.entity';
import { Type } from 'class-transformer';

export class MeViewDto {
    email: string;
    login: string;
    userId: string;

    constructor(userDto: User & { _id: Types.ObjectId }) {
        this.email = userDto.email;
        this.login = userDto.login;
        this.userId = userDto._id.toString();
    }

    static mapToView(userDto: User & { _id: Types.ObjectId }): MeViewDto {
        return new MeViewDto(userDto);
    }
}

export class SQLMeViewDto {
    email: string;
    login: string;
    userId: string;

    static mapToView(userRow: { userId: string; login: string; email: string }): SQLMeViewDto {
        const dto = new SQLMeViewDto();
        dto.email = userRow.email;
        dto.login = userRow.login;
        dto.userId = userRow.userId;
        return dto;
    }
}