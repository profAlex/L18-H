import { User, UserDocument } from '../../../user-accounts/domain/user.entity';
import { Require_id, Types } from 'mongoose';

// export class UserAuthInternalDto
// {
//     id: string;
//     email: string;
//     passwordHash: string;
//     login: string;
//     isEmailConfirmed: boolean;
//     deletedAt: Date | null;
//     name: {firstName: string; lastName: string | null};
//
//     static mapToView(user: Require_id<User>): UserAuthInternalDto{
//         const newDtoUser = new UserAuthInternalDto();
//
//         newDtoUser.id = user._id.toString();
//         newDtoUser.email = user.email;
//         newDtoUser.passwordHash = user.passwordHash;
//         newDtoUser.login = user.login;
//         newDtoUser.isEmailConfirmed = user.isEmailConfirmed;
//         newDtoUser.deletedAt = user.deletedAt;
//         newDtoUser.name = {
//             firstName: user.name?.firstName ?? '',
//             lastName: user.name?.lastName ?? null,
//         }
//
//         return newDtoUser;
//     };
// }

export class UserAuthInternalDto {
    id: string;
    email: string;
    passwordHash: string;
    login: string;
    isEmailConfirmed: boolean;
    deletedAt: Date | null;
    name: { firstName: string; lastName: string | null };

    constructor(user: User & { _id: Types.ObjectId }) {
        this.id = user.id || user._id.toString();
        this.email = user.email;
        this.passwordHash = user.passwordHash;
        this.login = user.login;
        this.isEmailConfirmed = user.isEmailConfirmed;

        this.deletedAt = user.deletedAt instanceof Date ? user.deletedAt : null;

        this.name = {
            firstName: user.name?.firstName ?? '',
            lastName: user.name?.lastName ?? null,
        };
    }

    static mapToView(
        user: User & { _id: Types.ObjectId },
    ): UserAuthInternalDto {
        return new UserAuthInternalDto(user);
    }
}


export class SQLUserAuthInternalDto {
    id: string;
    email: string;
    passwordHash: string;
    login: string;
    isEmailConfirmed: boolean;
    deletedAt: Date | null;
    name: { firstName: string; lastName: string | null };

    constructor(user: User & { _id: Types.ObjectId }) {
        this.id = user.id || user._id.toString();
        this.email = user.email;
        this.passwordHash = user.passwordHash;
        this.login = user.login;
        this.isEmailConfirmed = user.isEmailConfirmed;

        this.deletedAt = user.deletedAt instanceof Date ? user.deletedAt : null;

        this.name = {
            firstName: user.name?.firstName ?? '',
            lastName: user.name?.lastName ?? null,
        };
    }

    static mapToView(
        user: User & { _id: Types.ObjectId },
    ): UserAuthInternalDto {
        return new UserAuthInternalDto(user);
    }
}
