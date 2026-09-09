import { Module } from '@nestjs/common';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { BlogsService } from './blogs/application/blogs.service';
import { BlogsController } from './blogs/api/blogs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from './blogs/domain/blog.entity';
import { BlogsQueryRepository } from './blogs/infrastructure/query/blogs.query-repository';
import { Post, PostSchema } from './posts/domain/post.entity';
import { BlogsCommandRepository } from './blogs/infrastructure/blogs.command-repository';
import { PostsService } from './posts/application/posts.service';
import { PostsQueryRepository } from './posts/infrastructure/query/posts.query-repository';
import { PostsCommandRepository } from './posts/infrastructure/posts.command-repository';
import { Comment, CommentSchema } from './comments/domain/comment.entity';
import { PostsController } from './posts/api/posts.controller';
import { CommentsController } from './comments/api/comments.controller';
import { CommentsService } from './comments/application/comments.service';
import { CommentsQueryRepository } from './comments/infrastructure/query/comments.query-repository';
import { CommentsCommandRepository } from './comments/infrastructure/comments.command-repository';
import { GetCommentsForSpecificPostIdHandler } from './comments/application/usecases/get-comments-for-specified-post-id.usecase';
import { GetAllPostsHandler } from './posts/application/usecases/get-all-posts.usecase';
import { UpdatePostByIdHandler } from './posts/application/usecases/update-post-by-id.usecase';
import { GetPostByIdHandler } from './posts/application/usecases/get-post-by-id.usecase';
import { CreatePostHandler } from './posts/application/usecases/create-post.usecase';
import { DeletePostByIdHandler } from './posts/application/usecases/delete-post-by-id.usecase';
import { UsersExternalQueryRepository } from '../user-accounts/infrastructure/external-query/users.external-query-repository';
import { CreateNewCommentHandler } from './comments/application/usecases/create-new-comment.usecase';
import { UpdateCommentByIdHandler } from './comments/application/usecases/update-comment-by-id.usecase';
import { DeleteCommentByIdHandler } from './comments/application/usecases/delete-comment-by-id.usecase';
import { ChangeCommentLikeStatusHandler } from './comments/application/usecases/change-comment-like-status.usecase';
import { ChangePostLikeStatusHandler } from './posts/application/usecases/change-post-like-status.usecase';
import {
    CommentLike,
    CommentLikeSchema,
} from './likes/domain/comment-like.entity';
import { PostLike, PostLikeSchema } from './likes/domain/post-like.entity';
import { CommentLikesCommandRepository } from './likes/infrastructure/comment-likes.command-repository';
import { CommentLikesQueryRepository } from './likes/infrastructure/query/comment-likes.query-repository';
import { PostLikesCommandRepository } from './likes/infrastructure/post-likes.command-repostory';
import { PostLikesQueryRepository } from './likes/infrastructure/query/post-likes.query-repository';
import { User, UserSchema } from '../user-accounts/domain/user.entity';

//тут регистрируем провайдеры всех сущностей блоггерской платформы (blogs, posts, comments, etc...)
@Module({
    imports: [
        MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }]),
        MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
        MongooseModule.forFeature([
            { name: Comment.name, schema: CommentSchema },
        ]),
        MongooseModule.forFeature([
            { name: CommentLike.name, schema: CommentLikeSchema },
        ]),
        MongooseModule.forFeature([
            { name: PostLike.name, schema: PostLikeSchema },
        ]),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

        UserAccountsModule,
    ],
    controllers: [BlogsController, PostsController, CommentsController],
    providers: [
        ChangeCommentLikeStatusHandler,
        DeleteCommentByIdHandler,
        UpdateCommentByIdHandler,
        CreateNewCommentHandler,
        ChangePostLikeStatusHandler,
        DeletePostByIdHandler,
        UpdatePostByIdHandler,
        CreatePostHandler,
        GetPostByIdHandler,
        GetAllPostsHandler,
        GetCommentsForSpecificPostIdHandler,
        BlogsService,
        BlogsQueryRepository,
        BlogsCommandRepository,
        PostsService,
        PostsQueryRepository,
        PostsCommandRepository,
        CommentsService,
        CommentsQueryRepository,
        CommentsCommandRepository,
        UsersExternalQueryRepository,
        CommentLikesCommandRepository,
        CommentLikesQueryRepository,
        PostLikesCommandRepository,
        PostLikesQueryRepository,
    ],
})
export class BloggersPlatformModule {}
