import { CreatePostDomainDto, SQLCreatePostDomainDto } from './dto/create-post.domain.dto';
import { UpdatePostInputDto } from '../dto/create-post-input.dto';

export class SQLPost {
    id: string;
    title: string;
    shortDescription: string;
    content: string;
    blogId: string;
    likesCount: number;
    dislikesCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;

    /**
     * Создание нового поста (счетчики лайков стартуют с 0)
     */
    static createInstance(dto: SQLCreatePostDomainDto): SQLPost {
        const newPost = new SQLPost();

        newPost.title = dto.title;
        newPost.shortDescription = dto.shortDescription;
        newPost.content = dto.content;
        newPost.blogId = dto.blogId;
        newPost.likesCount = 0;
        newPost.dislikesCount = 0;
        newPost.createdAt = new Date();
        newPost.updatedAt = new Date();
        newPost.deletedAt = null;

        return newPost;
    }

    /**
     * Восстановление доменного объекта из сырой строки PostgreSQL
     */
    static reconstructInstance(raw: any): SQLPost {
        const post = new SQLPost();

        post.id = raw.id;
        post.title = raw.title;
        post.shortDescription = raw.short_description; // snake_case -> camelCase
        post.content = raw.content;
        post.blogId = raw.blog_id;
        post.likesCount = Number(raw.likes_count ?? raw.likesCount ?? 0);
        post.dislikesCount = Number(raw.dislikes_count ?? raw.dislikesCount ?? 0);
        post.createdAt = new Date(raw.created_at);
        post.updatedAt = new Date(raw.updated_at);
        post.deletedAt = raw.deleted_at ? new Date(raw.deleted_at) : null;

        return post;
    }

    makeDeleted(): void {
        if (this.deletedAt !== null) {
            return;
        }
        this.deletedAt = new Date();
        this.updatedAt = new Date();
    }

    updatePost(dto: UpdatePostInputDto): void {
        let isChanged = false;

        if (dto.title !== undefined && dto.title !== this.title) {
            this.title = dto.title;
            isChanged = true;
        }
        if (dto.shortDescription !== undefined && dto.shortDescription !== this.shortDescription) {
            this.shortDescription = dto.shortDescription;
            isChanged = true;
        }
        if (dto.content !== undefined && dto.content !== this.content) {
            this.content = dto.content;
            isChanged = true;
        }
        if (dto.blogId !== undefined && dto.blogId !== this.blogId) {
            this.blogId = dto.blogId;
            isChanged = true;
        }

        if (isChanged) {
            this.updatedAt = new Date();
        }
    }
}