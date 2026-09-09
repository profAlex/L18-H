import { ApiProperty } from '@nestjs/swagger';
import { CommentatorInfo } from '../commentator-info.schema';
import { LikesInfo } from '../likes-info.schema';

export type CreateCommentDomainInputDto = {
    relatedPostId: string;
    content: string;
    commentatorInfo: CommentatorInfo;
};
