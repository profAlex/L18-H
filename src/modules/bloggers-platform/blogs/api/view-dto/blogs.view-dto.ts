//
// //     _id: ObjectId;
// //     id: string;
// //     name: string;
// //     description: string;
// //     websiteUrl: string;
// //     createdAt: Date;
// //     isMembership: boolean;
// import {BlogDocument} from "../../domain/blog.entity";
//
// export class BlogViewDto {
//     id: string;
//     name: string;
//     description: string;
//     websiteUrl: string;
//     createdAt: Date;
//     isMembership: boolean;
//
//     static mapToView(blog: any): BlogViewDto {
//         return {
//             id: blog._id ? blog._id.toString() : blog.id,
//             name: blog.name,
//             description: blog.description,
//             websiteUrl: blog.websiteUrl,
//             createdAt: blog.createdAt instanceof Date
//                 ? blog.createdAt.toISOString()
//                 : blog.createdAt,
//             isMembership: blog.isMembership
//         };
//     }
// }

//     _id: ObjectId;
//     id: string;
//     name: string;
//     description: string;
//     websiteUrl: string;
//     createdAt: Date;
//     isMembership: boolean;
import { Blog, BlogDocument } from '../../domain/blog.entity';
import { Types } from 'mongoose';
import { SQLBlog } from '../../domain/sql-blog.entity';

export class BlogViewDto {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    createdAt: string;
    isMembership: boolean;

    constructor(blog: Blog & { _id: Types.ObjectId }) {
        this.id = blog.id || blog._id.toString();
        this.name = blog.name;
        this.description = blog.description;
        this.websiteUrl = blog.websiteUrl;
        this.createdAt =
            blog.createdAt instanceof Date
                ? blog.createdAt.toISOString()
                : new Date(blog.createdAt).toISOString();
        // if (
        //     blog.createdAt instanceof Date &&
        //     !isNaN(blog.createdAt.getTime())
        // ) {
        //     this.createdAt = blog.createdAt.toISOString();
        // } else {
        //     // Если прилетела строка, пробуем её распарсить
        //     const parsedDate = new Date(blog.createdAt);
        //     this.createdAt = !isNaN(parsedDate.getTime())
        //         ? parsedDate.toISOString()
        //         : new Date().toISOString(); // <-- Спасительный парашют: если дата битая/undefined, берем текущую
        // }
        this.isMembership = blog.isMembership;
    }

    static mapToView(blog: Blog & { _id: Types.ObjectId }): BlogViewDto {
        return new BlogViewDto(blog);
    }
}

export interface SQLRawBlogData {
    id: string;
    name: string;
    description: string;
    website_url: string;
    created_at: string | Date;
    is_membership: boolean;
}

export class SQLBlogViewDto {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    createdAt: string;
    isMembership: boolean;

    constructor(blog: SQLBlog) {
        this.id = blog.id;
        this.name = blog.name;
        this.description = blog.description;
        this.websiteUrl = blog.websiteUrl;
        this.createdAt = SQLBlogViewDto.toSafeIsoString(blog.createdAt);
        this.isMembership = blog.isMembership;
    }

    /**
     * Безопасное приведение даты к ISO-строке без падения приложения
     */
    private static toSafeIsoString(val: any): string {
        if (val instanceof Date && !isNaN(val.getTime())) {
            return val.toISOString();
        }
        if (val) {
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        }
        // Защита: если дата null/undefined или кривая строка
        return new Date().toISOString();
    }

    /**
     * Маппинг из сырой SQL-строки (PostgreSQL snake_case)
     */
    static mapFromDbRaw(raw: SQLRawBlogData): SQLBlogViewDto {
        // Создаем пустой объект БЕЗ вызова constructor(blog)
        const dto = Object.create(SQLBlogViewDto.prototype) as SQLBlogViewDto;

        dto.id = raw.id;
        dto.name = raw.name;
        dto.description = raw.description;
        dto.websiteUrl = raw.website_url; // snake_case -> camelCase
        dto.createdAt = SQLBlogViewDto.toSafeIsoString(raw.created_at);
        dto.isMembership = raw.is_membership; // snake_case -> camelCase

        return dto;
    }

    static mapToView(blog: SQLBlog): SQLBlogViewDto {
        return new SQLBlogViewDto(blog);
    }
}