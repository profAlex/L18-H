import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { BlogViewDto, SQLBlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { Blog, BlogDocument, BlogModelType } from '../../domain/blog.entity';
// import {FilterQuery, ObjectId} from "mongoose";
// import { type FilterQuery } from 'mongoose';
import { GetBlogsQueryParams } from '../../api/input-dto/get-blogs-query-params.input-dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SortDirection } from '../../../../../core/dto/base.query-params.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { DataSource } from 'typeorm';

interface RawBlogData {
    id: string;
    name: string;
    description: string;
    website_url: string;
    created_at: string | Date;
    is_membership: boolean;
}

@Injectable()
export class BlogsQueryRepository {
    constructor(@InjectModel(Blog.name) private BlogModel: BlogModelType,
                private readonly dataSource: DataSource,) {}

    async getBlogName(sentBlogId: string) {
        return this.BlogModel.findOne({ _id: sentBlogId, deletedAt: null })
            .select('name')
            .lean();
    }

    async getAllBlogs(
        query: GetBlogsQueryParams,
    ): Promise<PaginatedViewDto<BlogViewDto>> {
        const filter: Record<string, any> = {
            deletedAt: null,
        };

        // структура хранилища blogs
        //     _id: ObjectId;
        //     id: string;
        //     name: string;
        //     description: string;
        //     websiteUrl: string;
        //     createdAt: Date;
        //     isMembership: boolean;

        // структура GetBlogsQueryParams
        // sortBy = BlogsSortBy.CreatedAt;
        // searchNameTerm: string | null = null;
        // pageNumber: number = 1;
        // pageSize: number = 10;
        // sortDirection: SortDirection = SortDirection.Desc;

        // дальнейший блог if - это дополнительнве проверки в дополнение к дефолтным, назначаемым в классе GetBlogsQueryParams
        // 1) Если пользователь не ввел поисковое слово, query.searchNameTerm будет равен null.
        // В таком случае, если нет проверки if: программа попытается добавить в MongoDB условие
        // { name: { $regex: null } }. База либо вернет ошибку, либо (что хуже) попытается
        // найти документы, где имя буквально равно null.
        // С проверкой if(query.searchNameTerm) код просто не зайдет внутрь if, и массив $or
        // не создается. Запрос остается чистым.

        // 2) Защита от пустых строк
        // Иногда пользователи присылают ?searchNameTerm=. В этом случае в DTO может попасть
        // пустая строка "".
        // if (query.searchNameTerm) отфильтрует это (так как пустая строка — это falsy),
        // и база не будет нагружена бесполезным поиском по пустому регулярному выражению.

        const orConditions: any[] = [];

        if (query.searchNameTerm) {
            orConditions.push({
                name: { $regex: query.searchNameTerm, $options: 'i' },
            });
        }

        if (orConditions.length > 0) {
            filter.$or = orConditions;
        }
        //
        // if (query.searchNameTerm) {
        //     filter.$or = filter.$or || [];
        //     filter.$or.push({
        //         name: { $regex: query.searchNameTerm, $options: 'i' },
        //     });
        // }

        // const sortDirection =
        //     query.sortDirection === SortDirection.Asc ? 1 : -1;
        //
        // const sortByField = query.sortBy.toString(); // Жестко приводим к строке
        //
        // console.log('sortDirection field: ', query.sortDirection);
        // console.log('sortByField field: ', query.sortBy);
        //
        // const blogs = await this.BlogModel.find(filter)
        //     .sort({ [sortByField]: sortDirection }) // Используем чистую строку
        //     .skip(query.calculateSkip())
        //     .limit(query.pageSize);
        const blogs = await this.BlogModel.find(filter)
            .sort({
                [query.sortBy]:
                    query.sortDirection === SortDirection.Asc ? 1 : -1,
            })
            .skip(query.calculateSkip())
            .limit(query.pageSize);

        const totalCount = await this.BlogModel.countDocuments(filter);

        const items = blogs.map(BlogViewDto.mapToView);

        return PaginatedViewDto.mapToView<BlogViewDto>({
            items: items,
            page: query.pageNumber,
            size: query.pageSize,
            totalCount: totalCount,
        });
    }

    async SQLgetAllBlogs(
        query: GetBlogsQueryParams,
    ): Promise<PaginatedViewDto<BlogViewDto>> {

        const whereConditions: string[] = [`deleted_at IS NULL`];
        const orConditions: string[] = [];
        const queryParams: any[] = [];
        let indexParamCounter: number = 1;

        if(query.searchNameTerm && query.searchNameTerm.trim() !== '') {
            orConditions.push(`name ILIKE $${indexParamCounter}`);
            queryParams.push(`%${query.searchNameTerm}%`);
            indexParamCounter += 1;
        }

        if(orConditions.length > 0) {
            whereConditions.push(`(${orConditions.join(' OR ')})`); // хоть тут и один параметр максимум, но на случай если их количество изменится все равно сделаю join
        }

        const whereClause = whereConditions.join(' AND ');

        const auxSortingMapper: Record<string, string> = {
            name: 'name',
            description: 'description',
            websiteUrl: 'website_url',
            createdAt: 'created_at',
            isMembership: 'is_membership',
        };

        const sortByColumn = auxSortingMapper[query.sortBy] || 'created_at';
        const sortDirection = query.sortDirection && query.sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const offset = query.calculateSkip();
        const limit = query.pageSize;

        const itemsQuery = `
            SELECT 
                id,
                name,
                description,
                website_url,
                created_at,
                is_membership
            FROM blogs
            WHERE ${whereClause}
            ORDER BY ${sortByColumn} ${sortDirection}
            LIMIT $${indexParamCounter}
            OFFSET $${indexParamCounter+1}
        `;

        const countQuery = `
            SELECT COUNT(*) ::int AS "totalCount"
            FROM blogs
            WHERE ${whereClause}
        `;

        const [blogsRows, countResult] = await Promise.all([
            this.dataSource.query<RawBlogData[]>(itemsQuery, [
                ...queryParams,
                limit,
                offset,
            ]),
            this.dataSource.query<{ totalCount: number }[]>(
                countQuery,
                queryParams,
            ),
        ]);

        const items = blogsRows.map(SQLBlogViewDto.mapFromDbRaw);
        const totalCount = countResult[0]?.totalCount ?? 0;

        return PaginatedViewDto.mapToView<SQLBlogViewDto>({
            items: items,
            page: query.pageNumber,
            size: query.pageSize,
            totalCount: totalCount,
        });
    }

    async getBlogByIdOrNotFoundFail(blogId: string): Promise<BlogViewDto> {
        const blog = await this.BlogModel.findOne({
            _id: blogId,
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        }).lean();

        if (!blog) {
            // throw new NotFoundException('Blog not found');
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: `Blog not found`,
            });
        }
        return BlogViewDto.mapToView(blog);
    }

    async ifBlogExists(blogId: string): Promise<boolean> {
        const count = await this.BlogModel.countDocuments({
            _id: blogId,
            deletedAt: null,
        });

        return count > 0;
    }

    async SQLifBlogExists(blogId: string): Promise<boolean> {

        const query = ` 
            SELECT EXISTS (
                SELECT 1
                FROM public.blogs
                WHERE id = $1 AND deleted_at IS NULL
            ) as exists;
        `;

        const [resultRow] = await this.dataSource.query<{exists: boolean}[]>(query, [blogId]);

        // если вдруг по какой-то причине драйвер вернет пустой массив, тогда просто nest выдаст 500
        // Boolean(...): Гарантирует, что метод всегда вернет строго true или false (boolean), даже если СУБД вернет 1/0 или "true"/"false"
        return Boolean(resultRow?.exists);
    }
}
