import { User, UserDocument, UserModelType } from '../../domain/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { SQLUserViewDto, UserViewDto } from '../../api/view-dto/users.view-dto';
import { Injectable, NotFoundException } from '@nestjs/common';

// import { FilterQuery } from 'mongoose';
// import mongoose from 'mongoose';
// import type { FilterQuery } from 'mongoose'; // Явно указываем, что это тип
// import mongoose, { Types } from 'mongoose';
// import { FilterQuery } from 'mongoose/types/inferschematype';
// import mongoose from 'mongoose';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';
import { UserAuthInternalDto } from '../../../authorisation/dto/internal-dto/users.auth-internal-dto';
import { MeViewDto, SQLMeViewDto } from '../../../authorisation/api/view-dto/me.view-dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { DataSource } from 'typeorm';

interface UserDbRow {
    id: string;
    login: string;
    email: string;
    created_at: Date;
}

@Injectable()
export class UsersQueryRepository {
    constructor(
        @InjectModel(User.name)
        private UserModel: UserModelType,
        private readonly dataSource: DataSource,
    ) {}

    // async getByIdOrNotFoundFail(id: string): Promise<UserViewDto> {
    //     const user = await this.UserModel.findOne({
    //         _id: id,
    //         deletedAt: null,
    //     });
    //
    //     if (!user) {
    //         // throw new NotFoundException('user not found');
    //         throw new DomainException({
    //             code: DomainExceptionCode.UserNotFound,
    //             message: 'User not found',
    //         });
    //     }
    //
    //     return UserViewDto.mapToView(user);
    // }

    async SQLgetByIdOrNotFoundFail(id: string): Promise<SQLUserViewDto> {
        const [user] = await this.dataSource.query<UserDbRow[]>(`
            SELECT id, login, email, created_at
            FROM users
            WHERE id = $1 AND deleted_at IS NULL`,[id]);

        if (!user) {
            // throw new NotFoundException('user not found');
            throw new DomainException({
                code: DomainExceptionCode.UserNotFound,
                message: 'User not found',
            });
        }

        return SQLUserViewDto.mapFromDbRow(user);
    }

    async getMeByIdOrNotFoundFail(id: string): Promise<MeViewDto> {
        const user = await this.UserModel.findOne({
            _id: id,
            deletedAt: null,
        }).lean();

        if (!user) {
            // throw new NotFoundException('user not found');
            throw new DomainException({
                code: DomainExceptionCode.UserNotFound,
                message: 'User not found',
            });
        }

        return MeViewDto.mapToView(user);
    }

    async SQLgetMeByIdOrNotFoundFail(id: string): Promise<SQLMeViewDto> {
        // все алиасы без двойных кавычек принудительно приводятся к нижнему регистру (userid)!
        const meQuery = `
            SELECT id AS "userId", login, email
            FROM public."users"
            WHERE id = $1 AND deleted_at IS NULL;
        `;

        const [userRow] = await this.dataSource.query<{userId:string, login:string, email:string}[]>(meQuery, [id]);


        if (!userRow) {
            // throw new NotFoundException('user not found');
            throw new DomainException({
                code: DomainExceptionCode.UserNotFound,
                message: 'User not found',
            });
        }

        return SQLMeViewDto.mapToView(userRow);
    }

