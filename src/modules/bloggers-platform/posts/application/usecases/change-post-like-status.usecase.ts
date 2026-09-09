import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsCommandRepository } from '../../infrastructure/posts.command-repository';
import { InjectModel } from '@nestjs/mongoose';
import { CreatePostLikeDto } from '../../dto/create-post-like.dto';
import {
    PostLike,
    PostLikeModelType,
} from '../../../likes/domain/post-like.entity';
import { PostLikesCommandRepository } from '../../../likes/infrastructure/post-likes.command-repostory';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PostLikesQueryRepository } from '../../../likes/infrastructure/query/post-likes.query-repository';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';

// <void> - This type represents the command execution result
export class ChangePostLikeStatus extends Command<void> {
    constructor(public readonly dto: CreatePostLikeDto) {
        super();
    }
}

@CommandHandler(ChangePostLikeStatus)
export class ChangePostLikeStatusHandler implements ICommandHandler<ChangePostLikeStatus> {
    constructor(
        @InjectModel(PostLike.name) private PostLikeModel: PostLikeModelType,
        private postLikesCommandRepository: PostLikesCommandRepository,
        private postLikesQueryRepository: PostLikesQueryRepository,
        private postsCommandRepository: PostsCommandRepository,
        private usersExternalQueryRepository: UsersExternalQueryRepository,
    ) {}

    async execute({ dto }: ChangePostLikeStatus): Promise<void> {
        const { postId, userId, newLikeStatus } = dto;

        // проверяем что пост, которому пользователь меняет лайк-статус, существует и сразу возращаем ссылку для работы
        const post =
            await this.postsCommandRepository.findSinglePostById(postId);
        if (!post) {
            throw new DomainException({
                code: DomainExceptionCode.PostNotFound,
                message: `Post not found`,
            });
        }

        // проверяем наличие реакции на пост в коллекции пост-лайков и если он существует сразу возвращаем документ для
        const previousReactionStatus =
            await this.postLikesCommandRepository.findSinglePostLikeByPostIdAndUserId(
                { postId, userId },
            );

        // находим данные юзера, который меняет реакицю, нам нужен будет от него userLogin
        const user =
            await this.usersExternalQueryRepository.getByIdOrNotFoundFail(
                userId,
            );

        // НАЧАЛО ПРОВЕРОК
        // если прежней реакции не найдено и новая реакция не None
        if (previousReactionStatus === null && newLikeStatus !== 'None') {
            // создаем новый лайк в базе
            const newLikeDocument = this.PostLikeModel.createInstance({
                postId: postId,
                userId: userId,
                userLogin: user.login,
            });

            newLikeDocument.likeStatus = newLikeStatus;
            await this.postLikesCommandRepository.save(newLikeDocument);

            // добавляем реакцию в счетчик реакций в базе постов
            const ifAddReactionSuccessfull =
                await this.postsCommandRepository.addPostReaction({
                    sentPostId: postId,
                    newStatus: newLikeStatus,
                });

            if (!ifAddReactionSuccessfull) {
                throw new DomainException({
                    code: DomainExceptionCode.PostNotFound,
                    message: `Post not found`,
                });
            }
        }
        // если прежняя реакция найдена и она не равна вновь переданной
        else if (
            previousReactionStatus !== null &&
            previousReactionStatus.likeStatus !== newLikeStatus
        ) {
            // дополнительное условие - если передали лайк = none - удалить запись из лайк репозитория,
            // не забыть вызвать nullifyReaction для корректировки общего счетчика лайков-дизлайков

            // если новая реакция это None, тогда надо удалить запись лайка в репозитории лайков и сбросить реакцию в комменте
            if (newLikeStatus === 'None') {
                // запоминаем какая реакция была ранее проставлена юзером
                const previousReaction = previousReactionStatus.likeStatus;

                // выставляем статус лайка (запись в базе) likeStatus в None, не удаляя физически
                const isStatusChanged = previousReactionStatus.updateLikeStatus(
                    { likeStatus: newLikeStatus },
                );

                if (isStatusChanged) {
                    await this.postLikesCommandRepository.save(
                        previousReactionStatus,
                    );
                }

                // делаем декремент счетчика лайка или дизлайка
                const ifNullifyingReactionSuccessfull =
                    await this.postsCommandRepository.nullifyPostReaction({
                        sentPostId: postId,
                        oldStatus: previousReaction,
                    });

                if (!ifNullifyingReactionSuccessfull) {
                    throw new DomainException({
                        code: DomainExceptionCode.PostNotFound,
                        message: `Post not found`,
                    });
                }
            } else {
                // ветка на тот случай когда мы меняем(свитчим) реакцию на Like или Dislike (sentLike === "Like" или "Dislike")
                // меняем реакцию в коллекции лайков на новую
                const isStatusChanged = previousReactionStatus.updateLikeStatus(
                    { likeStatus: newLikeStatus },
                );

                // сохраняем
                if (isStatusChanged) {
                    await this.postLikesCommandRepository.save(
                        previousReactionStatus,
                    );
                }

                // меняем реакцию в коллекции постов на новую
                const ifSwitchReactionSuccessfull =
                    await this.postsCommandRepository.switchPostReaction({
                        sentPostId: postId,
                        newStatus: newLikeStatus,
                    });

                if (!ifSwitchReactionSuccessfull) {
                    throw new DomainException({
                        code: DomainExceptionCode.PostNotFound,
                        message: `Post not found`,
                    });
                }
            }
        }

        // реакция изменена удачно
        // теперь обновляем последние три лайка в посте, вытягивая инфу про крайние три лайка из базы лайков
        const refreshLastLikesstatus =
            await this.postLikesQueryRepository.getLatestLikesForPost(postId);

        // обновляем пост
        post.updateNewestLikes(refreshLastLikesstatus);

        // сохраняем изменения в посте
        await this.postsCommandRepository.save(post);
    }
}
