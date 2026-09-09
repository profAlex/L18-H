// <void> - This type represents the command execution result
import { CreatePostLikeDto } from '../../../posts/dto/create-post-like.dto';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCommentLikeDto } from '../../dto/create-comment-like.dto';
import {
    CommentLike,
    CommentLikeModelType,
} from '../../../likes/domain/comment-like.entity';
import { InjectModel } from '@nestjs/mongoose';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';
import { CommentsCommandRepository } from '../../infrastructure/comments.command-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { CommentLikesCommandRepository } from '../../../likes/infrastructure/comment-likes.command-repository';
import { CommentLikesQueryRepository } from '../../../likes/infrastructure/query/comment-likes.query-repository';

export class ChangeCommentLikeStatus extends Command<void> {
    constructor(public readonly dto: CreateCommentLikeDto) {
        super();
    }
}

@CommandHandler(ChangeCommentLikeStatus)
export class ChangeCommentLikeStatusHandler implements ICommandHandler<ChangeCommentLikeStatus> {
    constructor(
        @InjectModel(CommentLike.name)
        private CommentLikeModel: CommentLikeModelType,
        private commentLikesCommandRepository: CommentLikesCommandRepository,
        private commentLikesQueryRepository: CommentLikesQueryRepository,
        private commentsCommandRepository: CommentsCommandRepository,
        private usersExternalQueryRepository: UsersExternalQueryRepository,
    ) {}

    async execute({ dto }: ChangeCommentLikeStatus): Promise<void> {
        const { commentId, userId, newLikeStatus } = dto;

        // проверяем что коммент, которому пользователь меняет лайк-статус существует и сразу возращаем ссылку для работы
        const comment =
            await this.commentsCommandRepository.getCommentById(commentId);
        if (!comment) {
            throw new DomainException({
                code: DomainExceptionCode.CommentNotFound,
                message: `Comment not found`,
            });
        }

        // проверяем наличие реакции на коммент в коллекции коммент-лайков и если он существует сразу возвращаем документ для изменения
        const previousReactionStatus =
            await this.commentLikesCommandRepository.findSingleCommentLikeByCommentIdAndUserId(
                { commentId, userId },
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
            const newLikeDocument = this.CommentLikeModel.createInstance({
                commentId: commentId,
                userId: userId,
            });
            newLikeDocument.likeStatus = newLikeStatus;

            await this.commentLikesCommandRepository.save(newLikeDocument);

            // добавляем реакцию в счетчик реакций в базе комментариев
            const ifAddReactionSuccessfull =
                await this.commentsCommandRepository.addCommentReaction({
                    sentCommentId: commentId,
                    newStatus: newLikeStatus,
                });

            if (!ifAddReactionSuccessfull) {
                throw new DomainException({
                    code: DomainExceptionCode.CommentNotFound,
                    message: `Comment not found`,
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
                    await this.commentLikesCommandRepository.save(
                        previousReactionStatus,
                    );
                }

                // делаем декремент счетчика лайка или дизлайка
                const ifNullifyingReactionSuccessfull =
                    await this.commentsCommandRepository.nullifyCommentReaction(
                        {
                            sentCommentId: commentId,
                            oldStatus: previousReaction,
                        },
                    );

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
                    await this.commentLikesCommandRepository.save(
                        previousReactionStatus,
                    );
                }

                // меняем реакцию в коллекции постов на новую
                const ifSwitchReactionSuccessfull =
                    await this.commentsCommandRepository.switchCommentReaction({
                        sentCommentId: commentId,
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

        // // реакция изменена удачно
        // // теперь обновляем последние три лайка в посте, вытягивая инфу про крайние три лайка из базы лайков
        // const refreshLastLikesstatus =
        //     await this.postLikesQueryRepository.getLatestLikesForPost(postId);
        //
        // // обновляем пост
        // post.updateNewestLikes(refreshLastLikesstatus);
        //
        // // сохраняем изменения в посте
        // await this.postsCommandRepository.save(post);
    }
}