    // async getAllUsers(
    //     query: GetUsersQueryParams,
    // ): Promise<PaginatedViewDto<UserViewDto>> {
    //     const filter: Record<string, any> = {
    //         deletedAt: null,
    //     };
    //
    //     const orConditions: any[] = [];
    //
    //     // дальнейший блог if - это дополнительнве проверки в дополнение к дефолтным, назначаемым в классе GetBlogsQueryParams
    //     // 1) Если пользователь не ввел поисковое слово, query.searchNameTerm будет равен null.
    //     // В таком случае, если нет проверки if: программа попытается добавить в MongoDB условие
    //     // { name: { $regex: null } }. База либо вернет ошибку, либо (что хуже) попытается
    //     // найти документы, где имя буквально равно null.
    //     // С проверкой if(query.searchNameTerm) код просто не зайдет внутрь if, и массив $or
    //     // не создается. Запрос остается чистым.
    //
    //     // 2) Защита от пустых строк
    //     // Иногда пользователи присылают ?searchNameTerm=. В этом случае в DTO может попасть
    //     // пустая строка "".
    //     // if (query.searchNameTerm) отфильтрует это (так как пустая строка — это falsy),
    //     // и база не будет нагружена бесполезным поиском по пустому регулярному выражению.
    //     if (query.searchLoginTerm) {
    //         orConditions.push({
    //             login: { $regex: query.searchLoginTerm, $options: 'i' },
    //         });
    //     }
    //
    //     if (query.searchEmailTerm) {
    //         orConditions.push({
    //             email: { $regex: query.searchEmailTerm, $options: 'i' },
    //         });
    //     }
    //
    //     if (orConditions.length > 0) {
    //         filter.$or = orConditions;
    //     }
    //
    //     const users = await this.UserModel.find(filter)
    //         .sort({ [query.sortBy]: query.sortDirection })
    //         .skip(query.calculateSkip())
    //         .limit(query.pageSize);
    //
    //     const totalCount = await this.UserModel.countDocuments(filter);
    //
    //     const items = users.map(UserViewDto.mapToView);
    //
    //     return PaginatedViewDto.mapToView({
    //         items,
    //         totalCount,
    //         page: query.pageNumber,
    //         size: query.pageSize,
    //     });
    // }

    async getAllUsers(
        query: GetUsersQueryParams,
    ): Promise<PaginatedViewDto<UserViewDto>> {
        // массив SQL услоий для уточнения поиска WHERE
        const whereConditions: string[] = ['deleted_at IS NULL'];
        // массив для передачи значений в плейсхолдеры $1, $2 и далее
        const queryParams: any[] = [];
        // счетчик для нумерации, изменяется в зависимости от наличия переданных query параметров
        let paramIndex = 1;

        // условия $or для поиска по login или email (ILIKE = case-insensitive), присоединяются к whereConditions
        const orConditions: string[] = [];

        // таким образом обеспечивается защита от инъекций - первый массив содержит цифру, которая автоматически
        // инкрементится, второй массив содержит фактичесое значение квери-паарметра
        if (query.searchLoginTerm) {
            orConditions.push(`login ILIKE $${paramIndex}`);
            queryParams.push(`%${query.searchLoginTerm}%`);
            paramIndex++;
        }

        if (query.searchEmailTerm) {
            orConditions.push(`email ILIKE $${paramIndex}`);
            queryParams.push(`%${query.searchEmailTerm}%`);
            paramIndex++;
        }

        // объединяем все квери параметры в общую OR строку и засовываем ее в массив к WHERE
        // внимание! скобоки очень важны для правильной последовательности вычисления логических операторов
        if (orConditions.length > 0) {
            whereConditions.push(`(${orConditions.join(' OR ')})`);
        }

        // финальный шаг - теперь WHERE массив соединяем в общую AND строку с предыдущей
        const whereClause = whereConditions.join(' AND ');

        // вспомогательная мапа для защиты от инъекций при выборе ORDER BY (сортировка)
        // мы тут задаем все возможные корректные допустимые варианты, которые могут существуют по ТЗ
        // все несоответствиующие т.е. потенциальные инъекции просто не выберутся, т.к. не будут существовать в массиве
        const allowedSortColumns: Record<string, string> = {
            createdAt: 'created_at',
            login: 'login',
            email: 'email',
        };

        const sortByColumn = allowedSortColumns[query.sortBy] || 'created_at';
        const sortDirection = query.sortDirection && query.sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // параметры для условий LIMIT и OFFSET
        const offset = query.calculateSkip();
        const limit = query.pageSize;

        // aормируем SQL-запросы для получения элементов и общего количества
        const itemsQuery = `
            SELECT id, login, email, created_at
            FROM users
            WHERE ${whereClause}
            ORDER BY ${sortByColumn} ${sortDirection}
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
        `;

        const countQuery = `
            SELECT COUNT(*) ::int AS "totalCount"
            FROM users
            WHERE ${whereClause}
        `;

        // параллельно выполняем оба запроса к базе данных
        const [usersRows, countResult] = await Promise.all([
            this.dataSource.query<UserDbRow[]>(itemsQuery, [
                ...queryParams,
                limit,
                offset,
            ]),
            this.dataSource.query<{ totalCount: number }[]>(
                countQuery,
                queryParams,
            ),
        ]);

        const totalCount = countResult[0]?.totalCount ?? 0;

        // маппим плоские SQL-строки в DTO
        // const items = usersRows.map((row) => ({
        //     id: row.id,
        //     login: row.login,
        //     email: row.email,
        //     createdAt: row.created_at instanceof Date
        //         ? row.created_at.toISOString()
        //         : new Date(row.created_at).toISOString(),
        // }));

        // маппим плоские SQL-строки в DTO
        const items = usersRows.map(SQLUserViewDto.mapFromDbRow);

        return PaginatedViewDto.mapToView({
            items,
            totalCount,
            page: query.pageNumber,
            size: query.pageSize,
        });
    }

