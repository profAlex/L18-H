// export type CommentStorageModel = {
//     _id: ObjectId;
//     id: string;
//     relatedPostId: string;
//     content: string;
//     commentatorInfo: CommentatorInfo;
//     createdAt: Date;
//     likesInfo: LikesInfoViewModel;
// };
export enum CommentsSortBy {
    Id = 'id',
    Content = 'content',
    CreatedAt = 'createdAt',
}
