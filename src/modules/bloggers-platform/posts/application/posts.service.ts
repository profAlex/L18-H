import { Injectable, NotFoundException } from '@nestjs/common';
import { GetPostsQueryParams } from '../api/input-dto/get-posts-query-params.input-dto';
import { PostsQueryRepository } from '../infrastructure/query/posts.query-repository';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../api/view-dto/posts.view-dto';
import { BlogsQueryRepository } from '../../blogs/infrastructure/query/blogs.query-repository';
import { Post, PostModelType } from '../domain/post.entity';
import { CreateBlogPostInputDto } from '../../blogs/api/input-dto/create-blog-post.input-dto';
import { InjectModel } from '@nestjs/mongoose';
import { PostsCommandRepository } from '../infrastructure/posts.command-repository';
import { CreatePostApiInputDto } from '../api/input-dto/create-post.api.input-dto';
import { UpdatePostInputDto } from '../dto/create-post-input.dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class PostsService {
    constructor(
        private postsQueryRepository: PostsQueryRepository,
        private blogsQueryRepository: BlogsQueryRepository,
        @InjectModel(Post.name) private PostModel: PostModelType,
        private postsCommandRepository: PostsCommandRepository,
    ) {
        console.log('PostsService created');
    }

    async getPostsByBlogId({
        userId,
        blogId,
        query,
    }: {
        userId?: string; // параметр на будущее, когда появится вариант делать анонимные запросы и неанонимные с конкретным юзером
        blogId: string;
        query: GetPostsQueryParams;
    }): Promise<PaginatedViewDto<PostViewDto>> {
        if (!(await this.blogsQueryRepository.ifBlogExists(blogId))) {
            // throw new NotFoundException("Blog not found");
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound, // Смапится в 400
                message: 'Blog not found',
            });
        }

        return this.postsQueryRepository.getPostsByBlogId({
            userId,
            blogId,
            query,
        });
    }

    async createPostByBlogId({
        userId,
        blogId,
        body,
    }: {
        userId?: string; // параметр на будущее, когда понадобится верифицировать пользователя с т.зр. может ли этот конкретный юзер создавать пост в этом конкретном блоге (владеет ли он блогом?)
        blogId: string;
        body: CreateBlogPostInputDto;
    }): Promise<PostViewDto> {
        const blog = await this.blogsQueryRepository.getBlogName(blogId);
        if (!blog) {
            // throw new NotFoundException("Blog not found");
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: `Blog not found`,
            });
        }

        const blogName = blog.name;
        const post = this.PostModel.createInstance({
            ...body,
            blogId,
            blogName,
        });

        await this.postsCommandRepository.save(post);

        return PostViewDto.mapToView(post);
    }

    // async createPost(body: CreatePostApiInputDto): Promise<PostViewDto> {
    //
    //     const blog = await this.blogsQueryRepository.getBlogName(body.blogId);
    //     if (!blog) {
    //         // throw new NotFoundException("Blog not found");
    //         throw new DomainException({
    //             code: DomainExceptionCode.BlogNotFound,
    //             message: 'Blog not found!',
    //         });
    //     }
    //
    //     const blogName = blog.name;
    //     const post = this.PostModel.createInstance({
    //         ...body,
    //         blogName
    //     });
    //
    //     await this.postsCommandRepository.save(post);
    //
    //     return PostViewDto.mapToView(post);
    // }

    // async updatePostById({
    //     postId,
    //     updateInputData,
    // }: {
    //     postId: string;
    //     updateInputData: UpdatePostInputDto;
    // }): Promise<void> {
    //     const post =
    //         await this.postsCommandRepository.findSinglePostById(postId);
    //     if (!post) {
    //         // throw new NotFoundException("Post not found");
    //         throw new DomainException({
    //             code: DomainExceptionCode.PostNotFound,
    //             message: 'Post not found',
    //         });
    //     }
    //
    //     post.updatePost(updateInputData);
    //     await this.postsCommandRepository.save(post);
    // }

    // async deletePostById(postId: string): Promise<void> {
    //     const post =
    //         await this.postsCommandRepository.findSinglePostById(postId);
    //     if (!post) {
    //         // throw new NotFoundException("Post not found");
    //         throw new DomainException({
    //             code: DomainExceptionCode.PostNotFound,
    //             message: 'Post not found',
    //         });
    //     }
    //
    //     post.makeDeleted();
    //     await this.postsCommandRepository.save(post);
    // }
}
