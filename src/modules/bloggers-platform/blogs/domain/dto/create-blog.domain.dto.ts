import { ApiProperty } from '@nestjs/swagger';

export type CreateBlogDomainDto = {
    name: string;

    description: string;

    websiteUrl: string;
};
