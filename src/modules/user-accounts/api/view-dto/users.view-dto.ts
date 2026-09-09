import { User, UserDocument } from '../../domain/user.entity';
import { Types } from 'mongoose';
import { SQLUser } from '../../domain/sql-user.entitry';

// export class UserViewDto {
//     id: string;
//     login: string;
//     email: string;
//     createdAt: string;
//
//     static mapToView(user: UserDocument): UserViewDto {
//         const dto = new UserViewDto();
//
//         dto.email = user.email;
//         dto.login = user.login;
//         dto.id = user._id.toString();
//         dto.createdAt = new Date(user.createdAt).toISOString();
//         //dto.firstName = user.name.firstName;
//         //dto.lastName = user.name.lastName;
//
//         return dto;
//     }
// }

interface UserDbRow {
    id: string;
    login: string;
    email: string;
    created_at: Date;
}

export class UserViewDto {
    id: string;
    login: string;
    email: string;
    createdAt: string;

    constructor(user: User & { _id: Types.ObjectId }) {
        this.email = user.email;
        this.login = user.login;
        this.id = user.id || user._id.toString();
        this.createdAt =
            user.createdAt instanceof Date
                ? user.createdAt.toISOString()
                : new Date(user.createdAt).toISOString();

        // this.firstName = user.name?.firstName;
        // this.lastName = user.name?.lastName;
    }

    static mapToView(user: User & { _id: Types.ObjectId }): UserViewDto {
        return new UserViewDto(user);
    }

}


export class SQLUserViewDto {
    id: string;
    login: string;
    email: string;
    createdAt: string;

    private constructor(data: { id: string; login: string; email: string; createdAt: string }) {
        this.id = data.id;
        this.login = data.login;
        this.email = data.email;
        this.createdAt = data.createdAt;
    }

    // Для сырых строк из PostgreSQL (snake_case)
    static mapFromDbRow(row: UserDbRow): SQLUserViewDto {
        return new SQLUserViewDto({
            id: row.id,
            login: row.login,
            email: row.email,
            createdAt: row.created_at instanceof Date
                ? row.created_at.toISOString()
                : new Date(row.created_at).toISOString(),
        });
    }

    // Для доменных объектов SQLUser (camelCase)
    static mapToView(user: SQLUser): SQLUserViewDto {
        return new SQLUserViewDto({
            id: user.id,
            login: user.login,
            email: user.email,
            createdAt: user.createdAt instanceof Date
                ? user.createdAt.toISOString()
                : new Date(user.createdAt).toISOString(),
        });
    }
}