    async findUserByLogin(
        loginOrEmail: string,
    ): Promise<UserAuthInternalDto | null> {
        const user = await this.UserModel.findOne({
            $or: [{ login: loginOrEmail }, { email: loginOrEmail }],
            $and: [{ deletedAt: null }],
        })
            .select(
                '_id email passwordHash login isEmailConfirmed deletedAt name',
            )
            .lean();

        if (!user) {
            return null;
        }

        return UserAuthInternalDto.mapToView(user);
    }

    /* language = SQL */
    async SQLfindUserByLogin(
        loginOrEmail: string,
    ): Promise<{id:string, passwordHash:string} | null> {
        const query = `
            SELECT 
                id AS "id", 
                password_hash AS "passwordHash" 
            FROM users
            WHERE (login = $1 OR email = $1) AND deleted_at IS NULL; 
        `;

        const [usersRow] = await this.dataSource.query<{id:string, passwordHash:string}[]>(query,[loginOrEmail]);

        if (!usersRow) {
            return null;
        }

        return usersRow;
    }


    async checkIfUserExists(
        login: string,
        email: string,
    ): Promise<'login' | 'email' | null> {
        // Проверяем отдельно занят ли логин а потом емейл, т.к. логика платформенных тестов требует указания field: login при отсутствии логина,
        // поэтмоу разделяем ошибки, но можно попробовать вернуть всегда тут такую ошибку
        const loginCount = await this.UserModel.countDocuments({
            login: login,
            deletedAt: null,
        });
        if (loginCount > 0) return 'login';

        // прроверяем, занят ли email
        const emailCount = await this.UserModel.countDocuments({
            email: email,
            deletedAt: null,
        });
        if (emailCount > 0) return 'email';

        // ничего не занято
        return null;
    }

    // async checkIfUserExists(login: string, email: string): Promise<boolean> {
    //     return await this.UserModel.countDocuments({
    //         $or: [{login: login},{email: email}],
    //         deletedAt: null
    //     })>0;
    // }

    async findUserByConfirmationCode(
        confirmationCode: string,
    ): Promise<UserDocument | null> {
        return this.UserModel.findOne({
            $and: [
                { 'emailConfirmationInfo.confirmationCode': confirmationCode },
                {
                    'emailConfirmationInfo.expirationDate': {
                        $gte: new Date(),
                    },
                }, //Date.now() в JavaScript возвращает число (таймстамп в миллисекундах, например 1716924800000). Но в схеме Mongoose поле expirationDate имеет тип Date (хранится как полноценный ISODate объект).
                { deletedAt: null },
            ],
        });
    }

    async findConfirmedUserByEmail(
        sentEmail: string,
    ): Promise<UserDocument | null> {
        return this.UserModel.findOne({
            $and: [
                { email: sentEmail },
                { isEmailConfirmed: true },
                { deletedAt: null },
            ],
        });
    }

    async findUserByRecoveryCode(
        sentRevoceryCode: string,
    ): Promise<UserDocument | null> {
        return this.UserModel.findOne({
            $and: [
                { recoveryCode: sentRevoceryCode },
                { recoveryCodeExpirationDate: { $gte: new Date() } },
                { deletedAt: null },
            ],
        });
    }

    async findNotConfirmedByEmail(
        sentEmail: string,
    ): Promise<UserDocument | null> {
        return this.UserModel.findOne({
            $and: [
                { email: sentEmail },
                { isEmailConfirmed: false },
                { deletedAt: null },
            ],
        });
    }

}
