import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BlogDocument } from '../../blogs/domain/blog.entity';
import { Post, PostDocument, PostModelType } from '../domain/post.entity';
import { InjectModel } from '@nestjs/mongoose';
import { LikeStatus } from '../../../../core/enums/like-status.enum';

@Injectable()
export class PostsCommandRepository {
    constructor(@InjectModel(Post.name) private PostModel: PostModelType) {}

    async save(post: PostDocument): Promise<void> {
        // эта часть только для тех случаев когда обновляем массив newestLikes в посте
        if (post.isModified('extendedLikesInfo')) {
            // для карантии что вложенный массив будет обновлен, т.к. иногда бывает что не сработает без явной поментки что он был изменен
            post.markModified('extendedLikesInfo.newestLikes');
        }

        // ну а та часть уже для всех
        await post.save();
    }

    async findSinglePostById(sentPostId: string): Promise<PostDocument | null> {
        return this.PostModel.findOne({
            _id: sentPostId,
            deletedAt: null,
        }).exec();

        // Без .exec() Mongoose возвращает так называемый Query (объект-обещание), который ведет себя как Promise,
        // но им не является. Вызов .exec() превращает его в полноценный нативный JavaScript Promise.
        // Это дает более чистые и понятные стек-трейсы ошибок (stack traces), если база данных начнет сбоить,
        // и исключает странные баги с типизацией в некоторых версиях TypeScript.
    }

    // методы для переключения счетчика лайков в посте
    async addPostReaction({
        sentPostId,
        newStatus,
    }: {
        sentPostId: string;
        newStatus: LikeStatus;
    }): Promise<boolean> {
        try {
            const updateQuery =
                newStatus === LikeStatus.Like
                    ? { 'extendedLikesInfo.likesCount': 1 }
                    : { 'extendedLikesInfo.dislikesCount': 1 };

            // атомарный апдейт для избегания состояния гонки
            const result = await this.PostModel.updateOne(
                { _id: sentPostId },
                { $inc: updateQuery },
            );

            // если matchedCount === 0, значит поста с таким ID уже нет в базе
            if (result.matchedCount === 0) {
                // обработка на тот случай, если пост был удален пока мы занимались вычислениями или сеть залагала

                console.error(
                    `Couldn't find post with id: ${sentPostId} inside PostsCommandRepository.addPostReaction`,
                );

                return false;
            }

            return true;
        } catch (error) {
            // а эта обработка общих ошибок инфраструктуры, то есть если именно проблема какая-то случилось при запросе к базы, может быть любой сбой. но это серьезная неисправность
            console.error(
                ` Error inside PostsCommandRepository.addPostReaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async nullifyPostReaction({
        sentPostId,
        oldStatus,
    }: {
        sentPostId: string;
        oldStatus: LikeStatus;
    }): Promise<boolean> {
        try {
            const fieldToDecrement =
                oldStatus === LikeStatus.Like
                    ? 'extendedLikesInfo.likesCount'
                    : 'extendedLikesInfo.dislikesCount';

            // создаем фильтр: ищем по ID И проверяем, что в поле больше 0
            const filter: any = {
                _id: sentPostId,
                [fieldToDecrement]: { $gt: 0 }, // Защита от ухода в минус
            };

            // выполняем атомарное уменьшение
            const result = await this.PostModel.updateOne(filter, {
                $inc: { [fieldToDecrement]: -1 },
            });

            if (result.matchedCount === 0) {
                // обработка на тот случай, если пост был удален пока мы занимались вычислениями или сеть залагала

                console.error(
                    `Couldn't find post with id: ${sentPostId} inside  PostsCommandRepository.nullifyingPostReaction`,
                );

                return false;
            }

            return true;
        } catch (error) {
            // а эта обработка общих ошибок инфраструктуры, то есть если именно проблема какая-то случилось при запросе к базы, может быть любой сбой. но это серьезная неисправность
            console.error(
                `Error inside PostsCommandRepository.nullifyingPostReaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );

            throw new InternalServerErrorException('Internal server error');
        }
    }

    async switchPostReaction({
        sentPostId,
        newStatus,
    }: {
        sentPostId: string;
        newStatus: LikeStatus;
    }): Promise<boolean> {
        try {
            let result;
            // Определяем, что прибавляем, а что отнимаем
            const isEnablingLike = newStatus === LikeStatus.Like;

            // если выставляем лайк меняя дизлайк
            if (isEnablingLike) {
                result = await this.PostModel.updateOne(
                    {
                        _id: sentPostId,
                    },
                    {
                        $inc: {
                            'extendedLikesInfo.likesCount': 1,
                            'extendedLikesInfo.dislikesCount': -1,
                        },
                    },
                );
            } else {
                // если выставляем дизлайк, меняя лайк
                result = await this.PostModel.updateOne(
                    {
                        _id: sentPostId,
                    },
                    {
                        $inc: {
                            'extendedLikesInfo.likesCount': -1,
                            'extendedLikesInfo.dislikesCount': 1,
                        },
                    },
                );
            }

            // обработка на тот случай, если пост был удален пока мы занимались вычислениями или сеть залагала
            if (result.matchedCount === 0) {
                console.error(
                    `Couldn't find post with id: ${sentPostId} inside PostsCommandRepository.switchPostReaction`,
                );

                return false;
            }

            return true;
        } catch (error) {
            // а эта обработка общих ошибок инфраструктуры, то есть если именно проблема какая-то случилось при запросе к базы, может быть любой сбой. но это серьезная неисправность
            console.error(
                `Error saving post reaction inside PostsCommandRepository.switchPostReaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );

            throw new InternalServerErrorException('Internal server error');
        }
    }
}
