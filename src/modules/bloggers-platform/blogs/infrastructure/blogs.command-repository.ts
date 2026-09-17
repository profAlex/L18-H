import {Injectable} from "@nestjs/common";
import {Blog, BlogDocument, BlogModelType} from "../domain/blog.entity";
import {InjectModel} from "@nestjs/mongoose";
import { SQLBlog } from '../domain/sql-blog.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class BlogsCommandRepository {
    constructor(@InjectModel(Blog.name)
                private BlogModel: BlogModelType,
                private readonly dataSource: DataSource,
    ){}

    async save(blog: BlogDocument): Promise<void> {
        await blog.save();
    }

    async SQLsave(blog: SQLBlog): Promise<void> {
        const query = `
            INSERT INTO blogs (id,
                               name,
                               description,
                               website_url,
                               is_membership,
                               created_at,
                               updated_at,
                               deleted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            ON CONFLICT (id) DO
            UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                website_url = EXCLUDED.website_url,
                is_membership = EXCLUDED.is_membership,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
        `;

        const queryParams = [
            blog.id,
            blog.name,
            blog.description,
            blog.websiteUrl,
            blog.isMembership,
            blog.createdAt,
            blog.updatedAt,
            blog.deletedAt,
        ];

        // console.log("query formed successfully");

        await this.dataSource.query(query, queryParams);
    }

    // async delete(blogId: string): Promise<boolean> {
    //     const result = await this.BlogModel.deleteOne({ _id: blogId });
    //     return result.deletedCount === 1;
    // }

    async SQLfindBlogById(id: string): Promise<SQLBlog | null> {
        const query = `
        SELECT 
            id,
            name,
            description,
            website_url,
            is_membership,
            created_at,
            updated_at,
            deleted_at
        FROM public.blogs
        WHERE id = $1 AND deleted_at IS NULL;
    `;

        const [raw] = await this.dataSource.query(query, [id]);

        if (!raw) {
            return null;
        }

        // восстанавливаем полноценный класс SQLBlog с методами
        return SQLBlog.reconstructInstance(raw);
    }

    async getBlogDocumentById(blogId: string): Promise<BlogDocument | null> {
        return this.BlogModel.findOne({_id: blogId, deletedAt: null});
    }
}