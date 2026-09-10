import { CreateBlogDomainDto } from './dto/create-blog.domain.dto';
import { UpdateBlogInputDto } from '../dto/create-blog.dto';

export class SQLBlog {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    isMembership: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;


    static createInstance(dto: CreateBlogDomainDto): SQLBlog {
        const newBlog = new SQLBlog();
        // ID не задаем, его сгенерирует PostgreSQL (gen_random_uuid())
        // либо можно сгенерировать криптографический UUID прямо в коде: crypto.randomUUID()
        newBlog.name = dto.name;
        newBlog.description = dto.description;
        newBlog.websiteUrl = dto.websiteUrl;
        newBlog.isMembership = false;
        newBlog.createdAt = new Date();
        newBlog.updatedAt = new Date();
        newBlog.deletedAt = null;

        return newBlog;
    }

    static reconstructInstance(raw: any): SQLBlog {
        const blog = new SQLBlog();
        blog.id = raw.id;
        blog.name = raw.name;
        blog.description = raw.description;
        blog.websiteUrl = raw.website_url; // Маппинг snake_case из SQL в camelCase
        blog.isMembership = raw.is_membership;
        blog.createdAt = new Date(raw.created_at);
        blog.updatedAt = new Date(raw.updated_at);
        blog.deletedAt = raw.deleted_at ? new Date(raw.deleted_at) : null;

        return blog;
    }

    makeDeleted(): void {
        if (this.deletedAt !== null) {
            return;
        }
        this.deletedAt = new Date();
        this.updatedAt = new Date();
    }

    updateBlog(dto: UpdateBlogInputDto): void {
        let isChanged = false;

        if (dto.name !== this.name) {
            this.name = dto.name;
            isChanged = true;
        }
        if (dto.description !== this.description) {
            this.description = dto.description;
            isChanged = true;
        }
        if (dto.websiteUrl !== this.websiteUrl) {
            this.websiteUrl = dto.websiteUrl;
            isChanged = true;
        }

        if (isChanged) {
            this.updatedAt = new Date();
        }
    }
}