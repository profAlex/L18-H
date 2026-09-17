import { CreateBlogPostInputDto } from '../../api/input-dto/create-blog-post.input-dto';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs.query-repository';
import { PostsCommandRepository } from '../../../posts/infrastructure/posts.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { SQLPost } from '../../../posts/domain/sql-post.entitry';

export class CreatePostForBlogCommand extends Command<string> {
    constructor(
        public readonly blogId: string,
        public readonly body: CreateBlogPostInputDto,
    ) {
        super();
    }
}

@CommandHandler(CreatePostForBlogCommand)
export class CreatePostForBlogHandler implements ICommandHandler<
    CreatePostForBlogCommand> {
    constructor(
        private readonly blogsQueryRepository: BlogsQueryRepository,
        private readonly postsCommandRepository: PostsCommandRepository,
    ) {}

    async execute(command: CreatePostForBlogCommand): Promise<string> {
        const { blogId, body } = command;

        // проверяем существование блога
        const isBlogExist =
            await this.blogsQueryRepository.SQLifBlogExists(blogId);
        if (!isBlogExist) {
            throw new DomainException({
                code: DomainExceptionCode.BlogNotFound,
                message: `Blog with id ${blogId} not found`,
            });
        }

        // создаем доменную сущность поста
        const post = SQLPost.createInstance({
            ...body,
            blogId,
        });

        // сохраняем в БД
        const createdPostId = await this.postsCommandRepository.SQLsaveCreate(post);

        // возвращаем только ID
        return createdPostId;
    }
}
