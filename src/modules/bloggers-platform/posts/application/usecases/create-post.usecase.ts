import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { CreatePostApiInputDto } from '../../api/input-dto/create-post.api.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PostsCommandRepository } from '../../infrastructure/posts.command-repository';
import { BlogsQueryRepository } from '../../../blogs/infrastructure/query/blogs.query-repository';
import { Post, PostModelType } from '../../domain/post.entity';
import { InjectModel } from '@nestjs/mongoose';

// <PostViewDto> - This type represents the command execution result
export class CreatePost extends Command<PostViewDto> {
    constructor(public readonly body: CreatePostApiInputDto) {
        super();
    }
}

@CommandHandler(CreatePost)
export class CreatePostHandler implements ICommandHandler<CreatePost> {
    constructor(
        private readonly blogsQueryRepository: BlogsQueryRepository,
        private readonly postsCommandRepository: PostsCommandRepository,
        @InjectModel(Post.name) private PostModel: PostModelType,
    ) {}

    async execute({ body }: CreatePost): Promise<PostViewDto> {
        const blog = await this.blogsQueryRepository.getBlogName(body.blogId);
        if (!blog) {
            // throw new NotFoundException("Blog not found");
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: 'Blog not found!',
            });
        }

        const blogName = blog.name;
        const post = this.PostModel.createInstance({
            ...body,
            blogName,
        });

        await this.postsCommandRepository.save(post);

        return PostViewDto.mapToView(post);
    }
}
