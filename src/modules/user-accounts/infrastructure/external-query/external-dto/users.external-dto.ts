import { User, UserDocument } from '../../../domain/user.entity';
import { Types } from 'mongoose';

export class UserExternalDto {
    id: string;
    login: string;
    email: string;
    createdAt: Date;
    firstName: string;
    lastName: string | null;

    constructor(user: User & { _id: Types.ObjectId }) {
        this.id = user.id || user._id.toString();
        this.login = user.login;
        this.email = user.email;

        this.createdAt =
            user.createdAt instanceof Date
                ? user.createdAt
                : new Date(user.createdAt);

        this.firstName = user.name?.firstName ?? '';
        this.lastName = user.name?.lastName ?? null;
    }

    static mapToView(user: User & { _id: Types.ObjectId }): UserExternalDto {
        return new UserExternalDto(user);
    }
}
